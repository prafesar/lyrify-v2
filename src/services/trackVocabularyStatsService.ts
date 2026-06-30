import { sqliteService } from "./sqliteService";
import { WordFormStatus } from "../constants";

export interface TrackVocabStats {
  totalCount: number;
  knownCount: number;
  learningCount: number;
  seenCount: number;
  newCount: number;
  ignoredCount: number;
  unknownCount: number;
}

export class TrackVocabularyStatsService {
  /**
   * Computes the track-level vocabulary stats by fetching the track's word forms
   * (the extraction layer) and merging them with the global user word form status.
   */
  public static async calculateTrackStats(trackId: string): Promise<TrackVocabStats> {
    // 1. Get track word forms from extraction layer
    const list = await sqliteService.getTrackWordForms(trackId);

    let totalCount = 0;
    let knownCount = 0;
    let learningCount = 0;
    let seenCount = 0;
    let newCount = 0;
    let ignoredCount = 0;

    // Use a Set to ensure unique word form counting
    const processedIds = new Set<string>();

    for (const item of list) {
      if (!item.id || processedIds.has(item.id)) continue;
      processedIds.add(item.id);

      totalCount++;

      const status: WordFormStatus = item.status || "new";
      if (status === "known") {
        knownCount++;
      } else if (status === "learning") {
        learningCount++;
      } else if (status === "seen") {
        seenCount++;
      } else if (status === "ignored") {
        ignoredCount++;
      } else {
        newCount++;
      }
    }

    const unknownCount = totalCount - knownCount - ignoredCount;

    return {
      totalCount,
      knownCount,
      learningCount,
      seenCount,
      newCount,
      ignoredCount,
      unknownCount
    };
  }
}
