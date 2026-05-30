import { describe, it, expect } from "vitest";
import { generateLineId, normalizeLineText } from "../services/musicService";
import { 
  linkPhrasesToLines, 
  addUserPhrase, 
  editPhrase, 
  deletePhrase 
} from "../services/lyricsAnalysisService";

describe("lyricsAnalysisService and Line linking tests", () => {
  it("normalizes lyric lines and generates stable IDs successfully", () => {
    const rawLine = "  Hello, world!!! (Let's play)...   ";
    const normalized = normalizeLineText(rawLine);
    expect(normalized).toBe("hello world lets play");

    const id1 = generateLineId(rawLine);
    const id2 = generateLineId("hello, world, let's play");
    expect(id1).toBe(id2);
  });

  it("links phrases to lyric lines based on text contents and matches lineIds", () => {
    const dummyTrack = {
      trackId: "track1",
      artist: "French Artist",
      title: "La Vie En Rose",
      rawLyrics: "Quand elle me prend dans ses bras\nElle me parle tout bas",
      lines: [
        { original: "Quand elle me prend dans ses bras", translation: "When she takes me in her arms" },
        { original: "Elle me parle tout bas", translation: "She speaks to me softly" }
      ],
      phrases: [
        { id: "p1", phrase: "dans ses bras", translation: "in her arms" },
        { id: "p2", phrase: "Elle me parle", translation: "She speaks to me" }
      ]
    };

    const linked = linkPhrasesToLines(dummyTrack);

    expect(linked.lines[0].lineId).toBeDefined();
    expect(linked.lines[1].lineId).toBeDefined();

    // The phrase "dans ses bras" should be linked to line 1
    const phraseBras = linked.phrases.find(p => p.phrase === "dans ses bras");
    expect(phraseBras).toBeDefined();
    expect(phraseBras?.lineIds).toContain(linked.lines[0].lineId);

    // The line 1 phrases should contain the linked phrase
    expect(linked.lines[0].phrases).toBeDefined();
    expect(linked.lines[0].phrases?.some(p => p.phrase === "dans ses bras")).toBe(true);
  });

  it("enables adding user custom phrases dynamically", () => {
    const initialTrack = {
      trackId: "track1",
      lines: [
        { original: "Je ne regrette rien", translation: "I regret nothing", lineId: "je-ne-regrette-rien" }
      ],
      phrases: []
    };

    const updated = addUserPhrase(
      initialTrack,
      "regrette",
      "regret",
      "verbs conjugated in first person",
      "je-ne-regrette-rien"
    );

    expect(updated.phrases.length).toBe(1);
    expect(updated.phrases[0].text).toBe("regrette");
    expect(updated.phrases[0].translation).toBe("regret");
    expect(updated.phrases[0].source).toBe("user");
    expect(updated.phrases[0].lineIds).toContain("je-ne-regrette-rien");

    const lineWithAddedPhrase = updated.lines[0];
    expect(lineWithAddedPhrase.phrases?.length).toBe(1);
    expect(lineWithAddedPhrase.phrases?.[0].text).toBe("regrette");
  });

  it("allows editing existing phrases correctly", () => {
    const initialTrack = {
      trackId: "track1",
      phrases: [
        { id: "p1", phrase: "test phrase", translation: "old translation", explanation: "old explanation", source: "user" }
      ],
      lines: [
        { original: "test phrase line", lineId: "tpl" }
      ]
    } as any;

    const updated = editPhrase(initialTrack, "p1", {
      translation: "new translation",
      explanation: "new explanation"
    });

    expect(updated.phrases[0].translation).toBe("new translation");
    expect(updated.phrases[0].explanation).toBe("new explanation");
  });

  it("handles deleting/hiding phrases properly", () => {
    const initialTrack = {
      trackId: "track1",
      phrases: [
        { id: "p1", phrase: "to be deleted", translation: "del", source: "user", lineIds: ["tpl"] }
      ],
      lines: [
        { original: "to be deleted line", lineId: "tpl", phrases: [{ id: "p1", phrase: "to be deleted" }] }
      ]
    } as any;

    const updated = deletePhrase(initialTrack, "p1");
    expect(updated.phrases.length).toBe(0);
    expect(updated.lines[0].phrases?.length).toBe(0);
  });
});
