import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { TrackLyricsData } from "./musicService";

export enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
  NULL = "NULL",
}

async function callGeminiApi(params: { model: string; contents: any; config?: any }) {
  const modelToUse = params.model === "gemini-2.5-flash" ? "gemini-3.5-flash" : params.model;
  
  let lastError: any = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch("/api/gemini/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...params, model: modelToUse })
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      if (!response.ok || !isJson) {
        const errText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errText);
        } catch {
          const trimmerText = errText.trim().toLowerCase();
          if (
            trimmerText.startsWith("<") || 
            trimmerText.includes("<!doctype") || 
            trimmerText.includes("<html") || 
            response.status === 504 || 
            response.status === 502
          ) {
            throw new Error("The AI service is temporarily unavailable (high traffic or timeout). Please try again in a few moments.");
          }
          throw new Error(errText || `Server returned status ${response.status}`);
        }
        throw new Error(parsedError?.error || parsedError?.message || errText || "Request failed");
      }
      return await response.json();
    } catch (err: any) {
      lastError = err;
      console.warn(`[callGeminiApi] Attempt ${attempt} failed:`, err.message || err);
      if (attempt < maxAttempts) {
        // Sleep for a short duration before trying again
        const delay = attempt === 1 ? 1200 : 2500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error("Request to Gemini API failed after multiple attempts.");
}
export const ANALYSIS_PROMPT_VERSION = 3;
export const TRANSLATION_PROMPT_VERSION = 4;

export interface TrackMeaningEntry extends TrackMeaningResult {
  trackKey: string;
  title: string;
  artists: string[];
  albumName?: string;
  albumId?: string;
  artistId?: string;
  coverUrl?: string;
  audioUrl?: string;
  appleMusicUrl?: string;
  itunesId?: number;
  createdAt: any;
  promptVersion: number;
}

// --- Utility Functions for Caching ---

export function normalizeString(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s']/gu, '');
}

async function computeSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function computeTrackKey(title: string, artists: string[]): Promise<string> {
  const normTitle = normalizeString(title);
  const artistsArray = Array.isArray(artists) ? artists : [artists as any as string];
  const normArtists = artistsArray.map(a => normalizeString(a)).sort().join(',');
  return await computeSHA256(`${normTitle}|${normArtists}`);
}

export async function computeLyricsHash(lyrics: string): Promise<string> {
  const normLyrics = (lyrics || '').trim().replace(/\r\n/g, '\n').replace(/\n+/g, '\n');
  return await computeSHA256(normLyrics);
}

// -------------------------------------

export interface TrackMetadata {
  title: string;
  artists: string[];
  albumName?: string;
  albumId?: string;
  artistId?: string;
  coverUrl?: string;
  audioUrl?: string;
  appleMusicUrl?: string;
  itunesId?: number;
}

export interface TrackMeaningResult {
  originalLanguage: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  meanings: {
    en: string;
    es: string;
    ru: string;
    pl: string;
    [key: string]: string;
  };
  promptVersion?: number;
  translationPromptVersion?: number;
  rawLyrics?: string;
  lines?: any[];
}

export async function fetchTrackMeaning(
  lyrics: string,
  metadata: TrackMetadata,
  promptVersion: number = ANALYSIS_PROMPT_VERSION,
  forceRegenerate: boolean = false
): Promise<TrackMeaningResult> {
  const trackKey = await computeTrackKey(metadata.title, metadata.artists);
  const docRef = doc(db, 'track_meanings', trackKey);
  
  if (!forceRegenerate) {
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (
          data.promptVersion === promptVersion &&
          data.meanings &&
          typeof data.meanings.en === 'string' &&
          data.meanings.en.trim().length > 0
        ) {
          return {
            originalLanguage: data.originalLanguage,
            difficulty: data.difficulty,
            meanings: data.meanings,
            promptVersion: data.promptVersion as number,
            rawLyrics: data.rawLyrics || null,
            lines: data.lines || null
          };
        }
      }
    } catch (err) {
      console.error("Firestore read error (track_meanings):", err);
    }
  }

  const prompt = `Role: Expert music analyst and linguist.

Given the lyrics of a song, perform two tasks:

1. Detect the original language of the lyrics. Return the language name in English (e.g., "English", "Spanish", "French", "German", "Russian", etc.).

2. Assess the vocabulary difficulty of the lyrics for a language learner. Choose one of: "beginner", "intermediate", "advanced".

3. Write a concise meaning/summary of the song in four languages: English (en), Spanish (es), Russian (ru), and Polish (pl). Each summary must be 3-4 sentences long. Focus on the core theme, emotional message, and narrative. Do NOT mention the artist's name. Keep the summaries general and about the song's message.

Lyrics:
${lyrics.substring(0, 4000)}

Return a valid JSON object with the following structure exactly:
{
  "originalLanguage": "detected language",
  "difficulty": "beginner|intermediate|advanced",
  "meanings": {
    "en": "meaning in English",
    "es": "meaning in Spanish",
    "ru": "meaning in Russian",
    "pl": "meaning in Polish"
  }
}`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalLanguage: { type: Type.STRING },
            difficulty: { 
              type: Type.STRING, 
              enum: ["beginner", "intermediate", "advanced"] 
            },
            meanings: {
              type: Type.OBJECT,
              properties: {
                en: { type: Type.STRING },
                es: { type: Type.STRING },
                ru: { type: Type.STRING },
                pl: { type: Type.STRING }
              },
              required: ["en", "es", "ru", "pl"]
            }
          },
          required: ["originalLanguage", "difficulty", "meanings"]
        }
      }
    });

    const result = JSON.parse(response.text) as TrackMeaningResult;
    
    // Save to Firestore
    await setDoc(docRef, {
      trackKey,
      title: metadata.title,
      artists: metadata.artists,
      artistId: metadata.artistId || null,
      albumName: metadata.albumName || null,
      albumId: metadata.albumId || null,
      coverUrl: metadata.coverUrl || null,
      audioUrl: metadata.audioUrl || null,
      appleMusicUrl: metadata.appleMusicUrl || null,
      itunesId: metadata.itunesId || null,
      originalLanguage: result.originalLanguage,
      difficulty: result.difficulty,
      meanings: result.meanings,
      promptVersion,
      createdAt: serverTimestamp(),
    });

    return result;
  } catch (error: any) {
    console.error("fetchTrackMeaning error:", error);
    throw new Error(error?.message || "Failed to analyze track meaning. Please try again.", { cause: error });
  }
}

