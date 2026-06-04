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

  // AI accordion state
  const [isAISummaryExpanded, setIsAISummaryExpanded] = useState(false);

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

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="mt-4 mb-2 p-5 bg-app-card border border-app-card-border/70 rounded-3xl relative overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-app-card-border/30">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[var(--accent)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-65">
            Line Workspace
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-app-fg/5 text-app-fg opacity-40 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-5">
        {/* original & auto translation preview */}
        <div className="bg-app-bg/40 p-3 rounded-2xl border border-app-card-border/25">
          <p className="font-serif text-lg font-bold text-app-fg leading-tight">
            {line}
          </p>
          {(currentTrack?.lines?.[i]?.translation) && (
            <p className="font-serif italic text-sm text-app-fg opacity-45 mt-1">
              {currentTrack.lines[i].translation}
            </p>
          )}
        </div>

        {/* 1. My Custom Explanation/Note (Manual-first & top priority) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 text-app-fg flex items-center gap-1.5">
              <span>My Line Note</span>
              <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
            </label>
            {isExplModified && (
              <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              value={myExpl}
              onChange={(e) => {
                setMyExpl(e.target.value);
                setIsExplModified(true);
              }}
              placeholder="Write your explanation or translation helper for this line..."
              rows={3}
              className="w-full text-sm rounded-2xl bg-app-bg border border-app-card-border focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none p-3.5 pr-10 resize-none transition-all placeholder:text-app-fg/20"
            />
            {myExpl.trim() && (
              <button
                onClick={() => {
                  setMyExpl("");
                  setIsExplModified(true);
                }}
                className="absolute top-3.5 right-3.5 p-1 rounded-full hover:bg-app-fg/5 text-app-fg opacity-30 hover:opacity-100"
                title="Clear text"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {isExplModified && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setMyExpl(initialMyExpl);
                  setIsExplModified(false);
                }}
                className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest rounded-xl border border-app-card-border hover:bg-app-fg/5 transition-all text-app-fg/70"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLineNote}
                disabled={isSavingExpl}
                className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 hover:scale-103 active:scale-97 transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
              >
                <Save size={10} />
                <span>{isSavingExpl ? "Saving..." : "Save Note"}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Compact Notes List with Add Note functionality */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 text-app-fg">
              Phrases & Vocabulary ({notes.length})
            </label>
            {!isAddingNote && (
              <button
                onClick={() => setIsAddingNote(true)}
                className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)] hover:opacity-80 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus size={10} className="stroke-[3px]" />
                <span>Add Note / Phrase</span>
              </button>
            )}
          </div>

          {/* Notes items & Inline Add note card */}
          <div className="flex flex-col gap-2.5">
            {notes.map((note, nIdx) => {
              const noteOriginKey = currentTrack ? generateNoteOriginKey(currentTrack.trackId, currentTrack.lines[i]?.lineId, note.text, note.sourceText, nIdx) : "";
              const existingCard = noteOriginKey && originKeyMetadata ? originKeyMetadata.get(noteOriginKey) : undefined;
              const isAlreadyAdded = !!existingCard;

              const displayType = existingCard?.type || existingCard?.entryType || note.type || "phrase";
              const displaySourceText = existingCard?.text || note.sourceText || line;
              const displayTranslation = existingCard?.translation || note.translation || "";
              const displayExplanation = existingCard?.explanation || note.text || "";
              const displayUserNote = existingCard?.userNote || note.userNote || "";

              const typeClass = bgTypeMap[displayType] || bgTypeMap[note.type] || "bg-app-fg/5 border-app-card-border text-app-fg/70";
              const isEditing = editingNoteIdx === nIdx;

              if (isEditing) {
                return (
                  <div 
                    key={`edit-note-idx-${nIdx}`} 
                    className="p-4 rounded-2xl bg-app-card/60 border border-emerald-500/30 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-app-card-border/10 pb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                        <Edit3 size={10} /> Edit Phrase
                      </span>
                      <button 
                        onClick={() => setEditingNoteIdx(null)} 
                        className="p-1 rounded hover:bg-app-fg/5 opacity-50"
                      >
                        <X size={10} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Original fragment</label>
                        <input
                          type="text"
                          value={editNoteFields.sourceText}
                          onChange={(e) => setEditNoteFields({ ...editNoteFields, sourceText: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Translation</label>
                        <input
                          type="text"
                          value={editNoteFields.translation}
                          onChange={(e) => setEditNoteFields({ ...editNoteFields, translation: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Type</label>
                        <select
                          value={editNoteFields.type}
                          onChange={(e) => setEditNoteFields({ ...editNoteFields, type: e.target.value as any })}
                          className="w-full px-2.5 py-1 text-xs rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="phrase">Phrase</option>
                          <option value="vocabulary">Vocabulary</option>
                          <option value="idiom">Idiom</option>
                          <option value="collocation">Collocation</option>
                          <option value="grammar">Grammar</option>
                          <option value="nuance">Nuance</option>
                          <option value="cultural">Cultural</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Memory Note / Helper</label>
                        <input
                          type="text"
                          placeholder="Mnemonic helper..."
                          value={editNoteFields.userNote}
                          onChange={(e) => setEditNoteFields({ ...editNoteFields, userNote: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Linguistic Explanation</label>
                      <textarea
                        value={editNoteFields.text}
                        rows={2}
                        onChange={(e) => setEditNoteFields({ ...editNoteFields, text: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-app-card-border/20">
                      <button
                        onClick={() => handleDeleteNote(nIdx)}
                        className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-xl text-red-500 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={10} /> Delete Note
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingNoteIdx(null)}
                          className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-xl border border-app-card-border hover:bg-app-fg/5 transition-all text-app-fg/70"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEditedNote(nIdx, existingCard)}
                          className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-xl bg-emerald-500 text-white hover:scale-103 transition-all cursor-pointer"
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
                  className="p-3.5 rounded-2xl bg-app-card/45 border border-app-card-border/30 hover:border-app-card-border/75 transition-all flex flex-col gap-3 group/note"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 w-full">
                    <div className="flex gap-2.5 items-start flex-1 min-w-0">
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 mt-0.5 rounded-md border shrink-0",
                        typeClass
                      )}>
                        {displayType}
                      </span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-semibold text-app-fg tracking-tight flex flex-wrap items-center gap-1.5">
                          {displaySourceText}
                          {displayTranslation && (
                            <span className="text-[10px] font-normal text-app-fg/50 font-mono">
                              ({displayTranslation})
                            </span>
                          )}
                          {displayUserNote && (
                            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md">
                              Note: {displayUserNote}
                            </span>
                          )}
                          {isAlreadyAdded && existingCard && (
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                              existingCard.status === "known" 
                                ? "bg-emerald-500/10 text-emerald-600" 
                                : "bg-orange-500/10 text-orange-600"
                            )}>
                              {existingCard.status === "known" ? "known" : "learning"}
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-sans text-app-fg/75 leading-normal">
                          {displayExplanation}
                        </span>
                      </div>
                    </div>

                    {/* Note Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center opacity-70 group-hover/note:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEditNote(nIdx, note)}
                        className="p-1 px-2 rounded-lg text-[9px] font-bold border border-app-card-border/40 hover:bg-app-fg/5 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={10} />
                        <span>Edit</span>
                      </button>

                      {onAddNoteToDictionary && (
                        <button
                          onClick={() => {
                            if (!isAlreadyAdded) {
                              onAddNoteToDictionary(i, note, nIdx);
                            }
                          }}
                          disabled={isAlreadyAdded}
                          className={cn(
                            "text-[9px] h-6 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1 transition-all",
                            isAlreadyAdded 
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-app-fg/10 hover:bg-[var(--accent)] hover:text-white border border-transparent cursor-pointer"
                          )}
                        >
                          {isAlreadyAdded ? (
                            <>
                              <Check size={10} className="stroke-[3px]" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Plus size={10} className="stroke-[3px]" />
                              <span>Add to Study</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <AnimatePresence>
              {isAddingNote && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="p-3.5 rounded-2xl bg-app-card/75 border border-dashed border-[var(--accent)]/30 hover:border-[var(--accent)]/50 transition-all flex flex-col gap-2.5 shadow-sm"
                >
                  {/* Visual badge selector row + dismiss */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <select
                        value={newNoteFields.type}
                        onChange={(e) => setNewNoteFields({ ...newNoteFields, type: e.target.value as any })}
                        className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-app-bg text-[var(--accent)] cursor-pointer select-none outline-none focus:ring-1 focus:ring-[var(--accent)]/20",
                          bgTypeMap[newNoteFields.type] || "border-app-card-border"
                        )}
                      >
                        <option value="phrase">Phrase</option>
                        <option value="vocabulary">Vocabulary</option>
                        <option value="idiom">Idiom</option>
                        <option value="collocation">Collocation</option>
                        <option value="grammar">Grammar</option>
                        <option value="nuance">Nuance</option>
                        <option value="cultural">Cultural</option>
                      </select>
                      <span className="text-[9px] font-bold text-[var(--accent)] opacity-60">New Card Mode</span>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAddingNote(false);
                        setNewNoteError("");
                      }} 
                      className="p-1 rounded-md hover:bg-app-fg/5 text-app-fg opacity-40 hover:opacity-100 transition-opacity"
                      title="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Main input content imitating a phrase card text structure */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        type="text"
                        placeholder="Original fragment... *"
                        value={newNoteFields.sourceText}
                        onChange={(e) => setNewNoteFields({ ...newNoteFields, sourceText: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-app-bg border border-app-card-border/60 focus:border-[var(--accent)]/60 focus:outline-none placeholder:font-normal placeholder:opacity-55 opacity-90"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Translation... *"
                        value={newNoteFields.translation}
                        onChange={(e) => setNewNoteFields({ ...newNoteFields, translation: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-app-bg border border-app-card-border/60 focus:border-[var(--accent)]/60 focus:outline-none placeholder:opacity-55 opacity-90"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Linguistic Explanation / Usage / Details... *"
                      value={newNoteFields.text}
                      onChange={(e) => setNewNoteFields({ ...newNoteFields, text: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-app-bg border border-app-card-border/60 focus:border-[var(--accent)]/60 focus:outline-none placeholder:opacity-55 opacity-90"
                    />
                  </div>

                  {/* Minimal Advanced Toggle */}
                  <div className="flex items-center justify-between mt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedNewNote(!showAdvancedNewNote)}
                      className="text-[8px] font-black uppercase tracking-widest text-app-fg opacity-45 hover:opacity-100 flex items-center gap-0.5 select-none"
                    >
                      <span>{showAdvancedNewNote ? "Less" : "More Options"}</span>
                      {showAdvancedNewNote ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setIsAddingNote(false);
                          setNewNoteError("");
                        }}
                        className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-lg border border-app-card-border hover:bg-app-fg/5 text-app-fg/60 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateNote}
                        className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={8} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {showAdvancedNewNote && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-1.5 border-t border-app-card-border/10 flex flex-col gap-1.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Mnemonic helpful hint / comment</label>
                        <input
                          type="text"
                          placeholder="Mnemonic helper info..."
                          value={newNoteFields.userNote}
                          onChange={(e) => setNewNoteFields({ ...newNoteFields, userNote: e.target.value })}
                          className="w-full px-2.5 py-1 text-[10px] rounded-lg bg-app-bg border border-app-card-border/60 focus:border-[var(--accent)]/60 focus:outline-none placeholder:opacity-55"
                        />
                      </div>
                    </motion.div>
                  )}

                  {newNoteError && (
                    <p className="text-[10px] text-orange-500 font-bold mt-1">{newNoteError}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {notes.length === 0 && !isAddingNote && (
              <div className="text-center p-6 rounded-2xl bg-app-bg/15 border border-dashed border-app-card-border/30">
                <p className="text-xs text-app-fg opacity-40 font-serif">
                  No vocabulary notes added for this line.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingNote(true)}
                  className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)] hover:underline mt-2 cursor-pointer"
                >
                  Create manual entry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. AI Insights section (Subordinate / Accordion) */}
        <div className="pt-3 border-t border-app-card-border/30">
          <button
            onClick={() => setIsAISummaryExpanded(!isAISummaryExpanded)}
            className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-app-fg opacity-55 hover:opacity-100 pr-1 transition-all"
          >
            <span className="flex items-center gap-1.5">
              <Brain size={12} className="text-[var(--accent)]" />
              <span>AI Translation & Insights</span>
            </span>
            {isAISummaryExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence>
            {isAISummaryExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3.5 space-y-3.5"
              >
                {(streamedSummary || initialSummary) ? (
                  <div className="text-xs font-sans leading-relaxed text-app-fg/80 pr-2 whitespace-pre-line bg-app-fg/5 p-3.5 rounded-2xl border border-app-card-border/10">
                    {streamedSummary || initialSummary}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4 bg-app-fg/5 rounded-2xl border border-app-card-border/5">
                    <p className="text-xs italic tracking-wide text-app-fg opacity-40 text-center px-4">
                      No AI Insights generated yet. Would you like the language model to analyze this line syntax nuances?
                    </p>
                    <button
                      onClick={() => handleFetchExplanation(true)}
                      disabled={isLoadingExplanation}
                      className="px-4 py-1.5 text-[9.5px] font-extrabold uppercase tracking-widest rounded-xl bg-[var(--accent)] text-white hover:scale-103 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingExplanation ? (
                        <>
                          <Brain size={10} className="animate-spin" />
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Brain size={10} />
                          <span>Generate AI Insight</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Stream or generation feedback */}
                {isLoadingExplanation && !streamedSummary && (
                  <div className="flex items-center gap-2 py-1 select-none">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                    </span>
                    <span className="text-xs italic tracking-wide text-app-fg opacity-40">
                      Analyzing line syntax nuances...
                    </span>
                  </div>
                )}

                {/* Error display */}
                {explanationError && (
                  <div className="flex gap-2 items-center text-xs text-orange-500 pt-2 border-t border-app-card-border/30">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{explanationError}</span>
                    <button
                      onClick={() => handleFetchExplanation(true)}
                      className="ml-auto text-[10px] uppercase tracking-wider font-extrabold underline hover:text-orange-400 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
