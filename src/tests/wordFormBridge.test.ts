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
});
