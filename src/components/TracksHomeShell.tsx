import React, { useState } from 'react';
import { motion } from 'motion/react';
import { History, ChevronRight, Search, Globe, Music } from 'lucide-react';
import { Track, TrackLyricsData } from '../services/musicService';
import { ResumeStudyViewModel } from '../services/resumeService';
import { DailyProgressSummary } from '../services/dailyTrackerService';
import { shouldShowOnboarding } from '../services/onboardingService';
import { SUPPORTED_LANGUAGES } from '../lib/languages';
import { OnboardingHero } from './OnboardingHero';

interface TracksHomeShellProps {
  onboardingCompleted: boolean;
  recentTracks: Track[];
  onSelectOnboardingTrack: (track: Track) => void;
  onDismissOnboarding: () => void;

  resumeViewModel: ResumeStudyViewModel | null;
  onTrackSelect: (track: Track) => void;
  onNavigateToStudy: () => void;

  dailyProgressSummary: DailyProgressSummary;
  currentTrack: TrackLyricsData | null;
  onNavigateToLyrics: () => void;

  dynamicTracks: Track[];
  isLoadingTracks: boolean;
}

const renderDifficultyIndicator = (difficulty?: string, hideLabel: boolean = false) => {
  if (!difficulty) return null;
  
  let bars: { color: string; active: boolean }[] = [];
  const diff = difficulty.toLowerCase();
  
  if (diff === 'beginner') {
    bars = [{ color: 'bg-green-500', active: true }, { color: 'bg-zinc-700', active: false }, { color: 'bg-zinc-700', active: false }];
  } else if (diff === 'intermediate') {
    bars = [{ color: 'bg-yellow-500', active: true }, { color: 'bg-yellow-500', active: true }, { color: 'bg-zinc-700', active: false }];
  } else if (diff === 'advanced') {
    bars = [{ color: 'bg-red-500', active: true }, { color: 'bg-red-500', active: true }, { color: 'bg-red-500', active: true }];
  } else {
    return null;
  }
  
  return (
    <div className="flex gap-1 items-center" title={`Difficulty: ${difficulty}`}>
      {bars.map((bar, idx) => (
        <div 
          key={idx} 
          className={`w-3 h-1 rounded-full ${bar.color} ${bar.active ? 'opacity-100' : 'opacity-20 shadow-sm'}`}
        />
      ))}
      {!hideLabel && (
        <span className="text-[10px] font-bold text-app-muted ml-1 opacity-60 capitalize">
          {difficulty}
        </span>
      )}
    </div>
  );
};

