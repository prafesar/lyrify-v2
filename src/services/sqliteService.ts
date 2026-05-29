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
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to read sync preferences from localStorage:", e);
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

  private async updateFavoritesBackup() {
    try {
      const favs = await this.getFavorites();
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_favorites_backup", JSON.stringify(favs));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to update favorites backup:", e);
    }
  }

  private async updatePlaylistsBackup() {
    try {
      const playlists = await this.getPlaylists();
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("cantolex_playlists_backup", JSON.stringify(playlists));
      }
    } catch (e) {
      console.warn("[SqliteService] Failed to update playlists backup:", e);
    }
  }

  private async hydrateTransientLibraryBackups() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;

      // 1. Favorites
      const favsStr = localStorage.getItem("cantolex_favorites_backup");
      if (favsStr) {
        const favs: Track[] = JSON.parse(favsStr);
        if (Array.isArray(favs)) {
          for (const track of favs) {
            const isFav = await this.isFavorite(track.id);
            if (!isFav) {
              await this.sendWorkerMsg("TOGGLE_FAVORITE", { track });
            }
          }
        }
      }

      // 2. Playlists
      const plStr = localStorage.getItem("cantolex_playlists_backup");
      if (plStr) {
        const playlists = JSON.parse(plStr);
        if (Array.isArray(playlists)) {
          for (const pl of playlists) {
            const plId = await this.sendWorkerMsg<string>("CREATE_PLAYLIST", { name: pl.name });
            if (pl.tracks && Array.isArray(pl.tracks)) {
              for (const tr of pl.tracks) {
                await this.sendWorkerMsg("ADD_TRACK_TO_PLAYLIST", { playlistId: plId, track: tr });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("[SqliteService] Failed to hydrate library domain backups in transient mode:", err);
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

        this.worker.onmessage = (event) => {
          const { type, payload, messageId } = event.data;

          if (type === "INIT_OK") {
            const { preferences, recentHistory, trackCache, storageMode: sMode } = payload;
            this.storageMode = sMode || "opfs";

            // Merge SQLite database preferences with our current in-memory cache,
            // giving precedence to whatever was already loaded synchronously or written.
            this.preferences = {
              ...(preferences || {}),
              ...this.preferences,
            };
            this.savePrefsToLocal();

            if (this.storageMode === "transient" || this.storageMode === "error") {
              const backup = this.getRecentTracksBackup();
              if (backup.length > 0) {
                this.recentTracks = backup;
                for (const track of backup) {
                  this.sendWorkerMsg("ADD_RECENT_TRACK", { track }).catch(() => {});
                }
              } else {
                this.recentTracks = recentHistory || [];
              }
              this.hydrateTransientLibraryBackups();
            } else {
              this.recentTracks = recentHistory || [];
              this.saveRecentTracksBackup(this.recentTracks);
            }

            this.trackCache = trackCache || {};
            this.isInitialized = true;
            console.log(`[SqliteService] Hydrated successfully from SQLite DB. Mode: ${this.storageMode}`);
            resolve();
            this.notify("initialized");
          } else if (type === "INIT_ERROR") {
            this.storageMode = payload.storageMode || "error";
            console.error("[SqliteService] SQLite worker initialization error:", payload.message);
            
            const backup = this.getRecentTracksBackup();
            if (backup.length > 0) {
              this.recentTracks = backup;
            }
            this.hydrateTransientLibraryBackups();

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
        const backup = this.getRecentTracksBackup();
        if (backup.length > 0) {
          this.recentTracks = backup;
        }
        this.hydrateTransientLibraryBackups();
        this.isInitialized = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  private async sendWorkerMsg<T = void>(type: string, payload: any): Promise<T> {
    if (!this.worker) return Promise.resolve(undefined as any);

    await this.init();

    return new Promise((resolve, reject) => {
      const messageId = String(++this.messageIdCounter);
      this.pendingCallbacks.set(messageId, { resolve, reject });
      this.worker!.postMessage({ type, payload, messageId });
    });
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
    // Dedup and slice recent list
    this.recentTracks = [
      track,
      ...this.recentTracks.filter((t) => String(t.id) !== String(track.id)),
    ].slice(0, 10);
    
    // Always store a local backup
    this.saveRecentTracksBackup(this.recentTracks);
    this.notify("recent_tracks");

    this.sendWorkerMsg("ADD_RECENT_TRACK", { track }).catch((err) =>
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

  // --- Library / Favorites & Playlists (SQLite Backed) ---
  public async getFavorites(): Promise<Track[]> {
    return this.sendWorkerMsg<Track[]>("GET_FAVORITES", {});
  }

  public async toggleFavorite(track: Track): Promise<boolean> {
    const res = await this.sendWorkerMsg<boolean>("TOGGLE_FAVORITE", { track });
    this.updateFavoritesBackup();
    return res;
  }

  public async isFavorite(trackId: string): Promise<boolean> {
    return this.sendWorkerMsg<boolean>("IS_FAVORITE", { trackId });
  }

  public async getPlaylists(): Promise<any[]> {
    return this.sendWorkerMsg<any[]>("GET_PLAYLISTS", {});
  }

  public async createPlaylist(name: string): Promise<string> {
    const res = await this.sendWorkerMsg<string>("CREATE_PLAYLIST", { name });
    this.updatePlaylistsBackup();
    return res;
  }

  public async addTrackToPlaylist(playlistId: string, track: Track): Promise<void> {
    const res = await this.sendWorkerMsg<void>("ADD_TRACK_TO_PLAYLIST", { playlistId, track });
    this.updatePlaylistsBackup();
    return res;
  }

  public async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const res = await this.sendWorkerMsg<void>("REMOVE_TRACK_FROM_PLAYLIST", { playlistId, trackId });
    this.updatePlaylistsBackup();
    return res;
  }

  public async deletePlaylist(playlistId: string): Promise<void> {
    const res = await this.sendWorkerMsg<void>("DELETE_PLAYLIST", { playlistId });
    this.updatePlaylistsBackup();
    return res;
  }
}

export const sqliteService = new SqliteService();
