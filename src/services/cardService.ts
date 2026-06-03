import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { FSRS, Card, Rating, generatorParameters, createEmptyCard } from 'ts-fsrs';

const CARDS_COLLECTION = 'cards';

export type PhraseStatus = 'new' | 'learning' | 'known';

export interface Phrase {
  id: string;
  text: string;
  lemmas: string[];
  type: string;
  translation: string;
  explanation: string;
  lineId: string;       // link to origin line (using line index or text as id)
  trackId: string;      // link to origin track
}

export interface UserPhraseCard extends DocumentData {
  id: string;           // Firestore document ID
  phraseId: string;     // Reference to Phrase ID (or we use combined object for now)
  status: PhraseStatus;
  userId: string;
  trackId: string;      // For quick filtering
  lineId?: string;
  // FSRS state
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
  createdAt: any;
  updatedAt: any;
  
  // Flattened Phrase data for easier access (optional but helpful in NoSQL)
  text: string;
  translation: string;
  explanation?: string;

  // Shared study item / line explanation note properties
  originType?: string;
  originKey?: string;
  lineTextHash?: string;
  noteKey?: string;
  entryType?: string;
  userNote?: string;
  rawText?: string;
  rawTranslation?: string;
  rawExplanation?: string;
}

// Keep Flashcard as alias for backward compatibility if needed, but update it
export type Flashcard = UserPhraseCard;

export async function addPhraseToStudy(
  phraseData: {
    text: string;
    translation: string;
    trackId: string;
    lineId: string;
    explanation: string;
    type: string;
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
  status: PhraseStatus = 'learning'
) {
  if (!auth.currentUser) throw new Error("User not authenticated");
  const emptyCard = createEmptyCard();
  
  const id = phraseData.id || doc(collection(db, CARDS_COLLECTION)).id;
  const path = `${CARDS_COLLECTION}/${id}`;

  const newCard: any = {
    phraseId: id, // In this simplified version, we treat card id as phraseId if we don't have a separate phrases table
    text: phraseData.text,
    translation: phraseData.translation,
    explanation: phraseData.explanation,
    lineId: phraseData.lineId,
    trackId: phraseData.trackId,
    status,
    userId: auth.currentUser.uid,
    due: emptyCard.due,
    state: emptyCard.state,
    elapsed_days: emptyCard.elapsed_days,
    scheduled_days: emptyCard.scheduled_days,
    stability: emptyCard.stability,
    difficulty: emptyCard.difficulty,
    reps: emptyCard.reps,
    lapses: emptyCard.lapses,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    // Extra properties
    originType: phraseData.originType || null,
    originKey: phraseData.originKey || null,
    lineTextHash: phraseData.lineTextHash || null,
    noteKey: phraseData.noteKey || null,
    entryType: phraseData.entryType || null,
    userNote: phraseData.userNote || null,
    rawText: phraseData.rawText || null,
    rawTranslation: phraseData.rawTranslation || null,
    rawExplanation: phraseData.rawExplanation || null,
  };

  if (emptyCard.learning_steps !== undefined) {
    newCard.learning_steps = emptyCard.learning_steps;
  }

  try {
    await setDoc(doc(db, CARDS_COLLECTION, id), newCard);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCardFields(
  cardId: string,
  fields: Partial<Pick<Flashcard, 'text' | 'translation' | 'explanation' | 'entryType' | 'userNote'>>
): Promise<void> {
  const path = `${CARDS_COLLECTION}/${cardId}`;
  try {
    await updateDoc(doc(db, CARDS_COLLECTION, cardId), {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePhraseStatus(cardId: string, status: PhraseStatus) {
  const path = `${CARDS_COLLECTION}/${cardId}`;
  try {
    await updateDoc(doc(db, CARDS_COLLECTION, cardId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getPhrasesByLine(trackId: string, lineId: string) {
  if (!auth.currentUser) return [];
  const q = query(
    collection(db, CARDS_COLLECTION), 
    where("userId", "==", auth.currentUser.uid),
    where("trackId", "==", trackId),
    where("lineId", "==", lineId)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserPhraseCard));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CARDS_COLLECTION);
    return [];
  }
}

export async function getPhrasesByTrack(trackId: string) {
  if (!auth.currentUser) return [];
  const q = query(
    collection(db, CARDS_COLLECTION), 
    where("userId", "==", auth.currentUser.uid),
    where("trackId", "==", trackId)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserPhraseCard));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CARDS_COLLECTION);
    return [];
  }
}

export async function getCards() {
  if (!auth.currentUser) return [];
  const q = query(collection(db, CARDS_COLLECTION), where("userId", "==", auth.currentUser.uid));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        due: data.due?.toDate ? data.due.toDate() : (data.due ? new Date(data.due) : new Date()),
        last_review: data.last_review?.toDate ? data.last_review.toDate() : (data.last_review ? new Date(data.last_review) : undefined),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
        // Handle field renames in existing data if any (though we aim to move forward)
        text: data.text || data.originalPhrase,
        translation: data.translation || data.translatedPhrase,
      } as Flashcard;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CARDS_COLLECTION);
    return [];
  }
}

export async function reviewCard(card: Flashcard, rating: Rating) {
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

  const path = `${CARDS_COLLECTION}/${card.id}`;
  try {
    await updateDoc(doc(db, CARDS_COLLECTION, card.id), {
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
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFlashcard(cardId: string) {
  const path = `${CARDS_COLLECTION}/${cardId}`;
  try {
    await deleteDoc(doc(db, CARDS_COLLECTION, cardId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