export async function getOriginalLanguage(trackKey: string): Promise<string | null> {
  try {
    const docRef = doc(db, 'track_meanings', trackKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().originalLanguage;
    }
  } catch (err) {
    console.error("getOriginalLanguage error:", err);
  }
  return null;
}

export async function getTrackMeaningFromCache(
  title: string,
  artists: string[],
  targetLanguage?: string,
  promptVersion: number = ANALYSIS_PROMPT_VERSION
): Promise<TrackMeaningResult | null> {
  const trackKey = await computeTrackKey(title, artists);
  const docRef = doc(db, 'track_meanings', trackKey);
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (
        data.promptVersion === promptVersion &&
        data.meanings &&
        typeof data.meanings.en === 'string' &&
        data.meanings.en.trim().length > 0
      ) {
        let rawLyrics = data.rawLyrics || null;
        let lines = data.lines || null;
        const currentTranslationPromptVersion = data.translationPromptVersion || 0;

        // Try to align, repair, or load custom translations using v4 cache if available
        if (rawLyrics) {
          try {
            const lyricsHash = await computeLyricsHash(rawLyrics);
            const v4DocId = `${trackKey}_${lyricsHash}_v${TRANSLATION_PROMPT_VERSION}`;
            const v4DocRef = doc(db, 'line_translations_cache', v4DocId);
            const v4Snap = await getDoc(v4DocRef);

            if (v4Snap.exists()) {
              const v4Data = v4Snap.data();
              const returnedTranslations = v4Data.returnedTranslations || [];
              const transMap = new Map<number, any>();
              for (const item of returnedTranslations) {
                transMap.set(item.index, item);
              }
              const targetLang = targetLanguage || 'English';
              const targetLangCode = getTargetLangCode2Letter(targetLang);
              const originalLines = rawLyrics.split('\n').map((l: string) => l.trim());

              lines = originalLines.map((lineText: string, index: number) => {
                const matched = transMap.get(index);
                return {
                  id: `${trackKey}:line:${index}`,
                  index: index,
                  original: lineText,
                  translation: matched?.translations?.[targetLangCode] || matched?.translations?.['en'] || '',
                  language: matched?.language || 'en',
                  phrases: []
                };
              });
            } else if (!lines || lines.length === 0) {
              // Legacy/v3 fallback if v4 is missing and we don't have lines
              const qTrans = query(
                collection(db, 'line_translations_cache'),
                where('trackKey', '==', trackKey),
                limit(1)
              );
              const transSnap = await getDocs(qTrans);
              if (!transSnap.empty) {
                const transData = transSnap.docs[0].data();
                const uniqueLines = transData.uniqueLines || [];
                const lineOrder = transData.lineOrder || [];
                
                const targetLang = targetLanguage || 'English';
                const targetLangCode = getTargetLangCode2Letter(targetLang);

                const linesText = lineOrder.map((idx: number) => {
                  const item = uniqueLines[idx];
                  return item ? item.originalText : '';
                });
                rawLyrics = linesText.join('\n');

                lines = lineOrder.map((idx: number, index: number) => {
                  const item = uniqueLines[idx];
                  return {
                    id: `${trackKey}:line:${index}`,
                    index: index,
                    original: item?.originalText || '',
                    translation: item?.translations?.[targetLangCode] || item?.translations?.['en'] || '',
                    language: item?.language || 'en',
                    phrases: []
                  };
                });
              }
            } else if (targetLanguage && lines && lines.length > 0) {
              // If lines exist but are legacy and no v4 doc yet, we can do a fallback alignment using legacy cache if present
              const qTrans = query(
                collection(db, 'line_translations_cache'),
                where('trackKey', '==', trackKey),
                limit(1)
              );
              const transSnap = await getDocs(qTrans);
              if (!transSnap.empty) {
                const transData = transSnap.docs[0].data();
                const uniqueLines = transData.uniqueLines || [];
                const lineOrder = transData.lineOrder || [];
                const targetLangCode = getTargetLangCode2Letter(targetLanguage);

                lines = lines.map((line: any, index: number) => {
                  const matchedIdx = lineOrder[index];
                  const item = uniqueLines[matchedIdx];
                  if (item) {
                    return {
                      ...line,
                      translation: item.translations?.[targetLangCode] || item.translations?.['en'] || line.translation || ''
                    };
                  }
                  return line;
                });
              }
            }
          } catch (v4Err) {
            console.error("Error evaluating v4 translation cache in getTrackMeaningFromCache:", v4Err);
          }
        }

        // Attach key phrases if missing from the lines
        if (lines && lines.length > 0) {
          const hasPhrases = lines.some((l: any) => l.phrases && l.phrases.length > 0);
          if (!hasPhrases) {
            const qPhrases = query(
              collection(db, 'phrase_analysis_cache'),
              where('trackKey', '==', trackKey),
              limit(1)
            );
            const phrasesSnap = await getDocs(qPhrases);
            if (!phrasesSnap.empty) {
              const phrasesData = phrasesSnap.docs[0].data();
              const phrases = phrasesData.phrases || [];
              phrases.forEach((p: any) => {
                const line = lines[p.lineIndex];
                if (line) {
                  if (!line.phrases) line.phrases = [];
                  if (!line.phrases.some((existingPhrase: any) => existingPhrase.text === p.text)) {
                    line.phrases.push({
                      id: `${trackKey}:p:${p.text.replace(/\s+/g, '_')}`,
                      text: p.text,
                      translation: p.translation,
                      explanation: p.explanation,
                      language: p.language,
                      lemmas: [],
                      type: 'phrase'
                    });
                  }
                }
              });
            }
          }
        }

        return {
          originalLanguage: data.originalLanguage,
          difficulty: data.difficulty,
          meanings: data.meanings,
          promptVersion: data.promptVersion as number,
          translationPromptVersion: currentTranslationPromptVersion,
          rawLyrics,
          lines
        };
      }
    }
  } catch (err) {
    console.error("Firestore read error (getTrackMeaningFromCache):", err);
  }
  return null;
}

