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

export interface LanguageLocalizedNames {
  native: string;
  en: string;
  ru: string;
  es: string;
  de: string;
  fr: string;
  it: string;
  zh: string;
}

export const LOCALIZED_LANGUAGES: Record<string, LanguageLocalizedNames> = {
  en: { native: 'English', en: 'English', ru: 'Английский', es: 'Inglés', de: 'Englisch', fr: 'Anglais', it: 'Inglese', zh: '英语' },
  es: { native: 'Español', en: 'Spanish', ru: 'Испанский', es: 'Español', de: 'Spanisch', fr: 'Espagnol', it: 'Spagnolo', zh: '西班牙语' },
  ru: { native: 'Русский', en: 'Russian', ru: 'Русский', es: 'Ruso', de: 'Russisch', fr: 'Russe', it: 'Russo', zh: '俄语' },
  fr: { native: 'Français', en: 'French', ru: 'Французский', es: 'Francés', de: 'Französisch', fr: 'Français', it: 'Francese', zh: '法语' },
  de: { native: 'Deutsch', en: 'German', ru: 'Немецкий', es: 'Alemán', de: 'Deutsch', fr: 'Allemand', it: 'Tedesco', zh: '德语' },
  pl: { native: 'Polski', en: 'Polish', ru: 'Польский', es: 'Polaco', de: 'Polnisch', fr: 'Polonais', it: 'Polacco', zh: '波兰语' },
  ja: { native: '日本語', en: 'Japanese', ru: 'Японский', es: 'Japonés', de: 'Japanisch', fr: 'Japonais', it: 'Giapponese', zh: '日语' },
  ko: { native: '한국어', en: 'Korean', ru: 'Корейский', es: 'Coreano', de: 'Koreanisch', fr: 'Coréen', it: 'Coreano', zh: '韩语' },
  zh: { native: '中文', en: 'Mandarin Chinese', ru: 'Китайский (мандарин)', es: 'Chino mandarín', de: 'Mandarin-Chinesisch', fr: 'Chinois mandarin', it: 'Cinese mandarino', zh: '中文（普通话）' },
  it: { native: 'Italiano', en: 'Italian', ru: 'Итальянский', es: 'Italiano', de: 'Italienisch', fr: 'Italien', it: 'Italiano', zh: '意大利语' },
  pt: { native: 'Português', en: 'Portuguese', ru: 'Португальский', es: 'Portugués', de: 'Portugiesisch', fr: 'Portugais', it: 'Portoghese', zh: '葡萄牙语' },
  ar: { native: 'العربية', en: 'Arabic', ru: 'Арабский', es: 'Árabe', de: 'Arabisch', fr: 'Arabe', it: 'Arabo', zh: '阿拉伯语' },
  hi: { native: 'हिन्दी', en: 'Hindi', ru: 'Хинди', es: 'Hindi', de: 'Hindi', fr: 'Hindi', it: 'Hindi', zh: '印地语' },
  lt: { native: 'Lietuvių', en: 'Lithuanian', ru: 'Литовский', es: 'Lituano', de: 'Litauisch', fr: 'Lituanien', it: 'Lituano', zh: '立陶宛语' },
  id: { native: 'Bahasa Indonesia', en: 'Indonesian', ru: 'Индонезийский', es: 'Indonesio', de: 'Indonesisch', fr: 'Indonésien', it: 'Indonesiano', zh: '印尼语' },
  bn: { native: 'বাংলা', en: 'Bengali', ru: 'Бенгальский', es: 'Bengalí', de: 'Bengalisch', fr: 'Bengali', it: 'Bengalese', zh: '孟加拉语' },
  vi: { native: 'Tiếng Việt', en: 'Vietnamese', ru: 'Вьетнамский', es: 'Vietnamita', de: 'Vietnamesisch', fr: 'Vietnamien', it: 'Vietnamita', zh: '越南语' },
  ur: { native: 'اردو', en: 'Urdu', ru: 'Урду', es: 'Urdu', de: 'Urdu', fr: 'Ourdou', it: 'Urdu', zh: '乌尔都语' },
  sv: { native: 'Svenska', en: 'Swedish', ru: 'Шведский', es: 'Sueco', de: 'Schwedisch', fr: 'Suédois', it: 'Svedese', zh: '瑞典语' },
  da: { native: 'Dansk', en: 'Danish', ru: 'Датский', es: 'Danés', de: 'Dänisch', fr: 'Danois', it: 'Danese', zh: '丹麦语' },
  no: { native: 'Norsk', en: 'Norwegian', ru: 'Норвежский', es: 'Noruego', de: 'Norwegisch', fr: 'Norvégien', it: 'Norvegese', zh: '挪威语' },
  fi: { native: 'Suomi', en: 'Finnish', ru: 'Финский', es: 'Finlandés', de: 'Finnisch', fr: 'Finnois', it: 'Finlandese', zh: '芬兰语' },
  tr: { native: 'Türkçe', en: 'Turkish', ru: 'Turco', es: 'Turco', de: 'Türkisch', fr: 'Turc', it: 'Turco', zh: '土耳其语' },
  nl: { native: 'Nederlands', en: 'Dutch', ru: 'Нидерландский', es: 'Neerlandés', de: 'Niederländisch', fr: 'Néerlandais', it: 'Olandese', zh: '荷兰语' },
  uk: { native: 'Українська', en: 'Ukrainian', ru: 'Украинский', es: 'Ucraniano', de: 'Ukrainisch', fr: 'Ukrainien', it: 'Ucraino', zh: '乌克兰语' },
  el: { native: 'Ελληνικά', en: 'Greek', ru: 'Греческий', es: 'Griego', de: 'Griechisch', fr: 'Grec', it: 'Greco', zh: '希腊语' },
  he: { native: 'עברית', en: 'Hebrew', ru: 'Иврит', es: 'Hebreo', de: 'Hebräisch', fr: 'Hébreu', it: 'Ebraico', zh: '希伯来语' },
  cs: { native: 'Čeština', en: 'Czech', ru: 'Чешский', es: 'Checo', de: 'Tschechisch', fr: 'Tchèque', it: 'Ceco', zh: '捷克语' },
  hu: { native: 'Magyar', en: 'Hungarian', ru: 'Венгерский', es: 'Húngaro', de: 'Ungarisch', fr: 'Hongrois', it: 'Ungherese', zh: '匈牙利语' },
  ro: { native: 'Română', en: 'Romanian', ru: 'Румынский', es: 'Rumano', de: 'Rumänisch', fr: 'Roumain', it: 'Rumeno', zh: '罗马尼亚语' },
  sk: { native: 'Slovenčina', en: 'Slovak', ru: 'Словацкий', es: 'Eslovaco', de: 'Slowakisch', fr: 'Slovaque', it: 'Slovacco', zh: '斯洛伐克语' },
  bg: { native: 'Български', en: 'Bulgarian', ru: 'Болгарский', es: 'Búlgaro', de: 'Bulgarisch', fr: 'Bulgare', it: 'Bulgaro', zh: '保加利亚语' },
  hr: { native: 'Hrvatski', en: 'Croatian', ru: 'Хорватский', es: 'Croata', de: 'Kroatisch', fr: 'Croate', it: 'Croato', zh: '克罗地亚语' },
  sr: { native: 'Српски', en: 'Serbian', ru: 'Сербский', es: 'Serbio', de: 'Serbisch', fr: 'Serbe', it: 'Serbo', zh: '塞尔维亚语' },
  sl: { native: 'Slovenščina', en: 'Slovenian', ru: 'Словенский', es: 'Esloveno', de: 'Slowenisch', fr: 'Slovène', it: 'Sloveno', zh: '斯洛文尼亚语' },
  et: { native: 'Eesti', en: 'Estonian', ru: 'Эстонский', es: 'Estonio', de: 'Estnisch', fr: 'Estonien', it: 'Estone', zh: '爱沙尼亚语' },
  lv: { native: 'Latviešu', en: 'Latvian', ru: 'Латышский', es: 'Letón', de: 'Lettisch', fr: 'Letton', it: 'Lettone', zh: '拉脱维亚语' },
  th: { native: 'ไทย', en: 'Thai', ru: 'Тайский', es: 'Tailandés', de: 'Thailändisch', fr: 'Thaïlandais', it: 'Tailandese', zh: '泰语' },
  ms: { native: 'Bahasa Melayu', en: 'Malay', ru: 'Малайский', es: 'Malayo', de: 'Malaiisch', fr: 'Malais', it: 'Malese', zh: '马来语' },
  fa: { native: 'فارسی', en: 'Persian', ru: 'Persian', es: 'Persa', de: 'Persisch', fr: 'Persan', it: 'Persiano', zh: '波斯语' }
};

export function getLocalizedLanguageName(code: string | null | undefined, uiLanguage: string): string {
  if (!code) return 'English';
  const norm = normalizeLanguageCode(code) || 'en';
  const loc = LOCALIZED_LANGUAGES[norm];
  if (!loc) {
    return getLanguageDisplayName(code);
  }
  return loc[uiLanguage as keyof LanguageLocalizedNames] || loc.en;
}

export function getNativeLanguageName(code: string | null | undefined): string {
  if (!code) return 'English';
  const norm = normalizeLanguageCode(code) || 'en';
  return LOCALIZED_LANGUAGES[norm]?.native || getLanguageDisplayName(code);
}
