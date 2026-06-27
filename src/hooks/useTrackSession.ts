import { useState, useCallback, useMemo } from "react";
import { 
  trackSessionFacade, 
  recentHistoryRepository, 
  aiClient, 
  ANALYSIS_PROMPT_VERSION, 
  TRANSLATION_PROMPT_VERSION,
  libraryRepository
} from "../application";
import { 
  type TrackLyricsData, 
  type LyricOption, 
  fetchLyrics, 
  splitLyricsIntoLines, 
  saveTrackData, 
  searchLyricsOptions, 
  fetchLyricsFromOption, 
  clearCachedLyrics,
  extractTrackMeaning,
  generateLineId 
} from "../services/musicService";
import { 
  linkPhrasesToLines, 
  buildStarredLinesAnalysisInput, 
  mergeGeneratedPhrasesForLines
} from "../services/lyricsAnalysisService";
import { prepareLyricsInput, findMatchedTranslation } from "../services/lyricsPreprocessor";
import { checkServerCache } from "../services/serverCacheLookupService";
import { getLanguageCode, detectDominantLanguage, cascadeTrackLanguageUpdate } from "../lib/languages";
import { updateTrackCardsLanguage } from "../services/localCardService";

export interface UseTrackSessionResult {
  currentTrack: TrackLyricsData | null;
  isLoadingLyrics: boolean;
  loadingStep: "searching" | "meaning" | "lecture" | "analyzing" | "translating" | "idle";
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
  setLoadingStep: React.Dispatch<React.SetStateAction<"searching" | "meaning" | "analyzing" | "translating" | "lecture" | "idle">>;
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

  handleManualLyricsSearch: (customArtist?: string, customTitle?: string) => Promise<void>;
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
  handleSourceLanguageOverride: (newLang: string) => Promise<void>;
}

