import { get, set } from 'idb-keyval';
import { FSRS, generatorParameters, createEmptyCard, Rating, Card } from 'ts-fsrs';

export type PhraseStatus = 'new' | 'learning' | 'known';

export interface Flashcard {
  id: string;
  phraseId?: string; // Compatibility field
  text: string;
  lemmas?: string[]; // Consistency field
  translation: string;
  translatedPhrase?: string; // Compatibility alias
  explanation?: string;
  status: PhraseStatus;
  lineId?: string;
  trackId: string;
  trackTitle?: string;
  artist?: string;
  sourceLanguage?: string;
  due: Date;
  state: number;
  last_review?: Date;
  elapsed_days: number;
  scheduled_days: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  learning_steps?: any;
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'lyrify_flashcards';

async function getAllCards(): Promise<Map<string, Flashcard>> {
  const cards = await get(STORAGE_KEY);
  return cards ? new Map(Object.entries(cards)) : new Map();
}

async function saveAllCards(cards: Map<string, Flashcard>) {
  await set(STORAGE_KEY, Object.fromEntries(cards));
}

export async function getCards(): Promise<Flashcard[]> {
  const cardsMap = await getAllCards();
  return Array.from(cardsMap.values());
}

export async function addPhraseToStudy(
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
  },
  status: PhraseStatus = 'learning'
): Promise<string> {
  const emptyCard = createEmptyCard();
  const id = crypto.randomUUID();

  const newCard: Flashcard = {
    id,
    phraseId: id,
    text: phraseData.text,
    lemmas: phraseData.lemmas,
    translation: phraseData.translation,
    translatedPhrase: phraseData.translation,
    explanation: phraseData.explanation,
    lineId: phraseData.lineId,
    trackId: phraseData.trackId,
    trackTitle: phraseData.trackTitle,
    artist: phraseData.artist,
    sourceLanguage: phraseData.sourceLanguage,
    status,
    due: emptyCard.due,
    state: emptyCard.state,
    elapsed_days: emptyCard.elapsed_days,
    scheduled_days: emptyCard.scheduled_days,
    stability: emptyCard.stability,
    difficulty: emptyCard.difficulty,
    reps: emptyCard.reps,
    lapses: emptyCard.lapses,
    learning_steps: emptyCard.learning_steps,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const cardsMap = await getAllCards();
  cardsMap.set(id, newCard);
  await saveAllCards(cardsMap);
  return id;
}

export async function updatePhraseStatus(cardId: string, status: PhraseStatus) {
  const cardsMap = await getAllCards();
  const card = cardsMap.get(cardId);
  if (card) {
    card.status = status;
    card.updatedAt = new Date();
    await saveAllCards(cardsMap);
  }
}

export async function deleteFlashcard(cardId: string) {
  const cardsMap = await getAllCards();
  cardsMap.delete(cardId);
  await saveAllCards(cardsMap);
}

export async function reviewCard(cardId: string, rating: Rating) {
  const cardsMap = await getAllCards();
  const card = cardsMap.get(cardId);
  if (!card) return;

  const fsrs = new FSRS(generatorParameters());
  const fsrsCard: Card = {
    due: new Date(card.due),
    state: card.state,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
  } as any;

  const schedulingCards = fsrs.repeat(fsrsCard, new Date());
  const updatedFsrsCard = schedulingCards[rating].card;

  Object.assign(card, {
    due: updatedFsrsCard.due,
    state: updatedFsrsCard.state,
    last_review: updatedFsrsCard.last_review,
    elapsed_days: updatedFsrsCard.elapsed_days,
    scheduled_days: updatedFsrsCard.scheduled_days,
    stability: updatedFsrsCard.stability,
    difficulty: updatedFsrsCard.difficulty,
    reps: updatedFsrsCard.reps,
    lapses: updatedFsrsCard.lapses,
    learning_steps: updatedFsrsCard.learning_steps,
    updatedAt: new Date(),
  });

  await saveAllCards(cardsMap);
}
