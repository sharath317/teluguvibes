/**
 * Browser-Side Glamour Personalization
 * 
 * Zero-backend personalization for hot/glamour content:
 * - Tracks viewed actresses/celebrities
 * - Learns glamour intensity preference
 * - Detects repeat interest signals
 * - Adjusts content ordering automatically
 * 
 * NO login required. GDPR-safe (localStorage only).
 */

// Types
export interface GlamourPreferences {
  version: number;
  createdAt: string;
  updatedAt: string;
  
  // Celebrity interests
  viewedCelebrities: CelebrityInterest[];
  favoriteCelebrities: string[];
  
  // Category preferences
  categoryInterests: CategoryInterest[];
  
  // Glamour intensity (1-5 scale)
  intensityPreference: number;
  
  // Session data
  sessionViews: number;
  totalViews: number;
  
  // Content preferences
  preferredContentTypes: ContentTypePreference[];
  
  // Time-based patterns
  activeHours: number[]; // Hours when user is most active (0-23)
}

export interface CelebrityInterest {
  name: string;
  views: number;
  lastViewed: string;
  clickedCount: number;
  sharedCount: number;
  interestScore: number; // Calculated score 0-100
}

export interface CategoryInterest {
  category: string;
  views: number;
  lastViewed: string;
  avgTimeSpent: number; // seconds
  interestScore: number;
}

export interface ContentTypePreference {
  type: 'image' | 'video' | 'reel' | 'embed';
  preference: number; // 0-100
}

export interface PersonalizationEvent {
  type: 'view' | 'click' | 'share' | 'scroll' | 'time_spent';
  celebrity?: string;
  category?: string;
  contentType?: string;
  value?: number;
  timestamp: string;
}

// Constants
const STORAGE_KEY = 'teluguVibes_glamour_prefs';
const STORAGE_VERSION = 1;
const MAX_CELEBRITIES = 50;
const MAX_CATEGORIES = 20;
const DECAY_DAYS = 14; // Interest decays after 14 days

// Default preferences
const DEFAULT_PREFERENCES: GlamourPreferences = {
  version: STORAGE_VERSION,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  viewedCelebrities: [],
  favoriteCelebrities: [],
  categoryInterests: [],
  intensityPreference: 3, // Medium
  sessionViews: 0,
  totalViews: 0,
  preferredContentTypes: [
    { type: 'image', preference: 50 },
    { type: 'video', preference: 50 },
    { type: 'reel', preference: 50 },
    { type: 'embed', preference: 50 },
  ],
  activeHours: [],
};

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Load preferences from localStorage
 */
