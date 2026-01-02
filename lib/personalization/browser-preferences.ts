/**
 * Browser-Only Personalization
 * 
 * Implements user preference tracking and adaptive content
 * WITHOUT cookies or backend user profiles.
 * 
 * Uses localStorage for persistent preferences.
 * 
 * Features:
 * - Interest clusters (actors, genres, eras, languages)
 * - View history tracking
 * - Adaptive home section re-ranking
 * - Favorite boosting
 * - Irrelevant block hiding
 */

// ============================================================
// TYPES
// ============================================================

export interface UserInterest {
  id: string;
  type: 'actor' | 'genre' | 'era' | 'language' | 'director';
  name: string;
  score: number;  // 0-100, decays over time
  lastSeen: number; // timestamp
}

export interface ViewedItem {
  id: string;
  type: 'movie' | 'review' | 'story' | 'celebrity';
  slug: string;
  timestamp: number;
  duration?: number; // seconds spent
}

export interface BrowserPreferences {
  version: number;
  interests: UserInterest[];
  viewHistory: ViewedItem[];
  hiddenSections: string[];
  favoriteGenres: string[];
  preferredLanguage: 'te' | 'en';
  lastUpdated: number;
}

export interface SectionRanking {
  sectionId: string;
  score: number;
  reason?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEY = 'tv_user_preferences';
const CURRENT_VERSION = 1;
const MAX_HISTORY = 100;
const MAX_INTERESTS = 50;
const SCORE_DECAY_DAYS = 30;
const MIN_SCORE = 5;

// Default preferences
const DEFAULT_PREFERENCES: BrowserPreferences = {
  version: CURRENT_VERSION,
  interests: [],
  viewHistory: [],
  hiddenSections: [],
  favoriteGenres: [],
  preferredLanguage: 'te',
  lastUpdated: Date.now(),
};

// ============================================================
// STORAGE UTILITIES
// ============================================================

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function loadPreferences(): BrowserPreferences {
  if (!isClient()) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(stored) as BrowserPreferences;
    
    // Handle version migrations
    if (!parsed.version || parsed.version < CURRENT_VERSION) {
      return migratePreferences(parsed);
    }

    return parsed;
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs: BrowserPreferences): void {
  if (!isClient()) return;

  try {
    prefs.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage might be full or disabled
    console.warn('Failed to save preferences to localStorage');
  }
}

function migratePreferences(old: Partial<BrowserPreferences>): BrowserPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...old,
    version: CURRENT_VERSION,
  };
}

// ============================================================
// INTEREST TRACKING
// ============================================================

/**
 * Calculate decayed score based on time since last seen
 */
function decayScore(score: number, lastSeen: number): number {
  const daysSinceLastSeen = (Date.now() - lastSeen) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-daysSinceLastSeen / SCORE_DECAY_DAYS);
  return Math.max(MIN_SCORE, Math.round(score * decayFactor));
}

/**
 * Record user interest in an entity
 */
export function recordInterest(
  type: UserInterest['type'],
  id: string,
  name: string,
  weight: number = 10
): void {
  const prefs = loadPreferences();
  
  // Find existing interest
  const existingIndex = prefs.interests.findIndex(
    i => i.type === type && i.id === id
  );

  if (existingIndex >= 0) {
    // Boost existing interest
    const existing = prefs.interests[existingIndex];
    existing.score = Math.min(100, decayScore(existing.score, existing.lastSeen) + weight);
    existing.lastSeen = Date.now();
  } else {
    // Add new interest
    prefs.interests.push({
      id,
      type,
      name,
      score: Math.min(100, weight),
      lastSeen: Date.now(),
    });
  }

  // Trim to max interests, keeping highest scores
  prefs.interests.sort((a, b) => b.score - a.score);
  prefs.interests = prefs.interests.slice(0, MAX_INTERESTS);

  savePreferences(prefs);
}

/**
 * Get user's top interests by type
 */
