import { GeminiAIAdapter, aiClient } from "./adapters/geminiAIAdapter";
import { 
  BrowserUserDataRepository, 
  userDataRepository,
  studyCardsRepository, 
  dailyTrackerRepository, 
  trackCacheRepository, 
  recentHistoryRepository, 
  userPreferencesRepository, 
  libraryRepository 
} from "./adapters/browserUserDataRepository";
import { BrowserLyricsProvider } from "./adapters/browserLyricsProvider";
import { BrowserMusicMetadata } from "./adapters/browserMusicMetadata";
import { TrackSessionFacade } from "./trackSessionFacade";

// Create concrete browser adapters for lyrics and music metadata
const lyricsProvider = new BrowserLyricsProvider();
const musicMetadataProvider = new BrowserMusicMetadata();

// Compose/Wire the TrackSessionFacade inside the composition root
export const trackSessionFacade = new TrackSessionFacade(
  aiClient,
  userDataRepository,
  lyricsProvider,
  musicMetadataProvider
);

export { 
  aiClient, 
  userDataRepository,
  studyCardsRepository,
  dailyTrackerRepository,
  trackCacheRepository,
  recentHistoryRepository,
  userPreferencesRepository,
  libraryRepository
};

// Ports
export { type AiPort } from "./ports/aiPort";
export { type UserDataRepositoryPort } from "./ports/userDataRepositoryPort";
export { type StudyCardsRepositoryPort } from "./ports/studyCardsRepositoryPort";
export { type DailyTrackerRepositoryPort } from "./ports/dailyTrackerRepositoryPort";
export { type TrackCacheRepositoryPort } from "./ports/trackCacheRepositoryPort";
export { type RecentHistoryRepositoryPort } from "./ports/recentHistoryRepositoryPort";
export { type UserPreferencesRepositoryPort } from "./ports/userPreferencesRepositoryPort";
export { type LibraryRepositoryPort } from "./ports/libraryRepositoryPort";
export { type LyricsProviderPort } from "./ports/lyricsProviderPort";
export { type MusicMetadataPort } from "./ports/musicMetadataPort";

// Re-export key domain types for UI independence
export { type Flashcard, type PhraseStatus } from "../services/localCardService";
export { type DailyActivity, type DailyProgressSummary } from "../services/dailyTrackerService";
export { 
  type TrackMetadata, 
  type TrackMeaningResult, 
  type TrackMeaningEntry,
  ANALYSIS_PROMPT_VERSION,
  TRANSLATION_PROMPT_VERSION
} from "./ports/aiPort";
