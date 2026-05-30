import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import {
  Play,
  Pause,
  FileText,
  Music,
  Search,
  Plus,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
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
  BookOpen,
  Volume2,
  VolumeX,
  Loader2,
  Heart,
  MoreVertical,
  FolderHeart,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Track, Artist, Album } from "./constants";
import { SUPPORTED_LANGUAGES } from "./lib/languages";
import { useUserCards } from "./hooks/useUserCards";
import { usePlayback } from "./hooks/usePlayback";
import { useLibrarySearch } from "./hooks/useLibrarySearch";
import { useTrackSession } from "./hooks/useTrackSession";
import { useAppUiState } from "./hooks/useAppUiState";
import { 
  studyCardsRepository,
  dailyTrackerRepository,
  recentHistoryRepository,
  userPreferencesRepository,
  userDataMaintenanceService,
  libraryRepository,
  ANALYSIS_PROMPT_VERSION, 
  type Flashcard,
  type PhraseStatus
} from "./application";

import { cn } from "./lib/utils";
import { auth, testDbConnection } from "./lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import StudyView from "./components/StudyView";
import SettingsView from "./components/SettingsView";
import PhraseDrawer from "./components/PhraseDrawer";
import { LibraryView } from "./components/LibraryView";
import LanguageSelector from "./components/LanguageSelector";
import {
  type TrackLyricsData,
  type LyricOption,
  type Phrase,
  saveTrackData,
  getTrackDetails,
} from "./services/musicService";
import { sqliteService } from "./services/sqliteService";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { setTransientTrack, popTransientTrack, initializeWebNavigation } from "./services/webNavigationAdapter";

