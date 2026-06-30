import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTrackSession } from "../hooks/useTrackSession";
import { sqliteService } from "../services/sqliteService";
import { AnalysisMode } from "../constants";
import { TrackLyricsData } from "../services/musicService";

const { mockAiClient } = vi.hoisted(() => {
  return {
    mockAiClient: {
      normalizeString: vi.fn((str) => str?.toLowerCase() || ""),
      getLineTranslations: vi.fn(),
      getPhraseAnalysis: vi.fn(),
      extractLyricsMetadata: vi.fn(),
      saveTrackToSharedCache: vi.fn(),
      computeTrackKey: vi.fn().mockResolvedValue("mock_track_key"),
      computeLyricsHash: vi.fn().mockResolvedValue("mock_hash"),
      fetchStructuredLecture: vi.fn().mockResolvedValue([
        { id: "intro_b", kind: "intro", title: "Introduction", text: "Successfully generated fresh overview blocks" }
      ]),
      getCachedStructuredLecture: vi.fn().mockResolvedValue(null),
    },
  };
});

// Mock the AI adapters
vi.mock("../application/adapters/geminiAIAdapter", () => ({
  aiClient: mockAiClient,
}));

vi.mock("../application/adapters/workerAIAdapter", () => ({
  WorkerAIAdapter: class {
    normalizeString = mockAiClient.normalizeString;
    getLineTranslations = mockAiClient.getLineTranslations;
    getPhraseAnalysis = mockAiClient.getPhraseAnalysis;
    extractLyricsMetadata = mockAiClient.extractLyricsMetadata;
    saveTrackToSharedCache = mockAiClient.saveTrackToSharedCache;
    computeTrackKey = mockAiClient.computeTrackKey;
    computeLyricsHash = mockAiClient.computeLyricsHash;
    fetchStructuredLecture = mockAiClient.fetchStructuredLecture;
    getCachedStructuredLecture = mockAiClient.getCachedStructuredLecture;
  },
}));

// Test harness to render useTrackSession and expose controls
interface TestHarnessProps {
  initialMode: AnalysisMode;
  initialLang: string;
  onStateUpdate: (state: any) => void;
}

function TestHarness({ initialMode, initialLang, onStateUpdate }: TestHarnessProps) {
  const [mode, setMode] = useState<AnalysisMode>(initialMode);
  const [lang, setLang] = useState<string>(initialLang);
  const session = useTrackSession(mode, lang);

  // Synchronously update the parent state during render to capture every update immediately
  onStateUpdate({
    currentTrack: session.currentTrack,
    setCurrentTrack: session.setCurrentTrack,
    displayedLectureBlocks: session.displayedLectureBlocks,
    handleGenerateAnalysis: session.handleGenerateAnalysis,
    setMode,
    setLang,
  });

  return <div id="test-root">Harness</div>;
}

