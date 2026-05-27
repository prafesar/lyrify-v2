import { useState, useRef, useEffect, useCallback } from "react";
import { type TrackLyricsData } from "../services/musicService";
import { type Flashcard, userDataRepository } from "../application";
import { SUPPORTED_LANGUAGES, getLocaleByName } from "../lib/languages";

export interface UsePlaybackResult {
  activeLineIndex: number | null;
  isPlaying: boolean;
  isPreviewPlaying: boolean;
  hasStartedPreview: boolean;
  previewProgress: number;
  previewDuration: number;
  isReadingAll: boolean;
  isListeningForSpeech: boolean;
  shadowingFeedback: "none" | "correct" | "incorrect";
  playbackMode: "listening" | "shadowing";
  shadowingAttempts: number;
  isMuted: boolean;
  skipKnownPhrases: boolean;
  previewAudioRef: React.RefObject<HTMLAudioElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  lineRefs: React.RefObject<Map<number, HTMLDivElement>>;
  
  togglePreviewAudio: () => void;
  seekPreview: (e: React.MouseEvent<HTMLDivElement>) => void;
  handlePreviewTimeUpdate: () => void;
  handlePreviewLoadedMetadata: () => void;
  handlePreviewEnded: () => void;
  speak: (text: string, onEnd?: () => void, lang?: string) => void;
  toggleReadLyrics: (getPlaybackLines: () => any[]) => void;
  changePlaybackMode: (mode: "listening" | "shadowing") => void;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setSkipKnownPhrases: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveLineIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setIsReadingAll: React.Dispatch<React.SetStateAction<boolean>>;
  setHasStartedPreview: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPreviewPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setPreviewProgress: React.Dispatch<React.SetStateAction<number>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setShadowingFeedback: React.Dispatch<React.SetStateAction<"none" | "correct" | "incorrect">>;
  setIsListeningForSpeech: React.Dispatch<React.SetStateAction<boolean>>;
  startSpeechToText: (expectedText: string, onResult: (match: boolean) => void) => void;
  handleLineClick: (line: string, index: number, extraToRead?: string) => void;
}

