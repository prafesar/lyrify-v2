import { StudyCardsRepositoryPort } from "../ports/studyCardsRepositoryPort";
import { Flashcard, PhraseStatus } from "../../services/localCardService";
import { Rating } from "ts-fsrs";
import * as originalCardService from "../../services/localCardService";

export class BrowserStudyCardsRepository implements StudyCardsRepositoryPort {
  async getCards(): Promise<Flashcard[]> {
    return originalCardService.getCards();
  }

  async addPhraseToStudy(
    phraseData: {
      text: string;
      translation: string;
      trackId: string;
      lineId: string;
      explanation: string;
      type: string;
      trackTitle?: string;
      artist?: string;
      sourceLanguage?: string;
      lemmas?: string[];
      id?: string;
      originType?: string;
      originKey?: string;
      lineTextHash?: string;
      noteKey?: string;
      entryType?: string;
      userNote?: string;
      rawText?: string;
      rawTranslation?: string;
      rawExplanation?: string;
    },
    status?: PhraseStatus
  ): Promise<string> {
    return originalCardService.addPhraseToStudy(phraseData, status);
  }

  async updatePhraseStatus(cardId: string, status: PhraseStatus): Promise<void> {
    return originalCardService.updatePhraseStatus(cardId, status);
  }

  async updateCardFields(
    cardId: string,
    fields: Partial<Pick<Flashcard, 'text' | 'translation' | 'explanation' | 'type' | 'entryType' | 'userNote'>>
  ): Promise<void> {
    return originalCardService.updateCardFields(cardId, fields);
  }

  async deleteFlashcard(cardId: string): Promise<void> {
    return originalCardService.deleteFlashcard(cardId);
  }

  async reviewCard(cardId: string, rating: Rating): Promise<void> {
    return originalCardService.reviewCard(cardId, rating);
  }
}
