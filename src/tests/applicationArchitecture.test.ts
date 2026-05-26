import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiClient, userDataRepository } from '../application';
import * as originalGeminiService from '../services/geminiService';
import * as originalCardService from '../services/localCardService';
import * as originalDailyTrackerService from '../services/dailyTrackerService';
import * as originalMusicService from '../services/musicService';

// Mock the services to test pure delegation by the adapters
vi.mock('../services/geminiService', async () => {
  const actual = await vi.importActual<typeof originalGeminiService>('../services/geminiService');
  return {
    ...actual,
    fetchTrackMeaning: vi.fn(),
    translateLyrics: vi.fn(),
  };
});

vi.mock('../services/localCardService', async () => {
  return {
    getCards: vi.fn(),
    addPhraseToStudy: vi.fn(),
  };
});

vi.mock('../services/dailyTrackerService', async () => {
  const actual = await vi.importActual<typeof originalDailyTrackerService>('../services/dailyTrackerService');
  return {
    ...actual,
    getDailyActivity: vi.fn(),
    recordTrackExplored: vi.fn(),
  };
});

vi.mock('../services/musicService', async () => {
  return {
    getRecentTracks: vi.fn(),
    addRecentTrack: vi.fn(),
  };
});

describe('CantoLex Ports and Adapters Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AI / Analysis Port and Adapter', () => {
    it('should correctly proxy computeLyricsHash logic', async () => {
      const hash1 = await aiClient.computeLyricsHash('Hello world lyrics');
      const hash2 = await aiClient.computeLyricsHash('Hello world lyrics');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should normalize string accents and formatting correctly', () => {
      const result = aiClient.normalizeString('   Héllô   Wôrld!  ');
      expect(result).toBe('héllô wôrld');
    });

    it('should delegate fetchTrackMeaning calls directly to raw geminiService', async () => {
      const mockResult = {
        originalLanguage: 'Spanish',
        difficulty: 'intermediate' as const,
        meanings: { en: 'Song summary', es: 'Resumen', ru: 'Резюме', pl: 'Podsumowanie' },
      };
      vi.mocked(originalGeminiService.fetchTrackMeaning).mockResolvedValueOnce(mockResult);

      const result = await aiClient.fetchTrackMeaning('lyrics content', { title: 'Test', artists: ['Artist'] });
      expect(originalGeminiService.fetchTrackMeaning).toHaveBeenCalledWith('lyrics content', { title: 'Test', artists: ['Artist'] }, undefined, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should delegate translateLyrics calls to the underlying service', async () => {
      vi.mocked(originalGeminiService.translateLyrics).mockResolvedValueOnce('Translated Lyrics');
      const result = await aiClient.translateLyrics('Original Lyrics', 'Russian');
      expect(originalGeminiService.translateLyrics).toHaveBeenCalledWith('Original Lyrics', 'Russian');
      expect(result).toBe('Translated Lyrics');
    });
  });

  describe('Local User Data / User Progress Repository Port and Adapter', () => {
    it('should delegate getCards to localCardService', async () => {
      vi.mocked(originalCardService.getCards).mockResolvedValueOnce([]);
      const result = await userDataRepository.getCards();
      expect(originalCardService.getCards).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should delegate adding phrases to localCardService', async () => {
      vi.mocked(originalCardService.addPhraseToStudy).mockResolvedValueOnce('test-card-id');
      const phraseData = {
        text: 'La canción',
        translation: 'The song',
        trackId: '123',
        lineId: 'line1',
        explanation: 'Note',
        type: 'vocabulary',
      };
      const result = await userDataRepository.addPhraseToStudy(phraseData, 'learning');
      expect(originalCardService.addPhraseToStudy).toHaveBeenCalledWith(phraseData, 'learning');
      expect(result).toBe('test-card-id');
    });

    it('should delegate daily activity queries to dailyTrackerService', () => {
      const mockActivity = {
        dateKey: '2026-05-26',
        tracksExplored: 1,
        phrasesSaved: 3,
        reviewsCompleted: 5,
      };
      vi.mocked(originalDailyTrackerService.getDailyActivity).mockReturnValueOnce(mockActivity);

      const result = userDataRepository.getDailyActivity();
      expect(originalDailyTrackerService.getDailyActivity).toHaveBeenCalled();
      expect(result).toEqual(mockActivity);
    });

    it('should delegate recent tracks requests to musicService', () => {
      vi.mocked(originalMusicService.getRecentTracks).mockReturnValueOnce([]);
      const result = userDataRepository.getRecentTracks();
      expect(originalMusicService.getRecentTracks).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