import { determineNextStep } from "./services/nextStepService";
import { getTrackStudySummary } from "./services/trackSummaryService";
import { TrackStudyBridge } from "./components/TrackStudyBridge";
const recordPhraseSaved = (date?: Date) => dailyTrackerRepository.recordPhraseSaved(date);
const recordReviewCompleted = (date?: Date) => dailyTrackerRepository.recordReviewCompleted(date);
import { buildTrackProgressViewModel } from "./services/trackProgressService";
import { TrackProgressTracker } from "./components/TrackProgressTracker";
import { TracksHomeShell } from "./components/TracksHomeShell";
import { DailyProgressBlock } from "./components/DailyProgressBlock";
import { ResumeStudyBlock } from "./components/ResumeStudyBlock";



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
  onOpenLineDrawer?: (i: number) => void;
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
  getPhrasesForLine,
  lineRefs,
  renderHighlightedText,
  handleLineClick,
  isSaving: _isSaving,
  isListeningForSpeech,
  shadowingFeedback,
  shadowingAttempts,
  handleToggleStarLine,
  onOpenLineDrawer,
}: LyricLineProps) => {
  const trimmedLine = line.trim();
  if (!trimmedLine && isCompact) return null;
  if (!trimmedLine) return <div className="h-6" />;

  const metadata = phraseMetadata.get(trimmedLine);
  const userTrans = metadata?.translatedPhrase;
  const autoTrans = currentTrack?.lines?.[i]?.translation;
  const displayTranslation = userTrans || autoTrans;

  const isLyricsOnly = displayMode === "lyrics";
  const isTranslationOnly = displayMode === "translation";
  const isBoth = displayMode === "both";

  const mainText = isTranslationOnly ? (displayTranslation || line) : line;

  const showUnderTranslation = isBoth || (isLyricsOnly && activeLineIndex === i) || (alwaysShowTranslation && !isTranslationOnly);

  const phrasesInLine = getPhrasesForLine(i);
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.01, 1) }}
        className={cn(
          "group relative flex flex-col gap-1 rounded-[1.5rem] border cursor-pointer z-10 transition-all duration-300",
          isCompact ? "px-4 py-1" : "px-6 py-1.5",
          activeLineIndex === i
            ? "scale-[1.01] bg-app-card/60 border-app-card-border shadow-xl z-20 brightness-110"
            : "border-transparent bg-transparent opacity-65 hover:opacity-100 hover:bg-app-card/5",
        )}
        onClick={() => trimmedLine && handleLineClick(line, i)}
      >
        <div className="flex items-center gap-4 w-full relative z-10">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-serif leading-snug transition-all duration-300 text-app-fg ml-1",
                activeLineIndex === i
                  ? isCompact ? "text-xl font-bold" : "text-3xl font-bold text-app-fg"
                  : isCompact ? "text-base opacity-90" : "text-xl opacity-80",
              )}
            >
              {mainText ? (isTranslationOnly ? mainText : renderHighlightedText(mainText, phrasesInLine)) : "\u00A0"}
            </p>
          </div>

          {trimmedLine && (
            <div className="flex items-center gap-2 shrink-0">
              {phrasesInLine && phrasesInLine.length > 0 && onOpenLineDrawer && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLineDrawer(i);
                  }}
                  className="p-1 px-1.5 rounded-lg border border-transparent transition-all hover:scale-110 hover:border-app-card-border hover:bg-app-card/80 text-[var(--accent)]"
                  title="Line Vocabulary & Phrases Analysis"
                >
                  <Sparkles size={16} />
                </button>
              )}
              <button
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

        <div className="pl-1 relative z-10">
          <AnimatePresence>
            {(activeLineIndex === i || alwaysShowTranslation || isBoth) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {displayTranslation && showUnderTranslation && (
                  <p
                    className={cn(
                      "font-serif italic text-app-fg opacity-40 transition-all duration-300 ml-1 mt-1",
                      activeLineIndex === i
                        ? isCompact ? "text-sm" : "text-lg"
                        : isCompact ? "text-xs" : "text-base",
                    )}
                  >
                    {displayTranslation}
                  </p>
                )}

                {activeLineIndex === i && isListeningForSpeech && (
                  <motion.div
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

const AnalysisPhraseCard = ({
  item,
  idx,
  card,
  handleSetAnalysisPhraseStatus,
}: {
  item: any;
  idx: number;
  card: any;
  handleSetAnalysisPhraseStatus: any;
}) => {
  const x = useMotionValue(0);
  const currentStatus: PhraseStatus = card ? card.status : "new";

  return (
    <div className="relative group/phrase overflow-hidden rounded-[2rem] touch-pan-y">
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100) {
            handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", "known");
          } else if (info.offset.x > 100) {
            handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", "learning");
          }
        }}
        className={cn(
          "flex flex-col gap-3 p-6 rounded-[2rem] bg-app-card border transition-all cursor-pointer relative z-10 touch-pan-y select-none",
          currentStatus === "known"
            ? "border-green-500/30 shadow-md shadow-green-500/5 bg-[var(--green-bg,rgba(16,185,129,0.02))]"
            : currentStatus === "learning"
              ? "border-orange-500/30 shadow-md shadow-orange-500/5 bg-[var(--orange-bg,rgba(249,115,22,0.02))]"
              : "border-blue-500/20 bg-blue-500/[0.01]"
        )}
      >
        {/* Swiping Indicator on Left (revealed when dragging right) */}
        <div className="absolute right-[calc(100%+1px)] top-0 bottom-0 flex items-center pr-4 pointer-events-none">
          <div className="flex flex-col items-center gap-1 text-orange-500">
            <div className="p-3 rounded-2xl bg-orange-500 border border-orange-500/20 shadow-lg text-white">
              <BookOpen size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Learn</span>
          </div>
        </div>

        {/* Swiping Indicator on Right (revealed when dragging left) */}
        <div className="absolute left-[calc(100%+1px)] top-0 bottom-0 flex items-center pl-4 pointer-events-none">
          <div className="flex flex-col items-center gap-1 text-green-500">
            <div className="p-3 rounded-2xl bg-green-500 border border-green-500/20 shadow-lg text-white">
              <Check size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Known</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2 relative z-10">
          <div className="flex-1 flex gap-3">
            <span className="text-xs font-black opacity-20 mt-2 shrink-0">{(idx + 1).toString().padStart(2, '0')}</span>
            <div className="flex-1">
              <p className="text-xl font-serif text-app-fg">{item.text}</p>
              <div className="flex flex-col gap-1 mt-1">
                {item.translation && <p className="text-lg font-serif italic text-app-fg opacity-60">{item.translation}</p>}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextStatus: PhraseStatus = 
                currentStatus === "new" ? "learning" :
                currentStatus === "learning" ? "known" : "new";
              handleSetAnalysisPhraseStatus(item.text, item.translation || "", item.explanation || "", nextStatus);
            }}
            className="shrink-0 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform cursor-pointer button-badge"
            aria-label={`Change status from ${currentStatus}`}
          >
            {currentStatus === "known" ? (
              <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-500/10 shadow-sm text-green-500 bg-green-500/10 flex items-center gap-2">
                <CheckCircle2 size={12} />
                <span>known</span>
              </div>
            ) : currentStatus === "learning" ? (
              <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-500/10 shadow-sm text-orange-500 bg-orange-500/10 flex items-center gap-2">
                <BookOpen size={12} />
                <span>learning</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/10 shadow-sm text-blue-500 bg-blue-500/10 flex items-center gap-2">
                <Plus size={12} />
                <span>new</span>
              </div>
            )}
          </button>
        </div>
        {item.explanation && (
          <div className="pl-4 border-l-2 border-app-card-border ml-7">
            <p className="text-lg font-medium text-app-fg opacity-60 group-hover:opacity-80 transition-opacity leading-relaxed">{item.explanation}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default function App() {
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
    setSelectedLineIndexForDrawer,
    
    handleSetLyricsDisplayMode,
    handleToggleStarFilter,
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
    handleSelectLyricOption: handleSelectLyricOptionRaw
  } = useTrackSession();

  const {
    phraseMetadata,
    setPhraseMetadata,
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

  const {
    activeLineIndex,
    isPreviewPlaying,
    hasStartedPreview,
    previewProgress,
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
    handleLineClick
  } = usePlayback(currentTrack, phraseMetadata, targetLanguage);

  // Derived memoized progress View Models
  const nextStepState = useMemo(() => {
    if (!currentTrack) return null;
    const hasSavedCardsForTrack = Array.from(phraseMetadata.values()).some(
      (card) => card.trackId === currentTrack.trackId
    );
    return determineNextStep(currentTrack, hasSavedCardsForTrack);
  }, [currentTrack, phraseMetadata]);

  const trackStudySummary = useMemo(() => {
    if (!currentTrack) return null;
    const cards = Array.from(phraseMetadata.values());
    return getTrackStudySummary(cards, currentTrack.trackId);
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
    status: PhraseStatus
  ) => {
    await handleSetAnalysisPhraseStatusRaw(phrase, translation, explanation, status, currentTrack);
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
        handleLineClick={(line, i) => handleLineClick(line, i)}
        isSaving={isSaving}
        isListeningForSpeech={isListeningForSpeech}
        shadowingFeedback={shadowingFeedback}
        shadowingAttempts={shadowingAttempts}
        handleToggleStarLine={handleToggleStarLine}
        onOpenLineDrawer={(index) => {
          setSelectedLineIndexForDrawer(index);
          setIsPhraseDrawerOpen(true);
        }}
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
            const trackData = await getTrackDetails(currentRoute.id);
            if (trackData && active) {
              await handleTrackSelect(trackData);
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
      const existing = phraseMetadata.get(phrase);
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
      {/* Hidden Audio for Preview */}
      <audio
        ref={previewAudioRef}
        onTimeUpdate={handlePreviewTimeUpdate}
        onLoadedMetadata={handlePreviewLoadedMetadata}
        onEnded={handlePreviewEnded}
        muted={isMuted}
        src={currentTrack?.audioUrl}
      />
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-accent-glow transition-all duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--glow-color),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--glow-color),transparent)] opacity-20" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-2 border-b border-app-card-border backdrop-blur-xl bg-app-card">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-lg"
            style={{
              backgroundColor: "var(--accent)",
              boxShadow: "0 0 15px var(--accent)",
            }}
          >
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-black tracking-tighter text-lg uppercase">
            CantoLex
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={goToSettings}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-app-card border border-app-card-border shadow-lg transition-all hover:scale-105 active:scale-95 group overflow-hidden"
          >
            {user?.photoURL ? (
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
              className="flex-1 overflow-y-auto px-6 pt-8 pb-32 max-w-5xl mx-auto w-full scrollbar-hide"
            >
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
                      searchEntityType === "musicTrack" ? "Search tracks..." :
                      searchEntityType === "album" ? "Search albums..." :
                      "Search artists..."
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
                      (searchQuery || searchResults.length > 0 || artistDetails || albumDetails) && (
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

              {/* Entity Tabs */}
              {searchResults.length > 0 && (
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
                    <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-6">Fetching details...</p>
                    <button
                      onClick={cancelSearchDetails}
                      className="px-6 py-2 rounded-xl bg-app-card border border-app-card-border text-[10px] font-black uppercase tracking-widest hover:bg-app-card/80 transition-colors"
                    >
                      Cancel
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
                        <img src={albumDetails.album.coverUrl} className="w-40 h-40 md:w-56 md:h-56 rounded-3xl shadow-2xl border border-app-card-border" referrerPolicy="no-referrer" />
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
                        <p className="text-[10px] font-black uppercase tracking-widest mt-4 opacity-50">
                          {albumDetails.album.trackCount || 0} Tracks • {albumDetails.album.releaseDate ? new Date(albumDetails.album.releaseDate).getFullYear() : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-app-card border border-app-card-border rounded-3xl overflow-hidden shadow-app-card">
                      {albumDetails.tracks.length > 0 ? (
                        albumDetails.tracks.map((track, idx) => (
                          <button
                            key={track.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToTrack(track);
                            }}
                            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-app-fg/5 transition-colors text-left border-b border-app-card-border last:border-0"
                          >
                            <span className="text-xs font-black opacity-20 w-4">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-app-fg truncate">{track.title}</p>
                            </div>
                            <ChevronRight size={16} className="text-app-fg/20" />
                          </button>
                        ))
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
                      
                      {artistDetails.artist.artworkUrl && (
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
                        <p className="text-sm text-app-muted uppercase tracking-widest">{artistDetails.artist.genre}</p>
                      </div>
                    </div>

                    {artistDetails.topTracks.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-app-fg opacity-40 mb-4 px-2">Top Tracks</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {artistDetails.topTracks.map(track => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToTrack(track);
                              }}
                              className="flex items-center gap-4 p-3 rounded-2xl bg-app-card border border-app-card-border shadow-sm hover:border-app-accent/30 transition-all text-left"
                            >
                              <img src={track.coverUrl} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
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
                          {artistDetails.albums.map(album => (
                            <button
                              key={album.id}
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
                              <div className="aspect-square rounded-2xl overflow-hidden bg-app-card border border-app-card-border shadow-sm group-hover:shadow-md transition-all">
                                <img src={album.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
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
                          {searchResults.map((item) => (
                            <div
                              key={item.id}
                              onClick={(e) => {
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
                              {item.coverUrl ? (
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
            </motion.div>
          )}

          {view === "lyrics" && currentTrack && (
            <motion.div
              key={`lyrics-${currentTrack.trackId}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="bg-app-card/50 border-b border-app-card-border backdrop-blur-xl">
                <div className="max-w-5xl mx-auto w-full px-6 py-4 flex items-center justify-between animate-in fade-in duration-300">
                  <button
                    onClick={() => goBack({ type: "explore" })}
                    className="flex items-center gap-1 text-app-fg opacity-40 text-xs font-bold uppercase py-2 px-1 hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={18} /> Library
                  </button>
                  <div className="flex items-center gap-4">
                    {isLoadingLyrics && (
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-full border animate-pulse",
                        loadingStep === "searching" ? "bg-amber-500/10 border-amber-500/20" : "bg-[var(--accent)]/10 border-[var(--accent)]/20"
                      )}>
                        <RefreshCw
                          size={12}
                          className={cn(
                            "animate-spin",
                            loadingStep === "searching" ? "text-amber-500 duration-[2s]" : "text-[var(--accent)] duration-700"
                          )}
                        />
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          loadingStep === "searching" ? "text-amber-500" : "text-[var(--accent)]"
                        )}>
                          {loadingStep === "searching" ? "Searching Lyrics" : 
                           loadingStep === "meaning" ? "Generating Preview" : "Analyzing Track"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-8 pt-4 pb-12 scrollbar-hide relative w-full max-w-5xl mx-auto"
              >
                <div className="mb-4">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 block opacity-60"
                    style={{ color: "var(--accent)" }}
                  >
                    Reading Session
                  </span>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-app-fg leading-tight truncate">
                          {currentTrack.title}
                        </h1>
                        <button
                          type="button"
                          onClick={() => handleToggleFavoriteInApp(currentTrack)}
                          className="p-1.5 hover:bg-app-fg/5 rounded-full transition-colors shrink-0"
                          title={isTrackFavoriteInApp(currentTrack.trackId || currentTrack.id) ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Heart
                            size={22}
                            className={cn(
                              "transition-all duration-300",
                              isTrackFavoriteInApp(currentTrack.trackId || currentTrack.id)
                                ? "fill-red-500 text-red-500 scale-110"
                                : "text-app-fg/30 hover:text-red-500/80 hover:scale-105"
                            )}
                          />
                        </button>
                      </div>
                      <div className="flex flex-col gap-0.5">
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
                             "text-lg text-app-fg opacity-60 font-serif italic text-left w-fit transition-all",
                             currentTrack.artistId ? "hover:opacity-100 hover:text-app-accent cursor-pointer" : ""
                          )}
                        >
                          {currentTrack.artist}
                        </button>
                        {currentTrack.album && (
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
                               "text-xs text-app-fg opacity-30 font-medium uppercase tracking-wider text-left w-fit transition-all",
                               currentTrack.albumId ? "hover:opacity-100 hover:text-app-accent cursor-pointer" : ""
                            )}
                          >
                            {currentTrack.album}
                          </button>
                        )}
                      </div>
                    </div>
                    {currentTrack.coverUrl ? (
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
                          "relative group transition-transform active:scale-95",
                          currentTrack.albumId ? "cursor-pointer" : "cursor-default"
                        )}
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent)] to-purple-600 rounded-[1.8rem] opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
                        <img
                          src={currentTrack.coverUrl}
                          className="relative w-24 h-24 rounded-[1.5rem] object-cover shadow-2xl shrink-0 border border-app-card-border"
                          alt={`${currentTrack.title} cover`}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentTrack.title)}&background=random&color=fff&size=256`;
                          }}
                        />
                      </button>
                    ) : (
                      <div className="w-24 h-24 rounded-[1.5rem] bg-app-card border border-app-card-border flex items-center justify-center text-app-fg opacity-20 shrink-0 shadow-2xl">
                        <Music size={32} />
                      </div>
                    )}
                  </div>
                </div>

                {trackProgressViewModel && (
                  <div className="mb-6">
                    <TrackProgressTracker
                      viewModel={trackProgressViewModel}
                      activeTab={activeTab}
                      onAction={(actionType) => {
                        if (actionType === 'find_lyrics') {
                          handleNextStepClickDirect();
                        } else if (actionType === 'generate_analysis') {
                          handleNextStepClickDirect();
                        } else if (actionType === 'save_phrase') {
                          setActiveTab('analysis');
                        } else if (actionType === 'go_to_study' || actionType === 'review_again') {
                          setStudyTrackId(currentTrack.trackId);
                          goToStudy();
                        }
                      }}
                      onTabChange={(tab) => setActiveTab(tab)}
                    />
                  </div>
                )}

                {trackStudySummary && (
                  <div className="mb-6">
                    <TrackStudyBridge
                      summary={trackStudySummary}
                      onGoToStudy={() => {
                        setStudyTrackId(currentTrack.trackId);
                        goToStudy();
                      }}
                      trackTitle={`${currentTrack.title} — ${currentTrack.artist}`}
                    />
                  </div>
                )}

                {activeTab === "preview" && (
                  <div className="flex flex-col gap-8 pb-32">
                    {/* Show Meaning if we have it, even if loading lyrics in background */}
                    {currentTrack.meaning ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        <section className="p-8 rounded-[2.5rem] bg-app-card/60 border border-app-card-border shadow-app-card">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-app-accent leading-none">
                                Song Meaning
                              </h2>
                              {renderDifficultyIndicator(currentTrack.difficulty, true)}
                            </div>
                            {currentTrack.meaning && (!currentTrack.promptVersion || currentTrack.promptVersion < ANALYSIS_PROMPT_VERSION) && (
                              <button
                                onClick={handleAnalyzeSong}
                                title="Update analysis to newest version"
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-[9px] font-bold text-accent uppercase tracking-wider hover:bg-accent/20 transition-all group"
                              >
                                <RefreshCw size={10} className="group-active:rotate-180 transition-transform duration-500" />
                                Update Available
                              </button>
                            )}
                          </div>
                          <p className="text-xl font-serif italic text-app-fg opacity-80 leading-relaxed">
                            {currentTrack.meaning}
                          </p>
                        </section>

                        <section className="p-8 rounded-[2.5rem] bg-app-card/60 border border-app-card-border shadow-app-card flex flex-col gap-6">
                          <div className="flex items-center justify-between">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-app-accent leading-none">
                              Lyrics Preview
                            </h2>
                            <div className="flex gap-1 bg-app-card-border/30 p-1 rounded-xl">
                              <button
                                onClick={() => setPreviewLyricsMode("original")}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                  previewLyricsMode === "original"
                                    ? "bg-app-fg text-app-bg shadow"
                                    : "text-app-fg opacity-55 hover:opacity-100"
                                )}
                              >
                                Original
                              </button>
                              <button
                                onClick={() => setPreviewLyricsMode("translation")}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                  previewLyricsMode === "translation"
                                    ? "bg-app-fg text-app-bg shadow"
                                    : "text-app-fg opacity-55 hover:opacity-100"
                                )}
                              >
                                Translation
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 py-1 text-left select-text">
                            {currentTrack.lines && currentTrack.lines.length > 0 ? (
                              currentTrack.lines.slice(0, 15).map((lineData: any, i: number) => {
                                const text = previewLyricsMode === "original" ? lineData.original : lineData.translation;
                                const trimmed = text?.trim();
                                if (!trimmed) {
                                  return <div key={i} className="h-2" />;
                                }
                                return (
                                  <p key={i} className="text-lg font-serif text-app-fg opacity-85 leading-tight">
                                    {trimmed}
                                  </p>
                                );
                              })
                            ) : (
                              <p className="text-sm italic text-app-fg opacity-45">No lyrics content.</p>
                            )}
                          </div>

                          <div className="border-t border-app-card-border/60 pt-4 flex justify-start">
                            <button
                              onClick={() => setActiveTab("lyrics")}
                              className="flex items-center gap-2 text-app-accent hover:text-app-accent/80 font-black uppercase tracking-[0.15em] text-[10px] transition-all"
                            >
                              <Music size={14} />
                              <span>Go to Lyrics</span>
                            </button>
                          </div>
                        </section>

                        {(() => {
                          const analysisPhrases = currentTrack.lines 
                            ? currentTrack.lines.flatMap((l: any) => l.phrases || []).filter((p: any, i: number, self: any[]) => self.findIndex(t => t.text === p.text) === i)
                            : [];
                          const featuredPhrases = analysisPhrases.slice(0, 5);

                          if (featuredPhrases.length > 0) {
                            return (
                              <section className="p-8 rounded-[2.5rem] bg-app-card/60 border border-app-card-border shadow-app-card flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-app-accent leading-none">
                                    Key Phrases
                                  </h2>
                                </div>

                                <div className="flex flex-col gap-4">
                                  {featuredPhrases.map((phrase: any, idx: number) => {
                                    return (
                                      <div key={idx} className="flex flex-col gap-2 p-4 rounded-2xl bg-app-card border border-app-card-border/40 hover:bg-app-card/90 transition-all select-none text-left font-serif">
                                        <div className="flex flex-col gap-1">
                                          <p className="text-lg font-serif text-app-fg text-left">{phrase.text}</p>
                                          {phrase.translation && (
                                            <p className="text-sm font-serif italic text-app-fg opacity-60 text-left">
                                              {phrase.translation}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="border-t border-app-card-border/60 pt-4 flex justify-start">
                                  <button
                                    onClick={() => {
                                      setActiveTab("analysis");
                                      if (!currentTrack?.processingStatus?.stage3_completed) {
                                        handleGenerateAnalysis();
                                      }
                                    }}
                                    className="flex items-center gap-2 text-app-accent hover:text-app-accent/80 font-black uppercase tracking-[0.15em] text-[10px] transition-all"
                                  >
                                    <Brain size={14} />
                                    <span>Go to Analysis</span>
                                  </button>
                                </div>
                              </section>
                            );
                          } else {
                            return (
                              <section className="p-8 rounded-[2.5rem] bg-app-card/60 border border-app-card-border shadow-app-card flex flex-col gap-6 items-center text-center">
                                <Brain size={32} className="text-app-accent/60" />
                                <div>
                                  <h3 className="text-sm font-black text-app-fg uppercase tracking-wider mb-1">Analysis not generated</h3>
                                  <p className="text-xs text-app-fg opacity-60 max-w-xs">Run deep track analysis to extract key phrases.</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setActiveTab("analysis");
                                    if (!currentTrack?.processingStatus?.stage3_completed) {
                                      handleGenerateAnalysis();
                                    }
                                  }}
                                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-app-fg text-app-bg font-black uppercase tracking-[0.15em] text-[10px] transition-all hover:scale-105"
                                >
                                  <Brain size={12} />
                                  <span>Run Song Analysis</span>
                                </button>
                              </section>
                            );
                          }
                        })()}
                      </motion.div>
                    ) : (
                      /* If meaning is NOT available and we ARE loading it (lyrics or meaning) */
                      isLoadingLyrics ? (
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
                             <h3 className="text-lg font-black text-app-fg uppercase tracking-widest leading-none">
                               {loadingStep === "searching" ? "Finding Lyrics" : "Analyzing Meaning"}
                             </h3>
                             <p className="text-[10px] text-app-muted uppercase tracking-[0.2em]">
                               {loadingStep === "searching" ? "Scanning Databases" : "Consulting Gemini AI"}
                             </p>
                           </div>
                        </div>
                      ) : (
                        /* Default state: No meaning, not loading meaning specifically */
                        <section className="p-8 rounded-[2.5rem] bg-app-card/60 border border-app-card-border shadow-app-card flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-2xl bg-app-accent/10 flex items-center justify-center text-app-accent mb-6">
                            <Sparkles size={32} />
                          </div>
                          <h3 className="text-xl font-black text-app-fg mb-2">Analyze Song Meaning</h3>
                          <p className="text-sm text-app-muted max-w-sm mb-8">
                            Discover the hidden stories, emotions, and vocabulary secrets inside this track.
                          </p>
                          <button
                            onClick={handleAnalyzeSong}
                            className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl bg-app-accent text-white font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95"
                          >
                            <Brain size={18} />
                            <span>What is this song about?</span>
                          </button>
                          
                          {lyricsFetchError && (
                            <p className="mt-4 text-xs text-red-500 font-bold flex items-center gap-2">
                              <AlertTriangle size={14} />
                              {lyricsFetchError}
                            </p>
                          )}
                        </section>
                      )
                    )}
                  </div>
                )}

                {activeTab === "lyrics" && (
                  <div className="flex flex-col gap-1 pb-32">
                    <div className="flex justify-end px-1 pb-4">
                      {(currentTrack.rawLyrics || lyricsFetchError) && (
                        <div className="flex gap-2 items-center">
                          {currentTrack.rawLyrics && (
                            <div className="flex bg-app-card/80 backdrop-blur-md border border-app-card-border p-1 rounded-2xl shadow-sm text-xs gap-1.5 items-center">
                              {(() => {
                                const srcLangObj = SUPPORTED_LANGUAGES.find(l => 
                                  l.name.toLowerCase() === (currentTrack?.sourceLanguage || "English").toLowerCase() ||
                                  l.code.toLowerCase() === (currentTrack?.sourceLanguage || "English").toLowerCase()
                                );
                                const srcLangCode = srcLangObj ? srcLangObj.code : "EN";

                                const targetLangObj = SUPPORTED_LANGUAGES.find(l => 
                                  l.name.toLowerCase() === (targetLanguage || "Russian").toLowerCase() ||
                                  l.code.toLowerCase() === (targetLanguage || "Russian").toLowerCase()
                                );
                                const targetLangCode = targetLangObj ? targetLangObj.code : "RU";

                                const isSrcActive = lyricsDisplayMode === "lyrics" || lyricsDisplayMode === "both";
                                const isTargetActive = lyricsDisplayMode === "translation" || lyricsDisplayMode === "both";

                                return (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (isSrcActive) {
                                          if (!isTargetActive) return; // cannot turn off both
                                          handleSetLyricsDisplayMode("translation");
                                        } else {
                                          handleSetLyricsDisplayMode("both");
                                        }
                                      }}
                                      className={cn(
                                        "px-3 py-1.5 rounded-xl font-black transition-all uppercase tracking-wider text-[10px] flex items-center gap-1",
                                        isSrcActive
                                          ? "bg-app-accent text-white shadow-md scale-105"
                                          : "text-app-fg opacity-65 hover:opacity-100"
                                      )}
                                    >
                                      {isSrcActive && <Check size={10} />}
                                      <span>{srcLangCode}</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (isTargetActive) {
                                          if (!isSrcActive) return; // cannot turn off both
                                          handleSetLyricsDisplayMode("lyrics");
                                        } else {
                                          handleSetLyricsDisplayMode("both");
                                        }
                                      }}
                                      className={cn(
                                        "px-3 py-1.5 rounded-xl font-black transition-all uppercase tracking-wider text-[10px] flex items-center gap-1",
                                        isTargetActive
                                          ? "bg-app-accent text-white shadow-md scale-105"
                                          : "text-app-fg opacity-65 hover:opacity-100"
                                      )}
                                    >
                                      {isTargetActive && <Check size={10} />}
                                      <span>{targetLangCode}</span>
                                    </button>
                                    <button
                                      onClick={() => handleRegenerateTranslations(targetLanguage)}
                                      disabled={isTranslating}
                                      title="Regenerate Translation"
                                      className={cn(
                                        "p-2 rounded-xl transition-all text-app-fg hover:bg-app-fg/5 flex items-center justify-center outline-none",
                                        isTranslating ? "opacity-50 cursor-not-allowed" : "opacity-60 hover:opacity-100"
                                      )}
                                    >
                                      <RefreshCw size={12} className={cn("transition-transform duration-500", isTranslating ? "animate-spin" : "")} />
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                            <p className="text-sm font-bold text-app-fg opacity-45">No starred lines.</p>
                          </div>
                        );
                      }

                      return linesToRender.map((line: any) =>
                        renderLyricLine(line.original, line.index, false, false),
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
                                  ? "Checking lyrics databases..."
                                  : "Analyzing with AI..."}
                              </h3>
                              <p className="text-app-fg opacity-40 max-w-xs mx-auto text-sm">
                                {loadingStep === "searching"
                                  ? "Polling official sources for high-accuracy lyrics text."
                                  : "Detecting language, extracting authors, and translating for you."}
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
                                Lyrics not found
                              </h3>
                              <p className="text-sm text-app-fg opacity-40">
                                {lyricsFetchError}
                              </p>
                            </div>

                            <div className="space-y-4">
                              <div className="text-left space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-app-fg opacity-30 ml-2">
                                  Manual Entry
                                </label>
                                <textarea
                                  value={manualLyrics}
                                  onChange={(e) =>
                                    setManualLyrics(e.target.value)
                                  }
                                  placeholder="Paste lyrics here..."
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
                                  Retry AI search
                                </button>
                                <button
                                  onClick={handleManualLyricsSubmit}
                                  disabled={
                                    !manualLyrics.trim() || isLoadingLyrics
                                  }
                                  className="flex-[2] py-4 rounded-2xl bg-app-fg text-app-bg font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-20"
                                >
                                  {isLoadingLyrics
                                    ? "Processing..."
                                    : "Save & Analyze"}
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
                               <h3 className="text-xl font-black text-app-fg">Lyrics are missing</h3>
                               <p className="text-sm text-app-muted max-w-xs mx-auto italic font-serif">
                                 We haven't fetched the original text for this song yet.
                               </p>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                              <button
                                onClick={handleAnalyzeSong}
                                className="w-full py-4 rounded-2xl bg-app-accent text-white font-black uppercase tracking-widest text-[10px] shadow-xl transition-all hover:scale-105 active:scale-95"
                              >
                                Find Lyrics & Phrases
                              </button>
                              <button
                                onClick={() => setLyricsFetchError("manual")}
                                className="w-full py-4 rounded-2xl bg-app-fg/5 hover:bg-app-fg/10 text-app-fg font-black uppercase tracking-widest text-[10px] transition-all"
                              >
                                Enter Manually
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {currentTrack.authors && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                          Lyric Authors
                        </p>
                        <p className="text-sm font-serif italic text-app-fg">
                          {currentTrack.authors}
                        </p>
                      </div>
                    )}
                    {currentTrack.lyricSource && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                          Source
                        </p>
                        <p className="text-sm font-bold text-app-fg">
                          {currentTrack.lyricSource}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "analysis" && (
                  <div className="pb-32 space-y-12">
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
                          <h3 className="text-lg font-black text-app-fg uppercase tracking-widest">
                            {loadingStep === "searching" ? "Finding Lyrics" : "Deep Analysis"}
                          </h3>
                          <div className="flex items-center justify-center gap-3">
                             <div className="flex gap-1">
                                <div className={cn("w-1 h-1 rounded-full", loadingStep === "searching" ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                                <div className={cn("w-1 h-1 rounded-full", loadingStep === "analyzing" ? "bg-app-accent animate-pulse" : "bg-app-fg/10")} />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Consulting Gemini</span>
                          </div>
                        </div>
                      </div>
                    ) : (currentTrack.lines.some(l => l.phrases && l.phrases.length > 0)) ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-12"
                      >
                        {/* Phrases Section - Extracted from lines */}
                        <section className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                              <Star size={16} />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
                              Key Phrases
                            </h2>
                            <div className="flex gap-2 ml-auto">
                              {(!currentTrack.promptVersion || currentTrack.promptVersion < ANALYSIS_PROMPT_VERSION) && (
                                <div className="px-2 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                  <Sparkles size={10} />
                                  New Version Available
                                </div>
                              )}
                              <button
                                onClick={handleRegenerateAnalysis}
                                disabled={isGeneratingAnalysis}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                  !currentTrack.promptVersion || currentTrack.promptVersion < ANALYSIS_PROMPT_VERSION
                                    ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 opacity-100"
                                    : "bg-app-card border-app-card-border opacity-40 hover:opacity-100 hover:text-[var(--accent)]"
                                )}
                                title="Reset and regenerate analysis"
                              >
                                <RefreshCw size={10} className={isGeneratingAnalysis ? "animate-spin" : ""} />
                                {!currentTrack.promptVersion || currentTrack.promptVersion < ANALYSIS_PROMPT_VERSION ? "Update Analysis" : "Regenerate"}
                              </button>

                            </div>
                          </div>
                          <div className="grid gap-4">
                            {currentTrack.lines.flatMap(l => l.phrases).filter((p, i, self) => self.findIndex(t => t.text === p.text) === i).map((item, idx) => {
                              const card = phraseMetadata.get(item.text);
                              return (
                                  <AnalysisPhraseCard
                                    key={idx}
                                    item={item}
                                    idx={idx}
                                    card={card}
                                    handleSetAnalysisPhraseStatus={handleSetAnalysisPhraseStatus}
                                  />
                              );
                            })}
                          </div>
                        </section>
                      </motion.div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-center space-y-8 font-sans">
                        <div className="w-20 h-20 rounded-[2rem] bg-app-card border border-app-card-border flex items-center justify-center text-app-fg opacity-10">
                          <Brain size={40} />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-bold text-app-fg">No Analysis Yet</h3>
                          <p className="text-app-fg opacity-40 max-w-sm mx-auto font-sans">Click below to start deep learning for this song.</p>
                        </div>

                        {analysisError && (
                          <div id="analysis-error-banner" className="max-w-md mx-auto p-5 rounded-[1.5rem] bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center space-y-2">
                            <p className="font-bold uppercase tracking-wider text-[10px]">Analysis Error</p>
                            <p className="opacity-90">{analysisError}</p>
                          </div>
                        )}

                        <button
                          onClick={() => handleGenerateAnalysis()}
                          className="px-10 py-5 rounded-3xl bg-app-fg text-app-bg font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
                        >
                          <Sparkles size={16} />
                          Generate Deep Analysis
                        </button>
                      </div>
                    )}
                  </div>
                )}
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

      {/* Player Control Panel (Lyrics, Preview & Analysis Tabs) */}
      <AnimatePresence>
        {view === "lyrics" &&
          (activeTab === "lyrics" || activeTab === "preview" || activeTab === "analysis") &&
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
                <div 
                  className={cn(
                    "absolute top-0 left-0 right-0 h-1 bg-app-fg/5 cursor-pointer group/progress z-20",
                    activeTab === 'preview' ? 'opacity-100' : 'opacity-40'
                  )}
                  onClick={activeTab === 'preview' ? seekPreview : undefined}
                >
                  <motion.div 
                    initial={false}
                    animate={{ 
                      width: `${activeTab === 'preview' 
                        ? previewProgress 
                        : (activeLineIndex !== null && currentTrack.lines.length > 0 
                            ? ((activeLineIndex + 1) / currentTrack.lines.length) * 100 
                            : 0)}%` 
                    }}
                    className="h-full bg-gradient-to-r from-[var(--accent)] to-purple-500"
                  />
                </div>

                <div className="px-3 py-2 flex items-center justify-between">
                  {/* Left: Metadata / Mode Selector / Attribution */}
                  <div className="flex-1 flex items-center min-w-0 gap-2.5 pl-1.5">
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
                        <div className="w-[1px] h-4 bg-app-card-border/65 self-center mx-1" />
                        <button
                          onClick={handleToggleStarFilter}
                          className={cn(
                            "p-2 rounded-full transition-all active:scale-90",
                            isStarFilterActive
                              ? "bg-amber-500 text-white shadow-lg"
                              : "text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/5",
                          )}
                          title="Star Filter"
                        >
                          <Star size={20} className={isStarFilterActive ? "fill-white text-white" : "text-current"} />
                        </button>
                      </div>
                    ) : (
                      /* Minimalist info / iTunes Attribution */
                      <div className="flex items-center gap-3 pl-2 h-10">
                        {activeTab === "preview" && hasStartedPreview ? (
                          <motion.a
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            href={currentTrack.appleMusicUrl || `https://music.apple.com/search?term=${encodeURIComponent(currentTrack.artist + " " + currentTrack.title)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 group pointer-events-auto"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-black/5">
                              <img 
                                src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" 
                                alt="" 
                                className="h-4"
                              />
                            </div>
                            <div className="flex flex-col leading-none">
                              <span className="text-[6px] font-black uppercase tracking-wider text-app-muted/60 mb-0.5">
                                Preview from
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase tracking-tight text-[#fa243c]">
                                  iTunes Store
                                </span>
                                <ExternalLink size={8} className="text-app-muted group-hover:text-[var(--accent)] transition-colors" />
                              </div>
                            </div>
                          </motion.a>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-app-bg/50 border border-app-card-border shrink-0">
                              {currentTrack.coverUrl ? (
                                <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Music className="w-full h-full p-1.5 opacity-20" />
                              )}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[10px] font-black uppercase tracking-widest text-app-fg truncate">
                                 {activeTab === 'preview' ? 'Sample' : 'Exploring'}
                               </p>
                               <p className="text-[9px] font-medium text-app-muted truncate">
                                 {currentTrack.title}
                               </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Center: Play Control */}
                  <div className="flex-shrink-0 mx-2 relative group">
                    <motion.button
                      onClick={activeTab === "preview" ? togglePreviewAudio : () => toggleReadLyrics(getPlaybackLines)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl relative z-10"
                      style={{
                        backgroundColor: (activeTab === "preview" ? isPreviewPlaying : isReadingAll)
                          ? "var(--accent)"
                          : "var(--foreground)",
                        color: (activeTab === "preview" ? isPreviewPlaying : isReadingAll) ? "white" : "var(--background)",
                        boxShadow: (activeTab === "preview" ? isPreviewPlaying : isReadingAll)
                          ? "0 12px 30px -5px var(--accent)"
                          : "0 12px 30px -8px rgba(0,0,0,0.2)",
                      }}
                    >
                      {(activeTab === "preview" ? isPreviewPlaying : isReadingAll) ? (
                        <Pause size={26} fill="currentColor" />
                      ) : (
                        <Play size={26} className="ml-1" fill="currentColor" />
                      )}
                    </motion.button>
                  </div>

                  {/* Right: Tools */}
                  <div className="flex-1 flex justify-end items-center gap-1 pr-1">
                    {activeTab !== "preview" && (
                      <>
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95",
                            isMuted
                              ? "text-red-500 bg-red-500/10 opacity-100"
                              : "text-app-fg opacity-60 hover:opacity-100 hover:bg-app-fg/5",
                          )}
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <button
                          onClick={() => setIsLyricsSettingsOpen(true)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-app-fg opacity-60 hover:opacity-100 hover:bg-app-fg/5 transition-all active:scale-95"
                          title="Settings"
                        >
                          <Settings size={20} />
                        </button>
                      </>
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
                    {activeMenuTrack.coverUrl ? (
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
                            ? "Remove from favorites"
                            : "Add to favorites"}
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
                      <span className="font-medium text-app-fg">Add to playlist</span>
                    </button>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setActiveMenuTrack(null)}
                    className="w-full py-4 bg-app-fg/5 hover:bg-app-fg/10 active:scale-[0.99] rounded-2xl text-center font-semibold text-app-fg transition-all"
                  >
                    Close
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
                    <h3 className="font-bold text-lg text-app-fg">Add to playlist</h3>
                  </div>

                  {playlistsInApp.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                      {playlistsInApp.map((playlist) => {
                        const hasTrack = playlist.tracks?.some((t: any) => (t.id || t.trackId) === activeMenuTrack.id);
                        return (
                          <button
                            key={playlist.id}
                            type="button"
                            onClick={() => handleAddTrackToPlaylistInApp(playlist.id, activeMenuTrack)}
                            className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-app-fg/5 active:scale-[0.99] transition-all text-left"
                          >
                            <span className="font-medium text-app-fg">{playlist.name}</span>
                            {hasTrack ? (
                              <Check size={18} className="text-green-500" />
                            ) : (
                              <span className="text-xs text-app-muted">Add</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-app-muted italic">
                      You don't have any playlists yet. Create them in the Library tab!
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddToPlaylistOpenInApp(false)}
                    className="w-full py-4 bg-app-fg/5 hover:bg-app-fg/10 active:scale-[0.99] rounded-2xl text-center font-semibold text-app-fg transition-all"
                  >
                    Back
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
              className="relative w-full max-w-lg bg-app-bg border border-app-card-border rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-6">
                    {currentTrack.coverUrl && (
                      <img
                        src={currentTrack.coverUrl}
                        className="w-20 h-20 rounded-2xl object-cover shadow-lg border border-app-card-border"
                        alt="Cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-1">
                      <span
                        className="text-[10px] font-black uppercase tracking-[0.4em]"
                        style={{ color: "var(--accent)" }}
                      >
                        Resources & Source
                      </span>
                      <h3 className="text-xl font-bold text-app-fg">
                        {currentTrack.title}
                      </h3>
                      <p className="text-sm text-app-fg opacity-40 italic font-serif">
                        {currentTrack.artist}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsResourcesOpen(false)}
                    className="text-app-fg opacity-20 hover:opacity-100 transition-colors pt-1"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-4 border-b border-app-card-border">
                  <button
                    onClick={() => setResourceTab("links")}
                    className={cn(
                      "pb-2 text-sm font-bold transition-all border-b-2",
                      resourceTab === "links"
                        ? "border-accent text-accent"
                        : "border-transparent text-app-fg opacity-40 hover:opacity-100",
                    )}
                  >
                    External Links
                  </button>
                  <button
                    onClick={() => {
                      setResourceTab("lyrics");
                      if (lyricOptions.length === 0) handleManualLyricsSearch();
                    }}
                    className={cn(
                      "pb-2 text-sm font-bold transition-all border-b-2",
                      resourceTab === "lyrics"
                        ? "border-accent text-accent"
                        : "border-transparent text-app-fg opacity-40 hover:opacity-100",
                    )}
                  >
                    Lyrics Source
                  </button>
                </div>

                <div className="space-y-4">
                  {resourceTab === "links" ? (
                    <>
                      <p className="text-sm text-app-fg opacity-60">
                        External links and materials for this track.
                      </p>

                      <div className="grid gap-4 max-h-[45vh] overflow-y-auto pr-2 scrollbar-hide py-1">
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
                                "flex items-center justify-between p-5 rounded-3xl bg-app-card border border-app-card-border group transition-all",
                                resource.hoverBorder,
                                resource.hoverBg,
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                                    resource.bgColor,
                                    resource.color,
                                  )}
                                >
                                  <Icon size={24} />
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-app-fg">
                                    {resource.name}
                                  </p>
                                  <p className="text-xs text-app-fg opacity-40">
                                    {resource.subtitle}
                                  </p>
                                </div>
                              </div>
                              <ExternalLink
                                size={18}
                                className="text-app-fg opacity-10 group-hover:opacity-40 transition-opacity"
                              />
                            </a>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-app-fg opacity-60">
                          Choose an alternative source for lyrics.
                        </p>
                        <button
                          onClick={handleManualLyricsSearch}
                          disabled={isSearchingOptions}
                          className="p-2 rounded-xl bg-app-card border border-app-card-border text-app-fg hover:text-accent transition-colors disabled:opacity-50"
                        >
                          <RefreshCw
                            size={16}
                            className={cn(isSearchingOptions && "animate-spin")}
                          />
                        </button>
                      </div>

                      {lyricsFetchError && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
                          <AlertTriangle className="text-red-500 shrink-0" size={18} />
                          <p className="text-sm text-red-500 font-medium">
                            {lyricsFetchError}
                          </p>
                        </div>
                      )}

                      <div className="grid gap-4 max-h-[45vh] overflow-y-auto pr-2 scrollbar-hide py-1">
                        {isSearchingOptions ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-40">
                            <Loader2 size={32} className="animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest">
                              Searching sources...
                            </p>
                          </div>
                        ) : lyricOptions.length > 0 ? (
                          lyricOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => handleSelectLyricOption(option)}
                              className="w-full flex items-center justify-between p-5 rounded-3xl bg-app-card border border-app-card-border group hover:border-accent/40 transition-all text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center bg-accent/10 text-accent",
                                  )}
                                >
                                  <FileText size={20} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-app-fg">
                                      {option.title}
                                    </p>
                                    <span className="px-1.5 py-0.5 rounded-md bg-accent/10 text-[8px] font-black uppercase text-accent">
                                      {option.source}
                                    </span>
                                  </div>
                                  <p className="text-xs text-app-fg opacity-40">
                                    {option.artist} {option.album ? `• ${option.album}` : ""}
                                  </p>
                                </div>
                              </div>
                              <CheckCircle2
                                size={18}
                                className="text-accent opacity-0 group-hover:opacity-40 transition-opacity"
                              />
                            </button>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-40">
                            <Search size={32} />
                            <p className="text-xs font-bold uppercase tracking-widest">
                              No alternative sources found
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsResourcesOpen(false)}
                  className="w-full py-4 rounded-2xl bg-app-fg text-app-bg font-bold tracking-wide active:scale-95 transition-all"
                >
                  Done
                </button>
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
                    Lyrics Settings
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
                        Source Language
                      </p>
                      <p className="text-xs font-medium text-app-fg">
                        Used for pronunciation and search
                      </p>
                    </div>
                    <LanguageSelector
                      label="Source"
                      value={currentTrack.sourceLanguage || "English"}
                      highlight
                      onChange={(newLang) => {
                        setCurrentTrack((prev) =>
                          prev ? { ...prev, sourceLanguage: newLang } : null,
                        );
                        if (currentTrack.trackId) {
                          saveTrackData(currentTrack.trackId, {
                            sourceLanguage: newLang,
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-5 rounded-3xl bg-app-card border border-app-card-border">
                    <div className="space-y-1">
                      <p className="font-bold text-app-fg">
                        Skip Known Phrases
                      </p>
                      <p className="text-xs text-app-fg opacity-40">
                        Don't read lines you already know
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
                  Done
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
                    Phrase Action
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
                        Explanation
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
                          const card = phraseMetadata.get(editingLine.original);
                          if (card) {
                            handleUpdateStatus(card, "known");
                          }
                        }
                      }}
                      disabled={isSaving}
                      className="py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all bg-app-card border border-app-card-border text-app-fg hover:bg-opacity-80"
                    >
                      I know it
                    </button>
                    <button
                      onClick={() => {
                        if (editingLine) {
                          const card = phraseMetadata.get(editingLine.original);
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
                      {isSaving ? "Saving..." : "Learn"}
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
                    {isExplaining ? "Thinking..." : "Explain"}
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
              <div className="flex items-start justify-between gap-4 mb-2">
                <p className="text-2xl font-serif leading-tight">
                  {popoverData.phrase}
                </p>
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    phraseMetadata.get(popoverData.phrase)?.status === "known"
                      ? "bg-green-500"
                      : phraseMetadata.get(popoverData.phrase)?.status ===
                          "learning"
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
                    const currentStatus = phraseMetadata.get(
                      popoverData.phrase,
                    )?.status;
                    handlePopoverAction(
                      popoverData.phrase,
                      currentStatus === "learning" ? "new" : "learning",
                      popoverData.translation,
                      popoverData.explanation,
                    );
                    setPopoverData(null);
                  }}
                  className={cn(
                    "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    phraseMetadata.get(popoverData.phrase)?.status ===
                      "learning"
                      ? "bg-orange-500/20 text-orange-500 border border-orange-500/20"
                      : "bg-orange-500 text-white shadow-lg shadow-orange-500/20",
                  )}
                >
                  {phraseMetadata.get(popoverData.phrase)?.status === "learning"
                    ? "Learning"
                    : "Learn"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentStatus = phraseMetadata.get(
                      popoverData.phrase,
                    )?.status;
                    handlePopoverAction(
                      popoverData.phrase,
                      currentStatus === "known" ? "new" : "known",
                      popoverData.translation,
                      popoverData.explanation,
                    );
                    setPopoverData(null);
                  }}
                  className={cn(
                    "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    phraseMetadata.get(popoverData.phrase)?.status === "known"
                      ? "bg-green-500/20 text-green-500 border border-green-500/20"
                      : "bg-green-500 text-white shadow-lg shadow-green-500/20",
                  )}
                >
                  {phraseMetadata.get(popoverData.phrase)?.status === "known"
                    ? "Known"
                    : "Known"}
                </button>
              </div>
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
      />
    </div>
  );
}


