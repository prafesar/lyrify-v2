import { AiPort, ANALYSIS_PROMPT_VERSION, TRANSLATION_PROMPT_VERSION } from "./ports/aiPort";
import { TrackCacheRepositoryPort } from "./ports/trackCacheRepositoryPort";
import { RecentHistoryRepositoryPort } from "./ports/recentHistoryRepositoryPort";
import { DailyTrackerRepositoryPort } from "./ports/dailyTrackerRepositoryPort";
import { LyricsProviderPort } from "./ports/lyricsProviderPort";
import { MusicMetadataPort } from "./ports/musicMetadataPort";
import { TrackLyricsData, Track, extractTrackMeaning } from "../services/musicService";
import { prepareLyricsInput } from "../services/lyricsPreprocessor";
import { getLanguageCode } from "../lib/languages";

export class TrackSessionFacade {
  constructor(
    private aiClient: AiPort,
    public trackCacheRepository: TrackCacheRepositoryPort,
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
        itunesTrackId: cached.itunesTrackId || track.itunesTrackId || trackId,
        coverUrl: cached.coverUrl || coverUrl,
        album: cached.album || album,
        albumId: cached.albumId || albumId,
        artist: cached.artist || artist,
        artistId: cached.artistId || artistId,
        title: cached.title || trackTitle,
        audioUrl: cached.audioUrl || audioUrl,
        appleMusicUrl: cached.appleMusicUrl || appleMusicUrl,
      };

      let enrichedCached = this.enrichWithPreparedLyricsInput(updatedCached, targetLanguage);

      if ((!cached.coverUrl && coverUrl) || (!cached.title && trackTitle) || (!cached.audioUrl && audioUrl) || !cached.itunesTrackId || enrichedCached.preparedLyricsInput !== cached.preparedLyricsInput) {
        this.trackCacheRepository.saveTrackData(trackId, enrichedCached);
      }

      this.recentHistoryRepository.addRecentTrack({
        ...track,
        difficulty: enrichedCached.difficulty || track.difficulty
      });

      // Background check if no lecture blocks exist but lyrics do
      if ((!enrichedCached.lectureBlocks || enrichedCached.lectureBlocks.length === 0) && enrichedCached.rawLyrics) {
        this.checkAndLoadCachedLecture(trackId, enrichedCached.rawLyrics, enrichedCached.title, enrichedCached.artist, targetLanguage, callbacks.onCacheUpdate);
      }

