import { aiClient } from "./adapters/geminiAIAdapter";
import { userDataRepository } from "./adapters/browserUserDataRepository";

export { aiClient, userDataRepository };

// Ports
export { type AiPort } from "./ports/aiPort";
export { type UserDataRepositoryPort } from "./ports/userDataRepositoryPort";

// Re-export key domain types for UI independence
export { type Flashcard, type PhraseStatus } from "../services/localCardService";
export { type DailyActivity, type DailyProgressSummary } from "../services/dailyTrackerService";
export { type TrackMetadata, type TrackMeaningResult, type TrackMeaningEntry } from "../services/geminiService";
