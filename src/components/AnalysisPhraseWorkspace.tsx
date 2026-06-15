import React, { useState, useMemo } from "react";
import { 
  Search, 
  Plus, 
  Trash2, 
  Volume2, 
  CheckCircle2, 
  HelpCircle, 
  X, 
  RefreshCw, 
  Bookmark
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Phrase, LyricsLine, TrackLyricsData } from "../services/musicService";
import { PhraseStatus, normalizePhraseKey } from "../services/cardService";
import { addUserPhrase, editPhrase, deletePhrase, resolvePhraseContext } from "../services/lyricsAnalysisService";
import { useTranslation } from "../lib/i18n";
import { PhraseCard, PhraseCardStatus } from "./PhraseCard";
import { cn } from "../lib/utils";

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
  onNavigateToTab?: (tab: "preview" | "lyrics" | "analysis" | "cards") => void;
  onStartStudy?: () => void;
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
  onNavigateToTab,
  onStartStudy
}) => {
  const { uiLanguage } = useTranslation();

  const typeLabels = useMemo<Record<string, string>>(() => ({
    idiom: uiLanguage === 'ru' ? 'Идиома' : 'Idiom',
    collocation: uiLanguage === 'ru' ? 'Коллокация' : 'Collocation',
    phrasal_verb: uiLanguage === 'ru' ? 'Фразовый глагол' : 'Phrasal Verb',
    cultural_ref: uiLanguage === 'ru' ? 'Культурная отсылка' : 'Cultural Reference',
    vocabulary: uiLanguage === 'ru' ? 'Лексика' : 'Vocabulary',
    phrase: uiLanguage === 'ru' ? 'Фраза' : 'Phrase',
    slang: uiLanguage === 'ru' ? 'Сленг' : 'Slang',
    verb: uiLanguage === 'ru' ? 'Глагол' : 'Verb',
    grammar: uiLanguage === 'ru' ? 'Грамматика' : 'Grammar',
    cultural: uiLanguage === 'ru' ? 'Культурное' : 'Cultural',
    core: uiLanguage === 'ru' ? 'Базовая лексика' : 'Core Vocabulary',
    colloquial: uiLanguage === 'ru' ? 'Разговорное' : 'Colloquial',
    advanced: uiLanguage === 'ru' ? 'Продвинутый' : 'Advanced'
  }), [uiLanguage]);

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
  const [selectedType, setSelectedType] = useState<string>("all");

  // Extract only the explicitly study-saved unique phrases for this track from phraseMetadata
  const uniquePhrases = useMemo(() => {
    const list: Phrase[] = [];
    const seen = new Set<string>();

    const cardsForTrack = Array.from(phraseMetadata.values()).filter(
      (card) =>
        card.trackId === currentTrack.trackId &&
        (card.status === "learning" || card.status === "known")
    );

    cardsForTrack.forEach((card) => {
      const key = normalizePhraseKey(card.text);
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({
          id: card.id || card.phraseId || `card-${card.text}`,
          text: card.text,
          translation: card.translation || "",
          explanation: card.explanation || "",
          type: (card as any).originType || (card as any).type || "phrase",
          source: (card as any).entryType === "user" || (card as any).source === "user" ? "user" : "ai",
          note: (card as any).note || card.userNote || "",
          lineIds: card.lineId ? [card.lineId] : [],
        } as Phrase);
      }
    });

    return list;
  }, [currentTrack, phraseMetadata]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    uniquePhrases.forEach(phrase => {
      const type = phrase.type || '';
      if (type && !['new', 'learning', 'known', 'user', 'ai', 'has_note', 'none', 'all'].includes(type.toLowerCase()) && typeLabels[type]) {
        types.add(type);
      }
    });
    return Array.from(types).sort();
  }, [uniquePhrases, typeLabels]);

  // Helper to highlight matched query in textual content
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return <>{text}</>;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return <>{text}</>;
    const length = query.length;
    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold px-0.5 rounded-sm select-text">{text.substring(index, index + length)}</mark>
        {text.substring(index + length)}
      </>
    );
  };

  // Filter phrases based on searched query & selected type
  const filteredPhrases = useMemo(() => {
    let result = uniquePhrases;

    // Apply type filter
    if (selectedType !== "all") {
      result = result.filter(phrase => phrase.type === selectedType);
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

    // Sort newest first by main card's createdAt
    return [...result].sort((a, b) => {
      const cardA = phraseMetadata.get(normalizePhraseKey(a.text));
      const cardB = phraseMetadata.get(normalizePhraseKey(b.text));
      const dateA = cardA ? (cardA.createdAt instanceof Date ? cardA.createdAt : new Date(cardA.createdAt || 0)) : new Date(0);
      const dateB = cardB ? (cardB.createdAt instanceof Date ? cardB.createdAt : new Date(cardB.createdAt || 0)) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [uniquePhrases, trackSearchQuery, selectedType, phraseMetadata, currentTrack.lines]);

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
    const confirmMessage = uiLanguage === 'ru'
      ? "Вы уверены, что хотите удалить эту фразу?"
      : "Are you sure you want to delete this phrase?";
    if (window.confirm(confirmMessage)) {
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-app-fg" size={16} />
            <input
              type="text"
              placeholder={uiLanguage === 'ru' ? 'Поиск фраз, переводов, личного или песенного контекста...' : 'Search phrases, translations, notes, or lyric context...'}
              value={trackSearchQuery}
              onChange={(e) => setTrackSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-app-card border border-app-card-border focus:border-orange-500 focus:outline-none text-xs font-sans placeholder-app-fg/30 transition-all text-app-fg"
            />
            {trackSearchQuery && (
              <button
                onClick={() => setTrackSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 text-app-fg cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                clearForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center w-12 h-12 bg-orange-500 hover:bg-orange-600 transition-colors text-white rounded-full shadow-lg shrink-0 hover:scale-105 active:scale-95 duration-200"
              title={uiLanguage === 'ru' ? "Добавить свою фразу" : "Add Custom Phrase"}
            >
              <Plus size={22} className="stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Filter Chips Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer active:scale-95",
              selectedType === 'all'
                ? "bg-app-fg text-app-bg border-app-fg shadow-lg"
                : "bg-app-card text-app-fg/60 border-app-card-border hover:border-[var(--accent)]/35 hover:text-app-fg"
            )}
          >
            {uiLanguage === 'ru' ? 'Все теги' : 'All tags'}
          </button>
          {availableTypes.map(t => (
            <button
              key={`type-chip-${t}`}
              type="button"
              onClick={() => setSelectedType(t)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer active:scale-95",
                selectedType === t
                  ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-md shadow-[var(--accent)]/15"
                  : "bg-app-card text-app-fg/60 border-app-card-border hover:border-[var(--accent)]/35 hover:text-app-fg"
              )}
            >
              {typeLabels[t] || t}
            </button>
          ))}
          {(selectedType !== "all" || trackSearchQuery.trim() !== "") && (
            <button
              onClick={() => {
                setSelectedType("all");
                setTrackSearchQuery("");
              }}
              className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 px-2 py-1 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X size={10} strokeWidth={3} />
              <span>{uiLanguage === 'ru' ? 'Сбросить фильтры' : 'Clear filters'}</span>
            </button>
          )}
        </div>
      </div>

      {uniquePhrases.length > 0 && onStartStudy && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 sm:p-6 rounded-[2rem] bg-emerald-500/[0.04] border border-emerald-500/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
        >
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-black tracking-widest text-emerald-600 uppercase block mb-0.5 animate-pulse">
              {uiLanguage === 'ru' ? 'КОЛОДА ГОТОВА • НАЧНИ ТРЕНИРОВКУ' : 'Ready for Practice'}
            </span>
            <h4 className="text-base font-extrabold text-app-fg tracking-tight">
              {uiLanguage === 'ru' 
                ? `Сохранено фраз в колоде: ${uniquePhrases.length}`
                : `${uniquePhrases.length} saved phrase${uniquePhrases.length > 1 ? 's' : ''} in your deck`
              }
            </h4>
            <p className="text-[11px] sm:text-xs text-app-muted font-medium">
              {uiLanguage === 'ru'
                ? 'Изучайте эти слова методом интервального повторения, чтобы закрепить их в памяти навсегда.'
                : 'Review these items with active spaced repetition logic to memorize them forever.'
              }
            </p>
          </div>
          <button
            type="button"
            onClick={onStartStudy}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md shadow-emerald-500/15 shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-center"
          >
            <CheckCircle2 size={14} />
            {uiLanguage === 'ru' ? 'Учить карточки' : 'Start Study'}
          </button>
        </motion.div>
      )}

      {/* Phrases List */}
      <div>
        {filteredPhrases.length > 0 ? (
          <div className="grid gap-4 font-sans">
            {filteredPhrases.map((item, idx) => {
              const card = phraseMetadata.get(normalizePhraseKey(item.text));
              const currentStatus: PhraseStatus = card ? card.status : "new";
              const itemKey = item.id || item.text;
              const isExpanded = expandedPhraseKeys.has(itemKey);

              const contextLines = resolvePhraseContext(currentTrack.lines, item.lineIds, item.text);

              const typeLabels: Record<string, string> = {
                idiom: uiLanguage === 'ru' ? 'Идиома' : 'Idiom',
                collocation: uiLanguage === 'ru' ? 'Коллокация' : 'Collocation',
                phrasal_verb: uiLanguage === 'ru' ? 'Фразовый глагол' : 'Phrasal Verb',
                cultural_ref: uiLanguage === 'ru' ? 'Культурная отсылка' : 'Cultural Reference',
                vocabulary: uiLanguage === 'ru' ? 'Лексика' : 'Vocabulary',
                phrase: uiLanguage === 'ru' ? 'Фраза' : 'Phrase',
                slang: uiLanguage === 'ru' ? 'Сленг' : 'Slang',
                verb: uiLanguage === 'ru' ? 'Глагол' : 'Verb',
                grammar: uiLanguage === 'ru' ? 'Грамматика' : 'Grammar',
                cultural: uiLanguage === 'ru' ? 'Культурное' : 'Cultural',
                core: uiLanguage === 'ru' ? 'Базовая лексика' : 'Core Vocabulary',
                colloquial: uiLanguage === 'ru' ? 'Разговорное' : 'Colloquial',
                advanced: uiLanguage === 'ru' ? 'Продвинутый' : 'Advanced'
              };

              const isEditing = inlineEditId === item.id;
              const editFormContent = (
                <div className="space-y-4 font-sans text-xs">
                  <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider block font-sans">
                    {uiLanguage === 'ru' ? 'Редактирование фразы' : 'Edit Phrase Inline'}
                  </span>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">
                        {uiLanguage === 'ru' ? 'Фраза / Слово' : 'Phrase / Word'}
                      </label>
                      <input
                        type="text"
                        value={formText}
                        onChange={(e) => setFormText(e.target.value)}
                        className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">
                        {uiLanguage === 'ru' ? 'Перевод' : 'Translation'}
                      </label>
                      <input
                        type="text"
                        value={formTranslation}
                        onChange={(e) => setFormTranslation(e.target.value)}
                        className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">
                      {uiLanguage === 'ru' ? 'Объяснение / Контекст' : 'Clarification / Explanation'}
                    </label>
                    <textarea
                      rows={2}
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">
                      {uiLanguage === 'ru' ? 'Личные заметки' : 'Personal Note'}
                    </label>
                    <textarea
                      rows={2}
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-app-fg opacity-40 tracking-wider block">
                      {uiLanguage === 'ru' ? 'Тип' : 'Type'}
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-sans bg-app-bg text-app-fg"
                    >
                      {Object.entries(typeLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2.5 pt-1.5 justify-end">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-xxs font-black uppercase text-white tracking-wider transition-colors active:scale-95 duration-150 cursor-pointer"
                    >
                      {uiLanguage === 'ru' ? 'Сохранить изменения' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setInlineEditId(null);
                        clearForm();
                      }}
                      className="px-4 py-2 bg-app-card border border-app-card-border hover:bg-app-bg text-app-fg opacity-75 hover:opacity-100 rounded-xl text-xxs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      {uiLanguage === 'ru' ? 'Отмена' : 'Cancel'}
                    </button>
                  </div>
                </div>
              );

              const bottomActionButtons = (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", "known");
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer ${
                      currentStatus === "known"
                        ? "bg-app-card border border-app-card-border/60 text-app-fg opacity-30 cursor-default"
                        : "bg-app-bg border border-app-card-border hover:border-app-fg/20 active:scale-95 text-app-fg hover:bg-app-card shadow-xs"
                    }`}
                  >
                    <CheckCircle2 size={13} className="text-app-fg opacity-40 shrink-0 select-none animate-none" />
                    <span className="font-sans">{uiLanguage === 'ru' ? 'Знаю' : 'Known'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", "learning");
                    }}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer ${
                      currentStatus === "learning"
                        ? "bg-orange-500/15 border border-orange-500/30 text-orange-500 cursor-default"
                        : "bg-app-bg border border-app-card-border hover:border-orange-500/30 active:scale-95 text-orange-500 hover:bg-orange-500/[0.02] shadow-xs"
                    }`}
                  >
                    <RefreshCw size={12} className="text-orange-500 shrink-0 select-none animate-none" />
                    <span className="font-sans">{uiLanguage === 'ru' ? 'Учить' : 'Study'}</span>
                  </button>
                </>
              );

              return (
                <PhraseCard
                  key={item.id || idx}
                  itemId={item.id}
                  index={idx}
                  phraseText={item.text}
                  highlightedPhraseText={highlightMatch(item.text, trackSearchQuery)}
                  translation={item.translation}
                  highlightedTranslation={item.translation ? highlightMatch(item.translation, trackSearchQuery) : undefined}
                  explanation={item.explanation}
                  highlightedExplanation={item.explanation ? highlightMatch(item.explanation, trackSearchQuery) : undefined}
                  userNote={item.note}
                  highlightedUserNote={item.note ? highlightMatch(item.note, trackSearchQuery) : undefined}
                  type={item.type}
                  typeLabel={typeLabels[item.type || "phrase"]}
                  source={item.source === "llm" ? "ai" : item.source}
                  status={currentStatus as PhraseCardStatus}
                  onStatusChange={(nextStatus) => {
                    handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", nextStatus as any);
                  }}
                  contextLines={contextLines}
                  isSpeaking={currentlySpeakingId === item.id}
                  onSpeak={() => handleVoicing(item)}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleExpand(itemKey)}
                  isEditing={isEditing}
                  editFormContent={editFormContent}
                  onEdit={() => handleOpenEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                  actionButtons={bottomActionButtons}
                  uiLanguage={uiLanguage}
                />
              );
            })}
          </div>
        ) : uniquePhrases.length > 0 ? (
          <div className="py-20 text-center space-y-4 rounded-[2rem] bg-app-card/25 border border-dashed border-app-card-border/60 font-sans">
            <HelpCircle size={40} className="mx-auto text-app-fg opacity-15" />
            <p className="text-sm font-black text-app-fg opacity-40 uppercase tracking-widest">
              {uiLanguage === 'ru' ? 'Нет подходящих фраз' : 'No matching phrases'}
            </p>
            <p className="text-xs text-app-fg opacity-30 font-medium max-w-sm mx-auto">
              {uiLanguage === 'ru'
                ? 'Мы не смогли найти фразы, соответствующие вашим текущим фильтрам и поисковому запросу. Попробуйте сбросить их.'
                : "We couldn't find any phrases matching your current filters and search query. Try clearing them to see all phrases."
              }
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSelectedType("all");
                  setTrackSearchQuery("");
                }}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 duration-150"
              >
                {uiLanguage === 'ru' ? 'Сбросить фильтры и поиск' : 'Clear filters & search'}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-6 rounded-[3rem] bg-app-card/25 border border-dashed border-app-card-border/60 max-w-lg mx-auto px-6 font-sans">
            <Bookmark size={40} className="mx-auto text-orange-500 opacity-35" />
            <div className="space-y-2">
              <p className="text-sm font-black text-app-fg opacity-60 uppercase tracking-widest">
                {uiLanguage === 'ru' ? 'Пока нет сохраненных карточек' : 'No Saved Cards Yet'}
              </p>
              <p className="text-xs text-app-fg opacity-40 font-medium leading-relaxed max-w-xs mx-auto">
                {uiLanguage === 'ru'
                  ? 'В этой рабочей области хранятся ваши фразы и закладки. Найдите и сохраните полезные фразы на вкладке Разбор, чтобы наполнить вашу учебную колоду!'
                  : 'This study space holds your custom bookmarks and saved phrases. Find and collect useful phrases from the Breakdown tab first to build your learning deck!'
                }
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center select-none font-sans">
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("analysis")}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 font-bold tracking-tight text-xs text-white rounded-xl shadow-md transition-all active:scale-[0.98] duration-150 cursor-pointer font-sans"
                >
                  {uiLanguage === 'ru' ? 'К разбору' : 'Go to Breakdown'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setIsAddModalOpen(true);
                }}
                className="px-6 py-2.5 bg-app-card border border-app-card-border text-app-fg text-xs font-bold rounded-xl hover:bg-app-bg transition-all cursor-pointer font-sans"
              >
                {uiLanguage === 'ru' ? 'Добавить вручную' : 'Add Manual Phrase'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Phrase Modal Form */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-12 overflow-y-auto font-sans">
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
              className="relative w-full max-w-lg bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl z-10 font-sans"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500 font-sans">
                      {uiLanguage === 'ru' ? 'РАБОЧАЯ ОБЛАСТЬ' : 'STUDY WORKSPACE'}
                    </span>
                    <h3 className="text-xl font-black text-app-fg leading-tight">
                      {uiLanguage === 'ru' ? 'Добавить свою фразу' : 'Add Custom Phrase'}
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
                    <label htmlFor="add-word-text" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Фраза / Слово' : 'Phrase / Word'}
                    </label>
                    <input
                      id="add-word-text"
                      type="text"
                      placeholder={uiLanguage === 'ru' ? "например, walk hand in hand" : "e.g. walk hand in hand"}
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-sans"
                    />
                  </div>

                  {/* Translation input */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-translation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Перевод / Значение' : 'Translation / Meaning'}
                    </label>
                    <input
                      id="add-word-translation"
                      type="text"
                      placeholder={uiLanguage === 'ru' ? "например, идти рука об руку" : "e.g. идти рука об руку"}
                      value={formTranslation}
                      onChange={(e) => setFormTranslation(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-sans"
                    />
                  </div>

                  {/* Explanation input */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-explanation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Пояснение (опционально)' : 'Explanation (Optional)'}
                    </label>
                    <textarea
                      id="add-word-explanation"
                      placeholder={uiLanguage === 'ru' ? "например, устойчивое выражение об интимности и совместном пути..." : "e.g. An elegant collocation about intimacy and companionship..."}
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                    />
                  </div>

                  {/* User Note */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-note" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Личные заметки (опционально)' : 'Personal Notes (Optional)'}
                    </label>
                    <textarea
                      id="add-word-note"
                      placeholder={uiLanguage === 'ru' ? "например, встретилось в летней школе. напоминает о прогулке у озера..." : "e.g. Heard this line during summer school. Reminds me of our walk in the park."}
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                    />
                  </div>

                  {/* Link with Lyric line selection */}
                  <div className="space-y-1.5">
                    <label htmlFor="add-word-line" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Связать со строкой из песни (опционально)' : 'Link Lyric Line (Optional)'}
                    </label>
                    <select
                      id="add-word-line"
                      value={formLineId}
                      onChange={(e) => setFormLineId(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 bg-none cursor-pointer font-sans"
                    >
                      <option className="bg-app-bg text-app-fg" value="">
                        {uiLanguage === 'ru' ? 'Связать автоматически (по совпадению текста)' : 'Auto-detect Line Link (based on text match)'}
                      </option>
                      {currentTrack.lines.map((line) => (
                        <option className="bg-app-bg text-app-fg font-sans" key={`${line.lineId || line.id || "line"}_${line.index}`} value={line.lineId || ""}>
                          {uiLanguage === 'ru' ? `Строка ${line.index + 1}: ${line.original}` : `Line ${line.index + 1}: ${line.original}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 font-sans">
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 bg-app-card border border-app-card-border hover:bg-app-card/80 text-app-fg rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors font-sans"
                  >
                    {uiLanguage === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveAdd}
                    disabled={!formText.trim()}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors font-sans"
                  >
                    {uiLanguage === 'ru' ? 'Сохранить' : 'Save Phrase'}
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
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-12 overflow-y-auto font-sans">
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
              className="relative w-full max-w-lg bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl z-10 font-sans"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between font-sans">
                  <div className="space-y-1 font-sans">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-orange-500 font-sans">
                      {uiLanguage === 'ru' ? 'РАБОЧАЯ ОБЛАСТЬ' : 'STUDY WORKSPACE'}
                    </span>
                    <h3 className="text-xl font-black text-app-fg leading-tight font-sans">
                      {uiLanguage === 'ru' ? 'Редактировать фразу' : 'Edit Phrase'}
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
                  <div className="space-y-1.5 font-sans">
                    <label htmlFor="edit-word-text" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Фраза / Слово' : 'Phrase / Word'}
                    </label>
                    <input
                      id="edit-word-text"
                      type="text"
                      placeholder="e.g. walk hand in hand"
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-sans"
                    />
                  </div>

                  {/* Translation input */}
                  <div className="space-y-1.5 font-sans">
                    <label htmlFor="edit-word-translation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Перевод / Значение' : 'Translation / Meaning'}
                    </label>
                    <input
                      id="edit-word-translation"
                      type="text"
                      placeholder="e.g. идти рука об руку"
                      value={formTranslation}
                      onChange={(e) => setFormTranslation(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 font-sans"
                    />
                  </div>

                  {/* Explanation input */}
                  <div className="space-y-1.5 font-sans">
                    <label htmlFor="edit-word-explanation" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Пояснение (опционально)' : 'Explanation (Optional)'}
                    </label>
                    <textarea
                      id="edit-word-explanation"
                      placeholder="e.g. Detailed explanation of usage..."
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                    />
                  </div>

                  {/* User Note */}
                  <div className="space-y-1.5 font-sans">
                    <label htmlFor="edit-word-note" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Личные заметки (опционально)' : 'Personal Notes (Optional)'}
                    </label>
                    <textarea
                      id="edit-word-note"
                      placeholder="Keep track of your study sessions, mnemonic helpers, or references..."
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      className="w-full h-20 px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 resize-none font-sans"
                    />
                  </div>

                  {/* Type select */}
                  <div className="space-y-1.5 font-sans">
                    <label htmlFor="edit-word-type" className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-50 block font-sans">
                      {uiLanguage === 'ru' ? 'Категория лексики' : 'Vocabulary Category'}
                    </label>
                    <select
                      id="edit-word-type"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-4 py-3 bg-app-card border border-app-card-border rounded-xl text-xs text-app-fg focus:outline-none focus:border-orange-500/50 bg-none cursor-pointer font-sans"
                    >
                      <option className="bg-app-bg text-app-fg font-sans" value="collocation">collocation</option>
                      <option className="bg-app-bg text-app-fg font-sans" value="idiom">idiom</option>
                      <option className="bg-app-bg text-app-fg font-sans" value="phrasal_verb">phrasal_verb</option>
                      <option className="bg-app-bg text-app-fg font-sans" value="cultural_ref">cultural_ref</option>
                      <option className="bg-app-bg text-app-fg font-sans" value="vocabulary">vocabulary</option>
                      <option className="bg-app-bg text-app-fg font-sans" value="phrase">phrase</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 font-sans">
                  <button
                    onClick={() => setEditingPhrase(null)}
                    className="flex-1 py-3 bg-app-card border border-app-card-border hover:bg-app-card/80 text-app-fg rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors font-sans"
                  >
                    {uiLanguage === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!formText.trim()}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors font-sans"
                  >
                    {uiLanguage === 'ru' ? 'Сохранить' : 'Save Changes'}
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