export async function generateSongMeaning(
  lyrics: string,
  artist: string,
  title: string,
  targetLanguage: string,
  metadata?: Partial<TrackMetadata>
): Promise<string> {
  const result = await fetchTrackMeaning(lyrics, { title, artists: [artist], ...metadata });
  
  const langKey = targetLanguage.toLowerCase().trim();
  if (langKey === 'english') return result.meanings.en;
  if (langKey === 'spanish') return result.meanings.es;
  if (langKey === 'russian') return result.meanings.ru;
  if (langKey === 'polish') return result.meanings.pl;
  
  // If it's one of the supported languages but not in the triple-cache, 
  // we might want a fallback or another call, but user only asked for these three en, es, ru.
  return result.meanings.en || "";
}

export async function translateLyrics(lyrics: string, targetLanguage: string) {
  const prompt = `Translate the following song lyrics into ${targetLanguage}. 
Maintain the poetic feel and rhythm where possible. 
IMPORTANT: Return exactly the same number of lines as the input. Each line in the translation MUST correspond to the same line in the original lyrics.
Return ONLY the translated lyrics text without any additional comments.

Lyrics:
${lyrics}`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

export async function extractLyricsMetadata(lyrics: string, artist: string, title: string) {
  const prompt = `Analyze these lyrics for the song "${title}" by "${artist}".
Determine the songwriters/authors if possible.

Lyrics:
${lyrics.substring(0, 2000)}

Return JSON:
{
  "authors": "Name1, Name2...",
  "source_confirmation": "Likely source based on content or metadata"
}
Return ONLY JSON.`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_e) {
        return { authors: null, source_confirmation: null };
      }
    }
    return { authors: null, source_confirmation: null };
  } catch (_error) {
    return { authors: null, source_confirmation: null };
  }
}

export async function generateTrackAnalysis(lyrics: string, artist: string, title: string, targetLanguage: string) {
  const prompt = `Role: You are an expert linguistic analyst and language teacher specializing in song lyrics analysis.
Task: Analyze the song lyrics for "${title}" by "${artist}" to help a language learner understand the meaning, vocabulary, and grammar. 
Provide a deep dive analysis in a strict JSON format.

CRITICAL: All explanations, meanings, translations, and learning priorities MUST be written in ${targetLanguage}. 

Return a JSON object with the following structure:
{
  "meaning": "Overall song theme and emotional context in 2-3 sentences in ${targetLanguage}.",
  "phrases": [
    {
      "phrase": "Meaningful segment (3-6 words, minimum 2 if idiomatic)",
      "translation": "Natural translation into ${targetLanguage}",
      "explanation": "Detailed grammar/idiom/slang note in ${targetLanguage}",
      "isUniversal": true, // true if highly useful in everyday speech
      "learningPriority": "Brief note in ${targetLanguage} explaining why this is beneficial for a learner"
    }
  ],
  "vocabulary": [
    {
      "word": "Single important word (avoid articles unless it's part of a fixed form)",
      "explanation": "Morphology/usage note in ${targetLanguage}"
    }
  ]
}

PHRASE SELECTION RULES:
1. NO SINGLE WORDS: "phrase" must be at least 2 words, preferably 3-6.
2. NO OVERLAP: If a word is part of a selected phrase, do NOT extract it as a separate phrase or a single word in vocabulary.
3. CONVERSATIONAL VALUE: Focus on segments reusable in real-life speech (Idioms, Phrasal Verbs, Collocations).
4. NO FULL LINES: Avoid extracting entire lines unless they are functional idioms (≤5 words).
5. EXACT MATCH: "phrase" and "word" fields MUST be exact substrings from the provided Lyrics text.

QUANTITY & QUALITY:
1. Provide 15-20 significant phrases.
2. Provide 15-20 unique significant words.
3. Mark EXACTLY 3 phrases as "isUniversal": true. These must be the most practical for daily conversation.

Lyrics Text:
${lyrics}

Return ONLY clean JSON.`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meaning: { type: Type.STRING },
            phrases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phrase: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  isUniversal: { type: Type.BOOLEAN },
                  learningPriority: { type: Type.STRING }
                },
                required: ["phrase", "translation", "explanation", "isUniversal", "learningPriority"]
              }
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["word", "explanation"]
              }
            }
          },
          required: ["meaning", "phrases", "vocabulary"]
        }
      }
    });

    const text = response.text;
    return { ...JSON.parse(text), promptVersion: ANALYSIS_PROMPT_VERSION };
  } catch (error) {
    console.error("Structured analysis error:", error);
    throw error;
  }
}

