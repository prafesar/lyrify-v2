import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, ChevronRight, Search, Globe, Music, ChevronDown, Check, X, MoreVertical, Disc } from 'lucide-react';
import { Track, TrackLyricsData } from '../services/musicService';
import { ResumeViewModel } from '../services/resumeService';
import { DailyProgressSummary } from '../application';
import { shouldShowOnboarding } from '../services/onboardingService';
import { SUPPORTED_LANGUAGES } from '../lib/languages';
import { OnboardingHero } from './OnboardingHero';
import { useTranslation } from '../lib/i18n';

interface TracksHomeShellProps {
  onboardingCompleted: boolean;
  recentTracks: Track[];
  onSelectOnboardingTrack: (track: Track) => void;
  onDismissOnboarding: () => void;
  resumeViewModel: ResumeViewModel | null;
  onTrackSelect: (track: Track) => void;
  onNavigateToStudy: () => void;
  dailyProgressSummary: DailyProgressSummary;
  currentTrack: TrackLyricsData | null;
  onNavigateToLyrics: () => void;
  dynamicTracks: Track[];
  isLoadingTracks: boolean;
  onTrackMenuOpen?: (track: Track) => void;
}

const renderDifficultyIndicator = (difficulty?: string, hideLabel: boolean = false, tKey?: (key: string) => string) => {
  if (!difficulty) return null;
  
  let bars: { color: string; active: boolean }[] = [];
  const diff = difficulty.toLowerCase();
  
  if (diff === 'beginner' || diff === 'новичок') {
    bars = [{ color: 'bg-green-500', active: true }, { color: 'bg-zinc-700', active: false }, { color: 'bg-zinc-700', active: false }];
  } else if (diff === 'intermediate' || diff === 'средний') {
    bars = [{ color: 'bg-yellow-500', active: true }, { color: 'bg-yellow-500', active: true }, { color: 'bg-zinc-700', active: false }];
  } else if (diff === 'advanced' || diff === 'продвинутый') {
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
  onTrackMenuOpen,
}) => {
  const [expandedSection, setExpandedSection] = useState<'recent' | 'community' | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isLangPanelOpen, setIsLangPanelOpen] = useState<boolean>(false);
  const [communityDifficultyFilter, setCommunityDifficultyFilter] = useState<string>('All');
  const { t, uiLanguage } = useTranslation();

  const toggleLang = (langName: string) => {
    setSelectedLanguages(prev => 
      prev.includes(langName)
        ? prev.filter(l => l !== langName)
        : [...prev, langName]
    );
  };

  const clearLanguages = () => {
    setSelectedLanguages([]);
  };

  const isLangSelected = (langName: string) => selectedLanguages.includes(langName);

  // Filter community tracks
  const filteredCommunityTracks = dynamicTracks.filter(t => {
    const langMatch = selectedLanguages.length === 0 || selectedLanguages.includes(t.sourceLanguage);
    const diffMatch = communityDifficultyFilter === "All" || (t.difficulty && t.difficulty.toLowerCase().includes(communityDifficultyFilter.toLowerCase()));
    return langMatch && diffMatch;
  });

  return (
    <div className="mt-2 pb-12 w-full" id="tracks-home-composition-shell">
      {shouldShowOnboarding(recentTracks.length) && !onboardingCompleted && (
        <OnboardingHero
          onSelectTrack={onSelectOnboardingTrack}
          onDismiss={onDismissOnboarding}
        />
      )}

      <AnimatePresence mode="wait">
        {expandedSection === 'recent' ? (
          /* EXPANDED RECENT VIEW (PAGE WITH ALL RECENT TRACKS) */
          <motion.div
            key="expanded-recent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExpandedSection(null)}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-app-muted hover:text-app-fg transition-colors cursor-pointer"
              >
                <X size={15} />
                <span>{t('tracks.backToHome')}</span>
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <div>
                <h1 className="text-xl font-black text-app-fg tracking-tight">
                  {t('tracks.recentTracks')}
                </h1>
                <p className="text-xs text-app-muted">
                  {t('tracks.recentTracksDesc')}
                </p>
              </div>
              <span className="text-[10px] font-black text-app-muted uppercase bg-app-fg/5 px-2.5 py-1 rounded-lg">
                {recentTracks.length}
              </span>
            </div>

            <div className="space-y-3.5">
              {recentTracks.length > 0 ? (
                recentTracks.map((track) => (
                  <div
                    key={`recent-full-${track.id}`}
                    onClick={() => onTrackSelect(track)}
                    className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80 group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          className="w-16 h-16 rounded-2xl object-cover shadow-lg shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-app-fg/5 flex items-center justify-center text-app-fg/20 shrink-0 border border-app-card-border">
                          <Disc size={24} />
                        </div>
                      )}
                      <div className="text-left min-w-0 flex-1">
                        <p className="font-bold text-app-fg leading-tight mb-0.5 truncate group-hover:text-app-accent transition-colors">
                          {track.title}
                        </p>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-app-muted truncate">
                            {track.artist}
                          </p>
                          {track.difficulty && (
                            <div className="shrink-0 flex items-center">
                              {renderDifficultyIndicator(track.difficulty, true, t)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onTrackMenuOpen?.(track)}
                        className="p-2 text-app-muted hover:text-app-fg hover:bg-app-fg/5 rounded-full transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
                  <Search size={40} className="mx-auto mb-4 opacity-20" />
                  {t('tracks.noRecentTracksShort')}
                </div>
              )}
            </div>
          </motion.div>
        ) : expandedSection === 'community' ? (
          /* EXPANDED COMMUNITY VIEW (PAGE WITH ALL COMMUNITY TRACKS & FILTERS) */
          <motion.div
            key="expanded-community"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExpandedSection(null)}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-app-muted hover:text-app-fg transition-colors cursor-pointer"
              >
                <X size={15} />
                <span>{t('tracks.backToHome')}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-black text-app-fg tracking-tight">
                  {t('tracks.communityTracks')}
                </h1>
                <p className="text-xs text-app-muted">
                  {t('tracks.communityTracksDesc')}
                </p>
              </div>

              {/* Filters shown elegantly in the detailed page */}
              <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-app-muted uppercase tracking-widest leading-none">
                    {t('tracks.languageLabel')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLangPanelOpen(!isLangPanelOpen)}
                    className={`bg-app-card border rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-app-fg hover:border-app-accent hover:text-app-accent active:scale-95 transition-all flex items-center gap-1 cursor-pointer ${
                      selectedLanguages.length > 0 
                        ? 'border-app-accent/65 bg-app-accent/5 font-extrabold text-app-accent' 
                        : 'border-app-card-border'
                    }`}
                  >
                    <span>
                      {selectedLanguages.length === 0 
                        ? t('common.all') 
                        : selectedLanguages.length === 1 
                        ? selectedLanguages[0] 
                        : t('tracks.countSelected', { count: selectedLanguages.length })}
                    </span>
                    <ChevronDown 
                      size={12} 
                      className={`opacity-60 transition-transform duration-200 ${isLangPanelOpen ? 'rotate-180 text-app-accent' : ''}`} 
                    />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-app-muted uppercase tracking-widest leading-none">
                    {t('tracks.difficultyLabel')}
                  </span>
                  <select 
                    value={communityDifficultyFilter}
                    onChange={(e) => setCommunityDifficultyFilter(e.target.value)}
                    className="bg-app-card border border-app-card-border rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-app-fg outline-none focus:ring-1 focus:ring-accent transition-all appearance-none cursor-pointer text-center"
                  >
                    <option value="All">{t('common.all')}</option>
                    <option value="beginner">{t('tracks.difficultyBeginner')}</option>
                    <option value="intermediate">{t('tracks.difficultyIntermediate')}</option>
                    <option value="advanced">{t('tracks.difficultyAdvanced')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Expandable Language Drawer in Detailed Page */}
            {isLangPanelOpen && (
              <div className="w-full bg-app-card border border-app-card-border rounded-3xl p-4 md:p-5 flex flex-col gap-3 select-none">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-app-muted uppercase tracking-widest leading-none">
                    {t('tracks.filterByLanguages')}
                  </span>
                  {selectedLanguages.length > 0 && (
                    <button
                      type="button"
                      onClick={clearLanguages}
                      className="text-[9.5px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <X size={11} strokeWidth={2.5} />
                      {t('tracks.clearSelection', { count: selectedLanguages.length })}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const active = isLangSelected(lang.name);
                    return (
                      <button
                        key={lang.name}
                        type="button"
                        onClick={() => toggleLang(lang.name)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-tight transition-all flex items-center gap-1 border cursor-pointer select-none ${
                          active
                            ? 'bg-app-accent text-white border-app-accent shadow-sm'
                            : 'bg-app-bg text-app-muted border-app-card-border hover:bg-app-fg/5 hover:text-app-fg hover:border-app-card-border/85'
                        }`}
                      >
                        {active && <Check size={10} strokeWidth={3} />}
                        <span>{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              {isLoadingTracks ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-full h-24 rounded-3xl bg-app-card border border-app-card-border animate-pulse flex items-center px-4 gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-app-fg/10 shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/2 bg-app-fg/10 rounded" />
                        <div className="h-3 w-1/3 bg-app-fg/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCommunityTracks.length > 0 ? (
                filteredCommunityTracks.map((track) => (
                  <div
                    key={`comm-full-${track.id}`}
                    onClick={() => onTrackSelect(track)}
                    className="w-full flex items-center justify-between p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card active:scale-[0.98] transition-all hover:bg-opacity-80 group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          className="w-16 h-16 rounded-2xl object-cover shadow-lg shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-app-fg/5 flex items-center justify-center text-app-fg/20 shrink-0 border border-app-card-border">
                          <Disc size={24} />
                        </div>
                      )}
                      <div className="text-left min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-app-fg leading-tight truncate group-hover:text-app-accent transition-colors">
                            {track.title}
                          </p>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-app-fg/10 text-app-fg opacity-50 tracking-tighter shrink-0">
                            {track.sourceLanguage}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-app-muted truncate">
                            {track.artist}
                          </p>
                          {track.difficulty && (
                            <div className="flex items-center shrink-0">
                              {renderDifficultyIndicator(track.difficulty, true, t)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onTrackMenuOpen?.(track)}
                        className="p-2 text-app-muted hover:text-app-fg hover:bg-app-fg/5 rounded-full transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
                  <Music size={40} className="mx-auto mb-4 opacity-20" />
                  {t('tracks.noTracksFoundMatching')}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* DEFAULT MAIN DASHBOARD VIEW (BOTH RECENT & COMMUNITY SHOWN SEPARATELY WITH 3X3 SCROLL) */
          <motion.div
            key="home-blocks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
            {/* BLOCK 1: COMMUNITY TRACKS */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setExpandedSection('community')}
                className="flex items-center gap-1.5 text-app-fg hover:text-app-accent group select-none text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-app-accent" />
                  <h2 className="text-sm font-black uppercase tracking-[0.13em] leading-none">
                    {t('tracks.community')}
                  </h2>
                </div>
                <ChevronRight 
                  size={16} 
                  className="text-app-fg opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" 
                />
              </button>

              {isLoadingTracks ? (
                <div className="grid grid-rows-3 grid-flow-col auto-cols-[85%] sm:auto-cols-[340px] md:auto-cols-[380px] gap-x-4 gap-y-3.5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-[76px] w-full rounded-2xl bg-app-card border border-app-card-border animate-pulse flex items-center px-3 gap-3">
                      <div className="w-12 h-12 rounded-xl bg-app-fg/10 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-2/3 bg-app-fg/10 rounded" />
                        <div className="h-2.5 w-1/2 bg-app-fg/10 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCommunityTracks.length > 0 ? (
                <div className="grid grid-rows-3 grid-flow-col auto-cols-[85%] sm:auto-cols-[340px] md:auto-cols-[380px] gap-x-4 gap-y-3.5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {filteredCommunityTracks.slice(0, 9).map((track) => (
                    <div
                      key={`comm-cell-${track.id}`}
                      onClick={() => onTrackSelect(track)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-app-card border border-app-card-border shadow-sm active:scale-[0.98] transition-all hover:bg-opacity-80 group cursor-pointer snap-start h-[76px]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-app-fg/5 flex items-center justify-center text-app-fg/20 shrink-0 border border-app-card-border">
                            <Disc size={20} />
                          </div>
                         )}
                        <div className="text-left min-w-0 flex-1 leading-tight">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="font-bold text-app-fg text-[13.5px] truncate group-hover:text-app-accent transition-colors">
                              {track.title}
                            </p>
                            <span className="text-[7.5px] font-black uppercase px-1 rounded bg-app-fg/10 text-app-fg opacity-60 shrink-0">
                              {track.sourceLanguage}
                            </span>
                          </div>
                          <p className="text-xs text-app-muted truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onTrackMenuOpen?.(track)}
                          className="p-1.5 text-app-muted hover:text-app-fg rounded-full hover:bg-app-fg/5"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
                  <Music size={30} className="mx-auto mb-2 opacity-20" />
                  {t('tracks.noSongsInCommunity')}
                </div>
              )}
            </div>

            {/* BLOCK 2: RECENT TRACKS */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setExpandedSection('recent')}
                className="flex items-center gap-1.5 text-app-fg hover:text-app-accent group select-none text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <History size={16} className="text-app-accent" fill="none" />
                  <h2 className="text-sm font-black uppercase tracking-[0.13em] leading-none">
                    {t('tracks.recent')}
                  </h2>
                </div>
                <ChevronRight 
                  size={16} 
                  className="text-app-fg opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" 
                />
              </button>

              {recentTracks.length > 0 ? (
                <div className="grid grid-rows-3 grid-flow-col auto-cols-[85%] sm:auto-cols-[340px] md:auto-cols-[380px] gap-x-4 gap-y-3.5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                  {recentTracks.slice(0, 9).map((track) => (
                    <div
                      key={`recent-cell-${track.id}`}
                      onClick={() => onTrackSelect(track)}
                      className="flex items-center justify-between p-3 rounded-2xl bg-app-card border border-app-card-border shadow-sm active:scale-[0.98] transition-all hover:bg-opacity-80 group cursor-pointer snap-start h-[76px]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-app-fg/5 flex items-center justify-center text-app-fg/20 shrink-0 border border-app-card-border">
                            <Disc size={20} />
                          </div>
                        )}
                        <div className="text-left min-w-0 flex-1 leading-tight">
                          <p className="font-bold text-app-fg text-[13.5px] truncate group-hover:text-app-accent transition-colors mb-0.5">
                            {track.title}
                          </p>
                          <p className="text-xs text-app-muted truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onTrackMenuOpen?.(track)}
                          className="p-1.5 text-app-muted hover:text-app-fg rounded-full hover:bg-app-fg/5"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-6 rounded-3xl border border-dashed border-app-card-border opacity-40 italic bg-app-card/30">
                  <Search size={30} className="mx-auto mb-2 opacity-20" />
                  {t('tracks.noRecentTracks')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
