import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addPhraseToStudy, getCards, updatePhraseStatus, deleteFlashcard, reviewCard } from '../services/localCardService';
import { Rating } from 'ts-fsrs';

// Ensure crypto.randomUUID is defined in the test runner
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {} as any;
}
globalThis.crypto.randomUUID = () => '12345678-1234-1234-1234-123456789012';

// Mock idb-keyval
const mockInMemoryStore = new Map<string, any>();

vi.mock('idb-keyval', () => {
  return {
    get: async (key: string) => mockInMemoryStore.get(key),
    set: async (key: string, val: any) => {
      mockInMemoryStore.set(key, val);
    },
    del: async (key: string) => {
      mockInMemoryStore.delete(key);
    },
    keys: async () => Array.from(mockInMemoryStore.keys()),
  };
});

describe('localCardService regression tests', () => {
  beforeEach(() => {
    mockInMemoryStore.clear();
  });

  it('should successfully add a phrase to study and store it in idb-keyval', async () => {
    const phrase = {
      text: 'Nous allons chanter',
      translation: 'We are going to sing',
      trackId: 'track-123',
      lineId: 'line-456',
      explanation: 'Future proche example',
      type: 'phrase',
      trackTitle: 'Song A',
      artist: 'Artist B',
      sourceLanguage: 'fr',
    };

    const cardId = await addPhraseToStudy(phrase, 'learning');
    expect(cardId).toBe('12345678-1234-1234-1234-123456789012');

    const cards = await getCards();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: '12345678-1234-1234-1234-123456789012',
      text: 'Nous allons chanter',
      translation: 'We are going to sing',
      status: 'learning',
      trackId: 'track-123',
      lineId: 'line-456',
    });

    expect(cards[0].trackTitle).toBe('Song A');
    expect(cards[0].artist).toBe('Artist B');
    expect(cards[0].reps).toBe(0);
  });

  it('should update phrase status correctly', async () => {
    const phrase = {
      text: 'Bonjour',
      translation: 'Hello',
      trackId: 'track-abc',
      lineId: 'line-def',
      explanation: 'Greeting',
      type: 'phrase',
    };

    const id = await addPhraseToStudy(phrase, 'new');
    let cards = await getCards();
    expect(cards[0].status).toBe('new');

    await updatePhraseStatus(id, 'known');
    cards = await getCards();
    expect(cards[0].status).toBe('known');
  });

  it('should delete flashcard from database store', async () => {
    const phrase = {
      text: 'Au revoir',
      translation: 'Goodbye',
      trackId: 'track-abc',
      lineId: 'line-def',
      explanation: 'Farewell',
      type: 'phrase',
    };

    const id = await addPhraseToStudy(phrase);
    expect(await getCards()).toHaveLength(1);

    await deleteFlashcard(id);
    expect(await getCards()).toHaveLength(0);
  });

  it('should handle card reviews and advance its repetitions / interval metrics using FSRS model', async () => {
    const phrase = {
      text: 'La vie en rose',
      translation: 'Life in pink',
      trackId: 'track-edith',
      lineId: 'line-rose',
      explanation: 'Idiotism',
      type: 'phrase',
    };

    const id = await addPhraseToStudy(phrase);
    let cards = await getCards();
    expect(cards[0].reps).toBe(0);

    // Apply first review as "Good" rating
    await reviewCard(id, Rating.Good);

    cards = await getCards();
    expect(cards[0].reps).toBe(1);
    expect(cards[0].last_review).toBeDefined();
    expect(cards[0].scheduled_days).toBeGreaterThanOrEqual(0);
  });
});
