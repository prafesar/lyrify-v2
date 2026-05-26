import { Track } from "../../services/musicService";

export interface MusicMetadataPort {
  searchITunes(query: string, mediaType?: "musicTrack" | "musicArtist" | "album"): Promise<Track[]>;
}
