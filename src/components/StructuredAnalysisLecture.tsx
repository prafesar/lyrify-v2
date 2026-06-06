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
import { PhraseStatus } from '../services/cardService';
import ReactMarkdown from 'react-markdown';

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
    status: PhraseStatus
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
    let migrated: StructuredLectureBlock[] = rawBlocks.map(b => {
      let k = b.kind as string;
      if (k === 'summary' || k === 'important_lines') k = 'overview';
      if (k === 'themes' || k === 'motifs') k = 'emotions';
      if (k === 'context') k = 'overview';
      
      return {
        ...b,
        kind: k as any
      };
    });

    // Make sure we have at least one block placeholder for all 6 target kinds to ensure completeness
    const result: StructuredLectureBlock[] = [];
    
    targetKinds.forEach(kind => {
      // Find all blocks of this kind
      const matching = migrated.filter(b => b.kind === kind);
      if (matching.length > 0) {
        matching.forEach(b => result.push(b));
      } else {
        // Create an elegant default placeholder
        result.push({
          id: `init-${kind}`,
          kind: kind,
          title: getKindTitlePlaceholder(kind),
          text: getKindTextPlaceholder(kind, currentTrack.artist),
          source: 'manual',
          phrases: []
        });
      }
    });

    return result;
  }, [currentTrack.lectureBlocks, currentTrack.meaning, currentTrack.artist]);

  // Active inline editing states
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'text' | null>(null);
  
  // Track state of inline phrase we are editing
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);

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
      case 'emotions': return 'Aesthetic Mood & Tone Analysis';
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
              source: p.source
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
    const key = phraseText.trim().toLowerCase();
    const card = phraseMetadata?.get(key);
    return card && (card.status === 'learning' || card.status === 'known');
  };

  const handleTogglePhraseSaved = (phrase: StructuredSectionPhrase) => {
    const saved = isPhraseSaved(phrase.text);
    if (saved) {
      // Toggle card status to mark it as new or keep it
      handleSetAnalysisPhraseStatus(phrase.text, phrase.translation, phrase.studyExample || '', 'new');
    } else {
      // Save phrase as learning item in CantoLex FSRS / Cards tab
      handleSetAnalysisPhraseStatus(phrase.text, phrase.translation, phrase.studyExample || '', 'learning');
    }
  };

  // Safe voicing wrapper
  const handleVoicing = (phraseText: string) => {
    speak(phraseText);
  };

  return (
    <div className="w-full max-w-3xl mx-auto font-sans text-app-fg select-text leading-relaxed pb-32" id="structured-lecture-analysis">
      
      {/* Editorial Header */}
      <div className="text-center md:text-left space-y-2 border-b border-app-card-border/30 pb-10 mb-14" id="lecture-title-block">
        <div className="inline-flex items-center gap-1.5 uppercase font-bold tracking-[0.25em] text-[10px] text-app-accent leading-none">
          <BookOpen size={11} className="shrink-0" /> Annotated Lecture Breakdown
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-extrabold tracking-tight text-app-fg mt-1 leading-tight uppercase font-sans">
          {currentTrack.title}
        </h1>
        <p className="text-sm font-semibold tracking-wide text-app-fg opacity-65 font-sans lowercase">
          by {currentTrack.artist} • custom linguistic essay
        </p>
      </div>

      {/* Structured Continuous List of Blocks */}
      <div className="space-y-16">
        {blocks.map((block) => {
          const isModelEditingText = editingBlockId === block.id && editingField === 'text';
          const isModelEditingTitle = editingBlockId === block.id && editingField === 'title';

          return (
            <section 
              key={block.id} 
              id={`block-${block.id}`} 
              className="space-y-4 animate-in fade-in duration-300 scroll-mt-24 group/section"
            >
              
              {/* Kind Marker Tag -- ultra minimalist inline label block */}
              <div className="flex items-center justify-between pb-1">
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
                      className="text-lg font-bold tracking-tight bg-transparent text-app-fg border-b border-app-accent w-full focus:outline-none py-0.5"
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
                    className="font-sans font-extrabold text-xl md:text-2xl text-app-fg tracking-tight leading-tight cursor-text hover:text-app-accent/80 transition-colors uppercase"
                  >
                    {block.title || getKindTitlePlaceholder(block.kind as BlockKind)}
                    <span className="inline-block opacity-0 group-hover/title:opacity-40 text-app-muted ml-2 pb-1.5 transition-opacity">
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
                      className="w-full bg-transparent border-0 border-l border-app-accent/40 text-[15px] leading-relaxed text-app-fg font-medium py-1 px-4 focus:ring-0 focus:outline-none resize-none font-sans"
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
                    className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed text-app-fg/75 font-medium cursor-text selection:bg-app-accent/10"
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
                <div className="space-y-2.5">
                  {(block.phrases || []).map((phrase) => {
                    const isSaveActive = isPhraseSaved(phrase.text);
                    const isPhraseEditing = editingPhraseId === phrase.id;

                    if (isPhraseEditing) {
                      return (
                        <div 
                          key={phrase.id} 
                          className="p-3.5 bg-app-card border border-app-accent/30 rounded-2xl space-y-3 border-l-2 border-l-app-accent animate-in fade-in zoom-in-95 duration-200"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-black tracking-wider text-app-muted">Original Phrase</label>
                              <input
                                type="text"
                                value={tempPhraseText}
                                onChange={(e) => setTempPhraseText(e.target.value)}
                                className="w-full bg-app-bg text-app-fg rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-app-accent"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-black tracking-wider text-app-muted">Translation</label>
                              <input
                                type="text"
                                value={tempPhraseTranslation}
                                onChange={(e) => setTempPhraseTranslation(e.target.value)}
                                className="w-full bg-app-bg text-app-fg rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-app-accent"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-black tracking-wider text-app-muted">Poetic Study Example (Optional)</label>
                              <input
                                type="text"
                                value={tempPhraseExample}
                                onChange={(e) => setTempPhraseExample(e.target.value)}
                                className="w-full bg-app-bg text-app-fg rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-app-accent"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-black tracking-wider text-app-muted">Keyword Category / Grammar Tag</label>
                              <input
                                type="text"
                                value={tempPhraseType}
                                onChange={(e) => setTempPhraseType(e.target.value)}
                                placeholder="idiom, slang, verb, cultural..."
                                className="w-full bg-app-bg text-app-fg rounded-lg py-1 px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-app-accent"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest leading-none pt-2 border-t border-app-card-border/20 select-none">
                            <button
                              type="button"
                              onClick={() => deletePhraseItem(block.id, phrase.id)}
                              className="text-red-400 hover:text-red-500 cursor-pointer"
                            >
                              Delete Phrase
                            </button>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => savePhraseEdit(block.id, phrase.id)}
                                className="text-app-accent hover:opacity-80 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Check size={12} /> Save Phrase
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-app-muted hover:text-app-fg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={phrase.id} 
                        className="group/phrase flex items-baseline justify-between py-1.5 px-3 -mx-3 hover:bg-app-card-border/10 rounded-xl transition-all duration-150 relative border-l border-transparent hover:border-app-accent/25"
                      >
                        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1.5 max-w-[85%]">
                          {/* Play pronunciation button */}
                          <button
                            type="button"
                            onClick={() => handleVoicing(phrase.text)}
                            className="p-1 hover:bg-app-bg text-app-muted hover:text-app-fg rounded-lg transition-transform hover:scale-105 inline-flex shrink-0 border border-transparent hover:border-app-card-border align-middle leading-none"
                            title="Pronounce"
                          >
                            <Volume2 size={10.5} />
                          </button>

                          {/* Foreign Key Phrase word */}
                          <span 
                            onClick={() => startPhraseEdit(phrase)}
                            className="font-mono text-[13px] md:text-sm font-bold text-app-fg tracking-tight leading-none text-left cursor-text hover:text-app-accent"
                          >
                            {phrase.text}
                          </span>

                          {/* Category Badge / Indicator */}
                          {phrase.type && phrase.type !== 'phrase' && (
                            <span className="text-[8.5px] uppercase font-black tracking-widest text-app-accent leading-none scale-[0.9] opacity-60 self-center">
                              {phrase.type}
                            </span>
                          )}

                          {/* Simple Dash separator & translation */}
                          <span className="text-xs text-app-muted">—</span>
                          <span 
                            onClick={() => startPhraseEdit(phrase)}
                            className="text-xs font-semibold text-app-muted cursor-text hover:text-app-fg transition-colors"
                          >
                            {phrase.translation}
                          </span>

                          {/* Embedded Poetic Example */}
                          {phrase.studyExample && (
                            <span 
                              onClick={() => startPhraseEdit(phrase)}
                              className="text-[10.5px] font-medium text-app-muted italic opacity-60 ml-2 border-l border-app-card-border/65 pl-2 leading-none self-center cursor-text"
                            >
                              "{phrase.studyExample}"
                            </span>
                          )}
                        </div>

                        {/* Inline Delicate FSRS / Cards Sync controls */}
                        <div className="flex items-center gap-2 select-none opacity-0 group-hover/phrase:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                          {/* Open editor shortcut */}
                          <button
                            type="button"
                            onClick={() => startPhraseEdit(phrase)}
                            className="text-[9px] uppercase font-bold tracking-wider text-app-muted hover:text-app-fg cursor-pointer p-0.5"
                          >
                            Edit
                          </button>

                          {/* Star/Check Card Icon */}
                          <button
                            type="button"
                            onClick={() => handleTogglePhraseSaved(phrase)}
                            className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                              isSaveActive 
                                ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' 
                                : 'bg-app-bg text-app-muted hover:text-app-fg border border-app-card-border/30 hover:border-app-accent'
                            }`}
                            title={isSaveActive ? 'Saved in Study Cards' : 'Add phrase to Cards'}
                          >
                            {isSaveActive ? <Check size={11} /> : <Plus size={11} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quiet add word card block inside specific kinds */}
                {(['sections', 'lexical_groups', 'takeaways'] as string[]).includes(block.kind) && !editingBlockId && (
                  <div className="pt-2 select-none">
                    <button
                      type="button"
                      onClick={() => addPhraseItem(block.id)}
                      className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-app-muted hover:text-app-accent/80 transition-colors cursor-pointer"
                    >
                      <Plus size={10} /> Add Practice Phrase
                    </button>
                  </div>
                )}
              </div>

              {/* Gentle Thin Divider line */}
              {block.kind !== 'notes' && <div className="border-b border-app-card-border/35 pt-10" />}

            </section>
          );
        })}
      </div>

      {/* Regeneration action panel at the deep bottom */}
      {handleRegenerateAnalysis && (
        <div className="border border-app-card-border/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 mt-20" id="reset-lecture-block">
          <div className="space-y-1 text-center md:text-left select-none">
            <h5 className="text-[12px] font-black uppercase tracking-[0.18em] text-app-fg leading-none flex items-center justify-center md:justify-start gap-1">
              <RefreshCw size={11} className="text-app-accent shrink-0" /> Rebuild Analysis Lecture
            </h5>
            <p className="text-[11px] text-app-fg opacity-40 max-w-sm font-medium leading-normal">
              Re-engage Gemini AI music specialists to reconstruct the structured language breakdown essay from the source lyrics block.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRegenerateAnalysis}
            className="flex items-center gap-2 px-5 py-2.5 bg-app-fg hover:bg-app-fg-hover cursor-pointer text-app-bg rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:scale-[1.03]"
          >
            Regenerate Essay
          </button>
        </div>
      )}

    </div>
  );
};