export async function detectLanguage(text: string): Promise<string> {
  const prompt = `Identify the language of the following text. 
Return ONLY the name of the language in English (e.g., "Spanish", "English", "Russian", "Japanese", "French", "German").
If you are unsure, return "English".

Text: ${text.slice(0, 300)}`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Language detection error:", error);
    return "English";
  }
}

export async function explainPhraseStructured(phrase: string, targetLanguage: string) {
  const prompt = `Explain the following foreign phrase in ${targetLanguage}: "${phrase}".
CRITICAL: The explanation MUST be written entirely in ${targetLanguage}.

Return a JSON object:
{
  "translation": "Natural translation",
  "explanation": "Detailed grammar/idiom note"
}

Return ONLY clean JSON.`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["translation", "explanation"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Structured explain phrase error:", error);
    throw error;
  }
}

/**
 * Этап 2: Быстрый анализ смысла и выделение КЛЮЧЕВЫХ фраз (Preview).
 */
export async function generatePhraseAnalysis(
  lyrics: string,
  artist: string,
  title: string,
  targetLanguage: string,
  skipMeaning: boolean = false
) {
  const prompt = `Role: You are an expert linguistic analyst and language teacher.
Analyze lyrics for "${title}" by "${artist}". 
Stage 2: Selecting high-value segments for a learner using ${targetLanguage}.
${skipMeaning ? '' : `Also provide an "meaning" field with overall song context (2-3 sentences) in ${targetLanguage}.`}

Return JSON:
{
  ${skipMeaning ? '' : '"meaning": "...",'}
  "lines": [
    {
      "original": "exact line from lyrics",
      "phrases": [
        { 
          "text": "Meaningful segment (3-6 words, min 2 if idiomatic)", 
          "type": "collocation|idiom|phrasal_verb|cultural_ref|vocabulary|phrase",
          "translation": "Translation in ${targetLanguage}",
          "explanation": "Grammar/idiom note in ${targetLanguage}",
          "isUniversal": true/false,
          "learningPriority": "Brief note if isUniversal is true"
        }
      ]
    }
  ]
}

PHRASE SELECTION RULES:
1. NO SINGLE WORDS: "text" must be at least 2 words, preferably 3-6. 
2. NO REDUNDANCY: Do not extract a phrase if it is entirely contained within another phrase extracted for the same line.
3. NO OVERLAP: Avoid overlapping segments within the same line unless they represent distinct grammatical units.
4. LEARNING VALUE: Choose segments that can be reused in daily conversation.
5. EXACT MATCH: "text" MUST be a direct substring of "original".

- Identify phrases for the 10-15 most pedagogically useful lines.
- All explanations in ${targetLanguage}.

Lyrics:
${lyrics}
`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            meaning: { type: Type.STRING },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  phrases: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        type: { type: Type.STRING },
                        translation: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        isUniversal: { type: Type.BOOLEAN },
                        learningPriority: { type: Type.STRING }
                      },
                      required: ["text", "type", "translation", "explanation", "isUniversal", "learningPriority"]
                    }
                  }
                },
                required: ["original", "phrases"]
              }
            }
          },
          required: skipMeaning ? ["lines"] : ["meaning", "lines"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return { ...result, promptVersion: ANALYSIS_PROMPT_VERSION };
  } catch (error) {
    console.error("Stage 2 Analysis error:", error);
    return { meaning: "", lines: [] };
  }
}

/**
 * Этап 3: Глубокий анализ. Полный перевод всех строк и детальная лемматизация всех фраз.
 */
