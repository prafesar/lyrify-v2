import React, { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Volume2, 
  Lock, 
  CheckCircle2, 
  BookOpen, 
  Tag, 
  HelpCircle, 
  Sparkles, 
  User, 
  X, 
  ArrowRight,
  MessageSquare,
  RefreshCw,
  MoreVertical,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Phrase, LyricsLine, TrackLyricsData } from "../services/musicService";
import { PhraseStatus } from "../services/cardService";
import { addUserPhrase, editPhrase, deletePhrase } from "../services/lyricsAnalysisService";

interface AnalysisPhraseWorkspaceProps {
  currentTrack: TrackLyricsData;
  trackSearchQuery: string;
  setTrackSearchQuery: (query: string) => void;
  phraseMetadata: Map<string, any>;
  handleSetAnalysisPhraseStatus: (
    phraseText: string, 
    translation: string, 
    explanation: string, 
    status: PhraseStatus
  ) => void;
  speak: (text: string, onEnd?: () => void, lang?: string) => void;
  onUpdateTrack: (updatedTrack: TrackLyricsData) => Promise<void>;
  targetLanguage: string;
  onGoToLine: (lineOriginal: string, lineIndex: number) => void;
  isGeneratingAnalysis?: boolean;
  handleRegenerateAnalysis?: () => void;
}

