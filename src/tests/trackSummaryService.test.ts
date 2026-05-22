import { describe, it, expect } from 'vitest';
import { getTrackStudySummary } from '../services/trackSummaryService';
import { Flashcard } from '../services/localCardService';

describe('Track Summary Service Aggregations', () => {
  const dummyDate = new Date();
  
  const mockCards: Flashcard[] = [
    {
      id: '1',
      text: 'la vie',
      translation: 'life',
      status: 'learning',
      trackId: 'track-1',
      due: dummyDate,
      state: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      createdAt: dummyDate,
      updatedAt: dummyDate,
    },
    {
      id: '2',
      text: 'l’amour',
      translation: 'love',
      status: 'known',
      trackId: 'track-1',
      due: dummyDate,
      state: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      createdAt: dummyDate,
      updatedAt: dummyDate,
    },
    {
      id: '3',
      text: 'bonjour',
      translation: 'hello',
      status: 'new',
      trackId: 'track-1',
      due: dummyDate,
      state: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      createdAt: dummyDate,
      updatedAt: dummyDate,
    },
    {
      id: '4',
      text: 'silence',
      translation: 'silence',
      status: 'learning',
      trackId: 'track-2',
      due: dummyDate,
      state: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      createdAt: dummyDate,
      updatedAt: dummyDate,
    }
  ];

  it('should return null when trackId has no cards', () => {
    const summary = getTrackStudySummary(mockCards, 'non-existent-track');
    expect(summary).toBeNull();
  });

  it('should return null when trackId is null or empty', () => {
    expect(getTrackStudySummary(mockCards, null)).toBeNull();
    expect(getTrackStudySummary(mockCards, undefined)).toBeNull();
    expect(getTrackStudySummary([], 'track-1')).toBeNull();
  });

  it('should compute correct tallies and percentage for learning + known + new', () => {
    const summary = getTrackStudySummary(mockCards, 'track-1');
    expect(summary).not.toBeNull();
    expect(summary!.totalCards).toBe(3);
    expect(summary!.learningCount).toBe(1);
    expect(summary!.knownCount).toBe(1);
    expect(summary!.newCount).toBe(1);
    // percentage: 1/3 ~ 33%
    expect(summary!.percentageComplete).toBe(33);
  });

  it('should compute 100% completion if all cards are known', () => {
    const knownCards: Flashcard[] = [
      {
        id: 'k1',
        text: 'test',
        translation: 'test',
        status: 'known',
        trackId: 'track-k',
        due: dummyDate,
        state: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        createdAt: dummyDate,
        updatedAt: dummyDate,
      }
    ];
    const summary = getTrackStudySummary(knownCards, 'track-k');
    expect(summary!.percentageComplete).toBe(100);
    expect(summary!.learningCount).toBe(0);
    expect(summary!.knownCount).toBe(1);
  });
});
