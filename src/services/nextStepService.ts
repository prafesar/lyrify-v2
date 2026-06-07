import { TrackLyricsData } from './musicService';
import { Flashcard } from './localCardService';

export type NextStepType = 
  | 'FIND_LYRICS' 
  | 'GENERATE_ANALYSIS' 
  | 'SAVE_PHRASES' 
  | 'GO_TO_STUDY' 
  | 'TRACK_COMPLETE';

export interface NextStepState {
  type: NextStepType;
  label: string;
  description: string;
}

/**
 * Pure selector/helper to determine the next step for a given track.
 */
export function determineNextStep(
  track: TrackLyricsData | null | undefined,
  trackCards: Flashcard[],
  now: Date = new Date()
): NextStepState {
  if (!track) {
    return {
      type: 'FIND_LYRICS',
      label: 'Find Lyrics & Phrases',
      description: 'Search for lyrics to start learning.'
    };
  }

  // State 1: No lyrics
  const hasLyrics = !!(track.rawLyrics && track.rawLyrics.trim().length > 0);
  if (!hasLyrics) {
    return {
      type: 'FIND_LYRICS',
      label: 'Get Lyrics',
      description: 'Fetch original lyrics and generate first preview.'
    };
  }

  // State 2: Has lyrics, but no breakdown/analysis yet
  const isAnalysisCompleted = !!(track.lectureBlocks && track.lectureBlocks.length > 0);
  if (!isAnalysisCompleted) {
    return {
      type: 'GENERATE_ANALYSIS',
      label: 'Generate Breakdown',
      description: 'Run Gemini AI to translate lines and extract important vocabulary patterns.'
    };
  }

  // State 3: Track has due cards
  const dueCards = trackCards.filter(card => new Date(card.due).getTime() <= now.getTime());
  if (dueCards.length > 0) {
    return {
      type: 'GO_TO_STUDY',
      label: 'Start Study',
      description: `You have ${dueCards.length} saved phrase${dueCards.length > 1 ? 's' : ''} ready to practice now.`
    };
  }

  // State 4: Check for unsaved phrases in Breakdown, unless user soft-completed it
  const isSoftCompleted = !!(track as any).breakdownCompleted;
  
  const breakdownPhrases: string[] = [];
  if (track.lectureBlocks) {
    track.lectureBlocks.forEach(b => {
      if (b.phrases) {
        b.phrases.forEach(p => {
          if (p.text) breakdownPhrases.push(p.text.trim().toLowerCase());
        });
      }
    });
  }

  const savedPhraseTexts = new Set(trackCards.map(c => c.text.trim().toLowerCase()));
  const hasUnsavedPhrases = breakdownPhrases.some(pText => !savedPhraseTexts.has(pText));

  if (hasUnsavedPhrases && !isSoftCompleted) {
    return {
      type: 'SAVE_PHRASES',
      label: 'Save Phrases',
      description: 'Explore the Breakdown to select and save phrases to your cards.'
    };
  }

  // State 5: Everything is saved or skipped, and nothing is due
  return {
    type: 'TRACK_COMPLETE',
    label: 'Revisit Breakdown',
    description: 'You completed this song breakdown! All cards are current, and nothing is due for review.'
  };
}