export const TracksHomeShell: React.FC<TracksHomeShellProps> = ({
  onboardingCompleted,
  recentTracks,
  onSelectOnboardingTrack,
  onDismissOnboarding,

  resumeViewModel,
  onTrackSelect,
  onNavigateToStudy,

  dailyProgressSummary,
  currentTrack,
  onNavigateToLyrics,

  dynamicTracks,
  isLoadingTracks,
}) => {
  const [activeLibraryTab, setActiveLibraryTab] = useState<'recent' | 'community'>('recent');
  const [communityLangFilter, setCommunityLangFilter] = useState<string>('All');
  const [communityDifficultyFilter, setCommunityDifficultyFilter] = useState<string>('All');

  return (
    <div className="mt-2 pb-12 w-full" id="tracks-home-composition-shell">
      {shouldShowOnboarding(recentTracks.length) && !onboardingCompleted && (
        <OnboardingHero
          onSelectTrack={onSelectOnboardingTrack}
          onDismiss={onDismissOnboarding}
        />
      )}

      {/* Tab Switcher and Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center p-1 bg-app-card border border-app-card-border rounded-2xl w-fit mx-auto sm:mx-0 shadow-sm">
          <button
            onClick={() => setActiveLibraryTab('recent')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              activeLibraryTab === 'recent'
                ? 'bg-app-fg text-app-bg shadow-md'
                : 'text-app-muted hover:text-app-fg'
            }`}
          >
            <History size={13} />
            <span>Recent</span>
          </button>
          <button
            onClick={() => setActiveLibraryTab('community')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              activeLibraryTab === 'community'
                ? 'bg-app-fg text-app-bg shadow-md'
                : 'text-app-muted hover:text-app-fg'
            }`}
          >
            <Globe size={13} className={activeLibraryTab === 'community' ? "animate-pulse text-app-accent" : ""} />
            <span>Community</span>
          </button>
        </div>

        {/* Filters shown elegantly only when Community tab is active */}
        {activeLibraryTab === 'community' && (
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 px-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-app-muted uppercase tracking-widest leading-none">Language:</span>
              <select 
                value={communityLangFilter}
                onChange={(e) => setCommunityLangFilter(e.target.value)}
                className="bg-app-card border border-app-card-border rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-app-fg outline-none focus:ring-1 focus:ring-accent transition-all appearance-none cursor-pointer"
              >
                <option value="All">All</option>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.name} value={lang.name}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-app-muted uppercase tracking-widest leading-none">Difficulty:</span>
              <select 
                value={communityDifficultyFilter}
                onChange={(e) => setCommunityDifficultyFilter(e.target.value)}
                className="bg-app-card border border-app-card-border rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-app-fg outline-none focus:ring-1 focus:ring-accent transition-all appearance-none cursor-pointer"
              >
                <option value="All">All</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {activeLibraryTab === 'recent' ? (
        <div className="space-y-4">
          {recentTracks.length > 0 ? recentTracks.map((track) => (
            <button
              key={`recent-${track.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTrackSelect(track);
              }}
              className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80"
            >
              <div className="flex items-center gap-4">
                <img
                  src={track.coverUrl}
                  className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                />
                <div className="text-left">
                  <p className="font-bold text-app-fg leading-tight mb-0.5">
                    {track.title}
                  </p>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-app-muted">
                      {track.artist}
                    </p>
                    {track.difficulty && (
                      <div className="shrink-0 flex items-center">
                        {renderDifficultyIndicator(track.difficulty, true)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-app-fg opacity-20 mr-2"
              />
            </button>
          )) : (
            <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
              <Search size={40} className="mx-auto mb-4 opacity-20" />
              No recent tracks yet. 
              <br />Search for a song to start exploring!
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isLoadingTracks ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-full h-24 rounded-3xl bg-app-card border border-app-card-border animate-pulse flex items-center px-4 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-app-fg/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-app-fg/10 rounded" />
                    <div className="h-3 w-1/3 bg-app-fg/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {dynamicTracks.filter(t => {
                const langMatch = communityLangFilter === "All" || t.sourceLanguage === communityLangFilter;
                const diffMatch = communityDifficultyFilter === "All" || (t.difficulty && t.difficulty.toLowerCase().includes(communityDifficultyFilter.toLowerCase()));
                return langMatch && diffMatch;
              }).length > 0 ? 
              dynamicTracks
                .filter(t => {
                  const langMatch = communityLangFilter === "All" || t.sourceLanguage === communityLangFilter;
                  const diffMatch = communityDifficultyFilter === "All" || (t.difficulty && t.difficulty.toLowerCase().includes(communityDifficultyFilter.toLowerCase()));
                  return langMatch && diffMatch;
                })
                .map((track) => (
                  <button
                    key={`comm-${track.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackSelect(track);
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={track.coverUrl}
                        className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-app-fg leading-tight">
                            {track.title}
                          </p>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-app-fg/10 text-app-fg opacity-50 tracking-tighter shrink-0">
                            {track.sourceLanguage}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-app-muted">
                            {track.artist}
                          </p>
                          {track.difficulty && (
                            <div className="flex items-center shrink-0">
                              {renderDifficultyIndicator(track.difficulty, true)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="text-app-fg opacity-20 mr-2"
                    />
                  </button>
                )) : (
                <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
                  <Music size={40} className="mx-auto mb-4 opacity-20" />
                  No tracks found matching your filters.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
