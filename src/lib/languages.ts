export interface Language {
  code: string;        // lowercase ISO 639-1 code
  displayName: string; // English full name
  name: string;        // For backward compatibility (alias of displayName)
  locale: string;      // best default BCP-47 locale
  resourceLevel: 'high' | 'experimental';
}

export const ALL_LANGUAGES: Language[] = [
  { code: 'en', displayName: 'English', name: 'English', locale: 'en-US', resourceLevel: 'high' },
  { code: 'es', displayName: 'Spanish', name: 'Spanish', locale: 'es-ES', resourceLevel: 'high' },
  { code: 'ru', displayName: 'Russian', name: 'Russian', locale: 'ru-RU', resourceLevel: 'high' },
  { code: 'fr', displayName: 'French', name: 'French', locale: 'fr-FR', resourceLevel: 'high' },
  { code: 'de', displayName: 'German', name: 'German', locale: 'de-DE', resourceLevel: 'high' },
  { code: 'pl', displayName: 'Polish', name: 'Polish', locale: 'pl-PL', resourceLevel: 'high' },
  { code: 'ja', displayName: 'Japanese', name: 'Japanese', locale: 'ja-JP', resourceLevel: 'high' },
  { code: 'ko', displayName: 'Korean', name: 'Korean', locale: 'ko-KR', resourceLevel: 'high' },
  { code: 'zh', displayName: 'Mandarin Chinese', name: 'Mandarin Chinese', locale: 'zh-CN', resourceLevel: 'high' },
  
  // Additional high resource or popular languages
  { code: 'it', displayName: 'Italian', name: 'Italian', locale: 'it-IT', resourceLevel: 'high' },
  { code: 'pt', displayName: 'Portuguese', name: 'Portuguese', locale: 'pt-PT', resourceLevel: 'high' },
  { code: 'ar', displayName: 'Arabic', name: 'Arabic', locale: 'ar-SA', resourceLevel: 'high' },
  { code: 'hi', displayName: 'Hindi', name: 'Hindi', locale: 'hi-IN', resourceLevel: 'high' },

  // Experimental / Rare languages
  { code: 'lt', displayName: 'Lithuanian', name: 'Lithuanian', locale: 'lt-LT', resourceLevel: 'experimental' },
  { code: 'id', displayName: 'Indonesian', name: 'Indonesian', locale: 'id-ID', resourceLevel: 'experimental' },
  { code: 'bn', displayName: 'Bengali', name: 'Bengali', locale: 'bn-BD', resourceLevel: 'experimental' },
  { code: 'vi', displayName: 'Vietnamese', name: 'Vietnamese', locale: 'vi-VN', resourceLevel: 'experimental' },
  { code: 'ur', displayName: 'Urdu', name: 'Urdu', locale: 'ur-PK', resourceLevel: 'experimental' },
  { code: 'sv', displayName: 'Swedish', name: 'Swedish', locale: 'sv-SE', resourceLevel: 'experimental' },
  { code: 'da', displayName: 'Danish', name: 'Danish', locale: 'da-DK', resourceLevel: 'experimental' },
  { code: 'no', displayName: 'Norwegian', name: 'Norwegian', locale: 'nb-NO', resourceLevel: 'experimental' },
  { code: 'fi', displayName: 'Finnish', name: 'Finnish', locale: 'fi-FI', resourceLevel: 'experimental' },
  { code: 'tr', displayName: 'Turkish', name: 'Turkish', locale: 'tr-TR', resourceLevel: 'experimental' },
  { code: 'nl', displayName: 'Dutch', name: 'Dutch', locale: 'nl-NL', resourceLevel: 'experimental' },
  { code: 'uk', displayName: 'Ukrainian', name: 'Ukrainian', locale: 'uk-UA', resourceLevel: 'experimental' },
  { code: 'el', displayName: 'Greek', name: 'Greek', locale: 'el-GR', resourceLevel: 'experimental' },
  { code: 'he', displayName: 'Hebrew', name: 'Hebrew', locale: 'he-IL', resourceLevel: 'experimental' },
  { code: 'cs', displayName: 'Czech', name: 'Czech', locale: 'cs-CZ', resourceLevel: 'experimental' },
  { code: 'hu', displayName: 'Hungarian', name: 'Hungarian', locale: 'hu-HU', resourceLevel: 'experimental' },
  { code: 'ro', displayName: 'Romanian', name: 'Romanian', locale: 'ro-RO', resourceLevel: 'experimental' },
  { code: 'sk', displayName: 'Slovak', name: 'Slovak', locale: 'sk-SK', resourceLevel: 'experimental' },
  { code: 'bg', displayName: 'Bulgarian', name: 'Bulgarian', locale: 'bg-BG', resourceLevel: 'experimental' },
  { code: 'hr', displayName: 'Croatian', name: 'Croatian', locale: 'hr-HR', resourceLevel: 'experimental' },
  { code: 'sr', displayName: 'Serbian', name: 'Serbian', locale: 'sr-RS', resourceLevel: 'experimental' },
  { code: 'sl', displayName: 'Slovenian', name: 'Slovenian', locale: 'sl-SI', resourceLevel: 'experimental' },
  { code: 'et', displayName: 'Estonian', name: 'Estonian', locale: 'et-EE', resourceLevel: 'experimental' },
  { code: 'lv', displayName: 'Latvian', name: 'Latvian', locale: 'lv-LV', resourceLevel: 'experimental' },
  { code: 'th', displayName: 'Thai', name: 'Thai', locale: 'th-TH', resourceLevel: 'experimental' },
  { code: 'ms', displayName: 'Malay', name: 'Malay', locale: 'ms-MY', resourceLevel: 'experimental' },
  { code: 'fa', displayName: 'Persian', name: 'Persian', locale: 'fa-IR', resourceLevel: 'experimental' },
];

