import { AiPort, ANALYSIS_PROMPT_VERSION, TRANSLATION_PROMPT_VERSION } from "./ports/aiPort";
import { TrackCacheRepositoryPort } from "./ports/trackCacheRepositoryPort";
import { RecentHistoryRepositoryPort } from "./ports/recentHistoryRepositoryPort";
import { DailyTrackerRepositoryPort } from "./ports/dailyTrackerRepositoryPort";
import { LyricsProviderPort } from "./ports/lyricsProviderPort";
import { MusicMetadataPort } from "./ports/musicMetadataPort";
import { TrackLyricsData, Track } from "../services/musicService";

export class TrackSessionFacade {
  constructor(
    private aiClient: AiPort,
    private trackCacheRepository: TrackCacheRepositoryPort,
    private recentHistoryRepository: RecentHistoryRepositoryPort,
    private dailyTrackerRepository: DailyTrackerRepositoryPort,
    private lyricsProvider: LyricsProviderPort,
    private musicMetadataProvider: MusicMetadataPort
  ) {}

  /**
   * Orchestrates track selection.
   * - Records track exploration in user data.
   * - Retrieves or constructs the initial TrackLyricsData.
   * - Saves recent track information to repository.
   * - Triggers background callbacks for metadata lookup or firestore cache lookup.
   */
  async selectTrack(
    track: any,
    targetLanguage: string,
    callbacks: {
      onMetadataUpdate?: (updated: TrackLyricsData) => void;
      onCacheUpdate?: (updated: TrackLyricsData) => void;
    } = {}
  ): Promise<TrackLyricsData> {
    // 1. Record track exploration to daily goals
    this.dailyTrackerRepository.recordTrackExplored();

    const trackId = track.id || track.trackId;
    const trackTitle = track.title || "";
    const artist = track.artist || "";
    const artistId = track.artistId || "";
    const album = track.album || "";
    const albumId = track.albumId || "";
    const coverUrl = track.coverUrl || "";
    const audioUrl = track.audioUrl || "";
    const appleMusicUrl = track.appleMusicUrl || "";

    // 2. Check local database/cache
    const cached = this.trackCacheRepository.getCachedTrack(trackId);
    if (cached) {
      const updatedCached = {
        ...cached,
        coverUrl: cached.coverUrl || coverUrl,
        album: cached.album || album,
        albumId: cached.albumId || albumId,
        artist: cached.artist || artist,
        artistId: cached.artistId || artistId,
        title: cached.title || trackTitle,
        audioUrl: cached.audioUrl || audioUrl,
        appleMusicUrl: cached.appleMusicUrl || appleMusicUrl,
      };

      if ((!cached.coverUrl && coverUrl) || (!cached.title && trackTitle) || (!cached.audioUrl && audioUrl)) {
        this.trackCacheRepository.saveTrackData(trackId, updatedCached);
      }

      this.recentHistoryRepository.addRecentTrack({
        ...track,
        difficulty: updatedCached.difficulty || track.difficulty
      });

      return updatedCached;
    }

    // 3. Create initial empty lyric structure
    const initialTrack: TrackLyricsData = {
      trackId: trackId,
      artist: artist,
      artistId: artistId,
      title: trackTitle,
      album: album,
      albumId: albumId,
      coverUrl: coverUrl,
      audioUrl: audioUrl,
      appleMusicUrl: appleMusicUrl,
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

    this.trackCacheRepository.saveTrackData(trackId, initialTrack);
    this.recentHistoryRepository.addRecentTrack({
      ...track,
      difficulty: track.difficulty
    });

    // 4. Background iTunes Lookup
    if (!initialTrack.audioUrl || !initialTrack.artistId || !initialTrack.albumId) {
      this.musicMetadataProvider.searchITunes(`${artist} ${trackTitle}`, "musicTrack")
        .then(results => {
          const match = results.find(r => 
            this.aiClient.normalizeString(r.title) === this.aiClient.normalizeString(trackTitle) && 
            this.aiClient.normalizeString(r.artist) === this.aiClient.normalizeString(artist)
          ) || results[0];

          if (match) {
            const currentCached = this.trackCacheRepository.getCachedTrack(trackId) || initialTrack;
            const updated = {
              ...currentCached,
              artistId: currentCached.artistId || match.artistId,
              albumId: currentCached.albumId || match.albumId,
              album: currentCached.album || match.album,
              audioUrl: currentCached.audioUrl || match.audioUrl,
              appleMusicUrl: currentCached.appleMusicUrl || match.appleMusicUrl,
              coverUrl: currentCached.coverUrl || match.coverUrl
            };
            this.trackCacheRepository.saveTrackData(trackId, updated);
            if (callbacks.onMetadataUpdate) {
              callbacks.onMetadataUpdate(updated);
            }
          }
        })
         .catch(err => console.error("[trackSessionFacade] Metadata lookup failed:", err));
    }

    // 5. Background Firestore Cache Check
    this.aiClient.getTrackMeaningFromCache(trackTitle, [artist], targetLanguage)
      .then(cacheResult => {
        if (cacheResult) {
          const langKey = targetLanguage.toLowerCase().trim();
          let meaning = cacheResult.meanings.en;
          if (langKey === 'spanish') meaning = cacheResult.meanings.es;
          if (langKey === 'russian') meaning = cacheResult.meanings.ru;
          if (langKey === 'polish') meaning = cacheResult.meanings.pl;

          const currentCached = this.trackCacheRepository.getCachedTrack(trackId) || initialTrack;
          const hasLyricsAndLinesCache = !!(cacheResult.rawLyrics && cacheResult.lines && cacheResult.lines.length > 0);
          
          const updated = {
            ...currentCached,
            rawLyrics: hasLyricsAndLinesCache ? cacheResult.rawLyrics : currentCached.rawLyrics,
            meaning,
            meanings: cacheResult.meanings,
            difficulty: cacheResult.difficulty,
            promptVersion: cacheResult.promptVersion || currentCached.promptVersion,
            sourceLanguage: cacheResult.originalLanguage || currentCached.sourceLanguage,
            lines: hasLyricsAndLyricsLinesCheck(cacheResult.lines) ? cacheResult.lines : currentCached.lines,
            processingStatus: {
              ...currentCached.processingStatus,
              stage1_completed: hasLyricsAndLinesCache ? true : currentCached.processingStatus.stage1_completed,
              stage2_completed: true,
              stage3_completed: hasLyricsAndLinesCache ? cacheResult.lines.some((l: any) => l.phrases && l.phrases.length > 0) : currentCached.processingStatus.stage3_completed
            }
          };

          this.trackCacheRepository.saveTrackData(trackId, updated);
          if (callbacks.onCacheUpdate) {
            callbacks.onCacheUpdate(updated);
          }
        }
      })
      .catch(err => console.error("[trackSessionFacade] Firestore cache check failed:", err));

    return initialTrack;
  }

  /**
   * Fetches lyrics (if missing) and runs Stage 2 AI analysis (track meaning and line translations).
   */
  async analyzeSongMeaningAndTranslations(
    track: TrackLyricsData,
    targetLanguage: string,
    onStepChange?: (step: "searching" | "meaning" | "idle") => void
  ): Promise<TrackLyricsData> {
    let trackData = { ...track };
    let lyrics = trackData.rawLyrics;

    // 1. Fetch lyrics if missing
    if (!lyrics) {
      if (onStepChange) onStepChange("searching");
      const lyricsResponse = await this.lyricsProvider.fetchLyrics(trackData.artist, trackData.title);
      if (!lyricsResponse.lyrics) {
        throw new Error("Lyrics not found. Please try manual input.");
      }
      
      lyrics = lyricsResponse.lyrics;
      trackData = {
        ...trackData,
        rawLyrics: lyrics,
        source: (lyricsResponse.source as any) || "Unknown",
        lines: this.lyricsProvider.splitLyricsIntoLines(trackData.trackId, lyrics),
        processingStatus: { ...trackData.processingStatus, stage1_completed: true }
      };
    }

    if (onStepChange) onStepChange("meaning");

    const trackKey = await this.aiClient.computeTrackKey(trackData.title, [trackData.artist]);

    const isOutdated = !trackData.promptVersion || trackData.promptVersion < ANALYSIS_PROMPT_VERSION;

    if (!trackData.meaning || !trackData.processingStatus.stage2_completed || isOutdated) {
      const metadata = {
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
        this.aiClient.fetchTrackMeaning(lyrics || "", metadata),
        this.aiClient.getLineTranslations(lyrics || "", trackKey, targetLanguage)
      ]);
      
      const langKey = targetLanguage.toLowerCase().trim();
      let meaning = result.meanings.en;
      if (langKey === 'spanish') meaning = result.meanings.es;
      if (langKey === 'russian') meaning = result.meanings.ru;
      if (langKey === 'polish') meaning = result.meanings.pl;

      const updatedLines = trackData.lines.map((line, idx) => {
        const matched = translationsResult[idx] || translationsResult.find((t: any) => t.originalText === line.original);
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
      // Meaning cached, but reload translations to confirm accuracy or ensure they're loaded
      const translationsResult = await this.aiClient.getLineTranslations(lyrics || "", trackKey, targetLanguage);
      const updatedLines = trackData.lines.map((line, idx) => {
        const matched = translationsResult[idx] || translationsResult.find((t: any) => t.originalText === line.original);
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

    this.trackCacheRepository.saveTrackData(trackData.trackId, trackData);
    await this.aiClient.saveTrackToSharedCache(trackData).catch(e => console.error("Firestore cache upload failed:", e));

    this.recentHistoryRepository.addRecentTrack({
      id: trackData.trackId,
      title: trackData.title,
      artist: trackData.artist,
      coverUrl: trackData.coverUrl || "",
      album: trackData.album || "",
      difficulty: trackData.difficulty
    } as Track);

    if (onStepChange) onStepChange("idle");
    return trackData;
  }

  /**
   * Generates phrase/deep study analysis (Stage 3).
   */
  async runDeepPhraseAnalysis(
    track: TrackLyricsData,
    targetLanguage: string,
    force: boolean = false
  ): Promise<TrackLyricsData> {
    const hasPhrases = track.lines.some(l => l.phrases && l.phrases.length > 0);
    if (!force && track.processingStatus.stage3_completed && hasPhrases) {
      return track;
    }

    const trackKey = await this.aiClient.computeTrackKey(track.title, [track.artist]);

    const phraseAnalysisResult = await this.aiClient.getPhraseAnalysis(
      track.rawLyrics,
      trackKey,
      targetLanguage
    );

    const updatedLines = track.lines.map(line => {
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
      ...track,
      lines: updatedLines,
      processingStatus: { ...track.processingStatus, stage3_completed: true }
    };

    this.trackCacheRepository.saveTrackData(track.trackId, updated);
    await this.aiClient.saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));
    return updated;
  }

  /**
   * Process manual lyrics submission and launches background info & meaning fetching.
   */
  async submitManualLyrics(
    track: TrackLyricsData,
    manualLyrics: string,
    targetLanguage: string,
    callbacks: {
      onBackgroundComplete?: (completedTrack: TrackLyricsData) => void;
    } = {}
  ): Promise<TrackLyricsData> {
    const metadataResult = await this.aiClient.extractLyricsMetadata(
      manualLyrics,
      track.artist,
      track.title
    );

    // Initial draft with lines split from manual text
    const initialTrack: TrackLyricsData = {
      ...track,
      rawLyrics: manualLyrics,
      source: "Manual",
      sourceLanguage: track.sourceLanguage, // Background will fetch original
      authors: metadataResult?.authors,
      lyricSource: "Manual Entry",
      lines: this.lyricsProvider.splitLyricsIntoLines(track.trackId, manualLyrics),
      processingStatus: {
        stage1_completed: true,
        stage2_completed: false, // Updated by background
        stage3_completed: false,
      },
      lastUpdated: Date.now(),
    };

    this.trackCacheRepository.saveTrackData(track.trackId, initialTrack);

    // Background enrichment
    this.aiClient.fetchTrackMeaning(manualLyrics, {
      title: track.title,
      artists: [track.artist],
      albumName: track.album,
      coverUrl: track.coverUrl
    })
      .then(result => {
        const cached = this.trackCacheRepository.getCachedTrack(track.trackId) || initialTrack;
        const langKey = targetLanguage.toLowerCase().trim();
        let meaning = result.meanings.en;
        if (langKey === 'spanish') meaning = result.meanings.es;
        if (langKey === 'russian') meaning = result.meanings.ru;
        if (langKey === 'polish') meaning = result.meanings.pl;

        const updated = {
          ...cached,
          sourceLanguage: result.originalLanguage || cached.sourceLanguage,
          meaning,
          meanings: result.meanings,
          difficulty: result.difficulty,
          processingStatus: { ...cached.processingStatus, stage2_completed: true }
        };

        this.trackCacheRepository.saveTrackData(track.trackId, updated);
        this.aiClient.saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));

        this.recentHistoryRepository.addRecentTrack({
          id: track.trackId,
          title: track.title,
          artist: track.artist,
          coverUrl: track.coverUrl || "",
          album: track.album || "",
          difficulty: result.difficulty
        } as Track);

        if (callbacks.onBackgroundComplete) {
          callbacks.onBackgroundComplete(updated);
        }
      })
      .catch(e => console.error("[trackSessionFacade] Manual submit background fetch failed:", e));

    return initialTrack;
  }

  /**
   * Explicitly rebuilds translations for the track lines (regenerate).
   */
  async regenerateTranslations(
    track: TrackLyricsData,
    targetLanguage: string
  ): Promise<TrackLyricsData> {
    const trackKey = await this.aiClient.computeTrackKey(track.title, [track.artist]);
    const translationsResult = await this.aiClient.getLineTranslations(
      track.rawLyrics,
      trackKey,
      targetLanguage
    );

    const updatedLines = track.lines.map((line, idx) => {
      const matched = translationsResult[idx] || translationsResult.find((t: any) => t.originalText === line.original);
      return {
        ...line,
        translation: matched ? matched.translation : (line.translation || ""),
        language: matched ? matched.language : (line.language || "en")
      };
    });

    const updatedTrack: TrackLyricsData = {
      ...track,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      lines: updatedLines
    };

    this.trackCacheRepository.saveTrackData(updatedTrack.trackId, updatedTrack);
    await this.aiClient.saveTrackToSharedCache(updatedTrack).catch(e => console.error("Firestore cache upload failed:", e));
    return updatedTrack;
  }
}

function hasLyricsAndLyricsLinesCheck(lines: any[] | undefined): boolean {
  return !!(lines && lines.length > 0);
}
