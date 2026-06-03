import { TrackLyricsData } from "../../services/musicService";

export interface TrackMetadata {
  title: string;
  artists: string[];
  albumName?: string;
  albumId?: string;
  artistId?: string;
  coverUrl?: string;
  audioUrl?: string;
  appleMusicUrl?: string;
  itunesId?: number;
}

export interface TrackMeaningResult {
  originalLanguage: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  meanings: {
    en: string;
    es: string;
    ru: string;
    pl: string;
    [key: string]: string;
  };
  promptVersion?: number;
  translationPromptVersion?: number;
  rawLyrics?: string;
  lines?: any[];
}

export interface TrackMeaningEntry extends TrackMeaningResult {
  trackKey: string;
  title: string;
  artists: string[];
  albumName?: string;
  albumId?: string;
  artistId?: string;
  coverUrl?: string;
  audioUrl?: string;
  appleMusicUrl?: string;
  itunesId?: number;
  createdAt: any;
  promptVersion: number;
}

export const ANALYSIS_PROMPT_VERSION = 3;
export const TRANSLATION_PROMPT_VERSION = 4;

export interface AiPort {
  fetchTrackMeaning(
    lyrics: string,
    metadata: TrackMetadata,
    promptVersion?: number,
    forceRegenerate?: boolean
  ): Promise<TrackMeaningResult>;

  getOriginalLanguage(trackKey: string): Promise<string | null>;

  getTrackMeaningFromCache(
    title: string,
    artists: string[],
    targetLanguage?: string,
    promptVersion?: number
  ): Promise<TrackMeaningResult | null>;

  generateSongMeaning(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<string>;

  translateLyrics(lyrics: string, targetLanguage: string): Promise<string>;

  extractLyricsMetadata(
    lyrics: string,
    artist: string,
    title: string
  ): Promise<{ authors: string | null; source_confirmation?: string | null }>;

  generateTrackAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string
  ): Promise<any>;

  detectLanguage(text: string): Promise<string>;

  explainPhraseStructured(
    phrase: string,
    targetLanguage: string
  ): Promise<{ translation: string; explanation: string }>;

  generatePhraseAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    skipMeaning?: boolean
  ): Promise<any>;

  completeLyricsAnalysis(
    lyrics: string,
    artist: string,
    title: string,
    targetLanguage: string,
    metadata?: Partial<TrackMetadata>
  ): Promise<TrackLyricsData>;

  generateTargetedAnalysis(
    title: string,
    artist: string,
    targetLanguage: string,
    starredLines: any[],
    existingPhrases: any[],
    instruction?: string
  ): Promise<{ phrases: any[] }>;

  generateLearningAssistantResponse(
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
  }>;

  generateLineExplanation(
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
  }>;


  getLatestAnalyzedTracks(maxCount?: number): Promise<TrackMeaningEntry[]>;

  getLineTranslations(
    lyrics: string,
    trackKey: string,
    targetLanguage: string
  ): Promise<any[]>;

  getPhraseAnalysis(
    lyrics: string,
    trackKey: string,
    targetLanguage: string
  ): Promise<any[]>;

  saveTrackToSharedCache(track: TrackLyricsData): Promise<void>;

  computeTrackKey(title: string, artists: string[]): Promise<string>;
  computeLyricsHash(lyrics: string): Promise<string>;
  normalizeString(str: string): string;
}
