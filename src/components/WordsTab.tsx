import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, ChevronUp, BookOpen, CheckCircle, Volume2 } from 'lucide-react';
import { TrackLyricsData } from '../services/musicService';
import { WordFormStatus } from '../constants';

interface WordsTabProps {
  currentTrack: TrackLyricsData;
  getLexicalItemStatus: (item: { normalizedKey: string; language?: string }) => WordFormStatus;
  setLexicalItemStatus: (normalizedKey: string, status: WordFormStatus) => Promise<void>;
}

export const WordsTab: React.FC<WordsTabProps> = ({
  currentTrack,
  getLexicalItemStatus,
  setLexicalItemStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'learning' | 'known'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'word' | 'phrase'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const preparedTrack = currentTrack.preparedTrack;
  const lexicalItems = preparedTrack?.lexicalItems || [];
  const occurrences = preparedTrack?.occurrences || [];

  // Match item translations from currentTrack.translationLexicalItems
  const itemTranslationsMap = useMemo(() => {
    const map = new Map<string, { translation: string; explanation?: string }>();
    if (Array.isArray(currentTrack.translationLexicalItems)) {
      currentTrack.translationLexicalItems.forEach((item: any) => {
        if (item && item.id) {
          map.set(item.id.toLowerCase(), {
            translation: item.translation,
            explanation: item.explanation
          });
        }
        if (item && item.baseForm) {
          map.set(item.baseForm.toLowerCase(), {
            translation: item.translation,
            explanation: item.explanation
          });
        }
      });
    }
    return map;
  }, [currentTrack.translationLexicalItems]);

  const filteredItems = useMemo(() => {
    return lexicalItems.filter((item: any) => {
      const text = (item.displayText || item.baseForm || '').toLowerCase();
      const base = (item.baseForm || '').toLowerCase();
      const key = (item.normalizedKey || '').toLowerCase();
      const matchesSearch = text.includes(searchQuery.toLowerCase()) || base.includes(searchQuery.toLowerCase());

      const status = getLexicalItemStatus(item);
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'new' && (status === 'new' || !status)) ||
        (statusFilter === 'learning' && status === 'learning') ||
        (statusFilter === 'known' && status === 'known');

      const matchesKind = 
        kindFilter === 'all' ||
        (kindFilter === 'word' && item.kind === 'word') ||
        (kindFilter === 'phrase' && item.kind !== 'word');

      return matchesSearch && matchesStatus && matchesKind;
    });
  }, [lexicalItems, searchQuery, statusFilter, kindFilter, getLexicalItemStatus]);

  const handleToggleKnown = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentStatus = getLexicalItemStatus(item);
    const nextStatus = currentStatus === 'known' ? 'new' : 'known';
    await setLexicalItemStatus(item.normalizedKey || item.baseForm, nextStatus);
  };

  const handleStatusSelect = async (item: any, status: WordFormStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    await setLexicalItemStatus(item.normalizedKey || item.baseForm, status);
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'word': return 'Word';
      case 'phrasal_verb': return 'Phrasal Verb';
      case 'separable_verb': return 'Separable Verb';
      case 'expression': return 'Expression';
      case 'phrase': return 'Phrase';
      default: return kind;
    }
  };

  const speakWord = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentTrack.sourceLanguage || 'en';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header and Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-app-card border border-app-card-border/10 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-app-fg">Song Vocabulary</h2>
          <p className="text-xs text-app-muted opacity-75 mt-0.5">
            Programmatic list of prepared lexical items found inside the track.
          </p>
        </div>
        <div className="flex gap-4 text-center">
          <div className="px-3 py-1 bg-app-bg/50 border border-app-card-border/5 rounded-xl min-w-[70px]">
            <p className="text-xs text-app-muted">Total</p>
            <p className="text-lg font-bold text-app-fg">{lexicalItems.length}</p>
          </div>
          <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-xl min-w-[70px]">
            <p className="text-xs text-amber-500 font-medium">Learning</p>
            <p className="text-lg font-bold text-amber-500">
              {lexicalItems.filter((item: any) => getLexicalItemStatus(item) === 'learning').length}
            </p>
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl min-w-[70px]">
            <p className="text-xs text-emerald-500 font-medium">Known</p>
            <p className="text-lg font-bold text-emerald-500">
              {lexicalItems.filter((item: any) => getLexicalItemStatus(item) === 'known').length}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="relative flex h-11 items-center bg-app-card border border-app-card-border/60 rounded-[1.25rem] px-3.5 focus-within:border-app-accent/50 transition-all">
          <Search size={16} className="text-app-fg opacity-40 shrink-0 mr-2.5" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-app-fg placeholder-app-fg/30 focus:outline-none font-sans"
          />
        </div>

        {/* Status Filters */}
        <div className="flex bg-app-card border border-app-card-border/40 p-1 rounded-[1.25rem] h-11">
          {(['all', 'new', 'learning', 'known'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 rounded-[1rem] text-xs font-bold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-app-accent text-white shadow-sm'
                  : 'text-app-fg opacity-60 hover:opacity-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Kind Filters */}
        <div className="flex bg-app-card border border-app-card-border/40 p-1 rounded-[1.25rem] h-11">
          {(['all', 'word', 'phrase'] as const).map((kind) => (
            <button
              key={kind}
              onClick={() => setKindFilter(kind)}
              className={`flex-1 rounded-[1rem] text-xs font-bold capitalize transition-all ${
                kindFilter === kind
                  ? 'bg-app-accent text-white shadow-sm'
                  : 'text-app-fg opacity-60 hover:opacity-100'
              }`}
            >
              {kind === 'phrase' ? 'Phrases' : kind === 'word' ? 'Words' : 'All Type'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-app-card/30 border border-app-card-border/10 rounded-2xl">
            <BookOpen size={36} className="mx-auto text-app-fg opacity-20 mb-3" />
            <p className="text-sm font-bold text-app-fg opacity-60">No items found</p>
            <p className="text-xs text-app-muted mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          filteredItems.map((item: any) => {
            const status = getLexicalItemStatus(item);
            const isExpanded = expandedItemId === item.id;
            const translationInfo = itemTranslationsMap.get(item.id.toLowerCase()) || 
                                    itemTranslationsMap.get((item.baseForm || '').toLowerCase()) ||
                                    itemTranslationsMap.get((item.normalizedKey || '').toLowerCase());

            // Find all occurrences of this item in the track
            const itemOccurrences = occurrences.filter((occ: any) => occ.lexicalItemId === item.id);

            return (
              <div
                key={item.id}
                className={`bg-app-card border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-app-accent/30 shadow-md ring-1 ring-app-accent/5'
                    : 'border-app-card-border/10 hover:border-app-card-border/40 hover:bg-app-card/60'
                }`}
              >
                {/* Main Row */}
                <div
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Status Checkbox Button */}
                    <button
                      onClick={(e) => handleToggleKnown(item, e)}
                      title={`Mark as ${status === 'known' ? 'New' : 'Known'}`}
                      className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all shrink-0 border ${
                        status === 'known'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                          : 'border-app-card-border/30 text-app-fg/20 hover:text-app-fg/40 hover:border-app-card-border/50'
                      }`}
                    >
                      <CheckCircle size={14} className={status === 'known' ? 'opacity-100' : 'opacity-40'} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-bold text-app-fg truncate">
                          {item.displayText || item.baseForm}
                        </span>
                        {item.baseForm && item.baseForm !== item.displayText && (
                          <span className="text-xs text-app-muted opacity-60">
                            ({item.baseForm})
                          </span>
                        )}
                        <button
                          onClick={(e) => speakWord(item.displayText || item.baseForm, e)}
                          className="p-1 text-app-fg opacity-30 hover:opacity-100 hover:text-app-accent transition-all shrink-0"
                          title="Listen pronunciation"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>

                      {/* Kind Pill and Translation */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-app-accent px-1.5 py-0.5 bg-app-accent/5 rounded-md border border-app-accent/10">
                          {getKindLabel(item.kind)}
                        </span>
                        {translationInfo?.translation ? (
                          <span className="text-sm font-semibold text-app-fg opacity-80 truncate">
                            — {translationInfo.translation}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-app-muted italic">
                            No stored translation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Compact Status Badges for instant switching */}
                    <div className="hidden sm:flex items-center gap-1 bg-app-bg/50 border border-app-card-border/10 p-1 rounded-xl">
                      {(['new', 'learning', 'known'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={(e) => handleStatusSelect(item, s, e)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            status === s
                              ? s === 'known'
                                ? 'bg-emerald-500 text-white font-bold'
                                : s === 'learning'
                                ? 'bg-amber-500 text-white font-bold'
                                : 'bg-app-fg/15 text-app-fg font-bold'
                              : 'text-app-fg opacity-40 hover:opacity-80'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="text-app-fg opacity-40">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-app-card-border/5 bg-app-bg/15"
                    >
                      <div className="p-4 space-y-4">
                        {/* Explanation block from translationLexicalItems if exists */}
                        {translationInfo?.explanation && (
                          <div className="space-y-1 bg-app-accent/5 p-3 rounded-xl border border-app-accent/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-app-accent">Explanation</p>
                            <p className="text-xs font-medium text-app-fg leading-relaxed">
                              {translationInfo.explanation}
                            </p>
                          </div>
                        )}

                        {/* Song Context Occurrences */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-app-muted">
                            Occurrences in Track ({itemOccurrences.length})
                          </p>
                          
                          {itemOccurrences.length === 0 ? (
                            <p className="text-xs text-app-muted italic">No parsed line occurrences.</p>
                          ) : (
                            <div className="space-y-2">
                              {itemOccurrences.map((occ: any, oIdx: number) => {
                                const lineObj = currentTrack.lines ? currentTrack.lines[occ.lineIndex] : null;
                                if (!lineObj) return null;

                                return (
                                  <div
                                    key={oIdx}
                                    className="bg-app-card border border-app-card-border/5 p-2.5 rounded-xl space-y-1.5 hover:border-app-card-border/20 transition-all"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <span className="text-[10px] font-mono text-app-muted shrink-0 mt-0.5">
                                        Line {occ.lineIndex + 1}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-serif text-sm font-bold text-app-fg leading-snug">
                                          {lineObj.original}
                                        </p>
                                        {lineObj.translation && (
                                          <p className="text-xs text-app-muted font-serif italic mt-0.5 leading-snug">
                                            {lineObj.translation}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Surface highlight info if matches */}
                                    {occ.surfaceText && occ.surfaceText.toLowerCase() !== (item.displayText || '').toLowerCase() && (
                                      <div className="text-[10px] text-app-muted pl-11">
                                        <span className="font-bold">Appears in lyrics as:</span> "{occ.surfaceText}"
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
