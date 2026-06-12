import React, { useState, useEffect, useRef } from "react";
import { 
  Brain, Check, Plus, Trash2, Edit2, Sparkles, X, MessageSquare, MoreVertical
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "../lib/i18n";

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
  onAddNoteToDictionary?: (lineIndex: number, note: any, noteIndex: number, status?: "known" | "learning") => void;
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
  const { t } = useTranslation();
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const editContainerRef = useRef<HTMLDivElement | null>(null);

  // Close editing state by clicking outside
  useEffect(() => {
    if (!editingId) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (editContainerRef.current && !editContainerRef.current.contains(event.target as Node)) {
        // Safe-guard: save active values specifically before closing if they changed
        const activeEditingId = editingId;
        const origInput = document.getElementById(`original-input-${activeEditingId}`) as HTMLTextAreaElement | null;
        const transInput = document.getElementById(`translation-input-${activeEditingId}`) as HTMLTextAreaElement | null;
        const noteInput = document.getElementById(`note-textarea-${activeEditingId}`) as HTMLTextAreaElement | null;
        
        const updates: any = {};
        let hasUpdates = false;
        
        if (origInput) {
          const val = origInput.value.trim();
          const matched = items.find(it => it.id === activeEditingId);
          if (matched && matched.original !== val) {
            updates.original = val;
            hasUpdates = true;
          }
        }
        if (transInput) {
          const val = transInput.value.trim();
          const matched = items.find(it => it.id === activeEditingId);
          if (matched && matched.translation !== val) {
            updates.translation = val;
            hasUpdates = true;
          }
        }
        if (noteInput) {
          const val = noteInput.value.trim();
          const matched = items.find(it => it.id === activeEditingId);
          if (matched && matched.text !== val) {
            updates.text = val;
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          handleSaveItemEdit(activeEditingId, updates);
        }
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingId, items]);

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
      className="mt-1 mb-2 pl-4 sm:pl-7 select-text font-sans relative"
      id={`workspace-wrapper-${i}`}
    >
      {/* Lyric line translation block at the top */}
      <div className="flex items-start gap-2 select-text pr-1">
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
            "w-full bg-transparent border-none focus:outline-none font-serif italic text-app-fg opacity-40 transition-all duration-300 ml-1 mt-0.5 leading-snug p-0 resize-none overflow-hidden",
            isCompact ? "text-xs" : "text-base"
          )}
          placeholder={t('lineWorkspace.translationPlaceholder')}
        />
      </div>

      {/* 
        Single Outliner Stack: 
        No subtitles or noisy nested divisions. 
      */}
      <div className="border-l border-app-card-border/10 pl-3.5 sm:pl-5 space-y-1 ml-1 relative">
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
                  <div ref={editContainerRef} className="flex-1 min-w-0 pr-1 select-text">
                    <textarea
                      id={`note-textarea-${item.id}`}
                      autoFocus
                      defaultValue={item.text || ""}
                      placeholder={t('lineWorkspace.commentaryPlaceholder')}
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
                        "w-full bg-transparent border-b border-transparent hover:border-app-card-border/30 focus:border-[var(--accent)]/40 focus:outline-none py-0.5 resize-none font-serif italic leading-relaxed overflow-hidden text-app-fg/50 focus:text-app-fg",
                        isCompact ? "text-xs" : "text-base"
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
                        "font-serif italic tracking-normal leading-relaxed text-app-fg/40 hover:text-app-fg/75 transition-colors",
                        isCompact ? "text-xs" : "text-base"
                      )}>
                        {item.text}
                      </span>
                    ) : (
                      <span className={cn(
                        "italic font-light select-none font-serif text-app-fg/20",
                        isCompact ? "text-xs" : "text-base"
                      )}>
                        {t('lineWorkspace.emptyNote')}
                      </span>
                    )}
                  </div>
                )}

                {/* Unified subtle hover control icons without edit button */}
                <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-1.5 select-none relative">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                      }}
                      className="p-1 rounded text-app-fg/30 hover:bg-app-fg/5 hover:text-app-fg transition-colors cursor-pointer"
                      title={t('lineWorkspace.options')}
                    >
                      <MoreVertical size={13} />
                    </button>
                    {activeMenuId === item.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                          }}
                        />
                        <div className="absolute right-0 mt-1 bg-app-card border border-app-card-border/60 shadow-lg rounded-xl py-1 px-1 z-50 min-w-[100px] text-xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-red-500 hover:bg-red-500/5 hover:text-red-500 rounded bg-transparent border-none text-left cursor-pointer font-sans"
                          >
                            <Trash2 size={12} />
                            <span>{t('common.delete')}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
                ref={editContainerRef}
                className="relative py-2.5 px-3 bg-app-card/45 border border-app-card-border/15 rounded-2xl space-y-3 select-text transition-all"
                id={`phrase-edit-${item.id}`}
              >
                {/* Two separate lines: original phrase and translation */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                     <span className="text-app-fg/30 text-xs font-mono select-none">◦</span>
                    <textarea
                      id={`original-input-${item.id}`}
                      placeholder={t('lineWorkspace.wordPlaceholder')}
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
                        "w-full bg-transparent border-b border-app-card-border/25 focus:border-[var(--accent)]/45 focus:outline-none font-serif italic font-semibold text-app-fg py-0.5 placeholder:text-app-fg/20 resize-none overflow-hidden leading-relaxed",
                        isCompact ? "text-xs" : "text-base"
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2 pl-4">
                    <textarea
                      id={`translation-input-${item.id}`}
                      placeholder={t('lineWorkspace.translationPlaceholder2')}
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
                        "w-full bg-transparent border-b border-app-card-border/25 focus:border-[var(--accent)]/45 focus:outline-none font-serif italic text-app-fg/90 py-0.5 placeholder:text-app-fg/20 resize-none overflow-hidden leading-relaxed",
                        isCompact ? "text-xs" : "text-base"
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
                    {item.source === "ai" ? t('lineWorkspace.aiRecommendation') : t('lineWorkspace.manualPhrase')}
                  </div>
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
              className={cn(
                "group/item flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 px-3 sm:px-3.5 rounded-2xl relative transition-all border select-none sm:select-text",
                isAlreadyInDictionary && existingCard
                  ? existingCard.status === "known"
                    ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07] border-emerald-500/10"
                    : "bg-orange-500/[0.04] hover:bg-orange-500/[0.07] border-orange-500/10"
                  : "bg-transparent hover:bg-app-fg/[0.015] border-transparent"
              )}
              id={`phrase-read-${item.id}`}
            >
              {/* Bullet and compact literal values stack */}
              <div 
                onClick={() => setEditingId(item.id)}
                className={cn(
                  "flex-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0 cursor-pointer select-text font-serif italic",
                  isCompact ? "text-xs" : "text-base"
                )}
              >
                <span className="text-app-fg/20 font-black shrink-0 select-none font-mono text-base mr-0.5">◦</span>
                
                <span className="font-semibold text-app-fg/40 group-hover/item:text-app-fg/75 transition-colors break-words">
                  {phraseText || <span className="text-app-fg/20 lowercase italic font-normal">{t('lineWorkspace.unsignedWord')}</span>}
                </span>

                <span className="text-app-fg/20 font-light select-none">—</span>

                <span className="text-app-fg/40 group-hover/item:text-app-fg/75 transition-colors break-words">
                  {translationText || <span className="text-app-fg/20 lowercase italic font-normal">{t('lineWorkspace.unsignedTranslation')}</span>}
                </span>

                {/* Subdued category and tag text labels */}
                <span className="inline-flex flex-wrap items-center gap-1.5 text-[10px] select-none text-app-fg/30 group-hover/item:text-app-fg/50 transition-colors pl-1">
                  <span className="font-light">·</span>
                  <span className="italic">{cleanDisplayUrlLabel}</span>
                  {wordTags.map((t) => (
                    <span key={t} className="font-light italic shrink-0">#{t}</span>
                  ))}
                </span>
              </div>

              {/* Hover action bar replacing old icons with Know / Learn action pills */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-2 mt-1 sm:mt-0 select-none">
                {/* Primary visible actions on Desktop: Know and Learn */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAlreadyInDictionary && existingCard) {
                      if (onEditCardFields) onEditCardFields(existingCard.id, { status: "known" });
                    } else {
                      if (onAddNoteToDictionary) onAddNoteToDictionary(i, item, nIdx, "known");
                    }
                  }}
                  className={cn(
                    "hidden sm:inline-flex items-center justify-center px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border",
                    isAlreadyInDictionary && existingCard?.status === "known"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm"
                      : "bg-transparent text-app-fg/40 hover:text-emerald-500 border-transparent hover:bg-emerald-500/5"
                  )}
                >
                  {t('lineWorkspace.know')}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAlreadyInDictionary && existingCard) {
                      if (onEditCardFields) onEditCardFields(existingCard.id, { status: "learning" });
                    } else {
                      if (onAddNoteToDictionary) onAddNoteToDictionary(i, item, nIdx, "learning");
                    }
                  }}
                  className={cn(
                    "hidden sm:inline-flex items-center justify-center px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border",
                    isAlreadyInDictionary && existingCard?.status === "learning"
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 shadow-sm"
                      : "bg-transparent text-app-fg/40 hover:text-orange-500 border-transparent hover:bg-orange-500/5"
                  )}
                >
                  {t('lineWorkspace.learn')}
                </button>

                {/* Vertical menu with 3-dots */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === item.id ? null : item.id);
                    }}
                    className="p-1.5 rounded-lg text-app-fg/30 hover:bg-app-fg/5 hover:text-app-fg transition-colors cursor-pointer"
                    title={t('lineWorkspace.options')}
                  >
                    <MoreVertical size={13} />
                  </button>
                  {activeMenuId === item.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                        }}
                      />
                      <div className="absolute right-0 mt-1.5 bg-app-card border border-app-card-border/60 shadow-lg rounded-xl py-1 px-1 z-50 min-w-[130px] text-xs">
                        {/* Mobile active menu buttons listed inside dropdown */}
                        <div className="flex flex-col sm:hidden border-b border-app-card-border/40 pb-1 mb-1 gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAlreadyInDictionary && existingCard) {
                                if (onEditCardFields) onEditCardFields(existingCard.id, { status: "known" });
                              } else {
                                if (onAddNoteToDictionary) onAddNoteToDictionary(i, item, nIdx, "known");
                              }
                              setActiveMenuId(null);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left font-sans font-medium transition-all cursor-pointer",
                              isAlreadyInDictionary && existingCard?.status === "known"
                                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                : "text-app-fg/70 hover:bg-app-fg/5"
                            )}
                          >
                            <span>{t('lineWorkspace.know')}</span>
                            {isAlreadyInDictionary && existingCard?.status === "known" && <Check size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAlreadyInDictionary && existingCard) {
                                if (onEditCardFields) onEditCardFields(existingCard.id, { status: "learning" });
                              } else {
                                if (onAddNoteToDictionary) onAddNoteToDictionary(i, item, nIdx, "learning");
                              }
                              setActiveMenuId(null);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left font-sans font-medium transition-all cursor-pointer",
                              isAlreadyInDictionary && existingCard?.status === "learning"
                                ? "text-orange-600 dark:text-orange-400 bg-orange-500/10"
                                : "text-app-fg/70 hover:bg-app-fg/5"
                            )}
                          >
                            <span>{t('lineWorkspace.learn')}</span>
                            {isAlreadyInDictionary && existingCard?.status === "learning" && <Check size={12} />}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-red-500 hover:bg-red-500/5 hover:text-red-500 rounded bg-transparent border-none text-left cursor-pointer font-sans font-medium"
                        >
                          <Trash2 size={12} />
                          <span>{t('common.delete')}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
            {t('common.retry')}
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
          title={t('lineWorkspace.addPhraseTooltip')}
          className="p-2 rounded-xl transition-all hover:scale-120 active:scale-90 text-app-fg/30 hover:text-[var(--accent)] hover:bg-app-fg/5 cursor-pointer duration-200"
        >
          <Plus size={20} className="stroke-[2.5]" />
        </button>

        <button
          id={`btn-add-note-${i}`}
          type="button"
          onClick={handleAddNote}
          title={t('lineWorkspace.addNoteTooltip')}
          className="p-2 rounded-xl transition-all hover:scale-120 active:scale-90 text-app-fg/30 hover:text-[var(--accent)] hover:bg-app-fg/5 cursor-pointer duration-200"
        >
          <MessageSquare size={20} className="stroke-[2]" />
        </button>

        <button
          id={`btn-ai-complement-${i}`}
          type="button"
          onClick={handleAiComplement}
          disabled={isLoadingExplanation}
          title={cachedExpl ? t('lineWorkspace.regenerateAiTooltip') : t('lineWorkspace.explainWithAiTooltip')}
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
