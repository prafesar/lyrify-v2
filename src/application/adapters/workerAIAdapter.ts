import { AiPort, TrackMetadata, TrackMeaningResult, TrackMeaningEntry, PreparedTrackPayload, TranslationFetchRequest, LectureFetchRequest } from "../ports/aiPort";
import { TrackLyricsData, StructuredLectureBlock, extractTrackMeaning } from "../../services/musicService";
import { PreparedLyricsInput, prepareLyricsInput, normalizeTrackTitle, normalizeArtists, computeStableHash } from "../../services/lyricsPreprocessor";
import { userPreferencesRepository } from "./browserUserDataRepository";
import { AnalysisMode } from "../../constants";
import { mapLegacyToCanonicalMode, mapCanonicalToLegacyRequest } from "../../services/analysisMode";
import { computeLyricsKey } from "../../services/serverCacheLookupService";

function isPreparedInput(input: any): input is PreparedLyricsInput {
  return input && typeof input === 'object' && 'lines' in input && Array.isArray(input.lines);
}

/**
 * WorkerAIAdapter
 * 
 * Production-ready REST fetch adapter for lyrify-v2 client API integration.
 * Connects to the primary endpoints under https://api.cantolex.com.
 */
export class WorkerAIAdapter implements AiPort {
  private workerBaseUrl = "https://api.cantolex.com";
  private preparedTrackCache = new Map<string, PreparedTrackPayload>();

  private async getOrPrepareTrack(
    lyricsInput: string | PreparedLyricsInput,
    targetLanguage: string
  ): Promise<PreparedTrackPayload> {
    const lyricsText = isPreparedInput(lyricsInput)
      ? lyricsInput.lines.map((l: any) => l.text).join("\n")
      : lyricsInput;

    const title = isPreparedInput(lyricsInput) ? lyricsInput.track.title : "Unknown Title";
    const artists = isPreparedInput(lyricsInput) ? lyricsInput.track.artists : ["Unknown Artist"];

    const lyricsKey = await computeLyricsKey(title, artists);

    // Check memory cache first
    const cachedMem = this.preparedTrackCache.get(lyricsKey);
    if (cachedMem) {
      return cachedMem;
    }

    // Step 1: POST /api/v1/track-preparation/cached
    try {
      const cachedPayload = await this.postToWorker<PreparedTrackPayload>("/api/v1/track-preparation/cached", {
        lyricsKey
      });
      if (cachedPayload) {
        this.preparedTrackCache.set(lyricsKey, cachedPayload);
        return cachedPayload;
      }
    } catch (e) {
      console.warn(`[WorkerAIAdapter] track-preparation/cached miss or failed for ${title}:`, e);
    }

    // Step 2: POST /api/v1/track-preparation/fetch
    const trackKey = await this.computeTrackKey(title, artists);
    const fetchPayload = await this.postToWorker<PreparedTrackPayload>("/api/v1/track-preparation/fetch", {
      trackKey,
      lyricsKey,
      lyricsText,
      metadata: {
        title,
        artist: artists.join(", "),
        album: isPreparedInput(lyricsInput) ? lyricsInput.track.album : undefined,
        itunesId: isPreparedInput(lyricsInput) ? lyricsInput.track.itunesId : undefined,
        promptVersion: "1.0"
      }
    });

    if (!fetchPayload) {
      throw new Error("Failed to prepare track payload from server.");
    }

    this.preparedTrackCache.set(lyricsKey, fetchPayload);
    return fetchPayload;
  }

