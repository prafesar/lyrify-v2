import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Brain, X, Check, Plus, Edit3, Trash2, AlertTriangle, Save, 
  ChevronDown, ChevronUp, Star, HelpCircle, BookOpen 
} from "lucide-react";
import { cn } from "../lib/utils";

// Stable hash function for generating unique key for the card matching SQLite/Firestore scheme
const generateNoteOriginKey = (
  trackId: string,
  lineId: string | undefined,
  noteText: string,
  noteSourceText: string | undefined,
  indexOrNoteKey: number | string
) => {
  const source = (noteSourceText || noteText || "").trim();
  const textVal = (noteText || "").trim();
  const rawCombined = `${source}_${textVal}_${indexOrNoteKey}`;
  
  let hash = 0;
  for (let i = 0; i < rawCombined.length; i++) {
    const char = rawCombined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hexHash = (hash >>> 0).toString(16);
  
  const cleanAscii = source.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
  const suffix = cleanAscii ? `_${cleanAscii}` : "";
  
  return `note_${trackId}_${lineId || "line"}_k${indexOrNoteKey}${suffix}_${hexHash}`;
};

interface Note {
  id?: string;
  type: "idiom" | "cultural" | "collocation" | "grammar" | "nuance" | "phrase" | "vocabulary";
  text: string; // explanation
  sourceText?: string; // original fragment
  translation?: string; // translation
  entryType?: "word" | "expression";
  userNote?: string;
  source?: "manual" | "ai";
}

interface LineWorkspaceProps {
  line: string;
  i: number;
  currentTrack: any;
  targetLanguage?: string;
  onSaveLineExplanation?: (index: number, explanation: any) => void;
  onAddNoteToDictionary?: (lineIndex: number, note: any, noteIndex: number) => void;
  originKeyMetadata?: Map<string, any>;
  onEditCardFields?: (cardId: string, fields: Partial<any>) => Promise<void>;
  isLoadingExplanation: boolean;
  explanationError: string | null;
  streamedSummary: string;
  handleFetchExplanation: (force?: boolean) => Promise<void>;
  onClose: () => void;
}

export const LineWorkspace = ({
  line,
  i,
  currentTrack,
  targetLanguage,
  onSaveLineExplanation,
  onAddNoteToDictionary,
  originKeyMetadata,
  onEditCardFields,
  isLoadingExplanation,
  explanationError,
  streamedSummary,
  handleFetchExplanation,
  onClose,
}: LineWorkspaceProps) => {
  // Line Data
  const cachedExpl = currentTrack?.lines?.[i]?.explanation || null;
  const initialMyExpl = cachedExpl?.myExplanation || "";
  const initialSummary = cachedExpl?.summary || "";
  const initialNotes: Note[] = cachedExpl?.notes || [];

  // State
  const [myExpl, setMyExpl] = useState(initialMyExpl);
  const [isExplModified, setIsExplModified] = useState(false);
  const [isSavingExpl, setIsSavingExpl] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);
  const [editNoteFields, setEditNoteFields] = useState<Note>({
    type: "phrase",
    text: "",
    sourceText: "",
    translation: "",
    userNote: "",
  });

  // New Note form state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showAdvancedNewNote, setShowAdvancedNewNote] = useState(false);
  const [newNoteFields, setNewNoteFields] = useState<Note>({
    type: "phrase",
    text: "",
    sourceText: "",
    translation: "",
    userNote: "",
  });
  const [newNoteError, setNewNoteError] = useState("");
  const [quickAddVal, setQuickAddVal] = useState("");
  const [isEditingMyExpl, setIsEditingMyExpl] = useState(false);

  // AI accordion state
  const [isAISummaryExpanded, setIsAISummaryExpanded] = useState(true);

  // Keep internal states in sync with external updates (e.g. after AI generation)
  useEffect(() => {
    setMyExpl(cachedExpl?.myExplanation || "");
    setIsExplModified(false);
    setNotes(cachedExpl?.notes || []);
  }, [cachedExpl]);

  // Handle saving the custom Line Note
  const handleSaveLineNote = async () => {
    if (!onSaveLineExplanation) return;
    setIsSavingExpl(true);
    try {
      const updatedExpl = {
        ...(cachedExpl || {}),
        myExplanation: myExpl.trim(),
        summary: initialSummary,
        notes: notes,
      };
      await onSaveLineExplanation(i, updatedExpl);
      setIsExplModified(false);
      setIsEditingMyExpl(false);
    } catch (err) {
      console.error("[LineWorkspace] Failed to save line explanation:", err);
    } finally {
      setIsSavingExpl(false);
    }
  };

  // Add a new manual phrase note
  const handleCreateNote = async () => {
    if (!newNoteFields.sourceText?.trim() || !newNoteFields.translation?.trim() || !newNoteFields.text?.trim()) {
      setNewNoteError("Please fill in Fragment, Translation, and Explanation.");
      return;
    }

    setNewNoteError("");
    const generatedId = `manual_${Date.now()}`;
    const newNoteItem: Note = {
      ...newNoteFields,
      id: generatedId,
      sourceText: newNoteFields.sourceText.trim(),
      translation: newNoteFields.translation.trim(),
      text: newNoteFields.text.trim(),
      userNote: newNoteFields.userNote?.trim() || "",
      source: "manual",
    };

    const updatedNotes = [...notes, newNoteItem];
    setNotes(updatedNotes);

    // Save back to line explanation format
    if (onSaveLineExplanation) {
      const updatedExpl = {
        ...(cachedExpl || {}),
        myExplanation: myExpl.trim(),
        summary: initialSummary,
        notes: updatedNotes,
      };
      await onSaveLineExplanation(i, updatedExpl);
    }

    // Reset form
    setNewNoteFields({
      type: "phrase",
      text: "",
      sourceText: "",
      translation: "",
      userNote: "",
    });
    setIsAddingNote(false);
    setShowAdvancedNewNote(false);
  };

  // Delete a phrase note
  const handleDeleteNote = async (nIdx: number) => {
    const updatedNotes = notes.filter((_, idx) => idx !== nIdx);
    setNotes(updatedNotes);

    if (onSaveLineExplanation) {
      const updatedExpl = {
        ...(cachedExpl || {}),
        myExplanation: myExpl.trim(),
        summary: initialSummary,
        notes: updatedNotes,
      };
      await onSaveLineExplanation(i, updatedExpl);
    }
    if (editingNoteIdx === nIdx) {
      setEditingNoteIdx(null);
    }
  };

  // Start editing a note
  const handleStartEditNote = (nIdx: number, note: Note) => {
    setEditingNoteIdx(nIdx);
    setEditNoteFields({
      type: note.type || "phrase",
      text: note.text || "",
      sourceText: note.sourceText || "",
      translation: note.translation || "",
      userNote: note.userNote || "",
    });
  };

  // Save edited note (both local explanation cache and external database card if saved)
  const handleSaveEditedNote = async (nIdx: number, existingCard: any) => {
    if (!editNoteFields.sourceText?.trim() || !editNoteFields.translation?.trim() || !editNoteFields.text?.trim()) {
      return;
    }

    const updatedNoteItem: Note = {
      ...notes[nIdx],
      sourceText: editNoteFields.sourceText.trim(),
      translation: editNoteFields.translation.trim(),
      text: editNoteFields.text.trim(),
      type: editNoteFields.type,
      userNote: editNoteFields.userNote?.trim() || "",
    };

    const updatedNotes = notes.map((item, idx) => idx === nIdx ? updatedNoteItem : item);
    setNotes(updatedNotes);

    // 1. Save locally in track lines
    if (onSaveLineExplanation) {
      const updatedExpl = {
        ...(cachedExpl || {}),
        myExplanation: myExpl.trim(),
        summary: initialSummary,
        notes: updatedNotes,
      };
      await onSaveLineExplanation(i, updatedExpl);
    }

    // 2. Sync with Study Cards Database if already added
    if (existingCard && onEditCardFields) {
      try {
        await onEditCardFields(existingCard.id, {
          text: editNoteFields.sourceText.trim(),
          translation: editNoteFields.translation.trim(),
          explanation: editNoteFields.text.trim(),
          type: editNoteFields.type,
          entryType: editNoteFields.type,
          userNote: editNoteFields.userNote?.trim() || "",
        });
      } catch (err) {
        console.error("[LineWorkspace] Failed to sync card edit:", err);
      }
    }

    setEditingNoteIdx(null);
  };

  const bgTypeMap: Record<string, string> = {
    phrase: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    vocabulary: "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
    idiom: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    cultural: "bg-pink-500/10 border-pink-500/20 text-pink-600 dark:text-pink-400",
    collocation: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    grammar: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    nuance: "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400"
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickAddVal.trim();
    if (!text) return;

    let sourceText = text;
    let translation = "";

    // Split by hyphens/dashes: " - ", " – ", " — ", "-", "–", "—"
    const splitRegex = /\s*[-\u2013\u2014]\s*/;
    const parts = text.split(splitRegex);
    if (parts.length > 1) {
      sourceText = parts[0].trim();
      translation = parts.slice(1).join(" - ").trim();
    }

    if (!sourceText) return;

    const generatedId = `manual_${Date.now()}`;
    const newNoteItem: Note = {
      id: generatedId,
      type: "phrase",
      sourceText: sourceText,
      translation: translation,
      text: "", // explanation/details are optional
      userNote: "",
      source: "manual",
    };

    const updatedNotes = [...notes, newNoteItem];
    setNotes(updatedNotes);

    if (onSaveLineExplanation) {
      const updatedExpl = {
        ...(cachedExpl || {}),
        myExplanation: myExpl.trim(),
        summary: initialSummary,
        notes: updatedNotes,
      };
      await onSaveLineExplanation(i, updatedExpl);
    }

    setQuickAddVal("");
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="mt-4 mb-2 p-4 bg-app-card border border-app-card-border/70 rounded-2xl relative overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-app-card-border/30">
        <div className="flex items-center gap-1.5 font-sans">
          <BookOpen size={13} className="text-[var(--accent)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-65">
            Line {i + 1} Workspace
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-app-fg/5 text-app-fg opacity-40 hover:opacity-100 transition-opacity"
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-4">
        {/* 1. My Custom Line Note */}
        <div className="border-b border-app-card-border/30 pb-3">
          {(!isEditingMyExpl) ? (
            <div 
              onClick={() => setIsEditingMyExpl(true)}
              className="group/note cursor-pointer hover:bg-app-fg/[0.02] p-1.5 -mx-1.5 rounded-xl transition-all"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-app-fg">My Line Note</span>
                <span className="h-1 w-1 rounded-full bg-teal-500"></span>
                <Edit3 size={10} className="opacity-0 group-hover/note:opacity-50 transition-opacity ml-1 text-app-fg/50" />
              </div>
              {myExpl.trim() ? (
                <p className="text-xs font-sans text-app-fg/80 leading-relaxed pl-1.5 border-l-2 border-teal-500/30">
                  {myExpl}
                </p>
              ) : (
                <span className="text-xs font-sans text-app-fg/35 italic pl-1.5 hover:text-app-fg/65 transition-colors">
                  + Add private note or translation helper...
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-55 text-app-fg flex items-center gap-1">
                  Editing Line Note
                </span>
              </div>
              <textarea
                value={myExpl}
                onChange={(e) => {
                  setMyExpl(e.target.value);
                  setIsExplModified(true);
                }}
                placeholder="Write private notes, grammar tips, or memory mnemonics..."
                rows={1.5}
                className="w-full text-xs font-sans rounded-xl bg-app-bg border border-app-card-border focus:border-[var(--accent)]/50 focus:outline-none p-2.5 resize-none placeholder:opacity-40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveLineNote();
                  } else if (e.key === "Escape") {
                    setMyExpl(initialMyExpl);
                    setIsExplModified(false);
                    setIsEditingMyExpl(false);
                  }
                }}
              />
              <div className="flex justify-end gap-1.5 text-[9px]">
                <button
                  type="button"
                  onClick={() => {
                    setMyExpl(initialMyExpl);
                    setIsExplModified(false);
                    setIsEditingMyExpl(false);
                  }}
                  className="px-2 py-0.5 rounded border border-app-card-border hover:bg-app-fg/5 text-app-fg/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLineNote}
                  disabled={isSavingExpl}
                  className="px-2.5 py-0.5 rounded bg-teal-500 text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Check size={9} />
                  <span>{isSavingExpl ? "Saving..." : "Save"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Phrases & Vocabulary List with Inline Quick Add */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 text-app-fg">
              Phrases & vocabulary ({notes.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {notes.map((note, nIdx) => {
              const noteOriginKey = currentTrack ? generateNoteOriginKey(currentTrack.trackId, currentTrack.lines[i]?.lineId, note.text, note.sourceText, nIdx) : "";
              const existingCard = noteOriginKey && originKeyMetadata ? originKeyMetadata.get(noteOriginKey) : undefined;
              const isAlreadyAdded = !!existingCard;

              const displayType = existingCard?.type || existingCard?.entryType || note.type || "phrase";
              const displaySourceText = existingCard?.text || note.sourceText || line;
              const displayTranslation = existingCard?.translation || note.translation || "";
              const displayExplanation = existingCard?.explanation || note.text || "";
              const displayUserNote = existingCard?.userNote || note.userNote || "";
              const noteSource = note.source || (noteOriginKey?.includes("manual") ? "manual" : "ai");

              const typeClass = bgTypeMap[displayType] || bgTypeMap[note.type] || "bg-app-fg/5 border-app-card-border text-app-fg/70";
              const isEditing = editingNoteIdx === nIdx;

              if (isEditing) {
                return (
                  <div 
                    key={`edit-note-idx-${nIdx}`}
                    className="p-3 bg-app-card border border-[var(--accent)]/30 rounded-xl flex flex-col gap-2 shadow-sm"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editNoteFields.sourceText}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, sourceText: e.target.value })}
                        placeholder="Snippet (e.g. word)"
                        className="w-full px-2 py-1 text-xs rounded bg-app-bg border border-app-card-border focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editNoteFields.translation}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, translation: e.target.value })}
                        placeholder="Translation"
                        className="w-full px-2 py-1 text-xs rounded bg-app-bg border border-app-card-border focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <select
                        value={editNoteFields.type}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, type: e.target.value as any })}
                        className="text-[10px] px-2 py-1 bg-app-bg border border-app-card-border rounded outline-none cursor-pointer"
                      >
                        <option value="phrase">Phrase</option>
                        <option value="vocabulary">Vocabulary</option>
                        <option value="idiom">Idiom</option>
                        <option value="collocation">Collocation</option>
                        <option value="grammar">Grammar</option>
                        <option value="nuance">Nuance</option>
                        <option value="cultural">Cultural</option>
                      </select>

                      <input
                        type="text"
                        value={editNoteFields.text}
                        onChange={(e) => setNewNoteFields({ ...newNoteFields, text: e.target.value })}
                        placeholder="Explanation/Context (optional)..."
                        className="flex-1 px-2 py-0.5 text-xs rounded bg-app-bg border border-app-card-border focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-app-card-border/10 text-[9px]">
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(nIdx)}
                        className="text-red-500 font-extrabold flex items-center gap-1 cursor-pointer hover:bg-red-50/50 px-1 rounded"
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                      <div className="flex items-center gap-1 pr-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingNoteIdx(null)}
                          className="px-1.5 py-0.5 rounded border border-app-card-border text-app-fg/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedNote(nIdx, existingCard)}
                          className="px-2 py-0.5 rounded bg-[var(--accent)] text-white font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={noteOriginKey ? `note-${noteOriginKey}` : `note-idx-${nIdx}`}
                  className="group/item flex items-start justify-between gap-2 p-1.5 bg-app-bg/20 hover:bg-app-fg/[0.02] border border-app-card-border/20 hover:border-app-card-border/50 rounded-xl transition-all"
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className={cn(
                      "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 mt-0.5 rounded shrink-0 self-start",
                      typeClass
                    )}>
                      {displayType.slice(0, 4)}
                    </span>

                    <div className="flex flex-col min-w-0 pr-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-app-fg/90">
                        <span className="font-semibold">{displaySourceText}</span>
                        {displayTranslation && (
                          <span className="text-[10.5px] font-mono text-app-fg/50 font-normal">
                             — {displayTranslation}
                          </span>
                        )}
                        <span className="inline-flex gap-1 items-center shrink-0">
                          <span className={cn(
                            "text-[7px] font-black px-1 rounded uppercase tracking-wider leading-none py-0.5",
                            noteSource === "ai" 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" 
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          )}>
                            {noteSource}
                          </span>
                          {isAlreadyAdded && existingCard && (
                            <span className={cn(
                              "text-[7px] font-black uppercase tracking-wider px-1 rounded leading-none py-0.5",
                              existingCard.status === "known" 
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300" 
                                : "bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300"
                            )}>
                              {existingCard.status === "known" ? "known" : "learning"}
                            </span>
                          )}
                        </span>
                      </div>
                      
                      {displayExplanation && (
                        <span className="text-[10px] text-app-fg/60 block font-normal leading-normal mt-0.5">
                          {displayExplanation}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditNote(nIdx, note)}
                      title="Edit"
                      className="p-1 rounded hover:bg-app-fg/5 text-app-fg/40 hover:text-app-fg transition-colors"
                    >
                      <Edit3 size={10} />
                    </button>
                    {onAddNoteToDictionary && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isAlreadyAdded) {
                            onAddNoteToDictionary(i, note, nIdx);
                          }
                        }}
                        disabled={isAlreadyAdded}
                        className={cn(
                          "p-1 rounded transition-colors",
                          isAlreadyAdded 
                            ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                            : "hover:bg-app-fg/5 text-app-fg/40 hover:text-[var(--accent)]"
                        )}
                        title={isAlreadyAdded ? "Saved to Study" : "Add to Study Cards"}
                      >
                        {isAlreadyAdded ? <Check size={10} className="stroke-[3px]" /> : <Plus size={10} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleQuickAddSubmit} className="flex gap-1.5 items-center bg-app-bg/40 p-1 rounded-xl border border-app-card-border/20 font-sans">
            <Plus size={11} className="text-app-fg/30 ml-2 shrink-0" />
            <input
              type="text"
              value={quickAddVal}
              onChange={(e) => setQuickAddVal(e.target.value)}
              placeholder="Add phrase (e.g. original - translation)..."
              className="flex-1 min-w-0 bg-transparent text-xs text-app-fg focus:outline-none placeholder:text-app-fg/20 py-1"
            />
            {quickAddVal.trim() && (
              <button
                type="submit"
                className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-[var(--accent)] hover:opacity-90 text-white rounded transition-all mr-0.5 font-sans"
              >
                Add
              </button>
            )}
          </form>
        </div>

        {/* 3. AI Drafting / Help (Strictly optional, explicit trigger only) */}
        {!(streamedSummary || initialSummary) ? (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-card-border/20 text-xs">
            <div className="flex items-center gap-1.5 text-app-fg/45 text-[9px] font-black uppercase tracking-widest leading-none">
              <Brain size={12} className="text-purple-500" />
              <span>AI Translation Helper</span>
            </div>
            <button
              type="button"
              onClick={() => handleFetchExplanation(true)}
              disabled={isLoadingExplanation}
              className="text-[9px] font-black uppercase tracking-wider text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:text-purple-400 px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
            >
              {isLoadingExplanation ? (
                <>
                  <Brain size={9} className="animate-spin" />
                  <span>Drafting...</span>
                </>
              ) : (
                <>
                  <Brain size={9} />
                  <span>Generate AI translation draft</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5 mt-3 pt-3 border-t border-app-card-border/20">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1 leading-none">
                <Brain size={12} />
                <span>AI Draft Analysis</span>
              </span>
              <div className="flex items-center gap-1.5 text-[9px]">
                <button
                  type="button"
                  onClick={() => handleFetchExplanation(true)}
                  disabled={isLoadingExplanation}
                  className="text-purple-500 hover:underline flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingExplanation ? "Regenerating..." : "Regenerate"}
                </button>
                <span className="text-app-fg/20">|</span>
                <button
                  type="button"
                  onClick={() => setIsAISummaryExpanded(!isAISummaryExpanded)}
                  className="text-app-fg/40 hover:text-app-fg hover:underline cursor-pointer"
                >
                  {isAISummaryExpanded ? "Collapse" : "Show"}
                </button>
              </div>
            </div>

            {isAISummaryExpanded && (streamedSummary || initialSummary) && (
              <div className="text-xs font-sans text-app-fg/80 leading-relaxed bg-purple-50/10 dark:bg-purple-950/10 border border-purple-500/10 p-2.5 rounded-xl whitespace-pre-line relative">
                {streamedSummary || initialSummary}
              </div>
            )}

            {isLoadingExplanation && !streamedSummary && (
              <div className="text-[10px] italic text-purple-500 flex items-center gap-1 pl-1 select-none font-sans">
                <span className="h-1 text-purple-500 animate-ping" />
                <span>Analyzing line semantics...</span>
              </div>
            )}

            {explanationError && (
              <div className="text-xs text-red-500/80 bg-red-50/50 p-2 rounded-lg border border-red-500/10 flex items-center gap-1.5">
                <span>{explanationError}</span>
                <button
                  type="button"
                  onClick={() => handleFetchExplanation(true)}
                  className="underline font-bold text-red-600 ml-auto hover:text-red-500"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
