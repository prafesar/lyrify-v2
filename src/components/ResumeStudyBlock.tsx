import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowRight, Music, Clock, PlayCircle } from 'lucide-react';
import { ResumeViewModel } from '../services/resumeService';

interface ResumeStudyBlockProps {
  viewModel: ResumeViewModel;
  onResumeTrack: (track: any) => void;
  onResumeStudy: () => void;
}

export const ResumeStudyBlock: React.FC<ResumeStudyBlockProps> = ({
  viewModel,
  onResumeTrack,
  onResumeStudy,
}) => {
  const isStudy = viewModel.type === 'study';

  const handleClick = () => {
    if (isStudy) {
      onResumeStudy();
    } else if (viewModel.trackingTrack) {
      onResumeTrack(viewModel.trackingTrack);
    }
  };

  return (
    <motion.div
      id="resume-study-block"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={handleClick}
      className="w-full bg-app-card border border-app-card-border rounded-3xl p-4 md:p-5 shadow-md relative overflow-hidden flex items-center justify-between gap-4 mb-8 select-none cursor-pointer hover:bg-app-card/70 hover:scale-[1.002] active:scale-[0.995] transition-all group"
    >
      {/* Visual Accent glow line */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-app-accent" />

      {/* Content wrapper */}
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        {!isStudy && viewModel.trackingTrack?.coverUrl ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 mt-0.5 border border-app-card-border bg-app-card flex items-center justify-center relative">
            <img
              src={viewModel.trackingTrack.coverUrl}
              alt={viewModel.trackingTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.style.display = 'none';
                const parent = img.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.fallback-icon');
                  if (fallback) {
                    fallback.classList.remove('hidden');
                    fallback.classList.add('flex');
                  }
                }
              }}
            />
            <div className="fallback-icon hidden absolute inset-0 items-center justify-center bg-app-accent/5">
              <Music size={18} className="text-app-accent" />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-app-accent/10 rounded-2xl text-app-accent shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
            {isStudy ? <GraduationCap size={18} /> : <Music size={18} />}
          </div>
        )}

        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-app-accent leading-none">
              Continue Learning
            </span>
            <span className="flex h-1 w-1 rounded-full bg-app-accent/40" />
            <span className="text-[9px] text-app-muted font-bold flex items-center gap-1">
              <Clock size={9} />
              <span>Returning Session</span>
            </span>
          </div>
          
          <h2 className="text-sm md:text-base font-extrabold text-app-fg tracking-tight leading-snug transition-colors group-hover:text-app-accent">
            {viewModel.title}
          </h2>
          
          <p className="text-xs text-app-muted font-semibold line-clamp-2 leading-relaxed opacity-90">
            {viewModel.subtitle}
          </p>
        </div>
      </div>

      {/* Clean elegant right arrow icon that animates on container hover */}
      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-app-fg/5 text-app-fg border border-app-card-border group-hover:bg-app-accent group-hover:text-white group-hover:border-app-accent transition-all duration-300">
        <ArrowRight size={14} className="transform group-hover:translate-x-0.5 transition-transform duration-300" />
      </div>
    </motion.div>
  );
};
