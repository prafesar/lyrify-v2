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
 * Conservative linking pipeline:
 * Enhances/links phrases with stable lineIds within a TrackLyricsData module.
 */
export function linkPhrasesToLines(track: TrackLyricsData): TrackLyricsData {
  if (!track || !track.lines) return track;

  const lines = track.lines;
  
  // Make sure lines have lineIds
  for (const line of lines) {
    if (!line.lineId) {
      line.lineId = generateLineId(line.original);
    }
  }

  // If track has flat track.phrases, align them into line.phrases
  if (track.phrases && Array.isArray(track.phrases)) {
    for (const phrase of track.phrases) {
      const text = phrase.text || (phrase as any).phrase || '';
      if (!text) continue;
      
      const phraseTextValue = phrase.text || text;
      const phraseIdValue = phrase.id || `${track.trackId}_${text.replace(/\s+/g, '_')}`;
      
      const matchedIds = findMatchingLineIds(lines, text);
      const isUser = phrase.source === 'user';
      
      const enrichedPhrase: Phrase = {
        ...phrase,
        id: phraseIdValue,
        text: phraseTextValue,
        translation: phrase.translation || '',
        explanation: phrase.explanation || '',
        normalizedText: phrase.normalizedText || normalizePhraseText(text),
        lineIds: phrase.lineIds || (matchedIds.length > 0 ? matchedIds : []),
        source: phrase.source || 'llm',
        createdAt: phrase.createdAt || Date.now()
      };

      for (const line of lines) {
        const isMatched = matchedIds.includes(line.lineId!) || (isUser && phrase.lineIds?.includes(line.lineId!));
        if (isMatched) {
          if (!line.phrases) {
            line.phrases = [];
          }
          if (!line.phrases.some(p => (p.text || (p as any).phrase || '').toLowerCase() === text.toLowerCase())) {
            line.phrases.push(enrichedPhrase);
          }
        }
      }
    }
  }

  // Also enrich any existing lines.phrases directly
  for (const line of lines) {
    const parentLineId = line.lineId!;
    if (line.phrases) {
      line.phrases = line.phrases.map((phrase: Phrase) => {
        const text = phrase.text || (phrase as any).phrase || '';
        const phraseTextValue = phrase.text || text;
        const phraseIdValue = phrase.id || `${track.trackId}_${text.replace(/\s+/g, '_')}`;
        const normalized = normalizePhraseText(text);

        const matchedIds = findMatchingLineIds(lines, text);
        if (!matchedIds.includes(parentLineId)) {
          matchedIds.push(parentLineId);
        }

        return {
          ...phrase,
          id: phraseIdValue,
          text: phraseTextValue,
          normalizedText: phrase.normalizedText || normalized,
          lineIds: phrase.lineIds || matchedIds,
          source: phrase.source || 'llm',
          createdAt: phrase.createdAt || Date.now()
        };
      });
    } else {
      line.phrases = [];
    }
  }

  // Collect all unique phrases back to track.phrases to keep them in sync
  const uniquePhrasesMap = new Map<string, Phrase>();
  for (const line of lines) {
    if (line.phrases) {
      for (const phrase of line.phrases) {
        const key = (phrase.text || '').toLowerCase();
        if (key && !uniquePhrasesMap.has(key)) {
          uniquePhrasesMap.set(key, phrase);
        }
      }
    }
  }
  track.phrases = Array.from(uniquePhrasesMap.values());

  return track;
}

/**
 * Adds a new user-added phrase to the track's lines.
 */
export function addUserPhrase(
  track: TrackLyricsData,
  phraseText: string,
  translation: string,
  explanation: string,
  targetLineId?: string
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
    updatedAt: Date.now()
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

  // Re-run the sync/linking pipeline to populate track.phrases nicely 
  return linkPhrasesToLines(updatedTrack);
}

/**
 * Edits an existing phrase.
 */
export function editPhrase(
  track: TrackLyricsData,
  phraseId: string,
  updates: Partial<Omit<Phrase, 'id'>>
): TrackLyricsData {
  const updatedTrackPhrases = track.phrases?.map((phrase) => {
    if (phrase.id === phraseId) {
      return {
        ...phrase,
        ...updates,
        updatedAt: Date.now()
      };
    }
    return phrase;
  }) || [];

  const updatedLines = track.lines.map((line) => {
    if (!line.phrases) return line;
    return {
      ...line,
      phrases: line.phrases.map((phrase) => {
        if (phrase.id === phraseId) {
          return {
            ...phrase,
            ...updates,
            updatedAt: Date.now()
          };
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

  return linkPhrasesToLines(updatedTrack);
}

/**
 * Deletes/hides a phrase.
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

  return linkPhrasesToLines(updatedTrack);
}

/**
 * Links an existing phrase to an additional line.
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

  return {
    ...track,
    lines: updatedLines
  };
}

/**
 * Unlinks a phrase from a specific line.
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

  return {
    ...track,
    lines: updatedLines
  };
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
