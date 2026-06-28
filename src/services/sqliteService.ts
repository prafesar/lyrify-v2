import { Track, TrackLyricsData } from "./musicService";
import { Artist, Album, AnalysisMode, AnalysisVariant } from "../constants";
import { normalizeLanguageCode } from "../lib/languages";

export class SqliteService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private storageMode: "opfs" | "transient" | "error" | null = null;

  // Replicated in-memory cache for synchronous reads
  private preferences: Record<string, string> = {};
  private recentTracks: Track[] = [];
  private trackCache: Record<string, TrackLyricsData> = {};
  private favorites: Track[] = [];
  private favoriteArtists: Artist[] = [];
  private favoriteAlbums: Album[] = [];
  private playlists: any[] = [];
  private analysisVariants: Record<string, { variant: AnalysisVariant; payload: any }> = {};

  // Track async callbacks for background writes/commands
  private pendingCallbacks = new Map<string, { resolve: (res?: any) => void; reject: (err: any) => void }>();
  private messageIdCounter = 0;

  // Subscriber callbacks for async changes and readiness notifications
  private changeListeners = new Set<(event: string) => void>();

  constructor() {
    // Attempt to hydrate preferences synchronously from localStorage for instant page-load recovery
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const localPrefs = localStorage.getItem("cantolex_sqlite_prefs_sync");
        if (localPrefs) {
          this.preferences = JSON.parse(localPrefs);
        }

        const recentBackup = localStorage.getItem("cantolex_recent_tracks_backup");
        if (recentBackup) {
          this.recentTracks = JSON.parse(recentBackup) || [];
        }

        const favoritesBackup = localStorage.getItem("cantolex_favorites_backup");
        if (favoritesBackup) {
          this.favorites = JSON.parse(favoritesBackup) || [];
        }

        const favoriteArtistsBackup = localStorage.getItem("cantolex_favorite_artists_backup");
        if (favoriteArtistsBackup) {
          this.favoriteArtists = JSON.parse(favoriteArtistsBackup) || [];
        }

        const favoriteAlbumsBackup = localStorage.getItem("cantolex_favorite_albums_backup");
        if (favoriteAlbumsBackup) {
          this.favoriteAlbums = JSON.parse(favoriteAlbumsBackup) || [];
        }

        const playlistsBackup = localStorage.getItem("cantolex_playlists_backup");
        if (playlistsBackup) {
          this.playlists = JSON.parse(playlistsBackup) || [];
        }

        const trackCacheBackup = localStorage.getItem("cantolex_track_cache_backup");
        if (trackCacheBackup) {
          this.trackCache = JSON.parse(trackCacheBackup) || {};
        }

        const analysisVariantsBackup = localStorage.getItem("cantolex_analysis_variants_backup");
        if (analysisVariantsBackup) {
          this.analysisVariants = JSON.parse(analysisVariantsBackup) || {};
        }
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read sync backups from localStorage under construction:", e);
    }
    this.init();
  }

  private savePrefsToLocal() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_sqlite_prefs_sync", JSON.stringify(this.preferences));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write sync preferences to localStorage:", e);
    }
  }

  public getStorageMode(): "opfs" | "transient" | "error" | null {
    return this.storageMode;
  }

  private getRecentTracksBackup(): Track[] {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = localStorage.getItem("cantolex_recent_tracks_backup");
        if (val) {
          return JSON.parse(val);
        }
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read recent tracks backup from localStorage:", e);
    }
    return [];
  }

  private saveRecentTracksBackup(tracks: Track[]) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_recent_tracks_backup", JSON.stringify(tracks));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write recent tracks backup to localStorage:", e);
    }
  }

  private getFavoritesBackup(): Track[] {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = localStorage.getItem("cantolex_favorites_backup");
        if (val) return JSON.parse(val);
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read favorites backup from localStorage:", e);
    }
    return [];
  }

  private saveFavoritesBackup(favs: Track[]) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_favorites_backup", JSON.stringify(favs));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write favorites backup to localStorage:", e);
    }
  }

  private getFavoriteArtistsBackup(): Artist[] {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = localStorage.getItem("cantolex_favorite_artists_backup");
        if (val) return JSON.parse(val);
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read favorite artists backup from localStorage:", e);
    }
    return [];
  }

  private saveFavoriteArtistsBackup(arr: Artist[]) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_favorite_artists_backup", JSON.stringify(arr));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write favorite artists backup to localStorage:", e);
    }
  }

  private getFavoriteAlbumsBackup(): Album[] {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = localStorage.getItem("cantolex_favorite_albums_backup");
        if (val) return JSON.parse(val);
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read favorite albums backup from localStorage:", e);
    }
    return [];
  }

  private saveFavoriteAlbumsBackup(arr: Album[]) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_favorite_albums_backup", JSON.stringify(arr));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write favorite albums backup to localStorage:", e);
    }
  }

  private getPlaylistsBackup(): any[] {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = localStorage.getItem("cantolex_playlists_backup");
        if (val) return JSON.parse(val);
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read playlists backup from localStorage:", e);
    }
    return [];
  }

  private savePlaylistsBackup(playlists: any[]) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_playlists_backup", JSON.stringify(playlists));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write playlists backup to localStorage:", e);
    }
  }

  private async seedRecentTracksToWorker() {
    try {
      console.log("[SqliteService] Seeding recent tracks backup to SQLite worker...");
      if (this.recentTracks.length > 0) {
        for (const track of this.recentTracks) {
          await this.sendWorkerMsgInternal("ADD_RECENT_TRACK", { track });
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to seed recent tracks to worker:", err);
    }
  }

  private async seedFavoritesToWorker() {
    try {
      console.log("[SqliteService] Seeding favorites backup to SQLite worker...");
      if (this.favorites.length > 0) {
        for (const track of this.favorites) {
          const isFav = await this.sendWorkerMsgInternal<boolean>("IS_FAVORITE", { trackId: track.id });
          if (!isFav) {
            await this.sendWorkerMsgInternal("TOGGLE_FAVORITE", { track });
          }
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to seed favorites to worker:", err);
    }
  }

  private async seedFavoriteArtistsToWorker() {
    try {
      console.log("[SqliteService] Seeding favorite artists backup to SQLite worker...");
      if (this.favoriteArtists.length > 0) {
        for (const artist of this.favoriteArtists) {
          const isFav = await this.sendWorkerMsgInternal<boolean>("IS_FAVORITE_ARTIST", { artistId: artist.id });
          if (!isFav) {
            await this.sendWorkerMsgInternal("TOGGLE_FAVORITE_ARTIST", { artist });
          }
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to seed favorite artists to worker:", err);
    }
  }

  private async seedFavoriteAlbumsToWorker() {
    try {
      console.log("[SqliteService] Seeding favorite albums backup to SQLite worker...");
      if (this.favoriteAlbums.length > 0) {
        for (const album of this.favoriteAlbums) {
          const isFav = await this.sendWorkerMsgInternal<boolean>("IS_FAVORITE_ALBUM", { albumId: album.id });
          if (!isFav) {
            await this.sendWorkerMsgInternal("TOGGLE_FAVORITE_ALBUM", { album });
          }
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to seed favorite albums to worker:", err);
    }
  }

  private async seedPlaylistsToWorker() {
    try {
      console.log("[SqliteService] Seeding playlists backup to SQLite worker...");
      if (this.playlists.length > 0) {
        for (const pl of this.playlists) {
          await this.sendWorkerMsgInternal("CREATE_PLAYLIST", { name: pl.name, id: pl.id });
          if (pl.tracks && Array.isArray(pl.tracks)) {
            for (const tr of pl.tracks) {
              await this.sendWorkerMsgInternal("ADD_TRACK_TO_PLAYLIST", { playlistId: pl.id, track: tr });
            }
          }
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to seed playlists to worker:", err);
    }
  }

  private async seedTrackCacheToWorker() {
    try {
      console.log("[SqliteService] Seeding track cache backup to SQLite worker...");
      const trackIds = Object.keys(this.trackCache);
      if (trackIds.length > 0) {
        for (const trackId of trackIds) {
          const data = this.trackCache[trackId];
          await this.sendWorkerMsgInternal("SAVE_TRACK_DATA", { trackId, data });
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to seed track cache to worker:", err);
    }
  }

  private async seedAnalysisVariantsToWorker() {
    try {
      console.log("[SqliteService] Seeding analysis variants backup to SQLite worker...");
      const keys = Object.keys(this.analysisVariants);
      if (keys.length > 0) {
        for (const key of keys) {
          const item = this.analysisVariants[key];
          await this.sendWorkerMsgInternal("SAVE_ANALYSIS_VARIANT", {
            variant: item.variant,
            payload: item.payload
          });
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to seed analysis variants to worker:", err);
    }
  }

  // --- Change Listener Subscription System ---
  public subscribe(listener: (event: string) => void): () => void {
    this.changeListeners.add(listener);
    // If already initialized, fire immediately to make sure they get the hydrated state
    if (this.isInitialized) {
      try {
        listener("initialized");
      } catch (e) {
        console.error("[SqliteService] Subscriber error in immediate notification:", e);
      }
    }
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  private notify(event: string) {
    this.changeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error("[SqliteService] Subscriber error for event:", event, e);
      }
    });
  }

  public init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        // Instantiate Dedicated Worker utilizing Vite's asset module capability
        this.worker = new Worker(
          new URL("./sqlite.worker.ts", import.meta.url),
          { type: "module" }
        );

        this.worker.onmessage = async (event) => {
          const { type, payload, messageId } = event.data;

          if (type === "INIT_OK") {
            const { preferences, recentHistory, trackCache, favorites, favoriteArtists, favoriteAlbums, playlists, analysisVariants, storageMode: sMode } = payload;
            this.storageMode = sMode || "opfs";

            // Merge SQLite database preferences with our current in-memory cache,
            // giving precedence to whatever was already loaded synchronously or written.
            this.preferences = {
              ...(preferences || {}),
              ...this.preferences,
            };
            this.savePrefsToLocal();

            // Perform robust line-level track cache merging to keep translations andStarred/explanations
            const dbTrackCache = trackCache || {};
            const localCacheKeys = Object.keys(this.trackCache);
            const mergedTrackCache = { ...dbTrackCache };

            for (const key of localCacheKeys) {
              const localTrack = this.trackCache[key];
              const dbTrack = dbTrackCache[key];
              if (dbTrack) {
                const linesMap = new Map<string, any>();
                if (localTrack.lines) {
                  localTrack.lines.forEach((l) => {
                    const lkey = l.lineId || `${l.index}`;
                    linesMap.set(lkey, l);
                  });
                }
                if (dbTrack.lines) {
                  dbTrack.lines.forEach((l) => {
                    const lkey = l.lineId || `${l.index}`;
                    const existing = linesMap.get(lkey);
                    if (existing) {
                      linesMap.set(lkey, {
                        ...existing,
                        ...l,
                        translation: l.translation || existing.translation,
                        isStarred: l.isStarred ?? existing.isStarred,
                        explanation: l.explanation || existing.explanation,
                        language: l.language || existing.language
                      });
                    } else {
                      linesMap.set(lkey, l);
                    }
                  });
                }
                const mergedLines = Array.from(linesMap.values()).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
                mergedTrackCache[key] = {
                  ...dbTrack,
                  ...localTrack,
                  processingStatus: {
                    ...(dbTrack.processingStatus || {}),
                    ...(localTrack.processingStatus || {}),
                  },
                  lines: mergedLines
                };
              } else {
                mergedTrackCache[key] = localTrack;
              }
            }

            this.trackCache = mergedTrackCache;
            this.saveTrackCacheBackup(this.trackCache);

            if (this.storageMode === "transient" || this.storageMode === "error") {
              // Load from local localStorage backups first
              this.recentTracks = this.getRecentTracksBackup();
              this.favorites = this.getFavoritesBackup();
              this.favoriteArtists = this.getFavoriteArtistsBackup();
              this.favoriteAlbums = this.getFavoriteAlbumsBackup();
              this.playlists = this.getPlaylistsBackup();
              this.analysisVariants = this.getAnalysisVariantsBackup();

              // Seed everything to the transient worker, fully awaiting it
              await this.seedRecentTracksToWorker();
              await this.seedFavoritesToWorker();
              await this.seedFavoriteArtistsToWorker();
              await this.seedFavoriteAlbumsToWorker();
              await this.seedPlaylistsToWorker();
              await this.seedTrackCacheToWorker();
              await this.seedAnalysisVariantsToWorker();
            } else {
              // OPFS Mode: Check if worker has populated collections on a per-domain basis

              // 1. Recent Tracks Domain
              if (recentHistory && recentHistory.length > 0) {
                this.recentTracks = recentHistory;
                this.saveRecentTracksBackup(this.recentTracks);
              } else {
                this.recentTracks = this.getRecentTracksBackup();
                if (this.recentTracks.length > 0) {
                  await this.seedRecentTracksToWorker();
                }
              }

              // 2. Favorites Domain
              if (favorites && favorites.length > 0) {
                this.favorites = favorites;
                this.saveFavoritesBackup(this.favorites);
              } else {
                this.favorites = this.getFavoritesBackup();
                if (this.favorites.length > 0) {
                  await this.seedFavoritesToWorker();
                }
              }

              // 2b. Favorite Artists Domain
              if (favoriteArtists && favoriteArtists.length > 0) {
                this.favoriteArtists = favoriteArtists;
                this.saveFavoriteArtistsBackup(this.favoriteArtists);
              } else {
                this.favoriteArtists = this.getFavoriteArtistsBackup();
                if (this.favoriteArtists.length > 0) {
                  await this.seedFavoriteArtistsToWorker();
                }
              }

              // 2c. Favorite Albums Domain
              if (favoriteAlbums && favoriteAlbums.length > 0) {
                this.favoriteAlbums = favoriteAlbums;
                this.saveFavoriteAlbumsBackup(this.favoriteAlbums);
              } else {
                this.favoriteAlbums = this.getFavoriteAlbumsBackup();
                if (this.favoriteAlbums.length > 0) {
                  await this.seedFavoriteAlbumsToWorker();
                }
              }

              // 3. Playlists Domain
              if (playlists && playlists.length > 0) {
                this.playlists = playlists;
                this.savePlaylistsBackup(this.playlists);
              } else {
                this.playlists = this.getPlaylistsBackup();
                if (this.playlists.length > 0) {
                  await this.seedPlaylistsToWorker();
                }
              }

              // 4. Track Cache seeding fallback for OPFS
              if (!trackCache || Object.keys(trackCache).length === 0) {
                const trackIds = Object.keys(this.trackCache);
                if (trackIds.length > 0) {
                  await this.seedTrackCacheToWorker();
                }
              }

              // 5. Analysis Variants Domain
              if (analysisVariants && Object.keys(analysisVariants).length > 0) {
                this.analysisVariants = {
                  ...analysisVariants,
                  ...this.analysisVariants
                };
                this.saveAnalysisVariantsBackup(this.analysisVariants);
              } else {
                this.analysisVariants = this.getAnalysisVariantsBackup();
                if (Object.keys(this.analysisVariants).length > 0) {
                  await this.seedAnalysisVariantsToWorker();
                }
              }
            }

            this.isInitialized = true;
            console.log(`[SqliteService] Hydrated successfully from SQLite DB. Mode: ${this.storageMode}`);
            resolve();
            this.notify("initialized");
          } else if (type === "INIT_ERROR") {
            this.storageMode = payload.storageMode || "error";
            console.error("[SqliteService] SQLite worker initialization error:", payload.message);
            
            this.recentTracks = this.getRecentTracksBackup();
            this.favorites = this.getFavoritesBackup();
            this.favoriteArtists = this.getFavoriteArtistsBackup();
            this.favoriteAlbums = this.getFavoriteAlbumsBackup();
            this.playlists = this.getPlaylistsBackup();
            this.analysisVariants = this.getAnalysisVariantsBackup();

            this.isInitialized = true;
            resolve();
            this.notify("initialized");
          } else if (type === "WRITE_OK" || type === "QUERY_OK") {
            if (messageId && this.pendingCallbacks.has(messageId)) {
              this.pendingCallbacks.get(messageId)!.resolve(payload);
              this.pendingCallbacks.delete(messageId);
            }
          } else if (type === "ERROR") {
            if (messageId && this.pendingCallbacks.has(messageId)) {
              this.pendingCallbacks.get(messageId)!.reject(new Error(payload));
              this.pendingCallbacks.delete(messageId);
            } else {
              console.error("[SqliteService] Async server-side error reported:", payload);
            }
          }
        };

        // Post initialization task
        this.worker.postMessage({ type: "INIT" });
      } catch (err) {
        console.error("[SqliteService] Failed to establish Web Worker, operating in memory backup.", err);
        this.storageMode = "error";
        this.recentTracks = this.getRecentTracksBackup();
        this.favorites = this.getFavoritesBackup();
        this.favoriteArtists = this.getFavoriteArtistsBackup();
        this.favoriteAlbums = this.getFavoriteAlbumsBackup();
        this.playlists = this.getPlaylistsBackup();
        this.isInitialized = true;
        resolve();
        this.notify("initialized");
      }
    });

    return this.initPromise;
  }

  private sendWorkerMsgInternal<T = void>(type: string, payload: any): Promise<T> {
    if (!this.worker) return Promise.resolve(undefined as any);

    return new Promise((resolve, reject) => {
      const messageId = String(++this.messageIdCounter);
      this.pendingCallbacks.set(messageId, { resolve, reject });
      this.worker!.postMessage({ type, payload, messageId });
    });
  }

  private async sendWorkerMsg<T = void>(type: string, payload: any): Promise<T> {
    if (!this.worker) return Promise.resolve(undefined as any);

    await this.init();

    return this.sendWorkerMsgInternal<T>(type, payload);
  }

  // --- Preferences ---
  public getPreference(key: string, defaultValue: string): string {
    const val = this.preferences[key];
    return val !== undefined ? val : defaultValue;
  }

  public setPreference(key: string, value: string): void {
    this.preferences[key] = value;
    this.savePrefsToLocal();
    this.notify("preferences");
    this.sendWorkerMsg("SET_PREFERENCE", { key, value }).catch((err) =>
      console.warn("[SqliteService] Failed to backup preferences in database:", err)
    );
  }

  public getBoolPreference(key: string, defaultValue: boolean): boolean {
    const val = this.preferences[key];
    if (val === undefined) return defaultValue;
    return val === "true";
  }

  public setBoolPreference(key: string, value: boolean): void {
    const strVal = String(value);
    this.preferences[key] = strVal;
    this.savePrefsToLocal();
    this.notify("preferences");
    this.sendWorkerMsg("SET_PREFERENCE", { key, value: strVal }).catch((err) =>
      console.warn("[SqliteService] Failed to backup preferences in database:", err)
    );
  }

  public removePreference(key: string): void {
    delete this.preferences[key];
    this.savePrefsToLocal();
    this.notify("preferences");
    this.sendWorkerMsg("REMOVE_PREFERENCE", { key }).catch((err) =>
      console.warn("[SqliteService] Failed to remove preference in database:", err)
    );
  }

  // --- Recent Tracks ---
  public getRecentTracks(): Track[] {
    this.recentTracks.forEach(t => {
      if (t.sourceLanguage) {
        t.sourceLanguage = normalizeLanguageCode(t.sourceLanguage) || t.sourceLanguage;
      }
    });
    return [...this.recentTracks];
  }

  public addRecentTrack(track: Track): void {
    const cleanTrack = { ...track };
    if (cleanTrack.sourceLanguage) {
      cleanTrack.sourceLanguage = normalizeLanguageCode(cleanTrack.sourceLanguage) || cleanTrack.sourceLanguage;
    }
    if (!cleanTrack.id && cleanTrack.trackId) {
      cleanTrack.id = cleanTrack.trackId;
    }
    if (!cleanTrack.trackId && cleanTrack.id) {
      cleanTrack.trackId = cleanTrack.id;
    }
    const trackId = String(cleanTrack.id || cleanTrack.trackId);

    // Dedup and slice recent list
    this.recentTracks = [
      cleanTrack,
      ...this.recentTracks.filter((t) => String(t.id || t.trackId) !== trackId),
    ].slice(0, 10);
    
    // Always store a local backup
    this.saveRecentTracksBackup(this.recentTracks);
    this.notify("recent_tracks");

    this.sendWorkerMsg("ADD_RECENT_TRACK", { track: cleanTrack }).catch((err) =>
      console.warn("[SqliteService] Failed to backup recent track item:", err)
    );
  }

  // --- Track cache storage ---
  public getCachedTrack(trackId: string): TrackLyricsData | null {
    return this.trackCache[trackId] || null;
  }

  private saveTrackCacheBackup(cache: Record<string, TrackLyricsData>) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_track_cache_backup", JSON.stringify(cache));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write track cache backup to localStorage:", e);
    }
  }

  public saveTrackData(trackId: string, data: any): TrackLyricsData {
    const existing = (this.trackCache[trackId] || { id: trackId }) as any;
    const updated = {
      ...existing,
      ...data,
      processingStatus: {
        ...(existing.processingStatus || {}),
        ...(data.processingStatus || {}),
      },
    };
    this.trackCache[trackId] = updated;
    this.saveTrackCacheBackup(this.trackCache);

    this.sendWorkerMsg("SAVE_TRACK_DATA", { trackId, data: updated }).catch((err) =>
      console.warn("[SqliteService] Failed to cache track data into SQLite storage:", err)
    );

    return updated;
  }

  // --- Maintenance / Cleaning ---
  public async clearAllUserData(): Promise<void> {
    this.preferences = {};
    this.recentTracks = [];
    this.trackCache = {};
    this.favorites = [];
    this.favoriteArtists = [];
    this.favoriteAlbums = [];
    this.playlists = [];
    this.analysisVariants = {};
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem("cantolex_sqlite_prefs_sync");
        localStorage.removeItem("cantolex_recent_tracks_backup");
        localStorage.removeItem("cantolex_favorites_backup");
        localStorage.removeItem("cantolex_favorite_artists_backup");
        localStorage.removeItem("cantolex_favorite_albums_backup");
        localStorage.removeItem("cantolex_playlists_backup");
        localStorage.removeItem("cantolex_track_cache_backup");
        localStorage.removeItem("cantolex_analysis_variants_backup");
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to clear local sync cache:", e);
    }
    await this.sendWorkerMsg("CLEAR_ALL", {});
  }

  // --- Library / Favorites & Playlists (SQLite Backed with Local fallback) ---
  public async getFavorites(): Promise<Track[]> {
    if (this.storageMode === "error") {
      this.favorites.forEach(t => {
        if (t.sourceLanguage) {
          t.sourceLanguage = normalizeLanguageCode(t.sourceLanguage) || t.sourceLanguage;
        }
      });
      return [...this.favorites];
    }
    try {
      const res = await this.sendWorkerMsg<Track[]>("GET_FAVORITES", {});
      if (res) {
        if (res.length === 0 && this.favorites.length > 0) {
          console.warn("[SqliteService] Prevented wiping favorites cache with empty worker response.");
        } else {
          this.favorites = res;
          this.saveFavoritesBackup(res);
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to get favorites from worker, using cache:", err);
    }
    this.favorites.forEach(t => {
      if (t.sourceLanguage) {
        t.sourceLanguage = normalizeLanguageCode(t.sourceLanguage) || t.sourceLanguage;
      }
    });
    return [...this.favorites];
  }

  public async toggleFavorite(track: Track): Promise<boolean> {
    const cleanTrack = { ...track };
    if (cleanTrack.sourceLanguage) {
      cleanTrack.sourceLanguage = normalizeLanguageCode(cleanTrack.sourceLanguage) || cleanTrack.sourceLanguage;
    }
    const trackId = String(cleanTrack.id);
    const idx = this.favorites.findIndex((t) => String(t.id) === trackId);
    const isFavNow = idx === -1;
    if (idx !== -1) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(cleanTrack);
    }
    this.saveFavoritesBackup(this.favorites);
    this.notify("favorites");

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("TOGGLE_FAVORITE", { track: cleanTrack });
      } catch (err) {
        console.warn("[SqliteService] Failed to save favorite toggle in worker:", err);
      }
    }
    return isFavNow;
  }

  public async isFavorite(trackId: string): Promise<boolean> {
    const tid = String(trackId);
    return this.favorites.some((t) => String(t.id) === tid);
  }

  public updateTrackInLibrary(trackId: string, updatedTrack: Track): void {
    const tid = String(trackId);

    // 1. Update in favorites
    let favoritesUpdated = false;
    this.favorites = this.favorites.map((t) => {
      if (String(t.id || t.trackId) === tid) {
        favoritesUpdated = true;
        return { ...t, ...updatedTrack };
      }
      return t;
    });

    if (favoritesUpdated) {
      this.saveFavoritesBackup(this.favorites);
      this.notify("favorites");
      if (this.storageMode !== "error") {
        this.sendWorkerMsg("UPDATE_FAVORITE_TRACK", { track: updatedTrack }).catch((err) =>
          console.warn("[SqliteService] Failed to update favorite track in worker:", err)
        );
      }
    }

    // 2. Update in recentTracks
    let recentsUpdated = false;
    this.recentTracks = this.recentTracks.map((t) => {
      if (String(t.id || t.trackId) === tid) {
        recentsUpdated = true;
        return { ...t, ...updatedTrack };
      }
      return t;
    });

    if (recentsUpdated) {
      this.saveRecentTracksBackup(this.recentTracks);
      this.notify("recent_tracks");
      if (this.storageMode !== "error") {
        this.sendWorkerMsg("ADD_RECENT_TRACK", { track: updatedTrack }).catch((err) =>
          console.warn("[SqliteService] Failed to update recent track in worker:", err)
        );
      }
    }

    // 3. Update in playlists
    let playlistsUpdated = false;
    this.playlists = this.playlists.map((playlist) => {
      let playlistTrackUpdated = false;
      const updatedTracks = (playlist.tracks || []).map((t: any) => {
        if (String(t.id || t.trackId) === tid) {
          playlistTrackUpdated = true;
          return { ...t, ...updatedTrack };
        }
        return t;
      });

      if (playlistTrackUpdated) {
        playlistsUpdated = true;
        return { ...playlist, tracks: updatedTracks };
      }
      return playlist;
    });

    if (playlistsUpdated) {
      this.savePlaylistsBackup(this.playlists);
      this.notify("playlists");
      if (this.storageMode !== "error") {
        this.sendWorkerMsg("UPDATE_PLAYLIST_ITEM_TRACK", { trackId: tid, track: updatedTrack }).catch((err) =>
          console.warn("[SqliteService] Failed to update playlist item track in worker:", err)
        );
      }
    }
  }

  public async getFavoriteArtists(): Promise<Artist[]> {
    if (this.storageMode === "error") {
      return [...this.favoriteArtists];
    }
    try {
      const res = await this.sendWorkerMsg<Artist[]>("GET_FAVORITE_ARTISTS", {});
      if (res) {
        if (res.length === 0 && this.favoriteArtists.length > 0) {
          console.warn("[SqliteService] Prevented wiping favorite artists cache with empty worker response.");
        } else {
          this.favoriteArtists = res;
          this.saveFavoriteArtistsBackup(res);
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to get favorite artists from worker, using cache:", err);
    }
    return [...this.favoriteArtists];
  }

  public async toggleFavoriteArtist(artist: Artist): Promise<boolean> {
    const artistId = String(artist.id);
    const idx = this.favoriteArtists.findIndex((a) => String(a.id) === artistId);
    const isFavNow = idx === -1;
    if (idx !== -1) {
      this.favoriteArtists.splice(idx, 1);
    } else {
      this.favoriteArtists.push(artist);
    }
    this.saveFavoriteArtistsBackup(this.favoriteArtists);
    this.notify("favorites"); // Notify 'favorites' to trigger view updates of the library!

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("TOGGLE_FAVORITE_ARTIST", { artist });
      } catch (err) {
        console.warn("[SqliteService] Failed to save favorite artist toggle in worker:", err);
      }
    }
    return isFavNow;
  }

  public async isFavoriteArtist(artistId: string): Promise<boolean> {
    const aid = String(artistId);
    return this.favoriteArtists.some((a) => String(a.id) === aid);
  }

  public async getFavoriteAlbums(): Promise<Album[]> {
    if (this.storageMode === "error") {
      return [...this.favoriteAlbums];
    }
    try {
      const res = await this.sendWorkerMsg<Album[]>("GET_FAVORITE_ALBUMS", {});
      if (res) {
        if (res.length === 0 && this.favoriteAlbums.length > 0) {
          console.warn("[SqliteService] Prevented wiping favorite albums cache with empty worker response.");
        } else {
          this.favoriteAlbums = res;
          this.saveFavoriteAlbumsBackup(res);
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to get favorite albums from worker, using cache:", err);
    }
    return [...this.favoriteAlbums];
  }

  public async toggleFavoriteAlbum(album: Album): Promise<boolean> {
    const albumId = String(album.id);
    const idx = this.favoriteAlbums.findIndex((al) => String(al.id) === albumId);
    const isFavNow = idx === -1;
    if (idx !== -1) {
      this.favoriteAlbums.splice(idx, 1);
    } else {
      this.favoriteAlbums.push(album);
    }
    this.saveFavoriteAlbumsBackup(this.favoriteAlbums);
    this.notify("favorites"); // Notify 'favorites' to trigger view updates of the library!

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("TOGGLE_FAVORITE_ALBUM", { album });
      } catch (err) {
        console.warn("[SqliteService] Failed to save favorite album toggle in worker:", err);
      }
    }
    return isFavNow;
  }

  public async isFavoriteAlbum(albumId: string): Promise<boolean> {
    const alid = String(albumId);
    return this.favoriteAlbums.some((al) => String(al.id) === alid);
  }

  public async getPlaylists(): Promise<any[]> {
    if (this.storageMode === "error") {
      return [...this.playlists];
    }
    try {
      const res = await this.sendWorkerMsg<any[]>("GET_PLAYLISTS", {});
      if (res) {
        if (res.length === 0 && this.playlists.length > 0) {
          console.warn("[SqliteService] Prevented wiping playlists cache with empty worker response.");
        } else {
          this.playlists = res;
          this.savePlaylistsBackup(res);
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to get playlists from worker, using cache:", err);
    }
    return [...this.playlists];
  }

  public async createPlaylist(name: string, id?: string): Promise<string> {
    const newId = id || `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPl = {
      id: newId,
      name,
      createdAt: Date.now(),
      trackIds: [],
      tracks: []
    };
    this.playlists.unshift(newPl);
    this.savePlaylistsBackup(this.playlists);
    this.notify("playlists");

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("CREATE_PLAYLIST", { name, id: newId });
      } catch (err) {
        console.warn("[SqliteService] Failed to save playlist in worker:", err);
      }
    }
    return newId;
  }

  public async addTrackToPlaylist(playlistId: string, track: Track): Promise<void> {
    const pl = this.playlists.find((p) => String(p.id) === String(playlistId));
    if (pl) {
      if (!pl.trackIds.includes(track.id)) {
        pl.trackIds.push(track.id);
        pl.tracks.push(track);
        this.savePlaylistsBackup(this.playlists);
        this.notify("playlists");
      }
    }

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("ADD_TRACK_TO_PLAYLIST", { playlistId, track });
      } catch (err) {
        console.warn("[SqliteService] Failed to add track to playlist in worker:", err);
      }
    }
  }

  public async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const pl = this.playlists.find((p) => String(p.id) === String(playlistId));
    if (pl) {
      pl.trackIds = pl.trackIds.filter((tid: string) => String(tid) !== String(trackId));
      pl.tracks = pl.tracks.filter((t: Track) => String(t.id) !== String(trackId));
      this.savePlaylistsBackup(this.playlists);
      this.notify("playlists");
    }

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("REMOVE_TRACK_FROM_PLAYLIST", { playlistId, trackId });
      } catch (err) {
        console.warn("[SqliteService] Failed to remove track from playlist in worker:", err);
      }
    }
  }

  public async deletePlaylist(playlistId: string): Promise<void> {
    this.playlists = this.playlists.filter((p) => String(p.id) !== String(playlistId));
    this.savePlaylistsBackup(this.playlists);
    this.notify("playlists");

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("DELETE_PLAYLIST", { playlistId });
      } catch (err) {
        console.warn("[SqliteService] Failed to delete playlist in worker:", err);
      }
    }
  }

  private getAnalysisVariantsBackup(): Record<string, { variant: AnalysisVariant; payload: any }> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const val = localStorage.getItem("cantolex_analysis_variants_backup");
        if (val) {
          return JSON.parse(val);
        }
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read analysis variants backup from localStorage:", e);
    }
    return {};
  }

  private saveAnalysisVariantsBackup(variants: Record<string, { variant: AnalysisVariant; payload: any }>) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_analysis_variants_backup", JSON.stringify(variants));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to write analysis variants backup to localStorage:", e);
    }
  }

  public async saveAnalysisVariant(variant: AnalysisVariant, payload: any): Promise<void> {
    const key = `${variant.trackId}_${variant.mode}_${variant.targetLanguage}`;
    this.analysisVariants[key] = { variant, payload };
    this.saveAnalysisVariantsBackup(this.analysisVariants);
    this.notify("analysis_variants");

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("SAVE_ANALYSIS_VARIANT", { variant, payload });
      } catch (err) {
        console.warn("[SqliteService] Failed to save analysis variant in worker:", err);
      }
    }
  }

  public async getAnalysisVariant(
    trackId: string,
    mode: AnalysisMode,
    targetLanguage: string
  ): Promise<{ variant: AnalysisVariant; payload: any } | null> {
    const key = `${trackId}_${mode}_${targetLanguage}`;
    const cached = this.analysisVariants[key];
    if (cached) {
      return cached;
    }

    if (this.storageMode === "error") {
      return null;
    }

    try {
      const variants = await this.getAnalysisVariantsForTrack(trackId);
      const match = variants.find(
        (item) => item.variant.mode === mode && item.variant.targetLanguage === targetLanguage
      );
      return match || null;
    } catch (err) {
      console.warn("[SqliteService] Failed to load analysis variant from worker:", err);
      return null;
    }
  }

  public async getAnalysisVariantsForTrack(
    trackId: string
  ): Promise<Array<{ variant: AnalysisVariant; payload: any }>> {
    if (this.storageMode === "error") {
      return Object.values(this.analysisVariants).filter(
        (item) => String(item.variant.trackId) === String(trackId)
      );
    }

    try {
      const res = await this.sendWorkerMsg<Array<{ variant: AnalysisVariant; payload: any }>>(
        "GET_ANALYSIS_VARIANTS_FOR_TRACK",
        { trackId }
      );
      if (res) {
        res.forEach((item) => {
          const key = `${item.variant.trackId}_${item.variant.mode}_${item.variant.targetLanguage}`;
          this.analysisVariants[key] = item;
        });
        this.saveAnalysisVariantsBackup(this.analysisVariants);
        return res;
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to fetch analysis variants from worker, using local cache:", err);
    }

    return Object.values(this.analysisVariants).filter(
      (item) => String(item.variant.trackId) === String(trackId)
    );
  }
}

export const sqliteService = new SqliteService();
