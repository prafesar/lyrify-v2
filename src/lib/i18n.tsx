import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { userPreferencesRepository } from '../application';

export type UiLanguage = 'en' | 'ru';

export interface TranslationDictionary {
  common: {
    save: string;
    delete: string;
    cancel: string;
    loading: string;
    empty: string;
    error: string;
    search: string;
    clear: string;
    yes: string;
    no: string;
    confirm: string;
    close: string;
    back: string;
    retry: string;
    add: string;
    edit: string;
    done: string;
    none: string;
    all: string;
  };
  tabs: {
    preview: string;
    lyrics: string;
    analysis: string;
    cards: string;
    tracks: string;
    library: string;
    study: string;
    settings: string;
  };
  settings: {
    title: string;
    profile: string;
    guest: string;
    signInPrompt: string;
    preferences: string;
    uiLanguage: string;
    targetLanguage: string;
    appearance: string;
    account: string;
    resetData: string;
    resetDataSub: string;
    confirmReset: string;
    confirmResetSub: string;
    signOut: string;
    signIn: string;
    signInSub: string;
    info: string;
    privacy: string;
    version: string;
  };
  onboarding: {
    welcome: string;
    slogan: string;
    getStarted: string;
  };
  lyrics: {
    explanation: string;
    listeningMode: string;
    shadowingMode: string;
    listeningDesc: string;
    shadowingDesc: string;
    translationToggle: string;
    displayBoth: string;
    displayLyricsOnly: string;
    displayTranslationOnly: string;
    studyThisLine: string;
    starredLines: string;
    noStarredLines: string;
    lineSaveToDeck: string;
    tapWordPrompt: string;
    pronounceThisLine: string;
    viewInDictionary: string;
    practiceTracker: string;
    noLyrics: string;
  };
  tracks: {
    title: string;
    searchPlaceholder: string;
    customLyrics: string;
    searchNoResults: string;
    weeklyChallenge: string;
    recommended: string;
    trackAdded: string;
    favorites: string;
    artist: string;
    artists: string;
    recentlySearched: string;
    clearHistory: string;
    analyzeLyrics: string;
    pastePrompt: string;
    songTitle: string;
    pasteLyricsPlaceholder: string;
    analyzeBtn: string;
  };
  analysis: {
    title: string;
    regenerate: string;
    lyricsMeaning: string;
    grammarPatterns: string;
    vocabularyList: string;
    culturalContext: string;
    noAnalysisYet: string;
    generateAnalysis: string;
    generatingAnalysis: string;
    saveToDeck: string;
    saved: string;
  };
  cards: {
    title: string;
    reviewTitle: string;
    box: string;
    allLanguages: string;
    studyNow: string;
    cardsToReview: string;
    noCards: string;
    addCard: string;
    learning: string;
    mastered: string;
    streak: string;
    dailyGoal: string;
    xp: string;
    nextReview: string;
  };
  study: {
    learnPhrase: string;
    meaning: string;
    explanation: string;
    pronunciation: string;
    record: string;
    stop: string;
    goodState: string;
    hardState: string;
    mastered: string;
    completed: string;
    perfectPrompt: string;
    greatJob: string;
    keepPracticing: string;
    backToDeck: string;
    shadowingScore: string;
  };
  studyBridge: {
    welcomeTitle: string;
    welcomeDesc: string;
    startStudying: string;
    reviewExisting: string;
    songsCount: string;
  };
  itunes: {
    previewBy: string;
  };
}