export async function completeLyricsAnalysis(
  lyrics: string,
  artist: string,
  title: string,
  targetLanguage: string
) {
  const trackKey = await computeTrackKey(title, [artist]);
  const lyricsHash = await computeLyricsHash(lyrics);
  const langKey = targetLanguage.toLowerCase().trim();
  const docId = `${trackKey}_${lyricsHash}_${langKey}_${ANALYSIS_PROMPT_VERSION}`;

  try {
    // Check cache
    const cacheRef = doc(db, 'complete_analysis_cache', docId);
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      console.log(`[Cache Hit] Complete Analysis for ${title} - ${artist}`);
      return cacheSnap.data().result;
    }
  } catch (err) {
    console.error("Cache read error (complete_analysis):", err);
  }

  const prompt = `Role: Expert linguistic analyst.
Perform Stage 3 Deep Analysis of "${title}" by "${artist}". 
For every single line, provide a translation and selective extraction of useful phrases (1-2 per line). Focus on chunks, not single words.

Return JSON:
{
  "lines": [
    {
      "original": "...",
      "translation": "Full line translation in ${targetLanguage}",
      "phrases": [
        {
          "text": "Meaningful segment (3-6 words, min 2 if idiomatic)",
          "lemmas": ["base", "forms"],
          "type": "...",
          "translation": "...",
          "explanation": "..."
        }
      ]
    }
  ]
}

PHRASE SELECTION RULES:
1. NO SINGLE WORDS: "text" must be at least 2 words, preferably 3-6.
2. NO NESTING: If a phrase is part of another extracted phrase in the same line, remove the smaller one.
3. NO OVERLAP: Avoid overlapping segments. One meaningful chunk per part of the line.
4. EXACT MATCH: "text" MUST be an exact substring of "original".

Lyrics:
${lyrics}
`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  phrases: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        lemmas: { type: Type.ARRAY, items: { type: Type.STRING } },
                        type: { type: Type.STRING },
                        translation: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                      },
                      required: ["text", "lemmas", "type", "translation", "explanation"]
                    }
                  }
                },
                required: ["original", "translation", "phrases"]
              }
            }
          },
          required: ["lines"]
        }
      }
    });

    const rawResult = JSON.parse(response.text);
    const result = { ...rawResult, promptVersion: ANALYSIS_PROMPT_VERSION };

    // Save to cache async
    setDoc(doc(db, 'complete_analysis_cache', docId), {
      result,
      trackKey,
      lyricsHash,
      targetLanguage: langKey,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      createdAt: serverTimestamp(),
    }).catch(e => console.error("Cache write error (complete_analysis):", e));

    return result;
  } catch (error) {
    console.error("Stage 3 Analysis error:", error);
    throw error;
  }
}

/**
 * Targeted Analysis: Extracts useful collocations/idioms for specifically selected or targeted lyric lines.
 */
export async function generateTargetedAnalysis(
  title: string,
  artist: string,
  targetLanguage: string,
  selectedLines: any[],
  existingPhrases: any[],
  instruction?: string
): Promise<{ phrases: any[] }> {
  // Format selected lines and existing phrases cleanly
  const selectedLinesStr = selectedLines
    .map(line => `Line ID: "${line.lineId}" (index: ${line.index})\nOriginal: "${line.original}"\nTranslation: "${line.translation || ''}"`)
    .join("\n\n");

  const existingPhrasesStr = existingPhrases
    .map(p => `- Text: "${p.text || ''}", Type: "${p.type || ''}", Translation: "${p.translation || ''}"`)
    .join("\n");

  let prompt = `Role: Expert linguistic analyst and music teacher.
Perform a targeted analysis of the raw selected lyric lines of "${title}" by "${artist}".
Your goal is to extract useful collocations, idioms, phrasal verbs, or cultural/vocabulary chunks (minimum 2 words, preferably 3-6 words) specifically from these selected lines to help a language learner master the content.

We are translating/explaining in targeted learning language: "${targetLanguage}".

Selected Lyric Lines (with associated Line IDs):
${selectedLinesStr}

Already analyzed/existing phrases on these lines (do NOT output these in your response to avoid redundancy):
${existingPhrasesStr || "None"}

SELECTION RULES:
1. MAX 1-2 NEW PHRASES PER LINE. Focus heavily on actual expressions/chunks rather than single words.
2. NO DUPLICATES: Do not suggest any phrase that has been suggested before or is already in the "Already analyzed/existing phrases" list.
3. EXACT MATCH: Each suggested "text" must be an EXACT substring of the "original" line from which it is extracted.
4. MAPPING TO LINE IDS: For each phrase, specify which "lineIds" *from the selected lines input* it was extracted from. If a phrase is present on multiple selected lines and has the exact same meaning, list all those lineIds.
5. NO PHRASES WITHOUT LINE IDS: Every phrase must have at least one valid "lineId" from the input.`;

  if (instruction && instruction.trim()) {
    prompt += `\n\nUSER FOCUS & FOCUS INSTRUCTIONS:\nFollow these focus instructions exactly when choosing/explaining phrases:\n${instruction.trim()}`;
  }

  prompt += `\n\nReturn a valid JSON object with the following structure exactly:
{
  "phrases": [
    {
      "text": "Extracted substring",
      "translation": "Translation of the phrase in ${targetLanguage}",
      "explanation": "Clear linguistic explanation/context in ${targetLanguage}",
      "lineIds": ["associated-line-id-from-input"],
      "type": "collocation|idiom|phrasal_verb|cultural_ref|vocabulary|phrase",
      "learningPriority": "high|medium|low"
    }
  ]
}`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phrases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  lineIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  type: { type: Type.STRING },
                  learningPriority: { type: Type.STRING }
                },
                required: ["text", "translation", "explanation", "lineIds", "type"]
              }
            }
          },
          required: ["phrases"]
        }
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    console.error("Targeted Analysis error:", error);
    throw error;
  }
}

