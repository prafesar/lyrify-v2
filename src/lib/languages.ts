
export interface Language {
  name: string;
  code: string;
  locale: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { name: 'English', code: 'EN', locale: 'en-US' },
  { name: 'Mandarin Chinese', code: 'ZH', locale: 'zh-CN' },
  { name: 'Spanish', code: 'ES', locale: 'es-ES' },
  { name: 'Hindi', code: 'HI', locale: 'hi-IN' },
  { name: 'Arabic', code: 'AR', locale: 'ar-SA' },
  { name: 'French', code: 'FR', locale: 'fr-FR' },
  { name: 'Portuguese', code: 'PT', locale: 'pt-PT' },
  { name: 'Russian', code: 'RU', locale: 'ru-RU' },
  { name: 'German', code: 'DE', locale: 'de-DE' },
  { name: 'Japanese', code: 'JA', locale: 'ja-JP' },
  { name: 'Korean', code: 'KO', locale: 'ko-KR' },
  { name: 'Italian', code: 'IT', locale: 'it-IT' },
  { name: 'Indonesian', code: 'ID', locale: 'id-ID' },
  { name: 'Bengali', code: 'BN', locale: 'bn-BD' },
  { name: 'Vietnamese', code: 'VI', locale: 'vi-VN' },
  { name: 'Urdu', code: 'UR', locale: 'ur-PK' },
  { name: 'Swedish', code: 'SV', locale: 'sv-SE' },
  { name: 'Danish', code: 'DA', locale: 'da-DK' },
  { name: 'Norwegian', code: 'NO', locale: 'nb-NO' },
  { name: 'Finnish', code: 'FI', locale: 'fi-FI' },
  { name: 'Polish', code: 'PL', locale: 'pl-PL' },
];

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.code === code);
}

export function getLanguageByName(name: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(l => l.name === name);
}

export function getLocaleByName(name: string): string {
  return getLanguageByName(name)?.locale || 'en-US';
}

export function getLanguageCode(lang: string): string {
  if (!lang) return 'en';
  const trimmed = lang.trim().toLowerCase();
  if (trimmed === 'english' || trimmed === 'en') return 'en';
  if (trimmed === 'spanish' || trimmed === 'es') return 'es';
  if (trimmed === 'russian' || trimmed === 'ru') return 'ru';
  if (trimmed === 'polish' || trimmed === 'pl') return 'pl';
  
  const found = SUPPORTED_LANGUAGES.find(
    l => l.name.toLowerCase() === trimmed || l.code.toLowerCase() === trimmed
  );
  if (found) {
    return found.code.toLowerCase();
  }
  return 'en';
}

export function normalizeLanguageCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'en' || trimmed === 'english') return 'en';
  if (trimmed === 'es' || trimmed === 'spanish') return 'es';
  if (trimmed === 'ru' || trimmed === 'russian') return 'ru';
  if (trimmed === 'pl' || trimmed === 'polish') return 'pl';

  const found = SUPPORTED_LANGUAGES.find(
    l => l.name.toLowerCase() === trimmed || l.code.toLowerCase() === trimmed
  );
  if (found) {
    return found.code.toLowerCase();
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
    return value.trim().charAt(0).toUpperCase() + value.trim().slice(1).toLowerCase();
  }
  const found = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === code.toLowerCase());
  if (found) {
    return found.name;
  }
  const codeLower = code.toLowerCase();
  if (codeLower === 'en') return 'English';
  if (codeLower === 'es') return 'Spanish';
  if (codeLower === 'ru') return 'Russian';
  if (codeLower === 'fr') return 'French';
  if (codeLower === 'pl') return 'Polish';
  if (codeLower === 'de') return 'German';
  if (codeLower === 'it') return 'Italian';
  if (codeLower === 'ja') return 'Japanese';
  if (codeLower === 'ko') return 'Korean';
  if (codeLower === 'zh') return 'Mandarin Chinese';
  return value;
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

export function detectDominantLanguage(lines: Array<{ original: string; language?: string }>): string | null {
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

  if (dominantCode) {
    return getLanguageDisplayName(dominantCode);
  }
  return null;
}

export function cascadeTrackLanguageUpdate(
  track: any,
  oldLangName: string,
  newLangName: string
): any {
  const oldLangCode = normalizeLanguageCode(oldLangName);
  const newLangCode = normalizeLanguageCode(newLangName);

  if (!oldLangCode || !newLangCode || oldLangCode === newLangCode) {
    return {
      ...track,
      sourceLanguage: newLangName
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
    sourceLanguage: newLangName,
    lines: updatedLines,
    phrases: updatedPhrases
  };
}


