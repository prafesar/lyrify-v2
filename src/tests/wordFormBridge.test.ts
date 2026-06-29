import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserStudyCardsRepository } from '../application/adapters/browserStudyCardsRepository';
import { sqliteService } from '../services/sqliteService';
import { WordFormBridgeService } from '../services/wordFormBridgeService';

// Ensure crypto.randomUUID is defined in the test runner
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {} as any;
}
let uuidCounter = 0;
globalThis.crypto.randomUUID = () => `uuid-${uuidCounter++}`;

// Mock idb-keyval for localCardService
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

describe('WordFormBridgeService and FSRS Flashcard integration', () => {
  const repository = new BrowserStudyCardsRepository();

  beforeEach(async () => {
    mockInMemoryStore.clear();
    uuidCounter = 0;
    // Clear sqliteService user word form statuses
    await sqliteService.clearAllUserData();
  });

  it('learning card updates word forms monotonically', async () => {
    const phrase = {
      text: 'Bonjour',
      translation: 'Hello',
      trackId: 'track-123',
      lineId: 'line-456',
      explanation: 'Greeting',
      type: 'phrase',
      sourceLanguage: 'fr',
    };

    // 1. Check default state: shouldn't be registered yet
    const initialWfId = await sqliteService.ensureWordForm('fr', 'Bonjour', 'bonjour');
    const initialStatus = sqliteService.getUserWordFormStatus(initialWfId);
    expect(initialStatus).toBe('new');

    // 2. Add as learning
    const cardId = await repository.addPhraseToStudy(phrase, 'learning');
    
    const wfId = await sqliteService.ensureWordForm('fr', 'Bonjour', 'bonjour');
    let status = sqliteService.getUserWordFormStatus(wfId);
    expect(status).toBe('learning');

    // 3. Try downgrading with fake status
    const fakeNewCard = {
      id: cardId,
      text: 'Bonjour',
      status: 'new' as any,
      sourceLanguage: 'fr',
    } as any;
    await WordFormBridgeService.syncCardToWordForms(fakeNewCard);
    
    status = sqliteService.getUserWordFormStatus(wfId);
    expect(status).toBe('learning'); // preserved monotonically!
  });

  it('known card updates word forms to known', async () => {
    const phrase = {
      text: 'Chanter',
      translation: 'To sing',
      trackId: 'track-123',
      lineId: 'line-457',
      explanation: 'Verb',
      type: 'phrase',
      sourceLanguage: 'fr',
    };

    // 1. Add as learning first
    const cardId = await repository.addPhraseToStudy(phrase, 'learning');
    
    const wfId = await sqliteService.ensureWordForm('fr', 'Chanter', 'chanter');
    expect(sqliteService.getUserWordFormStatus(wfId)).toBe('learning');

    // 2. Update status of the card to 'known'
    await repository.updatePhraseStatus(cardId, 'known');
    
    expect(sqliteService.getUserWordFormStatus(wfId)).toBe('known');
  });

  it('delete card does not downgrade statuses', async () => {
    const phrase = {
      text: 'Musique',
      translation: 'Music',
      trackId: 'track-123',
      lineId: 'line-458',
      explanation: 'Noun',
      type: 'phrase',
      sourceLanguage: 'fr',
    };

    const cardId = await repository.addPhraseToStudy(phrase, 'known');
    const wfId = await sqliteService.ensureWordForm('fr', 'Musique', 'musique');
    expect(sqliteService.getUserWordFormStatus(wfId)).toBe('known');

    // Delete the flashcard
    await repository.deleteFlashcard(cardId);

    // Verify word form status is preserved
    expect(sqliteService.getUserWordFormStatus(wfId)).toBe('known');
  });

  it('phrase card with multiple words updates all extracted word forms', async () => {
    const phrase = {
      text: 'Nous aimons la musique française',
      translation: 'We love French music',
      trackId: 'track-123',
      lineId: 'line-459',
      explanation: 'Sentence',
      type: 'phrase',
      sourceLanguage: 'fr',
    };

    await repository.addPhraseToStudy(phrase, 'learning');

    const words = ['nous', 'aimons', 'la', 'musique', 'française'];
    for (const w of words) {
      const wfId = await sqliteService.ensureWordForm('fr', w, w);
      expect(sqliteService.getUserWordFormStatus(wfId)).toBe('learning');
    }

    // Now update that card to known and ensure all words update to known
    const cards = await repository.getCards();
    const cardId = cards[0].id;
    await repository.updatePhraseStatus(cardId, 'known');

    for (const w of words) {
      const wfId = await sqliteService.ensureWordForm('fr', w, w);
      expect(sqliteService.getUserWordFormStatus(wfId)).toBe('known');
    }
  });

  describe('Track-Level Vocabulary Analytics', () => {
    const trackId = 'track-abc';
    const rawLyrics = 'Bonjour tout le monde. La musique est bonne.';
    const sourceLanguage = 'fr';

    beforeEach(async () => {
      // Clear and populate track word forms
      await sqliteService.extractAndStoreTrackWordForms(trackId, rawLyrics, sourceLanguage);
    });

    it('unknown word form becomes learning after card status enrichment', async () => {
      // 1. Get initial stats: all should be unknown/new (except maybe ignored if there are any)
      let stats = await sqliteService.getTrackWordFormStats(trackId);
      expect(stats.knownCount).toBe(0);
      expect(stats.learningCount).toBe(0);
      expect(stats.unknownCount).toBe(stats.totalCount);

      // 2. Add a phrase containing 'musique' as learning
      const phrase = {
        text: 'La musique',
        translation: 'The music',
        trackId,
        lineId: 'line-abc-1',
        explanation: 'Noun phrase',
        type: 'phrase',
        sourceLanguage,
      };
      await repository.addPhraseToStudy(phrase, 'learning');

      // 3. Stats should now have 'musique' and 'la' as learning
      stats = await sqliteService.getTrackWordFormStats(trackId);
      expect(stats.learningCount).toBe(2); // 'la' and 'musique'
      expect(stats.knownCount).toBe(0);
      expect(stats.unknownCount).toBe(stats.totalCount - 0); // unknownCount is totalCount - knownCount - ignoredCount
    });

    it('learning becomes known monotonically', async () => {
      const phrase = {
        text: 'Bonne',
        translation: 'Good',
        trackId,
        lineId: 'line-abc-2',
        explanation: 'Adjective',
        type: 'phrase',
        sourceLanguage,
      };

      // 1. Add as learning
      const cardId = await repository.addPhraseToStudy(phrase, 'learning');
      let stats = await sqliteService.getTrackWordFormStats(trackId);
      expect(stats.learningCount).toBe(1);
      expect(stats.knownCount).toBe(0);

      // 2. Update card to known
      await repository.updatePhraseStatus(cardId, 'known');
      stats = await sqliteService.getTrackWordFormStats(trackId);
      expect(stats.learningCount).toBe(0);
      expect(stats.knownCount).toBe(1);

      // 3. Ensure we cannot downgrade: even if we try to call syncCardToWordForms with an older/lower state card, it stays known
      const fakeLearningCard = {
        id: cardId,
        text: 'Bonne',
        status: 'learning',
        sourceLanguage,
      } as any;
      await WordFormBridgeService.syncCardToWordForms(fakeLearningCard);

      stats = await sqliteService.getTrackWordFormStats(trackId);
      expect(stats.learningCount).toBe(0);
      expect(stats.knownCount).toBe(1); // remains known!
    });

    it('deleting a card does not reduce known counts', async () => {
      const phrase = {
        text: 'Monde',
        translation: 'World',
        trackId,
        lineId: 'line-abc-3',
        explanation: 'Noun',
        type: 'phrase',
        sourceLanguage,
      };

      // 1. Add as known
      const cardId = await repository.addPhraseToStudy(phrase, 'known');
      let stats = await sqliteService.getTrackWordFormStats(trackId);
      expect(stats.knownCount).toBe(1);

      // 2. Delete the card
      await repository.deleteFlashcard(cardId);

      // 3. Known count must still be 1 (deleting a card does not downgrade/remove user knowledge)
      stats = await sqliteService.getTrackWordFormStats(trackId);
      expect(stats.knownCount).toBe(1);
    });

    it('the same word form appearing in multiple tracks is counted consistently from shared user_word_form_status', async () => {
      const trackId2 = 'track-def';
      const rawLyrics2 = 'La musique est fantastique.';
      await sqliteService.extractAndStoreTrackWordForms(trackId2, rawLyrics2, sourceLanguage);

      // 1. Add 'musique' as known in track 1
      const phrase = {
        text: 'musique',
        translation: 'music',
        trackId,
        lineId: 'line-abc-4',
        explanation: 'Noun',
        type: 'phrase',
        sourceLanguage,
      };
      await repository.addPhraseToStudy(phrase, 'known');

      // 2. Verify 'musique' is known in BOTH track 1 and track 2 stats
      const stats1 = await sqliteService.getTrackWordFormStats(trackId);
      const stats2 = await sqliteService.getTrackWordFormStats(trackId2);

      // 'musique' is known in both tracks since they share the same user_word_form_status dictionary
      expect(stats1.knownCount).toBe(1);
      expect(stats2.knownCount).toBe(1);
    });

    it('mode switch does not change user knowledge results for the same track', async () => {
      // 1. Set a word form to known
      const phrase = {
        text: 'Bonjour',
        translation: 'Hello',
        trackId,
        lineId: 'line-abc-5',
        explanation: 'Greeting',
        type: 'phrase',
        sourceLanguage,
      };
      await repository.addPhraseToStudy(phrase, 'known');

      // 2. Get stats in 'overview' mode context
      const statsOverview = await sqliteService.getTrackWordFormStats(trackId);
      expect(statsOverview.knownCount).toBe(1);

      // 3. Get stats in 'vocabulary' mode context
      const statsVocab = await sqliteService.getTrackWordFormStats(trackId);
      expect(statsVocab.knownCount).toBe(1);

      // 4. They must be exactly identical
      expect(statsOverview).toEqual(statsVocab);
    });
  });
});