const en: TranslationDictionary = {
  common: {
    save: 'Save',
    delete: 'Delete',
    cancel: 'Cancel',
    loading: 'Loading...',
    empty: 'Empty',
    error: 'Error',
    search: 'Search...',
    clear: 'Clear',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    retry: 'Retry',
    add: 'Add',
    edit: 'Edit',
    done: 'Done',
    none: 'None',
    all: 'All',
  },
  tabs: {
    preview: 'Preview',
    lyrics: 'Lyrics',
    analysis: 'Analysis',
    cards: 'Cards',
    tracks: 'Tracks',
    library: 'Library',
    study: 'Study',
    settings: 'Settings',
  },
  settings: {
    title: 'Settings',
    profile: 'Profile',
    guest: 'Guest User',
    signInPrompt: 'Sign in to sync your progress',
    preferences: 'Preferences',
    uiLanguage: 'App Language',
    targetLanguage: 'Target Language',
    appearance: 'Appearance',
    account: 'Account',
    resetData: 'Reset User Data',
    resetDataSub: 'Clears history and preferences',
    confirmReset: 'Confirm Reset?',
    confirmResetSub: 'Click again to wipe everything',
    signOut: 'Sign Out',
    signIn: 'Sign In with Google',
    signInSub: 'Sync your history across devices',
    info: 'Information',
    privacy: 'Privacy Policy',
    version: 'Version',
  },
  onboarding: {
    welcome: 'Welcome to CantoLex',
    slogan: 'Master languages through songs, featuring AI-driven lyric analysis, pronunciation practice, and immersive musical learning.',
    getStarted: 'Get Started',
  },
  lyrics: {
    explanation: 'Explanation',
    listeningMode: 'Listening',
    shadowingMode: 'Shadowing',
    listeningDesc: 'Follow along with the lyrics and translations',
    shadowingDesc: 'Practice speaking by mimicking the song',
    translationToggle: 'Toggle Translation',
    displayBoth: 'Show Both',
    displayLyricsOnly: 'Lyrics Only',
    displayTranslationOnly: 'Translation Only',
    studyThisLine: 'Study this line',
    starredLines: 'Starred Lines',
    noStarredLines: 'No starred lines in this track yet',
    lineSaveToDeck: 'Save phrase to your deck',
    tapWordPrompt: 'Tap on words or lines to explore meanings',
    pronounceThisLine: 'Practice pronunciation',
    viewInDictionary: 'View in Dictionary',
    practiceTracker: 'Practice Tracker',
    noLyrics: 'No lyrics available for this track',
  },
  tracks: {
    title: 'Explore Tracks',
    searchPlaceholder: 'Search songs, artists, or paste iTunes/Apple Music link...',
    customLyrics: 'Or analyze your own lyrics...',
    searchNoResults: 'No tracks found. Try searching for something else or paste a direct iTunes track link!',
    weeklyChallenge: 'Weekly Language Challenge',
    recommended: 'Recommended for You',
    trackAdded: 'Added by community',
    favorites: 'Favorites',
    artist: 'Artist',
    artists: 'Artists',
    recentlySearched: 'Recently Searched',
    clearHistory: 'Clear History',
    analyzeLyrics: 'Analyze Lyrics',
    pastePrompt: 'Paste your own lyrics to analyze and study:',
    songTitle: 'Song Title',
    pasteLyricsPlaceholder: 'Paste lyrics here...',
    analyzeBtn: 'Analyze lyrics',
  },
  analysis: {
    title: 'AI Insights & Explanations',
    regenerate: 'Regenerate Analysis',
    lyricsMeaning: 'Song & Lyrics Meaning',
    grammarPatterns: 'Key Grammatical Structure & Phrases',
    vocabularyList: 'Core Vocabulary Worksheet',
    culturalContext: 'Cultural & Idiomatic Context',
    noAnalysisYet: 'No analysis available. Click generate below to let Gemini analyze this track!',
    generateAnalysis: 'Generate AI Analysis',
    generatingAnalysis: 'Gemini is analyzing the lyrics... Please wait.',
    saveToDeck: 'Save to Deck',
    saved: 'Saved',
  },
  cards: {
    title: 'Spaced Repetition Deck',
    reviewTitle: 'Card Review',
    box: 'Box {num}',
    allLanguages: 'All Languages',
    studyNow: 'Study {count} Cards',
    cardsToReview: '{count} cards ready for review',
    noCards: 'No cards in your deck yet. Click on raw lyric lines or grammar terms to save them!',
    addCard: 'Add Card',
    learning: 'Learning',
    mastered: 'Mastered',
    streak: 'Streak',
    dailyGoal: 'Daily Goal',
    xp: 'XP',
    nextReview: 'Next review',
  },
  study: {
    learnPhrase: 'Learn Phrase',
    meaning: 'Translation',
    explanation: 'AI Context',
    pronunciation: 'Pronunciation Practice',
    record: 'Record',
    stop: 'Stop',
    goodState: 'Easy (Box +1)',
    hardState: 'Hard (Reset Box)',
    mastered: 'Mastered!',
    completed: 'Study Session Completed!',
    perfectPrompt: 'Perfect! Outstanding pronunciation.',
    greatJob: 'Great job! Keep it up.',
    keepPracticing: 'Keep practicing, you are getting closer!',
    backToDeck: 'Back to Deck',
    shadowingScore: 'Shadowing feedback',
  },
  studyBridge: {
    welcomeTitle: 'Get ready to master this song',
    welcomeDesc: 'Learn key vocabulary and phrases in detail with structured flashcards using spaced repetition.',
    startStudying: 'Start Studying',
    reviewExisting: 'Review {count} Existing Cards',
    songsCount: '{count} songs',
  },
  itunes: {
    previewBy: 'Preview provided by',
  },
};

