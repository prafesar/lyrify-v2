import { Track, TrackLyricsData } from "./musicService";

class SqliteService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  // Replicated in-memory cache for synchronous reads
  private preferences: Record<string, string> = {};
  private recentTracks: Track[] = [];
  private trackCache: Record<string, TrackLyricsData> = {};

  // Track async callbacks for background writes/commands
  private pendingCallbacks = new Map<string, { resolve: () => void; reject: (err: any) => void }>();
  private messageIdCounter = 0;

  constructor() {
    this.init();
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
            const { preferences, recentHistory, trackCache } = payload;
            this.preferences = preferences || {};
            this.recentTracks = recentHistory || [];
            this.trackCache = trackCache || {};
            this.isInitialized = true;
            console.log("[SqliteService] Hydrated successfully from SQLite OPFS DB.");
            resolve();
          } else if (type === "INIT_ERROR") {
            console.error("[SqliteService] SQLite worker initialization error:", payload.message);
            // Fallback gracefully utilizing transient local memory representation
            this.isInitialized = true;
            resolve();
          } else if (type === "WRITE_OK") {
            if (messageId && this.pendingCallbacks.has(messageId)) {
              this.pendingCallbacks.get(messageId)!.resolve();
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
        this.isInitialized = true;
        resolve();
      }
    });

    return this.initPromise;
  }

  private sendWorkerMsg(type: string, payload: any): Promise<void> {
    if (!this.worker) return Promise.resolve();

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
    this.sendWorkerMsg("SET_PREFERENCE", { key, value: strVal }).catch((err) =>
      console.warn("[SqliteService] Failed to backup preferences in database:", err)
    );
  }

  public removePreference(key: string): void {
    delete this.preferences[key];
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

    this.sendWorkerMsg("ADD_RECENT_TRACK", { track }).catch((err) =>
      console.warn("[SqliteService] Failed to backup recent track item:", err)
    );
  }

  // --- Track cache storage ---
  public getCachedTrack(trackId: string): TrackLyricsData | null {
    return this.trackCache[trackId] || null;
  }

  public saveTrackData(trackId: string, data: any): TrackLyricsData {
    const existing = this.trackCache[trackId] || { id: trackId };
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
    await this.sendWorkerMsg("CLEAR_ALL", {});
  }
}

export const sqliteService = new SqliteService();
