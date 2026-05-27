import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  userDataRepository, 
  type Flashcard, 
  type PhraseStatus, 
  type DailyActivity 
} from "../application";
import { type TrackLyricsData, type Phrase } from "../services/musicService";
import { buildResumeViewModel } from "../services/resumeService";

export interface UseUserCardsResult {
  phraseMetadata: Map<string, Flashcard>;
  setPhraseMetadata: React.Dispatch<React.SetStateAction<Map<string, Flashcard>>>;
  childCardsMap: Map<string, Flashcard[]>;
  isSaving: boolean;
  dailyActivity: DailyActivity;
  dueCardsCount: number;
  dailyProgressSummary: any;
  resumeViewModel: any;
  loadUserCards: () => Promise<void>;
  getLineStatus: (line: string) => "new" | "learning" | "known";
  handleUpdateStatusLocal: (card: Flashcard, status: PhraseStatus) => Promise<void>;
  handleAddLineWithComponents: (line: string, index: number, status?: PhraseStatus, currentTrack?: TrackLyricsData | null, getPhrasesForLine?: (lineIdx: number) => Phrase[]) => Promise<void>;
  handleAddAnalysisPhrase: (phrase: string, translation: string, explanation: string, status?: PhraseStatus, currentTrack?: TrackLyricsData | null) => Promise<void>;
  handleSetAnalysisPhraseStatus: (phrase: string, translation: string, explanation: string, status: PhraseStatus, currentTrack?: TrackLyricsData | null) => Promise<void>;
  recordPhraseSavedAction: () => void;
  recordReviewCompletedAction: () => void;
  recordTrackExploredAction: () => void;
  setDailyActivity: React.Dispatch<React.SetStateAction<DailyActivity>>;
}

