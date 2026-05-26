import { LyricsData } from "../../services/musicService";

export interface LyricsProviderPort {
  fetchLyrics(artist: string, title: string): Promise<LyricsData>;
  splitLyricsIntoLines(trackId: string, lyrics: string): any[];
}
