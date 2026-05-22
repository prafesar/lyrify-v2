import React from 'react';
import { motion } from 'motion/react';
import { Target, Search, Bookmark, Brain, CheckCircle, ArrowRight, Play, Trophy } from 'lucide-react';
import { DailyProgressSummary } from '../services/dailyTrackerService';

interface DailyProgressBlockProps {
  summary: DailyProgressSummary;
  onNavigateToExplore: () => void;
  onNavigateToStudy: () => void;
  onNavigateToCurrentTrack: () => void;
  hasCurrentTrack: boolean;
}

export const DailyProgressBlock: React.FC<DailyProgressBlockProps> = ({
  summary,
  onNavigateToExplore,
  onNavigateToStudy,
  onNavigateToCurrentTrack,
  hasCurrentTrack,
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

  // Render the recommendation prompt
  const renderRecommendation = () => {
    switch (recommendedNextAction) {
      case 'explore':
        return {
          title: 'Explore a Track',
          desc: 'Search for a song and load its lyrics to start today’s journey.',
          buttonText: 'Find Songs',
          icon: <Search size={16} className="text-app-accent" />,
          action: onNavigateToExplore,
        };
      case 'save':
        return {
          title: 'Save New Phrases',
          desc: hasCurrentTrack 
            ? 'Open lyrics view and save at least 3 phrases to practice.' 
            : 'Explore any track and bookmark words or phrases.',
          buttonText: hasCurrentTrack ? 'Go to Lyrics' : 'Explore Tracks',
          icon: <Bookmark size={16} className="text-amber-500" />,
          action: hasCurrentTrack ? onNavigateToCurrentTrack : onNavigateToExplore,
        };
      case 'review':
        return {
          title: 'Review Cards',
          desc: 'Train with your saved flashcards in the Study Hub.',
          buttonText: 'Study Hub',
          icon: <Brain size={16} className="text-emerald-500" />,
          action: onNavigateToStudy,
        };
      case 'done':
      default:
        return {
          title: 'Daily Goal Complete!',
          desc: 'Outstanding! You have completed all of your training targets for today.',
          buttonText: 'Keep Studying',
          icon: <Trophy size={16} className="text-app-accent animate-bounce" />,
          action: onNavigateToStudy,
        };
    }
  };

  const rec = renderRecommendation();

  // Map progress to metro stations
  // Station 1: Start (always complete)
  // Station 2: Explore
  // Station 3: Save
  // Station 4: Review
  const stations = [
    {
      id: 'start',
      label: 'Start',
      status: 'completed' as const,
      subtitle: 'Ready',
      icon: <Target size={12} />,
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
      icon: <Search size={12} />,
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
      icon: <Bookmark size={12} />,
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
      icon: <Brain size={12} />,
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
      id="daily-progress-summary-block"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="w-full bg-app-card border border-app-card-border rounded-3xl p-5 shadow-app-card relative overflow-hidden flex flex-col gap-6 mb-8"
    >
      {/* Decorative colored glow line like track progress */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-transparent" />

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 shrink-0">
            <Target size={16} />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 block leading-none">
              Daily Milestones
            </span>
            <h3 className="text-xs font-bold text-app-fg tracking-tight">
              Today's Metro Goal Progress
            </h3>
          </div>
        </div>

        {/* Global Progress Tally Badge */}
        <div className="text-right">
          <span className="text-base font-black text-app-fg block leading-none">
            {overallProgressPercentage}%
          </span>
          <span className="text-[9px] text-app-muted font-bold block mt-1 uppercase tracking-wider">
            Overall Streak
          </span>
        </div>
      </div>

      {/* Metro Line visual tracker representing daily goals */}
      <div className="relative py-4 px-2 select-none">
        
        {/* Horizontal Metro Line background */}
        <div className="absolute top-[28px] left-6 right-6 h-1 bg-app-card-border/60 rounded-full" />
        
        {/* Active colored path progress line */}
        <div
          className="absolute top-[28px] left-[1.5rem] h-1 bg-emerald-500 transition-all duration-700 ease-out rounded-full"
          style={{ width: `calc(${progressPercentage}% - 0px)` }}
        />

        {/* 4 Stepper stations */}
        <div className="relative flex justify-between items-center w-full">
          {stations.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isUpcoming = step.status === 'upcoming';

            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center relative flex-1"
                id={`daily-metro-station-${step.id}`}
              >
                {/* Station circle node */}
                <div className="relative h-8 w-8 z-10 flex items-center justify-center">
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md border border-emerald-500"
                    >
                      <CheckCircle size={14} className="stroke-[3]" />
                    </motion.div>
                  )}

                  {isCurrent && (
                    <>
                      {/* Pulse ring decoration */}
                      <span className="absolute -inset-1.5 bg-emerald-500/20 rounded-full animate-ping pointer-events-none" />
                      <div className="absolute inset-0 bg-app-card border-2 border-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10">
                        <span className="text-emerald-600 font-bold">
                          {step.icon}
                        </span>
                      </div>
                    </>
                  )}

                  {isUpcoming && (
                    <div className="absolute h-6 w-6 rounded-full bg-app-bg border border-app-card-border flex items-center justify-center text-app-muted">
                      <span className="scale-75 opacity-60">
                        {step.icon}
                      </span>
                    </div>
                  )}
                </div>

                {/* Under-labels */}
                <div className="mt-3 text-center">
                  <span
                    className={`block font-black uppercase tracking-wider transition-all duration-200 ${
                      isCurrent
                        ? 'text-[10px] text-app-fg scale-105 font-black'
                        : isCompleted
                        ? 'text-[9px] text-app-fg opacity-80 font-bold'
                        : 'text-[9px] text-app-muted opacity-50 font-medium'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className={`text-[8px] font-black block mt-0.5 leading-none ${
                    isCurrent ? 'text-emerald-600' : 'text-app-muted opacity-80'
                  }`}>
                    {step.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggestion Card Banner */}
      <div className="bg-app-bg/50 border border-app-card-border/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-1">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 bg-app-card border border-app-card-border rounded-xl shrink-0 mt-0.5 shadow-sm text-emerald-600">
            {isGoalAchieved ? <Trophy size={16} className="text-yellow-500" /> : rec.icon}
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-600 select-none">
              {isGoalAchieved ? 'Perfect Streak!' : 'RECOMMENDED DAILY TARGET'}
            </h4>
            <p className="text-xs font-black text-app-fg leading-tight">
              {rec.title}
            </p>
            <p className="text-[10px] text-app-muted font-bold">
              {rec.desc}
            </p>
          </div>
        </div>

        {/* Floating CTA button to resolve action */}
        <button
          id="daily-goal-rec-btn"
          onClick={rec.action}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-app-fg text-app-bg text-[10px] font-black uppercase tracking-wider hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
        >
          {recommendedNextAction === 'done' ? <Trophy size={11} /> : <Play size={11} />}
          <span>{rec.buttonText}</span>
          <ArrowRight size={11} />
        </button>
      </div>
    </motion.div>
  );
};
