import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRANSLATION_PROMPT_VERSION } from "../application/ports/aiPort";

// Define a testable version of the orchestration logic from handleGenerateAnalysis in useTrackSession
async function runOrchestrateGenerateAnalysis(params: {
  trackData: any;
  force: boolean;
  checkServerCache: (title: string, artists: string[]) => Promise<any>;
  fetchLyrics: (artist: string, title: string) => Promise<any>;
  analyzeSongMeaningAndTranslations: (track: any, lang: string) => Promise<any>;
  fetchStructuredLecture: (lyrics: string, force: boolean) => Promise<any>;
  runDeepPhraseAnalysis: (track: any, lang: string, force: boolean) => Promise<any>;
  targetLanguage: string;
}) {
  const {
    trackData: initialTrack,
    force,
    checkServerCache,
    fetchLyrics,
    analyzeSongMeaningAndTranslations,
    fetchStructuredLecture,
    runDeepPhraseAnalysis,
    targetLanguage
  } = params;

  let trackData = { ...initialTrack };
  let cacheResult = null;

  if (!force) {
    try {
      cacheResult = await checkServerCache(trackData.title, [trackData.artist]);
    } catch (_e) {
      // safe fallback
    }
  }

  if (cacheResult && cacheResult.hasTranslation) {
    let lyrics = trackData.rawLyrics;
    if (!lyrics) {
      lyrics = cacheResult.translation.map((line: any) => line.original).join("\n");
      trackData = {
        ...trackData,
        rawLyrics: lyrics,
        lines: [{ original: lyrics, translation: "" }],
        processingStatus: { ...trackData.processingStatus, stage1_completed: true }
      };
    }

    trackData = {
      ...trackData,
      translationPromptVersion: TRANSLATION_PROMPT_VERSION,
      processingStatus: { ...trackData.processingStatus, stage2_completed: true }
    };
  }

  if (cacheResult && cacheResult.hasLecture && cacheResult.lectureBlocks) {
    trackData = {
      ...trackData,
      lectureBlocks: cacheResult.lectureBlocks,
      processingStatus: { ...trackData.processingStatus, stage3_completed: true }
    };
  }

  let lyrics = trackData.rawLyrics;
  if (!lyrics) {
    const fetched = await fetchLyrics(trackData.artist, trackData.title);
    lyrics = fetched.lyrics;
    trackData = {
      ...trackData,
      rawLyrics: lyrics,
      processingStatus: { ...trackData.processingStatus, stage1_completed: true }
    };
  }

  const isTranslationOutdated = !trackData.translationPromptVersion || trackData.translationPromptVersion < TRANSLATION_PROMPT_VERSION;
  const needsTranslation = force || !trackData.processingStatus.stage2_completed || isTranslationOutdated;

  if (needsTranslation) {
    trackData = await analyzeSongMeaningAndTranslations(trackData, targetLanguage);
  }

  if (force || !trackData.lectureBlocks || trackData.lectureBlocks.length === 0) {
    const blocks = await fetchStructuredLecture(trackData.rawLyrics, force);
    trackData = {
      ...trackData,
      lectureBlocks: blocks
    };
  }

  const skipStage3 = !force && cacheResult && cacheResult.hasLecture;
  if (!skipStage3) {
    trackData = await runDeepPhraseAnalysis(trackData, targetLanguage, force);
  }

  return trackData;
}