      return enrichedCached;
    }

    // 3. Create initial empty lyric structure
    const initialTrack: TrackLyricsData = {
      trackId: trackId,
      itunesTrackId: track.itunesTrackId || trackId,
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
      sourceLanguage: getLanguageCode(track.sourceLanguage),
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
              itunesTrackId: currentCached.itunesTrackId || String(match.id || match.trackId || trackId),
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

    return initialTrack;
  }

  /**
   * Fetches lyrics (if missing) and runs Stage 2 AI analysis (line-by-line translations).
   * Note: The primary overall track meaning is subsequently derived from structured lectures.
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

      // intermediate save of fetched raw lyrics
      this.trackCacheRepository.saveTrackData(trackData.trackId, trackData);
    }

    // Pre-enrich with PreparedLyricsInput for the translation flow
    trackData = this.enrichWithPreparedLyricsInput(trackData, targetLanguage);

    if (onStepChange) onStepChange("meaning");

    const trackKey = await this.aiClient.computeTrackKey(trackData.title, [trackData.artist]);

    const isTranslationOutdated = !trackData.translationPromptVersion || trackData.translationPromptVersion < TRANSLATION_PROMPT_VERSION;

    if (!trackData.processingStatus.stage2_completed || isTranslationOutdated) {
      try {
        const preparedTrack = await this.aiClient.getPreparedTrack(
          trackData.preparedLyricsInput || lyrics || "",
          targetLanguage
        );
        const translationsResult = await this.aiClient.getLineTranslations(
          trackData.preparedLyricsInput || lyrics || "",
          trackKey,
          targetLanguage
        );
        
        const updatedLines = translationsResult.map((t: any) => ({
          id: `${trackData.trackId}:line:${t.lineIndex}`,
          lineId: t.lineKey || `line_${t.lineIndex}`,
          lineTextHash: t.lineKey || `line_${t.lineIndex}`,
          lineKey: t.lineKey,
          index: t.lineIndex,
          original: t.original || t.text || "",
          translation: t.translation || "",
          language: t.language || preparedTrack.sourceLanguage || "en",
          phrases: []
        }));

        // Meaning is canonicalized from structured lecture blocks
        const extractedMeaning = extractTrackMeaning(trackData.lectureBlocks);
        const meaning = trackData.meaning || extractedMeaning || "";

        trackData = {
          ...trackData,
          meaning,
          meanings: trackData.meanings || {
            en: meaning,
            es: meaning,
            ru: meaning,
            pl: meaning
          },
          difficulty: trackData.difficulty || "intermediate",
          promptVersion: ANALYSIS_PROMPT_VERSION,
          translationPromptVersion: TRANSLATION_PROMPT_VERSION,
          sourceLanguage: getLanguageCode(preparedTrack.sourceLanguage || trackData.sourceLanguage || "en"),
          lines: updatedLines,
          translationLexicalItems: (translationsResult as any).lexicalItems || trackData.translationLexicalItems,
          processingStatus: { ...trackData.processingStatus, stage2_completed: true }
        };
      } catch (llmError) {
        console.error("LLM translation failed, but raw lyrics are successfully saved:", llmError);
        // Ensure raw lyrics are persistently saved
        this.trackCacheRepository.saveTrackData(trackData.trackId, trackData);
        throw llmError;
      }
    } else {
      // Translation flow cached, but reload translations to confirm accuracy or ensure they're loaded
      const preparedTrack = await this.aiClient.getPreparedTrack(
        trackData.preparedLyricsInput || lyrics || "",
        targetLanguage
      );
      const translationsResult = await this.aiClient.getLineTranslations(trackData.preparedLyricsInput || lyrics || "", trackKey, targetLanguage);
      const updatedLines = translationsResult.map((t: any) => ({
        id: `${trackData.trackId}:line:${t.lineIndex}`,
        lineId: t.lineKey || `line_${t.lineIndex}`,
        lineTextHash: t.lineKey || `line_${t.lineIndex}`,
        lineKey: t.lineKey,
        index: t.lineIndex,
        original: t.original || t.text || "",
        translation: t.translation || "",
        language: t.language || preparedTrack.sourceLanguage || "en",
        phrases: []
      }));
      trackData = {
        ...trackData,
        translationPromptVersion: TRANSLATION_PROMPT_VERSION,
        lines: updatedLines,
        translationLexicalItems: (translationsResult as any).lexicalItems || trackData.translationLexicalItems,
        sourceLanguage: getLanguageCode(preparedTrack.sourceLanguage || trackData.sourceLanguage || "en")
      };
    }

    trackData = this.enrichWithPreparedLyricsInput(trackData, targetLanguage);
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

    const enrichedTrack = this.enrichWithPreparedLyricsInput(track, targetLanguage);
    const trackKey = await this.aiClient.computeTrackKey(enrichedTrack.title, [enrichedTrack.artist]);

    const phraseAnalysisResult = await this.aiClient.getPhraseAnalysis(
      enrichedTrack.preparedLyricsInput || enrichedTrack.rawLyrics,
      trackKey,
      targetLanguage
    );

    const updatedLines = enrichedTrack.lines.map(line => {
      const linePhrases = phraseAnalysisResult
        .filter((p: any) => {
          if (p.lineKey && line.lineKey) {
            return p.lineKey === line.lineKey;
          }
          if (Array.isArray(p.lineKeys) && line.lineKey) {
            return p.lineKeys.includes(line.lineKey);
          }
          return p.lineIndex === line.index;
        })
        .map((p: any) => ({
          id: `${enrichedTrack.trackId}:p:${p.text.replace(/\s+/g, '_')}`,
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

    const updated = this.enrichWithPreparedLyricsInput({
      ...enrichedTrack,
      lines: updatedLines,
      processingStatus: { ...enrichedTrack.processingStatus, stage3_completed: true }
    }, targetLanguage);

    this.trackCacheRepository.saveTrackData(enrichedTrack.trackId, updated);
    await this.aiClient.saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));
    return updated;
  }

  /**
   * Process manual lyrics submission and extracts metadata for translation/lecture generation.
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
    const initialTrack = this.enrichWithPreparedLyricsInput({
      ...track,
      rawLyrics: manualLyrics,
      source: "Manual",
      sourceLanguage: getLanguageCode(track.sourceLanguage),
      meaning: "",
      meanings: { en: "", es: "", ru: "", pl: "" },
      difficulty: "intermediate",
      authors: metadataResult?.authors,
      lyricSource: "Manual Entry",
      lines: this.lyricsProvider.splitLyricsIntoLines(track.trackId, manualLyrics),
      processingStatus: {
        stage1_completed: true,
        stage2_completed: false,
        stage3_completed: false,
      },
      lastUpdated: Date.now(),
    }, targetLanguage);

    this.trackCacheRepository.saveTrackData(track.trackId, initialTrack);

    // Background upload / history update without separate meaning request
    const updated = initialTrack;
    this.aiClient.saveTrackToSharedCache(updated).catch(e => console.error("Firestore cache upload failed:", e));

    this.recentHistoryRepository.addRecentTrack({
      id: track.trackId,
      title: track.title,
      artist: track.artist,
      coverUrl: track.coverUrl || "",
      album: track.album || "",
      difficulty: "intermediate"
    } as Track);

    if (callbacks.onBackgroundComplete) {
      setTimeout(() => {
        callbacks.onBackgroundComplete!(updated);
      }, 50);
    }

    return initialTrack;
  }

  /**
   * Explicitly rebuilds translations for the track lines (regenerate).
   */
  async regenerateTranslations(
    track: TrackLyricsData,
    targetLanguage: string
  ): Promise<TrackLyricsData> {
    const updatedTrackPre = this.enrichWithPreparedLyricsInput(track, targetLanguage);
    const trackKey = await this.aiClient.computeTrackKey(updatedTrackPre.title, [updatedTrackPre.artist]);
    const preparedTrack = await this.aiClient.getPreparedTrack(
      updatedTrackPre.preparedLyricsInput || updatedTrackPre.rawLyrics,
      targetLanguage
    );
    const translationsResult = await this.aiClient.getLineTranslations(
      updatedTrackPre.preparedLyricsInput || updatedTrackPre.rawLyrics,
      trackKey,
      targetLanguage
    );

    const updatedLines = translationsResult.map((t: any) => ({
      id: `${track.trackId}:line:${t.lineIndex}`,
      lineId: t.lineKey || `line_${t.lineIndex}`,
      lineTextHash: t.lineKey || `line_${t.lineIndex}`,
      lineKey: t.lineKey,
      index: t.lineIndex,
      original: t.original || t.text || "",
      translation: t.translation || "",
      language: t.language || preparedTrack.sourceLanguage || "en",
      phrases: [],
    }));

    const updatedTrack = this.enrichWithPreparedLyricsInput({
      ...updatedTrackPre,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      lines: updatedLines,
      sourceLanguage: getLanguageCode(preparedTrack.sourceLanguage || updatedTrackPre.sourceLanguage || "en"),
      processingStatus: { ...updatedTrackPre.processingStatus, stage2_completed: true }
    }, targetLanguage);

    this.trackCacheRepository.saveTrackData(updatedTrack.trackId, updatedTrack);
    await this.aiClient.saveTrackToSharedCache(updatedTrack).catch(e => console.error("Firestore cache upload failed:", e));
    return updatedTrack;
  }

  private enrichWithPreparedLyricsInput(trackData: TrackLyricsData, targetLanguage: string): TrackLyricsData {
    if (!trackData.rawLyrics) return trackData;
    try {
      const provider = typeof trackData.source === 'string' ? trackData.source : 'unknown';
      const authors = trackData.authors ? trackData.authors.split(',').map((a: string) => a.trim()) : null;
      return {
        ...trackData,
        preparedLyricsInput: prepareLyricsInput(
          trackData.title,
          [trackData.artist],
          trackData.rawLyrics,
          targetLanguage,
          { provider, url: trackData.lyricSource || null, authors }
        )
      };
    } catch (e) {
      console.error("Failed to enrich track with prepared lyrics input:", e);
      return trackData;
    }
  }

  /**
   * Helper to fetch for cached lecture blocks on Firestore and load them if present.
   */
  private checkAndLoadCachedLecture(
    trackId: string,
    rawLyrics: string,
    title: string,
    artist: string,
    targetLanguage: string,
    onUpdate?: (updated: TrackLyricsData) => void
  ) {
    if (!rawLyrics) return;
    const currentCached = this.trackCacheRepository.getCachedTrack(trackId);
    const lyricsInput = currentCached?.preparedLyricsInput || rawLyrics;
    this.aiClient.getCachedStructuredLecture(lyricsInput)
      .then(blocks => {
        if (blocks && blocks.length > 0) {
          const freshCached = this.trackCacheRepository.getCachedTrack(trackId);
          if (freshCached) {
            const extractedMeaning = extractTrackMeaning(blocks);
            let meaning = freshCached.meaning;
            let meanings = freshCached.meanings;
            if (extractedMeaning) {
              meaning = extractedMeaning;
              const langCode = getLanguageCode(targetLanguage);
              meanings = {
                ...freshCached.meanings,
                en: langCode === 'en' ? extractedMeaning : (freshCached.meanings?.en || ""),
                es: langCode === 'es' ? extractedMeaning : (freshCached.meanings?.es || ""),
                ru: langCode === 'ru' ? extractedMeaning : (freshCached.meanings?.ru || ""),
                pl: langCode === 'pl' ? extractedMeaning : (freshCached.meanings?.pl || "")
              };
            }
            const updated = {
              ...freshCached,
              meaning,
              meanings,
              lectureBlocks: blocks
            };
            this.trackCacheRepository.saveTrackData(trackId, updated);
            if (onUpdate) {
              onUpdate(updated);
            }
          }
        }
      })
      .catch(err => console.error("[TrackSessionFacade] checkAndLoadCachedLecture failed:", err));
  }
}

function hasLyricsAndLyricsLinesCheck(lines: any[] | undefined): boolean {
  return !!(lines && lines.length > 0);
}
