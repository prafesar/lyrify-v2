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
      className="mt-2 mb-3 pl-3 border-l-2 border-[var(--accent)]/35 focus-within:border-[var(--accent)]/70 relative font-sans space-y-3 pb-1"
    >
      {/* 1. Muted Mini Close Utility Header */}
      <div className="flex justify-between items-center text-[9px] opacity-40 hover:opacity-100 transition-opacity pb-0.5 select-none">
        <span className="font-extrabold uppercase tracking-wider text-app-fg">
          Workspace — Line {i + 1}
        </span>
        <button
          onClick={onClose}
          type="button"
          className="p-0.5 rounded hover:bg-app-fg/5 text-app-fg transition-colors"
          title="Close Workspace"
        >
          <X size={10} />
        </button>
      </div>

      <div className="space-y-2">
        {/* 2. My Custom Line Note */}
        <div>
          {(!isEditingMyExpl) ? (
            <div 
              onClick={() => setIsEditingMyExpl(true)}
              className="cursor-pointer hover:bg-app-fg/[0.015] p-1 -ml-1 rounded-lg transition-all text-xs"
            >
              {myExpl.trim() ? (
                <div className="flex items-baseline gap-1.5 text-app-fg/80 leading-relaxed">
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 select-none">Note:</span>
                  <span className="font-sans text-app-fg/75">{myExpl}</span>
                </div>
              ) : (
                <span className="text-[10px] sm:text-xs font-sans text-app-fg/35 hover:text-app-fg/60 transition-colors flex items-center gap-1.5 select-none">
                  <Plus size={11} className="text-app-fg/40 stroke-[2.5]" />
                  <span>Add line note...</span>
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <textarea
                value={myExpl}
                onChange={(e) => {
                  setMyExpl(e.target.value);
                  setIsExplModified(true);
                }}
                placeholder="Write private notes or translation helpers..."
                rows={1}
                className="w-full text-xs font-sans bg-transparent border-b border-app-card-border/65 focus:border-[var(--accent)]/50 focus:outline-none py-1 resize-none placeholder:opacity-30"
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
              <div className="flex justify-end gap-2 text-[9px]">
                <button
                  type="button"
                  onClick={() => {
                    setMyExpl(initialMyExpl);
                    setIsExplModified(false);
                    setIsEditingMyExpl(false);
                  }}
                  className="hover:underline text-app-fg/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLineNote}
                  disabled={isSavingExpl}
                  className="font-bold text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  {isSavingExpl ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Phrases & Vocabulary List with Inline Quick Add */}
        <div className="space-y-1.5">
          {notes.length > 0 && (
            <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1">
              {notes.map((note, nIdx) => {
                const noteOriginKey = currentTrack ? generateNoteOriginKey(currentTrack.trackId, currentTrack.lines[i]?.lineId, note.text, note.sourceText, nIdx) : "";
                const existingCard = noteOriginKey && originKeyMetadata ? originKeyMetadata.get(noteOriginKey) : undefined;
                const isAlreadyAdded = !!existingCard;

                const displayType = existingCard?.type || existingCard?.entryType || note.type || "phrase";
                const displaySourceText = existingCard?.text || note.sourceText || line;
                const displayTranslation = existingCard?.translation || note.translation || "";
                const displayExplanation = existingCard?.explanation || note.text || "";
                const noteSource = note.source || (noteOriginKey?.includes("manual") ? "manual" : "ai");

                const isEditing = editingNoteIdx === nIdx;

                if (isEditing) {
                  return (
                    <div 
                      key={`edit-note-idx-${nIdx}`}
                      className="p-2.5 bg-app-fg/[0.01] border border-app-card-border/30 rounded-lg flex flex-col gap-2 my-1"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editNoteFields.sourceText}
                          onChange={(e) => setEditNoteFields({ ...editNoteFields, sourceText: e.target.value })}
                          placeholder="Word / Fragment"
                          className="w-full bg-transparent border-b border-app-card-border/50 text-xs py-0.5 focus:outline-none focus:border-[var(--accent)]/40"
                        />
                        <input
                          type="text"
                          value={editNoteFields.translation}
                          onChange={(e) => setEditNoteFields({ ...editNoteFields, translation: e.target.value })}
                          placeholder="Translation"
                          className="w-full bg-transparent border-b border-app-card-border/50 text-xs py-0.5 focus:outline-none focus:border-[var(--accent)]/40"
                        />
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 items-center">
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
                          className="flex-1 bg-transparent border-b border-app-card-border/50 text-[11px] py-0.5 focus:outline-none focus:border-[var(--accent)]/40"
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
                  );
                }

                return (
                  <div 
                    key={noteOriginKey ? `note-${noteOriginKey}` : `note-idx-${nIdx}`}
                    className="group/item flex items-baseline justify-between py-1 px-1 rounded-lg hover:bg-app-fg/[0.015] transition-all text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap leading-relaxed">
                        <span className="font-semibold text-app-fg">{displaySourceText}</span>
                        {displayTranslation && (
                          <span className="text-app-fg/60 font-medium">
                            — {displayTranslation}
                          </span>
                        )}
                        
                        {/* Inline micro tags/chips */}
                        <span className="inline-flex items-center gap-1.5 ml-1 flex-wrap select-none">
                          <span className="text-[9px] text-app-fg/35 lowercase">
                            #{displayType}
                          </span>

                          <span className={cn(
                            "text-[8px] font-mono lowercase",
                            noteSource === "ai" ? "text-purple-500/60" : "text-blue-500/60"
                          )}>
                            {noteSource}
                          </span>

                          {isAlreadyAdded && existingCard && (
                            <span className={cn(
                              "text-[8px] font-semibold uppercase tracking-wider",
                              existingCard.status === "known" ? "text-emerald-500" : "text-orange-500"
                            )}>
                              {existingCard.status === "known" ? "known" : "learning"}
                            </span>
                          )}
                        </span>
                      </div>
                      
                      {displayExplanation && (
                        <div className="text-[10px] text-app-fg/50 font-normal pl-2.5 border-l border-app-card-border/40 mt-0.5 leading-snug">
                          {displayExplanation}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 ml-2 self-center select-none">
                      <button
                        type="button"
                        onClick={() => handleStartEditNote(nIdx, note)}
                        title="Edit entry"
                        className="p-1 rounded hover:bg-app-fg/5 text-app-fg/40 hover:text-app-fg transition-colors"
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
                            "p-1 rounded transition-colors",
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
            </div>
          )}

          {/* Inline Quick Add form */}
          <form 
            onSubmit={handleQuickAddSubmit} 
            className="flex items-center gap-1.5 py-1 px-1 bg-transparent hover:bg-app-fg/[0.005] focus-within:bg-app-fg/[0.008] border-b border-dashed border-app-card-border/40 text-xs transition-all"
          >
            <span className="text-app-fg/20 select-none">•</span>
            <input
              type="text"
              value={quickAddVal}
              onChange={(e) => setQuickAddVal(e.target.value)}
              placeholder="Add phrase (e.g. original - translation)..."
              className="flex-1 min-w-0 bg-transparent text-xs text-app-fg focus:outline-none placeholder:text-app-fg/25 py-0.5"
            />
            {quickAddVal.trim() && (
              <button
                type="submit"
                className="text-[10px] font-bold text-[var(--accent)] hover:underline mr-1 select-none"
              >
                Add
              </button>
            )}
          </form>
        </div>

        {/* 4. AI Drafting & Help (Subtle text button, explicit trigger only) */}
        {!(streamedSummary || initialSummary) ? (
          <div className="flex items-center gap-2 pt-1 text-[10px] text-app-fg/40 select-none">
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
                  <span>Generate AI translation draft</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-1 pt-1.5 border-t border-app-card-border/10 text-xs">
            <div className="flex items-center justify-between text-[10px] text-app-fg/45 select-none">
              <span className="flex items-center gap-1 font-medium">
                <Brain size={10} className="text-purple-500" />
                <span>AI Draft Explanation</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleFetchExplanation(true)}
                  disabled={isLoadingExplanation}
                  className="text-purple-600/80 hover:underline hover:text-purple-600 dark:text-purple-400/80 flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingExplanation ? "Regenerating..." : "Regenerate"}
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => setIsAISummaryExpanded(!isAISummaryExpanded)}
                  className="hover:underline cursor-pointer"
                >
                  {isAISummaryExpanded ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {isAISummaryExpanded && (streamedSummary || initialSummary) && (
              <div className="text-[11px] font-sans text-app-fg/70 leading-relaxed bg-purple-500/[0.015] dark:bg-purple-400/[0.015] border border-purple-500/10 p-2 rounded-lg whitespace-pre-line relative">
                {streamedSummary || initialSummary}
              </div>
            )}

            {isLoadingExplanation && !streamedSummary && (
              <div className="text-[10px] italic text-purple-500 flex items-center gap-1 pl-1 select-none font-sans mt-0.5">
                <span>Analyzing line semantics...</span>
              </div>
            )}

            {explanationError && (
              <div className="text-xs text-red-500 bg-red-500/5 p-2 rounded-lg border border-red-500/10 flex items-center gap-1.5 mt-0.5">
                <span>{explanationError}</span>
                <button
                  type="button"
                  onClick={() => handleFetchExplanation(true)}
                  className="underline font-bold text-red-600 ml-auto hover:text-red-500 select-none"
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
