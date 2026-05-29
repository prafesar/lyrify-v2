import { describe, it, expect, beforeEach, vi } from "vitest";
import { NavigationCoordinator } from "../services/navigationService";

describe("NavigationCoordinator", () => {
  beforeEach(() => {
    // Clear coordinator state before each test
    NavigationCoordinator.clearHistory();
    NavigationCoordinator.syncRouteFromPlatform({ type: "explore" });
    NavigationCoordinator.registerPlatformAdapter(() => {});
  });

  it("should initialize with default explore route and allow listeners to subscribe", () => {
    expect(NavigationCoordinator.getCurrentRoute()).toEqual({ type: "explore" });

    const listener = vi.fn();
    const unsubscribe = NavigationCoordinator.subscribe(listener);

    NavigationCoordinator.goToLibrary();
    expect(listener).toHaveBeenCalledWith({ type: "library" });
    expect(NavigationCoordinator.getCurrentRoute()).toEqual({ type: "library" });

    unsubscribe();
  });

  it("should maintain a platform-independent history stack on navigation", () => {
    NavigationCoordinator.goToExplore();
    NavigationCoordinator.goToLibrary();
    NavigationCoordinator.goToSettings();

    expect(NavigationCoordinator.getHistoryStack()).toEqual([
      { type: "explore" },
      { type: "library" },
    ]);
  });

  it("should transition sequentially and goBack correctly", () => {
    NavigationCoordinator.goToExplore();
    NavigationCoordinator.goToTrack("track-101");
    NavigationCoordinator.goToStudy("track-101");

    expect(NavigationCoordinator.getCurrentRoute()).toEqual({ type: "study", id: "track-101" });
    
    // Go back should pop from stack
    NavigationCoordinator.goBack();
    expect(NavigationCoordinator.getCurrentRoute()).toEqual({ type: "track", id: "track-101" });

    NavigationCoordinator.goBack();
    expect(NavigationCoordinator.getCurrentRoute()).toEqual({ type: "explore" });
  });

  it("should fallback intelligently when history stack is empty", () => {
    // Stack is empty, current is study
    NavigationCoordinator.syncRouteFromPlatform({ type: "study", id: "track-404" });
    expect(NavigationCoordinator.getHistoryStack().length).toBe(0);

    NavigationCoordinator.goBack();
    // Default fallback from study is explore
    expect(NavigationCoordinator.getCurrentRoute()).toEqual({ type: "explore" });
  });

  it("should notify platform adapter when registered", () => {
    const mockAdapter = vi.fn();
    NavigationCoordinator.registerPlatformAdapter(mockAdapter);

    NavigationCoordinator.goToTrack("my-song");
    expect(mockAdapter).toHaveBeenCalledWith({ type: "track", id: "my-song" }, false);
  });
});
