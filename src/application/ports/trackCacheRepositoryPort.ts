import { TrackLyricsData } from "../../services/musicService";

export interface TrackCacheRepositoryPort {
  getCachedTrack(trackId: string): TrackLyricsData | null;
  saveTrackData(trackId: string, data: any): TrackLyricsData;
}
