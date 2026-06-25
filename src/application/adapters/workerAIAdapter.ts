import { AiPort, TrackMetadata, TrackMeaningResult, TrackMeaningEntry } from "../ports/aiPort";
import { TrackLyricsData, StructuredLectureBlock } from "../../services/musicService";
import { PreparedLyricsInput } from "../../services/lyricsPreprocessor";

function isPreparedInput(input: any): input is PreparedLyricsInput {
  return input && typeof input === 'object' && 'lines' in input && Array.isArray(input.lines);
}

/**
 * WorkerAIAdapter (Placeholder Migration Seam)
 * 
 * This class serves as the migration seam for Posteriormente integrating a 
 * Cloudflare Worker AI backend (Lyrify-v2 / CantoLex AI transition).
 * 
 * To activate the Cloudflare Worker, implement the HTTP/REST fetches below
 * to query your Cloudflare Worker REST endpoints and substitute this adapter
 * as the `aiClient` in `/src/application/index.ts`.
 */
export class WorkerAIAdapter implements AiPort {
  private workerBaseUrl = "/api/v2/worker"; // Placeholder Cloudflare Worker boundary

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
    title?: string,
    artist?: string,
    targetLanguage?: string,
    forceRegenerate?: boolean
  ): Promise<StructuredLectureBlock[]> {
    if (isPreparedInput(lyrics)) {
      return this.postToWorker<StructuredLectureBlock[]>("/lecture/fetch", {
        lyricsInput: lyrics,
        forceRegenerate,
      });
    } else {
      return this.postToWorker<StructuredLectureBlock[]>("/lecture/fetch", {
        lyrics,
        title,
        artist,
        targetLanguage,
        forceRegenerate,
      });
    }
  }

  async getCachedStructuredLecture(
    lyrics: string | PreparedLyricsInput,
    title?: string,
    artist?: string,
    targetLanguage?: string
  ): Promise<StructuredLectureBlock[] | null> {
    if (isPreparedInput(lyrics)) {
      return this.postToWorker<StructuredLectureBlock[] | null>("/lecture/get-cached", lyrics);
    } else {
      return this.postToWorker<StructuredLectureBlock[] | null>("/lecture/get-cached", {
        lyrics,
        title,
        artist,
        targetLanguage,
      });
    }
  }

  async fetchTrackMeaning(
    lyrics: string,
    metadata: TrackMetadata,
    promptVersion?: number,
    forceRegenerate?: boolean
  ): Promise<TrackMeaningResult> {
    return this.postToWorker<TrackMeaningResult>("/track-meaning/fetch", {
      lyrics,
      metadata,
      promptVersion,
      forceRegenerate,
    });
  }

  async getOriginalLanguage(trackKey: string): Promise<string | null> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async getTrackMeaningFromCache(
    title: string,
    artists: string[],
    targetLanguage?: string,
    promptVersion?: number
  ): Promise<TrackMeaningResult | null> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async generateSongMeaning(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<string> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async translateLyrics(lyrics: string | PreparedLyricsInput, targetLanguage?: string): Promise<string> {
    if (isPreparedInput(lyrics)) {
      return this.postToWorker<string>("/translate", {
        lyricsInput: lyrics,
      });
    } else {
      return this.postToWorker<string>("/translate", {
        lyrics,
        targetLanguage,
      });
    }
  }

  async extractLyricsMetadata(
    lyrics: string,
    artist: string,
    title: string
  ): Promise<{ authors: string | null; source_confirmation: string | null }> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async generateTrackAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string
  ): Promise<any> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async detectLanguage(text: string): Promise<string> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async explainPhraseStructured(
    phrase: string,
    targetLanguage: string
  ): Promise<{ translation: string; explanation: string }> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async generatePhraseAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    skipMeaning?: boolean
  ): Promise<any> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async completeLyricsAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<TrackLyricsData> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async generateTargetedAnalysis(
    title: string,
    artist: string,
    targetLanguage: string,
    starredLines: any[],
    existingPhrases: any[],
    instruction?: string
  ): Promise<{ phrases: any[] }> {
    throw new Error("WorkerAIAdapter is currently in placeholder state. Please use GeminiAIAdapter.");
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
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
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
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async getLatestAnalyzedTracks(maxCount?: number): Promise<TrackMeaningEntry[]> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async getLineTranslations(
    lyrics: string,
    trackKey: string,
    targetLanguage: string
  ): Promise<any[]> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async getPhraseAnalysis(
    lyrics: string,
    trackKey: string,
    targetLanguage: string
  ): Promise<any[]> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async saveTrackToSharedCache(track: TrackLyricsData): Promise<void> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async computeTrackKey(title: string, artists: string[]): Promise<string> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  async computeLyricsHash(lyrics: string): Promise<string> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
  }

  normalizeString(str: string): string {
    return (str || "").trim().toLowerCase();
  }
}
