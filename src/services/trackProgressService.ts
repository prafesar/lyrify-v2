import { TrackLyricsData } from './musicService';
import { Flashcard } from './localCardService';

export type TrackStationId = 'lyrics' | 'analysis' | 'saved';
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
  
  // 2. Lyrics check
  const hasLyrics = !!(track.rawLyrics && track.rawLyrics.trim().length > 0);

  // 3. Analysis check
  const isAnalysisCompleted = !!(track.lectureBlocks && track.lectureBlocks.length > 0);

  // 4. Saved check
  const isSavedCompleted = hasSavedCards;

  // Determine current active step (first one that is NOT complete)
  let currentStepId: TrackStationId = 'saved';
  if (!hasLyrics) {
    currentStepId = 'lyrics';
  } else if (!isAnalysisCompleted) {
    currentStepId = 'analysis';
  } else {
    currentStepId = 'saved';
  }

  // Build the list of 3 stations with their status
  const stationIds: { id: TrackStationId; label: string }[] = [
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'analysis', label: 'Breakdown' },
    { id: 'saved', label: 'Cards' },
  ];

  const steps = stationIds.map((station): TrackStation => {
    let status: StationStatus;

    if (station.id === currentStepId) {
      if (station.id === 'saved' && isSavedCompleted) {
        status = 'completed'; // If saved completed, even the last one is completed
      } else {
        status = 'current';
      }
    } else {
      // Check if this station is completed
      let isComp = false;
      if (station.id === 'lyrics') isComp = hasLyrics;
      else if (station.id === 'analysis') isComp = isAnalysisCompleted;
      else if (station.id === 'saved') isComp = isSavedCompleted;

      status = isComp ? 'completed' : 'upcoming';
    }

    return {
      id: station.id,
      label: station.label,
      status,
    };
  });

  // Default behaviors & messaging for progress stations
  let statusText: string;
  let ctaLabel: string;
  let ctaActionType: TrackProgressViewModel['ctaActionType'];
  let motivationalMessage: string;

  if (currentStepId === 'lyrics') {
    statusText = 'Next step: get lyrics';
    ctaLabel = 'Get Lyrics';
    ctaActionType = 'find_lyrics';
    motivationalMessage = 'Fetch song lyrics and original texts.';
  } else if (currentStepId === 'analysis') {
    statusText = 'Next step: generate breakdown';
    ctaLabel = 'Generate Breakdown';
    ctaActionType = 'generate_analysis';
    motivationalMessage = 'Unlock AI vocabulary and structures.';
  } else if (currentStepId === 'saved' && !isSavedCompleted) {
    statusText = 'Next step: save phrases';
    ctaLabel = 'Save Phrases';
    ctaActionType = 'save_phrase';
    motivationalMessage = 'Bookmark important phrases to your cards.';
  } else {
    // All completed
    statusText = 'Ready for practice';
    ctaLabel = 'Start Study';
    ctaActionType = 'go_to_study';
    motivationalMessage = 'Practice with active spaced repetition cards.';
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
