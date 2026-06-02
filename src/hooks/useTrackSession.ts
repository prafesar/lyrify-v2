import { useState, useCallback, useMemo } from "react";
import { 
  trackSessionFacade, 
  recentHistoryRepository, 
  aiClient, 
  ANALYSIS_PROMPT_VERSION, 
  TRANSLATION_PROMPT_VERSION 
} from "../application";
import { 
  type TrackLyricsData, 
  type LyricOption, 
  fetchLyrics, 
  splitLyricsIntoLines, 
  saveTrackData, 
  searchLyricsOptions, 
  fetchLyricsFromOption, 
  clearCachedLyrics 
} from "../services/musicService";
import { 
  linkPhrasesToLines, 
  buildStarredLinesAnalysisInput, 
  mergeGeneratedPhrasesForLines
} from "../services/lyricsAnalysisService";

export interface UseTrackSessionResult {
  currentTrack: TrackLyricsData | null;
  isLoadingLyrics: boolean;
  loadingStep: "searching" | "meaning" | "analyzing" | "translating" | "idle";
  lyricsFetchError: string | null;
  analysisError: string | null;
  manualLyrics: string;
  isTranslating: boolean;
  isGeneratingAnalysis: boolean;
  lyricOptions: LyricOption[];
  isSearchingOptions: boolean;
  manualSearchQuery: string;
  isResourcesOpen: boolean;
  
  setCurrentTrack: React.Dispatch<React.SetStateAction<TrackLyricsData | null>>;
  setIsLoadingLyrics: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingStep: React.Dispatch<React.SetStateAction<"searching" | "meaning" | "analyzing" | "translating" | "idle">>;
  setLyricsFetchError: React.Dispatch<React.SetStateAction<string | null>>;
  setAnalysisError: React.Dispatch<React.SetStateAction<string | null>>;
  setManualLyrics: React.Dispatch<React.SetStateAction<string>>;
  setIsTranslating: React.Dispatch<React.SetStateAction<boolean>>;
  setIsGeneratingAnalysis: React.Dispatch<React.SetStateAction<boolean>>;
  setLyricOptions: React.Dispatch<React.SetStateAction<LyricOption[]>>;
  setIsSearchingOptions: React.Dispatch<React.SetStateAction<boolean>>;
  setManualSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setIsResourcesOpen: React.Dispatch<React.SetStateAction<boolean>>;

  handleTrackSelect: (
    track: any, 
    targetLanguage: string, 
    callbacks: {
      recordTrackExploredAction: () => void;
      updateRecentTracks: (recent: any[]) => void;
      onSelectClear: () => void;
      setView: (v: "tracks" | "study" | "lyrics" | "settings") => void;
      setActiveTab: (t: "preview" | "lyrics" | "analysis") => void;
    }
  ) => Promise<void>;
  
  handleAnalyzeSong: (
    targetLanguage: string, 
    callbacks: {
      updateRecentTracks: (recent: any[]) => void;
      loadCommunityTracks: () => void;
    }
  ) => Promise<void>;

  handleRegenerateTranslations: (targetLanguage: string) => Promise<void>;
  runStage3: (track: TrackLyricsData, targetLanguage: string, force?: boolean) => Promise<void>;
  handleManualLyricsSubmit: (
    targetLanguage: string,
    callbacks: {
      updateRecentTracks: () => void;
      loadCommunityTracks: () => void;
    }
  ) => Promise<void>;

