import { TrackLyricsData } from './musicService';
import { Flashcard } from './localCardService';

export type TrackStationId = 'opened' | 'lyrics' | 'analysis' | 'saved' | 'review';
export type StationStatus = 'completed' | 'current' | 'upcoming';

export interface TrackStation {
  id: TrackStationId;
  label: string;
  status: StationStatus;
}

export interface TrackProgressViewModel {
  steps: TrackStation[];
  currentStepId: TrackStationId;
  statusText: string;
  ctaLabel: string;
  ctaActionType: 'find_lyrics' | 'generate_analysis' | 'save_phrase' | 'go_to_study' | 'review_again';
  motivationalMessage?: string;
}

/**
 * Pure service to map a given track and its saved cards into a TrackProgressViewModel
 */
export function buildTrackProgressViewModel(
  track: TrackLyricsData | null | undefined,
  cards: Flashcard[]
): TrackProgressViewModel | null {
  if (!track) return null;

  const trackCards = cards.filter(card => card.trackId === track.trackId);
  const hasSavedCards = trackCards.length > 0;
  
  // 1. Opened check
  const isOpened = true; // Always true because track is active

  // 2. Lyrics check
  const hasLyrics = !!(track.rawLyrics && track.rawLyrics.trim().length > 0);

  // 3. Analysis check
  const hasPhrases = !!(track.lines && track.lines.some(l => l.phrases && l.phrases.length > 0));
  const isAnalysisCompleted = !!(track.processingStatus?.stage3_completed && hasPhrases);

  // 4. Saved check
  const isSavedCompleted = hasSavedCards;

  // 5. Review check (at least one card has reps > 0)
  const isReviewCompleted = hasSavedCards && trackCards.some(c => c.reps > 0);

  // Determine current active step (first one that is NOT complete)
  let currentStepId: TrackStationId = 'review';
  if (!hasLyrics) {
    currentStepId = 'lyrics';
  } else if (!isAnalysisCompleted) {
    currentStepId = 'analysis';
  } else if (!isSavedCompleted) {
    currentStepId = 'saved';
  } else if (!isReviewCompleted) {
    currentStepId = 'review';
  } else {
    // All are technically completed, current is 'review' but status is fully complete
    currentStepId = 'review';
  }

  // Build the list of 5 stations with their status
  const stationIds: { id: TrackStationId; label: string }[] = [
    { id: 'opened', label: 'Opened' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'saved', label: 'Saved' },
    { id: 'review', label: 'Review' },
  ];

  const steps = stationIds.map((station): TrackStation => {
    let status: StationStatus;

    if (station.id === currentStepId) {
      if (station.id === 'review' && isReviewCompleted) {
        status = 'completed'; // If review completed, even the last one is completed
      } else {
        status = 'current';
      }
    } else {
      // Check if this station is completed
      let isComp = false;
      if (station.id === 'opened') isComp = isOpened;
      else if (station.id === 'lyrics') isComp = hasLyrics;
      else if (station.id === 'analysis') isComp = isAnalysisCompleted;
      else if (station.id === 'saved') isComp = isSavedCompleted;
      else if (station.id === 'review') isComp = isReviewCompleted;

      status = isComp ? 'completed' : 'upcoming';
    }

    return {
      id: station.id,
      label: station.label,
      status,
    };
  });

  // Default behaviors & messaging
  let statusText: string;
  let ctaLabel: string;
  let ctaActionType: TrackProgressViewModel['ctaActionType'];
  let motivationalMessage: string;

  if (currentStepId === 'lyrics') {
    statusText = 'Next step: find lyrics for this song';
    ctaLabel = 'Find Lyrics & Phrases';
    ctaActionType = 'find_lyrics';
    motivationalMessage = 'Unlocks translation and shadowing.';
  } else if (currentStepId === 'analysis') {
    statusText = 'Next step: unlock phrase analysis';
    ctaLabel = 'Generate Analysis';
    ctaActionType = 'generate_analysis';
    motivationalMessage = 'Unlock AI breakdown & grammar highlights.';
  } else if (currentStepId === 'saved') {
    statusText = 'Save your first phrase to start building a study deck';
    ctaLabel = 'Save First Phrase';
    ctaActionType = 'save_phrase';
    motivationalMessage = 'One step to unlock study mode!';
  } else if (currentStepId === 'review' && !isReviewCompleted) {
    statusText = 'Your song is ready for study';
    ctaLabel = 'Go to Study';
    ctaActionType = 'go_to_study';
    motivationalMessage = 'Practice with spaced repetition now.';
  } else {
    // Case 5: fully completed
    statusText = 'You’ve completed the core learning loop for this song';
    ctaLabel = 'Review Again';
    ctaActionType = 'review_again';
    motivationalMessage = 'Keep the momentum going!';
  }

  return {
    steps,
    currentStepId,
    statusText,
    ctaLabel,
    ctaActionType,
    motivationalMessage,
  };
}
