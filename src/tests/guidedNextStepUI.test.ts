import { describe, it, expect } from 'vitest';
import { determineNextStep } from '../services/nextStepService';
import { Flashcard } from '../services/localCardService';

describe('Guided next-step CTA-block tests for multiple key states', () => {
  const dummyDate = new Date('2026-05-22T12:00:00Z');

  const createMockCard = (opts: Partial<Flashcard> = {}): Flashcard => ({
    id: 'fc-1',
    text: 'mon amour',
    translation: 'my love',
    status: 'learning',
    trackId: 'track-stromae',
    due: dummyDate,
    state: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    stability: 1,
    difficulty: 1,
    reps: 0,
    lapses: 0,
    createdAt: dummyDate,
    updatedAt: dummyDate,
    ...opts,
  });

  it('Transition 1: Correctly guides users to GET_LYRICS when lyrics are missing', () => {
    const trackMock = {
      title: 'Mon Amour',
      artist: 'Stromae',
      rawLyrics: '',
      lines: [],
      processingStatus: { stage1_completed: false, stage2_completed: false, stage3_completed: false }
    } as any;

    const step = determineNextStep(trackMock, []);
    expect(step.type).toBe('GET_LYRICS');
    expect(step.label).toBe('Get Lyrics');
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
    } as any;

    const step = determineNextStep(trackMock, []);
    expect(step.type).toBe('GENERATE_ANALYSIS');
    expect(step.label).toBe('Generate Overview');
  });

  it('Transition 3: Correctly guides users to SAVE_PHRASES when deep analysis completed but no track flashcard exists', () => {
    const trackMock = {
      title: 'Mon Amour',
      artist: 'Stromae',
      rawLyrics: 'Mon amour, quand tu me dis...',
      lectureBlocks: [
        {
          id: 'b1',
          phrases: [{ text: 'mon amour' }],
        }
      ],
      lines: [
        { text: 'Mon amour, quand tu me dis...', phrases: [{ text: 'mon amour', translation: 'my love' }] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    } as any;

    const step = determineNextStep(trackMock, [], dummyDate);
    expect(step.type).toBe('SAVE_PHRASES');
    expect(step.label).toBe('Save Phrases');
  });

  it('Transition 4: Correctly guides users to GO_TO_STUDY when user has saved at least one phrase and it is due', () => {
    const trackMock = {
      title: 'Mon Amour',
      artist: 'Stromae',
      rawLyrics: 'Mon amour, quand tu me dis...',
      lectureBlocks: [
        {
          id: 'b1',
          phrases: [{ text: 'mon amour' }],
        }
      ],
      lines: [
        { text: 'Mon amour, quand tu me dis...', phrases: [{ text: 'mon amour', translation: 'my love' }] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true }
    } as any;

    const cards = [
      createMockCard({
        due: new Date('2026-05-21T12:00:00Z'), // in past -> due!
        text: 'mon amour',
      }),
    ];

    const step = determineNextStep(trackMock, cards, dummyDate);
    expect(step.type).toBe('GO_TO_STUDY');
    expect(step.label).toBe('Start Study');
  });
});