export const SUPPORTED_LANGUAGES: Language[] = ALL_LANGUAGES.filter(
  (l) => l.resourceLevel === 'high'
);

export const HIGH_RESOURCE_LANGUAGES: Language[] = ALL_LANGUAGES.filter(
  (l) => l.resourceLevel === 'high'
);

export function getLanguageByCode(code: string): Language | undefined {
  if (!code) return undefined;
  const lower = code.toLowerCase();
  return ALL_LANGUAGES.find((l) => l.code === lower);
}

export function getLanguageByName(name: string): Language | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return ALL_LANGUAGES.find(
    (l) => l.displayName.toLowerCase() === lower || l.name.toLowerCase() === lower
  );
}

export function getLocaleByCode(code: string): string {
  const found = getLanguageByCode(code);
  return found?.locale || 'en-US';
}

export function getLocaleByName(name: string): string {
  const found = getLanguageByName(name);
  return found?.locale || 'en-US';
}

export function getLocale(langStr: string | null | undefined): string {
  const code = normalizeLanguageCode(langStr);
  if (code) {
    return getLocaleByCode(code);
  }
  return 'en-US';
}

export function getLanguageCode(lang: string | null | undefined): string {
  if (!lang) return 'en';
  const code = normalizeLanguageCode(lang);
  return code || 'en';
}

export function normalizeLanguageCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  const found = ALL_LANGUAGES.find(
    (l) =>
      l.displayName.toLowerCase() === trimmed ||
      l.code.toLowerCase() === trimmed ||
      l.name.toLowerCase() === trimmed
  );
  if (found) {
    return found.code;
  }
  if (trimmed.length === 2) {
    return trimmed;
  }
  return null;
}

export function getLanguageDisplayName(value: string | null | undefined): string {
  if (!value) return 'English';
  const code = normalizeLanguageCode(value);
  if (!code) {
    const trimmed = value.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
  const found = getLanguageByCode(code);
  if (found) {
    return found.displayName;
  }
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function sameLanguage(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const normA = normalizeLanguageCode(a);
  const normB = normalizeLanguageCode(b);
  if (normA && normB) {
    return normA === normB;
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isHighResourceLanguage(value: string | null | undefined): boolean {
  if (!value) return false;
  const code = normalizeLanguageCode(value);
  if (!code) return false;
  const found = getLanguageByCode(code);
  return found?.resourceLevel === 'high';
}

export function isExperimentalLanguage(value: string | null | undefined): boolean {
  if (!value) return false;
  const code = normalizeLanguageCode(value);
  if (!code) return true; // Unknown is experimental by default
  const found = getLanguageByCode(code);
  return found ? found.resourceLevel === 'experimental' : true;
}

export function detectDominantLanguage(
  lines: Array<{ original: string; language?: string }>
): string | null {
  if (!lines || lines.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const line of lines) {
    if (!line.original || !line.original.trim()) continue;
    if (!line.language) continue;
    const code = normalizeLanguageCode(line.language);
    if (!code) continue;
    counts[code] = (counts[code] || 0) + 1;
  }

  let dominantCode: string | null = null;
  let maxCount = 0;
  for (const [code, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantCode = code;
    }
  }

  return dominantCode;
}

export function cascadeTrackLanguageUpdate(
  track: any,
  oldLang: string,
  newLang: string
): any {
  const oldLangCode = normalizeLanguageCode(oldLang);
  const newLangCode = normalizeLanguageCode(newLang);

  if (!oldLangCode || !newLangCode || oldLangCode === newLangCode) {
    return {
      ...track,
      sourceLanguage: newLangCode || track.sourceLanguage
    };
  }

  const updatedLines = (track.lines || []).map((line: any) => {
    const updatedLine = { ...line };
    const lineLangCode = normalizeLanguageCode(line.language);
    
    if (lineLangCode && lineLangCode === oldLangCode) {
      updatedLine.language = newLangCode;
    }

    if (Array.isArray(line.phrases)) {
      updatedLine.phrases = line.phrases.map((phrase: any) => {
        const phraseLangCode = normalizeLanguageCode(phrase.language);
        if (phraseLangCode && phraseLangCode === oldLangCode) {
          return { ...phrase, language: newLangCode };
        }
        return phrase;
      });
    }

    return updatedLine;
  });

  const updatedPhrases = Array.isArray(track.phrases)
    ? track.phrases.map((p: any) => {
        const phraseLangCode = normalizeLanguageCode(p.language);
        if (phraseLangCode && phraseLangCode === oldLangCode) {
          return { ...p, language: newLangCode };
        }
        return p;
      })
    : track.phrases;

  return {
    ...track,
    sourceLanguage: newLangCode,
    lines: updatedLines,
    phrases: updatedPhrases
  };
}
