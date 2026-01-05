'use client';

/**
 * React Hook for Hot Section Personalization
 * 
 * Integrates glamour personalization with the Hot section UI:
 * - Tracks views and interactions
 * - Provides personalized content ordering
 * - Manages intensity preferences
 * - Supports scroll-based analytics
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  recordEvent,
  loadPreferences,
  personalizeContentOrder,
  getTopCelebrities,
  getTopCategories,
  getGlamourRecommendations,
  toggleFavoriteCelebrity,
  setIntensityPreference,
  getPersonalizationSummary,
  filterByIntensity,
  recordScrollDepth,
  getEngagementLevel,
  type GlamourPreferences,
  type CelebrityInterest,
  type CategoryInterest,
} from './glamour-personalization';

// Types for hook
export interface HotMediaItem {
  id: string;
  entity_name?: string;
  entity_type?: string;
  category?: string;
  platform?: string;
  tags?: string[];
  image_url?: string;
  thumbnail_url?: string;
  selected_caption?: string;
  views?: number;
  is_featured?: boolean;
  is_hot?: boolean;
}

export interface PersonalizationState {
  isLoaded: boolean;
  preferences: GlamourPreferences | null;
  topCelebrities: CelebrityInterest[];
  topCategories: CategoryInterest[];
  engagementLevel: 'new' | 'casual' | 'regular' | 'power';
  recommendations: {
    celebrities: string[];
    categories: string[];
    contentTypes: ('image' | 'video' | 'reel' | 'embed')[];
    intensity: number;
  };
}

export interface UseHotPersonalizationReturn {
  state: PersonalizationState;
  
  // Tracking
  trackView: (item: HotMediaItem) => void;
  trackClick: (item: HotMediaItem) => void;
  trackShare: (item: HotMediaItem) => void;
  trackScrollDepth: (depth: number) => void;
  
  // Personalization
  personalizeContent: <T extends HotMediaItem>(items: T[]) => T[];
  filterByUserIntensity: <T extends HotMediaItem>(items: T[]) => T[];
  
  // User Actions
  toggleFavorite: (celebrity: string) => boolean;
  setIntensity: (level: number) => void;
  isFavorite: (celebrity: string) => boolean;
  
  // Data
  getPersonalizationSummary: () => ReturnType<typeof getPersonalizationSummary>;
  refresh: () => void;
}

/**
 * Main hook for Hot section personalization
 */
export function useHotPersonalization(): UseHotPersonalizationReturn {
  const [state, setState] = useState<PersonalizationState>({
    isLoaded: false,
    preferences: null,
    topCelebrities: [],
    topCategories: [],
    engagementLevel: 'new',
    recommendations: {
      celebrities: [],
      categories: [],
      contentTypes: [],
      intensity: 3,
    },
  });
  
  const viewStartTimeRef = useRef<number>(Date.now());
  const lastScrollDepthRef = useRef<number>(0);

  // Load preferences on mount
  useEffect(() => {
    loadState();
    
    // Track time spent when component unmounts
    return () => {
      const timeSpent = Math.round((Date.now() - viewStartTimeRef.current) / 1000);
      if (timeSpent > 5) { // Only track if spent more than 5 seconds
        recordEvent({
          type: 'time_spent',
          category: 'hot_section',
          value: timeSpent,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }, []);

  // Refresh state from localStorage
  const loadState = useCallback(() => {
    const preferences = loadPreferences();
    const topCelebrities = getTopCelebrities(10);
    const topCategories = getTopCategories(5);
    const recommendations = getGlamourRecommendations();
    const engagementLevel = getEngagementLevel();

    setState({
      isLoaded: true,
      preferences,
      topCelebrities,
      topCategories,
      engagementLevel,
      recommendations,
    });
  }, []);

  // Track view event
  const trackView = useCallback((item: HotMediaItem) => {
    recordEvent({
      type: 'view',
      celebrity: item.entity_name,
      category: item.category,
      contentType: item.platform === 'instagram' ? 'embed' : 'image',
      timestamp: new Date().toISOString(),
    });
    
    // Refresh state after tracking
    setTimeout(loadState, 100);
  }, [loadState]);

  // Track click event
  const trackClick = useCallback((item: HotMediaItem) => {
    recordEvent({
      type: 'click',
      celebrity: item.entity_name,
      category: item.category,
      timestamp: new Date().toISOString(),
    });
    
    setTimeout(loadState, 100);
  }, [loadState]);

  // Track share event
  const trackShare = useCallback((item: HotMediaItem) => {
    recordEvent({
      type: 'share',
      celebrity: item.entity_name,
      category: item.category,
      timestamp: new Date().toISOString(),
    });
    
    setTimeout(loadState, 100);
  }, [loadState]);

  // Track scroll depth
  const trackScrollDepth = useCallback((depth: number) => {
    if (depth > lastScrollDepthRef.current) {
      lastScrollDepthRef.current = depth;
      recordScrollDepth(depth, 'hot_section');
    }
  }, []);

  // Personalize content order
  const personalizeContent = useCallback(<T extends HotMediaItem>(items: T[]): T[] => {
    return personalizeContentOrder(items, {
      boostFavorites: true,
      boostRecent: true,
      boostTopCategories: true,
    });
  }, []);

  // Filter by user intensity
  const filterByUserIntensity = useCallback(<T extends HotMediaItem>(items: T[]): T[] => {
    return filterByIntensity(items);
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((celebrity: string): boolean => {
    const result = toggleFavoriteCelebrity(celebrity);
    loadState();
    return result;
  }, [loadState]);

  // Set intensity
  const setIntensity = useCallback((level: number) => {
    setIntensityPreference(level);
    loadState();
  }, [loadState]);

  // Check if celebrity is favorite
  const isFavorite = useCallback((celebrity: string): boolean => {
    return state.preferences?.favoriteCelebrities.includes(celebrity) || false;
  }, [state.preferences]);

  return {
    state,
    trackView,
    trackClick,
    trackShare,
    trackScrollDepth,
    personalizeContent,
    filterByUserIntensity,
    toggleFavorite,
    setIntensity,
    isFavorite,
    getPersonalizationSummary,
    refresh: loadState,
  };
}

/**
 * Hook for tracking scroll position in Hot section
 */
export function useScrollTracker(containerRef: React.RefObject<HTMLElement | null>) {
  const { trackScrollDepth } = useHotPersonalization();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop || window.scrollY;
      const scrollHeight = container.scrollHeight || document.documentElement.scrollHeight;
      const clientHeight = container.clientHeight || window.innerHeight;
      
      const scrollPercentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      trackScrollDepth(scrollPercentage);
    };

    // Use passive listener for performance
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, trackScrollDepth]);
}

/**
 * Hook for intersection-based view tracking
 */
export function useViewTracker(
  itemRef: React.RefObject<HTMLElement | null>,
  item: HotMediaItem,
  options: { threshold?: number; delay?: number } = {}
) {
  const { trackView } = useHotPersonalization();
  const hasTrackedRef = useRef(false);
  const { threshold = 0.5, delay = 1000 } = options;

  useEffect(() => {
    const element = itemRef.current;
    if (!element || hasTrackedRef.current) return;

    let timeoutId: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Wait for delay before counting as a view
          timeoutId = setTimeout(() => {
            if (!hasTrackedRef.current) {
              trackView(item);
              hasTrackedRef.current = true;
            }
          }, delay);
        } else {
          // Clear timeout if user scrolls away
          clearTimeout(timeoutId);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [itemRef, item, trackView, threshold, delay]);
}

export default useHotPersonalization;