export function useUserCards(recentTracks: any[]): UseUserCardsResult {
  const [phraseMetadata, setPhraseMetadata] = useState<Map<string, Flashcard>>(new Map());
  const [childCardsMap, setChildCardsMap] = useState<Map<string, Flashcard[]>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity>(() => userDataRepository.getDailyActivity());

  const dueCardsCount = useMemo(() => {
    const cards = Array.from(phraseMetadata.values());
    const now = new Date();
    return cards.filter(card => {
      const dueTime = card.due instanceof Date ? card.due.getTime() : new Date(card.due || 0).getTime();
      return dueTime <= now.getTime();
    }).length;
  }, [phraseMetadata]);

  const dailyProgressSummary = useMemo(() => {
    return userDataRepository.getDailyProgressSummary(dailyActivity);
  }, [dailyActivity]);

  const resumeViewModel = useMemo(() => {
    const cards = Array.from(phraseMetadata.values());
    return buildResumeViewModel(cards, recentTracks);
  }, [phraseMetadata, recentTracks]);

  const loadUserCards = useCallback(async () => {
    try {
      const cards = await userDataRepository.getCards();
      const meta = new Map<string, Flashcard>();
      const children = new Map<string, Flashcard[]>();

      cards.forEach((card) => {
        meta.set(card.text, card);
        if (card.lineId) {
          const list = children.get(card.lineId) || [];
          list.push(card);
          children.set(card.lineId, list);
        }
      });

      setPhraseMetadata(meta);
      setChildCardsMap(children);
    } catch (err) {
      console.error("Failed to load cards:", err);
    }
  }, []);

  useEffect(() => {
    loadUserCards();
  }, [loadUserCards]);

  const getLineStatus = useCallback((line: string) => {
    const children = childCardsMap.get(line) || [];
    if (children.length === 0) return "new";

    const statuses = children.map((c) => c.status);
    if (statuses.every((s) => s === "known")) return "known";
    if (statuses.some((s) => s === "learning" || s === "known")) {
      return "learning";
    }
    return "new";
  }, [childCardsMap]);

  const handleUpdateStatusLocal = useCallback(async (card: Flashcard, status: PhraseStatus) => {
    try {
      await userDataRepository.updatePhraseStatus(card.id, status);
      await loadUserCards();
    } catch (err) {
      console.error(err);
    }
  }, [loadUserCards]);

  const handleAddLineWithComponents = useCallback(async (
    line: string,
    index: number,
    status: PhraseStatus = "learning",
    currentTrack?: TrackLyricsData | null,
    getPhrasesForLine?: (lineIdx: number) => Phrase[]
  ) => {
    if (!currentTrack) return;
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    setIsSaving(true);
    try {
      let addedCount = 0;
      const phrasesInLine = getPhrasesForLine ? getPhrasesForLine(index) : [];

      const allToProcess = phrasesInLine.map((c: Phrase) => ({
        text: c.text,
        trans: c.translation,
        expl: c.explanation,
      }));

      for (const item of allToProcess) {
        const existing = phraseMetadata.get(item.text);
        if (!existing || !existing.id) {
          await userDataRepository.addPhraseToStudy({
            text: item.text,
            translation: item.trans,
            trackId: currentTrack.trackId,
            trackTitle: currentTrack.title,
            artist: currentTrack.artist,
            sourceLanguage: currentTrack.sourceLanguage,
            lineId: trimmedLine,
            explanation: item.expl || "",
            type: "phrase"
          }, status);
          addedCount++;
          setDailyActivity(userDataRepository.recordPhraseSaved());
        } else {
          if (existing.status !== status) {
            await userDataRepository.updatePhraseStatus(existing.id, status);
          }
        }
      }

      await loadUserCards();
      if (addedCount > 0) {
        console.log(`Added components (${addedCount} total)`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }, [phraseMetadata, loadUserCards]);

  const handleAddAnalysisPhrase = useCallback(async (
    phrase: string,
    translation: string,
    explanation: string,
    status: PhraseStatus = "learning",
    currentTrack?: TrackLyricsData | null
  ) => {
    if (!currentTrack) return;

    let parentLine = "";
    for (const line of currentTrack.lines) {
      if (line.original.includes(phrase)) {
        parentLine = line.original.trim();
        break;
      }
    }

    try {
      await userDataRepository.addPhraseToStudy({
        text: phrase,
        translation: translation,
        trackId: currentTrack.trackId,
        trackTitle: currentTrack.title,
        artist: currentTrack.artist,
        sourceLanguage: currentTrack.sourceLanguage,
        lineId: parentLine || "",
        explanation: explanation,
        lemmas: [],
        type: "phrase"
      }, status);
      setDailyActivity(userDataRepository.recordPhraseSaved());
      await loadUserCards();
    } catch (err) {
      console.error(err);
    }
  }, [loadUserCards]);

  const handleSetAnalysisPhraseStatus = useCallback(async (
    phrase: string,
    translation: string,
    explanation: string,
    status: PhraseStatus,
    currentTrack?: TrackLyricsData | null
  ) => {
    if (!currentTrack) return;
    const existingCard = phraseMetadata.get(phrase);
    if (existingCard) {
      try {
        await userDataRepository.updatePhraseStatus(existingCard.id, status);
        await loadUserCards();
      } catch (err) {
        console.error(err);
      }
    } else {
      await handleAddAnalysisPhrase(phrase, translation, explanation, status, currentTrack);
    }
  }, [phraseMetadata, handleAddAnalysisPhrase, loadUserCards]);

  const recordPhraseSavedAction = useCallback(() => {
    setDailyActivity(userDataRepository.recordPhraseSaved());
  }, []);

  const recordReviewCompletedAction = useCallback(() => {
    setDailyActivity(userDataRepository.recordReviewCompleted());
  }, []);

  const recordTrackExploredAction = useCallback(() => {
    setDailyActivity(userDataRepository.recordTrackExplored());
  }, []);

  return {
    phraseMetadata,
    setPhraseMetadata,
    childCardsMap,
    isSaving,
    dailyActivity,
    dueCardsCount,
    dailyProgressSummary,
    resumeViewModel,
    loadUserCards,
    getLineStatus,
    handleUpdateStatusLocal,
    handleAddLineWithComponents,
    handleAddAnalysisPhrase,
    handleSetAnalysisPhraseStatus,
    recordPhraseSavedAction,
    recordReviewCompletedAction,
    recordTrackExploredAction,
    setDailyActivity
  };
}
