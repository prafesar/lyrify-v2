import React from 'react';
import { motion } from 'motion/react';
import { Music, FileText, Sparkles, Bookmark, Brain } from 'lucide-react';
import { TrackProgressViewModel, TrackStationId } from '../services/trackProgressService';

interface TrackProgressTrackerProps {
  viewModel: TrackProgressViewModel;
  activeTab: 'preview' | 'lyrics' | 'analysis';
  onAction: (actionType: TrackProgressViewModel['ctaActionType']) => void;
  onTabChange: (tab: 'preview' | 'lyrics' | 'analysis') => void;
}

export const TrackProgressTracker: React.FC<TrackProgressTrackerProps> = ({
  viewModel,
  activeTab,
  onAction,
  onTabChange,
}) => {
  const { steps } = viewModel;

  // Render icon for each station
  const getStationIcon = (id: string, size = 14) => {
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

  // Determine if Analysis is completed
  const isAnalysisCompleted = steps.find(s => s.id === 'analysis')?.status === 'completed';

  // Filter out the 'analysis' station if completed to prevent duplicates with 'saved' (Cards)
  const displayedSteps = isAnalysisCompleted 
    ? steps.filter(s => s.id !== 'analysis') 
    : steps;

  // Calculate active segments count
  let activeSegmentsCount = 0;
  displayedSteps.forEach((step, idx) => {
    if (step.status === 'completed' && idx > 0) {
      activeSegmentsCount = idx;
    }
  });

  // Calculate pixel-perfect dynamic offsets so progress line anchors to actual station node centers
  // With buttons having fixed w-12 (48px), centers are precisely 24px from left/right bounds of each button slot
  const progressPercentage = displayedSteps.length > 1
    ? (activeSegmentsCount / (displayedSteps.length - 1)) * 100
    : 0;

  // Check matching active visual tab
  const getIsViewing = (id: TrackStationId) => {
    if (id === 'opened') return activeTab === 'preview';
    if (id === 'lyrics') return activeTab === 'lyrics';
    if (id === 'analysis') return activeTab === 'analysis';
    if (id === 'saved') return activeTab === 'analysis';
    return false;
  };

  return (
    <motion.div
      id="track-progress-tracker"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-xl relative select-none py-1.5 my-1 text-left sm:pl-8"
    >
      {/* Metro Line visual tracker with perfect vertical alignment */}
      <div className="relative select-none w-full">
        
        {/* Horizontal Metro Line background with dynamic end anchoring at vertical center (y = 18px) */}
        <div 
          className="absolute top-[18px] -mt-[4px] h-1 bg-app-card-border/60 rounded-full" 
          style={{ left: '24px', right: '24px' }}
        />
        
        {/* Active colored path progress line tracking center-to-center */}
        <div
          className="absolute top-[18px] -mt-[4px] h-1 bg-app-accent transition-all duration-700 ease-out rounded-full"
          style={{ left: '24px', width: `calc(${progressPercentage}% - ${(progressPercentage / 100) * 48}px)` }}
        />

        {/* Dynamic Stepper station buttons (aligned perfectly top-start) */}
        <div className="relative flex justify-between items-start w-full">
          {displayedSteps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isUpcoming = step.status === 'upcoming';
            const isViewing = getIsViewing(step.id);

            // Construct localized informative tooltip helper description for native hover
            const tooltipText = isCurrent 
              ? `${step.label} — ${viewModel.statusText}`
              : isCompleted
              ? `${step.label} (click to navigate)`
              : `${step.label} (upcoming stage)`;

            const handleStationClick = () => {
              if (step.id === 'opened') {
                onTabChange('preview');
              } else if (step.id === 'lyrics') {
                if (isCompleted || isCurrent) {
                  onTabChange('lyrics');
                } else {
                  onAction('find_lyrics');
                }
              } else if (step.id === 'analysis') {
                if (isCompleted || isCurrent) {
                  onTabChange('analysis');
                } else {
                  onAction('generate_analysis');
                }
              } else if (step.id === 'saved') {
                onTabChange('analysis');
                if (isCurrent) {
                  onAction('save_phrase');
                }
              } else if (step.id === 'review') {
                if (isCompleted) {
                  onAction('review_again');
                } else {
                  onAction('go_to_study');
                }
              }
            };

            return (
              <button
                key={step.id} 
                type="button"
                onClick={handleStationClick}
                className="flex flex-col items-center relative cursor-pointer focus:outline-none group w-12 shrink-0 select-none"
                id={`metro-station-${step.id}`}
              >
                {/* Elegant Custom Hover Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-1 duration-150">
                  <div className="bg-app-fg text-app-bg text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap leading-tight border border-app-card-border/10">
                    {tooltipText}
                  </div>
                  <div className="w-2 h-2 bg-app-fg rotate-45 -mt-1 border-r border-b border-app-card-border/10" />
                </div>

                {/* Station circle node (strictly h-9 (36px) & centered) */}
                <div className="relative h-9 w-9 z-10 flex items-center justify-center transform group-hover:scale-105 active:scale-95 transition-all duration-150">
                  
                  {/* Glowing active viewing tab indicator halo */}
                  {isViewing && (
                    <span className="absolute -inset-1 rounded-full ring-2 ring-app-accent bg-app-accent/5 shadow-[0_0_12px_rgba(var(--accent-rgb),0.3)] animate-pulse" />
                  )}

                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`absolute inset-0 rounded-full flex items-center justify-center shadow-md border ${
                        isViewing 
                          ? 'bg-app-accent text-white border-app-accent' 
                          : 'bg-app-accent/90 text-white border-app-accent/90 group-hover:bg-app-accent'
                      }`}
                    >
                      {getStationIcon(step.id, 14)}
                    </motion.div>
                  )}

                  {isCurrent && (
                    <>
                      {/* Pulse ring decoration to guide action */}
                      <span className="absolute -inset-1.5 bg-app-accent/20 rounded-full animate-ping pointer-events-none" />
                      <div className="absolute inset-0 bg-app-card border-2 border-app-accent rounded-full flex items-center justify-center shadow-lg shadow-app-accent/10 group-hover:bg-app-accent/5">
                        <span className="text-app-accent font-bold">
                          {getStationIcon(step.id, 14)}
                        </span>
                      </div>
                    </>
                  )}

                  {isUpcoming && (
                    <div className="absolute inset-0.5 rounded-full bg-app-bg border border-app-card-border flex items-center justify-center text-app-muted group-hover:border-app-accent/70 group-hover:text-app-fg transition-colors">
                      <span className="scale-[0.85] opacity-60 group-hover:opacity-100 transition-opacity">
                        {getStationIcon(step.id, 13)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Under-label with responsive scaling & viewing accent */}
                <div className="mt-2 text-center flex flex-col items-center w-max max-w-[80px]">
                  <span
                    className={`block uppercase tracking-wider transition-all duration-200 ${
                      isViewing
                        ? 'text-[11px] text-app-accent font-black scale-105'
                        : isCurrent
                        ? 'text-[10px] text-app-fg font-black group-hover:text-app-accent'
                        : isCompleted
                        ? 'text-[9px] text-app-fg opacity-80 font-bold group-hover:opacity-100'
                        : 'text-[9px] text-app-muted opacity-50 font-medium group-hover:text-app-fg group-hover:opacity-70'
                    }`}
                  >
                    {step.label}
                  </span>
                  
                  {/* Subtle active status dot */}
                  {isViewing ? (
                    <span className="h-1 w-1 rounded-full bg-app-accent mt-0.5 animate-bounce" />
                  ) : isCurrent ? (
                    <span className="text-[8px] font-bold block mt-0.5 leading-none text-app-accent opacity-90 animate-pulse">
                      Active
                    </span>
                  ) : (
                    <span className="h-1 w-1 bg-transparent mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
