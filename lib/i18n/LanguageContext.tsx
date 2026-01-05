'use client';

/**
 * Language Context Provider
 * 
 * Provides language switching functionality across the app.
 * Persists language preference in localStorage.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, t, translations, formatTimeAgo } from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: <K extends keyof typeof translations, S extends keyof typeof translations[K]>(
    section: K,
    key: S
  ) => string;
  formatTime: (dateString: string) => string;
  isEnglish: boolean;
  isTelugu: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'teluguvibes-lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('te');
  const [mounted, setMounted] = useState(false);

  // Load saved language preference
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'te') {
      setLangState(saved);
    }
  }, []);

  // Save language preference
  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    
    // Update HTML lang attribute
    document.documentElement.lang = newLang;
    
    // Update font class
    if (newLang === 'te') {
      document.body.classList.add('font-telugu');
      document.body.classList.remove('font-english');
    } else {
      document.body.classList.add('font-english');
      document.body.classList.remove('font-telugu');
    }
  };

  // Toggle between languages
  const toggleLang = () => {
    setLang(lang === 'te' ? 'en' : 'te');
  };

  // Translation helper bound to current language
  const translate = <K extends keyof typeof translations, S extends keyof typeof translations[K]>(
    section: K,
    key: S
  ): string => {
    return t(section, key, lang);
  };

  // Format time helper bound to current language
  const formatTime = (dateString: string): string => {
    return formatTimeAgo(dateString, lang);
  };

  // Set initial lang attribute
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
      if (lang === 'te') {
        document.body.classList.add('font-telugu');
        document.body.classList.remove('font-english');
      } else {
        document.body.classList.add('font-english');
        document.body.classList.remove('font-telugu');
      }
    }
  }, [mounted, lang]);

  const value: LanguageContextType = {
    lang,
    setLang,
    toggleLang,
    t: translate,
    formatTime,
    isEnglish: lang === 'en',
    isTelugu: lang === 'te',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Export for convenience
export { type Language } from './translations';






