import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Languages,
  FileText,
  Music,
  List,
  Search,
  Plus,
  Brain,
  LogIn,
  LogOut,
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
  HelpCircle,
  Youtube,
  ListMusic,
  ExternalLink,
  Music2,
  Quote,
  Mic2,
  Activity,
  Globe,
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
  BookmarkPlus,
  Loader2,
  History,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Track, Artist, Album } from "./constants";
import { SUPPORTED_LANGUAGES } from "./lib/languages";
import {
  translateLyrics,
  detectLanguage,
  explainPhraseStructured,
  extractLyricsMetadata,
  generateSongMeaning,
  fetchTrackMeaning,
  getTrackMeaningFromCache,
  getOriginalLanguage,
  computeTrackKey,
  computeLyricsHash,
  getLineTranslations,
  getPhraseAnalysis,
  completeLyricsAnalysis,
  getLatestAnalyzedTracks,
  normalizeString,
  type TrackMetadata,
  type TrackMeaningEntry,
  ANALYSIS_PROMPT_VERSION,
  TRANSLATION_PROMPT_VERSION,
  saveTrackToSharedCache,
} from "./services/geminiService";
import { cn } from "./lib/utils";
import { auth, db, signIn, logOut, testDbConnection } from "./lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addPhraseToStudy,
  getCards,
  updatePhraseStatus,
  deleteFlashcard,
  type Flashcard,
  type PhraseStatus,
} from "./services/localCardService";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import StudyView from "./components/StudyView";
import SettingsView from "./components/SettingsView";
import PhraseDrawer from "./components/PhraseDrawer";
import { getLocaleByName } from "./lib/languages";
import LanguageSelector from "./components/LanguageSelector";
import {
  searchITunes,
  getArtistDetails,
  getAlbumDetails,
  fetchLyrics,
  getCachedTrackData,
  saveTrackData,
  clearCachedLyrics,
  getRecentTracks,
  addRecentTrack,
  splitLyricsIntoLines,
  searchLyricsOptions,
  fetchLyricsFromOption,
  type TrackLyricsData,
  type LyricOption,
  type LyricsLine,
  type Phrase,
} from "./services/musicService";

