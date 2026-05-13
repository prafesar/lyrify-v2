
export interface Language {
  name: string;
  code: string;
  locale: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { name: 'English', code: 'EN', locale: 'en-US' },
  { name: 'Russian', code: 'RU', locale: 'ru-RU' },
  { name: 'Spanish', code: 'ES', locale: 'es-ES' },
  { name: 'French', code: 'FR', locale: 'fr-FR' },
  { name: 'German', code: 'DE', locale: 'de-DE' },
  { name: 'Japanese', code: 'JA', locale: 'ja-JP' },
  { name: 'Polish', code: 'PL', locale: 'pl-PL' },
  { name: 'Italian', code: 'IT', locale: 'it-IT' },
  { name: 'Portuguese', code: 'PT', locale: 'pt-PT' },
  { name: 'Chinese', code: 'ZH', locale: 'zh-CN' },
  { name: 'Korean', code: 'KO', locale: 'ko-KR' },
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
