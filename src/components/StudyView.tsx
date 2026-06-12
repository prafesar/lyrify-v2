import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Rating } from 'ts-fsrs';
import { studyCardsRepository, userPreferencesRepository, Flashcard, PhraseStatus } from '../application';
const getCards = () => studyCardsRepository.getCards();
const reviewCard = (cardId: string, rating: Rating) => studyCardsRepository.reviewCard(cardId, rating);
const deleteFlashcard = (cardId: string) => studyCardsRepository.deleteFlashcard(cardId);
import { Check, X, ArrowRight, Brain, Trash2, ChevronLeft, Clock, Music, User, LayoutGrid, PlayCircle, Library, Globe, ChevronDown, ChevronUp, Volume2, Edit3, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { getLocaleByName } from '../lib/languages';
import { useTranslation } from '../lib/i18n';

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
    list = list.filter(card => card.status === 'learning');
    return list;
  }, [allCards, selectedLanguage, selectedTrack, selectedType]);

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

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getLocaleByName(currentCard?.sourceLanguage || 'English');
      utterance.rate = 0.9;
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
            : `Great job! You've reviewed ${sessionCards.length} phrases. Keep up the momentum to master ${selectedLanguage.toUpperCase()}!`}
        </p>

        <div className="space-y-4 w-full">
          <button 
            onClick={() => setViewMode('hub')}
            className="w-full py-4 rounded-3xl bg-app-fg text-app-bg font-bold tracking-widest uppercase text-xs active:scale-95 transition-all shadow-xl"
          >
            {uiLanguage === 'ru' ? 'Назад в Центр Обучения' : 'Back to Study Hub'}
          </button>
          <button 
            onClick={onBack}
            className="w-full py-4 rounded-3xl bg-app-card border border-app-card-border text-app-fg opacity-60 font-bold tracking-widest uppercase text-xs hover:opacity-100 transition-all"
          >
            {uiLanguage === 'ru' ? 'Назад к песням' : 'Go Back to Music'}
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'hub') {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 p-4 sm:p-6 max-w-5xl mx-auto w-full overflow-y-auto scrollbar-hide font-sans">
        <header className="mb-6 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              {uiLanguage === 'ru' ? 'Центр Обучения' : 'Study Hub'}
            </h1>
            {dueCards.length > 0 ? (
              <button 
                onClick={() => startSession(dueCards)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-app-fg text-app-bg font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
              >
                <PlayCircle size={18} />
                {uiLanguage === 'ru' ? `Повторить (${dueCards.length})` : `Review Due (${dueCards.length})`}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                <Check size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {uiLanguage === 'ru' ? 'Всё разобрано!' : 'All caught up!'}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-4 py-2 rounded-xl bg-app-card border border-app-card-border text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
              >
                <option key="lang-opt-all" value="all">{uiLanguage === 'ru' ? 'Все языки' : 'All Languages'}</option>
                {availableLanguages.map(l => <option key={`lang-opt-${l}`} value={l}>{l.toUpperCase()}</option>)}
              </select>

              <select 
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="px-4 py-2 rounded-xl bg-app-card border border-app-card-border text-xs font-black uppercase tracking-widest outline-none max-w-[180px] sm:max-w-[240px] truncate cursor-pointer"
              >
                <option key="track-opt-all" value="all">{uiLanguage === 'ru' ? 'Все песни' : 'All Tracks'}</option>
                {tracksList.map(t => <option key={`track-opt-${t.id}`} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            {/* Tags scrolling carousel selector */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-app-muted pl-0.5 select-none font-sans">
                {uiLanguage === 'ru' ? 'Фильтр по типу и тегам' : 'Filter by Tag'}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
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
                { id: 'recent', label: uiLanguage === 'ru' ? 'Выражения' : 'Phrases', icon: <Clock size={16} /> },
                { id: 'track', label: uiLanguage === 'ru' ? 'Колоды (Песни)' : 'Decks (Tracks)', icon: <Music size={16} /> },
                { id: 'artist', label: uiLanguage === 'ru' ? 'Исполнители' : 'Artists', icon: <User size={16} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGroupMode(tab.id as GroupMode)}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
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
                  <div key={group.id} className="group overflow-hidden rounded-[2rem] bg-app-card border border-app-card-border hover:border-app-fg/10 transition-all font-sans">
                    <div 
                      className="flex items-center justify-between p-6 cursor-pointer"
                      onClick={() => toggleParent(group.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-app-fg/5 flex items-center justify-center text-app-accent shrink-0">
                           <Library size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-serif text-lg leading-tight truncate">{group.trackTitle}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 truncate mt-1">{group.artist}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0 font-sans">
                        <span className="text-[10px] font-black bg-app-fg/5 px-2 py-1 rounded-lg opacity-40">
                          {knownCount}/{totalCount}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startSession(group.phrases);
                          }}
                          className="p-2 rounded-xl bg-app-fg text-app-bg hover:scale-110 active:scale-95 transition-all"
                          title="Study group"
                        >
                          <PlayCircle size={18} />
                        </button>
                        <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")}>
                           <ChevronDown size={20} className="opacity-20" />
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden border-t border-app-card-border bg-app-fg/[0.01] font-sans"
                        >
                          <div className="p-4 space-y-3">
                            {group.phrases.map(child => {
                              const isEditing = editingCardId === child.id;
                              return (
                                <div key={child.id} className="p-4 rounded-2xl border border-app-card-border/40 bg-app-card/30 flex flex-col hover:bg-app-fg/[0.02] transition-all font-sans">
                                  {isEditing ? (
                                    <div className="space-y-3 w-full font-sans">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                            {uiLanguage === 'ru' ? 'Оригинальный текст' : 'Original Text'}
                                          </label>
                                          <input
                                            type="text"
                                            value={editFields.text}
                                            onChange={(e) => setEditFields({ ...editFields, text: e.target.value })}
                                            className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none"
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
                                            className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none"
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
                                            className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none"
                                          >
                                            {Object.entries(typeLabels).map(([val, label]) => (
                                              <option key={val} value={val}>{label}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                            {uiLanguage === 'ru' ? 'Приметки (опционально)' : 'User Note (Optional)'}
                                          </label>
                                          <input
                                            type="text"
                                            value={editFields.userNote}
                                            onChange={(e) => setEditFields({ ...editFields, userNote: e.target.value })}
                                            placeholder={uiLanguage === 'ru' ? "Ассоциации для запоминания..." : "Add private mnemonics helper..."}
                                            className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none font-sans"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                          {uiLanguage === 'ru' ? 'Объяснение контекста' : 'Explanation'}
                                        </label>
                                        <textarea
                                          value={editFields.explanation}
                                          rows={3}
                                          onChange={(e) => setEditFields({ ...editFields, explanation: e.target.value })}
                                          className="w-full px-3 py-2 text-sm rounded-xl bg-app-bg border border-app-card-border focus:border-indigo-500 focus:outline-none resize-none"
                                        />
                                      </div>

                                      <div className="flex items-center justify-end gap-2.5 pt-1.5 border-t border-app-card-border/30">
                                        <button
                                          onClick={() => setEditingCardId(null)}
                                          className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border border-app-card-border hover:bg-app-fg/5 transition-all"
                                        >
                                          {t('common.cancel')}
                                        </button>
                                        <button
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
                                          className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-[var(--accent)] text-white hover:scale-105 active:scale-95 transition-all"
                                        >
                                          {t('common.save')}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full font-sans">
                                      <div className="space-y-1.5 flex-1 min-w-0">
                                        {/* Phrase and Type Tag */}
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-base font-serif font-medium text-app-fg">{child.text}</span>
                                          {child.type && child.type !== 'phrase' && (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md">
                                              {typeLabels[child.type] || child.type}
                                            </span>
                                          )}
                                          {child.userNote && (
                                            <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md">
                                              {uiLanguage === 'ru' ? 'Заметка' : 'Note'}: {child.userNote}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Translation */}
                                        <p className="text-sm text-app-fg opacity-60 font-sans">{child.translation}</p>

                                        {/* Explanation */}
                                        {child.explanation && (
                                          <div className="text-xs text-app-fg/75 font-sans mt-1 max-w-xl">
                                            <ReactMarkdown>{child.explanation}</ReactMarkdown>
                                          </div>
                                        )}
                                        
                                        {/* Original Lyric Line if available */}
                                        {child.lineId && (
                                          <div className="text-xs text-app-fg/40 italic flex items-center gap-1.5 mt-1 font-sans">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-app-card-border" />
                                            {uiLanguage === 'ru' ? 'Контекст' : 'Context'}: «{child.lineId}»
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 font-sans">
                                        <button
                                          onClick={() => {
                                            setEditingCardId(child.id);
                                            setEditFields({
                                              text: child.text || '',
                                              translation: child.translation || '',
                                              explanation: child.explanation || '',
                                              type: child.type || 'phrase',
                                              userNote: child.userNote || '',
                                            });
                                          }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-fg/5 text-app-fg text-[10px] font-black uppercase tracking-widest hover:bg-app-fg/10 transition-all border border-transparent font-sans"
                                          title="Edit card"
                                        >
                                          <Edit3 size={11} />
                                          <span>{uiLanguage === 'ru' ? 'Редактировать' : 'Edit'}</span>
                                        </button>
                                        <button 
                                          onClick={() => startSession([child])}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-fg/5 text-app-fg text-[10px] font-black uppercase tracking-widest hover:bg-[var(--accent)] hover:text-white hover:opacity-100 transition-all font-sans"
                                        >
                                          <PlayCircle size={14} />
                                          {uiLanguage === 'ru' ? 'Учить' : 'Study'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
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
                    className="group relative flex flex-col p-8 rounded-[2.5rem] bg-app-card border border-app-card-border shadow-app-card hover:border-app-accent/30 transition-all text-left overflow-hidden active:scale-95 font-sans"
                  >
                    <div 
                      className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity font-sans"
                      style={{ color: 'var(--accent)' }}
                    >
                      {deck.icon}
                    </div>
                    
                    <div className="flex-1 space-y-1 mb-10 font-sans">
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
      <div className="max-w-2xl mx-auto w-full py-8 px-4 sm:px-6 flex flex-col min-h-full">
        <header className="flex items-center justify-between mb-8 shrink-0 font-sans">
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
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentCard.id + (isFlipped ? '-back' : '-front')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative font-sans"
            >
              <div className="w-full bg-app-card border border-app-card-border shadow-app-card rounded-[2.5rem] p-8 sm:p-12 flex flex-col items-center justify-start text-center gap-10 transition-all mb-8">
                <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-app-fg opacity-10 uppercase tracking-[0.5em] truncate max-w-[80%]">
                  {currentCard.trackId}
                </div>

                <div className="absolute top-8 right-8">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(currentCard.text);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-app-bg border border-app-card-border text-app-fg opacity-40 hover:opacity-100 transition-all hover:bg-app-fg/5"
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
                
                <div className="space-y-10 w-full pt-10 font-sans">
                  <p className="text-3xl lg:text-4xl font-serif leading-[1.3] text-app-fg">
                    {isFlipped ? currentCard.translation : currentCard.text}
                  </p>
                  
                  {isFlipped && (
                    <div className="space-y-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
                      <div className="h-px w-12 bg-app-fg opacity-5 mx-auto" />
                      
                      <p className="text-2xl italic font-medium opacity-50 font-serif" style={{ color: 'var(--accent)' }}>
                        {currentCard.text}
                      </p>
                      
                      {currentCard.explanation && (
                        <div className="w-full font-sans">
                          <button 
                            onClick={() => setIsExplanationExpanded(!isExplanationExpanded)}
                            className="w-full flex items-center justify-between p-6 rounded-[2rem] bg-app-bg border border-app-card-border hover:border-app-accent/30 transition-all text-left font-sans"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                              {uiLanguage === 'ru' ? 'Объяснение' : 'Explanation'}
                            </span>
                            <div className="w-6 h-6 rounded-lg bg-app-fg/5 flex items-center justify-center">
                              {isExplanationExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExplanationExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-8 px-2 text-left font-sans">
                                  <div className="text-base leading-relaxed text-app-fg opacity-80 prose prose-invert max-w-none prose-p:mb-6">
                                    <ReactMarkdown>{currentCard.explanation}</ReactMarkdown>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full mt-auto pt-6 font-sans">
                  {!isFlipped ? (
                    <button 
                      onClick={() => setIsFlipped(true)}
                      className="w-full py-5 text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 font-sans"
                      style={{ 
                        backgroundColor: 'var(--accent)', 
                        boxShadow: '0 15px 25px -5px color-mix(in srgb, var(--accent) 40%, transparent)' 
                      }}
                    >
                      {uiLanguage === 'ru' ? 'Показать перевод' : 'Show Translation'}
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 w-full font-sans font-black uppercase tracking-[0.15em] text-xs">
                      <button
                        onClick={() => handleRating(Rating.Again)}
                        className="py-5 rounded-[2rem] border border-red-500/20 text-red-500 font-bold uppercase tracking-[0.2em] text-xs hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        {uiLanguage === 'ru' ? 'Заново' : 'Again'}
                      </button>
                      <button
                        onClick={() => handleRating(Rating.Good)}
                        className="py-5 rounded-[2rem] border border-emerald-500/20 text-emerald-500 font-bold uppercase tracking-[0.2em] text-xs hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95"
                      >
                        {uiLanguage === 'ru' ? 'Помню' : 'Got it'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <footer className="mt-auto py-12 flex justify-center shrink-0 font-sans">
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
              {uiLanguage === 'ru' ? 'Удалить фразу' : 'Delete Phrase'}
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
