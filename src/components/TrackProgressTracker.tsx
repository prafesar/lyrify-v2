import React from 'react';
import { motion } from 'motion/react';
import { Music, FileText, Sparkles, Bookmark, Brain, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { TrackProgressViewModel, TrackStation } from '../services/trackProgressService';

interface TrackProgressTrackerProps {
  viewModel: TrackProgressViewModel;
  onAction: (actionType: TrackProgressViewModel['ctaActionType']) => void;
}

export const TrackProgressTracker: React.FC<TrackProgressTrackerProps> = ({
  viewModel,
  onAction,
}) => {
  const { steps, currentStepId, statusText, ctaLabel, ctaActionType, motivationalMessage } = viewModel;

  // Tiny elegant helper to render icon for each station
  const getStationIcon = (id: string, size = 12) => {
    switch (id) {
      case 'opened':
        return <Music size={size} />;
      case 'lyrics':
        return <FileText size={size} />;
      case 'analysis':
        return <Sparkles size={size} />;
      case 'saved':
        return <Bookmark size={size} />;
      case 'review':
        return <Brain size={size} />;
      default:
        return null;
    }
  };

  // Find index of the current or first active node to animate progress width
  const currentIdx = steps.findIndex(s => s.id === currentStepId);
  // Calculate progress width percentage. There are 4 spacing segments between 5 points.
  // Segment indices: 0 1 2 3
  // If we are at index `currentIdx`, the progress bar should extend up to `currentIdx` (or currentIdx - 1 status is completed)
  let activeSegmentsCount = 0;
  steps.forEach((step, idx) => {
    if (step.status === 'completed' && idx > 0) {
      activeSegmentsCount = idx;
    }
  });

  const progressPercentage = (activeSegmentsCount / (steps.length - 1)) * 100;

  return (
    <motion.div
      id="track-progress-tracker"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full bg-app-card border border-app-card-border rounded-3xl p-5 shadow-app-card relative overflow-hidden flex flex-col gap-6"
    >
      {/* Visual decorative ambient line glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-app-accent/20 via-app-accent to-transparent" />

      {/* Header segment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-app-accent">
              Metro Progression
            </span>
            <span className="h-1 w-1 rounded-full bg-app-accent/50" />
            <span className="text-[10px] font-extrabold text-app-muted uppercase tracking-wider">
              Learning Route
            </span>
          </div>
          <h3 className="text-sm font-black text-app-fg tracking-tight">
            Track Progress Journey
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-bold text-app-muted block">
            Station Status
          </span>
          <span className="text-xs font-extrabold text-app-fg block capitalize">
            {currentStepId === 'review' && steps.every(s => s.status === 'completed')
              ? 'Loop Completed!'
              : `${currentStepId} in progress`}
          </span>
        </div>
      </div>

      {/* Metro Line visual tracker */}
      <div className="relative py-4 px-2 select-none">
        
        {/* Horizontal Metro Line background */}
        <div className="absolute top-[28px] left-6 right-6 h-1 bg-app-card-border/60 rounded-full" />
        
        {/* Active colored path progress line */}
        <div
          className="absolute top-[28px] left-[1.5rem] h-1 bg-app-accent transition-all duration-700 ease-out rounded-full"
          style={{ width: `calc(${progressPercentage}% - 0px)` }}
        />

        {/* 5 Stepper stations */}
        <div className="relative flex justify-between items-center w-full">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isUpcoming = step.status === 'upcoming';

            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center relative flex-1"
                id={`metro-station-${step.id}`}
              >
                {/* Station circle node */}
                <div className="relative h-8 w-8 z-10 flex items-center justify-center">
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 bg-app-accent text-white rounded-full flex items-center justify-center shadow-md border border-app-accent"
                    >
                      <CheckCircle size={14} className="stroke-[3]" />
                    </motion.div>
                  )}

                  {isCurrent && (
                    <>
                      {/* Pulse ring decoration */}
                      <span className="absolute -inset-1.5 bg-app-accent/20 rounded-full animate-ping pointer-events-none" />
                      <div className="absolute inset-0 bg-app-card border-2 border-app-accent rounded-full flex items-center justify-center shadow-lg shadow-app-accent/10">
                        <span className="text-app-accent font-bold">
                          {getStationIcon(step.id, 13)}
                        </span>
                      </div>
                    </>
                  )}

                  {isUpcoming && (
                    <div className="absolute h-6 w-6 rounded-full bg-app-bg border border-app-card-border flex items-center justify-center text-app-muted">
                      <span className="scale-75 opacity-60">
                        {getStationIcon(step.id, 10)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Under-label with responsive scaling */}
                <div className="mt-3 text-center">
                  <span
                    className={`block font-black uppercase tracking-wider transition-all duration-200 ${
                      isCurrent
                        ? 'text-[10px] text-app-fg scale-105'
                        : isCompleted
                        ? 'text-[9px] text-app-fg opacity-80'
                        : 'text-[9px] text-app-muted opacity-50'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className={`text-[8px] font-bold block mt-0.5 leading-none transition-opacity ${
                    isCurrent ? 'text-app-accent opacity-100' : 'opacity-0'
                  }`}>
                    Active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended CTA bar */}
      <div className="bg-app-bg/50 border border-app-card-border/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-1">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 bg-app-card border border-app-card-border rounded-xl shrink-0 mt-0.5 shadow-sm text-app-accent">
            {getStationIcon(currentStepId, 16) || <Music size={16} />}
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-app-accent">
              RECOMMENDED NEXT STATION
            </h4>
            <p className="text-xs font-black text-app-fg leading-tight">
              {statusText}
            </p>
            {motivationalMessage && (
              <p className="text-[10px] text-app-muted font-bold">
                {motivationalMessage}
              </p>
            )}
          </div>
        </div>

        {/* Unified Station Navigation CTA button */}
        <button
          id="metro-route-cta-btn"
          onClick={() => onAction(ctaActionType)}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-app-fg text-app-bg text-xs font-black uppercase tracking-wider hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
        >
          {ctaActionType === 'review_again' ? <CheckCircle size={12} /> : <Play size={12} />}
          <span>{ctaLabel}</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
};
