import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Copy,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MOCK_TRACKS, Track } from "./constants";
import {
  translateLyrics,
  detectLanguage,
  explainPhraseStructured,
  extractLyricsMetadata,
  generateTrackAnalysis,
  generatePhraseAnalysis,
  completeLyricsAnalysis,
} from "./services/geminiService";
import { cn } from "./lib/utils";
import { auth, signIn, logOut, testDbConnection } from "./lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addPhraseToStudy,
  getCards,
  updatePhraseStatus,
  deleteFlashcard,
  type Flashcard,
  type PhraseStatus,
} from "./services/cardService";
import StudyView from "./components/StudyView";
import SettingsView from "./components/SettingsView";
import PhraseDrawer from "./components/PhraseDrawer";
import { getLocaleByName } from "./lib/languages";
import LanguageSelector from "./components/LanguageSelector";
import {
  searchITunes,
  fetchLyrics,
  getCachedTrackData,
  saveTrackData,
  clearCachedLyrics,
  getRecentTracks,
  addRecentTrack,
  splitLyricsIntoLines,
  type TrackLyricsData,
  type LyricsLine,
  type Phrase,
} from "./services/musicService";

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
      track.geniusUrl ||
      `https://genius.com/search?q=${encodeURIComponent(track.artist + " " + track.title)}`,
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
      track.musixmatchUrl ||
      `https://www.musixmatch.com/search/${encodeURIComponent(track.artist + " " + track.title)}`,
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
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
    () => localStorage.getItem("lyrify_theme") || "dark",
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingPhraseAnalysis, setIsGeneratingPhraseAnalysis] =
    useState(false);
  const [phraseMetadata, setPhraseMetadata] = useState<Map<string, Flashcard>>(
    new Map(),
  );
  const [childCardsMap, setChildCardsMap] = useState<Map<string, Flashcard[]>>(
    new Map(),
  );
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isAnalysisCopied, setIsAnalysisCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(
    () => localStorage.getItem("lyrify_muted") === "true",
  );
  const [popoverData, setPopoverData] = useState<{
    phrase: string;
    translation: string;
    explanation?: string;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("lyrify_muted", String(isMuted));
  }, [isMuted]);

  // Load cards and group them
  const loadUserCards = async () => {
    if (!user) return;
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
    if (user) loadUserCards();
  }, [user]);
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
    if (!user || !currentTrack) return;
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
          lineId: trimmedLine,
          explanation: item.expl || '',
          lemmas: [],
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
    if (!user) return;
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
  ) => {
    if (!user || !currentTrack) return;

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
        lineId: parentLine || '',
        explanation: explanation,
        lemmas: [],
        type: 'phrase'
      }, "learning");
      await loadUserCards();
    } catch (err) {
      console.error(err);
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLyricsSettingsOpen, setIsLyricsSettingsOpen] = useState(false);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<{
    original: string;
    translation: string;
    explanation?: string;
    cardId?: string;
    status: PhraseStatus;
    index: number;
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
    if (
      activeLineIndex !== null &&
      lineRefs.current.has(activeLineIndex) &&
      scrollContainerRef.current
    ) {
      const activeEl = lineRefs.current.get(activeLineIndex);
      const container = scrollContainerRef.current;
      if (activeEl) {
        const containerHeight = container.offsetHeight;
        const elOffsetTop = activeEl.offsetTop;
        const elHeight = activeEl.offsetHeight;

        container.scrollTo({
          top: elOffsetTop - containerHeight / 2 + elHeight / 2,
          behavior: "smooth",
        });
      }
    }
  }, [activeLineIndex]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("lyrify_theme", theme);
  }, [theme]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [loadingStep, setLoadingStep] = useState<
    "idle" | "searching" | "analyzing"
  >("idle");
  const [lyricsFetchError, setLyricsFetchError] = useState<string | null>(null);
  const [manualLyrics, setManualLyrics] = useState("");
  const [dbConnectionError, setDbConnectionError] = useState(false);

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

  useEffect(() => {
    localStorage.setItem("skip_known", String(skipKnownPhrases));
  }, [skipKnownPhrases]);

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
    // Warm up TTS voices
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }

    setRecentTracks(getRecentTracks());
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser((prev) => {
        if (prev?.uid === u?.uid) return prev;
        return u;
      });
    });

    // Check DB connection
    testDbConnection().then((connected) => {
      if (!connected) setDbConnectionError(true);
    });

    return () => unsubscribe();
  }, []);

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
    if (view === "lyrics" && currentTrack?.rawLyrics && targetLanguage) {
      if (!currentTrack.processingStatus.stage3_completed) {
        runStage3(currentTrack);
      }
    }
  }, [targetLanguage]);

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = (text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();

    if (isMuted) {
      if (onEnd) onEnd();
      return;
    }

    // Tiny timeout helps some mobile browsers reset TTS state
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = utterance;

      // Use detected source language for lyrics
      const sourceLang = currentTrack?.sourceLanguage || "English";
      utterance.lang = getLocaleByName(sourceLang);
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

    setEditingLine({
      original: trimmedLine,
      translation:
        existingMetadata?.translatedPhrase || fullTrans || "Translating...",
      explanation: existingMetadata?.explanation,
      cardId: existingMetadata?.id,
      status: existingMetadata?.status || "learning",
      index: currentIndex,
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
                userId: user.uid,
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
      const allLines = currentTrack.rawLyrics.split("\n");

      let startIndex = 0;
      if (activeLineIndex !== null) {
        startIndex = activeLineIndex + 1;
        if (startIndex >= allLines.length) {
          startIndex = 0;
        }
      }

      setShadowingAttempts(0);
      readNextLine(allLines, startIndex);
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

  const readNextLine = (allLines: string[], index: number) => {
    if (index >= allLines.length || !isReadingAllRef.current) {
      setIsReadingAll(false);
      isReadingAllRef.current = false;
      return;
    }

    const currentLine = allLines[index].trim();
    if (!currentLine) {
      readNextLine(allLines, index + 1);
      return;
    }

    // Skip known phrases if setting is enabled
    const metadata = phraseMetadata.get(currentLine);
    if (skipKnownPhrases && metadata?.status === "known") {
      readNextLine(allLines, index + 1);
      return;
    }

    setActiveLineIndex(index);
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
              if (isReadingAllRef.current) readNextLine(allLines, index + 1);
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
                    readNextLine(allLines, index + 1);
                }, 1500);
                return 0;
              } else {
                // Repeat current line
                setTimeout(() => {
                  setShadowingFeedback("none");
                  if (isReadingAllRef.current) readNextLine(allLines, index);
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
            readNextLine(allLines, index + 1);
          }
        }, 700);
      }
    });
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchITunes(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };


  const handleTrackSelect = async (track: any) => {
    // 1. CLEAR previous states
    setLyricsFetchError(null);
    setManualLyrics("");
    setActiveLineIndex(null);
    setIsReadingAll(false);
    setActiveTab("preview");
    window.speechSynthesis.cancel();

    // 2. Initial cache check
    const trackId = track.id || track.trackId;
    const cached = getCachedTrackData(trackId);
    if (cached) {
      setCurrentTrack(cached);
      setView("lyrics");
      
      // If Stage 2 or 3 is missing, kick them off
      if (!cached.processingStatus.stage2_completed) {
        runStage2(cached);
      } else if (!cached.processingStatus.stage3_completed) {
        runStage3(cached);
      }
      addRecentTrack(track);
      setRecentTracks(getRecentTracks());
      return;
    }

    // 3. Stage 1: Load Raw Lyrics
    setIsLoadingLyrics(true);
    setLoadingStep("searching");
    try {
      const lyricsData = await fetchLyrics(track.artist, track.title);
      const rawLyrics = lyricsData?.lyrics;

      if (!rawLyrics) {
        setLyricsFetchError("Lyrics not found in databases.");
        setIsLoadingLyrics(false);
        return;
      }

      setLoadingStep("analyzing");
      const [sourceLang, metadata] = await Promise.all([
        detectLanguage(rawLyrics),
        extractLyricsMetadata(rawLyrics, track.artist, track.title),
      ]);

      const initialTrack: TrackLyricsData = {
        trackId: trackId,
        artist: track.artist,
        title: track.title,
        rawLyrics: rawLyrics,
        source: (lyricsData.source as any) || "Unknown",
        sourceLanguage: sourceLang || "English",
        lines: splitLyricsIntoLines(trackId, rawLyrics),
        processingStatus: {
          stage1_completed: true,
          stage2_completed: false,
          stage3_completed: false,
        },
        lastUpdated: Date.now(),
      };

      setCurrentTrack(initialTrack);
      saveTrackData(trackId, initialTrack);
      setView("lyrics");
      addRecentTrack(track);
      setRecentTracks(getRecentTracks());

      // 4. Kick off Stage 2 (Preview)
      runStage2(initialTrack);
    } catch (err) {
      setLyricsFetchError("Failed to fetch or process lyrics.");
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("idle");
    }
  };

  const runStage2 = async (track: TrackLyricsData) => {
    setIsGeneratingPhraseAnalysis(true);
    try {
      const result = await generatePhraseAnalysis(
        track.rawLyrics,
        track.artist,
        track.title,
        targetLanguage
      );

      setCurrentTrack((prev) => {
        if (!prev || prev.trackId !== track.trackId) return prev;
        
        const updatedLines = prev.lines.map(line => {
          const aiLine = result.lines.find((l: any) => l.original === line.original);
          if (aiLine) {
            return {
              ...line,
              phrases: aiLine.phrases.map((p: any) => ({
                ...p,
                id: `${track.trackId}:p:${p.text.replace(/\s+/g, '_')}`
              }))
            };
          }
          return line;
        });

        const updated = {
          ...prev,
          meaning: result.meaning,
          lines: updatedLines,
          processingStatus: { ...prev.processingStatus, stage2_completed: true }
        };
        saveTrackData(track.trackId, updated);
        return updated;
      });

      // After Stage 2, automatically start Stage 3
      runStage3({ ...track, processingStatus: { ...track.processingStatus, stage2_completed: true } });
    } catch (err) {
      console.error("Stage 2 failed:", err);
    } finally {
      setIsGeneratingPhraseAnalysis(false);
    }
  };

  const runStage3 = async (track: TrackLyricsData) => {
    if (track.processingStatus.stage3_completed) return;
    setIsTranslating(true);
    try {
      const result = await completeLyricsAnalysis(
        track.rawLyrics,
        track.artist,
        track.title,
        targetLanguage
      );

      setCurrentTrack((prev) => {
        if (!prev || prev.trackId !== track.trackId) return prev;

        const updatedLines = prev.lines.map(line => {
          const aiLine = result.lines.find((l: any) => l.original === line.original);
          if (aiLine) {
            // Merge phrases: keep Stage 2 IDs if text matches, or create new ones
            const mergedPhrases = [...line.phrases];
            aiLine.phrases.forEach((newP: any) => {
              if (!mergedPhrases.find(p => p.text === newP.text)) {
                mergedPhrases.push({
                  ...newP,
                  id: `${track.trackId}:p:${newP.text.replace(/\s+/g, '_')}`
                });
              } else {
                // Update existing Stage 2 phrase with lemmas etc
                const idx = mergedPhrases.findIndex(p => p.text === newP.text);
                mergedPhrases[idx] = { ...mergedPhrases[idx], ...newP };
              }
            });

            return {
              ...line,
              translation: aiLine.translation,
              phrases: mergedPhrases
            };
          }
          return line;
        });

        const updated = {
          ...prev,
          lines: updatedLines,
          processingStatus: { ...prev.processingStatus, stage3_completed: true }
        };
        saveTrackData(track.trackId, updated);
        return updated;
      });
    } catch (err) {
      console.error("Stage 3 failed:", err);
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
      const [sourceLanguage, metadata] = await Promise.all([
        detectLanguage(manualLyrics),
        extractLyricsMetadata(
          manualLyrics,
          currentTrack.artist,
          currentTrack.title,
        ),
      ]);

      const initialTrack: TrackLyricsData = {
        ...currentTrack,
        rawLyrics: manualLyrics,
        source: "Manual",
        sourceLanguage: sourceLanguage || "English",
        authors: metadata?.authors,
        lyricSource: "Manual Entry",
        lines: splitLyricsIntoLines(currentTrack.trackId, manualLyrics),
        processingStatus: {
          stage1_completed: true,
          stage2_completed: false,
          stage3_completed: false,
        },
        lastUpdated: Date.now(),
      };

      setCurrentTrack(initialTrack);
      saveTrackData(currentTrack.trackId, initialTrack);
      setManualLyrics("");

      // Trigger enrichment
      runStage2(initialTrack);
    } catch (err) {
      setLyricsFetchError("Processing failed. Please check your text.");
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("idle");
    }
  };

  const handleGenerateAnalysis = async (force: boolean = false) => {
    if (
      !currentTrack ||
      !currentTrack.rawLyrics ||
      (!force && currentTrack.processingStatus.stage3_completed) ||
      isGeneratingAnalysis
    )
      return;

    setIsGeneratingAnalysis(true);
    try {
      await runStage3(currentTrack);
    } catch (err) {
      console.error("Analysis generation failed:", err);
    } finally {
      setIsGeneratingAnalysis(false);
    }
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
  ) => {
    const trimmedLine = line.trim();
    if (!trimmedLine && isCompact) return null;

    const metadata = phraseMetadata.get(trimmedLine);
    const userTrans = metadata?.translatedPhrase;
    const autoTrans = currentTrack?.lines?.[i]?.translation;
    const displayTranslation = userTrans || autoTrans;

    const lineStatusStatus = getLineStatus(trimmedLine);
    const style = getStatusStyles(lineStatusStatus);
    const phrasesInLine = getPhrasesForLine(i);
    const progress = getLineProgress(i);

    return (
      <motion.div
        key={i}
        ref={(el) => {
          if (!isCompact) {
            if (el) lineRefs.current.set(i, el as HTMLDivElement);
            else lineRefs.current.delete(i);
          }
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100) {
            // Swiped left -> Know
            handleAddLineWithComponents(line, i, "known");
          } else if (info.offset.x > 100) {
            // Swiped right -> Learn
            handleAddLineWithComponents(line, i, "learning");
          }
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.01, 1) }}
        className={cn(
          "group transition-all duration-300 relative flex flex-col gap-1 rounded-[1.5rem] border cursor-pointer overflow-hidden",
          isCompact ? "px-4 py-3" : "px-6 py-4",
          activeLineIndex === i
            ? "scale-[1.01] shadow-lg z-10 brightness-110"
            : "scale-100",
          trimmedLine ? style.bg : "bg-transparent border-transparent",
          trimmedLine ? style.border : "border-transparent",
          activeLineIndex === i ? "border-app-accent/50" : "",
        )}
        onClick={() => trimmedLine && handleLineClick(line, i)}
      >
        <div className="flex items-center gap-4 w-full relative z-10">
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-serif leading-snug transition-all duration-300 text-app-fg ml-1",
                activeLineIndex === i
                  ? isCompact
                    ? "text-xl"
                    : "text-3xl"
                  : isCompact
                    ? "text-base opacity-90"
                    : "text-xl opacity-80",
              )}
            >
              {line ? renderHighlightedText(line, phrasesInLine) : "\u00A0"}
            </p>
          </div>

          {trimmedLine && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPhraseDrawerData({
                    phrase: line,
                    translation: displayTranslation || "",
                    explanation: "",
                  });
                  setIsPhraseDrawerOpen(true);
                }}
                className={cn(
                  "p-2 rounded-xl transition-all hover:scale-110 active:scale-95",
                  lineStatusStatus === "known"
                    ? "text-green-500"
                    : lineStatusStatus === "learning"
                      ? "text-orange-500"
                      : "text-app-fg opacity-20 hover:opacity-100",
                )}
              >
                {isSaving && activeLineIndex === i ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  style.icon
                )}
              </button>
            </div>
          )}
        </div>

        <div className="pl-1 relative z-10">
          <AnimatePresence>
            {(activeLineIndex === i || alwaysShowTranslation) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {displayTranslation && (
                  <p
                    className={cn(
                      "font-serif italic text-app-fg opacity-40 transition-all duration-300 ml-1 mt-1",
                      activeLineIndex === i
                        ? isCompact
                          ? "text-sm"
                          : "text-lg"
                        : isCompact
                          ? "text-xs"
                          : "text-base",
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
                            height:
                              shadowingFeedback === "none" ? [8, 16, 8] : 10,
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

        {progress && "percentage" in progress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-app-fg/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              className={cn(
                "h-full transition-colors",
                progress.percentage === 100
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                  : "bg-app-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.4)]"
              )}
            />
          </div>
        )}
      </motion.div>
    );
  };

  const handleResetAnalysis = () => {
    handleGenerateAnalysis(true);
  };

  // Analysis tab logic: No auto-trigger. User must click "Generate" or "Reset".

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

  const handleCopyLyrics = () => {
    if (!currentTrack || !currentTrack.rawLyrics) return;
    const data = {
      title: currentTrack.title,
      artist: currentTrack.artist,
      lyrics: currentTrack.rawLyrics,
      fullTranslation: currentTrack.fullTranslation,
      meaning: currentTrack.meaning,
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyAnalysis = () => {
    if (!currentTrack) return;
    const analysisData = {
      meaning: currentTrack.meaning,
      lines: currentTrack.lines,
      fullTranslation: currentTrack.fullTranslation
    };
    navigator.clipboard.writeText(JSON.stringify(analysisData, null, 2));
    setIsAnalysisCopied(true);
    setTimeout(() => setIsAnalysisCopied(false), 2000);
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
            Lyrify
          </span>
        </div>
        <div className="flex items-center gap-4">
          {!user ? (
            <button
              onClick={signIn}
              className="px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 4px 15px -3px var(--accent)",
              }}
            >
              <LogIn size={12} />
              Join
            </button>
          ) : (
            <button
              onClick={() => setView("settings")}
              className="flex items-center gap-3 p-1 pr-3 rounded-full bg-app-card border border-app-card-border shadow-app-card hover:bg-[var(--accent)] hover:bg-opacity-10 transition-all group"
            >
              <div className="flex flex-col items-end mr-1">
                <span className="text-[9px] text-app-fg opacity-30 uppercase font-black tracking-tighter leading-none mb-0.5">
                  Profile
                </span>
                <span className="text-[10px] text-app-fg opacity-80 uppercase font-black leading-none">
                  {user.displayName?.split(" ")[0] || "User"}
                </span>
              </div>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--accent) 20%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--accent) 20%, transparent)",
                }}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon size={14} style={{ color: "var(--accent)" }} />
                )}
              </div>
            </button>
          )}
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
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-y-auto px-6 py-8"
            >
              {/* Search Bar */}
              <div className="mb-8">
                <form onSubmit={handleSearch} className="relative group">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-app-fg opacity-20 group-focus-within:text-[var(--accent)] transition-colors"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search iTunes library..."
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
                      searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className="p-1 hover:bg-app-fg/10 rounded-full transition-colors text-app-fg opacity-40 hover:opacity-100"
                        >
                          <X size={20} />
                        </button>
                      )
                    )}
                  </div>
                </form>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-12">
                  <h2
                    className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 px-2"
                    style={{ color: "var(--accent)" }}
                  >
                    Results
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((track) => (
                      <button
                        key={track.id}
                        disabled={isLoadingLyrics}
                        onClick={() => handleTrackSelect(track)}
                        className="flex items-center gap-4 p-3 rounded-2xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80"
                      >
                        <img
                          src={track.coverUrl}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div className="text-left overflow-hidden">
                          <p className="font-bold text-app-fg leading-tight truncate">
                            {track.title}
                          </p>
                          <p className="text-xs text-app-muted truncate">
                            {track.artist}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Tracks */}
              {recentTracks.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-app-fg opacity-40 mb-6 px-2">
                    Recent
                  </h2>
                  <div className="space-y-4">
                    {recentTracks.map((track) => (
                      <button
                        key={`recent-${track.id}`}
                        onClick={() => handleTrackSelect(track)}
                        className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={track.coverUrl}
                            className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                          />
                          <div className="text-left">
                            <p className="font-bold text-app-fg leading-tight">
                              {track.title}
                            </p>
                            <p className="text-sm text-app-muted">
                              {track.artist}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={20}
                          className="text-app-fg opacity-20 mr-2"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions / Original Tracks */}
              {!searchResults.length && !recentTracks.length && (
                <>
                  <h2
                    className="text-xs font-black uppercase tracking-[0.3em] mb-8 px-2 opacity-50"
                    style={{ color: "var(--accent)" }}
                  >
                    Suggestions
                  </h2>
                  <div className="space-y-4">
                    {MOCK_TRACKS.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => handleTrackSelect(track)}
                        className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={track.coverUrl}
                            className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                          />
                          <div className="text-left">
                            <p className="font-bold text-app-fg leading-tight">
                              {track.title}
                            </p>
                            <p className="text-sm text-app-muted">
                              {track.artist}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={20}
                          className="text-app-fg opacity-20 mr-2"
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
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
                    <div className="flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/10 rounded-full border border-[var(--accent)]/20 animate-pulse">
                      <RefreshCw
                        size={12}
                        className={cn(
                          "animate-spin text-[var(--accent)]",
                          loadingStep === "searching"
                            ? "duration-[2s]"
                            : "duration-700",
                        )}
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
                        {loadingStep === "searching"
                          ? "Searching DB"
                          : "AI Processing"}
                      </span>
                    </div>
                  )}
                  {isGeneratingPhraseAnalysis && activeTab === "preview" && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20 animate-pulse">
                      <RefreshCw
                        size={12}
                        className="animate-spin text-amber-500"
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                        Generating Preview
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
                      <p className="text-lg text-app-fg opacity-40 font-serif italic">
                        {currentTrack.artist}
                      </p>
                    </div>
                    <img
                      src={currentTrack.coverUrl}
                      className="w-20 h-20 rounded-2xl object-cover shadow-2xl shrink-0"
                      alt="Cover"
                    />
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
                </div>

                {activeTab === "preview" && (
                  <div className="flex flex-col gap-8 pb-32">
                    {(!currentTrack?.processingStatus?.stage2_completed && (isLoadingLyrics || isGeneratingPhraseAnalysis)) ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        <div className="relative">
                          <div
                            className={cn(
                              "w-16 h-16 rounded-full border-4 border-app-fg/5 flex items-center justify-center",
                            )}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="w-full h-full rounded-full border-4 border-t-[var(--accent)] border-l-[var(--accent)] border-r-transparent border-b-transparent"
                            />
                          </div>
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Sparkles
                              size={20}
                              className="text-[var(--accent)]"
                            />
                          </motion.div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-app-fg">
                            {isLoadingLyrics ? "Finding Lyrics..." : "Creating Preview..."}
                          </h3>
                          <p className="text-xs text-app-fg opacity-40 max-w-[240px] font-serif italic mx-auto">
                            {isLoadingLyrics 
                              ? "Searching global databases for the original words."
                              : "Our AI is preparing a concise summary and highlight phrases for you."}
                          </p>
                        </div>
                        <div className="flex gap-2">
                           <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", isLoadingLyrics ? "bg-[var(--accent)] animate-pulse" : "bg-emerald-500")} />
                           <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", isGeneratingPhraseAnalysis ? "bg-[var(--accent)] animate-pulse" : currentTrack?.processingStatus?.stage2_completed ? "bg-emerald-500" : "bg-app-fg/10")} />
                           <div className={cn("w-1.5 h-1.5 rounded-full", "bg-app-fg/10")} />
                        </div>
                      </div>
                    ) : currentTrack?.processingStatus?.stage2_completed ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                      >
                        {currentTrack.meaning && (
                          <section className="p-8 rounded-[2.5rem] bg-app-card/60 border border-app-card-border shadow-app-card">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-app-accent">
                              Song Meaning
                            </h2>
                            <p className="text-xl font-serif italic text-app-fg opacity-80 leading-relaxed">
                              {currentTrack.meaning}
                            </p>
                          </section>
                        )}

                        <div className="flex flex-col gap-3">
                          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] ml-4 opacity-40">
                             Key Phrases
                          </h2>
                          {currentTrack.lines
                            .map((l: any, i: number) => ({ ...l, index: i }))
                            .filter(
                              (l: any) => l.phrases && l.phrases.length > 0,
                            )
                            .slice(0, 6)
                            .map((lineData: any) =>
                              renderLyricLine(
                                lineData.original,
                                lineData.index,
                                false,
                                true,
                              ),
                            )}
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                          <button
                            onClick={() => {
                              setActiveTab("analysis");
                              if (!currentTrack?.processingStatus?.stage3_completed) {
                                handleGenerateAnalysis();
                              }
                            }}
                            className="w-full py-5 rounded-[2rem] bg-app-fg text-app-bg font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                          >
                            <Brain size={16} />
                            Deep Song Analysis
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="py-20 text-center space-y-4">
                         <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <X size={24} className="text-red-500" />
                         </div>
                         <p className="opacity-40 font-serif italic">Could not generate a preview for this track.</p>
                         <button 
                            onClick={handleResetLyrics}
                            className="px-6 py-2 rounded-xl bg-app-card border border-app-card-border text-[10px] font-black uppercase tracking-widest text-[var(--accent)]"
                          >
                            Try Reloading
                          </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "lyrics" && (
                  <div className="flex flex-col gap-2 pb-32">
                    <div className="flex justify-end px-1 pb-4">
                      {(currentTrack.rawLyrics || lyricsFetchError) && (
                        <div className="flex gap-2">
                          <button
                            onClick={handleCopyLyrics}
                            disabled={!currentTrack.rawLyrics}
                            className="px-3 py-1.5 rounded-xl bg-app-card border border-app-card-border text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-[var(--accent)] transition-all flex items-center gap-2"
                            title="Copy data structure"
                          >
                            {isCopied ? (
                              <Check size={10} className="text-emerald-500" />
                            ) : (
                              <Copy size={10} />
                            )}
                            {isCopied ? "Copied" : "Copy Data"}
                          </button>
                          <button
                            onClick={handleResetLyrics}
                            disabled={isLoadingLyrics}
                            className="px-3 py-1.5 rounded-xl bg-app-card border border-app-card-border text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-[var(--accent)] transition-all flex items-center gap-2"
                            title="Reset lyrics and translation"
                          >
                            <RefreshCw
                              size={10}
                              className={isLoadingLyrics ? "animate-spin" : ""}
                            />
                            Reset Lyrics
                          </button>
                        </div>
                      )}
                    </div>
                    {currentTrack.rawLyrics ? (
                      currentTrack.lines.map((line, i) =>
                        renderLyricLine(line.original, i, false, false),
                      )
                    ) : (
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
                        ) : null}
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
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        {/* Loading spinner */}
                      </div>
                    ) : currentTrack.meaning ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-12"
                      >
                        {/* Meaning Section */}
                        <section className="space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                                <Quote size={16} />
                              </div>
                              <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
                                Song Meaning
                              </h2>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleCopyAnalysis}
                                className="px-3 py-1.5 rounded-xl bg-app-card border border-app-card-border text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-[var(--accent)] transition-all flex items-center gap-2"
                              >
                                {isAnalysisCopied ? <Check size={10} /> : <Copy size={10} />}
                                {isAnalysisCopied ? "Copied" : "Copy Analysis"}
                              </button>
                            </div>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-app-card border border-app-card-border shadow-app-card">
                            <p className="text-xl font-serif leading-relaxed text-app-fg opacity-80 italic">
                              "{currentTrack.meaning}"
                            </p>
                          </div>
                        </section>

                        {/* Phrases Section - Extracted from lines */}
                        <section className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                              <Star size={16} />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">
                              Key Phrases & Expressions
                            </h2>
                          </div>
                          <div className="grid gap-4">
                            {currentTrack.lines.flatMap(l => l.phrases).filter((p, i, self) => self.findIndex(t => t.text === p.text) === i).map((item, idx) => {
                              const card = phraseMetadata.get(item.text);
                              return (
                                <div key={idx} className="group p-1">
                                  <div className="flex flex-col gap-3 p-6 rounded-[2rem] bg-app-card border border-app-card-border transition-all cursor-pointer relative group/phrase">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="text-xl font-serif text-app-fg ml-1">{item.text}</p>
                                        <div className="flex flex-col gap-1 mt-1 ml-1">
                                          {item.translation && <p className="text-lg font-serif italic text-app-fg opacity-60">{item.translation}</p>}
                                        </div>
                                      </div>
                                      <div className="shrink-0 flex items-center gap-2">
                                        {card ? (
                                          <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 shadow-sm text-green-500 bg-green-500/10">
                                            {card.status}
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => handleAddAnalysisPhrase(item.text, item.translation || "", item.explanation || "")}
                                            className="p-2.5 rounded-2xl bg-app-fg/5 text-app-fg opacity-40 hover:opacity-100 hover:bg-[var(--accent)] hover:text-white transition-all shadow-sm"
                                          >
                                            <Plus size={18} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {item.explanation && (
                                       <div className="pl-4 border-l-2 border-app-card-border">
                                          <p className="text-lg font-medium text-app-fg opacity-60 group-hover:opacity-80 transition-opacity leading-relaxed">{item.explanation}</p>
                                       </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      </motion.div>
                    ) : (
                      <div className="py-20 flex flex-col items-center justify-center text-center space-y-8">
                        <div className="w-20 h-20 rounded-[2rem] bg-app-card border border-app-card-border flex items-center justify-center text-app-fg opacity-10">
                          <Brain size={40} />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-bold text-app-fg">No Analysis Yet</h3>
                          <p className="text-app-fg opacity-40 max-w-sm mx-auto">Click below to start deep learning for this song.</p>
                        </div>
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
              onClose={() => setView("tracks")}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Player Control Panel (Lyrics & Preview Taps) */}
      <AnimatePresence>
        {view === "lyrics" &&
          (activeTab === "lyrics" || activeTab === "preview") &&
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

              <div className="relative px-3 py-2 bg-app-card/80 backdrop-blur-3xl border border-app-card-border rounded-full flex items-center justify-between shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
                {/* Left: Metadata / Mode Selector */}
                <div className="flex-1 flex items-center min-w-0 gap-2.5 pl-1.5">
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
                </div>

                {/* Center: Play Control */}
                <div className="flex-shrink-0 mx-2 relative group">
                  <motion.button
                    onClick={toggleReadLyrics}
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
                  <button
                    onClick={() => setIsResourcesOpen(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-app-fg opacity-60 hover:opacity-100 hover:bg-app-fg/5 transition-all active:scale-95"
                    title="Sources"
                  >
                    <ListMusic size={20} />
                  </button>
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
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.4em]"
                      style={{ color: "var(--accent)" }}
                    >
                      Resources
                    </span>
                    <h3 className="text-xl font-bold text-app-fg">
                      {currentTrack.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsResourcesOpen(false)}
                    className="text-app-fg opacity-20 hover:opacity-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
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
                </div>

                <button
                  onClick={() => setIsResourcesOpen(false)}
                  className="w-full py-4 rounded-2xl bg-app-fg text-app-bg font-bold tracking-wide active:scale-95 transition-all"
                >
                  Close
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
                        onClick={() => speak(editingLine.original)}
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
