import { Flashcard, PhraseStatus } from "../../services/localCardService";
import { Rating } from "ts-fsrs";

export interface StudyCardsRepositoryPort {
  getCards(): Promise<Flashcard[]>;
  addPhraseToStudy(
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
  ): Promise<string>;
  updatePhraseStatus(cardId: string, status: PhraseStatus): Promise<void>;
  updateCardFields(
    cardId: string,
    fields: Partial<Pick<Flashcard, 'text' | 'translation' | 'explanation' | 'type' | 'entryType' | 'userNote'>>
  ): Promise<void>;
  deleteFlashcard(cardId: string): Promise<void>;
  reviewCard(cardId: string, rating: Rating): Promise<void>;
}
