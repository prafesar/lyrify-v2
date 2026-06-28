import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { userPreferencesRepository } from '../application';

export type UiLanguage = 'en' | 'ru' | 'es' | 'de';

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
    lecturePromptVariant: string;
    lecturePromptVariantCompact: string;
    lecturePromptVariantRich: string;
    lecturePromptVariantDesc: string;
    lecturePromptVariantCompactDesc: string;
    lecturePromptVariantRichDesc: string;
    uiLanguage: string;
    targetLanguage: string;
    appearance: string;
    themeDark: string;
    themeLight: string;
    themeLyrifyLight: string;
    themeSolarized: string;
    themeSolarizedEmerald: string;
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
    badge: string;
    title: string;
    titlePre: string;
    titleWord: string;
    subtitle: string;
    cardTranslationTitle: string;
    cardTranslationDesc: string;
    cardFlashcardsTitle: string;
    cardFlashcardsDesc: string;
    cardShadowingTitle: string;
    cardShadowingDesc: string;
    cta: string;
    closeTooltip: string;
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
    sourcesTooltip: string;
    settingsTooltip: string;
    expandResourcesTooltip: string;
    collapseResourcesTooltip: string;
    toggleSourceLyrics: string;
    toggleTargetTranslation: string;
    showStarredOnly: string;
    showTrackerTooltip: string;
    searchingLyrics: string;
    generatingPreview: string;
    analyzingTrack: string;
    findingLyrics: string;
    scanningDatabases: string;
    consultingGemini: string;
    checkingLyricsDatabases: string;
    analyzingWithAI: string;
    pollingOfficialSources: string;
    detectingLanguageExtracting: string;
    generatingLecture: string;
    deepBreakdown: string;
    consultingGeminiShort: string;
    noMatchingLyricLines: string;
    clearSearch: string;
    fetchingDetails: string;
    searchPlaceholder: string;
    lyricsNotFound: string;
    manualEntry: string;
    retryAiSearch: string;
    saveAndAnalyze: string;
    lyricsAreMissing: string;
    missingLyricsDesc: string;
    findLyricsPhrases: string;
    enterManually: string;
    lyricAuthors: string;
  };
  tracks: {
    title: string;
    searchPlaceholder: string;
    searchTracks: string;
    searchAlbums: string;
    searchArtists: string;
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
    backToHome: string;
    recentTracks: string;
    recentTracksDesc: string;
    communityTracks: string;
    communityTracksDesc: string;
    languageLabel: string;
    countSelected: string;
    difficultyLabel: string;
    difficultyBeginner: string;
    difficultyIntermediate: string;
    difficultyAdvanced: string;
    filterByLanguages: string;
    clearSelection: string;
    noTracksFoundMatching: string;
    community: string;
    recent: string;
    noSongsInCommunity: string;
    noRecentTracks: string;
    noRecentTracksShort: string;
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
    previewTitle: string;
    viewOnItunes: string;
    promotionalSummary: string;
    musicPreview: string;
  };
  lineWorkspace: {
    translationPlaceholder: string;
    wordPlaceholder: string;
    translationPlaceholder2: string;
    commentaryPlaceholder: string;
    emptyNote: string;
    know: string;
    learn: string;
    added: string;
    addPhraseTooltip: string;
    addNoteTooltip: string;
    regenerateAiTooltip: string;
    explainWithAiTooltip: string;
    unsignedWord: string;
    unsignedTranslation: string;
    options: string;
    aiRecommendation: string;
    manualPhrase: string;
  };
  dailyProgress: {
    nextGoal: string;
    perfectStreak: string;
    recommendedTarget: string;
    exploreTrackTitle: string;
    exploreTrackDesc: string;
    exploreTrackBtn: string;
    savePhrasesTitle: string;
    savePhrasesDesc: string;
    savePhrasesDescGuest: string;
    savePhrasesBtnLyrics: string;
    savePhrasesBtnExplore: string;
    reviewCardsTitle: string;
    reviewCardsDesc: string;
    reviewCardsBtn: string;
    goalCompleteTitle: string;
    goalCompleteDesc: string;
    goalCompleteBtn: string;
    start: string;
    ready: string;
    startTooltip: string;
    explore: string;
    exploreStepTooltip: string;
    save: string;
    saveStepTooltip: string;
    review: string;
    reviewStepTooltip: string;
    dailyMilestones: string;
    completed: string;
    goalProgress: string;
  };
  resumeStudy: {
    continueLearning: string;
    returningSession: string;
    resumeLearning: string;
    statusExplore: string;
    statusSavedPhrases: string;
    statusLyricsLoaded: string;
    statusAnalysisReady: string;
  };
  nextStep: {
    findingLyrics: string;
    findingLyricsDesc: string;
    translatingLyrics: string;
    translatingLyricsDesc: string;
    analyzingTrack: string;
    analyzingTrackDesc: string;
    generatingLecture: string;
    generatingLectureDesc: string;
    processing: string;
    processingDesc: string;
    excellentProgress: string;
    activeProcessing: string;
    nextStepLabel: string;
    getLyricsLabel: string;
    getLyricsDesc: string;
    translateLyricLabel: string;
    translateLyricDesc: string;
    generateBreakdownLabel: string;
    generateBreakdownDesc: string;
    startStudyLabel: string;
    startStudyDesc: string;
    savePhrasesLabel: string;
    savePhrasesDesc: string;
    revisitBreakdownLabel: string;
    revisitBreakdownDesc: string;
  };
  trackProgress: {
    stationLyrics: string;
    stationAnalysis: string;
    stationCards: string;
    tooltipCurrent: string;
    tooltipView: string;
    tooltipLocked: string;
  };
  library: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filterAll: string;
    filterSongs: string;
    filterPlaylists: string;
    filterArtists: string;
    filterAlbums: string;
    newPlaylist: string;
    playlistNamePlaceholder: string;
    createBtn: string;
    favoriteTracks: string;
    noMatchSearch: string;
    noFavoritesYet: string;
    autoPlaylistBadge: string;
    songsCount: string;
    minutesLabel: string;
    emptyPlaylist: string;
    noPlaylistsYet: string;
    createFirstPlaylist: string;
    favoriteArtists: string;
    noArtistsYet: string;
    favoriteAlbums: string;
    backToPlaylists: string;
    deleteBtn: string;
    tracksInPlaylist: string;
    noTracksInPlaylistYet: string;
    addSongsTip: string;
    openStudySong: string;
    removeFromFavorites: string;
    addToFavorites: string;
    inFavoritesBadge: string;
    addToPlaylist: string;
    noPlaylistsAvailable: string;
    automaticPlaylistLabel: string;
    playlistLabel: string;
    playlistTotalTracks: string;
    playlistTotalTracksNone: string;
    deletePlaylistConfirm: string;
  };
  assistant: {
    title: string;
    subtitle: string;
    anchor: string;
    lyricsContext: string;
    linkingMetadata: string;
    interactivePrompts: string;
    vocabularyLabel: string;
    vocabularyDesc: string;
    grammarLabel: string;
    grammarDesc: string;
    usefulLabel: string;
    usefulDesc: string;
    b2Label: string;
    b2Desc: string;
    culturalLabel: string;
    culturalDesc: string;
    inputPlaceholder: string;
    analyzingTitle: string;
    analyzingDesc: string;
    errorTitle: string;
    retryBtn: string;
    tutorFeedback: string;
    speaking: string;
    speakText: string;
    suggestedTitle: string;
    suggestedTip: string;
    editDetail: string;
    vocabChunk: string;
    targetTranslation: string;
    clarificationNotes: string;
    saveBtn: string;
    cancelBtn: string;
    acceptBtn: string;
    savedTitle: string;
    addedBadge: string;
  };
  resources: {
    title: string;
    externalLinks: string;
    lyricsSource: string;
    fetchingLyrics: string;
    analyzingLyrics: string;
    connectingToSource: string;
    aiBreakdownInProgress: string;
    fetchingLyricsDesc: string;
    analyzingLyricsDesc: string;
    externalLinksDesc: string;
    trackTitle: string;
    artistName: string;
    searching: string;
    searchBtn: string;
    searchingAlternative: string;
    availableResults: string;
    noLyricsFound: string;
  };
  lyricsSettings: {
    title: string;
    sourceLanguage: string;
    sourceLanguageDesc: string;
    skipKnown: string;
    skipKnownDesc: string;
    translation: string;
    translationDesc: string;
    translatingStatus: string;
    regenerateBtn: string;
  };
  phraseAction: {
    title: string;
    explanation: string;
    knowIt: string;
    learn: string;
    saving: string;
    thinking: string;
    explain: string;
    learning: string;
    known: string;
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
    lecturePromptVariant: 'AI Lecture Breakdown',
    lecturePromptVariantCompact: 'Compact',
    lecturePromptVariantRich: 'Rich',
    lecturePromptVariantDesc: 'Choose depth of the generated breakdown essay',
    lecturePromptVariantCompactDesc: 'Compact mode: Generates a focused, concise linguistic analysis and core phrases. Faster response.',
    lecturePromptVariantRichDesc: 'Rich mode: Generates deeply detailed linguistic commentaries, cultural essays, and exhaustive idioms. Comprehensive response.',
    uiLanguage: 'App Language',
    targetLanguage: 'Target Language',
    appearance: 'Appearance',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeLyrifyLight: 'Lyrify Light',
    themeSolarized: 'Solarized',
    themeSolarizedEmerald: 'Solarized Emerald',
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
    badge: 'Guest-First Language Mastery',
    title: 'Master Languages Through Songs',
    titlePre: 'Master Languages Through ',
    titleWord: 'Songs',
    subtitle: 'Welcome to CantoLex! We believe authentic lyrics are the absolute best way to absorb natural accent, slang, and grammar. Analyse nuances, study curated explanations, and start singing. Everything is fully functional instantly as a guest.',
    cardTranslationTitle: 'Deep Lyric Translations',
    cardTranslationDesc: 'Go beyond cold word-by-word dictionaries. Discover slang, figurative meanings, metaphors, and native cultural contexts.',
    cardFlashcardsTitle: 'Interactive Flashcards',
    cardFlashcardsDesc: 'Save catchy idioms or grammatical lines straight into your premium 5-box Spaced Repetition deck. Review locally anytime.',
    cardShadowingTitle: 'Mic Shadowing & Audios',
    cardShadowingDesc: 'Unlock targeted practice loops. Train pronunciation using your mic, listen to real-time snippets, and build true mouth-muscle memory.',
    cta: "Let's dance",
    closeTooltip: 'Hide onboarding',
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
    sourcesTooltip: 'Sources & Resources',
    settingsTooltip: 'Lyrics Settings',
    expandResourcesTooltip: 'Expand resources',
    collapseResourcesTooltip: 'Collapse resources',
    toggleSourceLyrics: 'Toggle {lang} Lyrics',
    toggleTargetTranslation: 'Toggle {lang} Translation',
    showStarredOnly: 'Show Starred Lines Only',
    showTrackerTooltip: 'Show Practice Tracker & Search',
     searchingLyrics: 'Searching Lyrics',
    generatingPreview: 'Generating Preview',
    analyzingTrack: 'Analyzing Track',
    findingLyrics: 'Finding Lyrics',
    scanningDatabases: 'Scanning Databases',
    consultingGemini: 'Consulting CantoLex AI',
    checkingLyricsDatabases: 'Checking lyrics databases...',
    analyzingWithAI: 'Analyzing with AI...',
    pollingOfficialSources: 'Polling official sources for high-accuracy lyrics text.',
    detectingLanguageExtracting: 'Detecting language, extracting authors, and translating for you.',
    generatingLecture: 'Generating Lecture',
    deepBreakdown: 'Deep Breakdown',
    consultingGeminiShort: 'Consulting CantoLex AI',
    noMatchingLyricLines: 'No matching lyric lines.',
    clearSearch: 'Clear Search',
    fetchingDetails: 'Fetching details...',
    searchPlaceholder: 'Search lyrics...',
    lyricsNotFound: 'Lyrics not found',
    manualEntry: 'Manual Entry',
    retryAiSearch: 'Retry AI search',
    saveAndAnalyze: 'Save & Analyze',
    lyricsAreMissing: 'Lyrics are missing',
    missingLyricsDesc: "We haven't fetched the original text for this song yet.",
    findLyricsPhrases: 'Find Lyrics & Phrases',
    enterManually: 'Enter Manually',
    lyricAuthors: 'Lyric Authors',
  },
  tracks: {
    title: 'Explore Tracks',
    searchPlaceholder: 'Search songs, artists, or paste iTunes/Apple Music link...',
    searchTracks: 'Search tracks...',
    searchAlbums: 'Search albums...',
    searchArtists: 'Search artists...',
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
    backToHome: 'Back to Home',
    recentTracks: 'Recent Tracks',
    recentTracksDesc: 'Your practice history and most recently studied songs',
    communityTracks: 'Community Tracks',
    communityTracksDesc: 'Trending songs in target languages shared by members',
    languageLabel: 'Language:',
    countSelected: '{count} Selected',
    difficultyLabel: 'Difficulty:',
    difficultyBeginner: 'Beginner',
    difficultyIntermediate: 'Intermediate',
    difficultyAdvanced: 'Advanced',
    filterByLanguages: 'Filter by Languages:',
    clearSelection: 'Clear Selection ({count})',
    noTracksFoundMatching: 'No tracks found matching your filters.',
    community: 'Community',
    recent: 'Recent',
    noSongsInCommunity: 'No songs in community yet.',
    noRecentTracks: 'No recent tracks yet. Search above to begin study!',
    noRecentTracksShort: 'No recent tracks yet.',
  },
  analysis: {
    title: 'AI Insights & Explanations',
    regenerate: 'Regenerate Analysis',
    lyricsMeaning: 'Song & Lyrics Meaning',
    grammarPatterns: 'Key Grammatical Structure & Phrases',
    vocabularyList: 'Core Vocabulary Worksheet',
    culturalContext: 'Cultural & Idiomatic Context',
    noAnalysisYet: 'No analysis available. Click generate below to let CantoLex AI analyze this track!',
    generateAnalysis: 'Generate AI Analysis',
    generatingAnalysis: 'CantoLex AI is analyzing the lyrics... Please wait.',
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
    previewTitle: 'iTunes Preview',
    viewOnItunes: 'View on iTunes',
    promotionalSummary: 'Provided as a promotional summary. Full track available on the iTunes Store.',
    musicPreview: 'Music Preview',
  },
  lineWorkspace: {
    translationPlaceholder: 'Add line translation/meaning...',
    wordPlaceholder: 'Word or phrase',
    translationPlaceholder2: 'Translation',
    commentaryPlaceholder: 'Commentary or explanation details...',
    emptyNote: 'Empty note. Click to comment...',
    know: 'Know',
    learn: 'Learn',
    added: 'Added',
    addPhraseTooltip: 'Add Phrase',
    addNoteTooltip: 'Add Note',
    regenerateAiTooltip: 'Regenerate AI Explanation',
    explainWithAiTooltip: 'Explain with AI',
    unsignedWord: '[unsigned word]',
    unsignedTranslation: '[unsigned translation]',
    options: 'Options',
    aiRecommendation: 'ai recommendation',
    manualPhrase: 'manual phrase',
  },
  dailyProgress: {
    nextGoal: 'Next Goal',
    perfectStreak: 'Perfect Streak!',
    recommendedTarget: 'RECOMMENDED TARGET',
    exploreTrackTitle: 'Explore a Track',
    exploreTrackDesc: 'Search for a song and load its lyrics to start today’s journey.',
    exploreTrackBtn: 'Find Songs',
    savePhrasesTitle: 'Save New Phrases',
    savePhrasesDesc: 'Open lyrics view and save at least 3 phrases to practice.',
    savePhrasesDescGuest: 'Explore any track and bookmark words or phrases.',
    savePhrasesBtnLyrics: 'Go to Lyrics',
    savePhrasesBtnExplore: 'Explore Tracks',
    reviewCardsTitle: 'Review Cards',
    reviewCardsDesc: 'Train with your saved flashcards in the Study Hub.',
    reviewCardsBtn: 'Study Hub',
    goalCompleteTitle: 'Daily Goal Complete!',
    goalCompleteDesc: 'Outstanding! You have completed all of your training targets for today.',
    goalCompleteBtn: 'Keep Studying',
    start: 'Start',
    ready: 'Ready',
    startTooltip: 'Start of Day: Daily track is opened',
    explore: 'Explore',
    exploreStepTooltip: 'Step 1: Explore Track ({count}/{target})',
    save: 'Save',
    saveStepTooltip: 'Step 2: Save Phrases ({count}/{target})',
    review: 'Review',
    reviewStepTooltip: 'Step 3: Review Cards ({count}/{target})',
    dailyMilestones: 'Daily Milestones',
    completed: 'Completed',
    goalProgress: 'Goal Progress: {num}%',
  },
  resumeStudy: {
    continueLearning: 'Continue Learning',
    returningSession: 'Returning Session',
    resumeLearning: 'Resume Learning',
    statusExplore: 'Continue exploring lyrics and pronunciation.',
    statusSavedPhrases: 'You saved {count} phrase{plural} from this track.',
    statusLyricsLoaded: 'Lyrics are loaded. Try generating a full AI analysis!',
    statusAnalysisReady: 'AI analysis is ready. Read lyrics and practice shadowing!',
  },
  nextStep: {
    findingLyrics: 'Finding Lyrics',
    findingLyricsDesc: 'Searching original lyrics database',
    translatingLyrics: 'Translating Lyrics',
    translatingLyricsDesc: 'Analyzing track meaning & translating lines with CantoLex AI',
    analyzingTrack: 'Analyzing Track',
    analyzingTrackDesc: 'Processing grammatical analysis using CantoLex AI',
    generatingLecture: 'Generating Lecture',
    generatingLectureDesc: 'Structuring vocabulary & educational explanations',
    processing: 'Processing...',
    processingDesc: 'Consulting CantoLex AI and preparing materials',
    excellentProgress: 'Excellent Progress!',
    activeProcessing: 'ACTIVE PROCESSING',
    nextStepLabel: 'NEXT STEP',
    getLyricsLabel: 'Get Lyrics',
    getLyricsDesc: 'Search and fetch original lyrics for this song.',
    translateLyricLabel: 'Translate Lyrics',
    translateLyricDesc: 'Translate original lyrics and analyze meaning using CantoLex AI.',
    generateBreakdownLabel: 'Generate Breakdown',
    generateBreakdownDesc: 'Run CantoLex AI to translate lines and extract important vocabulary patterns.',
    startStudyLabel: 'Start Study',
    startStudyDesc: 'You have {count} saved phrase{plural} ready to practice now.',
    savePhrasesLabel: 'Save Phrases',
    savePhrasesDesc: 'Explore the Breakdown to select and save phrases to your cards.',
    revisitBreakdownLabel: 'Revisit Breakdown',
    revisitBreakdownDesc: 'You completed this song breakdown! All cards are current, and nothing is due for review.',
  },
  trackProgress: {
    stationLyrics: 'Lyrics',
    stationAnalysis: 'Breakdown',
    stationCards: 'Cards',
    tooltipCurrent: '{name} (Current View)',
    tooltipView: '{name} (Click to open)',
    tooltipLocked: '{name} (Upcoming/Locked)',
  },
  library: {
    title: 'My Library',
    subtitle: 'Your personal language learning library of songs',
    searchPlaceholder: 'Search favorites, playlists, artists...',
    filterAll: 'All',
    filterSongs: 'Songs',
    filterPlaylists: 'Playlists',
    filterArtists: 'Artists',
    filterAlbums: 'Albums',
    newPlaylist: 'New Playlist',
    playlistNamePlaceholder: 'Playlist name...',
    createBtn: 'Create',
    favoriteTracks: 'Favorite Tracks',
    noMatchSearch: 'No tracks match your search',
    noFavoritesYet: 'No favorite songs in your library yet. Add them from the track menu!',
    autoPlaylistBadge: 'Auto',
    songsCount: '{count} songs • {time}',
    minutesLabel: '{count} min',
    emptyPlaylist: 'empty',
    noPlaylistsYet: 'You have no created playlists yet.',
    createFirstPlaylist: 'Create first playlist',
    favoriteArtists: 'Favorite Artists',
    noArtistsYet: 'Artists will appear automatically from your favorite artists! Add them manually to see them here.',
    favoriteAlbums: 'Favorite Albums',
    backToPlaylists: 'Back to playlists',
    deleteBtn: 'Delete',
    tracksInPlaylist: 'Tracks in Playlist',
    noTracksInPlaylistYet: 'No songs in this playlist yet.',
    addSongsTip: 'Add songs from the home tab or search, using the three-dot menu!',
    openStudySong: 'Open / Study Song',
    removeFromFavorites: 'Remove from Favorites',
    addToFavorites: 'Add to Favorites',
    inFavoritesBadge: 'In Favorites',
    addToPlaylist: 'Add to playlist...',
    noPlaylistsAvailable: 'No playlists yet. Go back and create a new playlist first!',
    automaticPlaylistLabel: 'AUTOMATIC PLAYLIST',
    playlistLabel: 'PLAYLIST',
    playlistTotalTracks: 'Total: {count} songs • {time} minutes track length',
    playlistTotalTracksNone: 'no tracks',
    deletePlaylistConfirm: 'Are you sure you want to delete this playlist?',
  },
  assistant: {
    title: 'CantoLex Assistant',
    subtitle: 'Study Phrase / Follow-up',
    anchor: 'Linguistic Anchor',
    lyricsContext: 'Lyrics Context',
    linkingMetadata: 'Linking metadata contextual lines...',
    interactivePrompts: 'Interactive Prompts',
    vocabularyLabel: 'Explain vocabulary',
    vocabularyDesc: 'Key collocations & words',
    grammarLabel: 'Explain grammar',
    grammarDesc: 'Sentence structure & conjugations',
    usefulLabel: 'Find useful phrases',
    usefulDesc: 'Convert lyrics into speech blocks',
    b2Label: 'Explain at B2',
    b2Desc: 'Mid-level vocabulary explanations',
    culturalLabel: 'Cultural context',
    culturalDesc: 'Metaphors & country context',
    inputPlaceholder: 'Ask about nuances, grammar, synonyms, register, or usage of this phrase...',
    analyzingTitle: 'Analyzing Lyrics',
    analyzingDesc: 'Consulting CantoLex AI to break down grammar structures and suggest collocations...',
    errorTitle: 'Linguistic Analysis Suspended',
    retryBtn: 'Retry analysis',
    tutorFeedback: 'AI tutor feedback',
    speaking: 'Speaking',
    speakText: 'Speak text',
    suggestedTitle: 'Suggested Vocabulary Chunks ({count})',
    suggestedTip: 'Click Accept to add to your study list',
    editDetail: 'Edit block detail',
    vocabChunk: 'Vocabulary chunk',
    targetTranslation: 'Target language translation',
    clarificationNotes: 'Clarification / Notes',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    acceptBtn: 'Accept',
    savedTitle: 'Saved to Study List ({count})',
    addedBadge: 'Added',
  },
  resources: {
    title: 'Resources & Source',
    externalLinks: 'External Links',
    lyricsSource: 'Lyrics Source',
    fetchingLyrics: 'FETCHING LYRICS',
    analyzingLyrics: 'ANALYZING LYRICS',
    connectingToSource: 'Connecting to source...',
    aiBreakdownInProgress: 'AI Breakdown in progress...',
    fetchingLyricsDesc: 'Retrieving target song texts from alternative lyric databases.',
    analyzingLyricsDesc: 'Detecting original song language, building translation maps and line alignments.',
    externalLinksDesc: 'External links and materials for this track.',
    trackTitle: 'Track Title',
    artistName: 'Artist Name',
    searching: 'Searching...',
    searchBtn: 'Search Alternative Lyrics',
    searchingAlternative: 'Searching alternative sources...',
    availableResults: 'Available Results ({count})',
    noLyricsFound: 'No lyrics searched yet or no results found above',
  },
  lyricsSettings: {
    title: 'Lyrics Settings',
    sourceLanguage: 'Source Language',
    sourceLanguageDesc: 'Used for pronunciation and search',
    skipKnown: 'Skip Known Phrases',
    skipKnownDesc: "Don't read lines you already know",
    translation: 'Translation',
    translationDesc: 'Regenerate lyrics translation',
    translatingStatus: 'Translating...',
    regenerateBtn: 'Regenerate',
  },
  phraseAction: {
    title: 'Phrase Action',
    explanation: 'Explanation',
    knowIt: 'I know it',
    learn: 'Learn',
    saving: 'Saving...',
    thinking: 'Thinking...',
    explain: 'Explain',
    learning: 'Learning',
    known: 'Known',
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
    lecturePromptVariant: 'AI-разбор песни',
    lecturePromptVariantCompact: 'Компактный',
    lecturePromptVariantRich: 'Полный',
    lecturePromptVariantDesc: 'Выберите глубину генерируемого разбора песни',
    lecturePromptVariantCompactDesc: 'Компактный режим: Генерирует лаконичный лингвистический анализ и ключевые фразы. Быстрый ответ.',
    lecturePromptVariantRichDesc: 'Полный режим: Генерирует глубокий разбор контекста, подробные грамматические комментарии и идиомы. Всеобъемлющий ответ.',
    uiLanguage: 'Язык интерфейса',
    targetLanguage: 'Изучаемый язык',
    appearance: 'Оформление',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    themeLyrifyLight: 'Светлая Lyrify',
    themeSolarized: 'Солнечная',
    themeSolarizedEmerald: 'Изумрудная солнечная',
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
    badge: 'Освоение языков с первых секунд',
    title: 'Изучайте языки по любимым песням',
    titlePre: 'Изучайте языки по ',
    titleWord: 'песням',
    subtitle: 'Добро пожаловать в CantoLex! Мы верим, что настоящие тексты песен — лучший способ прочувствовать живой говор, сленг и грамматику. Анализируйте нюансы, изучайте разборы и подпевайте. Приложение полностью бесплатно и доступно без регистрации.',
    cardTranslationTitle: 'Глубокий перевод',
    cardTranslationDesc: 'Забудьте о сухих словарях. Откройте для себя сленг, метафоры, идиомы и культурный контекст каждой строки.',
    cardFlashcardsTitle: 'Интерактивные карточки',
    cardFlashcardsDesc: 'Сохраняйте интересные фразы и обогащайте свой личный словарь. Колода работает на вашем устройстве в автономном режиме.',
    cardShadowingTitle: 'Практика произношения',
    cardShadowingDesc: 'Повторяйте фразы за исполнителем, тренируйте акцент с помощью микрофона и укрепляйте мышечную память.',
    cta: 'Погнали!',
    closeTooltip: 'Скрыть приветствие',
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
    sourcesTooltip: 'Источники и ресурсы',
    settingsTooltip: 'Настройки текста',
    expandResourcesTooltip: 'Показать дополнительные ресурсы',
    collapseResourcesTooltip: 'Скрыть дополнительные ресурсы',
    toggleSourceLyrics: 'Переключить текст на {lang}',
    toggleTargetTranslation: 'Переключить перевод на {lang}',
    showStarredOnly: 'Показывать только отмеченные строки',
    showTrackerTooltip: 'Показать трекер практики и поиск',
    searchingLyrics: 'Поиск текста песни',
    generatingPreview: 'Создание превью',
    analyzingTrack: 'Анализ песни',
    findingLyrics: 'Поиск текста',
    scanningDatabases: 'Сканирование баз данных',
    consultingGemini: 'Запрос к CantoLex AI',
    checkingLyricsDatabases: 'Проверка баз данных текстинга...',
    analyzingWithAI: 'Анализируем с помощью AI...',
    pollingOfficialSources: 'Делаем запросы к официальным источникам для точного текста песни.',
    detectingLanguageExtracting: 'Определяем язык, авторов и переводим песню.',
    generatingLecture: 'Создание урока',
    deepBreakdown: 'Подробный разбор',
    consultingGeminiShort: 'Опрашиваем CantoLex AI',
    noMatchingLyricLines: 'Нет подходящих строк текста.',
    clearSearch: 'Сбросить поиск',
    fetchingDetails: 'Получение сведений...',
    searchPlaceholder: 'Поиск по тексту...',
    lyricsNotFound: 'Текст не найден',
    manualEntry: 'Ручной ввод',
    retryAiSearch: 'Повторить AI-поиск',
    saveAndAnalyze: 'Сохранить и анализировать',
    lyricsAreMissing: 'Текст отсутствует',
    missingLyricsDesc: 'Оригинальный текст для этой песни еще не был загружен.',
    findLyricsPhrases: 'Найти текст и фразы',
    enterManually: 'Ввести вручную',
    lyricAuthors: 'Авторы текста',
  },
  tracks: {
    title: 'Поиск песен',
    searchPlaceholder: 'Ищите песни, артистов или вставьте ссылку iTunes/Apple Music...',
    searchTracks: 'Поиск треков...',
    searchAlbums: 'Поиск альбомов...',
    searchArtists: 'Поиск исполнителей...',
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
    backToHome: 'На главную',
    recentTracks: 'Недавние песни',
    recentTracksDesc: 'История ваших занятий и последние прослушанные композиции',
    communityTracks: 'Популярные песни',
    communityTracksDesc: 'Песни, добавленные другими пользователями для изучения со всего мира',
    languageLabel: 'Язык:',
    countSelected: 'Выбрано: {count}',
    difficultyLabel: 'Сложность:',
    difficultyBeginner: 'Для начинающих',
    difficultyIntermediate: 'Средний уровень',
    difficultyAdvanced: 'Продвинутый уровень',
    filterByLanguages: 'Фильтр по языкам:',
    clearSelection: 'Сбросить фильтры ({count})',
    noTracksFoundMatching: 'Песен по выбранным фильтерам не найдено.',
    community: 'Сообщество',
    recent: 'История',
    noSongsInCommunity: 'В сообществе пока нет песен.',
    noRecentTracks: 'История изучения пуста. Воспользуйтесь поиском выше!',
    noRecentTracksShort: 'Нет недавних треков.',
  },
  analysis: {
    title: 'AI Анализ и Пояснения',
    regenerate: 'Перегенерировать анализ',
    lyricsMeaning: 'Смысл песни и текста',
    grammarPatterns: 'Основные грамматические структуры и фразы',
    vocabularyList: 'Рабочий список слов',
    culturalContext: 'Культурный и идиоматический контекст',
    noAnalysisYet: 'Анализ пока недоступен. Нажмите «Сгенерировать», чтобы CantoLex AI проанализировал песню!',
    generateAnalysis: 'Создать AI Анализ',
    generatingAnalysis: 'CantoLex AI анализирует текст... Пожалуйста, подождите.',
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
    previewTitle: 'Превью iTunes',
    viewOnItunes: 'Открыть в iTunes Store',
    promotionalSummary: 'Предоставлено в качестве ознакомления. Полная версия трека доступна в iTunes Store.',
    musicPreview: 'Музыкальное превью',
  },
  lineWorkspace: {
    translationPlaceholder: 'Добавить перевод строки...',
    wordPlaceholder: 'Слово или фраза',
    translationPlaceholder2: 'Перевод',
    commentaryPlaceholder: 'Заметки или пояснения...',
    emptyNote: 'Пустая заметка. Нажмите для редактирования...',
    know: 'Знаю',
    learn: 'Учить',
    added: 'Добавлено',
    addPhraseTooltip: 'Добавить фразу',
    addNoteTooltip: 'Добавить заметку',
    regenerateAiTooltip: 'Перегенерировать разбор AI',
    explainWithAiTooltip: 'Разбор AI',
    unsignedWord: '[не заполнено]',
    unsignedTranslation: '[без перевода]',
    options: 'Опции',
    aiRecommendation: 'рекомендация AI',
    manualPhrase: 'ручная фраза',
  },
  dailyProgress: {
    nextGoal: 'Следующая цель',
    perfectStreak: 'Ударный режим!',
    recommendedTarget: 'РЕКОМЕНДУЕМАЯ ЦЕЛЬ',
    exploreTrackTitle: 'Найти песню',
    exploreTrackDesc: 'Найдите композицию и откройте её текст, чтобы начать сегодняшний прогресс.',
    exploreTrackBtn: 'Поиск',
    savePhrasesTitle: 'Сохраняйте фразы',
    savePhrasesDesc: 'Откройте текст песни и сохраните хотя бы 3 фразы для тренировки.',
    savePhrasesDescGuest: 'Изучайте любой трек и добавляйте полезные слова.',
    savePhrasesBtnLyrics: 'К тексту песни',
    savePhrasesBtnExplore: 'Список песен',
    reviewCardsTitle: 'Повторяйте карточки',
    reviewCardsDesc: 'Тренируйте сохранённые слова в меню обучения.',
    reviewCardsBtn: 'Обучение',
    goalCompleteTitle: 'Дневная цель достигнута!',
    goalCompleteDesc: 'Потрясающе! Вы выполнили все задачи на сегодня.',
    goalCompleteBtn: 'Продолжить изучение',
    start: 'Начало',
    ready: 'Готово',
    startTooltip: 'Начало дня: Вы открыли песню дня',
    explore: 'Поиск',
    exploreStepTooltip: 'Шаг 1: Изучить песню ({count}/{target})',
    save: 'Сохранить',
    saveStepTooltip: 'Шаг 2: Сохранить фразы ({count}/{target})',
    review: 'Повторить',
    reviewStepTooltip: 'Шаг 3: Повторить карточки ({count}/{target})',
    dailyMilestones: 'Дневные вехи',
    completed: 'Завершено',
    goalProgress: 'Прогресс цели: {num}%',
  },
  resumeStudy: {
    continueLearning: 'Продолжить обучение',
    returningSession: 'Предыдущая сессия',
    resumeLearning: 'Продолжить песню',
    statusExplore: 'Продолжайте разбирать текст и практиковать произношение.',
    statusSavedPhrases: 'Вы сохранили {count} фраз из этой песни.',
    statusLyricsLoaded: 'Текст песни загружен. Попробуйте создать полный AI-анализ!',
    statusAnalysisReady: 'AI-анализ готов. Читайте текст и практикуйте произношение!',
  },
  nextStep: {
    findingLyrics: 'Поиск текста',
    findingLyricsDesc: 'Ищем оригинальный текст песни в базе данных...',
    translatingLyrics: 'Перевод текста',
    translatingLyricsDesc: 'Анализируем смысл и переводим строки с помощью CantoLex AI',
    analyzingTrack: 'Анализ песни',
    analyzingTrackDesc: 'Обрабатываем грамматические структуры текста',
    generatingLecture: 'Создание учебных материалов',
    generatingLectureDesc: 'Систематизируем новые слова и пояснения',
    processing: 'Обработка...',
    processingDesc: 'Опрашиваем CantoLex AI и готовим материалы для вас',
    excellentProgress: 'Отличный результат!',
    activeProcessing: 'АКТИВНАЯ ОБРАБОТКА',
    nextStepLabel: 'СЛЕДУЮЩИЙ ШАГ',
    getLyricsLabel: 'Загрузить текст',
    getLyricsDesc: 'Найти и загрузить оригинальный текст для этой песни.',
    translateLyricLabel: 'Перевести текст',
    translateLyricDesc: 'Перевести оригинальный текст и проанализировать смысл с помощью CantoLex AI.',
    generateBreakdownLabel: 'Создать разбор',
    generateBreakdownDesc: 'Использовать CantoLex AI для перевода строк и выделения важных грамматических паттернов.',
    startStudyLabel: 'Начать обучение',
    startStudyDesc: 'У вас есть {count} сохраненная фраза для повторения прямо сейчас.',
    savePhrasesLabel: 'Сохранить фразы',
    savePhrasesDesc: 'Изучите созданный разбор, чтобы выбрать и сохранить фразы в карточки.',
    revisitBreakdownLabel: 'Повторить разбор',
    revisitBreakdownDesc: 'Вы полностью разобрали песню! Все карточки актуальны, нет активных повторений.',
  },
  trackProgress: {
    stationLyrics: 'Текст',
    stationAnalysis: 'Разбор',
    stationCards: 'Карточки',
    tooltipCurrent: '{name} (Текущий экран)',
    tooltipView: '{name} (Смотреть)',
    tooltipLocked: '{name} (Готовится)',
  },
  library: {
    title: 'Моя медиатека',
    subtitle: 'Ваша личная библиотека песен для изучения языков',
    searchPlaceholder: 'Поиск избранного, плейлистов, артистов...',
    filterAll: 'Все',
    filterSongs: 'Песни',
    filterPlaylists: 'Плейлисты',
    filterArtists: 'Артисты',
    filterAlbums: 'Альбомы',
    newPlaylist: 'Новый плейлист',
    playlistNamePlaceholder: 'Название плейлиста...',
    createBtn: 'Создать',
    favoriteTracks: 'Любимые песни',
    noMatchSearch: 'Нет песен, соответствующих вашему запросу',
    noFavoritesYet: 'В вашей медиатеке пока нет любимых песен. Добавьте их из меню трека!',
    autoPlaylistBadge: 'Авто',
    songsCount: 'Песен: {count} • {time}',
    minutesLabel: '{count} мин',
    emptyPlaylist: 'пусто',
    noPlaylistsYet: 'У вас пока нет созданных плейлистов.',
    createFirstPlaylist: 'Создать первый плейлист',
    favoriteArtists: 'Любимые исполнители',
    noArtistsYet: 'Исполнители появятся здесь автоматически на основе избранных песен.',
    favoriteAlbums: 'Любимые альбомы',
    backToPlaylists: 'Назад к плейлистам',
    deleteBtn: 'Удалить',
    tracksInPlaylist: 'Группировка треков',
    noTracksInPlaylistYet: 'В этом плейлисте пока нет песен.',
    addSongsTip: 'Добавляйте песни с главного экрана или через поиск с помощью меню с тремя точками!',
    openStudySong: 'Открыть / Изучить песню',
    removeFromFavorites: 'Удалить из избранного',
    addToFavorites: 'Добавить в избранное',
    inFavoritesBadge: 'В избранном',
    addToPlaylist: 'Добавить в плейлист...',
    noPlaylistsAvailable: 'Пока нет плейлистов. Вернитесь назад и сначала создайте плейлист!',
    automaticPlaylistLabel: 'АВТОМАТИЧЕСКИЙ ПЛЕЙЛИСТ',
    playlistLabel: 'ПЛЕЙЛИСТ',
    playlistTotalTracks: 'Всего: {count} треков • {time} мин звучания',
    playlistTotalTracksNone: 'нет песен',
    deletePlaylistConfirm: 'Вы уверены, что хотите удалить этот плейлист?',
  },
  assistant: {
    title: 'Ассистент CantoLex',
    subtitle: 'Изучение фразы / Вопросы',
    anchor: 'Языковой анкор',
    lyricsContext: 'Контекст из текста',
    linkingMetadata: 'Связывание контекстных строк метаданных...',
    interactivePrompts: 'Интерактивные запросы',
    vocabularyLabel: 'Объяснить лексику',
    vocabularyDesc: 'Ключевые словосочетания и слова',
    grammarLabel: 'Объяснить грамматику',
    grammarDesc: 'Структура предложения и спряжения',
    usefulLabel: 'Найти полезные фразы',
    usefulDesc: 'Преобразовать текст в речевые блоки',
    b2Label: 'Объяснить на уровне B2',
    b2Desc: 'Разбор лексики среднего уровня',
    culturalLabel: 'Культурный контекст',
    culturalDesc: 'Метафоры и национальный колорит',
    inputPlaceholder: 'Спросите о нюансах, грамматике, синонимах, регистре или использовании этой фразы...',
    analyzingTitle: 'Анализ текста песни',
    analyzingDesc: 'Советуемся с CantoLex AI, чтобы разобрать грамматические структуры и предложить словосочетания...',
    errorTitle: 'Языковой анализ приостановлен',
    retryBtn: 'Повторить анализ',
    tutorFeedback: 'Отклик AI-репетитора',
    speaking: 'Озвучивание',
    speakText: 'Озвучить текст',
    suggestedTitle: 'Предложенные лексические блоки ({count})',
    suggestedTip: 'Нажмите «Добавить», чтобы включить в список изучения',
    editDetail: 'Редактировать детали блока',
    vocabChunk: 'Лексический блок',
    targetTranslation: 'Перевод на целевой язык',
    clarificationNotes: 'Пояснения / Примечания',
    saveBtn: 'Сохранить',
    cancelBtn: 'Отмена',
    acceptBtn: 'Добавить',
    savedTitle: 'Сохранено в список для изучения ({count})',
    addedBadge: 'Добавлено',
  },
  resources: {
    title: 'Ресурсы и ссылки',
    externalLinks: 'Внешние ссылки',
    lyricsSource: 'Источник текста',
    fetchingLyrics: 'ПОЛУЧЕНИЕ ТЕКСТА',
    analyzingLyrics: 'АНАЛИЗ ТЕКСТА',
    connectingToSource: 'Подключение к источнику...',
    aiBreakdownInProgress: 'AI разбор в процессе...',
    fetchingLyricsDesc: 'Получение текста песни из альтернативных баз данных.',
    analyzingLyricsDesc: 'Определение языка оригинала, построение карт переводов и выравнивание строк.',
    externalLinksDesc: 'Внешние ссылки и материалы для этой песни.',
    trackTitle: 'Название трека',
    artistName: 'Имя исполнителя',
    searching: 'Поиск...',
    searchBtn: 'Найти альтернативный текст',
    searchingAlternative: 'Поиск в альтернативных источниках...',
    availableResults: 'Доступные результаты ({count})',
    noLyricsFound: 'Текст еще не искался или результаты в этот раз отсутствуют',
  },
  lyricsSettings: {
    title: 'Настройки текста',
    sourceLanguage: 'Язык оригинала',
    sourceLanguageDesc: 'Используется для произношения и поиска',
    skipKnown: 'Пропускать знакомые фразы',
    skipKnownDesc: 'Не читать строки, которые вы уже знаете',
    translation: 'Перевод',
    translationDesc: 'Перегенерировать перевод песни',
    translatingStatus: 'Переводим...',
    regenerateBtn: 'Перевести заново',
  },
  phraseAction: {
    title: 'Действие с фразой',
    explanation: 'Пояснение',
    knowIt: 'Я знаю это',
    learn: 'Учить',
    saving: 'Сохранение...',
    thinking: 'Думает...',
    explain: 'Объяснить',
    learning: 'Изучаю',
    known: 'Знаю',
  },
};

