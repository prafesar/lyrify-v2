import { StudyCardsRepositoryPort } from "../ports/studyCardsRepositoryPort";
import { Flashcard, PhraseStatus } from "../../services/localCardService";
import { Rating } from "ts-fsrs";
import * as originalCardService from "../../services/localCardService";
import { WordFormBridgeService } from "../../services/wordFormBridgeService";

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
    const cardId = await originalCardService.addPhraseToStudy(phraseData, status);
    const cards = await originalCardService.getCards();
    const card = cards?.find(c => c.id === cardId);
    if (card) {
      await WordFormBridgeService.syncCardToWordForms(card);
    }
    return cardId;
  }

  async updatePhraseStatus(cardId: string, status: PhraseStatus): Promise<void> {
    await originalCardService.updatePhraseStatus(cardId, status);
    const cards = await originalCardService.getCards();
    const card = cards.find(c => c.id === cardId);
    if (card) {
      await WordFormBridgeService.syncCardToWordForms(card);
    }
  }

  async updateCardFields(
    cardId: string,
    fields: Partial<Pick<Flashcard, 'text' | 'translation' | 'explanation' | 'type' | 'entryType' | 'userNote'>>
  ): Promise<void> {
    await originalCardService.updateCardFields(cardId, fields);
    const cards = await originalCardService.getCards();
    const card = cards.find(c => c.id === cardId);
    if (card) {
      await WordFormBridgeService.syncCardToWordForms(card);
    }
  }

  async deleteFlashcard(cardId: string): Promise<void> {
    return originalCardService.deleteFlashcard(cardId);
  }

  async reviewCard(cardId: string, rating: Rating): Promise<void> {
    await originalCardService.reviewCard(cardId, rating);
    const cards = await originalCardService.getCards();
    const card = cards.find(c => c.id === cardId);
    if (card) {
      await WordFormBridgeService.syncCardToWordForms(card);
    }
  }
}
