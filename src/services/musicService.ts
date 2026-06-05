
import { type Track, Artist, Album } from '../constants';
import { sqliteService } from './sqliteService';
export type { Track };

export interface LyricsData {
  lyrics: string | null;
  authors?: string | null;
  source?: string | null;
}

export async function searchITunes(query: string, entity: 'musicTrack' | 'album' | 'musicArtist' = 'musicTrack', signal?: AbortSignal): Promise<any[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=${entity}&limit=30`;
  try {
    const response = await fetch(url, { signal });
    const data = await response.json();
    
    // If it's an artist search, try to get some artwork from albums in parallel to show images in search results
    const artworksMap: Map<string, string> = new Map();
    if (entity === 'musicArtist' && data.results.length > 0) {
      try {
        const albumUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=50`;
        const albumRes = await fetch(albumUrl, { signal });
        const albumData = await albumRes.json();
        albumData.results.forEach((item: any) => {
          if (item.artistId && item.artworkUrl100) {
            artworksMap.set(String(item.artistId), item.artworkUrl100.replace('100x100', '600x600'));
          }
        });
      } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        console.warn("Failed to fetch auxiliary artworks:", e);
      }
    }

    return data.results.map((item: any) => {
      if (entity === 'musicTrack') {
        return {
          id: String(item.trackId),
          title: item.trackName,
          artist: item.artistName,
          artistId: String(item.artistId),
          album: item.collectionName,
          albumId: String(item.collectionId),
          coverUrl: item.artworkUrl100?.replace('100x100', '600x600'),
          audioUrl: item.previewUrl,
          appleMusicUrl: item.trackViewUrl
        } as Track;
      } else if (entity === 'album') {
        return {
          id: String(item.collectionId),
          title: item.collectionName,
          artist: item.artistName,
          artistId: String(item.artistId),
          coverUrl: item.artworkUrl100?.replace('100x100', '600x600'),
          trackCount: item.trackCount,
          releaseDate: item.releaseDate,
          appleMusicUrl: item.collectionViewUrl
        } as Album;
      } else {
        const artistId = String(item.artistId);
        return {
          id: artistId,
          name: item.artistName,
          genre: item.primaryGenreName,
          artistLinkUrl: item.artistLinkUrl,
          coverUrl: artworksMap.get(artistId) || item.artworkUrl100?.replace('100x100', '600x600') || item.artworkUrl
        } as any;
      }
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error("iTunes search error:", error);
    return [];
  }
}

export async function getTrackDetails(trackId: string, signal?: AbortSignal): Promise<Track | null> {
  const url = `https://itunes.apple.com/lookup?id=${trackId}`;
  try {
    const response = await fetch(url, { signal });
    const data = await response.json();
    const results = data.results || [];
    const item = results.find((r: any) => r.wrapperType === 'track' || r.kind === 'song' || String(r.trackId) === trackId);
    if (!item) return null;
    return {
      id: String(item.trackId),
      title: item.trackName,
      artist: item.artistName,
      artistId: String(item.artistId),
      album: item.collectionName,
      albumId: String(item.collectionId),
      coverUrl: item.artworkUrl100?.replace('100x100', '600x600'),
      audioUrl: item.previewUrl,
      appleMusicUrl: item.trackViewUrl
    } as Track;
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.error("iTunes track lookup error:", err);
    return null;
  }
}

