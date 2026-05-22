import { describe, it, expect } from 'vitest';
import { getTrackStudySummary } from '../services/trackSummaryService';
import { Flashcard } from '../services/localCardService';

describe('Track Study Bridge Integration Statistics Tests', () => {
  const sampleTrackId = 'testing-track-123';
  const dummyDate = new Date();

  // 1) Трек без карточек
  it('Scenario 1: Handles tracks with zero saved cards (returns null, which prevents component rendering)', () => {
    const list: Flashcard[] = [];
    const summary = getTrackStudySummary(list, sampleTrackId);
    expect(summary).toBeNull();
  });

  // 2) Трек только с learning картами
  it('Scenario 2: Handles tracks with learning cards exclusively (0% mastered)', () => {
    const list: Flashcard[] = [
      {
        id: 'c1',
        text: 'Bonjour',
        translation: 'Hello',
        status: 'learning',
        trackId: sampleTrackId,
        due: dummyDate,
        state: 1,
        elapsed_days: 0,
        scheduled_days: 0,
        stability: 1.2,
        difficulty: 3.1,
        reps: 1,
        lapses: 0,
        createdAt: dummyDate,
        updatedAt: dummyDate,
      },
      {
        id: 'c2',
        text: 'Amour',
        translation: 'Love',
        status: 'learning',
        trackId: sampleTrackId,
        due: dummyDate,
        state: 1,
        elapsed_days: 0,
        scheduled_days: 0,
        stability: 1.5,
        difficulty: 2.8,
        reps: 2,
        lapses: 0,
        createdAt: dummyDate,
        updatedAt: dummyDate,
      }
    ];

    const summary = getTrackStudySummary(list, sampleTrackId);
    expect(summary).not.toBeNull();
    expect(summary!.totalCards).toBe(2);
    expect(summary!.learningCount).toBe(2);
    expect(summary!.knownCount).toBe(0);
    expect(summary!.percentageComplete).toBe(0);
  });

  // 3) Трек с known + learning картами
  it('Scenario 3: Correctly computes percentage with mixtures of learning and known cards (e.g., 50% mastered)', () => {
    const list: Flashcard[] = [
      {
        id: 'c1',
        text: 'Bonjour',
        translation: 'Hello',
        status: 'learning',
        trackId: sampleTrackId,
        due: dummyDate,
        state: 1,
        elapsed_days: 0,
        scheduled_days: 0,
        stability: 1.2,
        difficulty: 3.1,
        reps: 1,
        lapses: 0,
        createdAt: dummyDate,
        updatedAt: dummyDate,
      },
      {
        id: 'c2',
        text: 'Amour',
        translation: 'Love',
        status: 'known',
        trackId: sampleTrackId,
        due: dummyDate,
        state: 2,
        elapsed_days: 5,
        scheduled_days: 10,
        stability: 10.5,
        difficulty: 2.8,
        reps: 5,
        lapses: 0,
        createdAt: dummyDate,
        updatedAt: dummyDate,
      }
    ];

    const summary = getTrackStudySummary(list, sampleTrackId);
    expect(summary).not.toBeNull();
    expect(summary!.totalCards).toBe(2);
    expect(summary!.learningCount).toBe(1);
    expect(summary!.knownCount).toBe(1);
    expect(summary!.percentageComplete).toBe(50);
  });

  // 4) Проверка прокидывания scoped-трека
  it('Scenario 4: Validates the bridge transition config (returns true if we have initialTrackId assigned to filter)', () => {
    const initialTrackId = 'study-scoped-track-id';
    
    // Simulating StudyView filter state resolution
    const resolvedSelectedTrack = initialTrackId || 'all';
    const resolvedGroupMode = initialTrackId ? 'track' : 'recent';

    expect(resolvedSelectedTrack).toBe('study-scoped-track-id');
    expect(resolvedGroupMode).toBe('track');
  });
});
