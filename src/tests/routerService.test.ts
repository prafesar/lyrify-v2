import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseUrl, navigateTo, navigateBack, setTransientTrack, popTransientTrack, getNavSessionCount, resetNavSessionCount } from "../services/routerService";

describe("routerService", () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    // Reset session counter and transient cache
    resetNavSessionCount();
    popTransientTrack("non-existent");
    
    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: "/explore",
    };

    // Mock window.history
    delete (window as any).history;
    window.history = {
      ...originalHistory,
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
    };

    // Mock dispatchEvent
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    window.location = originalLocation;
    window.history = originalHistory;
  });

  describe("parseUrl", () => {
    it("should parse main view urls", () => {
      expect(parseUrl("/explore")).toEqual({ type: "explore" });
      expect(parseUrl("/library")).toEqual({ type: "library" });
      expect(parseUrl("/study")).toEqual({ type: "study" });
      expect(parseUrl("/settings")).toEqual({ type: "settings" });
      expect(parseUrl("/")).toEqual({ type: "explore" });
    });

    it("should parse entity view urls", () => {
      expect(parseUrl("/artist/12345")).toEqual({ type: "artist", id: "12345" });
      expect(parseUrl("/album/67890")).toEqual({ type: "album", id: "67890" });
      expect(parseUrl("/track/abc")).toEqual({ type: "track", id: "abc" });
    });

    it("should fall back to explore for unknown paths", () => {
      expect(parseUrl("/unknown")).toEqual({ type: "explore" });
    });
  });

  describe("navigateTo", () => {
    it("should pushState and dispatch popstate", () => {
      navigateTo("/library");
      expect(window.history.pushState).toHaveBeenCalledWith(expect.any(Object), "", "/library");
      expect(window.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe("navigateBack", () => {
    it("should go backward in history if session has past navigate entries", () => {
      // simulate session count
      navigateTo("/library");
      const currentCount = getNavSessionCount();
      expect(currentCount).toBeGreaterThan(0);

      navigateBack("/explore");
      expect(window.history.back).toHaveBeenCalled();
    });

    it("should navigate to fallback if session is fresh/empty", () => {
      // set location to a different path to bypass pathname redundancy guard
      window.location.pathname = "/library";
      navigateBack("/explore");
      expect(window.history.replaceState).toHaveBeenCalledWith(expect.any(Object), "", "/explore");
    });
  });

  describe("transient data cache", () => {
    it("should cache and pop track selections cleanly", () => {
      const mockTrack = { id: "112233", title: "Test Track" };
      setTransientTrack(mockTrack);

      const popped = popTransientTrack("112233");
      expect(popped).toEqual(mockTrack);

      // subsequent pop should return null after consumption
      expect(popTransientTrack("112233")).toBeNull();
    });

    it("should support trackId key matching", () => {
      const mockTrack = { trackId: "9988", title: "Test Track 2" };
      setTransientTrack(mockTrack);

      const popped = popTransientTrack("9988");
      expect(popped).toEqual(mockTrack);
    });
  });
});
