import { TrackLyricsData, Phrase, LyricsLine, generateLineId, normalizeLineText } from './musicService';

/**
 * Creates a unique ID for a phrase
 */
export function generatePhraseId(trackId: string, text: string): string {
  const cleanText = text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${trackId}:p_user:${cleanText}:${Date.now()}`;
}

/**
 * Normalizes phrase text for matching
 */
export function normalizePhraseText(text: string): string {
  return normalizeLineText(text);
}

/**
 * Returns all lines that match a given phrase text
 */
export function findMatchingLineIds(lines: LyricsLine[], phraseText: string): string[] {
  const normalizedPhrase = normalizePhraseText(phraseText);
  if (!normalizedPhrase) return [];
  
  const matches: string[] = [];
  for (const line of lines) {
    const normalizedLine = normalizeLineText(line.original);
    // exact normalized substring match
    if (normalizedLine.includes(normalizedPhrase)) {
      const lid = line.lineId || generateLineId(line.original);
      if (!matches.includes(lid)) {
        matches.push(lid);
      }
    }
  }
  return matches;
}

/**
 * Synchronizes and aligns flat track.phrases, individual line.phrases and stable lineIds.
 * Absolutely pure and functional. Does NOT mutate the input track or its elements.
 */
export function syncTrackPhrasesFromLines(track: TrackLyricsData): TrackLyricsData {
  if (!track) return track;

  // Clone lines and ensure each line has a generated stable lineId
  const lines: LyricsLine[] = (track.lines || []).map((line) => {
    const lineId = line.lineId || generateLineId(line.original);
    // Deep clone the line phrases if they exist, making sure they use 'text' property
    const linePhrases = (line.phrases || []).map((p: any) => {
      const textVal = p.text || p.phrase || '';
      const { phrase: legacyPhrase, ...rest } = p; // remove legacy .phrase field
      return {
        ...rest,
        text: textVal,
      } as Phrase;
    });

    return {
      ...line,
      lineId,
      phrases: linePhrases
    };
  });

  // Track phrases to collect
  const uniquePhrasesMap = new Map<string, { phraseObj: Phrase; lineIdsSet: Set<string> }>();

  // Helper to ingest a phrase into map safely
  const ingestPhrase = (p: any, defaultLineId?: string) => {
    const textVal = p.text || p.phrase || '';
    if (!textVal) return;
    const key = textVal.toLowerCase();

    const lineIdsSet = new Set<string>();
    if (defaultLineId) lineIdsSet.add(defaultLineId);
    if (p.lineIds && Array.isArray(p.lineIds)) {
      for (const id of p.lineIds) {
        if (id) lineIdsSet.add(id);
      }
    }

    const { phrase: legacyPhrase, ...rest } = p;
    const phraseObj: Phrase = {
      ...rest,
      id: p.id || `${track.trackId}_${textVal.replace(/\s+/g, '_')}`,
      text: textVal,
      lemmas: p.lemmas || [],
      type: p.type || 'phrase',
      normalizedText: p.normalizedText || normalizePhraseText(textVal),
      source: p.source || 'llm',
      createdAt: p.createdAt || Date.now()
    };

    const existing = uniquePhrasesMap.get(key);
    if (!existing) {
      uniquePhrasesMap.set(key, { phraseObj, lineIdsSet });
    } else {
      // Merge
      for (const id of lineIdsSet) {
        existing.lineIdsSet.add(id);
      }
      // If the incoming phrase is from user explicitly, prefer its metadata
      if (p.source === 'user' && existing.phraseObj.source !== 'user') {
        existing.phraseObj = { ...existing.phraseObj, ...phraseObj };
      }
    }
  };

  // First process track.phrases
  if (track.phrases && Array.isArray(track.phrases)) {
    for (const p of track.phrases) {
      ingestPhrase(p);
    }
  }

  // Then process lines
  for (const line of lines) {
    if (line.phrases) {
      for (const p of line.phrases) {
        ingestPhrase(p, line.lineId);
      }
    }
  }

  // Compile final clean list of phrases and sync lineIds
  const syncedPhrases: Phrase[] = [];
  uniquePhrasesMap.forEach(({ phraseObj, lineIdsSet }) => {
    // LLM phrases automatically align to any lines matching as a substring
    const autoMatched = findMatchingLineIds(lines, phraseObj.text);
    for (const lid of autoMatched) {
      lineIdsSet.add(lid);
    }

    const lineIds = Array.from(lineIdsSet);
    syncedPhrases.push({
      ...phraseObj,
      lineIds
    });
  });

  // Re-map lines to contain their strictly aligned synced phrases
  const updatedLines = lines.map(line => {
    const alignedPhrases = syncedPhrases.filter(p => p.lineIds?.includes(line.lineId!));
    return {
      ...line,
      phrases: alignedPhrases
    };
  });

  return {
    ...track,
    lines: updatedLines,
    phrases: syncedPhrases
  };
}

/**
 * Conservative linking pipeline:
 * Enhances/links phrases with stable lineIds within a TrackLyricsData module.
 * Made completely pure.
 */
export function linkPhrasesToLines(track: TrackLyricsData): TrackLyricsData {
  return syncTrackPhrasesFromLines(track);
}

/**
 * Adds a new user-added phrase to the track's lines.
 * Made completely pure.
 */
export function addUserPhrase(
  track: TrackLyricsData,
  phraseText: string,
  translation: string,
  explanation: string,
  targetLineId?: string,
  note?: string
): TrackLyricsData {
  const newPhrase: Phrase = {
    id: generatePhraseId(track.trackId, phraseText),
    text: phraseText,
    lemmas: [],
    type: 'phrase',
    translation,
    explanation,
    normalizedText: normalizePhraseText(phraseText),
    lineIds: targetLineId ? [targetLineId] : findMatchingLineIds(track.lines, phraseText),
    source: 'user',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    note
  };

  const updatedLines = track.lines.map((line) => {
    const isTarget = targetLineId 
      ? line.lineId === targetLineId
      : newPhrase.lineIds?.includes(line.lineId || '');
      
    if (isTarget) {
      const currentPhrases = line.phrases || [];
      // Prevent duplicates by text
      if (!currentPhrases.some(p => normalizePhraseText(p.text || (p as any).phrase || '') === newPhrase.normalizedText)) {
        return {
          ...line,
          phrases: [...currentPhrases, newPhrase]
        };
      }
    }
    return line;
  });

  const updatedTrack = {
    ...track,
    lines: updatedLines
  };

  return syncTrackPhrasesFromLines(updatedTrack);
}

/**
 * Edits an existing phrase.
 * Made completely pure.
 */
export function editPhrase(
  track: TrackLyricsData,
  phraseId: string,
  updates: Partial<Omit<Phrase, 'id'>>
): TrackLyricsData {
  const updatedTrackPhrases = track.phrases?.map((phrase) => {
    if (phrase.id === phraseId) {
      const { phrase: legacyPhrase, ...rest } = phrase as any;
      return {
        ...rest,
        ...updates,
        updatedAt: Date.now()
      } as Phrase;
    }
    return phrase;
  }) || [];

  const updatedLines = track.lines.map((line) => {
    if (!line.phrases) return line;
    return {
      ...line,
      phrases: line.phrases.map((phrase) => {
        if (phrase.id === phraseId) {
          const { phrase: legacyPhrase, ...rest } = phrase as any;
          return {
            ...rest,
            ...updates,
            updatedAt: Date.now()
          } as Phrase;
        }
        return phrase;
      })
    };
  });

  const updatedTrack = {
    ...track,
    phrases: updatedTrackPhrases,
    lines: updatedLines
  };

  return syncTrackPhrasesFromLines(updatedTrack);
}

/**
 * Deletes/hides a phrase.
 * Made completely pure.
 */
export function deletePhrase(
  track: TrackLyricsData,
  phraseId: string
): TrackLyricsData {
  const updatedTrackPhrases = track.phrases?.filter(p => p.id !== phraseId) || [];

  const updatedLines = track.lines.map((line) => {
    if (!line.phrases) return line;
    return {
      ...line,
      phrases: line.phrases.filter(p => p.id !== phraseId)
    };
  });

  const updatedTrack = {
    ...track,
    phrases: updatedTrackPhrases,
    lines: updatedLines
  };

  return syncTrackPhrasesFromLines(updatedTrack);
}

/**
 * Links an existing phrase to an additional line.
 * Made completely pure.
 */
export function linkPhraseToLine(
  track: TrackLyricsData,
  phraseId: string,
  lineId: string
): TrackLyricsData {
  let foundPhrase: Phrase | null = null;
  for (const line of track.lines) {
    const p = line.phrases?.find(item => item.id === phraseId);
    if (p) {
      foundPhrase = p;
      break;
    }
  }

  if (!foundPhrase && track.phrases) {
    foundPhrase = track.phrases.find(p => p.id === phraseId) || null;
  }

  if (!foundPhrase) return track;

  const currentLineIds = foundPhrase.lineIds || [];
  const updatedLineIds = currentLineIds.includes(lineId) 
    ? currentLineIds 
    : [...currentLineIds, lineId];

  const targetLineIdx = track.lines.findIndex(l => l.lineId === lineId);
  const updatedLines = track.lines.map((line, idx) => {
    let phrases = line.phrases ? [...line.phrases] : [];
    
    phrases = phrases.map(p => {
      if (p.id === phraseId) {
        return {
          ...p,
          lineIds: updatedLineIds,
          updatedAt: Date.now()
        };
      }
      return p;
    });

    if (idx === targetLineIdx) {
      const alreadyHas = phrases.some(p => p.id === phraseId);
      if (!alreadyHas && foundPhrase) {
        phrases.push({
          ...foundPhrase,
          lineIds: updatedLineIds,
          updatedAt: Date.now()
        });
      }
    }

    return {
      ...line,
      phrases
    };
  });

  const updatedTrack = {
    ...track,
    lines: updatedLines
  };

  return syncTrackPhrasesFromLines(updatedTrack);
}

/**
 * Unlinks a phrase from a specific line.
 * Made completely pure.
 */
export function unlinkPhraseFromLine(
  track: TrackLyricsData,
  phraseId: string,
  lineId: string
): TrackLyricsData {
  let foundPhrase: Phrase | null = null;
  for (const line of track.lines) {
    const p = line.phrases?.find(item => item.id === phraseId);
    if (p) {
      foundPhrase = p;
      break;
    }
  }

  if (!foundPhrase && track.phrases) {
    foundPhrase = track.phrases.find(p => p.id === phraseId) || null;
  }

  if (!foundPhrase) return track;

  const currentLineIds = foundPhrase.lineIds || [];
  const updatedLineIds = currentLineIds.filter(id => id !== lineId);

  const updatedLines = track.lines.map((line) => {
    if (line.lineId === lineId) {
      return {
        ...line,
        phrases: (line.phrases || []).filter(p => p.id !== phraseId)
      };
    }

    if (line.phrases) {
      return {
        ...line,
        phrases: line.phrases.map(p => {
          if (p.id === phraseId) {
            return {
              ...p,
              lineIds: updatedLineIds,
              updatedAt: Date.now()
            };
          }
          return p;
        })
      };
    }
    return line;
  });

  const updatedTrack = {
    ...track,
    lines: updatedLines
  };

  return syncTrackPhrasesFromLines(updatedTrack);
}

export interface StarredLineData {
  lineId: string;
  original: string;
  translation?: string;
  index: number;
}

/**
 * Returns starred lines info for future LLM flow
 */
export function getStarredLinesWithId(track: TrackLyricsData): StarredLineData[] {
  if (!track || !track.lines) return [];
  return track.lines
    .filter(line => line.isStarred)
    .map(line => ({
      lineId: line.lineId || generateLineId(line.original),
      original: line.original,
      translation: line.translation,
      index: line.index
    }));
}

/**
 * Returns linked phrases for an array of selected line IDs
 */
export function getLinkedPhrasesForLines(track: TrackLyricsData, lineIds: string[]): Phrase[] {
  if (!track || !track.lines) return [];
  const seenIds = new Set<string>();
  const collected: Phrase[] = [];

  for (const line of track.lines) {
    if (line.phrases) {
      for (const phrase of line.phrases) {
        if (phrase.lineIds?.some(lid => lineIds.includes(lid))) {
          if (!seenIds.has(phrase.id)) {
            seenIds.add(phrase.id);
            collected.push(phrase);
          }
        }
      }
    }
  }
  return collected;
}

export interface StarredLinesAnalysisInput {
  title: string;
  artist: string;
  originalLanguage?: string;
  starredLines: StarredLineData[];
  existingPhrases: Phrase[];
}

/**
 * Builds standard payload data for targeted analysis of starred lyric lines
 */
export function buildStarredLinesAnalysisInput(track: TrackLyricsData): StarredLinesAnalysisInput {
  const starredLines = getStarredLinesWithId(track);
  const lineIds = starredLines.map(l => l.lineId);
  const existingPhrases = getLinkedPhrasesForLines(track, lineIds);
  return {
    title: track.title,
    artist: track.artist,
    originalLanguage: track.sourceLanguage,
    starredLines,
    existingPhrases
  };
}

export interface SelectedLinesAnalysisInput {
  title: string;
  artist: string;
  originalLanguage?: string;
  selectedLines: StarredLineData[];
  existingPhrases: Phrase[];
}

/**
 * Builds standard payload data for targeted analysis of specifically selected lyric lines
 */
export function buildSelectedLinesAnalysisInput(track: TrackLyricsData, selectedLineIds: string[]): SelectedLinesAnalysisInput {
  const selectedLineIdsSet = new Set(selectedLineIds);
  const selectedLines = (track.lines || [])
    .filter(line => selectedLineIdsSet.has(line.lineId || ''))
    .map(line => ({
      lineId: line.lineId || generateLineId(line.original),
      original: line.original,
      translation: line.translation,
      index: line.index
    }));
  const existingPhrases = getLinkedPhrasesForLines(track, selectedLineIds);
  return {
    title: track.title,
    artist: track.artist,
    originalLanguage: track.sourceLanguage,
    selectedLines,
    existingPhrases
  };
}

/**
 * Merges structured LLM generated phrases specifically targeting starred lines.
 * Filters by starred lines, prevents duplicates, assigns correct lineIds, keeps user phrases.
 */
export function mergeGeneratedPhrasesForLines(
  track: TrackLyricsData,
  generatedPhrases: Array<{
    text: string;
    translation: string;
    explanation: string;
    lineIds: string[];
    type: string;
    learningPriority?: string;
    lemmas?: string[];
  }>
): TrackLyricsData {
  if (!track || !generatedPhrases) return track;

  const starredLines = getStarredLinesWithId(track);
  const starredLineIds = new Set(starredLines.map(sl => sl.lineId));

  let updatedLines = (track.lines || []).map(line => ({
    ...line,
    lineId: line.lineId || generateLineId(line.original),
    phrases: line.phrases ? [...line.phrases] : []
  }));

  for (const gp of generatedPhrases) {
    const textVal = gp.text?.trim() || '';
    if (!textVal) continue;

    const normText = normalizePhraseText(textVal);
    if (!normText) continue;

    // Filter lineIds to only contain the valid starred lineIds
    const validLineIds = (gp.lineIds || []).filter(lid => starredLineIds.has(lid));
    if (validLineIds.length === 0) continue;

    // Filter target line ids where this phrase does NOT already exist by normalized text
    const targetLineIdsToAdd: string[] = [];
    for (const lid of validLineIds) {
      const line = updatedLines.find(l => l.lineId === lid);
      if (line) {
        const alreadyExists = line.phrases.some(
          p => normalizePhraseText(p.text || '') === normText
        );
        if (!alreadyExists) {
          targetLineIdsToAdd.push(lid);
        }
      }
    }

    if (targetLineIdsToAdd.length === 0) continue;

    const phraseObj: Phrase = {
      id: `${track.trackId}:p_llm:${normText}_${Date.now()}_` + Math.random().toString(36).substring(2, 7),
      text: textVal,
      lemmas: gp.lemmas || [],
      type: gp.type || 'phrase',
      translation: gp.translation || '',
      explanation: gp.explanation || '',
      normalizedText: normText,
      lineIds: targetLineIdsToAdd,
      source: 'llm',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      learningPriority: gp.learningPriority
    };

    updatedLines = updatedLines.map(line => {
      if (targetLineIdsToAdd.includes(line.lineId!)) {
        return {
          ...line,
          phrases: [...line.phrases, phraseObj]
        };
      }
      return line;
    });
  }

  const updatedTrack = {
    ...track,
    lines: updatedLines
  };

  return syncTrackPhrasesFromLines(updatedTrack);
}

/**
 * Merges structured LLM generated phrases specifically targeting selected lines.
 */
export function mergeGeneratedPhrasesForSelectedLines(
  track: TrackLyricsData,
  generatedPhrases: Array<{
    text: string;
    translation: string;
    explanation: string;
    lineIds: string[];
    type: string;
    learningPriority?: string;
    lemmas?: string[];
  }>,
  selectedLineIds: string[]
): TrackLyricsData {
  if (!track || !generatedPhrases) return track;

  const targetLineIdsSet = new Set(selectedLineIds);

  let updatedLines = (track.lines || []).map(line => ({
    ...line,
    lineId: line.lineId || generateLineId(line.original),
    phrases: line.phrases ? [...line.phrases] : []
  }));

  for (const gp of generatedPhrases) {
    const textVal = gp.text?.trim() || '';
    if (!textVal) continue;

    const normText = normalizePhraseText(textVal);
    if (!normText) continue;

    const validLineIds = (gp.lineIds || []).filter(lid => targetLineIdsSet.has(lid));
    if (validLineIds.length === 0) continue;

    const targetLineIdsToAdd: string[] = [];
    for (const lid of validLineIds) {
      const line = updatedLines.find(l => l.lineId === lid);
      if (line) {
        const alreadyExists = line.phrases.some(
          p => normalizePhraseText(p.text || '') === normText
        );
        if (!alreadyExists) {
          targetLineIdsToAdd.push(lid);
        }
      }
    }

    if (targetLineIdsToAdd.length === 0) continue;

    const phraseObj: Phrase = {
      id: `${track.trackId}:p_llm:${normText}_${Date.now()}_` + Math.random().toString(36).substring(2, 7),
      text: textVal,
      lemmas: gp.lemmas || [],
      type: gp.type || 'phrase',
      translation: gp.translation || '',
      explanation: gp.explanation || '',
      normalizedText: normText,
      lineIds: targetLineIdsToAdd,
      source: 'llm',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      learningPriority: gp.learningPriority
    };

    updatedLines = updatedLines.map(line => {
      if (targetLineIdsToAdd.includes(line.lineId!)) {
        return {
          ...line,
          phrases: [...line.phrases, phraseObj]
        };
      }
      return line;
    });
  }

  const updatedTrack = {
    ...track,
    lines: updatedLines
  };

  return syncTrackPhrasesFromLines(updatedTrack);
}

