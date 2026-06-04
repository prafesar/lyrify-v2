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
      className="mt-1.5 mb-2 pl-6 sm:pl-7 relative font-sans space-y-1 select-text"
    >
      <div className="space-y-1">
        {/* Child Level 1: Lyric Line Note */}
        <div className="flex items-start gap-2 text-xs py-0.5 rounded-md transition-colors">
          <span className="text-teal-500/50 font-black shrink-0 mt-1 select-none">•</span>
          <div className="flex-1 min-w-0">
            {(!isEditingMyExpl) ? (
              <div 
                onClick={() => setIsEditingMyExpl(true)}
                className="cursor-pointer hover:bg-app-fg/[0.015] py-0.5 rounded transition-all text-xs flex items-baseline gap-1"
                title="Click to edit line note"
              >
                {myExpl.trim() ? (
                  <span className="font-sans text-app-fg/75">{myExpl}</span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-sans text-app-fg/30 hover:text-app-fg/50 transition-colors flex items-center gap-1 select-none">
                    <span>+ add line note...</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-0.5 w-full">
                <input
                  type="text"
                  value={myExpl}
                  onChange={(e) => {
                    setMyExpl(e.target.value);
                    setIsExplModified(true);
                  }}
                  placeholder="Add private note (translation helper/grammar tip)..."
                  className="flex-1 text-xs bg-transparent border-b border-app-card-border/60 focus:border-[var(--accent)]/50 focus:outline-none py-0.5"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveLineNote();
                    } else if (e.key === "Escape") {
                      setMyExpl(initialMyExpl);
                      setIsExplModified(false);
                      setIsEditingMyExpl(false);
                    }
                  }}
                />
                <div className="flex gap-2 text-[9px] shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setMyExpl(initialMyExpl);
                      setIsExplModified(false);
                      setIsEditingMyExpl(false);
                    }}
                    className="hover:underline text-app-fg/40 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLineNote}
                    disabled={isSavingExpl}
                    className="font-bold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    {isSavingExpl ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Child Level 2 Container: Indented & Connected Phrases Block */}
        <div className="pl-5 ml-1.5 border-l border-app-card-border/10 space-y-1">
          {notes.map((note, nIdx) => {
            const noteOriginKey = currentTrack ? generateNoteOriginKey(currentTrack.trackId, currentTrack.lines[i]?.lineId, note.text, note.sourceText, nIdx) : "";
            const existingCard = noteOriginKey && originKeyMetadata ? originKeyMetadata.get(noteOriginKey) : undefined;
            const isAlreadyAdded = !!existingCard;

            const displayType = existingCard?.type || existingCard?.entryType || note.type || "phrase";
            const displaySourceText = existingCard?.text || note.sourceText || line;
            const displayTranslation = existingCard?.translation || note.translation || "";
            const noteSource = note.source || (noteOriginKey?.includes("manual") ? "manual" : "ai");

            const isEditing = editingNoteIdx === nIdx;

            if (isEditing) {
              return (
                <div 
                  key={`edit-note-idx-${nIdx}`}
                  className="flex items-start gap-2 py-1"
                >
                  <span className="text-[var(--accent)]/50 font-black shrink-0 mt-1 select-none">•</span>
                  <div className="flex-1 bg-app-fg/[0.01] border border-app-card-border/20 rounded-lg p-2 flex flex-col gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editNoteFields.sourceText}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, sourceText: e.target.value })}
                        placeholder="Word / Fragment"
                        className="w-full bg-transparent border-b border-app-card-border/50 text-xs py-0.5 focus:outline-none focus:border-[var(--accent)]/40 text-app-fg font-medium"
                      />
                      <input
                        type="text"
                        value={editNoteFields.translation}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, translation: e.target.value })}
                        placeholder="Translation"
                        className="w-full bg-transparent border-b border-app-card-border/50 text-xs py-0.5 focus:outline-none focus:border-[var(--accent)]/40 text-app-fg/80"
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 items-center text-xs">
                      <select
                        value={editNoteFields.type}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, type: e.target.value as any })}
                        className="text-[10px] bg-transparent border-0 text-app-fg/60 outline-none cursor-pointer"
                      >
                        <option value="phrase">phrase</option>
                        <option value="vocabulary">vocabulary</option>
                        <option value="idiom">idiom</option>
                        <option value="collocation">collocation</option>
                        <option value="grammar">grammar</option>
                        <option value="nuance">nuance</option>
                        <option value="cultural">cultural</option>
                      </select>

                      <input
                        type="text"
                        value={editNoteFields.text}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, text: e.target.value })}
                        placeholder="Explanation (optional)..."
                        className="flex-1 bg-transparent border-b border-app-card-border/50 text-[11px] py-0.5 focus:outline-none focus:border-[var(--accent)]/40 text-app-fg/70"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[9px] text-app-fg/50 select-none">
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(nIdx)}
                        className="text-red-500/80 hover:text-red-500 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={9} /> Delete
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteIdx(null)}
                          className="hover:underline text-app-fg/40"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedNote(nIdx, existingCard)}
                          className="font-bold text-[var(--accent)] hover:underline"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={noteOriginKey ? `note-${noteOriginKey}` : `note-idx-${nIdx}`}
                className="group/item flex items-baseline gap-2 py-0.5 hover:bg-app-fg/[0.015] rounded transition-all text-xs"
              >
                <span className="text-app-fg/20 font-black shrink-0 mt-1 select-none">•</span>
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap leading-relaxed">
                    <span className="font-semibold text-app-fg">{displaySourceText}</span>
                    {displayTranslation && (
                      <span className="text-app-fg/60 font-medium">
                        — {displayTranslation}
                      </span>
                    )}
                    
                    {/* Inline list tags */}
                    <span className="inline-flex items-center gap-1 ml-1 flex-wrap select-none">
                      <span className="text-[10px] text-app-fg/30 lowercase font-normal italic">
                        #{displayType}
                      </span>

                      <span className="text-[10px] text-app-fg/30 lowercase font-normal italic">
                        #{noteSource}
                      </span>

                      {isAlreadyAdded && existingCard && (
                        <span className={cn(
                          "text-[10px] font-medium lowercase italic",
                          existingCard.status === "known" ? "text-emerald-500/50" : "text-orange-500/50"
                        )}>
                          #{existingCard.status === "known" ? "known" : "learning"}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 ml-2 self-baseline select-none">
                  <button
                    type="button"
                    onClick={() => handleStartEditNote(nIdx, note)}
                    title="Edit entry"
                    className="p-1 rounded hover:bg-app-fg/5 text-app-fg/40 hover:text-app-fg transition-colors cursor-pointer"
                  >
                    <Edit3 size={11} />
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
                        "p-1 rounded transition-colors cursor-pointer",
                        isAlreadyAdded 
                          ? "text-emerald-500 bg-emerald-500/5"
                          : "hover:bg-app-fg/5 text-app-fg/40 hover:text-[var(--accent)]"
                      )}
                      title={isAlreadyAdded ? "Saved to Dictionary" : "Add to Study Cards"}
                    >
                      {isAlreadyAdded ? <Check size={11} className="stroke-[3px]" /> : <Plus size={11} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Connected Inline Quick Add bullet row */}
          <form 
            onSubmit={handleQuickAddSubmit} 
            className="flex items-center gap-2 py-0.5 hover:bg-app-fg/[0.005] focus-within:bg-app-fg/[0.008] text-xs transition-all"
          >
            <span className="text-app-fg/15 select-none">•</span>
            <input
              type="text"
              value={quickAddVal}
              onChange={(e) => setQuickAddVal(e.target.value)}
              placeholder="Add phrase (e.g. phrase - translation)..."
              className="flex-1 min-w-0 bg-transparent text-xs text-app-fg focus:outline-none placeholder:text-app-fg/25 py-0.5 border-b border-dashed border-app-card-border/45"
            />
            {quickAddVal.trim() && (
              <button
                type="submit"
                className="text-[10px] font-bold text-[var(--accent)] hover:underline mr-1 select-none cursor-pointer hover:bg-transparent"
              >
                Add
              </button>
            )}
          </form>
        </div>

        {/* Child Level 1 Sibling: AI Translation Draft Bullet */}
        {!(streamedSummary || initialSummary) ? (
          <div className="flex items-start gap-2 py-0.5 text-[10px] text-app-fg/40 select-none">
            <span>•</span>
            <button
              type="button"
              onClick={() => handleFetchExplanation(true)}
              disabled={isLoadingExplanation}
              className="text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              {isLoadingExplanation ? (
                <>
                  <Brain size={10} className="animate-spin" />
                  <span>Drafting explanations...</span>
                </>
              ) : (
                <>
                  <Brain size={10} />
                  <span>Enhance with AI</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1 py-0.5 text-xs">
            <div className="flex items-center justify-between text-[10px] text-app-fg/40 select-none">
              <span className="flex items-center gap-2">
                <span>•</span>
                <span className="flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
                  <Brain size={10} />
                  <span>AI Explanation Draft</span>
                </span>
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => handleFetchExplanation(true)}
                  disabled={isLoadingExplanation}
                  className="text-purple-600/80 hover:underline hover:text-purple-600 dark:text-purple-400/80 flex items-center gap-0.5 cursor-pointer disabled:opacity-50 text-[10px]"
                >
                  {isLoadingExplanation ? "Regenerating..." : "Regenerate"}
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => setIsAISummaryExpanded(!isAISummaryExpanded)}
                  className="hover:underline cursor-pointer text-[10px]"
                >
                  {isAISummaryExpanded ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {isAISummaryExpanded && (streamedSummary || initialSummary) && (
              <div className="text-[11px] font-sans text-app-fg/70 leading-relaxed bg-purple-500/[0.015] dark:bg-purple-400/[0.015] border border-purple-500/10 p-2.5 rounded-lg whitespace-pre-line relative mt-1 ml-4 shadow-sm">
                {streamedSummary || initialSummary}
              </div>
            )}

            {isLoadingExplanation && !streamedSummary && (
              <div className="text-[10px] italic text-purple-500 flex items-center gap-1 pl-5 select-none font-sans">
                <span>Analyzing line semantics...</span>
              </div>
            )}

            {explanationError && (
              <div className="text-xs text-red-500 bg-red-500/5 p-2 rounded-lg border border-red-500/10 flex items-center gap-1.5 mt-1 ml-4">
                <span>{explanationError}</span>
                <button
                  type="button"
                  onClick={() => handleFetchExplanation(true)}
                  className="underline font-bold text-red-600 ml-auto hover:text-red-500 select-none cursor-pointer"
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