export function useTrackSession(): UseTrackSessionResult {
  const [currentTrack, setCurrentTrack] = useState<TrackLyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [loadingStep, setLoadingStep] = useState<"searching" | "meaning" | "analyzing" | "translating" | "lecture" | "idle">("idle");
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
    callbacks.setActiveTab("lyrics");

    const initialTrack = await trackSessionFacade.selectTrack(track, targetLanguage, {
      onMetadataUpdate: (updated) => {
        setCurrentTrack((prev) => {
          if (!prev || prev.trackId === updated.trackId) {
            return { ...prev, ...updated };
          }
          return prev;
        });
      },
      onCacheUpdate: (updated) => {
        setCurrentTrack((prev) => {
          if (!prev || prev.trackId === updated.trackId) {
            return { ...prev, ...updated };
          }
          return prev;
        });
      }
    });

    callbacks.recordTrackExploredAction();
    setCurrentTrack((prev) => {
      if (prev && prev.trackId === initialTrack.trackId) {
        return { ...initialTrack, ...prev };
      }
      return initialTrack;
    });
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
      let trackData = { ...currentTrack };
      let cacheResult = null;
      try {
        cacheResult = await checkServerCache(trackData.title, [trackData.artist]);
      } catch (e) {
        console.warn("[PreflightCache] Error in preflight lookup during handleAnalyzeSong:", e);
      }

      if (cacheResult && cacheResult.hasTranslation) {
        let lyrics = trackData.rawLyrics;
        if (!lyrics) {
          lyrics = cacheResult.translation.map((line: any) => line.original).join("\n");
          trackData = {
            ...trackData,
            rawLyrics: lyrics,
            source: trackData.source || "Manual",
            lines: splitLyricsIntoLines(trackData.trackId, lyrics),
            processingStatus: { ...trackData.processingStatus, stage1_completed: true }
          };
        }

        const mergedLines = trackData.lines.map((line, idx) => {
          const matched = findMatchedTranslation(line.original, idx, cacheResult.translation);
          return {
            ...line,
            translation: matched ? matched.translation : (line.translation || ""),
            language: matched ? matched.language : (line.language || "en")
          };
        });

        const provider = typeof trackData.source === 'string' ? trackData.source : 'unknown';
        const authors = trackData.authors ? trackData.authors.split(',').map((a: string) => a.trim()) : null;

        trackData = {
          ...trackData,
          lines: mergedLines,
          sourceLanguage: detectDominantLanguage(mergedLines) || trackData.sourceLanguage || "English",
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          processingStatus: { ...trackData.processingStatus, stage2_completed: true },
          preparedLyricsInput: prepareLyricsInput(
            trackData.title,
            [trackData.artist],
            lyrics,
            targetLanguage,
            { provider, url: trackData.lyricSource || null, authors }
          )
        };

        setCurrentTrack(trackData);
        saveTrackData(trackData.trackId, trackData);
        callbacks.updateRecentTracks(recentHistoryRepository.getRecentTracks());
        callbacks.loadCommunityTracks();
      } else {
        const updatedTrack = await trackSessionFacade.analyzeSongMeaningAndTranslations(
          currentTrack,
          targetLanguage,
          (step) => setLoadingStep(step as any)
        );

        setCurrentTrack(updatedTrack);
        callbacks.updateRecentTracks(recentHistoryRepository.getRecentTracks());
        callbacks.loadCommunityTracks();
      }
    } catch (err: any) {
      console.error("Manual fetch/meaning failed:", err);
      setLyricsFetchError(err.message || "Failed to fetch song data.");
      
      // Load from local SQLite cache to pick up raw lyrics if they were successfully fetched/saved
      try {
        const cached = trackSessionFacade.trackCacheRepository.getCachedTrack(currentTrack.trackId);
        if (cached) {
          console.log("Restoring track data with fetched raw lyrics from local cache:", cached);
          setCurrentTrack(cached);
        }
      } catch (cacheErr) {
        console.error("Failed to restore from local cache:", cacheErr);
      }
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
    const hasLecture = targetTrack.lectureBlocks && targetTrack.lectureBlocks.length > 0;

    if (!force && completed && hasLecture) return;

    setIsGeneratingAnalysis(true);
    setAnalysisError(null);
    try {
      let trackData = { ...targetTrack };

      // Perform preflight cache lookup
      let cacheResult = null;
      if (!force) {
        try {
          cacheResult = await checkServerCache(trackData.title, [trackData.artist]);
        } catch (e) {
          console.warn("[PreflightCache] Error in preflight lookup during handleGenerateAnalysis:", e);
        }
      }

      if (cacheResult && cacheResult.hasTranslation) {
        let lyrics = trackData.rawLyrics;
        if (!lyrics) {
          lyrics = cacheResult.translation.map((line: any) => line.original).join("\n");
          trackData = {
            ...trackData,
            rawLyrics: lyrics,
            source: trackData.source || "Manual",
            lines: splitLyricsIntoLines(trackData.trackId, lyrics),
            processingStatus: { ...trackData.processingStatus, stage1_completed: true }
          };
        }

        const mergedLines = trackData.lines.map((line, idx) => {
          const matched = findMatchedTranslation(line.original, idx, cacheResult.translation);
          return {
            ...line,
            translation: matched ? matched.translation : (line.translation || ""),
            language: matched ? matched.language : (line.language || "en")
          };
        });

        const provider = typeof trackData.source === 'string' ? trackData.source : 'unknown';
        const authors = trackData.authors ? trackData.authors.split(',').map((a: string) => a.trim()) : null;

        trackData = {
          ...trackData,
          lines: mergedLines,
          sourceLanguage: detectDominantLanguage(mergedLines) || trackData.sourceLanguage || "English",
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          processingStatus: { ...trackData.processingStatus, stage2_completed: true },
          preparedLyricsInput: prepareLyricsInput(
            trackData.title,
            [trackData.artist],
            lyrics,
            targetLanguage,
            { provider, url: trackData.lyricSource || null, authors }
          )
        };

        setCurrentTrack(trackData);
        saveTrackData(trackData.trackId, trackData);
        callbacks.loadCommunityTracks();
      }

      if (cacheResult && cacheResult.hasLecture && cacheResult.lectureBlocks) {
        let meaning = trackData.meaning || "";
        let meanings = trackData.meanings || { en: "", es: "", ru: "", pl: "" };
        const extractedMeaning = extractTrackMeaning(cacheResult.lectureBlocks);
        if (extractedMeaning) {
          meaning = extractedMeaning;
          const langCode = getLanguageCode(targetLanguage);
          meanings = {
            ...trackData.meanings,
            en: langCode === 'en' ? extractedMeaning : (trackData.meanings?.en || ""),
            es: langCode === 'es' ? extractedMeaning : (trackData.meanings?.es || ""),
            ru: langCode === 'ru' ? extractedMeaning : (trackData.meanings?.ru || ""),
            pl: langCode === 'pl' ? extractedMeaning : (trackData.meanings?.pl || "")
          };
        }

        // Extract all phrases from lectureBlocks and map to lines
        const extractedPhrases: any[] = [];
        if (Array.isArray(cacheResult.lectureBlocks)) {
          for (const block of cacheResult.lectureBlocks) {
            if (block && Array.isArray(block.phrases)) {
              for (const p of block.phrases) {
                extractedPhrases.push(p);
              }
            }
          }
        }

        const updatedLines = trackData.lines.map((line, index) => {
          const linePhrases = extractedPhrases
            .filter((p: any) => {
              if (p.lineKey && line.lineKey) {
                return p.lineKey === line.lineKey;
              }
              if (Array.isArray(p.lineKeys) && line.lineKey) {
                return p.lineKeys.includes(line.lineKey);
              }
              const lid = line.lineId || generateLineId(line.original);
              if (p.lineId && lid) {
                return p.lineId === lid;
              }
              if (Array.isArray(p.lineIds) && lid) {
                return p.lineIds.includes(lid);
              }
              if (typeof p.lineIndex === 'number') {
                return p.lineIndex === index;
              }
              const phraseText = p.text || p.phrase || "";
              if (phraseText) {
                const normPhrase = phraseText.trim().toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '');
                const normLine = line.original.trim().toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, '');
                return normLine.includes(normPhrase);
              }
              return false;
            })
            .map((p: any) => ({
              id: p.id || `${trackData.trackId}:p:${(p.text || p.phrase || "").replace(/\s+/g, '_')}`,
              text: p.text || p.phrase || "",
              translation: p.translation || "",
              explanation: p.explanation || "",
              language: p.language || p.targetLanguage || getLanguageCode(targetLanguage),
              lemmas: p.lemmas || [],
              type: 'phrase' as const
            }));

          return {
            ...line,
            phrases: linePhrases
          };
        });

        trackData = {
          ...trackData,
          meaning,
          meanings,
          lines: updatedLines,
          lectureBlocks: cacheResult.lectureBlocks,
          processingStatus: { ...trackData.processingStatus, stage3_completed: true }
        };
        setCurrentTrack(trackData);
        saveTrackData(trackData.trackId, trackData);
      }

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

      const isTranslationOutdated = !trackData.translationPromptVersion || trackData.translationPromptVersion < TRANSLATION_PROMPT_VERSION;
      const needsTranslation = force || !trackData.processingStatus.stage2_completed || isTranslationOutdated || !trackData.lines.some(l => l.translation);

      if (needsTranslation) {
        setLoadingStep("translating");
        trackData = await trackSessionFacade.analyzeSongMeaningAndTranslations(trackData, targetLanguage);
        setCurrentTrack(trackData);
        callbacks.loadCommunityTracks();
      }

      if (force || !trackData.lectureBlocks || trackData.lectureBlocks.length === 0) {
        setLoadingStep("lecture");
        try {
          const blocks = await aiClient.fetchStructuredLecture(
            trackData.preparedLyricsInput || trackData.rawLyrics,
            force
          );
          
          let meaning = trackData.meaning || "";
          let meanings = trackData.meanings || { en: "", es: "", ru: "", pl: "" };
          const extractedMeaning = extractTrackMeaning(blocks);
          if (extractedMeaning) {
            meaning = extractedMeaning;
            const langCode = getLanguageCode(targetLanguage);
            meanings = {
              ...trackData.meanings,
              en: langCode === 'en' ? extractedMeaning : (trackData.meanings?.en || ""),
              es: langCode === 'es' ? extractedMeaning : (trackData.meanings?.es || ""),
              ru: langCode === 'ru' ? extractedMeaning : (trackData.meanings?.ru || ""),
              pl: langCode === 'pl' ? extractedMeaning : (trackData.meanings?.pl || "")
            };
          }

          trackData = {
            ...trackData,
            meaning,
            meanings,
            lectureBlocks: blocks
          };
          setCurrentTrack(trackData);
          saveTrackData(trackData.trackId, trackData);
        } catch (e) {
          console.error("Failed to generate lecture blocks:", e);
        }
      }

      const skipStage3 = !force && cacheResult && cacheResult.hasLecture;
      if (!skipStage3) {
        setLoadingStep("analyzing");
        await runStage3(trackData, targetLanguage, force);
      }
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

    const resetTrack: TrackLyricsData = {
      ...currentTrack,
      meaning: undefined,
      lectureBlocks: undefined,
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

  const handleManualLyricsSearch = useCallback(async (customArtist?: string, customTitle?: string) => {
    if (!currentTrack) return;
    setIsSearchingOptions(true);
    setLyricOptions([]);
    try {
      const artist = customArtist !== undefined ? customArtist : currentTrack.artist;
      const title = customTitle !== undefined ? customTitle : currentTrack.title;
      const results = await searchLyricsOptions(artist, title);
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

        const updatedTrack: TrackLyricsData = {
          ...currentTrack,
          rawLyrics: lyricsData.lyrics,
          source: (lyricsData.source as any) || "Manual",
          sourceLanguage: currentTrack.sourceLanguage || "English",
          meaning: "",
          meanings: { en: "", es: "", ru: "", pl: "" },
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
        aiClient.saveTrackToSharedCache(updatedTrack).catch(e => console.error("Firestore cache upload failed:", e));
        setIsResourcesOpen(false);

        // Automatically trigger translation/lecture generation for the newly selected lyrics
        handleGenerateAnalysis(targetLanguage, callbacks, false, updatedTrack);
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
  }, [currentTrack, handleGenerateAnalysis]);

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

      // Call CantoLex Targeted Analysis API
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

  const handleSourceLanguageOverride = useCallback(async (newLang: string) => {
    if (!currentTrack) return;
    const oldLangName = currentTrack.sourceLanguage || "English";
    
    const updatedTrack = cascadeTrackLanguageUpdate(currentTrack, oldLangName, newLang);

    setCurrentTrack(updatedTrack);
    saveTrackData(currentTrack.trackId, updatedTrack);

    await updateTrackCardsLanguage(currentTrack.trackId, oldLangName, newLang);
    await libraryRepository.updateTrackInLibrary(currentTrack.trackId, updatedTrack);
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
    handleAnalyzeStarredLines,
    handleSourceLanguageOverride
  };
}
