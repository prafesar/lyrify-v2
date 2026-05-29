import { describe, it, expect, beforeEach } from "vitest";
import { sqliteService, SqliteService } from "../services/sqliteService";

describe("SQLite Service Integration Smoke Tests", () => {
  beforeEach(async () => {
    await sqliteService.clearAllUserData();
  });

  it("should successfully set and retrieve preferences using the system storage/fallback", () => {
    sqliteService.setPreference("test_key", "value_abc");
    expect(sqliteService.getPreference("test_key", "default")).toBe("value_abc");
  });

  it("should successfully set and retrieve boolean preferences", () => {
    sqliteService.setBoolPreference("bool_key", true);
    expect(sqliteService.getBoolPreference("bool_key", false)).toBe(true);

    sqliteService.setBoolPreference("bool_key", false);
    expect(sqliteService.getBoolPreference("bool_key", true)).toBe(false);
  });

  it("should successfully remove individual preferences", () => {
    sqliteService.setPreference("temp_prop", "val");
    expect(sqliteService.getPreference("temp_prop", "n")).toBe("val");

    sqliteService.removePreference("temp_prop");
    expect(sqliteService.getPreference("temp_prop", "n")).toBe("n");
  });

  it("should cache track lyrics data synchronously and retrieve it correctly", () => {
    const mockLyrics = {
      id: "track_123",
      rawLyrics: "Hello World",
      processingStatus: { stage1_completed: true }
    };
    sqliteService.saveTrackData("track_123", mockLyrics);

    const cached = sqliteService.getCachedTrack("track_123");
    expect(cached).not.toBeNull();
    expect(cached?.rawLyrics).toBe("Hello World");
    expect(cached?.processingStatus?.stage1_completed).toBe(true);
  });

  it("should store distinct recently explored tracks and support descriptive FIFO lists", () => {
    const trackA = {
      id: "ta",
      title: "Title A",
      artist: "Artist A",
      album: "Album A",
      coverUrl: "http://temp.local/a.png"
    };
    const trackB = {
      id: "tb",
      title: "Title B",
      artist: "Artist B",
      album: "Album B",
      coverUrl: "http://temp.local/b.png"
    };

    sqliteService.addRecentTrack(trackA);
    sqliteService.addRecentTrack(trackB);

    const recents = sqliteService.getRecentTracks();
    expect(recents).toBeInstanceOf(Array);
    expect(recents.length).toBe(2);
    expect(recents[0].id).toBe("tb"); // Most recently added should go first
    expect(recents[1].id).toBe("ta");
  });

  it("should notify subscribers when events occur or if already initialized", () => {
    const eventsReceived: string[] = [];
    const unsubscribe = sqliteService.subscribe((event) => {
      eventsReceived.push(event);
    });

    try {
      // Since it's already initialized, subbing triggers "initialized" immediately
      expect(eventsReceived).toContain("initialized");

      eventsReceived.length = 0; // clear

      // Trigger preference update
      sqliteService.setPreference("subscribed_key", "subscribed_val");
      expect(eventsReceived).toContain("preferences");

      eventsReceived.length = 0; // clear

      // Trigger recent track update
      sqliteService.addRecentTrack({
        id: "test_sub_track",
        title: "Sub Track",
        artist: "Artist",
        album: "",
        coverUrl: ""
      });
      expect(eventsReceived).toContain("recent_tracks");
    } finally {
      unsubscribe();
    }
  });

  it("should survive reload / fresh instance scenario using conscious local backup fallback", async () => {
    // 1. Clear any state first
    await sqliteService.clearAllUserData();
    expect(sqliteService.getRecentTracks().length).toBe(0);

    // 2. Add a recent track using first instance
    const trackMock = {
      id: "track_reload_test_id",
      title: "Title Reload",
      artist: "Artist Reload",
      album: "Album Reload",
      coverUrl: "http://temp.local/reload.png"
    };
    sqliteService.addRecentTrack(trackMock);

    // 3. Instantiate a completely fresh SqliteService instance representing window reload / new worker / new page
    const freshService = new SqliteService();
    // Wait for resolution
    await freshService.init();

    // 4. Verify that fresh service has successfully hydrated our track
    const freshRecents = freshService.getRecentTracks();
    expect(freshRecents.length).toBe(1);
    expect(freshRecents[0].id).toBe("track_reload_test_id");
    expect(freshRecents[0].title).toBe("Title Reload");
    expect(freshService.getStorageMode()).toBe("error"); // In vitest terminal runner without worker support it should be error, which triggered the fallback!
  });
});
