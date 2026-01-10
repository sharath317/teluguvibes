'use client';

/**
 * Browser-Only Personalization
 * 
 * Local storage-based personalization without cookies or backend profiles.
 * Respects user privacy while providing useful personalization.
 */

// ============================================================
// TYPES
// ============================================================

export interface UserInterest {
    type: 'actor' | 'genre' | 'director' | 'year';
    id: string;
  name: string;
    score: number;
    lastUpdated: string;
}

export interface ViewedItem {
    type: 'movie' | 'review' | 'article';
    id: string;
  slug: string;
    viewedAt: string;
}

export interface SectionRanking {
  sectionId: string;
  score: number;
    hidden: boolean;
}

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_KEYS = {
    interests: 'tv-interests',
    views: 'tv-views',
    sections: 'tv-sections',
    favorites: 'tv-favorites',
    language: 'tv-language',
} as const;

// ============================================================
// STORAGE HELPERS
// ============================================================

function getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
  try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
  } catch {
      return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
  try {
      localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
      console.error('Failed to save to localStorage:', e);
  }
}

// ============================================================
// INTEREST TRACKING
// ============================================================

/**
 * Record a user interest (actor, genre, director, etc.)
 */
export function recordInterest(
  type: UserInterest['type'],
  id: string,
  name: string,
    weight: number = 1
): void {
    const interests = getFromStorage<UserInterest[]>(STORAGE_KEYS.interests, []);
  
    const existingIndex = interests.findIndex(i => i.type === type && i.id === id);

  if (existingIndex >= 0) {
      interests[existingIndex].score += weight;
      interests[existingIndex].lastUpdated = new Date().toISOString();
  } else {
      interests.push({
      type,
        id,
      name,
        score: weight,
        lastUpdated: new Date().toISOString(),
    });
  }

    // Keep only top 50 interests
    interests.sort((a, b) => b.score - a.score);
    saveToStorage(STORAGE_KEYS.interests, interests.slice(0, 50));
}

/**
 * Get top interests sorted by score
 */
export function getTopInterests(limit: number = 10): UserInterest[] {
    const interests = getFromStorage<UserInterest[]>(STORAGE_KEYS.interests, []);
    return interests.slice(0, limit);
}

// ============================================================
// VIEW TRACKING
// ============================================================

/**
 * Record a content view
 */
export function recordView(
  type: ViewedItem['type'],
  id: string,
    slug: string
): void {
    const views = getFromStorage<ViewedItem[]>(STORAGE_KEYS.views, []);

    // Remove existing entry for same item
    const filtered = views.filter(v => !(v.type === type && v.id === id));

    // Add new entry at beginning
    filtered.unshift({
    type,
      id,
    slug,
      viewedAt: new Date().toISOString(),
  });

    // Keep only last 100 views
    saveToStorage(STORAGE_KEYS.views, filtered.slice(0, 100));
}

/**
 * Get recent views
 */
export function getRecentViews(limit: number = 20): ViewedItem[] {
    const views = getFromStorage<ViewedItem[]>(STORAGE_KEYS.views, []);
    return views.slice(0, limit);
}

// ============================================================
// SECTION RANKINGS
// ============================================================

/**
 * Get personalized section rankings
 */
export function getPersonalizedSectionRankings(): SectionRanking[] {
    return getFromStorage<SectionRanking[]>(STORAGE_KEYS.sections, []);
}

/**
 * Hide a section
 */
export function hideSection(sectionId: string): void {
    const sections = getFromStorage<SectionRanking[]>(STORAGE_KEYS.sections, []);
    const existingIndex = sections.findIndex(s => s.sectionId === sectionId);

    if (existingIndex >= 0) {
        sections[existingIndex].hidden = true;
    } else {
        sections.push({ sectionId, score: 0, hidden: true });
  }

    saveToStorage(STORAGE_KEYS.sections, sections);
}

/**
 * Show a previously hidden section
 */
export function showSection(sectionId: string): void {
    const sections = getFromStorage<SectionRanking[]>(STORAGE_KEYS.sections, []);
    const existingIndex = sections.findIndex(s => s.sectionId === sectionId);

    if (existingIndex >= 0) {
        sections[existingIndex].hidden = false;
        saveToStorage(STORAGE_KEYS.sections, sections);
    }
}

// ============================================================
// FAVORITES
// ============================================================

/**
 * Toggle a genre as favorite
 */
export function toggleFavoriteGenre(genre: string): boolean {
    const favorites = getFromStorage<string[]>(STORAGE_KEYS.favorites, []);
    const index = favorites.indexOf(genre);
  
  if (index >= 0) {
      favorites.splice(index, 1);
      saveToStorage(STORAGE_KEYS.favorites, favorites);
    return false;
  } else {
      favorites.push(genre);
      saveToStorage(STORAGE_KEYS.favorites, favorites);
    return true;
  }
}

/**
 * Get favorite genres
 */
export function getFavoriteGenres(): string[] {
    return getFromStorage<string[]>(STORAGE_KEYS.favorites, []);
}

// ============================================================
// LANGUAGE PREFERENCE
// ============================================================

/**
 * Get preferred language
 */
export function getPreferredLanguage(): 'te' | 'en' {
    return getFromStorage<'te' | 'en'>(STORAGE_KEYS.language, 'te');
}

/**
 * Set preferred language
 */
export function setPreferredLanguage(lang: 'te' | 'en'): void {
    saveToStorage(STORAGE_KEYS.language, lang);
}

// ============================================================
// RECOMMENDATION FILTERS
// ============================================================

export interface RecommendedFilters {
  genres: string[];
  actors: string[];
  directors: string[];
    years: number[];
}

/**
 * Get recommended filters based on user interests
 */
export function getRecommendedFilters(): RecommendedFilters {
    const interests = getTopInterests(20);
  
  return {
    genres: interests.filter(i => i.type === 'genre').map(i => i.name),
    actors: interests.filter(i => i.type === 'actor').map(i => i.name),
    directors: interests.filter(i => i.type === 'director').map(i => i.name),
      years: interests.filter(i => i.type === 'year').map(i => parseInt(i.id)).filter(Boolean),
  };
}

// ============================================================
// DATA MANAGEMENT
// ============================================================

/**
 * Clear all personalization data
 */
export function clearAllData(): void {
    if (typeof window === 'undefined') return;

    Object.values(STORAGE_KEYS).forEach(key => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Failed to clear storage:', e);
        }
    });
}

