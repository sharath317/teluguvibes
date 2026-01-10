'use client';

/**
 * Internationalization module
 * Provides language switching between English and Telugu
 */

import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';

export type Language = 'en' | 'te';

/**
 * Translation dictionary - comprehensive translations for the app
 */
const TRANSLATIONS: Record<string, Record<string, { en: string; te: string }>> = {
  sections: {
    filmBeat: { en: 'Film Beat', te: 'ఫిల్మ్ బీట్' },
    hotGossip: { en: 'Hot Gossip', te: 'హాట్ గాసిప్' },
    trending: { en: 'Trending', te: 'ట్రెండింగ్' },
    trendingNow: { en: 'Trending Now', te: 'ట్రెండింగ్ నౌ' },
    latest: { en: 'Latest', te: 'తాజా' },
    entertainment: { en: 'Entertainment', te: 'వినోదం' },
    videoWave: { en: 'Video Wave', te: 'వీడియో వేవ్' },
    sportsMasala: { en: 'Sports Masala', te: 'స్పోర్ట్స్ మసాలా' },
    politicalPulse: { en: 'Political Pulse', te: 'పొలిటికల్ పల్స్' },
    opinionDesk: { en: 'Opinion Desk', te: 'అభిప్రాయ డెస్క్' },
    starSigns: { en: 'Star Signs', te: 'రాశి ఫలాలు' },
    crimeFile: { en: 'Crime File', te: 'క్రైమ్ ఫైల్' },
    moreNewsBtn: { en: 'Load More News', te: 'మరిన్ని వార్తలు' },
  },
  nav: {
    home: { en: 'Home', te: 'హోమ్' },
    movies: { en: 'Movies', te: 'సినిమాలు' },
    entertainment: { en: 'Entertainment', te: 'వినోదం' },
    sports: { en: 'Sports', te: 'క్రీడలు' },
    politics: { en: 'Politics', te: 'రాజకీయాలు' },
    gossip: { en: 'Gossip', te: 'గాసిప్' },
    masalaBytes: { en: 'Masala Bytes', te: 'మసాలా బైట్స్' },
    crime: { en: 'Crime', te: 'క్రైమ్' },
    astrology: { en: 'Astrology', te: 'జ్యోతిషం' },
  },
  labels: {
    readMore: { en: 'Read More', te: 'మరింత చదవండి' },
    viewAll: { en: 'View All', te: 'అన్నీ చూడండి' },
    share: { en: 'Share', te: 'షేర్' },
    comment: { en: 'Comment', te: 'వ్యాఖ్య' },
    likes: { en: 'Likes', te: 'లైక్స్' },
  },
  ui: {
    search: { en: 'Search', te: 'వెతకండి' },
    loading: { en: 'Loading...', te: 'లోడవుతోంది...' },
    error: { en: 'Error', te: 'ఎర్రర్' },
    moreNews: { en: 'More News', te: 'మరిన్ని వార్తలు' },
    noResults: { en: 'No results found', te: 'ఫలితాలు లేవు' },
  },
  empty: {
    noNews: { en: 'No News Yet', te: 'వార్తలు ఇంకా లేవు' },
    goToAdmin: { en: 'Go to Admin', te: 'అడ్మిన్‌కు వెళ్ళండి' },
  },
  time: {
    justNow: { en: 'Just now', te: 'ఇప్పుడే' },
    minutesAgo: { en: 'minutes ago', te: 'నిమిషాల క్రితం' },
    hoursAgo: { en: 'hours ago', te: 'గంటల క్రితం' },
    daysAgo: { en: 'days ago', te: 'రోజుల క్రితం' },
    today: { en: 'Today', te: 'ఈరోజు' },
    yesterday: { en: 'Yesterday', te: 'నిన్న' },
  },
};

type TranslateFunction = (section: string, key: string) => string;

interface LanguageContextValue {
  lang: Language;
  isEnglish: boolean;
  isTelugu: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: TranslateFunction;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Create a translate function for a specific language
 */
function createTranslateFunction(lang: Language): TranslateFunction {
  return (section: string, key: string): string => {
    const translation = TRANSLATIONS[section]?.[key];
    if (translation) {
      return lang === 'en' ? translation.en : translation.te;
    }
    // Fallback: return the key
    return key;
  };
}

/**
 * Default translate function (English)
 */
const defaultT = createTranslateFunction('en');

/**
 * Hook to access language settings and translation function
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  
  // If no provider, return default values (for SSR or when not wrapped)
  if (!context) {
    return {
      lang: 'en',
      isEnglish: true,
      isTelugu: false,
      toggleLanguage: () => {},
      setLanguage: () => {},
      t: defaultT,
    };
  }
  
  return context;
}

/**
 * Provider component for language context
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && (saved === 'en' || saved === 'te')) {
      setLang(saved);
    }
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('language', newLang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = lang === 'en' ? 'te' : 'en';
    setLanguage(newLang);
  }, [lang, setLanguage]);

  // Memoize the translate function based on language
  const t = useMemo(() => createTranslateFunction(lang), [lang]);

  const value: LanguageContextValue = {
    lang,
    isEnglish: lang === 'en',
    isTelugu: lang === 'te',
    toggleLanguage,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Standalone translate function (for use outside React components)
 * Note: This always uses English. For language-aware translation, use the hook.
 */
export function t(section: string, key: string): string {
  return defaultT(section, key);
}
