
import { Track, StructuredAnalysis } from '../constants';

export interface LyricsData {
  lyrics: string | null;
  authors?: string | null;
  source?: string | null;
}

export async function searchITunes(query: string): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results.map((item: any) => ({
      id: String(item.trackId),
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      coverUrl: item.artworkUrl100.replace('100x100', '600x600'),
      audioUrl: item.previewUrl
    }));
  } catch (error) {
    console.error("iTunes search error:", error);
    return [];
  }
}

export async function fetchLyrics(artist: string, title: string): Promise<LyricsData> {
  // 1. Priority: lyrics.ovh direct request
  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.lyrics) {
        return {
          lyrics: data.lyrics,
          authors: null,
          source: 'Lyrics.ovh'
        };
      }
    }
  } catch (error) {
    console.warn("Lyrics.ovh direct fetch error:", error);
  }

  // 2. lyrics.ovh suggest endpoint if direct failed
  try {
    const suggestResponse = await fetch(`https://api.lyrics.ovh/suggest/${encodeURIComponent(`${artist} ${title}`)}`);
    if (suggestResponse.ok) {
      const suggestData = await suggestResponse.json();
      if (suggestData.data && suggestData.data.length > 0) {
        // Find best match: title should contain requested title (case insensitive)
        const bestMatch = suggestData.data.find((item: any) => 
          item.title.toLowerCase().includes(title.toLowerCase()) || 
          title.toLowerCase().includes(item.title.toLowerCase())
        ) || suggestData.data[0];

        if (bestMatch) {
          const directResponse = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(bestMatch.artist.name)}/${encodeURIComponent(bestMatch.title)}`);
          if (directResponse.ok) {
            const data = await directResponse.json();
            if (data.lyrics) {
              return {
                lyrics: data.lyrics,
                authors: null,
                source: 'Lyrics.ovh (suggest)'
              };
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn("Lyrics.ovh suggest fetch error:", error);
  }

  // 3. Fallback: lrclib.net (sequential, only if lyrics.ovh failed)
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.plainLyrics || data.lyrics) {
        return {
          lyrics: data.plainLyrics || data.lyrics || null,
          authors: null,
          source: 'LRCLib'
        };
      }
    }
  } catch (error) {
    console.warn("LRCLib fetch error:", error);
  }

  return { lyrics: null, authors: null, source: null };
}

export interface Phrase {
  id: string;
  text: string;
  lemmas: string[];
  type: 'collocation' | 'idiom' | 'phrasal_verb' | 'cultural_ref' | 'vocabulary' | 'phrase';
  translation?: string;
  explanation?: string;
  isUniversal?: boolean;
  learningPriority?: string;
}

export interface LyricsLine {
  id: string;
  index: number;
  original: string;
  translation?: string;
  phrases: Phrase[];
}

export interface TrackLyricsData {
  trackId: string;
  artist: string;
  title: string;
  album?: string;
  coverUrl?: string;
  rawLyrics: string;
  source: 'Lyrics.ovh' | 'LRCLib' | 'Manual' | null;
  sourceLanguage?: string;
  authors?: string;
  lyricSource?: string;
  meaning?: string;
  lines: LyricsLine[];
  fullTranslation?: string;
  processingStatus: {
    stage1_completed: boolean; // Raw lyrics loaded & split
    stage2_completed: boolean; // Preview (meaning + key phrases) 
    stage3_completed: boolean; // Full translation & lemmatisation
  };
  lastUpdated: number;
}

const LYRICS_CACHE_KEY = 'lyrify_track_data_v2';
const RECENT_TRACKS_KEY = 'lyrify_recent_tracks';

export function getCachedTrackData(trackId: string): TrackLyricsData | null {
  const cache = JSON.parse(localStorage.getItem(LYRICS_CACHE_KEY) || '{}');
  return cache[trackId] || null;
}

export function saveTrackData(trackId: string, data: Partial<TrackLyricsData>) {
  const cache = JSON.parse(localStorage.getItem(LYRICS_CACHE_KEY) || '{}');
  const existing = cache[trackId] || {};
  
  // Deep merge strategy
  const updated: TrackLyricsData = {
    ...existing,
    ...data,
    processingStatus: {
      ...(existing.processingStatus || { stage1_completed: false, stage2_completed: false, stage3_completed: false }),
      ...(data.processingStatus || {})
    },
    lines: data.lines || existing.lines || [],
    lastUpdated: Date.now()
  };

  cache[trackId] = updated;
  localStorage.setItem(LYRICS_CACHE_KEY, JSON.stringify(cache));
  return updated;
}

export function splitLyricsIntoLines(trackId: string, lyrics: string): LyricsLine[] {
  return lyrics
    .split('\n')
    .map((line, idx) => ({
      id: `${trackId}:line:${idx}`,
      index: idx,
      original: line.trim(),
      phrases: []
    }))
    .filter(l => l.original.length > 0);
}

// Keep backward compatibility for now if needed, but we'll migrate App.tsx
export type EnrichedTrack = TrackLyricsData;
export function getCachedLyrics(trackId: string) { return getCachedTrackData(trackId); }
export function saveLyricsToCache(trackId: string, data: any) { return saveTrackData(trackId, data); }

export function clearCachedLyrics(trackId: string) {
  const cache = JSON.parse(localStorage.getItem(LYRICS_CACHE_KEY) || '{}');
  if (cache[trackId]) {
    // Only clear lyrics-related fields, preserve analysis
    const { analysis, ...rest } = cache[trackId];
    if (analysis) {
      cache[trackId] = { analysis };
    } else {
      delete cache[trackId];
    }
  }
  localStorage.setItem(LYRICS_CACHE_KEY, JSON.stringify(cache));
}

export function getRecentTracks(): Track[] {
  return JSON.parse(localStorage.getItem(RECENT_TRACKS_KEY) || '[]');
}

export function addRecentTrack(track: Track) {
  const recent = getRecentTracks();
  const filtered = recent.filter(t => t.id !== track.id);
  const updated = [track, ...filtered].slice(0, 10); // Keep last 10
  localStorage.setItem(RECENT_TRACKS_KEY, JSON.stringify(updated));
}
