import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Music, X, Languages, Globe, GraduationCap } from 'lucide-react';
import { ONBOARDING_DEMO_TRACKS, type OnboardingDemoTrack } from '../services/onboardingService';

interface OnboardingHeroProps {
  onSelectTrack: (track: OnboardingDemoTrack) => void;
  onDismiss: () => void;
}

export const OnboardingHero: React.FC<OnboardingHeroProps> = ({ onSelectTrack, onDismiss }) => {
  return (
    <motion.div
      id="onboarding-hero-block"
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8 w-full bg-app-card border border-app-card-border rounded-3xl p-6 md:p-8 shadow-app-card relative overflow-hidden"
    >
      {/* Decorative gradient spot */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-app-accent/10 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none blur-xl" />

      {/* Dismiss Button */}
      <button
        id="onboarding-dismiss-btn"
        onClick={onDismiss}
        className="absolute top-4 right-4 p-2 text-app-muted hover:text-app-fg hover:bg-app-fg/5 rounded-full transition-all"
        title="Hide onboarding"
      >
        <X size={18} />
      </button>

      <div className="max-w-3xl relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-app-accent/10 border border-app-accent/20 rounded-full text-app-accent text-[10px] font-black uppercase tracking-widest mb-4">
          <Sparkles size={12} />
          Guest-First Onboarding
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-app-fg tracking-tight mb-3">
          Master Languages Through Music
        </h1>
        
        <p className="text-sm md:text-base text-app-muted font-sans leading-relaxed mb-6">
          Welcome to <span className="font-bold text-app-fg">CantoLex</span>! We believe songs are the absolute best way to learn accent, slang, and grammar. 
          Analyze translation nuances line-by-line, study curated grammar breakdowns, and practice lyrics shadowing. 
          Everything is fully functional as a guest without registration.
        </p>

        {/* Highlighted Value Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="flex gap-3 items-start p-4 rounded-2xl bg-app-bg/50 border border-app-card-border">
            <Languages className="text-app-accent shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-bold text-xs text-app-fg mb-1">Deep Lyric Translations</h3>
              <p className="text-[11px] text-app-muted leading-snug">Understand figurative expressions, idioms & cultural contexts.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start p-4 rounded-2xl bg-app-bg/50 border border-app-card-border">
            <GraduationCap className="text-app-accent shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-bold text-xs text-app-fg mb-1">Interactive Flashcards</h3>
              <p className="text-[11px] text-app-muted leading-snug">Save difficult phrasal structures to space-repetition decks.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start p-4 rounded-2xl bg-app-bg/50 border border-app-card-border">
            <Globe className="text-app-accent shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-bold text-xs text-app-fg mb-1">100% Client-First</h3>
              <p className="text-[11px] text-app-muted leading-snug">Build progress locally, completely free of sign-up blocks.</p>
            </div>
          </div>
        </div>

        {/* Curated CTA Selection */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-app-muted mb-4 block">
            Select a Featured Track Below to Get Started:
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {ONBOARDING_DEMO_TRACKS.map((demo) => (
              <button
                key={demo.id}
                id={`onboarding-demo-${demo.id}`}
                onClick={() => onSelectTrack(demo)}
                className="flex items-center gap-4 p-3 pr-5 bg-app-bg border border-app-card-border rounded-2xl hover:border-app-accent/30 hover:shadow-md hover:scale-[1.01] transition-all text-left group shrink-0"
              >
                <div className="relative">
                  <img
                    src={demo.coverUrl}
                    alt={demo.title}
                    className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl transition-opacity">
                    <Music size={14} className="text-white animate-pulse" />
                  </div>
                </div>
                
                <div>
                  <p className="font-bold text-sm text-app-fg group-hover:text-app-accent transition-colors">
                    {demo.title}
                  </p>
                  <p className="text-xs text-app-muted mb-1">
                    {demo.artist}
                  </p>
                  <span className="inline-block px-1.5 py-0.5 bg-app-card border border-app-card-border rounded text-[9px] uppercase tracking-wider font-extrabold text-app-muted">
                    {demo.sourceLanguage} • {demo.difficulty}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