describe("Cache-First Orchestration Tests", () => {
  let mockCheckServerCache: any;
  let mockFetchLyrics: any;
  let mockAnalyzeSongMeaningAndTranslations: any;
  let mockFetchStructuredLecture: any;
  let mockRunDeepPhraseAnalysis: any;

  beforeEach(() => {
    mockCheckServerCache = vi.fn();
    mockFetchLyrics = vi.fn().mockResolvedValue({ lyrics: "some lyrics" });
    mockAnalyzeSongMeaningAndTranslations = vi.fn().mockImplementation((track) => Promise.resolve({
      ...track,
      processingStatus: { ...track.processingStatus, stage2_completed: true },
      translationPromptVersion: TRANSLATION_PROMPT_VERSION
    }));
    mockFetchStructuredLecture = vi.fn().mockResolvedValue([{ kind: "intro", text: "intro text" }]);
    mockRunDeepPhraseAnalysis = vi.fn().mockImplementation((track) => Promise.resolve({
      ...track,
      processingStatus: { ...track.processingStatus, stage3_completed: true }
    }));
  });

  it("should skip all expensive steps on complete cache hit", async () => {
    const initialTrack = {
      trackId: "track-1",
      title: "Title 1",
      artist: "Artist 1",
      rawLyrics: "Line 1\nLine 2",
      lines: [{ original: "Line 1" }, { original: "Line 2" }],
      processingStatus: { stage1_completed: true, stage2_completed: false, stage3_completed: false }
    };

    mockCheckServerCache.mockResolvedValue({
      hasTranslation: true,
      hasLecture: true,
      translation: [
        { original: "Line 1", translation: "Перевод 1", language: "ru" },
        { original: "Line 2", translation: "Перевод 2", language: "ru" }
      ],
      lectureBlocks: [{ kind: "intro", text: "cached intro text" }]
    });

    const result = await runOrchestrateGenerateAnalysis({
      trackData: initialTrack,
      force: false,
      checkServerCache: mockCheckServerCache,
      fetchLyrics: mockFetchLyrics,
      analyzeSongMeaningAndTranslations: mockAnalyzeSongMeaningAndTranslations,
      fetchStructuredLecture: mockFetchStructuredLecture,
      runDeepPhraseAnalysis: mockRunDeepPhraseAnalysis,
      targetLanguage: "Russian"
    });

    // Verify cache check happened
    expect(mockCheckServerCache).toHaveBeenCalledWith("Title 1", ["Artist 1"]);

    // Verify expensive generation endpoints were skipped
    expect(mockAnalyzeSongMeaningAndTranslations).not.toHaveBeenCalled();
    expect(mockFetchStructuredLecture).not.toHaveBeenCalled();
    expect(mockRunDeepPhraseAnalysis).not.toHaveBeenCalled();

    // Verify final state includes cached translations and lecture blocks
    expect(result.processingStatus.stage2_completed).toBe(true);
    expect(result.processingStatus.stage3_completed).toBe(true);
    expect(result.lectureBlocks).toEqual([{ kind: "intro", text: "cached intro text" }]);
  });

  it("should run missing steps on partial cache hit (translation cached, lecture missing)", async () => {
    const initialTrack = {
      trackId: "track-2",
      title: "Title 2",
      artist: "Artist 2",
      rawLyrics: "Line 1",
      lines: [{ original: "Line 1" }],
      processingStatus: { stage1_completed: true, stage2_completed: false, stage3_completed: false }
    };

    mockCheckServerCache.mockResolvedValue({
      hasTranslation: true,
      hasLecture: false,
      translation: [{ original: "Line 1", translation: "Перевод 1", language: "ru" }],
      lectureBlocks: null
    });

    const result = await runOrchestrateGenerateAnalysis({
      trackData: initialTrack,
      force: false,
      checkServerCache: mockCheckServerCache,
      fetchLyrics: mockFetchLyrics,
      analyzeSongMeaningAndTranslations: mockAnalyzeSongMeaningAndTranslations,
      fetchStructuredLecture: mockFetchStructuredLecture,
      runDeepPhraseAnalysis: mockRunDeepPhraseAnalysis,
      targetLanguage: "Russian"
    });

    // Reused translation -> analyzeSongMeaningAndTranslations not called
    expect(mockAnalyzeSongMeaningAndTranslations).not.toHaveBeenCalled();

    // Missing lecture -> fetchStructuredLecture called
    expect(mockFetchStructuredLecture).toHaveBeenCalled();

    // Deep phrase analysis called because lecture was not cached
    expect(mockRunDeepPhraseAnalysis).toHaveBeenCalled();

    expect(result.lectureBlocks).toEqual([{ kind: "intro", text: "intro text" }]);
  });

  it("should run missing steps on partial cache hit (translation missing, lecture cached)", async () => {
    const initialTrack = {
      trackId: "track-3",
      title: "Title 3",
      artist: "Artist 3",
      rawLyrics: "Line 1",
      lines: [{ original: "Line 1" }],
      processingStatus: { stage1_completed: true, stage2_completed: false, stage3_completed: false }
    };

    mockCheckServerCache.mockResolvedValue({
      hasTranslation: false,
      hasLecture: true,
      translation: null,
      lectureBlocks: [{ kind: "intro", text: "cached intro text" }]
    });

    await runOrchestrateGenerateAnalysis({
      trackData: initialTrack,
      force: false,
      checkServerCache: mockCheckServerCache,
      fetchLyrics: mockFetchLyrics,
      analyzeSongMeaningAndTranslations: mockAnalyzeSongMeaningAndTranslations,
      fetchStructuredLecture: mockFetchStructuredLecture,
      runDeepPhraseAnalysis: mockRunDeepPhraseAnalysis,
      targetLanguage: "Russian"
    });

    // Translation missing -> analyzeSongMeaningAndTranslations called
    expect(mockAnalyzeSongMeaningAndTranslations).toHaveBeenCalled();

    // Lecture cached -> fetchStructuredLecture not called
    expect(mockFetchStructuredLecture).not.toHaveBeenCalled();

    // Lecture cached -> deep phrase analysis skipped
    expect(mockRunDeepPhraseAnalysis).not.toHaveBeenCalled();
  });

  it("should fallback gracefully to standard flow on cache lookup failure or miss", async () => {
    const initialTrack = {
      trackId: "track-4",
      title: "Title 4",
      artist: "Artist 4",
      rawLyrics: "Line 1",
      lines: [{ original: "Line 1" }],
      processingStatus: { stage1_completed: true, stage2_completed: false, stage3_completed: false }
    };

    mockCheckServerCache.mockRejectedValue(new Error("Network Error"));

    await runOrchestrateGenerateAnalysis({
      trackData: initialTrack,
      force: false,
      checkServerCache: mockCheckServerCache,
      fetchLyrics: mockFetchLyrics,
      analyzeSongMeaningAndTranslations: mockAnalyzeSongMeaningAndTranslations,
      fetchStructuredLecture: mockFetchStructuredLecture,
      runDeepPhraseAnalysis: mockRunDeepPhraseAnalysis,
      targetLanguage: "Russian"
    });

    // Fallback -> all three expensive endpoints called
    expect(mockAnalyzeSongMeaningAndTranslations).toHaveBeenCalled();
    expect(mockFetchStructuredLecture).toHaveBeenCalled();
    expect(mockRunDeepPhraseAnalysis).toHaveBeenCalled();
  });
});
