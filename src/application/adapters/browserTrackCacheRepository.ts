import { TrackCacheRepositoryPort } from "../ports/trackCacheRepositoryPort";
import { TrackLyricsData } from "../../services/musicService";
import * as originalMusicService from "../../services/musicService";

export class BrowserTrackCacheRepository implements TrackCacheRepositoryPort {
  getCachedTrack(trackId: string): TrackLyricsData | null {
    return originalMusicService.getCachedTrackData(trackId);
  }

  saveTrackData(trackId: string, data: any): TrackLyricsData {
    return originalMusicService.saveTrackData(trackId, data);
  }
}
