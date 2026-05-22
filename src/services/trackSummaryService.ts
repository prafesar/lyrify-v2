import { Flashcard } from './localCardService';

export interface TrackStudySummary {
  trackId: string;
  totalCards: number;
  learningCount: number;
  knownCount: number;
  newCount: number;
  percentageComplete: number;
}

/**
 * Computes stats for flashcards belonging to a specific trackId.
 * Returns null if no cards exist for this track.
 */
export function getTrackStudySummary(
  cards: Flashcard[],
  trackId: string | null | undefined
): TrackStudySummary | null {
  if (!trackId) return null;

  const trackCards = cards.filter(card => card.trackId === trackId);
  if (trackCards.length === 0) return null;

  let learningCount = 0;
  let knownCount = 0;
  let newCount = 0;

  trackCards.forEach(card => {
    if (card.status === 'learning') {
      learningCount++;
    } else if (card.status === 'known') {
      knownCount++;
    } else if (card.status === 'new') {
      newCount++;
    } else {
      // Fallback
      learningCount++;
    }
  });

  const totalCards = trackCards.length;
  const percentageComplete = totalCards > 0 ? Math.round((knownCount / totalCards) * 100) : 0;

  return {
    trackId,
    totalCards,
    learningCount,
    knownCount,
    newCount,
    percentageComplete
  };
}
