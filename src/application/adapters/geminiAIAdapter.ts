import { AiPort, TrackMetadata, TrackMeaningResult, TrackMeaningEntry } from "../ports/aiPort";
import { TrackLyricsData, StructuredLectureBlock } from "../../services/musicService";
import { PreparedLyricsInput } from "../../services/lyricsPreprocessor";
import * as originalGeminiService from "../../services/geminiService";

function isPreparedInput(input: any): input is PreparedLyricsInput {
  return input && typeof input === 'object' && 'lines' in input && Array.isArray(input.lines);
}

export class GeminiAIAdapter implements AiPort {
  async fetchStructuredLecture(
    lyrics: string | PreparedLyricsInput,
    forceRegenerate?: boolean,
    existingItems?: any[]
  ): Promise<StructuredLectureBlock[]> {
    let rawLyrics = "";
    let trackTitle = "";
    let trackArtist = "";
    let targetLang = "";

    if (isPreparedInput(lyrics)) {
      rawLyrics = lyrics.lines.map(l => l.text).join("\n");
      trackTitle = lyrics.track.title;
      trackArtist = lyrics.track.artists[0] || "Unknown";
      targetLang = lyrics.targetLanguage;
    } else {
      rawLyrics = lyrics;
      trackTitle = "Unknown Title";
      trackArtist = "Unknown Artist";
      targetLang = "English";
    }

    return originalGeminiService.fetchStructuredLecture(rawLyrics, trackTitle, trackArtist, targetLang, forceRegenerate);
  }

  async getCachedStructuredLecture(
    lyrics: string | PreparedLyricsInput
  ): Promise<StructuredLectureBlock[] | null> {
    let rawLyrics = "";
    let trackTitle = "";
    let trackArtist = "";
    let targetLang = "";

    if (isPreparedInput(lyrics)) {
      rawLyrics = lyrics.lines.map(l => l.text).join("\n");
      trackTitle = lyrics.track.title;
      trackArtist = lyrics.track.artists[0] || "Unknown";
      targetLang = lyrics.targetLanguage;
    } else {
      rawLyrics = lyrics;
      trackTitle = "Unknown Title";
      trackArtist = "Unknown Artist";
      targetLang = "English";
    }

    return originalGeminiService.getCachedStructuredLecture(rawLyrics, trackTitle, trackArtist, targetLang);
  }

  async getOriginalLanguage(trackKey: string): Promise<string | null> {
    return originalGeminiService.getOriginalLanguage(trackKey);
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

  async translateLyrics(lyrics: string | PreparedLyricsInput, targetLanguage?: string): Promise<string> {
    let rawLyrics = "";
    let targetLang = "";

    if (isPreparedInput(lyrics)) {
      rawLyrics = lyrics.lines.map(l => l.text).join("\n");
      targetLang = lyrics.targetLanguage;
    } else {
      rawLyrics = lyrics;
      targetLang = targetLanguage || "";
    }

    return originalGeminiService.translateLyrics(rawLyrics, targetLang);
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
      sourceText?: string;
      translation?: string;
      entryType?: "word" | "expression";
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
    lyrics: string | PreparedLyricsInput,
    trackKey?: string,
    targetLanguage?: string
  ): Promise<any[]> {
    let finalTrackKey = trackKey || "";
    let finalTargetLang = targetLanguage || "";

    if (isPreparedInput(lyrics)) {
      if (!finalTrackKey) {
        finalTrackKey = await this.computeTrackKey(lyrics.track.title, lyrics.track.artists);
      }
      if (!finalTargetLang) {
        finalTargetLang = lyrics.targetLanguage;
      }
    } else {
      if (!finalTrackKey) {
        finalTrackKey = "unknown-track";
      }
      if (!finalTargetLang) {
        finalTargetLang = "English";
      }
    }

    const lyricsHash = await this.computeLyricsHash(lyrics);
    return originalGeminiService.getLineTranslations(lyrics, finalTrackKey, lyricsHash, finalTargetLang);
  }

  async getPhraseAnalysis(
    lyrics: string | PreparedLyricsInput,
    trackKey?: string,
    targetLanguage?: string
  ): Promise<any[]> {
    let finalTrackKey = trackKey || "";
    let finalTargetLang = targetLanguage || "";
    let rawLyrics = "";

    if (isPreparedInput(lyrics)) {
      rawLyrics = lyrics.lines.map(l => l.text).join("\n");
      if (!finalTrackKey) {
        finalTrackKey = await this.computeTrackKey(lyrics.track.title, lyrics.track.artists);
      }
      if (!finalTargetLang) {
        finalTargetLang = lyrics.targetLanguage;
      }
    } else {
      rawLyrics = lyrics;
      if (!finalTrackKey) {
        finalTrackKey = "unknown-track";
      }
      if (!finalTargetLang) {
        finalTargetLang = "English";
      }
    }

    const lyricsHash = await this.computeLyricsHash(lyrics);
    return originalGeminiService.getPhraseAnalysis(rawLyrics, finalTargetLang, finalTrackKey, lyricsHash);
  }

  async saveTrackToSharedCache(track: TrackLyricsData): Promise<void> {
    return originalGeminiService.saveTrackToSharedCache(track);
  }

  async getPreparedTrack(
    lyrics: string | PreparedLyricsInput,
    targetLanguage: string
  ): Promise<PreparedTrackPayload> {
    return {
      trackKey: "local",
      lyricsKey: "local",
      metadata: { promptVersion: "1.0" },
      lines: [],
      lexicalItems: [],
      occurrences: []
    };
  }

  async computeTrackKey(title: string, artists: string[]): Promise<string> {
    return originalGeminiService.computeTrackKey(title, artists);
  }

  async computeLyricsHash(lyrics: string | PreparedLyricsInput): Promise<string> {
    return originalGeminiService.computeLyricsHash(lyrics);
  }

  normalizeString(str: string): string {
    return originalGeminiService.normalizeString(str);
  }
}

export const aiClient: AiPort = new GeminiAIAdapter();
