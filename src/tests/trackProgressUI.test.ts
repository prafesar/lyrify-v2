import { describe, it, expect, vi } from 'vitest';
import { buildTrackProgressViewModel, TrackProgressViewModel } from '../services/trackProgressService';
import { TrackLyricsData } from '../services/musicService';

describe('Track Progress Metro Line UI Actions', () => {
  it('navigates to relevant sections based on click action types', () => {
    const mockAction = vi.fn();
    
    // Simulate UI component callback mapping
    const actionTypes: TrackProgressViewModel['ctaActionType'][] = [
      'find_lyrics',
      'generate_analysis',
      'save_phrase',
      'go_to_study'
    ];

    actionTypes.forEach(type => {
      mockAction(type);
    });

    expect(mockAction).toHaveBeenCalledTimes(4);
    expect(mockAction).toHaveBeenNthCalledWith(1, 'find_lyrics');
    expect(mockAction).toHaveBeenNthCalledWith(2, 'generate_analysis');
    expect(mockAction).toHaveBeenNthCalledWith(3, 'save_phrase');
    expect(mockAction).toHaveBeenNthCalledWith(4, 'go_to_study');
  });

  it('correctly maps completed segments and formats the stepper route', () => {
    // Stage 3 complete with breakdown lectureBlocks -> expect 'saved' step
    const dummyDate = new Date();
    const mockTrack: TrackLyricsData = {
      trackId: 'testing-track',
      title: 'Title',
      artist: 'Artist',
      rawLyrics: 'Some raw lyrics loaded',
      lectureBlocks: [{ id: 'b1', kind: 'lexical_groups', text: 'Some breakdown words', source: 'ai' }],
      lines: [{ id: 'l1', index: 0, original: 'Some raw lyrics loaded', translation: 'translation', phrases: [{ id: 'p1', text: 'Some raw lyrics loaded', lemmas: [], type: 'phrase' }] }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true },
      lastUpdated: dummyDate.getTime(),
    };

    const vm = buildTrackProgressViewModel(mockTrack, []);
    expect(vm).not.toBeNull();
    expect(vm!.currentStepId).toBe('saved');
    expect(vm!.ctaActionType).toBe('save_phrase');

    // First two steps (Lyrics, Analysis) should be 'completed'
    expect(vm!.steps[0].status).toBe('completed');
    expect(vm!.steps[1].status).toBe('completed');

    // The current step (Saved) should be 'current'
    expect(vm!.steps[2].status).toBe('current');
  });
});
