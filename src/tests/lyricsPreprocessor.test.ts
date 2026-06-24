import { describe, it, expect } from "vitest";
import {
  computeStableHash,
  normalizeTrackTitle,
  normalizeArtists,
  normalizeLyricsLine,
  computeLineKey,
  inferBlockType,
  parseRawLyrics,
  prepareLyricsInput
} from "../services/lyricsPreprocessor";

describe("Lyrics Preprocessor Helper", () => {
  describe("computeStableHash", () => {
    it("should compute a stable 8-character hex hash", () => {
      const hash1 = computeStableHash("hello world");
      const hash2 = computeStableHash("hello world");
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);
      expect(/^[0-9a-f]{8}$/.test(hash1)).toBe(true);
    });

    it("should distinguish different inputs", () => {
      const hash1 = computeStableHash("hello world");
      const hash2 = computeStableHash("hello world!");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("normalizeTrackTitle", () => {
    it("should strip trailing additions inside parentheses or square brackets", () => {
      expect(normalizeTrackTitle("Song Title (Live)")).toBe("Song Title");
      expect(normalizeTrackTitle("Song Title [Remastered 2011]")).toBe("Song Title");
      expect(normalizeTrackTitle("Another Song (2011 Remaster)")).toBe("Another Song");
      expect(normalizeTrackTitle("Some Track (feat. Artist)")).toBe("Some Track");
      expect(normalizeTrackTitle("Track Name [Acoustic Version]")).toBe("Track Name");
    });

    it("should preserve title if brackets don't contain metadata words", () => {
      expect(normalizeTrackTitle("The Boy (Who Cried Wolf)")).toBe("The Boy (Who Cried Wolf)");
    });
  });

  describe("normalizeArtists", () => {
    it("should trim, lowercase, sort alphabetically and filter empty strings", () => {
      const artists = ["  Coldplay ", "Adele", ""];
      const normalized = normalizeArtists(artists);
      expect(normalized).toEqual(["adele", "coldplay"]);
    });

    it("should produce identical results regardless of original order", () => {
      const order1 = normalizeArtists(["The Smiths", "Morrissey"]);
      const order2 = normalizeArtists(["Morrissey", "The Smiths"]);
      expect(order1).toEqual(order2);
    });
  });

  describe("normalizeLyricsLine", () => {
    it("should strip LRC timestamps", () => {
      expect(normalizeLyricsLine("[00:12.34] Hello world")).toBe("Hello world");
      expect(normalizeLyricsLine("[01:05] Hello world")).toBe("Hello world");
    });

    it("should strip section markers in square or round brackets", () => {
      expect(normalizeLyricsLine("[Verse 1]")).toBe("");
      expect(normalizeLyricsLine("(Chorus)")).toBe("");
      expect(normalizeLyricsLine("[Chorus]")).toBe("");
    });

    it("should collapse multiple spaces", () => {
      expect(normalizeLyricsLine("  Hello    beautiful   world  ")).toBe("Hello beautiful world");
    });
  });

  describe("computeLineKey", () => {
    it("should produce identical hashes for semantically identical lines", () => {
      const key1 = computeLineKey(" [00:12.34]  Hello   World! ");
      const key2 = computeLineKey("hello world!");
      expect(key1).toBe(key2);
    });
  });

  describe("inferBlockType", () => {
    it("should infer correct block kinds", () => {
      expect(inferBlockType("[Chorus]")).toBe("chorus");
      expect(inferBlockType("[Verse 1]")).toBe("verse");
      expect(inferBlockType("[Intro]")).toBe("intro");
      expect(inferBlockType("[Bridge]")).toBe("bridge");
    });
  });

  describe("parseRawLyrics", () => {
    it("should parse raw lyrics text into non-empty structured lines", () => {
      const raw = `
[Intro]
[00:01] Hello intro
[Chorus]
[00:10] This is the chorus line
      `;
      const lines = parseRawLyrics(raw);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toEqual({
        lineIndex: 0,
        lineKey: computeLineKey("Hello intro"),
        text: "Hello intro",
        blockType: "intro"
      });
      expect(lines[1]).toEqual({
        lineIndex: 1,
        lineKey: computeLineKey("This is the chorus line"),
        text: "This is the chorus line",
        blockType: "chorus"
      });
    });
  });

  describe("prepareLyricsInput", () => {
    it("should assemble standard PreparedLyricsInput perfectly", () => {
      const title = "Yellow (Live)";
      const artists = ["Coldplay"];
      const lyrics = "[Verse 1]\nLook at the stars";
      const result = prepareLyricsInput(title, artists, lyrics, "Russian");

      expect(result.track.title).toBe("Yellow");
      expect(result.track.artists).toEqual(["coldplay"]);
      expect(result.targetLanguage).toBe("Russian");
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].text).toBe("Look at the stars");
    });
  });
});
