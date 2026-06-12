import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowRight, Brain, CheckCircle2, Bookmark } from 'lucide-react';
import { TrackStudySummary } from '../services/trackSummaryService';
import { useTranslation } from '../lib/i18n';

interface TrackStudyBridgeProps {
  summary: TrackStudySummary;
  onGoToStudy: () => void;
  trackTitle?: string;
}

export const TrackStudyBridge: React.FC<TrackStudyBridgeProps> = ({
  summary,
  onGoToStudy,
}) => {
  const { uiLanguage } = useTranslation();

  const tooltipText = uiLanguage === 'ru'
    ? 'Нажмите, чтобы начать изучение слов этой песни'
    : "Click to start reviewing this song's cards";

  return (
    <motion.div
      id="track-study-bridge-card"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-xl relative flex items-center justify-between gap-4 py-1.5 pl-0 pr-0 sm:pl-8 select-none text-[10px] sm:text-xs cursor-pointer hover:scale-[1.002] active:scale-[0.995] transition-all font-sans"
      onClick={onGoToStudy}
      title={tooltipText}
    >
      {/* Quick Metrics Inline in a clean row */}
      <div className="flex flex-wrap items-center gap-4 text-app-muted font-bold min-w-0 font-sans">
        <span className="flex items-center gap-1 font-sans">
          <Bookmark size={12} className="text-app-muted/60 font-sans animate-none" />
          <span className="text-app-fg text-xs font-black">{summary.totalCards}</span>
          <span className="font-sans">{uiLanguage === 'ru' ? 'карт' : 'cards'}</span>
        </span>
        <span className="text-app-card-border/60 font-light font-sans">|</span>
        <span className="flex items-center gap-1 font-sans">
          <Brain size={12} className="text-app-accent font-sans animate-none" />
          <span className="text-app-fg text-xs font-black">{summary.learningCount}</span>
          <span className="font-sans">{uiLanguage === 'ru' ? 'учу' : 'learning'}</span>
        </span>
        <span className="text-app-card-border/60 font-light font-sans">|</span>
        <span className="flex items-center gap-1 font-sans">
          <CheckCircle2 size={12} className="text-emerald-500 font-sans animate-none" />
          <span className="text-app-fg text-xs font-black">{summary.knownCount}</span>
          <span className="font-sans">{uiLanguage === 'ru' ? 'знаю' : 'mastered'}</span>
        </span>
      </div>

      {/* Sleek inline slider bar showing mastery state percentage */}
      <div className="flex items-center gap-2.5 max-w-[160px] sm:max-w-[200px] w-full shrink-0 font-sans">
        <div className="h-1 flex-1 bg-app-card-border/30 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-app-accent transition-all duration-700 ease-out rounded-full"
            style={{ width: `${summary.percentageComplete}%` }}
          />
        </div>
        <span className="text-[10px] font-black text-app-accent tracking-tighter shrink-0 w-8 text-right font-sans">
          {summary.percentageComplete}%
        </span>
      </div>
    </motion.div>
  );
};
