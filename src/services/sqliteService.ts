import { Track, TrackLyricsData } from "./musicService";

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
  private playlists: any[] = [];

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

        const playlistsBackup = localStorage.getItem("cantolex_playlists_backup");
        if (playlistsBackup) {
          this.playlists = JSON.parse(playlistsBackup) || [];
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

  private async seedLocalBackupsToWorker() {
    try {
      console.log("[SqliteService] Seeding local backups to SQLite worker...");
      
      // 1. Seed Recent Tracks
      if (this.recentTracks.length > 0) {
        for (const track of this.recentTracks) {
          await this.sendWorkerMsgInternal("ADD_RECENT_TRACK", { track });
        }
      }

      // 2. Seed Favorites
      if (this.favorites.length > 0) {
        for (const track of this.favorites) {
          const isFav = await this.sendWorkerMsgInternal<boolean>("IS_FAVORITE", { trackId: track.id });
          if (!isFav) {
            await this.sendWorkerMsgInternal("TOGGLE_FAVORITE", { track });
          }
        }
      }

      // 3. Seed Playlists
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
      console.log("[SqliteService] Seeding of local backups completed successfully.");
    } catch (err) {
      console.warn("[SqliteService] Failed to seed backups in worker:", err);
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
            const { preferences, recentHistory, trackCache, favorites, playlists, storageMode: sMode } = payload;
            this.storageMode = sMode || "opfs";

            // Merge SQLite database preferences with our current in-memory cache,
            // giving precedence to whatever was already loaded synchronously or written.
            this.preferences = {
              ...(preferences || {}),
              ...this.preferences,
            };
            this.savePrefsToLocal();

            this.trackCache = trackCache || {};

            if (this.storageMode === "transient" || this.storageMode === "error") {
              // Load from local localStorage backups first
              this.recentTracks = this.getRecentTracksBackup();
              this.favorites = this.getFavoritesBackup();
              this.playlists = this.getPlaylistsBackup();

              // Seed everything to the transient worker, fully awaiting it
              await this.seedLocalBackupsToWorker();
            } else {
              // OPFS Mode: Check if worker has populated collections
              let hasWorkerData = false;

              if (recentHistory && recentHistory.length > 0) {
                this.recentTracks = recentHistory;
                this.saveRecentTracksBackup(this.recentTracks);
                hasWorkerData = true;
              } else {
                this.recentTracks = this.getRecentTracksBackup();
              }

              if (favorites && favorites.length > 0) {
                this.favorites = favorites;
                this.saveFavoritesBackup(this.favorites);
                hasWorkerData = true;
              } else {
                this.favorites = this.getFavoritesBackup();
              }

              if (playlists && playlists.length > 0) {
                this.playlists = playlists;
                this.savePlaylistsBackup(this.playlists);
                hasWorkerData = true;
              } else {
                this.playlists = this.getPlaylistsBackup();
              }

              // If worker database was empty but we have local backup data, seed OPFS worker
              if (!hasWorkerData) {
                await this.seedLocalBackupsToWorker();
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
            this.playlists = this.getPlaylistsBackup();

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
    return [...this.recentTracks];
  }

  public addRecentTrack(track: Track): void {
    const cleanTrack = { ...track };
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
    this.playlists = [];
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem("cantolex_sqlite_prefs_sync");
        localStorage.removeItem("cantolex_recent_tracks_backup");
        localStorage.removeItem("cantolex_favorites_backup");
        localStorage.removeItem("cantolex_playlists_backup");
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to clear local sync cache:", e);
    }
    await this.sendWorkerMsg("CLEAR_ALL", {});
  }

  // --- Library / Favorites & Playlists (SQLite Backed with Local fallback) ---
  public async getFavorites(): Promise<Track[]> {
    if (this.storageMode === "error") {
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
    return [...this.favorites];
  }

  public async toggleFavorite(track: Track): Promise<boolean> {
    const trackId = String(track.id);
    const idx = this.favorites.findIndex((t) => String(t.id) === trackId);
    const isFavNow = idx === -1;
    if (idx !== -1) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(track);
    }
    this.saveFavoritesBackup(this.favorites);
    this.notify("favorites");

    if (this.storageMode !== "error") {
      try {
        await this.sendWorkerMsg("TOGGLE_FAVORITE", { track });
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
}

export const sqliteService = new SqliteService();
