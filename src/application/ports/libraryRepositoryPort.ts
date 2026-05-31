import { Track, Artist, Album } from "../../constants";

export interface LibraryRepositoryPort {
  getFavorites(): Promise<Track[]>;
  toggleFavorite(track: Track): Promise<boolean>;
  isFavorite(trackId: string): Promise<boolean>;

  getFavoriteArtists(): Promise<Artist[]>;
  toggleFavoriteArtist(artist: Artist): Promise<boolean>;
  isFavoriteArtist(artistId: string): Promise<boolean>;

  getFavoriteAlbums(): Promise<Album[]>;
  toggleFavoriteAlbum(album: Album): Promise<boolean>;
  isFavoriteAlbum(albumId: string): Promise<boolean>;

  getPlaylists(): Promise<any[]>;
  createPlaylist(name: string): Promise<string>;
  addTrackToPlaylist(playlistId: string, track: Track): Promise<void>;
  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void>;
  deletePlaylist(playlistId: string): Promise<void>;
}
