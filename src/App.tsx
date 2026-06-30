import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  FileText,
  Music,
  Search,
  Brain,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  ArrowUpLeft,
  X,
  User as UserIcon,
  Settings,
  Pencil,
  CheckCircle2,
  RefreshCw,
  Youtube,
  ListMusic,
  ExternalLink,
  Music2,
  Quote,
  Mic2,
  Activity,
  Disc,
  WifiOff,
  AlertTriangle,
  Headphones,
  SearchCode,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  Loader2,
  Heart,
  MoreVertical,
  FolderHeart,
  Edit3,
  Bookmark,
  AlertCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Track, Artist, Album, AnalysisMode } from "./constants";
import { SUPPORTED_LANGUAGES, isExperimentalLanguage, normalizeLanguageCode, getLanguageCode } from "./lib/languages";
import { useUserCards } from "./hooks/useUserCards";
import { usePlayback } from "./hooks/usePlayback";
import { useLibrarySearch } from "./hooks/useLibrarySearch";
import { useTrackSession } from "./hooks/useTrackSession";
import { useAppUiState } from "./hooks/useAppUiState";
import { WordsTab } from "./components/WordsTab";
import { 
  studyCardsRepository,
  dailyTrackerRepository,
  recentHistoryRepository,
  userPreferencesRepository,
  userDataMaintenanceService,
  libraryRepository,
  ANALYSIS_PROMPT_VERSION, 
  type Flashcard,
  type PhraseStatus,
  aiClient
} from "./application";

import { cn } from "./lib/utils";
import { normalizePhraseKey } from "./services/cardService";
import { auth, testDbConnection } from "./lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import StudyView from "./components/StudyView";
import SettingsView from "./components/SettingsView";
import PhraseDrawer from "./components/PhraseDrawer";
import { acceptSuggestedPhrase, addUserPhrase, editPhrase } from "./services/lyricsAnalysisService";
import { LibraryView } from "./components/LibraryView";
import LanguageSelector from "./components/LanguageSelector";
import { useTranslation } from "./lib/i18n";
import {
  type TrackLyricsData,
  type LyricOption,
  type Phrase,
  saveTrackData,
  getTrackDetails,
  getCachedTrackData,
  generateLineId,
} from "./services/musicService";
import { sqliteService } from "./services/sqliteService";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { setTransientTrack, popTransientTrack, initializeWebNavigation } from "./services/webNavigationAdapter";

import { determineNextStep } from "./services/nextStepService";
import { getTrackStudySummary } from "./services/trackSummaryService";
import { TrackStudyBridge } from "./components/TrackStudyBridge";
import { NextStepCTA } from "./components/NextStepCTA";
const recordPhraseSaved = (date?: Date) => dailyTrackerRepository.recordPhraseSaved(date);
const recordReviewCompleted = (date?: Date) => dailyTrackerRepository.recordReviewCompleted(date);
import { buildTrackProgressViewModel } from "./services/trackProgressService";
import { TrackProgressTracker } from "./components/TrackProgressTracker";
import { TracksHomeShell } from "./components/TracksHomeShell";
import { DailyProgressBlock } from "./components/DailyProgressBlock";
import { ResumeStudyBlock } from "./components/ResumeStudyBlock";
import { AnalysisPhraseWorkspace } from "./components/AnalysisPhraseWorkspace";
import { StructuredAnalysisLecture } from "./components/StructuredAnalysisLecture";
import { LineWorkspace } from "./components/LineWorkspace";



const RESOURCE_TYPES = [
  {
    id: "youtube",
    name: "YouTube",
    subtitle: "Watch official video",
    icon: Youtube,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    hoverBorder: "hover:border-red-500/50",
    hoverBg: "hover:bg-red-500/5",
    getUrl: (track: Track) =>
      track.youtubeUrl ||
      `https://www.youtube.com/results?search_query=${encodeURIComponent(track.artist + " " + track.title + " official video")}`,
  },
  {
    id: "spotify",
    name: "Spotify",
    subtitle: "Listen on Spotify",
    icon: Music2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    hoverBorder: "hover:border-green-500/50",
    hoverBg: "hover:bg-green-500/5",
    getUrl: (track: Track) =>
      track.spotifyUrl ||
      `https://open.spotify.com/search/${encodeURIComponent(track.artist + " " + track.title)}`,
  },
  {
    id: "apple",
    name: "Apple Music",
    subtitle: "Stream on Apple Music",
    icon: Music,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    hoverBorder: "hover:border-pink-500/50",
    hoverBg: "hover:bg-pink-500/5",
    getUrl: (track: Track) =>
      track.appleMusicUrl ||
      `https://music.apple.com/search?term=${encodeURIComponent(track.artist + " " + track.title)}`,
  },
  {
    id: "genius",
    name: "Genius",
    subtitle: "Lyrics & annotation",
    icon: Quote,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    hoverBorder: "hover:border-yellow-500/50",
    hoverBg: "hover:bg-yellow-500/5",
    getUrl: (track: Track) =>
      `https://www.google.com/search?q=site:genius.com+${encodeURIComponent(track.artist + " " + track.title + " lyrics")}`,
  },
  {
    id: "musixmatch",
    name: "Musixmatch",
    subtitle: "Official lyrics data",
    icon: Mic2,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    hoverBorder: "hover:border-orange-500/50",
    hoverBg: "hover:bg-orange-500/5",
    getUrl: (track: Track) =>
      `https://www.google.com/search?q=site:musixmatch.com+${encodeURIComponent(track.artist + " " + track.title + " lyrics")}`,
  },
  {
    id: "lrclib",
    name: "LRCLIB",
    subtitle: "Synced lyrics database",
    icon: FileText,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    hoverBorder: "hover:border-blue-400/50",
    hoverBg: "hover:bg-blue-400/5",
    getUrl: (track: Track) =>
      `https://lrclib.net/search/${encodeURIComponent(track.artist + " " + track.title)}`,
  },
  {
    id: "azlyrics",
    name: "AZLyrics",
    subtitle: "Clean & simple lyrics",
    icon: Search,
    color: "text-zinc-400",
    bgColor: "bg-zinc-400/10",
    hoverBorder: "hover:border-zinc-400/50",
    hoverBg: "hover:bg-zinc-400/5",
    getUrl: (track: Track) =>
      `https://www.google.com/search?q=site:azlyrics.com+${encodeURIComponent(track.artist + " " + track.title)}`,
  },
  {
    id: "lastfm",
    name: "Last.fm",
    subtitle: "Global stats & info",
    icon: Activity,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hoverBorder: "hover:border-blue-500/50",
    hoverBg: "hover:bg-blue-500/5",
    getUrl: (track: Track) =>
      track.lastfmUrl ||
      `https://www.last.fm/search?q=${encodeURIComponent(track.artist + " " + track.title)}`,
  },
];

