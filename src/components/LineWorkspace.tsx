import React, { useState, useEffect, useRef } from "react";
import { 
  Brain, Check, Plus, Trash2, Edit2, Sparkles, X, MessageSquare
} from "lucide-react";
import { cn } from "../lib/utils";

// Dictionary of available tags for autocomplete suggestions
const AVAILABLE_TAGS = [
  "common",
  "informal",
  "slang",
  "idiomatic",
  "formal",
  "academic",
  "literary",
  "rare",
  "metaphorical",
  "lyrical",
  "modern",
  "archaic",
  "vulgar",
  "pronunciation",
  "dialect"
];

// Supported phrase types
const SUPPORTED_TYPES = [
  "word",
  "collocation",
  "idiom",
  "phrasal-verb",
  "slang",
  "metaphor",
  "cultural-reference",
  "grammar-pattern"
];

// Display label helper for types
const formatTypeLabel = (t: string) => {
  return t.replace("-", " ");
};

// Stable hash function for generating unique key for the card matching SQLite/Firestore scheme
const generateNoteOriginKey = (
  trackId: string,
  lineId: string | undefined,
  noteText: string,
  noteSourceText: string | undefined,
  indexOrNoteKey: number | string
) => {
  const source = (noteSourceText || "").trim() || (noteText || "").trim();
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

interface LineItem {
  id: string;
  kind: "phrase" | "note";
  
  // phrase fields
  original?: string;
  translation?: string;
  type?: string;
  tags?: string[];
  
  // note fields
  text?: string;
  
  // common fields
  source?: "manual" | "ai";
}

interface LineWorkspaceProps {
  line: string;
  i: number;
  currentTrack: any;
  targetLanguage?: string;
  lineTranslation?: string; // Passed from App.tsx as a level-1 child node
  onSaveLineExplanation?: (index: number, explanation: any, updatedTranslation?: string) => void;
  onAddNoteToDictionary?: (lineIndex: number, note: any, noteIndex: number) => void;
  originKeyMetadata?: Map<string, any>;
  onEditCardFields?: (cardId: string, fields: Partial<any>) => Promise<void>;
  isLoadingExplanation: boolean;
  explanationError: string | null;
  streamedSummary: string;
  handleFetchExplanation: (force?: boolean) => Promise<void>;
  onClose: () => void;
  isCompact?: boolean;
}

export const LineWorkspace = ({
  line,
  i,
  currentTrack,
  targetLanguage,
  lineTranslation,
  onSaveLineExplanation,
  onAddNoteToDictionary,
  originKeyMetadata,
  onEditCardFields,
  isLoadingExplanation,
  explanationError,
  streamedSummary,
  handleFetchExplanation,
  onClose,
  isCompact = false,
}: LineWorkspaceProps) => {
  // Line Data from Track
  const cachedExpl = currentTrack?.lines?.[i]?.explanation || null;
  const initialMyExpl = cachedExpl?.myExplanation || "";
  const initialSummary = cachedExpl?.summary || "";

  // Helper to ensure notes (explanations) are always placed above phrases in the list
  const sortItems = (list: LineItem[]): LineItem[] => {
    return [...list].sort((a, b) => {
      if (a.kind === b.kind) return 0;
      return a.kind === "note" ? -1 : 1;
    });
  };
  
  // Load and migrate legacy note nodes gracefully
  const getInitialItems = (): LineItem[] => {
    const rawNotes = cachedExpl?.notes || [];
    const mapped = rawNotes.map((n: any, idx: number): LineItem => {
      if (n.kind === "phrase" || n.kind === "note") {
        return {
          id: n.id || `item_${idx}_${Date.now()}`,
          kind: n.kind,
          original: n.original || n.sourceText || "",
          translation: n.translation || n.text || "",
          type: n.type || "word",
          tags: n.tags || [],
          text: n.text || "",
          source: n.source || "ai"
        };
      }
      
      // Legacy migration check based on sourceText availability
      if (n.sourceText) {
        return {
          id: n.id || `item_${idx}_${Date.now()}`,
          kind: "phrase",
          original: n.sourceText,
          translation: n.translation || n.text || "",
          type: n.type || "word",
          tags: n.tags || [],
          source: n.source || "ai"
        };
      } else {
        return {
          id: n.id || `item_${idx}_${Date.now()}`,
          kind: "note",
          text: n.text || n.translation || "",
          source: n.source || "ai"
        };
      }
    });
    return sortItems(mapped);
  };

  // Internal states
  const [trans, setTrans] = useState(lineTranslation || "");
  const [items, setItems] = useState<LineItem[]>(getInitialItems());
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Controls tag editing on active edit phrase
  const [tagInput, setTagInput] = useState("");
  const [selectedTagIndex, setSelectedTagIndex] = useState(0);
  const [showTagList, setShowTagList] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Synchronize items with external updates (e.g. from AI streamed outputs or DB loads)
  useEffect(() => {
    setItems(getInitialItems());
  }, [cachedExpl]);

  useEffect(() => {
    setTrans(lineTranslation || "");
  }, [lineTranslation]);

  // Saves state down to the main App database track lines store
  const saveAllItems = async (updatedItems: LineItem[]) => {
    if (!onSaveLineExplanation) return;
    
    // Always sort prior to saving to maintain invariant
    const sorted = sortItems(updatedItems);
    
    // Format compatible notes for original system methods
    const legacyCompatibleNotes = sorted.map((item) => {
      if (item.kind === "phrase") {
        return {
          id: item.id,
          kind: "phrase",
          original: item.original,
          translation: item.translation,
          type: item.type,
          tags: item.tags,
          source: item.source,
          // backward compatibility parameters:
          sourceText: item.original,
          text: item.translation,
        };
      } else {
        return {
          id: item.id,
          kind: "note",
          text: item.text,
          source: item.source,
          // backward compatibility parameters:
          sourceText: "",
          translation: "",
        };
      }
    });

    try {
      const updatedExpl = {
        ...(cachedExpl || {}),
        myExplanation: initialMyExpl,
        summary: initialSummary,
        notes: legacyCompatibleNotes,
      };
      await onSaveLineExplanation(i, updatedExpl);
    } catch (err) {
      console.error("[LineWorkspace] Error saving updated outliner entries:", err);
    }
  };

  // Actions row handles
  const handleAddPhrase = () => {
    const newItemId = `phrase_${Date.now()}`;
    const newPhrase: LineItem = {
      id: newItemId,
      kind: "phrase",
      original: "",
      translation: "",
      type: "word",
      tags: [],
      source: "manual"
    };
    
    const updated = sortItems([...items, newPhrase]);
    setItems(updated);
    setEditingId(newItemId);
    setTagInput("");
  };

  const handleAddNote = () => {
    const newItemId = `note_${Date.now()}`;
    const newNote: LineItem = {
      id: newItemId,
      kind: "note",
      text: "",
      source: "manual"
    };

    const updated = sortItems([...items, newNote]);
    setItems(updated);
    setEditingId(newItemId);
  };

  const handleAiComplement = async () => {
    try {
      await handleFetchExplanation(true);
    } catch (err) {
      console.error("[LineWorkspace] AI invocation failed:", err);
    }
  };

  // Delete operation on individual outliner items
  const handleDeleteItem = async (itemId: string) => {
    const nextItems = items.filter((item) => item.id !== itemId);
    const sorted = sortItems(nextItems);
    setItems(sorted);
    await saveAllItems(sorted);
    if (editingId === itemId) {
      setEditingId(null);
    }
  };

  // Auto-saved or manual inline save submission
  const handleSaveItemEdit = async (itemId: string, updatedFields: Partial<LineItem>) => {
    const nextItems = items.map((item) => {
      if (item.id === itemId) {
        return { ...item, ...updatedFields } as LineItem;
      }
      return item;
    });

    const sorted = sortItems(nextItems);
    setItems(sorted);
    await saveAllItems(sorted);

    // If saving active phrase, sync edits to dictionary card too
    const matchedItem = sorted.find((item) => item.id === itemId);
    if (matchedItem && matchedItem.kind === "phrase" && onEditCardFields) {
      const originalText = matchedItem.original || "";
      const translationVal = matchedItem.translation || "";
      
      // Calculate original mapping note index
      const nIdx = sorted.findIndex((it) => it.id === itemId);
      const noteOriginKey = currentTrack ? generateNoteOriginKey(currentTrack.trackId, currentTrack.lines[i]?.lineId, translationVal, originalText, nIdx) : "";
      const existingCard = noteOriginKey && originKeyMetadata ? originKeyMetadata.get(noteOriginKey) : undefined;
      
      if (existingCard) {
        try {
          await onEditCardFields(existingCard.id, {
            text: originalText.trim(),
            translation: translationVal.trim(),
            explanation: translationVal.trim(),
            type: matchedItem.type || "word",
            entryType: matchedItem.type || "word",
            tags: matchedItem.tags || [],
          });
        } catch (e) {
          console.error("[LineWorkspace] Dictionary sync error:", e);
        }
      }
    }
  };

  // Keyboard navigation & autocomplete select rules for tags input on active phrase
  const handleTagInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    phraseItem: LineItem,
    matchingSuggestions: string[]
  ) => {
    if (showTagList && matchingSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedTagIndex((prev) => (prev + 1) % matchingSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedTagIndex(
          (prev) => (prev - 1 + matchingSuggestions.length) % matchingSuggestions.length
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        addTagToPhrase(phraseItem, matchingSuggestions[selectedTagIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowTagList(false);
        return;
      }
    }

    // Space/Comma triggers custom tag addition when no dropdown menu is navigated
    if (e.key === "," || e.key === "Enter" || e.key === " ") {
      const cleanVal = tagInput.replace("#", "").replace(",", "").trim().toLowerCase();
      if (cleanVal) {
        e.preventDefault();
        addTagToPhrase(phraseItem, cleanVal);
      }
    }
  };

  const addTagToPhrase = (phraseItem: LineItem, tag: string) => {
    const cleanTag = tag.replace("#", "").trim().toLowerCase();
    if (!cleanTag) return;

    const existingTags = phraseItem.tags || [];
    if (!existingTags.includes(cleanTag)) {
      const updatedTags = [...existingTags, cleanTag];
      handleSaveItemEdit(phraseItem.id, { tags: updatedTags });
    }
    setTagInput("");
    setShowTagList(false);
    setSelectedTagIndex(0);
    setTimeout(() => tagInputRef.current?.focus(), 50);
  };

  const removeTagFromPhrase = (phraseItem: LineItem, tagToRemove: string) => {
    const updatedTags = (phraseItem.tags || []).filter((t) => t !== tagToRemove);
    handleSaveItemEdit(phraseItem.id, { tags: updatedTags });
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="mt-1 mb-2 pl-4 sm:pl-5 select-text font-sans relative"
      id={`workspace-wrapper-${i}`}
    >
      {/* Lyric line translation block at the top */}
      <div className="flex items-start gap-2 py-1 select-text pr-1">
        <textarea
          id={`lyrics-translation-input-${i}`}
          value={trans}
          onChange={(e) => {
            setTrans(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={() => {
            if (trans.trim() !== (lineTranslation || "")) {
              onSaveLineExplanation?.(i, cachedExpl, trans.trim());
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          rows={1}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
          className={cn(
            "w-full bg-transparent border-b border-transparent hover:border-app-card-border/35 focus:border-[var(--accent)]/40 focus:outline-none font-serif italic text-app-fg opacity-40 transition-all duration-300 ml-1 mt-0.5 leading-snug py-0.5 resize-none",
            isCompact ? "text-sm" : "text-lg"
          )}
          placeholder="Add line translation/meaning..."
        />
      </div>

      {/* 
        Single Outliner Stack: 
        No subtitles or noisy nested divisions. 
      */}
      <div className="border-l border-app-card-border/10 pl-5 space-y-1 ml-1 relative">
        {items.map((item, nIdx) => {
          const isEditing = editingId === item.id;
          
          // Render simple Note element (kind: "note")
          if (item.kind === "note") {
            const hasTextVal = !!item.text;

            return (
              <div 
                key={item.id} 
                className="group/item flex items-start gap-2 py-0.5 relative text-base text-app-fg/75"
              >
                <span className="text-app-fg/20 font-black shrink-0 mt-1 select-none font-mono">◦</span>
                
                {isEditing ? (
                  <div className="flex-1 min-w-0 pr-1 select-text">
                    <textarea
                      id={`note-textarea-${item.id}`}
                      autoFocus
                      defaultValue={item.text || ""}
                      placeholder="Commentary or explanation details..."
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      onBlur={(e) => {
                        handleSaveItemEdit(item.id, { text: e.target.value.trim() });
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          (e.target as HTMLTextAreaElement).blur();
                        }
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      rows={1}
                      className={cn(
                        "w-full bg-transparent border-b border-transparent hover:border-app-card-border/30 focus:border-[var(--accent)]/40 focus:outline-none py-0.5 resize-none font-sans leading-relaxed overflow-hidden",
                        isCompact ? "text-sm" : "text-lg"
                      )}
                    />
                  </div>
                ) : (
                  <div 
                    onClick={() => setEditingId(item.id)}
                    className="flex-1 min-w-0 select-text cursor-pointer hover:bg-app-fg/[0.015]"
                  >
                    {hasTextVal ? (
                      <span className={cn(
                        "font-sans tracking-normal leading-relaxed text-app-fg/80",
                        isCompact ? "text-sm" : "text-lg"
                      )}>
                        {item.text}
                      </span>
                    ) : (
                      <span className={cn(
                        "italic font-light select-none font-sans text-app-fg/30",
                        isCompact ? "text-sm" : "text-lg"
                      )}>
                        Empty note. Click to comment...
                      </span>
                    )}
                  </div>
                )}

                {/* Unified subtle hover control icons */}
                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-1.5 select-none">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      title="Edit note"
                      className="p-1 rounded text-app-fg/30 hover:bg-app-fg/5 hover:text-app-fg transition-colors cursor-pointer"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete note pointer"
                    className="p-1 rounded text-red-500/35 hover:bg-red-500/5 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          }

          // Render Phrase element (kind: "phrase")
          const phraseText = item.original || "";
          const translationText = item.translation || "";
          const noteOriginKey = currentTrack ? generateNoteOriginKey(currentTrack.trackId, currentTrack.lines[i]?.lineId, translationText, phraseText, nIdx) : "";
          const existingCard = noteOriginKey && originKeyMetadata ? originKeyMetadata.get(noteOriginKey) : undefined;
          const isAlreadyInDictionary = !!existingCard;

          // Autocomplete queries logic for tags
          const searchWord = tagInput.replace("#", "").trim().toLowerCase();
          const filteredTags = AVAILABLE_TAGS.filter(
            (tag) => tag.toLowerCase().includes(searchWord) && !(item.tags || []).includes(tag)
          );
          const suggestionsToDisplay = tagInput ? filteredTags : [];

          if (isEditing) {
            return (
              <div 
                key={item.id} 
                className="relative py-2.5 px-3 bg-app-card/45 border border-app-card-border/15 rounded-2xl space-y-3 select-text transition-all"
                id={`phrase-edit-${item.id}`}
              >
                {/* Two separate lines: original phrase and translation */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-app-fg/30 text-xs font-mono select-none">◦</span>
                    <textarea
                      id={`original-input-${item.id}`}
                      placeholder="Word or phrase"
                      defaultValue={item.original || ""}
                      autoFocus={!item.original}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      onBlur={(e) => handleSaveItemEdit(item.id, { original: e.target.value.trim() })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLTextAreaElement).blur();
                        }
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      rows={1}
                      className={cn(
                        "w-full bg-transparent border-b border-app-card-border/25 focus:border-[var(--accent)]/45 focus:outline-none font-semibold text-app-fg py-0.5 placeholder:text-app-fg/20 resize-none overflow-hidden leading-relaxed",
                        isCompact ? "text-sm" : "text-lg"
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2 pl-4">
                    <textarea
                      id={`translation-input-${item.id}`}
                      placeholder="Translation"
                      defaultValue={item.translation || ""}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      onBlur={(e) => handleSaveItemEdit(item.id, { translation: e.target.value.trim() })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLTextAreaElement).blur();
                        }
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      rows={1}
                      className={cn(
                        "w-full bg-transparent border-b border-app-card-border/25 focus:border-[var(--accent)]/45 focus:outline-none text-app-fg/90 py-0.5 placeholder:text-app-fg/20 resize-none overflow-hidden leading-relaxed",
                        isCompact ? "text-sm" : "text-lg"
                      )}
                    />
                  </div>
                </div>

                {/* Pill badges for types. Tags input completely removed. */}
                <div className="flex flex-col gap-2 text-xs select-none">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-app-fg/35 shrink-0 text-[10px] uppercase font-bold tracking-wider font-sans">type:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {SUPPORTED_TYPES.map((typeOption) => {
                        const isSelected = (item.type || "word") === typeOption;
                        return (
                          <button
                            key={typeOption}
                            type="button"
                            onClick={() => handleSaveItemEdit(item.id, { type: typeOption })}
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider transition-all duration-150 cursor-pointer border",
                              isSelected
                                ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/20"
                                : "bg-app-fg/[0.02] text-app-fg/40 hover:bg-app-fg/[0.05] border-transparent"
                            )}
                          >
                            {formatTypeLabel(typeOption)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Complete study card state tags */}
                  <div className="text-[10px] text-app-fg/30 font-medium select-none lowercase">
                    {item.source === "ai" ? "ai recommendation" : "manual phrase"}
                  </div>
                </div>

                {/* Close editing triggers */}
                <div className="flex items-center justify-end gap-1 select-none pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      // Save and collapse active edits
                      setEditingId(null);
                    }}
                    className="px-3 py-1 text-[11px] font-bold text-[var(--accent)] bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 rounded-xl cursor-pointer transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            );
          }

          // READ-MODE: Beautiful, clean, single outliner bullet line!
          // priority coordinates: original — translation · type #tags
          const cleanDisplayUrlLabel = formatTypeLabel(item.type || "word");
          const wordTags = item.tags || [];

          return (
            <div 
              key={item.id}
              className="group/item flex items-center justify-between gap-2 py-0.5 hover:bg-app-fg/[0.012] rounded px-1 relative transition-all text-app-fg/80"
              id={`phrase-read-${item.id}`}
            >
              {/* Bullet and compact literal values stack */}
              <div 
                onClick={() => setEditingId(item.id)}
                className={cn(
                  "flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden cursor-pointer select-text font-sans",
                  isCompact ? "text-sm" : "text-lg"
                )}
              >
                <span className="text-app-fg/20 font-black shrink-0 mt-0.5 select-none font-mono text-base">◦</span>
                
                <span className={cn("font-semibold text-app-fg shrink-0", isCompact ? "text-sm" : "text-lg")}>
                  {phraseText || <span className="text-app-fg/20 lowercase italic font-normal">[unsigned word]</span>}
                </span>

                <span className="text-app-fg/20 font-light select-none shrink-0">—</span>

                <span className={cn("text-app-fg/80 truncate", isCompact ? "text-sm" : "text-lg")}>
                  {translationText || <span className="text-app-fg/20 lowercase italic font-normal">[unsigned translation]</span>}
                </span>

                {/* Subdued category and tag text labels */}
                <span className="inline-flex items-center gap-1.5 shrink-0 text-[10px] select-none text-app-fg/35 pl-1 flex-wrap">
                  <span className="font-light">·</span>
                  <span className="italic">{cleanDisplayUrlLabel}</span>
                  {wordTags.map((t) => (
                    <span key={t} className="font-light italic shrink-0">#{t}</span>
                  ))}
                  
                  {/* Sync status identifier badges */}
                  {isAlreadyInDictionary && existingCard && (
                    <span className={cn(
                      "font-semibold lowercase border-l border-app-card-border/10 pl-1.5 shrink-0",
                      existingCard.status === "known" ? "text-emerald-500/55" : "text-orange-500/55"
                    )}>
                      #{existingCard.status === "known" ? "known" : "learning"}
                    </span>
                  )}
                </span>
              </div>

              {/* Hover action bar */}
              <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-2 select-none">
                <button
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  title="Edit word details"
                  className="p-1 rounded text-app-fg/30 hover:bg-app-fg/5 hover:text-app-fg transition-colors cursor-pointer"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  title="Remove word bullet"
                  className="p-1 rounded text-red-500/35 hover:bg-red-500/5 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
                {onAddNoteToDictionary && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAlreadyInDictionary) {
                        onAddNoteToDictionary(i, item, nIdx);
                      }
                    }}
                    disabled={isAlreadyInDictionary}
                    className={cn(
                      "p-1 rounded transition-colors cursor-pointer",
                      isAlreadyInDictionary 
                        ? "text-emerald-500 bg-emerald-500/5"
                        : "hover:bg-app-fg/5 text-app-fg/40 hover:text-[var(--accent)]"
                    )}
                    title={isAlreadyInDictionary ? "Saved in study cards" : "Add to Study Cards"}
                  >
                    {isAlreadyInDictionary ? <Check size={11} className="stroke-[3.5px]" /> : <Plus size={11} className="stroke-[2.5]" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI error logs or inline warning display */}
      {explanationError && (
        <div 
          id={`error-block-${i}`}
          className="mt-2 text-xs text-red-500 select-text bg-red-500/5 border border-red-500/10 rounded-lg p-2 flex items-center justify-between"
        >
          <span>{explanationError}</span>
          <button
            type="button"
            onClick={handleAiComplement}
            className="underline font-bold text-red-600 hover:text-red-500 cursor-pointer text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* 
        Action Row placed at bottom-right of the block: 
        Minimalist, icon-only buttons aligned to matching lyric line style, using ONLY English labels/tooltips.
      */}
      <div 
        id={`action-row-${i}`}
        className="flex justify-end items-center gap-2 mt-4 select-none pr-1"
      >
        <button
          id={`btn-add-phrase-${i}`}
          type="button"
          onClick={handleAddPhrase}
          title="Add Phrase"
          className="p-2 rounded-xl transition-all hover:scale-120 active:scale-90 text-app-fg/30 hover:text-[var(--accent)] hover:bg-app-fg/5 cursor-pointer duration-200"
        >
          <Plus size={20} className="stroke-[2.5]" />
        </button>

        <button
          id={`btn-add-note-${i}`}
          type="button"
          onClick={handleAddNote}
          title="Add Note"
          className="p-2 rounded-xl transition-all hover:scale-120 active:scale-90 text-app-fg/30 hover:text-[var(--accent)] hover:bg-app-fg/5 cursor-pointer duration-200"
        >
          <MessageSquare size={20} className="stroke-[2]" />
        </button>

        <button
          id={`btn-ai-complement-${i}`}
          type="button"
          onClick={handleAiComplement}
          disabled={isLoadingExplanation}
          title={cachedExpl ? "Regenerate AI Explanation" : "Explain with AI"}
          className="p-2 rounded-xl transition-all hover:scale-125 active:scale-90 disabled:opacity-50 cursor-pointer duration-200 text-purple-600/40 hover:text-purple-600 dark:text-purple-400/40 dark:hover:text-purple-400 hover:bg-purple-500/5 ml-1"
        >
          {isLoadingExplanation ? (
            <Brain size={20} className="animate-spin text-[var(--accent)]" />
          ) : cachedExpl ? (
            <Brain size={20} className="fill-[var(--accent)]/15 text-[var(--accent)] drop-shadow-sm" />
          ) : (
            <Brain size={20} />
          )}
        </button>
      </div>
    </div>
  );
};
