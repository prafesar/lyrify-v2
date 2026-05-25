import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowRight, Brain, CheckCircle2, Bookmark } from 'lucide-react';
import { TrackStudySummary } from '../services/trackSummaryService';

interface TrackStudyBridgeProps {
  summary: TrackStudySummary;
  onGoToStudy: () => void;
  trackTitle?: string;
}

export const TrackStudyBridge: React.FC<TrackStudyBridgeProps> = ({
  summary,
  onGoToStudy,
}) => {
  return (
    <motion.div
      id="track-study-bridge-card"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-xl relative flex items-center justify-between gap-4 py-1.5 pl-0 pr-0 sm:pl-8 select-none text-[10px] sm:text-xs cursor-pointer hover:scale-[1.002] active:scale-[0.995] transition-all"
      onClick={onGoToStudy}
      title="Click to start reviewing this song's cards"
    >
      {/* Quick Metrics Inline in a clean row */}
      <div className="flex flex-wrap items-center gap-4 text-app-muted font-bold min-w-0">
        <span className="flex items-center gap-1">
          <Bookmark size={12} className="text-app-muted/60" />
          <span className="text-app-fg text-xs font-black">{summary.totalCards}</span>
          <span>cards</span>
        </span>
        <span className="text-app-card-border/60 font-light">|</span>
        <span className="flex items-center gap-1">
          <Brain size={12} className="text-app-accent" />
          <span className="text-app-fg text-xs font-black">{summary.learningCount}</span>
          <span>learning</span>
        </span>
        <span className="text-app-card-border/60 font-light">|</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span className="text-app-fg text-xs font-black">{summary.knownCount}</span>
          <span>mastered</span>
        </span>
      </div>

      {/* Sleek inline slider bar showing mastery state percentage */}
      <div className="flex items-center gap-2.5 max-w-[160px] sm:max-w-[200px] w-full shrink-0">
        <div className="h-1 flex-1 bg-app-card-border/30 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-app-accent transition-all duration-700 ease-out rounded-full"
            style={{ width: `${summary.percentageComplete}%` }}
          />
        </div>
        <span className="text-[10px] font-black text-app-accent tracking-tighter shrink-0 w-8 text-right">
          {summary.percentageComplete}%
        </span>
      </div>
    </motion.div>
  );
};