export async function getArtistDetails(artistId: string, signal?: AbortSignal): Promise<{ artist: Artist, albums: Album[], topTracks: Track[] }> {
  // Increase limit to 50 to get more context and better chance of getting images/tracks
  const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album,song&limit=50`;
  try {
    const response = await fetch(url, { signal });
    const data = await response.json();
    
    let artistBox: Artist | null = null;
    const albums: Album[] = [];
    const topTracks: Track[] = [];
    
    // First pass: find the artist
    data.results.forEach((item: any) => {
      if (item.wrapperType === 'artist') {
        artistBox = {
          id: String(item.artistId),
          name: item.artistName,
          genre: item.primaryGenreName,
          artistLinkUrl: item.artistLinkUrl,
          appleMusicUrl: item.artistLinkUrl,
          artworkUrl: item.artworkUrl100?.replace('100x100', '600x600')
        };
      }
    });

    // Second pass: fill albums and tracks
    data.results.forEach((item: any) => {
      if (item.wrapperType === 'collection') {
        const album = {
          id: String(item.collectionId),
          title: item.collectionName,
          artist: item.artistName,
          artistId: String(item.artistId),
          coverUrl: item.artworkUrl100?.replace('100x100', '600x600'),
          trackCount: item.trackCount,
          appleMusicUrl: item.collectionViewUrl,
          releaseDate: item.releaseDate
        };
        albums.push(album);
        
        // Use first album cover as artist cover if artist doesn't have one
        if (artistBox && !artistBox.artworkUrl && album.coverUrl) {
          artistBox.artworkUrl = album.coverUrl;
        }
      } else if (item.kind === 'song' || item.wrapperType === 'track') {
        const track = {
          id: String(item.trackId),
          title: item.trackName,
          artist: item.artistName,
          artistId: String(item.artistId),
          album: item.collectionName,
          albumId: String(item.collectionId),
          coverUrl: item.artworkUrl100?.replace('100x100', '600x600'),
          audioUrl: item.previewUrl,
          appleMusicUrl: item.trackViewUrl
        };
        topTracks.push(track);
        
        // Use first track cover as artist cover if artist doesn't have one
        if (artistBox && !artistBox.artworkUrl && track.coverUrl) {
          artistBox.artworkUrl = track.coverUrl;
        }
      }
    });
    
    return { 
      artist: artistBox || { id: artistId, name: "Unknown Artist", genre: "" }, 
      albums: albums.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()), 
      topTracks 
    };
  } catch (error) {
    console.error("iTunes artist lookup error:", error);
    throw error;
  }
}

export async function getAlbumDetails(albumId: string, signal?: AbortSignal): Promise<{ album: Album, tracks: Track[] }> {
  try {
    const url = `https://itunes.apple.com/lookup?id=${albumId.trim()}&entity=song&limit=200`;
    console.log("Fetching album details from:", url);
    const response = await fetch(url, { signal });
    const data = await response.json();
    const results = data.results || [];
    
    console.log(`ITunes lookup for ID ${albumId} returned ${results.length} results`);
    results.forEach((r: any, i: number) => {
      console.log(`[Result ${i}] wrapperType: ${r.wrapperType}, kind: ${r.kind}, name: ${r.trackName || r.collectionName}`);
    });

    // 1. Find the album (collection)
    const collectionItem = results.find((r: any) => r.wrapperType === 'collection' || r.collectionId === Number(albumId));
    
    // 2. Identify the album data
    const album: Album = collectionItem ? {
      id: String(collectionItem.collectionId),
      title: collectionItem.collectionName,
      artist: collectionItem.artistName,
      artistId: String(collectionItem.artistId),
      coverUrl: (collectionItem.artworkUrl100 || '').replace('100x100', '600x600'),
      trackCount: collectionItem.trackCount,
      releaseDate: collectionItem.releaseDate,
      appleMusicUrl: collectionItem.collectionViewUrl
    } : { 
      id: albumId, 
      title: "Unknown Album", 
      artist: "Unknown Artist", 
      artistId: "", 
      coverUrl: "", 
      trackCount: 0, 
      releaseDate: "",
      appleMusicUrl: ""
    };

    // 3. Collect tracks - look for anything that is NOT the collection item itself
    let tracks: Track[] = results
      .filter((r: any) => {
        // Skip it if it's explicitly the collection entry
        if (r.wrapperType === 'collection') return false;
        // Accept if it has a trackName or is track/song
        return r.wrapperType === 'track' || r.kind === 'song' || !!r.trackName || !!r.trackId;
      })
      .map((item: any) => ({
        id: String(item.trackId || Math.random().toString(36).substr(2, 9)),
        title: item.trackName || item.trackCensoredName || "Unknown Track",
        artist: item.artistName || album.artist,
        artistId: String(item.artistId || album.artistId),
        album: item.collectionName || album.title,
        albumId: String(item.collectionId || album.id),
        coverUrl: (item.artworkUrl100 || album.coverUrl || '').replace('100x100', '600x600'),
        audioUrl: item.previewUrl,
        appleMusicUrl: item.trackViewUrl
      }));

    console.log(`Found ${tracks.length} tracks via lookup for album ${album.title}`);

    // 4. FALLBACK: If lookup returned 0 tracks but album says it should have tracks
    if (tracks.length === 0 && (album.trackCount > 0 || album.title !== "Unknown Album")) {
      console.log(`Fallback: Searching for tracks by album "${album.title}" and artist "${album.artist}"`);
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent((album.artist + " " + album.title).trim())}&entity=musicTrack&limit=200`;
      try {
        const sRes = await fetch(searchUrl, { signal });
        const sData = await sRes.json();
        if (sData.results && sData.results.length > 0) {
          const fallbackTracks = sData.results
            .filter((r: any) => 
               String(r.collectionId) === albumId || 
               r.collectionName?.toLowerCase().includes(album.title.toLowerCase())
            )
            .map((item: any) => ({
              id: String(item.trackId),
              title: item.trackName,
              artist: item.artistName,
              artistId: String(item.artistId),
              album: item.collectionName,
              albumId: String(item.collectionId),
              coverUrl: (item.artworkUrl100 || album.coverUrl).replace('100x100', '600x600'),
              audioUrl: item.previewUrl,
              appleMusicUrl: item.trackViewUrl
            }));
          
          if (fallbackTracks.length > 0) {
            console.log(`Successfully found ${fallbackTracks.length} tracks via fallback search`);
            tracks = fallbackTracks;
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.error("Fallback search failed:", err);
      }
    }

    // 5. Sort tracks by trackNumber if possible
    tracks.sort((a, b) => {
      const aData = results.find((r: any) => String(r.trackId) === a.id);
      const bData = results.find((r: any) => String(r.trackId) === b.id);
      if (aData?.trackNumber && bData?.trackNumber) {
        return aData.trackNumber - bData.trackNumber;
      }
      return 0;
    });

    return { album, tracks };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error("iTunes album lookup error:", error);
    return { 
      album: { id: albumId, title: "Error Loading", artist: "", artistId: "", coverUrl: "", trackCount: 0, releaseDate: "" }, 
      tracks: [] 
    };
  }
}

export interface LyricOption {
  id: string;
  source: 'Lyrics.ovh' | 'LRCLib';
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  data?: any; // Original source data
}

export async function searchLyricsOptions(artist: string, title: string): Promise<LyricOption[]> {
  const options: LyricOption[] = [];
  const query = `${artist} ${title}`;

  // 1. Search Lyrics.ovh Suggest
  try {
    const response = await fetch(`https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        data.data.forEach((item: any) => {
          options.push({
            id: `ovh:${item.id}`,
            source: 'Lyrics.ovh',
            title: item.title,
            artist: item.artist.name,
            album: item.album?.title,
            duration: item.duration,
            data: item
          });
        });
      }
    }
  } catch (e) {
    console.warn("Manual search ovh error:", e);
  }

  // 2. Search LRCLib
  try {
    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          options.push({
            id: `lrclib:${item.id}`,
            source: 'LRCLib',
            title: item.trackName,
            artist: item.artistName,
            album: item.albumName,
            duration: item.duration,
            data: item
          });
        });
      }
    }
  } catch (e) {
    console.warn("Manual search lrclib error:", e);
  }

  return options;
}

