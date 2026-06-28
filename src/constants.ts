import { StructuredLectureBlock } from "./services/musicService";

export type AnalysisMode = "overview" | "vocabulary" | "phrases" | "style";

export interface AnalysisVariant {
  id: string;
  trackId: string;
  mode: AnalysisMode;
  targetLanguage: string;
  sourceLanguage: string;
  status: string;
  promptVersion?: number;
  createdAt: number;
  updatedAt: number;
}


export interface StructuredAnalysis {
  meaning: string;
  phrases: {
    phrase: string;
    translation: string;
    explanation: string;
    isUniversal: boolean;
    learningPriority: string;
  }[];
  vocabulary: {
    word: string;
    explanation: string;
  }[];
  promptVersion?: number;
}

export interface Artist {
  id: string;
  name: string;
  genre?: string;
  artistLinkUrl?: string;
  artworkUrl?: string;
  appleMusicUrl?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverUrl: string;
  trackCount: number;
  releaseDate: string;
  artistLinkUrl?: string;
  appleMusicUrl?: string;
}

export interface Track {
  id: string;
  trackId?: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  coverUrl: string;
  audioUrl?: string;
  lyrics?: string;
  sourceLanguage?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  autoTranslation?: string;
  youtubeUrl?: string;
  authors?: string;
  lyricSource?: string;
  analysis?: {
    meaning: string;
    phrases: { 
      phrase: string; 
      translation?: string; 
      explanation: string;
      isUniversal?: boolean;
      learningPriority?: string;
    }[];
    vocabulary: { word: string; translation?: string; explanation: string }[];
    promptVersion?: number;
  };
  structuredAnalysis?: StructuredAnalysis;
  lectureBlocks?: StructuredLectureBlock[];
  spotifyUrl?: string;
  appleMusicUrl?: string;
  geniusUrl?: string;
  musixmatchUrl?: string;
  lastfmUrl?: string;
  documentId?: string;
}
