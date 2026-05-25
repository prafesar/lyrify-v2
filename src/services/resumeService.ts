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
  _now: Date = new Date()
): ResumeViewModel | null {
  // We no longer display a study block/banner here. Instead, cards ready for repetition
  // are shown elegantly as a badge on the bottom navigation.

  // Check if there is a recent track with history
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

  // Otherwise don't show the resume block
  return null;
}
