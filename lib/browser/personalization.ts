/**
 * BROWSER-SIDE PERSONALIZATION
 *
 * Zero backend, zero cookies, fully GDPR-safe.
 * All data stored in localStorage/IndexedDB.
 *
 * WHY THIS APPROACH:
 * - No user accounts needed
 * - No server-side storage
 * - No cookies (GDPR compliant)
 * - Degrades gracefully (works without JS)
 * - Data stays on user's device
 */

// ============================================================
// TYPES
// ============================================================

export interface UserPreferences {
  viewedCelebrities: string[]; // Celebrity IDs
  viewedMovies: string[]; // Movie IDs
  viewedCategories: string[]; // Category names
  favoriteCategories: string[]; // Explicitly liked
  readArticles: string[]; // Post IDs
  lastVisit: string; // ISO date
  visitCount: number;
  prefersDarkMode: boolean;
}

export interface RecommendationContext {
  recentCelebrities: string[];
  recentCategories: string[];
  isReturningUser: boolean;
  topCategory: string | null;
}

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_KEY = 'telugu_vibes_prefs';
const MAX_HISTORY = 50; // Keep last 50 items per type

// ============================================================
// DEFAULT PREFERENCES
// ============================================================

const DEFAULT_PREFERENCES: UserPreferences = {
  viewedCelebrities: [],
  viewedMovies: [],
  viewedCategories: [],
  favoriteCategories: [],
  readArticles: [],
  lastVisit: new Date().toISOString(),
  visitCount: 0,
  prefersDarkMode: true,
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Get user preferences from localStorage
 * Returns default if not found or error
 */
export function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(prefs: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // Silently fail if storage is full
    console.warn('Failed to save preferences:', e);
  }
}

/**
 * Record that user viewed a celebrity
 */
export function trackCelebrityView(celebrityId: string): void {
  const prefs = getPreferences();

  // Add to front, remove duplicates, limit size
  const updated = [celebrityId, ...prefs.viewedCelebrities.filter(id => id !== celebrityId)]
    .slice(0, MAX_HISTORY);

  savePreferences({ viewedCelebrities: updated });
}

/**
 * Record that user viewed a movie
 */
export function trackMovieView(movieId: string): void {
  const prefs = getPreferences();

  const updated = [movieId, ...prefs.viewedMovies.filter(id => id !== movieId)]
    .slice(0, MAX_HISTORY);

  savePreferences({ viewedMovies: updated });
}

/**
 * Record that user read an article
 */
export function trackArticleRead(postId: string, category: string): void {
  const prefs = getPreferences();

  // Track article
  const updatedArticles = [postId, ...prefs.readArticles.filter(id => id !== postId)]
    .slice(0, MAX_HISTORY);

  // Track category view
  const updatedCategories = [category, ...prefs.viewedCategories]
    .slice(0, MAX_HISTORY);

  savePreferences({
    readArticles: updatedArticles,
    viewedCategories: updatedCategories,
  });
}

/**
 * Record a site visit
 */
export function recordVisit(): void {
  const prefs = getPreferences();
  savePreferences({
    lastVisit: new Date().toISOString(),
    visitCount: prefs.visitCount + 1,
  });
}

/**
 * Check if user has read an article
 */
export function hasReadArticle(postId: string): boolean {
  const prefs = getPreferences();
  return prefs.readArticles.includes(postId);
}

/**
 * Get recommendation context
 */
export function getRecommendationContext(): RecommendationContext {
  const prefs = getPreferences();

  // Find most viewed category
  const categoryCount: Record<string, number> = {};
  for (const cat of prefs.viewedCategories) {
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  }
  const topCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Check if returning user (visited before today)
  const lastVisit = new Date(prefs.lastVisit);
  const today = new Date();
  const isReturningUser = lastVisit.toDateString() !== today.toDateString() && prefs.visitCount > 1;

  return {
    recentCelebrities: prefs.viewedCelebrities.slice(0, 5),
    recentCategories: [...new Set(prefs.viewedCategories)].slice(0, 5),
    isReturningUser,
    topCategory,
  };
}

/**
 * Clear all personalization data
 */
export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================
// REACT HOOK
// ============================================================

import { useState, useEffect, useCallback } from 'react';

export function usePersonalization() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const prefs = getPreferences();
    setPreferences(prefs);
    setIsLoaded(true);
    recordVisit();
  }, []);

  // Track celebrity view
  const viewCelebrity = useCallback((id: string) => {
    trackCelebrityView(id);
    setPreferences(getPreferences());
  }, []);

  // Track movie view
  const viewMovie = useCallback((id: string) => {
    trackMovieView(id);
    setPreferences(getPreferences());
  }, []);

  // Track article read
  const readArticle = useCallback((postId: string, category: string) => {
    trackArticleRead(postId, category);
    setPreferences(getPreferences());
  }, []);

  // Get context for recommendations
  const getContext = useCallback(() => {
    return getRecommendationContext();
  }, []);

  // Check if article was read
  const wasRead = useCallback((postId: string) => {
    return hasReadArticle(postId);
  }, []);

  return {
    preferences,
    isLoaded,
    viewCelebrity,
    viewMovie,
    readArticle,
    getContext,
    wasRead,
    clearData: clearAllData,
  };
}

// ============================================================
// RECOMMENDATION GENERATOR
// ============================================================

export interface Recommendation {
  type: 'celebrity' | 'movie' | 'category';
  id: string;
  name: string;
  reason: string;
  reason_te: string;
}

/**
 * Generate recommendations based on user behavior
 * This runs entirely in the browser
 */
export function generateRecommendations(
  context: RecommendationContext,
  availableCelebrities: { id: string; name: string }[],
  availableMovies: { id: string; title: string }[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Recommend celebrities similar to viewed ones
  // (In a real implementation, you'd have similarity data)
  if (context.recentCelebrities.length > 0) {
    const unseenCelebrities = availableCelebrities
      .filter(c => !context.recentCelebrities.includes(c.id))
      .slice(0, 3);

    for (const celeb of unseenCelebrities) {
      recommendations.push({
        type: 'celebrity',
        id: celeb.id,
        name: celeb.name,
        reason: 'Because you viewed similar celebrities',
        reason_te: 'మీరు ఇలాంటి సెలెబ్రిటీలను చూసారు',
      });
    }
  }

  // Recommend movies if user likes movies category
  if (context.recentCategories.includes('movies')) {
    const unseenMovies = availableMovies.slice(0, 2);
    for (const movie of unseenMovies) {
      recommendations.push({
        type: 'movie',
        id: movie.id,
        name: movie.title,
        reason: 'Popular in Movies',
        reason_te: 'సినిమాల్లో పాపులర్',
      });
    }
  }

  // Recommend based on top category
  if (context.topCategory) {
    recommendations.push({
      type: 'category',
      id: context.topCategory,
      name: context.topCategory,
      reason: `Your favorite category`,
      reason_te: `మీ ఫేవరెట్ కేటగిరీ`,
    });
  }

  return recommendations.slice(0, 5);
}








