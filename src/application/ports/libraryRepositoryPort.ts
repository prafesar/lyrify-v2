import { Track } from "../../services/musicService";

export interface LibraryRepositoryPort {
  getFavorites(): Promise<Track[]>;
  toggleFavorite(track: Track): Promise<boolean>;
  isFavorite(trackId: string): Promise<boolean>;
  getPlaylists(): Promise<any[]>;
  createPlaylist(name: string): Promise<string>;
}
