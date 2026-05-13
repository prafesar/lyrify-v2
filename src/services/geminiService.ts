import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
  const prompt = `Analyze the lyrics for the song "${title}" by "${artist}".
CRITICAL: All explanations, meanings, translations, and learning priorities MUST be written in ${targetLanguage}. 
DO NOT use the original song language for explanations.

Return a JSON object with the following structure:
{
  "meaning": "Overall song meaning in 2-3 sentences in ${targetLanguage}.",
  "phrases": [
    {
      "phrase": "Sub-string from the lyrics (2-6 words)",
      "translation": "Natural translation into ${targetLanguage}",
      "explanation": "Detailed grammar/idiom note in ${targetLanguage}",
      "isUniversal": true, // true if useful in everyday conversation
      "learningPriority": "Brief note in ${targetLanguage} why this is useful"
    }
  ],
  "vocabulary": [
    {
      "word": "Single important word from text (include article if applicable, e.g., 'der Club', 'la vie')",
      "explanation": "Morphology/usage note in ${targetLanguage}"
    }
  ]
}

PHRASE SELECTION RULES:
1. Length: 2 to 6 words maximum.
2. NO FULL LINES: Do not return entire sentences or full lines unless they are short idioms (≤5 words).
3. TARGET TYPES: Focus on Idioms, Collocations, Phrasal Verbs, and typical speech patterns.
4. USEFUL SEGMENTS: Extract parts of sentences that are reusable in other contexts. Avoid long subject-predicate chains.
5. EXAMPLES of good phrases: "vom Samstag noch was haben", "ganz harmlos beginnen", "die beste Phase", "schon vorbei sein", "ein kleines bisschen", "Bock haben".

VOCABULARY RULES:
1. Include absolute mandatory articles for nouns (e.g., German: der/die/das, French: le/la/l', etc.).
2. Field "word" should be "article word".

GENERAL RULES:
1. Provide exactly 15-20 phrases and 15-20 vocabulary words.
2. "phrase" and "word" fields MUST contain strings exactly as they appear in the Lyrics text provided (for "word", the article can be added even if not directly adjacent in text).
3. "isUniversal" should be true for only the 3-5 most beneficial items for a learner.

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
    return JSON.parse(text);
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
  targetLanguage: string
) {
  const prompt = `Analyze lyrics for "${title}" by "${artist}". 
Stage 2: Focus on overall meaning and core idioms/key phrases for a learner using ${targetLanguage}.

Return JSON:
{
  "meaning": "Overall song meaning in 2-3 sentences in ${targetLanguage}.",
  "lines": [
    {
      "original": "exact line from lyrics",
      "phrases": [
        { 
          "text": "2-6 words substring", 
          "type": "collocation|idiom|phrasal_verb|cultural_ref|vocabulary|phrase",
          "translation": "...",
          "explanation": "...",
          "isUniversal": true/false,
          "learningPriority": "..."
        }
      ]
    }
  ]
}

- "text" MUST be a substring of "original".
- Only provide phrases for the 10-15 most important lines.
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
          required: ["meaning", "lines"]
        }
      }
    });

    return JSON.parse(response.text);
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
  const prompt = `Perform Stage 3 Deep Analysis of "${title}" by "${artist}". 
For every single line, provide a translation and exhaustive list of useful phrases (1-3 per line).

Return JSON:
{
  "lines": [
    {
      "original": "...",
      "translation": "Full line translation in ${targetLanguage}",
      "phrases": [
        {
          "text": "substring",
          "lemmas": ["base", "forms"],
          "type": "...",
          "translation": "...",
          "explanation": "..."
        }
      ]
    }
  ]
}

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

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Stage 3 Analysis error:", error);
    throw error;
  }
}
