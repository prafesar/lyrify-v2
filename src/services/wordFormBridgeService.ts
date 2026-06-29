import { WordFormExtractor } from "./wordFormExtractor";
import { sqliteService } from "./sqliteService";
import { Flashcard, PhraseStatus } from "./localCardService";
import { WordFormStatus } from "../constants";

export class WordFormBridgeService {
  /**
   * Translates a flashcard status to a corresponding word form status.
   */
  private static mapCardStatusToWordFormStatus(status: PhraseStatus): WordFormStatus {
    if (status === "known") return "known";
    if (status === "learning") return "learning";
    return "new";
  }

  /**
   * Checks if target status is a monotonic upgrade compared to the current status.
   * Monotonic hierarchy: new (0) -> seen (1) -> learning (2) -> known (3)
   * Ignored/others are treated as lower status to allow active training to upgrade them,
   * but once known/learning is established, we do not downgrade.
   */
  private static shouldUpgrade(current: WordFormStatus | undefined, target: WordFormStatus): boolean {
    if (!current) return true;
    
    const getScore = (s: WordFormStatus): number => {
      switch (s) {
        case "new": return 0;
        case "seen": return 1;
        case "learning": return 2;
        case "known": return 3;
        default: return -1; // e.g. "ignored"
      }
    };

    return getScore(target) > getScore(current);
  }

  /**
   * Synchronizes the extracted word forms of a flashcard to SQLite's user_word_form_status.
   */
  public static async syncCardToWordForms(card: Flashcard): Promise<void> {
    if (!card || !card.text) return;

    // We only process 'learning' and 'known' statuses
    if (card.status !== "learning" && card.status !== "known") {
      return;
    }

    const targetWfStatus = this.mapCardStatusToWordFormStatus(card.status);
    const lang = card.sourceLanguage || "en";

    // Extract word forms from the card text
    const extracted = WordFormExtractor.extractWordForms(card.text, lang);
    if (extracted.length === 0) return;

    for (const item of extracted) {
      // 1. Ensure the word form exists in SQLite / cache
      const wordFormId = await sqliteService.ensureWordForm(lang, item.surface, item.normalizedSurface);

      // 2. Get current status in SQLite / cache
      const currentStatus = sqliteService.getUserWordFormStatus(wordFormId);

      // 3. Update status if it is a monotonic upgrade
      if (this.shouldUpgrade(currentStatus, targetWfStatus)) {
        await sqliteService.setUserWordFormStatus(wordFormId, targetWfStatus);
      }
    }
  }
}
