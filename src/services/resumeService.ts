import { Track } from '../constants';
import { Flashcard } from './localCardService';

export interface ResumeViewModel {
  type: 'study' | 'track';
  title: string;
  subtitle: string;
  ctaText: string;
  trackingTrack?: Track;
  dueCount?: number;
}

/**
 * Builds the resume state for returning users.
 * Selects between Reviewing due cards or resuming the most recent track.
 */
export function buildResumeViewModel(
  cards: Flashcard[],
  recentTracks: Track[],
  now: Date = new Date()
): ResumeViewModel | null {
  // 1. Check if there are due / reviewable cards
  const dueCardsCount = cards.filter(card => {
    const dueTime = card.due instanceof Date ? card.due.getTime() : new Date(card.due || 0).getTime();
    return dueTime <= now.getTime();
  }).length;

  if (dueCardsCount > 0) {
    return {
      type: 'study',
      title: 'Review Ready',
      subtitle: `You have ${dueCardsCount} flashcard${dueCardsCount > 1 ? 's' : ''} waiting to be reviewed. Let's practice!`,
      ctaText: 'Review Due Cards',
      dueCount: dueCardsCount,
    };
  }

  // 2. Check if there is a recent track with history
  if (recentTracks && recentTracks.length > 0) {
    const mostRecentTrack = recentTracks[0];
    const trackCards = cards.filter(card => card.trackId === mostRecentTrack.id);

    let statusText = 'Continue exploring lyrics and pronunciation.';
    if (trackCards.length > 0) {
      statusText = `You saved ${trackCards.length} phrase${trackCards.length > 1 ? 's' : ''} from this track.`;
    } else if (mostRecentTrack.lyrics && !mostRecentTrack.analysis) {
      statusText = 'Lyrics are loaded. Try generating a full AI analysis!';
    } else if (mostRecentTrack.analysis) {
      statusText = 'AI analysis is ready. Read lyrics and practice shadowing!';
    }

    return {
      type: 'track',
      title: 'Resume Learning',
      subtitle: `«${mostRecentTrack.title}» — ${statusText}`,
      ctaText: 'Continue Track',
      trackingTrack: mostRecentTrack,
    };
  }

  // 3. Otherwise don't show the resume block
  return null;
}
