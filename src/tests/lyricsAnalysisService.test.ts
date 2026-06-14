import { describe, it, expect } from "vitest";
import { generateLineId, normalizeLineText, TrackLyricsData } from "../services/musicService";
import { 
  linkPhrasesToLines, 
  addUserPhrase, 
  acceptSuggestedPhrase,
  editPhrase, 
  deletePhrase,
  buildStarredLinesAnalysisInput,
  mergeGeneratedPhrasesForLines,
  resolvePhraseContext
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

  it("adds accepted AI-suggested phrases correctly with tags and metadata", () => {
    const initialTrack = createTrackMock({
      trackId: "track-ai-sugg",
      lines: [
        { id: "line1", index: 0, original: "Je ne regrette rien", lineId: "je-ne-regrette-rien", phrases: [] }
      ],
      phrases: []
    });

    const updated = acceptSuggestedPhrase(
      initialTrack,
      "regrette",
      "regret",
      "special verb explanation",
      "idiom",
      ["je-ne-regrette-rien"],
      "remember this"
    );

    expect(updated.phrases?.length).toBe(1);
    expect(updated.phrases?.[0].text).toBe("regrette");
    expect(updated.phrases?.[0].translation).toBe("regret");
    expect(updated.phrases?.[0].explanation).toBe("special verb explanation");
    expect(updated.phrases?.[0].type).toBe("idiom");
    expect(updated.phrases?.[0].source).toBe("user");
    expect(updated.phrases?.[0].note).toBe("remember this");
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

  describe("Targeted analysis of starred lyric lines", () => {
    it("builds clean inputs for selected starred lines", () => {
      const parentTrack = createTrackMock({
        trackId: "target_track",
        lines: [
          { id: "line1", lineId: "lid-1", index: 0, original: "First star child", isStarred: true, phrases: [] },
          { id: "line2", lineId: "lid-2", index: 1, original: "Second ordinary citizen", isStarred: false, phrases: [] }
        ],
        phrases: []
      });

      const payload = buildStarredLinesAnalysisInput(parentTrack);

      expect(payload.title).toBe("Test Track");
      expect(payload.artist).toBe("Test Artist");
      expect(payload.starredLines.length).toBe(1);
      expect(payload.starredLines[0].lineId).toBe("lid-1");
      expect(payload.starredLines[0].original).toBe("First star child");
    });

    it("merges LLM generated phrases while preventing duplicates and linking correct line ids", () => {
      const parentTrack = createTrackMock({
        trackId: "target_track",
        lines: [
          { id: "line1", lineId: "lid-1", index: 0, original: "Je t'aime moi non plus", isStarred: true, phrases: [] },
          { id: "line2", lineId: "lid-2", index: 1, original: "Un grand amour etrangle", isStarred: true, phrases: [] }
        ],
        phrases: []
      });

      // 1. First merge of new phrases
      const mockResult1 = [
        {
          text: "Je t'aime",
          translation: "I love you",
          explanation: "Grammar breakdown",
          lineIds: ["lid-1"],
          type: "phrase"
        },
        {
          text: "grand amour",
          translation: "great love",
          explanation: "Collocation sample",
          lineIds: ["lid-2", "lid-invalid-ignored"],
          type: "collocation"
        }
      ];

      const merged1 = mergeGeneratedPhrasesForLines(parentTrack, mockResult1);

      // Verify that phrases were added to track and lines
      expect(merged1.phrases?.length).toBe(2);
      expect(merged1.lines[0].phrases?.length).toBe(1);
      expect(merged1.lines[1].phrases?.length).toBe(1);

      expect(merged1.lines[0].phrases?.[0].text).toBe("Je t'aime");
      // Checked that invalid or non-starred lines were filtered out from lineIds
      const gp2 = merged1.phrases?.find(p => p.text === "grand amour");
      expect(gp2).toBeDefined();
      expect(gp2?.lineIds).toContain("lid-2");
      expect(gp2?.lineIds).not.toContain("lid-invalid-ignored");

      // 2. Second merge with a duplicate phrase text and a brand-new phrase
      const mockResult2 = [
        {
          text: "Je t'aime", // duplicate - should be skipped/merged without duplicates
          translation: "I love you indeed",
          explanation: "Alternate explanation",
          lineIds: ["lid-1"],
          type: "phrase"
        },
        {
          text: "moi non plus", // new
          translation: "me neither",
          explanation: "Famous expression matching and linking",
          lineIds: ["lid-1"],
          type: "idiom"
        }
      ];

      const merged2 = mergeGeneratedPhrasesForLines(merged1, mockResult2);

      // Verify that the duplicate is ignored and the new phrase is added
      expect(merged2.phrases?.length).toBe(3); // "Je t'aime", "grand amour", "moi non plus"
      expect(merged2.lines[0].phrases?.length).toBe(2); // "Je t'aime", "moi non plus"
    });
  });

  describe("resolvePhraseContext tests", () => {
    const mockLines = [
      { id: "1", lineId: "lid-1", index: 0, original: "Quand elle me prend", translation: "When she takes me", phrases: [] },
      { id: "2", lineId: "lid-2", index: 1, original: "dans ses bras", translation: "in her arms", phrases: [] },
      { id: "3", lineId: "lid-3", index: 2, original: "Elle me parle tout bas", translation: "She speaks softly", phrases: [] },
    ];

    it("resolves context line by lineIds", () => {
      const resolved = resolvePhraseContext(mockLines, ["lid-2"]);
      expect(resolved.length).toBe(1);
      expect(resolved[0].original).toBe("dans ses bras");
      expect(resolved[0].translation).toBe("in her arms");
    });

    it("resolves multiple lines for multi-line context", () => {
      const resolved = resolvePhraseContext(mockLines, ["lid-1", "lid-3"]);
      expect(resolved.length).toBe(2);
      expect(resolved[0].original).toBe("Quand elle me prend");
      expect(resolved[1].original).toBe("Elle me parle tout bas");
    });

    it("falls back to text search when lineIds are empty", () => {
      const resolved = resolvePhraseContext(mockLines, [], "me parle");
      expect(resolved.length).toBe(1);
      expect(resolved[0].original).toBe("Elle me parle tout bas");
    });

    it("falls back to text matching when lineIds are undefined", () => {
      const resolved = resolvePhraseContext(mockLines, undefined, "dans ses");
      expect(resolved.length).toBe(1);
      expect(resolved[0].original).toBe("dans ses bras");
    });

    it("deduplicates context lines with overlapping identifiers", () => {
      const resolved = resolvePhraseContext(mockLines, ["lid-2", "lid-2"]);
      expect(resolved.length).toBe(1);
      expect(resolved[0].original).toBe("dans ses bras");
    });

    it("returns empty array if no matches found", () => {
      const resolved = resolvePhraseContext(mockLines, ["lid-unknown"], "something completely different");
      expect(resolved.length).toBe(0);
    });
  });
});
