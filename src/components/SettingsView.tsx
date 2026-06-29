import React from 'react';
import { motion } from 'motion/react';
import { LogOut, User, Shield, Info, Moon, ChevronRight, Languages, RefreshCcw, LogIn, Sparkles } from 'lucide-react';
import { logOut, signIn } from '../lib/firebase';
import { type User as FirebaseUser } from 'firebase/auth';
import { SUPPORTED_LANGUAGES, normalizeLanguageCode } from '../lib/languages';
import { useTranslation } from '../lib/i18n';
import LanguageSelector from './LanguageSelector';

interface SettingsViewProps {
  user: FirebaseUser | null;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
  analysisMode: 'overview' | 'vocabulary' | 'phrases' | 'style';
  setAnalysisMode: (mode: 'overview' | 'vocabulary' | 'phrases' | 'style') => void;
  onResetData: () => void;
  onClose: () => void;
}

export default function SettingsView({ 
  user, 
  targetLanguage, 
  setTargetLanguage, 
  theme, 
  setTheme, 
  analysisMode,
  setAnalysisMode,
  onResetData, 
  onClose 
}: SettingsViewProps) {
  const [confirmReset, setConfirmReset] = React.useState(false);
  const { uiLanguage, setUiLanguage, t } = useTranslation();

  // Simple clean localizations for analysis perspective
  const localizedModes = uiLanguage === 'ru' ? {
    title: 'Режим разбора по умолчанию',
    desc: 'Выберите режим лингвистического анализа CantoLex AI по умолчанию',
    overview: 'Обзор',
    vocabulary: 'Словарь',
    phrases: 'Фразы',
    style: 'Стиль',
    overviewDesc: 'Режим обзора: кратко объясняет смысл трека и предлагает перейти к учебным режимам.',
    vocabularyDesc: 'Режим словаря: фокусируется на словоформах, переводе лексики и комментариях.',
    phrasesDesc: 'Режим фраз: содержит подробные идиоматические выражения и разговорные клише.',
    styleDesc: 'Режим стиля: разбирает художественные приемы, сленг, регистры и культурный контекст.'
  } : {
    title: 'Default Analysis Mode',
    desc: 'Choose default perspective for CantoLex AI linguistic analysis',
    overview: 'Overview',
    vocabulary: 'Vocabulary',
    phrases: 'Phrases',
    style: 'Style',
    overviewDesc: 'Overview mode: Explains the track and offers quick links to learning modes.',
    vocabularyDesc: 'Vocabulary mode: Focuses on word forms, lexical translations, and explanations.',
    phrasesDesc: 'Phrases mode: Focuses on idiomatic collocations and reusable spoken chunks.',
    styleDesc: 'Style mode: Highlights literary registers, slang, and cultural tone nuances.'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex-1 overflow-y-auto w-full scrollbar-hide"
    >
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-8">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] px-2" style={{ color: 'var(--accent)' }}>{t('settings.title')}</h2>
      </div>

      {/* Profile Section */}
      <div className="mb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">{t('settings.profile')}</h3>
        <div className="p-6 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex items-center gap-4 transition-shadow">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center border transition-colors overflow-hidden"
            style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            {user?.photoURL && user.photoURL !== "" ? (
              <img src={user.photoURL} alt={user.displayName || t('settings.guest')} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User style={{ color: 'var(--accent)' }} size={32} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg text-app-fg">{user?.displayName || t('settings.guest')}</p>
            <p className="text-sm text-app-fg opacity-40">{user?.email || t('settings.signInPrompt')}</p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="mb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">{t('settings.preferences')}</h3>
        <div className="space-y-4">
          {/* UI Language Dropdown */}
          <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}
              >
                <Languages size={18} />
              </div>
              <span className="font-medium">{t('settings.uiLanguage')}</span>
            </div>
            <LanguageSelector
              label="App"
              value={uiLanguage}
              onChange={(newLangCode) => setUiLanguage(newLangCode as any)}
              isSimpleList={true}
              hideLabelPrefix={true}
              options={[
                { code: 'en', displayName: 'English' },
                { code: 'ru', displayName: 'Русский' },
                { code: 'es', displayName: 'Español' },
                { code: 'de', displayName: 'Deutsch' },
                { code: 'fr', displayName: 'Français' },
                { code: 'it', displayName: 'Italiano' },
                { code: 'zh', displayName: '中文（普通话）' }
              ]}
              showResourceHint={false}
            />
          </div>

          {/* Target Language Dropdown */}
          <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="p-2 rounded-xl"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}
              >
                <Languages size={18} />
              </div>
              <span className="font-medium">{t('settings.targetLanguage')}</span>
            </div>
            <LanguageSelector
              label="Target"
              value={normalizeLanguageCode(targetLanguage) || targetLanguage}
              onChange={(newLangCode) => setTargetLanguage(newLangCode)}
              showResourceHint={false}
              hideLabelPrefix={true}
            />
          </div>

          <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Moon size={18} />
              </div>
              <span className="font-medium">{t('settings.appearance')}</span>
            </div>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-transparent text-sm font-bold text-app-fg outline-none text-right cursor-pointer"
            >
              <option value="lyrify-light" className="bg-app-bg text-app-fg">{t('settings.themeLyrifyLight')}</option>
              <option value="dark" className="bg-app-bg text-app-fg">{t('settings.themeDark')}</option>
              <option value="light" className="bg-app-bg text-app-fg">{t('settings.themeLight')}</option>
              <option value="solarized" className="bg-app-bg text-app-fg">{t('settings.themeSolarized')}</option>
              <option value="solarized-emerald" className="bg-app-bg text-app-fg">{t('settings.themeSolarizedEmerald')}</option>
            </select>
          </div>

          {/* Default Analysis Mode Setting */}
          <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-app-accent/10 text-app-accent">
                  <Sparkles size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{localizedModes.title}</span>
                  <span className="text-[10px] text-app-fg opacity-40">{localizedModes.desc}</span>
                </div>
              </div>
              <select 
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value as 'overview' | 'vocabulary' | 'phrases' | 'style')}
                className="bg-transparent text-sm font-bold text-app-fg outline-none text-right cursor-pointer capitalize"
              >
                <option value="overview" className="bg-app-bg text-app-fg">{localizedModes.overview}</option>
                <option value="vocabulary" className="bg-app-bg text-app-fg">{localizedModes.vocabulary}</option>
                <option value="phrases" className="bg-app-bg text-app-fg">{localizedModes.phrases}</option>
                <option value="style" className="bg-app-bg text-app-fg">{localizedModes.style}</option>
              </select>
            </div>
            <div className="text-[11px] text-app-fg/60 bg-app-bg/50 p-3 rounded-2xl border border-app-card-border/50 leading-relaxed select-none">
              {analysisMode === 'overview' && <span>{localizedModes.overviewDesc}</span>}
              {analysisMode === 'vocabulary' && <span>{localizedModes.vocabularyDesc}</span>}
              {analysisMode === 'phrases' && <span>{localizedModes.phrasesDesc}</span>}
              {analysisMode === 'style' && <span>{localizedModes.styleDesc}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="mb-10">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">{t('settings.account')}</h3>
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
                <span className="font-medium">{confirmReset ? t('settings.confirmReset') : t('settings.resetData')}</span>
                <span className={`text-[9px] ${confirmReset ? "text-white/80" : "opacity-60"}`}>
                  {confirmReset ? t('settings.confirmResetSub') : t('settings.resetDataSub')}
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
                <span className="font-medium">{t('settings.signOut')}</span>
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
                  <span className="font-medium">{t('settings.signIn')}</span>
                  <span className="text-[9px] opacity-60">{t('settings.signInSub')}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-app-accent/20 group-hover:text-app-accent transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* App Info */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-fg opacity-30 mb-4 px-2">{t('settings.info')}</h3>
        <div className="p-4 rounded-3xl bg-app-card border border-app-card-border shadow-app-card space-y-4">
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2 text-app-fg opacity-40">
              <Shield size={14} />
              <span>{t('settings.privacy')}</span>
            </div>
            <ChevronRight size={14} className="text-app-fg opacity-20" />
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2 text-app-fg opacity-40">
              <Info size={14} />
              <span>{t('settings.version')}</span>
            </div>
            <span className="font-mono text-app-fg opacity-20">0.8.2-beta</span>
          </div>
        </div>
      </div>
      </div>
      
      <div className="h-20" />
    </motion.div>
  );
}