export interface LearningAssistantResponse {
  explanation: string;
  suggestedPhrases: Array<{
    text: string;
    translation: string;
    explanation?: string;
    type?: string;
    lineIds?: string[];
  }>;
}

export async function generateLearningAssistantResponse(
  title: string,
  artist: string,
  contextType: "line" | "phrase" | "selection",
  lineContext: { original: string; translation?: string; lineId?: string } | undefined,
  phraseContext: { text: string; translation?: string; explanation?: string; lineIds?: string[] } | undefined,
  targetLanguage: string,
  userQuestion?: string,
  selectedPreset?: string,
  existingPhrases: any[] = []
): Promise<LearningAssistantResponse> {
  const existingPhrasesStr = existingPhrases
    .map(p => `- Text: "${p.text || ''}", Type: "${p.type || ''}", Translation: "${p.translation || ''}"`)
    .join("\n");

  let prompt = `Role: Expert linguistic analyst and music teacher.
Act as a personal learning assistant for mastering foreign languages through song lyrics.
You are helping a learner analyze the song "${title}" by "${artist}".
Your explanation must be written in the targeted learning language: "${targetLanguage}".

CONTEXT TYPE: "${contextType}"\n`;

  if (contextType === "line" && lineContext) {
    prompt += `Target Line: "${lineContext.original}"\n`;
    if (lineContext.translation) {
      prompt += `Line translation: "${lineContext.translation}"\n`;
    }
    if (lineContext.lineId) {
      prompt += `Line ID: "${lineContext.lineId}"\n`;
    }
  } else if (contextType === "phrase" && phraseContext) {
    prompt += `Target Phrase/Word: "${phraseContext.text}"\n`;
    if (phraseContext.translation) {
      prompt += `Phrase translation: "${phraseContext.translation}"\n`;
    }
    if (phraseContext.explanation) {
      prompt += `Phrase description: "${phraseContext.explanation}"\n`;
    }
    if (phraseContext.lineIds && phraseContext.lineIds.length > 0) {
      prompt += `Extracted from Line IDs: ${JSON.stringify(phraseContext.lineIds)}\n`;
    }
  }

  if (existingPhrasesStr) {
    prompt += `\nAlready saved/known phrases of this song:\n${existingPhrasesStr}\n`;
  }

  prompt += `\nACTION / TASK:\n`;
  if (selectedPreset) {
    prompt += `Perform the following focus task: ${selectedPreset}\n`;
  }
  if (userQuestion && userQuestion.trim()) {
    prompt += `Answer the learner's specific question: "${userQuestion.trim()}"\n`;
  }

  prompt += `
EXPLANATION REQUIREMENTS:
1. Provide a friendly, comprehensive yet highly insightful explanation (in ${targetLanguage}). Write it naturally, as a professional tutor would.
2. Ensure you address the linguistic nuances, slang, idiomatic uses, grammar intricacies, or pronunciation cues if relevant.

SUGGESTED PHRASES REQUIREMENTS:
If the context contains useful collocations, idioms, phrasal verbs, or vocabulary items (preferably chunks of 2-5 words) that can be studied as separate cards, suggest them.
- Do NOT suggest any phrase that is already in the "Already saved/known phrases" list.
- Each suggested phrase must be an exact substring of the song lyrics or line context.
- Keep the number of suggested phrases focused (usually 1-3 highly matching chunks). If there are no good new chunks to recommend, leave 'suggestedPhrases' as an empty array [].
- Associate the correct 'lineIds' with each suggestion (For 'line' context, use ${lineContext?.lineId ? JSON.stringify([lineContext.lineId]) : "[]"}).

Return a valid JSON object with the following structure exactly:
{
  "explanation": "Markdown-formatted explanation response covering the requested question, preset, and linguistic analysis.",
  "suggestedPhrases": [
    {
      "text": "Exact lyric substring",
      "translation": "Translation of the phrase into ${targetLanguage}",
      "explanation": "A very brief 1-sentence reminder of what this phrase means or how it is used.",
      "type": "collocation|idiom|phrasal_verb|cultural_ref|vocabulary|phrase",
      "lineIds": ["associated-line-id"]
    }
  ]
}`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            suggestedPhrases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  type: { type: Type.STRING },
                  lineIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["text", "translation"]
              }
            }
          },
          required: ["explanation", "suggestedPhrases"]
        }
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    console.error("Learning Assistant API error:", error);
    throw error;
  }
}


