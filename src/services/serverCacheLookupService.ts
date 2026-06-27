import { normalizeTrackTitle, normalizeArtists } from "./lyricsPreprocessor";
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

export function computeLyricsKey(title: string, artists: string[]): string {
  const cleanTitle = normalizeTrackTitle(title);
  const cleanArtists = normalizeArtists(artists);
  return `track-${cleanArtists.join("-")}-${cleanTitle.replace(/\s+/g, "-")}`.toLowerCase();
}

export async function checkServerCache(
  title: string,
  artists: string[]
): Promise<ServerCacheLookupResult | null> {
  try {
    const lyricsKey = computeLyricsKey(title, artists);
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
