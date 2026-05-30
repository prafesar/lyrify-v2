import { describe, it, expect } from "vitest";
import { generateLineId, normalizeLineText, TrackLyricsData } from "../services/musicService";
import { 
  linkPhrasesToLines, 
  addUserPhrase, 
  editPhrase, 
  deletePhrase 
} from "../services/lyricsAnalysisService";

/**
 * Factory helper to construct clean TrackLyricsData mocks with all mandatory fields
 */
function createTrackMock(overrides: Partial<TrackLyricsData> = {}): TrackLyricsData {
  return {
    trackId: "track_default",
    artist: "Test Artist",
    title: "Test Track",
    rawLyrics: "Line One\nLine Two",
    processingStatus: {
      stage1_completed: true,
      stage2_completed: true,
      stage3_completed: true
    },
    lastUpdated: Date.now(),
    lines: [
      { id: "line_1", index: 0, original: "Line One", translation: "Translation One", phrases: [] },
      { id: "line_2", index: 1, original: "Line Two", translation: "Translation Two", phrases: [] }
    ],
    phrases: [],
    ...overrides
  };
}

describe("lyricsAnalysisService and Line linking tests", () => {
  it("normalizes lyric lines and generates stable IDs successfully", () => {
    const rawLine = "  Hello, world!!! (Let's play)...   ";
    const normalized = normalizeLineText(rawLine);
    expect(normalized).toBe("hello world lets play");

    const id1 = generateLineId(rawLine);
    const id2 = generateLineId("hello, world, let's play");
    expect(id1).toBe(id2);
  });

  it("links phrases to lyric lines based on text contents and matches lineIds using canonical 'text' property", () => {
    const dummyTrack = createTrackMock({
      trackId: "track1",
      artist: "French Artist",
      title: "La Vie En Rose",
      rawLyrics: "Quand elle me prend dans ses bras\nElle me parle tout bas",
      lines: [
        { id: "l1", index: 0, original: "Quand elle me prend dans ses bras", translation: "When she takes me in her arms", phrases: [] },
        { id: "l2", index: 1, original: "Elle me parle tout bas", translation: "She speaks to me softly", phrases: [] }
      ],
      phrases: [
        { id: "p1", text: "dans ses bras", lemmas: [], type: "phrase", translation: "in her arms" },
        { id: "p2", text: "Elle me parle", lemmas: [], type: "phrase", translation: "She speaks to me" }
      ]
    });

    const linked = linkPhrasesToLines(dummyTrack);

    expect(linked.lines[0].lineId).toBeDefined();
    expect(linked.lines[1].lineId).toBeDefined();

    // Find the phrase "dans ses bras" on the track
    const phraseBras = linked.phrases?.find(p => p.text === "dans ses bras");
    expect(phraseBras).toBeDefined();
    expect(phraseBras?.lineIds).toContain(linked.lines[0].lineId);

    // The line 1 phrases should contain the linked phrase
    expect(linked.lines[0].phrases).toBeDefined();
    expect(linked.lines[0].phrases?.some(p => p.text === "dans ses bras")).toBe(true);
  });

  it("handles legacy 'phrase' support under the hood and outputs canonical 'text'", () => {
    // Input track with old legacy 'phrase' properties inside track.phrases
    const legacyTrack = createTrackMock({
      trackId: "legacy_track",
      lines: [
        { id: "l1", index: 0, original: "hello beautiful world", phrases: [] }
      ],
      phrases: [
        { id: "legacy_id", phrase: "beautiful world", translation: "прекрасный мир" } as any
      ]
    });

    const linked = linkPhrasesToLines(legacyTrack);

    // Verify it converts 'phrase' to 'text'
    const cleanPhrase = linked.phrases?.find(p => p.id === "legacy_id");
    expect(cleanPhrase).toBeDefined();
    expect(cleanPhrase?.text).toBe("beautiful world");
    expect((cleanPhrase as any).phrase).toBeUndefined(); // Legacy property is removed or aligned
    
    // Check it linked correctly to the corresponding line
    expect(linked.lines[0].phrases?.[0].text).toBe("beautiful world");
    expect(linked.lines[0].phrases?.[0].lineIds).toContain(linked.lines[0].lineId);
  });

  it("enables adding user custom phrases dynamically", () => {
    const initialTrack = createTrackMock({
      trackId: "track1",
      lines: [
        { id: "l1", index: 0, original: "Je ne regrette rien", translation: "I regret nothing", lineId: "je-ne-regrette-rien", phrases: [] }
      ],
      phrases: []
    });

    const updated = addUserPhrase(
      initialTrack,
      "regrette",
      "regret",
      "verbs conjugated in first person",
      "je-ne-regrette-rien"
    );

    expect(updated.phrases?.length).toBe(1);
    expect(updated.phrases?.[0].text).toBe("regrette");
    expect(updated.phrases?.[0].translation).toBe("regret");
    expect(updated.phrases?.[0].source).toBe("user");
    expect(updated.phrases?.[0].lineIds).toContain("je-ne-regrette-rien");

    const lineWithAddedPhrase = updated.lines[0];
    expect(lineWithAddedPhrase.phrases?.length).toBe(1);
    expect(lineWithAddedPhrase.phrases?.[0].text).toBe("regrette");
  });

  it("allows editing existing phrases correctly", () => {
    const initialTrack = createTrackMock({
      trackId: "track1",
      phrases: [
        { id: "p1", text: "test phrase", lemmas: [], type: "phrase", translation: "old translation", explanation: "old explanation", source: "user" }
      ],
      lines: [
        { id: "l1", index: 0, original: "test phrase line", lineId: "tpl", phrases: [] }
      ]
    });

    const updated = editPhrase(initialTrack, "p1", {
      translation: "new translation",
      explanation: "new explanation"
    });

    expect(updated.phrases?.[0].translation).toBe("new translation");
    expect(updated.phrases?.[0].explanation).toBe("new explanation");
  });

  it("handles deleting/hiding phrases properly", () => {
    const initialTrack = createTrackMock({
      trackId: "track1",
      phrases: [
        { id: "p1", text: "to be deleted", lemmas: [], type: "phrase", translation: "del", source: "user", lineIds: ["tpl"] }
      ],
      lines: [
        { id: "l1", index: 0, original: "to be deleted line", lineId: "tpl", phrases: [{ id: "p1", text: "to be deleted", lemmas: [], type: "phrase" }] }
      ]
    });

    const updated = deletePhrase(initialTrack, "p1");
    expect(updated.phrases?.length).toBe(0);
    expect(updated.lines[0].phrases?.length).toBe(0);
  });
});