export async function getLatestAnalyzedTracks(maxCount: number = 10): Promise<TrackMeaningEntry[]> {
  console.log("[geminiService] getLatestAnalyzedTracks called, maxCount:", maxCount);
  try {
    // Step 1: Try the preferred query (requires composite index)
    try {
      const q = query(
        collection(db, 'track_meanings'),
        where('promptVersion', '==', ANALYSIS_PROMPT_VERSION),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        console.log("[geminiService] Fetched tracks using optimized query.");
        return querySnapshot.docs.map(doc => ({
          ...doc.data(),
          trackKey: doc.id
        })) as TrackMeaningEntry[];
      }
    } catch (indexErr) {
      console.warn("[geminiService] Composite index likely missing, falling back to in-memory filtering:", indexErr);
    }

    // Step 2: Fallback - Fetch latest tracks regardless of version, then filter in memory
    // This only requires a single-field index on 'createdAt' (usually exists by default)
    const qFallback = query(
      collection(db, 'track_meanings'),
      orderBy('createdAt', 'desc'),
      limit(maxCount * 3) // Fetch extra to have enough after filtering
    );
    
    const querySnapshot = await getDocs(qFallback);
    const tracks = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      trackKey: doc.id
    })) as TrackMeaningEntry[];
    
    // Filter for current version and sort again just in case (though Firestore returns sorted)
    const filtered = tracks.filter(t => t.promptVersion === ANALYSIS_PROMPT_VERSION).slice(0, maxCount);
    
    if (filtered.length > 0) {
      console.log(`[geminiService] Found ${filtered.length} tracks after in-memory filtering.`);
      return filtered;
    }

    // Step 3: Last resort - just get anything
    console.log("[geminiService] No tracks found with current version, trying last resort fetch.");
    const qLastResort = query(collection(db, 'track_meanings'), limit(maxCount));
    const snapLastResort = await getDocs(qLastResort);
    return snapLastResort.docs.map(doc => ({
      ...doc.data(),
      trackKey: doc.id
    })) as TrackMeaningEntry[];

  } catch (err) {
    console.error("[geminiService] Critical error in getLatestAnalyzedTracks:", err);
    return [];
  }
}

// --- New Functions for Divided Translation & Phrase Analysis Cache ---

export interface LineTranslationResult {
  originalText: string;
  translation: string;
  language: string;
  type: string;
}

export interface PhraseAnalysisResult {
  text: string;
  language: string;
  translation: string;
  explanation: string;
  lineIndex: number;
}

export function getTargetLangCode2Letter(lang: string): 'en' | 'es' | 'ru' {
  const norm = lang.toLowerCase().trim();
  if (norm.startsWith('ru') || norm === 'russian' || norm === 'русский') return 'ru';
  if (norm.startsWith('es') || norm === 'spanish' || norm === 'испанский') return 'es';
  return 'en'; // default to english
}

export async function getLineTranslations(
  lyrics: string,
  trackKey: string,
  lyricsHash: string,
  targetLang: string,
  forceRegenerate: boolean = false
): Promise<LineTranslationResult[]> {
  const docId = `${trackKey}_${lyricsHash}_v${TRANSLATION_PROMPT_VERSION}`;
  const docRef = doc(db, 'line_translations_cache', docId);
  const originalLines = lyrics.split('\n').map(l => l.trim());

  if (!forceRegenerate) {
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const returnedTranslations = data.returnedTranslations || [];
        const transMap = new Map<number, any>();
        for (const item of returnedTranslations) {
          transMap.set(item.index, item);
        }
        const targetLangCode = getTargetLangCode2Letter(targetLang);

        return originalLines.map((lineText: string, idx: number) => {
          if (lineText.length === 0) {
            return {
              originalText: "",
              translation: "",
              language: "en",
              type: "verse"
            };
          }
          const matched = transMap.get(idx);
          return {
            originalText: lineText,
            translation: matched?.translations?.[targetLangCode] || matched?.translations?.['en'] || "",
            language: matched?.language || "en",
            type: "verse"
          };
        });
      }
    } catch (err) {
      console.error("Error reading line_translations_cache:", err);
    }
  }

  // Filter out empty lines to save tokens and ensure perfect indexing
  const nonSeparators = originalLines
    .map((text, index) => ({ text, index }))
    .filter(item => item.text.length > 0);

  const linesToTranslate = nonSeparators.map(item => `[${item.index}]: ${item.text}`).join('\n');

  const prompt = `Role: Expert lyric translator and linguist.
Translate the following song lyrics line-by-line.
You must strictly keep the index of each line as provided in brackets like [number]. Do NOT merge, skip, or modify lines. The output must include the same indices mapping to their correct translation.

Input Lines:
${linesToTranslate}

For each line:
1. "index": the number from the brackets.
2. "originalText": the exact lyric line text (excluding the [index] prefix).
3. "language": detect the original language of this specific line (e.g. "en", "es", "ru", "fr", "de", etc).
4. "translations": provide translations into three languages: English (en), Spanish (es), and Russian (ru).

Return JSON with this exact schema:
{
  "lines": [
    {
      "index": 0,
      "originalText": "exact text of line",
      "language": "two-letter language code",
      "translations": {
        "en": "English translation",
        "es": "Spanish translation",
        "ru": "Russian translation"
      }
    }
  ]
}`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.INTEGER },
                  originalText: { type: Type.STRING },
                  language: { type: Type.STRING },
                  translations: {
                    type: Type.OBJECT,
                    properties: {
                      en: { type: Type.STRING },
                      es: { type: Type.STRING },
                      ru: { type: Type.STRING }
                    },
                    required: ["en", "es", "ru"]
                  }
                },
                required: ["index", "originalText", "language", "translations"]
              }
            }
          },
          required: ["lines"]
        }
      }
    });

    const jsonResult = JSON.parse(response.text);
    const returnedTranslations = jsonResult.lines || [];

    // Save async/merged to Firestore
    setDoc(docRef, {
      returnedTranslations,
      trackKey,
      lyricsHash,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      createdAt: serverTimestamp()
    }).catch(e => console.error("Cache write error for line_translations_cache:", e));

    const targetLangCode = getTargetLangCode2Letter(targetLang);
    const transMap = new Map<number, any>();
    for (const item of returnedTranslations) {
      transMap.set(item.index, item);
    }

    return originalLines.map((lineText: string, idx: number) => {
      if (lineText.length === 0) {
        return {
          originalText: "",
          translation: "",
          language: "en",
          type: "verse"
        };
      }
      const matched = transMap.get(idx);
      return {
        originalText: lineText,
        translation: matched?.translations?.[targetLangCode] || matched?.translations?.['en'] || '',
        language: matched?.language || 'en',
        type: 'verse'
      };
    });
  } catch (error: any) {
    console.error("getLineTranslations error:", error);
    throw new Error(error?.message || "Failed to generate lyric line translations. Please try again.", { cause: error });
  }
}

