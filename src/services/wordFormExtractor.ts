import { ExtractedWordFormWithCount } from "../constants";

export class WordFormExtractor {
  /**
   * Cleans leading and trailing punctuation from a token.
   * Keeps internal punctuation like hyphens and apostrophes.
   */
  public static cleanToken(token: string): string {
    if (!token) return "";
    // Trim leading non-alphabetic/non-numeric characters across different languages using Unicode property escapes
    let cleaned = token.replace(/^[^\p{L}\p{N}]+/u, "");
    // Trim trailing non-alphabetic/non-numeric characters
    cleaned = cleaned.replace(/[^\p{L}\p{N}]+$/u, "");
    return cleaned;
  }

  /**
   * Extracts unique word forms with counts from raw lyrics text.
   */
  public static extractWordForms(lyrics: string, language: string = "en"): ExtractedWordFormWithCount[] {
    if (!lyrics) return [];

    const normalizedLang = (language || "en").toLowerCase();
    const words = lyrics.split(/\s+/);
    const countsMap = new Map<string, { surface: string; count: number }>();

    for (const rawWord of words) {
      const cleaned = this.cleanToken(rawWord);
      if (!cleaned) continue;

      const normalized = cleaned.toLowerCase();
      const existing = countsMap.get(normalized);
      if (existing) {
        existing.count += 1;
        // If we encounter a form that is lowercase or capitalized differently, we can prefer
        // keeping the first or the most standard one. Here, if the current cleaned version matches
        // normalized (i.e. is already lowercase), we prefer to save that as surface.
        if (cleaned === normalized) {
          existing.surface = cleaned;
        }
      } else {
        countsMap.set(normalized, {
          surface: cleaned,
          count: 1
        });
      }
    }

    const result: ExtractedWordFormWithCount[] = [];
    for (const [normalized, info] of countsMap.entries()) {
      result.push({
        surface: info.surface,
        normalizedSurface: normalized,
        language: normalizedLang,
        count: info.count
      });
    }

    return result;
  }
}
