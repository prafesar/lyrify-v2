import { describe, expect, it, vi } from 'vitest';

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn(),
    };
  },
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    ARRAY: 'ARRAY',
    BOOLEAN: 'BOOLEAN',
  },
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: 0 })),
  setDoc: vi.fn(),
  where: vi.fn(),
}));

import { computeTrackKey, normalizeString } from '../services/geminiService';

describe('geminiService utility regressions', () => {
  it('normalizes casing, spacing, and punctuation predictably', () => {
    expect(normalizeString('  HéLLo,   World!!!  ')).toBe('héllo world');
    expect(normalizeString(`Don't   stop\nme now`)).toBe(`don't stop me now`);
  });

  it('produces the same track key for the same track regardless of case and artist order', async () => {
    const keyA = await computeTrackKey('  My Song  ', ['Zebra', 'Alpha Artist']);
    const keyB = await computeTrackKey('my song', ['alpha artist', 'zebra']);

    expect(keyA).toBe(keyB);
  });

  it('produces different track keys for different songs', async () => {
    const first = await computeTrackKey('Song One', ['Artist']);
    const second = await computeTrackKey('Song Two', ['Artist']);

    expect(first).not.toBe(second);
  });
});
