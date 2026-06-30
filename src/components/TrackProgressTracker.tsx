import React from 'react';
import { motion } from 'motion/react';
import { Music, FileText, Sparkles, Bookmark, BookOpen } from 'lucide-react';
import { TrackProgressViewModel, TrackStationId } from '../services/trackProgressService';
import { useTranslation } from '../lib/i18n';

interface TrackProgressTrackerProps {
  viewModel: TrackProgressViewModel;
  activeTab: 'lyrics' | 'words' | 'cards' | 'analysis';
  onAction: (actionType: TrackProgressViewModel['ctaActionType']) => void;
  onTabChange: (tab: 'lyrics' | 'words' | 'cards' | 'analysis') => void;
}

export const TrackProgressTracker: React.FC<TrackProgressTrackerProps> = ({
  viewModel,
  activeTab,
  onAction,
  onTabChange,
}) => {
  const { steps } = viewModel;
  const { t } = useTranslation();

  // Render icon for each station
  const getStationIcon = (id: string, size = 14) => {
    switch (id) {
      case 'lyrics':
        return <Music size={size} />;
      case 'words':
        return <BookOpen size={size} />;
      case 'analysis':
        return <Sparkles size={size} />;
      case 'saved':
        return <Bookmark size={size} />;
      default:
        return null;
    }
  };

  const getLocalizedStepLabel = (id: TrackStationId) => {
    switch (id) {
      case 'lyrics': return 'Lyrics';
      case 'analysis': return 'Overview';
      case 'words': return 'Words';
      case 'saved': return 'Practice';
      default: return '';
    }
  };

  const displayedSteps = steps;

  // Check matching active visual tab
  const getIsViewing = (id: TrackStationId) => {
    if (id === 'lyrics') return activeTab === 'lyrics';
    if (id === 'words') return activeTab === 'words';
    if (id === 'analysis') return activeTab === 'analysis';
    if (id === 'saved') return activeTab === 'cards';
    return false;
  };

  // Calculate completed nodes for progress line
  let activeSegmentsCount = 0;
  displayedSteps.forEach((step, idx) => {
    if (step.status === 'completed') {
      activeSegmentsCount = idx;
    }
  });

  const progressPercentage = displayedSteps.length > 1
    ? (activeSegmentsCount / (displayedSteps.length - 1)) * 100
    : 0;

  return (
    <motion.div
      id="track-progress-tracker"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-xl relative select-none py-1.5 my-1 text-left sm:pl-8"
    >
      <div className="relative select-none w-full">
        {/* Horizontal Metro Line background */}
        <div 
          className="absolute top-[18px] -mt-[4px] h-1 bg-app-card-border/40 rounded-full" 
          style={{ left: '24px', right: '24px' }}
        />
        
        {/* Active colored path progress line */}
        <div
          className="absolute top-[18px] -mt-[4px] h-1 bg-app-accent transition-all duration-700 ease-out rounded-full"
          style={{ left: '24px', width: `calc(${progressPercentage}% - ${(progressPercentage / 100) * 48}px)` }}
        />

        {/* Dynamic Stepper station buttons */}
        <div className="relative z-10 flex justify-between items-start w-full">
          {displayedSteps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isViewing = getIsViewing(step.id);
            const isReady = isCompleted;

            // Construct simple tooltip
            const localizedStepName = getLocalizedStepLabel(step.id);
            const tooltipText = isViewing
              ? t('trackProgress.tooltipCurrent', { name: localizedStepName })
              : isReady
              ? t('trackProgress.tooltipView', { name: localizedStepName })
              : t('trackProgress.tooltipLocked', { name: localizedStepName });

            const handleStationClick = () => {
              if (step.id === 'lyrics') {
                onTabChange('lyrics');
              } else if (step.id === 'words') {
                onTabChange('words');
              } else if (step.id === 'analysis') {
                onTabChange('analysis');
              } else if (step.id === 'saved') {
                onTabChange('cards');
              }
            };

            return (
              <button
                key={step.id} 
                type="button"
                onClick={handleStationClick}
                className="flex flex-col items-center relative cursor-pointer focus:outline-none group w-12 shrink-0 select-none"
                id={`metro-station-${step.id}`}
                title={tooltipText}
              >
                {/* Station circle node */}
                <div className="relative h-9 w-9 z-10 flex items-center justify-center transform group-hover:scale-105 active:scale-95 transition-all duration-150">
                  {/* Solid backdrop mask to completely block the line underneath */}
                   <div className="absolute inset-0 rounded-full bg-app-bg pointer-events-none" />

                  {isViewing ? (
                    <div className="absolute inset-0 rounded-full bg-app-accent text-white border-2 border-app-accent flex items-center justify-center shadow-lg shadow-app-accent/25 z-10">
                      {getStationIcon(step.id, 14)}
                    </div>
                  ) : isReady ? (
                    <div className="absolute inset-0 rounded-full bg-app-card border-2 border-app-accent/40 text-app-accent flex items-center justify-center shadow-sm group-hover:border-app-accent transition-all z-10 overflow-hidden">
                      {/* Subtle hover blend container to avoid transparency issues */}
                      <div className="absolute inset-0 bg-app-accent/[0.04] group-hover:bg-app-accent/[0.08] transition-colors pointer-events-none" />
                      <span className="relative z-10 flex items-center justify-center">
                        {getStationIcon(step.id, 14)}
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 rounded-full bg-app-bg border border-app-card-border/50 flex items-center justify-center text-app-muted/65 group-hover:border-app-card-border/85 group-hover:text-app-fg transition-all z-10">
                      <span className="opacity-60 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {getStationIcon(step.id, 13)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Under-label */}
                <div className="mt-2 text-center flex flex-col items-center w-max max-w-[80px]">
                  <span
                    className={`block uppercase tracking-wider transition-all duration-200 ${
                      isViewing
                        ? 'text-[11px] text-app-accent font-black scale-105'
                        : isReady
                        ? 'text-[9px] text-app-fg opacity-85 font-bold group-hover:opacity-100 group-hover:text-app-accent'
                        : 'text-[9px] text-app-muted opacity-50 font-medium group-hover:text-app-fg group-hover:opacity-75'
                    }`}
                  >
                    {localizedStepName}
                  </span>
                  
                  {/* Small static indicator line instead of bouncing/blinking dot */}
                  {isViewing && (
                    <span className="h-0.5 w-3 rounded-full bg-app-accent mt-0.5" />
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
