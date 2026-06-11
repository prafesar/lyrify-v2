import { describe, it, expect } from 'vitest';
import { determineNextStep } from '../services/nextStepService';
import { Flashcard } from '../services/localCardService';

describe('nextStepService unit tests', () => {
  const dummyDate = new Date('2026-05-22T12:00:00Z');

  const createMockCard = (opts: Partial<Flashcard> = {}): Flashcard => ({
    id: 'fc-1',
    text: 'Je ne comprends pas',
    translation: 'I do not understand',
    status: 'learning',
    trackId: 'track-aznavour',
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

  it('identifies GET_LYRICS when track is null or undefined', () => {
    const result = determineNextStep(null, []);
    expect(result.type).toBe('GET_LYRICS');
    expect(result.label).toContain('Get Lyrics');
  });

  it('identifies GET_LYRICS when track has empty lyrics', () => {
    const track = {
      trackId: 'track-1',
      artist: 'Charles Aznavour',
      title: 'La Bohème',
      rawLyrics: '',
      lines: [],
      processingStatus: { stage1_completed: false, stage2_completed: false, stage3_completed: false },
      lastUpdated: 0,
    } as any;
    const result = determineNextStep(track, []);
    expect(result.type).toBe('GET_LYRICS');
  });

  it('identifies GENERATE_ANALYSIS when track has lyrics but no lectureBlocks', () => {
    const track = {
      trackId: 'track-1',
      artist: 'Charles Aznavour',
      title: 'La Bohème',
      rawLyrics: 'La vie en Rose\n Quand elle me prend...',
      lines: [],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false },
      lastUpdated: 0,
    } as any;
    const result = determineNextStep(track, []);
    expect(result.type).toBe('GENERATE_ANALYSIS');
  });

  it('identifies GO_TO_STUDY when track has due cards', () => {
    const track = {
      trackId: 'track-1',
      artist: 'Charles Aznavour',
      title: 'La Bohème',
      rawLyrics: 'La vie en Rose\n Quand elle me prend...',
      lectureBlocks: [
        {
          id: 'b1',
          kind: 'lexical_groups',
          text: 'some breakdown',
          phrases: [{ text: 'phrase 1' }],
        },
      ],
      lines: [],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true },
      lastUpdated: 0,
    } as any;

    const cards = [
      createMockCard({
        trackId: 'track-1',
        due: new Date('2026-05-21T12:00:00Z'), // in past -> due!
        text: 'phrase 1',
      }),
    ];

    const result = determineNextStep(track, cards, dummyDate);
    expect(result.type).toBe('GO_TO_STUDY');
    expect(result.label).toBe('Start Study');
  });

  it('identifies SAVE_PHRASES when track has analysis and unsaved phrases, and no cards are due', () => {
    const track = {
      trackId: 'track-1',
      artist: 'Charles Aznavour',
      title: 'La Bohème',
      rawLyrics: 'La vie en Rose\n Quand elle me prend...',
      lectureBlocks: [
        {
          id: 'b1',
          kind: 'lexical_groups',
          text: 'some breakdown',
          phrases: [{ text: 'phrase 1' }],
        },
      ],
      lines: [],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true },
      lastUpdated: 0,
    } as any;

    // No cards at all
    const result1 = determineNextStep(track, [], dummyDate);
    expect(result1.type).toBe('SAVE_PHRASES');

    // Has saved card for 'phrase 1', but they are not due (due is in future)
    const cards = [
      createMockCard({
        trackId: 'track-1',
        due: new Date('2026-05-23T12:00:00Z'), // in future -> not due!
        text: 'phrase 1',
      }),
    ];
    // Now there are NO unsaved phrases, and nothing is due
    const result2 = determineNextStep(track, cards, dummyDate);
    expect(result2.type).toBe('TRACK_COMPLETE');
  });

  it('identifies TRACK_COMPLETE when all cards are saved and none are due', () => {
    const track = {
      trackId: 'track-1',
      artist: 'Charles Aznavour',
      title: 'La Bohème',
      rawLyrics: 'La vie en Rose\n Quand elle me prend...',
      lectureBlocks: [
        {
          id: 'b1',
          kind: 'lexical_groups',
          text: 'some breakdown',
          phrases: [{ text: 'phrase 1' }],
        },
      ],
      lines: [],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true },
      lastUpdated: 0,
    } as any;

    const cards = [
      createMockCard({
        trackId: 'track-1',
        due: new Date('2026-05-23T12:00:00Z'), // in future -> not due!
        text: 'phrase 1',
      }),
    ];

    const result = determineNextStep(track, cards, dummyDate);
    expect(result.type).toBe('TRACK_COMPLETE');
  });

  it('honors soft breakdownCompleted field to return TRACK_COMPLETE even with unsaved phrases', () => {
    const track = {
      trackId: 'track-1',
      artist: 'Charles Aznavour',
      title: 'La Bohème',
      rawLyrics: 'La vie en Rose\n Quand elle me prend...',
      breakdownCompleted: true,
      lectureBlocks: [
        {
          id: 'b1',
          kind: 'lexical_groups',
          text: 'some breakdown',
          phrases: [{ text: 'phrase 1' }],
        },
      ],
      lines: [],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: true },
      lastUpdated: 0,
    } as any;

    const result = determineNextStep(track, [], dummyDate);
    expect(result.type).toBe('TRACK_COMPLETE');
  });
});
