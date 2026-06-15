import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Rating } from 'ts-fsrs';
import { studyCardsRepository, userPreferencesRepository, Flashcard, PhraseStatus } from '../application';
const getCards = () => studyCardsRepository.getCards();
const reviewCard = (cardId: string, rating: Rating) => studyCardsRepository.reviewCard(cardId, rating);
const deleteFlashcard = (cardId: string) => studyCardsRepository.deleteFlashcard(cardId);
import { Check, X, ArrowRight, Brain, Trash2, ChevronLeft, Clock, Music, User, LayoutGrid, PlayCircle, Library, Globe, ChevronDown, ChevronUp, Volume2, Edit3, Save, Search, CheckCircle2, Sparkles, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { getLocaleByName } from '../lib/languages';
import { useTranslation } from '../lib/i18n';
import { getCachedTrackData } from '../services/musicService';
import { resolvePhraseContext } from '../services/lyricsAnalysisService';
import { PhraseCard, LyricsLineContext, PhraseCardStatus } from './PhraseCard';

interface StudyViewProps {
  onBack: () => void;
  initialTrackId?: string;
  onReviewCompleted?: () => void;
  onCardUpdated?: (cardId?: string) => void;
}

type GroupMode = 'cards' | 'tracks';

export default function StudyView({ onBack, initialTrackId, onReviewCompleted, onCardUpdated }: StudyViewProps) {
  const { t, uiLanguage } = useTranslation();

  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'hub' | 'session' | 'complete'>('hub');
  const [groupMode, setGroupMode] = useState<GroupMode>('cards');
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>(initialTrackId || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState("");

  // Column cards expanded toggles
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  const toggleCardExpanded = (cardId: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  // Editing state for cards
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({
    text: '',
    translation: '',
    explanation: '',
    type: '',
    userNote: '',
  });

  const typeLabels: Record<string, string> = {
    idiom: uiLanguage === 'ru' ? 'Идиомы' : 'Idioms',
    collocation: uiLanguage === 'ru' ? 'Коллокации' : 'Collocations',
    phrasal_verb: uiLanguage === 'ru' ? 'Фразовые глаголы' : 'Phrasal Verbs',
    cultural_ref: uiLanguage === 'ru' ? 'Культурные отсылки' : 'Cultural References',
    vocabulary: uiLanguage === 'ru' ? 'Лексика' : 'Vocabulary',
    phrase: uiLanguage === 'ru' ? 'Фразы' : 'Phrases',
    slang: uiLanguage === 'ru' ? 'Сленг' : 'Slang',
    verb: uiLanguage === 'ru' ? 'Глаголы' : 'Verbs',
    grammar: uiLanguage === 'ru' ? 'Грамматика' : 'Grammar',
    cultural: uiLanguage === 'ru' ? 'Культурное' : 'Cultural',
    core: uiLanguage === 'ru' ? 'Базовая лексика' : 'Core Vocabulary',
    colloquial: uiLanguage === 'ru' ? 'Разговорное' : 'Colloquial',
    advanced: uiLanguage === 'ru' ? 'Продвинутый' : 'Advanced'
  };

  useEffect(() => {
    userPreferencesRepository.setPreference('study_selected_language', selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    loadCards();
  }, []);

  const now = useMemo(() => new Date(), [viewMode]);

  async function loadCards() {
    setIsLoading(true);
    const cards = await getCards();
    setAllCards(cards);
    
    const langs = new Set<string>();
    cards.forEach(card => {
      langs.add(card.sourceLanguage || 'en');
    });
    const available = Array.from(langs).sort();
    
    setSelectedLanguage(prev => {
      const persisted = userPreferencesRepository.getPreference('study_selected_language', 'all');
      if (persisted === 'all') return 'all';
      if (persisted && available.map(l => l.toLowerCase()).includes(persisted.toLowerCase())) return persisted;
      return 'all';
    });

    if (initialTrackId) {
      const trackCards = cards.filter(card => card.trackId === initialTrackId && card.status === 'learning');
      const trackDueCards = trackCards.filter(card => card.due <= new Date());
      if (trackDueCards.length > 0) {
        setSessionCards(trackDueCards);
        setCurrentIndex(0);
        setIsFlipped(false);
        setViewMode('session');
      } else {
        setSelectedTrack(initialTrackId);
        setViewMode('hub');
      }
    }
    
    setIsLoading(false);
  }

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    allCards.forEach(card => {
      const lang = card.sourceLanguage || 'en';
      langs.add(lang.toLowerCase());
    });
    return Array.from(langs).filter(Boolean).sort();
  }, [allCards]);
  
  const tracksList = useMemo(() => {
    const tracks = new Map<string, string>(); // trackId -> trackTitle
    allCards.forEach(card => {
      if (card.trackId) {
        tracks.set(card.trackId, card.trackTitle || card.trackId);
      }
    });
    return Array.from(tracks.entries()).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [allCards]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    allCards.forEach(card => {
      if (card.type) {
        types.add(card.type);
      }
    });
    return Array.from(types).sort();
  }, [allCards]);

  // Clean, separated selectors as requested
  const allMatchingCards = useMemo(() => {
    let list = allCards;
    
    // 1. Language filter
    if (selectedLanguage !== 'all') {
      list = list.filter(card => (card.sourceLanguage || 'en').toLowerCase() === selectedLanguage.toLowerCase());
    }
    
    // 2. Track filter
    if (selectedTrack !== 'all') {
      list = list.filter(card => card.trackId === selectedTrack);
    }
    
    // 3. Tag / Type filter
    if (selectedType !== 'all') {
      list = list.filter(card => (card.type || 'phrase') === selectedType);
    }
    
    // 4. Search Query filter (matches original text, translation, explanation, userNote, track title)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(card => 
        card.text.toLowerCase().includes(q) ||
        (card.translation && card.translation.toLowerCase().includes(q)) ||
        (card.explanation && card.explanation.toLowerCase().includes(q)) ||
        (card.userNote && card.userNote.toLowerCase().includes(q)) ||
        (card.trackTitle && card.trackTitle.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allCards, selectedLanguage, selectedTrack, selectedType, searchQuery]);

  const learningCards = useMemo(() => {
    return allMatchingCards.filter(card => card.status === 'learning');
  }, [allMatchingCards]);

  const dueCards = useMemo(() => {
    return allMatchingCards.filter(card => card.status === 'learning' && card.due <= now);
  }, [allMatchingCards, now]);

  const knownCards = useMemo(() => {
    return allMatchingCards.filter(card => card.status === 'known');
  }, [allMatchingCards]);

  // Derived language due counts computed from allCards for precise badge numbers
  const languageDueCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    allCards.forEach(card => {
      if (card.status === 'learning' && card.due <= now) {
        counts.all = (counts.all || 0) + 1;
        const lang = (card.sourceLanguage || 'en').toLowerCase();
        counts[lang] = (counts[lang] || 0) + 1;
      }
    });
    return counts;
  }, [allCards, now]);

  // Derived tracks list showing track details sorted newest-first
  const tracksListStats = useMemo(() => {
    const trackMap = new Map<string, {
      id: string;
      title: string;
      artist: string;
      total: number;
      due: number;
      learning: number;
      known: number;
      createdAt: Date;
    }>();

    allCards.forEach(card => {
      if (selectedLanguage !== 'all' && (card.sourceLanguage || 'en').toLowerCase() !== selectedLanguage.toLowerCase()) {
        return;
      }

      if (card.trackId) {
        const key = card.trackId;
        const existing = trackMap.get(key) || {
          id: card.trackId,
          title: card.trackTitle || card.trackId,
          artist: card.artist || '',
          total: 0,
          due: 0,
          learning: 0,
          known: 0,
          createdAt: card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt || 0)
        };

        existing.total += 1;
        if (card.status === 'learning') {
          existing.learning += 1;
          if (card.due <= now) {
            existing.due += 1;
          }
        } else if (card.status === 'known') {
          existing.known += 1;
        }

        const cardDate = card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt || 0);
        if (cardDate > existing.createdAt) {
          existing.createdAt = cardDate;
        }

        trackMap.set(key, existing);
      }
    });

    return Array.from(trackMap.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [allCards, selectedLanguage, now]);

  const startSession = (cards: Flashcard[]) => {
    if (cards.length === 0) return;
    setSessionCards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setViewMode('session');
  };

  const handleRating = async (rating: Rating) => {
    const card = sessionCards[currentIndex];
    await reviewCard(card.id, rating);
    if (onReviewCompleted) {
      onReviewCompleted();
    }
    setIsFlipped(false);
    setIsExplanationExpanded(false);
    if (currentIndex < sessionCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadCards();
      setViewMode('complete');
    }
  };

  const currentCard = sessionCards[currentIndex];

  useEffect(() => {
    if (viewMode === 'session' && currentCard) {
      speak(currentCard.text);
    }
  }, [currentIndex, viewMode]);

  const [currentlySpeakingCardId, setCurrentlySpeakingCardId] = useState<string | null>(null);

  const speak = (text: string, cardId?: string) => {
    window.speechSynthesis.cancel();
    if (cardId) {
      setCurrentlySpeakingCardId(cardId);
    }
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLocaleByName(currentCard?.sourceLanguage || 'English');
      utterance.rate = 0.9;
      utterance.onend = () => {
        setCurrentlySpeakingCardId(null);
      };
      utterance.onerror = () => {
        setCurrentlySpeakingCardId(null);
      };
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  // Helper to highlight matched query in textual content
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return <>{text}</>;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return <>{text}</>;
    const length = query.length;
    return (
      <>
        {text.substring(0, index)}
        <mark className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-0.5 rounded-sm font-semibold select-text">{text.substring(index, index + length)}</mark>
        {text.substring(index + length)}
      </>
    );
  };



  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Brain className="animate-pulse" size={48} style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
          <Brain className="text-white/20" size={40} />
        </div>
        <div className="text-center space-y-2 font-sans px-4">
          <h2 className="text-2xl font-bold">
            {uiLanguage === 'ru' ? 'Пока нет карточек' : 'No cards yet'}
          </h2>
          <p className="text-[#94a3b8]">
            {uiLanguage === 'ru' ? 'Добавьте выражения из текстов песен, чтобы начать учебу.' : 'Add phrases from the lyrics reader to start learning.'}
          </p>
        </div>
        <button 
          onClick={onBack}
          className="px-8 py-3 rounded-full font-bold text-white transition-all shadow-lg active:scale-95 text-xs tracking-widest uppercase"
          style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 15px -3px var(--accent)' }}
        >
          {uiLanguage === 'ru' ? 'Назад к песням' : 'Go Back to Music'}
        </button>
      </div>
    );
  }

  if (viewMode === 'complete') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full text-center font-sans">
        <motion.div 
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8"
        >
          <Check className="text-emerald-500" size={40} />
        </motion.div>
        
        <h2 className="text-3xl font-bold mb-4">
          {uiLanguage === 'ru' ? 'Сессия пройдена!' : 'Session Complete!'}
        </h2>
        <p className="text-[#94a3b8] mb-12 max-w-sm text-sm">
          {uiLanguage === 'ru' 
            ? `Отлично! Вы повторили ${sessionCards.length} выражений. Продолжайте в том же духе, чтобы закрепить изученное!`
            : `Great job! You've reviewed ${sessionCards.length} phrases.`}
        </p>

        <div className="space-y-4 w-full">
          {initialTrackId ? (
            <>
              <button 
                onClick={onBack}
                className="w-full py-4 rounded-[2rem] bg-indigo-500 hover:bg-indigo-600 font-bold tracking-widest uppercase text-xs active:scale-95 transition-all shadow-xl text-white cursor-pointer"
              >
                {uiLanguage === 'ru' ? 'Вернуться к песне' : 'Return to Song'}
              </button>
              <button 
                onClick={() => setViewMode('hub')}
                className="w-full py-4 rounded-[2rem] bg-app-card border border-app-card-border text-app-fg opacity-60 font-bold tracking-widest uppercase text-xs hover:opacity-100 transition-all cursor-pointer"
              >
                {uiLanguage === 'ru' ? 'Перейти в Центр Обучения' : 'Go to Study Hub'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setViewMode('hub')}
                className="w-full py-4 rounded-[2rem] bg-app-fg text-app-bg font-bold tracking-widest uppercase text-xs active:scale-95 transition-all shadow-xl cursor-pointer"
              >
                {uiLanguage === 'ru' ? 'Назад в Центр Обучения' : 'Back to Study Hub'}
              </button>
              <button 
                onClick={onBack}
                className="w-full py-4 rounded-[2rem] bg-app-card border border-app-card-border text-app-fg opacity-60 font-bold tracking-widest uppercase text-xs hover:opacity-100 transition-all cursor-pointer"
              >
                {uiLanguage === 'ru' ? 'Назад к песням' : 'Go Back to Music'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === 'hub') {
    const sortedMatchingCards = [...allMatchingCards].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return (
      <div className="flex-1 flex flex-col h-full min-h-0 p-3 sm:p-6 max-w-5xl mx-auto w-full overflow-y-auto scrollbar-hide font-sans">
        <header className="mb-6 space-y-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {uiLanguage === 'ru' ? 'Центр Обучения' : 'Study Hub'}
            </h1>
            {dueCards.length > 0 ? (
              <button 
                onClick={() => startSession(dueCards)}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-app-fg text-app-bg hover:scale-105 active:scale-95 transition-all shadow-xl text-xs font-bold uppercase tracking-widest cursor-pointer select-none"
              >
                <PlayCircle size={18} />
                {uiLanguage === 'ru' ? `Повторить (${dueCards.length})` : `Review Due (${dueCards.length})`}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 w-fit select-none">
                <Check size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {uiLanguage === 'ru' ? 'Всё разобрано!' : 'All caught up!'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-app-fg" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={uiLanguage === 'ru' ? 'Поиск фразы, перевода, контекста или песни...' : 'Search phrase, translation, note or song...'}
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-app-card border border-app-card-border focus:border-orange-500 focus:outline-none text-xs font-sans placeholder-app-fg/30 transition-all text-app-fg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 text-app-fg cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Active Track Selection Indicator and Reset */}
            {selectedTrack !== 'all' && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10 text-xs text-app-fg select-none">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-[10px] font-black bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-sans">
                    {uiLanguage === 'ru' ? 'Фильтр по песне' : 'Track Filter'}
                  </span>
                  <span className="font-bold truncate opacity-80">
                    {allCards.find(c => c.trackId === selectedTrack)?.trackTitle || selectedTrack}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTrack('all')}
                  className="text-orange-500 hover:text-orange-600 font-bold uppercase tracking-widest text-[10px] shrink-0 ml-3 flex items-center gap-1 hover:scale-105 active:scale-95 transition-all"
                >
                  <X size={12} />
                  {uiLanguage === 'ru' ? 'Сбросить' : 'Clear'}
                </button>
              </div>
            )}

            {/* Language Selection Chips with Due Counts */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-app-muted pl-0.5 select-none font-sans">
                {uiLanguage === 'ru' ? 'Язык обучения' : 'Language'}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-hide w-full">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('all')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-2",
                    selectedLanguage === 'all'
                      ? "bg-app-fg text-app-bg border-app-fg shadow-lg"
                      : "bg-app-card text-app-fg/60 border-app-card-border hover:border-orange-500/40 hover:text-app-fg"
                  )}
                >
                  <span>{uiLanguage === 'ru' ? 'Все' : 'All'}</span>
                  {languageDueCounts.all > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[8px] font-bold font-mono",
                      selectedLanguage === 'all'
                        ? "bg-app-bg text-app-fg"
                        : "bg-orange-500 text-white"
                    )}>
                      {languageDueCounts.all}
                    </span>
                  )}
                </button>

                {availableLanguages.map(l => {
                  const isActive = selectedLanguage.toLowerCase() === l.toLowerCase();
                  const count = languageDueCounts[l.toLowerCase()] || 0;
                  return (
                    <button
                      key={`lang-chip-${l}`}
                      type="button"
                      onClick={() => setSelectedLanguage(l)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-2",
                        isActive
                          ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-md shadow-[var(--accent)]/15"
                          : "bg-app-card text-app-fg/60 border-app-card-border hover:border-orange-500/40 hover:text-app-fg"
                      )}
                    >
                      <span>{l.toUpperCase()}</span>
                      {count > 0 && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-md text-[8px] font-bold font-mono",
                          isActive
                            ? "bg-white text-orange-600"
                            : "bg-orange-500 text-white"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags scrolling carousel selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-app-muted pl-0.5 select-none font-sans">
                {uiLanguage === 'ru' ? 'Фильтр по типу и тегам' : 'Filter by Tag'}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-hide w-full">
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap cursor-pointer active:scale-95",
                    selectedType === 'all'
                      ? "bg-app-fg text-app-bg border-app-fg shadow-lg"
                      : "bg-app-card text-app-fg/60 border-app-card-border hover:border-orange-500/40 hover:text-app-fg"
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
                        : "bg-app-card text-app-fg/60 border-orange-500/40 text-app-fg"
                    )}
                  >
                    {typeLabels[t] || t}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex p-1 bg-app-card border border-app-card-border rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide font-sans">
              {[
                { id: 'cards', label: uiLanguage === 'ru' ? 'Карточки' : 'Cards', icon: <Clock size={15} /> },
                { id: 'tracks', label: uiLanguage === 'ru' ? 'Плейлисты' : 'Tracks', icon: <Music size={15} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGroupMode(tab.id as GroupMode)}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                    groupMode === tab.id 
                      ? "bg-app-bg text-app-fg shadow-lg font-black" 
                      : "text-app-fg opacity-40 hover:opacity-100"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Dynamic content rendering */}
        {groupMode === 'cards' ? (
          <div className="space-y-4 pb-20 font-sans">
            {sortedMatchingCards.length > 0 ? (
              sortedMatchingCards.map((child, childIdx) => {
                const isEditing = editingCardId === child.id;
                const track = child.trackId ? getCachedTrackData(child.trackId) : null;
                const contextLines = track && track.lines 
                  ? resolvePhraseContext(track.lines, child.lineId ? [child.lineId] : [], child.text)
                  : [];

                const isExpanded = expandedCardIds.has(child.id);

                const editFormContent = (
                  <div className="space-y-3 w-full font-sans text-xs text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          {uiLanguage === 'ru' ? 'Оригинальный текст' : 'Original Text'}
                        </label>
                        <input
                          type="text"
                          value={editFields.text}
                          onChange={(e) => setEditFields({ ...editFields, text: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-orange-500 focus:outline-none bg-app-card text-app-fg"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          {uiLanguage === 'ru' ? 'Перевод' : 'Translation'}
                        </label>
                        <input
                          type="text"
                          value={editFields.translation}
                          onChange={(e) => setEditFields({ ...editFields, translation: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-orange-500 focus:outline-none bg-app-card text-app-fg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          {uiLanguage === 'ru' ? 'Тип' : 'Type'}
                        </label>
                        <select
                          value={editFields.type}
                          onChange={(e) => setEditFields({ ...editFields, type: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-orange-500 focus:outline-none bg-app-card text-app-fg font-sans text-sm"
                        >
                          {Object.entries(typeLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                          {uiLanguage === 'ru' ? 'Примечания' : 'User Note'}
                        </label>
                        <input
                          type="text"
                          value={editFields.userNote}
                          onChange={(e) => setEditFields({ ...editFields, userNote: e.target.value })}
                          placeholder={uiLanguage === 'ru' ? "Ассоциации для запоминания..." : "Add private mnemonics helper..."}
                          className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-orange-500 focus:outline-none font-sans bg-app-card text-app-fg"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        {uiLanguage === 'ru' ? 'Объяснение контекста' : 'Explanation'}
                      </label>
                      <textarea
                        value={editFields.explanation}
                        rows={2}
                        onChange={(e) => setEditFields({ ...editFields, explanation: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-orange-500 focus:outline-none resize-none bg-app-card text-app-fg"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-app-card-border/30 font-sans">
                      <button
                        type="button"
                        onClick={() => setEditingCardId(null)}
                        className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border border-app-card-border hover:bg-app-fg/5 transition-all cursor-pointer text-app-fg bg-transparent"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await studyCardsRepository.updateCardFields(child.id, {
                            text: editFields.text,
                            translation: editFields.translation,
                            explanation: editFields.explanation,
                            type: editFields.type,
                            entryType: editFields.type,
                            userNote: editFields.userNote,
                          });
                          setEditingCardId(null);
                          loadCards();
                          onCardUpdated?.(child.id);
                        }}
                        className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-orange-500 hover:bg-orange-600 text-white hover:scale-105 active:scale-95 transition-all cursor-pointer border border-transparent"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                );

                const studyActionButton = (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        startSession([child]);
                      }}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-orange-500 text-white hover:bg-orange-600 font-sans text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer select-none"
                    >
                      <PlayCircle size={13} />
                      <span>{uiLanguage === 'ru' ? 'Учить' : 'Study'}</span>
                    </button>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const nextStatus = child.status === "known" ? "learning" : "known";
                        await studyCardsRepository.updatePhraseStatus(child.id, nextStatus);
                        loadCards();
                        onCardUpdated?.(child.id);
                      }}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer ${
                        child.status === "known"
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 cursor-default"
                          : "bg-app-bg border border-app-card-border hover:border-app-fg/20 active:scale-95 text-app-fg hover:bg-app-card shadow-xs"
                      }`}
                    >
                      <CheckCircle2 size={12} className={child.status === 'known' ? "text-emerald-500 shrink-0 select-none" : "text-app-fg opacity-40 shrink-0 select-none animate-none"} />
                      <span className="font-sans">
                        {child.status === "known" 
                          ? (uiLanguage === 'ru' ? 'Изучено' : 'Known') 
                          : (uiLanguage === 'ru' ? 'Знаю' : 'Mark Known')}
                      </span>
                    </button>
                  </>
                );

                const typeLabel = typeLabels[child.type || 'phrase'] || child.type;

                return (
                  <PhraseCard
                    key={child.id}
                    itemId={child.id}
                    index={childIdx}
                    phraseText={child.text}
                    highlightedPhraseText={highlightMatch(child.text, searchQuery)}
                    translation={child.translation}
                    highlightedTranslation={child.translation ? highlightMatch(child.translation, searchQuery) : undefined}
                    explanation={child.explanation}
                    highlightedExplanation={child.explanation ? highlightMatch(child.explanation, searchQuery) : undefined}
                    userNote={child.userNote}
                    highlightedUserNote={child.userNote ? highlightMatch(child.userNote, searchQuery) : undefined}
                    type={child.type}
                    typeLabel={typeLabel}
                    source={child.entryType === "user" || (child as any).source === "user" ? "user" : "ai"}
                    status={child.status as PhraseCardStatus}
                    onStatusChange={async (nextStatus) => {
                      await studyCardsRepository.updatePhraseStatus(child.id, nextStatus as any);
                      loadCards();
                      onCardUpdated?.(child.id);
                    }}
                    contextLines={contextLines.length > 0 ? contextLines : undefined}
                    isSpeaking={currentlySpeakingCardId === child.id}
                    onSpeak={() => speak(child.text, child.id)}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleCardExpanded(child.id)}
                    isEditing={isEditing}
                    editFormContent={editFormContent}
                    onEdit={() => {
                      setEditingCardId(child.id);
                      setEditFields({
                        text: child.text || '',
                        translation: child.translation || '',
                        explanation: child.explanation || '',
                        type: child.type || 'phrase',
                        userNote: child.userNote || '',
                      });
                      if (!isExpanded) {
                        toggleCardExpanded(child.id);
                      }
                    }}
                    onDelete={async () => {
                      const confirmMsg = uiLanguage === 'ru' 
                        ? 'Удалить эту карточку?' 
                        : 'Delete this card?';
                      if (confirm(confirmMsg)) {
                        await deleteFlashcard(child.id);
                        loadCards();
                        onCardUpdated?.(child.id);
                      }
                    }}
                    actionButtons={studyActionButton}
                    uiLanguage={uiLanguage}
                  />
                );
              })
            ) : (
              <div className="py-20 text-center text-app-fg opacity-40 font-sans">
                 <Clock size={40} className="mx-auto mb-4 text-orange-500 opacity-50 font-sans" />
                 <p className="font-bold">{uiLanguage === 'ru' ? 'Карточки не найдены' : 'No cards found'}</p>
                 <p className="text-sm font-sans">{uiLanguage === 'ru' ? 'Выберите другие фильтры или измените поисковый запрос.' : 'Try selecting different filter tags or adjust your search.'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 pb-20 font-sans">
            {tracksListStats.length > 0 ? (
              tracksListStats.map((track) => {
                const hasDue = track.due > 0;
                return (
                  <div 
                    key={track.id}
                    onClick={() => {
                      setSelectedTrack(track.id);
                      setGroupMode('cards');
                    }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-[1.5rem] bg-app-card border border-app-card-border hover:border-orange-500/30 hover:bg-app-card/65 transition-all cursor-pointer font-sans gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-app-bg border border-app-card-border flex items-center justify-center text-orange-500 shrink-0 select-none shadow-sm">
                        <Music size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-app-fg leading-tight truncate">{track.title}</h3>
                        {track.artist && (
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 truncate mt-0.5">{track.artist}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 shrink-0 font-sans self-end sm:self-auto">
                      <div className="flex items-center gap-2 text-xs font-mono bg-app-bg border border-app-card-border/60 px-3 py-1.5 rounded-xl text-app-fg select-none">
                        <span className="opacity-40">{uiLanguage === 'ru' ? 'Всего:' : 'Total:'} {track.total}</span>
                        <span className="opacity-20">|</span>
                        <span className="text-orange-400 font-bold">{uiLanguage === 'ru' ? 'Изучаю:' : 'Learning:'} {track.learning}</span>
                        <span className="opacity-20">|</span>
                        <span className="text-emerald-500 font-bold">{uiLanguage === 'ru' ? 'Знаю:' : 'Known:'} {track.known}</span>
                      </div>

                      {hasDue ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const dueTrackCards = allCards.filter(c => c.trackId === track.id && c.status === 'learning' && c.due <= now);
                            startSession(dueTrackCards);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer select-none"
                        >
                          <PlayCircle size={14} />
                          <span>{uiLanguage === 'ru' ? `Повторить (${track.due})` : `Review (${track.due})`}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 select-none text-[10px] font-black uppercase tracking-widest">
                          <Check size={12} />
                          <span>{uiLanguage === 'ru' ? 'Освоен' : 'Done'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40 font-sans border border-dashed border-app-card-border/60 rounded-3xl">
                <Music size={40} className="mb-4 text-orange-500" />
                <p className="font-bold">{uiLanguage === 'ru' ? 'Песни не найдены' : 'No tracks found'}</p>
                <p className="text-sm">{uiLanguage === 'ru' ? 'Попробуйте сменить языковой фильтр.' : 'Try changing your language selection.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

    return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-app-bg scrollbar-hide font-sans">
      <div className="max-w-2xl mx-auto w-full py-4 sm:py-8 px-4 sm:px-6 flex flex-col min-h-full">
        <header className="flex items-center justify-between mb-4 sm:mb-8 shrink-0 font-sans">
          <button 
            onClick={() => setViewMode('hub')} 
            className="flex items-center gap-2 text-app-fg opacity-40 hover:opacity-100 transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            <ChevronLeft size={16} />
            {uiLanguage === 'ru' ? 'Назад' : 'Back'}
          </button>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-app-card border border-app-card-border" style={{ color: 'var(--accent)' }}>
            {currentIndex + 1} / {sessionCards.length}
          </div>
        </header>

        <main className="flex-1 flex flex-col font-sans">
          {(() => {
            const sessionTrack = currentCard.trackId ? getCachedTrackData(currentCard.trackId) : null;
            const sessionContextLines = sessionTrack && sessionTrack.lines
              ? resolvePhraseContext(sessionTrack.lines, currentCard.lineId ? [currentCard.lineId] : [], currentCard.text)
              : [];
            const sessionTrackTitle = currentCard.trackTitle || (sessionTrack ? sessionTrack.title : '');
            const sessionArtistName = currentCard.artist || (sessionTrack ? sessionTrack.artist : '');
            const sessionTypeLabel = typeLabels[currentCard.type || 'phrase'] || currentCard.type;

            const sessionActionArea = !isFlipped ? (
              <button 
                onClick={() => setIsFlipped(true)}
                className="w-full py-3.5 sm:py-5 text-white rounded-2xl sm:rounded-[2rem] font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 cursor-pointer font-sans"
                style={{ 
                  backgroundColor: 'var(--accent)', 
                  boxShadow: '0 12px 20px -5px color-mix(in srgb, var(--accent) 40%, transparent)' 
                }}
              >
                {uiLanguage === 'ru' ? 'Показать перевод' : 'Show Translation'}
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full font-sans font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs">
                <button
                  onClick={() => handleRating(Rating.Again)}
                  className="py-3 sm:py-4 rounded-2xl sm:rounded-[2rem] border border-red-500/25 text-red-500 font-bold uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer text-center"
                >
                  {uiLanguage === 'ru' ? 'Заново' : 'Again'}
                </button>
                <button
                  onClick={() => handleRating(Rating.Good)}
                  className="py-3 sm:py-4 rounded-2xl sm:rounded-[2rem] border border-emerald-500/25 text-emerald-500 font-bold uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer text-center"
                >
                  {uiLanguage === 'ru' ? 'Помню' : 'Got it'}
                </button>
              </div>
            );

            return (
              <AnimatePresence mode="wait">
                <motion.div 
                   key={currentCard.id + (isFlipped ? '-back' : '-front')}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="relative font-sans"
                >
                  {sessionTrackTitle && (
                    <div className="text-center text-[9px] sm:text-[10px] font-black text-app-fg opacity-35 uppercase tracking-[0.25em] mb-2 sm:mb-4 truncate max-w-[90%] mx-auto block">
                      {sessionTrackTitle} {sessionArtistName ? `— ${sessionArtistName}` : ''}
                    </div>
                  )}

                  {/* LARGE REPETITION FLIP CARD */}
                  <div 
                    onClick={() => !isFlipped && setIsFlipped(true)}
                    className={`rounded-[1.75rem] sm:rounded-[2.5rem] bg-app-card border border-app-card-border p-4 sm:p-8 md:p-10 shadow-app-card hover:border-app-card-border/80 transition-all duration-300 relative min-h-[220px] sm:min-h-[360px] flex flex-col justify-between ${!isFlipped ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'}`}
                  >
                    {!isFlipped ? (
                      /* FRONT SIDE */
                      <div className="flex-1 flex flex-col justify-between">
                        {/* Centered big phrase text with play button inline next to it */}
                        <div className="flex-1 flex items-center justify-center gap-3 sm:gap-4 py-8 sm:py-12">
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-app-fg font-extrabold leading-snug tracking-tight text-center max-w-[85%] select-text">
                            {currentCard.text}
                          </h2>
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              speak(currentCard.text, currentCard.id); 
                            }} 
                            className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                              currentlySpeakingCardId === currentCard.id 
                                ? 'bg-orange-500 border-orange-500 text-white animate-pulse' 
                                : 'bg-app-bg text-app-muted hover:text-app-fg border-app-card-border hover:border-app-card-border/80'
                            }`}
                            title={uiLanguage === 'ru' ? "Прослушать" : "Pronounce"}
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>

                        {/* Prompt hint */}
                        <div className="text-center text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-widest text-app-fg opacity-30 select-none">
                          {uiLanguage === 'ru' ? 'Нажмите, чтобы открыть перевод' : 'Tap to reveal translation'}
                        </div>
                      </div>
                    ) : (
                      /* BACK SIDE */
                      <div className="flex-1 flex flex-col justify-between space-y-4 sm:space-y-6">
                        {/* Phrases area with play button inline next to the text */}
                        <div className="text-center flex flex-col items-center justify-center space-y-2 sm:space-y-3">
                          <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
                            <h2 className="text-lg sm:text-2xl font-serif text-app-accent font-extrabold leading-snug tracking-tight">
                              {currentCard.text}
                            </h2>
                            <button 
                              type="button"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                speak(currentCard.text, currentCard.id); 
                              }} 
                              className={`p-1.5 sm:p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                                currentlySpeakingCardId === currentCard.id 
                                  ? 'bg-orange-500 border-orange-500 text-white animate-pulse' 
                                  : 'bg-app-bg text-app-muted hover:text-app-fg border-app-card-border hover:border-app-card-border/80'
                              }`}
                              title={uiLanguage === 'ru' ? "Прослушать" : "Pronounce"}
                            >
                              <Volume2 size={14} />
                            </button>
                          </div>
                          <p className="text-base sm:text-xl font-serif text-app-fg opacity-90 leading-relaxed font-semibold">
                            {currentCard.translation}
                          </p>
                        </div>

                        {/* Details contents (Explanation, Personal note, Context lines) */}
                        <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-app-card-border/40 select-text text-left">
                          {/* Explanation markdown */}
                          {currentCard.explanation && (
                            <div className="pl-3 sm:pl-4 border-l-2 border-app-card-border">
                              <div className="markdown-body text-xs sm:text-base text-app-fg opacity-75 leading-relaxed font-sans font-medium">
                                <ReactMarkdown>
                                  {currentCard.explanation}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Personal notes */}
                          {currentCard.userNote && currentCard.userNote.trim() !== "" && (
                            <div className="p-3 sm:p-4 rounded-xl bg-orange-500/[0.03] border border-orange-500/10 text-[11px] sm:text-xs space-y-1">
                              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-orange-500 opacity-80 block font-sans">
                                {uiLanguage === 'ru' ? 'Личные заметки' : 'Personal Note'}
                              </span>
                              <p className="text-app-fg opacity-75 leading-relaxed font-sans font-medium">
                                {currentCard.userNote}
                              </p>
                            </div>
                          )}

                          {/* Lyric Context lines simplified to italics and gray accent */}
                          {sessionContextLines && sessionContextLines.length > 0 && (
                            <div className="pt-2 border-t border-app-card-border/20 space-y-2 text-left">
                              {sessionContextLines.map((line, lIdx) => (
                                <div key={line.lineId || lIdx} className="text-app-muted italic font-serif leading-relaxed text-xs sm:text-sm pl-1.5 border-l border-app-card-border/25">
                                  <p className="font-serif italic text-app-muted select-text">
                                    "{line.original}"
                                  </p>
                                  {line.translation && line.translation.trim() !== "" && (
                                    <p className="font-sans text-[10px] sm:text-xs text-app-muted/75 pl-2 mt-0.5 sm:mt-1 not-italic select-text">
                                      — {line.translation}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Large Repetition Action buttons inside the card */}
                        <div className="pt-3 sm:pt-4 border-t border-app-card-border/30">
                          {sessionActionArea}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            );
          })()}

          <footer className="mt-auto py-4 sm:py-12 flex justify-center shrink-0 font-sans">
            <button 
              onClick={async () => {
                const confMsg = uiLanguage === 'ru' ? 'Удалить эту карточку?' : 'Delete this card?';
                if (confirm(confMsg)) {
                  await deleteFlashcard(currentCard.id);
                  loadCards();
                  if (sessionCards.length <= 1) setViewMode('hub');
                  else {
                    setSessionCards(prev => prev.filter(c => c.id !== currentCard.id));
                    if (currentIndex >= sessionCards.length - 1) setCurrentIndex(0);
                  }
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-app-fg opacity-20 hover:opacity-100 transition-all font-bold uppercase tracking-widest text-[10px]"
            >
              <Trash2 size={16} />
              {uiLanguage === 'ru' ? 'Улалить фразу' : 'Delete Phrase'}
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
