import { LibraryRepositoryPort } from "../ports/libraryRepositoryPort";
import { Track } from "../../services/musicService";
import { sqliteService } from "../../services/sqliteService";

export class BrowserLibraryRepository implements LibraryRepositoryPort {
  private hasMigrated = false;

  private async checkAndMigrateLegacyData(): Promise<void> {
    if (this.hasMigrated) return;
    this.hasMigrated = true;

    try {
      const migratedMarker = localStorage.getItem("cantolex_library_sqlite_migrated");
      if (migratedMarker === "true") return;

      console.log("[BrowserLibraryRepository] Initiating one-time legacy localStorage to SQLite migration...");

      // 1. Migrate Favorites
      const favsStr = localStorage.getItem("cantolex_favorites");
      if (favsStr) {
        try {
          const favs: Track[] = JSON.parse(favsStr);
          if (Array.isArray(favs) && favs.length > 0) {
            console.log(`[BrowserLibraryRepository] Migrating ${favs.length} favorite tracks...`);
            for (const track of favs) {
              const isFav = await sqliteService.isFavorite(track.id);
              if (!isFav) {
                await sqliteService.toggleFavorite(track);
              }
            }
          }
        } catch (e) {
          console.error("[BrowserLibraryRepository] Failed to parse legacy favorites:", e);
        }
      }

      // 2. Migrate Playlists
      const listsStr = localStorage.getItem("cantolex_playlists");
      if (listsStr) {
        try {
          const lists: any[] = JSON.parse(listsStr);
          if (Array.isArray(lists) && lists.length > 0) {
            console.log(`[BrowserLibraryRepository] Migrating ${lists.length} playlists...`);
            for (const playlist of lists) {
              const sqlitePlaylistId = await sqliteService.createPlaylist(playlist.name, playlist.id);
              const tracks = playlist.tracks || [];
              for (const track of tracks) {
                await sqliteService.addTrackToPlaylist(sqlitePlaylistId, track);
              }
            }
          }
        } catch (e) {
          console.error("[BrowserLibraryRepository] Failed to parse legacy playlists:", e);
        }
      }

      localStorage.setItem("cantolex_library_sqlite_migrated", "true");
      console.log("[BrowserLibraryRepository] Legacy data migration completed successfully!");
    } catch (err) {
      console.error("[BrowserLibraryRepository] Error during legacy media migration:", err);
    }
  }

  async getFavorites(): Promise<Track[]> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.getFavorites();
  }

  async toggleFavorite(track: Track): Promise<boolean> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.toggleFavorite(track);
  }

  async isFavorite(trackId: string): Promise<boolean> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.isFavorite(trackId);
  }

  async getPlaylists(): Promise<any[]> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.getPlaylists();
  }

  async createPlaylist(name: string): Promise<string> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.createPlaylist(name);
  }

  async addTrackToPlaylist(playlistId: string, track: Track): Promise<void> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.addTrackToPlaylist(playlistId, track);
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.removeTrackFromPlaylist(playlistId, trackId);
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await this.checkAndMigrateLegacyData();
    return sqliteService.deletePlaylist(playlistId);
  }
}