const generateNoteOriginKey = (
  trackId: string,
  lineId: string | undefined,
  noteText: string,
  noteSourceText: string | undefined,
  indexOrNoteKey: number | string
) => {
  const source = (noteSourceText || noteText || "").trim();
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

interface LyricLineProps {
  line: string;
  i: number;
  isCompact?: boolean;
  alwaysShowTranslation?: boolean;
  displayMode?: "lyrics" | "translation" | "both";
  activeLineIndex: number | null;
  phraseMetadata: Map<string, any>;
  currentTrack: any;
  getPhrasesForLine: (i: number) => any[];
  lineRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  renderHighlightedText: (line: string, phrases: any[]) => React.ReactNode;
  handleLineClick: (line: string, i: number) => void;
  isSaving: boolean;
  isListeningForSpeech: boolean;
  shadowingFeedback: "none" | "correct" | "incorrect";
  shadowingAttempts: number;
  handleToggleStarLine: (index: number) => void;
  lineId?: string;
  targetLanguage?: string;
  onSaveLineExplanation?: (index: number, explanation: any, updatedTranslation?: string) => void;
  onAddNoteToDictionary?: (lineIndex: number, note: any, noteIndex: number, status?: "known" | "learning") => void;
  originKeyMetadata?: Map<string, any>;
  onEditCardFields?: (cardId: string, fields: Partial<any>) => Promise<void>;
}

const LyricLine = ({
  line,
  i,
  isCompact = false,
  alwaysShowTranslation = false,
  displayMode = "both",
  activeLineIndex,
  phraseMetadata,
  currentTrack,
  getPhrasesForLine: _getPhrasesForLine,
  lineRefs,
  renderHighlightedText: _renderHighlightedText,
  handleLineClick,
  isSaving: _isSaving,
  isListeningForSpeech,
  shadowingFeedback,
  shadowingAttempts,
  handleToggleStarLine,
  lineId: _lineId,
  targetLanguage: _targetLanguage,
  onSaveLineExplanation: _onSaveLineExplanation,
  onAddNoteToDictionary: _onAddNoteToDictionary,
  originKeyMetadata: _originKeyMetadata,
  onEditCardFields: _onEditCardFields,
}: LyricLineProps) => {
  const trimmedLine = line.trim();

  if (!trimmedLine && isCompact) return null;
  if (!trimmedLine) return <div className="h-6" />;

  const metadata = phraseMetadata ? phraseMetadata.get(normalizePhraseKey(trimmedLine)) : null;
  const userTrans = metadata?.translatedPhrase;
  const autoTrans = currentTrack?.lines?.[i]?.translation;
  const displayTranslation = userTrans || autoTrans;

  const isLyricsOnly = displayMode === "lyrics";
  const isTranslationOnly = displayMode === "translation";
  const isBoth = displayMode === "both";

  const mainText = isTranslationOnly ? (displayTranslation || line) : line;

  const showUnderTranslation = isBoth || (isLyricsOnly && activeLineIndex === i) || (alwaysShowTranslation && !isTranslationOnly);

  const isStarred = currentTrack?.lines?.[i]?.isStarred;

  return (
    <div 
      className="relative group/line overflow-hidden rounded-[1.5rem] transition-all duration-300"
      ref={(el) => {
        if (!isCompact) {
          if (el) lineRefs.current.set(i, el as HTMLDivElement);
          else lineRefs.current.delete(i);
        }
      }}
    >
      <motion.div
        key={`lyric-line-wrapper-${i}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.01, 1) }}
        className={cn(
          "group relative flex flex-col gap-1 rounded-2xl cursor-pointer z-10 transition-all duration-200 border border-transparent",
          isCompact ? "px-2 sm:px-4 py-0.5" : "px-3 sm:px-6 py-1",
          activeLineIndex === i
            ? "bg-app-card/30 border-app-card-border/10"
            : "hover:bg-app-fg/[0.02]",
        )}
        onClick={() => {
          if (!trimmedLine) return;
          handleLineClick(line, i);
        }}
      >
        <div className="flex items-center w-full relative z-10 pl-1 sm:pl-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-serif leading-snug transition-all duration-300 text-app-fg ml-1",
                activeLineIndex === i
                  ? isCompact ? "text-xl font-bold" : "text-3xl font-bold text-app-fg"
                  : isCompact ? "text-base opacity-90" : "text-xl opacity-80",
              )}
            >
              {mainText || "\u00A0"}
            </p>
          </div>

          {trimmedLine && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStarLine(i);
                }}
                className="p-2 rounded-xl transition-all hover:scale-120 active:scale-90"
              >
                {isStarred ? (
                  <Star size={20} className="fill-amber-400 text-amber-500 drop-shadow-sm" />
                ) : (
                  <Star size={20} className="text-app-fg/20 hover:text-amber-500/80 transition-all" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="relative z-10">
          <AnimatePresence initial={false}>
            {(activeLineIndex === i || alwaysShowTranslation || isBoth) && (
              <motion.div
                key={`translation-block-${i}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 pl-1 sm:pl-2"
              >
                {displayTranslation && showUnderTranslation && (
                  <p
                    className={cn(
                      "font-serif italic text-app-fg opacity-40 transition-all duration-300 ml-1 mt-0.5",
                      isCompact ? "text-xs" : "text-base",
                    )}
                  >
                    {displayTranslation}
                  </p>
                )}

                {activeLineIndex === i && isListeningForSpeech && (
                  <motion.div
                    key={`speech-animation-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mt-4 ml-1 bg-[var(--accent)]/5 border border-[var(--accent)]/10 px-4 py-3 rounded-3xl w-fit shadow-lg shadow-[var(--accent)]/5"
                  >
                    <div className="flex gap-1 items-center h-4 w-6">
                      {[0, 1, 2, 3].map((dot) => (
                        <motion.div
                          key={dot}
                          animate={{
                            height: shadowingFeedback === "none" ? [8, 16, 8] : 10,
                          }}
                          transition={{
                            repeat: shadowingFeedback === "none" ? Infinity : 0,
                            duration: 0.5,
                            delay: dot * 0.12,
                          }}
                          className={cn(
                            "w-1 rounded-full transition-colors duration-300",
                            shadowingFeedback === "correct"
                              ? "bg-green-500"
                              : shadowingFeedback === "incorrect"
                                ? "bg-orange-500"
                                : "bg-[var(--accent)]",
                          )}
                        />
                      ))}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300",
                        shadowingFeedback === "correct"
                          ? "text-green-500"
                          : shadowingFeedback === "incorrect"
                            ? "text-orange-500"
                            : "text-app-fg",
                      )}
                    >
                      {shadowingFeedback === "correct"
                        ? "Perfect!"
                        : shadowingFeedback === "incorrect"
                          ? "Try Again"
                          : "Shadowing..."}
                    </span>

                    {shadowingAttempts > 0 && shadowingFeedback === "none" && (
                      <div className="ml-2 pl-3 border-l border-app-card-border">
                        <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest">
                          Attempt {shadowingAttempts}/3
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const mapTrackLyricsDataToTrack = (data: TrackLyricsData): Track => ({
  id: data.trackId,
  trackId: data.trackId,
  title: data.title,
  artist: data.artist,
  artistId: data.artistId,
  album: data.album || "",
  albumId: data.albumId,
  coverUrl: data.coverUrl || "",
  audioUrl: data.audioUrl,
  sourceLanguage: data.sourceLanguage,
  difficulty: data.difficulty,
  authors: data.authors,
  lyricSource: data.lyricSource
});

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [studyTrackId, setStudyTrackId] = useState<string | undefined>(undefined);
  const [dbConnectionError, setDbConnectionError] = useState(false);

  const {
    currentRoute,
    view,
    goToExplore,
    goToLibrary,
    goToSettings,
    goToStudy,
    goToTrack,
    goToArtist,
    goToAlbum,
    goBack,
  } = useAppNavigation();

  // Initialize Web Navigation Support
  useEffect(() => {
    initializeWebNavigation();
  }, []);

  // Global track overflow menu and database integration states
  const [activeMenuTrack, setActiveMenuTrack] = useState<Track | null>(null);
  const [isAddToPlaylistOpenInApp, setIsAddToPlaylistOpenInApp] = useState(false);
  const [playlistsInApp, setPlaylistsInApp] = useState<any[]>([]);
  const [favoritesInApp, setFavoritesInApp] = useState<Track[]>([]);
  const [favoriteArtistsInApp, setFavoriteArtistsInApp] = useState<Artist[]>([]);
  const [favoriteAlbumsInApp, setFavoriteAlbumsInApp] = useState<Album[]>([]);

  const loadAppLibraryData = async () => {
    try {
      const favs = await libraryRepository.getFavorites();
      const favArtists = await libraryRepository.getFavoriteArtists();
      const favAlbums = await libraryRepository.getFavoriteAlbums();
      const lists = await libraryRepository.getPlaylists();
      setFavoritesInApp(favs || []);
      setFavoriteArtistsInApp(favArtists || []);
      setFavoriteAlbumsInApp(favAlbums || []);
      setPlaylistsInApp(lists || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Initial load
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAppLibraryData();

    // Subscribe to database changes to refresh global layout favorite states
    const unsubscribe = sqliteService.subscribe((event) => {
      if (event === "initialized" || event === "favorites" || event === "playlists") {
        loadAppLibraryData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeMenuTrack) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAppLibraryData();
    }
  }, [activeMenuTrack]);

  const handleToggleFavoriteInApp = async (track: Track) => {
    try {
      await libraryRepository.toggleFavorite(track);
      await loadAppLibraryData();
    } catch (err) {
      console.error(err);
    }
  };

  const isTrackFavoriteInApp = (trackId: string) => {
    return favoritesInApp.some(t => {
      const tid = t.id || t.trackId;
      return tid === trackId;
    });
  };

  const handleToggleFavoriteArtistInApp = async (artist: Artist) => {
    try {
      await libraryRepository.toggleFavoriteArtist(artist);
      await loadAppLibraryData();
    } catch (err) {
      console.error(err);
    }
  };

  const isArtistFavoriteInApp = (artistId: string) => {
    return favoriteArtistsInApp.some(a => String(a.id) === String(artistId));
  };

  const handleToggleFavoriteAlbumInApp = async (album: Album) => {
    try {
      await libraryRepository.toggleFavoriteAlbum(album);
      await loadAppLibraryData();
    } catch (err) {
      console.error(err);
    }
  };

  const isAlbumFavoriteInApp = (albumId: string) => {
    return favoriteAlbumsInApp.some(al => String(al.id) === String(albumId));
  };

  const handleAddTrackToPlaylistInApp = async (playlistId: string, track: Track) => {
    try {
      await libraryRepository.addTrackToPlaylist(playlistId, track);
      await loadAppLibraryData();
      setIsAddToPlaylistOpenInApp(false);
      setActiveMenuTrack(null);
    } catch (err) {
      console.error(err);
    }
  };

  const {
    onboardingCompleted,
    activeTab,
    setActiveTab,
    targetLanguage,
    setTargetLanguage,
    theme,
    setTheme,
    lecturePromptVariant,
    analysisMode,
    lyricsDisplayMode,
    isStarFilterActive,
    previewLyricsMode,
    setPreviewLyricsMode,
    popoverData,
    setPopoverData,
    isEditModalOpen,
    setIsEditModalOpen,
    isLyricsSettingsOpen,
    setIsLyricsSettingsOpen,
    resourceTab,
    setResourceTab,
    editingLine,
    setEditingLine,
    isExplaining,
    isEditingTranslation,
    setIsEditingTranslation,
    isPhraseDrawerOpen,
    setIsPhraseDrawerOpen,
    selectedLineIndexForDrawer,
    
    handleSetLyricsDisplayMode,
    handleToggleStarFilter,
    handleSetLecturePromptVariant,
    handleSetAnalysisMode,
    handleOnboardingDismiss,
    handleOnboardingSelect,
    handleNextStepClick,
    handleExplain,
  } = useAppUiState();

  // Initialize Custom Hooks
  const {
    searchQuery,
    searchEntityType,
    searchResults,
    artistDetails,
    albumDetails,
    isSearchingDetails,
    recentTracks,
    searchHistory,
    isSearchInputFocused,
    isSearching,
    dynamicTracks,
    isLoadingTracks,
    searchContainerRef,
    setSearchQuery,
    setSearchEntityType,
    setIsSearchInputFocused,
    setSearchResults,
    setSearchHistory,
    setRecentTracks,
    setArtistDetails,
    setAlbumDetails,
    handleSearch,
    handleArtistSelect,
    handleAlbumSelect,
    cancelSearchDetails,
    loadCommunityTracks
  } = useLibrarySearch(targetLanguage);

  const {
    currentTrack,
    isLoadingLyrics,
    loadingStep,
    lyricsFetchError,
    analysisError,
    manualLyrics,
    isTranslating,
    isGeneratingAnalysis,
    lyricOptions,
    isSearchingOptions,
    isResourcesOpen,
    setCurrentTrack,
    setLyricsFetchError,
    setManualLyrics,
    setIsResourcesOpen,
    handleTrackSelect: handleTrackSelectRaw,
    handleAnalyzeSong: handleAnalyzeSongRaw,
    handleRegenerateTranslations,
    handleManualLyricsSubmit: handleManualLyricsSubmitRaw,
    handleGenerateAnalysis: handleGenerateAnalysisRaw,
    handleRegenerateAnalysis: handleRegenerateAnalysisRaw,
    handleManualLyricsSearch,
    handleSelectLyricOption: handleSelectLyricOptionRaw,
    handleSourceLanguageOverride,
    handleSwitchAnalysisMode,
    wordFormStats,
    availableAnalysisModes,
    resolvedAnalysisVariant,
    getLexicalItemStatus,
    setLexicalItemStatus
  } = useTrackSession(analysisMode, targetLanguage);

  const {
    phraseMetadata,
    setPhraseMetadata,
    originKeyMetadata,
    isSaving,
    dueCardsCount,
    dailyProgressSummary,
    resumeViewModel,
    loadUserCards,
    getLineStatus,
    handleUpdateStatusLocal,
    handleSetAnalysisPhraseStatus: handleSetAnalysisPhraseStatusRaw,
    recordTrackExploredAction,
    setDailyActivity
  } = useUserCards(recentTracks);

  const usedLanguages = useMemo(() => {
    const langs = new Set<string>();
    if (currentTrack?.sourceLanguage) {
      langs.add(currentTrack.sourceLanguage);
    }
    recentTracks.forEach(t => {
      if (t.sourceLanguage) langs.add(t.sourceLanguage);
    });
    favoritesInApp.forEach(t => {
      if (t.sourceLanguage) langs.add(t.sourceLanguage);
    });
    return Array.from(langs);
  }, [currentTrack?.sourceLanguage, recentTracks, favoritesInApp]);

  const {
    activeLineIndex,
    isPreviewPlaying,
    hasStartedPreview,
    previewProgress,
    previewDuration,
    isReadingAll,
    isListeningForSpeech,
    shadowingFeedback,
    playbackMode,
    shadowingAttempts,
    isMuted,
    skipKnownPhrases,
    previewAudioRef,
    scrollContainerRef,
    lineRefs,
    togglePreviewAudio,
    seekPreview,
    handlePreviewTimeUpdate,
    handlePreviewLoadedMetadata,
    handlePreviewEnded,
    speak,
    toggleReadLyrics,
    changePlaybackMode,
    setIsMuted,
    setSkipKnownPhrases,
    setActiveLineIndex,
    setIsReadingAll,
    setHasStartedPreview,
    setIsPreviewPlaying,
    handleLineClick
  } = usePlayback(currentTrack, phraseMetadata, targetLanguage);

  const [albumPreviewPlayingId, setAlbumPreviewPlayingId] = useState<string | null>(null);
  const albumAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAlbumTrackPreview = (track: Track) => {
    if (albumPreviewPlayingId === track.id) {
      if (albumAudioRef.current) {
        albumAudioRef.current.pause();
      }
      setAlbumPreviewPlayingId(null);
      return;
    }

    if (albumAudioRef.current) {
      albumAudioRef.current.pause();
      albumAudioRef.current = null;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setHasStartedPreview(false);
    setIsPreviewPlaying(false);

    if (track.audioUrl) {
      const audio = new Audio(track.audioUrl);
      albumAudioRef.current = audio;
      audio.play().catch(err => console.error("Failed to play preview:", err));
      setAlbumPreviewPlayingId(track.id);
      audio.onended = () => {
        setAlbumPreviewPlayingId(null);
      };
    } else {
      console.warn("No preview audio URL found on this track");
    }
  };

  const [lyricsSearchTitle, setLyricsSearchTitle] = useState("");
  const [lyricsSearchArtist, setLyricsSearchArtist] = useState("");

  useEffect(() => {
    if (currentTrack) {
      setLyricsSearchTitle(currentTrack.title || "");
      setLyricsSearchArtist(currentTrack.artist || "");
    }
  }, [currentTrack?.trackId]);

  // Stop playback on track/view changes, but keep it playing when switching tabs
  useEffect(() => {
    if (view !== "lyrics") {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (albumAudioRef.current) {
        albumAudioRef.current.pause();
        albumAudioRef.current = null;
      }
      setAlbumPreviewPlayingId(null);
      window.speechSynthesis.cancel();
      setHasStartedPreview(false);
      setIsPreviewPlaying(false);
      setIsReadingAll(false);
    }
  }, [view]);

  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (albumAudioRef.current) {
      albumAudioRef.current.pause();
      albumAudioRef.current = null;
    }
    setAlbumPreviewPlayingId(null);
    window.speechSynthesis.cancel();
    setHasStartedPreview(false);
    setIsPreviewPlaying(false);
    setIsReadingAll(false);
    setIsResourcesExpanded(false);
    setIsToolbarVisible(true);
    lastScrollYRef.current = 0;
  }, [currentTrack?.trackId]);

  // Scroll and Visibility states for the header block
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollYRef = useRef(0);
  const lastUserScrollInteractionTimeRef = useRef(0);
  const resourcesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = resourcesContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsResourcesExpanded(false);
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, []);

  const registerUserScrollInteraction = (e?: React.SyntheticEvent) => {
    if (e && e.type === "mousedown") {
      const target = e.target as HTMLElement;
      if (
        target.closest("button") || 
        target.closest("input") || 
        target.closest("a") || 
        target.closest("[role='button']")
      ) {
        return;
      }
    }
    lastUserScrollInteractionTimeRef.current = Date.now();
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (!container) return;
    const currentScrollY = container.scrollTop;
    
    // Check if the current active tab has content. If not, never hide the toolbar.
    const hasContent = !currentTrack ? false : (
      activeTab === "lyrics" ? !!currentTrack.rawLyrics :
      activeTab === "analysis" ? !!(currentTrack.lectureBlocks && currentTrack.lectureBlocks.length > 0) :
      activeTab === "cards" ? !!(currentTrack.meaning || (currentTrack.phrases && currentTrack.phrases.length > 0) || currentTrack.lines?.some(l => l.phrases && l.phrases.length > 0)) :
      true
    );

    // If the active tab has no content, or the scroll container's scrollable height is too small to comfortably scroll,
    // we keep the toolbar visible to avoid infinite layouts collapsing and page flickering/shaking.
    const maxScrollable = container.scrollHeight - container.clientHeight;
    const isScrollableEnough = maxScrollable > 250;

    if (!hasContent || !isScrollableEnough) {
      setIsScrolledDown(false);
      setIsToolbarVisible(true);
      lastScrollYRef.current = currentScrollY;
      return;
    }

    // Scrolled down past 120px threshold
    const scrolled = currentScrollY > 120;
    setIsScrolledDown(scrolled);

    if (scrolled) {
      const prevScrollY = lastScrollYRef.current;
      const diff = Math.abs(currentScrollY - prevScrollY);
      
      const isInputFocused = document.activeElement && (
        document.activeElement.tagName === "INPUT" || 
        document.activeElement.tagName === "TEXTAREA"
      );

      const isUserScroll = (Date.now() - lastUserScrollInteractionTimeRef.current) < 1200;

      // If there is active manual user scrolling and the toolbar is open, collapse it
      if (diff > 5 && isToolbarVisible && isUserScroll) {
        if (isInputFocused) {
          (document.activeElement as HTMLElement)?.blur();
        }
        setIsToolbarVisible(false);
      }
    } else {
      // Always show inline at the top of the content
      setIsToolbarVisible(true);
    }
    
    lastScrollYRef.current = currentScrollY;
  };

  const [isResourcesExpanded, setIsResourcesExpanded] = useState(false);

  const [trackSearchQuery, setTrackSearchQuery] = useState("");

  // Derived memoized progress View Models
  const nextStepState = useMemo(() => {
    if (!currentTrack) return null;
    const cards = Array.from(phraseMetadata.values()).filter(
      (card) => card.trackId === currentTrack.trackId
    );
    return determineNextStep(currentTrack, cards, new Date());
  }, [currentTrack, phraseMetadata]);

  const trackProgressViewModel = useMemo(() => {
    const cards = Array.from(phraseMetadata.values());
    return buildTrackProgressViewModel(currentTrack, cards);
  }, [currentTrack, phraseMetadata]);

  // UI display handlers

  const handleToggleStarLine = (index: number) => {
    if (!currentTrack) return;
    const updatedLines = currentTrack.lines.map((l: any) => {
      if (l.index === index) {
        return { ...l, isStarred: !l.isStarred };
      }
      return l;
    });

    const updatedTrack = {
      ...currentTrack,
      lines: updatedLines,
    };
    setCurrentTrack(updatedTrack);
    saveTrackData(currentTrack.trackId, updatedTrack);
  };

  const handleSaveLineExplanation = (index: number, explanation: any, updatedTranslation?: string) => {
    if (!currentTrack) return;
    const updatedLines = currentTrack.lines.map((l: any) => {
      if (l.index === index) {
        const updated = { ...l, explanation };
        if (updatedTranslation !== undefined) {
          updated.translation = updatedTranslation;
        }
        return updated;
      }
      return l;
    });

    const updatedTrack = {
      ...currentTrack,
      lines: updatedLines,
    };
    setCurrentTrack(updatedTrack);
    saveTrackData(currentTrack.trackId, updatedTrack);
  };

  const handleAddNoteToDictionary = async (lineIndex: number, note: any, noteIndex: number, status?: "known" | "learning") => {
    if (!currentTrack) return;
    const line = currentTrack.lines[lineIndex];
    if (!line) return;

    // Support both active/raw LineItem structure (original & translation) and saved legacy format (sourceText & text)
    const isPhrase = note.kind === "phrase" || note.original !== undefined;
    
    const phraseText = isPhrase 
      ? (note.original || note.sourceText || "").trim() || line.original
      : "";
    
    const translation = isPhrase
      ? (note.translation || note.text || "").trim()
      : (note.text || "").trim();

    const explanation = isPhrase
      ? (note.explanation || note.text || "")
      : (note.text || "");

    const targetLineId = line.lineId;
    const noteType = note.type || "phrase";

    const keyTranslation = isPhrase ? translation : explanation;
    const keyOriginal = isPhrase ? phraseText : "";

    const noteOriginKey = generateNoteOriginKey(
      currentTrack.trackId,
      targetLineId,
      keyTranslation,
      keyOriginal,
      noteIndex
    );

    try {
      let connectedPhraseId = "";
      let existingPhrase: any = null;
      for (const l of currentTrack.lines) {
        if (l.phrases) {
          existingPhrase = l.phrases.find((p: any) => p.text.toLowerCase().trim() === phraseText.toLowerCase().trim());
          if (existingPhrase) break;
        }
      }

      let updatedTrack = currentTrack;
      if (!existingPhrase) {
        updatedTrack = addUserPhrase(
          currentTrack,
          phraseText,
          translation,
          explanation,
          targetLineId,
          undefined,
          noteType
        );

        for (const l of updatedTrack.lines) {
          if (l.lineId === targetLineId && l.phrases) {
            const newlyAdded = l.phrases.find((p: any) => p.text.toLowerCase().trim() === phraseText.toLowerCase().trim());
            if (newlyAdded) {
              connectedPhraseId = newlyAdded.id;
              break;
            }
          }
        }
        
        saveTrackData(currentTrack.trackId, updatedTrack);
        setCurrentTrack(updatedTrack);
      } else {
        connectedPhraseId = existingPhrase.id;
      }

      await studyCardsRepository.addPhraseToStudy({
        id: noteOriginKey,
        phraseId: connectedPhraseId,
        text: phraseText,
        translation: translation,
        trackId: currentTrack.trackId,
        trackTitle: currentTrack.title,
        artist: currentTrack.artist,
        sourceLanguage: currentTrack.sourceLanguage,
        lineId: targetLineId,
        explanation: explanation,
        type: noteType,
        originType: "line_explanation_note",
        originKey: noteOriginKey,
        entryType: noteType,
        rawText: phraseText,
        rawTranslation: translation,
        rawExplanation: explanation,
        userNote: ""
      } as any, status || "learning");

      await loadUserCards();
    } catch (err) {
      console.error("Failed to save note to dictionary:", err);
    }
  };

  // Synchronized callback action delegates
  const handleTrackSelect = async (track: any) => {
    await handleTrackSelectRaw(track, targetLanguage, {
      recordTrackExploredAction,
      updateRecentTracks: setRecentTracks,
      onSelectClear: () => {
        setActiveLineIndex(null);
        setIsReadingAll(false);
      },
      setView: (v) => {
        if (v === "lyrics") {
          const id = track?.id || track?.trackId;
          if (id) {
            goToTrack(id);
          }
        } else if (v === "study") {
          goToStudy();
        } else if (v === "settings") {
          goToSettings();
        } else if (v === "tracks") {
          goToExplore();
        }
      },
      setActiveTab
    });
  };

  const navigateToTrack = (track: any) => {
    const id = track?.id || track?.trackId;
    if (id && id !== "undefined") {
      setTransientTrack(track);
      goToTrack(id);
    } else {
      handleTrackSelect(track);
    }
  };

  const handleAnalyzeSong = async () => {
    await handleAnalyzeSongRaw(targetLanguage, {
      updateRecentTracks: setRecentTracks,
      loadCommunityTracks
    });
  };

  const handleManualLyricsSubmit = async () => {
    await handleManualLyricsSubmitRaw(targetLanguage, {
      updateRecentTracks: () => setRecentTracks(recentHistoryRepository.getRecentTracks()),
      loadCommunityTracks
    });
  };

  const handleGenerateAnalysis = async (force: boolean = false, customTrack?: TrackLyricsData) => {
    await handleGenerateAnalysisRaw(targetLanguage, { loadCommunityTracks }, force, customTrack);
  };

  const handleSetAnalysisModeAndSwitch = async (mode: AnalysisMode) => {
    handleSetAnalysisMode(mode);
    if (currentTrack) {
      await handleSwitchAnalysisMode(mode, targetLanguage, { loadCommunityTracks });
    }
  };

  const handleRegenerateAnalysis = async () => {
    await handleRegenerateAnalysisRaw(targetLanguage, { loadCommunityTracks });
  };

  const handleSelectLyricOption = async (option: LyricOption) => {
    await handleSelectLyricOptionRaw(option, targetLanguage, { loadCommunityTracks });
  };

  const getPhrasesForLine = (lineIdx: number) => {
    if (!currentTrack || !currentTrack.lines) return [];
    const trackLine = currentTrack.lines.find((l) => l.index === lineIdx);
    if (!trackLine) return [];
    return trackLine.phrases || [];
  };

  const handleSetAnalysisPhraseStatus = async (
    phrase: string,
    translation: string,
    explanation: string,
    status: PhraseStatus,
    type?: string
  ) => {
    await handleSetAnalysisPhraseStatusRaw(phrase, translation, explanation, status, currentTrack, type);
  };

  const handleUpdateStatus = async (card: Flashcard, status: PhraseStatus) => {
    await handleUpdateStatusLocal(card, status);
  };

  const handleExplainDirect = (phrase: string) => {
    handleExplain(phrase, currentTrack);
  };

  const getPlaybackLines = () => {
    if (!currentTrack) return [];
    const isStarred = isStarFilterActive;
    return currentTrack.lines.filter((line) => {
      if (isStarred && !line.isStarred) return false;
      if (skipKnownPhrases) {
        const lineStatus = getLineStatus(line.original);
        if (lineStatus === "known") return false;
      }
      return true;
    });
  };

  const resetUserData = async () => {
    console.log("Resetting user data...");
    await userDataMaintenanceService.clearAllUserData();
    console.log("All user data cleared in repository");
    console.log("Reloading...");
    window.location.reload();
  };

  // Core application visual/status helpers
  const renderDifficultyIndicator = (difficulty?: 'beginner' | 'intermediate' | 'advanced' | number | string, hideLabel: boolean = false) => {
    if (difficulty === undefined) return null;
    
    let label: string;
    let color: string;
    
    if (typeof difficulty === 'number') {
      const score = difficulty;
      if (score > 6) {
        label = "Advanced";
        color = "text-red-500 bg-red-500/10 border-red-500/20";
      } else if (score > 3) {
        label = "Intermediate";
        color = "text-amber-500 bg-amber-500/10 border-amber-500/20";
      } else {
        label = "Beginner";
        color = "text-green-500 bg-green-500/10 border-green-500/20";
      }
      return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize backdrop-blur-md tracking-wider leading-none shadow-sm ${color}`}>
          {hideLabel ? "" : `${label} `}({score}/10)
        </span>
      );
    } else {
      const diffStr = String(difficulty).toLowerCase();
      if (diffStr === 'advanced') {
        label = "Advanced";
        color = "text-red-500 bg-red-500/10 border-red-500/20";
      } else if (diffStr === 'intermediate') {
        label = "Intermediate";
        color = "text-amber-500 bg-amber-500/10 border-amber-500/20";
      } else if (diffStr === 'beginner') {
        label = "Beginner";
        color = "text-green-500 bg-green-500/10 border-green-500/20";
      } else {
        label = String(difficulty);
        color = "text-sky-500 bg-sky-500/10 border-sky-500/20";
      }
      return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize backdrop-blur-md tracking-wider leading-none shadow-sm ${color}`}>
          {label}
        </span>
      );
    }
  };

  const handleOnboardingDismissDirect = () => {
    handleOnboardingDismiss();
  };

  const handleOnboardingSelectDirect = (track: any) => {
    handleOnboardingSelect(track, handleTrackSelect);
  };

  const handleNextStepClickDirect = () => {
    handleNextStepClick(nextStepState);
  };

  const renderHighlightedText = (text: string, phrases: Phrase[]) => {
    if (!phrases || !phrases.length) return text;
    const applicable = phrases.filter((p) =>
      text.toLowerCase().includes(p.text.toLowerCase())
    );
    if (!applicable.length) return text;
    const sorted = [...applicable].sort(
      (a, b) => b.text.length - a.text.length
    );
    const pattern = sorted
      .map((p) => p.text.replace(/[.*+?^$/|[\\\]]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(`(${pattern})`, "gi");
    return text.split(regex).map((part, idx) => {
      const m = sorted.find((p) => p.text.toLowerCase() === part.toLowerCase());
      if (part && m) {
        return (
          <span
            key={part + "_" + idx}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setPopoverData({
                phrase: m.text,
                translation: m.translation || "",
                explanation: m.explanation,
                position: {
                  x: rect.left,
                  y: rect.top + window.scrollY,
                },
              });
            }}
            className={cn(
              "relative inline-flex items-center gap-1 transition-all px-0.5 -mx-0.5 rounded-sm hover:bg-app-accent/5 border-b-2 border-dotted",
              "border-app-fg/20 text-app-fg hover:border-app-fg/40"
            )}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleEditCardFields = async (cardId: string, fields: Partial<any>) => {
    try {
      if (fields.status !== undefined) {
        await studyCardsRepository.updatePhraseStatus(cardId, fields.status);
      }
      
      const { status, ...otherFields } = fields;
      if (Object.keys(otherFields).length > 0) {
        await studyCardsRepository.updateCardFields(cardId, otherFields as any);
      }
      
      if (currentTrack) {
        const cardInMeta = [...(originKeyMetadata?.values() || [])].find(c => c.id === cardId) as any;
        const targetPhraseId = cardInMeta?.phraseId || cardInMeta?.phraseMetadata?.id;
        
        let foundPhraseId = targetPhraseId;
        if (!foundPhraseId) {
          const textToMatching = cardInMeta?.text || fields.text;
          if (textToMatching) {
            for (const l of currentTrack.lines) {
              if (l.phrases) {
                const matched = l.phrases.find((p: any) => p.text.toLowerCase().trim() === textToMatching.toLowerCase().trim());
                if (matched) {
                  foundPhraseId = matched.id;
                  break;
                }
              }
            }
          }
        }
        
        if (foundPhraseId) {
          const phraseUpdates: any = {};
          if (fields.text !== undefined) phraseUpdates.text = fields.text;
          if (fields.translation !== undefined) phraseUpdates.translation = fields.translation;
          if (fields.explanation !== undefined) phraseUpdates.explanation = fields.explanation;
          if (fields.type !== undefined) phraseUpdates.type = fields.type;
          
          const updatedTrack = editPhrase(currentTrack, foundPhraseId, phraseUpdates);
          saveTrackData(currentTrack.trackId, updatedTrack);
          setCurrentTrack(updatedTrack);
        }
      }
      
      await loadUserCards();
    } catch (err) {
      console.error("Failed to edit card from lyrics:", err);
    }
  };

  const handleStudyCardUpdated = async (cardId?: string) => {
    await loadUserCards();
    
    if (cardId && currentTrack) {
      try {
        const allCards = await studyCardsRepository.getCards();
        const updatedCard = allCards.find(c => c.id === cardId);
        if (updatedCard) {
          const targetPhraseId = updatedCard.phraseId || (updatedCard as any).phraseMetadata?.id;
          
          let foundPhraseId = targetPhraseId;
          if (!foundPhraseId) {
            const textToMatching = updatedCard.text;
            for (const l of currentTrack.lines) {
              if (l.phrases) {
                const matched = l.phrases.find((p: any) => p.text.toLowerCase().trim() === textToMatching.toLowerCase().trim());
                if (matched) {
                  foundPhraseId = matched.id;
                  break;
                }
              }
            }
          }
          
          if (foundPhraseId) {
            const phraseUpdates: any = {};
            if (updatedCard.text !== undefined) phraseUpdates.text = updatedCard.text;
            if (updatedCard.translation !== undefined) phraseUpdates.translation = updatedCard.translation;
            if (updatedCard.explanation !== undefined) phraseUpdates.explanation = updatedCard.explanation;
            if (updatedCard.type !== undefined) phraseUpdates.type = updatedCard.type;
            
            const updatedTrack = editPhrase(currentTrack, foundPhraseId, phraseUpdates);
            saveTrackData(currentTrack.trackId, updatedTrack);
            setCurrentTrack(updatedTrack);
          }
        }
      } catch (err) {
        console.error("Failed to sync study edit to track model:", err);
      }
    }
  };

  const renderLyricLine = (
    line: string,
    i: number,
    isCompact: boolean = false,
    alwaysShowTranslation: boolean = false,
    displayModeOverride?: "lyrics" | "translation" | "both"
  ) => {
    return (
      <LyricLine
        key={i}
        line={line}
        i={i}
        isCompact={isCompact}
        alwaysShowTranslation={alwaysShowTranslation}
        displayMode={displayModeOverride || (activeTab === "lyrics" ? lyricsDisplayMode : "both")}
        activeLineIndex={activeLineIndex}
        phraseMetadata={phraseMetadata}
        currentTrack={currentTrack}
        getPhrasesForLine={getPhrasesForLine}
        lineRefs={lineRefs}
        renderHighlightedText={(line, phrases) => renderHighlightedText(line, phrases)}
        handleLineClick={(line, i) => {
          handleLineClick(line, i);
          if (isToolbarVisible && isScrolledDown) {
            setIsToolbarVisible(false);
          }
        }}
        isSaving={isSaving}
        isListeningForSpeech={isListeningForSpeech}
        shadowingFeedback={shadowingFeedback}
        shadowingAttempts={shadowingAttempts}
        handleToggleStarLine={handleToggleStarLine}
        targetLanguage={targetLanguage}
        onSaveLineExplanation={handleSaveLineExplanation}
        onAddNoteToDictionary={handleAddNoteToDictionary}
        originKeyMetadata={originKeyMetadata}
        onEditCardFields={handleEditCardFields}
      />
    );
  };

  // Setup/Synchronize Effects
  useEffect(() => {
    let active = true;

    const syncRouteLoaders = async () => {
      console.log("[RouteLoaderSync] Syncing route:", currentRoute);

      if (currentRoute.type === "explore") {
        setArtistDetails(null);
        setAlbumDetails(null);
      } else if (currentRoute.type === "artist") {
        setAlbumDetails(null);
        // Load details if not loaded or if id is different
        if (!artistDetails || artistDetails.artist.id !== currentRoute.id) {
          await handleArtistSelect(currentRoute.id);
        }
      } else if (currentRoute.type === "album") {
        setArtistDetails(null);
        // Load details if not loaded or if id is different
        if (!albumDetails || albumDetails.album.id !== currentRoute.id) {
          await handleAlbumSelect(currentRoute.id);
        }
      } else if (currentRoute.type === "track") {
        // Load details if not loaded or if id is different
        if (!currentTrack || currentTrack.trackId !== currentRoute.id) {
          const transient = popTransientTrack(currentRoute.id);
          if (transient) {
            await handleTrackSelect(transient);
          } else {
            // Local Cache First Lookup
            const cachedTrack = getCachedTrackData(currentRoute.id);
            if (cachedTrack) {
              console.log("[RouteLoaderSync] Found track in local cache/SQLite, opening instantly:", currentRoute.id);
              await handleTrackSelect(cachedTrack);
            } else {
              // Fallback to external lookup if not in cache
              const trackData = await getTrackDetails(currentRoute.id);
              if (trackData && active) {
                const initialTrack: TrackLyricsData = {
                  trackId: String(trackData.id),
                  itunesTrackId: String(trackData.id),
                  artist: trackData.artist,
                  artistId: trackData.artistId,
                  title: trackData.title,
                  album: trackData.album,
                  albumId: trackData.albumId,
                  coverUrl: trackData.coverUrl,
                  audioUrl: trackData.audioUrl,
                  appleMusicUrl: trackData.appleMusicUrl,
                  rawLyrics: "",
                  source: null,
                  sourceLanguage: "English",
                  lines: [],
                  processingStatus: {
                    stage1_completed: false,
                    stage2_completed: false,
                    stage3_completed: false,
                  },
                  lastUpdated: Date.now(),
                };

                if (active) {
                  await saveTrackData(initialTrack.trackId, initialTrack);
                  await handleTrackSelect(initialTrack);
                }
              }
            }
          }
        }
      }
    };

    syncRouteLoaders();

    return () => {
      active = false;
    };
  }, [
    currentRoute,
    handleArtistSelect,
    handleAlbumSelect,
    handleTrackSelect,
    currentTrack?.trackId,
    artistDetails?.artist.id,
    albumDetails?.album.id
  ]);

  useEffect(() => {
    userPreferencesRepository.setBoolPreference("lyrify_wiped_v3", true);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("[useEffect] Auth state changed:", u?.uid || "Guest");
      setUser((prev) => {
        if (prev?.uid === u?.uid) return prev;
        return u;
      });
    });

    testDbConnection().then((connected) => {
      console.log("[useEffect] DB connected:", connected);
      if (!connected) setDbConnectionError(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (recentTracks.length > 0) {
      loadUserCards();
    }
  }, [recentTracks.length]);

  useEffect(() => {
    setActiveLineIndex(null);
    setIsReadingAll(false);
    window.speechSynthesis.cancel();
  }, [currentTrack?.trackId, user?.uid]);

  useEffect(() => {
    if (currentTrack && currentTrack.lines) {
      setPhraseMetadata((prev) => {
        const next = new Map(prev);
        let changed = false;
        currentTrack.lines.forEach((line) => {
          if (line.phrases) {
            line.phrases.forEach((p: Phrase) => {
              if (!next.has(p.text)) {
                next.set(p.text, {
                  text: p.text,
                  translatedPhrase: p.translation,
                  explanation: p.explanation,
                  status: "new",
                } as any);
                changed = true;
              }
            });
          }
        });
        return changed ? next : prev;
      });
    }
  }, [currentTrack?.lines]);

  useEffect(() => {
    let timeoutId = undefined;
    const activeIdx = activeLineIndex;
    if (activeIdx !== null && (view === "lyrics" || view === "tracks")) {
      const scroll = () => {
        const container = scrollContainerRef.current;
        const el = lineRefs.current.get(activeIdx);
        if (container && el) {
          const containerHeight = container.clientHeight;
          const elHeight = el.clientHeight;
          const relativeTop = el.offsetTop;

          container.scrollTo({
            top: relativeTop - containerHeight / 2 + elHeight / 2,
            behavior: "smooth"
          });
        }
      };

      scroll();
      timeoutId = window.setTimeout(scroll, 100);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeLineIndex, activeTab, view]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    userPreferencesRepository.setPreference("lyrify_theme", theme);
  }, [theme]);

  const handlePopoverAction = async (
    phrase: string,
    status: PhraseStatus,
    translation: string,
    explanation?: string,
  ) => {
    if (!user || !currentTrack) return;

    try {
      const existing = phraseMetadata.get(normalizePhraseKey(phrase));
      if (existing && existing.id) {
        await studyCardsRepository.updatePhraseStatus(existing.id, status);
      } else {
        await studyCardsRepository.addPhraseToStudy({
          text: phrase,
          translation: translation || "...",
          trackId: currentTrack.trackId,
          lineId: '',
          explanation: explanation || "",
          lemmas: [],
          type: 'phrase'
        }, status);
        setDailyActivity(recordPhraseSaved());
      }
      loadUserCards();
    } catch (err) {
      console.error("Popover action failed:", err);
    }
  };
  return (
    <div className="relative h-screen w-full bg-app-bg text-app-fg font-sans overflow-hidden flex flex-col transition-colors duration-300">
      <audio
        ref={previewAudioRef}
        onTimeUpdate={handlePreviewTimeUpdate}
        onLoadedMetadata={handlePreviewLoadedMetadata}
        onEnded={handlePreviewEnded}
        muted={isMuted}
        src={currentTrack?.audioUrl || null}
      />
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-accent-glow transition-all duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--glow-color),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--glow-color),transparent)] opacity-20" />
      </div>

      {/* Header */}
      <header className="relative z-40 flex items-center justify-between px-6 py-3.5 border-b border-app-card-border backdrop-blur-xl bg-app-card">
        <button
          onClick={goToExplore}
          className="flex items-center gap-3.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer text-left focus:outline-none"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-lg"
            style={{
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 15px var(--accent)",
            }}
          >
            <Brain size={18} className="text-white" />
          </div>
          <span className="tracking-tighter text-lg uppercase font-bold text-app-fg">
            Canto<span className="font-light text-app-fg/60">Lex</span>
          </span>
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={goToSettings}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-app-card border border-app-card-border shadow-lg transition-all hover:scale-105 active:scale-95 group overflow-hidden"
          >
            {user?.photoURL && user.photoURL !== "" ? (
              <img
                src={user.photoURL}
                alt={user.displayName || ""}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserIcon size={18} className="text-app-fg opacity-60 group-hover:text-[var(--accent)] transition-colors" />
            )}
          </button>
        </div>

        {/* Floating Trigger button overlapping header and main content */}
        {view === "lyrics" && isScrolledDown && !isToolbarVisible && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-50 animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setIsToolbarVisible(true)}
              className="w-10 h-10 rounded-full bg-app-card border border-app-card-border/90 hover:bg-app-accent hover:text-white hover:border-transparent transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center text-app-fg"
              title="Show Practice Tracker & Search"
            >
              <Menu size={18} />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 overflow-hidden flex flex-col">
        <AnimatePresence>
          {dbConnectionError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center justify-between text-red-500 text-[10px] font-bold uppercase tracking-widest"
            >
              <div className="flex items-center gap-2">
                <WifiOff size={14} />
                <span>
                  Database connection issue. Some features may be unavailable.
                </span>
                <span className="hidden sm:inline opacity-60">
                  Check your internet connection or Firebase setup.
                </span>
              </div>
              <button
                onClick={() => setDbConnectionError(false)}
                className="opacity-40 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === "tracks" && (
            <motion.div
              key="tracks"
              ref={searchContainerRef}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-y-auto w-full scrollbar-hide"
            >
              <div className="max-w-5xl mx-auto w-full px-6 pt-8 pb-32">
              {/* 🎯 Daily Goal Details (Daily Milestones) */}
              {!searchResults.length && !artistDetails && !albumDetails && (
                <DailyProgressBlock
                  summary={dailyProgressSummary}
                  onNavigateToExplore={() => {
                    const el = document.querySelector('input[placeholder*="Search"]');
                    if (el) {
                      (el as HTMLInputElement).focus();
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  onNavigateToStudy={() => goToStudy()}
                  onNavigateToCurrentTrack={() => currentTrack && navigateToTrack(currentTrack)}
                  hasCurrentTrack={!!currentTrack}
                  mode="details"
                />
              )}

              {/* ✨ Daily Progress & Recommended Next Step (Next Goal) */}
              {!searchResults.length && !artistDetails && !albumDetails && (
                <DailyProgressBlock
                  summary={dailyProgressSummary}
                  onNavigateToExplore={() => {
                    const el = document.querySelector('input[placeholder*="Search"]');
                    if (el) {
                      (el as HTMLInputElement).focus();
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  onNavigateToStudy={() => goToStudy()}
                  onNavigateToCurrentTrack={() => currentTrack && navigateToTrack(currentTrack)}
                  hasCurrentTrack={!!currentTrack}
                  mode="next-step"
                />
              )}

              {/* 📚 Continue Learning */}
              {!searchResults.length && !artistDetails && !albumDetails && resumeViewModel && (
                <ResumeStudyBlock
                  viewModel={resumeViewModel}
                  onResumeTrack={navigateToTrack}
                  onResumeStudy={() => goToStudy()}
                />
              )}

              {/* Search Bar */}
              {!artistDetails && !albumDetails && (
                <div className="mb-6">
                  <form onSubmit={handleSearch} className="relative group">
                    <Search
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-app-fg opacity-20 group-focus-within:text-[var(--accent)] transition-colors"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setIsSearchInputFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchInputFocused(false), 200)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchEntityType === "musicTrack" ? t('tracks.searchTracks') :
                        searchEntityType === "album" ? t('tracks.searchAlbums') :
                        t('tracks.searchArtists')
                      }
                      className="w-full bg-app-card border border-app-card-border shadow-app-card rounded-2xl py-5 pl-12 pr-12 text-lg font-medium outline-none transition-all focus:border-app-accent/50"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isSearching ? (
                        <div
                          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                          style={{
                            borderColor: "var(--accent)",
                            borderTopColor: "transparent",
                          }}
                        />
                      ) : (
                        (searchQuery || searchResults.length > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setSearchResults([]);
                              setArtistDetails(null);
                              setAlbumDetails(null);
                            }}
                            className="p-1 hover:bg-app-fg/10 rounded-full transition-colors text-app-fg opacity-40 hover:opacity-100"
                          >
                            <X size={20} />
                          </button>
                        )
                      )}
                    </div>

                    <AnimatePresence>
                      {isSearchInputFocused && searchHistory.length > 0 && !searchResults.length && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute left-0 right-0 top-[calc(100%+8px)] bg-app-card border border-app-card-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="p-3 border-b border-app-card-border flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30 ml-2">Recent Searches</span>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchHistory([]);
                                userPreferencesRepository.removePreference("lyrify_search_history");
                              }}
                              className="text-[10px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 px-2 py-1"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            {searchHistory.map((h, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSearch(undefined, h)}
                                className="w-full text-left px-5 py-3 hover:bg-app-fg/5 transition-colors flex items-center justify-between group/hist"
                              >
                                <div className="flex items-center gap-3">
                                  <Search size={14} className="opacity-20 group-hover/hist:opacity-100 transition-opacity" />
                                  <span className="font-medium">{h}</span>
                                </div>
                                <ArrowUpLeft size={14} className="opacity-0 group-hover/hist:opacity-20 -rotate-45" />
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              )}

              {/* Entity Tabs */}
              {!artistDetails && !albumDetails && searchResults.length > 0 && (
                <div className="flex items-center gap-1 mb-8 p-1 bg-app-fg/5 rounded-2xl w-fit">
                  {(
                    [
                      { id: "musicTrack", label: "Tracks", icon: Music },
                      { id: "album", label: "Albums", icon: Disc },
                      { id: "musicArtist", label: "Artists", icon: UserIcon },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setArtistDetails(null);
                        setAlbumDetails(null);
                        setSearchEntityType(tab.id as any);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                        searchEntityType === tab.id
                          ? "bg-app-card text-app-fg shadow-sm border border-app-card-border/50"
                          : "text-app-fg/40 hover:text-app-fg/60"
                      )}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Search Results and Details */}
              <AnimatePresence mode="wait">
                {isSearchingDetails ? (
                  <motion.div
                    key="details-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <div
                      className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4"
                      style={{
                        borderColor: "var(--accent)",
                        borderTopColor: "transparent",
                      }}
                    />
                    <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-6">{t('lyrics.fetchingDetails')}</p>
                    <button
                      onClick={cancelSearchDetails}
                      className="px-6 py-2 rounded-xl bg-app-card border border-app-card-border text-[10px] font-black uppercase tracking-widest hover:bg-app-card/80 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </motion.div>
                ) : albumDetails ? (
                  <motion.div
                    key={`album-${albumDetails.album.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 pb-12"
                  >
                    <div className="flex gap-6 items-end">
                      <div className="relative group">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goBack({ type: "explore" });
                          }}
                          className="absolute -top-2 -left-2 z-10 p-2 bg-app-card border border-app-card-border shadow-lg rounded-xl hover:scale-110 transition-transform"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        {albumDetails.album.coverUrl && albumDetails.album.coverUrl !== "" ? (
                          <img src={albumDetails.album.coverUrl} className="w-40 h-40 md:w-56 md:h-56 rounded-3xl shadow-2xl border border-app-card-border" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-40 h-40 md:w-56 md:h-56 rounded-3xl bg-app-fg/5 border border-app-card-border flex items-center justify-center text-app-fg/30 shadow-2xl shrink-0">
                            <Disc size={56} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-2xl md:text-3xl font-black text-app-fg leading-tight truncate">{albumDetails.album.title}</h2>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavoriteAlbumInApp(albumDetails.album);
                            }}
                            className="p-1.5 hover:bg-app-fg/5 rounded-full transition-colors shrink-0"
                            title={isAlbumFavoriteInApp(albumDetails.album.id) ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Heart
                              size={20}
                              className={cn(
                                "transition-all duration-300",
                                isAlbumFavoriteInApp(albumDetails.album.id)
                                  ? "fill-red-500 text-red-500 scale-110"
                                  : "text-app-fg/30 hover:text-red-500/85 hover:scale-105"
                              )}
                            />
                          </button>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (albumDetails.album.artistId && !albumDetails.album.artistId.startsWith("artist-") && albumDetails.album.artistId !== "undefined") {
                              goToArtist(albumDetails.album.artistId);
                            } else {
                              handleArtistSelect(albumDetails.album.artistId);
                            }
                          }}
                          className="text-app-muted hover:text-app-accent font-bold transition-colors"
                        >
                          {albumDetails.album.artist}
                        </button>
                        <div className="flex gap-3 items-center mt-2">
                          {(() => {
                            const url = albumDetails.album.appleMusicUrl || `https://music.apple.com/search?term=${encodeURIComponent(albumDetails.album.title + ' ' + albumDetails.album.artist)}`;
                            return (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-card-border bg-app-card/35 hover:bg-app-card transition-colors text-[10px] font-bold uppercase tracking-wider text-app-muted hover:text-app-fg"
                              >
                                <Music size={11} className="text-pink-500" />
                                <span>Apple Music</span>
                              </a>
                            );
                          })()}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-4 opacity-50">
                          {albumDetails.album.trackCount || 0} Tracks • {albumDetails.album.releaseDate ? new Date(albumDetails.album.releaseDate).getFullYear() : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-app-card border border-app-card-border rounded-3xl overflow-hidden shadow-app-card">
                      {albumDetails.tracks.length > 0 ? (
                        albumDetails.tracks.map((track, idx) => {
                          const isThisPlaying = albumPreviewPlayingId === track.id;
                          return (
                            <button
                              key={`${track.id || 'track'}_${idx}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToTrack(track);
                              }}
                              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-app-fg/5 transition-colors text-left border-b border-app-card-border last:border-0"
                            >
                              <span className="text-xs font-black opacity-20 w-4 shrink-0">{idx + 1}</span>
                              
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayAlbumTrackPreview(track);
                                }}
                                className={cn(
                                  "p-2 rounded-full transition-all flex items-center justify-center shrink-0 border cursor-pointer active:scale-95",
                                  isThisPlaying
                                    ? "bg-pink-500 text-white border-pink-500 scale-105 shadow-md shadow-pink-500/20"
                                    : "bg-app-bg text-app-fg/40 border-app-card-border hover:text-app-fg hover:border-app-fg/35"
                                )}
                              >
                                {isThisPlaying ? (
                                  <Pause size={10} fill="currentColor" />
                                ) : (
                                  <Play size={10} className="ml-0.5" fill="currentColor" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <AnimatePresence>
                                  {isThisPlaying && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                      animate={{ opacity: 1, scale: 1, x: 0 }}
                                      exit={{ opacity: 0, scale: 0.8, x: -10 }}
                                      transition={{ duration: 0.2 }}
                                      className="shrink-0"
                                    >
                                      <a
                                        href={track.appleMusicUrl || `https://music.apple.com/search?term=${encodeURIComponent(track.title + ' ' + track.artist)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => {
                                          e.stopPropagation(); // prevent card click
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-pink-500/20 bg-pink-500/5 text-pink-500 hover:bg-pink-500/10 transition-colors text-[9px] font-bold uppercase tracking-wider"
                                      >
                                        <Music size={9} className="fill-none mr-0.5" />
                                        <span>Apple Music</span>
                                      </a>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <p className="font-bold text-app-fg truncate leading-none py-1">{track.title}</p>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center opacity-40">
                          <Music size={40} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-bold uppercase tracking-widest">No tracks found for this album</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : artistDetails ? (
                  <motion.div
                    key={`artist-${artistDetails.artist.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8 pb-12"
                  >
                    <div className="flex items-center gap-6">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goBack({ type: "explore" });
                        }}
                        className="p-2 hover:bg-app-fg/5 rounded-xl transition-colors shrink-0"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      
                      {artistDetails.artist.artworkUrl && artistDetails.artist.artworkUrl !== "" && (
                        <img 
                          src={artistDetails.artist.artworkUrl} 
                          className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-lg border-2 border-app-card-border" 
                          alt={artistDetails.artist.name}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <h2 className="text-3xl font-black text-app-fg truncate">{artistDetails.artist.name}</h2>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavoriteArtistInApp(artistDetails.artist);
                            }}
                            className="p-1.5 hover:bg-app-fg/5 rounded-full transition-colors shrink-0"
                            title={isArtistFavoriteInApp(artistDetails.artist.id) ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Heart
                              size={22}
                              className={cn(
                                "transition-all duration-300",
                                isArtistFavoriteInApp(artistDetails.artist.id)
                                  ? "fill-red-500 text-red-500 scale-110"
                                  : "text-app-fg/30 hover:text-red-500/85 hover:scale-105"
                              )}
                            />
                          </button>
                        </div>
                        <p className="text-sm text-app-muted uppercase tracking-widest mb-2.5">{artistDetails.artist.genre}</p>
                        {(() => {
                          const url = artistDetails.artist.appleMusicUrl || artistDetails.artist.artistLinkUrl || `https://music.apple.com/search?term=${encodeURIComponent(artistDetails.artist.name)}`;
                          return (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-card-border bg-app-card/35 hover:bg-app-card transition-colors text-[10px] font-bold uppercase tracking-wider text-app-muted hover:text-app-fg"
                            >
                              <Music size={11} className="text-pink-500" />
                              <span>Apple Music</span>
                            </a>
                          );
                        })()}
                      </div>
                    </div>

                    {artistDetails.topTracks.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-app-fg opacity-40 mb-4 px-2">Top Tracks</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {artistDetails.topTracks.map((track, idx) => (
                            <button
                              key={`${track.id || 'track'}_${idx}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToTrack(track);
                              }}
                              className="flex items-center gap-4 p-3 rounded-2xl bg-app-card border border-app-card-border shadow-sm hover:border-app-accent/30 transition-all text-left"
                            >
                              {track.coverUrl && track.coverUrl !== "" ? (
                                <img src={track.coverUrl} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-app-fg/5 border border-app-card-border flex items-center justify-center text-app-fg/30 shrink-0">
                                  <Disc size={18} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{track.title}</p>
                                <p className="text-[10px] text-app-muted truncate">{track.album || "Unknown Album"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {artistDetails.albums.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-app-fg opacity-40 mb-4 px-2">Albums</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {artistDetails.albums.map((album, idx) => (
                            <button
                              key={`${album.id || 'album'}_${idx}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (album.id && !album.id.startsWith("album-") && album.id !== "undefined") {
                                  goToAlbum(album.id);
                                } else {
                                  handleAlbumSelect(album.id);
                                }
                              }}
                              className="group text-left space-y-2"
                            >
                              <div className="aspect-square rounded-2xl overflow-hidden bg-app-card border border-app-card-border shadow-sm group-hover:shadow-md transition-all flex items-center justify-center">
                                {album.coverUrl && album.coverUrl !== "" ? (
                                  <img src={album.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                                ) : (
                                  <Disc size={32} className="text-app-fg/10" />
                                )}
                              </div>
                              <div className="px-1">
                                <p className="font-bold text-xs truncate leading-tight">{album.title}</p>
                                <p className="text-[10px] text-app-muted">{album.releaseDate ? new Date(album.releaseDate).getFullYear() : "N/A"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="search-main"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Library Tabs (Search context) */}
                    {!searchResults.length && (
                      <TracksHomeShell
                        onboardingCompleted={onboardingCompleted}
                        recentTracks={recentTracks}
                        onSelectOnboardingTrack={handleOnboardingSelectDirect}
                        onDismissOnboarding={handleOnboardingDismissDirect}
                        resumeViewModel={resumeViewModel}
                        onTrackSelect={navigateToTrack}
                        onNavigateToStudy={() => goToStudy()}
                        dailyProgressSummary={dailyProgressSummary}
                        currentTrack={currentTrack}
                        onNavigateToLyrics={() => currentTrack && navigateToTrack(currentTrack)}
                        dynamicTracks={dynamicTracks}
                        isLoadingTracks={isLoadingTracks}
                        onTrackMenuOpen={setActiveMenuTrack}
                      />
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mb-12">
                        <h2
                          className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 px-2 opacity-50"
                        >
                          Results
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {searchResults.map((item, idx) => (
                            <div
                              key={`${item.id || 'search'}_${idx}`}
                              onClick={() => {
                                if (searchEntityType === "musicTrack") {
                                  navigateToTrack(item);
                                } else if (searchEntityType === "album") {
                                  if (item.id && !item.id.startsWith("album-") && item.id !== "undefined") {
                                    goToAlbum(item.id);
                                  } else {
                                    handleAlbumSelect(item.id);
                                  }
                                } else if (searchEntityType === "musicArtist") {
                                  if (item.id && !item.id.startsWith("artist-") && item.id !== "undefined") {
                                    goToArtist(item.id);
                                  } else {
                                    handleArtistSelect(item.id);
                                  }
                                }
                              }}
                              className="flex items-center gap-4 p-3 rounded-2xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80 group text-left cursor-pointer"
                            >
                              {item.coverUrl && item.coverUrl !== "" ? (
                                <img
                                  src={item.coverUrl}
                                  className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-app-fg/5 flex items-center justify-center text-app-fg/20">
                                  {searchEntityType === "musicArtist" ? <UserIcon size={24} /> : <Disc size={24} />}
                                </div>
                              )}
                              <div className="text-left overflow-hidden flex-1 min-w-0">
                                <p className="font-bold text-app-fg leading-tight truncate">
                                  {item.title || item.name}
                                </p>
                                <p className="text-[10px] font-bold text-app-muted truncate uppercase tracking-widest mt-1">
                                  {item.artist || item.genre || "Artist"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {searchEntityType === "musicTrack" && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveMenuTrack(item)}
                                    className="p-2 text-app-muted hover:text-app-fg hover:bg-app-fg/5 rounded-full transition-all"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                )}
                                <ChevronRight size={16} className="text-app-fg opacity-0 group-hover:opacity-20 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </motion.div>
          )}

          {view === "lyrics" && currentTrack && (
            <motion.div
              key={`lyrics-${currentTrack.trackId}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col overflow-hidden relative"
            >
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onWheel={registerUserScrollInteraction}
                onTouchStart={registerUserScrollInteraction}
                onTouchMove={registerUserScrollInteraction}
                onMouseDown={registerUserScrollInteraction}
                className="flex-1 overflow-y-auto scrollbar-hide relative w-full"
              >
                <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-0 sm:pt-0 pb-12">
                <div className="mb-2 px-3 sm:px-6 pt-6 sm:pt-8 animate-in fade-in duration-300">
                  {isLoadingLyrics && (
                    <div className="flex items-center justify-end h-6 mb-1">
                      <div className={cn(
                        "flex items-center gap-2 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase animate-pulse leading-none shrink-0",
                        loadingStep === "searching" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]"
                      )}>
                        <RefreshCw
                          size={10}
                          className={cn(
                            "animate-spin",
                            loadingStep === "searching" ? "text-amber-500 duration-[2s]" : "text-[var(--accent)] duration-700"
                          )}
                        />
                        <span>
                          {loadingStep === "searching" ? t('lyrics.searchingLyrics') : 
                           (loadingStep === "meaning" || loadingStep === "translating") ? t('lyrics.generatingPreview') : t('lyrics.analyzingTrack')}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-0 pb-1">
                    <div className="flex flex-col gap-4 select-none">
                      <div className="flex gap-4 sm:gap-6 items-start">
                        {/* Left Column: Cover with Absolute Back button above top left */}
                        <div className="relative group shrink-0">
                          {/* Elegant back button positioned absolute -top-2 -left-2 */}
                          <button
                            type="button"
                            onClick={() => goBack({ type: "explore" })}
                            className="absolute -top-2 -left-2 z-10 p-2 bg-app-card border border-app-card-border shadow-lg rounded-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            title={t('common.back')}
                          >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-app-fg" />
                          </button>

                          {/* Large cover image */}
                          {currentTrack.coverUrl && currentTrack.coverUrl !== "" ? (
                            <button 
                              onClick={() => {
                                if (currentTrack.albumId && !currentTrack.albumId.startsWith("album-") && currentTrack.albumId !== "undefined") {
                                  goToAlbum(currentTrack.albumId);
                                } else if (currentTrack.albumId) {
                                  handleAlbumSelect(currentTrack.albumId);
                                  goToExplore();
                                }
                              }}
                              className={cn(
                                "relative block rounded-2xl overflow-hidden shadow-xl border border-app-card-border/60 transition-transform active:scale-95 shrink-0",
                                currentTrack.albumId ? "cursor-pointer" : "cursor-default"
                              )}
                            >
                              <img
                                src={currentTrack.coverUrl}
                                className="w-20 h-20 sm:w-28 sm:h-28 object-cover"
                                alt={`${currentTrack.title} cover`}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentTrack.title)}&background=random&color=fff&size=256`;
                                }}
                              />
                            </button>
                          ) : (
                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-app-card border border-app-card-border flex items-center justify-center text-app-fg opacity-20 shrink-0 shadow-xl">
                              <Music size={28} />
                            </div>
                          )}
                        </div>

                        {/* Right Column: Heart, Track Details */}
                        <div className="flex-1 min-w-0 text-left pt-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            {/* Heart button before the title */}
                            <button
                              type="button"
                              onClick={() => handleToggleFavoriteInApp(mapTrackLyricsDataToTrack(currentTrack))}
                              className="p-1 hover:bg-app-fg/5 rounded-full transition-colors shrink-0 -ml-1"
                              title={isTrackFavoriteInApp(currentTrack.trackId) ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <Heart
                                size={18}
                                className={cn(
                                  "transition-all duration-300",
                                  isTrackFavoriteInApp(currentTrack.trackId)
                                    ? "fill-red-500 text-red-500 scale-110"
                                    : "text-app-fg/30 hover:text-red-500/80 hover:scale-105"
                                )}
                              />
                            </button>

                            <h1 className="text-xl sm:text-2xl font-black text-app-fg tracking-tight leading-tight truncate">
                              {currentTrack.title}
                            </h1>
                          </div>

                          {/* Artist and Album metadata inline row */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1.5">
                            <button
                              onClick={() => {
                                if (currentTrack.artistId && !currentTrack.artistId.startsWith("artist-") && currentTrack.artistId !== "undefined") {
                                  goToArtist(currentTrack.artistId);
                                } else if (currentTrack.artistId) {
                                  handleArtistSelect(currentTrack.artistId);
                                  goToExplore();
                                }
                              }}
                              className={cn(
                                "text-sm text-app-fg opacity-70 font-semibold text-left transition-all",
                                currentTrack.artistId ? "hover:opacity-100 hover:text-app-accent cursor-pointer" : ""
                              )}
                            >
                              {currentTrack.artist}
                            </button>

                            {currentTrack.album && (
                              <>
                                <span className="text-xs text-app-muted opacity-45">•</span>
                                <button
                                  onClick={() => {
                                    if (currentTrack.albumId && !currentTrack.albumId.startsWith("album-") && currentTrack.albumId !== "undefined") {
                                      goToAlbum(currentTrack.albumId);
                                    } else if (currentTrack.albumId) {
                                      handleAlbumSelect(currentTrack.albumId);
                                      goToExplore();
                                    }
                                  }}
                                  className={cn(
                                    "text-xs text-app-fg opacity-40 font-medium tracking-wide text-left transition-all truncate max-w-[120px] sm:max-w-xs",
                                    currentTrack.albumId ? "hover:opacity-100 hover:text-app-accent cursor-pointer" : ""
                                  )}
                                >
                                  {currentTrack.album}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Button Row: play sample & resources with robust wrap & expand animation */}
                      <div 
                        ref={resourcesContainerRef}
                        className="flex flex-wrap items-center gap-2 px-0.5 select-none"
                      >
                        {/* 1. Play Button (made larger: text-[11px], px-3.5, py-2, icon size 11, outline style) */}
                        <button
                          type="button"
                          onClick={togglePreviewAudio}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all text-[11px] font-medium uppercase tracking-wider active:scale-95 border animate-fade-in shrink-0",
                            isPreviewPlaying 
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)] hover:bg-[var(--accent)]/20" 
                              : "bg-transparent text-[var(--accent)] border-[var(--accent)]/30 hover:border-[var(--accent)] hover:bg-[var(--accent)]/[0.04]"
                          )}
                        >
                          {isPreviewPlaying ? (
                            <>
                              <Pause size={11} fill="currentColor" />
                              <span>Playing</span>
                            </>
                          ) : (
                            <>
                              <Play size={11} className="ml-0.5" fill="currentColor" />
                              <span>Sample</span>
                            </>
                          )}
                        </button>

                        {/* List of chips */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Apple Music chip is always visible */}
                          {(() => {
                            const appleResource = RESOURCE_TYPES.find(r => r.id === "apple");
                            const url = appleResource ? appleResource.getUrl(currentTrack as any) : null;
                            if (!url) return null;
                            const Icon = appleResource.icon;
                            return (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-app-card-border bg-app-card/35 hover:bg-app-card transition-colors text-[10px] font-medium uppercase tracking-wider shrink-0",
                                  isPreviewPlaying
                                    ? "text-red-500 border-red-500/30 bg-red-500/[0.03]"
                                    : "text-app-muted hover:text-app-fg"
                                )}
                              >
                                <Icon size={11} className={appleResource.color} />
                                <span>Apple Music</span>
                              </a>
                            );
                          })()}

                          {/* Expand Button if collapsed: displayed right after Apple Music chip */}
                          {!isResourcesExpanded && (
                            <button
                              type="button"
                              onClick={() => setIsResourcesExpanded(true)}
                              className="w-8 h-8 rounded-xl border border-app-card-border bg-app-card/30 flex items-center justify-center text-app-fg opacity-65 hover:opacity-100 hover:bg-app-fg/5 transition-all active:scale-95 cursor-pointer shrink-0"
                              title={t('lyrics.expandResourcesTooltip')}
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}

                          {/* YouTube, Spotify, Genius are visible if expanded */}
                          {isResourcesExpanded && (
                            <>
                              {RESOURCE_TYPES.filter(r => ["youtube", "spotify", "genius"].includes(r.id)).map((resource) => {
                                const url = resource.getUrl(currentTrack as any);
                                if (!url) return null;
                                const Icon = resource.icon;
                                return (
                                  <a
                                    key={resource.id}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-app-card-border bg-app-card/35 hover:bg-app-card transition-colors text-[10px] font-medium uppercase tracking-wider text-app-muted hover:text-app-fg shrink-0"
                                  >
                                    <Icon size={11} className={resource.color} />
                                    <span>{resource.name}</span>
                                  </a>
                                );
                              })}

                              {/* Collapse Button if expanded: displayed at the end of all chips */}
                              <button
                                type="button"
                                onClick={() => setIsResourcesExpanded(false)}
                                className="w-8 h-8 rounded-xl border border-app-card-border bg-app-card/30 flex items-center justify-center text-app-fg opacity-65 hover:opacity-100 hover:bg-app-fg/5 transition-all active:scale-95 cursor-pointer shrink-0"
                                title={t('lyrics.collapseResourcesTooltip')}
                              >
                                <ChevronLeft size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {nextStepState && (
                  <div className="mb-6 px-3 sm:px-6">
                    <NextStepCTA
                      state={nextStepState}
                      isExecuting={isTranslating || isGeneratingAnalysis || isLoadingLyrics}
                      loadingStep={loadingStep}
                      onExecute={(actionType) => {
                        if (actionType === 'GET_LYRICS' || actionType === 'FIND_LYRICS') {
                          handleAnalyzeSong();
                        } else if (actionType === 'TRANSLATE_LYRICS') {
                          handleAnalyzeSong();
                        } else if (actionType === 'GENERATE_ANALYSIS') {
                          setActiveTab('analysis');
                          handleSetAnalysisModeAndSwitch('overview');
                          setTimeout(() => {
                            handleGenerateAnalysis(true);
                          }, 50);
                        } else if (actionType === 'SAVE_PHRASES') {
                          setActiveTab('analysis'); // Переход на вкладку детального разбора песни
                        } else if (actionType === 'GO_TO_STUDY') {
                          setStudyTrackId(currentTrack.trackId);
                          goToStudy();
                        } else if (actionType === 'TRACK_COMPLETE') {
                          setActiveTab('analysis');
                        }
                      }}
                      onMarkCompleted={async () => {
                        if (currentTrack) {
                          const updatedTrack = {
                            ...currentTrack,
                            breakdownCompleted: true,
                          };
                          setCurrentTrack(updatedTrack);
                          await saveTrackData(currentTrack.trackId, updatedTrack);
                          loadCommunityTracks();
                        }
                      }}
                    />
                  </div>
                )}

                {trackProgressViewModel && isToolbarVisible && (
                  <div 
                    className="sticky top-[-1px] z-30 -mx-4 px-4 sm:-mx-8 sm:px-8 py-3 bg-app-bg/95 backdrop-blur-md transition-all duration-300 ease-in-out mb-6"
                  >
                    <div className="max-w-5xl mx-auto px-3 sm:px-6 flex flex-col gap-3">
                      <TrackProgressTracker
                        viewModel={trackProgressViewModel}
                        activeTab={activeTab === "preview" ? "lyrics" : activeTab}
                        onAction={(actionType) => {
                          if (actionType === 'find_lyrics') {
                            handleNextStepClickDirect();
                          } else if (actionType === 'generate_analysis') {
                            handleNextStepClickDirect();
                          } else if (actionType === 'save_phrase') {
                            setActiveTab('cards');
                          } else if (actionType === 'go_to_study' || actionType === 'review_again') {
                            setStudyTrackId(currentTrack.trackId);
                            goToStudy();
                          }
                        }}
                        onTabChange={(tab) => setActiveTab(tab)}
                      />

                      {/* Search & Switches Toolbar on one unified line */}
                      {activeTab === "lyrics" && currentTrack.rawLyrics && (
                        <div className="flex items-center justify-between gap-2 sm:gap-3 relative w-full border-t border-app-card-border/10 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          {/* Search Input */}
                          <div className="flex-1 min-w-0 relative flex h-10 items-center bg-app-card border border-app-card-border rounded-[1.25rem] px-2.5 sm:px-3.5 focus-within:border-app-accent/50 transition-all">
                            <Search size={16} className="text-app-fg opacity-40 shrink-0 mr-1.5 sm:mr-2.5" />
                            <input
                              type="text"
                              placeholder={t('lyrics.searchPlaceholder')}
                              value={trackSearchQuery}
                              onChange={(e) => setTrackSearchQuery(e.target.value)}
                              className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-app-fg placeholder-app-fg/30 focus:outline-none font-sans"
                            />
                            {trackSearchQuery && (
                              <button
                                onClick={() => setTrackSearchQuery("")}
                                className="text-app-fg opacity-45 hover:opacity-100 transition-opacity ml-1.5 shrink-0"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Control panel / Switches */}
                          <div className="flex items-center gap-1 bg-app-card border border-app-card-border rounded-xl p-1 shadow-sm shrink-0 h-10">
                            {(() => {
                              const srcLangCode = (normalizeLanguageCode(currentTrack?.sourceLanguage) || "en").toUpperCase();
                              const targetLangCode = (normalizeLanguageCode(targetLanguage) || "ru").toUpperCase();

                              const isSrcActive = lyricsDisplayMode === "lyrics" || lyricsDisplayMode === "both";
                              const isTargetActive = lyricsDisplayMode === "translation" || lyricsDisplayMode === "both";

                              const btnBase = "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 outline-none select-none cursor-pointer relative active:scale-95 text-[10px] font-black tracking-wider";
                              const activeClass = "bg-app-accent text-white shadow-md font-black border-transparent";
                              const inactiveClass = "text-app-fg opacity-65 hover:opacity-100 hover:bg-app-fg/5";

                              return (
                                <>
                                  {/* Source Lang Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isSrcActive) {
                                        if (!isTargetActive) return; // cannot turn off both
                                        handleSetLyricsDisplayMode("translation");
                                      } else {
                                        handleSetLyricsDisplayMode("both");
                                      }
                                    }}
                                    title={t('lyrics.toggleSourceLyrics', { lang: currentTrack?.sourceLanguage || "Original" })}
                                    className={cn(btnBase, isSrcActive ? activeClass : inactiveClass)}
                                  >
                                    <span>{srcLangCode}</span>
                                  </button>

                                  {/* Target Lang Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isTargetActive) {
                                        if (!isSrcActive) return; // cannot turn off both
                                        handleSetLyricsDisplayMode("lyrics");
                                      } else {
                                        handleSetLyricsDisplayMode("both");
                                      }
                                    }}
                                    title={t('lyrics.toggleTargetTranslation', { lang: targetLanguage || "Target" })}
                                    className={cn(btnBase, isTargetActive ? activeClass : inactiveClass)}
                                  >
                                    <span>{targetLangCode}</span>
                                  </button>

                                  {/* Vertical Divider inside Panel */}
                                  <div className="w-[1px] h-4 bg-app-card-border/40 mx-0.5" />

                                  {/* Star/Favorites Filter Button */}
                                  <button
                                    type="button"
                                    onClick={handleToggleStarFilter}
                                    title={t('lyrics.showStarredOnly')}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                                  >
                                    {isStarFilterActive ? (
                                      <Star size={16} className="fill-amber-400 text-amber-500 drop-shadow-sm" />
                                    ) : (
                                      <Star size={16} className="text-app-fg/20 hover:text-amber-500/80 transition-all" />
                                    )}
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {false && (
                  <div className="flex flex-col gap-8 pb-32 px-3 sm:px-6">
                    {isLoadingLyrics ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                         <div className="relative w-24 h-24 flex items-center justify-center">
                           <div className="absolute inset-0 border-4 border-app-card-border rounded-full" />
                           <motion.div
                             animate={{ rotate: 360 }}
                             transition={{ 
                               duration: loadingStep === "searching" ? 2 : 1, 
                               repeat: Infinity, 
                               ease: "linear" 
                             }}
                             className="absolute inset-0 rounded-full border-4 border-t-transparent border-[var(--accent)]"
                           />
                           <div className="absolute inset-0 flex items-center justify-center">
                             {loadingStep === "searching" ? (
                               <SearchCode className="text-[var(--accent)]" size={32} />
                             ) : (
                               <Brain className="text-[var(--accent)]" size={32} />
                             )}
                           </div>
                         </div>
                         <div className="space-y-1">
                           <h3 className="text-lg font-black text-app-fg uppercase tracking-widest leading-none font-sans">
                             {loadingStep === "searching" ? t('lyrics.findingLyrics') : t('lyrics.analyzingTrack')}
                           </h3>
                           <p className="text-[10px] text-app-muted uppercase tracking-[0.2em] font-sans font-bold">
                             {loadingStep === "searching" ? t('lyrics.scanningDatabases') : t('lyrics.consultingGemini')}
                           </p>
                         </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 max-w-xl mx-auto w-full text-left font-sans"
                      >
                        {(() => {
                          const hasLyrics = !!(currentTrack.rawLyrics && currentTrack.rawLyrics.trim().length > 0);
                          const hasPhrases = currentTrack.lines && currentTrack.lines.some((l: any) => l.phrases && l.phrases.length > 0);
                          const hasBreakdown = !!(currentTrack.processingStatus?.stage3_completed && hasPhrases);
                          const trackCards = Array.from(phraseMetadata.values()).filter(card => card.trackId === currentTrack.trackId);
                          const savedCardsCount = trackCards.length;

                          return (
                            <div className="space-y-6">
                              {/* 1. Unified Hero Block */}
                              <section className="p-5 md:p-6 rounded-[1.75rem] bg-app-card border border-app-card-border shadow-md flex flex-col sm:flex-row gap-5 items-start text-left relative overflow-hidden select-none">
                                {/* Left: Beautiful Cover Art */}
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden relative shadow bg-gradient-to-br from-app-card-border/40 to-app-card/10 border border-app-card-border flex items-center justify-center shrink-0">
                                  {currentTrack.coverUrl ? (
                                    <img 
                                      src={currentTrack.coverUrl} 
                                      alt={currentTrack.title}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Disc size={36} className="text-app-accent/60" />
                                  )}
                                </div>
                                
                                {/* Right: Info details */}
                                <div className="flex-1 space-y-3 min-w-0 text-left">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-app-accent/10 text-app-accent border border-app-accent/10">
                                        Track Details
                                      </span>
                                      {renderDifficultyIndicator(currentTrack.difficulty, true)}
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-black text-app-fg tracking-tight font-sans mt-2 truncate">
                                      {currentTrack.title}
                                    </h2>
                                    <p className="text-xs font-semibold text-app-muted font-sans mt-0.5 truncate">
                                      {currentTrack.artist} {currentTrack.album ? `• ${currentTrack.album}` : ""}
                                    </p>
                                  </div>

                                  {/* Compact integrated status pills */}
                                  <div className="pt-2.5 border-t border-app-card-border/40 flex flex-wrap gap-1.5">
                                    <span className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                      hasLyrics 
                                        ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/15" 
                                        : "bg-amber-500/5 text-amber-500 border-amber-500/15"
                                    )}>
                                      <span className={cn("w-1 h-1 rounded-full", hasLyrics ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                                      {hasLyrics ? "Lyrics Loaded" : "Lyrics Missing"}
                                    </span>

                                    <span className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                      hasBreakdown 
                                        ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/15" 
                                        : "bg-amber-500/5 text-amber-500 border-amber-500/15"
                                    )}>
                                      <span className={cn("w-1 h-1 rounded-full", hasBreakdown ? "bg-emerald-500" : "bg-amber-400")} />
                                      {hasBreakdown ? "Breakdown Ready" : "No Breakdown"}
                                    </span>

                                    <span className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                      savedCardsCount > 0 
                                        ? "bg-app-accent/5 text-app-accent border-app-accent/15" 
                                        : "bg-app-muted/5 text-app-muted border-app-card-border/60"
                                    )}>
                                      <span className={cn("w-1 h-1 rounded-full", savedCardsCount > 0 ? "bg-app-accent" : "bg-app-muted/40")} />
                                      {savedCardsCount === 1 ? "1 Card" : savedCardsCount > 0 ? `${savedCardsCount} Cards` : "0 Cards"}
                                    </span>
                                  </div>
                                </div>
                              </section>

                              {/* 2. Quick Access Section */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="text-app-accent" size={13} />
                                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-app-fg">
                                    Quick Access • Быстрые действия
                                  </h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Quick Action 1: Lyrics & Translation */}
                                  <div
                                    onClick={() => {
                                      setActiveTab("lyrics");
                                    }}
                                    className={cn(
                                      "relative group p-4 rounded-2xl border bg-app-card/60 transition-all active:scale-[0.985] flex items-center justify-between cursor-pointer select-none",
                                      hasLyrics 
                                        ? "border-app-card-border hover:bg-app-card hover:border-app-accent/30" 
                                        : "border-app-card-border/40 opacity-70 hover:opacity-100 hover:bg-app-card/45"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={cn(
                                        "p-2 rounded-xl shrink-0 transition-colors",
                                        hasLyrics ? "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/15" : "bg-app-muted/10 text-app-muted"
                                      )}>
                                        <FileText size={16} />
                                      </div>
                                      <div className="min-w-0 text-left">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-app-fg group-hover:text-app-accent transition-colors">
                                          Original Lyrics
                                        </h4>
                                        <p className="text-[10px] text-app-muted truncate font-semibold mt-0.5">
                                          {hasLyrics ? "Bilingual line-by-line mode" : "No lyrics loaded yet"}
                                        </p>
                                      </div>
                                    </div>
                                    <ChevronRight size={14} className="text-app-muted group-hover:text-app-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                                  </div>

                                  {/* Quick Action 2: AI Breakdown */}
                                  <div
                                    onClick={() => {
                                      setActiveTab("analysis");
                                    }}
                                    className={cn(
                                      "relative group p-4 rounded-2xl border bg-app-card/60 transition-all active:scale-[0.985] flex items-center justify-between cursor-pointer select-none",
                                      hasBreakdown 
                                        ? "border-app-card-border hover:bg-app-card hover:border-app-accent/30" 
                                        : "border-app-card-border/40 opacity-70 hover:opacity-100 hover:bg-app-card/45"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={cn(
                                        "p-2 rounded-xl shrink-0 transition-colors",
                                        hasBreakdown ? "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/15" : "bg-app-muted/10 text-app-muted"
                                      )}>
                                        <Brain size={16} />
                                      </div>
                                      <div className="min-w-0 text-left">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-app-fg group-hover:text-app-accent transition-colors">
                                          Grammar Notes
                                        </h4>
                                        <p className="text-[10px] text-app-muted truncate font-semibold mt-0.5">
                                          {hasBreakdown ? "Study grammatical structures" : "Explore setup / run analysis"}
                                        </p>
                                      </div>
                                    </div>
                                    <ChevronRight size={14} className="text-app-muted group-hover:text-app-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                                  </div>

                                  {/* Quick Action 3: Review Cards */}
                                  <div
                                    onClick={() => {
                                      setActiveTab("cards");
                                    }}
                                    className={cn(
                                      "relative group p-4 rounded-2xl border bg-app-card/60 transition-all active:scale-[0.985] flex items-center justify-between cursor-pointer select-none",
                                      savedCardsCount > 0 
                                        ? "border-app-card-border hover:bg-app-card hover:border-app-accent/30" 
                                        : "border-app-card-border/40 opacity-70 hover:opacity-100 hover:bg-app-card/45"
                                    )}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={cn(
                                        "p-2 rounded-xl shrink-0 transition-colors",
                                        savedCardsCount > 0 ? "bg-app-accent/10 text-app-accent group-hover:bg-app-accent/15" : "bg-app-muted/10 text-app-muted"
                                      )}>
                                        <Bookmark size={16} />
                                      </div>
                                      <div className="min-w-0 text-left">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-app-fg group-hover:text-app-accent transition-colors">
                                          Interval Deck
                                        </h4>
                                        <p className="text-[10px] text-app-muted truncate font-semibold mt-0.5">
                                          {savedCardsCount > 0 ? `${savedCardsCount} elements awaiting study` : "0 saved study cards"}
                                        </p>
                                      </div>
                                    </div>
                                    <ChevronRight size={14} className="text-app-muted group-hover:text-app-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                                  </div>

                                  {/* Quick Action 4: External Media Link */}
                                  {(() => {
                                    const ytResource = RESOURCE_TYPES.find(r => r.id === "youtube");
                                    const ytUrl = ytResource ? ytResource.getUrl(currentTrack as any) : null;
                                    return (
                                      <a
                                        href={ytUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(currentTrack.artist + " " + currentTrack.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative group p-4 rounded-2xl border border-app-card-border bg-app-card/60 transition-all active:scale-[0.985] flex items-center justify-between cursor-pointer select-none"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="p-2 rounded-xl shrink-0 bg-red-500/10 text-red-500 group-hover:bg-red-500/15 transition-colors">
                                            <Youtube size={16} />
                                          </div>
                                          <div className="min-w-0 text-left">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-app-fg group-hover:text-red-500 transition-colors flex items-center gap-1.5">
                                              Video & Clips <ExternalLink size={10} className="opacity-60" />
                                            </h4>
                                            <p className="text-[10px] text-app-muted truncate font-semibold mt-0.5">
                                              Watch official YouTube source
                                            </p>
                                          </div>
                                        </div>
                                        <ChevronRight size={14} className="text-app-muted group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                      </a>
                                    );
                                  })()}
                                </div>

                                {/* Auxiliary Resources Links */}
                                <div className="pt-1.5 flex flex-wrap gap-2 items-center justify-start select-none">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-app-muted">Alternative links:</span>
                                  {RESOURCE_TYPES.filter(r => ["spotify", "apple", "genius"].includes(r.id)).map((resource) => {
                                    const url = resource.getUrl(currentTrack as any);
                                    if (!url) return null;
                                    const Icon = resource.icon;
                                    return (
                                      <a
                                        key={resource.id}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-app-card-border/60 hover:border-app-accent/30 bg-app-card/35 hover:bg-app-card transition-colors text-[9px] font-black uppercase tracking-wider text-app-muted hover:text-app-fg"
                                      >
                                        <Icon size={9} className={resource.color} />
                                        <span>{resource.name}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 3. Next step CTA */}
                              {nextStepState && (
                                <div className="space-y-3 pt-2">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="text-app-accent" size={13} />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-app-fg">
                                      Next Practice • Начни сейчас
                                    </h3>
                                  </div>
                                  <NextStepCTA
                                    state={nextStepState}
                                    isExecuting={isTranslating || isGeneratingAnalysis || isLoadingLyrics}
                                    loadingStep={loadingStep}
                                    onExecute={(actionType) => {
                                      if (actionType === 'GET_LYRICS' || actionType === 'FIND_LYRICS') {
                                        handleAnalyzeSong();
                                      } else if (actionType === 'TRANSLATE_LYRICS') {
                                        handleAnalyzeSong();
                                      } else if (actionType === 'GENERATE_ANALYSIS') {
                                        setActiveTab('analysis');
                                        handleGenerateAnalysis();
                                      } else if (actionType === 'SAVE_PHRASES') {
                                        setActiveTab('analysis'); 
                                      } else if (actionType === 'GO_TO_STUDY') {
                                        setStudyTrackId(currentTrack.trackId);
                                        goToStudy();
                                      } else if (actionType === 'TRACK_COMPLETE') {
                                        setActiveTab('analysis');
                                      }
                                    }}
                                    onMarkCompleted={async () => {
                                      if (currentTrack) {
                                        const updatedTrack = {
                                          ...currentTrack,
                                          breakdownCompleted: true,
                                        };
                                        setCurrentTrack(updatedTrack);
                                        await saveTrackData(currentTrack.trackId, updatedTrack);
                                        loadCommunityTracks();
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {lyricsFetchError && (
                          <p className="text-xs text-red-500 font-bold flex items-center justify-center gap-2 text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <AlertTriangle size={14} />
                            {lyricsFetchError}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}

                {activeTab === "lyrics" && (
                  <div className="flex flex-col gap-1 pb-32">

                    {currentTrack.rawLyrics ? (() => {
                      let linesToRender = currentTrack.lines || [];
                      if (isStarFilterActive) {
                        // Filter for starred lines
                        linesToRender = linesToRender.filter((line: any) => line.isStarred);
                        
                        // Additionally remove repetitions of identical lines to avoid duplicates
                        const seen = new Set<string>();
                        linesToRender = linesToRender.filter((line: any) => {
                          const trimmed = line.original.trim();
                          if (!trimmed || seen.has(trimmed)) return false;
                          seen.add(trimmed);
                          return true;
                        });
                      }

                      if (isStarFilterActive && linesToRender.length === 0) {
                        return (
                          <div className="py-24 text-center space-y-4">
                            <Star size={40} className="mx-auto text-amber-500/40" />
                            <p className="text-sm font-bold text-app-fg opacity-45">{t('lyrics.noStarredLines')}</p>
                          </div>
                        );
                      }

                      if (trackSearchQuery.trim()) {
                        const q = trackSearchQuery.toLowerCase().trim();
                        linesToRender = linesToRender.filter((line: any) => {
                          const matchesOriginal = line.original?.toLowerCase().includes(q);
                          const matchesTranslation = line.translation?.toLowerCase().includes(q);
                          return matchesOriginal || matchesTranslation;
                        });
                      }

                      if (trackSearchQuery.trim() && linesToRender.length === 0) {
                        return (
                          <div className="py-24 text-center space-y-4">
                            <Search size={40} className="mx-auto text-app-fg opacity-15" />
                            <p className="text-sm font-bold text-app-fg opacity-45">{t('lyrics.noMatchingLyricLines')}</p>
                            <button
                              onClick={() => setTrackSearchQuery("")}
                              className="px-4 py-2 border border-app-card-border hover:border-app-fg/25 rounded-xl text-xs font-bold text-app-fg"
                            >
                              {t('lyrics.clearSearch')}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col gap-1 pr-1">
                          {linesToRender.map((line: any) =>
                            renderLyricLine(line.original, line.index, false, false),
                          )}
                        </div>
                      );
                    })() : (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                        {isLoadingLyrics ? (
                          <div className="space-y-6">
                            <div className="relative w-24 h-24 mx-auto">
                              <div className="absolute inset-0 border-4 border-app-card-border rounded-full" />
                              <motion.div
                                className="absolute inset-0 border-4 border-t-transparent rounded-full"
                                style={{
                                  borderColor: "var(--accent)",
                                  borderTopColor: "transparent",
                                }}
                                animate={{ rotate: 360 }}
                                transition={{
                                  repeat: Infinity,
                                  duration: loadingStep === "searching" ? 2 : 1,
                                  ease: "linear",
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                {loadingStep === "searching" ? (
                                  <SearchCode
                                    size={32}
                                    className="text-[var(--accent)]"
                                  />
                                ) : (
                                  <Brain
                                    size={32}
                                    className="text-[var(--accent)]"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-app-fg">
                                {loadingStep === "searching"
                                  ? t('lyrics.checkingLyricsDatabases')
                                  : t('lyrics.analyzingWithAI')}
                              </h3>
                              <p className="text-app-fg opacity-40 max-w-xs mx-auto text-sm">
                                {loadingStep === "searching"
                                  ? t('lyrics.pollingOfficialSources')
                                  : t('lyrics.detectingLanguageExtracting')}
                              </p>
                            </div>
                          </div>
                        ) : lyricsFetchError ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-md space-y-8 p-8 rounded-3xl bg-app-card border border-app-card-border shadow-2xl"
                          >
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500">
                              <AlertTriangle size={32} />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-app-fg">
                                {t('lyrics.lyricsNotFound')}
                              </h3>
                              <p className="text-sm text-app-fg opacity-40">
                                {lyricsFetchError}
                              </p>
                            </div>

                            <div className="space-y-4">
                              <div className="text-left space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-app-fg opacity-30 ml-2">
                                  {t('lyrics.manualEntry')}
                                </label>
                                <textarea
                                  value={manualLyrics}
                                  onChange={(e) =>
                                    setManualLyrics(e.target.value)
                                  }
                                  placeholder={t('tracks.pasteLyricsPlaceholder')}
                                  className="w-full min-h-[150px] bg-app-bg border border-app-card-border rounded-2xl p-4 text-sm font-serif outline-none focus:border-app-accent/50 transition-all placeholder:opacity-20"
                                />
                              </div>

                              <div className="flex gap-3">
                                <button
                                  onClick={() =>
                                    handleTrackSelect(currentTrack)
                                  }
                                  className="flex-1 py-4 rounded-2xl bg-app-fg/5 hover:bg-app-fg/10 text-app-fg font-bold text-[10px] uppercase tracking-widest transition-all"
                                >
                                  {t('lyrics.retryAiSearch')}
                                </button>
                                <button
                                  onClick={handleManualLyricsSubmit}
                                  disabled={
                                    !manualLyrics.trim() || isLoadingLyrics
                                  }
                                  className="flex-[2] py-4 rounded-2xl bg-app-fg text-app-bg font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-20"
                                >
                                  {isLoadingLyrics
                                    ? t('nextStep.processing')
                                    : t('lyrics.saveAndAnalyze')}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="flex flex-col items-center gap-6 py-20">
                            <div className="w-16 h-16 rounded-2xl bg-app-fg/5 flex items-center justify-center text-app-fg/20">
                               <Music2 size={32} />
                            </div>
                            <div className="space-y-2 text-center">
                               <h3 className="text-xl font-black text-app-fg">{t('lyrics.lyricsAreMissing')}</h3>
                               <p className="text-sm text-app-muted max-w-xs mx-auto italic font-serif">
                                 {t('lyrics.missingLyricsDesc')}
                               </p>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                              <button
                                onClick={handleAnalyzeSong}
                                className="w-full py-4 rounded-2xl bg-app-accent text-white font-black uppercase tracking-widest text-[10px] shadow-xl transition-all hover:scale-105 active:scale-95"
                              >
                                {t('lyrics.findLyricsPhrases')}
                              </button>
                              <button
                                onClick={() => setLyricsFetchError("manual")}
                                className="w-full py-4 rounded-2xl bg-app-fg/5 hover:bg-app-fg/10 text-app-fg font-black uppercase tracking-widest text-[10px] transition-all"
                              >
                                {t('lyrics.enterManually')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {currentTrack.authors && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                          {t('lyrics.lyricAuthors')}
                        </p>
                        <p className="text-sm font-serif italic text-app-fg">
                          {currentTrack.authors}
                        </p>
                      </div>
                    )}
                    {currentTrack.lyricSource && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                          {t('resources.lyricsSource')}
                        </p>
                        <p className="text-sm font-bold text-app-fg">
                          {currentTrack.lyricSource}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "words" && (
                  <div className="px-3 sm:px-6">
                    <WordsTab
                      currentTrack={currentTrack}
                      getLexicalItemStatus={getLexicalItemStatus}
                      setLexicalItemStatus={setLexicalItemStatus}
                    />
                  </div>
                )}

                {activeTab === "analysis" && (
                  <div className="pb-32 space-y-6 px-3 sm:px-6">
                    {isGeneratingAnalysis ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <div className="absolute inset-0 border-4 border-app-card-border rounded-full" />
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ 
                              duration: loadingStep === "searching" ? 2 : 1, 
                              repeat: Infinity, 
                              ease: "linear" 
                            }}
                            className="absolute inset-0 rounded-full border-4 border-t-transparent border-[var(--accent)]"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            {loadingStep === "searching" ? (
                               <SearchCode size={32} className="text-[var(--accent)]" />
                            ) : (
                               <Brain size={32} className="text-[var(--accent)]" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-black text-app-fg uppercase tracking-widest text-center">
                            {loadingStep === "searching" ? t('lyrics.findingLyrics') : loadingStep === "lecture" ? t('lyrics.generatingLecture') : t('lyrics.deepBreakdown')}
                          </h3>
                          <div className="flex items-center justify-center gap-3">
                             <div className="flex gap-1">
                                <div className={cn("w-1 h-1 rounded-full", loadingStep === "searching" ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                                <div className={cn("w-1 h-1 rounded-full", loadingStep === "lecture" ? "bg-purple-500 animate-pulse" : loadingStep === "analyzing" ? "bg-app-accent animate-pulse" : "bg-app-fg/10")} />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('lyrics.consultingGeminiShort')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 animate-in fade-in zoom-in duration-300"
                      >
                        <StructuredAnalysisLecture
                          currentTrack={currentTrack}
                          targetLanguage={targetLanguage}
                          phraseMetadata={phraseMetadata}
                          handleSetAnalysisPhraseStatus={handleSetAnalysisPhraseStatus}
                          speak={speak}
                          onUpdateTrack={async (updatedTrack) => {
                            setCurrentTrack(updatedTrack);
                            await saveTrackData(updatedTrack.trackId, updatedTrack);
                            try {
                              const activeMode = analysisMode || 'overview';
                              const langCode = getLanguageCode(targetLanguage);
                              if (updatedTrack.lectureBlocks) {
                                await sqliteService.saveAnalysisVariant({
                                  id: `${updatedTrack.trackId}_${activeMode}_${langCode}`,
                                  trackId: updatedTrack.trackId,
                                  mode: activeMode,
                                  targetLanguage: langCode,
                                  sourceLanguage: updatedTrack.sourceLanguage || "en",
                                  status: "completed",
                                  createdAt: Date.now(),
                                  updatedAt: Date.now()
                                }, updatedTrack.lectureBlocks);
                              }
                            } catch (e) {
                              console.warn("Failed to update SQLite variant on user edit:", e);
                            }
                            loadCommunityTracks();
                          }}
                          isGeneratingAnalysis={isGeneratingAnalysis}
                          handleRegenerateAnalysis={handleRegenerateAnalysis}
                          analysisMode={analysisMode}
                          handleSetAnalysisMode={handleSetAnalysisModeAndSwitch}
                          wordFormStats={wordFormStats}
                          availableAnalysisModes={availableAnalysisModes}
                          analysisError={analysisError}
                          resolvedAnalysisVariant={resolvedAnalysisVariant}
                          onNavigateToTab={(tab) => setActiveTab(tab)}
                        />
                      </motion.div>
                    )}
                  </div>
                )}

                {activeTab === "cards" && (
                  <div className="pb-32 space-y-12 px-3 sm:px-6">
                    {isGeneratingAnalysis ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <div className="absolute inset-0 border-4 border-app-card-border rounded-full" />
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ 
                              duration: loadingStep === "searching" ? 2 : 1, 
                              repeat: Infinity, 
                              ease: "linear" 
                            }}
                            className="absolute inset-0 rounded-full border-4 border-t-transparent border-[var(--accent)]"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            {loadingStep === "searching" ? (
                               <SearchCode size={32} className="text-[var(--accent)]" />
                            ) : (
                               <Brain size={32} className="text-[var(--accent)]" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-black text-app-fg uppercase tracking-widest text-center">
                            {loadingStep === "searching" ? t('lyrics.findingLyrics') : loadingStep === "lecture" ? t('lyrics.generatingLecture') : t('lyrics.deepBreakdown')}
                          </h3>
                          <div className="flex items-center justify-center gap-3">
                             <div className="flex gap-1">
                                <div className={cn("w-1 h-1 rounded-full", loadingStep === "searching" ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                                <div className={cn("w-1 h-1 rounded-full", loadingStep === "lecture" ? "bg-purple-500 animate-pulse" : loadingStep === "analyzing" ? "bg-app-accent animate-pulse" : "bg-app-fg/10")} />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('lyrics.consultingGeminiShort')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (currentTrack.meaning || (currentTrack.phrases && currentTrack.phrases.length > 0) || currentTrack.lines.some(l => l.phrases && l.phrases.length > 0)) ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-12 animate-in fade-in zoom-in duration-300"
                      >
                        <AnalysisPhraseWorkspace
                          currentTrack={currentTrack}
                          trackSearchQuery={trackSearchQuery}
                          setTrackSearchQuery={setTrackSearchQuery}
                          phraseMetadata={phraseMetadata}
                          handleSetAnalysisPhraseStatus={handleSetAnalysisPhraseStatus}
                          speak={speak}
                          onUpdateTrack={async (updatedTrack) => {
                            setCurrentTrack(updatedTrack);
                            await saveTrackData(updatedTrack.trackId, updatedTrack);
                            loadCommunityTracks();
                          }}
                          isGeneratingAnalysis={isGeneratingAnalysis}
                          handleRegenerateAnalysis={handleRegenerateAnalysis}
                          onNavigateToTab={setActiveTab}
                          onStartStudy={() => {
                            setStudyTrackId(currentTrack.trackId);
                            goToStudy();
                          }}
                        />
                      </motion.div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-center space-y-8 font-sans">
                        <div className="w-20 h-20 rounded-[2rem] bg-app-card border border-app-card-border flex items-center justify-center text-app-fg opacity-10">
                          <Bookmark size={40} />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-bold text-app-fg">No Saved Study Phrases</h3>
                          <p className="text-app-fg opacity-40 max-w-sm mx-auto font-sans leading-normal">
                            Generate the Song Breakdown first to explore important vocabulary, then save phrases to your cards to start studying!
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                          <button
                            onClick={() => handleGenerateAnalysis()}
                            className="px-10 py-5 rounded-3xl bg-app-fg text-app-bg font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 transition-all flex items-center gap-3 cursor-pointer"
                          >
                            <Sparkles size={16} />
                            Generate AI Breakdown
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
            </motion.div>
          )}

          {view === "study" && (
            <motion.div
              key="study"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
            >
              <StudyView
                onBack={() => {
                  setStudyTrackId(undefined);
                  goBack({ type: "explore" });
                }}
                initialTrackId={studyTrackId}
                onReviewCompleted={() => {
                  setDailyActivity(recordReviewCompleted());
                  loadUserCards();
                }}
                onCardUpdated={handleStudyCardUpdated}
              />
            </motion.div>
          )}

          {view === "settings" && (
            <SettingsView
              user={user}
              targetLanguage={targetLanguage}
              setTargetLanguage={setTargetLanguage}
              theme={theme}
              setTheme={setTheme}
              analysisMode={analysisMode}
              setAnalysisMode={handleSetAnalysisMode}
              onResetData={resetUserData}
              onClose={() => goBack({ type: "explore" })}
            />
          )}

          {view === "library" && (
            <motion.div
              key="library"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
            >
              <LibraryView
                onTrackSelect={navigateToTrack}
                onArtistSelect={(id) => {
                  if (id && !id.startsWith("artist-") && id !== "undefined") {
                    goToArtist(id);
                  } else {
                    handleArtistSelect(id);
                  }
                }}
                onAlbumSelect={(id) => {
                  if (id && !id.startsWith("album-") && id !== "undefined") {
                    goToAlbum(id);
                  } else {
                    handleAlbumSelect(id);
                  }
                }}
                onNavigateToStudy={() => goToStudy()}
                recentTracks={recentTracks}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Player Control Panel (Lyrics, Breakdown & Cards) */}
      <AnimatePresence>
        {view === "lyrics" &&
          (activeTab === "lyrics" || activeTab === "analysis" || activeTab === "cards") &&
          currentTrack && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="relative pointer-events-auto"
            >
              {/* Subtle glass effect behind the panel */}
              <div className="absolute -inset-2 bg-[var(--accent)]/5 rounded-full blur-2xl opacity-50" />

              <div className="relative bg-app-card/80 backdrop-blur-3xl border border-app-card-border rounded-[2.5rem] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-app-fg/5 cursor-default z-20">
                  <motion.div 
                    initial={false}
                    animate={{ 
                      width: `${activeLineIndex !== null && currentTrack.lines.length > 0 
                            ? ((activeLineIndex + 1) / currentTrack.lines.length) * 100 
                            : 0}%` 
                    }}
                    className="h-full bg-gradient-to-r from-[var(--accent)] to-purple-500"
                  />
                </div>
 
                <div className="px-3 py-2 flex items-center justify-between">
                  {/* Left: Mode Selector / Track Metadata */}
                  <div className="flex-1 flex items-center min-w-0 gap-2.5 pl-1.55">
                    {activeTab === "lyrics" ? (
                      <div className="flex items-center bg-app-bg/50 p-1 rounded-full border border-app-card-border gap-1">
                        <button
                          onClick={() => changePlaybackMode("listening")}
                          className={cn(
                            "p-2 rounded-full transition-all",
                            playbackMode === "listening"
                              ? "bg-[var(--accent)] text-white shadow-lg"
                              : "text-app-fg opacity-40 hover:opacity-100",
                          )}
                          title="Listening Mode"
                        >
                          <Headphones size={20} />
                        </button>
                        <button
                          onClick={() => changePlaybackMode("shadowing")}
                          className={cn(
                            "p-2 rounded-full transition-all",
                            playbackMode === "shadowing"
                              ? "bg-[var(--accent)] text-white shadow-lg"
                              : "text-app-fg opacity-40 hover:opacity-100",
                          )}
                          title="Shadowing Mode"
                        >
                          <Mic2 size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-app-bg/50 border border-app-card-border shrink-0">
                          {currentTrack.coverUrl && currentTrack.coverUrl !== "" ? (
                            <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Music className="w-full h-full p-1.5 opacity-20" />
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                           <p className="text-[10px] font-black uppercase tracking-widest text-app-fg truncate">
                             Exploring
                           </p>
                           <p className="text-[9px] font-medium text-app-muted truncate">
                             {currentTrack.title}
                           </p>
                        </div>
                      </div>
                    )}
                  </div>
 
                  {/* Center: Play Control for TTS Lyrics */}
                  <div className="flex-shrink-0 mx-2 relative group">
                    <motion.button
                      onClick={() => toggleReadLyrics(getPlaybackLines)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl relative z-10"
                      style={{
                        backgroundColor: isReadingAll
                          ? "var(--accent)"
                          : "var(--foreground)",
                        color: isReadingAll ? "white" : "var(--background)",
                        boxShadow: isReadingAll
                          ? "0 12px 30px -5px var(--accent)"
                          : "0 12px 30px -8px rgba(0,0,0,0.2)",
                      }}
                    >
                      {isReadingAll ? (
                        <Pause size={26} fill="currentColor" />
                      ) : (
                        <Play size={26} className="ml-1" fill="currentColor" />
                      )}
                    </motion.button>
                  </div>
 
                  {/* Right: Tools */}
                  <div className="flex-1 flex justify-end items-center gap-1 pr-1">
                    {activeTab !== "analysis" && activeTab !== "cards" && (
                      <button
                        onClick={() => setIsLyricsSettingsOpen(true)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-app-fg opacity-60 hover:opacity-100 hover:bg-app-fg/5 transition-all active:scale-95"
                        title="Settings"
                      >
                        <Settings size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => setIsResourcesOpen(true)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-app-fg opacity-60 hover:opacity-100 hover:bg-app-fg/5 transition-all active:scale-95"
                      title="Sources"
                    >
                      <ListMusic size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <AnimatePresence>
        {view !== "lyrics" && (
          <motion.footer
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-40 pb-4 pt-3 px-6 bg-app-card/95 backdrop-blur-3xl border-t border-app-card-border flex justify-around items-center shadow-[0_-8px_30px_rgba(0,0,0,0.15)]"
          >
            <button
              onClick={goToExplore}
              className="p-2 transition-all hover:scale-105 active:scale-95"
              style={{
                color: view === "tracks" ? "var(--accent)" : "var(--app-fg)",
              }}
            >
              <Music size={24} className={cn("transition-opacity duration-200", view === "tracks" ? "opacity-100" : "opacity-40 hover:opacity-100")} />
            </button>

            <button
              id="navigation-tab-library-btn"
              onClick={goToLibrary}
              className="p-2 transition-all hover:scale-105 active:scale-95"
              style={{
                color: view === "library" ? "var(--accent)" : "var(--app-fg)",
              }}
            >
              <FolderHeart size={24} className={cn("transition-opacity duration-200", view === "library" ? "opacity-100" : "opacity-40 hover:opacity-100")} />
            </button>

            <button
              id="navigation-tab-study-btn"
              onClick={() => goToStudy()}
              className="p-2 transition-all hover:scale-105 active:scale-95 relative"
              style={{
                color: view === "study" ? "var(--accent)" : "var(--app-fg)",
              }}
            >
              <Brain size={24} className={cn("transition-opacity duration-200", view === "study" ? "opacity-100" : "opacity-40 hover:opacity-100")} />
              {dueCardsCount > 0 && (
                <span 
                  id="navigation-tab-study-badge"
                  className="absolute -top-0.5 -right-1 bg-app-accent text-white text-[8px] font-black h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-app-card shadow-lg animate-pulse"
                >
                  {dueCardsCount}
                </span>
              )}
            </button>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Global Track Action Context Menu Drawer */}
      <AnimatePresence>
        {activeMenuTrack && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-0">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setActiveMenuTrack(null);
                setIsAddToPlaylistOpenInApp(false);
              }}
              className="absolute inset-0 bg-app-bg/60 backdrop-blur-md"
            />

            {/* Content Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg bg-app-card/90 backdrop-blur-3xl border-t border-app-card-border rounded-t-[2.5rem] p-8 space-y-6 shadow-2xl z-10 select-none pb-12"
            >
              {/* Drag bar indicator */}
              <div className="w-12 h-1.5 bg-app-fg/10 rounded-full mx-auto" />

              {!isAddToPlaylistOpenInApp ? (
                <>
                  {/* Track Meta */}
                  <div className="flex items-center gap-4 border-b border-app-card-border pb-4">
                    {activeMenuTrack.coverUrl && activeMenuTrack.coverUrl !== "" ? (
                      <img
                        src={activeMenuTrack.coverUrl}
                        className="w-16 h-16 rounded-2xl object-cover shadow-md"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-app-fg/5 flex items-center justify-center text-app-fg/20">
                        <Disc size={28} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-lg text-app-fg truncate mb-0.5">
                        {activeMenuTrack.title}
                      </p>
                      <p className="text-sm text-app-muted truncate">
                        {activeMenuTrack.artist}
                      </p>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    {/* Toggle Favorite */}
                    <button
                      type="button"
                      onClick={() => handleToggleFavoriteInApp(activeMenuTrack)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-app-fg/5 active:scale-[0.99] transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <Heart
                          size={20}
                          className={cn(
                            "transition-colors",
                            isTrackFavoriteInApp(activeMenuTrack.id)
                              ? "fill-red-500 text-red-500"
                              : "text-app-muted"
                          )}
                        />
                        <span className="font-medium text-app-fg">
                          {isTrackFavoriteInApp(activeMenuTrack.id)
                            ? t('library.removeFromFavorites')
                            : t('library.addToFavorites')}
                        </span>
                      </div>
                      {isTrackFavoriteInApp(activeMenuTrack.id) && (
                        <Check size={18} className="text-red-500" />
                      )}
                    </button>

                    {/* Add to Playlist button */}
                    <button
                      type="button"
                      onClick={() => setIsAddToPlaylistOpenInApp(true)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-app-fg/5 active:scale-[0.99] transition-all text-left"
                    >
                      <ListMusic size={20} className="text-app-muted" />
                      <span className="font-medium text-app-fg">{t('library.addToPlaylist').replace('...', '')}</span>
                    </button>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setActiveMenuTrack(null)}
                    className="w-full py-4 bg-app-fg/5 hover:bg-app-fg/10 active:scale-[0.99] rounded-2xl text-center font-semibold text-app-fg transition-all"
                  >
                    {t('common.close')}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setIsAddToPlaylistOpenInApp(false)}
                      className="p-2 hover:bg-app-fg/5 rounded-full transition-colors text-app-muted hover:text-app-fg"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <h3 className="font-bold text-lg text-app-fg">{t('library.addToPlaylist').replace('...', '')}</h3>
                  </div>

                  {playlistsInApp.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                      {playlistsInApp.map((playlist, idx) => {
                        const hasTrack = playlist.tracks?.some((t: any) => (t.id || t.trackId) === activeMenuTrack.id);
                        return (
                          <button
                            key={`${playlist.id || 'playlist'}_${idx}`}
                            type="button"
                            onClick={() => handleAddTrackToPlaylistInApp(playlist.id, activeMenuTrack)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-app-fg/5 active:scale-[0.99] transition-all text-left"
                          >
                            <span className="font-medium text-app-fg">{playlist.name}</span>
                            {hasTrack ? (
                              <Check size={18} className="text-green-500" />
                            ) : (
                              <span className="text-xs text-app-muted">{t('common.add')}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-app-muted italic">
                      {t('library.noPlaylistsAvailable')}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddToPlaylistOpenInApp(false)}
                    className="w-full py-4 bg-app-fg/5 hover:bg-app-fg/10 active:scale-[0.99] rounded-2xl text-center font-semibold text-app-fg transition-all"
                  >
                    {t('common.back')}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Resources Modal */}
      <AnimatePresence>
        {isResourcesOpen && currentTrack && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResourcesOpen(false)}
              className="absolute inset-0 bg-app-bg/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 sm:p-7 flex flex-col flex-1 min-h-0 overflow-hidden space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 sm:gap-5">
                    {currentTrack.coverUrl && currentTrack.coverUrl !== "" && (
                      <img
                        src={currentTrack.coverUrl}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shadow-md border border-app-card-border"
                        alt="Cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-0.5">
                      <span
                        className="text-[9px] font-black uppercase tracking-[0.3em]"
                        style={{ color: "var(--accent)" }}
                      >
                        {t('resources.title')}
                      </span>
                      <h3 className="text-md sm:text-lg font-bold text-app-fg leading-tight line-clamp-1">
                        {currentTrack.title}
                      </h3>
                      <p className="text-xs text-app-fg opacity-40 italic font-serif line-clamp-1">
                        {currentTrack.artist}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsResourcesOpen(false)}
                    className="text-app-fg opacity-20 hover:opacity-100 transition-colors p-1"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex gap-4 border-b border-app-card-border pb-px">
                  <button
                    disabled={isLoadingLyrics}
                    onClick={() => setResourceTab("links")}
                    className={cn(
                      "pb-2 text-sm font-bold transition-all border-b-2 disabled:opacity-40",
                      resourceTab === "links"
                        ? "border-accent text-accent"
                        : "border-transparent text-app-fg opacity-40 hover:opacity-100",
                    )}
                  >
                    {t('resources.externalLinks')}
                  </button>
                  <button
                    disabled={isLoadingLyrics}
                    onClick={() => {
                      setResourceTab("lyrics");
                    }}
                    className={cn(
                      "pb-2 text-sm font-bold transition-all border-b-2 disabled:opacity-40",
                      resourceTab === "lyrics"
                        ? "border-accent text-accent"
                        : "border-transparent text-app-fg opacity-40 hover:opacity-100",
                    )}
                  >
                    {t('resources.lyricsSource')}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 scrollbar-hide space-y-4">
                  {isLoadingLyrics ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-app-card-border rounded-full" />
                        <motion.div
                          className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
                          style={{
                            borderTopColor: "var(--accent)",
                            borderLeftColor: "transparent",
                            borderRightColor: "transparent",
                            borderBottomColor: "transparent",
                          }}
                        />
                      </div>
                      <div className="space-y-1.5 px-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>
                          {loadingStep === "searching" ? t('resources.fetchingLyrics') : t('resources.analyzingLyrics')}
                        </p>
                        <h4 className="text-sm font-extrabold text-app-fg">
                          {loadingStep === "searching" ? t('resources.connectingToSource') : t('resources.aiBreakdownInProgress')}
                        </h4>
                        <p className="text-xs text-app-muted max-w-[280px] leading-relaxed select-none">
                          {loadingStep === "searching"
                            ? t('resources.fetchingLyricsDesc')
                            : t('resources.analyzingLyricsDesc')}
                        </p>
                      </div>
                    </div>
                  ) : resourceTab === "links" ? (
                    <div className="space-y-4">
                      <p className="text-xs text-app-fg opacity-60 leading-normal">
                        {t('resources.externalLinksDesc')}
                      </p>

                      <div className="grid gap-3 py-1">
                        {RESOURCE_TYPES.map((resource) => {
                          const url = resource.getUrl(currentTrack as any);
                          const Icon = resource.icon;

                          return (
                            <a
                              key={resource.id}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center justify-between p-3.5 rounded-2xl bg-app-card border border-app-card-border group transition-all",
                                resource.hoverBorder,
                                resource.hoverBg,
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    resource.bgColor,
                                    resource.color,
                                  )}
                                >
                                  <Icon size={20} />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-xs text-app-fg leading-tight">
                                    {resource.name}
                                  </p>
                                  <p className="text-[10px] text-app-fg opacity-40 mt-0.5">
                                    {resource.subtitle}
                                  </p>
                                </div>
                              </div>
                              <ExternalLink
                                size={14}
                                className="text-app-fg opacity-10 group-hover:opacity-40 transition-opacity mr-1"
                              />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-2xl bg-app-card border border-app-card-border space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.15em] text-app-fg opacity-40 select-none">
                              {t('resources.trackTitle')}
                            </label>
                            <input
                              type="text"
                              value={lyricsSearchTitle}
                              onChange={(e) => setLyricsSearchTitle(e.target.value)}
                              placeholder={t('resources.trackTitle')}
                              className="w-full text-xs font-semibold rounded-xl bg-app-bg border border-app-card-border px-2.5 py-1.5 text-app-fg focus:border-accent/40 outline-none transition-all placeholder:opacity-30"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.15em] text-app-fg opacity-40 select-none">
                              {t('resources.artistName')}
                            </label>
                            <input
                              type="text"
                              value={lyricsSearchArtist}
                              onChange={(e) => setLyricsSearchArtist(e.target.value)}
                              placeholder={t('resources.artistName')}
                              className="w-full text-xs font-semibold rounded-xl bg-app-bg border border-app-card-border px-2.5 py-1.5 text-app-fg focus:border-accent/40 outline-none transition-all placeholder:opacity-30"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleManualLyricsSearch(lyricsSearchArtist, lyricsSearchTitle)}
                          disabled={isSearchingOptions || !lyricsSearchTitle.trim() || !lyricsSearchArtist.trim()}
                          className="w-full py-2 px-3 rounded-xl bg-app-fg text-app-bg hover:opacity-90 disabled:opacity-50 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isSearchingOptions ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              {t('resources.searching')}
                            </>
                          ) : (
                            <>
                              <Search size={12} />
                              {t('resources.searchBtn')}
                            </>
                          )}
                        </button>
                      </div>

                      {lyricsFetchError && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                          <p className="text-xs text-red-500 font-medium leading-relaxed">
                            {lyricsFetchError}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2.5">
                        {isSearchingOptions ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-3 opacity-40">
                            <Loader2 size={24} className="animate-spin text-accent" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">
                              {t('resources.searchingAlternative')}
                            </p>
                          </div>
                        ) : lyricOptions.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-app-fg opacity-30 select-none px-1">
                              {t('resources.availableResults', { count: lyricOptions.length })}
                            </p>
                            <div className="grid gap-2">
                              {lyricOptions.map((option) => (
                                <button
                                  key={option.id}
                                  onClick={() => handleSelectLyricOption(option)}
                                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-app-card border border-app-card-border group hover:border-accent/40 transition-all text-left pointer-events-auto cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent/10 text-accent"
                                    >
                                      <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="font-bold text-xs text-app-fg truncate max-w-[180px] sm:max-w-[240px]">
                                          {option.title}
                                        </p>
                                        <span className="px-1.5 py-0.5 rounded bg-accent/10 text-[7px] font-black uppercase text-accent shrink-0">
                                          {option.source}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-app-fg opacity-40 mt-0.5 truncate max-w-[220px] sm:max-w-[280px]">
                                        {option.artist} {option.album ? `• ${option.album}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <CheckCircle2
                                    size={14}
                                    className="text-accent opacity-0 group-hover:opacity-40 transition-opacity shrink-0 ml-2"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 space-y-3 opacity-30 border border-dashed border-app-card-border/60 rounded-2xl bg-app-card/10">
                            <FileText size={28} className="text-app-fg/80" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-center px-4 leading-normal">
                              {t('resources.noLyricsFound')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-app-card-border/10 shrink-0">
                  <button
                    onClick={() => setIsResourcesOpen(false)}
                    className="w-full py-3.5 rounded-2xl bg-app-fg text-app-bg font-bold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                  >
                    {t('common.done')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lyrics Settings Modal */}
      <AnimatePresence>
        {isLyricsSettingsOpen && currentTrack && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLyricsSettingsOpen(false)}
              className="absolute inset-0 bg-app-bg/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.4em]"
                    style={{ color: "var(--accent)" }}
                  >
                    {t('lyricsSettings.title')}
                  </span>
                  <button
                    onClick={() => setIsLyricsSettingsOpen(false)}
                    className="text-app-fg opacity-20 hover:opacity-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-app-card border border-app-card-border">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-app-fg opacity-40">
                        {t('lyricsSettings.sourceLanguage')}
                      </p>
                      <p className="text-xs font-medium text-app-fg">
                        {t('lyricsSettings.sourceLanguageDesc')}
                      </p>
                      {isExperimentalLanguage(currentTrack.sourceLanguage) && (
                        <p className="text-[10px] text-yellow-500 font-semibold flex items-center gap-1 mt-1">
                          <AlertCircle size={10} className="shrink-0" />
                          {t('languageSelector.experimentalWarning')}
                        </p>
                      )}
                    </div>
                    <LanguageSelector
                      label="Source"
                      value={currentTrack.sourceLanguage || "English"}
                      highlight
                      usedLanguages={usedLanguages}
                      showResourceHint={true}
                      onChange={async (newLang) => {
                        await handleSourceLanguageOverride(newLang);
                        loadUserCards();
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-5 rounded-3xl bg-app-card border border-app-card-border">
                    <div className="space-y-1">
                      <p className="font-bold text-app-fg">
                        {t('lyricsSettings.skipKnown')}
                      </p>
                      <p className="text-xs text-app-fg opacity-40">
                        {t('lyricsSettings.skipKnownDesc')}
                      </p>
                    </div>
                    <button
                      onClick={() => setSkipKnownPhrases(!skipKnownPhrases)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                        skipKnownPhrases
                          ? "bg-[var(--accent)]"
                          : "bg-app-fg/10",
                      )}
                    >
                      <motion.div
                        animate={{ x: skipKnownPhrases ? 24 : 0 }}
                        className="absolute inset-y-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-5 rounded-3xl bg-app-card border border-app-card-border">
                    <div className="space-y-1">
                      <p className="font-bold text-app-fg">
                        {t('lyricsSettings.translation')}
                      </p>
                      <p className="text-xs text-app-fg opacity-40">
                        {t('lyricsSettings.translationDesc')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleRegenerateTranslations(targetLanguage);
                        setIsLyricsSettingsOpen(false);
                      }}
                      disabled={isTranslating}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-app-card-border hover:bg-app-fg/5",
                        isTranslating ? "opacity-50 cursor-not-allowed" : "opacity-100"
                      )}
                    >
                      <RefreshCw size={12} className={cn(isTranslating ? "animate-spin" : "")} />
                      <span>{isTranslating ? t('lyricsSettings.translatingStatus') : t('lyricsSettings.regenerateBtn')}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsLyricsSettingsOpen(false)}
                  className="w-full py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all text-white"
                  style={{
                    backgroundColor: "var(--accent)",
                    boxShadow:
                      "0 10px 20px -5px color-mix(in srgb, var(--accent) 40%, transparent)",
                  }}
                >
                  {t('common.done')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phrase Action Modal (Know, Study, Explain) */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-12 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-app-bg/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl my-auto"
            >
              <div className="p-8 pb-4 space-y-8">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.4em]"
                    style={{ color: "var(--accent)" }}
                  >
                    {t('phraseAction.title')}
                  </span>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-app-fg opacity-20 hover:opacity-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-app-card border border-app-card-border shadow-inner relative group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <p className="text-2xl font-serif leading-snug">
                        {editingLine.original}
                      </p>
                      <button
                        onClick={() => speak(editingLine.original, undefined, editingLine.language)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-app-bg border border-app-card-border text-app-fg opacity-20 hover:opacity-100 hover:text-[var(--accent)] transition-all shrink-0"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>

                    {isEditingTranslation ? (
                      <textarea
                        autoFocus
                        value={editingLine.translation}
                        onChange={(e) =>
                          setEditingLine((prev) => ({
                            ...prev,
                            translation: e.target.value,
                          }))
                        }
                        onBlur={() => setIsEditingTranslation(false)}
                        className="w-full bg-transparent text-lg font-serif italic border-l-2 pl-4 outline-none resize-none min-h-[60px]"
                        style={{ borderColor: "var(--accent)" }}
                      />
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-app-fg opacity-40 text-lg font-serif italic border-l-2 pl-4 flex-1"
                          style={{ borderColor: "var(--accent)" }}
                        >
                          {editingLine.translation}
                        </p>
                        <button
                          onClick={() => setIsEditingTranslation(true)}
                          className="p-1 opacity-20 group-hover:opacity-100 hover:text-[var(--accent)] transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingLine.explanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-6 rounded-[2rem] bg-[var(--accent)]/5 border border-[var(--accent)]/10"
                    >
                      <p
                        className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-40"
                        style={{ color: "var(--accent)" }}
                      >
                        {t('phraseAction.explanation')}
                      </p>
                      <div className="text-xl leading-relaxed text-app-fg opacity-80 prose prose-invert prose-lg">
                        <ReactMarkdown>{editingLine.explanation}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 pt-4 border-t border-app-card-border">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        if (editingLine) {
                          const card = phraseMetadata.get(normalizePhraseKey(editingLine.original));
                          if (card) {
                            handleUpdateStatus(card, "known");
                          }
                        }
                      }}
                      disabled={isSaving}
                      className="py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all bg-app-card border border-app-card-border text-app-fg hover:bg-opacity-80"
                    >
                      {t('phraseAction.knowIt')}
                    </button>
                    <button
                      onClick={() => {
                        if (editingLine) {
                          const card = phraseMetadata.get(normalizePhraseKey(editingLine.original));
                          if (card) {
                            handleUpdateStatus(card, "learning");
                          }
                        }
                      }}
                      disabled={isSaving}
                      className="py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all text-white"
                      style={{
                        backgroundColor: "#f97316", // Orange
                        boxShadow: "0 10px 20px -5px rgba(249, 115, 22, 0.4)",
                      }}
                    >
                      {isSaving ? t('phraseAction.saving') : t('phraseAction.learn')}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (editingLine) {
                        handleExplainDirect(editingLine.original);
                      }
                    }}
                    disabled={isExplaining || isSaving}
                    className="w-full py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  >
                    {isExplaining ? t('phraseAction.thinking') : t('phraseAction.explain')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {popoverData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] cursor-default"
              onClick={() => setPopoverData(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed z-[70] min-w-[280px] max-w-[320px] bg-app-card border border-app-card-border shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-5 overflow-hidden backdrop-blur-2xl"
              style={{
                left: `${Math.min(window.innerWidth - 340, Math.max(20, popoverData.position.x))}px`,
                top: `${popoverData.position.y}px`,
                transform: "translateY(-100%) translateY(-20px)",
              }}
            >
              {(() => {
                const popoverCard = phraseMetadata.get(normalizePhraseKey(popoverData.phrase));
                const popoverStatus = popoverCard?.status || "new";
                return (
                  <>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="text-2xl font-serif leading-tight">
                        {popoverData.phrase}
                      </p>
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          popoverStatus === "known"
                            ? "bg-green-500"
                            : popoverStatus === "learning"
                              ? "bg-orange-500"
                              : "bg-sky-400",
                        )}
                      />
                    </div>
                    <p className="text-base text-app-fg opacity-60 font-serif italic mb-4">
                      {popoverData.translation}
                    </p>

                    {popoverData.explanation && (
                      <div className="text-xs opacity-80 mb-5 leading-relaxed prose prose-invert line-clamp-4">
                        <ReactMarkdown>{popoverData.explanation}</ReactMarkdown>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePopoverAction(
                            popoverData.phrase,
                            popoverStatus === "learning" ? "new" : "learning",
                            popoverData.translation,
                            popoverData.explanation,
                          );
                          setPopoverData(null);
                        }}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          popoverStatus === "learning"
                            ? "bg-orange-500/20 text-orange-500 border border-orange-500/20"
                            : "bg-orange-500 text-white shadow-lg shadow-orange-500/20",
                        )}
                      >
                        {popoverStatus === "learning" ? "Learning" : "Learn"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePopoverAction(
                            popoverData.phrase,
                            popoverStatus === "known" ? "new" : "known",
                            popoverData.translation,
                            popoverData.explanation,
                          );
                          setPopoverData(null);
                        }}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          popoverStatus === "known"
                            ? "bg-green-500/20 text-green-500 border border-green-500/20"
                            : "bg-green-500 text-white shadow-lg shadow-green-500/20",
                        )}
                      >
                        {popoverStatus === "known" ? "Known" : "Known"}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PhraseDrawer
        isOpen={isPhraseDrawerOpen}
        onClose={() => setIsPhraseDrawerOpen(false)}
        lineIndex={selectedLineIndexForDrawer}
        lyrics={currentTrack?.rawLyrics || ""}
        phraseAnalysis={{ lines: currentTrack?.lines || [], meaning: currentTrack?.meaning || "" }}
        trackTitle={currentTrack?.title || ""}
        artist={currentTrack?.artist || ""}
        trackId={currentTrack?.trackId || ""}
        sourceLanguage={currentTrack?.sourceLanguage || "English"}
        user={user}
        onCardUpdated={() => { loadUserCards(); }}
        phraseMetadata={phraseMetadata}
        currentTrack={currentTrack}
        setCurrentTrack={setCurrentTrack}
      />
    </div>
  );
}


