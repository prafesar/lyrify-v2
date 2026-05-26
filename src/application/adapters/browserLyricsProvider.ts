import { LyricsProviderPort } from "../ports/lyricsProviderPort";
import { LyricsData, fetchLyrics, splitLyricsIntoLines } from "../../services/musicService";

export class BrowserLyricsProvider implements LyricsProviderPort {
  async fetchLyrics(artist: string, title: string): Promise<LyricsData> {
    return fetchLyrics(artist, title);
  }

  splitLyricsIntoLines(trackId: string, lyrics: string): any[] {
    return splitLyricsIntoLines(trackId, lyrics);
  }
}
