import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addRecentTrack,
  clearCachedLyrics,
  getCachedTrackData,
  getRecentTracks,
  saveTrackData,
  splitLyricsIntoLines,
} from '../services/musicService';

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    get length() {
      return store.size;
    },
  };
}

describe('musicService cache and local persistence regressions', () => {
  const localStorageMock = createLocalStorageMock();

  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.useRealTimers();
  });

  it('returns null for absent cached track data', () => {
    expect(getCachedTrackData('missing-track')).toBeNull();
  });

  it('splits lyrics into stable indexed line objects', () => {
    const lines = splitLyricsIntoLines('track-42', '  first line  \n\nsecond line');

    expect(lines).toEqual([
      { id: 'track-42:line:0', lineId: 'line_781e3b91', lineTextHash: 'line_781e3b91', index: 0, original: 'first line', phrases: [] },
      { id: 'track-42:line:1', lineId: 'empty_line', lineTextHash: 'empty_line', index: 1, original: '', phrases: [] },
      { id: 'track-42:line:2', lineId: 'line_edde7d5b', lineTextHash: 'line_edde7d5b', index: 2, original: 'second line', phrases: [] },
    ]);
  });

  it('deep-merges processing status while preserving existing cached fields', () => {
    saveTrackData('track-1', {
      trackId: 'track-1',
      artist: 'Artist',
      title: 'Song',
      rawLyrics: 'one',
      source: 'Manual',
      lines: [],
      meaning: 'initial meaning',
      processingStatus: {
        stage1_completed: true,
        stage2_completed: false,
        stage3_completed: false,
      },
      lastUpdated: 1,
    });

    const updated = saveTrackData('track-1', {
      meaning: 'updated meaning',
      processingStatus: {
        stage2_completed: true,
      },
    });

    expect(updated.meaning).toBe('updated meaning');
    expect(updated.processingStatus).toEqual({
      stage1_completed: true,
      stage2_completed: true,
      stage3_completed: false,
    });
    expect(updated.title).toBe('Song');
  });

  it('clears lyrics-related fields without dropping the rest of cached track metadata', () => {
    vi.setSystemTime(new Date('2026-05-21T00:00:00.000Z'));

    saveTrackData('track-2', {
      trackId: 'track-2',
      artist: 'Artist',
      title: 'Song',
      rawLyrics: 'hello world',
      source: 'Lyrics.ovh',
      lines: [{ id: 'track-2:line:0', index: 0, original: 'hello world', phrases: [] }],
      meaning: 'kept meaning',
      difficulty: 'intermediate',
      fullTranslation: 'привет мир',
      processingStatus: {
        stage1_completed: true,
        stage2_completed: true,
        stage3_completed: true,
      },
      lastUpdated: 123,
    });

    clearCachedLyrics('track-2');
    const cached = getCachedTrackData('track-2');

    expect(cached).toMatchObject({
      trackId: 'track-2',
      title: 'Song',
      meaning: 'kept meaning',
      difficulty: 'intermediate',
      rawLyrics: '',
      source: null,
      lines: [],
      processingStatus: {
        stage1_completed: false,
        stage2_completed: true,
        stage3_completed: false,
      },
    });
    expect(cached?.fullTranslation).toBeUndefined();
    expect(cached?.lastUpdated).toBe(new Date('2026-05-21T00:00:00.000Z').getTime());
  });

  it('deduplicates recent tracks and keeps only the latest 10 items', () => {
    for (let index = 0; index < 10; index += 1) {
      addRecentTrack({
        id: `track-${index}`,
        title: `Song ${index}`,
        artist: `Artist ${index}`,
        album: `Album ${index}`,
        coverUrl: `cover-${index}.jpg`,
      });
    }

    addRecentTrack({
      id: 'track-5',
      title: 'Song 5',
      artist: 'Artist 5',
      album: 'Album 5',
      coverUrl: 'cover-5.jpg',
    });

    addRecentTrack({
      id: 'track-10',
      title: 'Song 10',
      artist: 'Artist 10',
      album: 'Album 10',
      coverUrl: 'cover-10.jpg',
    });

    const recent = getRecentTracks();

    expect(recent).toHaveLength(10);
    expect(recent[0].id).toBe('track-10');
    expect(recent[1].id).toBe('track-5');
    expect(recent.find((track) => track.id === 'track-0')).toBeUndefined();
  });
});
