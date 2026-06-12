import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, FileText, Brain, CheckCircle2, Bookmark, ArrowRight, Check, Search, RefreshCw, Loader2 } from 'lucide-react';
import { NextStepState } from '../services/nextStepService';
import { useTranslation } from '../lib/i18n';

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
  const { t } = useTranslation();
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
          title: t('nextStep.findingLyrics'),
          desc: t('nextStep.findingLyricsDesc')
        };
      case 'meaning':
      case 'translating':
        return {
          title: t('nextStep.translatingLyrics'),
          desc: t('nextStep.translatingLyricsDesc')
        };
      case 'analyzing':
        return {
          title: t('nextStep.analyzingTrack'),
          desc: t('nextStep.analyzingTrackDesc')
        };
      case 'lecture':
        return {
          title: t('nextStep.generatingLecture'),
          desc: t('nextStep.generatingLectureDesc')
        };
      default:
        return {
          title: t('nextStep.processing'),
          desc: t('nextStep.processingDesc')
        };
    }
  };

  const getNonExecutingText = () => {
    switch (state.type) {
      case 'GET_LYRICS':
      case 'FIND_LYRICS':
        return {
          title: t('nextStep.getLyricsLabel'),
          desc: t('nextStep.getLyricsDesc')
        };
      case 'TRANSLATE_LYRICS':
        return {
          title: t('nextStep.translateLyricLabel'),
          desc: t('nextStep.translateLyricDesc')
        };
      case 'GENERATE_ANALYSIS':
        return {
          title: t('nextStep.generateBreakdownLabel'),
          desc: t('nextStep.generateBreakdownDesc')
        };
      case 'GO_TO_STUDY': {
        const dueCountMatch = state.description.match(/You have (\d+) saved phrases? ready to practice/i);
        const dueCount = dueCountMatch ? parseInt(dueCountMatch[1], 10) : 0;
        return {
          title: t('nextStep.startStudyLabel'),
          desc: t('nextStep.startStudyDesc', { count: dueCount, plural: dueCount > 1 ? 's' : '' })
        };
      }
      case 'SAVE_PHRASES':
        return {
          title: t('nextStep.savePhrasesLabel'),
          desc: t('nextStep.savePhrasesDesc')
        };
      case 'TRACK_COMPLETE':
        return {
          title: t('nextStep.revisitBreakdownLabel'),
          desc: t('nextStep.revisitBreakdownDesc')
        };
      default:
        return {
          title: state.label,
          desc: state.description
        };
    }
  };

  const currentText = isExecuting ? getExecutingText() : getNonExecutingText();

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
              {state.type === 'TRACK_COMPLETE' ? t('nextStep.excellentProgress') : (isExecuting ? t('nextStep.activeProcessing') : t('nextStep.nextStepLabel'))}
            </span>
            <span className={`text-sm md:text-base font-extrabold text-app-fg leading-tight block mt-0.5 transition-colors ${!isExecuting && 'group-hover:text-app-accent'}`}>
              {currentText.title}
            </span>
            <span className="text-xs text-app-muted leading-relaxed block mt-1 font-semibold opacity-90 whitespace-normal break-words">
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
