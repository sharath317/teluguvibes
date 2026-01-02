'use client';

/**
 * React Hook for Browser-Only Personalization
 * 
 * Provides reactive access to user preferences and personalization features.
 * NO cookies, NO backend user profiles.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  recordInterest,
  recordView,
  getTopInterests,
  getRecentViews,
  getPersonalizedSectionRankings,
  hideSection,
  showSection,
  toggleFavoriteGenre,
  getFavoriteGenres,
  getPreferredLanguage,
  setPreferredLanguage,
  getRecommendedFilters,
  clearAllData,
  UserInterest,
  ViewedItem,
  SectionRanking,
} from '@/lib/personalization/browser-preferences';

export function usePersonalization() {
  const [isClient, setIsClient] = useState(false);
  const [interests, setInterests] = useState<UserInterest[]>([]);
  const [recentViews, setRecentViews] = useState<ViewedItem[]>([]);
  const [favoriteGenres, setFavoriteGenresState] = useState<string[]>([]);
  const [language, setLanguage] = useState<'te' | 'en'>('te');

  // Initialize on client
  useEffect(() => {
    setIsClient(true);
    refreshData();
  }, []);

  const refreshData = useCallback(() => {
    if (typeof window === 'undefined') return;
    setInterests(getTopInterests());
    setRecentViews(getRecentViews());
    setFavoriteGenresState(getFavoriteGenres());
    setLanguage(getPreferredLanguage());
  }, []);

  // Record movie view
  const trackMovieView = useCallback((movieId: string, slug: string) => {
    recordView('movie', movieId, slug);
    refreshData();
  }, [refreshData]);

  // Record review view
  const trackReviewView = useCallback((reviewId: string, slug: string) => {
    recordView('review', reviewId, slug);
    refreshData();
  }, [refreshData]);

  // Record actor interest
  const trackActorInterest = useCallback((actorId: string, actorName: string, weight: number = 10) => {
    recordInterest('actor', actorId, actorName, weight);
    refreshData();
  }, [refreshData]);

  // Record genre interest
  const trackGenreInterest = useCallback((genre: string, weight: number = 5) => {
    recordInterest('genre', genre, genre, weight);
    refreshData();
  }, [refreshData]);

  // Toggle favorite genre
  const toggleGenre = useCallback((genre: string) => {
    const isFavorite = toggleFavoriteGenre(genre);
    refreshData();
    return isFavorite;
  }, [refreshData]);

  // Get personalized section order
  const getSectionOrder = useCallback((sections: string[]): SectionRanking[] => {
    if (!isClient) return sections.map(s => ({ sectionId: s, score: 50 }));
    return getPersonalizedSectionRankings(sections);
  }, [isClient]);

  // Hide a section
  const hideSectionFromView = useCallback((sectionId: string) => {
    hideSection(sectionId);
    refreshData();
  }, [refreshData]);

  // Show a hidden section
  const showSectionInView = useCallback((sectionId: string) => {
    showSection(sectionId);
    refreshData();
  }, [refreshData]);

  // Set language preference
  const setLang = useCallback((lang: 'te' | 'en') => {
    setPreferredLanguage(lang);
    setLanguage(lang);
  }, []);

  // Get recommendation filters
  const getFilters = useCallback(() => {
    if (!isClient) return { genres: [], actors: [], directors: [], languages: [] };
    return getRecommendedFilters();
  }, [isClient]);

  // Clear all data
  const clearData = useCallback(() => {
    clearAllData();
    refreshData();
  }, [refreshData]);

  return {
    isClient,
    // State
    interests,
    recentViews,
    favoriteGenres,
    language,
    // Actions
    trackMovieView,
    trackReviewView,
    trackActorInterest,
    trackGenreInterest,
    toggleGenre,
    getSectionOrder,
    hideSectionFromView,
    showSectionInView,
    setLanguage: setLang,
    getFilters,
    clearData,
    refreshData,
  };
}

export default usePersonalization;

