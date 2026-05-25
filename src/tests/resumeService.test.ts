import { describe, it, expect } from 'vitest';
import { buildResumeViewModel } from '../services/resumeService';
import { Flashcard } from '../services/localCardService';
import { Track } from '../constants';

describe('Resume Service and View-Model Builder', () => {
  const dummyDate = new Date('2026-05-22T12:00:00Z');
  const pastDate = new Date('2026-05-22T10:00:00Z');
  const futureDate = new Date('2026-05-22T14:00:00Z');

  const sampleTrack: Track = {
    id: 'track-101',
    title: 'La Bohème',
    artist: 'Charles Aznavour',
    album: 'Greatest Hits',
    coverUrl: 'https://example.com/cover.jpg',
  };

  it('Scenario 1: Returns null (empty state) when both cards and recent tracks are empty', () => {
    const vm = buildResumeViewModel([], [], dummyDate);
    expect(vm).toBeNull();
  });

  it('Scenario 2: Returns a track resume VM when a recent track is available but no cards are due', () => {
    const vm = buildResumeViewModel([], [sampleTrack], dummyDate);
    expect(vm).not.toBeNull();
    expect(vm!.type).toBe('track');
    expect(vm!.title).toBe('Resume Learning');
    expect(vm!.subtitle).toContain('La Bohème');
    expect(vm!.ctaText).toBe('Continue Track');
    expect(vm!.trackingTrack!.id).toBe('track-101');
  });

  it('Scenario 3: Returns a track resume VM when there are due cards, because study resume blocks are disabled in favor of navigation badge', () => {
    const dueCard: Flashcard = {
      id: 'fc-1',
      text: 'Je me souviens',
      translation: 'I remember',
      status: 'learning',
      trackId: 'track-101',
      due: pastDate, // past date = due
      state: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      stability: 1,
      difficulty: 1,
      reps: 1,
      lapses: 0,
      createdAt: dummyDate,
      updatedAt: dummyDate,
    };

    const vm = buildResumeViewModel([dueCard], [sampleTrack], dummyDate);
    expect(vm).not.toBeNull();
    expect(vm!.type).toBe('track');
    expect(vm!.ctaText).toBe('Continue Track');
  });

  it('Scenario 4: Prefers track Resume if card exists but is not yet due (future date check)', () => {
    const futureCard: Flashcard = {
      id: 'fc-2',
      text: 'Toujours',
      translation: 'Always',
      status: 'learning',
      trackId: 'track-101',
      due: futureDate, // future date = NOT due yet
      state: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      stability: 1,
      difficulty: 1,
      reps: 1,
      lapses: 0,
      createdAt: dummyDate,
      updatedAt: dummyDate,
    };

    const vm = buildResumeViewModel([futureCard], [sampleTrack], dummyDate);
    expect(vm).not.toBeNull();
    expect(vm!.type).toBe('track'); // Should default back to Track resume because dueCardsCount is 0!
    expect(vm!.ctaText).toBe('Continue Track');
  });
});
