import { AiPort, TrackMetadata, TrackMeaningResult, TrackMeaningEntry } from "../ports/aiPort";
import { TrackLyricsData } from "../../services/musicService";
import * as originalGeminiService from "../../services/geminiService";

export class GeminiAIAdapter implements AiPort {
  async fetchTrackMeaning(
    lyrics: string,
    metadata: TrackMetadata,
    promptVersion?: number,
    forceRegenerate?: boolean
  ): Promise<TrackMeaningResult> {
    return originalGeminiService.fetchTrackMeaning(lyrics, metadata, promptVersion, forceRegenerate);
  }

  async getOriginalLanguage(trackKey: string): Promise<string | null> {
    return originalGeminiService.getOriginalLanguage(trackKey);
  }

  async getTrackMeaningFromCache(
    title: string,
    artists: string[],
    targetLanguage?: string,
    promptVersion?: number
  ): Promise<TrackMeaningResult | null> {
    return originalGeminiService.getTrackMeaningFromCache(title, artists, targetLanguage, promptVersion);
  }

  async generateSongMeaning(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<string> {
    return originalGeminiService.generateSongMeaning(lyrics, artist, title, targetLanguage, metadata);
  }

  async translateLyrics(lyrics: string, targetLanguage: string): Promise<string> {
    return originalGeminiService.translateLyrics(lyrics, targetLanguage);
  }

  async extractLyricsMetadata(
    lyrics: string,
    artist: string,
    title: string
  ): Promise<{ authors: string | null; source_confirmation: string | null }> {
    return originalGeminiService.extractLyricsMetadata(lyrics, artist, title);
  }

  async generateTrackAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string
  ): Promise<any> {
    return originalGeminiService.generateTrackAnalysis(lyrics, artist, title, targetLanguage);
  }

  async detectLanguage(text: string): Promise<string> {
    return originalGeminiService.detectLanguage(text);
  }

  async explainPhraseStructured(
    phrase: string,
    targetLanguage: string
  ): Promise<{ translation: string; explanation: string }> {
    return originalGeminiService.explainPhraseStructured(phrase, targetLanguage);
  }

  async generatePhraseAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    skipMeaning?: boolean
  ): Promise<any> {
    return originalGeminiService.generatePhraseAnalysis(lyrics, artist, title, targetLanguage, skipMeaning);
  }

  async completeLyricsAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    _metadata?: Partial<TrackMetadata>
  ): Promise<TrackLyricsData> {
    return originalGeminiService.completeLyricsAnalysis(lyrics, artist, title, targetLanguage);
  }

  async generateTargetedAnalysis(
    title: string,
    artist: string,
    targetLanguage: string,
    starredLines: any[],
    existingPhrases: any[],
    instruction?: string
  ): Promise<{ phrases: any[] }> {
    return originalGeminiService.generateTargetedAnalysis(title, artist, targetLanguage, starredLines, existingPhrases, instruction);
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
    return originalGeminiService.generateLearningAssistantResponse(
      title,
      artist,
      phraseContext,
      targetLanguage,
      existingPhrases,
      userQuestion,
      selectedPreset
    );
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
    }>;
  }> {
    return originalGeminiService.generateLineExplanation(
      metadata,
      currentLine,
      prevLine,
      nextLine,
      targetLanguage,
      sourceLanguage,
      onStreamChunk
    );
  }


  async getLatestAnalyzedTracks(maxCount?: number): Promise<TrackMeaningEntry[]> {
    return originalGeminiService.getLatestAnalyzedTracks(maxCount);
  }

  async getLineTranslations(
    lyrics: string,
    trackKey: string,
    targetLanguage: string
  ): Promise<any[]> {
    const lyricsHash = await originalGeminiService.computeLyricsHash(lyrics);
    return originalGeminiService.getLineTranslations(lyrics, trackKey, lyricsHash, targetLanguage);
  }

  async getPhraseAnalysis(
    lyrics: string,
    trackKey: string,
    targetLanguage: string
  ): Promise<any[]> {
    const lyricsHash = await originalGeminiService.computeLyricsHash(lyrics);
    return originalGeminiService.getPhraseAnalysis(lyrics, targetLanguage, trackKey, lyricsHash);
  }

  async saveTrackToSharedCache(track: TrackLyricsData): Promise<void> {
    return originalGeminiService.saveTrackToSharedCache(track);
  }

  async computeTrackKey(title: string, artists: string[]): Promise<string> {
    return originalGeminiService.computeTrackKey(title, artists);
  }

  async computeLyricsHash(lyrics: string): Promise<string> {
    return originalGeminiService.computeLyricsHash(lyrics);
  }

  normalizeString(str: string): string {
    return originalGeminiService.normalizeString(str);
  }
}

export const aiClient: AiPort = new GeminiAIAdapter();
