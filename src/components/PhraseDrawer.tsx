import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Check, Loader2, Sparkles, Quote, BookOpen, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { addPhraseToStudy, updatePhraseStatus, PhraseStatus, Flashcard } from '../services/cardService';

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
}: PhraseDrawerProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (lineIndex === null) return null;

  const lines = lyrics.split('\n');
  const lineText = lines[lineIndex]?.trim() || '';
  const linePhrases = phraseAnalysis?.lines?.[lineIndex]?.phrases || [];

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
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full bg-app-fg/5 hover:bg-app-fg/10 text-app-fg opacity-40 hover:opacity-100 transition-all shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {linePhrases.length > 0 ? (
                  linePhrases.map((phrase: any, idx: number) => {
                    const text = phrase.phrase || phrase.text;
                    const card = phraseMetadata.get(text);
                    const isBusy = busyId === text;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative flex flex-col p-5 rounded-3xl bg-app-fg/5 border border-app-card-border hover:border-app-accent/30 transition-all overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-lg font-bold text-app-fg leading-tight">{text}</h4>
                            <p className="text-sm text-app-fg opacity-40 font-serif italic mt-1">{phrase.translation}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {card ? (
                              <button
                                onClick={() => handleAction(phrase, 'toggle')}
                                disabled={isBusy}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                  card.status === 'known' ? "text-green-500 bg-green-500/10 border-green-500/20" : "text-orange-500 bg-orange-500/10 border-orange-500/20"
                                )}
                              >
                                {isBusy ? <RefreshCw size={12} className="animate-spin" /> : getStatusIcon(card.status)}
                                {card.status}
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleMarkKnown(phrase)}
                                  disabled={isBusy}
                                  className="p-2.5 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all active:scale-95 shadow-sm"
                                  title="Mark as Known"
                                >
                                  {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                </button>
                                <button
                                  onClick={() => handleAction(phrase, 'add')}
                                  disabled={isBusy}
                                  className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all active:scale-95 shadow-sm"
                                  title="Add to Study"
                                >
                                  {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
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
                            <p className="text-xs text-app-fg opacity-60 leading-relaxed font-serif">
                              {phrase.explanation}
                            </p>
                          </div>
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
                        Try regenerating the track analysis.
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