const ru: TranslationDictionary = {
  common: {
    save: 'Сохранить',
    delete: 'Удалить',
    cancel: 'Отмена',
    loading: 'Загрузка...',
    empty: 'Пусто',
    error: 'Ошибка',
    search: 'Поиск...',
    clear: 'Очистить',
    yes: 'Да',
    no: 'Нет',
    confirm: 'Подтвердить',
    close: 'Закрыть',
    back: 'Назад',
    retry: 'Повторить',
    add: 'Добавить',
    edit: 'Изменить',
    done: 'Готово',
    none: 'Нет',
    all: 'Все',
  },
  tabs: {
    preview: 'Превью',
    lyrics: 'Текст',
    analysis: 'Анализ',
    cards: 'Карточки',
    tracks: 'Песни',
    library: 'Медиатека',
    study: 'Обучение',
    settings: 'Настройки',
  },
  settings: {
    title: 'Настройки',
    profile: 'Профиль',
    guest: 'Гость',
    signInPrompt: 'Войдите, чтобы синхронизировать прогресс',
    preferences: 'Настройки',
    uiLanguage: 'Язык интерфейса',
    targetLanguage: 'Изучаемый язык',
    appearance: 'Оформление',
    account: 'Аккаунт',
    resetData: 'Сбросить данные',
    resetDataSub: 'Очищает историю и настройки',
    confirmReset: 'Подтвердить сброс?',
    confirmResetSub: 'Нажмите ещё раз для полной очистки',
    signOut: 'Выйти',
    signIn: 'Войти через Google',
    signInSub: 'Синхронизируйте прогресс между устройствами',
    info: 'Информация',
    privacy: 'Политика конфиденциальности',
    version: 'Версия',
  },
  onboarding: {
    welcome: 'Добро пожаловать в CantoLex',
    slogan: 'Осваивайте языки по песням с помощью AI-анализа, практики произношения и глубокого погружения в музыку.',
    getStarted: 'Начать обучение',
  },
  lyrics: {
    explanation: 'Пояснение',
    listeningMode: 'Слушать',
    shadowingMode: 'Повторять',
    listeningDesc: 'Следите за текстом и переводом',
    shadowingDesc: 'Практикуйте говорение, повторяя за песней',
    translationToggle: 'Перевод',
    displayBoth: 'Показывать оба',
    displayLyricsOnly: 'Только оригинал',
    displayTranslationOnly: 'Только перевод',
    studyThisLine: 'Изучить строку',
    starredLines: 'Важные строки',
    noStarredLines: 'В этой песне пока нет отмеченных строк',
    lineSaveToDeck: 'Сохранить фразу в колоду',
    tapWordPrompt: 'Нажимайте на слова или строки, чтобы узнать перевод',
    pronounceThisLine: 'Практика произношения',
    viewInDictionary: 'Посмотреть в словаре',
    practiceTracker: 'Трекер практики',
    noLyrics: 'Для этой песни нет текста',
  },
  tracks: {
    title: 'Поиск песен',
    searchPlaceholder: 'Ищите песни, артистов или вставьте ссылку iTunes/Apple Music...',
    customLyrics: 'Или проанализируйте свой собственный текст...',
    searchNoResults: 'Песен не найдено. Попробуйте поискать что-то другое или вставьте прямую ссылку iTunes!',
    weeklyChallenge: 'Еженедельный языковой вызов',
    recommended: 'Рекомендуем вам',
    trackAdded: 'Добавлено сообществом',
    favorites: 'Медиатека',
    artist: 'Исполнитель',
    artists: 'Исполнители',
    recentlySearched: 'История поиска',
    clearHistory: 'Очистить историю',
    analyzeLyrics: 'Анализ текста песни',
    pastePrompt: 'Вставьте текст песни для анализа и изучения:',
    songTitle: 'Название песни',
    pasteLyricsPlaceholder: 'Вставьте текст песни здесь...',
    analyzeBtn: 'Анализировать текст',
  },
  analysis: {
    title: 'AI Анализ и Пояснения',
    regenerate: 'Перегенерировать анализ',
    lyricsMeaning: 'Смысл песни и текста',
    grammarPatterns: 'Основные грамматические структуры и фразы',
    vocabularyList: 'Рабочий список слов',
    culturalContext: 'Культурный и идиоматический контекст',
    noAnalysisYet: 'Анализ пока недоступен. Нажмите «Сгенерировать», чтобы Gemini проанализировал песню!',
    generateAnalysis: 'Создать AI Анализ',
    generatingAnalysis: 'Gemini анализирует текст... Пожалуйста, подождите.',
    saveToDeck: 'В колоду',
    saved: 'Сохранено',
  },
  cards: {
    title: 'Колода карточек',
    reviewTitle: 'Повторение карточек',
    box: 'Коробка {num}',
    allLanguages: 'Все языки',
    studyNow: 'Учить карточки ({count})',
    cardsToReview: 'Карточек к повторению: {count}',
    noCards: 'В вашей колоде пока нет карточек. Нажимайте на строки песни или грамматические термины, чтобы сохранить их!',
    addCard: 'Добавить карточку',
    learning: 'Изучаю',
    mastered: 'Освоено',
    streak: 'Дней подряд',
    dailyGoal: 'Дневная цель',
    xp: 'XP',
    nextReview: 'След. повторение',
  },
  study: {
    learnPhrase: 'Изучение фразы',
    meaning: 'Перевод',
    explanation: 'AI Контекст',
    pronunciation: 'Практика произношения',
    record: 'Записать',
    stop: 'Остановить',
    goodState: 'Легко (Ур. +1)',
    hardState: 'Сложно (Сброс)',
    mastered: 'Освоено!',
    completed: 'Сессия обучения завершена!',
    perfectPrompt: 'Идеально! Превосходное произношение.',
    greatJob: 'Отличная работа! Продолжайте в том же духе.',
    keepPracticing: 'Продолжайте практиковаться, вы почти у цели!',
    backToDeck: 'Вернуться к колоде',
    shadowingScore: 'Оценка произношения',
  },
  studyBridge: {
    welcomeTitle: 'Приготовьтесь освоить эту песню',
    welcomeDesc: 'Детально изучайте ключевую лексику и фразы при помощи структурированных карточек интервального повторения.',
    startStudying: 'Начать обучение',
    reviewExisting: 'Повторить сохранённые карточки ({count})',
    songsCount: '{count} песен',
  },
  itunes: {
    previewBy: 'Превью предоставлено',
  },
};

