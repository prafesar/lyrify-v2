import { LibraryRepositoryPort } from "../ports/libraryRepositoryPort";
import { Track } from "../../services/musicService";

export class BrowserLibraryRepository implements LibraryRepositoryPort {
  async getFavorites(): Promise<Track[]> {
    const favsStr = localStorage.getItem("cantolex_favorites") || "[]";
    try {
      return JSON.parse(favsStr);
    } catch {
      return [];
    }
  }

  async toggleFavorite(track: Track): Promise<boolean> {
    const favs = await this.getFavorites();
    const index = favs.findIndex(t => t.id === track.id);
    let isFav = false;
    if (index >= 0) {
      favs.splice(index, 1);
    } else {
      favs.push(track);
      isFav = true;
    }
    localStorage.setItem("cantolex_favorites", JSON.stringify(favs));
    return isFav;
  }

  async isFavorite(trackId: string): Promise<boolean> {
    const favs = await this.getFavorites();
    return favs.some(t => t.id === trackId);
  }

  async getPlaylists(): Promise<any[]> {
    const listsStr = localStorage.getItem("cantolex_playlists") || "[]";
    try {
      return JSON.parse(listsStr);
    } catch {
      return [];
    }
  }

  async createPlaylist(name: string): Promise<string> {
    const lists = await this.getPlaylists();
    const newId = `playlist-${Date.now()}`;
    const newPlaylist = { id: newId, name, trackIds: [], tracks: [] };
    lists.push(newPlaylist);
    localStorage.setItem("cantolex_playlists", JSON.stringify(lists));
    return newId;
  }

  async addTrackToPlaylist(playlistId: string, track: Track): Promise<void> {
    const playlists = await this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      if (!playlist.trackIds) playlist.trackIds = [];
      if (!playlist.tracks) playlist.tracks = [];

      const trackId = track.id || track.trackId;
      if (!playlist.trackIds.includes(trackId)) {
        playlist.trackIds.push(trackId);
        playlist.tracks.push(track);
        localStorage.setItem("cantolex_playlists", JSON.stringify(playlists));
      }
    }
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const playlists = await this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.trackIds = (playlist.trackIds || []).filter((id: string) => id !== trackId);
      playlist.tracks = (playlist.tracks || []).filter((t: any) => (t.id || t.trackId) !== trackId);
      localStorage.setItem("cantolex_playlists", JSON.stringify(playlists));
    }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const playlists = await this.getPlaylists();
    const updated = playlists.filter(p => p.id !== playlistId);
    localStorage.setItem("cantolex_playlists", JSON.stringify(updated));
  }
}
