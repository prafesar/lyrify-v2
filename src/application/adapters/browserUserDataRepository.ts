import { UserDataRepositoryPort } from "../ports/userDataRepositoryPort";
import { Flashcard, PhraseStatus } from "../../services/localCardService";
import { DailyActivity, DailyProgressSummary } from "../../services/dailyTrackerService";
import { Track, TrackLyricsData } from "../../services/musicService";
import { Rating } from "ts-fsrs";

import * as originalCardService from "../../services/localCardService";
import * as originalDailyTrackerService from "../../services/dailyTrackerService";
import * as originalMusicService from "../../services/musicService";

export class BrowserUserDataRepository implements UserDataRepositoryPort {
  // Flashcards
  async getCards(): Promise<Flashcard[]> {
    return originalCardService.getCards();
  }

  async addPhraseToStudy(
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
  ): Promise<string> {
    return originalCardService.addPhraseToStudy(phraseData, status);
  }

  async updatePhraseStatus(cardId: string, status: PhraseStatus): Promise<void> {
    return originalCardService.updatePhraseStatus(cardId, status);
  }

  async deleteFlashcard(cardId: string): Promise<void> {
    return originalCardService.deleteFlashcard(cardId);
  }

  async reviewCard(cardId: string, rating: Rating): Promise<void> {
    return originalCardService.reviewCard(cardId, rating);
  }

  // Daily Activity
  getDailyActivity(date?: Date): DailyActivity {
    return originalDailyTrackerService.getDailyActivity(date);
  }

  saveDailyActivity(activity: DailyActivity): void {
    return originalDailyTrackerService.saveDailyActivity(activity);
  }

  recordTrackExplored(date?: Date): DailyActivity {
    return originalDailyTrackerService.recordTrackExplored(date);
  }

  recordPhraseSaved(date?: Date): DailyActivity {
    return originalDailyTrackerService.recordPhraseSaved(date);
  }

  recordReviewCompleted(date?: Date): DailyActivity {
    return originalDailyTrackerService.recordReviewCompleted(date);
  }

  getDailyProgressSummary(activity: DailyActivity): DailyProgressSummary {
    return originalDailyTrackerService.getDailyProgressSummary(activity);
  }

  // Recent Tracks
  getRecentTracks(): Track[] {
    return originalMusicService.getRecentTracks();
  }

  addRecentTrack(track: Track): void {
    return originalMusicService.addRecentTrack(track);
  }

  // Track Data Cache
  getCachedTrack(trackId: string): TrackLyricsData | null {
    return originalMusicService.getCachedTrackData(trackId);
  }

  saveTrackData(trackId: string, data: any): TrackLyricsData {
    return originalMusicService.saveTrackData(trackId, data);
  }
}

export const userDataRepository: UserDataRepositoryPort = new BrowserUserDataRepository();