const dictionaries: Record<UiLanguage, TranslationDictionary> = { en, ru };

interface I18nContextType {
  uiLanguage: UiLanguage;
  setUiLanguage: (lang: UiLanguage) => void;
  t: (keyPath: string, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [uiLanguage, setUiLanguageState] = useState<UiLanguage>(() => {
    const saved = userPreferencesRepository.getPreference('cantolex_ui_lang', 'en');
    return (saved === 'ru' || saved === 'en') ? saved : 'en';
  });

  const setUiLanguage = useCallback((lang: UiLanguage) => {
    setUiLanguageState(lang);
    userPreferencesRepository.setPreference('cantolex_ui_lang', lang);
  }, []);

  const t = useCallback((keyPath: string, replacements?: Record<string, string | number>): string => {
    const parts = keyPath.split('.');
    let result: any = dictionaries[uiLanguage];
    let fallbackResult: any = dictionaries['en'];

    // Traverse selected dictionary
    for (const part of parts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part];
      } else {
        result = undefined;
        break;
      }
    }

    // Fallback to English dictionary if key is missing or not a string
    if (typeof result !== 'string') {
      for (const part of parts) {
        if (fallbackResult && typeof fallbackResult === 'object' && part in fallbackResult) {
          fallbackResult = fallbackResult[part];
        } else {
          fallbackResult = undefined;
          break;
        }
      }
      result = typeof fallbackResult === 'string' ? fallbackResult : keyPath;
    }

    // Apply interpolation
    if (typeof result === 'string' && replacements) {
      Object.entries(replacements).forEach(([key, val]) => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), String(val));
      });
    }

    return result;
  }, [uiLanguage]);

  const value = useMemo(() => ({
    uiLanguage,
    setUiLanguage,
    t
  }), [uiLanguage, setUiLanguage, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
