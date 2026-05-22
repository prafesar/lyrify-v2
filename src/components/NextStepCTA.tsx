import React from 'react';
import { motion } from 'motion/react';
import { Music, Brain, Star, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import { NextStepState } from '../services/nextStepService';
import { cn } from '../lib/utils';

interface NextStepCTAProps {
  state: NextStepState;
  onClick: () => void;
  isLoading?: boolean;
}

export const NextStepCTA: React.FC<NextStepCTAProps> = ({ state, onClick, isLoading = false }) => {
  const getIcon = () => {
    switch (state.type) {
      case 'FIND_LYRICS':
        return <Music className="text-amber-500 shrink-0" size={18} />;
      case 'GENERATE_ANALYSIS':
        return <Brain className="text-app-accent shrink-0" size={18} />;
      case 'SAVE_FIRST_PHRASE':
        return <Star className="text-purple-500 shrink-0 animate-pulse" size={18} />;
      case 'GO_TO_STUDY':
        return <GraduationCap className="text-emerald-500 shrink-0" size={18} />;
    }
  };

  const getBadgeColors = () => {
    switch (state.type) {
      case 'FIND_LYRICS':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      case 'GENERATE_ANALYSIS':
        return 'bg-app-accent/10 border-app-accent/20 text-app-accent';
      case 'SAVE_FIRST_PHRASE':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-600';
      case 'GO_TO_STUDY':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
    }
  };

  const getButtonStyles = () => {
    switch (state.type) {
      case 'FIND_LYRICS':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20';
      case 'GENERATE_ANALYSIS':
        return 'bg-app-accent hover:bg-app-accent/90 text-white shadow-lg shadow-app-accent/20';
      case 'SAVE_FIRST_PHRASE':
        return 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20';
      case 'GO_TO_STUDY':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20';
    }
  };

  const getStepNumber = () => {
    switch (state.type) {
      case 'FIND_LYRICS':
        return 'Step 1';
      case 'GENERATE_ANALYSIS':
        return 'Step 2';
      case 'SAVE_FIRST_PHRASE':
        return 'Step 3';
      case 'GO_TO_STUDY':
        return 'Step 4';
    }
  };

  return (
    <motion.div
      id="guided-next-step-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 w-full bg-app-card border border-app-card-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden"
    >
      <div className="flex gap-3.5 items-start">
        <div className={cn("p-2.5 rounded-xl border flex items-center justify-center shrink-0", getBadgeColors())}>
          {getIcon()}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("inline-block px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold border leading-none", getBadgeColors())}>
              {getStepNumber()}
            </span>
            <span className="text-[10px] font-bold text-app-muted uppercase tracking-widest">
              Guided Next Step
            </span>
          </div>
          <h4 className="font-extrabold text-sm text-app-fg block">
            {state.label}
          </h4>
          <p className="text-xs text-app-muted font-sans leading-relaxed">
            {state.description}
          </p>
        </div>
      </div>

      <button
        id="guided-next-step-action-btn"
        onClick={onClick}
        disabled={isLoading}
        className={cn(
          "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 border border-transparent disabled:opacity-50 disabled:pointer-events-none",
          getButtonStyles()
        )}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={14} />
        ) : (
          <>
            <span>Proceed</span>
            <ArrowRight size={14} />
          </>
        )}
      </button>
    </motion.div>
  );
};
