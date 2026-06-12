import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, Languages, Globe, GraduationCap, Headphones } from 'lucide-react';
import { type OnboardingDemoTrack } from '../services/onboardingService';

interface OnboardingHeroProps {
  onSelectTrack?: (track: OnboardingDemoTrack) => void;
  onDismiss: () => void;
}

export const OnboardingHero: React.FC<OnboardingHeroProps> = ({ onDismiss }) => {
  return (
    <motion.div
      id="onboarding-hero-block"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10 w-full bg-app-card border border-app-card-border rounded-[2.5rem] p-8 md:p-12 shadow-app-card relative overflow-hidden"
    >
      {/* Decorative gradient spots for ambient landing Vibe */}
      <div 
        className="absolute top-0 right-0 w-[450px] h-[450px] bg-radial from-app-accent/12 via-app-accent/3 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none blur-[60px] animate-pulse" 
        style={{ animationDuration: '6s' }} 
      />
      <div 
        className="absolute -bottom-24 -left-12 w-[350px] h-[350px] bg-radial from-violet-500/8 to-transparent rounded-full pointer-events-none blur-[50px]" 
      />

      {/* Close button with premium look */}
      <button
        id="onboarding-dismiss-btn"
        onClick={onDismiss}
        className="absolute top-6 right-6 p-2.5 text-app-muted hover:text-app-fg hover:bg-app-fg/5 rounded-2xl transition-all border border-transparent hover:border-app-card-border/60 active:scale-90 cursor-pointer z-20"
        title="Hide onboarding"
      >
        <X size={20} />
      </button>

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-app-accent/8 border border-app-accent/20 rounded-full text-app-accent text-[11px] font-black uppercase tracking-[0.2em] mb-6"
        >
          <Sparkles size={13} className="animate-pulse" />
          <span>Guest-First Language Mastery</span>
        </motion.div>

        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-3xl md:text-5xl font-black text-app-fg tracking-tight leading-[1.1] mb-4 max-w-3xl"
        >
          Master Languages Through <span className="text-app-accent relative inline-block">Songs<span className="absolute left-0 right-0 bottom-1 h-1.5 bg-app-accent/15 rounded-full" /></span>
        </motion.h1>
        
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-sm md:text-base text-app-muted font-sans leading-relaxed max-w-2xl mb-10 opacity-90"
        >
          Welcome to <span className="font-bold text-app-fg text-app-accent">CantoLex</span>! We believe authentic lyrics are the absolute best way to absorb natural accent, slang, and grammar. Analyse nuances, study curated explanations, and start singing. Everything is fully functional instantly as a guest.
        </motion.p>

        {/* Highlighted Value Cards Grid (USP) - Larger, More Attractive Design */}
        <motion.div 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10 text-left"
        >
          {/* Card 1 */}
          <div className="flex flex-col items-center text-center p-6 md:p-8 rounded-[2rem] bg-app-bg/40 border border-app-card-border/80 hover:border-app-accent/20 hover:bg-app-card/85 transition-all duration-300 hover:scale-[1.03] group shadow-sm hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300 shadow-inner">
              <Languages size={24} className="text-app-accent" />
            </div>
            <h3 className="font-extrabold text-sm md:text-base text-app-fg mb-2 leading-tight group-hover:text-app-accent transition-colors">
              Deep Lyric Translations
            </h3>
            <p className="text-xs md:text-sm text-app-muted leading-relaxed opacity-90">
              Go beyond cold word-by-word dictionaries. Discover slang, figurative meanings, metaphors, and native cultural contexts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col items-center text-center p-6 md:p-8 rounded-[2rem] bg-app-bg/40 border border-app-card-border/80 hover:border-app-accent/20 hover:bg-app-card/85 transition-all duration-300 hover:scale-[1.03] group shadow-sm hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300 shadow-inner">
              <GraduationCap size={24} className="text-app-accent" />
            </div>
            <h3 className="font-extrabold text-sm md:text-base text-app-fg mb-2 leading-tight group-hover:text-app-accent transition-colors">
              Interactive Flashcards
            </h3>
            <p className="text-xs md:text-sm text-app-muted leading-relaxed opacity-90">
              Save catchy idioms or grammatical lines straight into your premium 5-box Spaced Repetition deck. Review locally anytime.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col items-center text-center p-6 md:p-8 rounded-[2rem] bg-app-bg/40 border border-app-card-border/80 hover:border-app-accent/20 hover:bg-app-card/85 transition-all duration-300 hover:scale-[1.03] group shadow-sm hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-app-accent/10 text-app-accent flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300 shadow-inner">
              <Headphones size={24} className="text-app-accent" />
            </div>
            <h3 className="font-extrabold text-sm md:text-base text-app-fg mb-2 leading-tight group-hover:text-app-accent transition-colors">
              Mic Shadowing & Audios
            </h3>
            <p className="text-xs md:text-sm text-app-muted leading-relaxed opacity-90">
              Unlock targeted practice loops. Train pronunciation using your mic, listen to real-time snippets, and build true mouth-muscle memory.
            </p>
          </div>
        </motion.div>

        {/* Premium "Let's dance" closed action CTA */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="flex justify-center w-full"
        >
          <button
            onClick={onDismiss}
            className="px-8 py-4 bg-app-accent hover:bg-app-accent/95 hover:scale-[1.03] active:scale-[0.98] text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-app-accent/15 hover:shadow-app-accent/25 transition-all flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <span>Let's dance</span>
            <span className="transition-transform group-hover:rotate-12 group-hover:scale-115 duration-300 text-lg">💃</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};
