import { GoogleGenAI, Type } from "@google/genai";
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
export const ANALYSIS_PROMPT_VERSION = 3;

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
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s']/g, '');
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
}

export async function fetchTrackMeaning(
  lyrics: string,
  metadata: TrackMetadata,
  promptVersion: number = ANALYSIS_PROMPT_VERSION
): Promise<TrackMeaningResult> {
  const trackKey = await computeTrackKey(metadata.title, metadata.artists);
  const docRef = doc(db, 'track_meanings', trackKey);
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.promptVersion === promptVersion && data.meanings) {
        return {
          originalLanguage: data.originalLanguage,
          difficulty: data.difficulty,
          meanings: data.meanings,
          promptVersion: data.promptVersion as number
        };
      }
    }
  } catch (err) {
    console.error("Firestore read error (track_meanings):", err);
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  } catch (error) {
    console.error("fetchTrackMeaning error:", error);
    // Return empty result as fallback
    return {
      originalLanguage: "English",
      difficulty: "beginner",
      meanings: { en: "", es: "", ru: "", pl: "" }
    };
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
  promptVersion: number = ANALYSIS_PROMPT_VERSION
): Promise<TrackMeaningResult | null> {
  const trackKey = await computeTrackKey(title, artists);
  const docRef = doc(db, 'track_meanings', trackKey);
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.promptVersion === promptVersion && data.meanings) {
        return {
          originalLanguage: data.originalLanguage,
          difficulty: data.difficulty,
          meanings: data.meanings,
          promptVersion: data.promptVersion as number
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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = `Translate the following song lyrics into ${targetLanguage}. 
Maintain the poetic feel and rhythm where possible. 
IMPORTANT: Return exactly the same number of lines as the input. Each line in the translation MUST correspond to the same line in the original lyrics.
Return ONLY the translated lyrics text without any additional comments.

Lyrics:
${lyrics}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        return { authors: null, source_confirmation: null };
      }
    }
    return { authors: null, source_confirmation: null };
  } catch (error) {
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Language detection error:", error);
    return "English";
  }
}

export async function explainPhraseStructured(phrase: string, targetLanguage: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = `Explain the following foreign phrase in ${targetLanguage}: "${phrase}".
CRITICAL: The explanation MUST be written entirely in ${targetLanguage}.

Return a JSON object:
{
  "translation": "Natural translation",
  "explanation": "Detailed grammar/idiom note"
}

Return ONLY clean JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  targetLang: string
): Promise<LineTranslationResult[]> {
  const docId = `${trackKey}_${lyricsHash}_${ANALYSIS_PROMPT_VERSION}`;
  const docRef = doc(db, 'line_translations_cache', docId);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const uniqueLines = data.uniqueLines || [];
      const lineOrder = data.lineOrder || [];
      const targetLangCode = getTargetLangCode2Letter(targetLang);

      return lineOrder.map((idx: number) => {
        const item = uniqueLines[idx];
        return {
          originalText: item.originalText,
          translation: item.translations?.[targetLangCode] || item.translations?.['en'] || '',
          language: item.language || 'en',
          type: item.type || 'verse'
        };
      });
    }
  } catch (err) {
    console.error("Error reading line_translations_cache:", err);
  }

  const prompt = `Role: Expert lyric translator and linguist.
Translate the following song lyrics line-by-line. Correct any line segmentation if necessary, but keep exactly the same lines in sequence.
For each line:
1. Provide the exact originalText.
2. Detect the original language of the line (e.g. "en" for English, "es" for Spanish, "fr" for French, "de" for German, "ru" for Russian, etc.).
3. Classify paragraph type as either "verse" or "chorus".
4. Provide translations into three languages: English (en), Spanish (es), and Russian (ru).

Lyrics:
${lyrics}

Return JSON with this exact schema structure:
{
  "lines": [
    {
      "originalText": "exact line from lyrics",
      "language": "two-letter line language",
      "type": "verse|chorus",
      "translations": {
        "en": "English translation",
        "es": "Spanish translation",
        "ru": "Russian translation"
      }
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
                  originalText: { type: Type.STRING },
                  language: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["verse", "chorus"] },
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
                required: ["originalText", "language", "type", "translations"]
              }
            }
          },
          required: ["lines"]
        }
      }
    });

    const jsonResult = JSON.parse(response.text);
    const rawLines = jsonResult.lines || [];

    const uniqueLines: any[] = [];
    const lineOrder: number[] = [];
    const lineMap = new Map<string, number>();

    for (const line of rawLines) {
      const key = line.originalText.trim().toLowerCase();
      let idx = lineMap.get(key);
      if (idx === undefined) {
        idx = uniqueLines.length;
        uniqueLines.push({
          originalText: line.originalText,
          language: line.language || 'en',
          type: line.type || 'verse',
          translations: line.translations
        });
        lineMap.set(key, idx);
      }
      lineOrder.push(idx);
    }

    // Save async to Firestore
    setDoc(docRef, {
      uniqueLines,
      lineOrder,
      trackKey,
      lyricsHash,
      promptVersion: ANALYSIS_PROMPT_VERSION,
      createdAt: serverTimestamp()
    }).catch(e => console.error("Cache write error for line_translations_cache:", e));

    const targetLangCode = getTargetLangCode2Letter(targetLang);
    return lineOrder.map((idx: number) => {
      const item = uniqueLines[idx];
      return {
        originalText: item.originalText,
        translation: item.translations?.[targetLangCode] || item.translations?.['en'] || '',
        language: item.language || 'en',
        type: item.type || 'verse'
      };
    });
  } catch (error) {
    console.error("getLineTranslations error, falling back to local fallback:", error);
    // Simple fallback logic
    const lines = lyrics.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => ({
      originalText: line,
      translation: line,
      language: 'en',
      type: 'verse'
    }));
  }
}

export async function getPhraseAnalysis(
  lyrics: string,
  targetLang: string,
  trackKey: string,
  lyricsHash: string
): Promise<PhraseAnalysisResult[]> {
  const targetLangCode = getTargetLangCode2Letter(targetLang);
  const docId = `${trackKey}_${lyricsHash}_${targetLangCode}_${ANALYSIS_PROMPT_VERSION}`;
  const docRef = doc(db, 'phrase_analysis_cache', docId);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().phrases || [];
    }
  } catch (err) {
    console.error("Error reading phrase_analysis_cache:", err);
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
  } catch (error) {
    console.error("getPhraseAnalysis error:", error);
    return [];
  }
}

