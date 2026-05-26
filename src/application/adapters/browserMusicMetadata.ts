import { MusicMetadataPort } from "../ports/musicMetadataPort";
import { Track, searchITunes } from "../../services/musicService";

export class BrowserMusicMetadata implements MusicMetadataPort {
  async searchITunes(query: string, mediaType?: "musicTrack" | "musicArtist" | "album"): Promise<Track[]> {
    return searchITunes(query, mediaType);
  }
}
