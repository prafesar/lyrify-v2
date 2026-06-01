import React, { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Volume2, 
  CheckCircle2, 
  Tag, 
  HelpCircle, 
  Sparkles, 
  User, 
  X, 
  MessageSquare,
  RefreshCw,
  MoreVertical
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
  isGeneratingAnalysis?: boolean;
  handleRegenerateAnalysis?: () => void;
  onOpenAssistantForPhrase?: (phrase: Phrase) => void;
}

export const AnalysisPhraseWorkspace: React.FC<AnalysisPhraseWorkspaceProps> = ({
  currentTrack,
  trackSearchQuery,
  setTrackSearchQuery,
  phraseMetadata,
  handleSetAnalysisPhraseStatus,
  speak,
  onUpdateTrack,
  isGeneratingAnalysis = false,
  handleRegenerateAnalysis,
  onOpenAssistantForPhrase
}) => {
  // Local state for Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);

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

  // Filter state
  const [activeFilter, setActiveFilter] = useState<"all" | "new" | "learning" | "known" | "user" | "ai" | "has_note">("all");

  const filtersList = useMemo(() => [
    { id: "all", label: "All" },
    { id: "new", label: "New" },
    { id: "learning", label: "Learning" },
    { id: "known", label: "Known" },
    { id: "user", label: "User-added" },
    { id: "ai", label: "AI-generated" },
    { id: "has_note", label: "Has note" }
  ] as const, []);

  // Helper to highlight matched query in textual content
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return <>{text}</>;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return <>{text}</>;
    const length = query.length;
    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-orange-500/20 text-orange-600 rounded-xs px-0.5">{text.substring(index, index + length)}</mark>
        {text.substring(index + length)}
      </>
    );
  };

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

  // Filter phrases based on searched query & filter states
  const filteredPhrases = useMemo(() => {
    let result = uniquePhrases;

    // Apply categorical filters
    if (activeFilter !== "all") {
      result = result.filter(phrase => {
        const card = phraseMetadata.get(phrase.text);
        const currentStatus = card ? card.status : "new";
        
        switch (activeFilter) {
          case "new":
            return currentStatus === "new";
          case "learning":
            return currentStatus === "learning";
          case "known":
            return currentStatus === "known";
          case "user":
            return phrase.source === "user";
          case "ai":
            return phrase.source !== "user";
          case "has_note":
            return !!phrase.note && phrase.note.trim() !== "";
          default:
            return true;
        }
      });
    }

    // Apply search query
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
  }, [uniquePhrases, trackSearchQuery, activeFilter, phraseMetadata, currentTrack.lines]);

  // Handle Speech trigger
  const handleVoicing = (phrase: Phrase) => {
    setCurrentlySpeakingId(phrase.id);
    speak(phrase.text, () => {
      setCurrentlySpeakingId(null);
    }, currentTrack.sourceLanguage);
  };

  // Open Edit Inline or Modal
  const handleOpenEdit = (phrase: Phrase) => {
    setInlineEditId(phrase.id);
    setFormText(phrase.text || "");
    setFormTranslation(phrase.translation || "");
    setFormExplanation(phrase.explanation || "");
    setFormNote(phrase.note || "");
    setFormType(phrase.type || "phrase");

    // Expand the card so edit form is visible immediately
    const itemKey = phrase.id || phrase.text;
    const updated = new Set(expandedPhraseKeys);
    updated.add(itemKey);
    setExpandedPhraseKeys(updated);
  };

  // Save the Edited Phrase
  const handleSaveEdit = async () => {
    if (!inlineEditId) return;

    const updates: Partial<Phrase> = {
      text: formText,
      translation: formTranslation,
      explanation: formExplanation,
      note: formNote,
      type: formType,
    };

    const updatedTrack = editPhrase(currentTrack, inlineEditId, updates);
    await onUpdateTrack(updatedTrack);
    setInlineEditId(null);
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
      {/* Header toolbar with search input, filters, and Add Phrase CTA */}
      <div className="space-y-4">
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

        {/* Filter Chips Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          {filtersList.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans tracking-tight transition-all active:scale-95 border ${
                  isActive
                    ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10"
                    : "bg-app-card border-app-card-border/60 text-app-fg opacity-70 hover:opacity-100 hover:border-app-card-border hover:bg-app-card"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
          {(activeFilter !== "all" || trackSearchQuery.trim() !== "") && (
            <button
              onClick={() => {
                setActiveFilter("all");
                setTrackSearchQuery("");
              }}
              className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 px-2 py-1 flex items-center gap-1 transition-colors"
            >
              <X size={10} strokeWidth={3} />
              <span>Clear filters</span>
            </button>
          )}
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
                    <div className="flex items-center justify-between gap-4 w-full">
                      {/* Left Block: Number + Phrase text + play button on 1st line, translation on 2nd line */}
                      <div className="min-w-0 flex-1">
                        {/* First line: Gray Number + Phrase Text + Play Audio Button */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Inline Gray Sequence Number */}
                          <span className="text-base font-sans font-semibold text-app-fg/40 select-none shrink-0">
                            {idx + 1}.
                          </span>

                          <h3 className="text-xl font-serif text-app-fg leading-snug">
                            {highlightMatch(item.text, trackSearchQuery)}
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
                            {highlightMatch(item.translation, trackSearchQuery)}
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
                        onClick={(e) => {
                          // Prevent toggling expansion when clicking inside forms
                          e.stopPropagation();
                        }} 
                        className="space-y-4 pt-4 mt-4 border-t border-app-card-border/40 animate-fadeIn cursor-default"
                      >
                        {inlineEditId === item.id ? (
                          /* Inline Edit Form */
                          <div className="space-y-4 font-sans text-xs">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider block">
                              Edit Phrase Inline
                            </span>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">Phrase / Word</label>
                                <input
                                  type="text"
                                  value={formText}
                                  onChange={(e) => setFormText(e.target.value)}
                                  className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-serif"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">Translation</label>
                                <input
                                  type="text"
                                  value={formTranslation}
                                  onChange={(e) => setFormTranslation(e.target.value)}
                                  className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-serif"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">Clarification / Explanation</label>
                              <textarea
                                rows={2}
                                value={formExplanation}
                                onChange={(e) => setFormExplanation(e.target.value)}
                                className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">Personal Note</label>
                              <textarea
                                rows={2}
                                value={formNote}
                                onChange={(e) => setFormNote(e.target.value)}
                                className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                              />
                            </div>

                            <div className="flex gap-2.5 pt-1.5 justify-end">
                              <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-xxs font-black uppercase text-white tracking-wider transition-colors active:scale-95 duration-150"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => {
                                  setInlineEditId(null);
                                  clearForm();
                                }}
                                className="px-4 py-2 bg-app-card border border-app-card-border hover:bg-app-bg text-app-fg opacity-75 hover:opacity-100 rounded-xl text-xxs font-black uppercase tracking-wider transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* standard Display Mode */
                          <>
                            {/* Explanation description */}
                            {item.explanation && (
                              <div className="pl-4 border-l-2 border-app-card-border">
                                <p className="text-base text-app-fg opacity-75 leading-relaxed font-sans font-medium">
                                  {highlightMatch(item.explanation, trackSearchQuery)}
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
                                  {highlightMatch(item.note, trackSearchQuery)}
                                </p>
                              </div>
                            )}

                            {/* Lyrics Context (Single first non-empty distinct line as requested) */}
                            {firstContextLine ? (
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
                            ) : (
                              <div className="pt-3 border-t border-app-card-border/45 space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-app-fg opacity-40 block">Lyrics Context</span>
                                <div className="p-3.5 rounded-2xl bg-app-bg border border-app-card-border/40 text-xs">
                                  <p className="font-sans text-app-fg opacity-35 italic">
                                    No lyric context linked
                                  </p>
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

                            {/* Action drawers: Ask AI */}
                            {onOpenAssistantForPhrase && (
                              <div className="pt-3 border-t border-app-card-border/40 flex items-center justify-end text-xs gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenAssistantForPhrase(item);
                                  }}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 hover:scale-[1.02] text-white active:scale-[0.98] transition-all text-[9.5px] font-black uppercase tracking-widest shadow-sm shadow-orange-500/10 cursor-pointer"
                                >
                                  <MessageSquare size={11} />
                                  <span>Ask Assistant</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : uniquePhrases.length > 0 ? (
          <div className="py-20 text-center space-y-4 rounded-[2rem] bg-app-card/25 border border-dashed border-app-card-border/60">
            <HelpCircle size={40} className="mx-auto text-app-fg opacity-15" />
            <p className="text-sm font-black text-app-fg opacity-40 uppercase tracking-widest">
              No matching phrases
            </p>
            <p className="text-xs text-app-fg opacity-30 font-medium max-w-sm mx-auto">
              We couldn't find any phrases matching your current filters and search query. Try clearing them to see all phrases.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setActiveFilter("all");
                  setTrackSearchQuery("");
                }}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 duration-150"
              >
                Clear filters & search
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-4 rounded-[2rem] bg-app-card/25 border border-dashed border-app-card-border/60">
            <Sparkles size={40} className="mx-auto text-orange-500 opacity-20" />
            <p className="text-sm font-black text-app-fg opacity-40 uppercase tracking-widest">
              No vocabulary analysis yet
            </p>
            <p className="text-xs text-app-fg opacity-30 font-medium max-w-xs mx-auto">
              This track has no generated or custom phrases yet. Add your first custom phrase or click Regenerate to start analyzing!
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