const es: TranslationDictionary = {
  common: {
    save: 'Guardar',
    delete: 'Eliminar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    empty: 'Vacío',
    error: 'Error',
    search: 'Buscar...',
    clear: 'Limpiar',
    yes: 'Sí',
    no: 'No',
    confirm: 'Confirmar',
    close: 'Cerrar',
    back: 'Atrás',
    retry: 'Reintentar',
    add: 'Añadir',
    edit: 'Editar',
    done: 'Listo',
    none: 'Ninguno',
    all: 'Todos',
  },
  tabs: {
    preview: 'Vista previa',
    lyrics: 'Letras',
    analysis: 'Análisis',
    cards: 'Tarjetas',
    tracks: 'Canciones',
    library: 'Mi biblioteca',
    study: 'Estudiar',
    settings: 'Ajustes',
  },
  settings: {
    title: 'Ajustes',
    profile: 'Perfil',
    guest: 'Usuario Invitado',
    signInPrompt: 'Inicia sesión para sincronizar tu progreso',
    preferences: 'Preferencias',
    lecturePromptVariant: 'Análisis de Lección de IA',
    lecturePromptVariantCompact: 'Compacto',
    lecturePromptVariantRich: 'Completo',
    lecturePromptVariantDesc: 'Elige la profundidad del ensayo de análisis generado',
    lecturePromptVariantCompactDesc: 'Modo compacto: Genera un análisis lingüístico enfocado y conciso con frases clave. Respuesta más rápida.',
    lecturePromptVariantRichDesc: 'Modo completo: Genera comentarios lingüísticos detallados, Ensayos culturales y modismos exhaustivos. Respuesta detallada.',
    uiLanguage: 'Idioma de la aplicación',
    targetLanguage: 'Idioma de aprendizaje',
    appearance: 'Apariencia',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    themeLyrifyLight: 'Lyrify Claro',
    themeSolarized: 'Solarizado',
    themeSolarizedEmerald: 'Solarizado Esmeralda',
    account: 'Cuenta',
    resetData: 'Restablecer datos de usuario',
    resetDataSub: 'Limpia el historial y las preferencias',
    confirmReset: '¿Confirmar restablecimiento?',
    confirmResetSub: 'Haz clic de nuevo para borrar todo',
    signOut: 'Cerrar sesión',
    signIn: 'Iniciar sesión con Google',
    signInSub: 'Sincroniza tu historial entre dispositivos',
    info: 'Información',
    privacy: 'Política de privacidad',
    version: 'Versión',
  },
  onboarding: {
    welcome: 'Te damos la bienvenida a CantoLex',
    slogan: 'Domina idiomas a través de las canciones, con análisis de letras por IA, práctica de pronunciación y aprendizaje musical inmersivo.',
    getStarted: 'Comenzar',
    badge: 'Dominio del idioma enfocado en invitados',
    title: 'Domina idiomas a través de las canciones',
    titlePre: 'Domina idiomas a través de ',
    titleWord: 'Canciones',
    subtitle: '¡Bienvenido a CantoLex! Creemos que las letras de canciones reales son la mejor manera de absorber el acento natural, la jerga y la gramática. Analiza matices, estudia explicaciones seleccionadas y empieza a cantar. Todo funciona al instante sin necesidad de registrarse.',
    cardTranslationTitle: 'Traducciones profundas de letras',
    cardTranslationDesc: 'Ve más allá de los diccionarios fríos palabra por palabra. Descubre jerga, significados figurados, metáforas y contextos culturales nativos.',
    cardFlashcardsTitle: 'Tarjetas de vocabulario interactivas',
    cardFlashcardsDesc: 'Guarda modismos pegajosos o frases gramaticales directamente en tu mazo de Repetición Espaciada de 5 cajas. Repasa localmente en cualquier momento.',
    cardShadowingTitle: 'Sombreado de voz (Shadowing) y audios',
    cardShadowingDesc: 'Desbloquea bucles de práctica dirigidos. Entrena la pronunciación usando tu micrófono, escucha fragmentos de audio reales y desarrolla memoria muscular al hablar.',
    cta: '¡A cantar!',
    closeTooltip: 'Ocultar introducción',
  },
  lyrics: {
    explanation: 'Explicación',
    listeningMode: 'Escucha',
    shadowingMode: 'Sombreado',
    listeningDesc: 'Sigue la letra y las traducciones a la vez',
    shadowingDesc: 'Practica el habla imitando la canción',
    translationToggle: 'Alternar traducción',
    displayBoth: 'Mostrar ambos',
    displayLyricsOnly: 'Solo letra original',
    displayTranslationOnly: 'Solo traducción',
    studyThisLine: 'Estudiar esta línea',
    starredLines: 'Líneas marcadas',
    noStarredLines: 'Aún no hay líneas marcadas en esta canción',
    lineSaveToDeck: 'Guardar frase en tu mazo',
    tapWordPrompt: 'Toca las palabras o líneas para explorar sus significados',
    pronounceThisLine: 'Practicar pronunciación',
    viewInDictionary: 'Ver en diccionario',
    practiceTracker: 'Seguimiento de práctica',
    noLyrics: 'No hay letra disponible para esta canción',
    sourcesTooltip: 'Fuentes y Recursos',
    settingsTooltip: 'Ajustes de la letra',
    expandResourcesTooltip: 'Expandir recursos',
    collapseResourcesTooltip: 'Contraer recursos',
    toggleSourceLyrics: 'Alternar letra en {lang}',
    toggleTargetTranslation: 'Alternar traducción en {lang}',
    showStarredOnly: 'Mostrar solo líneas marcadas',
    showTrackerTooltip: 'Mostrar seguimiento de práctica y búsqueda',
    searchingLyrics: 'Buscando letra',
    generatingPreview: 'Generando vista previa',
    analyzingTrack: 'Analizando canción',
    findingLyrics: 'Buscando letra',
    scanningDatabases: 'Escaneando bases de datos',
    consultingGemini: 'Consultando a la IA de CantoLex',
    checkingLyricsDatabases: 'Comprobando bases de datos de letras...',
    analyzingWithAI: 'Analizando con IA...',
    pollingOfficialSources: 'Consultando fuentes oficiales para obtener texto de letra de alta precisión.',
    detectingLanguageExtracting: 'Detectando idioma, identificando autores y traduciendo para ti.',
    generatingLecture: 'Generando lección',
    deepBreakdown: 'Desglose profundo',
    consultingGeminiShort: 'Consultando a la IA de CantoLex',
    noMatchingLyricLines: 'No se encontraron líneas coincidentes.',
    clearSearch: 'Limpiar búsqueda',
    fetchingDetails: 'Obteniendo detalles...',
    searchPlaceholder: 'Buscar letra...',
    lyricsNotFound: 'Letra no encontrada',
    manualEntry: 'Entrada manual',
    retryAiSearch: 'Reintentar búsqueda con IA',
    saveAndAnalyze: 'Guardar y Analizar',
    lyricsAreMissing: 'Falta la letra',
    missingLyricsDesc: 'Aún no hemos obtenido el texto original de esta canción.',
    findLyricsPhrases: 'Buscar letras y frases',
    enterManually: 'Ingresar manualmente',
    lyricAuthors: 'Autores de la letra',
  },
  tracks: {
    title: 'Explorar canciones',
    searchPlaceholder: 'Busca canciones, artistas o pega un enlace de iTunes/Apple Music...',
    searchTracks: 'Buscar canciones...',
    searchAlbums: 'Buscar álbumes...',
    searchArtists: 'Buscar artistas...',
    customLyrics: 'O analiza tu propia letra...',
    searchNoResults: 'No se encontraron canciones. ¡Intenta buscar otra cosa o pega un enlace directo de iTunes!',
    weeklyChallenge: 'Desafío semanal de idiomas',
    recommended: 'Recomendado para ti',
    trackAdded: 'Añadido por la comunidad',
    favorites: 'Favoritos',
    artist: 'Artista',
    artists: 'Artistas',
    recentlySearched: 'Búsquedas recientes',
    clearHistory: 'Limpiar historial',
    analyzeLyrics: 'Analizar letra',
    pastePrompt: 'Pega tu propia letra para analizar y estudiar:',
    songTitle: 'Título de la canción',
    pasteLyricsPlaceholder: 'Pega la letra aquí...',
    analyzeBtn: 'Analizar letra',
    backToHome: 'Volver al inicio',
    recentTracks: 'Canciones recientes',
    recentTracksDesc: 'Tu historial de práctica y las canciones estudiadas recientemente',
    communityTracks: 'Canciones de la comunidad',
    communityTracksDesc: 'Canciones populares en los idiomas de aprendizaje compartidas por los miembros',
    languageLabel: 'Idioma:',
    countSelected: '{count} seleccionados',
    difficultyLabel: 'Dificultad:',
    difficultyBeginner: 'Principiante',
    difficultyIntermediate: 'Intermedio',
    difficultyAdvanced: 'Avanzado',
    filterByLanguages: 'Filtrar por idiomas:',
    clearSelection: 'Limpiar selección ({count})',
    noTracksFoundMatching: 'No se encontraron canciones que coincidan con tus filtros.',
    community: 'Comunidad',
    recent: 'Recientes',
    noSongsInCommunity: 'Aún no hay canciones en la comunidad.',
    noRecentTracks: 'Aún no hay canciones recientes. ¡Busca arriba para empezar a estudiar!',
    noRecentTracksShort: 'Aún no hay canciones recientes.',
  },
  analysis: {
    title: 'Información y explicaciones de IA',
    regenerate: 'Regenerar análisis',
    lyricsMeaning: 'Significado de la canción y la letra',
    grammarPatterns: 'Estructuras gramaticales y frases clave',
    vocabularyList: 'Hoja de trabajo de vocabulario principal',
    culturalContext: 'Contexto cultural e idiomático',
    noAnalysisYet: 'Análisis no disponible. ¡Haz clic en generar abajo para que la IA de CantoLex analice esta canción!',
    generateAnalysis: 'Generar análisis de IA',
    generatingAnalysis: 'La IA de CantoLex está analizando la letra... Por favor, espera.',
    saveToDeck: 'Guardar en el mazo',
    saved: 'Guardado',
  },
  cards: {
    title: 'Mazo de Repetición Espaciada',
    reviewTitle: 'Repaso de tarjetas',
    box: 'Caja {num}',
    allLanguages: 'Todos los idiomas',
    studyNow: 'Estudiar {count} tarjetas',
    cardsToReview: '{count} tarjetas listas para repasar',
    noCards: 'Aún no hay tarjetas en tu mazo. ¡Haz clic en las líneas de la letra o en los términos gramaticales para guardarlos!',
    addCard: 'Añadir tarjeta',
    learning: 'Estudiando',
    mastered: 'Dominado',
    streak: 'Racha',
    dailyGoal: 'Meta diaria',
    xp: 'XP',
    nextReview: 'Próximo repaso',
  },
  study: {
    learnPhrase: 'Aprender frase',
    meaning: 'Traducción',
    explanation: 'Contexto de IA',
    pronunciation: 'Práctica de pronunciación',
    record: 'Grabar',
    stop: 'Detener',
    goodState: 'Fácil (Caja +1)',
    hardState: 'Difícil (Reiniciar caja)',
    mastered: '¡Dominado!',
    completed: '¡Sesión de estudio completada!',
    perfectPrompt: '¡Perfecto! Pronunciación sobresaliente.',
    greatJob: '¡Excelente trabajo! Sigue así.',
    keepPracticing: '¡Sigue practicando, te estás acercando!',
    backToDeck: 'Volver al mazo',
    shadowingScore: 'Retroalimentación de sombreado',
  },
  studyBridge: {
    welcomeTitle: 'Prepárate para dominar esta canción',
    welcomeDesc: 'Aprende vocabulario y frases clave en detalle con tarjetas estructuradas utilizando repetición espaciada.',
    startStudying: 'Comenzar a estudiar',
    reviewExisting: 'Repasar {count} tarjetas existentes',
    songsCount: '{count} canciones',
  },
  itunes: {
    previewBy: 'Vista previa proporcionada por',
    previewTitle: 'Vista previa de iTunes',
    viewOnItunes: 'Ver en iTunes',
    promotionalSummary: 'Proporcionado como resumen promocional. Canción completa disponible en la tienda iTunes Store.',
    musicPreview: 'Vista previa de música',
  },
  lineWorkspace: {
    translationPlaceholder: 'Añadir traducción/significado de la línea...',
    wordPlaceholder: 'Palabra o frase',
    translationPlaceholder2: 'Traducción',
    commentaryPlaceholder: 'Detalles del comentario o explicación...',
    emptyNote: 'Nota vacía. Haz clic para comentar...',
    know: 'Conozco',
    learn: 'Estudiar',
    added: 'Añadido',
    addPhraseTooltip: 'Añadir frase',
    addNoteTooltip: 'Añadir nota',
    regenerateAiTooltip: 'Regenerar explicación de IA',
    explainWithAiTooltip: 'Explicar con IA',
    unsignedWord: '[palabra sin firmar]',
    unsignedTranslation: '[traducción sin firmar]',
    options: 'Opciones',
    aiRecommendation: 'recomendación de IA',
    manualPhrase: 'frase manual',
  },
  dailyProgress: {
    nextGoal: 'Siguiente meta',
    perfectStreak: '¡Racha perfecta!',
    recommendedTarget: 'META RECOMENDADA',
    exploreTrackTitle: 'Explorar una canción',
    exploreTrackDesc: 'Busca una canción y carga su letra para comenzar la jornada de hoy.',
    exploreTrackBtn: 'Buscar canciones',
    savePhrasesTitle: 'Guardar nuevas frases',
    savePhrasesDesc: 'Abre la vista de letra y guarda al menos 3 frases para practicar.',
    savePhrasesDescGuest: 'Explora cualquier canción e ingresa palabras o frases en tus marcadores.',
    savePhrasesBtnLyrics: 'Ir a la letra',
    savePhrasesBtnExplore: 'Explorar canciones',
    reviewCardsTitle: 'Repasar tarjetas',
    reviewCardsDesc: 'Entrena con tus tarjetas guardadas en el centro de estudio.',
    reviewCardsBtn: 'Centro de estudio',
    goalCompleteTitle: '¡Meta diaria completada!',
    goalCompleteDesc: '¡Excelente! Has completado todas tus metas de entrenamiento para hoy.',
    goalCompleteBtn: 'Seguir estudiando',
    start: 'Inicio',
    ready: 'Listo',
    startTooltip: 'Inicio del día: Canción abierta',
    explore: 'Explorar',
    exploreStepTooltip: 'Paso 1: Explorar canción ({count}/{target})',
    save: 'Guardar',
    saveStepTooltip: 'Paso 2: Guardar frases ({count}/{target})',
    review: 'Repasar',
    reviewStepTooltip: 'Paso 3: Repasar tarjetas ({count}/{target})',
    dailyMilestones: 'Hitos diarios',
    completed: 'Completado',
    goalProgress: 'Progreso de meta: {num}%',
  },
  resumeStudy: {
    continueLearning: 'Continuar aprendiendo',
    returningSession: 'Volviendo a la sesión',
    resumeLearning: 'Reanudar aprendizaje',
    statusExplore: 'Continúa explorando la letra y la pronunciación.',
    statusSavedPhrases: 'Guardaste {count} frase{plural} de esta canción.',
    statusLyricsLoaded: 'La letra está cargada. ¡Prueba generar un análisis completo de IA!',
    statusAnalysisReady: 'El análisis de IA está listo. ¡Lee la letra y practica el sombreado!',
  },
  nextStep: {
    findingLyrics: 'Buscando letra',
    findingLyricsDesc: 'Buscando en la base de datos de letras originales',
    translatingLyrics: 'Traduciendo letra',
    translatingLyricsDesc: 'Analizando el significado de la canción y traduciendo las líneas con la IA de CantoLex',
    analyzingTrack: 'Analizando canción',
    analyzingTrackDesc: 'Procesando el análisis gramatical con la IA de CantoLex',
    generatingLecture: 'Generando lección',
    generatingLectureDesc: 'Estructurando vocabulario y explicaciones educativas',
    processing: 'Procesando...',
    processingDesc: 'Consultando a la IA de CantoLex y preparando los materiales',
    excellentProgress: '¡Excelente progreso!',
    activeProcessing: 'PROCESAMIENTO ACTIVO',
    nextStepLabel: 'SIGUIENTE PASO',
    getLyricsLabel: 'Obtener letra',
    getLyricsDesc: 'Busca y obtén la letra original de esta canción.',
    translateLyricLabel: 'Traducir letra',
    translateLyricDesc: 'Traduce la letra original y analiza el significado usando la IA de CantoLex.',
    generateBreakdownLabel: 'Generar desglose',
    generateBreakdownDesc: 'Ejecuta la IA de CantoLex para traducir líneas y extraer patrones de vocabulario clave.',
    startStudyLabel: 'Empezar estudio',
    startStudyDesc: 'Tienes {count} frase{plural} guardada{plural} lista{plural} para practicar ahora.',
    savePhrasesLabel: 'Guardar frases',
    savePhrasesDesc: 'Explora el desglose para seleccionar y guardar frases en tus tarjetas.',
    revisitBreakdownLabel: 'Revisar desglose',
    revisitBreakdownDesc: '¡Completaste el desglose de esta canción! Todas tus tarjetas están al día y no hay nada pendiente de repasar.',
  },
  trackProgress: {
    stationLyrics: 'Letra',
    stationAnalysis: 'Desglose',
    stationCards: 'Tarjetas',
    tooltipCurrent: '{name} (Vista actual)',
    tooltipView: '{name} (Clic para abrir)',
    tooltipLocked: '{name} (Siguiente/Bloqueado)',
  },
  library: {
    title: 'Mi biblioteca',
    subtitle: 'Tu biblioteca personal de canciones de aprendizaje',
    searchPlaceholder: 'Buscar favoritos, listas de reproducción, artistas...',
    filterAll: 'Todo',
    filterSongs: 'Canciones',
    filterPlaylists: 'Listas',
    filterArtists: 'Artistas',
    filterAlbums: 'Álbumes',
    newPlaylist: 'Nueva lista',
    playlistNamePlaceholder: 'Nombre de la lista...',
    createBtn: 'Crear',
    favoriteTracks: 'Canciones favoritas',
    noMatchSearch: 'Ninguna canción coincide con tu búsqueda',
    noFavoritesYet: 'Aún no tienes canciones favoritas en tu biblioteca. ¡Añádelas desde el menú de la canción!',
    autoPlaylistBadge: 'Auto',
    songsCount: '{count} canciones • {time}',
    minutesLabel: '{count} min',
    emptyPlaylist: 'vacía',
    noPlaylistsYet: 'Aún no has creado listas de reproducción.',
    createFirstPlaylist: 'Crear primera lista de reproducción',
    favoriteArtists: 'Artistas favoritos',
    noArtistsYet: '¡Los artistas aparecerán automáticamente a partir de tus favoritos! Añádelos manualmente para verlos aquí.',
    favoriteAlbums: 'Álbumes favoritos',
    backToPlaylists: 'Volver a listas de reproducción',
    deleteBtn: 'Eliminar',
    tracksInPlaylist: 'Canciones en la lista',
    noTracksInPlaylistYet: 'No hay canciones en esta lista de reproducción aún.',
    addSongsTip: '¡Añade canciones desde la pestaña de inicio o la búsqueda usando el menú de tres puntos!',
    openStudySong: 'Abrir / Estudiar canción',
    removeFromFavorites: 'Quitar de favoritos',
    addToFavorites: 'Añadir a favoritos',
    inFavoritesBadge: 'En favoritos',
    addToPlaylist: 'Añadir a lista de reproducción...',
    noPlaylistsAvailable: 'Aún no hay listas de reproducción. ¡Vuelve atrás y crea una nueva primero!',
    automaticPlaylistLabel: 'LISTA DE REPRODUCCIÓN AUTOMÁTICA',
    playlistLabel: 'LISTA DE REPRODUCCIÓN',
    playlistTotalTracks: 'Total: {count} canciones • {time} minutos de duración',
    playlistTotalTracksNone: 'sin canciones',
    deletePlaylistConfirm: '¿Estás seguro de que deseas eliminar esta lista de reproducción?',
  },
  assistant: {
    title: 'Asistente de CantoLex',
    subtitle: 'Estudiar frase / Seguimiento',
    anchor: 'Ancla lingüística',
    lyricsContext: 'Contexto de la letra',
    linkingMetadata: 'Líneas contextuales de metadatos de enlace...',
    interactivePrompts: 'Preguntas interactivas',
    vocabularyLabel: 'Explicar vocabulario',
    vocabularyDesc: 'Colocaciones y palabras clave',
    grammarLabel: 'Explicar gramática',
    grammarDesc: 'Estructura de oraciones y conjugaciones',
    usefulLabel: 'Buscar frases útiles',
    usefulDesc: 'Convierte letras en bloques de habla',
    b2Label: 'Explicar en nivel B2',
    b2Desc: 'Explicaciones de vocabulario de nivel medio',
    culturalLabel: 'Contexto cultural',
    culturalDesc: 'Metáforas y contexto del país',
    inputPlaceholder: 'Pregunta sobre matices, gramática, sinónimos, registro o uso de esta frase...',
    analyzingTitle: 'Analizando letra',
    analyzingDesc: 'Consultando a la IA de CantoLex para desglosar estructuras gramaticales y sugerir colocaciones...',
    errorTitle: 'Análisis lingüístico suspendido',
    retryBtn: 'Reintentar análisis',
    tutorFeedback: 'Retroalimentación de tutor de IA',
    speaking: 'Hablando',
    speakText: 'Pronunciar texto',
    suggestedTitle: 'Fragmentos de vocabulario sugeridos ({count})',
    suggestedTip: 'Haz clic en Aceptar para añadir a tu lista de estudio',
    editDetail: 'Editar detalle del bloque',
    vocabChunk: 'Fragmento de vocabulario',
    targetTranslation: 'Traducción al idioma destino',
    clarificationNotes: 'Aclaraciones / Notas',
    saveBtn: 'Guardar',
    cancelBtn: 'Cancelar',
    acceptBtn: 'Aceptar',
    savedTitle: 'Guardados en la lista de estudio ({count})',
    addedBadge: 'Añadido',
  },
  resources: {
    title: 'Recursos y Fuentes',
    externalLinks: 'Enlaces externos',
    lyricsSource: 'Fuente de la letra',
    fetchingLyrics: 'OBTENIENDO LETRA',
    analyzingLyrics: 'ANALIZANDO LETRA',
    connectingToSource: 'Conectando con la fuente...',
    aiBreakdownInProgress: 'Desglose de IA en progreso...',
    fetchingLyricsDesc: 'Recuperando textos de la canción objetivo desde bases de datos de letras alternativas.',
    analyzingLyricsDesc: 'Detectando el idioma de la canción original, creando mapas de traducción y alineaciones de líneas.',
    externalLinksDesc: 'Enlaces externos y materiales para esta canción.',
    trackTitle: 'Título de la canción',
    artistName: 'Nombre del artista',
    searching: 'Buscando...',
    searchBtn: 'Buscar letras alternativas',
    searchingAlternative: 'Buscando en fuentes alternativas...',
    availableResults: 'Resultados disponibles ({count})',
    noLyricsFound: 'Aún no se han buscado letras o no se encontraron resultados arriba',
  },
  lyricsSettings: {
    title: 'Ajustes de la letra',
    sourceLanguage: 'Idioma de origen',
    sourceLanguageDesc: 'Usado para la pronunciación y búsqueda',
    skipKnown: 'Omitir frases conocidas',
    skipKnownDesc: 'No leer las líneas que ya conoces',
    translation: 'Traducción',
    translationDesc: 'Regenerar traducción de la letra',
    translatingStatus: 'Traduciendo...',
    regenerateBtn: 'Regenerar',
  },
  phraseAction: {
    title: 'Acción de frase',
    explanation: 'Explicación',
    knowIt: 'Ya lo sé',
    learn: 'Aprender',
    saving: 'Guardando...',
    thinking: 'Pensando...',
    explain: 'Explicar',
    learning: 'Estudiando',
    known: 'Conocido',
  },
};

