import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackSessionFacade } from "../application";
import { aiClient } from "../application/adapters/geminiAIAdapter";
import { 
  trackCacheRepository, 
  recentHistoryRepository, 
  dailyTrackerRepository 
} from "../application/adapters/browserUserDataRepository";
import { TrackLyricsData } from "../services/musicService";

// Mock the dependencies of the Facade
vi.mock("../application/adapters/geminiAIAdapter", () => {
  return {
    aiClient: {
      normalizeString: vi.fn(),
      getTrackMeaningFromCache: vi.fn(),
      fetchTrackMeaning: vi.fn(),
      getLineTranslations: vi.fn(),
      getPhraseAnalysis: vi.fn(),
      extractLyricsMetadata: vi.fn(),
      saveTrackToSharedCache: vi.fn(),
      computeTrackKey: vi.fn(),
      computeLyricsHash: vi.fn(),
      fetchStructuredLecture: vi.fn(),
      getCachedStructuredLecture: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock("../application/adapters/browserUserDataRepository", () => {
  return {
    trackCacheRepository: {
      getCachedTrack: vi.fn(),
      saveTrackData: vi.fn(),
    },
    recentHistoryRepository: {
      getRecentTracks: vi.fn(),
      addRecentTrack: vi.fn(),
    },
    dailyTrackerRepository: {
      recordTrackExplored: vi.fn(),
    },
    userDataRepository: {},
  };
});

// Mock iTunes metadata/lyrics
vi.mock("../services/musicService", async () => {
  const actual = await vi.importActual<any>("../services/musicService");
  return {
    ...actual,
    fetchLyrics: vi.fn(),
    searchITunes: vi.fn(),
  };
});

import { fetchLyrics, searchITunes } from "../services/musicService";

describe("TrackSessionFacade Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchITunes).mockResolvedValue([] as any);
    vi.mocked(aiClient.getTrackMeaningFromCache).mockResolvedValue(null);
  });

  describe("selectTrack", () => {
    it("should retrieve track from cache if it exists, record exploration, and update recent tracks", async () => {
      const mockTrack = { id: "track-123", title: "Let It Be", artist: "The Beatles" };
      const cachedTrackData: TrackLyricsData = {
        trackId: "track-123",
        artist: "The Beatles",
        title: "Let It Be",
        rawLyrics: "Let it be",
        lines: [],
        processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false },
        lastUpdated: Date.now(),
      };

      vi.mocked(trackCacheRepository.getCachedTrack).mockReturnValue(cachedTrackData);

      const result = await trackSessionFacade.selectTrack(mockTrack, "Spanish");

      expect(dailyTrackerRepository.recordTrackExplored).toHaveBeenCalled();
      expect(trackCacheRepository.getCachedTrack).toHaveBeenCalledWith("track-123");
      expect(recentHistoryRepository.addRecentTrack).toHaveBeenCalled();
      expect(result.trackId).toBe("track-123");
    });

    it("should construct initialTrack if not cached, update recent tracks, and trigger background lookups", async () => {
      const mockTrack = { id: "track-777", title: "New Song", artist: "New Artist" };
      vi.mocked(trackCacheRepository.getCachedTrack).mockReturnValue(null);
      vi.mocked(aiClient.normalizeString).mockImplementation((str) => str.toLowerCase().trim());
      vi.mocked(aiClient.getTrackMeaningFromCache).mockResolvedValue(null);

      const result = await trackSessionFacade.selectTrack(mockTrack, "Russian");

      expect(dailyTrackerRepository.recordTrackExplored).toHaveBeenCalled();
      expect(trackCacheRepository.saveTrackData).toHaveBeenCalledWith("track-777", expect.any(Object));
      expect(recentHistoryRepository.addRecentTrack).toHaveBeenCalled();
      expect(result.trackId).toBe("track-777");
      expect(result.processingStatus.stage1_completed).toBe(false);
    });
  });

  describe("analyzeSongMeaningAndTranslations", () => {
    it("should fetch lyrics if missing, call aiClient for meaning and line translations, and save the track", async () => {
      const initialTrack: TrackLyricsData = {
        trackId: "track-abc",
        artist: "Coldplay",
        title: "Yellow",
        rawLyrics: "",
        lines: [],
        processingStatus: { stage1_completed: false, stage2_completed: false, stage3_completed: false },
        lastUpdated: Date.now(),
      };

      const mockLyricsData = { lyrics: "Look at the stars\nLook how they shine", source: "MockLrc" };
      vi.mocked(fetchLyrics).mockResolvedValue(mockLyricsData);

      const mockTranslations = [
        { originalText: "Look at the stars", translation: "Mira las estrellas", language: "es" },
        { originalText: "Look how they shine", translation: "Mira cómo brillan", language: "es" },
      ];

      vi.mocked(aiClient.computeTrackKey).mockResolvedValue("track-coldplay-yellow");
      vi.mocked(aiClient.getLineTranslations).mockResolvedValue(mockTranslations);
      vi.mocked(aiClient.saveTrackToSharedCache).mockResolvedValue();

      const updated = await trackSessionFacade.analyzeSongMeaningAndTranslations(initialTrack, "Spanish");

      expect(fetchLyrics).toHaveBeenCalledWith("Coldplay", "Yellow");
      expect(aiClient.getLineTranslations).toHaveBeenCalled();
      expect(trackCacheRepository.saveTrackData).toHaveBeenCalled();
      expect(updated.rawLyrics).toBe(mockLyricsData.lyrics);
      expect(updated.meaning).toBe("");
      expect(updated.lines[0].translation).toBe("Mira las estrellas");
    });
  });

  describe("runDeepPhraseAnalysis", () => {
    it("should run stage 3 phrase analysis and attach phrases to track lines", async () => {
      const track: TrackLyricsData = {
        trackId: "track-xyz",
        artist: "Adele",
        title: "Hello",
        rawLyrics: "Hello from the other side",
        lines: [{ id: "track-xyz:line:0", index: 0, original: "Hello from the other side", phrases: [] }],
        processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false },
        lastUpdated: Date.now(),
      };

      const mockPhrases = [
        { lineIndex: 0, text: "the other side", translation: "другая сторона", explanation: "Idiom", language: "ru" },
      ];

      vi.mocked(aiClient.computeTrackKey).mockResolvedValue("track-adele-hello");
      vi.mocked(aiClient.getPhraseAnalysis).mockResolvedValue(mockPhrases);
      vi.mocked(aiClient.saveTrackToSharedCache).mockResolvedValue();

      const result = await trackSessionFacade.runDeepPhraseAnalysis(track, "Russian");

      expect(aiClient.getPhraseAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          track: { title: "Hello", artists: ["adele"] },
          targetLanguage: "Russian"
        }),
        "track-adele-hello",
        "Russian"
      );
      expect(result.processingStatus.stage3_completed).toBe(true);
      expect(result.lines[0].phrases).toHaveLength(1);
      expect(result.lines[0].phrases[0].text).toBe("the other side");
    });
  });

  describe("submitManualLyrics", () => {
    it("should instantly store initial structures and run metadata extracts", async () => {
      const track: TrackLyricsData = {
        trackId: "track-manual",
        artist: "Artist",
        title: "Title",
        rawLyrics: "",
        lines: [],
        processingStatus: { stage1_completed: false, stage2_completed: false, stage3_completed: false },
        lastUpdated: Date.now(),
      };

      vi.mocked(aiClient.extractLyricsMetadata).mockResolvedValue({ authors: "Composer ABC" });
      vi.mocked(aiClient.fetchTrackMeaning).mockResolvedValue({
        originalLanguage: "English",
        difficulty: "beginner",
        meanings: { en: "Meaning", es: "Significado", ru: "Значение", pl: "Znaczenie" },
      });

      const result = await trackSessionFacade.submitManualLyrics(track, "First Line\nSecond Line", "Spanish");

      expect(aiClient.extractLyricsMetadata).toHaveBeenCalled();
      expect(trackCacheRepository.saveTrackData).toHaveBeenCalled();
      expect(result.rawLyrics).toBe("First Line\nSecond Line");
      expect(result.lines).toHaveLength(2);
    });
  });
});
