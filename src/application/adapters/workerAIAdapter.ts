import { AiPort, TrackMetadata, TrackMeaningResult, TrackMeaningEntry } from "../ports/aiPort";
import { TrackLyricsData } from "../../services/musicService";

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
  private workerBaseUrl = "/api/v2/worker"; // Placeholer Cloudflare Worker boundary

  async fetchTrackMeaning(
    lyrics: string,
    metadata: TrackMetadata,
    promptVersion?: number,
    forceRegenerate?: boolean
  ): Promise<TrackMeaningResult> {
    // Future Implementation:
    // const response = await fetch(`${this.workerBaseUrl}/track-meaning`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ lyrics, metadata, promptVersion, forceRegenerate })
    // });
    // return await response.json();
    throw new Error("WorkerAIAdapter is currently in placeholder state. Please use GeminiAIAdapter.");
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

  async translateLyrics(lyrics: string, targetLanguage: string): Promise<string> {
    throw new Error("WorkerAIAdapter is currently in placeholder state.");
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
    contextType: "line" | "phrase" | "selection",
    lineContext: { original: string; translation?: string; lineId?: string } | undefined,
    phraseContext: { text: string; translation?: string; explanation?: string; lineIds?: string[] } | undefined,
    targetLanguage: string,
    existingPhrases: any[],
    userQuestion?: string,
    selectedPreset?: string,
    selectedLines?: Array<{ original: string; translation?: string; lineId?: string }>
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
