'use client';

/**
 * Hot Media Personalization Hook
 * Tracks user preferences and provides personalized hot media content
 */

import { useState, useEffect, useCallback } from 'react';

export interface HotMediaItem {
  id: string;
  entity_name: string;
  entity_type: string;
  image_url: string;
  thumbnail_url?: string;
  platform: string;
  caption?: string;
  category: string;
  views: number;
  likes: number;
  trending_score: number;
  is_featured: boolean;
  is_hot: boolean;
  published_at: string;
}

interface PersonalizationPreferences {
  favoriteCategories: string[];
  favoriteEntities: string[];
  viewedItems: string[];
  likedItems: string[];
  dislikedItems: string[];
}

export interface PersonalizationPreferencesState {
  favoriteCelebrities: string[];
  intensityPreference?: number;
  totalViews?: number;
}

export interface PersonalizationState {
  viewedPosts: string[];
  clickedPosts: string[];
  favorites: string[];
  intensity: 'low' | 'medium' | 'high';
  scrollDepth: number;
  isLoaded: boolean;
  engagementLevel?: string;
  topCelebrities: { name: string; count?: number }[];
  preferences?: PersonalizationPreferencesState;
}

interface UseHotPersonalizationReturn {
  preferences: PersonalizationPreferences;
  state: PersonalizationState;
  isLoading: boolean;
  likeItem: (itemId: string) => void;
  dislikeItem: (itemId: string) => void;
  viewItem: (itemId: string) => void;
  favoriteCategory: (category: string) => void;
  favoriteEntity: (entity: string) => void;
  clearPreferences: () => void;
  getPersonalizedScore: (item: HotMediaItem) => number;
  trackView: (postId: string) => void;
  trackClick: (postId: string) => void;
  toggleFavorite: (postId: string) => void;
  setIntensity: (intensity: 'low' | 'medium' | 'high' | number) => void;
  isFavorite: (postId: string) => boolean;
  personalizeContent: <T extends { id: string }>(items: T[]) => T[];
  filterByUserIntensity: <T extends { intensity?: string }>(items: T[]) => T[];
  trackScrollDepth: (percentage: number) => void;
}

const DEFAULT_PREFERENCES: PersonalizationPreferences = {
  favoriteCategories: [],
  favoriteEntities: [],
  viewedItems: [],
  likedItems: [],
  dislikedItems: [],
};

const STORAGE_KEY = 'hot-personalization';

const DEFAULT_STATE: PersonalizationState = {
  viewedPosts: [],
  clickedPosts: [],
  favorites: [],
  intensity: 'medium',
  scrollDepth: 0,
  isLoaded: false,
  engagementLevel: 'New',
  topCelebrities: [],
  preferences: { favoriteCelebrities: [], intensityPreference: 3, totalViews: 0 },
};