describe("useTrackSession Mode-Aware & Immediate State Generation Regression Tests", () => {
  let container: HTMLDivElement;
  let root: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    await sqliteService.clearAllUserData();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    document.body.removeChild(container);
  });

  const renderHarness = async (initialMode: AnalysisMode, initialLang: string) => {
    let latestState: any = null;
    const onStateUpdate = (state: any) => {
      latestState = state;
    };

    act(() => {
      root = createRoot(container);
      root.render(
        <TestHarness
          initialMode={initialMode}
          initialLang={initialLang}
          onStateUpdate={onStateUpdate}
        />
      );
    });

    // Let any immediate hooks/effects execute
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    return {
      get state() {
        return latestState;
      },
    };
  };

  it("1. Fresh lecture generation updates the visible lecture state immediately", async () => {
    const harness = await renderHarness("overview", "Spanish");

    const track: TrackLyricsData = {
      trackId: "track_regression_1",
      title: "Regression Track",
      artist: "Artist X",
      rawLyrics: "Line 1\nLine 2",
      lines: [
        { original: "Line 1", lineIndex: 0, lineKey: "lk1", phrases: [] },
        { original: "Line 2", lineIndex: 1, lineKey: "lk2", phrases: [] }
      ],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false },
      lastUpdated: Date.now()
    };

    // Set the current track
    await act(async () => {
      harness.state.setCurrentTrack(track);
    });

    // Let any track loading effect settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(harness.state.currentTrack?.trackId).toBe("track_regression_1");
    // Initially, there's no saved variant, so displayedLectureBlocks should remain null
    expect(harness.state.displayedLectureBlocks).toBeNull();

    // Mock fetchStructuredLecture to return specific blocks for this mode
    mockAiClient.fetchStructuredLecture.mockResolvedValueOnce([
      { id: "intro_1", kind: "intro", title: "Intro 1", text: "Successfully generated fresh overview blocks" }
    ]);

    // Generate analysis
    await act(async () => {
      await harness.state.handleGenerateAnalysis("Spanish", { loadCommunityTracks: () => {} }, true);
    });

    // Verify it immediately updated displayedLectureBlocks without needing a reload or tab switch
    expect(harness.state.displayedLectureBlocks).not.toBeNull();
    expect(harness.state.displayedLectureBlocks[0].text).toBe("Successfully generated fresh overview blocks");
  });

  it("2. Mode-aware loading uses the passed analysisMode and targetLanguage", async () => {
    // Save multiple analysis variants in SQLite beforehand
    await sqliteService.saveAnalysisVariant({
      id: "track_x_overview_es",
      trackId: "track_x",
      mode: "overview",
      targetLanguage: "es",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, [{ id: "b1", kind: "intro", title: "Overview Title", text: "Spanish Overview Block" }]);

    await sqliteService.saveAnalysisVariant({
      id: "track_x_vocabulary_es",
      trackId: "track_x",
      mode: "vocabulary",
      targetLanguage: "es",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, [{ id: "b2", kind: "lexical_groups", title: "Vocabulary Title", text: "Spanish Vocabulary Block" }]);

    const harness = await renderHarness("overview", "Spanish");

    const track: TrackLyricsData = {
      trackId: "track_x",
      title: "Song X",
      artist: "Artist Y",
      rawLyrics: "Line 1",
      lines: [{ original: "Line 1", lineIndex: 0, lineKey: "lk1", phrases: [] }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false },
      lastUpdated: Date.now()
    };

    // Set current track
    await act(async () => {
      harness.state.setCurrentTrack(track);
    });

    // Let loadVariant runs and settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Passed mode "overview" should load overview variant
    expect(harness.state.displayedLectureBlocks).not.toBeNull();
    expect(harness.state.displayedLectureBlocks[0].text).toBe("Spanish Overview Block");

    // Change the passed mode to "vocabulary"
    await act(async () => {
      harness.state.setMode("vocabulary");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // It should load the vocabulary variant immediately using the passed analysisMode
    expect(harness.state.displayedLectureBlocks).not.toBeNull();
    expect(harness.state.displayedLectureBlocks[0].text).toBe("Spanish Vocabulary Block");
  });

  it("3. Switching to an unsaved mode yields empty lecture state; generating that mode populates it without reload", async () => {
    // Save only overview variant
    await sqliteService.saveAnalysisVariant({
      id: "track_y_overview_es",
      trackId: "track_y",
      mode: "overview",
      targetLanguage: "es",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, [{ id: "b1", kind: "intro", title: "Overview Title", text: "Overview Block" }]);

    const harness = await renderHarness("overview", "Spanish");

    const track: TrackLyricsData = {
      trackId: "track_y",
      title: "Song Y",
      artist: "Artist Z",
      rawLyrics: "Line 1",
      lines: [{ original: "Line 1", lineIndex: 0, lineKey: "lk1", phrases: [] }],
      processingStatus: { stage1_completed: true, stage2_completed: true, stage3_completed: false },
      lastUpdated: Date.now()
    };

    await act(async () => {
      harness.state.setCurrentTrack(track);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Overview variant is saved, so it's populated
    expect(harness.state.displayedLectureBlocks).not.toBeNull();
    expect(harness.state.displayedLectureBlocks[0].text).toBe("Overview Block");

    // Switch to vocabulary (which is unsaved)
    await act(async () => {
      harness.state.setMode("vocabulary");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Unsaved mode should yield empty/null lecture state
    expect(harness.state.displayedLectureBlocks).toBeNull();

    // Now, generate vocabulary analysis
    mockAiClient.fetchStructuredLecture.mockResolvedValueOnce([
      { id: "b2", kind: "lexical_groups", title: "Vocabulary Title", text: "Successfully generated fresh vocabulary blocks" }
    ]);

    await act(async () => {
      await harness.state.handleGenerateAnalysis("Spanish", { loadCommunityTracks: () => {} }, true);
    });

    // The generated vocabulary analysis should populate immediately without requiring any reload or tab switch
    expect(harness.state.displayedLectureBlocks).not.toBeNull();
    expect(harness.state.displayedLectureBlocks[0].text).toBe("Successfully generated fresh vocabulary blocks");
  });
});
