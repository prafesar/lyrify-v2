import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkServerCache, computeLyricsKey } from "../services/serverCacheLookupService";
import { userPreferencesRepository } from "../application/adapters/browserUserDataRepository";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock user preferences repository
vi.mock("../application/adapters/browserUserDataRepository", () => {
  return {
    userPreferencesRepository: {
      getPreference: vi.fn(),
    },
  };
});

describe("ServerCacheLookupService Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeLyricsKey", () => {
    it("should compute a normalized lyricsKey correctly", () => {
      const key = computeLyricsKey("Let It Be (Remastered 2011)", ["The Beatles", ""]);
      expect(key).toBe("track-the beatles-let-it-be");
    });
  });

  describe("checkServerCache", () => {
    it("should return parsed translation and lecture data on complete cache hit", async () => {
      vi.mocked(userPreferencesRepository.getPreference).mockReturnValue("compact");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            lyricsKey: "track-the-beatles-let-it-be",
            translation: [
              {
                lineKey: "key-1",
                lineIndex: 0,
                original: "When I find myself in times of trouble",
                translation: "Когда я оказываюсь в трудных временах",
                language: "ru"
              }
            ],
            lectureCompact: [
              {
                kind: "intro",
                title: "Introduction",
                lines: ["This is a classic song about comfort."]
              }
            ],
            lectureRich: null,
            translationCached: true,
            lectureCompactCached: true,
            lectureRichCached: false
          }
        })
      });

      const result = await checkServerCache("Let It Be", ["The Beatles"]);
      
      expect(result).not.toBeNull();
      expect(result?.hasTranslation).toBe(true);
      expect(result?.hasLecture).toBe(true);
      expect(result?.translation).toHaveLength(1);
      expect(result?.lectureBlocks).toHaveLength(1);
      expect(result?.lectureBlocks?.[0].title).toBe("Introduction");
    });

    it("should handle cache hit for rich lecture when preferred", async () => {
      vi.mocked(userPreferencesRepository.getPreference).mockReturnValue("rich");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            lyricsKey: "track-the-beatles-let-it-be",
            translation: [
              {
                lineKey: "key-1",
                lineIndex: 0,
                original: "When I find myself in times of trouble",
                translation: "Когда я оказываюсь в трудных временах",
                language: "ru"
              }
            ],
            lectureCompact: null,
            lectureRich: [
              {
                kind: "essay",
                title: "Deep Commentary",
                lines: ["An exhaustive analysis of lyrics."]
              }
            ],
            translationCached: true,
            lectureCompactCached: false,
            lectureRichCached: true
          }
        })
      });

      const result = await checkServerCache("Let It Be", ["The Beatles"]);
      
      expect(result).not.toBeNull();
      expect(result?.hasTranslation).toBe(true);
      expect(result?.hasLecture).toBe(true);
      expect(result?.lectureBlocks?.[0].title).toBe("Deep Commentary");
    });

    it("should handle partial cache hit (translation present, lecture missing)", async () => {
      vi.mocked(userPreferencesRepository.getPreference).mockReturnValue("compact");
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "success",
          data: {
            lyricsKey: "track-the-beatles-let-it-be",
            translation: [
              {
                lineKey: "key-1",
                lineIndex: 0,
                original: "When I find myself in times of trouble",
                translation: "Когда я оказываюсь в трудных временах",
                language: "ru"
              }
            ],
            lectureCompact: null,
            lectureRich: null,
            translationCached: true,
            lectureCompactCached: false,
            lectureRichCached: false
          }
        })
      });

      const result = await checkServerCache("Let It Be", ["The Beatles"]);
      
      expect(result).not.toBeNull();
      expect(result?.hasTranslation).toBe(true);
      expect(result?.hasLecture).toBe(false);
      expect(result?.lectureBlocks).toBeNull();
    });

    it("should return null and fallback gracefully on lookup network/response failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await checkServerCache("Let It Be", ["The Beatles"]);
      expect(result).toBeNull();
    });

    it("should return null and fallback gracefully on non-ok HTTP status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });

      const result = await checkServerCache("Let It Be", ["The Beatles"]);
      expect(result).toBeNull();
    });
  });
});
