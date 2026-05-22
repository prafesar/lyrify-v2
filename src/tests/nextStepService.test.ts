import { describe, it, expect } from 'vitest';
import { determineNextStep } from '../services/nextStepService';

describe('nextStepService unit tests', () => {
  it('identifies FIND_LYRICS when track is null or undefined', () => {
    const result = determineNextStep(null, false);
    expect(result.type).toBe('FIND_LYRICS');
    expect(result.label).toContain('Find Lyrics');
  });

  it('identifies FIND_LYRICS when track has empty lyrics', () => {
    const track = {
      rawLyrics: '',
      lines: [],
      processingStatus: { stage1_completed: false, stage2_completed: false, stage3_completed: false }
    };
    const result = determineNextStep(track, false);
    expect(result.type).toBe('FIND_LYRICS');
  });

  it('identifies GENERATE_ANALYSIS when track has lyrics but stage3_completed is false', () => {
    const track = {
      rawLyrics: 'La vie en Rose\n Quand elle me prend...',
      lines: [{ phrases: [] }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false }
    };
    const result = determineNextStep(track, false);
    expect(result.type).toBe('GENERATE_ANALYSIS');
  });

  it('identifies GENERATE_ANALYSIS when stage3_completed is true but lines have no phrases', () => {
    const track = {
      rawLyrics: 'La vie en Rose\n Quand elle me prend...',
      lines: [{ phrases: [] }, { phrases: undefined }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    };
    const result = determineNextStep(track, false);
    expect(result.type).toBe('GENERATE_ANALYSIS');
  });

  it('identifies SAVE_FIRST_PHRASE when track has analysis (with phrases) but no saved cards', () => {
    const track = {
      rawLyrics: 'Test lyrics',
      lines: [
        { phrases: [{ text: 'phrase 1' }] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    };
    const result = determineNextStep(track, false);
    expect(result.type).toBe('SAVE_FIRST_PHRASE');
  });

  it('identifies GO_TO_STUDY when track has analysis and user has saved cards for this track ID', () => {
    const track = {
      rawLyrics: 'Test lyrics',
      lines: [
        { phrases: [{ text: 'phrase 1' }] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    };
    const result = determineNextStep(track, true);
    expect(result.type).toBe('GO_TO_STUDY');
  });
});
