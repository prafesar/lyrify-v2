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

type GroupMode = 'recent' | 'track' | 'artist';

export default function StudyView({ onBack, initialTrackId, onReviewCompleted, onCardUpdated }: StudyViewProps) {
  const { t, uiLanguage } = useTranslation();

  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'hub' | 'session' | 'complete'>('hub');
  const [groupMode, setGroupMode] = useState<GroupMode>(initialTrackId ? 'track' : 'recent');
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (initialTrackId) return 'all';
    return userPreferencesRepository.getPreference('study_selected_language', 'all');
  });
  const [selectedTrack, setSelectedTrack] = useState<string>(initialTrackId || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
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

  const toggleParent = (phrase: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(phrase)) next.delete(phrase);
      else next.add(phrase);
      return next;
    });
  };

  useEffect(() => {
    userPreferencesRepository.setPreference('study_selected_language', selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    setIsLoading(true);
    const cards = await getCards();
    setAllCards(cards);
    
    // If current selected language is 'all' or not in available languages, 
    // pick the first one from the new cards if available
    const langs = new Set<string>();
    cards.forEach(card => {
      langs.add(card.sourceLanguage || 'en');
    });
    const available = Array.from(langs).sort();
    
    setSelectedLanguage(prev => {
      if (initialTrackId) return 'all';
      const persisted = userPreferencesRepository.getPreference('study_selected_language', '');
      if (persisted && available.includes(persisted)) return persisted;
      if (available.length > 0) return available[0];
      return 'en';
    });

    if (initialTrackId) {
      const trackCards = cards.filter(card => card.trackId === initialTrackId && card.status === 'learning');
      if (trackCards.length > 0) {
        const trackDueCards = trackCards.filter(card => card.due <= new Date());
        const cardsToStudy = trackDueCards.length > 0 ? trackDueCards : trackCards;
        setSessionCards(cardsToStudy);
        setCurrentIndex(0);
        setIsFlipped(false);
        setViewMode('session');
      }
    }
    
    setIsLoading(false);
  }

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    allCards.forEach(card => {
      const lang = card.sourceLanguage || 'en';
      langs.add(lang);
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
      if (card.status === 'learning') {
        types.add(card.type || 'phrase');
      }
    });
    return Array.from(types).sort();
  }, [allCards]);

  const now = useMemo(() => new Date(), [viewMode]);

  const filteredCards = useMemo(() => {
    let list = allCards;
    if (selectedLanguage !== 'all') {
      list = list.filter(card => (card.sourceLanguage || 'en') === selectedLanguage);
    }
    if (selectedTrack !== 'all') {
      list = list.filter(card => card.trackId === selectedTrack);
    }
    if (selectedType !== 'all') {
      list = list.filter(card => (card.type || 'phrase') === selectedType);
    }
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
    list = list.filter(card => card.status === 'learning');
    return list;
  }, [allCards, selectedLanguage, selectedTrack, selectedType, searchQuery]);

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

  const groupedCards = useMemo(() => {
    // Group phrases by track for display
    const groups = new Map<string, Flashcard[]>();
    
    filteredCards.forEach(card => {
      const key = card.trackId || 'unknown-track';
      const list = groups.get(key) || [];
      list.push(card);
      groups.set(key, list);
    });

    return Array.from(groups.entries()).map(([key, phrases]) => {
      const sample = phrases[0];
      return {
        id: key,
        trackTitle: sample.trackTitle || sample.trackId || 'Unknown Track',
        artist: sample.artist || 'Unknown Artist',
        phrases: phrases,
        createdAt: sample.createdAt
      };
    }).sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredCards]);

  const dueCards = useMemo(() => {
    return filteredCards.filter(card => card.due <= now);
  }, [filteredCards, now]);

  // Decks computation
  const decks = useMemo(() => {
    const getDueCount = (cards: Flashcard[]) => cards.filter(c => c.due <= now).length;
    if (groupMode === 'recent') {
      const sorted = [...filteredCards].sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt || 0);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      return [{
        id: 'recent-all',
        title: uiLanguage === 'ru' ? 'Недавние выражения' : 'Recent Phrases',
        subtitle: uiLanguage === 'ru' ? 'Последние добавления' : 'Latest additions',
        count: filteredCards.length,
        dueCount: getDueCount(filteredCards),
        cards: sorted,
        icon: <Clock size={20} />
      }];
    }

    if (groupMode === 'track') {
      const groups = filteredCards.reduce((acc, card) => {
        const key = card.trackTitle;
        if (!acc[key]) acc[key] = [];
        acc[key].push(card);
        return acc;
      }, {} as Record<string, Flashcard[]>);

      return Object.entries(groups).map(([title, cards]) => ({
        id: `track-${title}`,
        title,
        subtitle: cards[0].artist,
        count: cards.length,
        dueCount: getDueCount(cards),
        cards,
        icon: <Music size={20} />
      })).sort((a, b) => b.count - a.count);
    }

    if (groupMode === 'artist') {
      const groups = filteredCards.reduce((acc, card) => {
        const key = card.artist;
        if (!acc[key]) acc[key] = [];
        acc[key].push(card);
        return acc;
      }, {} as Record<string, Flashcard[]>);

      return Object.entries(groups).map(([artist, cards]) => ({
        id: `artist-${artist}`,
        title: artist,
        subtitle: uiLanguage === 'ru' ? `${cards.length} выражений` : `${cards.length} phrases`,
        count: cards.length,
        dueCount: getDueCount(cards),
        cards,
        icon: <User size={20} />
      })).sort((a, b) => b.count - a.count);
    }

    return [];
  }, [filteredCards, groupMode, now, uiLanguage]);

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
      // Session finished
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
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-app-fg text-app-bg font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
              >
                <PlayCircle size={18} />
                {uiLanguage === 'ru' ? `Повторить (${dueCards.length})` : `Review Due (${dueCards.length})`}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 w-fit">
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
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-app-card border border-app-card-border focus:border-app-accent/40 focus:outline-none text-xs font-sans placeholder-app-fg/30 transition-all text-app-fg"
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

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-xl bg-app-card border border-app-card-border text-[10px] sm:text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
              >
                <option key="lang-opt-all" value="all">{uiLanguage === 'ru' ? 'Все языки' : 'All Languages'}</option>
                {availableLanguages.map(l => <option key={`lang-opt-${l}`} value={l}>{l.toUpperCase()}</option>)}
              </select>

              <select 
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="px-3 sm:px-4 py-2 rounded-xl bg-app-card border border-app-card-border text-[10px] sm:text-xs font-black uppercase tracking-widest outline-none max-w-[140px] sm:max-w-[240px] truncate cursor-pointer"
              >
                <option key="track-opt-all" value="all">{uiLanguage === 'ru' ? 'Все песни' : 'All Tracks'}</option>
                {tracksList.map(t => <option key={`track-opt-${t.id}`} value={t.id}>{t.title}</option>)}
              </select>
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
                      : "bg-app-card text-app-fg/60 border-app-card-border hover:border-app-accent/35 hover:text-app-fg"
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
                        : "bg-app-card text-app-fg/60 border-app-card-border hover:border-app-accent/35 hover:text-app-fg"
                    )}
                  >
                    {typeLabels[t] || t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex p-1 bg-app-card border border-app-card-border rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide font-sans">
              {[
                { id: 'recent', label: uiLanguage === 'ru' ? 'Выражения' : 'Phrases', icon: <Clock size={15} /> },
                { id: 'track', label: uiLanguage === 'ru' ? 'Колоды' : 'Decks', icon: <Music size={15} /> },
                { id: 'artist', label: uiLanguage === 'ru' ? 'Авторы' : 'Artists', icon: <User size={15} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGroupMode(tab.id as GroupMode)}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                    groupMode === tab.id 
                      ? "bg-app-bg text-app-fg shadow-lg" 
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

        <div className="space-y-4 pb-32 font-sans">
          {groupMode === 'recent' ? (
            <div className="grid gap-3">
              {groupedCards.map((group) => {
                const knownCount = group.phrases.filter(c => c.status === 'known').length;
                const totalCount = group.phrases.length;
                const isExpanded = expandedParents.has(group.id);
                
                return (
                  <div key={group.id} className="space-y-3 font-sans">
                    <div 
                      className="flex items-center justify-between p-2.5 sm:p-4 cursor-pointer hover:opacity-85 transition-all font-sans gap-2"
                      onClick={() => toggleParent(group.id)}
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-app-card border border-app-card-border flex items-center justify-center text-app-accent shrink-0 select-none shadow-xs">
                           <Library size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-sm sm:text-lg font-bold text-app-fg leading-tight truncate">{group.trackTitle}</h3>
                          <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40 truncate mt-0.5 sm:mt-1">{group.artist}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 sm:gap-4 shrink-0 font-sans">
                        <span className="text-[9px] sm:text-[10px] font-black bg-app-card border border-app-card-border px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg opacity-60 font-mono text-app-fg">
                          {knownCount}/{totalCount}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startSession(group.phrases);
                          }}
                          className="w-7 h-7 rounded-xl bg-app-fg text-app-bg hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                          title="Study group"
                        >
                          <PlayCircle size={15} />
                        </button>
                        <div className={cn("transition-transform duration-300 text-app-fg opacity-40", isExpanded ? "rotate-180" : "")}>
                           <ChevronDown size={16} />
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden font-sans"
                        >
                          <div className="py-2.5 px-0.5 space-y-4">
                            {group.phrases.map((child, childIdx) => {
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
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 font-sans">
              <AnimatePresence mode="popLayout">
                {decks.length > 0 ? decks.map((deck) => (
                  <motion.button
                    key={deck.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => {
                      const dueOnly = deck.cards.filter(c => c.due <= now);
                      if (dueOnly.length > 0) {
                        startSession(dueOnly);
                      } else {
                        const confirmMsg = uiLanguage === 'ru' 
                          ? 'У вас нет карточек к повторению в этой колоде. Повторить все заново?'
                          : 'No cards are currently due in this deck. Review all anyway?';
                        if (confirm(confirmMsg)) {
                          startSession(deck.cards);
                        }
                      }
                    }}
                    className="group relative flex flex-col p-6 sm:p-8 rounded-[1.75rem] sm:rounded-[2.5rem] bg-app-card border border-app-card-border shadow-app-card hover:border-app-accent/30 transition-all text-left overflow-hidden active:scale-95 font-sans"
                  >
                    <div 
                      className="absolute top-0 right-0 p-6 sm:p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity font-sans"
                      style={{ color: 'var(--accent)' }}
                    >
                      {deck.icon}
                    </div>
                    
                    <div className="flex-1 space-y-1 mb-6 sm:mb-10 font-sans">
                      <h3 className="text-xl font-bold leading-tight group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                        {deck.title}
                      </h3>
                      <p className="text-sm opacity-40 truncate">{deck.subtitle}</p>
                    </div>

                    <div className="flex items-center justify-between font-sans">
                      <div className="flex gap-4">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-20 block">{uiLanguage === 'ru' ? 'Всего' : 'All'}</span>
                          <span className="text-lg font-bold">{deck.count}</span>
                        </div>
                        {deck.dueCount > 0 && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block">{uiLanguage === 'ru' ? 'Новые' : 'Due'}</span>
                            <span className="text-lg font-bold text-emerald-500">{deck.dueCount}</span>
                          </div>
                        )}
                      </div>
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center bg-app-bg border border-app-card-border group-hover:bg-[var(--accent)] group-hover:text-white transition-all shadow-inner"
                      >
                        <ArrowRight size={18} />
                      </div>
                    </div>
                  </motion.button>
                  )) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40 font-sans">
                      <Music size={48} className="mb-4" />
                      <p className="font-bold">{uiLanguage === 'ru' ? 'Материалы отсутствуют' : 'No cards found for this selection'}</p>
                      <p className="text-sm">{uiLanguage === 'ru' ? 'Попробуйте изменить тип фильтра или группировку' : 'Try changing the filter or group mode'}</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
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
                        {/* Header metadata */}
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 rounded-xl text-[9px] font-sans font-black bg-app-bg border border-app-card-border/60 uppercase tracking-widest text-[#6366f1] inline-block">
                            {sessionTypeLabel}
                          </span>
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

                        {/* Centered big phrase text */}
                        <div className="flex-1 flex items-center justify-center py-4 sm:py-8">
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-app-fg font-extrabold leading-snug tracking-tight text-center max-w-[90%] select-text">
                            {currentCard.text}
                          </h2>
                        </div>

                        {/* Prompt hint */}
                        <div className="text-center text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-widest text-app-fg opacity-30 select-none">
                          {uiLanguage === 'ru' ? 'Нажмите, чтобы открыть перевод' : 'Tap to reveal translation'}
                        </div>
                      </div>
                    ) : (
                      /* BACK SIDE */
                      <div className="flex-1 flex flex-col justify-between space-y-4 sm:space-y-6">
                        {/* Header block with badges and speak button */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl text-[9px] font-sans font-black bg-app-bg border border-app-card-border/60 uppercase tracking-widest text-[#6366f1]">
                              {sessionTypeLabel}
                            </span>
                            {currentCard.entryType === "user" || (currentCard as any).source === "user" ? (
                              <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                <User size={8} />
                                {uiLanguage === 'ru' ? 'Вы' : 'User'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest flex-inline items-center gap-1 inline-flex">
                                <Sparkles size={8} />
                                AI
                              </span>
                            )}
                          </div>
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

                        {/* Phrases area */}
                        <div className="text-center space-y-2 sm:space-y-3">
                          <h2 className="text-lg sm:text-2xl font-serif text-app-accent font-extrabold leading-snug tracking-tight">
                            {currentCard.text}
                          </h2>
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

                          {/* Lyric Context lines */}
                          {sessionContextLines && sessionContextLines.length > 0 ? (
                            <div className="space-y-1.5 sm:space-y-2">
                              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-app-fg opacity-40 block">
                                {uiLanguage === 'ru' ? 'Контекст из песни' : 'Lyrics Context'}
                              </span>
                              <div className="p-3 sm:p-4 rounded-2xl bg-app-bg border border-app-card-border divide-y divide-app-card-border/40 space-y-2 sm:space-y-3">
                                {sessionContextLines.map((line, lIdx) => (
                                  <div key={line.lineId || lIdx} className={lIdx > 0 ? "pt-2 sm:pt-3" : ""}>
                                    <p className="font-serif font-semibold text-app-fg text-xs sm:text-sm md:text-base leading-snug">
                                      {line.original}
                                    </p>
                                    {line.translation && line.translation.trim() !== "" && (
                                      <p className="font-sans text-[10px] sm:text-xs text-app-fg opacity-50 italic mt-0.5 sm:mt-1 leading-snug">
                                        {line.translation}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-app-fg opacity-40 block">
                                {uiLanguage === 'ru' ? 'Контекст из песни' : 'Lyrics Context'}
                              </span>
                              <div className="p-2.5 rounded-2xl bg-app-bg border border-app-card-border/40 text-[10px] sm:text-[11px] font-sans text-app-fg opacity-35 italic">
                                {uiLanguage === 'ru' ? 'Контекст отсутствует' : 'No lyric context linked'}
                              </div>
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
