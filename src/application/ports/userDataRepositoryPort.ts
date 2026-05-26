import { Flashcard, PhraseStatus } from "../../services/localCardService";
import { DailyActivity, DailyProgressSummary } from "../../services/dailyTrackerService";
import { Track } from "../../services/musicService";
import { Rating } from "ts-fsrs";

export interface UserDataRepositoryPort {
  // Flashcards
  getCards(): Promise<Flashcard[]>;
  addPhraseToStudy(
    phraseData: {
      text: string;
      translation: string;
      trackId: string;
      lineId: string;
      explanation: string;
      type: string;
      trackTitle?: string;
      artist?: string;
      sourceLanguage?: string;
      lemmas?: string[];
    },
    status?: PhraseStatus
  ): Promise<string>;
  updatePhraseStatus(cardId: string, status: PhraseStatus): Promise<void>;
  deleteFlashcard(cardId: string): Promise<void>;
  reviewCard(cardId: string, rating: Rating): Promise<void>;

  // Daily Activity
  getDailyActivity(date?: Date): DailyActivity;
  saveDailyActivity(activity: DailyActivity): void;
  recordTrackExplored(date?: Date): DailyActivity;
  recordPhraseSaved(date?: Date): DailyActivity;
  recordReviewCompleted(date?: Date): DailyActivity;
  getDailyProgressSummary(activity: DailyActivity): DailyProgressSummary;

  // Recent Tracks
  getRecentTracks(): Track[];
  addRecentTrack(track: Track): void;
}
