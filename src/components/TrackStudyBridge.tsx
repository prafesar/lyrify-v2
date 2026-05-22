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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full bg-app-card border border-app-card-border rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      {/* Decorative Accent Background Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-app-accent/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />

      {/* Stats and Line Progression */}
      <div className="flex-1 flex flex-col gap-2 relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Miniature header badge */}
          <span className="flex items-center gap-1.5 bg-app-accent/10 border border-app-accent/20 text-app-accent text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
            <GraduationCap size={10} />
            <span>Track Progress</span>
          </span>

          {/* Quick Metrics Inline */}
          <div className="flex items-center gap-2.5 text-[10px] text-app-muted font-bold">
            <span className="flex items-center gap-1">
              <Bookmark size={10} className="text-app-muted/80" />
              <span>{summary.totalCards} cards</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-app-card-border" />
            <span className="flex items-center gap-1">
              <Brain size={10} className="text-amber-500" />
              <span>{summary.learningCount} learning</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-app-card-border" />
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-500" />
              <span>{summary.knownCount} mastered</span>
            </span>
          </div>
        </div>

        {/* Unified slider bar */}
        <div className="flex items-center gap-3 max-w-xl">
          <div className="h-1.5 flex-1 bg-app-bg/50 rounded-full overflow-hidden border border-app-card-border/40 relative">
            <div
              className="h-full bg-app-accent transition-all duration-700 ease-out rounded-full"
              style={{ width: `${summary.percentageComplete}%` }}
            />
          </div>
          <span className="text-[10px] font-extrabold text-app-accent tracking-tighter shrink-0 w-8 text-right">
            {summary.percentageComplete}%
          </span>
        </div>
      </div>

      {/* Direct CTA button (Inline and tight) */}
      <div className="shrink-0 flex items-center justify-end relative z-10">
        <button
          id="track-study-bridge-cta-btn"
          onClick={onGoToStudy}
          className="w-full sm:w-auto px-4.5 py-2.5 rounded-xl bg-app-fg text-app-bg text-[10px] font-black uppercase tracking-wider hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Review Track</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
};
