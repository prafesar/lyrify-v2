import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  detectDominantLanguage, 
  cascadeTrackLanguageUpdate, 
  normalizeLanguageCode, 
  getLanguageDisplayName, 
  sameLanguage 
} from '../lib/languages';
import { addPhraseToStudy, getCards, updateTrackCardsLanguage } from '../services/localCardService';
import { sqliteService } from '../services/sqliteService';

// Setup crypto.randomUUID for the test runner
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {} as any;
}
globalThis.crypto.randomUUID = () => ('test-uuid-' + Math.random().toString(36).substr(2, 9)) as `${string}-${string}-${string}-${string}-${string}`;

// Mock idb-keyval so we can test actual indexedDB-backed cards
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

describe('Track Language Cascade & Dominant Language Detection Tests', () => {
  beforeEach(() => {
    mockInMemoryStore.clear();
  });

  describe('Part 1 & 3: Language Normalization & Dominant Language Inference', () => {
    it('should correctly normalize language codes', () => {
      expect(normalizeLanguageCode('English')).toBe('en');
      expect(normalizeLanguageCode('en')).toBe('en');
      expect(normalizeLanguageCode('French')).toBe('fr');
      expect(normalizeLanguageCode('FR')).toBe('fr');
      expect(normalizeLanguageCode('invalid-language-code-value')).toBeNull();
    });

    it('should correctly resolve display names', () => {
      expect(getLanguageDisplayName('en')).toBe('English');
      expect(getLanguageDisplayName('FR')).toBe('French');
      expect(getLanguageDisplayName('es')).toBe('Spanish');
      expect(getLanguageDisplayName('ru')).toBe('Russian');
    });

    it('should correctly identify if same language is used', () => {
      expect(sameLanguage('English', 'en')).toBe(true);
      expect(sameLanguage('en', 'EN')).toBe(true);
      expect(sameLanguage('French', 'fr')).toBe(true);
      expect(sameLanguage('English', 'fr')).toBe(false);
    });

    it('should calculate dominant language from lines using majority vote and ignoring invalid/empty ones', () => {
      const lines = [
        { original: 'Bonjour tout le monde', language: 'fr' },
        { original: 'Comment ça va?', language: 'FR' },
        { original: '  ', language: 'en' }, // empty line text
        { original: 'This is English line', language: 'en' },
        { original: 'Oui oui', language: 'fr' },
        { original: 'Line with invalid lang', language: 'invalid-code' },
        { original: 'No language line' }
      ];

      // Majority: 'fr' (3 occurrences) vs 'en' (1 occurrence because '  ' is empty)
      const dominant = detectDominantLanguage(lines);
      expect(dominant).toBe('fr');
    });

    it('should return null or fallback correctly if no lines with valid languages', () => {
      const lines = [
        { original: 'Hello' },
        { original: 'Bonjour', language: 'invalid-code' }
      ];
      expect(detectDominantLanguage(lines)).toBeNull();
    });
  });

  describe('Part 2 & 4: Manual Source Language Change & Cascading Updates', () => {
    it('should cascade track.sourceLanguage update to matching line/phrase languages and preserve non-matching ones', () => {
      const initialTrack = {
        trackId: 'track-abc',
        title: 'Mixed Language Song',
        artist: 'Polylingual Band',
        sourceLanguage: 'French',
        lines: [
          {
            original: 'Bonjour',
            language: 'fr',
            phrases: [
              { text: 'Bonjour', translation: 'Hello', language: 'fr' }
            ]
          },
          {
            original: 'Hello there',
            language: 'en',
            phrases: [
              { text: 'Hello', translation: 'Привет', language: 'en' }
            ]
          },
          {
            original: 'Ça va',
            language: 'fr',
            phrases: [
              { text: 'Ça va', translation: 'How are you', language: 'fr' }
            ]
          }
        ],
        phrases: [
          { text: 'Bonjour', language: 'fr' },
          { text: 'Hello there', language: 'en' }
        ]
      };

      // Cascade update French (fr) -> Spanish (es)
      const updatedTrack = cascadeTrackLanguageUpdate(initialTrack, 'French', 'Spanish');

      expect(updatedTrack.sourceLanguage).toBe('es');

      // Matching line language fr -> es
      expect(updatedTrack.lines[0].language).toBe('es');
      expect(updatedTrack.lines[0].phrases[0].language).toBe('es');

      // Non-matching English lines remain unmodified
      expect(updatedTrack.lines[1].language).toBe('en');
      expect(updatedTrack.lines[1].phrases[0].language).toBe('en');

      // Second matching line fr -> es
      expect(updatedTrack.lines[2].language).toBe('es');
      expect(updatedTrack.lines[2].phrases[0].language).toBe('es');

      // Top-level phrases
      expect(updatedTrack.phrases[0].language).toBe('es');
      expect(updatedTrack.phrases[1].language).toBe('en');
    });

    it('should cascade update related user flashcards of matching language only, preserving other language cards', async () => {
      const trackId = 'track-123';

      // 1. Add French card
      await addPhraseToStudy({
        text: 'Chanter',
        translation: 'To sing',
        trackId,
        lineId: 'line-1',
        explanation: 'Infinitive verb',
        type: 'phrase',
        sourceLanguage: 'French'
      });

      // 2. Add another French card but with language stored as code 'fr' (legacy support verification)
      await addPhraseToStudy({
        text: 'Danser',
        translation: 'To dance',
        trackId,
        lineId: 'line-2',
        explanation: 'Infinitive verb',
        type: 'phrase',
        sourceLanguage: 'fr'
      });

      // 3. Add English card (non-matching) for same track
      await addPhraseToStudy({
        text: 'Sing',
        translation: 'Петь',
        trackId,
        lineId: 'line-3',
        explanation: 'English verb',
        type: 'phrase',
        sourceLanguage: 'English'
      });

      // 4. Add card for different track (should never be updated)
      await addPhraseToStudy({
        text: 'Chanter',
        translation: 'To sing',
        trackId: 'different-track',
        lineId: 'line-1',
        explanation: 'Verb',
        type: 'phrase',
        sourceLanguage: 'French'
      });

      // Run update French -> Spanish
      await updateTrackCardsLanguage(trackId, 'French', 'Spanish');

      const cards = await getCards();

      // Card 1 (French display name) -> Spanish
      const card1 = cards.find(c => c.text === 'Chanter' && c.trackId === trackId);
      expect(card1?.sourceLanguage).toBe('es');

      // Card 2 (fr code name) -> Spanish
      const card2 = cards.find(c => c.text === 'Danser' && c.trackId === trackId);
      expect(card2?.sourceLanguage).toBe('es');

      // Card 3 (English non-matching) -> Unchanged English
      const card3 = cards.find(c => c.text === 'Sing' && c.trackId === trackId);
      expect(card3?.sourceLanguage).toBe('en');

      // Card 4 (different track, matching language) -> Unchanged French
      const card4 = cards.find(c => c.trackId === 'different-track');
      expect(card4?.sourceLanguage).toBe('fr');
    });
  });

  describe('Part 5: Library & Recent Track Language Sync', () => {
    it('should successfully update track language in favorites and recent history', async () => {
      const trackId = 'track-sync-123';
      const initialTrack = {
        id: trackId,
        trackId,
        title: 'French Chanson',
        artist: 'French Artist',
        album: 'French Album',
        sourceLanguage: 'French',
        lines: [
          { original: 'Bonjour', language: 'fr' }
        ]
      };

      // 1. Setup - Add track as favorite and to recents
      await sqliteService.toggleFavorite(initialTrack);
      sqliteService.addRecentTrack(initialTrack);

      // Verify they are stored as French
      let favorites = await sqliteService.getFavorites();
      let recents = sqliteService.getRecentTracks();
      expect(favorites.find(t => String(t.id) === trackId)?.sourceLanguage).toBe('fr');
      expect(recents.find(t => String(t.id || t.trackId) === trackId)?.sourceLanguage).toBe('fr');

      // 2. Simulate User manual language change
      const updatedTrack = cascadeTrackLanguageUpdate(initialTrack, 'French', 'Spanish');
      sqliteService.updateTrackInLibrary(trackId, updatedTrack);

      // 3. Verify they are correctly updated to Spanish
      favorites = await sqliteService.getFavorites();
      recents = sqliteService.getRecentTracks();
      expect(favorites.find(t => String(t.id) === trackId)?.sourceLanguage).toBe('es');
      expect(recents.find(t => String(t.id || t.trackId) === trackId)?.sourceLanguage).toBe('es');
    });
  });
});
