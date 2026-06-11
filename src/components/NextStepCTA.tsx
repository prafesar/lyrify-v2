import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileText, Brain, CheckCircle2, Bookmark, ArrowRight, Check } from 'lucide-react';
import { NextStepState } from '../services/nextStepService';

interface NextStepCTAProps {
  state: NextStepState;
  onExecute: (type: NextStepState['type']) => void;
  onMarkCompleted?: () => void;
  isExecuting?: boolean;
}

export const NextStepCTA: React.FC<NextStepCTAProps> = ({
  state,
  onExecute,
  onMarkCompleted,
  isExecuting = false,
}) => {
  const getIcon = () => {
    switch (state.type) {
      case 'FIND_LYRICS':
        return <FileText size={18} className="text-app-accent" />;
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
    switch (state.type) {
      case 'FIND_LYRICS':
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
        className="w-full group flex items-center justify-between gap-4 p-4 md:p-5 rounded-3xl cursor-pointer hover:bg-app-card/70 hover:scale-[1.002] active:scale-[0.995] transition-all bg-app-card border border-app-card-border"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className={`p-3 ${getIconBg()} rounded-2xl shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-app-accent block">
              {state.type === 'TRACK_COMPLETE' ? 'Excellent Progress!' : 'NEXT STEP'}
            </span>
            <span className="text-sm md:text-base font-extrabold text-app-fg leading-tight block mt-0.5 transition-colors group-hover:text-app-accent">
              {isExecuting ? 'Processing...' : state.label}
            </span>
            <span className="text-xs text-app-muted leading-relaxed block mt-1 font-semibold opacity-90">
              {state.description}
            </span>

            {/* Aux button shown inside card for SAVE_PHRASES state to avoid nested click interference */}
            {state.type === 'SAVE_PHRASES' && onMarkCompleted && (
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

        {/* Clean elegant right arrow icon that animates on container hover */}
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-app-fg/5 text-app-fg border border-app-card-border group-hover:bg-app-accent group-hover:text-white group-hover:border-app-accent transition-all duration-300">
          <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform duration-300" />
        </div>
      </div>
    </motion.div>
  );
};
