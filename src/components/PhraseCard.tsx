import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Volume2, 
  HelpCircle, 
  RefreshCw, 
  CheckCircle2, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Tag, 
  User, 
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export interface LyricsLineContext {
  lineId?: string;
  original: string;
  translation?: string;
}

export type PhraseCardStatus = "new" | "learning" | "known";

export interface PhraseCardProps {
  itemId: string;
  index?: number; // 0-based index for showing number like "1."
  phraseText: string;
  highlightedPhraseText?: React.ReactNode;
  
  translation?: string;
  highlightedTranslation?: React.ReactNode;
  
  explanation?: string;
  highlightedExplanation?: React.ReactNode;
  
  userNote?: string;
  highlightedUserNote?: React.ReactNode;
  
  type?: string;
  typeLabel?: string;
  source?: "user" | "ai";
  
  // Status with optional status switcher callback
  status: PhraseCardStatus;
  onStatusChange?: (nextStatus: PhraseCardStatus) => void;
  
  // Lyric Context from track lines
  contextLines?: LyricsLineContext[];
  
  // Speaking status
  isSpeaking?: boolean;
  onSpeak?: () => void;
  
  // Collapse/Expand state and handlers
  isExpanded: boolean;
  onToggleExpand: () => void;
  
  // Inline edit state
  isEditing?: boolean;
  editFormContent?: React.ReactNode;
  
  // Menu callbacks (for meatball dropdown if provided)
  onEdit?: () => void;
  onDelete?: () => void;
  
  // Bottom action buttons slot (e.g. Known / Study / Custom)
  actionButtons?: React.ReactNode;
  
  // Custom right-side buttons (alternative or supplementary to dropdown)
  headerRightActions?: React.ReactNode;
  
  // Metadata / UI language translations
  uiLanguage?: 'ru' | 'en';
}

