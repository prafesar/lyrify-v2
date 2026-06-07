import { useState, useCallback } from "react";
import { type User } from "firebase/auth";
import { type Flashcard, type PhraseStatus } from "../application";
import { normalizePhraseKey } from "../services/cardService";
import { userPreferencesRepository, aiClient } from "../application";
import { isOnboardingCompleted } from "../services/onboardingService";
import { NavigationCoordinator } from "../services/navigationService";

export interface EditingLineInfo {
  index: number;
  original: string;
  translation?: string;
  language?: string;
  explanation?: string;
}

export interface PopoverDataInfo {
  phrase: string;
  translation: string;
  explanation?: string;
  position: { x: number; y: number };
}

export interface PhraseDrawerDataInfo {
  phrase: string;
  card: Flashcard;
  children: Flashcard[];
  getLineStatus: (text: string) => PhraseStatus;
}

const explainPhraseStructured = (phrase: string, targetLanguage: string) =>
  aiClient.explainPhraseStructured(phrase, targetLanguage);

export function useAppUiState() {
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => isOnboardingCompleted());
  const [activeTab, setActiveTab] = useState<"preview" | "lyrics" | "cards" | "analysis">("preview");
  const [targetLanguage, setTargetLanguage] = useState(
    () => userPreferencesRepository.getPreference("lyrify_target_lang", "Russian")
  );
  const [theme, setTheme] = useState(
    () => userPreferencesRepository.getPreference("lyrify_theme", "light")
  );
  const [lyricsDisplayMode, setLyricsDisplayMode] = useState<"lyrics" | "translation" | "both">(
    () => (userPreferencesRepository.getPreference("cantolex_lyrics_display_mode", "both") as any)
  );
  const [isStarFilterActive, setIsStarFilterActive] = useState<boolean>(
    () => userPreferencesRepository.getBoolPreference("cantolex_star_filter_active", false)
  );
  const [previewLyricsMode, setPreviewLyricsMode] = useState<"original" | "translation">("original");

  const [popoverData, setPopoverData] = useState<PopoverDataInfo | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLyricsSettingsOpen, setIsLyricsSettingsOpen] = useState(false);
  const [resourceTab, setResourceTab] = useState<"links" | "lyrics">("links");
  const [editingLine, setEditingLine] = useState<EditingLineInfo | null>(null);

  const [isExplaining, setIsExplaining] = useState(false);
  const [isEditingTranslation, setIsEditingTranslation] = useState(false);

  const [phraseDrawerData, setPhraseDrawerData] = useState<PhraseDrawerDataInfo | null>(null);
  const [isPhraseDrawerOpen, setIsPhraseDrawerOpen] = useState(false);
  const [selectedLineIndexForDrawer, setSelectedLineIndexForDrawer] = useState<number | null>(null);

  const handleSetLyricsDisplayMode = useCallback((mode: "lyrics" | "translation" | "both") => {
    setLyricsDisplayMode(mode);
    userPreferencesRepository.setPreference("cantolex_lyrics_display_mode", mode);
  }, []);

  const handleToggleStarFilter = useCallback(() => {
    setIsStarFilterActive((prev) => {
      const nextVal = !prev;
      userPreferencesRepository.setBoolPreference("cantolex_star_filter_active", nextVal);
      return nextVal;
    });
  }, []);

  const handleOnboardingDismiss = useCallback(() => {
    userPreferencesRepository.setPreference("cantolex_onboarding_dismissed", "true");
    setOnboardingCompleted(true);
  }, []);

  const handleOnboardingSelect = useCallback(async (track: any, handleTrackSelect: (track: any) => Promise<void>) => {
    const lang = track.language || track.sourceLanguage;
    if (lang) {
      setTargetLanguage(lang);
      userPreferencesRepository.setPreference("lyrify_target_lang", lang);
    }
    userPreferencesRepository.setPreference("cantolex_onboarding_dismissed", "true");
    setOnboardingCompleted(true);
    await handleTrackSelect(track);
  }, []);

  const handleNextStepClick = useCallback((nextStepState: any) => {
    if (!nextStepState) return;
    if (nextStepState.type === "FIND_LYRICS" || nextStepState.type === "GENERATE_ANALYSIS" || nextStepState.type === "SAVE_FIRST_PHRASE") {
      setActiveTab("lyrics");
    } else if (nextStepState.type === "GO_TO_STUDY") {
      NavigationCoordinator.goToStudy();
    }
  }, []);

  const handleOpenAddModal = useCallback((
    line: string,
    currentIndex: number,
    user: User | null,
    phraseMetadata: Map<string, Flashcard>,
    fullTranslation: string | undefined,
    handleAddLineWithComponents: (line: string, index: number, status?: PhraseStatus) => Promise<void>
  ) => {
    const trimmedLine = line.trim();
    if (!user) {
      alert("Please sign in to save phrases to your deck");
      return;
    }

    const existingMetadata = phraseMetadata.get(normalizePhraseKey(trimmedLine));
    const fullTransLines = fullTranslation?.split("\n") || [];
    const fullTrans = fullTransLines[currentIndex];

    if (existingMetadata) {
      setEditingLine({
        index: currentIndex,
        original: trimmedLine,
        translation: existingMetadata.translatedPhrase || fullTrans || "",
      });
      setIsEditModalOpen(true);
    } else {
      handleAddLineWithComponents(trimmedLine, currentIndex, "learning");
    }
  }, []);

  const handleOpenAddAnalysisItem = useCallback((
    phrase: string,
    translation: string,
    explanation: string,
    user: User | null,
    handleAddAnalysisPhrase: (phrase: string, translation: string, explanation: string, status?: PhraseStatus) => Promise<void>
  ) => {
    if (!user) {
      alert("Please sign in to save analysis items to your deck");
      return;
    }
    handleAddAnalysisPhrase(phrase, translation, explanation, "learning");
  }, []);

  const handleExplain = useCallback(async (phrase: string, currentTrack: any) => {
    if (!currentTrack) return;
    setIsExplaining(true);
    try {
      const result = await explainPhraseStructured(phrase, targetLanguage);
      setEditingLine(prev => {
        if (prev && prev.original === phrase) {
          return {
            ...prev,
            translation: result.translation || prev.translation,
            explanation: result.explanation || prev.explanation,
          };
        }
        return prev;
      });
      alert(`Phrase: ${phrase}

Translation: ${result.translation}

Explanation:
${result.explanation}`);
    } catch (err) {
      console.error("Failed to explain phrase:", err);
      alert("Failed to fetch explanations from Gemini.");
    } finally {
      setIsExplaining(false);
    }
  }, [targetLanguage]);

  const handleOpenStructuredAnalysis = useCallback((
    phraseText: string,
    phraseMetadata: Map<string, Flashcard>,
    childCardsMap: Map<string, Flashcard[]>,
    lineIndex: number | null
  ) => {
    const card = phraseMetadata.get(normalizePhraseKey(phraseText));
    if (!card) return;
    const children = childCardsMap.get(phraseText) || [];
    setSelectedLineIndexForDrawer(lineIndex);
    setPhraseDrawerData({
      phrase: phraseText,
      card,
      children,
      getLineStatus: (txt) => {
        const c = phraseMetadata.get(normalizePhraseKey(txt));
        return (c?.status || "new") as PhraseStatus;
      }
    });
    setIsPhraseDrawerOpen(true);
  }, []);

  return {
    onboardingCompleted,
    setOnboardingCompleted,
    activeTab,
    setActiveTab,
    targetLanguage,
    setTargetLanguage,
    theme,
    setTheme,
    lyricsDisplayMode,
    isStarFilterActive,
    previewLyricsMode,
    setPreviewLyricsMode,
    popoverData,
    setPopoverData,
    isEditModalOpen,
    setIsEditModalOpen,
    isLyricsSettingsOpen,
    setIsLyricsSettingsOpen,
    resourceTab,
    setResourceTab,
    editingLine,
    setEditingLine,
    isExplaining,
    isEditingTranslation,
    setIsEditingTranslation,
    phraseDrawerData,
    setPhraseDrawerData,
    isPhraseDrawerOpen,
    setIsPhraseDrawerOpen,
    selectedLineIndexForDrawer,
    setSelectedLineIndexForDrawer,
    
    handleSetLyricsDisplayMode,
    handleToggleStarFilter,
    handleOnboardingDismiss,
    handleOnboardingSelect,
    handleNextStepClick,
    handleOpenAddModal,
    handleOpenAddAnalysisItem,
    handleExplain,
    handleOpenStructuredAnalysis,
  };
}