export const AnalysisPhraseWorkspace: React.FC<AnalysisPhraseWorkspaceProps> = ({
  currentTrack,
  trackSearchQuery,
  setTrackSearchQuery,
  phraseMetadata,
  handleSetAnalysisPhraseStatus,
  speak,
  onUpdateTrack,
  targetLanguage,
  onGoToLine,
  isGeneratingAnalysis = false,
  handleRegenerateAnalysis
}) => {
  // Local state for Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);

  // Expanded cards state
  const [expandedPhraseKeys, setExpandedPhraseKeys] = useState<Set<string>>(new Set());

  // Dropdown menu state
  const [activeMenuPhraseKey, setActiveMenuPhraseKey] = useState<string | null>(null);

  // Add/Edit Form Fields
  const [formText, setFormText] = useState("");
  const [formTranslation, setFormTranslation] = useState("");
  const [formExplanation, setFormExplanation] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formType, setFormType] = useState("phrase");
  const [formLineId, setFormLineId] = useState("");

  // Speech Playing Tracker
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  // Extract all unique phrases across both track.phrases and nested lines phrases
  const uniquePhrases = useMemo(() => {
    const list: Phrase[] = [];
    const seen = new Set<string>();

    const addIfNew = (p: Phrase) => {
      const key = (p.text || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
    };

    if (currentTrack.phrases) {
      currentTrack.phrases.forEach(addIfNew);
    }
    if (currentTrack.lines) {
      currentTrack.lines.forEach(line => {
        if (line.phrases) {
          line.phrases.forEach(addIfNew);
        }
      });
    }

    return list;
  }, [currentTrack]);

  // Filter phrases based on searched query
  const filteredPhrases = useMemo(() => {
    let result = uniquePhrases;

    if (trackSearchQuery.trim()) {
      const q = trackSearchQuery.toLowerCase().trim();
      result = result.filter(phrase => {
        const textMatch = phrase.text?.toLowerCase().includes(q);
        const transMatch = phrase.translation?.toLowerCase().includes(q);
        const explMatch = phrase.explanation?.toLowerCase().includes(q);
        const noteMatch = phrase.note?.toLowerCase().includes(q);

        // Match linked lyric line textual content
        const lineMatch = currentTrack.lines?.some(line => {
          const isLinked = phrase.lineIds?.includes(line.lineId || "");
          if (!isLinked) return false;
          return (
            line.original?.toLowerCase().includes(q) || 
            line.translation?.toLowerCase().includes(q)
          );
        });

        return textMatch || transMatch || explMatch || noteMatch || lineMatch;
      });
    }

    return result;
  }, [uniquePhrases, trackSearchQuery, currentTrack.lines]);

  // Handle Speech trigger
  const handleVoicing = (phrase: Phrase) => {
    setCurrentlySpeakingId(phrase.id);
    speak(phrase.text, () => {
      setCurrentlySpeakingId(null);
    }, currentTrack.sourceLanguage);
  };

  // Open Edit Modal with prefilled values
  const handleOpenEdit = (phrase: Phrase) => {
    setEditingPhrase(phrase);
    setFormText(phrase.text || "");
    setFormTranslation(phrase.translation || "");
    setFormExplanation(phrase.explanation || "");
    setFormNote(phrase.note || "");
    setFormType(phrase.type || "phrase");
  };

  // Save the Edited Phrase
  const handleSaveEdit = async () => {
    if (!editingPhrase) return;

    const updates: Partial<Phrase> = {
      text: formText,
      translation: formTranslation,
      explanation: formExplanation,
      note: formNote,
      type: formType,
    };

    const updatedTrack = editPhrase(currentTrack, editingPhrase.id, updates);
    await onUpdateTrack(updatedTrack);
    setEditingPhrase(null);
    clearForm();
  };

  // Delete Phrase
  const handleDelete = async (phraseId: string) => {
    if (window.confirm("Are you sure you want to delete this phrase?")) {
      const updatedTrack = deletePhrase(currentTrack, phraseId);
      await onUpdateTrack(updatedTrack);
    }
  };

  // Save New Phrase
  const handleSaveAdd = async () => {
    if (!formText.trim()) return;

    // Use linked line selection or let auto-link do its magic
    const lineIdToLink = formLineId || undefined;

    const updatedTrack = addUserPhrase(
      currentTrack,
      formText.trim(),
      formTranslation.trim(),
      formExplanation.trim(),
      lineIdToLink,
      formNote.trim()
    );

    await onUpdateTrack(updatedTrack);
    setIsAddModalOpen(false);
    clearForm();
  };

  const clearForm = () => {
    setFormText("");
    setFormTranslation("");
    setFormExplanation("");
    setFormNote("");
    setFormType("phrase");
    setFormLineId("");
  };

  const toggleExpand = (key: string) => {
    setExpandedPhraseKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header toolbar with search input and Add Phrase CTA */}
      <div className="flex gap-4 items-stretch md:items-center justify-between">
        {/* Search input field */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-app-fg opacity-40">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search phrases, translations, notes, or lyric context..."
            value={trackSearchQuery}
            onChange={(e) => setTrackSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-app-card border border-app-card-border rounded-2xl text-lg font-medium text-app-fg placeholder-app-fg/30 focus:outline-none focus:border-app-accent/50 transition-all font-sans"
          />
          {trackSearchQuery && (
            <button
              onClick={() => setTrackSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-app-fg opacity-45 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {handleRegenerateAnalysis && (
            <button
              onClick={handleRegenerateAnalysis}
              disabled={isGeneratingAnalysis}
              className="flex items-center gap-1.5 px-4 py-3.5 bg-app-card border border-app-card-border text-app-fg opacity-60 hover:opacity-100 hover:text-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
              title="Reset and regenerate analysis"
            >
              <RefreshCw size={12} className={isGeneratingAnalysis ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          )}
          <button
            onClick={() => {
              clearForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center w-12 h-12 bg-orange-500 hover:bg-orange-600 transition-colors text-white rounded-full shadow-lg shrink-0 hover:scale-105 active:scale-95 duration-200"
            title="Add Custom Phrase"
          >
            <Plus size={22} className="stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Phrases List */}
      <div>
        {filteredPhrases.length > 0 ? (
          <div className="grid gap-4">
            {filteredPhrases.map((item, idx) => {
              const card = phraseMetadata.get(item.text);
              const currentStatus: PhraseStatus = card ? card.status : "new";
              const itemKey = item.id || item.text;
              const isExpanded = expandedPhraseKeys.has(itemKey);

              // Find containing / linked lyric lines and pick the first non-empty distinct one
              const nonUniqueLinked = currentTrack.lines.filter(l => 
                (item.lineIds && item.lineIds.includes(l.lineId || "")) ||
                l.phrases?.some((p: any) => p.text === item.text)
              );
              const validLines = nonUniqueLinked.filter(l => l.original && l.original.trim() !== "");
              const uniqueLinkedLines: LyricsLine[] = [];
              const seenTexts = new Set<string>();
              for (const line of validLines) {
                const norm = line.original.trim().toLowerCase();
                if (!seenTexts.has(norm)) {
                  seenTexts.add(norm);
                  uniqueLinkedLines.push(line);
                }
              }
              const firstContextLine = uniqueLinkedLines.length > 0 ? uniqueLinkedLines[0] : null;

              let bgClasses = "bg-app-card/70 border-app-card-border hover:border-app-card-border/85";
              if (currentStatus === "new") {
                bgClasses = "bg-sky-500/[0.05] border-sky-500/20 hover:border-sky-500/35";
              } else if (currentStatus === "learning") {
                bgClasses = "bg-orange-500/[0.05] border-orange-500/20 hover:border-orange-500/35";
              }

              return (
                <div 
                  key={item.id || idx}
                  onClick={() => toggleExpand(itemKey)}
                  className={`cursor-pointer rounded-[2rem] border transition-all overflow-hidden relative group ${bgClasses}`}
                >
                  {/* Top segment / Header - Always visible */}
                  <div className="p-6">
                    {/* One-line Header/Body Layout containing sequence number inline, play button, translation, status button, and vertical dots menu */}
                    <div className="flex items-start justify-between gap-4 w-full">
                      {/* Left Block: Number + Phrase text + play button on 1st line, translation on 2nd line */}
                      <div className="min-w-0 flex-1">
                        {/* First line: Gray Number + Phrase Text + Play Audio Button */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Inline Gray Sequence Number */}
                          <span className="text-base font-sans font-semibold text-app-fg/40 select-none shrink-0">
                            {idx + 1}.
                          </span>

                          <h3 className="text-xl font-serif text-app-fg leading-snug">
                            {item.text}
                          </h3>

                          {/* Speech play button styled neatly right next to phrase */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoicing(item);
                            }}
                            className={`p-1.5 rounded-lg border border-app-card-border/80 transition-all flex items-center justify-center hover:bg-app-accent hover:text-white shrink-0 ${
                              currentlySpeakingId === item.id 
                                ? "bg-orange-500 text-white border-orange-500 animate-pulse scale-105" 
                                : "bg-transparent text-app-fg opacity-65 hover:opacity-100 hover:scale-105"
                            }`}
                            title="Pronounce phrase"
                          >
                            <Volume2 size={13} />
                          </button>
                        </div>

                        {/* Second line: Translation with subtle horizontal indentation aligning with the text */}
                        {item.translation && (
                          <p className="text-base font-serif italic text-app-fg opacity-40 leading-snug pl-6 mt-1 transition-all">
                            {item.translation}
                          </p>
                        )}
                      </div>

                      {/* Right Block: Status Indicator + Vertical Dots Menu */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status indicator button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextStatus: PhraseStatus = 
                              currentStatus === "new" ? "learning" :
                              currentStatus === "learning" ? "known" : "new";
                            handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", nextStatus);
                          }}
                          className="shrink-0 flex items-center justify-center p-2 rounded-xl border border-app-card-border/60 bg-transparent hover:bg-app-card hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          title={`Status: ${currentStatus}`}
                        >
                          {currentStatus === "known" ? (
                            <CheckCircle2 size={16} className="text-app-fg opacity-35" />
                          ) : currentStatus === "learning" ? (
                            <RefreshCw size={15} className="text-orange-500" />
                          ) : (
                            <HelpCircle size={16} className="text-sky-500" />
                          )}
                        </button>

                        {/* Action Dropdown Menu Trigger */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuPhraseKey(activeMenuPhraseKey === itemKey ? null : itemKey);
                            }}
                            className="p-2 rounded-xl border border-app-card-border bg-app-bg text-app-fg opacity-75 hover:opacity-100 hover:bg-app-card transition-all flex items-center justify-center"
                            title="More options"
                          >
                            <MoreVertical size={12} />
                          </button>
                          
                          {activeMenuPhraseKey === itemKey && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuPhraseKey(null);
                                }}
                              />
                              <div 
                                className="absolute right-0 mt-1.5 w-36 bg-app-bg border border-app-card-border rounded-xl shadow-xl py-1 z-50 animate-fadeIn"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    handleOpenEdit(item);
                                    setActiveMenuPhraseKey(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-app-card transition-colors flex items-center gap-2 text-xs text-app-fg font-sans font-medium"
                                >
                                  <Edit2 size={11} className="opacity-60" />
                                  <span>Edit Phrase</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDelete(item.id);
                                    setActiveMenuPhraseKey(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center gap-2 text-xs text-rose-500 font-sans font-semibold"
                                >
                                  <Trash2 size={11} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Extended Content (Collapsible segment) */}
                    {isExpanded && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="space-y-4 pt-4 mt-4 border-t border-app-card-border/40 animate-fadeIn cursor-default"
                      >
                        {/* Explanation description */}
                        {item.explanation && (
                          <div className="pl-4 border-l-2 border-app-card-border">
                            <p className="text-base text-app-fg opacity-75 leading-relaxed font-sans font-medium">
                              {item.explanation}
                            </p>
                          </div>
                        )}

                        {/* Study action controls for 'Знаю' (known) and 'Учить' (learning) states */}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", "known");
                            }}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-sans font-black uppercase tracking-widest transition-all ${
                              currentStatus === "known"
                                ? "bg-app-card border border-app-card-border/60 text-app-fg opacity-30 cursor-default"
                                : "bg-app-bg border border-app-card-border hover:border-app-fg/20 active:scale-95 text-app-fg hover:bg-app-card shadow-xs"
                            }`}
                          >
                            <CheckCircle2 size={13} className="text-app-fg opacity-40 shrink-0" />
                            <span>Знаю</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", "learning");
                            }}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-sans font-black uppercase tracking-widest transition-all ${
                              currentStatus === "learning"
                                ? "bg-orange-500/15 border border-orange-500/30 text-orange-500 cursor-default"
                                : "bg-app-bg border border-app-card-border hover:border-orange-500/30 active:scale-95 text-orange-500 hover:bg-orange-500/[0.02] shadow-xs"
                            }`}
                          >
                            <RefreshCw size={12} className="text-orange-500 shrink-0" />
                            <span>Учить</span>
                          </button>
                        </div>

                        {/* User note */}
                        {item.note && (
                          <div className="p-4 rounded-xl bg-orange-500/[0.03] border border-orange-500/10 text-xs space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-orange-500 opacity-80 block">Personal Note</span>
                            <p className="text-app-fg opacity-75 leading-relaxed font-sans font-medium select-text">
                              {item.note}
                            </p>
                          </div>
                        )}

                        {/* Lyrics Context (Single first non-empty distinct line as requested) */}
                        {firstContextLine && (
                          <div className="pt-3 border-t border-app-card-border/45 space-y-2">
                            <span className="text-[9px] font-black uppercase tracking-wider text-app-fg opacity-40 block">Lyrics Context</span>
                            <div className="p-4 rounded-2xl bg-app-bg border border-app-card-border text-sm">
                              <p className="font-serif font-semibold text-app-fg leading-snug">
                                {firstContextLine.original}
                              </p>
                              {firstContextLine.translation && (
                                <p className="font-sans text-xs text-app-fg opacity-50 italic mt-1 leading-snug">
                                  {firstContextLine.translation}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Metadata Tag and Source Block under the fold after lyrics context */}
                        <div className="pt-3 border-t border-app-card-border/40 flex flex-wrap items-center gap-2.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-app-fg opacity-35 block mr-1.5">Metadata:</span>
                          
                          {/* Priority / Type badge */}
                          <span className="px-2.5 py-1 rounded-lg bg-app-bg text-[9px] font-black uppercase tracking-widest text-app-fg opacity-55 border border-app-card-border flex items-center gap-1.5 shadow-xs">
                            <Tag size={10} className="text-orange-500" />
                            {item.type || "phrase"}
                          </span>

                          {/* Source badge */}
                          {item.source === "user" ? (
                            <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                              <User size={8} />
                              User
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                              <Sparkles size={8} />
                              AI
                            </span>
                          )}
                        </div>

                        {/* Action drawers: Ask AI placeholder */}
                        <div className="pt-3 border-t border-app-card-border/40 flex items-center justify-end text-xs gap-3">
                          <div className="group/ask relative">
                            <button
                              disabled
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-app-bg text-app-fg/40 text-[9px] font-black uppercase tracking-widest opacity-65 border border-app-card-border cursor-not-allowed"
                            >
                              <MessageSquare size={10} />
                              <span>Ask AI</span>
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/ask:opacity-100 transition-opacity pointer-events-none z-50 bg-app-fg text-app-bg text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-md border border-app-card-border/10">
                              Coming Next — Deep Dive Q&A
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center space-y-4">
            <HelpCircle size={40} className="mx-auto text-app-fg opacity-15" />
            <p className="text-sm font-black text-app-fg opacity-40 uppercase tracking-widest">
              No matching phrases
            </p>
            <p className="text-xs text-app-fg opacity-30 font-medium max-w-xs mx-auto">
              Try adjusting your query or click the circular button above to create a custom study word.
            </p>
          </div>
        )}
      </div>

      {/* Add Phrase Modal Form */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-12 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-app-bg/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl z-10"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500">
                      STUDY WORKSPACE
                    </span>
                    <h3 className="text-xl font-black text-app-fg leading-tight">
                      Add Custom Phrase
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-app-fg opacity-20 hover:opacity-100 transition-colors p-1"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Phrase input */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-text" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Phrase / Word
                    </label>
                    <input
                      id="add-word-text"
                      type="text"
                      placeholder="e.g. walk hand in hand"
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Translation input */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-translation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Translation / Meaning
                    </label>
                    <input
                      id="add-word-translation"
                      type="text"
                      placeholder="e.g. идти рука об руку"
                      value={formTranslation}
                      onChange={(e) => setFormTranslation(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Explanation input */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-explanation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Explanation (Optional)
                    </label>
                    <textarea
                      id="add-word-explanation"
                      placeholder="e.g. An elegant collocation about intimacy and companionship..."
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none"
                    />
                  </div>

                  {/* User Note */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-note" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Personal Notes (Optional)
                    </label>
                    <textarea
                      id="add-word-note"
                      placeholder="e.g. Heard this line during summer school. Reminds me of our walk in the park."
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none"
                    />
                  </div>

                  {/* Link with Lyric line selection */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-line" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Link Lyric Line (Optional)
                    </label>
                    <select
                      id="add-word-line"
                      value={formLineId}
                      onChange={(e) => setFormLineId(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 bg-none cursor-pointer"
                    >
                      <option className="bg-app-bg" value="">Auto-detect Line Link (based on text match)</option>
                      {currentTrack.lines.map((line) => (
                        <option className="bg-app-bg text-app-fg" key={line.lineId || line.id} value={line.lineId || ""}>
                          Line {line.index + 1}: {line.original}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 bg-app-card border border-app-card-border hover:bg-app-card/80 text-app-fg rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAdd}
                    disabled={!formText.trim()}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    Save Phrase
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Phrase Modal Form */}
      <AnimatePresence>
        {editingPhrase && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-12 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPhrase(null)}
              className="fixed inset-0 bg-app-bg/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl z-10"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500">
                      STUDY WORKSPACE
                    </span>
                    <h3 className="text-xl font-black text-app-fg leading-tight">
                      Edit Phrase
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingPhrase(null)}
                    className="text-app-fg opacity-20 hover:opacity-100 transition-colors p-1"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Phrase input */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-word-text" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Phrase / Word
                    </label>
                    <input
                      id="edit-word-text"
                      type="text"
                      placeholder="e.g. walk hand in hand"
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Translation input */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-word-translation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Translation / Meaning
                    </label>
                    <input
                      id="edit-word-translation"
                      type="text"
                      placeholder="e.g. идти рука об руку"
                      value={formTranslation}
                      onChange={(e) => setFormTranslation(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  {/* Explanation input */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-word-explanation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Explanation (Optional)
                    </label>
                    <textarea
                      id="edit-word-explanation"
                      placeholder="e.g. Detailed explanation of usage..."
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none"
                    />
                  </div>

                  {/* Optional user note input */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-word-note" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Personal Notes (Optional)
                    </label>
                    <textarea
                      id="edit-word-note"
                      placeholder="Keep track of your study sessions, mnemonic helpers, or references..."
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none"
                    />
                  </div>

                  {/* Type select */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-word-type" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block">
                      Vocabulary Category
                    </label>
                    <select
                      id="edit-word-type"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 bg-none cursor-pointer"
                    >
                      <option className="bg-app-bg text-app-fg" value="collocation">collocation</option>
                      <option className="bg-app-bg text-app-fg" value="idiom">idiom</option>
                      <option className="bg-app-bg text-app-fg" value="phrasal_verb">phrasal_verb</option>
                      <option className="bg-app-bg text-app-fg" value="cultural_ref">cultural_ref</option>
                      <option className="bg-app-bg text-app-fg" value="vocabulary">vocabulary</option>
                      <option className="bg-app-bg text-app-fg" value="phrase">phrase</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingPhrase(null)}
                    className="flex-1 py-3 bg-app-card border border-app-card-border hover:bg-app-card/80 text-app-fg rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!formText.trim()}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
