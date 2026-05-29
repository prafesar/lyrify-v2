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
let storageMode: "opfs" | "transient" = "transient";

const log = (...args: any[]) => console.log("[sqlite-worker]", ...args);
const error = (...args: any[]) => console.error("[sqlite-worker]", ...args);

// Schema migration & bootstrap function
function bootstrapDb(sqlite3: any) {
  try {
    if ("opfs" in sqlite3) {
      try {
        db = new sqlite3.oo1.OpfsDb("/cantolex_lyrify.sqlite3");
        log("Successfully opened database in OPFS (persists across reloads).");
        storageMode = "opfs";
      } catch (e) {
        error("Failed to open OPFS database, falling back to oo1.DB:", e);
        db = new sqlite3.oo1.DB("/cantolex_lyrify.sqlite3", "c");
        storageMode = "transient";
      }
    } else {
      db = new sqlite3.oo1.DB("/cantolex_lyrify.sqlite3", "c");
      log("OPFS NOT available. Falling back to in-memory/transient local DB.");
      storageMode = "transient";
    }

    // Enable foreign key constraints
    try {
      db.exec("PRAGMA foreign_keys = ON;");
      log("Foreign key integrity protection enabled successfully.");
    } catch (e) {
      error("Failed to enable foreign keys:", e);
    }

    // Create tracking table for schema versions
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        migrated_at INTEGER NOT NULL
      );
    `);

    // Retrieve active schema version
    let currentDbVersion = 0;
    db.exec({
      sql: "SELECT MAX(version) as version FROM schema_versions",
      rowMode: "object",
      callback: (row: any) => {
        if (row && row.version !== null && row.version !== undefined) {
          currentDbVersion = Number(row.version);
        }
      }
    });

    log(`Current SQLite database schema version detected: ${currentDbVersion}`);

    // System-wide migrations sequence
    const migrations = [
      {
        version: 1,
        up: (database: any) => {
          database.exec(`
            CREATE TABLE IF NOT EXISTS preferences (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
          `);
          database.exec(`
            CREATE TABLE IF NOT EXISTS recent_history (
              id TEXT PRIMARY KEY,
              track_json TEXT NOT NULL,
              added_at INTEGER NOT NULL
            );
          `);
          database.exec(`
            CREATE TABLE IF NOT EXISTS track_cache (
              id TEXT PRIMARY KEY,
              data_json TEXT NOT NULL,
              cached_at INTEGER NOT NULL
            );
          `);
        }
      },
      {
        version: 2,
        up: (database: any) => {
          // Favorite tracks relational table
          database.exec(`
            CREATE TABLE IF NOT EXISTS favorite_tracks (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              artist TEXT NOT NULL,
              album TEXT,
              cover_url TEXT,
              track_json TEXT NOT NULL,
              added_at INTEGER NOT NULL
            );
          `);

          // Playlists master table
          database.exec(`
            CREATE TABLE IF NOT EXISTS playlists (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              created_at INTEGER NOT NULL
            );
          `);

          // Playlist items detail table with Cascade deletions configured
          database.exec(`
            CREATE TABLE IF NOT EXISTS playlist_items (
              playlist_id TEXT NOT NULL,
              track_id TEXT NOT NULL,
              track_json TEXT NOT NULL,
              added_at INTEGER NOT NULL,
              PRIMARY KEY (playlist_id, track_id),
              FOREIGN KEY (playlist_id) REFERENCES playlists (id) ON DELETE CASCADE
            );
          `);
        }
      }
    ];

    // Mitigate upgrade path for legacy installations that predated schema tracking
    if (currentDbVersion === 0) {
      let legacyPrefsExist = false;
      try {
        db.exec({
          sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='preferences'",
          callback: () => { legacyPrefsExist = true; }
        });
      } catch (_err) {
        // Table search failed
      }

      if (legacyPrefsExist) {
        db.exec({
          sql: "INSERT INTO schema_versions (version, migrated_at) VALUES (?, ?)",
          bind: [1, Date.now()]
        });
        currentDbVersion = 1;
        log("Retrospectively assigned version 1 schema state to matching legacy database pre-existence.");
      }
    }

    // Apply incremental improvements step-by-step
    for (const migration of migrations) {
      if (migration.version > currentDbVersion) {
        log(`Executing progressive migration steps for version ${migration.version}...`);
        
        migration.up(db);

        db.exec({
          sql: "INSERT INTO schema_versions (version, migrated_at) VALUES (?, ?)",
          bind: [migration.version, Date.now()]
        });

        currentDbVersion = migration.version;
        log(`System database schema successfully upgraded to version: ${migration.version}`);
      }
    }

    log("Database schema bootstrapped and migrated successfully.");
  } catch (err: any) {
    error("Error bootstrapping database schema:", err);
    throw err;
  }
}

// Initialize SQLite WASM Module
async function init() {
  try {
    const sqlite3 = await (sqlite3InitModule as any)({
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

    const favorites: Track[] = [];
    try {
      db.exec({
        sql: "SELECT track_json FROM favorite_tracks ORDER BY added_at DESC",
        rowMode: "object",
        callback: (row: any) => {
          try {
            favorites.push(JSON.parse(row.track_json));
          } catch (e) {
            error("Error parsing favorite track JSON in init:", e);
          }
        }
      });
    } catch (e) {
      error("Error reading favorite tracks at init:", e);
    }

    const playlists: any[] = [];
    try {
      db.exec({
        sql: "SELECT id, name, created_at FROM playlists ORDER BY created_at DESC",
        rowMode: "object",
        callback: (row: any) => {
          playlists.push({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            trackIds: [],
            tracks: []
          });
        }
      });

      for (const pl of playlists) {
        db.exec({
          sql: "SELECT track_id, track_json FROM playlist_items WHERE playlist_id = ? ORDER BY added_at ASC",
          bind: [pl.id],
          rowMode: "object",
          callback: (row: any) => {
            pl.trackIds.push(row.track_id);
            try {
              pl.tracks.push(JSON.parse(row.track_json));
            } catch (e) {
              error("Error parsing playlist track JSON in init:", e);
            }
          }
        });
      }
    } catch (e) {
      error("Error reading playlists at init:", e);
    }

    self.postMessage({
      type: "INIT_OK",
      payload: {
        preferences,
        recentHistory,
        trackCache,
        favorites,
        playlists,
        storageMode,
      },
    });
  } catch (err: any) {
    error("SQLite initialization failed:", err);
    self.postMessage({
      type: "INIT_ERROR",
      payload: {
        message: err.message || String(err),
        storageMode: "error",
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
        db.exec("DELETE FROM favorite_tracks");
        db.exec("DELETE FROM playlists");
        db.exec("DELETE FROM playlist_items");
        self.postMessage({ type: "WRITE_OK", messageId });
        break;
      }

      case "GET_FAVORITES": {
        const favorites: Track[] = [];
        db.exec({
          sql: "SELECT track_json FROM favorite_tracks ORDER BY added_at DESC",
          rowMode: "object",
          callback: (row: any) => {
            try {
              favorites.push(JSON.parse(row.track_json));
            } catch (e) {
              error("Error parsing favorite track JSON:", e);
            }
          }
        });
        self.postMessage({ type: "QUERY_OK", payload: favorites, messageId });
        break;
      }

      case "TOGGLE_FAVORITE": {
        const { track } = payload;
        const trackId = String(track.id || track.trackId);
        
        let exists = false;
        db.exec({
          sql: "SELECT 1 FROM favorite_tracks WHERE id = ?",
          bind: [trackId],
          callback: () => { exists = true; }
        });

        let isFavNow = false;
        if (exists) {
          db.exec({
            sql: "DELETE FROM favorite_tracks WHERE id = ?",
            bind: [trackId]
          });
          isFavNow = false;
        } else {
          db.exec({
            sql: "INSERT OR REPLACE INTO favorite_tracks (id, title, artist, album, cover_url, track_json, added_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            bind: [
              trackId,
              track.title,
              track.artist,
              track.album || "",
              track.coverUrl || "",
              JSON.stringify(track),
              Date.now()
            ]
          });
          isFavNow = true;
        }

        self.postMessage({ type: "QUERY_OK", payload: isFavNow, messageId });
        break;
      }

      case "IS_FAVORITE": {
        const { trackId } = payload;
        let exists = false;
        db.exec({
          sql: "SELECT 1 FROM favorite_tracks WHERE id = ?",
          bind: [String(trackId)],
          callback: () => { exists = true; }
        });
        self.postMessage({ type: "QUERY_OK", payload: exists, messageId });
        break;
      }

      case "GET_PLAYLISTS": {
        const playlists: any[] = [];
        db.exec({
          sql: "SELECT id, name, created_at FROM playlists ORDER BY created_at DESC",
          rowMode: "object",
          callback: (row: any) => {
            playlists.push({
              id: row.id,
              name: row.name,
              createdAt: row.created_at,
              trackIds: [],
              tracks: []
            });
          }
        });

        for (const pl of playlists) {
          db.exec({
            sql: "SELECT track_id, track_json FROM playlist_items WHERE playlist_id = ? ORDER BY added_at ASC",
            bind: [pl.id],
            rowMode: "object",
            callback: (row: any) => {
              pl.trackIds.push(row.track_id);
              try {
                pl.tracks.push(JSON.parse(row.track_json));
              } catch (e) {
                error("Error parsing playlist track JSON:", e);
              }
            }
          });
        }

        self.postMessage({ type: "QUERY_OK", payload: playlists, messageId });
        break;
      }

      case "CREATE_PLAYLIST": {
        const { name, id } = payload;
        const newId = id || `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.exec({
          sql: "INSERT OR REPLACE INTO playlists (id, name, created_at) VALUES (?, ?, ?)",
          bind: [newId, name, Date.now()]
        });
        self.postMessage({ type: "QUERY_OK", payload: newId, messageId });
        break;
      }

      case "ADD_TRACK_TO_PLAYLIST": {
        const { playlistId, track } = payload;
        const trackId = String(track.id || track.trackId);
        
        db.exec({
          sql: "INSERT OR REPLACE INTO playlist_items (playlist_id, track_id, track_json, added_at) VALUES (?, ?, ?, ?)",
          bind: [String(playlistId), trackId, JSON.stringify(track), Date.now()]
        });
        self.postMessage({ type: "QUERY_OK", messageId });
        break;
      }

      case "REMOVE_TRACK_FROM_PLAYLIST": {
        const { playlistId, trackId } = payload;
        db.exec({
          sql: "DELETE FROM playlist_items WHERE playlist_id = ? AND track_id = ?",
          bind: [String(playlistId), String(trackId)]
        });
        self.postMessage({ type: "QUERY_OK", messageId });
        break;
      }

      case "DELETE_PLAYLIST": {
        const { playlistId } = payload;
        db.exec({
          sql: "DELETE FROM playlist_items WHERE playlist_id = ?",
          bind: [String(playlistId)]
        });
        db.exec({
          sql: "DELETE FROM playlists WHERE id = ?",
          bind: [String(playlistId)]
        });
        self.postMessage({ type: "QUERY_OK", messageId });
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
