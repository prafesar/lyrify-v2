import { getLanguageCode } from "../lib/languages";

export interface PreparedLyricsLine {
  lineIndex: number;
  lineKey: string;
  text: string;
  blockType?: "intro" | "verse" | "pre_chorus" | "chorus" | "bridge" | "outro" | "unknown";
}

export interface PreparedLyricsInput {
  track: {
    title: string;
    artists: string[];
  };
  targetLanguage: string;
  source: {
    provider: string;
    url?: string | null;
    authors?: string[] | null;
  } | null;
  lines: PreparedLyricsLine[];
}

/**
 * Computes a stable, synchronous 32-bit FNV-1a hash formatted as an 8-character hex string.
 */
export function computeStableHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Normalizes a track title by trimming whitespace and stripping trailing meta annotations
 * in parentheses or square brackets (e.g. "(Live)", "[Remastered 2011]").
 */
export function normalizeTrackTitle(title: string): string {
  return title
    .replace(/\s*[([][^\])]*(?:live|remaster|edit|version|mono|stereo|single|mix|acoustic|remix|bonus|recording|session|deluxe|anniversary|digitally|feat|featuring|with|prod|\d{4})[^\])]*[\])]\s*$/gi, "")
    .trim();
}

/**
 * Normalizes a list of artists by trimming, lowercasing, sorting alphabetically,
 * and filtering out empty strings to ensure a stable comparison / lookup key.
 */
export function normalizeArtists(artists: string[]): string[] {
  return [...artists]
    .map(a => a.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

/**
 * Cleans and normalizes a single lyrics line by:
 * - Removing LRC/LRC-like timestamps (e.g. [00:12.34], [01:05])
 * - Removing section markers (e.g. [Verse 1], [Chorus], (Bridge))
 * - Collapsing multiple consecutive spaces into a single space
 * - Trimming leading/trailing whitespace
 */
export function normalizeLyricsLine(lineText: string): string {
  let clean = lineText.trim();
  // Remove timestamps
  clean = clean.replace(/\[\d{2,}:\d{2}(?:\.\d{2,3})?\]/g, "");
  // Remove bracketed/parenthesized section markers
  clean = clean.replace(/^\[(?:verse|chorus|bridge|intro|outro|pre-chorus|hook|solo|transition|interlude)(?:\s+\d+)?\]$/gi, "");
  clean = clean.replace(/^\((?:verse|chorus|bridge|intro|outro|pre-chorus|hook|solo|transition|interlude)(?:\s+\d+)?\)$/gi, "");
  // Normalize whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

/**
 * Computes a stable lineKey for matching across translation/explanation caches.
 */
export function computeLineKey(lineText: string): string {
  const normalized = normalizeLyricsLine(lineText).toLowerCase();
  return computeStableHash(normalized);
}

/**
 * Infers block type based on lines containing section markers or tags.
 */
export function inferBlockType(lineText: string): PreparedLyricsLine["blockType"] {
  const t = lineText.trim().toLowerCase();
  if (t.includes("intro")) return "intro";
  if (t.includes("outro")) return "outro";
  if (t.includes("chorus")) return "chorus";
  if (t.includes("pre-chorus") || t.includes("pre_chorus")) return "pre_chorus";
  if (t.includes("bridge")) return "bridge";
  if (t.includes("verse")) return "verse";
  return undefined;
}

/**
 * Parses raw lyrics text into structured PreparedLyricsLine arrays, excluding empty/only-whitespace lines
 * and handling inline metadata/block transitions if any.
 */
export function parseRawLyrics(lyricsText: string): PreparedLyricsLine[] {
  const lines = lyricsText.split(/\r?\n/);
  const result: PreparedLyricsLine[] = [];
  let currentBlockType: PreparedLyricsLine["blockType"] = undefined;
  let activeIndex = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Detect if this line is a section marker (to update the active block type for lines following it)
    const isMarker = /^\[(?:verse|chorus|bridge|intro|outro|pre-chorus|hook|solo|transition|interlude)(?:\s+\d+)?\]$/i.test(trimmed) ||
                     /^\((?:verse|chorus|bridge|intro|outro|pre-chorus|hook|solo|transition|interlude)(?:\s+\d+)?\)$/i.test(trimmed);

    if (isMarker) {
      currentBlockType = inferBlockType(trimmed) || currentBlockType;
      // We skip adding pure section header lines to the lyrics payload to reduce noise
      continue;
    }

    const cleanLine = normalizeLyricsLine(rawLine);
    if (!cleanLine) continue;

    const lineKey = computeLineKey(rawLine);
    result.push({
      lineIndex: activeIndex++,
      lineKey,
      text: cleanLine,
      blockType: currentBlockType || "unknown",
    });
  }

  return result;
}

/**
 * High-level utility to prepare the canonical PreparedLyricsInput payload.
 */
export function prepareLyricsInput(
  title: string,
  artists: string[],
  rawLyrics: string,
  targetLanguage: string,
  sourceInfo: PreparedLyricsInput["source"] = null
): PreparedLyricsInput {
  const cleanTitle = normalizeTrackTitle(title);
  const cleanArtists = normalizeArtists(artists);
  const structuredLines = parseRawLyrics(rawLyrics);

  return {
    track: {
      title: cleanTitle,
      artists: cleanArtists,
    },
    targetLanguage: getLanguageCode(targetLanguage),
    source: sourceInfo,
    lines: structuredLines,
  };
}

/**
 * Helper to match a translation result for a specific line.
 * Prioritizes lineKey matching, falls back to raw line content (using original or originalText),
 * and finally falls back to line index.
 */
export function findMatchedTranslation(
  lineOriginal: string,
  index: number,
  translationsResult: any[]
): any | undefined {
  if (!translationsResult || translationsResult.length === 0) return undefined;
  const targetLineKey = computeLineKey(lineOriginal);
  return (
    translationsResult.find((t: any) => t.lineKey === targetLineKey) ||
    translationsResult.find((t: any) => (t.original || t.originalText) === lineOriginal) ||
    translationsResult[index]
  );
}
