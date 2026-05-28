import { UserDataRepositoryPort } from "../ports/userDataRepositoryPort";
import { Flashcard, PhraseStatus } from "../../services/localCardService";
import { DailyActivity, DailyProgressSummary } from "../../services/dailyTrackerService";
import { Track, TrackLyricsData } from "../../services/musicService";
import { Rating } from "ts-fsrs";

import { BrowserStudyCardsRepository } from "./browserStudyCardsRepository";
import { BrowserDailyTrackerRepository } from "./browserDailyTrackerRepository";
import { BrowserTrackCacheRepository } from "./browserTrackCacheRepository";
import { BrowserRecentHistoryRepository } from "./browserRecentHistoryRepository";
import { BrowserUserPreferencesRepository } from "./browserUserPreferencesRepository";
import { BrowserLibraryRepository } from "./browserLibraryRepository";
import { userDataMaintenanceService } from "./browserUserDataMaintenance";

export class BrowserUserDataRepository implements UserDataRepositoryPort {
  private studyCards = new BrowserStudyCardsRepository();
  private dailyTracker = new BrowserDailyTrackerRepository();
  private trackCache = new BrowserTrackCacheRepository();
  private recentHistory = new BrowserRecentHistoryRepository();
  private userPreferences = new BrowserUserPreferencesRepository();

  // Flashcards
  async getCards(): Promise<Flashcard[]> {
    return this.studyCards.getCards();
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
    return this.studyCards.addPhraseToStudy(phraseData, status);
  }

  async updatePhraseStatus(cardId: string, status: PhraseStatus): Promise<void> {
    return this.studyCards.updatePhraseStatus(cardId, status);
  }

  async deleteFlashcard(cardId: string): Promise<void> {
    return this.studyCards.deleteFlashcard(cardId);
  }

  async reviewCard(cardId: string, rating: Rating): Promise<void> {
    return this.studyCards.reviewCard(cardId, rating);
  }

  // Daily Activity
  getDailyActivity(date?: Date): DailyActivity {
    return this.dailyTracker.getDailyActivity(date);
  }

  saveDailyActivity(activity: DailyActivity): void {
    return this.dailyTracker.saveDailyActivity(activity);
  }

  recordTrackExplored(date?: Date): DailyActivity {
    return this.dailyTracker.recordTrackExplored(date);
  }

  recordPhraseSaved(date?: Date): DailyActivity {
    return this.dailyTracker.recordPhraseSaved(date);
  }

  recordReviewCompleted(date?: Date): DailyActivity {
    return this.dailyTracker.recordReviewCompleted(date);
  }

  getDailyProgressSummary(activity: DailyActivity): DailyProgressSummary {
    return this.dailyTracker.getDailyProgressSummary(activity);
  }

  // Recent Tracks
  getRecentTracks(): Track[] {
    return this.recentHistory.getRecentTracks();
  }

  addRecentTrack(track: Track): void {
    return this.recentHistory.addRecentTrack(track);
  }

  // Track Data Cache
  getCachedTrack(trackId: string): TrackLyricsData | null {
    return this.trackCache.getCachedTrack(trackId);
  }

  saveTrackData(trackId: string, data: any): TrackLyricsData {
    return this.trackCache.saveTrackData(trackId, data);
  }

  // Preferences
  getPreference(key: string, defaultValue: string): string {
    return this.userPreferences.getPreference(key, defaultValue);
  }

  setPreference(key: string, value: string): void {
    return this.userPreferences.setPreference(key, value);
  }

  getBoolPreference(key: string, defaultValue: boolean): boolean {
    return this.userPreferences.getBoolPreference(key, defaultValue);
  }

  setBoolPreference(key: string, value: boolean): void {
    return this.userPreferences.setBoolPreference(key, value);
  }

  removePreference(key: string): void {
    return this.userPreferences.removePreference(key);
  }

  async clearAllUserData(): Promise<void> {
    await userDataMaintenanceService.clearAllUserData();
  }
}

export const userDataRepository: UserDataRepositoryPort = new BrowserUserDataRepository();

export const studyCardsRepository = new BrowserStudyCardsRepository();
export const dailyTrackerRepository = new BrowserDailyTrackerRepository();
export const trackCacheRepository = new BrowserTrackCacheRepository();
export const recentHistoryRepository = new BrowserRecentHistoryRepository();
export const userPreferencesRepository = new BrowserUserPreferencesRepository();
export const libraryRepository = new BrowserLibraryRepository();
