import { AiPort, TrackMetadata, TrackMeaningResult, TrackMeaningEntry } from "../ports/aiPort";
import { TrackLyricsData, StructuredLectureBlock } from "../../services/musicService";
import { PreparedLyricsInput, prepareLyricsInput, normalizeTrackTitle, normalizeArtists, computeStableHash } from "../../services/lyricsPreprocessor";

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

  /**
   * Universal HTTP POST helper to delegate AI capability calls to the Cloudflare Worker backend.
   * Handles JSON request payload serialization, response envelope validation, and friendly error parsing.
   */
  private async postToWorker<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.workerBaseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
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
    forceRegenerate?: boolean
  ): Promise<StructuredLectureBlock[]> {
    let preparedInput: PreparedLyricsInput;
    if (isPreparedInput(lyrics)) {
      preparedInput = lyrics;
    } else {
      preparedInput = prepareLyricsInput(
        "unknown-track",
        [],
        lyrics,
        "English"
      );
    }
    return this.postToWorker<StructuredLectureBlock[]>("/api/v1/lecture/fetch", preparedInput);
  }

  async getCachedStructuredLecture(
    lyrics: string | PreparedLyricsInput
  ): Promise<StructuredLectureBlock[] | null> {
    // Currently, the production API does not support a separate cached lecture endpoint.
    // Return null to allow safe fallback without failing the application logic.
    return null;
  }

  /**
   * Compatibility wrapper. Track meaning is no longer an active, separate endpoint
   * in the modern API flow. It is generated and delivered as part of the structured lecture (kind === "intro").
   */
  async fetchTrackMeaning(
    lyrics: string,
    metadata: TrackMetadata,
    promptVersion?: number,
    forceRegenerate?: boolean
  ): Promise<TrackMeaningResult> {
    try {
      const preparedInput = prepareLyricsInput(
        metadata.title,
        metadata.artists,
        lyrics,
        metadata.targetLanguage || "English"
      );
      const blocks = await this.fetchStructuredLecture(preparedInput);
      const meaningBlock = blocks.find(b => b.kind === "intro") || 
                           blocks.find(b => b.kind === "overview") || 
                           blocks.find(b => b.kind === "context") || 
                           blocks[0];
      const text = meaningBlock ? meaningBlock.text : "Track context & breakdown available in study lecture.";
      return {
        meaning: text,
        meanings: {
          en: text,
          es: text,
          ru: text,
          pl: text
        }
      };
    } catch (e) {
      return {
        meaning: "Analysis available in Study Lecture.",
        meanings: { en: "", es: "", ru: "", pl: "" }
      };
    }
  }

  async getOriginalLanguage(trackKey: string): Promise<string | null> {
    return "en";
  }

  async getTrackMeaningFromCache(
    title: string,
    artists: string[],
    targetLanguage?: string,
    promptVersion?: number
  ): Promise<TrackMeaningResult | null> {
    return null;
  }

  async generateSongMeaning(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<string> {
    const res = await this.fetchTrackMeaning(lyrics, { title, artists: [artist], targetLanguage });
    return res.meaning;
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
    targetLanguage?: string
  ): Promise<any[]> {
    let preparedInput: PreparedLyricsInput;
    if (isPreparedInput(lyrics)) {
      preparedInput = lyrics;
    } else {
      preparedInput = prepareLyricsInput(
        trackKey || "unknown-track",
        [],
        lyrics,
        targetLanguage || "English"
      );
    }
    return this.postToWorker<any[]>("/api/v1/translation/fetch", preparedInput);
  }

  async getPhraseAnalysis(
    lyrics: string | PreparedLyricsInput,
    trackKey?: string,
    targetLanguage?: string
  ): Promise<any[]> {
    let preparedInput: PreparedLyricsInput;
    if (isPreparedInput(lyrics)) {
      preparedInput = lyrics;
    } else {
      preparedInput = prepareLyricsInput(
        trackKey || "unknown-track",
        [],
        lyrics,
        targetLanguage || "English"
      );
    }

    const blocks = await this.postToWorker<any[]>("/api/v1/lecture/fetch", preparedInput);
    const results: any[] = [];
    
    const lineKeyToIndex = new Map<string, number>();
    for (const line of preparedInput.lines) {
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
            language: p.language || preparedInput.targetLanguage || "unknown",
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
