import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, AlertCircle } from 'lucide-react';
import { 
  ALL_LANGUAGES, 
  getLanguageByCode, 
  getLanguageDisplayName, 
  normalizeLanguageCode,
  isExperimentalLanguage,
  getLocalizedLanguageName,
  getNativeLanguageName
} from '../lib/languages';
import { useTranslation } from '../lib/i18n';

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  highlight?: boolean;
  usedLanguages?: string[];
  showResourceHint?: boolean;
  // New props for customization:
  options?: Array<{ code: string; displayName: string }>;
  isSimpleList?: boolean;
  hideLabelPrefix?: boolean;
}

export default function LanguageSelector({ 
  label, 
  value, 
  onChange, 
  highlight,
  usedLanguages = [],
  showResourceHint = true,
  options,
  isSimpleList = false,
  hideLabelPrefix = false
}: LanguageSelectorProps) {
  const { uiLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCode = useMemo(() => {
    return normalizeLanguageCode(value) || 'en';
  }, [value]);

  const selectedLang = useMemo(() => {
    return getLanguageByCode(selectedCode);
  }, [selectedCode]);

  // If a custom list of options is provided, find the selected one from it
  const selectedOption = useMemo(() => {
    if (!options) return null;
    return options.find(opt => opt.code === selectedCode);
  }, [options, selectedCode]);

  // Normalize used languages to codes
  const normalizedUsedCodes = useMemo(() => {
    const set = new Set<string>();
    usedLanguages.forEach(lang => {
      const code = normalizeLanguageCode(lang);
      if (code) set.add(code);
    });
    return Array.from(set);
  }, [usedLanguages]);

  // Filter & group languages
  const groupedLanguages = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    
    // Filter overall list by search
    const filtered = ALL_LANGUAGES.filter(lang => {
      if (!searchLower) return true;
      const localized = getLocalizedLanguageName(lang.code, uiLanguage).toLowerCase();
      const native = getNativeLanguageName(lang.code).toLowerCase();
      return (
        lang.displayName.toLowerCase().includes(searchLower) ||
        lang.code.toLowerCase().includes(searchLower) ||
        localized.includes(searchLower) ||
        native.includes(searchLower)
      );
    });

    // 1. Used Languages group
    const usedGroup = filtered.filter(lang => normalizedUsedCodes.includes(lang.code));
    const usedCodesSet = new Set(usedGroup.map(l => l.code));

    // 2. High-resource group (excluding already shown in usedGroup)
    const popularGroup = filtered.filter(lang => 
      lang.resourceLevel === 'high' && !usedCodesSet.has(lang.code)
    );
    const popularCodesSet = new Set(popularGroup.map(l => l.code));

    // 3. Experimental / remaining group
    const remainingGroup = filtered.filter(lang => 
      !usedCodesSet.has(lang.code) && !popularCodesSet.has(lang.code)
    );

    return {
      used: usedGroup,
      popular: popularGroup,
      experimental: remainingGroup
    };
  }, [search, normalizedUsedCodes, uiLanguage]);

  const totalFilteredCount = 
    groupedLanguages.used.length + 
    groupedLanguages.popular.length + 
    groupedLanguages.experimental.length;

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${isOpen ? 'z-[60]' : 'z-10'}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-app-card px-3 py-1.5 rounded-xl border border-app-card-border hover:border-app-accent/40 hover:bg-app-card-hover transition-all duration-200 cursor-pointer text-left select-none"
      >
        {!hideLabelPrefix && (
          <span className="text-[8px] font-black uppercase text-app-fg opacity-30 tracking-widest">{label}:</span>
        )}
        <span 
          className="text-sm font-bold tracking-tight"
          style={highlight ? { color: 'var(--accent)' } : { color: 'var(--app-fg)' }}
        >
          {isSimpleList
            ? (selectedOption?.displayName || selectedLang?.displayName || getLanguageDisplayName(value))
            : getLocalizedLanguageName(selectedCode, uiLanguage)}
        </span>
        <ChevronDown size={12} className={`opacity-40 transition-transform duration-200 ${isOpen ? 'rotate-180 text-app-accent opacity-100' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 ${isSimpleList ? 'w-52' : 'w-64'} rounded-2xl bg-app-card border border-app-card-border shadow-2xl p-2 flex flex-col max-h-[380px] overflow-hidden backdrop-blur-md`}>
          {/* Search Header */}
          {!isSimpleList && (
            <div className="flex items-center gap-2 px-2.5 py-2 bg-app-bg/50 rounded-xl border border-app-card-border/60 mb-2">
              <Search size={14} className="text-app-fg opacity-30 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('languageSelector.searchPlaceholder')}
                className="bg-transparent text-xs w-full outline-none text-app-fg placeholder-app-fg/30 font-medium"
                autoFocus
              />
            </div>
          )}

          {/* List Content */}
          <div className={`${isSimpleList ? 'space-y-1' : 'space-y-3.5'} flex-1 overflow-y-auto pr-1 scrollbar-thin`}>
            {isSimpleList && options ? (
              options.map(opt => (
                <LanguageItem 
                  key={opt.code}
                  lang={opt}
                  isSelected={opt.code === selectedCode}
                  onSelect={handleSelect}
                  isSimpleList={true}
                />
              ))
            ) : totalFilteredCount === 0 ? (
              <div className="py-6 text-center text-xs text-app-fg opacity-40 font-medium">
                {t('languageSelector.noLanguages')}
              </div>
            ) : (
              <>
                {/* 1. Used group */}
                {groupedLanguages.used.length > 0 && (
                  <div>
                    <div className="px-2.5 py-1 text-[8px] font-black uppercase text-app-accent tracking-widest bg-app-accent/5 rounded-md mb-1 inline-block ml-1">
                      {t('languageSelector.yourLanguages')}
                    </div>
                    <div className="space-y-0.5">
                      {groupedLanguages.used.map(lang => (
                        <LanguageItem 
                          key={lang.code}
                          lang={lang}
                          isSelected={lang.code === selectedCode}
                          onSelect={handleSelect}
                          uiLanguage={uiLanguage}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Popular group */}
                {groupedLanguages.popular.length > 0 && (
                  <div>
                    <div className="px-2.5 py-1 text-[8px] font-black uppercase text-app-fg opacity-40 tracking-widest bg-app-fg/5 rounded-md mb-1 inline-block ml-1">
                      {t('languageSelector.popularLanguages')}
                    </div>
                    <div className="space-y-0.5">
                      {groupedLanguages.popular.map(lang => (
                        <LanguageItem 
                          key={lang.code}
                          lang={lang}
                          isSelected={lang.code === selectedCode}
                          onSelect={handleSelect}
                          uiLanguage={uiLanguage}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Experimental group */}
                {groupedLanguages.experimental.length > 0 && (
                  <div>
                    <div className="px-2.5 py-1 text-[8px] font-black uppercase text-yellow-500/80 tracking-widest bg-yellow-500/5 rounded-md mb-1 inline-block ml-1">
                      {t('languageSelector.experimentalLanguages')}
                    </div>
                    <div className="space-y-0.5">
                      {groupedLanguages.experimental.map(lang => (
                        <LanguageItem 
                          key={lang.code}
                          lang={lang}
                          isSelected={lang.code === selectedCode}
                          onSelect={handleSelect}
                          uiLanguage={uiLanguage}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Warning / Hint footer */}
          {!isSimpleList && showResourceHint && isExperimentalLanguage(selectedCode) && (
            <div className="mt-2 p-2 bg-yellow-500/5 rounded-xl border border-yellow-500/10 flex gap-1.5 items-start">
              <AlertCircle size={12} className="text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[9px] text-yellow-600/90 leading-normal font-medium">
                {t('languageSelector.experimentalWarning')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LanguageItemProps {
  lang: any;
  isSelected: boolean;
  onSelect: (code: string) => void;
  uiLanguage?: string;
  isSimpleList?: boolean;
}

function LanguageItem({ lang, isSelected, onSelect, uiLanguage, isSimpleList }: LanguageItemProps) {
  const displayName = useMemo(() => {
    if (isSimpleList) {
      return lang.displayName;
    }
    if (!uiLanguage) return lang.displayName;
    const nativeName = getNativeLanguageName(lang.code);
    const localizedName = getLocalizedLanguageName(lang.code, uiLanguage);
    const isDifferent = nativeName.toLowerCase() !== localizedName.toLowerCase();
    return isDifferent ? `${localizedName} (${nativeName})` : localizedName;
  }, [lang, isSimpleList, uiLanguage]);

  return (
    <button
      type="button"
      onClick={() => onSelect(lang.code)}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left select-none ${
        isSelected 
          ? 'bg-app-accent/10 text-app-accent' 
          : 'text-app-fg hover:bg-app-fg/5 hover:text-app-fg'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
        <span className="truncate">{displayName}</span>
        <span className="text-[8px] font-mono opacity-30 bg-app-fg/5 px-1 py-0.5 rounded uppercase shrink-0">
          {lang.code}
        </span>
        {lang.resourceLevel === 'experimental' && (
          <span className="text-[7px] font-black uppercase text-yellow-600 bg-yellow-500/10 px-1 py-0.5 rounded tracking-tighter shrink-0">
            Rare
          </span>
        )}
      </div>
      {isSelected && <Check size={12} className="text-app-accent shrink-0" />}
    </button>
  );
}
