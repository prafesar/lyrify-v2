import React from 'react';
import { motion } from 'motion/react';
import { Target, Search, Bookmark, Brain, ArrowRight, Play, Trophy, ChevronDown } from 'lucide-react';
import { DailyProgressSummary } from '../services/dailyTrackerService';

interface DailyProgressBlockProps {
  summary: DailyProgressSummary;
  onNavigateToExplore: () => void;
  onNavigateToStudy: () => void;
  onNavigateToCurrentTrack: () => void;
  hasCurrentTrack: boolean;
  mode?: 'all' | 'next-step' | 'details';
}

export const DailyProgressBlock: React.FC<DailyProgressBlockProps> = ({
  summary,
  onNavigateToExplore,
  onNavigateToStudy,
  onNavigateToCurrentTrack,
  hasCurrentTrack,
  mode = 'all',
}) => {
  const {
    tracksExplored,
    tracksExploredTarget,
    phrasesSaved,
    phrasesSavedTarget,
    reviewsCompleted,
    reviewsCompletedTarget,
    overallProgressPercentage,
    recommendedNextAction,
    isGoalAchieved,
  } = summary;

  const [isCollapsed, setIsCollapsed] = React.useState(isGoalAchieved);

  // Sync state if goal is newly achieved during the session
  const lastGoalAchievedRef = React.useRef(isGoalAchieved);
  React.useEffect(() => {
    if (isGoalAchieved && !lastGoalAchievedRef.current) {
      setIsCollapsed(true);
    }
    lastGoalAchievedRef.current = isGoalAchieved;
  }, [isGoalAchieved]);

  // Render the recommendation prompt
  const renderRecommendation = () => {
    switch (recommendedNextAction) {
      case 'explore':
        return {
          title: 'Explore a Track',
          desc: 'Search for a song and load its lyrics to start today’s journey.',
          buttonText: 'Find Songs',
          icon: <Search size={18} className="text-app-accent" />,
          action: onNavigateToExplore,
        };
      case 'save':
        return {
          title: 'Save New Phrases',
          desc: hasCurrentTrack 
            ? 'Open lyrics view and save at least 3 phrases to practice.' 
            : 'Explore any track and bookmark words or phrases.',
          buttonText: hasCurrentTrack ? 'Go to Lyrics' : 'Explore Tracks',
          icon: <Bookmark size={18} className="text-amber-500" />,
          action: hasCurrentTrack ? onNavigateToCurrentTrack : onNavigateToExplore,
        };
      case 'review':
        return {
          title: 'Review Cards',
          desc: 'Train with your saved flashcards in the Study Hub.',
          buttonText: 'Study Hub',
          icon: <Brain size={18} className="text-app-accent" />,
          action: onNavigateToStudy,
        };
      case 'done':
      default:
        return {
          title: 'Daily Goal Complete!',
          desc: 'Outstanding! You have completed all of your training targets for today.',
          buttonText: 'Keep Studying',
          icon: <Trophy size={18} className="text-app-accent animate-bounce" />,
          action: onNavigateToStudy,
        };
    }
  };

  const rec = renderRecommendation();

  // Render station icon with custom mapping
  const getStationIcon = (id: string, size = 14) => {
    switch (id) {
      case 'start':
        return <Target size={size} />;
      case 'explore':
        return <Search size={size} />;
      case 'save':
        return <Bookmark size={size} />;
      case 'review':
        return <Brain size={size} />;
      default:
        return null;
    }
  };

  // Map progress to metro stations
  const stations = [
    {
      id: 'start',
      label: 'Start',
      status: 'completed' as const,
      subtitle: 'Ready',
      tooltip: 'Start of Day: Daily track is opened',
      action: onNavigateToExplore,
    },
    {
      id: 'explore',
      label: 'Explore',
      status: (tracksExplored >= tracksExploredTarget
        ? 'completed'
        : recommendedNextAction === 'explore'
        ? 'current'
        : 'upcoming') as 'completed' | 'current' | 'upcoming',
      subtitle: `${tracksExplored}/${tracksExploredTarget}`,
      tooltip: `Step 1: Explore Track (${tracksExplored}/${tracksExploredTarget})`,
      action: onNavigateToExplore,
    },
    {
      id: 'save',
      label: 'Save',
      status: (phrasesSaved >= phrasesSavedTarget
        ? 'completed'
        : recommendedNextAction === 'save'
        ? 'current'
        : 'upcoming') as 'completed' | 'current' | 'upcoming',
      subtitle: `${phrasesSaved}/${phrasesSavedTarget}`,
      tooltip: `Step 2: Save Phrases (${phrasesSaved}/${phrasesSavedTarget})`,
      action: hasCurrentTrack ? onNavigateToCurrentTrack : onNavigateToExplore,
    },
    {
      id: 'review',
      label: 'Review',
      status: (reviewsCompleted >= reviewsCompletedTarget
        ? 'completed'
        : recommendedNextAction === 'review'
        ? 'current'
        : 'upcoming') as 'completed' | 'current' | 'upcoming',
      subtitle: `${reviewsCompleted}/${reviewsCompletedTarget}`,
      tooltip: `Step 3: Review Cards (${reviewsCompleted}/${reviewsCompletedTarget})`,
      action: onNavigateToStudy,
    },
  ];

  // Calculate active segment line progress based on station completion
  let activeSegmentsCount = 0;
  if (tracksExplored >= tracksExploredTarget) activeSegmentsCount = 1;
  if (phrasesSaved >= phrasesSavedTarget) activeSegmentsCount = 2;
  if (reviewsCompleted >= reviewsCompletedTarget) activeSegmentsCount = 3;

  const progressPercentage = (activeSegmentsCount / (stations.length - 1)) * 100;

  return (
    <motion.div
      id={`daily-progress-summary-block${mode !== 'all' ? `-${mode}` : ''}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`w-full flex flex-col select-none text-left ${
        mode === 'all' ? 'gap-6 mb-8' : 'gap-3 mb-6'
      }`}
    >
      {/* 1. Recommended Target / Next Step / "Следующая цель" */}
      {(mode === 'all' || mode === 'next-step') && (
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-app-accent" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-app-fg">
              Next Goal
            </h3>
          </div>
          
          <div 
            onClick={rec.action}
            className="w-full group flex items-center justify-between gap-4 p-4 md:p-5 rounded-3xl cursor-pointer hover:bg-app-card/70 hover:scale-[1.002] active:scale-[0.995] transition-all bg-app-card border border-app-card-border shadow-md"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 bg-app-accent/10 rounded-2xl shrink-0 text-app-accent shadow-sm group-hover:scale-105 transition-transform">
                {isGoalAchieved ? <Trophy size={18} className="text-yellow-500 animate-pulse" /> : rec.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-app-accent block">
                  {isGoalAchieved ? 'Perfect Streak!' : 'RECOMMENDED TARGET'}
                </span>
                <span className="text-sm md:text-base font-extrabold text-app-fg leading-tight block mt-0.5 transition-colors group-hover:text-app-accent">
                  {rec.title}
                </span>
                <span className="text-xs text-app-muted leading-relaxed block mt-1 font-semibold opacity-90">
                  {rec.desc}
                </span>
              </div>
            </div>

            {/* Clean elegant right arrow icon that animates on container hover */}
            <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-app-fg/5 text-app-fg border border-app-card-border group-hover:bg-app-accent group-hover:text-white group-hover:border-app-accent transition-all duration-300">
              <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform duration-300" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Daily Milestones progress line / "Блок прогресса со следующим шагом" */}
      {(mode === 'all' || mode === 'details') && (
        <div className="space-y-3 w-full">
          {/* Interactive Toggle Header */}
          <div 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-between gap-1 w-full px-1 cursor-pointer select-none group/toggle py-1"
          >
            <div className="flex items-center gap-2">
              <Trophy size={14} className={`${isGoalAchieved ? 'text-yellow-500 animate-pulse' : 'text-app-muted'} opacity-85 group-hover/toggle:text-app-accent transition-colors`} />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-app-muted group-hover/toggle:text-app-fg transition-colors">
                Daily Milestones {isGoalAchieved && <span className="text-[9px] text-green-500 font-bold ml-1.5 uppercase tracking-wider font-sans bg-green-500/10 px-2 py-0.5 rounded-full">Completed</span>}
              </h3>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-black text-app-muted uppercase tracking-wider group-hover/toggle:text-app-fg transition-colors">
              <span>Goal Progress: <span className="text-app-accent font-extrabold">{overallProgressPercentage}%</span></span>
              <motion.span
                animate={{ rotate: isCollapsed ? 0 : 180 }}
                transition={{ duration: 0.2 }}
                className="text-app-muted group-hover/toggle:text-app-accent flex items-center shrink-0"
              >
                <ChevronDown size={14} />
              </motion.span>
            </div>
          </div>

          {/* Metro Line visual tracker representing daily goals with collapsible animation */}
          <motion.div 
            initial={false}
            animate={{ 
              height: isCollapsed ? 0 : 'auto', 
              opacity: isCollapsed ? 0 : 1,
              marginTop: isCollapsed ? 0 : 12,
              marginBottom: isCollapsed ? 0 : 4
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden w-full"
          >
            <div className="relative p-5 w-full bg-app-card/30 border border-app-card-border/50 rounded-3xl shadow-inner">
              <div className="relative h-16 w-full">
                
                {/* Horizontal Metro Line background */}
                <div 
                  className="absolute top-[18px] -mt-[4px] h-1 bg-app-card-border/60 rounded-full" 
                  style={{ left: '24px', right: '24px' }}
                />
                
                {/* Active colored path progress line */}
                <div
                  className="absolute top-[18px] -mt-[4px] h-1 bg-app-accent transition-all duration-700 ease-out rounded-full"
                  style={{ left: '24px', width: `calc(${progressPercentage}% - ${(progressPercentage / 100) * 48}px)` }}
                />

                {/* 4 Clickable Stepper stations */}
                <div className="relative flex justify-between items-center w-full">
                  {stations.map((step) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'current';
                    const isUpcoming = step.status === 'upcoming';

                    return (
                      <button
                        key={step.id} 
                        type="button"
                        onClick={step.action}
                        className="flex flex-col items-center relative cursor-pointer focus:outline-none group w-12 shrink-0 select-none"
                        id={`daily-metro-station-${step.id}`}
                      >
                        {/* Custom Elegant Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 animate-in fade-in slide-in-from-bottom-1 duration-150">
                          <div className="bg-app-fg text-app-bg text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap leading-tight border border-app-card-border/10">
                            {step.tooltip}
                          </div>
                          <div className="w-2 h-2 bg-app-fg rotate-45 -mt-1 border-r border-b border-app-card-border/10" />
                        </div>

                        {/* Station circle node (strictly h-9 (36px) & centered) */}
                        <div className="relative h-9 w-9 z-10 flex items-center justify-center transform group-hover:scale-105 active:scale-95 transition-all duration-150">
                          
                          {isCompleted && (
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 bg-app-accent text-white rounded-full flex items-center justify-center shadow-md border border-app-accent"
                            >
                              {getStationIcon(step.id, 14)}
                            </motion.div>
                          )}

                          {isCurrent && (
                            <>
                              {/* Pulse ring decoration to guide activity */}
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

                        {/* Under-labels */}
                        <div className="mt-2 text-center flex flex-col items-center w-max max-w-[80px]">
                          <span
                            className={`block uppercase tracking-wider transition-all duration-200 ${
                              isCurrent
                                ? 'text-[10px] text-app-fg scale-105 font-black group-hover:text-app-accent'
                                : isCompleted
                                ? 'text-[9px] text-app-fg opacity-80 font-bold group-hover:opacity-100'
                                : 'text-[9px] text-app-muted opacity-50 font-medium group-hover:text-app-fg group-hover:opacity-70'
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className={`text-[8px] font-black block mt-0.5 leading-none tracking-tight ${
                            isCurrent ? 'text-app-accent' : 'text-app-muted opacity-65'
                          }`}>
                            {step.subtitle}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