export function useHotPersonalization(): UseHotPersonalizationReturn {
  const [preferences, setPreferences] = useState<PersonalizationPreferences>(DEFAULT_PREFERENCES);
  const [state, setState] = useState<PersonalizationState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load personalization preferences:', e);
    }
    setIsLoading(false);
    setState(s => ({ ...s, isLoaded: true }));
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs: PersonalizationPreferences) => {
    setPreferences(newPrefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (e) {
      console.error('Failed to save personalization preferences:', e);
    }
  }, []);

  const likeItem = useCallback((itemId: string) => {
    savePreferences({
      ...preferences,
      likedItems: [...new Set([...preferences.likedItems, itemId])],
      dislikedItems: preferences.dislikedItems.filter(id => id !== itemId),
    });
  }, [preferences, savePreferences]);

  const dislikeItem = useCallback((itemId: string) => {
    savePreferences({
      ...preferences,
      dislikedItems: [...new Set([...preferences.dislikedItems, itemId])],
      likedItems: preferences.likedItems.filter(id => id !== itemId),
    });
  }, [preferences, savePreferences]);

  const viewItem = useCallback((itemId: string) => {
    if (!preferences.viewedItems.includes(itemId)) {
      savePreferences({
        ...preferences,
        viewedItems: [...preferences.viewedItems, itemId].slice(-100), // Keep last 100
      });
    }
  }, [preferences, savePreferences]);

  const favoriteCategory = useCallback((category: string) => {
    const isAlreadyFavorite = preferences.favoriteCategories.includes(category);
    savePreferences({
      ...preferences,
      favoriteCategories: isAlreadyFavorite
        ? preferences.favoriteCategories.filter(c => c !== category)
        : [...preferences.favoriteCategories, category],
    });
  }, [preferences, savePreferences]);

  const favoriteEntity = useCallback((entity: string) => {
    const isAlreadyFavorite = preferences.favoriteEntities.includes(entity);
    savePreferences({
      ...preferences,
      favoriteEntities: isAlreadyFavorite
        ? preferences.favoriteEntities.filter(e => e !== entity)
        : [...preferences.favoriteEntities, entity],
    });
  }, [preferences, savePreferences]);

  const clearPreferences = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  const getPersonalizedScore = useCallback((item: HotMediaItem): number => {
    let score = item.trending_score || 0;

    // Boost for favorite categories
    if (preferences.favoriteCategories.includes(item.category)) {
      score *= 1.5;
    }

    // Boost for favorite entities
    if (preferences.favoriteEntities.includes(item.entity_name)) {
      score *= 2;
    }

    // Slight penalty for already viewed items
    if (preferences.viewedItems.includes(item.id)) {
      score *= 0.8;
    }

    // Hide disliked items
    if (preferences.dislikedItems.includes(item.id)) {
      score = 0;
    }

    return score;
  }, [preferences]);

  const trackView = useCallback((postId: string) => {
    setState(s => ({
      ...s,
      viewedPosts: [...new Set([...s.viewedPosts, postId])].slice(-50),
    }));
  }, []);

  const trackClick = useCallback((postId: string) => {
    setState(s => ({
      ...s,
      clickedPosts: [...new Set([...s.clickedPosts, postId])].slice(-50),
    }));
  }, []);

  const toggleFavorite = useCallback((postId: string) => {
    setState(s => ({
      ...s,
      favorites: s.favorites.includes(postId)
        ? s.favorites.filter(id => id !== postId)
        : [...s.favorites, postId],
    }));
  }, []);

  const setIntensity = useCallback((intensityValue: 'low' | 'medium' | 'high' | number) => {
    let intensity: 'low' | 'medium' | 'high';
    if (typeof intensityValue === 'number') {
      intensity = intensityValue <= 2 ? 'low' : intensityValue >= 4 ? 'high' : 'medium';
    } else {
      intensity = intensityValue;
    }
    setState(s => ({ 
      ...s, 
      intensity,
      preferences: { ...s.preferences!, intensityPreference: typeof intensityValue === 'number' ? intensityValue : 3 }
    }));
  }, []);

  const isFavorite = useCallback((postId: string) => {
    return state.favorites.includes(postId);
  }, [state.favorites]);

  const personalizeContent = useCallback(<T extends { id: string }>(items: T[]): T[] => {
    // Move favorites to front, viewed to back
    return [...items].sort((a, b) => {
      const aFav = state.favorites.includes(a.id) ? 1 : 0;
      const bFav = state.favorites.includes(b.id) ? 1 : 0;
      return bFav - aFav;
    });
  }, [state.favorites]);

  const filterByUserIntensity = useCallback(<T extends { intensity?: string }>(items: T[]): T[] => {
    return items.filter(item => {
      if (!item.intensity) return true;
      if (state.intensity === 'high') return true;
      if (state.intensity === 'medium') return item.intensity !== 'high';
      return item.intensity === 'low';
    });
  }, [state.intensity]);

  const trackScrollDepth = useCallback((percentage: number) => {
    setState(s => ({ ...s, scrollDepth: Math.max(s.scrollDepth, percentage) }));
  }, []);

  return {
    preferences,
    state,
    isLoading,
    likeItem,
    dislikeItem,
    viewItem,
    favoriteCategory,
    favoriteEntity,
    clearPreferences,
    getPersonalizedScore,
    trackView,
    trackClick,
    toggleFavorite,
    setIntensity,
    isFavorite,
    personalizeContent,
    filterByUserIntensity,
    trackScrollDepth,
  };
}

