import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteService } from "../services/sqliteService";
import { BrowserLibraryRepository } from "../application/adapters/browserLibraryRepository";

class MockWorker {
  public onmessage: ((e: MessageEvent) => void) | null = null;
  public static postedMessages: any[] = [];
  public static forceEmptyQuery = false;
  public static customInitPayload: any = null;
  
  // In-memory simulated database state inside the companion mock
  private favorites: any[] = [];
  private playlists: any[] = [];
  private recentHistory: any[] = [];

  constructor(_url: any, _options?: any) {}

  postMessage(message: any) {
    MockWorker.postedMessages.push(message);
    const { type, payload, messageId } = message;

    // Run asynchronously to allow event loop yields
    setTimeout(() => {
      if (type === "INIT") {
        this.triggerMessage({
          type: "INIT_OK",
          payload: MockWorker.customInitPayload || {
            preferences: {},
            recentHistory: [],
            trackCache: {},
            favorites: [],
            playlists: [],
            storageMode: "opfs"
          }
        });
      } else if (type === "ADD_RECENT_TRACK") {
        this.recentHistory.push(payload.track);
        this.triggerMessage({
          type: "WRITE_OK",
          messageId,
          payload: null
        });
      } else if (type === "TOGGLE_FAVORITE") {
        const track = payload.track;
        const exists = this.favorites.some(f => String(f.id) === String(track.id));
        if (exists) {
          this.favorites = this.favorites.filter(f => String(f.id) !== String(track.id));
        } else {
          this.favorites.push(track);
        }
        this.triggerMessage({
          type: "WRITE_OK",
          messageId,
          payload: !exists
        });
      } else if (type === "CREATE_PLAYLIST") {
        this.playlists.push({
          id: payload.id,
          name: payload.name,
          tracks: [],
          trackIds: []
        });
        this.triggerMessage({
          type: "WRITE_OK",
          messageId,
          payload: payload.id
        });
      } else if (type === "ADD_TRACK_TO_PLAYLIST") {
        const pl = this.playlists.find(p => String(p.id) === String(payload.playlistId));
        if (pl) {
          if (!pl.trackIds.includes(payload.track.id)) {
            pl.tracks.push(payload.track);
            pl.trackIds.push(payload.track.id);
          }
        }
        this.triggerMessage({
          type: "WRITE_OK",
          messageId,
          payload: null
        });
      } else if (type === "IS_FAVORITE") {
        const exists = this.favorites.some(f => String(f.id) === String(payload.trackId));
        this.triggerMessage({
          type: "WRITE_OK",
          messageId,
          payload: exists
        });
      } else if (type === "GET_FAVORITES") {
        this.triggerMessage({
          type: "QUERY_OK",
          messageId,
          payload: MockWorker.forceEmptyQuery ? [] : this.favorites
        });
      } else if (type === "GET_PLAYLISTS") {
        this.triggerMessage({
          type: "QUERY_OK",
          messageId,
          payload: MockWorker.forceEmptyQuery ? [] : this.playlists
        });
      }
    }, 10);
  }

  private triggerMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent);
    }
  }

  terminate() {}
}

