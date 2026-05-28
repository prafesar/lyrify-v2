import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, Volume2, VolumeX, Music, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";

interface ITunesPlayerProps {
  audioUrl: string;
  trackTitle: string;
  artistName: string;
  coverUrl?: string;
  appleMusicUrl?: string;
}

export default function ITunesPlayer({
  audioUrl,
  trackTitle,
  artistName,
  coverUrl,
  appleMusicUrl,
}: ITunesPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      const p = dur && !isNaN(dur) ? (audioRef.current.currentTime / dur) * 100 : 0;
      setProgress(isNaN(p) ? 0 : p);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      setDuration(isNaN(dur) ? 0 : dur);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedProgress = x / rect.width;
    audioRef.current.currentTime = clickedProgress * audioRef.current.duration;
  };

  return (
    <div className="w-full p-6 rounded-[2.5rem] bg-app-card/60 border border-app-card-border shadow-app-card backdrop-blur-xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-50 pointer-events-none" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-accent">
                iTunes Preview
              </span>
           </div>
           {appleMusicUrl && (
             <a 
               href={appleMusicUrl} 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 flex items-center gap-1 transition-all"
             >
               View on iTunes <ExternalLink size={10} />
             </a>
           )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {coverUrl ? (
              <img 
                src={coverUrl} 
                alt={trackTitle}
                referrerPolicy="no-referrer"
                className={cn(
                  "w-16 h-16 rounded-2xl object-cover shadow-lg border border-white/10 transition-transform duration-500",
                  isPlaying ? "scale-110 shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]" : "scale-100"
                )}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-app-bg border border-app-card-border flex items-center justify-center text-app-fg/20">
                <Music size={24} />
              </div>
            )}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
            >
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform active:scale-90 transition-transform">
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </div>
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-app-fg truncate text-lg leading-tight">
              {trackTitle}
            </h4>
            <p className="text-sm text-app-muted truncate font-serif italic">
              {artistName}
            </p>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-full hover:bg-app-fg/5 text-app-fg opacity-40 hover:opacity-100 transition-all"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <div className="space-y-2">
          <div 
            className="relative h-2 bg-app-fg/5 rounded-full overflow-hidden cursor-pointer group/progress"
            onClick={seek}
          >
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--accent)] to-purple-600 transition-all duration-100"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-sm" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-bold opacity-30 uppercase tracking-widest">
            <span>{Math.floor((audioRef.current?.currentTime || 0) / 60)}:{(Math.floor(audioRef.current?.currentTime || 0) % 60).toString().padStart(2, '0')}</span>
            <span>{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* iTunes Attribution Footer */}
        <div className="pt-2 border-t border-app-card-border/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-40 grayscale hover:grayscale-0 transition-all">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Apple_Music_logo.svg" 
              alt="Apple Music" 
              className="h-3 md:h-4"
              referrerPolicy="no-referrer"
            />
            <span className="text-[9px] font-medium tracking-tight">Music Preview</span>
          </div>
          <p className="text-[8px] leading-tight text-app-muted text-right max-w-[200px]">
            Provided as a promotional summary. Full track available on the iTunes Store.
          </p>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        muted={isMuted}
      />
    </div>
  );
}
