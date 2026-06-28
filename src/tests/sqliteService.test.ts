import { describe, it, expect, beforeEach } from "vitest";
import { sqliteService, SqliteService } from "../services/sqliteService";
import { WordFormExtractor } from "../services/wordFormExtractor";

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

  it("should handle error mode (lack of worker) with fully functioning favorites, playlists, and backups", async () => {
    const errService = new SqliteService();
    await errService.init();
    expect(errService.getStorageMode()).toBe("error");

    localStorage.removeItem("cantolex_favorites_backup");
    localStorage.removeItem("cantolex_playlists_backup");

    // Add a favorite
    const trackMock = { id: "track_error_test", title: "Error Track", artist: "Err", album: "", coverUrl: "" };
    await errService.toggleFavorite(trackMock);

    // Verify favorite is returned synchronously and preserved in backups
    const favs = await errService.getFavorites();
    expect(favs.length).toBe(1);
    expect(favs[0].id).toBe("track_error_test");
    expect(errService["getFavoritesBackup"]()).toEqual(favs);

    // Add a playlist
    const playlistId = await errService.createPlaylist("Error Playlist");
    expect(playlistId).toBeDefined();

    // Add track to playlist
    await errService.addTrackToPlaylist(playlistId, trackMock);
    
    // Verify playlist is retrieved correctly
    const playlists = await errService.getPlaylists();
    expect(playlists.length).toBe(1);
    expect(playlists[0].id).toBe(playlistId);
    expect(playlists[0].name).toBe("Error Playlist");
    expect(playlists[0].trackIds).toContain("track_error_test");
    
    // Check that backups are updated
    expect(errService["getPlaylistsBackup"]()).toEqual(playlists);
  });

  it("should preserve original playlist identity/IDs across transient/error restoration", async () => {
    const existingPlaylist = {
      id: "playlist-custom-123",
      name: "My Indie Playlist",
      createdAt: Date.now(),
      trackIds: ["track_indie_1"],
      tracks: [{ id: "track_indie_1", title: "Indie Track", artist: "Artist", album: "", coverUrl: "" }]
    };
    const existingFavorites = [
      { id: "track_indie_1", title: "Indie Track", artist: "Artist", album: "", coverUrl: "" }
    ];

    localStorage.setItem("cantolex_playlists_backup", JSON.stringify([existingPlaylist]));
    localStorage.setItem("cantolex_favorites_backup", JSON.stringify(existingFavorites));

    // Spin up fresh service instance
    const freshService = new SqliteService();
    await freshService.init();

    // Check favorites & playlists restoration
    const restoredFavorites = await freshService.getFavorites();
    expect(restoredFavorites.length).toBe(1);
    expect(restoredFavorites[0].id).toBe("track_indie_1");

    const restoredPlaylists = await freshService.getPlaylists();
    expect(restoredPlaylists.length).toBe(1);
    expect(restoredPlaylists[0].id).toBe("playlist-custom-123"); // original ID preserved!
    expect(restoredPlaylists[0].name).toBe("My Indie Playlist");
  });

  it("should reactively notify UI subscriber when initialization or hydration finishes", async () => {
    localStorage.setItem("cantolex_favorites_backup", JSON.stringify([
      { id: "reactive_track", title: "Reactive", artist: "Artist", album: "", coverUrl: "" }
    ]));

    const mockService = new SqliteService();
    const eventLog: string[] = [];
    
    // Subscribe before initialization finishes
    mockService.subscribe((evt) => {
      eventLog.push(evt);
    });

    await mockService.init();

    // Event sequence has executed and we received correct notifications
    expect(eventLog).toContain("initialized");
    const favs = await mockService.getFavorites();
    expect(favs.length).toBe(1);
    expect(favs[0].id).toBe("reactive_track");
  });

  it("should support toggling, checking, and retrieving favorite artists and albums including backups", async () => {
    localStorage.removeItem("cantolex_favorite_artists_backup");
    localStorage.removeItem("cantolex_favorite_albums_backup");

    const activeService = new SqliteService();
    await activeService.init();

    const artistMock = { id: "artist_123", name: "Indie Singer", artworkUrl: "http://temp.local/art.png" };
    const albumMock = { 
      id: "album_456", 
      title: "Indie Album", 
      artist: "Indie Singer", 
      artistId: "artist_123",
      coverUrl: "http://temp.local/alb.png",
      trackCount: 10,
      releaseDate: "2026-05-30"
    };

    // Initially should not be favorite
    expect(await activeService.isFavoriteArtist("artist_123")).toBe(false);
    expect(await activeService.isFavoriteAlbum("album_456")).toBe(false);

    // Toggle to add
    await activeService.toggleFavoriteArtist(artistMock);
    await activeService.toggleFavoriteAlbum(albumMock);

    // Should now be favorite
    expect(await activeService.isFavoriteArtist("artist_123")).toBe(true);
    expect(await activeService.isFavoriteAlbum("album_456")).toBe(true);

    // Check backups and retrieval
    const artists = await activeService.getFavoriteArtists();
    const albums = await activeService.getFavoriteAlbums();

    expect(artists.length).toBe(1);
    expect(artists[0].id).toBe("artist_123");
    expect(artists[0].name).toBe("Indie Singer");

    expect(albums.length).toBe(1);
    expect(albums[0].id).toBe("album_456");
    expect(albums[0].title).toBe("Indie Album");

    // Toggle again to remove
    await activeService.toggleFavoriteArtist(artistMock);
    await activeService.toggleFavoriteAlbum(albumMock);

    // Should be removed
    expect(await activeService.isFavoriteArtist("artist_123")).toBe(false);
    expect(await activeService.isFavoriteAlbum("album_456")).toBe(false);
  });

  it("should cache, restore, merge, and retain track cache metrics like isStarred and line.explanation across reload", async () => {
    // Ensure starting clean
    localStorage.removeItem("cantolex_track_cache_backup");

    const activeService = new SqliteService();
    await activeService.init();

    const trackId = "reload_track_xyz";
    const initialData = {
      id: trackId,
      trackId: trackId,
      rawLyrics: "Line 1\nLine 2",
      lines: [
        { index: 0, original: "Line 1", translation: "Translated 1", isStarred: true },
        { index: 1, original: "Line 2", translation: "Translated 2" }
      ]
    };

    // Save initial data which also updates state & synchronizes to localStorage backup
    activeService.saveTrackData(trackId, initialData);

    const cachedBefore = activeService.getCachedTrack(trackId);
    expect(cachedBefore).not.toBeNull();
    expect(cachedBefore?.lines?.[0].isStarred).toBe(true);
    expect(cachedBefore?.lines?.[1].isStarred).toBeUndefined();

    // Now update segment with explanation
    const explanationUpdate = {
      lines: [
        { index: 0, original: "Line 1", translation: "Translated 1", isStarred: true },
        { index: 1, original: "Line 2", translation: "Translated 2", explanation: { summary: "Insight for 2" } }
      ]
    };
    activeService.saveTrackData(trackId, explanationUpdate);

    // Create fresh service to simulate browser page refresh / reload route hydration
    const freshService = new SqliteService();
    
    // Test synchronous load (instant before worker INIT_OK executes)
    const cachedInstantly = freshService.getCachedTrack(trackId);
    expect(cachedInstantly).not.toBeNull();
    expect(cachedInstantly?.lines?.[0].isStarred).toBe(true);
    expect(cachedInstantly?.lines?.[1].explanation?.summary).toBe("Insight for 2");

    // Resolve initialization
    await freshService.init();

    // Test after initialization merge
    const cachedAfterInit = freshService.getCachedTrack(trackId);
    expect(cachedAfterInit).not.toBeNull();
    expect(cachedAfterInit?.lines?.[0].isStarred).toBe(true);
    expect(cachedAfterInit?.lines?.[1].explanation?.summary).toBe("Insight for 2");
  });

  it("should successfully save and retrieve multiple distinct analysis variants for a single track without overwriting each other", async () => {
    await sqliteService.clearAllUserData();

    const variantVocab = {
      id: "var_vocab_1",
      trackId: "track_abc",
      mode: "vocabulary" as const,
      targetLanguage: "ru",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const payloadVocab = { words: [{ word: "hello", translation: "привет" }] };

    const variantPhrases = {
      id: "var_phrases_2",
      trackId: "track_abc",
      mode: "phrases" as const,
      targetLanguage: "ru",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const payloadPhrases = { phrases: [{ phrase: "how are you", translation: "как дела" }] };

    await sqliteService.saveAnalysisVariant(variantVocab, payloadVocab);
    await sqliteService.saveAnalysisVariant(variantPhrases, payloadPhrases);

    // Get specific variant by trackId + mode + targetLanguage
    const retrievedVocab = await sqliteService.getAnalysisVariant("track_abc", "vocabulary", "ru");
    expect(retrievedVocab).not.toBeNull();
    expect(retrievedVocab?.variant.id).toBe("var_vocab_1");
    expect(retrievedVocab?.payload).toEqual(payloadVocab);

    const retrievedPhrases = await sqliteService.getAnalysisVariant("track_abc", "phrases", "ru");
    expect(retrievedPhrases).not.toBeNull();
    expect(retrievedPhrases?.variant.id).toBe("var_phrases_2");
    expect(retrievedPhrases?.payload).toEqual(payloadPhrases);

    // Get all variants for a specific track
    const allVariants = await sqliteService.getAnalysisVariantsForTrack("track_abc");
    expect(allVariants.length).toBe(2);
    const modes = allVariants.map(v => v.variant.mode);
    expect(modes).toContain("vocabulary");
    expect(modes).toContain("phrases");
  });

  it("should survive reload/hydration and preserve multiple analysis variants across fresh instances", async () => {
    await sqliteService.clearAllUserData();

    const variantStyle = {
      id: "var_style_3",
      trackId: "track_xyz",
      mode: "style" as const,
      targetLanguage: "en",
      sourceLanguage: "fr",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const payloadStyle = { tone: "poetic" };

    await sqliteService.saveAnalysisVariant(variantStyle, payloadStyle);

    // Create a fresh instance representing window reload
    const freshService = new SqliteService();
    await freshService.init();

    const restored = await freshService.getAnalysisVariant("track_xyz", "style", "en");
    expect(restored).not.toBeNull();
    expect(restored?.variant.id).toBe("var_style_3");
    expect(restored?.payload).toEqual(payloadStyle);
  });

  it("should not affect or regress the existing track cache when saving analysis variants", async () => {
    await sqliteService.clearAllUserData();

    // 1. Save track cache data
    const mockTrackData = {
      id: "track_123",
      rawLyrics: "Some lyrics",
      processingStatus: { stage1_completed: true }
    };
    sqliteService.saveTrackData("track_123", mockTrackData);

    // 2. Save an analysis variant for the same track
    const variantStyle = {
      id: "var_style_123",
      trackId: "track_123",
      mode: "style" as const,
      targetLanguage: "en",
      sourceLanguage: "fr",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const payloadStyle = { tone: "lyrical" };
    await sqliteService.saveAnalysisVariant(variantStyle, payloadStyle);

    // 3. Verify track cache remains untouched
    const cachedTrack = sqliteService.getCachedTrack("track_123");
    expect(cachedTrack).not.toBeNull();
    expect(cachedTrack?.rawLyrics).toBe("Some lyrics");

    // 4. Verify analysis variant is stored correctly
    const storedVariant = await sqliteService.getAnalysisVariant("track_123", "style", "en");
    expect(storedVariant).not.toBeNull();
    expect(storedVariant?.payload).toEqual(payloadStyle);
  });

  it("should successfully save, retrieve and coexist overview variant with other modes", async () => {
    await sqliteService.clearAllUserData();

    const overviewVariant = {
      id: "var_overview_1",
      trackId: "track_multi",
      mode: "overview" as const,
      targetLanguage: "ru",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const overviewPayload = { summary: "This is a great track!" };

    const styleVariant = {
      id: "var_style_1",
      trackId: "track_multi",
      mode: "style" as const,
      targetLanguage: "ru",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const stylePayload = { tone: "optimistic" };

    await sqliteService.saveAnalysisVariant(overviewVariant, overviewPayload);
    await sqliteService.saveAnalysisVariant(styleVariant, stylePayload);

    // Verify retrieval of both distinct modes
    const retrievedOverview = await sqliteService.getAnalysisVariant("track_multi", "overview", "ru");
    expect(retrievedOverview).not.toBeNull();
    expect(retrievedOverview?.variant.mode).toBe("overview");
    expect(retrievedOverview?.payload).toEqual(overviewPayload);

    const retrievedStyle = await sqliteService.getAnalysisVariant("track_multi", "style", "ru");
    expect(retrievedStyle).not.toBeNull();
    expect(retrievedStyle?.variant.mode).toBe("style");
    expect(retrievedStyle?.payload).toEqual(stylePayload);

    // Verify all variants for track list
    const list = await sqliteService.getAnalysisVariantsForTrack("track_multi");
    expect(list.length).toBe(2);
    const modes = list.map(item => item.variant.mode);
    expect(modes).toContain("overview");
    expect(modes).toContain("style");
  });

  it("should survive gracefully and return payload as null if the JSON is corrupted or missing", async () => {
    await sqliteService.clearAllUserData();

    const damagedVariant = {
      id: "var_damaged_1",
      trackId: "track_damaged",
      mode: "overview" as const,
      targetLanguage: "ru",
      sourceLanguage: "en",
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // We can save it locally with malformed structure to test local cache robustness, or trigger fallback
    // Since saveAnalysisVariant serializes properly, we can mock a scenario in localStorage or check worker queries with invalid string
    const key = "track_damaged_overview_ru";
    (sqliteService as any).analysisVariants[key] = {
      variant: damagedVariant,
      payload: null // Simulate fallback/null payload
    };
    sqliteService.saveAnalysisVariantsBackup((sqliteService as any).analysisVariants);

    // Verify getAnalysisVariant returns it successfully with payload: null
    const retrieved = await sqliteService.getAnalysisVariant("track_damaged", "overview", "ru");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.variant.id).toBe("var_damaged_1");
    expect(retrieved?.payload).toBeNull();
  });

  describe("WordFormExtractor & SQLite Word Forms Support", () => {
    it("should correctly clean punctuation and extract word forms with occurrences counts", () => {
      const lyrics = "Love, love, LOVE! I love you, baby!";
      const forms = WordFormExtractor.extractWordForms(lyrics, "en");

      // We expect unique words: "love", "i", "you", "baby"
      expect(forms.length).toBe(4);

      const loveForm = forms.find((f) => f.normalizedSurface === "love");
      expect(loveForm).toBeDefined();
      expect(loveForm?.count).toBe(4);
      expect(loveForm?.language).toBe("en");
      // Since "love" lowercase exists, surface should be lowercase
      expect(loveForm?.surface).toBe("love");

      const babyForm = forms.find((f) => f.normalizedSurface === "baby");
      expect(babyForm).toBeDefined();
      expect(babyForm?.count).toBe(1);
      expect(babyForm?.surface).toBe("baby");
    });

    it("should handle non-English text with spaces (e.g., Russian)", () => {
      const lyrics = "Привет, мир! О, прекрасный приветливый мир.";
      const forms = WordFormExtractor.extractWordForms(lyrics, "ru");

      const mirForm = forms.find((f) => f.normalizedSurface === "мир");
      expect(mirForm).toBeDefined();
      expect(mirForm?.count).toBe(2);
      expect(mirForm?.language).toBe("ru");
    });

    it("should extract, store, and retrieve track word forms under SqliteService", async () => {
      const trackId = "track_word_test_1";
      const lyrics = "Dance dance dance, singing a song.";
      
      await sqliteService.extractAndStoreTrackWordForms(trackId, lyrics, "en");
      
      const forms = await sqliteService.getTrackWordForms(trackId);
      expect(forms.length).toBe(4); // "dance", "singing", "a", "song"

      const danceForm = forms.find((f) => f.normalizedSurface === "dance");
      expect(danceForm).toBeDefined();
      expect(danceForm?.count).toBe(3);
      expect(danceForm?.status).toBe("new"); // Default status is "new"
    });

    it("should support updating and reading user knowledge status per word form", async () => {
      const trackId = "track_word_test_2";
      const lyrics = "Learning is fun, learning is life.";
      
      await sqliteService.extractAndStoreTrackWordForms(trackId, lyrics, "en");
      const formsBefore = await sqliteService.getTrackWordForms(trackId);
      
      const learningForm = formsBefore.find((f) => f.normalizedSurface === "learning");
      expect(learningForm).toBeDefined();
      expect(learningForm?.status).toBe("new");

      // Set to "learning"
      await sqliteService.setUserWordFormStatus(learningForm!.id, "learning");

      // Re-fetch to verify updated status
      const formsAfter = await sqliteService.getTrackWordForms(trackId);
      const learningFormAfter = formsAfter.find((f) => f.normalizedSurface === "learning");
      expect(learningFormAfter?.status).toBe("learning");
      expect(learningFormAfter?.updatedAt).toBeDefined();

      // Ensure other word forms are still "new"
      const funForm = formsAfter.find((f) => f.normalizedSurface === "fun");
      expect(funForm?.status).toBe("new");
    });

    it("should compute correct known/unknown word counts and statistics", async () => {
      const trackId = "track_word_test_3";
      const lyrics = "First second third fourth fifth.";
      
      await sqliteService.extractAndStoreTrackWordForms(trackId, lyrics, "en");
      const forms = await sqliteService.getTrackWordForms(trackId);
      
      const first = forms.find((f) => f.normalizedSurface === "first");
      const second = forms.find((f) => f.normalizedSurface === "second");
      const third = forms.find((f) => f.normalizedSurface === "third");

      // Mark first as known, second as learning, third as ignored
      await sqliteService.setUserWordFormStatus(first!.id, "known");
      await sqliteService.setUserWordFormStatus(second!.id, "learning");
      await sqliteService.setUserWordFormStatus(third!.id, "ignored");

      const stats = await sqliteService.getTrackWordFormStats(trackId);
      // Total distinct: 5
      expect(stats.totalCount).toBe(5);
      expect(stats.knownCount).toBe(1);      // first
      expect(stats.learningCount).toBe(1);   // second
      expect(stats.ignoredCount).toBe(1);    // third
      expect(stats.newCount).toBe(2);        // fourth, fifth
      
      // Unknown count is total - known - ignored = 5 - 1 - 1 = 3 (learning + new)
      expect(stats.unknownCount).toBe(3);

      // Verify individual lookup dictionary status
      const statuses = await sqliteService.getTrackWordFormStatuses(trackId);
      expect(statuses[first!.id]).toBe("known");
      expect(statuses[second!.id]).toBe("learning");
      expect(statuses[third!.id]).toBe("ignored");
    });
  });
});
