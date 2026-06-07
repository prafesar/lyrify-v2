export type NextStepType = 'FIND_LYRICS' | 'GENERATE_ANALYSIS' | 'SAVE_FIRST_PHRASE' | 'GO_TO_STUDY';

export interface NextStepState {
  type: NextStepType;
  label: string;
  description: string;
}

/**
 * Pure selector/helper to determine the next step for a given track.
 */
export function determineNextStep(
  track: {
    rawLyrics?: string;
    processingStatus?: {
      stage1_completed?: boolean;
      stage2_completed?: boolean;
      stage3_completed?: boolean;
    };
    lines?: Array<{
      phrases?: any[];
    }>;
  } | null | undefined,
  hasSavedCards: boolean
): NextStepState {
  if (!track) {
    return {
      type: 'FIND_LYRICS',
      label: 'Find Lyrics & Phrases',
      description: 'Search for lyrics to start learning.'
    };
  }

  // State 1: No lyrics
  const hasLyrics = track.rawLyrics && track.rawLyrics.trim().length > 0;
  if (!hasLyrics) {
    return {
      type: 'FIND_LYRICS',
      label: 'Find Lyrics & Phrases',
      description: 'Fetch original lyrics and generate first preview.'
    };
  }

  // State 2: Has lyrics, but no analysis/phrases yet
  const hasPhrases = track.lines && track.lines.some(l => l.phrases && l.phrases.length > 0);
  const isAnalysisCompleted = track.processingStatus?.stage3_completed && hasPhrases;
  if (!isAnalysisCompleted) {
    return {
      type: 'GENERATE_ANALYSIS',
      label: 'Generate Song Breakdown',
      description: 'Run Gemini AI to translate lines and extract important vocabulary patterns.'
    };
  }

  // State 3: Has analysis, but no saved cards for this track
  if (!hasSavedCards) {
    return {
      type: 'SAVE_FIRST_PHRASE',
      label: 'Save Your First Phrase',
      description: 'Save difficult or interesting phrases from the Breakdown tab to start learning them.'
    };
  }

  // State 4: Already has saved cards
  return {
    type: 'GO_TO_STUDY',
    label: 'Go to Study',
    description: 'You have saved phrases for this track. Start practicing with spaced repetition!'
  };
}
