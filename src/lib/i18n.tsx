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
    themeDark: string;
    themeLight: string;
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
  assistant: {
    title: string;
    subtitle: string;
    linguisticAnchor: string;
    lyricsContext: string;
    linkingMetadata: string;
    interactivePrompts: string;
    presetVocabulary: string;
    presetVocabularyDesc: string;
    presetGrammar: string;
    presetGrammarDesc: string;
    presetPhrases: string;
    presetPhrasesDesc: string;
    presetB2: string;
    presetB2Desc: string;
    presetCultural: string;
    presetCulturalDesc: string;
    textareaPlaceholder: string;
    askTooltip: string;
    loadingTitle: string;
    loadingDesc: string;
    errorTitle: string;
    retryButton: string;
    aiFeedback: string;
    speaking: string;
    speakText: string;
    readExplanationTooltip: string;
    suggestedVocabulary: string;
    suggestedVocabularyDesc: string;
    editTitle: string;
    vocabChunkLabel: string;
    targetTranslationLabel: string;
    clarificationLabel: string;
    editTooltip: string;
    accept: string;
    acceptTooltip: string;
    dismissTooltip: string;
    savedToStudyList: string;
    added: string;
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
    themeDark: 'Dark',
    themeLight: 'Light',
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
  assistant: {
    title: 'CantoLex Assistant',
    subtitle: 'Study Phrase / Follow-up',
    linguisticAnchor: 'Linguistic Anchor',
    lyricsContext: 'Lyrics Context',
    linkingMetadata: 'Linking metadata contextual lines...',
    interactivePrompts: 'Interactive Prompts',
    presetVocabulary: 'Explain vocabulary',
    presetVocabularyDesc: 'Key collocations & words',
    presetGrammar: 'Explain grammar',
    presetGrammarDesc: 'Sentence structure & conjugations',
    presetPhrases: 'Find useful phrases',
    presetPhrasesDesc: 'Convert lyrics into speech blocks',
    presetB2: 'Explain at B2',
    presetB2Desc: 'Mid-level vocabulary explanations',
    presetCultural: 'Cultural context',
    presetCulturalDesc: 'Metaphors & country context',
    textareaPlaceholder: 'Ask about nuances, grammar, synonyms, register, or usage of this phrase...',
    askTooltip: 'Ask assistant',
    loadingTitle: 'Analyzing Lyrics',
    loadingDesc: 'Consulting Gemini to break down grammar structures and suggest collocations...',
    errorTitle: 'Linguistic Analysis Suspended',
    retryButton: 'Retry analysis',
    aiFeedback: 'AI tutor feedback',
    speaking: 'Speaking',
    speakText: 'Speak text',
    readExplanationTooltip: 'Read explanation text',
    suggestedVocabulary: 'Suggested Vocabulary Chunks ({count})',
    suggestedVocabularyDesc: 'Click Accept to add to your study list',
    editTitle: 'Edit block detail',
    vocabChunkLabel: 'Vocabulary chunk',
    targetTranslationLabel: 'Target language translation',
    clarificationLabel: 'Clarification / Notes',
    editTooltip: 'Inline edit before accept',
    accept: 'Accept',
    acceptTooltip: 'Accept suggested phrase',
    dismissTooltip: 'Dismiss suggestion',
    savedToStudyList: 'Saved to Study List ({count})',
    added: 'Added',
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
    translatingLyricsDesc: 'Analyzing track meaning & translating lines with Gemini AI',
    analyzingTrack: 'Analyzing Track',
    analyzingTrackDesc: 'Processing grammatical analysis using Gemini AI',
    generatingLecture: 'Generating Lecture',
    generatingLectureDesc: 'Structuring vocabulary & educational explanations',
    processing: 'Processing...',
    processingDesc: 'Consulting Gemini AI and preparing materials',
    excellentProgress: 'Excellent Progress!',
    activeProcessing: 'ACTIVE PROCESSING',
    nextStepLabel: 'NEXT STEP',
    getLyricsLabel: 'Get Lyrics',
    getLyricsDesc: 'Search and fetch original lyrics for this song.',
    translateLyricLabel: 'Translate Lyrics',
    translateLyricDesc: 'Translate original lyrics and analyze meaning using Gemini AI.',
    generateBreakdownLabel: 'Generate Breakdown',
    generateBreakdownDesc: 'Run Gemini AI to translate lines and extract important vocabulary patterns.',
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
    analyzingDesc: 'Consulting Gemini to break down grammar structures and suggest collocations...',
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
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
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
  assistant: {
    title: 'Ассистент CantoLex',
    subtitle: 'Изучение фразы / Вопросы',
    linguisticAnchor: 'Языковой якорь',
    lyricsContext: 'Контекст песни',
    linkingMetadata: 'Связывание контекстных строк песни...',
    interactivePrompts: 'Быстрые вопросы',
    presetVocabulary: 'Объяснить лексику',
    presetVocabularyDesc: 'Ключевые слова и сочетания',
    presetGrammar: 'Объяснить грамматику',
    presetGrammarDesc: 'Структура предложений и формы слов',
    presetPhrases: 'Найти полезные фразы',
    presetPhrasesDesc: 'Разбить текст на речевые клише',
    presetB2: 'Объяснить на уровне B2',
    presetB2Desc: 'Умеренно сложные выражения и грамматика',
    presetCultural: 'Культурный контекст',
    presetCulturalDesc: 'Идиомы, метафоры и реалии страны',
    textareaPlaceholder: 'Спросите о синонимах, регистре речи, грамматических особенностях или употреблении фразы...',
    askTooltip: 'Отправить вопрос',
    loadingTitle: 'Анализ текста',
    loadingDesc: 'Опрашиваем Gemini, чтобы разобрать грамматику и найти словосочетания...',
    errorTitle: 'Анализ временно приостановлен',
    retryButton: 'Повторить попытку',
    aiFeedback: 'Обратная связь от AI',
    speaking: 'Озвучивание',
    speakText: 'Озвучить текст',
    readExplanationTooltip: 'Прослушать пояснение',
    suggestedVocabulary: 'Рекомендованные слова и фразы ({count})',
    suggestedVocabularyDesc: 'Нажмите «Принять», чтобы добавить их в свой список изучения',
    editTitle: 'Редактировать карточку',
    vocabChunkLabel: 'Фраза',
    targetTranslationLabel: 'Перевод изучаемой фразы',
    clarificationLabel: 'Пояснение / Особенности',
    editTooltip: 'Редактировать перед сохранением',
    accept: 'Принять',
    acceptTooltip: 'Добавить рекомендованную фразу',
    dismissTooltip: 'Отклонить рекомендацию',
    savedToStudyList: 'Добавлено в список изучения ({count})',
    added: 'Добавлено',
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
    translatingLyricsDesc: 'Анализируем смысл и переводим строки с помощью Gemini AI',
    analyzingTrack: 'Анализ песни',
    analyzingTrackDesc: 'Обрабатываем грамматические структуры текста',
    generatingLecture: 'Создание учебных материалов',
    generatingLectureDesc: 'Систематизируем новые слова и пояснения',
    processing: 'Обработка...',
    processingDesc: 'Опрашиваем Gemini AI и готовим материалы для вас',
    excellentProgress: 'Отличный результат!',
    activeProcessing: 'АКТИВНАЯ ОБРАБОТКА',
    nextStepLabel: 'СЛЕДУЮЩИЙ ШАГ',
    getLyricsLabel: 'Загрузить текст',
    getLyricsDesc: 'Найти и загрузить оригинальный текст для этой песни.',
    translateLyricLabel: 'Перевести текст',
    translateLyricDesc: 'Перевести оригинальный текст и проанализировать смысл с помощью Gemini AI.',
    generateBreakdownLabel: 'Создать разбор',
    generateBreakdownDesc: 'Использовать Gemini AI для перевода строк и выделения важных грамматических паттернов.',
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
    analyzingDesc: 'Советуемся с Gemini, чтобы разобрать грамматические структуры и предложить словосочетания...',
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