describe("SQLite OPFS Seeding, Safeguards & Legacy Migration Tests", () => {
  const originalWorker = global.Worker;

  beforeEach(() => {
    localStorage.clear();
    MockWorker.postedMessages = [];
    MockWorker.forceEmptyQuery = false;
    MockWorker.customInitPayload = null;
  });

  afterEach(() => {
    global.Worker = originalWorker;
  });

  it("should perform robust seeding in OPFS mode when database is empty and local backups exist", async () => {
    // Mock the Web Worker inside this test environment
    global.Worker = MockWorker as any;

    // Simulate pre-existing client localStorage backup data
    const mockTrack = { id: "track_seeded_99", title: "Seeded Track", artist: "Seeded Artist" };
    const mockPlaylist = {
      id: "playlist-opfs-seeded",
      name: "OPFS Rock",
      createdAt: Date.now(),
      trackIds: ["track_seeded_99"],
      tracks: [mockTrack]
    };

    localStorage.setItem("cantolex_favorites_backup", JSON.stringify([mockTrack]));
    localStorage.setItem("cantolex_playlists_backup", JSON.stringify([mockPlaylist]));
    localStorage.setItem("cantolex_recent_tracks_backup", JSON.stringify([mockTrack]));

    // Instantiate a fresh service to trigger initialization with backup loading
    const service = new SqliteService();

    // The initialization promise should await the full sequence of worker seeding
    await service.init();

    // Verify storage mode resolves as OPFS
    expect(service.getStorageMode()).toBe("opfs");

    // Verify that the worker received correctly formatted seeding requests
    const messageTypes = MockWorker.postedMessages.map((m) => m.type);
    expect(messageTypes).toContain("ADD_RECENT_TRACK");
    expect(messageTypes).toContain("CREATE_PLAYLIST");
    expect(messageTypes).toContain("ADD_TRACK_TO_PLAYLIST");

    // Verify the internal memory cache matches the seeded structure
    const recents = service.getRecentTracks();
    expect(recents.length).toBe(1);
    expect(recents[0].id).toBe("track_seeded_99");

    const favs = await service.getFavorites();
    expect(favs.length).toBe(1);
    expect(favs[0].id).toBe("track_seeded_99");

    const playlists = await service.getPlaylists();
    expect(playlists.length).toBe(1);
    expect(playlists[0].id).toBe("playlist-opfs-seeded");
  });

  it("should prevent early empty responses from SQLite worker from clobbering loaded backups during bootstrap", async () => {
    global.Worker = MockWorker as any;
    MockWorker.forceEmptyQuery = true;

    // Load backup data
    const mockTrack = { id: "track_safe_11", title: "Safe Track", artist: "Developer" };
    localStorage.setItem("cantolex_favorites_backup", JSON.stringify([mockTrack]));

    const service = new SqliteService();
    // Before init has finished, isInitialized is false.
    // Call getFavorites eagerly during the bootstrap process.
    const favsPromise = service.getFavorites();

    // Complete the init
    await service.init();
    const favs = await favsPromise;

    // Even though worker returned [] (as defined in GET_FAVORITES mock above),
    // the safeguard prevented it from overwriting our loaded backup of 1 item.
    expect(favs.length).toBe(1);
    expect(favs[0].id).toBe("track_safe_11");
  });

  it("should preserve original playlist IDs during one-time legacy localStorage to SQLite migration", async () => {
    // Simulating old Lyrify/cantolex state (no backup format yet)
    const legacyPlaylist = {
      id: "legacy-playlist-uuid-777",
      name: "Old Favorites Playlist",
      tracks: [{ id: "track-1", title: "Old Track", artist: "Classic Artist" }]
    };

    localStorage.setItem("cantolex_playlists", JSON.stringify([legacyPlaylist]));
    localStorage.removeItem("cantolex_playlists_backup");
    localStorage.removeItem("cantolex_library_sqlite_migrated");

    // Spin up the adapter repository wrapper
    const repository = new BrowserLibraryRepository();
    const playlists = await repository.getPlaylists();

    expect(playlists.length).toBe(1);
    // Verified: original playlist ID is preserved, not randomized.
    expect(playlists[0].id).toBe("legacy-playlist-uuid-777");
    expect(playlists[0].name).toBe("Old Favorites Playlist");
  });

  it("should handle partial OPFS bootstrap scenario where some domains are in SQLite but others require seeding from backups", async () => {
    global.Worker = MockWorker as any;

    const mockTrack = { id: "track_seeded_99", title: "Seeded Track", artist: "Seeded Artist" };
    // Simulated pre-existing database with recentHistory but empty favorites & playlists
    MockWorker.customInitPayload = {
      preferences: {},
      recentHistory: [mockTrack],
      trackCache: {},
      favorites: [],
      playlists: [],
      storageMode: "opfs"
    };

    // Simulated local backups containing both favorites and playlists
    const backupFavTrack = { id: "fav_backup_1", title: "Far Away", artist: "Singer" };
    const backupPlaylist = {
      id: "playlist-opfs-partial",
      name: "Partial Rock",
      createdAt: Date.now(),
      trackIds: ["fav_backup_1"],
      tracks: [backupFavTrack]
    };

    localStorage.setItem("cantolex_favorites_backup", JSON.stringify([backupFavTrack]));
    localStorage.setItem("cantolex_playlists_backup", JSON.stringify([backupPlaylist]));
    localStorage.removeItem("cantolex_recent_tracks_backup"); // empty recent backup

    const service = new SqliteService();
    await service.init();

    // 1. Verify recent tracks are recovered from worker
    expect(service.getRecentTracks().length).toBe(1);
    expect(service.getRecentTracks()[0].id).toBe("track_seeded_99");

    // 2. Verify favorites are seeded from backup since they were empty in worker
    const favs = await service.getFavorites();
    expect(favs.length).toBe(1);
    expect(favs[0].id).toBe("fav_backup_1");

    // 3. Verify playlists are seeded from backup since they were empty in worker
    const playlists = await service.getPlaylists();
    expect(playlists.length).toBe(1);
    expect(playlists[0].id).toBe("playlist-opfs-partial");

    // 4. Verify that missing domains were actually posted as writes to the worker
    const messageTypes = MockWorker.postedMessages.map((m) => m.type);
    expect(messageTypes).toContain("TOGGLE_FAVORITE");
    expect(messageTypes).toContain("CREATE_PLAYLIST");
    
    // recent was already in SQLite, so ADD_RECENT_TRACK is not called for it on bootstrap
    const addRecentMsgs = MockWorker.postedMessages.filter(m => m.type === "ADD_RECENT_TRACK");
    expect(addRecentMsgs.length).toBe(0);
  });
});