  /**
   * Universal HTTP POST helper to delegate AI capability calls to the Cloudflare Worker backend.
   * Handles JSON request payload serialization, response envelope validation, and friendly error parsing.
   */
  private async postToWorker<T>(endpoint: string, body: any, customHeaders?: Record<string, string>): Promise<T> {
    const url = `${this.workerBaseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...customHeaders
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMsg = `Worker HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.status === "error" && errData?.error?.message) {
            errorMsg = errData.error.message;
          }
        } catch {
          // ignore parsing error, proceed to fallback error message
        }
        throw new Error(errorMsg);
      }

      const resJson = await response.json();
      if (resJson?.status === "success") {
        return resJson.data as T;
      }
      
      throw new Error(resJson?.error?.message || "Invalid or empty response format from Worker API");
    } catch (error: any) {
      console.error(`[WorkerAIAdapter] API call to ${endpoint} failed:`, error);
      throw error;
    }
  }

  async fetchStructuredLecture(
    lyrics: string | PreparedLyricsInput,
    forceRegenerate?: boolean,
    existingItems?: any[]
  ): Promise<StructuredLectureBlock[]> {
    const modePref = userPreferencesRepository.getPreference("lyrify_analysis_mode", null);
    const canonicalMode = mapLegacyToCanonicalMode(
      modePref || userPreferencesRepository.getPreference("lyrify_lecture_variant", "compact")
    );
    
    const targetLang = isPreparedInput(lyrics) ? lyrics.targetLanguage : "English";

    // Get prepared track payload
    const preparedTrack = await this.getOrPrepareTrack(lyrics, targetLang);

    const requestBody: LectureFetchRequest = {
      preparedTrack,
      targetLanguage: targetLang,
      analysisMode: canonicalMode,
      existingItems
    };

    return this.postToWorker<StructuredLectureBlock[]>("/api/v1/lecture/fetch", requestBody);
  }

  async getCachedStructuredLecture(
    lyrics: string | PreparedLyricsInput
  ): Promise<StructuredLectureBlock[] | null> {
    // Currently, the production API does not support a separate cached lecture endpoint.
    // Return null to allow safe fallback without failing the application logic.
    return null;
  }

  async getOriginalLanguage(trackKey: string): Promise<string | null> {
    return "en";
  }

  async generateSongMeaning(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<string> {
    try {
      const preparedInput = prepareLyricsInput(
        title,
        [artist],
        lyrics,
        targetLanguage || "English"
      );
      const blocks = await this.fetchStructuredLecture(preparedInput);
      return extractTrackMeaning(blocks) || "Track context & breakdown available in study lecture.";
    } catch (e) {
      return "Analysis available in Study Lecture.";
    }
  }

  async translateLyrics(lyrics: string | PreparedLyricsInput, targetLanguage?: string): Promise<string> {
    const translations = await this.getLineTranslations(lyrics, undefined, targetLanguage);
    return translations.map(t => t.translation || "").join("\n");
  }

  async extractLyricsMetadata(
    lyrics: string,
    artist: string,
    title: string
  ): Promise<{ authors: string | null; source_confirmation: string | null }> {
    return { authors: null, source_confirmation: "Verified from lyrics text" };
  }

  async generateTrackAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string
  ): Promise<any> {
    throw new Error("generateTrackAnalysis is not supported in WorkerAIAdapter. Use Structured Lecture.");
  }

  async detectLanguage(text: string): Promise<string> {
    return "en";
  }

  async explainPhraseStructured(
    phrase: string,
    targetLanguage: string
  ): Promise<{ translation: string; explanation: string }> {
    throw new Error("explainPhraseStructured is not supported in WorkerAIAdapter. Use Structured Lecture.");
  }

  async generatePhraseAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    skipMeaning?: boolean
  ): Promise<any> {
    return this.getPhraseAnalysis(lyrics, undefined, targetLanguage);
  }

  async completeLyricsAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<TrackLyricsData> {
    throw new Error("completeLyricsAnalysis is not supported in WorkerAIAdapter. Use TrackSessionFacade stage-by-stage pipeline.");
  }

  async generateTargetedAnalysis(
    title: string,
    artist: string,
    targetLanguage: string,
    starredLines: any[],
    existingPhrases: any[],
    instruction?: string
  ): Promise<{ phrases: any[] }> {
    throw new Error("generateTargetedAnalysis is not supported in WorkerAIAdapter.");
  }

  async generateLearningAssistantResponse(
    title: string,
    artist: string,
    phraseContext: { text: string; translation?: string; explanation?: string; lineIds?: string[] },
    targetLanguage: string,
    existingPhrases: any[],
    userQuestion?: string,
    selectedPreset?: string
  ): Promise<{
    explanation: string;
    suggestedPhrases: Array<{
      text: string;
      translation: string;
      explanation?: string;
      type?: string;
      lineIds?: string[];
    }>;
  }> {
    throw new Error("generateLearningAssistantResponse is not supported in WorkerAIAdapter.");
  }

  async generateLineExplanation(
    metadata: TrackMetadata,
    currentLine: { lineId?: string; original: string; translation?: string },
    prevLine?: { lineId?: string; original: string; translation?: string },
    nextLine?: { lineId?: string; original: string; translation?: string },
    targetLanguage?: string,
    sourceLanguage?: string,
    onStreamChunk?: (partialSummary: string) => void
  ): Promise<{
    summary: string;
    notes: Array<{
      type: "idiom" | "cultural" | "collocation" | "grammar" | "nuance";
      text: string;
      sourceText?: string;
      translation?: string;
      entryType?: "word" | "expression";
    }>;
  }> {
    throw new Error("generateLineExplanation is not supported in WorkerAIAdapter.");
  }

  async getLatestAnalyzedTracks(maxCount?: number): Promise<TrackMeaningEntry[]> {
    return [];
  }

  async getLineTranslations(
    lyrics: string | PreparedLyricsInput,
    trackKey?: string,
    targetLanguage?: string,
    trackId?: string
  ): Promise<any[]> {
    const targetLang = targetLanguage || "English";
    
    // Get prepared track payload
    const preparedTrack = await this.getOrPrepareTrack(lyrics, targetLang);

    let rawLines: any[] = [];
    let lexicalItems: any[] | undefined;

    // Step 1: translation/cached
    try {
      const cachedResponse = await this.postToWorker<TranslationPayload>("/api/v1/translation/cached", {
        preparedTrack,
        targetLanguage: targetLang
      });
      if (cachedResponse) {
        if (Array.isArray(cachedResponse.lines)) {
          rawLines = cachedResponse.lines;
          lexicalItems = cachedResponse.lexicalItems;
        } else if (Array.isArray(cachedResponse)) {
          rawLines = cachedResponse;
        }
      }
    } catch (e) {
      console.warn(`[WorkerAIAdapter] translation/cached miss or failed:`, e);
    }

    // Step 2: translation/fetch
    if (rawLines.length === 0) {
      const fetchRequestBody: TranslationFetchRequest = {
        preparedTrack,
        targetLanguage: targetLang
      };
      try {
        const fetchResponse = await this.postToWorker<TranslationPayload>("/api/v1/translation/fetch", fetchRequestBody);
        if (fetchResponse) {
          if (Array.isArray(fetchResponse.lines)) {
            rawLines = fetchResponse.lines;
            lexicalItems = fetchResponse.lexicalItems;
          } else if (Array.isArray(fetchResponse)) {
            rawLines = fetchResponse;
          }
        }
      } catch (e) {
        console.error(`[WorkerAIAdapter] translation/fetch failed:`, e);
      }
    }

    // Adapt rawLines to canonical client LyricsLine[] shape
    const mappedLines = rawLines.map((t: any) => {
      const idx = typeof t.lineIndex === 'number' ? t.lineIndex : (typeof t.index === 'number' ? t.index : 0);
      return {
        id: `${trackId || "track"}:line:${idx}`,
        lineId: t.lineKey || `line_${idx}`,
        lineTextHash: t.lineKey || `line_${idx}`,
        lineKey: t.lineKey || "",
        index: idx,
        original: t.original !== undefined ? t.original : (t.text !== undefined ? t.text : ""),
        translation: t.translation || "",
        language: t.language || preparedTrack.sourceLanguage || "en",
        phrases: []
      };
    });

    if (lexicalItems) {
      (mappedLines as any).lexicalItems = lexicalItems;
    }

    return mappedLines;
  }

  async getPhraseAnalysis(
    lyrics: string | PreparedLyricsInput,
    trackKey?: string,
    targetLanguage?: string
  ): Promise<any[]> {
    const targetLang = targetLanguage || "English";
    const blocks = await this.fetchStructuredLecture(lyrics);
    const results: any[] = [];
    
    const lines = isPreparedInput(lyrics) ? lyrics.lines : [];
    const lineKeyToIndex = new Map<string, number>();
    for (const line of lines) {
      lineKeyToIndex.set(line.lineKey, line.lineIndex);
    }

    for (const block of blocks) {
      if (Array.isArray(block.phrases)) {
        for (const p of block.phrases) {
          let lineIndex = -1;
          const lineKeys = Array.isArray(p.lineKeys) ? p.lineKeys : [];
          if (lineKeys.length > 0) {
            for (const key of lineKeys) {
              if (lineKeyToIndex.has(key)) {
                lineIndex = lineKeyToIndex.get(key)!;
                break;
              }
            }
          }
          
          results.push({
            text: p.text,
            translation: p.translation,
            explanation: p.explanation,
            language: p.language || targetLang,
            lineKeys: lineKeys,
            lineKey: lineKeys[0] || undefined,
            lineIndex: lineIndex >= 0 ? lineIndex : 0,
          });
        }
      }
    }
    
    return results;
  }

  async saveTrackToSharedCache(track: TrackLyricsData): Promise<void> {
    // Firestore cache upload is bypassed/unnecessary when utilizing external Worker backend API.
  }

  async getPreparedTrack(
    lyrics: string | PreparedLyricsInput,
    targetLanguage: string
  ): Promise<PreparedTrackPayload> {
    return this.getOrPrepareTrack(lyrics, targetLanguage);
  }

  async computeTrackKey(title: string, artists: string[]): Promise<string> {
    const cleanTitle = normalizeTrackTitle(title);
    const cleanArtists = normalizeArtists(artists);
    return `track-${cleanArtists.join("-")}-${cleanTitle.replace(/\s+/g, "-")}`.toLowerCase();
  }

  async computeLyricsHash(lyrics: string | PreparedLyricsInput): Promise<string> {
    const text = isPreparedInput(lyrics) ? lyrics.lines.map(l => l.text).join("\n") : lyrics;
    return computeStableHash(text);
  }

  normalizeString(str: string): string {
    return (str || "").trim().toLowerCase();
  }
}
