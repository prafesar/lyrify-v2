import { userPreferencesRepository } from "../application/adapters/browserUserDataRepository";

export interface ServerCacheLookupResult {
  hasTranslation: boolean;
  hasLecture: boolean;
  translation: Array<{
    lineKey: string;
    lineIndex: number;
    original: string;
    translation: string;
    language: string;
    blockType?: string;
  }> | null;
  lectureBlocks: any[] | null;
}

export function normalizeString(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s']/gu, '');
}

export async function computeSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function computeLyricsKey(title: string, artists: string[]): Promise<string> {
  const normTitle = normalizeString(title);
  const artistsArray = Array.isArray(artists) ? artists : [artists as any as string];
  const normArtists = artistsArray
    .map(a => normalizeString(a))
    .filter(Boolean)
    .sort();
  
  const combined = [normTitle, ...normArtists].join('|');
  return await computeSHA256(combined);
}

export async function checkServerCache(
  title: string,
  artists: string[]
): Promise<ServerCacheLookupResult | null> {
  try {
    const lyricsKey = await computeLyricsKey(title, artists);
    const url = `https://api.cantolex.com/api/v1/tracks/cached?lyricsKey=${encodeURIComponent(lyricsKey)}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (json.status !== "success" || !json.data) {
      return null;
    }

    const data = json.data;
    const variant = userPreferencesRepository.getPreference("lyrify_lecture_variant", "compact");
    
    const hasTranslation = Array.isArray(data.translation) && data.translation.length > 0;
    
    let lectureBlocks: any[] | null = null;
    if (variant === "rich" && Array.isArray(data.lectureRich) && data.lectureRich.length > 0) {
      lectureBlocks = data.lectureRich;
    } else if (variant === "compact" && Array.isArray(data.lectureCompact) && data.lectureCompact.length > 0) {
      lectureBlocks = data.lectureCompact;
    }

    const hasLecture = lectureBlocks !== null && lectureBlocks.length > 0;

    return {
      hasTranslation,
      hasLecture,
      translation: data.translation,
      lectureBlocks,
    };
  } catch (error) {
    console.warn("[ServerCacheLookup] Failed preflight cache lookup:", error);
    return null;
  }
}
