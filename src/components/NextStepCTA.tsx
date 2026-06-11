import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileText, Brain, CheckCircle2, Bookmark, ArrowRight, Check, Search, RefreshCw, Loader2 } from 'lucide-react';
import { NextStepState } from '../services/nextStepService';

interface NextStepCTAProps {
  state: NextStepState;
  onExecute: (type: NextStepState['type']) => void;
  onMarkCompleted?: () => void;
  isExecuting?: boolean;
  loadingStep?: string;
}

export const NextStepCTA: React.FC<NextStepCTAProps> = ({
  state,
  onExecute,
  onMarkCompleted,
  isExecuting = false,
  loadingStep = 'idle',
}) => {
  const getIcon = () => {
    if (isExecuting) {
      return (
        <div className="relative w-[18px] h-[18px] flex items-center justify-center">
          <motion.div
            className="absolute w-5 h-5 rounded-full border-[1.5px] border-app-accent/30 border-t-app-accent"
            animate={{ rotate: 360 }}
            transition={{
              repeat: Infinity,
              duration: loadingStep === 'searching' ? 2 : 1,
              ease: 'linear',
            }}
          />
          <div className="relative flex items-center justify-center">
            {loadingStep === 'searching' ? (
              <Search size={10} className="text-app-accent" />
            ) : (
              <Brain size={10} className="text-app-accent animate-pulse" />
            )}
          </div>
        </div>
      );
    }

    switch (state.type) {
      case 'GET_LYRICS':
      case 'FIND_LYRICS':
        return <FileText size={18} className="text-app-accent" />;
      case 'TRANSLATE_LYRICS':
        return <Sparkles size={18} className="text-app-accent" />;
      case 'GENERATE_ANALYSIS':
        return <Sparkles size={18} className="text-app-accent animate-pulse" />;
      case 'GO_TO_STUDY':
        return <Brain size={18} className="text-emerald-500 animate-pulse" />;
      case 'SAVE_PHRASES':
        return <Bookmark size={18} className="text-amber-500" />;
      case 'TRACK_COMPLETE':
        return <CheckCircle2 size={18} className="text-emerald-500" />;
      default:
        return null;
    }
  };

  const getIconBg = () => {
    if (isExecuting) {
      return 'bg-app-accent/5 text-app-accent border border-app-accent/10';
    }

    switch (state.type) {
      case 'GET_LYRICS':
      case 'FIND_LYRICS':
      case 'TRANSLATE_LYRICS':
      case 'GENERATE_ANALYSIS':
        return 'bg-app-accent/10 text-app-accent';
      case 'GO_TO_STUDY':
      case 'TRACK_COMPLETE':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'SAVE_PHRASES':
        return 'bg-amber-500/10 text-amber-500';
      default:
        return 'bg-app-accent/10 text-app-accent';
    }
  };

  const handleCardClick = () => {
    if (!isExecuting) {
      onExecute(state.type);
    }
  };

  const getExecutingText = () => {
    switch (loadingStep) {
      case 'searching':
        return {
          title: 'Finding Lyrics',
          desc: 'Searching original lyrics database'
        };
      case 'meaning':
      case 'translating':
        return {
          title: 'Translating Lyrics',
          desc: 'Analyzing track meaning & translating lines with Gemini AI'
        };
      case 'analyzing':
        return {
          title: 'Analyzing Track',
          desc: 'Processing grammatical analysis using Gemini AI'
        };
      case 'lecture':
        return {
          title: 'Generating Lecture',
          desc: 'Structuring vocabulary & educational explanations'
        };
      default:
        return {
          title: 'Processing...',
          desc: 'Consulting Gemini AI and preparing materials'
        };
    }
  };

  const currentText = isExecuting ? getExecutingText() : { title: state.label, desc: state.description };

  return (
    <motion.div
      id="next-step-cta-container"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-xl"
    >
      <div
        id="next-step-cta-card"
        onClick={handleCardClick}
        className={`w-full group flex items-center justify-between gap-4 p-4 md:p-5 rounded-3xl transition-all border ${
          isExecuting 
            ? 'cursor-wait bg-app-card/35 border-app-accent/20 animate-pulse'
            : 'cursor-pointer hover:bg-app-card/70 hover:scale-[1.002] active:scale-[0.995] bg-app-card border-app-card-border'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className={`p-3 ${getIconBg()} rounded-2xl shrink-0 shadow-sm transition-transform ${!isExecuting && 'group-hover:scale-105'}`}>
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-app-accent block">
              {state.type === 'TRACK_COMPLETE' ? 'Excellent Progress!' : (isExecuting ? 'ACTIVE PROCESSING' : 'NEXT STEP')}
            </span>
            <span className={`text-sm md:text-base font-extrabold text-app-fg leading-tight block mt-0.5 transition-colors ${!isExecuting && 'group-hover:text-app-accent'}`}>
              {currentText.title}
            </span>
            <span className="text-xs text-app-muted leading-relaxed block mt-1 font-semibold opacity-90 truncate md:whitespace-normal">
              {currentText.desc}
              {isExecuting && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="font-black text-app-accent ml-0.5 inline-block"
                >
                  ...
                </motion.span>
              )}
            </span>

            {/* Aux button shown inside card for SAVE_PHRASES state to avoid nested click interference */}
            {state.type === 'SAVE_PHRASES' && onMarkCompleted && !isExecuting && (
              <div className="mt-3 flex animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={onMarkCompleted}
                  className="px-3.5 py-1.5 bg-transparent border border-app-card-border hover:bg-app-fg/5 text-app-muted hover:text-app-fg text-[10px] font-black uppercase tracking-wider rounded-xl active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                   <Check size={12} />
                   Done with breakdown
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clean elegant right arrow/spinner icon */}
        <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${
          isExecuting 
            ? 'bg-app-accent/5 border-app-accent/10 text-app-accent'
            : 'bg-app-fg/5 text-app-fg border-app-card-border group-hover:bg-app-accent group-hover:text-white group-hover:border-app-accent'
        }`}>
          {isExecuting ? (
            <RefreshCw size={12} className="animate-spin text-app-accent" />
          ) : (
            <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform duration-300" />
          )}
        </div>
      </div>
    </motion.div>
  );
};