export async function getPhraseAnalysis(
  lyrics: string,
  targetLang: string,
  trackKey: string,
  lyricsHash: string,
  forceRegenerate: boolean = false
): Promise<PhraseAnalysisResult[]> {
  const targetLangCode = getTargetLangCode2Letter(targetLang);
  const docId = `${trackKey}_${lyricsHash}_${targetLangCode}_${ANALYSIS_PROMPT_VERSION}`;
  const docRef = doc(db, 'phrase_analysis_cache', docId);

  if (!forceRegenerate) {
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().phrases || [];
      }
    } catch (err) {
      console.error("Error reading phrase_analysis_cache:", err);
    }
  }

  const lyricsLines = lyrics.split('\n').map(l => l.trim()).filter(Boolean);
  const numberedLyrics = lyricsLines.map((line, idx) => `[Line ${idx}]: ${line}`).join('\n');

  const prompt = `Role: Expert linguistic analyst and language teacher.
Given song lyrics with numbered lines, identify 10-15 high-value phrase segments (2-6 words each) that are highly useful for language learners.
For each phrase segment:
1. Extract exact original text from lyrics segment ("text"). It must correspond to a substring in the specified "lineIndex".
2. Detect original language of the phrase segment ("language").
3. Translate the phrase segment into the target language (${targetLang}) under "translation".
4. Provide detailed explanation of the grammar, collocation, slang, or idiom in ${targetLang} under "explanation".
5. Specify the exact 0-based index of the line (from the numbered list below) that contains this phrase ("lineIndex").

Numbered Lyrics:
${numberedLyrics}

Return JSON with this exact schema:
{
  "phrases": [
    {
      "text": "exact segment from lyrics",
      "language": "two-letter language of the phrase",
      "translation": "translation in ${targetLang}",
      "explanation": "concise grammatical/idiomatic annotation in ${targetLang}",
      "lineIndex": integer
    }
  ]
}`;

  try {
    const response = await callGeminiApi({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phrases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  language: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  lineIndex: { type: Type.INTEGER }
                },
                required: ["text", "language", "translation", "explanation", "lineIndex"]
              }
            }
          },
          required: ["phrases"]
        }
      }
    });

    const jsonResult = JSON.parse(response.text);
    const phrases: PhraseAnalysisResult[] = jsonResult.phrases || [];

    // Save cache asynchronously
    setDoc(docRef, {
      phrases,
      trackKey,
      lyricsHash,
      targetLanguage: targetLangCode,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      createdAt: serverTimestamp()
    }).catch(e => console.error("Cache write error for phrase_analysis_cache:", e));

    return phrases;
  } catch (error: any) {
    console.error("getPhraseAnalysis error:", error);
    throw new Error(error?.message || "Failed to generate linguistic phrase analysis. Please try again.", { cause: error });
  }
}

export async function saveTrackToSharedCache(track: TrackLyricsData): Promise<void> {
  const trackKey = await computeTrackKey(track.title, [track.artist]);
  const docRef = doc(db, 'track_meanings', trackKey);

  try {
    const docSnap = await getDoc(docRef);
    const existing = docSnap.exists() ? docSnap.data() : {};

    await setDoc(docRef, {
      ...existing,
      trackKey,
      title: track.title,
      artists: [track.artist],
      artistId: track.artistId || existing.artistId || null,
      albumName: track.album || existing.albumName || null,
      albumId: track.albumId || existing.albumId || null,
      coverUrl: track.coverUrl || existing.coverUrl || null,
      audioUrl: track.audioUrl || existing.audioUrl || null,
      appleMusicUrl: track.appleMusicUrl || existing.appleMusicUrl || null,
      originalLanguage: track.sourceLanguage || existing.originalLanguage || "English",
      difficulty: track.difficulty || existing.difficulty || "intermediate",
      promptVersion: ANALYSIS_PROMPT_VERSION,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      meanings: track.meanings || existing.meanings || {
        en: track.meaning || "",
        es: track.meaning || "",
        ru: track.meaning || "",
        pl: track.meaning || ""
      },
      rawLyrics: track.rawLyrics || existing.rawLyrics || "",
      lines: track.lines || existing.lines || [],
      createdAt: existing.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[SharedCache] Saved track analysis for ${track.title} directly to Firestore!`);
  } catch (err) {
    console.error("[SharedCache] Failed to save track analysis to Firestore:", err);
  }
}


