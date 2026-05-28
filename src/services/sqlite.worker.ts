import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  [key: string]: any;
}

interface TrackLyricsData {
  id: string;
  [key: string]: any;
}

// Global SQLite instance and database reference
let db: any = null;

const log = (...args: any[]) => console.log("[sqlite-worker]", ...args);
const error = (...args: any[]) => console.error("[sqlite-worker]", ...args);

// Schema migration & bootstrap function
function bootstrapDb(sqlite3: any) {
  try {
    if ("opfs" in sqlite3) {
      db = new sqlite3.oo1.OpfsDb("/cantolex_lyrify.sqlite3");
      log("Successfully opened database in OPFS (persists across reloads).");
    } else {
      db = new sqlite3.oo1.DB("/cantolex_lyrify.sqlite3", "c");
      log("OPFS NOT available. Falling back to in-memory/transient local DB.");
    }

    // Table 1: Preferences
    db.exec(`
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Table 2: Recent History
    db.exec(`
      CREATE TABLE IF NOT EXISTS recent_history (
        id TEXT PRIMARY KEY,
        track_json TEXT NOT NULL,
        added_at INTEGER NOT NULL
      );
    `);

    // Table 3: Track Cache
    db.exec(`
      CREATE TABLE IF NOT EXISTS track_cache (
        id TEXT PRIMARY KEY,
        data_json TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      );
    `);

    log("Database schema bootstrapped and migrated successfully.");
  } catch (err: any) {
    error("Error bootstrapping database schema:", err);
    throw err;
  }
}

// Initialize SQLite WASM Module
async function init() {
  try {
    const sqlite3 = await sqlite3InitModule({
      print: log,
      printErr: error,
    });

    log("SQLite WASM module loaded successfully.");
    bootstrapDb(sqlite3);

    // Fetch initial state to hydrate Main Thread
    const preferences: Record<string, string> = {};
    db.exec({
      sql: "SELECT key, value FROM preferences",
      rowMode: "object",
      callback: (row: any) => {
        preferences[row.key] = row.value;
      },
    });

    const recentHistory: Track[] = [];
    db.exec({
      sql: "SELECT track_json FROM recent_history ORDER BY added_at DESC LIMIT 10",
      rowMode: "object",
      callback: (row: any) => {
        try {
          recentHistory.push(JSON.parse(row.track_json));
        } catch (e) {
          error("Error parsing recent track JSON:", e);
        }
      },
    });

    const trackCache: Record<string, TrackLyricsData> = {};
    db.exec({
      sql: "SELECT id, data_json FROM track_cache",
      rowMode: "object",
      callback: (row: any) => {
        try {
          trackCache[row.id] = JSON.parse(row.data_json);
        } catch (e) {
          error("Error parsing track lyrics data JSON:", e);
        }
      },
    });

    self.postMessage({
      type: "INIT_OK",
      payload: {
        preferences,
        recentHistory,
        trackCache,
      },
    });
  } catch (err: any) {
    error("SQLite initialization failed:", err);
    self.postMessage({
      type: "INIT_ERROR",
      payload: {
        message: err.message || String(err),
      },
    });
  }
}

// Request processing message loop
self.onmessage = async (event) => {
  const { type, payload, messageId } = event.data;

  if (type === "INIT") {
    await init();
    return;
  }

  if (!db) {
    self.postMessage({
      type: "ERROR",
      payload: "Database not initialized",
      messageId,
    });
    return;
  }

  try {
    switch (type) {
      case "SET_PREFERENCE": {
        const { key, value } = payload;
        db.exec({
          sql: "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
          bind: [key, value],
        });
        self.postMessage({ type: "WRITE_OK", messageId });
        break;
      }

      case "REMOVE_PREFERENCE": {
        const { key } = payload;
        db.exec({
          sql: "DELETE FROM preferences WHERE key = ?",
          bind: [key],
        });
        self.postMessage({ type: "WRITE_OK", messageId });
        break;
      }

      case "ADD_RECENT_TRACK": {
        const { track } = payload;
        const trackStr = JSON.stringify(track);
        const now = Date.now();
        db.exec({
          sql: "INSERT OR REPLACE INTO recent_history (id, track_json, added_at) VALUES (?, ?, ?)",
          bind: [String(track.id), trackStr, now],
        });
        self.postMessage({ type: "WRITE_OK", messageId });
        break;
      }

      case "SAVE_TRACK_DATA": {
        const { trackId, data } = payload;
        const dataStr = JSON.stringify(data);
        const now = Date.now();
        db.exec({
          sql: "INSERT OR REPLACE INTO track_cache (id, data_json, cached_at) VALUES (?, ?, ?)",
          bind: [String(trackId), dataStr, now],
        });
        self.postMessage({ type: "WRITE_OK", messageId });
        break;
      }

      case "CLEAR_ALL": {
        db.exec("DELETE FROM preferences");
        db.exec("DELETE FROM recent_history");
        db.exec("DELETE FROM track_cache");
        self.postMessage({ type: "WRITE_OK", messageId });
        break;
      }

      default:
        self.postMessage({
          type: "ERROR",
          payload: `Unhandled request type: ${type}`,
          messageId,
        });
    }
  } catch (err: any) {
    error(`Error handling event type ${type}:`, err);
    self.postMessage({
      type: "ERROR",
      payload: err.message || String(err),
      messageId,
    });
  }
};
