import React from 'react';
import { motion } from 'motion/react';
import { LogOut, User, Shield, Info, Moon, ChevronRight, Languages, RefreshCcw, LogIn } from 'lucide-react';
import { auth, logOut, signIn } from '../lib/firebase';
import { type User as FirebaseUser } from 'firebase/auth';
import { SUPPORTED_LANGUAGES } from '../lib/languages';

interface SettingsViewProps {
  user: FirebaseUser | null;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
  onResetData: () => void;
  onClose: () => void;
}

export default function SettingsView({ user, targetLanguage, setTargetLanguage, theme, setTheme, onResetData, onClose }: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex-1 overflow-y-auto px-6 py-8"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] px-2" style={{ color: 'var(--accent)' }}>Settings</h2>
      </div>

      {/* Profile Section */}
      <div className="mb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">Profile</h3>
        <div className="p-6 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex items-center gap-4 transition-shadow">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center border transition-colors overflow-hidden"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <User style={{ color: 'var(--accent)' }} size={32} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg text-app-fg">{user?.displayName || 'Guest User'}</p>
            <p className="text-sm text-app-fg opacity-40">{user?.email || 'Sign in to sync your progress'}</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="mb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">Preferences</h3>
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}
              >
                <Languages size={18} />
              </div>
              <span className="font-medium">Target Language</span>
            </div>
            <select 
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-transparent text-sm font-bold text-app-fg outline-none text-right cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.name} className="bg-app-bg text-app-fg">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Moon size={18} />
              </div>
              <span className="font-medium">Appearance</span>
            </div>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-transparent text-sm font-bold text-app-fg outline-none text-right cursor-pointer"
            >
              <option value="dark" className="bg-app-bg text-app-fg">Dark</option>
              <option value="light" className="bg-app-bg text-app-fg">Light</option>
              <option value="solarized" className="bg-app-bg text-app-fg">Solarized</option>
            </select>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="mb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">Account</h3>
        <div className="space-y-4">
          <button 
            onClick={() => {
              if (confirmReset) {
                onResetData();
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 3000);
              }
            }}
            className={`w-full text-left p-4 rounded-3xl border shadow-app-card flex items-center justify-between transition-all group ${
              confirmReset 
                ? "bg-orange-500 border-orange-500 text-white animate-pulse" 
                : "bg-orange-500/5 border border-orange-500/10 text-orange-500 hover:bg-orange-500/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl transition-colors ${
                confirmReset ? "bg-white/20" : "bg-orange-500/10"
              }`}>
                <RefreshCcw size={18} className={confirmReset ? "animate-spin" : ""} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{confirmReset ? "Confirm Reset?" : "Reset User Data"}</span>
                <span className={`text-[9px] ${confirmReset ? "text-white/80" : "opacity-60"}`}>
                  {confirmReset ? "Click again to wipe everything" : "Clears history and preferences"}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className={`${
              confirmReset ? "text-white" : "text-orange-500/20 group-hover:text-orange-500"
            } transition-colors`} />
          </button>

          {user ? (
            <button 
              onClick={() => logOut()}
              className="w-full text-left p-4 rounded-3xl bg-red-500/5 border border-red-500/10 shadow-app-card flex items-center justify-between hover:bg-red-500/10 transition-all group"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <LogOut size={18} />
                </div>
                <span className="font-medium">Sign Out</span>
              </div>
              <ChevronRight size={18} className="text-red-400/20 group-hover:text-red-400 transition-colors" />
            </button>
          ) : (
            <button 
              onClick={() => signIn()}
              className="w-full text-left p-4 rounded-3xl bg-app-accent/10 border border-app-accent/20 shadow-app-card flex items-center justify-between hover:bg-app-accent/20 transition-all group"
            >
              <div className="flex items-center gap-3 text-app-accent">
                <div className="p-2 rounded-xl bg-app-accent/10">
                  <LogIn size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Sign In with Google</span>
                  <span className="text-[9px] opacity-60">Sync your history across devices</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-app-accent/20 group-hover:text-app-accent transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* App Info */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">Information</h3>
        <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card space-y-4">
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2 text-app-fg opacity-40">
              <Shield size={14} />
              <span>Privacy Policy</span>
            </div>
            <ChevronRight size={14} className="text-app-fg opacity-20" />
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2 text-app-fg opacity-40">
              <Info size={14} />
              <span>Version</span>
            </div>
            <span className="font-mono text-app-fg opacity-20">0.8.2-beta</span>
          </div>
        </div>
      </div>
      
      <div className="h-20" />
    </motion.div>
  );
}
