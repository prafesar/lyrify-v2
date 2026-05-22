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
      className="w-full bg-gradient-to-r from-app-accent/5 to-app-accent/0 border border-app-accent/20 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
    >
      {/* Visual Accent glow line */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-app-accent" />

      {/* Content wrapper */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="p-3 bg-app-accent/10 rounded-2xl text-app-accent shrink-0 mt-0.5">
          {isStudy ? <GraduationCap size={20} /> : <Music size={20} />}
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-accent leading-none">
              Continue Learning
            </span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-app-accent/40" />
            <span className="text-[10px] text-app-muted font-bold flex items-center gap-1">
              <Clock size={10} />
              <span>Returning Session</span>
            </span>
          </div>
          
          <h2 className="text-base font-extrabold text-app-fg tracking-tight leading-snug">
            {viewModel.title}
          </h2>
          
          <p className="text-xs text-app-muted font-medium line-clamp-2 leading-relaxed">
            {viewModel.subtitle}
          </p>
        </div>
      </div>

      {/* Action button */}
      <div className="shrink-0 flex items-center justify-end md:pl-4">
        <button
          id="resume-block-cta-btn"
          onClick={handleClick}
          className="w-full md:w-auto px-5 py-3 rounded-2xl bg-app-fg text-app-bg text-xs font-black uppercase tracking-[0.08em] hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-app-accent/5"
        >
          {isStudy ? <PlayCircle size={14} /> : <ArrowRight size={14} />}
          <span>{viewModel.ctaText}</span>
        </button>
      </div>
    </motion.div>
  );
};
