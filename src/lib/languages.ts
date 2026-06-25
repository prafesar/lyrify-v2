
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
