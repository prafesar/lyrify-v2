import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Sparkles, Send, Check, CheckCircle2, Bookmark, Plus, Edit2, Volume2, HelpCircle, ArrowRight, BookOpen, Brain, Loader2, ArrowRightLeft, Smile, Trash2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { TrackLyricsData, Phrase } from "../services/musicService";
import { aiClient } from "../application";

export interface LearningAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  track: TrackLyricsData;
  contextType: "line" | "phrase" | "selection";
  lineContext?: { original: string; translation?: string; lineId?: string };
  phraseContext?: { text: string; translation?: string; explanation?: string; lineIds?: string[] };
  selectedLineIds?: string[];
  targetLanguage: string;
  onAcceptPhrase: (
    phraseText: string, 
    translation: string, 
    explanation?: string, 
    type?: string, 
    lineIds?: string[]
  ) => Promise<void>;
  existingPhrases: Phrase[];
  speak?: (text: string, onEnd?: () => void, lang?: string) => void;
}

interface SuggestedPhraseItem {
  text: string;
  translation: string;
  explanation?: string;
  type?: string;
  lineIds?: string[];
}

export const LearningAssistantPanel: React.FC<LearningAssistantPanelProps> = ({
  isOpen,
  onClose,
  track,
  contextType,
  lineContext,
  phraseContext,
  selectedLineIds = [],
  targetLanguage,
  onAcceptPhrase,
  existingPhrases,
  speak
}) => {
  const [userQuestion, setUserQuestion] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  // Loading and Error States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result States
  const [explanation, setExplanation] = useState<string | null>(null);
  const [suggestedPhrases, setSuggestedPhrases] = useState<SuggestedPhraseItem[]>([]);
  
  // Pending user acceptance tracking
  const [acceptedPhraseTexts, setAcceptedPhraseTexts] = useState<Set<string>>(new Set());
  const [rejectedPhraseTexts, setRejectedPhraseTexts] = useState<Set<string>>(new Set());

  // Editing state for suggested phrases
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editTranslation, setEditTranslation] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [editType, setEditType] = useState("");

  // Speech playingtracker
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reset states when the target context or song changes
  useEffect(() => {
    setExplanation(null);
    setSuggestedPhrases([]);
    setUserQuestion("");
    setActivePreset(null);
    setError(null);
    setAcceptedPhraseTexts(new Set());
    setRejectedPhraseTexts(new Set());
    setEditingIndex(null);
  }, [isOpen, contextType, lineContext?.lineId, phraseContext?.text, track.trackId]);

  if (!isOpen) return null;

  // Presets List
  const presetsList = [
    { id: "vocabulary", label: "Explain vocabulary", desc: "Key collocations & words" },
    { id: "grammar", label: "Explain grammar", desc: "Sentence structure & conjugations" },
    { id: "useful", label: "Find useful phrases", desc: "Convert lyrics into speech blocks" },
    { id: "b2", label: "Explain at B2", desc: "Mid-level vocabulary explanations" },
    { id: "cultural", label: "Cultural context", desc: "Metaphors & country context" }
  ];

  // Helper to trigger voice over
  const handleVoiceOver = (textToSpeak: string) => {
    if (!speak) return;
    setIsSpeaking(true);
    speak(textToSpeak, () => {
      setIsSpeaking(false);
    }, "Auto");
  };

  // Main submission orchestrator
  const handleAskAI = async (presetId?: string, overrideQuestion?: string) => {
    setIsLoading(true);
    setError(null);
    setEditingIndex(null);

    const presetLabel = presetId 
      ? presetsList.find(p => p.id === presetId)?.label 
      : undefined;

    setActivePreset(presetId || null);

    const questionText = overrideQuestion || userQuestion;

    const selectedLines = track.lines && selectedLineIds
      ? track.lines
          .filter(l => selectedLineIds.includes(l.lineId || ""))
          .map(l => ({ original: l.original, translation: l.translation, lineId: l.lineId }))
      : undefined;

    try {
      const response = await aiClient.generateLearningAssistantResponse(
        track.title,
        Array.isArray(track.artist) ? track.artist[0] : track.artist || "Unknown",
        contextType,
        lineContext,
        phraseContext,
        targetLanguage,
        existingPhrases,
        questionText,
        presetLabel,
        selectedLines
      );

      setExplanation(response.explanation);
      setSuggestedPhrases(response.suggestedPhrases || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "An error occurred while generating learning feedback. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handles inline edit mode start
  const startEditingPhrase = (index: number, item: SuggestedPhraseItem) => {
    setEditingIndex(index);
    setEditText(item.text);
    setEditTranslation(item.translation);
    setEditExplanation(item.explanation || "");
    setEditType(item.type || "phrase");
  };

  // Handles inline edit confirmation
  const saveEditedPhrase = (index: number) => {
    const updated = [...suggestedPhrases];
    updated[index] = {
      ...updated[index],
      text: editText,
      translation: editTranslation,
      explanation: editExplanation,
      type: editType
    };
    setSuggestedPhrases(updated);
    setEditingIndex(null);
  };

  // Accepts dynamic phrase suggestions
  const handleAcceptSuggested = async (item: SuggestedPhraseItem, index: number) => {
    try {
      // Line IDs default alignment
      let lIds = item.lineIds;
      if (!lIds || lIds.length === 0) {
        lIds = lineContext?.lineId 
          ? [lineContext.lineId] 
          : phraseContext?.lineIds;
      }

      await onAcceptPhrase(
        item.text,
        item.translation,
        item.explanation,
        item.type || "phrase",
        lIds
      );

      // Track as accepted locally
      const updated = new Set(acceptedPhraseTexts);
      updated.add(item.text);
      setAcceptedPhraseTexts(updated);
    } catch (err) {
      console.error("Failed to accept phrase:", err);
    }
  };

  // Rejects specific recommendations from panel list
  const handleRejectSuggested = (text: string) => {
    const updated = new Set(rejectedPhraseTexts);
    updated.add(text);
    setRejectedPhraseTexts(updated);
  };

  const pendingSuggestions = suggestedPhrases.filter(
    p => !acceptedPhraseTexts.has(p.text) && !rejectedPhraseTexts.has(p.text)
  );

  const acceptedSuggestions = suggestedPhrases.filter(
    p => acceptedPhraseTexts.has(p.text)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
      {/* Backdrop overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-app-bg/60 backdrop-blur-md"
      />

      {/* Floating Panel Capsule */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full max-w-xl bg-app-card border-l border-app-card-border/80 h-full flex flex-col shadow-2xl z-10"
      >
        {/* Header Block with context info */}
        <div className="p-6 border-b border-app-card-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
              <Brain size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-app-fg tracking-tight">CantoLex Assistant</h2>
              <span className="text-[10px] font-black tracking-widest text-orange-500 font-bold block uppercase">
                {contextType === "phrase" ? "Study Phrase / Follow-up" : contextType === "line" ? "Line Analysis" : "Sequence Breakdown"}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-app-bg/40 border border-app-card-border/40 hover:border-app-card-border text-app-fg opacity-65 hover:opacity-100 hover:bg-app-bg transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Workspace container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin select-none">
          
          {/* 1. Context Preview card */}
          <div className="p-5 rounded-2xl bg-app-bg/50 border border-border space-y-3">
            <span className="text-[9px] uppercase font-black tracking-widest text-app-fg opacity-30 block">
              Linguistic Anchor
            </span>

            {contextType === "line" && lineContext && (
              <div className="space-y-1.5 font-serif">
                <p className="text-lg font-medium text-app-fg leading-snug italic">
                  "{lineContext.original}"
                </p>
                {lineContext.translation && (
                  <p className="text-sm text-app-fg opacity-45 font-sans">
                    {lineContext.translation}
                  </p>
                )}
              </div>
            )}

            {contextType === "phrase" && phraseContext && (
              <div className="space-y-2 font-serif">
                <p className="text-xl font-bold text-app-fg">
                  {phraseContext.text}
                </p>
                {phraseContext.translation && (
                  <p className="text-sm text-app-fg opacity-55 font-sans">
                    {phraseContext.translation}
                  </p>
                )}
                
                {/* Search for line context in track if missing */}
                {track.lines && (
                  <div className="pt-2 border-t border-app-card-border/30">
                    <span className="text-[8px] uppercase tracking-wider text-app-fg opacity-35 block mb-1 font-sans">
                      Lyrics Context
                    </span>
                    <p className="text-xs font-sans text-app-fg opacity-45 leading-relaxed">
                      "{track.lines.find(l => phraseContext.lineIds?.includes(l.lineId || ""))?.original || 
                        track.lines.find(l => l.original.toLowerCase().includes(phraseContext.text.toLowerCase()))?.original || 
                        "Linking metadata contextual lines..."}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {contextType === "selection" && (
              <div className="space-y-1 font-sans">
                <p className="text-sm font-semibold text-app-fg">
                  Selected Multi-Line Sequence
                </p>
                <p className="text-xs text-app-fg opacity-45">
                  ({selectedLineIds.length} lines highlighted for bulk breakdown & analysis)
                </p>
              </div>
            )}
          </div>

          {/* 2. Interactive user inputs/presets when not loading */}
          <div className="space-y-4">
            <span className="text-[9px] uppercase font-black tracking-widest text-app-fg opacity-35 block">
              Interactive Prompts
            </span>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2">
              {presetsList.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleAskAI(preset.id)}
                    disabled={isLoading}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold select-none text-left transition-all hover:scale-[1.01] active:scale-[0.99] border flex flex-col justify-center ${
                      isActive 
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-app-bg hover:bg-app-card border-app-card-border/50 text-app-fg opacity-85 hover:opacity-100"
                    } disabled:opacity-40 disabled:pointer-events-none`}
                  >
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Custom question bar */}
            <div className="space-y-2 pt-2">
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder={
                    contextType === "phrase"
                      ? "Ask about nuances, grammar, synonyms, register, or usage of this phrase..."
                      : contextType === "line"
                      ? "Ask about specific grammar, slang, pronunciation tags or line context..."
                      : "Ask about overall connections, linguistic patterns, or story in this sequence..."
                  }
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  disabled={isLoading}
                  className="w-full p-3.5 pr-12 bg-app-bg border border-app-card-border/60 rounded-2xl text-sm font-medium text-app-fg placeholder-app-fg/30 focus:outline-none focus:border-orange-500/50 resize-none transition-all font-sans"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (userQuestion.trim()) handleAskAI();
                    }
                  }}
                />
                <button
                  onClick={() => handleAskAI()}
                  disabled={isLoading || !userQuestion.trim()}
                  className="absolute right-3.5 bottom-3.5 w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold transition-all flex items-center justify-center text-white disabled:bg-app-fg/10 disabled:text-app-fg/30 shadow-md enabled:hover:scale-105 enabled:active:scale-95 duration-150"
                  title="Ask assistant"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Global loader & error feedback screen */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-12 flex flex-col items-center justify-center space-y-4"
              >
                <Loader2 size={36} className="text-orange-500 animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-black text-app-fg uppercase tracking-wider">Analyzing Lyrics</p>
                  <p className="text-xs text-app-fg opacity-40 max-w-xs mx-auto">Consulting Gemini to break down grammar structures and suggest collocations...</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl bg-red-500/[0.03] border border-red-500/10 text-center space-y-3"
              >
                <HelpCircle size={30} className="text-red-500 mx-auto opacity-70" />
                <div>
                  <h4 className="text-sm font-bold text-app-fg">Linguistic Analysis Suspended</h4>
                  <p className="text-xs text-app-fg opacity-40 max-w-sm mx-auto mt-1 leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={() => handleAskAI(activePreset || undefined)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors active:scale-95 duration-150"
                >
                  Retry analysis
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. Displays AI Explanation Output if loaded */}
          {!isLoading && !error && explanation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 pt-2 select-text"
            >
              {/* Main explanation card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-black tracking-widest text-orange-500 font-bold block">
                    AI tutor feedback
                  </span>
                  {speak && (
                    <button
                      onClick={() => handleVoiceOver(explanation.replace(/[*#`_\[\]()]/g, ""))}
                      disabled={isSpeaking}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all select-none ${
                        isSpeaking 
                          ? "bg-orange-500/10 border-orange-500/20 text-orange-500" 
                          : "bg-app-bg border-app-card-border/40 text-app-fg opacity-65 hover:opacity-100 hover:border-app-card-border"
                      }`}
                      title="Read explanation text"
                    >
                      <Volume2 size={12} className={isSpeaking ? "animate-pulse" : ""} />
                      <span>{isSpeaking ? "Speaking" : "Speak text"}</span>
                    </button>
                  )}
                </div>

                <div className="p-5 rounded-3xl bg-app-bg/30 border border-app-card-border/50 text-app-fg opacity-85 leading-relaxed font-serif text-base select-text">
                  <div className="markdown-body">
                    <ReactMarkdown>{explanation}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* 5. Suggested Vocabulary block */}
              {suggestedPhrases.length > 0 && (
                <div className="space-y-6 pt-2">
                  {/* Category A: Pending AI Suggestions */}
                  {pendingSuggestions.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#f97316] font-bold block">
                          Suggested Vocabulary Chunks ({pendingSuggestions.length})
                        </span>
                        <span className="text-[8px] font-medium text-app-fg opacity-30 font-sans">
                          Click Accept to add to your study list
                        </span>
                      </div>

                      <div className="space-y-3 select-none">
                        {pendingSuggestions.map((item) => {
                          const originalIndex = suggestedPhrases.findIndex(p => p.text === item.text);
                          const isEditing = editingIndex === originalIndex;

                          return (
                            <div 
                              key={item.text}
                              className="p-4 rounded-3xl bg-app-bg border border-app-card-border/55 hover:border-app-card-border transition-all"
                            >
                              {isEditing ? (
                                /* Inline Edit Mode interface */
                                <div className="space-y-3 font-sans">
                                  <span className="text-[8px] font-black uppercase text-orange-500 tracking-wider">
                                    Edit block detail
                                  </span>
                                  
                                  <div className="space-y-2.5">
                                    <div>
                                      <label className="text-[9px] font-bold text-app-fg opacity-40 block mb-1">
                                        Vocabulary chunk
                                      </label>
                                      <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="w-full px-3 py-2 bg-app-card border border-app-card-border/60 rounded-xl text-xs font-semibold text-app-fg"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-bold text-app-fg opacity-40 block mb-1">
                                        Target language translation
                                      </label>
                                      <input
                                        type="text"
                                        value={editTranslation}
                                        onChange={(e) => setEditTranslation(e.target.value)}
                                        className="w-full px-3 py-2 bg-app-card border border-app-card-border/60 rounded-xl text-xs font-semibold text-app-fg"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[9px] font-bold text-app-fg opacity-40 block mb-1">
                                        Clarification / Notes
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={editExplanation}
                                        onChange={(e) => setEditExplanation(e.target.value)}
                                        className="w-full px-3 py-2 bg-app-card border border-app-card-border/60 rounded-xl text-xs font-serif text-app-fg resize-none"
                                      />
                                    </div>

                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => saveEditedPhrase(originalIndex)}
                                        className="px-3.5 py-1.5 bg-orange-500 text-white rounded-xl text-[xxs] font-bold uppercase tracking-wider hover:bg-orange-600 transition-colors"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingIndex(null)}
                                        className="px-3.5 py-1.5 bg-app-card border border-app-card-border text-app-fg opacity-70 hover:opacity-100 rounded-xl text-[xxs] font-bold uppercase tracking-wider transition-all"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Regular Suggestion Display Mode */
                                <div className="flex gap-4 items-start justify-between font-serif font-sans">
                                  <div className="space-y-1.5 flex-1 pr-2 select-text">
                                    <h4 className="text-base font-bold text-app-fg leading-tight">
                                      {item.text}
                                    </h4>
                                    <p className="text-sm text-app-fg opacity-55 italic font-serif">
                                      {item.translation}
                                    </p>
                                    {item.explanation && (
                                      <p className="text-xs text-app-fg opacity-40 font-sans leading-relaxed pt-1 select-text">
                                        {item.explanation}
                                      </p>
                                    )}
                                    {item.type && (
                                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-app-card border border-app-card-border/40 text-[9px] font-bold text-orange-500 select-none uppercase tracking-wider font-sans">
                                        {item.type.replace("_", " ")}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                                    <button
                                      onClick={() => startEditingPhrase(originalIndex, item)}
                                      className="w-8 h-8 rounded-lg bg-app-card border border-app-card-border/50 hover:border-app-card-border text-app-fg opacity-60 hover:opacity-100 transition-all flex items-center justify-center font-sans"
                                      title="Inline edit before accept"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleAcceptSuggested(item, originalIndex)}
                                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm active:scale-95 duration-150 font-sans"
                                      title="Accept suggested phrase"
                                    >
                                      <Plus size={12} className="stroke-[3]" />
                                      <span>Accept</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectSuggested(item.text)}
                                      className="w-8 h-8 rounded-lg hover:bg-red-500/5 hover:border-red-500/15 border border-app-card-border/30 text-app-fg opacity-35 hover:opacity-100 hover:text-red-500 transition-all flex items-center justify-center font-sans"
                                      title="Dismiss suggestion"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category B: Accepted study phrases */}
                  {acceptedSuggestions.length > 0 && (
                    <div className="space-y-4 pt-1.5 border-t border-app-card-border/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-widest text-green-600 font-bold block flex items-center gap-1 font-sans">
                          <CheckCircle2 size={12} className="text-green-500" />
                          Saved to Study List ({acceptedSuggestions.length})
                        </span>
                      </div>

                      <div className="space-y-3 select-none">
                        {acceptedSuggestions.map((item) => (
                          <div 
                            key={item.text}
                            className="p-4 rounded-3xl border border-green-500/20 bg-green-500/[0.015] transition-all"
                          >
                            <div className="flex gap-4 items-start justify-between font-serif font-sans">
                              <div className="space-y-1.5 flex-1 pr-2 select-text">
                                <h4 className="text-base font-bold text-green-700 dark:text-green-300 leading-tight">
                                  {item.text}
                                </h4>
                                <p className="text-sm text-app-fg opacity-55 italic font-serif">
                                  {item.translation}
                                </p>
                                {item.explanation && (
                                  <p className="text-xs text-app-fg opacity-40 font-sans leading-relaxed pt-1 select-text">
                                    {item.explanation}
                                  </p>
                                )}
                                {item.type && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-green-500/15 border border-green-500/10 text-[9px] font-bold text-green-600 select-none uppercase tracking-wider font-sans font-sans">
                                    {item.type.replace("_", " ")}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-center">
                                <div className="px-2.5 py-1.5 rounded-xl border border-green-500/10 bg-green-500/5 text-green-600 flex items-center gap-1 text-[10px] uppercase tracking-wider font-sans font-black">
                                  <Check size={11} className="stroke-[3]" />
                                  <span>Added</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