const de: TranslationDictionary = {
  common: {
    save: 'Speichern',
    delete: 'Löschen',
    cancel: 'Abbrechen',
    loading: 'Laden...',
    empty: 'Leer',
    error: 'Fehler',
    search: 'Suchen...',
    clear: 'Bereinigen',
    yes: 'Ja',
    no: 'Nein',
    confirm: 'Bestätigen',
    close: 'Schließen',
    back: 'Zurück',
    retry: 'Wiederholen',
    add: 'Hinzufügen',
    edit: 'Bearbeiten',
    done: 'Fertig',
    none: 'Keine',
    all: 'Alle',
  },
  tabs: {
    preview: 'Vorschau',
    lyrics: 'Songtext',
    analysis: 'Analyse',
    cards: 'Karten',
    tracks: 'Titel',
    library: 'Bibliothek',
    study: 'Lernen',
    settings: 'Einstellungen',
  },
  settings: {
    title: 'Einstellungen',
    profile: 'Profil',
    guest: 'Gastbenutzer',
    signInPrompt: 'Anmelden, um Fortschritt zu synchronisieren',
    preferences: 'Präferenzen',
    lecturePromptVariant: 'KI-Lektionsanalyse',
    lecturePromptVariantCompact: 'Kompakt',
    lecturePromptVariantRich: 'Ausführlich',
    lecturePromptVariantDesc: 'Wähle die Tiefe der generierten Analyse',
    lecturePromptVariantCompactDesc: 'Kompakt-Modus: Erstellt eine fokussierte, prägnante linguistische Analyse und Kernphrasen. Schnellere Antwort.',
    lecturePromptVariantRichDesc: 'Ausführlicher Modus: Erstellt tief detaillierte linguistische Kommentare, kulturelle Abhandlungen und erschöpfende Redewendungen. Umfassende Antwort.',
    uiLanguage: 'App-Sprache',
    targetLanguage: 'Lernsprache',
    appearance: 'Aussehen',
    themeDark: 'Dunkel',
    themeLight: 'Hell',
    themeLyrifyLight: 'Lyrify Hell',
    themeSolarized: 'Solarisiert',
    themeSolarizedEmerald: 'Solarisiert Smaragd',
    account: 'Konto',
    resetData: 'Benutzerdaten zurücksetzen',
    resetDataSub: 'Löscht Verlauf und Einstellungen',
    confirmReset: 'Zurücksetzen bestätigen?',
    confirmResetSub: 'Erneut klicken, um alles zu löschen',
    signOut: 'Abmelden',
    signIn: 'Mit Google anmelden',
    signInSub: 'Synchronisiere deinen Verlauf über Geräte hinweg',
    info: 'Informationen',
    privacy: 'Datenschutzerklärung',
    version: 'Version',
  },
  onboarding: {
    welcome: 'Willkommen bei CantoLex',
    slogan: 'Meistere Sprachen durch Songs, mit KI-gestützter Textanalyse, Aussprachetraining und immersivem Musiklernen.',
    getStarted: 'Jetzt starten',
    badge: 'Gast-Zuerst Sprachbeherrschung',
    title: 'Sprachen durch Songs meistern',
    titlePre: 'Sprachen meistern durch ',
    titleWord: 'Songs',
    subtitle: 'Willkommen bei CantoLex! Wir glauben, dass echte Songtexte der absolut beste Weg sind, um natürlichen Akzent, Umgangssprache und Grammatik aufzunehmen. Analysiere Nuancen, lerne kuratierte Erklärungen und fang an zu singen. Alles funktioniert sofort ohne Registrierung für Gäste.',
    cardTranslationTitle: 'Tiefgehende Textübersetzungen',
    cardTranslationDesc: 'Gehe über kalte Wort-für-Wort-Wörterbücher hinaus. Entdecke Slang, übertragene Bedeutungen, Metaphern und muttersprachliche kulturelle Kontexte.',
    cardFlashcardsTitle: 'Interaktive Karteikarten',
    cardFlashcardsDesc: 'Speichere eingängige Redewendungen oder grammatikalische Zeilen direkt in deinem Spaced-Repetition-Kartendeck mit 5 Boxen. Überall offline wiederholen.',
    cardShadowingTitle: 'Mikrofon-Schattensprechen & Audios',
    cardShadowingDesc: 'Schalte gezielte Übungsschleifen frei. Trainiere die Aussprache mit deinem Mikrofon, höre Echtzeit-Schnipsel und baue echte Sprechmuskel-Erinnerung auf.',
    cta: 'Lass uns singen',
    closeTooltip: 'Einführung ausblenden',
  },
  lyrics: {
    explanation: 'Erklärung',
    listeningMode: 'Hören',
    shadowingMode: 'Schattensprechen',
    listeningDesc: 'Folge dem Songtext und den Übersetzungen gleichzeitig',
    shadowingDesc: 'Übe das Sprechen, indem du den Song nachahmst',
    translationToggle: 'Übersetzung umschalten',
    displayBoth: 'Beides anzeigen',
    displayLyricsOnly: 'Nur Songtext',
    displayTranslationOnly: 'Nur Übersetzung',
    studyThisLine: 'Diese Zeile lernen',
    starredLines: 'Markierte Zeilen',
    noStarredLines: 'Noch keine markierten Zeilen in diesem Titel',
    lineSaveToDeck: 'Phrase im Kartendeck speichern',
    tapWordPrompt: 'Tippe auf Wörter oder Zeilen, um die Bedeutung zu erkunden',
    pronounceThisLine: 'Aussprache üben',
    viewInDictionary: 'Im Wörterbuch ansehen',
    practiceTracker: 'Übungsverlauf',
    noLyrics: 'Kein Songtext für diesen Titel verfügbar',
    sourcesTooltip: 'Quellen & Ressourcen',
    settingsTooltip: 'Text-Einstellungen',
    expandResourcesTooltip: 'Ressourcen erweitern',
    collapseResourcesTooltip: 'Ressourcen einklappen',
    toggleSourceLyrics: '{lang}-Songtext umschalten',
    toggleTargetTranslation: '{lang}-Übersetzung umschalten',
    showStarredOnly: 'Nur markierte Zeilen anzeigen',
    showTrackerTooltip: 'Übungsverlauf & Suche anzeigen',
    searchingLyrics: 'Songtext wird gesucht',
    generatingPreview: 'Vorschau wird generiert',
    analyzingTrack: 'Titel wird analysiert',
    findingLyrics: 'Songtext wird gesucht',
    scanningDatabases: 'Datenbanken werden gescannt',
    consultingGemini: 'CantoLex-KI wird konsultiert',
    checkingLyricsDatabases: 'Songtext-Datenbanken werden überprüft...',
    analyzingWithAI: 'Wird mit KI analysiert...',
    pollingOfficialSources: 'Offizielle Quellen werden für hochpräzisen Songtext abgefragt.',
    detectingLanguageExtracting: 'Sprache wird erkannt, Autoren extrahiert und für dich übersetzt.',
    generatingLecture: 'Lektion wird generiert',
    deepBreakdown: 'Tiefenanalyse',
    consultingGeminiShort: 'CantoLex-KI wird konsultiert',
    noMatchingLyricLines: 'Keine passenden Songtext-Zeilen gefunden.',
    clearSearch: 'Suche löschen',
    fetchingDetails: 'Details werden geladen...',
    searchPlaceholder: 'Songtext durchsuchen...',
    lyricsNotFound: 'Songtext nicht gefunden',
    manualEntry: 'Manuelle Eingabe',
    retryAiSearch: 'KI-Suche wiederholen',
    saveAndAnalyze: 'Speichern & Analysieren',
    lyricsAreMissing: 'Songtext fehlt',
    missingLyricsDesc: 'Wir haben den Originaltext für diesen Song noch nicht abgerufen.',
    findLyricsPhrases: 'Songtexte & Phrasen finden',
    enterManually: 'Manuell eingeben',
    lyricAuthors: 'Autoren des Songtexts',
  },
  tracks: {
    title: 'Titel erkunden',
    searchPlaceholder: 'Suche Songs, Künstler oder füge einen iTunes/Apple Music-Link ein...',
    searchTracks: 'Titel suchen...',
    searchAlbums: 'Alben suchen...',
    searchArtists: 'Künstler suchen...',
    customLyrics: 'Oder analysiere deinen eigenen Text...',
    searchNoResults: 'Keine Titel gefunden. Versuche eine andere Suche oder füge einen direkten iTunes-Link ein!',
    weeklyChallenge: 'Wöchentliche Sprachherausforderung',
    recommended: 'Für dich empfohlen',
    trackAdded: 'Von der Community hinzugefügt',
    favorites: 'Favoriten',
    artist: 'Künstler',
    artists: 'Künstler',
    recentlySearched: 'Letzte Suchen',
    clearHistory: 'Verlauf löschen',
    analyzeLyrics: 'Songtext analysieren',
    pastePrompt: 'Füge deinen eigenen Songtext zur Analyse und zum Lernen ein:',
    songTitle: 'Songtitel',
    pasteLyricsPlaceholder: 'Songtext hier einfügen...',
    analyzeBtn: 'Songtext analysieren',
    backToHome: 'Zurück zur Startseite',
    recentTracks: 'Letzte Titel',
    recentTracksDesc: 'Dein Übungsverlauf und kürzlich gelernte Songs',
    communityTracks: 'Community-Titel',
    communityTracksDesc: 'Beliebte Songs in den Lernsprachen, geteilt von Mitgliedern',
    languageLabel: 'Sprache:',
    countSelected: '{count} ausgewählt',
    difficultyLabel: 'Schwierigkeit:',
    difficultyBeginner: 'Anfänger',
    difficultyIntermediate: 'Mittelstufe',
    difficultyAdvanced: 'Fortgeschritten',
    filterByLanguages: 'Nach Sprachen filtern:',
    clearSelection: 'Auswahl aufheben ({count})',
    noTracksFoundMatching: 'Keine Titel gefunden, die deinen Filtern entsprechen.',
    community: 'Community',
    recent: 'Zuletzt',
    noSongsInCommunity: 'Noch keine Songs in der Community.',
    noRecentTracks: 'Noch keine letzten Titel. Suche oben, um mit dem Lernen zu beginnen!',
    noRecentTracksShort: 'Noch keine letzten Titel.',
  },
  analysis: {
    title: 'KI-Erkenntnisse & Erklärungen',
    regenerate: 'Analyse neu generieren',
    lyricsMeaning: 'Bedeutung des Songs & Songtexts',
    grammarPatterns: 'Grammatikstrukturen & Schlüsselphrasen',
    vocabularyList: 'Kern-Vokabelliste',
    culturalContext: 'Kultureller & idiomatischer Kontext',
    noAnalysisYet: 'Analyse nicht verfügbar. Klicke unten auf Generieren, damit die CantoLex-KI diesen Song analysiert!',
    generateAnalysis: 'KI-Analyse generieren',
    generatingAnalysis: 'CantoLex-KI analysiert den Songtext... Bitte warten.',
    saveToDeck: 'Im Kartendeck speichern',
    saved: 'Gespeichert',
  },
  cards: {
    title: 'Spaced-Repetition-Kartendeck',
    reviewTitle: 'Karteikarten wiederholen',
    box: 'Box {num}',
    allLanguages: 'Alle Sprachen',
    studyNow: '{count} Karten lernen',
    cardsToReview: '{count} Karten bereit zur Wiederholung',
    noCards: 'Noch keine Karten in deinem Deck. Klicke auf Songtext-Zeilen oder Grammatikbegriffe, um sie zu speichern!',
    addCard: 'Karte hinzufügen',
    learning: 'Lernen',
    mastered: 'Meisterhaft',
    streak: 'Streak',
    dailyGoal: 'Tagesziel',
    xp: 'XP',
    nextReview: 'Nächste Wiederholung',
  },
  study: {
    learnPhrase: 'Phrase lernen',
    meaning: 'Übersetzung',
    explanation: 'KI-Kontext',
    pronunciation: 'Aussprachetraining',
    record: 'Aufnehmen',
    stop: 'Stoppen',
    goodState: 'Einfach (Box +1)',
    hardState: 'Schwer (Box zurücksetzen)',
    mastered: 'Meisterhaft!',
    completed: 'Lernsitzung abgeschlossen!',
    perfectPrompt: 'Perfekt! Hervorragende Aussprache.',
    greatJob: 'Gute Arbeit! Mach weiter so.',
    keepPracticing: 'Übe weiter, du bist nah dran!',
    backToDeck: 'Zurück zum Deck',
    shadowingScore: 'Schattensprechen-Feedback',
  },
  studyBridge: {
    welcomeTitle: 'Bereite dich darauf vor, diesen Song zu meistern',
    welcomeDesc: 'Lerne Vokabeln und Schlüsselphrasen im Detail mit strukturierten Karteikarten unter Verwendung von Spaced Repetition.',
    startStudying: 'Lernen starten',
    reviewExisting: '{count} bestehende Karten wiederholen',
    songsCount: '{count} Songs',
  },
  itunes: {
    previewBy: 'Vorschau bereitgestellt von',
    previewTitle: 'iTunes-Vorschau',
    viewOnItunes: 'Auf iTunes ansehen',
    promotionalSummary: 'Als Werbezusammenfassung bereitgestellt. Vollständiger Song im iTunes Store erhältlich.',
    musicPreview: 'Musikvorschau',
  },
  lineWorkspace: {
    translationPlaceholder: 'Übersetzung/Bedeutung für die Zeile hinzufügen...',
    wordPlaceholder: 'Wort oder Phrase',
    translationPlaceholder2: 'Übersetzung',
    commentaryPlaceholder: 'Kommentar oder Erklärung im Detail...',
    emptyNote: 'Keine Notiz. Klicken zum Kommentieren...',
    know: 'Kenne ich',
    learn: 'Lernen',
    added: 'Hinzugefügt',
    addPhraseTooltip: 'Phrase hinzufügen',
    addNoteTooltip: 'Notiz hinzufügen',
    regenerateAiTooltip: 'KI-Erklärung neu generieren',
    explainWithAiTooltip: 'Mit KI erklären',
    unsignedWord: '[unsigniertes Wort]',
    unsignedTranslation: '[unsignierte Übersetzung]',
    options: 'Optionen',
    aiRecommendation: 'KI-Empfehlung',
    manualPhrase: 'Manuelle Phrase',
  },
  dailyProgress: {
    nextGoal: 'Nächstes Ziel',
    perfectStreak: 'Perfekter Streak!',
    recommendedTarget: 'EMPFOHLENES ZIEL',
    exploreTrackTitle: 'Einen Song erkunden',
    exploreTrackDesc: 'Suche nach einem Song und lade den Text, um den heutigen Tag zu beginnen.',
    exploreTrackBtn: 'Songs suchen',
    savePhrasesTitle: 'Neue Phrasen speichern',
    savePhrasesDesc: 'Öffne die Songtext-Ansicht und speichere mindestens 3 Phrasen zum Üben.',
    savePhrasesDescGuest: 'Erkunde jeden Song und füge Wörter oder Phrasen zu deinen Lesezeichen hinzu.',
    savePhrasesBtnLyrics: 'Zum Songtext',
    savePhrasesBtnExplore: 'Songs erkunden',
    reviewCardsTitle: 'Karteikarten wiederholen',
    reviewCardsDesc: 'Trainiere mit deinen gespeicherten Karten im Lernzentrum.',
    reviewCardsBtn: 'Lernzentrum',
    goalCompleteTitle: 'Tagesziel erreicht!',
    goalCompleteDesc: 'Ausgezeichnet! Du hast alle deine Trainingsziele für heute erreicht.',
    goalCompleteBtn: 'Weiter lernen',
    start: 'Start',
    ready: 'Bereit',
    startTooltip: 'Tagesanfang: Song geöffnet',
    explore: 'Erkunden',
    exploreStepTooltip: 'Schritt 1: Song erkunden ({count}/{target})',
    save: 'Speichern',
    saveStepTooltip: 'Schritt 2: Phrasen speichern ({count}/{target})',
    review: 'Wiederholen',
    reviewStepTooltip: 'Schritt 3: Karten wiederholen ({count}/{target})',
    dailyMilestones: 'Tägliche Meilensteine',
    completed: 'Abgeschlossen',
    goalProgress: 'Ziel-Fortschritt: {num}%',
  },
  resumeStudy: {
    continueLearning: 'Lernen fortsetzen',
    returningSession: 'Zurück zur Sitzung',
    resumeLearning: 'Lernen wiederaufnehmen',
    statusExplore: 'Erkunde weiterhin den Songtext und die Aussprache.',
    statusSavedPhrases: 'Du hast {count} Phrase{plural} aus diesem Song gespeichert.',
    statusLyricsLoaded: 'Songtext geladen. Versuche, eine vollständige KI-Analyse zu generieren!',
    statusAnalysisReady: 'KI-Analyse ist bereit. Lies den Songtext und übe Schattensprechen!',
  },
  nextStep: {
    findingLyrics: 'Songtext wird gesucht',
    findingLyricsDesc: 'Suche in der Original-Songtextdatenbank',
    translatingLyrics: 'Songtext wird übersetzt',
    translatingLyricsDesc: 'Analyse der Songbedeutung und Übersetzung der Zeilen mit der CantoLex-KI',
    analyzingTrack: 'Song wird analysiert',
    analyzingTrackDesc: 'Verarbeitung der grammatikalischen Analyse mit der CantoLex-KI',
    generatingLecture: 'Lektion wird generiert',
    generatingLectureDesc: 'Strukturierung von Vokabeln und pädagogischen Erklärungen',
    processing: 'Verarbeitung...',
    processingDesc: 'Beratung der CantoLex-KI und Vorbereitung der Materialien',
    excellentProgress: 'Hervorragender Fortschritt!',
    activeProcessing: 'AKTIVE VERARBEITUNG',
    nextStepLabel: 'NÄCHSTER SCHRITT',
    getLyricsLabel: 'Songtext holen',
    getLyricsDesc: 'Finde und hole den Original-Songtext für diesen Song.',
    translateLyricLabel: 'Songtext übersetzen',
    translateLyricDesc: 'Übersetze den Originaltext und analysiere die Bedeutung mit der CantoLex-KI.',
    generateBreakdownLabel: 'Analyse generieren',
    generateBreakdownDesc: 'Führe die CantoLex-KI aus, um Zeilen zu übersetzen und Kern-Vokabelmuster zu extrahieren.',
    startStudyLabel: 'Studium starten',
    startStudyDesc: 'Du hast {count} gespeicherte Phrase{plural} bereit zum sofortigen Üben.',
    savePhrasesLabel: 'Phrasen speichern',
    savePhrasesDesc: 'Erkunde die Analyse, um Phrasen in deinen Karteikarten auszuwählen und zu speichern.',
    revisitBreakdownLabel: 'Analyse erneut ansehen',
    revisitBreakdownDesc: 'Du hast die Analyse für diesen Song abgeschlossen! Alle deine Karten sind auf dem neuesten Stand und es gibt nichts zu wiederholen.',
  },
  trackProgress: {
    stationLyrics: 'Songtext',
    stationAnalysis: 'Analyse',
    stationCards: 'Karten',
    tooltipCurrent: '{name} (Aktuelle Ansicht)',
    tooltipView: '{name} (Klicken zum Öffnen)',
    tooltipLocked: '{name} (Folgend/Gesperrt)',
  },
  library: {
    title: 'Meine Bibliothek',
    subtitle: 'Deine persönliche Bibliothek von Lern-Songs',
    searchPlaceholder: 'Suche Favoriten, Wiedergabelisten, Künstler...',
    filterAll: 'Alle',
    filterSongs: 'Songs',
    filterPlaylists: 'Wiedergabelisten',
    filterArtists: 'Künstler',
    filterAlbums: 'Alben',
    newPlaylist: 'Neue Wiedergabeliste',
    playlistNamePlaceholder: 'Name der Wiedergabeliste...',
    createBtn: 'Erstellen',
    favoriteTracks: 'Lieblings-Songs',
    noMatchSearch: 'Keine Songs entsprechen deiner Suche',
    noFavoritesYet: 'Noch keine Lieblings-Songs in deiner Bibliothek. Füge sie über das Song-Menü hinzu!',
    autoPlaylistBadge: 'Auto',
    songsCount: '{count} Songs • {time}',
    minutesLabel: '{count} Min.',
    emptyPlaylist: 'leer',
    noPlaylistsYet: 'Du hast noch keine Wiedergabelisten erstellt.',
    createFirstPlaylist: 'Erste Wiedergabeliste erstellen',
    favoriteArtists: 'Lieblingskünstler',
    noArtistsYet: 'Künstler werden automatisch aus deinen Favoriten angezeigt! Füge sie manuell hinzu, um sie hier zu sehen.',
    favoriteAlbums: 'Lieblingsalben',
    backToPlaylists: 'Zurück zu Wiedergabelisten',
    deleteBtn: 'Löschen',
    tracksInPlaylist: 'Songs in der Wiedergabeliste',
    noTracksInPlaylistYet: 'Noch keine Songs in dieser Wiedergabeliste.',
    addSongsTip: 'Füge Songs aus dem Home-Tab oder der Suche über das Drei-Punkte-Menü hinzu!',
    openStudySong: 'Song öffnen / lernen',
    removeFromFavorites: 'Aus Favoriten entfernen',
    addToFavorites: 'Zu Favoriten hinzufügen',
    inFavoritesBadge: 'In Favoriten',
    addToPlaylist: 'Zu Wiedergabeliste hinzufügen...',
    noPlaylistsAvailable: 'Noch keine Wiedergabelisten. Gehe zurück und erstelle zuerst eine neue!',
    automaticPlaylistLabel: 'AUTOMATISCHE WIEDERGABELISTE',
    playlistLabel: 'WIEDERGABELISTE',
    playlistTotalTracks: 'Gesamt: {count} Songs • {time} Minuten Spielzeit',
    playlistTotalTracksNone: 'Keine Songs',
    deletePlaylistConfirm: 'Möchtest du diese Wiedergabeliste wirklich löschen?',
  },
  assistant: {
    title: 'CantoLex-Assistent',
    subtitle: 'Phrase lernen / Verlauf',
    anchor: 'Sprachlicher Anker',
    lyricsContext: 'Songtext-Kontext',
    linkingMetadata: 'Kontextuelle Zeilen aus Link-Metadaten...',
    interactivePrompts: 'Interaktive Fragen',
    vocabularyLabel: 'Vokabeln erklären',
    vocabularyDesc: 'Kollokationen und Schlüsselwörter',
    grammarLabel: 'Grammatik erklären',
    grammarDesc: 'Satzstruktur und Konjugationen',
    usefulLabel: 'Nützliche Phrasen finden',
    usefulDesc: 'Songtexte in Sprechbausteine verwandeln',
    b2Label: 'Auf B2-Niveau erklären',
    b2Desc: 'Mittelschwere Vokabelerklärungen',
    culturalLabel: 'Kultureller Kontext',
    culturalDesc: 'Metaphern und Landeskontext',
    inputPlaceholder: 'Frage nach Nuancen, Grammatik, Synonymen, Register oder Verwendung dieser Phrase...',
    analyzingTitle: 'Songtext wird analysiert',
    analyzingDesc: 'CantoLex-KI wird intensiv befragt, um Grammatikstrukturen aufzuschlüsseln...',
    errorTitle: 'Linguistische Analyse ausgesetzt',
    retryBtn: 'Analyse wiederholen',
    tutorFeedback: 'KI-Tutor-Feedback',
    speaking: 'Sprechen',
    speakText: 'Text sprechen',
    suggestedTitle: 'Vorgeschlagene Vokabelstücke ({count})',
    suggestedTip: 'Klicke auf Akzeptieren, um sie zu deiner Lernliste hinzuzufügen',
    editDetail: 'Detail des Blocks bearbeiten',
    vocabChunk: 'Vokabelstück',
    targetTranslation: 'Übersetzung in die Ziel-Sprache',
    clarificationNotes: 'Klarstellungen / Notizen',
    saveBtn: 'Speichern',
    cancelBtn: 'Abbrechen',
    acceptBtn: 'Akzeptieren',
    savedTitle: 'In Lernliste gespeichert ({count})',
    addedBadge: 'Hinzugefügt',
  },
  resources: {
    title: 'Ressourcen & Quellen',
    externalLinks: 'Externe Links',
    lyricsSource: 'Quelle des Songtexts',
    fetchingLyrics: 'SONGTEXT HOLEN',
    analyzingLyrics: 'SONGTEXT ANALYSIEREN',
    connectingToSource: 'Verbindung zur Quelle wird hergestellt...',
    aiBreakdownInProgress: 'KI-Analyse läuft...',
    fetchingLyricsDesc: 'Abrufen von Ziel-Songtexten aus alternativen Songtext-Datenbanken.',
    analyzingLyricsDesc: 'Erkennung der Original-Songsprache, Erstellung von Übersetzungskarten und Zeilen-Ausrichtungen.',
    externalLinksDesc: 'Externe Links und Materialien für diesen Song.',
    trackTitle: 'Songtitel',
    artistName: 'Künstlername',
    searching: 'Suchen...',
    searchBtn: 'Alternative Songtexte suchen',
    searchingAlternative: 'In alternativen Quellen suchen...',
    availableResults: 'Verfügbare Ergebnisse ({count})',
    noLyricsFound: 'Es wurde noch nicht nach Songtexten gesucht oder oben wurden keine Ergebnisse gefunden',
  },
  lyricsSettings: {
    title: 'Text-Einstellungen',
    sourceLanguage: 'Ausgangssprache',
    sourceLanguageDesc: 'Wird für Aussprache und Suche verwendet',
    skipKnown: 'Bekannte Phrasen überspringen',
    skipKnownDesc: 'Zeilen, die du bereits kennst, nicht vorlesen',
    translation: 'Übersetzung',
    translationDesc: 'Songtext-Übersetzung neu generieren',
    translatingStatus: 'Übersetzen...',
    regenerateBtn: 'Neu generieren',
  },
  phraseAction: {
    title: 'Phrasen-Aktion',
    explanation: 'Erklärung',
    knowIt: 'Kenne ich bereits',
    learn: 'Lernen',
    saving: 'Speichern...',
    thinking: 'Nachdenken...',
    explain: 'Erklären',
    learning: 'Lernen',
    known: 'Bekannt',
  },
};

const dictionaries: Record<UiLanguage, TranslationDictionary> = { en, ru, es, de };

interface I18nContextType {
  uiLanguage: UiLanguage;
  setUiLanguage: (lang: UiLanguage) => void;
  t: (keyPath: string, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [uiLanguage, setUiLanguageState] = useState<UiLanguage>(() => {
    const saved = userPreferencesRepository.getPreference('cantolex_ui_lang', 'en');
    return (saved === 'ru' || saved === 'en' || saved === 'es' || saved === 'de') ? saved : 'en';
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
