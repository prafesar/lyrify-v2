import { GeminiAIAdapter, aiClient as geminiAiClient } from "./adapters/geminiAIAdapter";
import { WorkerAIAdapter } from "./adapters/workerAIAdapter";
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
import { userDataMaintenanceService } from "./adapters/browserUserDataMaintenance";

// Create concrete browser adapters for lyrics and music metadata
const lyricsProvider = new BrowserLyricsProvider();
const musicMetadataProvider = new BrowserMusicMetadata();

// ============================================================================
// AI TRANSPORT CUTOVER POINT (FUTURE EXTERNAL API / CLOUDFLARE WORKER SWITCH)
// ============================================================================
// To switch the entire application's AI layer to the Cloudflare Worker API:
// 1. Swap the active declaration below to use `new WorkerAIAdapter()` instead of `geminiAiClient`.
// This single point controls all AI translation, lecture, and analysis transport.
export const aiClient = geminiAiClient; // Current active Gemini transport
// export const aiClient = new WorkerAIAdapter(); // Future Cloudflare Worker transport
// ============================================================================

// Compose/Wire the TrackSessionFacade inside the composition root
export const trackSessionFacade = new TrackSessionFacade(
  aiClient,
  trackCacheRepository,
  recentHistoryRepository,
  dailyTrackerRepository,
  lyricsProvider,
  musicMetadataProvider
);

export { 
  userDataRepository,
  studyCardsRepository,
  dailyTrackerRepository,
  trackCacheRepository,
  recentHistoryRepository,
  userPreferencesRepository,
  libraryRepository,
  userDataMaintenanceService
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
export { type UserDataMaintenancePort } from "./ports/userDataMaintenancePort";

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
