import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Save, 
  X, 
  Quote, 
  Grid,
  TrendingUp,
  Award,
  Globe,
  Compass,
  FileText,
  PenTool,
  Bookmark,
  RefreshCw,
  Eye,
  Link
} from 'lucide-react';
import { TrackLyricsData, StructuredLectureBlock, LyricsLine } from '../services/musicService';
import ReactMarkdown from 'react-markdown';

interface StructuredAnalysisLectureProps {
  currentTrack: TrackLyricsData;
  onUpdateTrack: (updatedTrack: TrackLyricsData) => Promise<void>;
  isGeneratingAnalysis?: boolean;
  handleRegenerateAnalysis?: () => void;
  targetLanguage: string;
}

export const StructuredAnalysisLecture: React.FC<StructuredAnalysisLectureProps> = ({
  currentTrack,
  onUpdateTrack,
  isGeneratingAnalysis = false,
  handleRegenerateAnalysis,
  targetLanguage
}) => {
  // Ensure we have a valid array of blocks
  const blocks = useMemo(() => {
    if (currentTrack.lectureBlocks && currentTrack.lectureBlocks.length > 0) {
      return currentTrack.lectureBlocks;
    }
    
    // Auto-initialize standard default blocks if they do not exist
    const initial: StructuredLectureBlock[] = [
      {
        id: 'init-summary',
        kind: 'summary',
        title: 'Core Narrative & Summary',
        text: currentTrack.meaning || 'Provide a central summary and emotional premise of the song lyrics.',
        source: 'ai'
      },
      {
        id: 'init-themes',
        kind: 'themes',
        title: 'Primary Themes',
        text: 'The themes of this song frequently capture core components of human dialogue, relationships, and identity.',
        source: 'ai'
      },
      {
        id: 'init-motifs',
        kind: 'motifs',
        title: 'Metaphors & Poetic Imagery',
        text: 'Pay attention to key visual motifs or repeating metaphors like color descriptors, climate/seasons, or physical distances.',
        source: 'ai'
      },
      {
        id: 'init-context',
        kind: 'context',
        title: 'Cultural & Historic Background',
        text: `Background context regarding this track by ${currentTrack.artist}. Discover real-life stories behind the release or slang patterns in the target culture.`,
        source: 'ai'
      },
      {
        id: 'init-important_lines',
        kind: 'important_lines',
        title: 'Poetic Verses & Climaxes',
        text: 'Review the lyrics for structural climaxes or high-priority verses that anchor the entire meaning of the song.',
        source: 'ai'
      },
      {
        id: 'init-takeaways',
        kind: 'takeaways',
        title: 'Linguistic Key Takeaways',
        text: 'Linguistic notes, vocabulary discoveries, and grammar insights derived from researching this track.',
        source: 'ai'
      },
      {
        id: 'init-notes',
        kind: 'notes',
        title: 'Personal Study Notebook',
        text: 'Use this workspace card as a general journal to map out your progression, questions, or custom translations.',
        source: 'manual'
      }
    ];
    return initial;
  }, [currentTrack.lectureBlocks, currentTrack.meaning, currentTrack.artist]);

  // Active filters and query searching
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing state
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [formKind, setFormKind] = useState<StructuredLectureBlock['kind']>('summary');
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formLineIds, setFormLineIds] = useState<string[]>([]);
  const [isLinkingLinesOpen, setIsLinkingLinesOpen] = useState(false);

  // New block adding state
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Filter types definitions
  const sectionFilters = [
    { id: 'all', label: 'All Content', icon: <Grid size={13} /> },
    { id: 'summary', label: 'Summary', icon: <BookOpen size={13} /> },
    { id: 'themes', label: 'Themes', icon: <TrendingUp size={13} /> },
    { id: 'motifs', label: 'Motifs', icon: <Award size={13} /> },
    { id: 'context', label: 'Context', icon: <Globe size={13} /> },
    { id: 'important_lines', label: 'Key Verses', icon: <FileText size={13} /> },
    { id: 'takeaways', label: 'Linguistic Notes', icon: <Compass size={13} /> },
    { id: 'notes', label: 'My Notes', icon: <PenTool size={13} /> }
  ];

  // Helper to match text highlights
  const matchesFilter = (block: StructuredLectureBlock) => {
    if (activeFilter !== 'all' && block.kind !== activeFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const contentMatch = block.text.toLowerCase().includes(q);
      const titleMatch = (block.title || '').toLowerCase().includes(q);
      return contentMatch || titleMatch;
    }
    return true;
  };

  const filteredBlocks = useMemo(() => {
    return blocks.filter(matchesFilter);
  }, [blocks, activeFilter, searchQuery]);

  // Trigger update block
  const handleSaveBlocks = async (updatedList: StructuredLectureBlock[]) => {
    const updatedTrack: TrackLyricsData = {
      ...currentTrack,
      lectureBlocks: updatedList
    };
    await onUpdateTrack(updatedTrack);
  };

  // Start editing block
  const startEdit = (block: StructuredLectureBlock) => {
    setEditingBlockId(block.id);
    setFormKind(block.kind);
    setFormTitle(block.title || '');
    setFormText(block.text);
    setFormLineIds(block.lineIds || []);
    setIsAddingNew(false);
  };

  // Save the block
  const saveBlockEdit = async () => {
    if (!formText.trim()) return;
    const updated = blocks.map(b => {
      if (b.id === editingBlockId) {
        return {
          ...b,
          kind: formKind,
          title: formTitle.trim() || undefined,
          text: formText,
          lineIds: formLineIds,
          source: b.source // preserve either ai or manual
        } as StructuredLectureBlock;
      }
      return b;
    });
    await handleSaveBlocks(updated);
    setEditingBlockId(null);
  };

  // Delete a block
  const deleteBlock = async (id: string) => {
    if (confirm('Delete this lecture block?')) {
      const updated = blocks.filter(b => b.id !== id);
      await handleSaveBlocks(updated);
      if (editingBlockId === id) setEditingBlockId(null);
    }
  };

  // Add custom manual block
  const addNewBlock = async () => {
    if (!formText.trim()) return;
    const newBlock: StructuredLectureBlock = {
      id: `block-${Date.now()}`,
      kind: formKind,
      title: formTitle.trim() || 'New Study Module',
      text: formText,
      lineIds: formLineIds,
      source: 'manual'
    };
    const updated = [...blocks, newBlock];
    await handleSaveBlocks(updated);
    setIsAddingNew(false);
    resetForm();
  };

  const resetForm = () => {
    setFormKind('notes');
    setFormTitle('');
    setFormText('');
    setFormLineIds([]);
    setIsLinkingLinesOpen(false);
  };

  // Category labels with distinct stylish styling
  const getCategoryDetails = (kind: StructuredLectureBlock['kind']) => {
    switch (kind) {
      case 'summary':
        return { label: 'Summary', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' };
      case 'themes':
        return { label: 'Themes', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' };
      case 'motifs':
        return { label: 'Imagery & Symbols', color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400 border-pink-200 dark:border-pink-500/20' };
      case 'context':
        return { label: 'Context', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20' };
      case 'important_lines':
        return { label: 'Key Verses', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' };
      case 'takeaways':
        return { label: 'Linguistic Notes', color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-200 dark:border-teal-500/20' };
      case 'notes':
        return { label: 'My Notes', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-500/10 dark:text-neutral-300 border-neutral-200 dark:border-neutral-500/20' };
    }
  };

  // Toggle associated line
  const toggleLineIdSelection = (lineId: string) => {
    setFormLineIds(prev => 
      prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]
    );
  };

  return (
    <div className="w-full space-y-8 select-none" id="structured-lecture-analysis">
      
      {/* Search and Filters Header bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-app-card-border/60 pb-6">
        
        {/* Search bar on left */}
        <div className="md:col-span-4 relative">
          <input
            id="search-lecture-blocks"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search block contents..."
            className="w-full bg-app-card border border-app-card-border/80 text-app-fg placeholder-app-muted rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent/30 transition-all duration-200 shadow-sm"
          />
          <BookOpen className="absolute left-3 top-3.5 text-app-muted shrink-0" size={14} />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-app-muted hover:text-app-fg"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filters and CTA button on right */}
        <div className="md:col-span-8 flex flex-wrap items-center justify-between gap-3">
          {/* Section Filter Pills */}
          <div className="flex flex-wrap gap-1.5 max-w-full">
            {sectionFilters.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                  activeFilter === pill.id
                    ? 'bg-app-fg text-app-bg border-app-fg shadow-md scale-[1.03]'
                    : 'bg-app-card text-app-muted border-app-card-border/60 hover:border-app-accent/30 hover:text-app-fg'
                }`}
              >
                {pill.icon}
                <span>{pill.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true);
              setEditingBlockId(null);
              resetForm();
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-app-fg hover:bg-app-fg-hover cursor-pointer text-app-bg rounded-xl text-xs font-black uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md"
          >
            <Plus size={14} /> Add Block
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* Creator / Inline Editor Mode */}
        {(isAddingNew || editingBlockId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-app-card border border-app-accent/30 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-app-accent via-app-accent/80 to-app-fg" />

            <div className="flex items-center justify-between pb-3 border-b border-app-card-border/60">
              <h3 className="text-sm font-black uppercase tracking-widest text-app-fg flex items-center gap-2">
                <PenTool size={16} className="text-app-accent" />
                {isAddingNew ? 'Create New Study Block' : 'Edit Study Block'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingBlockId(null);
                }}
                className="p-1 px-3 bg-app-bg text-[10px] uppercase font-black tracking-wider text-app-muted hover:text-app-fg rounded-lg border border-app-card-border/80 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Category picker */}
              <div className="md:col-span-4 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-app-muted">Category Type</label>
                <div className="grid grid-cols-1 gap-1">
                  {sectionFilters.filter(f => f.id !== 'all').map((kindOpt) => (
                    <button
                      key={kindOpt.id}
                      type="button"
                      onClick={() => setFormKind(kindOpt.id as any)}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-all duration-150 border cursor-pointer ${
                        formKind === kindOpt.id 
                          ? 'bg-app-accent/5 text-app-accent border-app-accent' 
                          : 'bg-app-bg text-app-muted border-app-card-border/30 hover:border-app-card-border/80 hover:text-app-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {kindOpt.icon}
                        <span>{kindOpt.label}</span>
                      </div>
                      {formKind === kindOpt.id && <span className="h-2 w-2 rounded-full bg-app-accent shrink-0 animate-pulse" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* General fields */}
              <div className="md:col-span-8 space-y-4">
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <label className="text-[10px] font-black uppercase tracking-wider text-app-muted">Custom Block Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter short block headline..."
                    className="w-full bg-app-bg border border-app-card-border/80 text-app-fg rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-app-accent transition-colors shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-app-muted">Lecture Text / Analysis Commentary (Markdown supported)</label>
                  <textarea
                    rows={6}
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="Provide insights, grammar details, translations, cultural background..."
                    className="w-full bg-app-bg border border-app-card-border/80 text-app-fg rounded-xl py-2.5 px-3 text-xs font-semibold focus:outline-none focus:border-app-accent transition-colors shadow-inner font-sans resize-y"
                  />
                </div>

                {/* Linking lyrics lines section */}
                <div className="space-y-2 border-t border-app-card-border/60 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link size={13} className="text-app-accent" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-app-fg">
                        Link Specific Lyrics Verses ({formLineIds.length} Linked)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLinkingLinesOpen(!isLinkingLinesOpen)}
                      className="px-2.5 py-1 bg-app-bg hover:bg-app-card text-[9px] uppercase font-black tracking-wider text-app-accent rounded-lg border border-app-card-border/60 cursor-pointer"
                    >
                      {isLinkingLinesOpen ? 'Hide Picker' : 'Show & Pick Verses'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {isLinkingLinesOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 160 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-y-auto border border-app-card-border/40 bg-app-bg/50 rounded-xl p-2.5 text-xs font-medium space-y-1"
                      >
                        {currentTrack.lines.map((line) => {
                          const isSelected = formLineIds.includes(String(line.index));
                          return (
                            <button
                              key={line.index}
                              type="button"
                              onClick={() => toggleLineIdSelection(String(line.index))}
                              className={`w-full text-left p-1.5 px-2.5 rounded-lg flex items-center justify-between border cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-app-accent/10 border-app-accent/80 text-app-accent font-bold' 
                                  : 'bg-app-card border-app-card-border/20 text-app-muted hover:border-app-card-border hover:text-app-fg'
                              }`}
                            >
                              <div className="flex items-center gap-3 truncate">
                                <span className="font-mono text-[9px] opacity-40 shrink-0">#{line.index + 1}</span>
                                <span className="truncate">{line.original}</span>
                              </div>
                              <span className="text-[8px] opacity-60 italic shrink-0 truncate max-w-[120px] ml-4">{line.translation}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-app-card-border/60">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingBlockId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-app-muted hover:text-app-fg cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={isAddingNew ? addNewBlock : saveBlockEdit}
                className="flex items-center gap-2 px-5 py-2 bg-app-accent hover:bg-app-accent/90 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-200 cursor-pointer shadow-md shadow-app-accent/10"
              >
                <Save size={13} /> Save Block
              </button>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Main Blocks List Container */}
      <div className="space-y-6">
        {filteredBlocks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-app-card border border-app-card-border flex items-center justify-center text-app-fg opacity-20">
              <Sparkles size={28} />
            </div>
            <div className="space-y-2">
              <h4 className="text-md font-bold text-app-fg">No Blocks Matched</h4>
              <p className="text-app-fg opacity-40 text-xs max-w-sm mx-auto">
                No lecture blocks matched your filter/search criteria. Feel free to clear the filter or click "Add Block" to insert your own manual observations.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredBlocks.map((block) => {
              const cat = getCategoryDetails(block.kind);
              const isEditing = editingBlockId === block.id;

              return (
                <motion.div
                  layout
                  key={block.id}
                  id={`block-card-${block.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className={`group bg-app-card border border-app-card-border/60 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md transition-all duration-300 hover:shadow-lg hover:border-app-card-border ${
                    isEditing ? 'ring-2 ring-app-accent' : ''
                  }`}
                >
                  
                  {/* Card Header with Badges and controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border leading-none ${cat.color}`}>
                        {cat.label}
                      </span>
                      {block.source === 'ai' ? (
                        <span className="bg-app-bg border border-app-card-border text-app-muted rounded-md text-[8px] px-1.5 py-0.5 leading-none font-bold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={8} className="text-app-accent" /> AI Analyst
                        </span>
                      ) : (
                        <span className="bg-app-accent/5 border border-app-accent/20 text-app-accent rounded-md text-[8px] px-1.5 py-0.5 leading-none font-bold uppercase tracking-wider flex items-center gap-1">
                          <PenTool size={8} /> My study-note
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startEdit(block)}
                        title="Edit study block"
                        className="p-1.5 bg-app-bg hover:bg-app-card-border/40 text-app-muted hover:text-app-fg rounded-xl border border-app-card-border/30 cursor-pointer"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBlock(block.id)}
                        title="Delete block"
                        className="p-1.5 bg-app-bg hover:bg-red-500/15 text-app-muted hover:text-red-500 rounded-xl border border-app-card-border/30 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  {block.title && (
                    <h3 className="text-md sm:text-lg font-black text-app-fg uppercase tracking-widest leading-snug">
                      {block.title}
                    </h3>
                  )}

                  {/* Linked Lines quoted block */}
                  {block.lineIds && block.lineIds.length > 0 && (
                    <div className="bg-app-bg/50 border-l-2 border-app-accent/50 rounded-r-2xl p-3 space-y-2">
                      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider opacity-60">
                        <Quote size={10} className="text-app-accent" /> Linked lyrics details:
                      </div>
                      <div className="space-y-1.5 text-xs font-semibold">
                        {block.lineIds.map(lineIdx => {
                          const lineObj = currentTrack.lines.find(l => String(l.index) === String(lineIdx));
                          if (!lineObj) return null;
                          return (
                            <div key={lineIdx} className="leading-relaxed">
                              <span className="text-app-fg block">{lineObj.original}</span>
                              <span className="text-app-muted font-normal block text-[10px] mt-0.5">{lineObj.translation}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Main commentary text block */}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-app-fg/80 font-medium">
                    <div className="markdown-body">
                      <ReactMarkdown>{block.text}</ReactMarkdown>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Regeneration prompt container at bottom */}
      {handleRegenerateAnalysis && (
        <div className="border border-app-card-border/50 bg-app-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h5 className="text-xs font-black uppercase tracking-wider text-app-fg">Reset AI Lecture Analysis</h5>
            <p className="text-[10px] text-app-fg opacity-40 max-w-md font-medium leading-normal">
              Would you like to ask the Gemini AI music expert to rebuild the entire structured translation and lecture breakdown for this song again?
            </p>
          </div>
          <button
            type="button"
            onClick={handleRegenerateAnalysis}
            className="flex items-center gap-2 px-5 py-2.5 bg-app-bg hover:bg-app-card border border-app-card-border text-app-fg rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer"
          >
            <RefreshCw size={13} className="text-app-accent shrink-0" /> Regenerate Lecture
          </button>
        </div>
      )}

    </div>
  );
};
