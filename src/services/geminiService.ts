import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
export const ANALYSIS_PROMPT_VERSION = 1;

// --- Utility Functions for Caching ---

function normalizeString(str: string): string {
  return (str || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s']/g, '');
}

async function computeSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function computeTrackKey(title: string, artists: string[]): Promise<string> {
  const normTitle = normalizeString(title);
  const normArtists = artists.map(a => normalizeString(a)).sort().join(',');
  return await computeSHA256(`${normTitle}|${normArtists}`);
}

async function computeLyricsHash(lyrics: string): Promise<string> {
  const normLyrics = (lyrics || '').trim().replace(/\r\n/g, '\n').replace(/\n+/g, '\n');
  return await computeSHA256(normLyrics);
}

// -------------------------------------

export async function getCachedSongMeaning(
  artist: string,
  title: string,
  targetLanguage: string
): Promise<string | null> {
  const trackKey = await computeTrackKey(title, [artist]);
  const langKey = targetLanguage.toLowerCase().trim();
  const docId = `${trackKey}_${langKey}_${ANALYSIS_PROMPT_VERSION}`;

  try {
    const cacheRef = doc(db, 'song_meaning_cache', docId);
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      return cacheSnap.data().meaning;
    }
  } catch (err) {
    console.error("Cache read error (getCachedSongMeaning):", err);
  }
  return null;
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
}export async function generateSongMeaning(
  lyrics: string,
  artist: string,
  title: string,
  targetLanguage: string
): Promise<string> {
  const trackKey = await computeTrackKey(title, [artist]);
  const langKey = targetLanguage.toLowerCase().trim();
  const docId = `${trackKey}_${langKey}_${ANALYSIS_PROMPT_VERSION}`;

  try {
    // Check cache
    const cacheRef = doc(db, 'song_meaning_cache', docId);
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      console.log(`[Cache Hit] Song Meaning for ${title} - ${artist}`);
      return cacheSnap.data().meaning;
    }
  } catch (err) {
    console.error("Cache read error (song_meaning):", err);
  }

  const prompt = `Role: You are an expert music critic and linguistic analyst.
Analyze the meaning of the song "${title}" by "${artist}".
Provide a deep, insightful summary of the song's theme, emotional context, and narrative in 3-4 sentences.

CRITICAL: The summary MUST be written in ${targetLanguage}.

Lyrics:
${lyrics.substring(0, 4000)}

Return ONLY the text of the meaning/summary in ${targetLanguage}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const meaning = response.text.trim();

    // Save to cache async
    if (meaning) {
      setDoc(doc(db, 'song_meaning_cache', docId), {
        meaning,
        trackKey,
        targetLanguage: langKey,
        promptVersion: ANALYSIS_PROMPT_VERSION,
        createdAt: serverTimestamp(),
      }).catch(e => console.error("Cache write error (song_meaning):", e));
    }

    return meaning;
  } catch (error) {
    console.error("Generate song meaning error:", error);
    return "";
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
