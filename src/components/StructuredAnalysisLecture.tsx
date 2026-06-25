import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Volume2, 
  Check, 
  RefreshCw, 
  BookOpen, 
  HelpCircle,
  Hash
} from 'lucide-react';
import { TrackLyricsData, StructuredLectureBlock, StructuredSectionPhrase } from '../services/musicService';
import { PhraseStatus, normalizePhraseKey } from '../services/cardService';
import ReactMarkdown from 'react-markdown';
import { PhraseCard, PhraseCardStatus } from './PhraseCard';
import { computeLineKey } from '../services/lyricsPreprocessor';

interface StructuredAnalysisLectureProps {
  currentTrack: TrackLyricsData;
  onUpdateTrack: (updatedTrack: TrackLyricsData) => Promise<void>;
  isGeneratingAnalysis?: boolean;
  handleRegenerateAnalysis?: () => void;
  targetLanguage: string;
  phraseMetadata: Map<string, any>;
  handleSetAnalysisPhraseStatus: (
    phraseText: string, 
    translation: string, 
    explanation: string, 
    status: PhraseStatus,
    type?: string
  ) => void;
  speak: (text: string, onEnd?: () => void, lang?: string) => void;
}

export const StructuredAnalysisLecture: React.FC<StructuredAnalysisLectureProps> = ({
  currentTrack,
  onUpdateTrack,
  isGeneratingAnalysis = false,
  handleRegenerateAnalysis,
  targetLanguage,
  phraseMetadata,
  handleSetAnalysisPhraseStatus,
  speak
}) => {
  // Ordered target kinds of the blocks
  const targetKinds = ['overview', 'emotions', 'sections', 'lexical_groups', 'takeaways', 'notes'] as const;
  type BlockKind = typeof targetKinds[number];

  // Migration mapping & initialization helper: converts older format blocks gracefully to the new 6-kind structure
  const blocks = useMemo(() => {
    let rawBlocks = currentTrack.lectureBlocks || [];
    
    // Fallback migration to map legacy kinds to our modern 6-kind structure
    return rawBlocks.map(b => {
      let k = b.kind as string;
      if (k === 'intro' || k === 'summary' || k === 'important_lines') k = 'overview';
      if (k === 'themes' || k === 'motifs') k = 'emotions';
      if (k === 'context') k = 'overview';
      
      return {
        ...b,
        kind: k as any
      };
    });
  }, [currentTrack.lectureBlocks]);

  // Active inline editing states
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'text' | null>(null);
  
  // Track state of inline phrase we are editing
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);

  // Active expanded phrase card state
  const [expandedPhraseId, setExpandedPhraseId] = useState<string | null>(null);

  // Speaking state for phrase playback
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  // Temporary edit value buffer
  const [tempEditValue, setTempEditValue] = useState('');
  
  // Phrase edit buffer
  const [tempPhraseText, setTempPhraseText] = useState('');
  const [tempPhraseTranslation, setTempPhraseTranslation] = useState('');
  const [tempPhraseExample, setTempPhraseExample] = useState('');
  const [tempPhraseType, setTempPhraseType] = useState('phrase');

  // Input referencers for auto-focus
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField === 'text' && editorRef.current) {
      editorRef.current.focus();
      // Auto-increase height based on text initial length
      editorRef.current.style.height = 'auto';
      editorRef.current.style.height = `${editorRef.current.scrollHeight}px`;
    } else if (editingField === 'title' && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingField, editingBlockId]);

  function getKindTitlePlaceholder(kind: BlockKind): string {
    switch (kind) {
      case 'overview': return 'Narrative & Song Overview';
      case 'emotions': return 'Aesthetic Mood & Tone Breakdown';
      case 'sections': return 'Key Song Sections';
      case 'lexical_groups': return 'Thematic Vocabulary Clusters';
      case 'takeaways': return 'Linguistic Insights & Grammar Study';
      case 'notes': return 'Personal Notes & Workspace';
    }
  }

  function getKindTextPlaceholder(kind: BlockKind, artistName: string): string {
    switch (kind) {
      case 'overview': 
        return currentTrack.meaning || 'Provide a central summary and emotional premise of the song lyrics here.';
      case 'emotions': 
        return `A detailed review of the emotional landscape and performance attitude generated on this track by ${artistName || 'the artist'}. Close-up study of stylistic devices.`;
      case 'sections': 
        return 'Overview breakdowns of Verses, Chorus structures, and bridges. Edit this block or add key section highlights below.';
      case 'lexical_groups': 
        return 'Group custom vocabulary elements here (e.g. metaphors of sea, words about winter weather, passive voice entries).';
      case 'takeaways': 
        return 'Grammar insights and translation guidelines derived from studying the natural lyric dialogue.';
      case 'notes': 
        return 'Your independent annotated commentary. Write translations, pronunciation reminders, or emotional insights here.';
    }
  }

  // Trigger global track save
  const handleSaveBlocks = async (updatedList: StructuredLectureBlock[]) => {
    const updatedTrack: TrackLyricsData = {
      ...currentTrack,
      lectureBlocks: updatedList
    };
    await onUpdateTrack(updatedTrack);
  };

  // Block inline edit activations
  const startBlockEdit = (blockId: string, field: 'title' | 'text', currentVal: string) => {
    setEditingPhraseId(null);
    setEditingBlockId(blockId);
    setEditingField(field);
    setTempEditValue(currentVal);
  };

  const saveBlockEdit = async (blockId: string) => {
    if (editingField === 'title' && !tempEditValue.trim()) {
      cancelEdit();
      return;
    }
    const updated = blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          title: editingField === 'title' ? tempEditValue.trim() : b.title,
          text: editingField === 'text' ? tempEditValue : b.text,
          source: b.source
        } as StructuredLectureBlock;
      }
      return b;
    });
    await handleSaveBlocks(updated);
    cancelEdit();
  };

  const deleteBlockBlock = async (blockId: string) => {
    if (window.confirm('Are you sure you want to delete this custom section from your lecture?')) {
      const updated = blocks.filter(b => b.id !== blockId);
      await handleSaveBlocks(updated);
      cancelEdit();
    }
  };

  const cancelEdit = () => {
    setEditingBlockId(null);
    setEditingField(null);
    setTempEditValue('');
    setEditingPhraseId(null);
  };

  // Phrase inline edit activations
  const startPhraseEdit = (phrase: StructuredSectionPhrase) => {
    setEditingBlockId(null);
    setEditingField(null);
    setEditingPhraseId(phrase.id);
    setTempPhraseText(phrase.text);
    setTempPhraseTranslation(phrase.translation);
    setTempPhraseExample(phrase.studyExample || '');
    setTempPhraseType(phrase.type || 'phrase');
  };

  const savePhraseEdit = async (blockId: string, phraseId: string) => {
    if (!tempPhraseText.trim() || !tempPhraseTranslation.trim()) return;

    const updated = blocks.map(b => {
      if (b.id === blockId) {
        const phrasesList = b.phrases || [];
        const updatedPhras = phrasesList.map(p => {
          if (p.id === phraseId) {
            return {
              ...p,
              text: tempPhraseText.trim(),
              translation: tempPhraseTranslation.trim(),
              studyExample: tempPhraseExample.trim() || undefined,
              type: tempPhraseType,
              source: p.source,
              priority: p.priority
            } as StructuredSectionPhrase;
          }
          return p;
        });
        return { ...b, phrases: updatedPhras };
      }
      return b;
    });

    await handleSaveBlocks(updated);
    setEditingPhraseId(null);
  };

  const deletePhraseItem = async (blockId: string, phraseId: string) => {
    if (window.confirm('Remove this phrase card from the lecture section?')) {
      const updated = blocks.map(b => {
        if (b.id === blockId) {
          return {
            ...b,
            phrases: (b.phrases || []).filter(p => p.id !== phraseId)
          };
        }
        return b;
      });
      await handleSaveBlocks(updated);
      setEditingPhraseId(null);
    }
  };

  const addPhraseItem = async (blockId: string) => {
    const newPhr: StructuredSectionPhrase = {
      id: `phr-${Date.now()}`,
      text: 'New phrase',
      translation: 'Translation / Explanation',
      studyExample: '',
      type: 'phrase',
      source: 'manual'
    };

    const updated = blocks.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          phrases: [...(b.phrases || []), newPhr]
        };
      }
      return b;
    });

    await handleSaveBlocks(updated);
    // Open editor right away for the newly added phrase block
    startPhraseEdit(newPhr);
  };

  // Checking Card Database sync state
  const isPhraseSaved = (phraseText: string) => {
    const key = normalizePhraseKey(phraseText);
    const card = phraseMetadata?.get(key);
    return card && (card.status === 'learning' || card.status === 'known');
  };

  const getPhraseContextLines = (phrase: StructuredSectionPhrase) => {
    const phraseKeys = (phrase as any).lineKeys as string[] | undefined;
    if ((phraseKeys && phraseKeys.length > 0) || (phrase.lineIds && phrase.lineIds.length > 0)) {
      return (currentTrack.lines || [])
        .filter(l => {
          if (phrase.lineIds?.includes(l.id)) return true;
          if (phraseKeys && phraseKeys.length > 0) {
            const key = computeLineKey(l.original);
            return phraseKeys.includes(key);
          }
          return false;
        })
        .map(l => ({
          lineId: l.id,
          original: l.original,
          translation: l.translation
        }));
    }
    const lowerPhrase = phrase.text.toLowerCase();
    const matched = (currentTrack.lines || []).filter(l => l.original.toLowerCase().includes(lowerPhrase));
    if (matched.length > 0) {
      return matched.slice(0, 2).map(l => ({
        lineId: l.id,
        original: l.original,
        translation: l.translation
      }));
    }
    return [];
  };

  const getPhraseStatus = (phraseText: string) => {
    const key = normalizePhraseKey(phraseText);
    const card = phraseMetadata?.get(key);
    return (card?.status as 'new' | 'learning' | 'known') || 'new';
  };

  const handleTogglePhraseSaved = (phrase: StructuredSectionPhrase) => {
    const saved = isPhraseSaved(phrase.text);
    if (saved) {
      // Toggle card status to mark it as new or keep it
      handleSetAnalysisPhraseStatus(phrase.text, phrase.translation, phrase.studyExample || '', 'new', phrase.type || 'phrase');
    } else {
      // Save phrase as learning item in CantoLex FSRS / Cards tab
      handleSetAnalysisPhraseStatus(phrase.text, phrase.translation, phrase.studyExample || '', 'learning', phrase.type || 'phrase');
    }
  };

  // Safe voicing wrapper
  const handleVoicing = (phraseText: string) => {
    setSpeakingText(phraseText);
    speak(phraseText, () => {
      setSpeakingText(null);
    });
  };

  const isFallbackError = useMemo(() => {
    return blocks.some(b => b.id === 'fallback-overview');
  }, [blocks]);

  if (isFallbackError) {
    return (
      <div className="w-full font-sans text-app-fg py-16 px-6 flex flex-col items-center text-center max-w-md mx-auto space-y-6" id="structured-lecture-error">
        <div className="w-16 h-16 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
          <HelpCircle size={32} />
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-black tracking-tight text-app-fg">Breakdown Failed</h3>
          <p className="text-sm text-app-muted font-medium leading-relaxed">
            Произошла ошибка при генерации разбора. Пожалуйста, попробуйте позже.
          </p>
        </div>
        {handleRegenerateAnalysis && (
          <button
            type="button"
            onClick={handleRegenerateAnalysis}
            className="flex items-center gap-2.5 px-6 py-3 bg-app-accent hover:bg-app-accent/95 cursor-pointer text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.03] shadow-md shadow-app-accent/15"
          >
            <RefreshCw size={14} />
            Regenerate Breakdown
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full font-sans text-app-fg select-text leading-relaxed pb-32" id="structured-lecture-analysis">
      
      {/* Structured Continuous List of Blocks */}
      <div className="space-y-6">
        {blocks.map((block) => {
          const isModelEditingText = editingBlockId === block.id && editingField === 'text';
          const isModelEditingTitle = editingBlockId === block.id && editingField === 'title';

          return (
            <section 
              key={block.id} 
              id={`block-${block.id}`} 
              className="space-y-3 animate-in fade-in duration-300 scroll-mt-24 group/section"
            >
              
              {/* Kind Marker Tag -- ultra minimalist inline label block */}
              <div className="flex items-center justify-between pb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent opacity-50 shrink-0 select-none">
                  {block.kind}
                </span>

                {/* Optional tiny manual section deleter */}
                {block.source === 'manual' && !editingBlockId && (
                  <button
                    type="button"
                    onClick={() => deleteBlockBlock(block.id)}
                    className="opacity-0 group-hover/section:opacity-60 hover:!opacity-100 p-1 text-app-muted hover:text-red-400 transition-opacity duration-200 cursor-pointer text-[10px] font-bold uppercase tracking-wider"
                    title="Delete section"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Editable Block Title */}
              <div className="relative group/title">
                {isModelEditingTitle ? (
                  <div className="flex items-center gap-2 max-w-full">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={tempEditValue}
                      onChange={(e) => setTempEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveBlockEdit(block.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="text-lg font-medium tracking-tight bg-transparent text-app-fg border-b border-app-accent w-full focus:outline-none py-0.5"
                    />
                    <div className="flex gap-2 shrink-0 select-none">
                      <button 
                        onClick={() => saveBlockEdit(block.id)} 
                        className="p-1 text-app-accent hover:scale-105 transition-transform"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={cancelEdit} 
                        className="p-1 text-app-muted hover:scale-105 transition-transform"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <h2 
                    onClick={() => startBlockEdit(block.id, 'title', block.title || '')}
                    className="font-sans font-semibold text-lg md:text-xl text-app-fg tracking-tight leading-snug cursor-text hover:text-app-accent transition-colors"
                  >
                    {block.title || getKindTitlePlaceholder(block.kind as BlockKind)}
                    <span className="inline-block opacity-0 group-hover/title:opacity-45 text-app-muted ml-2 pb-0.5 transition-opacity">
                      <Edit3 size={12} className="inline align-middle" />
                    </span>
                  </h2>
                )}
              </div>

              {/* Editable Commentary Paragraph Details */}
              <div className="relative group/text">
                {isModelEditingText ? (
                  <div className="space-y-3 mt-1">
                    <textarea
                      ref={editorRef}
                      value={tempEditValue}
                      onChange={(e) => {
                        setTempEditValue(e.target.value);
                        // Auto-growing textbox
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      className="w-full bg-transparent border-0 border-l border-app-accent/40 font-serif text-[16px] md:text-[18px] leading-relaxed text-app-fg py-1 px-4 focus:ring-0 focus:outline-none resize-none"
                      style={{ minHeight: '120px' }}
                    />
                    <div className="flex items-center justify-start gap-4 text-[10px] uppercase font-black tracking-widest pl-4 select-none">
                      <button 
                        onClick={() => saveBlockEdit(block.id)} 
                        className="text-app-accent hover:opacity-80 flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={11} className="inline" /> Save Content
                      </button>
                      <button 
                        onClick={cancelEdit} 
                        className="text-app-muted hover:text-app-fg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => startBlockEdit(block.id, 'text', block.text)}
                    className="font-serif text-[17px] md:text-[19px] leading-relaxed text-app-fg/80 cursor-text selection:bg-app-accent/10"
                    title="Click text body to edit inline"
                  >
                    <div className="markdown-body">
                      <ReactMarkdown>{block.text}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              {/* Nestable Phrases associated with this Section */}
              <div className="pt-2">
                <div className="space-y-3">
                  {(block.phrases || []).map((phrase) => {
                    const isPhraseEditing = editingPhraseId === phrase.id;
                    const isExpanded = expandedPhraseId === phrase.id;

                    if (isPhraseEditing) {
                      return (
                        <div 
                          key={phrase.id} 
                          className="flex flex-col p-4 bg-app-card border border-app-accent/30 rounded-2xl animate-in fade-in zoom-in-95 duration-200 shadow-sm relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-3 w-full">
                            {/* Active editor indicator */}
                            <div className="p-2.5 bg-app-accent/10 border border-app-accent/20 text-app-accent rounded-xl inline-flex shrink-0 max-h-12 justify-center items-center align-middle">
                              <Edit3 size={15} className="animate-pulse" />
                            </div>

                            {/* Inline editable inputs */}
                            <div className="flex-1 min-w-0 pr-1 space-y-2">
                              <div>
                                <input
                                  type="text"
                                  value={tempPhraseText}
                                  onChange={(e) => setTempPhraseText(e.target.value)}
                                  className="w-full bg-app-bg text-app-fg border border-app-card-border/80 focus:border-app-accent focus:ring-1 focus:ring-app-accent rounded-xl py-1.5 px-3 font-sans text-sm sm:text-base font-extrabold tracking-tight leading-none outline-none"
                                  placeholder="Original Phrase • Оригинальная фраза"
                                  autoFocus
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={tempPhraseTranslation}
                                  onChange={(e) => setTempPhraseTranslation(e.target.value)}
                                  className="w-full bg-app-bg text-app-fg border border-app-card-border/80 focus:border-app-accent focus:ring-1 focus:ring-app-accent rounded-xl py-1 px-3 font-sans text-xs sm:text-sm font-semibold tracking-tight leading-none outline-none"
                                  placeholder="Translation • Перевод"
                                />
                              </div>
                            </div>

                            {/* Controls actions row */}
                            <div className="flex items-center gap-1.5 shrink-0 align-middle">
                              <button
                                type="button"
                                onClick={() => savePhraseEdit(block.id, phrase.id)}
                                className="p-2.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePhraseItem(block.id, phrase.id)}
                                className="p-2.5 border border-red-500/20 bg-red-500/10 text-red-200 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                                title="Delete Phrase"
                              >
                                <Trash2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-2.5 border border-app-card-border bg-app-bg text-app-muted hover:text-app-fg rounded-xl hover:bg-app-card-border/20 active:scale-95 transition-all cursor-pointer"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const isSaveActive = isPhraseSaved(phrase.text);

                    return (
                      <div 
                        key={phrase.id} 
                        className="group/phrase flex flex-col p-4 bg-app-card border border-app-card-border hover:border-app-accent/30 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer relative"
                        onClick={() => setExpandedPhraseId(expandedPhraseId === phrase.id ? null : phrase.id)}
                      >
                        {/* Visible Row (Always visible) */}
                        <div className="flex items-center gap-3 w-full">
                          {/* Voice action */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoicing(phrase.text);
                            }}
                            className="p-2 bg-app-bg text-app-muted hover:text-app-fg rounded-xl transition-all active:scale-95 inline-flex shrink-0 border border-app-card-border/40 hover:border-app-card-border align-middle leading-none cursor-pointer"
                            title="Pronounce"
                          >
                            <Volume2 size={15} />
                          </button>

                          {/* Phrase Text & Translation */}
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="font-serif text-[17px] md:text-[19px] text-app-accent leading-snug">
                                {phrase.text}
                              </span>
                            </div>
                            <p className="font-serif text-[17px] md:text-[19px] text-app-muted mt-0.5 leading-snug">
                              {phrase.translation}
                            </p>
                          </div>

                          {/* FSRS Toggle trigger */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePhraseSaved(phrase);
                            }}
                            className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer shrink-0 border active:scale-95 ${
                              isSaveActive 
                                ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' 
                                : 'bg-app-bg text-app-muted hover:text-app-fg border border-app-card-border/30 hover:border-app-accent/30'
                            }`}
                            title={isSaveActive ? 'Saved in Study Cards' : 'Add phrase to Cards'}
                          >
                            {isSaveActive ? <Check size={14} /> : <Plus size={14} />}
                          </button>
                        </div>

                        {/* Expandable info space */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="pt-3.5 mt-3 border-t border-app-card-border/40 space-y-3.5" onClick={(e) => e.stopPropagation()}>
                                {/* Example usage */}
                                {phrase.studyExample && (
                                  <div className="pl-4 border-l-2 border-app-card-border/55 py-0.5">
                                    <p className="font-serif text-[17px] md:text-[19px] text-app-muted/90 italic leading-relaxed">
                                      "{phrase.studyExample}"
                                    </p>
                                  </div>
                                )}

                                {/* Tags layer (chips) */}
                                <div className="flex flex-wrap gap-2 items-center">
                                  {/* Type badge */}
                                  {phrase.type && phrase.type !== 'phrase' && (
                                    <span className="text-[9px] uppercase font-black tracking-widest text-[#6366f1] bg-[#6366f1]/10 border border-[#6366f1]/10 px-2 py-0.5 rounded-lg shrink-0 leading-none">
                                      {phrase.type}
                                    </span>
                                  )}

                                  {/* Priority/Level indicator badge */}
                                  {phrase.priority && (
                                    <span className={`text-[9.5px] uppercase font-black tracking-[0.08em] px-2 py-0.5 rounded-lg leading-none shrink-0 border ${
                                      phrase.priority === 'core' ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' :
                                      phrase.priority === 'colloquial' ? 'bg-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/10' :
                                      phrase.priority === 'cultural' ? 'bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/10' :
                                      'bg-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-500/10'
                                    }`}>
                                      {phrase.priority}
                                    </span>
                                  )}
                                </div>

                                {/* Editor Action row only */}
                                <div className="flex items-center justify-between pt-2 border-t border-app-card-border/20">
                                  <button
                                    type="button"
                                    onClick={() => startPhraseEdit(phrase)}
                                    className="text-[10px] uppercase font-extrabold tracking-wider text-app-muted hover:text-app-fg flex items-center gap-1 cursor-pointer py-0.5"
                                  >
                                    <Edit3 size={11} /> Edit Phrase
                                  </button>
                                  <span className="text-[9px] font-mono opacity-25 select-none uppercase tracking-widest">
                                    CantoLex Interactive Card
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gentle Thin Divider line */}
              {block.kind !== 'notes' && <div className="border-b border-app-card-border/35 pt-6" />}

            </section>
          );
        })}
      </div>

      {/* Regeneration action panel at the deep bottom */}
      {handleRegenerateAnalysis && (
        <div className="border border-app-card-border/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 mt-10" id="reset-lecture-block">
          <div className="space-y-2 text-center md:text-left w-full">
            <button
              type="button"
              disabled={isGeneratingAnalysis}
              onClick={handleRegenerateAnalysis}
              className="group text-[12px] font-black uppercase tracking-[0.18em] text-app-fg hover:text-app-accent leading-none flex items-center justify-center md:justify-start gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
            >
              <RefreshCw 
                size={12} 
                className={`text-app-accent shrink-0 transition-transform duration-500 ${isGeneratingAnalysis ? 'animate-spin' : 'group-hover:rotate-180'}`} 
              />
              <span>{isGeneratingAnalysis ? 'Rebuilding...' : 'Rebuild breakdown'}</span>
            </button>
            <p className="text-[11px] text-app-fg opacity-40 max-w-sm font-medium leading-normal select-none">
              Re-engage serverless AI music specialists to reconstruct the structured language breakdown essay from the source lyrics block.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
