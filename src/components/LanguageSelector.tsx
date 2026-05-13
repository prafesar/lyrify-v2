import React from 'react';
import { SUPPORTED_LANGUAGES } from '../lib/languages';

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  highlight?: boolean;
}

export default function LanguageSelector({ label, value, onChange, highlight }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 bg-app-card px-2 py-1 rounded-xl border border-app-card-border hover:bg-app-card transition-colors">
      <span className="text-[7px] font-black uppercase text-app-fg opacity-30 tracking-tighter">{label}:</span>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[10px] uppercase font-black outline-none cursor-pointer"
        style={highlight ? { color: 'var(--accent)' } : { color: 'var(--app-fg)' }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.name} className="bg-app-bg text-app-fg">
            {lang.code}
          </option>
        ))}
      </select>
    </div>
  );
}