export function getTopInterests(type?: UserInterest['type'], limit: number = 10): UserInterest[] {
  const prefs = loadPreferences();
  
  let interests = prefs.interests.map(i => ({
    ...i,
    score: decayScore(i.score, i.lastSeen),
  }));

  if (type) {
    interests = interests.filter(i => i.type === type);
  }

  return interests
    .filter(i => i.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============================================================
// VIEW HISTORY
// ============================================================

/**
 * Record a viewed item
 */
export function recordView(
  type: ViewedItem['type'],
  id: string,
  slug: string,
  duration?: number
): void {
  const prefs = loadPreferences();

  // Remove existing entry if present
  prefs.viewHistory = prefs.viewHistory.filter(
    v => !(v.type === type && v.id === id)
  );

  // Add new entry at start
  prefs.viewHistory.unshift({
    id,
    type,
    slug,
    timestamp: Date.now(),
    duration,
  });

  // Trim to max history
  prefs.viewHistory = prefs.viewHistory.slice(0, MAX_HISTORY);

  savePreferences(prefs);
}

/**
 * Get recent views
 */
export function getRecentViews(type?: ViewedItem['type'], limit: number = 20): ViewedItem[] {
  const prefs = loadPreferences();
  
  let history = prefs.viewHistory;
  
  if (type) {
    history = history.filter(v => v.type === type);
  }

  return history.slice(0, limit);
}

/**
 * Check if item was recently viewed
 */
export function wasRecentlyViewed(type: ViewedItem['type'], id: string): boolean {
  const prefs = loadPreferences();
  return prefs.viewHistory.some(v => v.type === type && v.id === id);
}

// ============================================================
// SECTION PERSONALIZATION
// ============================================================

/**
 * Get personalized section rankings based on user interests
 */
export function getPersonalizedSectionRankings(
  availableSections: string[]
): SectionRanking[] {
  const prefs = loadPreferences();
  const topInterests = getTopInterests();

  // Map sections to scores
  const rankings: SectionRanking[] = availableSections.map(sectionId => {
    let score = 50; // Base score
    let reason: string | undefined;

    // Boost based on interests
    const genreInterests = topInterests.filter(i => i.type === 'genre');
    const actorInterests = topInterests.filter(i => i.type === 'actor');

    // Section-specific boosts
    if (sectionId === 'trending' || sectionId === 'hot') {
      score += 20; // Always show trending high
      reason = 'Trending content';
    } else if (sectionId === 'hidden-gems' && genreInterests.length > 0) {
      score += 15;
      reason = 'Based on your genre interests';
    } else if (sectionId === 'star-spotlight' && actorInterests.length > 0) {
      score += 10;
      reason = 'Based on your favorite actors';
    }

    // Penalize hidden sections
    if (prefs.hiddenSections.includes(sectionId)) {
      score = 0;
    }

    return { sectionId, score, reason };
  });

  return rankings.sort((a, b) => b.score - a.score);
}

/**
 * Hide a section from the user's view
 */
export function hideSection(sectionId: string): void {
  const prefs = loadPreferences();
  if (!prefs.hiddenSections.includes(sectionId)) {
    prefs.hiddenSections.push(sectionId);
    savePreferences(prefs);
  }
}

/**
 * Show a previously hidden section
 */
export function showSection(sectionId: string): void {
  const prefs = loadPreferences();
  prefs.hiddenSections = prefs.hiddenSections.filter(s => s !== sectionId);
  savePreferences(prefs);
}

// ============================================================
// FAVORITE GENRES
// ============================================================

/**
 * Toggle a genre as favorite
 */
export function toggleFavoriteGenre(genre: string): boolean {
  const prefs = loadPreferences();
  const index = prefs.favoriteGenres.indexOf(genre);
  
  if (index >= 0) {
    prefs.favoriteGenres.splice(index, 1);
    savePreferences(prefs);
    return false;
  } else {
    prefs.favoriteGenres.push(genre);
    savePreferences(prefs);
    return true;
  }
}

/**
 * Get favorite genres
 */
export function getFavoriteGenres(): string[] {
  const prefs = loadPreferences();
  return prefs.favoriteGenres;
}

// ============================================================
// LANGUAGE PREFERENCE
// ============================================================

/**
 * Set preferred language
 */
export function setPreferredLanguage(lang: 'te' | 'en'): void {
  const prefs = loadPreferences();
  prefs.preferredLanguage = lang;
  savePreferences(prefs);
}

/**
 * Get preferred language
 */
export function getPreferredLanguage(): 'te' | 'en' {
  const prefs = loadPreferences();
  return prefs.preferredLanguage;
}

// ============================================================
// CLEAR DATA
// ============================================================

/**
 * Clear all personalization data
 */
export function clearAllData(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clear view history only
 */
export function clearViewHistory(): void {
  const prefs = loadPreferences();
  prefs.viewHistory = [];
  savePreferences(prefs);
}

// ============================================================
// MOVIE RECOMMENDATIONS
// ============================================================

/**
 * Get movie IDs that should be boosted based on user interests
 */
export function getRecommendedFilters(): {
  genres: string[];
  actors: string[];
  directors: string[];
  languages: string[];
} {
  const interests = getTopInterests();
  
  return {
    genres: interests.filter(i => i.type === 'genre').map(i => i.name),
    actors: interests.filter(i => i.type === 'actor').map(i => i.name),
    directors: interests.filter(i => i.type === 'director').map(i => i.name),
    languages: interests.filter(i => i.type === 'language').map(i => i.name),
  };
}

export default {
  recordInterest,
  recordView,
  getTopInterests,
  getRecentViews,
  wasRecentlyViewed,
  getPersonalizedSectionRankings,
  hideSection,
  showSection,
  toggleFavoriteGenre,
  getFavoriteGenres,
  setPreferredLanguage,
  getPreferredLanguage,
  clearAllData,
  clearViewHistory,
  getRecommendedFilters,
};

