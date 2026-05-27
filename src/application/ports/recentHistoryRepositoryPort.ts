import { Track } from "../../services/musicService";

export interface RecentHistoryRepositoryPort {
  getRecentTracks(): Track[];
  addRecentTrack(track: Track): void;
}
