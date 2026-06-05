import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Check, Loader2, Sparkles, Quote, BookOpen, RefreshCw, CheckCircle2, Trash2, Edit3, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { studyCardsRepository, PhraseStatus, Flashcard } from '../application';
import { saveTrackData } from '../services/musicService';
import { addUserPhrase, editPhrase, deletePhrase } from '../services/lyricsAnalysisService';

const addPhraseToStudy = (phraseData: any, status?: PhraseStatus) => studyCardsRepository.addPhraseToStudy(phraseData, status);
const updatePhraseStatus = (cardId: string, status: PhraseStatus) => studyCardsRepository.updatePhraseStatus(cardId, status);

interface PhraseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lineIndex: number | null;
  lyrics: string;
  phraseAnalysis: any;
  trackTitle: string;
  artist: string;
  trackId: string;
  sourceLanguage: string;
  user: any;
  onCardUpdated: (card: Flashcard) => void;
  phraseMetadata: Map<string, Flashcard>;
  currentTrack?: any;
  setCurrentTrack?: React.Dispatch<React.SetStateAction<any>>;
}

export default function PhraseDrawer({
  isOpen,
  onClose,
  lineIndex,
  lyrics,
  phraseAnalysis,
  trackTitle,
  artist,
  trackId,
  sourceLanguage,
  user,
  onCardUpdated,
  phraseMetadata,
  currentTrack,
  setCurrentTrack
}: PhraseDrawerProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  // States for adding a custom user phrase
  const [isAdding, setIsAdding] = useState(false);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  // States for inline phrase edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTranslationText, setEditTranslationText] = useState('');
  const [editExplanationText, setEditExplanationText] = useState('');

  if (lineIndex === null) return null;

  // Prefer lines from reactive currentTrack if available, otherwise fallback to phraseAnalysis
  const activeTrack = currentTrack || phraseAnalysis;
  const lineData = activeTrack?.lines?.[lineIndex!];
  if (!lineData) return null;

  const lineText = lineData.original || '';
  const linePhrases = lineData.phrases || [];

  const handleAddUserPhraseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhraseText.trim() || !newTranslation.trim()) return;

    if (activeTrack && setCurrentTrack) {
      const targetLineId = lineData.lineId;
      const updatedTrack = addUserPhrase(
        activeTrack,
        newPhraseText,
        newTranslation,
        newExplanation,
        targetLineId
      );

      saveTrackData(activeTrack.trackId, updatedTrack);
      setCurrentTrack(updatedTrack);

      setNewPhraseText('');
      setNewTranslation('');
      setNewExplanation('');
      setIsAdding(false);
    }
  };

  const handleEditPhraseSubmit = (phraseId: string) => {
    if (activeTrack && setCurrentTrack) {
      const updatedTrack = editPhrase(activeTrack, phraseId, {
        translation: editTranslationText,
        explanation: editExplanationText
      });
      saveTrackData(activeTrack.trackId, updatedTrack);
      setCurrentTrack(updatedTrack);
      setEditingId(null);
    }
  };

  const handleDeletePhraseClick = (phraseId: string) => {
    if (confirm("Are you sure you want to remove this phrase?") && activeTrack && setCurrentTrack) {
      const updatedTrack = deletePhrase(activeTrack, phraseId);
      saveTrackData(activeTrack.trackId, updatedTrack);
      setCurrentTrack(updatedTrack);
    }
  };

  const getStatusIcon = (status?: PhraseStatus) => {
    switch (status) {
      case 'known': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'learning': return <BookOpen size={16} className="text-orange-500" />;
      case 'new': return <Plus size={16} className="text-blue-500" />;
      default: return <Plus size={16} className="opacity-20" />;
    }
  };

  const getStatusLabel = (status?: PhraseStatus) => {
    switch (status) {
      case 'known': return 'Known';
      case 'learning': return 'Learning';
      default: return 'Add to Study';
    }
  };

  const handleAction = async (phrase: any, action: 'add' | 'toggle') => {
    if (!user) return;
    const text = phrase.phrase || phrase.text;
    setBusyId(text);
    
    try {
      const existing = phraseMetadata.get(text);
      if (action === 'add' || !existing || !existing.id) {
        await addPhraseToStudy({
          text,
          translation: phrase.translation || '...',
          trackId: trackId,
          lineId: lineText,
          explanation: phrase.explanation || '',
          sourceLanguage: phrase.language,
          lemmas: [],
          type: 'phrase'
        }, 'learning');
      } else {
        const nextStatus: PhraseStatus = existing.status === 'known' ? 'learning' : 'known';
        await updatePhraseStatus(existing.id, nextStatus);
      }
      onCardUpdated({} as any);
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkKnown = async (phrase: any) => {
    if (!user) return;
    const text = phrase.phrase || phrase.text;
    setBusyId(text);
    try {
      const existing = phraseMetadata.get(text);
      if (existing && existing.id) {
        await updatePhraseStatus(existing.id, 'known');
      } else {
        await addPhraseToStudy({
          text,
          translation: phrase.translation || '...',
          trackId: trackId,
          lineId: lineText,
          explanation: phrase.explanation || '',
          sourceLanguage: phrase.language,
          lemmas: [],
          type: 'phrase'
        }, 'known');
      }
      onCardUpdated({} as any);
    } catch (err) {
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-app-card border-t border-app-card-border shadow-2xl z-[101] rounded-t-[2.5rem] overflow-hidden flex flex-col backdrop-blur-2xl"
          >
            <div className="w-12 h-1.5 bg-app-fg/10 rounded-full mx-auto mt-4 mb-2 shrink-0" />
            
            <div className="overflow-y-auto px-6 pb-12 pt-4 flex-1 custom-scrollbar">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                      <Sparkles size={12} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Line Phrases</span>
                  </div>
                  <h2 className="text-2xl font-bold font-serif leading-tight text-app-fg">{lineText}</h2>
                  {(() => {
                    const lineMetadata = phraseMetadata.get(lineText);
                    const lineTranslation = lineMetadata?.translatedPhrase || phraseAnalysis?.lines?.[lineIndex]?.translation;
                    return lineTranslation ? (
                      <p className="text-lg text-app-fg opacity-60 font-serif italic mt-2">
                        {lineTranslation}
                      </p>
                    ) : null;
                  })()}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full bg-app-fg/5 hover:bg-app-fg/10 text-app-fg opacity-40 hover:opacity-100 transition-all shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-6 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Analysis Phrases</span>
                </div>
                {activeTrack && setCurrentTrack && (
                  <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm",
                      isAdding
                        ? "bg-app-fg/10 hover:bg-app-fg/15 text-app-fg"
                        : "bg-orange-500 hover:bg-orange-600 text-white hover:scale-105 active:scale-95"
                    )}
                  >
                    {isAdding ? <X size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                    <span>{isAdding ? "Cancel" : "Add custom phrase"}</span>
                  </button>
                )}
              </div>

              {/* Add Custom Phrase Form */}
              {isAdding && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleAddUserPhraseSubmit}
                  className="mb-6 p-5 rounded-3xl border border-app-card-border bg-app-fg/5 space-y-4"
                >
                  <div>
                    <label className="block text-[8px] uppercase font-black tracking-widest text-app-fg/50 mb-1">Phrase *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Break down"
                      value={newPhraseText}
                      onChange={(e) => setNewPhraseText(e.target.value)}
                      className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs focus:outline-none focus:border-app-accent text-app-fg font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-black tracking-widest text-app-fg/50 mb-1">Translation *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Сломаться"
                      value={newTranslation}
                      onChange={(e) => setNewTranslation(e.target.value)}
                      className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs focus:outline-none focus:border-app-accent text-app-fg font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase font-black tracking-widest text-app-fg/50 mb-1">Explanation (Optional)</label>
                    <textarea
                      placeholder="e.g. Phrasal verb or specific contextual meaning"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      className="w-full px-3 py-2 bg-app-card border border-app-card-border rounded-xl text-xs focus:outline-none focus:border-app-accent text-app-fg font-sans resize-none h-16"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-app-accent text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-app-accent/90 transition-all text-center"
                  >
                    Save Custom Phrase
                  </button>
                </motion.form>
              )}

              <div className="space-y-6">
                {linePhrases.length > 0 ? (
                  linePhrases.map((phrase: any, idx: number) => {
                    const text = phrase.phrase || phrase.text;
                    const card = phraseMetadata.get(text);
                    const isBusy = busyId === text;
                    const isEditing = editingId === phrase.id;

                    return (
                      <motion.div
                        key={phrase.id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative flex flex-col p-5 rounded-3xl bg-app-fg/5 border border-app-card-border hover:border-app-accent/30 transition-all overflow-hidden"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">Editing Phrase</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditPhraseSubmit(phrase.id)}
                                  className="p-1.5 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"
                                  title="Save changes"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded-lg bg-app-fg/10 text-app-fg hover:bg-app-fg/20 transition-all"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-bold text-app-fg opacity-60">Phrase: {text}</h4>
                            </div>

                            <div>
                              <label className="block text-[8px] uppercase font-bold text-app-fg/40 mb-1">Translation</label>
                              <input
                                type="text"
                                value={editTranslationText}
                                onChange={(e) => setEditTranslationText(e.target.value)}
                                className="w-full px-2 py-1.5 bg-app-card border border-app-card-border rounded-lg text-xs text-app-fg focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[8px] uppercase font-bold text-app-fg/40 mb-1">Explanation</label>
                              <textarea
                                value={editExplanationText}
                                onChange={(e) => setEditExplanationText(e.target.value)}
                                className="w-full px-2 py-1.5 bg-app-card border border-app-card-border rounded-lg text-xs text-app-fg focus:outline-none resize-none h-12"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 pb-3 border-b border-app-fg/5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                                  <h4 className="text-lg font-bold text-app-fg leading-tight">{text}</h4>
                                  {phrase.source === 'user' ? (
                                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 font-extrabold uppercase tracking-wide">
                                      Custom Phrase
                                    </span>
                                  ) : (
                                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-extrabold uppercase tracking-wide flex items-center gap-0.5">
                                      <Sparkles size={8} className="fill-blue-600/35" />
                                      <span>AI Phrase</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-app-fg opacity-65 font-sans italic">{phrase.translation}</p>
                              </div>

                              <div className="flex items-center gap-2.5 ml-auto sm:ml-0 shrink-0">
                                {/* Inline edits is always visible and friendly to mobile */}
                                {activeTrack && setCurrentTrack && (
                                  <div className="flex items-center gap-1.5 border-r border-app-fg/10 pr-2.5">
                                    <button
                                      onClick={() => {
                                        setEditingId(phrase.id);
                                        setEditTranslationText(phrase.translation || '');
                                        setEditExplanationText(phrase.explanation || '');
                                      }}
                                      className="p-2 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all"
                                      title={phrase.source === 'user' ? "Edit custom phrase details" : "Edit translation (creates custom AI override)"}
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePhraseClick(phrase.id)}
                                      className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                      title={phrase.source === 'user' ? "Permanently delete custom phrase" : "Hide this AI phrase locally from views"}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}

                                {card ? (
                                  <button
                                    onClick={() => handleAction(phrase, 'toggle')}
                                    disabled={isBusy}
                                    className={cn(
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                                      card.status === 'known' ? "text-green-500 bg-green-500/10 border-green-500/20" : "text-orange-500 bg-orange-500/10 border-orange-500/20"
                                    )}
                                  >
                                    {isBusy ? <RefreshCw size={12} className="animate-spin" /> : getStatusIcon(card.status)}
                                    <span>{card.status}</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => handleMarkKnown(phrase)}
                                      disabled={isBusy}
                                      className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all active:scale-95 shadow-sm"
                                      title="Mark as Known"
                                    >
                                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    </button>
                                    <button
                                      onClick={() => handleAction(phrase, 'add')}
                                      disabled={isBusy}
                                      className="p-2 rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-sm"
                                      title="Add to Study"
                                    >
                                      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {phrase.explanation && (
                              <div className="mt-2 pt-3 border-t border-app-fg/5">
                                <div className="flex items-center gap-2 mb-1.5 opacity-40">
                                  <Quote size={10} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Meaning</span>
                                </div>
                                <p className="text-xs text-app-fg opacity-60 leading-relaxed font-sans">
                                  {phrase.explanation}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 px-10">
                    <div className="w-16 h-16 rounded-[2rem] bg-app-fg/5 flex items-center justify-center text-app-fg opacity-20">
                      <BookOpen size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-app-fg opacity-60">No phrases identified</h3>
                      <p className="text-sm text-app-fg opacity-40 leading-relaxed">
                        We haven't analyzed the individual phrases for this line yet. 
                        Try adding a phrase using the button above.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