export async function fetchLyricsFromOption(option: LyricOption): Promise<LyricsData> {
  if (option.source === 'Lyrics.ovh') {
    try {
      const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(option.artist)}/${encodeURIComponent(option.title)}`);
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
    } catch (e) {
      console.error("Fetch from option ovh error:", e);
    }
  } else if (option.source === 'LRCLib') {
    const item = option.data;
    // Check search result data first
    const searchLyrics = item.plainLyrics || item.syncedLyrics || item.lyrics;
    if (searchLyrics) {
      return {
        lyrics: searchLyrics,
        authors: null,
        source: 'LRCLib'
      };
    }
    // If not found, try direct hit by artist/title
    try {
      const response = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(option.artist)}&track_name=${encodeURIComponent(option.title)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.plainLyrics || data.syncedLyrics || data.lyrics) {
          return {
            lyrics: data.plainLyrics || data.syncedLyrics || data.lyrics,
            authors: null,
            source: 'LRCLib'
          };
        }
      }
    } catch (e) {
       console.error("Fetch from option lrclib error:", e);
    }
  }

  return { lyrics: null, source: null };
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
  type: 'collocation' | 'idiom' | 'phrasal_verb' | 'cultural_ref' | 'vocabulary' | 'phrase' | string;
  translation?: string;
  explanation?: string;
  isUniversal?: boolean;
  learningPriority?: string;
  language?: string;
  normalizedText?: string;
  lineIds?: string[];
  source?: 'llm' | 'user';
  createdAt?: number;
  updatedAt?: number;
  note?: string;
}

export interface LyricsLine {
  id: string;
  lineId?: string;
  lineTextHash?: string;
  index: number;
  original: string;
  translation?: string;
  language?: string;
  phrases: Phrase[];
  isStarred?: boolean;
  explanation?: {
    summary: string;
    notes: Array<{
      type: "idiom" | "cultural" | "collocation" | "grammar" | "nuance";
      text: string;
      sourceText?: string;
      translation?: string;
      entryType?: "word" | "expression";
    }>;
  };
}

export interface TrackLyricsData {
  trackId: string;
  itunesTrackId?: string;
  artist: string;
  artistId?: string;
  title: string;
  album?: string;
  albumId?: string;
  coverUrl?: string;
  audioUrl?: string;
  appleMusicUrl?: string;
  rawLyrics: string;
  source?: 'Lyrics.ovh' | 'LRCLib' | 'Manual' | null;
  sourceLanguage?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  authors?: string;
  lyricSource?: string;
  meaning?: string;
  meanings?: {
    en?: string;
    es?: string;
    ru?: string;
    pl?: string;
  };
  lines: LyricsLine[];
  phrases?: Phrase[];
  fullTranslation?: string;
  promptVersion?: number;
  translationPromptVersion?: number;
  processingStatus: {
    stage1_completed: boolean; // Raw lyrics loaded & split
    stage2_completed: boolean; // Preview (meaning + key phrases) 
    stage3_completed: boolean; // Full translation & lemmatisation
  };
  lastUpdated: number;
}

export function normalizeLineText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»„“]/g, '');
}

export function generateLineId(text: string): string {
  const normalized = normalizeLineText(text);
  if (!normalized) return 'empty_line';
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `line_${(hash >>> 0).toString(16)}`;
}

export function getCachedTrackData(trackId: string): TrackLyricsData | null {
  const track = sqliteService.getCachedTrack(trackId);
  if (!track) return null;
  if (track.lines) {
    track.lines = track.lines.map((line) => {
      if (!line.lineId) {
        line.lineId = generateLineId(line.original);
      }
      line.lineTextHash = generateLineId(line.original);
      return line;
    });
  }
  return track;
}
type TrackLyricsDataPatch = Omit<Partial<TrackLyricsData>, 'processingStatus'> & {
  processingStatus?: Partial<TrackLyricsData['processingStatus']>;
};

export function saveTrackData(trackId: string, data: TrackLyricsDataPatch) {
  if (data.lines) {
    data.lines = data.lines.map((line) => {
      if (!line.lineId) {
        line.lineId = generateLineId(line.original);
      }
      line.lineTextHash = generateLineId(line.original);
      return line;
    });
  }
  return sqliteService.saveTrackData(trackId, data);
}

export function splitLyricsIntoLines(trackId: string, lyrics: string): LyricsLine[] {
  return lyrics
    .split('\n')
    .map((line, idx) => {
      const trimmed = line.trim();
      const textHash = generateLineId(trimmed);
      return {
        id: `${trackId}:line:${idx}`,
        lineId: textHash,
        lineTextHash: textHash,
        index: idx,
        original: trimmed,
        phrases: []
      };
    });
}

// Keep backward compatibility for now if needed, but we'll migrate App.tsx
export type EnrichedTrack = TrackLyricsData;
export function getCachedLyrics(trackId: string) { return getCachedTrackData(trackId); }
export function saveLyricsToCache(trackId: string, data: any) { return saveTrackData(trackId, data); }

export function clearCachedLyrics(trackId: string) {
  const existing = sqliteService.getCachedTrack(trackId);
  if (existing) {
    const updated = {
      ...existing,
      rawLyrics: '',
      source: null,
      authors: undefined,
      lyricSource: undefined,
      lines: [],
      fullTranslation: undefined,
      processingStatus: {
        ...(existing.processingStatus || {}),
        stage1_completed: false,
        stage3_completed: false,
      },
      lastUpdated: Date.now(),
    };
    sqliteService.saveTrackData(trackId, updated);
  }
}

export function getRecentTracks(): Track[] {
  return sqliteService.getRecentTracks();
}

export function addRecentTrack(track: Track) {
  sqliteService.addRecentTrack(track);
}
