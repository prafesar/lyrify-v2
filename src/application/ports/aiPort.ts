import { TrackLyricsData } from "../../services/musicService";
import { TrackMetadata, TrackMeaningResult, TrackMeaningEntry } from "../../services/geminiService";

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
  ): Promise<{ authors: string | null; source_confirmation: string | null }>;

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