import {
  isOnboardingCompleted,
  completeOnboarding,
  shouldShowOnboarding,
} from "./services/onboardingService";
import { OnboardingHero } from "./components/OnboardingHero";



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
  isSaving,
  isListeningForSpeech,
  shadowingFeedback,
  shadowingAttempts,
  handleToggleStarLine,
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
  handleAddAnalysisPhrase,
  handleSetAnalysisPhraseStatus,
}: {
  item: any;
  idx: number;
  card: any;
  handleAddAnalysisPhrase: any;
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
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => isOnboardingCompleted());

  const [view, setView] = useState<"tracks" | "study" | "lyrics" | "settings">(
    "tracks",
  );
  const [activeTab, setActiveTab] = useState<"preview" | "lyrics" | "analysis">(
    "preview",
  );
  const [currentTrack, setCurrentTrack] = useState<TrackLyricsData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState(
    () => localStorage.getItem("lyrify_target_lang") || "Russian",
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("lyrify_theme") || "light",
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [phraseMetadata, setPhraseMetadata] = useState<Map<string, Flashcard>>(
    new Map(),
  );
  const [childCardsMap, setChildCardsMap] = useState<Map<string, Flashcard[]>>(
    new Map(),
  );
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [lyricsDisplayMode, setLyricsDisplayMode] = useState<"lyrics" | "translation" | "both">(
    () => (localStorage.getItem("cantolex_lyrics_display_mode") as any) || "both"
  );
  const [isStarFilterActive, setIsStarFilterActive] = useState<boolean>(
    () => localStorage.getItem("cantolex_star_filter_active") === "true"
  );
  const [previewLyricsMode, setPreviewLyricsMode] = useState<"original" | "translation">("original");

  const handleSetLyricsDisplayMode = (mode: "lyrics" | "translation" | "both") => {
    setLyricsDisplayMode(mode);
    localStorage.setItem("cantolex_lyrics_display_mode", mode);
  };

  const handleToggleStarFilter = () => {
    setIsStarFilterActive((prev) => {
      const nextVal = !prev;
      localStorage.setItem("cantolex_star_filter_active", String(nextVal));
      return nextVal;
    });
  };

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

  const handleSetAnalysisPhraseStatus = async (
    phrase: string,
    translation: string,
    explanation: string,
    status: PhraseStatus
  ) => {
    if (!currentTrack) return;
    const existingCard = phraseMetadata.get(phrase);
    if (existingCard) {
      try {
        await updatePhraseStatus(existingCard.id, status);
        await loadUserCards();
      } catch (err) {
        console.error(err);
      }
    } else {
      await handleAddAnalysisPhrase(phrase, translation, explanation, status);
    }
  };

  const [isMuted, setIsMuted] = useState(
    () => localStorage.getItem("lyrify_muted") === "true",
  );
  const [dynamicTracks, setDynamicTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  // --- One-time Cleanup marker ---
  useEffect(() => {
    localStorage.setItem("lyrify_wiped_v3", "true");
  }, []);
  // --------------------------------------
  const [popoverData, setPopoverData] = useState<{
    phrase: string;
    translation: string;
    explanation?: string;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("lyrify_muted", String(isMuted));
  }, [isMuted]);

  const loadUserCards = async () => {
    try {
      const cards = await getCards();
      const meta = new Map<string, Flashcard>();
      const children = new Map<string, Flashcard[]>();

      cards.forEach((card) => {
        meta.set(card.text, card);
        if (card.lineId) {
          const list = children.get(card.lineId) || [];
          list.push(card);
          children.set(card.lineId, list);
        }
      });

      setPhraseMetadata(meta);
      setChildCardsMap(children);
    } catch (err) {
      console.error("Failed to load cards:", err);
    }
  };

  useEffect(() => {
    loadUserCards();
  }, []);
  const getLineStatus = (line: string) => {
    const children = childCardsMap.get(line) || [];

    if (children.length === 0) return "new";

    const statuses = children.map((c) => c.status);

    if (statuses.every((s) => s === "known")) return "known";
    // If at least one is being studied or is known (but not all are known), it's learning
    if (statuses.some((s) => s === "learning" || s === "known"))
      return "learning";
    return "new";
  };

  const handleAddLineWithComponents = async (
    line: string,
    index: number,
    status: PhraseStatus = "learning",
  ) => {
    if (!currentTrack) return;
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    setIsSaving(true);
    try {
      let addedCount = 0;

      // 1. Find and add components (phrases)
    const phrasesInLine = getPhrasesForLine(index);

    const allToProcess = [
      ...phrasesInLine.map((c: Phrase) => ({
        text: c.text,
        trans: c.translation,
        expl: c.explanation,
      })),
    ];

    for (const item of allToProcess) {
      const existing = phraseMetadata.get(item.text);
      if (!existing || !existing.id) {
        await addPhraseToStudy({
          text: item.text,
          translation: item.trans,
          trackId: currentTrack.trackId,
          trackTitle: currentTrack.title,
          artist: currentTrack.artist,
          sourceLanguage: currentTrack.sourceLanguage,
          lineId: trimmedLine,
          explanation: item.expl || '',
          type: 'phrase'
        }, status);
        addedCount++;
      } else {
        // Update existing component status if we're marking line as known/learn
        if (existing.status !== status) {
          await updatePhraseStatus(existing.id, status);
        }
      }
    }

      // 2. Refresh all cards
      await loadUserCards();

      if (addedCount > 0) {
        console.log(`Added components (${addedCount} total)`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatusLocal = async (
    card: Flashcard,
    status: PhraseStatus,
  ) => {
    try {
      await updatePhraseStatus(card.id, status);
      await loadUserCards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAnalysisPhrase = async (
    phrase: string,
    translation: string,
    explanation: string,
    status: PhraseStatus = "learning"
  ) => {
    if (!currentTrack) return;

    // Find parent line if any
    let parentLine = "";
    for (const line of currentTrack.lines) {
      if (line.original.includes(phrase)) {
        parentLine = line.original.trim();
        break;
      }
    }

    try {
      await addPhraseToStudy({
        text: phrase,
        translation: translation,
        trackId: currentTrack.trackId,
        trackTitle: currentTrack.title,
        artist: currentTrack.artist,
        sourceLanguage: currentTrack.sourceLanguage,
        lineId: parentLine || '',
        explanation: explanation,
        lemmas: [],
        type: 'phrase'
      }, status);
      await loadUserCards();
    } catch (err) {
      console.error(err);
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLyricsSettingsOpen, setIsLyricsSettingsOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [resourceTab, setResourceTab] = useState<"links" | "lyrics">("links");
  const [editingLine, setEditingLine] = useState<{
    original: string;
    translation: string;
    explanation?: string;
    cardId?: string;
    status: PhraseStatus;
    index: number;
    language?: string;
  }>({
    original: "",
    translation: "",
    status: "new",
    index: -1,
  });
  const [isExplaining, setIsExplaining] = useState(false);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [isEditingTranslation, setIsEditingTranslation] = useState(false);
  const isReadingAllRef = useRef(false);
  const playbackModeRef = useRef<"listening" | "shadowing">("listening");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const getPhrasesForLine = (lineIdx: number) => {
    if (!currentTrack) return [];
    return currentTrack.lines[lineIdx]?.phrases || [];
  };

  useEffect(() => {
    let timeoutId: number | undefined;
    if (
      activeLineIndex !== null &&
      lineRefs.current.has(activeLineIndex) &&
      scrollContainerRef.current
    ) {
      const scroll = () => {
        const activeEl = lineRefs.current.get(activeLineIndex!);
        const container = scrollContainerRef.current;
        if (activeEl && container) {
          const containerRect = container.getBoundingClientRect();
          const activeRect = activeEl.getBoundingClientRect();
          
          // Calculate relative position within the scrollable content
          const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
          const elHeight = activeRect.height;
          const containerHeight = containerRect.height;

          container.scrollTo({
            top: relativeTop - containerHeight / 2 + elHeight / 2,
            behavior: "smooth",
          });
        }
      };

      // Try scrolling immediately
      scroll();
      // Also try after a short delay to account for layout shifts/expansions
      timeoutId = window.setTimeout(scroll, 100);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeLineIndex, activeTab]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lyrify_theme", theme);
  }, [theme]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchEntityType, setSearchEntityType] = useState<"musicTrack" | "album" | "musicArtist">("musicTrack");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [artistDetails, setArtistDetails] = useState<{ artist: Artist; albums: Album[]; topTracks: Track[] } | null>(null);
  const [albumDetails, setAlbumDetails] = useState<{ album: Album; tracks: Track[] } | null>(null);
  const [isSearchingDetails, setIsSearchingDetails] = useState(false);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState<'recent' | 'community'>('recent');
  const [communityLangFilter, setCommunityLangFilter] = useState<string>('All');
  const [communityDifficultyFilter, setCommunityDifficultyFilter] = useState<string>('All');
  const [searchHistory, setSearchHistory] = useState<string[]>(
    () => JSON.parse(localStorage.getItem("lyrify_search_history") || "[]")
  );
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [loadingStep, setLoadingStep] = useState<
    "idle" | "searching" | "meaning" | "analyzing" | "translating"
  >("idle");
  const [lyricsFetchError, setLyricsFetchError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [manualLyrics, setManualLyrics] = useState("");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [hasStartedPreview, setHasStartedPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [dbConnectionError, setDbConnectionError] = useState(false);

  const [lyricOptions, setLyricOptions] = useState<LyricOption[]>([]);
  const [isSearchingOptions, setIsSearchingOptions] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");

  useEffect(() => {
    isReadingAllRef.current = isReadingAll;
  }, [isReadingAll]);

  const [isSaving, setIsSaving] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<"listening" | "shadowing">(
    "listening",
  );

  useEffect(() => {
    localStorage.setItem("lyrify_target_lang", targetLanguage);
    playbackModeRef.current = playbackMode;
  }, [playbackMode, targetLanguage]);
  const [shadowingAttempts, setShadowingAttempts] = useState(0);
  const [isListeningForSpeech, setIsListeningForSpeech] = useState(false);
  const [skipKnownPhrases, setSkipKnownPhrases] = useState(
    () => localStorage.getItem("skip_known") === "true",
  );
  const [shadowingFeedback, setShadowingFeedback] = useState<
    "none" | "correct" | "incorrect"
  >("none");

  const [isPhraseDrawerOpen, setIsPhraseDrawerOpen] = useState(false);
  const [phraseDrawerData, setPhraseDrawerData] = useState<{
    phrase: string;
    translation: string;
    explanation: string;
  }>({
    phrase: "",
    translation: "",
    explanation: "",
  });
  const [structuredCache, setStructuredCache] = useState<Map<string, any>>(
    new Map(),
  );

  const recognitionRef = useRef<any>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const incorrectAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelSearchDetails = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSearchingDetails(false);
    setIsSearching(false);
  };

  useEffect(() => {
    localStorage.setItem("skip_known", String(skipKnownPhrases));
  }, [skipKnownPhrases]);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    }
  }, [searchEntityType]);

  useEffect(() => {
    // Initialize audio feedback
    correctAudioRef.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
    );
    incorrectAudioRef.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
    );

    // Initialize speech recognition if available
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  useEffect(() => {
    console.log("[useEffect] Initializing app...");
    // Warm up TTS voices
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }

    try {
      const recent = getRecentTracks();
      console.log("[useEffect] Recent tracks loaded:", recent.length);
      setRecentTracks(recent);
      // Default to community if no recent tracks
      if (recent.length === 0) {
        setActiveLibraryTab('community');
      }
    } catch (e) {
      console.error("[useEffect] Failed to get recent tracks:", e);
      setRecentTracks([]);
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("[useEffect] Auth state changed:", u?.uid || "Guest");
      setUser((prev) => {
        if (prev?.uid === u?.uid) return prev;
        return u;
      });
    });

    // Check DB connection
    testDbConnection().then((connected) => {
      console.log("[useEffect] DB connected:", connected);
      if (!connected) setDbConnectionError(true);
    });

    loadCommunityTracks();

    return () => unsubscribe();
  }, []);

  const loadCommunityTracks = async () => {
    console.log("[loadCommunityTracks] Starting fetch...");
    setIsLoadingTracks(true);
    try {
      const dbTracks = await getLatestAnalyzedTracks(24);
      console.log("[loadCommunityTracks] Fetched raw items from DB:", dbTracks.length);
      const appTracks: Track[] = dbTracks.map((t: any) => {
        // Robust artist extraction
        let artistName = "Unknown Artist";
        if (Array.isArray(t.artists) && t.artists.length > 0) {
          artistName = t.artists[0];
        } else if (typeof t.artists === 'string') {
          artistName = t.artists;
        } else if (t.artist) {
          artistName = t.artist;
        }

        return {
          id: t.trackKey || String(Math.random()),
          title: t.title || "Unknown Title",
          artist: artistName,
          artistId: t.artistId || "",
          album: t.albumName || "Unknown Album",
          albumId: t.albumId || "",
          coverUrl: t.coverUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop",
          audioUrl: t.audioUrl || "",
          appleMusicUrl: t.appleMusicUrl || "",
          sourceLanguage: t.originalLanguage || "English",
          difficulty: t.difficulty,
          promptVersion: t.promptVersion,
          meaning: (() => {
            const langKey = targetLanguage.toLowerCase().trim();
            if (langKey === 'spanish') return t.meanings?.es || t.meanings?.en;
            if (langKey === 'russian') return t.meanings?.ru || t.meanings?.en;
            if (langKey === 'polish') return t.meanings?.pl || t.meanings?.en;
            return t.meanings?.en;
          })(),
          meanings: t.meanings,
          documentId: t.trackKey
        };
      });
      console.log("[loadCommunityTracks] Mapped tracks count:", appTracks.length);
      setDynamicTracks(appTracks);
    } catch (err) {
      console.error("[loadCommunityTracks] Error during loading/mapping:", err);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const resetUserData = async () => {
    console.log("Resetting user data...");
    localStorage.clear();
    console.log("LocalStorage cleared");
    try {
      const idb = await import('idb-keyval');
      await idb.del('lyrify_flashcards');
      console.log("IndexedDB cleared");
    } catch (err) {
      console.error("Failed to clear IndexedDB:", err);
    }
    console.log("Reloading...");
    window.location.reload();
  };

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
    if (view === "lyrics" && !currentTrack) {
      setView("tracks");
    }
    if (view !== "lyrics") {
      setIsReadingAll(false);
      window.speechSynthesis.cancel();
    }
  }, [view, currentTrack]);

  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
      setHasStartedPreview(false);
      setPreviewProgress(0);
    }
  }, [currentTrack?.audioUrl, activeTab]);

  const togglePreviewAudio = () => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play();
      setHasStartedPreview(true);
    }
    setIsPreviewPlaying(!isPreviewPlaying);
  };

  const handlePreviewTimeUpdate = () => {
    if (previewAudioRef.current) {
      const dur = previewAudioRef.current.duration;
      const p = dur && !isNaN(dur) ? (previewAudioRef.current.currentTime / dur) * 100 : 0;
      setPreviewProgress(isNaN(p) ? 0 : p);
    }
  };

  const handlePreviewLoadedMetadata = () => {
    if (previewAudioRef.current) {
      const dur = previewAudioRef.current.duration;
      setPreviewDuration(isNaN(dur) ? 0 : dur);
    }
  };

  const handlePreviewEnded = () => {
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
  };

  const seekPreview = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewAudioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedProgress = Math.max(0, Math.min(1, x / rect.width));
    previewAudioRef.current.currentTime = clickedProgress * previewAudioRef.current.duration;
  };

  useEffect(() => {
    if (view === "lyrics" && currentTrack?.rawLyrics && targetLanguage) {
      if (!currentTrack.processingStatus.stage3_completed) {
        runStage3(currentTrack).catch(e => console.error("Auto background stage 3 failed:", e));
      }
    }
  }, [targetLanguage]);

  useEffect(() => {
    if (!currentTrack) return;
    
    // If we have meanings dictionary
    if (currentTrack.meanings) {
      const langKey = targetLanguage.toLowerCase().trim();
      let meaning = currentTrack.meanings.en || "";
      if (langKey === 'spanish') meaning = currentTrack.meanings.es || currentTrack.meanings.en || "";
      else if (langKey === 'russian') meaning = currentTrack.meanings.ru || currentTrack.meanings.en || "";
      else if (langKey === 'polish') meaning = currentTrack.meanings.pl || currentTrack.meanings.en || "";

      if (meaning && currentTrack.meaning !== meaning) {
        setCurrentTrack(prev => {
          if (!prev || prev.trackId !== currentTrack.trackId) return prev;
          const updated = { ...prev, meaning };
          saveTrackData(prev.trackId, updated);
          return updated;
        });
      }
    } else {
      // If meanings is missing, let's look it up from Firestore cache to find all translations
      getTrackMeaningFromCache(currentTrack.title, [currentTrack.artist], targetLanguage)
        .then(cacheResult => {
          if (cacheResult && cacheResult.meanings) {
            const langKey = targetLanguage.toLowerCase().trim();
            let meaning = cacheResult.meanings.en || "";
            if (langKey === 'spanish') meaning = cacheResult.meanings.es || cacheResult.meanings.en || "";
            else if (langKey === 'russian') meaning = cacheResult.meanings.ru || cacheResult.meanings.en || "";
            else if (langKey === 'polish') meaning = cacheResult.meanings.pl || cacheResult.meanings.en || "";

            setCurrentTrack(prev => {
              if (!prev || prev.trackId !== currentTrack.trackId) return prev;
              const updated = { 
                ...prev, 
                meaning, 
                meanings: cacheResult.meanings 
              };
              saveTrackData(prev.trackId, updated);
              return updated;
            });
          }
        })
        .catch(err => console.error("Auto background meanings reload failed:", err));
    }
  }, [targetLanguage, currentTrack?.trackId]);

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = (text: string, onEnd?: () => void, lang?: string) => {
    window.speechSynthesis.cancel();

    if (isMuted) {
      if (onEnd) onEnd();
      return;
    }

    // Tiny timeout helps some mobile browsers reset TTS state
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = utterance;

      if (lang) {
        const norm = lang.toLowerCase().trim();
        const found = SUPPORTED_LANGUAGES.find(
          l => l.code.toLowerCase() === norm || l.name.toLowerCase() === norm || l.locale.toLowerCase() === norm
        );
        utterance.lang = found ? found.locale : getLocaleByName(currentTrack?.sourceLanguage || "English");
      } else {
        const sourceLang = currentTrack?.sourceLanguage || "English";
        utterance.lang = getLocaleByName(sourceLang);
      }
      utterance.rate = 0.95;

      if (onEnd) {
        utterance.onend = () => {
          if (currentUtteranceRef.current === utterance) {
            currentUtteranceRef.current = null;
          }
          onEnd();
        };
        utterance.onerror = (e) => {
          if (currentUtteranceRef.current === utterance) {
            currentUtteranceRef.current = null;
          }
          if (e.error !== "interrupted" && e.error !== "canceled") {
            onEnd();
          }
        };
      } else {
        utterance.onend = () => {
          if (currentUtteranceRef.current === utterance) {
            currentUtteranceRef.current = null;
          }
        };
      }

      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const [selectedLineIndexForDrawer, setSelectedLineIndexForDrawer] =
    useState<number | null>(null);

  const openPhraseDrawer = (lineIndex: number) => {
    setSelectedLineIndexForDrawer(lineIndex);
    setIsPhraseDrawerOpen(true);
  };

  const getLineProgress = (i: number) => {
    const lineDetails = currentTrack?.lines?.[i];
    if (
      !lineDetails ||
      !lineDetails.phrases ||
      lineDetails.phrases.length === 0
    )
      return null;

    const total = lineDetails.phrases.length;
    const known = lineDetails.phrases.filter(
      (p: Phrase) => phraseMetadata.get(p.text)?.status === "known",
    ).length;

    return {
      percentage: (known / total) * 100,
      known,
      total,
    };
  };

  const handleLineClick = (
    line: string,
    index: number,
    extraToRead?: string,
  ) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Stop auto-reading if it's active
    if (isReadingAll) {
      setIsReadingAll(false);
      isReadingAllRef.current = false;
    }

    // Cancel any ongoing speech and recognition
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setIsListeningForSpeech(false);
    setShadowingFeedback("none");

    setActiveLineIndex(index);

    const textToSpeak = extraToRead
      ? `${trimmedLine}. ${extraToRead}`
      : trimmedLine;

    speak(textToSpeak, () => {
      // If manually clicked in shadowing mode, trigger the recognition for the main line
      if (playbackModeRef.current === "shadowing") {
        // Clear previous state for this line
        setShadowingFeedback("none");

        // Small delay to ensure TTS is fully finished and mic can open
        setTimeout(() => {
          startSpeechToText(trimmedLine, (isMatch) => {
            if (isMatch) {
              setShadowingFeedback("correct");
              correctAudioRef.current?.play().catch(() => {});
            } else {
              setShadowingFeedback("incorrect");
              incorrectAudioRef.current?.play().catch(() => {});
            }
            setTimeout(() => setShadowingFeedback("none"), 1500);
          });
        }, 300);
      }
    });
  };

  const handleOpenAddModal = async (line: string, currentIndex: number) => {
    const trimmedLine = line.trim();
    if (!user) {
      alert("Please sign in to save phrases to your deck");
      return;
    }

    const existingMetadata = phraseMetadata.get(trimmedLine);
    const fullTransLines = currentTrack?.fullTranslation?.split("\n") || [];
    const fullTrans = fullTransLines[currentIndex];

    const matchedLineItem = currentTrack?.lines.find(l => l.index === currentIndex);

    setEditingLine({
      original: trimmedLine,
      translation:
        existingMetadata?.translatedPhrase || fullTrans || "Translating...",
      explanation: existingMetadata?.explanation,
      cardId: existingMetadata?.id,
      status: existingMetadata?.status || "learning",
      index: currentIndex,
      language: matchedLineItem?.language,
    });
    setIsEditModalOpen(true);

    if (!existingMetadata?.translatedPhrase && !fullTrans) {
      try {
        const translation = await translateLyrics(trimmedLine, targetLanguage);
        setEditingLine((prev) => ({ ...prev, translation: translation || "" }));
      } catch (error) {
        setEditingLine((prev) => ({
          ...prev,
          translation: "Translation failed",
        }));
      }
    }
  };

  const handleOpenAddAnalysisItem = (
    original: string,
    translation: string,
    explanation: string,
  ) => {
    if (!user) {
      alert("Please sign in to save phrases to your deck");
      return;
    }

    const existingMetadata = phraseMetadata.get(original);

    setEditingLine({
      original,
      translation: existingMetadata?.translation || translation || "",
      explanation: existingMetadata?.explanation || explanation,
      cardId: existingMetadata?.id,
      status: existingMetadata?.status || "learning",
      index: -1,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStatus = async (status: PhraseStatus) => {
    if (!user || !currentTrack || !editingLine.original) return;

    setIsSaving(true);
    try {
      if (editingLine.index >= 0) {
        // Use cascade logic for full lines
        await handleAddLineWithComponents(
          editingLine.original,
          editingLine.index,
          status,
        );
      } else {
        if (editingLine.cardId) {
          await updatePhraseStatus(
            editingLine.cardId,
            status,
          );
          await loadUserCards();
        } else {
          // Find parent line for new card
          const lines = currentTrack.rawLyrics?.split("\n") || [];
          const parentLine = lines.find((l) =>
            l.includes(editingLine.original),
          );

          await addPhraseToStudy({
            text: editingLine.original,
            translation: editingLine.translation,
            trackId: currentTrack.trackId,
            lineId: parentLine?.trim() || '',
            explanation: editingLine.explanation || '',
            lemmas: [],
            type: 'phrase'
          }, status);
          await loadUserCards();
        }
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExplain = async () => {
    if (!editingLine.original) return;
    setIsExplaining(true);
    try {
      const result = await explainPhraseStructured(
        editingLine.original,
        targetLanguage,
      );
      const explanation = result.explanation;
      setEditingLine((prev) => ({ ...prev, explanation }));

      // Persist immediately if possible
      if (user && currentTrack) {
        if (editingLine.cardId) {
          await updatePhraseStatus(
            editingLine.cardId,
            editingLine.status as PhraseStatus,
          );
          setPhraseMetadata((prev) => {
            const next = new Map(prev);
            const card = next.get(editingLine.original);
            if (card) {
              next.set(editingLine.original, { ...(card as any), explanation });
            }
            return next;
          });
        } else {
          const cardId = await addPhraseToStudy({
            text: editingLine.original,
            translation: editingLine.translation,
            trackId: currentTrack.trackId,
            lineId: '', // Standalone explanation usually doesn't have parent line easily available or we could search for it
            explanation: explanation,
            lemmas: [],
            type: 'phrase'
          }, "learning");
          if (cardId) {
            setEditingLine((prev) => ({ ...prev, cardId, status: "learning" }));
            setPhraseMetadata((prev) => {
              const next = new Map(prev);
              const newCard: Flashcard = {
                id: cardId,
                phraseId: cardId,
                text: editingLine.original,
                translation: editingLine.translation,
                explanation: explanation,
                status: "learning",
                trackId: currentTrack.trackId,
                due: new Date(),
                state: 0,
                elapsed_days: 0,
                scheduled_days: 0,
                stability: 0,
                difficulty: 0,
                reps: 0,
                lapses: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              next.set(editingLine.original, newCard);
              return next;
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleOpenStructuredAnalysis = async (
    line: string,
    index: number,
    forceAI: boolean = false,
  ) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    setActiveLineIndex(index);

    if (structuredCache.has(trimmed)) {
      setPhraseDrawerData(structuredCache.get(trimmed));
      setIsPhraseDrawerOpen(true);
      return;
    }

    // Check if we already have some context (like auto-translation and existing components)
    const phrases = getPhrasesForLine(index);
    if ((phrases.length > 0 || index >= 0) && !forceAI) {
      const fullTransLines = currentTrack?.fullTranslation?.split("\n") || [];
      const data = {
        phrase: trimmed,
        translation: fullTransLines[index] || "",
        explanation: "", // Will be empty until explained, but we show components
      };
      setPhraseDrawerData(data);
      setIsPhraseDrawerOpen(true);
      return;
    }

    // Otherwise use async structured explanation for the whole line
    setIsExplaining(true);
    try {
      const result = await explainPhraseStructured(trimmed, targetLanguage);
      const data = {
        phrase: trimmed,
        translation: result.translation,
        explanation: result.explanation,
      };
      setStructuredCache((prev) => new Map(prev).set(trimmed, data));
      setPhraseDrawerData(data);
      setIsPhraseDrawerOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExplaining(false);
    }
  };

  const getPlaybackLines = () => {
    if (!currentTrack || !currentTrack.lines) return [];
    if (isStarFilterActive) {
      // Filter by starred
      let starred = currentTrack.lines.filter((l: any) => l.isStarred);
      // De-duplicate repeats of identical lines
      const seen = new Set<string>();
      starred = starred.filter((l: any) => {
        const trimmed = l.original.trim();
        if (!trimmed || seen.has(trimmed)) return false;
        seen.add(trimmed);
        return true;
      });
      return starred;
    }
    return currentTrack.lines;
  };

  const toggleReadLyrics = () => {
    if (isReadingAll) {
      setIsReadingAll(false);
      isReadingAllRef.current = false;
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListeningForSpeech(false);
    } else {
      if (!currentTrack?.rawLyrics) return;
      setIsReadingAll(true);
      isReadingAllRef.current = true;

      const playbackLines = getPlaybackLines();
      if (playbackLines.length === 0) {
        setIsReadingAll(false);
        isReadingAllRef.current = false;
        return;
      }

      let startIndex = 0;
      if (activeLineIndex !== null) {
        // Find index of the next playable line after activeLineIndex
        const nextIdx = playbackLines.findIndex((l: any) => l.index > activeLineIndex);
        if (nextIdx !== -1) {
          startIndex = nextIdx;
        } else {
          startIndex = 0;
        }
      }

      setShadowingAttempts(0);
      readNextLine(playbackLines, startIndex);
    }
  };

  const startSpeechToText = (
    expectedText: string,
    onResult: (match: boolean) => void,
  ) => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      onResult(true);
      return;
    }

    // Stop synthesis before starting recognition to avoid mic picking up its own voice
    window.speechSynthesis.cancel();

    let isFinished = false;
    const finish = (result: boolean) => {
      if (isFinished) return;
      isFinished = true;
      setIsListeningForSpeech(false);

      // Stop recognition session properly
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}

      onResult(result);
    };

    // Failsafe timeout
    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        console.warn("Speech recognition timed out");
        finish(false);
      }
    }, 8000);

    setIsListeningForSpeech(true);
    recognitionRef.current.lang = getLocaleByName(
      currentTrack?.sourceLanguage || "English",
    );

    recognitionRef.current.onresult = (event: any) => {
      clearTimeout(timeoutId);
      const transcript =
        event.results[event.results.length - 1][0].transcript.toLowerCase();
      const cleanExpected = expectedText
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .trim();
      const cleanActual = transcript
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .trim();

      const expectedWords = cleanExpected
        .split(/\s+/)
        .filter((w) => w.length > 0);
      const actualWords = cleanActual.split(/\s+/).filter((w) => w.length > 0);

      if (expectedWords.length === 0) {
        finish(true);
        return;
      }

      const matches = expectedWords.filter((w) =>
        actualWords.includes(w),
      ).length;
      const matchRatio = matches / expectedWords.length;

      finish(matchRatio > 0.4);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      clearTimeout(timeoutId);
      // Aborted by us or browser? Just fail this attempt
      finish(false);
    };

    recognitionRef.current.onend = () => {
      clearTimeout(timeoutId);
      if (!isFinished) finish(false);
    };

    try {
      recognitionRef.current.abort();
    } catch (e) {}

    setTimeout(() => {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("SR start error:", e);
        finish(false);
      }
    }, 300);
  };

  const readNextLine = (playbackLines: any[], index: number) => {
    if (index >= playbackLines.length || !isReadingAllRef.current) {
      setIsReadingAll(false);
      isReadingAllRef.current = false;
      return;
    }

    const lineObj = playbackLines[index];
    const currentLine = lineObj.original.trim();
    if (!currentLine) {
      readNextLine(playbackLines, index + 1);
      return;
    }

    // Skip known phrases if setting is enabled
    const metadata = phraseMetadata.get(currentLine);
    if (skipKnownPhrases && metadata?.status === "known") {
      readNextLine(playbackLines, index + 1);
      return;
    }

    setActiveLineIndex(lineObj.index);
    speak(currentLine, () => {
      // Use ref to check the LATEST mode, ensuring the behavior updates if user toggles mid-speech
      const currentMode = playbackModeRef.current;

      if (currentMode === "shadowing" && isReadingAllRef.current) {
        // Wait for user to repeat
        startSpeechToText(currentLine, (isMatch) => {
          if (isMatch) {
            setShadowingFeedback("correct");
            correctAudioRef.current?.play().catch((e) => {});
            setShadowingAttempts(0);
            setTimeout(() => {
              setShadowingFeedback("none");
              if (isReadingAllRef.current) readNextLine(playbackLines, index + 1);
            }, 1200);
          } else {
            setShadowingFeedback("incorrect");
            incorrectAudioRef.current?.play().catch((e) => {});
            setShadowingAttempts((prev) => {
              const newAttempts = prev + 1;
              if (newAttempts >= 3) {
                // Skip to next after 3 attempts
                setTimeout(() => {
                  setShadowingFeedback("none");
                  if (isReadingAllRef.current)
                    readNextLine(playbackLines, index + 1);
                }, 1500);
                return 0;
              } else {
                // Repeat current line
                setTimeout(() => {
                  setShadowingFeedback("none");
                  if (isReadingAllRef.current) readNextLine(playbackLines, index);
                }, 1200);
                return newAttempts;
              }
            });
          }
        });
      } else if (currentMode === "listening" && isReadingAllRef.current) {
        // Listening mode
        setTimeout(() => {
          if (isReadingAllRef.current) {
            readNextLine(playbackLines, index + 1);
          }
        }, 700);
      }
    }, lineObj.language);
  };

  const changePlaybackMode = (mode: "listening" | "shadowing") => {
    if (mode === playbackMode) return;
    setPlaybackMode(mode);

    // If switching modes, we should cancel any waiting shadowing input
    // so the reading logic can either stop or move to next step immediately
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setIsListeningForSpeech(false);
    setShadowingFeedback("none");
  };

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const renderDifficultyIndicator = (difficulty?: string, hideLabel: boolean = false) => {
    if (!difficulty) return null;
    
    let bars = [];
    const diff = difficulty.toLowerCase();
    
    if (diff === 'beginner') {
      bars = [{ color: 'bg-green-500', active: true }, { color: 'bg-zinc-700', active: false }, { color: 'bg-zinc-700', active: false }];
    } else if (diff === 'intermediate') {
      bars = [{ color: 'bg-yellow-500', active: true }, { color: 'bg-yellow-500', active: true }, { color: 'bg-zinc-700', active: false }];
    } else if (diff === 'advanced') {
      bars = [{ color: 'bg-red-500', active: true }, { color: 'bg-red-500', active: true }, { color: 'bg-red-500', active: true }];
    } else {
      return null;
    }
    
    return (
      <div className="flex gap-1 items-center" title={`Difficulty: ${difficulty}`}>
        {bars.map((bar, idx) => (
          <div 
            key={idx} 
            className={`w-3 h-1 rounded-full ${bar.color} ${bar.active ? 'opacity-100' : 'opacity-20 shadow-sm'}`}
          />
        ))}
        {!hideLabel && (
          <span className="text-[10px] font-bold text-app-muted ml-1 opacity-60 capitalize">
            {difficulty}
          </span>
        )}
      </div>
    );
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
    if (!query.trim()) return;
    
    setSearchQuery(query);

    // Abort previous request
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setArtistDetails(null);
    setAlbumDetails(null);
    
    try {
      const results = await searchITunes(query, searchEntityType, controller.signal);
      setSearchResults(results);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Search error:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    }

    // Save to history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("lyrify_search_history", JSON.stringify(newHistory));

    if (searchContainerRef.current) {
      searchContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleArtistSelect = async (artistId: string) => {
    if (!artistId || artistId === "undefined") return;
    
    // Abort previous request
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearchingDetails(true);
    
    // Set a timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsSearchingDetails(false);
    }, 15000);

    try {
      const details = await getArtistDetails(artistId, controller.signal);
      if (details && details.artist) {
        setArtistDetails(details);
        setAlbumDetails(null);
        if (searchContainerRef.current) {
          searchContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        console.error("Failed to load artist details:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearchingDetails(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleAlbumSelect = async (albumId: string) => {
    if (!albumId || albumId === "undefined") return;

    // Abort previous request
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearchingDetails(true);

    // Set a timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsSearchingDetails(false);
    }, 15000);

    try {
      const details = await getAlbumDetails(albumId, controller.signal);
      if (details && details.album) {
        setAlbumDetails(details);
        setArtistDetails(null);
        if (searchContainerRef.current) {
          searchContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      clearTimeout(timeoutId);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        console.error("Failed to load album details:", err);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearchingDetails(false);
        abortControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (searchQuery.trim() && !artistDetails && !albumDetails && searchResults.length > 0) {
      handleSearch();
    }
  }, [searchEntityType]);


  const handleOnboardingDismiss = () => {
    completeOnboarding();
    setOnboardingCompleted(true);
  };

  const handleOnboardingSelect = (demoTrack: any) => {
    completeOnboarding();
    setOnboardingCompleted(true);
    handleTrackSelect({
      id: demoTrack.id,
      title: demoTrack.title,
      artist: demoTrack.artist,
      coverUrl: demoTrack.coverUrl,
      audioUrl: demoTrack.audioUrl,
      difficulty: demoTrack.difficulty,
      sourceLanguage: demoTrack.sourceLanguage
    });
  };

  const handleTrackSelect = async (track: any) => {
    // 1. CLEAR previous states
    setLyricsFetchError(null);
    setManualLyrics("");
    setActiveLineIndex(null);
    setIsReadingAll(false);
    setActiveTab("preview");
    window.speechSynthesis.cancel();

    // 2. Track IDs
    const trackId = track.id || track.trackId;
    const trackTitle = track.title || "";
    const artist = track.artist || "";
    const artistId = track.artistId || "";
    const album = track.album || "";
    const albumId = track.albumId || "";
    const coverUrl = track.coverUrl || "";

    // 3. Initial cache check
    const cached = getCachedTrackData(trackId);
    if (cached) {
      const updatedCached = {
        ...cached,
        coverUrl: cached.coverUrl || coverUrl,
        album: cached.album || album,
        albumId: cached.albumId || albumId,
        artist: cached.artist || artist,
        artistId: cached.artistId || artistId,
        title: cached.title || trackTitle,
        audioUrl: cached.audioUrl || track.audioUrl,
        appleMusicUrl: cached.appleMusicUrl || track.appleMusicUrl,
      };
      if ((!cached.coverUrl && coverUrl) || (!cached.title && trackTitle) || (!cached.audioUrl && track.audioUrl)) {
        saveTrackData(trackId, updatedCached);
      }
      setCurrentTrack(updatedCached);
      setView("lyrics");
      
      addRecentTrack({
        ...track,
        difficulty: updatedCached.difficulty || track.difficulty
      });
      setRecentTracks(getRecentTracks());
      return;
    }

    // 4. Create placeholder track data
    const initialTrack: TrackLyricsData = {
      trackId: trackId,
      artist: artist,
      artistId: artistId,
      title: trackTitle,
      album: album,
      albumId: albumId,
      coverUrl: coverUrl,
      audioUrl: track.audioUrl || "",
      appleMusicUrl: track.appleMusicUrl || "",
      rawLyrics: "",
      source: null,
      sourceLanguage: track.sourceLanguage || "English",
      meaning: track.meaning,
      meanings: track.meanings,
      difficulty: track.difficulty,
      promptVersion: track.promptVersion,
      lines: [],
      processingStatus: {
        stage1_completed: false,
        stage2_completed: !!track.meaning,
        stage3_completed: false,
      },
      lastUpdated: Date.now(),
    };

    setCurrentTrack(initialTrack);
    setView("lyrics");
    addRecentTrack({
      ...track,
      difficulty: track.difficulty
    });
    setRecentTracks(getRecentTracks());

    // 5. ENHANCEMENT: If metadata is missing (common for community tracks), try to find it on iTunes
    if (!initialTrack.audioUrl || !initialTrack.artistId || !initialTrack.albumId) {
      console.log("[handleTrackSelect] Missing metadata, attempting iTunes lookup...");
      searchITunes(`${artist} ${trackTitle}`, "musicTrack")
        .then(results => {
          const match = results.find(r => 
            normalizeString(r.title) === normalizeString(trackTitle) && 
            normalizeString(r.artist) === normalizeString(artist)
          ) || results[0];

          if (match) {
            console.log("[handleTrackSelect] Metadata match found:", match.title);
            setCurrentTrack(prev => {
              if (!prev || prev.trackId !== trackId) return prev;
              const updated = {
                ...prev,
                artistId: prev.artistId || match.artistId,
                albumId: prev.albumId || match.albumId,
                album: prev.album || match.album,
                audioUrl: prev.audioUrl || match.audioUrl,
                appleMusicUrl: prev.appleMusicUrl || match.appleMusicUrl,
                coverUrl: prev.coverUrl || match.coverUrl
              };
              saveTrackData(trackId, updated);
              return updated;
            });
          }
        })
        .catch(err => console.error("[handleTrackSelect] Metadata lookup failed:", err));
    }

    // 6. BACKGROUND Cache Check (Firestore)
    getTrackMeaningFromCache(trackTitle, [artist], targetLanguage)
      .then(cacheResult => {
        if (cacheResult) {
          const langKey = targetLanguage.toLowerCase().trim();
          let meaning = cacheResult.meanings.en;
          if (langKey === 'spanish') meaning = cacheResult.meanings.es;
          if (langKey === 'russian') meaning = cacheResult.meanings.ru;
          if (langKey === 'polish') meaning = cacheResult.meanings.pl;

          setCurrentTrack(prev => {
            if (!prev || prev.trackId !== trackId) return prev;
            
            const hasLyricsAndLinesCache = !!(cacheResult.rawLyrics && cacheResult.lines && cacheResult.lines.length > 0);
            const updated = {
              ...prev,
              rawLyrics: hasLyricsAndLinesCache ? cacheResult.rawLyrics : prev.rawLyrics,
              meaning,
              meanings: cacheResult.meanings,
              difficulty: cacheResult.difficulty,
              promptVersion: cacheResult.promptVersion || prev.promptVersion,
              sourceLanguage: cacheResult.originalLanguage || prev.sourceLanguage,
              lines: hasLyricsAndLinesCache ? cacheResult.lines : prev.lines,
              processingStatus: {
                ...prev.processingStatus,
                stage1_completed: hasLyricsAndLinesCache ? true : prev.processingStatus.stage1_completed,
                stage2_completed: true,
                stage3_completed: hasLyricsAndLinesCache ? cacheResult.lines.some((l: any) => l.phrases && l.phrases.length > 0) : prev.processingStatus.stage3_completed
              }
            };
            saveTrackData(trackId, updated);
            return updated;
          });
        }
      })
      .catch(err => console.error("Firestore cache check failed:", err));
  };

  const handleAnalyzeSong = async () => {
    if (!currentTrack || isLoadingLyrics) return;
    
    setLyricsFetchError(null);
    setIsLoadingLyrics(true);
    setLoadingStep("searching");

    try {
      let trackData = { ...currentTrack };
      let lyrics = trackData.rawLyrics;

      // 1. Fetch lyrics if missing
      if (!lyrics) {
        const lyricsResponse = await fetchLyrics(trackData.artist, trackData.title);
        if (!lyricsResponse.lyrics) {
          setLyricsFetchError("Lyrics not found. Please try manual input.");
          setIsLoadingLyrics(false);
          setLoadingStep("idle");
          return;
        }
        
        lyrics = lyricsResponse.lyrics;
        
        trackData = {
          ...trackData,
          rawLyrics: lyrics,
          source: (lyricsResponse.source as any) || "Unknown",
          lines: splitLyricsIntoLines(trackData.trackId, lyrics),
          processingStatus: { ...trackData.processingStatus, stage1_completed: true }
        };
      }

      const trackKey = await computeTrackKey(trackData.title, [trackData.artist]);
      const lyricsHash = await computeLyricsHash(lyrics || "");

      // 2. Fetch/Update meaning and line translations in parallel
      const isOutdated = !trackData.promptVersion || trackData.promptVersion < ANALYSIS_PROMPT_VERSION;
      const isTranslationOutdated = !trackData.translationPromptVersion || trackData.translationPromptVersion < TRANSLATION_PROMPT_VERSION;

      if (!trackData.meaning || !trackData.processingStatus.stage2_completed || isOutdated) {
        setLoadingStep("meaning");
        const metadata: TrackMetadata = {
          title: trackData.title,
          artists: [trackData.artist],
          artistId: trackData.artistId,
          albumName: trackData.album,
          albumId: trackData.albumId,
          coverUrl: trackData.coverUrl,
          audioUrl: trackData.audioUrl,
          appleMusicUrl: trackData.appleMusicUrl
        };

        const [result, translationsResult] = await Promise.all([
          fetchTrackMeaning(lyrics || "", metadata),
          getLineTranslations(lyrics || "", trackKey, lyricsHash, targetLanguage)
        ]);
        
        const langKey = targetLanguage.toLowerCase().trim();
        let meaning = result.meanings.en;
        if (langKey === 'spanish') meaning = result.meanings.es;
        if (langKey === 'russian') meaning = result.meanings.ru;
        if (langKey === 'polish') meaning = result.meanings.pl;

        const updatedLines = trackData.lines.map((line, idx) => {
          const matched = translationsResult[idx] || translationsResult.find(t => t.originalText === line.original);
          return {
            ...line,
            translation: matched ? matched.translation : (line.translation || ""),
            language: matched ? matched.language : (line.language || "en")
          };
        });

        trackData = {
          ...trackData,
          meaning,
          meanings: result.meanings,
          difficulty: result.difficulty,
          promptVersion: ANALYSIS_PROMPT_VERSION,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          sourceLanguage: result.originalLanguage || trackData.sourceLanguage,
          lines: updatedLines,
          processingStatus: { ...trackData.processingStatus, stage2_completed: true }
        };
      } else {
        // Meaning is already cached, but load/refresh line translations to get individual languages
        const translationsResult = await getLineTranslations(lyrics || "", trackKey, lyricsHash, targetLanguage);
        const updatedLines = trackData.lines.map((line, idx) => {
          const matched = translationsResult[idx] || translationsResult.find(t => t.originalText === line.original);
          return {
            ...line,
            translation: matched ? matched.translation : (line.translation || ""),
            language: matched ? matched.language : (line.language || "en")
          };
        });
        trackData = {
          ...trackData,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          lines: updatedLines
        };
      }

      saveTrackData(trackData.trackId, trackData);
      saveTrackToSharedCache(trackData).catch(e => console.error("Firestore cache upload failed:", e));
      setCurrentTrack(trackData);
      addRecentTrack({
        id: trackData.trackId,
        title: trackData.title,
        artist: trackData.artist,
        coverUrl: trackData.coverUrl || "",
        album: trackData.album || "",
        difficulty: trackData.difficulty
      } as Track);
      setRecentTracks(getRecentTracks());
      loadCommunityTracks();
    } catch (err) {
      console.error("Manual fetch/meaning failed:", err);
      setLyricsFetchError("Failed to fetch song data.");
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("idle");
    }
  };

  const handleRegenerateTranslations = async () => {
    if (!currentTrack || isTranslating) return;
    setIsTranslating(true);
    setLoadingStep("translating");
    try {
      const trackKey = await computeTrackKey(currentTrack.title, [currentTrack.artist]);
      const lyricsHash = await computeLyricsHash(currentTrack.rawLyrics);

      const translationsResult = await getLineTranslations(
        currentTrack.rawLyrics,
        trackKey,
        lyricsHash,
        targetLanguage,
        true
      );

      const updatedLines = currentTrack.lines.map((line, idx) => {
        const matched = translationsResult[idx] || translationsResult.find(t => t.originalText === line.original);
        return {
          ...line,
          translation: matched ? matched.translation : (line.translation || ""),
          language: matched ? matched.language : (line.language || "en")
        };
      });

      const updatedTrack: TrackLyricsData = {
        ...currentTrack,
        translationPromptVersion: TRANSLATION_PROMPT_VERSION,
        lines: updatedLines
      };

      saveTrackData(updatedTrack.trackId, updatedTrack);
      await saveTrackToSharedCache(updatedTrack);
      setCurrentTrack(updatedTrack);
    } catch (err) {
      console.error("Failed to regenerate translations:", err);
    } finally {
      setIsTranslating(false);
      setLoadingStep("idle");
    }
  };

  const runStage3 = async (track: TrackLyricsData, force: boolean = false) => {
    const hasPhrases = track.lines.some(l => l.phrases && l.phrases.length > 0);
    if (!force && track.processingStatus.stage3_completed && hasPhrases) return;
    setIsTranslating(true);
    try {
      const trackKey = await computeTrackKey(track.title, [track.artist]);
      const lyricsHash = await computeLyricsHash(track.rawLyrics);

      const phraseAnalysisResult = await getPhraseAnalysis(
        track.rawLyrics,
        targetLanguage,
        trackKey,
        lyricsHash,
        force
      );

      setCurrentTrack((prev) => {
        if (!prev || prev.trackId !== track.trackId) return prev;

        const updatedLines = prev.lines.map(line => {
          const linePhrases = phraseAnalysisResult
            .filter((p: any) => p.lineIndex === line.index)
            .map((p: any) => ({
              id: `${track.trackId}:p:${p.text.replace(/\s+/g, '_')}`,
              text: p.text,
              translation: p.translation,
              explanation: p.explanation,
              language: p.language,
              lemmas: [],
              type: 'phrase' as const
            }));

          return {
            ...line,
            phrases: linePhrases
          };
        });

        const updated = {
          ...prev,
          lines: updatedLines,
          processingStatus: { ...prev.processingStatus, stage3_completed: true }
        };
        saveTrackData(track.trackId, updated);
        saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));
        return updated;
      });
    } catch (err: any) {
      console.error("Stage 3 (Phrase Analysis) failed:", err);
      setAnalysisError(err?.message || "An unexpected error occurred during deep analysis. Please try again.");
      throw err;
    } finally {
      setIsTranslating(false);
    }
  };

  const handleManualLyricsSubmit = async () => {
    if (!currentTrack || !manualLyrics.trim()) return;

    setIsLoadingLyrics(true);
    setLoadingStep("analyzing");
    setLyricsFetchError(null);

    try {
      const metadataResult = await extractLyricsMetadata(
        manualLyrics,
        currentTrack.artist,
        currentTrack.title,
      );

      // Trigger fetchTrackMeaning in background to enrich cache and get source language
      fetchTrackMeaning(manualLyrics, {
        title: currentTrack.title,
        artists: [currentTrack.artist],
        albumName: currentTrack.album,
        coverUrl: currentTrack.coverUrl
      }).then(result => {
        setCurrentTrack(prev => {
          if (!prev || prev.trackId !== currentTrack.trackId) return prev;
          
          const langKey = targetLanguage.toLowerCase().trim();
          let meaning = result.meanings.en;
          if (langKey === 'spanish') meaning = result.meanings.es;
          if (langKey === 'russian') meaning = result.meanings.ru;
          if (langKey === 'polish') meaning = result.meanings.pl;

          const updated = {
            ...prev,
            sourceLanguage: result.originalLanguage || prev.sourceLanguage,
            meaning,
            meanings: result.meanings,
            difficulty: result.difficulty,
            processingStatus: { ...prev.processingStatus, stage2_completed: true }
          };
          saveTrackData(prev.trackId, updated);
          saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));
          addRecentTrack({
            id: prev.trackId,
            title: prev.title,
            artist: prev.artist,
            coverUrl: prev.coverUrl || "",
            album: prev.album || "",
            difficulty: result.difficulty
          } as Track);
          setRecentTracks(getRecentTracks());
          loadCommunityTracks();
          return updated;
        });
      }).catch(e => console.error("fetchTrackMeaning background failed:", e));

      const initialTrack: TrackLyricsData = {
        ...currentTrack,
        rawLyrics: manualLyrics,
        source: "Manual",
        sourceLanguage: currentTrack.sourceLanguage, // Initially keep current, updated by background fetch
        authors: metadataResult?.authors,
        lyricSource: "Manual Entry",
        lines: splitLyricsIntoLines(currentTrack.trackId, manualLyrics),
        processingStatus: {
          stage1_completed: true,
          stage2_completed: false, // Updated by background fetch
          stage3_completed: false,
        },
        lastUpdated: Date.now(),
      };

      setCurrentTrack(initialTrack);
      saveTrackData(currentTrack.trackId, initialTrack);
      setManualLyrics("");
    } catch (err) {
      setLyricsFetchError("Processing failed. Please check your text.");
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("idle");
    }
  };

  const handleGenerateAnalysis = async (force: boolean = false, customTrack?: TrackLyricsData) => {
    const targetTrack = customTrack || currentTrack;
    if (!targetTrack || isGeneratingAnalysis) return;

    const hasPhrases = targetTrack.lines.some(l => l.phrases && l.phrases.length > 0);
    const completed = targetTrack.processingStatus.stage3_completed && hasPhrases;

    if (!force && completed) return;

    setIsGeneratingAnalysis(true);
    setAnalysisError(null);
    try {
      let trackData = { ...targetTrack };
      let lyrics = trackData.rawLyrics;
      
      // 1. Fetch lyrics if missing
      if (!lyrics) {
        setLoadingStep("searching");
        const lyricsResponse = await fetchLyrics(trackData.artist, trackData.title);
        if (!lyricsResponse.lyrics) {
          const errMsg = "Lyrics not found. Cannot proceed with deep analysis.";
          setLyricsFetchError(errMsg);
          setAnalysisError(errMsg);
          setIsGeneratingAnalysis(false);
          setLoadingStep("idle");
          return;
        }
        
        lyrics = lyricsResponse.lyrics;
        
        // Enrich trackData with lyrics first
        trackData = {
          ...trackData,
          rawLyrics: lyrics,
          source: (lyricsResponse.source as any) || "Unknown",
          lines: splitLyricsIntoLines(trackData.trackId, lyrics),
          processingStatus: { ...trackData.processingStatus, stage1_completed: true }
        };
      }

      const trackKey = await computeTrackKey(trackData.title, [trackData.artist]);
      const lyricsHash = await computeLyricsHash(lyrics || "");

      const isOutdated = !trackData.promptVersion || trackData.promptVersion < ANALYSIS_PROMPT_VERSION;
      const isTranslationOutdated = !trackData.translationPromptVersion || trackData.translationPromptVersion < TRANSLATION_PROMPT_VERSION;

      // 2. Fetch/Update meaning and line translations if missing, outdated, or forced
      if (force || !trackData.meaning || !trackData.processingStatus.stage2_completed || isOutdated || isTranslationOutdated) {
        setLoadingStep("meaning");
        const metadata: TrackMetadata = {
          title: trackData.title,
          artists: [trackData.artist],
          artistId: trackData.artistId,
          albumName: trackData.album,
          albumId: trackData.albumId,
          coverUrl: trackData.coverUrl,
          audioUrl: trackData.audioUrl,
          appleMusicUrl: trackData.appleMusicUrl
        };

        const [meaningResult, translationsResult] = await Promise.all([
          fetchTrackMeaning(lyrics || "", metadata, ANALYSIS_PROMPT_VERSION, force),
          getLineTranslations(lyrics || "", trackKey, lyricsHash, targetLanguage, force)
        ]);

        const langKey = targetLanguage.toLowerCase().trim();
        let meaning = meaningResult.meanings.en;
        if (langKey === 'spanish') meaning = meaningResult.meanings.es;
        if (langKey === 'russian') meaning = meaningResult.meanings.ru;
        if (langKey === 'polish') meaning = meaningResult.meanings.pl;

        const updatedLines = trackData.lines.map((line, idx) => {
          const matched = translationsResult[idx] || translationsResult.find(t => t.originalText === line.original);
          return {
            ...line,
            translation: matched ? matched.translation : (line.translation || ""),
            language: matched ? matched.language : (line.language || "en")
          };
        });

        trackData = {
          ...trackData,
          meaning,
          meanings: meaningResult.meanings,
          difficulty: meaningResult.difficulty,
          promptVersion: ANALYSIS_PROMPT_VERSION,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          sourceLanguage: meaningResult.originalLanguage || trackData.sourceLanguage,
          lines: updatedLines,
          processingStatus: { ...trackData.processingStatus, stage2_completed: true }
        };
        
        saveTrackData(trackData.trackId, trackData);
        saveTrackToSharedCache(trackData).catch(e => console.error("Firestore cache upload failed:", e));
        setCurrentTrack(trackData);
        loadCommunityTracks();
      }

      setLoadingStep("analyzing");
      await runStage3(trackData, force);
    } catch (err: any) {
      console.error("Analysis generation failed:", err);
      setAnalysisError(err?.message || "An unexpected error occurred during deep analysis. Please try again.");
    } finally {
      setIsGeneratingAnalysis(false);
      setLoadingStep("idle");
    }
  };

  const handleRegenerateAnalysis = async () => {
    if (!currentTrack || isGeneratingAnalysis) return;

    if (!confirm("Are you sure you want to reset and regenerate the analysis? This will clear current phrases and meaning.")) {
      return;
    }

    // Reset current track data relative to analysis
    const resetTrack: TrackLyricsData = {
      ...currentTrack,
      meaning: undefined,
      promptVersion: undefined,
      translationPromptVersion: undefined,
      lines: currentTrack.lines.map(line => ({
        ...line,
        translation: undefined,
        phrases: []
      })),
      processingStatus: {
        ...currentTrack.processingStatus,
        stage2_completed: false,
        stage3_completed: false
      }
    };

    setCurrentTrack(resetTrack);
    saveTrackData(currentTrack.trackId, resetTrack);

    // Call handleGenerateAnalysis with force=true and passing resetTrack immediately to bypass async state update lag
    handleGenerateAnalysis(true, resetTrack);
  };

  const getStatusStyles = (s: PhraseStatus) => {
    switch (s) {
      case "known":
        return {
          bg: "bg-transparent",
          border: "border-transparent",
          icon: (
            <CheckCircle2
              size={18}
              className="text-app-fg opacity-30 shrink-0"
            />
          ),
        };
      case "learning":
        return {
          bg: "bg-orange-500/5",
          border: "border-orange-500/20",
          icon: (
            <RefreshCw size={18} className="text-orange-500 shrink-0" />
          ),
        };
      default:
        return {
          bg: "bg-sky-400/5",
          border: "border-sky-400/20",
          icon: (
            <HelpCircle size={18} className="text-sky-400 shrink-0" />
          ),
        };
    }
  };

  const renderHighlightedText = (text: string, phrases: Phrase[]) => {
    if (!phrases || !phrases.length) return text;
    const applicable = phrases.filter((p) =>
      text.toLowerCase().includes(p.text.toLowerCase()),
    );
    if (!applicable.length) return text;
    const sorted = [...applicable].sort(
      (a, b) => b.text.length - a.text.length,
    );
    const pattern = sorted
      .map((p) => p.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(`(${pattern})`, "gi");
    return text.split(regex).map((part, idx) => {
      const m = sorted.find((p) => p.text.toLowerCase() === part.toLowerCase());
      if (m) {
        return (
          <span
            key={idx}
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
              "border-app-fg/20 text-app-fg hover:border-app-fg/40",
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
    displayModeOverride?: "lyrics" | "translation" | "both",
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
      />
    );
  };

  const handleResetAnalysis = () => {
    handleGenerateAnalysis(true);
  };

  // Analysis tab logic: No auto-trigger. User must click "Generate" or "Reset".

  const handleManualLyricsSearch = async () => {
    if (!currentTrack) return;
    setIsSearchingOptions(true);
    setLyricOptions([]);
    try {
      const results = await searchLyricsOptions(currentTrack.artist, currentTrack.title);
      setLyricOptions(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingOptions(false);
    }
  };

  const handleSelectLyricOption = async (option: LyricOption) => {
    if (!currentTrack) return;
    setIsLoadingLyrics(true);
    setLoadingStep("searching");
    setLyricsFetchError(null);
    try {
      const lyricsData = await fetchLyricsFromOption(option);
      if (lyricsData.lyrics) {
        setLoadingStep("analyzing");
        // Perform same enrichment as manual submit to ensure consistency
        const metadataResult = await extractLyricsMetadata(lyricsData.lyrics, option.artist, option.title);

        // Background cache enrichment
        fetchTrackMeaning(lyricsData.lyrics, {
          title: option.title,
          artists: [option.artist],
          albumName: currentTrack.album,
          coverUrl: currentTrack.coverUrl
        }).then(result => {
          setCurrentTrack(prev => {
            if (!prev || prev.trackId !== currentTrack.trackId) return prev;
            
            const langKey = targetLanguage.toLowerCase().trim();
            let meaning = result.meanings.en;
            if (langKey === 'spanish') meaning = result.meanings.es;
            if (langKey === 'russian') meaning = result.meanings.ru;
            if (langKey === 'polish') meaning = result.meanings.pl;

            const updated = {
              ...prev,
              sourceLanguage: result.originalLanguage || prev.sourceLanguage,
              meaning,
              meanings: result.meanings,
              processingStatus: { ...prev.processingStatus, stage2_completed: true }
            };
            saveTrackData(prev.trackId, updated);
            saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));
            return updated;
          });
        }).catch(e => console.error("fetchTrackMeaning background failed:", e));

        const updatedTrack: TrackLyricsData = {
          ...currentTrack,
          rawLyrics: lyricsData.lyrics,
          source: (lyricsData.source as any) || "Manual",
          sourceLanguage: currentTrack.sourceLanguage,
          authors: metadataResult?.authors,
          lines: splitLyricsIntoLines(currentTrack.trackId, lyricsData.lyrics),
          processingStatus: {
            stage1_completed: true,
            stage2_completed: false,
            stage3_completed: false,
          },
          lastUpdated: Date.now(),
        };

        setCurrentTrack(updatedTrack);
        saveTrackData(currentTrack.trackId, updatedTrack);
        setIsResourcesOpen(false); // Close modal on success
      } else {
        setLyricsFetchError(`No lyrics found for the selected version from ${option.source}.`);
      }
    } catch (err) {
      console.error("Selection failed:", err);
      setLyricsFetchError("Failed to fetch or process the selected lyrics.");
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("idle");
    }
  };

  const handleResetLyrics = () => {
    if (!currentTrack) return;

    // Clear cache
    clearCachedLyrics(currentTrack.trackId);

    // Reset local state first to show immediate feedback if needed
    handleTrackSelect({
      id: currentTrack.trackId,
      artist: currentTrack.artist,
      title: currentTrack.title,
      album: currentTrack.album || "",
      coverUrl: currentTrack.coverUrl || "",
    });
  };


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
        await updatePhraseStatus(existing.id, status);
      } else {
        await addPhraseToStudy({
          text: phrase,
          translation: translation || "...",
          trackId: currentTrack.trackId,
          lineId: '',
          explanation: explanation || "",
          lemmas: [],
          type: 'phrase'
        }, status);
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
            onClick={() => setView("settings")}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-app-card border border-app-card-border shadow-lg transition-all hover:scale-105 active:scale-95 group overflow-hidden"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || ""}
                className="w-full h-full object-cover"
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
              className="flex-1 overflow-y-auto px-6 py-8"
            >
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
                              localStorage.removeItem("lyrify_search_history");
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
                            setAlbumDetails(null);
                          }}
                          className="absolute -top-2 -left-2 z-10 p-2 bg-app-card border border-app-card-border shadow-lg rounded-xl hover:scale-110 transition-transform"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <img src={albumDetails.album.coverUrl} className="w-40 h-40 md:w-56 md:h-56 rounded-3xl shadow-2xl border border-app-card-border" />
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <h2 className="text-2xl md:text-3xl font-black text-app-fg mb-1 leading-tight">{albumDetails.album.title}</h2>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArtistSelect(albumDetails.album.artistId);
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
                              handleTrackSelect(track);
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
                          setArtistDetails(null);
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
                        />
                      )}
                      
                      <div className="min-w-0">
                        <h2 className="text-3xl font-black text-app-fg truncate">{artistDetails.artist.name}</h2>
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
                                handleTrackSelect(track);
                              }}
                              className="flex items-center gap-4 p-3 rounded-2xl bg-app-card border border-app-card-border shadow-sm hover:border-app-accent/30 transition-all text-left"
                            >
                              <img src={track.coverUrl} className="w-10 h-10 rounded-lg object-cover" />
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
                                handleAlbumSelect(album.id);
                              }}
                              className="group text-left space-y-2"
                            >
                              <div className="aspect-square rounded-2xl overflow-hidden bg-app-card border border-app-card-border shadow-sm group-hover:shadow-md transition-all">
                                <img src={album.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
                      <div className="mt-2 pb-12">
                        {shouldShowOnboarding(recentTracks.length) && !onboardingCompleted && (
                          <OnboardingHero
                            onSelectTrack={handleOnboardingSelect}
                            onDismiss={handleOnboardingDismiss}
                          />
                        )}
                        {/* Tab Switcher */}
                        <div className="flex items-center p-1 bg-app-card border border-app-card-border rounded-2xl mb-8 w-fit mx-auto sm:mx-0">
                          <button
                            onClick={() => setActiveLibraryTab('recent')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              activeLibraryTab === 'recent'
                                ? 'bg-app-fg text-app-bg shadow-lg'
                                : 'text-app-muted hover:text-app-fg'
                            }`}
                          >
                            Recent
                          </button>
                          <button
                            onClick={() => setActiveLibraryTab('community')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                              activeLibraryTab === 'community'
                                ? 'bg-app-fg text-app-bg shadow-lg'
                                : 'text-app-muted hover:text-app-fg'
                            }`}
                          >
                            Community
                          </button>
                        </div>

                        {activeLibraryTab === 'recent' ? (
                          <div className="space-y-4">
                            <div className="mb-2 px-2">
                              <h2
                                className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2"
                                style={{ color: "var(--accent)" }}
                              >
                                <History size={16} />
                                Recently Explored
                              </h2>
                            </div>
                            {recentTracks.length > 0 ? recentTracks.map((track) => (
                              <button
                                key={`recent-${track.id}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTrackSelect(track);
                                }}
                                className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80"
                              >
                                <div className="flex items-center gap-4">
                                  <img
                                    src={track.coverUrl}
                                    className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                                  />
                                  <div className="text-left">
                                    <p className="font-bold text-app-fg leading-tight mb-0.5">
                                      {track.title}
                                    </p>
                                    <div className="flex flex-col gap-1">
                                      <p className="text-sm text-app-muted">
                                        {track.artist}
                                      </p>
                                      {track.difficulty && (
                                        <div className="shrink-0 flex items-center">
                                          {renderDifficultyIndicator(track.difficulty, true)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight
                                  size={20}
                                  className="text-app-fg opacity-20 mr-2"
                                />
                              </button>
                            )) : (
                              <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
                                <Search size={40} className="mx-auto mb-4 opacity-20" />
                                No recent tracks yet. 
                                <br />Search for a song to start exploring!
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 px-2">
                              <h2
                                className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2"
                                style={{ color: "var(--accent)" }}
                              >
                                <Globe size={16} className="animate-pulse" />
                                Community Trends
                              </h2>

                              {/* Filters */}
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest leading-none">Language:</span>
                                  <select 
                                    value={communityLangFilter}
                                    onChange={(e) => setCommunityLangFilter(e.target.value)}
                                    className="bg-app-card border border-app-card-border rounded-lg px-3 py-1.5 text-[11px] font-bold text-app-fg outline-none focus:ring-1 focus:ring-accent transition-all appearance-none cursor-pointer"
                                  >
                                    <option value="All">All</option>
                                    {SUPPORTED_LANGUAGES.map(lang => (
                                      <option key={lang.name} value={lang.name}>{lang.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest leading-none">Difficulty:</span>
                                  <select 
                                    value={communityDifficultyFilter}
                                    onChange={(e) => setCommunityDifficultyFilter(e.target.value)}
                                    className="bg-app-card border border-app-card-border rounded-lg px-3 py-1.5 text-[11px] font-bold text-app-fg outline-none focus:ring-1 focus:ring-accent transition-all appearance-none cursor-pointer"
                                  >
                                    <option value="All">All</option>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                            
                            {isLoadingTracks ? (
                              <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="w-full h-24 rounded-3xl bg-app-card border border-app-card-border animate-pulse flex items-center px-4 gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-app-fg/10" />
                                    <div className="space-y-2 flex-1">
                                      <div className="h-4 w-1/2 bg-app-fg/10 rounded" />
                                      <div className="h-3 w-1/3 bg-app-fg/10 rounded" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {dynamicTracks.filter(t => {
                                  const langMatch = communityLangFilter === "All" || t.sourceLanguage === communityLangFilter;
                                  const diffMatch = communityDifficultyFilter === "All" || (t.difficulty && t.difficulty.toLowerCase().includes(communityDifficultyFilter.toLowerCase()));
                                  return langMatch && diffMatch;
                                }).length > 0 ? 
                                dynamicTracks
                                  .filter(t => {
                                    const langMatch = communityLangFilter === "All" || t.sourceLanguage === communityLangFilter;
                                    const diffMatch = communityDifficultyFilter === "All" || (t.difficulty && t.difficulty.toLowerCase().includes(communityDifficultyFilter.toLowerCase()));
                                    return langMatch && diffMatch;
                                  })
                                  .map((track) => (
                                    <button
                                      key={`comm-${track.id}`}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTrackSelect(track);
                                      }}
                                      className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80"
                                    >
                                      <div className="flex items-center gap-4">
                                        <img
                                          src={track.coverUrl}
                                          className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                                        />
                                        <div className="text-left">
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <p className="font-bold text-app-fg leading-tight">
                                              {track.title}
                                            </p>
                                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-app-fg/10 text-app-fg opacity-50 tracking-tighter shrink-0">
                                              {track.sourceLanguage}
                                            </span>
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <p className="text-sm text-app-muted">
                                              {track.artist}
                                            </p>
                                            {track.difficulty && (
                                              <div className="flex items-center shrink-0">
                                                {renderDifficultyIndicator(track.difficulty, true)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <ChevronRight
                                        size={20}
                                        className="text-app-fg opacity-20 mr-2"
                                      />
                                    </button>
                                  )) : (
                                  <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
                                    <Music size={40} className="mx-auto mb-4 opacity-20" />
                                    No tracks found matching your filters.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                            <button
                              key={item.id}
                              type="button"
                              disabled={isLoadingLyrics}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (searchEntityType === "musicTrack") handleTrackSelect(item);
                                else if (searchEntityType === "album") handleAlbumSelect(item.id);
                                else if (searchEntityType === "musicArtist") handleArtistSelect(item.id);
                              }}
                              className="flex items-center gap-4 p-3 rounded-2xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80 group text-left"
                            >
                              {item.coverUrl ? (
                                <img
                                  src={item.coverUrl}
                                  className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-app-fg/5 flex items-center justify-center text-app-fg/20">
                                  {searchEntityType === "musicArtist" ? <UserIcon size={24} /> : <Disc size={24} />}
                                </div>
                              )}
                              <div className="text-left overflow-hidden flex-1">
                                <p className="font-bold text-app-fg leading-tight truncate">
                                  {item.title || item.name}
                                </p>
                                <p className="text-[10px] font-bold text-app-muted truncate uppercase tracking-widest mt-1">
                                  {item.artist || item.genre || "Artist"}
                                </p>
                              </div>
                              <ChevronRight size={16} className="text-app-fg opacity-0 group-hover:opacity-20 transition-opacity" />
                            </button>
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
              <div className="px-6 py-4 flex items-center justify-between bg-app-card/50 border-b border-app-card-border backdrop-blur-xl">
                <button
                  onClick={() => setView("tracks")}
                  className="flex items-center gap-1 text-app-fg opacity-40 text-xs font-bold uppercase py-2 px-1"
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

              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-8 pt-4 pb-12 scrollbar-hide relative"
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
                      <h1 className="text-3xl font-bold text-app-fg mb-1 leading-tight">
                        {currentTrack.title}
                      </h1>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            if (currentTrack.artistId) {
                               handleArtistSelect(currentTrack.artistId);
                               setView("tracks");
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
                              if (currentTrack.albumId) {
                                handleAlbumSelect(currentTrack.albumId);
                                setView("tracks");
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
                          if (currentTrack.albumId) {
                            handleAlbumSelect(currentTrack.albumId);
                            setView("tracks");
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

                <div className="mb-4">
                  <div className="flex items-center gap-1 p-1 bg-app-card/30 rounded-2xl border border-app-card-border w-fit">
                    <button
                      onClick={() => setActiveTab("preview")}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all",
                        activeTab === "preview"
                          ? "bg-app-fg text-app-bg shadow-lg"
                          : "text-app-fg opacity-40 hover:opacity-100",
                      )}
                    >
                      <Activity size={14} />
                      Preview
                    </button>
                    <button
                      onClick={() => setActiveTab("lyrics")}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all",
                        activeTab === "lyrics"
                          ? "bg-app-fg text-app-bg shadow-lg"
                          : "text-app-fg opacity-40 hover:opacity-100",
                      )}
                    >
                      <FileText size={14} />
                      Lyrics
                    </button>
                    <button
                      onClick={() => setActiveTab("analysis")}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all",
                        activeTab === "analysis"
                          ? "bg-app-fg text-app-bg shadow-lg"
                          : "text-app-fg opacity-40 hover:opacity-100",
                      )}
                    >
                      <Sparkles size={14} />
                      Analysis
                    </button>
                  </div>
                </div>                {activeTab === "preview" && (
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
                                      onClick={handleRegenerateTranslations}
                                      disabled={isTranslating}
                                      title="Регенерировать перевод"
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
                                  handleAddAnalysisPhrase={handleAddAnalysisPhrase}
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
              className="flex-1 flex flex-col"
            >
              <StudyView onBack={() => setView("tracks")} />
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
              onClose={() => setView("tracks")}
            />
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
                                Превью от
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
                                <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
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
                      onClick={activeTab === "preview" ? togglePreviewAudio : toggleReadLyrics}
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
            className="relative z-20 pb-2 pt-2 px-6 bg-app-card backdrop-blur-3xl border-t border-app-card-border flex justify-around items-center"
          >
            <button
              onClick={() => setView("tracks")}
              className="p-2 transition-colors"
              style={{
                color: view === "tracks" ? "var(--accent)" : "var(--app-fg)",
                opacity: view === "tracks" ? 1 : 0.2,
              }}
            >
              <Music size={24} />
            </button>

            <button
              onClick={() => setView("study")}
              className="p-2 transition-colors"
              style={{
                color: view === "study" ? "var(--accent)" : "var(--app-fg)",
                opacity: view === "study" ? 1 : 0.2,
              }}
            >
              <Brain size={24} />
            </button>
          </motion.footer>
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
                      onClick={() => handleUpdateStatus("known")}
                      disabled={isSaving}
                      className="py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all bg-app-card border border-app-card-border text-app-fg hover:bg-opacity-80"
                    >
                      Знаю
                    </button>
                    <button
                      onClick={() => handleUpdateStatus("learning")}
                      disabled={isSaving}
                      className="py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all text-white"
                      style={{
                        backgroundColor: "#f97316", // Orange
                        boxShadow: "0 10px 20px -5px rgba(249, 115, 22, 0.4)",
                      }}
                    >
                      {isSaving ? "Сохраняю..." : "Учить"}
                    </button>
                  </div>

                  <button
                    onClick={handleExplain}
                    disabled={isExplaining || isSaving}
                    className="w-full py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  >
                    {isExplaining ? "Думаю..." : "Объяснить"}
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
        onCardUpdated={loadUserCards}
        phraseMetadata={phraseMetadata}
      />
    </div>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
