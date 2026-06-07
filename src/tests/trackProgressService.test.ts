import { describe, it, expect } from 'vitest';
import { buildTrackProgressViewModel } from '../services/trackProgressService';
import { TrackLyricsData } from '../services/musicService';
import { Flashcard } from '../services/localCardService';

describe('Track Progress Metro Line Stepper Service', () => {
  const dummyDate = new Date('2026-05-22T12:00:00Z');

  const createMockTrack = (opts: Partial<TrackLyricsData> = {}): TrackLyricsData => {
    return {
      trackId: 'track-aznavour',
      title: 'La Bohème',
      artist: 'Charles Aznavour',
      rawLyrics: opts.rawLyrics || '',
      lines: opts.lines || [],
      processingStatus: opts.processingStatus || {
        stage1_completed: false,
        stage2_completed: false,
        stage3_completed: false,
      },
      lastUpdated: dummyDate.getTime(),
      ...opts,
    };
  };

  const createMockCard = (opts: Partial<Flashcard> = {}): Flashcard => {
    return {
      id: 'fc-1',
      text: 'Je ne compreds pas',
      translation: 'I do not understand',
      status: 'learning',
      trackId: 'track-aznavour',
      due: dummyDate,
      state: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      stability: 1,
      difficulty: 1,
      reps: opts.reps ?? 0,
      lapses: 0,
      createdAt: dummyDate,
      updatedAt: dummyDate,
      ...opts,
    };
  };

  it('Case 1: Only opened track - rawLyrics is empty', () => {
    const track = createMockTrack({ rawLyrics: '' });
    const vm = buildTrackProgressViewModel(track, []);

    expect(vm).not.toBeNull();
    expect(vm!.currentStepId).toBe('lyrics');
    expect(vm!.ctaActionType).toBe('find_lyrics');
    expect(vm!.steps[0].status).toBe('completed'); // Opened is completed
    expect(vm!.steps[1].status).toBe('current');   // Lyrics is current
    expect(vm!.steps[2].status).toBe('upcoming');
  });

  it('Case 2: Lyrics fetched but analysis is not ready', () => {
    const track = createMockTrack({
      rawLyrics: 'Je me souviens des jours anciens',
      processingStatus: { stage1_completed: true, stage2_completed: false, stage3_completed: false }
    });
    const vm = buildTrackProgressViewModel(track, []);

    expect(vm!.currentStepId).toBe('analysis');
    expect(vm!.ctaActionType).toBe('generate_analysis');
    expect(vm!.steps[0].status).toBe('completed'); // Opened
    expect(vm!.steps[1].status).toBe('completed'); // Lyrics
    expect(vm!.steps[2].status).toBe('current');   // Analysis
    expect(vm!.steps[3].status).toBe('upcoming');
  });

  it('Case 3: Analysis complete but no saved phrases', () => {
    const track = createMockTrack({
      rawLyrics: 'Je me souviens',
      lectureBlocks: [{ id: 'b1', kind: 'lexical_groups', text: 'Some breakdown words', source: 'ai' }],
      lines: [{ id: 'l1', index: 0, original: 'Je me souviens', translation: 'I remember', phrases: [{ id: 'p1', text: 'Je me souviens', lemmas: [], type: 'phrase' }] }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    });
    const vm = buildTrackProgressViewModel(track, []);

    expect(vm!.currentStepId).toBe('saved');
    expect(vm!.ctaActionType).toBe('save_phrase');
    expect(vm!.steps[2].status).toBe('completed'); // Analysis complete
    expect(vm!.steps[3].status).toBe('current');   // Saved is current
  });

  it('Case 4: Phrases saved but review not done yet (reps = 0)', () => {
    const track = createMockTrack({
      rawLyrics: 'Je me souviens',
      lectureBlocks: [{ id: 'b1', kind: 'lexical_groups', text: 'Some breakdown words', source: 'ai' }],
      lines: [{ id: 'l1', index: 0, original: 'Je me souviens', translation: 'I remember', phrases: [{ id: 'p1', text: 'Je me souviens', lemmas: [], type: 'phrase' }] }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    });
    const card = createMockCard({ reps: 0 }); // Saved but not reviewed yet
    const vm = buildTrackProgressViewModel(track, [card]);

    expect(vm!.currentStepId).toBe('saved');
    expect(vm!.ctaActionType).toBe('go_to_study');
    expect(vm!.steps[3].status).toBe('completed'); // Saved is completed because card is saved
  });

  it('Case 5: Fully completed core learning loop (reps > 0)', () => {
    const track = createMockTrack({
      rawLyrics: 'Je me souviens',
      lectureBlocks: [{ id: 'b1', kind: 'lexical_groups', text: 'Some breakdown words', source: 'ai' }],
      lines: [{ id: 'l1', index: 0, original: 'Je me souviens', translation: 'I remember', phrases: [{ id: 'p1', text: 'Je me souviens', lemmas: [], type: 'phrase' }] }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    });
    const card = createMockCard({ reps: 1 }); // Already reviewed!
    const vm = buildTrackProgressViewModel(track, [card]);

    expect(vm!.currentStepId).toBe('saved');
    expect(vm!.ctaActionType).toBe('go_to_study');
    expect(vm!.steps[3].status).toBe('completed'); // Saved is completed
  });
});