export function loadPreferences(): GlamourPreferences {
  if (!isBrowser()) {
    return { ...DEFAULT_PREFERENCES };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_PREFERENCES };
    }
    
    const parsed = JSON.parse(stored) as GlamourPreferences;
    
    // Version migration if needed
    if (parsed.version !== STORAGE_VERSION) {
      return migratePreferences(parsed);
    }
    
    return parsed;
  } catch (error) {
    console.error('Error loading glamour preferences:', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(prefs: GlamourPreferences): void {
  if (!isBrowser()) return;
  
  try {
    prefs.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error saving glamour preferences:', error);
  }
}

/**
 * Migrate preferences to new version
 */
function migratePreferences(oldPrefs: any): GlamourPreferences {
  // For now, just reset to defaults but keep some data
  const migrated: GlamourPreferences = {
    ...DEFAULT_PREFERENCES,
    createdAt: oldPrefs.createdAt || new Date().toISOString(),
    viewedCelebrities: oldPrefs.viewedCelebrities || [],
    favoriteCelebrities: oldPrefs.favoriteCelebrities || [],
    totalViews: oldPrefs.totalViews || 0,
  };
  
  savePreferences(migrated);
  return migrated;
}

/**
 * Calculate interest score with time decay
 */
function calculateInterestScore(
  views: number,
  clicks: number,
  shares: number,
  lastViewed: string
): number {
  const now = new Date();
  const lastViewDate = new Date(lastViewed);
  const daysSinceView = (now.getTime() - lastViewDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Base score from interactions
  const baseScore = Math.min(100, views * 5 + clicks * 10 + shares * 20);
  
  // Apply time decay
  const decayFactor = Math.max(0.2, 1 - (daysSinceView / DECAY_DAYS));
  
  return Math.round(baseScore * decayFactor);
}

/**
 * Record a personalization event
 */
export function recordEvent(event: PersonalizationEvent): void {
  const prefs = loadPreferences();
  
  // Update session/total views
  if (event.type === 'view') {
    prefs.sessionViews++;
    prefs.totalViews++;
  }
  
  // Track active hours
  const hour = new Date().getHours();
  if (!prefs.activeHours.includes(hour)) {
    prefs.activeHours.push(hour);
    // Keep only last 10 unique hours
    if (prefs.activeHours.length > 10) {
      prefs.activeHours = prefs.activeHours.slice(-10);
    }
  }
  
  // Update celebrity interest
  if (event.celebrity) {
    updateCelebrityInterest(prefs, event.celebrity, event.type, event.value);
  }
  
  // Update category interest
  if (event.category) {
    updateCategoryInterest(prefs, event.category, event.type, event.value);
  }
  
  // Update content type preference
  if (event.contentType && event.type === 'view') {
    updateContentTypePreference(prefs, event.contentType as any);
  }
  
  savePreferences(prefs);
}

/**
 * Update celebrity interest based on event
 */
function updateCelebrityInterest(
  prefs: GlamourPreferences,
  celebrity: string,
  eventType: string,
  value?: number
): void {
  let interest = prefs.viewedCelebrities.find(c => c.name === celebrity);
  
  if (!interest) {
    interest = {
      name: celebrity,
      views: 0,
      lastViewed: new Date().toISOString(),
      clickedCount: 0,
      sharedCount: 0,
      interestScore: 0,
    };
    prefs.viewedCelebrities.push(interest);
  }
  
  // Update based on event type
  switch (eventType) {
    case 'view':
      interest.views++;
      break;
    case 'click':
      interest.clickedCount++;
      break;
    case 'share':
      interest.sharedCount++;
      break;
  }
  
  interest.lastViewed = new Date().toISOString();
  interest.interestScore = calculateInterestScore(
    interest.views,
    interest.clickedCount,
    interest.sharedCount,
    interest.lastViewed
  );
  
  // Keep only top celebrities
  if (prefs.viewedCelebrities.length > MAX_CELEBRITIES) {
    prefs.viewedCelebrities.sort((a, b) => b.interestScore - a.interestScore);
    prefs.viewedCelebrities = prefs.viewedCelebrities.slice(0, MAX_CELEBRITIES);
  }
}

/**
 * Update category interest based on event
 */
function updateCategoryInterest(
  prefs: GlamourPreferences,
  category: string,
  eventType: string,
  value?: number
): void {
  let interest = prefs.categoryInterests.find(c => c.category === category);
  
  if (!interest) {
    interest = {
      category,
      views: 0,
      lastViewed: new Date().toISOString(),
      avgTimeSpent: 0,
      interestScore: 0,
    };
    prefs.categoryInterests.push(interest);
  }
  
  if (eventType === 'view') {
    interest.views++;
  }
  
  if (eventType === 'time_spent' && value) {
    // Update average time spent
    const totalTime = interest.avgTimeSpent * (interest.views - 1) + value;
    interest.avgTimeSpent = totalTime / interest.views;
  }
  
  interest.lastViewed = new Date().toISOString();
  interest.interestScore = Math.min(100, interest.views * 10 + interest.avgTimeSpent * 0.5);
  
  // Keep only top categories
  if (prefs.categoryInterests.length > MAX_CATEGORIES) {
    prefs.categoryInterests.sort((a, b) => b.interestScore - a.interestScore);
    prefs.categoryInterests = prefs.categoryInterests.slice(0, MAX_CATEGORIES);
  }
}

/**
 * Update content type preference
 */
function updateContentTypePreference(
  prefs: GlamourPreferences,
  contentType: 'image' | 'video' | 'reel' | 'embed'
): void {
  const typePref = prefs.preferredContentTypes.find(t => t.type === contentType);
  if (typePref) {
    typePref.preference = Math.min(100, typePref.preference + 2);
    
    // Slightly decrease others
    for (const other of prefs.preferredContentTypes) {
      if (other.type !== contentType && other.preference > 20) {
        other.preference = Math.max(20, other.preference - 0.5);
      }
    }
  }
}

/**
 * Set glamour intensity preference (1-5)
 */
export function setIntensityPreference(intensity: number): void {
  const prefs = loadPreferences();
  prefs.intensityPreference = Math.max(1, Math.min(5, intensity));
  savePreferences(prefs);
}

/**
 * Toggle favorite celebrity
 */
export function toggleFavoriteCelebrity(celebrity: string): boolean {
  const prefs = loadPreferences();
  const index = prefs.favoriteCelebrities.indexOf(celebrity);
  
  if (index === -1) {
    prefs.favoriteCelebrities.push(celebrity);
    savePreferences(prefs);
    return true; // Added
  } else {
    prefs.favoriteCelebrities.splice(index, 1);
    savePreferences(prefs);
    return false; // Removed
  }
}

/**
 * Get top celebrities by interest
 */
export function getTopCelebrities(limit = 10): CelebrityInterest[] {
  const prefs = loadPreferences();
  return prefs.viewedCelebrities
    .sort((a, b) => b.interestScore - a.interestScore)
    .slice(0, limit);
}

/**
 * Get top categories by interest
 */
export function getTopCategories(limit = 5): CategoryInterest[] {
  const prefs = loadPreferences();
  return prefs.categoryInterests
    .sort((a, b) => b.interestScore - a.interestScore)
    .slice(0, limit);
}

/**
 * Reorder content based on personalization
 */
export function personalizeContentOrder<T extends { entity_name?: string; category?: string }>(
  content: T[],
  options: {
    boostFavorites?: boolean;
    boostRecent?: boolean;
    boostTopCategories?: boolean;
  } = {}
): T[] {
  const prefs = loadPreferences();
  const {
    boostFavorites = true,
    boostRecent = true,
    boostTopCategories = true,
  } = options;
  
  // Create score map
  const scores = new Map<T, number>();
  
  for (const item of content) {
    let score = 0;
    
    // Boost favorites
    if (boostFavorites && item.entity_name && prefs.favoriteCelebrities.includes(item.entity_name)) {
      score += 50;
    }
    
    // Boost based on celebrity interest
    if (boostRecent && item.entity_name) {
      const interest = prefs.viewedCelebrities.find(c => c.name === item.entity_name);
      if (interest) {
        score += interest.interestScore * 0.3;
      }
    }
    
    // Boost based on category interest
    if (boostTopCategories && item.category) {
      const catInterest = prefs.categoryInterests.find(c => c.category === item.category);
      if (catInterest) {
        score += catInterest.interestScore * 0.2;
      }
    }
    
    scores.set(item, score);
  }
  
  // Sort by score (higher first) while maintaining some randomness
  return [...content].sort((a, b) => {
    const scoreA = scores.get(a) || 0;
    const scoreB = scores.get(b) || 0;
    
    // Add small random factor to prevent staleness
    const randomFactor = (Math.random() - 0.5) * 10;
    
    return (scoreB + randomFactor) - scoreA;
  });
}

/**
 * Get personalization summary for debugging/display
 */
export function getPersonalizationSummary(): {
  totalViews: number;
  topCelebrities: string[];
  topCategories: string[];
  intensityPreference: number;
  favoritesCount: number;
} {
  const prefs = loadPreferences();
  
  return {
    totalViews: prefs.totalViews,
    topCelebrities: getTopCelebrities(5).map(c => c.name),
    topCategories: getTopCategories(3).map(c => c.category),
    intensityPreference: prefs.intensityPreference,
    favoritesCount: prefs.favoriteCelebrities.length,
  };
}

/**
 * Clear all personalization data (GDPR compliance)
 */
export function clearPersonalizationData(): void {
  if (isBrowser()) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Export personalization data (GDPR compliance)
 */
export function exportPersonalizationData(): string {
  const prefs = loadPreferences();
  return JSON.stringify(prefs, null, 2);
}

/**
 * React hook for personalization (use in components)
 */
export function useGlamourPersonalization() {
  // This is a simple implementation - in production, use useSyncExternalStore
  return {
    recordView: (celebrity: string, category: string, contentType?: string) => {
      recordEvent({
        type: 'view',
        celebrity,
        category,
        contentType,
        timestamp: new Date().toISOString(),
      });
    },
    recordClick: (celebrity: string) => {
      recordEvent({
        type: 'click',
        celebrity,
        timestamp: new Date().toISOString(),
      });
    },
    recordShare: (celebrity: string) => {
      recordEvent({
        type: 'share',
        celebrity,
        timestamp: new Date().toISOString(),
      });
    },
    recordTimeSpent: (category: string, seconds: number) => {
      recordEvent({
        type: 'time_spent',
        category,
        value: seconds,
        timestamp: new Date().toISOString(),
      });
    },
    getTopCelebrities,
    getTopCategories,
    toggleFavorite: toggleFavoriteCelebrity,
    setIntensity: setIntensityPreference,
    personalizeOrder: personalizeContentOrder,
    getSummary: getPersonalizationSummary,
    clearData: clearPersonalizationData,
    exportData: exportPersonalizationData,
  };
}

