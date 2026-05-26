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

  // Preferences
  getPreference(key: string, defaultValue: string): string {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultValue;
    }
    return localStorage.getItem(key) || defaultValue;
  }

  setPreference(key: string, value: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, value);
    }
  }

  getBoolPreference(key: string, defaultValue: boolean): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return defaultValue;
    }
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    return val === "true";
  }

  setBoolPreference(key: string, value: boolean): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(key, String(value));
    }
  }

  removePreference(key: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(key);
    }
  }

  async clearAllUserData(): Promise<void> {
    if (typeof window !== "undefined") {
      if (window.localStorage) {
        localStorage.clear();
      }
      try {
        const idb = await import('idb-keyval');
        await idb.del('lyrify_flashcards');
      } catch (err) {
        console.error("Failed to clear idb-keyval in repository:", err);
      }
    }
  }
}

export const userDataRepository: UserDataRepositoryPort = new BrowserUserDataRepository();
