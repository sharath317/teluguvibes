'use client';

/**
 * Content Mode Context
 * Manages content filtering and age verification for the application
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ============================================================
// TYPES
// ============================================================

export type ContentMode = 'family' | 'standard' | 'adult';

export interface ContentModeContextValue {
  /** Current content mode */
  mode: ContentMode;
  /** Set content mode */
  setMode: (mode: ContentMode) => void;
  /** Whether age has been verified */
  isAgeVerified: boolean;
  /** Trigger age verification */
  verifyAge: () => Promise<boolean>;
  /** Reset age verification */
  resetVerification: () => void;
}

// ============================================================
// CONTEXT
// ============================================================

const ContentModeContext = createContext<ContentModeContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface ContentModeProviderProps {
  children: ReactNode;
  /** Initial mode */
  defaultMode?: ContentMode;
}

const STORAGE_KEY = 'content-mode';
const AGE_VERIFIED_KEY = 'age-verified';

export function ContentModeProvider({
  children,
  defaultMode = 'standard',
}: ContentModeProviderProps) {
  const [mode, setModeState] = useState<ContentMode>(defaultMode);
  const [isAgeVerified, setIsAgeVerified] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY) as ContentMode | null;
      if (savedMode && ['family', 'standard', 'adult'].includes(savedMode)) {
        setModeState(savedMode);
      }
      
      const verified = localStorage.getItem(AGE_VERIFIED_KEY);
      if (verified === 'true') {
        setIsAgeVerified(true);
      }
    } catch (e) {
      console.error('Failed to load content mode preferences:', e);
    }
  }, []);

  const setMode = useCallback((newMode: ContentMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Failed to save content mode:', e);
    }
  }, []);

  const verifyAge = useCallback(async (): Promise<boolean> => {
    // In a real implementation, this could show a modal or redirect to verification
    // For now, we just set verified to true
    setIsAgeVerified(true);
    try {
      localStorage.setItem(AGE_VERIFIED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save age verification:', e);
    }
    return true;
  }, []);

  const resetVerification = useCallback(() => {
    setIsAgeVerified(false);
    try {
      localStorage.removeItem(AGE_VERIFIED_KEY);
    } catch (e) {
      console.error('Failed to reset age verification:', e);
    }
  }, []);

  const value: ContentModeContextValue = {
    mode,
    setMode,
    isAgeVerified,
    verifyAge,
    resetVerification,
  };

  return (
    <ContentModeContext.Provider value={value}>
      {children}
    </ContentModeContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useContentMode(): ContentModeContextValue {
  const context = useContext(ContentModeContext);
  
  // Provide default values if used outside provider
  if (!context) {
    return {
      mode: 'standard',
      setMode: () => {},
      isAgeVerified: false,
      verifyAge: async () => false,
      resetVerification: () => {},
    };
  }
  
  return context;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if content is allowed for the current mode
 */
export function isContentAllowed(
  contentRating: 'U' | 'UA' | 'A',
  mode: ContentMode,
  isAgeVerified: boolean
): boolean {
  if (mode === 'family') {
    return contentRating === 'U';
  }
  
  if (mode === 'standard') {
    return contentRating === 'U' || contentRating === 'UA';
  }
  
  // Adult mode - allow all if age verified
  if (mode === 'adult') {
    if (contentRating === 'A') {
      return isAgeVerified;
    }
    return true;
  }
  
  return true;
}
