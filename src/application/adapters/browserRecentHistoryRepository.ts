import { RecentHistoryRepositoryPort } from "../ports/recentHistoryRepositoryPort";
import { Track } from "../../services/musicService";
import * as originalMusicService from "../../services/musicService";

export class BrowserRecentHistoryRepository implements RecentHistoryRepositoryPort {
  getRecentTracks(): Track[] {
    return originalMusicService.getRecentTracks();
  }

  addRecentTrack(track: Track): void {
    originalMusicService.addRecentTrack(track);
  }
}