export const PhraseCard: React.FC<PhraseCardProps> = ({
  itemId,
  index,
  phraseText,
  highlightedPhraseText,
  translation,
  highlightedTranslation,
  explanation,
  highlightedExplanation,
  userNote,
  highlightedUserNote,
  type = "phrase",
  typeLabel,
  source,
  status,
  onStatusChange,
  contextLines = [],
  isSpeaking = false,
  onSpeak,
  isExpanded,
  onToggleExpand,
  isEditing = false,
  editFormContent,
  onEdit,
  onDelete,
  actionButtons,
  headerRightActions,
  uiLanguage = 'en',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Status mapping
  const nextStatuses: Record<PhraseCardStatus, PhraseCardStatus> = {
    new: "learning",
    learning: "known",
    known: "new"
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(nextStatuses[status]);
    }
  };

  const translateStatus = (st: PhraseCardStatus) => {
    if (uiLanguage === 'ru') {
      return st === 'known' ? 'Изучено' : st === 'learning' ? 'Учу' : 'Новое';
    }
    return st === 'known' ? 'Known' : st === 'learning' ? 'Learning' : 'New';
  };

  // State-based coloring (from StudyView but optimized for unified aesthetics)
  let bgClasses = "bg-app-card/70 border-app-card-border hover:border-app-card-border/85";
  if (status === "new") {
    bgClasses = "bg-sky-500/[0.04] border-sky-500/20 hover:border-sky-500/35";
  } else if (status === "learning") {
    bgClasses = "bg-orange-500/[0.04] border-orange-500/20 hover:border-orange-500/35";
  } else if (status === "known") {
    bgClasses = "bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/35";
  }

  return (
    <div 
      onClick={onToggleExpand}
      className={`cursor-pointer rounded-[2rem] border transition-all duration-300 overflow-hidden relative group font-sans ${bgClasses}`}
    >
      {/* ALWAYS VISIBLE HEADER SEGMENT */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-4 w-full">
          {/* Left Block: Number + Phrase text + voice trigger */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {index !== undefined && (
                <span className="text-base font-sans font-semibold text-app-fg/40 select-none shrink-0">
                  {index + 1}.
                </span>
              )}

              <h3 className="text-lg font-sans font-semibold text-app-fg leading-snug">
                {highlightedPhraseText || phraseText}
              </h3>

              {onSpeak && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpeak();
                  }}
                  className={`p-1.5 rounded-lg border border-app-card-border/80 transition-all flex items-center justify-center hover:bg-app-accent hover:text-white shrink-0 cursor-pointer ${
                    isSpeaking 
                      ? "bg-orange-500 text-white border-orange-500 animate-pulse scale-105" 
                      : "bg-transparent text-app-fg opacity-65 hover:opacity-100 hover:scale-105"
                  }`}
                  title={uiLanguage === 'ru' ? "Прослушать произношение" : "Pronounce phrase"}
                >
                  <Volume2 size={13} />
                </button>
              )}
            </div>

            {/* Translation description */}
            {translation && (
              <p className="text-sm font-sans text-app-fg/60 leading-snug pl-6 mt-1 transition-all">
                {highlightedTranslation || translation}
              </p>
            )}
          </div>

          {/* Right Block: Status Button + Dropdown Actions or Custom Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Button */}
            {onStatusChange && (
              <button
                onClick={handleStatusClick}
                className="shrink-0 flex items-center justify-center p-2 rounded-xl border border-app-card-border/60 bg-transparent hover:bg-app-card hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={uiLanguage === 'ru' ? `Статус: ${translateStatus(status)}` : `Status: ${translateStatus(status)}`}
              >
                {status === "known" ? (
                  <CheckCircle2 size={16} className="text-app-fg opacity-35" />
                ) : status === "learning" ? (
                  <RefreshCw size={15} className="text-orange-500" />
                ) : (
                  <HelpCircle size={16} className="text-sky-500" />
                )}
              </button>
            )}

            {/* Header action overrides or dot-menu */}
            {headerRightActions ? (
              <div onClick={(e) => e.stopPropagation()}>{headerRightActions}</div>
            ) : (onEdit || onDelete) ? (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-2 rounded-xl border border-app-card-border bg-app-bg text-app-fg opacity-75 hover:opacity-100 hover:bg-app-card transition-all flex items-center justify-center cursor-pointer"
                  title={uiLanguage === 'ru' ? "Опции" : "More options"}
                >
                  <MoreVertical size={12} />
                </button>
                
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                      }}
                    />
                    <div 
                      className="absolute right-0 mt-1.5 w-36 bg-app-bg border border-app-card-border rounded-xl shadow-xl py-1 z-50 animate-fadeIn animate-duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onEdit && (
                        <button
                          onClick={() => {
                            onEdit();
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-app-card transition-colors flex items-center gap-2 text-xs text-app-fg font-sans font-medium cursor-pointer"
                        >
                          <Edit2 size={11} className="opacity-60" />
                          <span>{uiLanguage === 'ru' ? 'Редактировать' : 'Edit Phrase'}</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            onDelete();
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center gap-2 text-xs text-rose-500 font-sans font-semibold cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>{uiLanguage === 'ru' ? 'Указать / Удалить' : 'Delete'}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* EXTENDED CONTENT PANEL */}
        {isExpanded && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
            }} 
            className="space-y-4 pt-4 mt-4 border-t border-app-card-border/40 animate-fadeIn cursor-default"
          >
            {isEditing && editFormContent ? (
              /* If in editing state, render edit content block */
              <div className="animate-fadeIn">{editFormContent}</div>
            ) : (
              /* Display state */
              <>
                {/* Explanation text */}
                {explanation && (
                  <div className="pl-4 border-l-2 border-app-card-border">
                    <div className="markdown-body text-base text-app-fg opacity-75 leading-relaxed font-sans font-medium">
                      {highlightedExplanation || (
                        <ReactMarkdown>
                          {explanation}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Action Buttons */}
                {actionButtons && (
                  <div className="flex items-center gap-3 pt-1 font-sans">
                    {actionButtons}
                  </div>
                )}

                {/* User Private Note */}
                {userNote && userNote.trim() !== "" && (
                  <div className="p-4 rounded-xl bg-orange-500/[0.03] border border-orange-500/10 text-xs space-y-1 font-sans">
                    <span className="text-[9px] font-black uppercase tracking-wider text-orange-500 opacity-80 block font-sans">
                      {uiLanguage === 'ru' ? 'Личные заметки' : 'Personal Note'}
                    </span>
                    <p className="text-app-fg opacity-75 leading-relaxed font-sans font-medium select-text">
                      {highlightedUserNote || userNote}
                    </p>
                  </div>
                )}

                {/* Lyrics Context (dynamic and robust mapping) */}
                {contextLines && contextLines.length > 0 ? (
                  <div className="pt-3 border-t border-app-card-border/45 space-y-2 font-sans">
                    <span className="text-[9px] font-black uppercase tracking-wider text-app-fg opacity-40 block font-sans">
                      {uiLanguage === 'ru' ? 'Контекст из песни' : 'Lyrics Context'}
                    </span>
                    <div className="p-4 rounded-2xl bg-app-bg border border-app-card-border divide-y divide-app-card-border/40 space-y-3 font-sans">
                      {contextLines.map((line, lIdx) => (
                        <div key={line.lineId || lIdx} className={lIdx > 0 ? "pt-3" : ""}>
                          <p className="font-serif font-semibold text-app-fg leading-snug">
                            {line.original}
                          </p>
                          {line.translation && line.translation.trim() !== "" && (
                            <p className="font-sans text-xs text-app-fg opacity-50 italic mt-1 leading-snug">
                              {line.translation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-app-card-border/45 space-y-1 font-sans">
                    <span className="text-[9px] font-black uppercase tracking-wider text-app-fg opacity-40 block font-sans">
                      {uiLanguage === 'ru' ? 'Контекст из песни' : 'Lyrics Context'}
                    </span>
                    <div className="p-3.5 rounded-2xl bg-app-bg border border-app-card-border/40 text-xs font-sans text-left">
                      <p className="font-sans text-app-fg opacity-35 italic">
                        {uiLanguage === 'ru' ? 'Контекст отсутствует' : 'No lyric context linked'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Metadata Tags Source and Type Badges */}
                <div className="pt-3 border-t border-app-card-border/40 flex flex-wrap items-center gap-2.5 font-sans">
                  <span className="text-[9px] font-black uppercase tracking-wider text-app-fg opacity-35 block mr-1.5 font-sans">
                    {uiLanguage === 'ru' ? 'Метаданные:' : 'Metadata:'}
                  </span>
                  
                  {/* Type block badge */}
                  <span className="px-2.5 py-1 rounded-lg bg-app-bg text-[9px] font-black uppercase tracking-widest text-app-fg opacity-55 border border-app-card-border flex items-center gap-1.5 shadow-xs font-sans">
                    <Tag size={10} className="text-orange-500 select-none animate-none" />
                    {typeLabel || type}
                  </span>

                  {/* Creator / Origin Tag details */}
                  {source && (
                    source === "user" ? (
                      <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 font-sans">
                        <User size={8} />
                        {uiLanguage === 'ru' ? 'Пользователь' : 'User'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1 font-sans">
                        <Sparkles size={8} />
                        AI
                      </span>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
