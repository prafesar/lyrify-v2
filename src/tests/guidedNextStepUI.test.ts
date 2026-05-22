import { describe, it, expect } from 'vitest';
import { determineNextStep } from '../services/nextStepService';

describe('Guided next-step CTA-block tests for multiple key states', () => {
  it('Transition 1: Correctly guides users to FIND_LYRICS when lyrics are missing', () => {
    const trackMock = {
      title: 'Mon Amour',
      artist: 'Stromae',
      rawLyrics: '',
      lines: [],
      processingStatus: { stage1_completed: false, stage2_completed: false, stage3_completed: false }
    };

    const step = determineNextStep(trackMock, false);
    expect(step.type).toBe('FIND_LYRICS');
    expect(step.label).toBe('Find Lyrics & Phrases');
  });

  it('Transition 2: Correctly guides users to GENERATE_ANALYSIS when lyrics loaded but deep analysis not performed', () => {
    const trackMock = {
      title: 'Mon Amour',
      artist: 'Stromae',
      rawLyrics: 'Mon amour, quand tu me dis...',
      lines: [
        { text: 'Mon amour, quand tu me dis...', phrases: [] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false }
    };

    const step = determineNextStep(trackMock, false);
    expect(step.type).toBe('GENERATE_ANALYSIS');
    expect(step.label).toBe('Generate Deep Analysis');
  });

  it('Transition 3: Correctly guides users to SAVE_FIRST_PHRASE when deep analysis completed but no track flashcard exists', () => {
    const trackMock = {
      title: 'Mon Amour',
      artist: 'Stromae',
      rawLyrics: 'Mon amour, quand tu me dis...',
      lines: [
        { text: 'Mon amour, quand tu me dis...', phrases: [{ text: 'mon amour', translation: 'my love' }] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    };

    const hasSavedCards = false; // Simulated empty flashcards for this track
    const step = determineNextStep(trackMock, hasSavedCards);
    expect(step.type).toBe('SAVE_FIRST_PHRASE');
    expect(step.label).toBe('Save Your First Phrase');
  });

  it('Transition 4: Correctly guides users to GO_TO_STUDY when user has saved at least one phrase', () => {
    const trackMock = {
      title: 'Mon Amour',
      artist: 'Stromae',
      rawLyrics: 'Mon amour, quand tu me dis...',
      lines: [
        { text: 'Mon amour, quand tu me dis...', phrases: [{ text: 'mon amour', translation: 'my love' }] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    };

    const hasSavedCards = true; // Simulated saved phrase
    const step = determineNextStep(trackMock, hasSavedCards);
    expect(step.type).toBe('GO_TO_STUDY');
    expect(step.label).toBe('Go to Study');
  });
});
