import { GeminiAIAdapter, aiClient } from "./adapters/geminiAIAdapter";
import { BrowserUserDataRepository, userDataRepository } from "./adapters/browserUserDataRepository";
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

export { aiClient, userDataRepository };

// Ports
export { type AiPort } from "./ports/aiPort";
export { type UserDataRepositoryPort } from "./ports/userDataRepositoryPort";
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