  handleGenerateAnalysis: (
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    },
    force?: boolean,
    customTrack?: TrackLyricsData
  ) => Promise<void>;

  handleRegenerateAnalysis: (
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => Promise<void>;

  handleResetAnalysis: (
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => void;

  handleManualLyricsSearch: () => Promise<void>;
  handleSelectLyricOption: (
    option: LyricOption, 
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => Promise<void>;
  
  handleResetLyrics: (
    targetLanguage: string,
    callbacks: {
      recordTrackExploredAction: () => void;
      updateRecentTracks: (recent: any[]) => void;
      onSelectClear: () => void;
      setView: (v: "tracks" | "study" | "lyrics" | "settings") => void;
      setActiveTab: (t: "preview" | "lyrics" | "analysis") => void;
    }
  ) => void;

  handleAnalyzeStarredLines: (
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => Promise<void>;
}

export function useTrackSession(): UseTrackSessionResult {
  const [currentTrack, setCurrentTrack] = useState<TrackLyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [loadingStep, setLoadingStep] = useState<"searching" | "meaning" | "analyzing" | "translating" | "idle">("idle");
  const [lyricsFetchError, setLyricsFetchError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [manualLyrics, setManualLyrics] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [lyricOptions, setLyricOptions] = useState<LyricOption[]>([]);
  const [isSearchingOptions, setIsSearchingOptions] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);

  const handleTrackSelect = useCallback(async (
    track: any,
    targetLanguage: string,
    callbacks: {
      recordTrackExploredAction: () => void;
      updateRecentTracks: (recent: any[]) => void;
      onSelectClear: () => void;
      setView: (v: "tracks" | "study" | "lyrics" | "settings") => void;
      setActiveTab: (t: "preview" | "lyrics" | "analysis") => void;
    }
  ) => {
    setLyricsFetchError(null);
    setManualLyrics("");
    callbacks.onSelectClear();
    callbacks.setActiveTab("preview");

    const initialTrack = await trackSessionFacade.selectTrack(track, targetLanguage, {
      onMetadataUpdate: (updated) => {
        setCurrentTrack((prev) => (prev && prev.trackId === updated.trackId ? updated : prev));
      },
      onCacheUpdate: (updated) => {
        setCurrentTrack((prev) => (prev && prev.trackId === updated.trackId ? updated : prev));
      }
    });

    callbacks.recordTrackExploredAction();
    setCurrentTrack(initialTrack);
    callbacks.setView("lyrics");
    try {
      callbacks.updateRecentTracks(recentHistoryRepository.getRecentTracks());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAnalyzeSong = useCallback(async (
    targetLanguage: string,
    callbacks: {
      updateRecentTracks: (recent: any[]) => void;
      loadCommunityTracks: () => void;
    }
  ) => {
    if (!currentTrack || isLoadingLyrics) return;

    setLyricsFetchError(null);
    setIsLoadingLyrics(true);
    setLoadingStep("searching");

    try {
      const updatedTrack = await trackSessionFacade.analyzeSongMeaningAndTranslations(
        currentTrack,
        targetLanguage,
        (step) => setLoadingStep(step as any)
      );

      setCurrentTrack(updatedTrack);
      callbacks.updateRecentTracks(recentHistoryRepository.getRecentTracks());
      callbacks.loadCommunityTracks();
    } catch (err: any) {
      console.error("Manual fetch/meaning failed:", err);
      setLyricsFetchError(err.message || "Failed to fetch song data.");
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("idle");
    }
  }, [currentTrack, isLoadingLyrics]);

  const handleRegenerateTranslations = useCallback(async (targetLanguage: string) => {
    if (!currentTrack || isTranslating) return;
    setIsTranslating(true);
    setLoadingStep("translating");
    try {
      const updatedTrack = await trackSessionFacade.regenerateTranslations(currentTrack, targetLanguage);
      setCurrentTrack(updatedTrack);
    } catch (err) {
      console.error("Failed to regenerate translations:", err);
    } finally {
      setIsTranslating(false);
      setLoadingStep("idle");
    }
  }, [currentTrack, isTranslating]);

  const runStage3 = useCallback(async (track: TrackLyricsData, targetLanguage: string, force: boolean = false) => {
    const hasPhrases = track.lines.some(l => l.phrases && l.phrases.length > 0);
    if (!force && track.processingStatus.stage3_completed && hasPhrases) return;
    setIsTranslating(true);
    try {
      const updatedTrack = await trackSessionFacade.runDeepPhraseAnalysis(track, targetLanguage, force);
      setCurrentTrack(updatedTrack);
    } catch (err: any) {
      console.error("Stage 3 (Phrase Analysis) failed:", err);
      setAnalysisError(err?.message || "An unexpected error occurred during deep analysis. Please try again.");
      throw err;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const handleManualLyricsSubmit = useCallback(async (
    targetLanguage: string,
    callbacks: {
      updateRecentTracks: () => void;
      loadCommunityTracks: () => void;
    }
  ) => {
    if (!currentTrack || !manualLyrics.trim()) return;

    setIsLoadingLyrics(true);
    setLoadingStep("analyzing");
    setLyricsFetchError(null);

    try {
      const initialTrack = await trackSessionFacade.submitManualLyrics(
        currentTrack,
        manualLyrics,
        targetLanguage,
        {
          onBackgroundComplete: (updated) => {
            setCurrentTrack((prev) => {
              if (prev && prev.trackId === updated.trackId) {
                callbacks.updateRecentTracks();
                callbacks.loadCommunityTracks();
                return updated;
              }
              return prev;
            });
          }
        }
      );

      setCurrentTrack(initialTrack);
      setManualLyrics("");
    } catch (err) {
      setLyricsFetchError("Processing failed. Please check your text.");
    } finally {
      setIsLoadingLyrics(false);
      setLoadingStep("idle");
    }
  }, [currentTrack, manualLyrics]);

  const handleGenerateAnalysis = useCallback(async (
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    },
    force: boolean = false,
    customTrack?: TrackLyricsData
  ) => {
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

        trackData = {
          ...trackData,
          rawLyrics: lyrics,
          source: (lyricsResponse.source as any) || "Unknown",
          lines: splitLyricsIntoLines(trackData.trackId, lyrics),
          processingStatus: { ...trackData.processingStatus, stage1_completed: true }
        };
      }

      const isOutdated = !trackData.promptVersion || trackData.promptVersion < ANALYSIS_PROMPT_VERSION;
      const isTranslationOutdated = !trackData.translationPromptVersion || trackData.translationPromptVersion < TRANSLATION_PROMPT_VERSION;

      if (force || !trackData.meaning || !trackData.processingStatus.stage2_completed || isOutdated || isTranslationOutdated) {
        setLoadingStep("meaning");
        trackData = await trackSessionFacade.analyzeSongMeaningAndTranslations(trackData, targetLanguage);
        setCurrentTrack(trackData);
        callbacks.loadCommunityTracks();
      }

      setLoadingStep("analyzing");
      await runStage3(trackData, targetLanguage, force);
    } catch (err: any) {
      console.error("Analysis generation failed:", err);
      setAnalysisError(err?.message || "An unexpected error occurred during deep analysis. Please try again.");
    } finally {
      setIsGeneratingAnalysis(false);
      setLoadingStep("idle");
    }
  }, [currentTrack, isGeneratingAnalysis, runStage3]);

  const handleRegenerateAnalysis = useCallback(async (
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => {
    if (!currentTrack || isGeneratingAnalysis) return;

    if (!confirm("Are you sure you want to reset and regenerate the analysis? This will clear current phrases and meaning.")) {
      return;
    }

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

    await handleGenerateAnalysis(targetLanguage, callbacks, true, resetTrack);
  }, [currentTrack, isGeneratingAnalysis, handleGenerateAnalysis]);

  const handleResetAnalysis = useCallback((
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => {
    handleGenerateAnalysis(targetLanguage, callbacks, true);
  }, [handleGenerateAnalysis]);

  const handleManualLyricsSearch = useCallback(async () => {
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
  }, [currentTrack]);

  const handleSelectLyricOption = useCallback(async (
    option: LyricOption,
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => {
    if (!currentTrack) return;
    setIsLoadingLyrics(true);
    setLoadingStep("searching");
    setLyricsFetchError(null);
    try {
      const lyricsData = await fetchLyricsFromOption(option);
      if (lyricsData.lyrics) {
        setLoadingStep("analyzing");
        const metadataResult = await aiClient.extractLyricsMetadata(lyricsData.lyrics, option.artist, option.title);

        aiClient.fetchTrackMeaning(lyricsData.lyrics, {
          title: option.title,
          artists: [option.artist],
          albumName: currentTrack.album,
          coverUrl: currentTrack.coverUrl
        }).then(result => {
          setCurrentTrack(prev => {
            if (!prev || prev.trackId !== currentTrack.trackId) return prev;

            const langKey = targetLanguage.toLowerCase().trim();
            let meaning = result.meanings.en;
            if (langKey === "spanish") meaning = result.meanings.es;
            if (langKey === "russian") meaning = result.meanings.ru;
            if (langKey === "polish") meaning = result.meanings.pl;

            const updated = {
              ...prev,
              sourceLanguage: result.originalLanguage || prev.sourceLanguage,
              meaning,
              meanings: result.meanings,
              processingStatus: { ...prev.processingStatus, stage2_completed: true }
            };
            saveTrackData(prev.trackId, updated);
            aiClient.saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));
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
        setIsResourcesOpen(false);
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
  }, [currentTrack]);

  const handleResetLyrics = useCallback((
    targetLanguage: string,
    callbacks: {
      recordTrackExploredAction: () => void;
      updateRecentTracks: (recent: any[]) => void;
      onSelectClear: () => void;
      setView: (v: "tracks" | "study" | "lyrics" | "settings") => void;
      setActiveTab: (t: "preview" | "lyrics" | "analysis") => void;
    }
  ) => {
    if (!currentTrack) return;
    clearCachedLyrics(currentTrack.trackId);
    handleTrackSelect({
      id: currentTrack.trackId,
      artist: currentTrack.artist,
      title: currentTrack.title,
      album: currentTrack.album || "",
      coverUrl: currentTrack.coverUrl || "",
    }, targetLanguage, callbacks);
  }, [currentTrack, handleTrackSelect]);

  const handleAnalyzeStarredLines = useCallback(async (
    targetLanguage: string,
    callbacks: {
      loadCommunityTracks: () => void;
    }
  ) => {
    if (!currentTrack) {
      setAnalysisError("No current track loaded.");
      return;
    }

    const starredLines = currentTrack.lines.filter(l => l.isStarred);
    if (starredLines.length === 0) {
      setAnalysisError("No starred lines to analyze. Please star some lines first!");
      return;
    }

    setIsGeneratingAnalysis(true);
    setAnalysisError(null);

    try {
      // Prepare payload
      const input = buildStarredLinesAnalysisInput(currentTrack);

      // Call Gemini Targeted Analysis API
      const result = await aiClient.generateTargetedAnalysis(
        input.title,
        input.artist,
        targetLanguage,
        input.starredLines,
        input.existingPhrases
      );

      if (!result || !result.phrases || result.phrases.length === 0) {
        console.warn("Targeted analysis returned no phrases.");
      }

      // Merge and align phrases
      const mergedTrack = mergeGeneratedPhrasesForLines(currentTrack, result?.phrases || []);

      // Persist locally
      setCurrentTrack(mergedTrack);
      saveTrackData(mergedTrack.trackId, mergedTrack);

      // Async upload to cache/cloud
      aiClient.saveTrackToSharedCache(mergedTrack).catch(e => {
        console.error("Cache share failed:", e);
      });

      callbacks.loadCommunityTracks();
    } catch (err: any) {
      console.error("Targeted starred analysis failed:", err);
      setAnalysisError(err?.message || "An unexpected error occurred during targeted analysis. Please try again.");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  }, [currentTrack]);

  const linkedTrack = useMemo(() => {
    if (!currentTrack) return null;
    return linkPhrasesToLines(currentTrack);
  }, [currentTrack]);

  return {
    currentTrack: linkedTrack,
    isLoadingLyrics,
    loadingStep,
    lyricsFetchError,
    analysisError,
    manualLyrics,
    isTranslating,
    isGeneratingAnalysis,
    lyricOptions,
    isSearchingOptions,
    manualSearchQuery,
    isResourcesOpen,
    setCurrentTrack,
    setIsLoadingLyrics,
    setLoadingStep,
    setLyricsFetchError,
    setAnalysisError,
    setManualLyrics,
    setIsTranslating,
    setIsGeneratingAnalysis,
    setLyricOptions,
    setIsSearchingOptions,
    setManualSearchQuery,
    setIsResourcesOpen,
    handleTrackSelect,
    handleAnalyzeSong,
    handleRegenerateTranslations,
    runStage3,
    handleManualLyricsSubmit,
    handleGenerateAnalysis,
    handleRegenerateAnalysis,
    handleResetAnalysis,
    handleManualLyricsSearch,
    handleSelectLyricOption,
    handleResetLyrics,
    handleAnalyzeStarredLines
  };
}