export function usePlayback(
  currentTrack: TrackLyricsData | null,
  phraseMetadata: Map<string, Flashcard>,
  targetLanguage: string
): UsePlaybackResult {
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [hasStartedPreview, setHasStartedPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [isListeningForSpeech, setIsListeningForSpeech] = useState(false);
  const [shadowingFeedback, setShadowingFeedback] = useState<"none" | "correct" | "incorrect">("none");
  const [playbackMode, setPlaybackMode] = useState<"listening" | "shadowing">("listening");
  const [shadowingAttempts, setShadowingAttempts] = useState(0);
  const [isMuted, setIsMuted] = useState(() => userDataRepository.getBoolPreference("lyrify_muted", false));
  const [skipKnownPhrases, setSkipKnownPhrases] = useState(() => userDataRepository.getBoolPreference("skip_known", false));

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const isReadingAllRef = useRef(false);
  const playbackModeRef = useRef<"listening" | "shadowing">("listening");
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const incorrectAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync isMuted preferences
  useEffect(() => {
    userDataRepository.setBoolPreference("lyrify_muted", isMuted);
  }, [isMuted]);

  // Sync skipKnownPhrases preferences
  useEffect(() => {
    userDataRepository.setBoolPreference("skip_known", skipKnownPhrases);
  }, [skipKnownPhrases]);

  // Sync playbackMode and targetLanguage references
  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  // Audio configuration & Speech Recognition
  useEffect(() => {
    correctAudioRef.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"
    );
    incorrectAudioRef.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3"
    );

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
    }

    // Warm up TTS voices
    window.speechSynthesis.getVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const togglePreviewAudio = useCallback(() => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play();
      setHasStartedPreview(true);
    }
    setIsPreviewPlaying(!isPreviewPlaying);
  }, [isPreviewPlaying]);

  const seekPreview = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewAudioRef.current || !previewDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / width));
    const newTime = clickRatio * previewDuration;
    previewAudioRef.current.currentTime = newTime;
    setPreviewProgress(newTime);
  }, [previewDuration]);

  const handlePreviewTimeUpdate = useCallback(() => {
    if (previewAudioRef.current) {
      setPreviewProgress(previewAudioRef.current.currentTime);
    }
  }, []);

  const handlePreviewLoadedMetadata = useCallback(() => {
    if (previewAudioRef.current) {
      setPreviewDuration(previewAudioRef.current.duration);
    }
  }, []);

  const handlePreviewEnded = useCallback(() => {
    setIsPreviewPlaying(false);
    setPreviewProgress(0);
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void, lang?: string) => {
    window.speechSynthesis.cancel();

    if (isMuted) {
      if (onEnd) onEnd();
      return;
    }

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
  }, [isMuted, currentTrack]);

  const startSpeechToText = useCallback((
    expectedText: string,
    onResult: (match: boolean) => void
  ) => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      onResult(true);
      return;
    }

    window.speechSynthesis.cancel();

    let isFinished = false;
    const finish = (result: boolean) => {
      if (isFinished) return;
      isFinished = true;
      setIsListeningForSpeech(false);

      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}

      onResult(result);
    };

    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        console.warn("Speech recognition timed out");
        finish(false);
      }
    }, 8000);

    setIsListeningForSpeech(true);
    recognitionRef.current.lang = getLocaleByName(currentTrack?.sourceLanguage || "English");

    recognitionRef.current.onresult = (event: any) => {
      clearTimeout(timeoutId);
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      const cleanExpected = expectedText
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .trim();
      const cleanActual = transcript
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
        .trim();

      const expectedWords = cleanExpected.split(/\s+/).filter((w) => w.length > 0);
      const actualWords = cleanActual.split(/\s+/).filter((w) => w.length > 0);

      if (expectedWords.length === 0) {
        finish(true);
        return;
      }

      const matches = expectedWords.filter((w) => actualWords.includes(w)).length;
      const matchRatio = matches / expectedWords.length;

      finish(matchRatio > 0.4);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      clearTimeout(timeoutId);
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
  }, [currentTrack]);

  const readNextLine = useCallback((playbackLines: any[], index: number) => {
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

    const metadata = phraseMetadata.get(currentLine);
    if (skipKnownPhrases && metadata?.status === "known") {
      readNextLine(playbackLines, index + 1);
      return;
    }

    setActiveLineIndex(lineObj.index);
    speak(currentLine, () => {
      const currentMode = playbackModeRef.current;

      if (currentMode === "shadowing" && isReadingAllRef.current) {
        startSpeechToText(currentLine, (isMatch) => {
          if (isMatch) {
            setShadowingFeedback("correct");
            correctAudioRef.current?.play().catch(() => {});
            setShadowingAttempts(0);
            setTimeout(() => {
              setShadowingFeedback("none");
              if (isReadingAllRef.current) readNextLine(playbackLines, index + 1);
            }, 1200);
          } else {
            setShadowingFeedback("incorrect");
            incorrectAudioRef.current?.play().catch(() => {});
            setShadowingAttempts((prev) => {
              const newAttempts = prev + 1;
              if (newAttempts >= 3) {
                setTimeout(() => {
                  setShadowingFeedback("none");
                  if (isReadingAllRef.current) readNextLine(playbackLines, index + 1);
                }, 1500);
                return 0;
              } else {
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
        setTimeout(() => {
          if (isReadingAllRef.current) {
            readNextLine(playbackLines, index + 1);
          }
        }, 700);
      }
    }, lineObj.language);
  }, [phraseMetadata, skipKnownPhrases, speak, startSpeechToText]);

  const toggleReadLyrics = useCallback((getPlaybackLines: () => any[]) => {
    if (isReadingAll) {
      setIsReadingAll(false);
      isReadingAllRef.current = false;
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
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
  }, [isReadingAll, activeLineIndex, currentTrack, readNextLine]);

  const changePlaybackMode = useCallback((mode: "listening" | "shadowing") => {
    if (mode === playbackMode) return;
    setPlaybackMode(mode);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setIsListeningForSpeech(false);
    setShadowingFeedback("none");
  }, [playbackMode]);

  const handleLineClick = useCallback((
    line: string,
    index: number,
    extraToRead?: string
  ) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    if (isReadingAll) {
      setIsReadingAll(false);
      isReadingAllRef.current = false;
    }

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
      if (playbackModeRef.current === "shadowing") {
        setShadowingFeedback("none");

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
  }, [isReadingAll, speak, startSpeechToText]);

  return {
    activeLineIndex,
    isPlaying,
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
    setPreviewProgress,
    setIsPlaying,
    setShadowingFeedback,
    setIsListeningForSpeech,
    startSpeechToText,
    handleLineClick
  };
}
