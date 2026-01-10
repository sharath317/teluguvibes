'use client';

/**
 * Content Filter Hook
 * 
 * Provides filtering utilities based on content mode.
 * Filters movies, images, and text based on sensitivity.
 */

import { useMemo, useCallback } from 'react';
import { useContentMode, ContentMode } from '@/lib/content/content-mode-context';
import { 
  ContentProfile, 
  isFamilySafeProfile,
  getWarningMessage 
} from '@/types/content';

// ============================================================
// TYPES
// ============================================================

export interface Movie {
  id: string;
  title_en: string;
  content_profile?: ContentProfile | null;
  is_adult?: boolean | null;
  [key: string]: unknown;
}

export interface Image {
  url: string;
  isSafe?: boolean;
  isAdult?: boolean;
  [key: string]: unknown;
}

export interface ContentFilterResult<T> {
  items: T[];
  filteredCount: number;
  totalCount: number;
  hasHiddenContent: boolean;
}

// ============================================================
// FILTER LOGIC
// ============================================================

/**
 * Check if movie is allowed in current mode
 */
function isMovieAllowed(movie: Movie, mode: ContentMode): boolean {
  // No profile = assume not family safe, but allow in standard mode
  if (!movie.content_profile) {
    if (mode === 'family') {
      // In family safe mode, only allow if explicitly not adult
      return movie.is_adult === false;
    }
    // For standard and adult modes, allow unless explicitly adult
    return movie.is_adult !== true;
  }

  const profile = movie.content_profile;

  switch (mode) {
    case 'family':
      return profile.isFamilySafe && !profile.isAdult;
    
    case 'standard':
      // Allow everything except explicit adult content
      return !profile.isAdult || profile.audienceRating !== 'A';
    
    case 'adult':
      // Allow everything
      return true;
    
    default:
      return false;
  }
}

/**
 * Check if image is allowed in current mode
 */
function isImageAllowed(image: Image, mode: ContentMode): boolean {
  switch (mode) {
    case 'family':
      return image.isSafe !== false && image.isAdult !== true;
    
    case 'standard':
      return image.isAdult !== true;
    
    case 'adult':
      return true;
    
    default:
      return false;
  }
}

/**
 * Sanitize text for family-safe mode
 */
function sanitizeText(text: string, mode: ContentMode): string {
  if (mode !== 'family') return text;
  
  // List of words to censor in family-safe mode
  const censorWords = [
    /\b(fuck|shit|damn|ass|bitch|bastard)\w*/gi,
    /\b(sex|sexual|nude|naked|porn)\w*/gi,
    /\b(kill|murder|blood|gore)\w*/gi,
  ];
  
  let sanitized = text;
  for (const pattern of censorWords) {
    sanitized = sanitized.replace(pattern, (match) => 
      match[0] + '*'.repeat(match.length - 1)
    );
  }
  
  return sanitized;
}

// ============================================================
// HOOK
// ============================================================

export function useContentFilter() {
  const { mode, isAgeVerified } = useContentMode();
  
  // Derive mode-based flags
  const isFamilySafe = mode === 'family';
  const allowsAdultContent = mode === 'adult' && isAgeVerified;

  /**
   * Filter an array of movies based on content mode
   */
  const filterMovies = useCallback(<T extends Movie>(
    movies: T[]
  ): ContentFilterResult<T> => {
    const filtered = movies.filter(m => isMovieAllowed(m, mode));
    
    return {
      items: filtered,
      filteredCount: movies.length - filtered.length,
      totalCount: movies.length,
      hasHiddenContent: filtered.length < movies.length,
    };
  }, [mode]);

  /**
   * Filter an array of images based on content mode
   */
  const filterImages = useCallback(<T extends Image>(
    images: T[]
  ): ContentFilterResult<T> => {
    const filtered = images.filter(i => isImageAllowed(i, mode));
    
    return {
      items: filtered,
      filteredCount: images.length - filtered.length,
      totalCount: images.length,
      hasHiddenContent: filtered.length < images.length,
    };
  }, [mode]);

  /**
   * Sanitize text content based on mode
   */
  const filterText = useCallback((text: string): string => {
    return sanitizeText(text, mode);
  }, [mode]);

  /**
   * Check if a single movie is visible
   */
  const isMovieVisible = useCallback((movie: Movie): boolean => {
    return isMovieAllowed(movie, mode);
  }, [mode]);

  /**
   * Check if a single image is visible
   */
  const isImageVisible = useCallback((image: Image): boolean => {
    return isImageAllowed(image, mode);
  }, [mode]);

  /**
   * Get content warning for a movie (if applicable)
   */
  const getContentWarning = useCallback((movie: Movie): string | null => {
    if (!movie.content_profile) return null;
    if (allowsAdultContent) return null;
    
    return getWarningMessage(movie.content_profile);
  }, [allowsAdultContent]);

  /**
   * Check if content warning should be shown
   */
  const shouldShowWarning = useCallback((movie: Movie): boolean => {
    if (!movie.content_profile) return false;
    if (allowsAdultContent) return false;
    
    return movie.content_profile.requiresWarning;
  }, [allowsAdultContent]);

  /**
   * Get placeholder image for hidden content
   */
  const getPlaceholderImage = useCallback((): string => {
    return '/images/content-hidden-placeholder.png';
  }, []);

  return {
    // Mode info
    mode,
    isFamilySafe,
    allowsAdultContent,
    
    // Filtering
    filterMovies,
    filterImages,
    filterText,
    
    // Single item checks
    isMovieVisible,
    isImageVisible,
    
    // Warnings
    getContentWarning,
    shouldShowWarning,
    
    // Utilities
    getPlaceholderImage,
  };
}

// ============================================================
// CONVENIENCE HOOKS
// ============================================================

/**
 * Filter movies and memoize result
 */
export function useFilteredMovies<T extends Movie>(movies: T[]): ContentFilterResult<T> {
  const { filterMovies } = useContentFilter();
  
  return useMemo(() => filterMovies(movies), [filterMovies, movies]);
}

/**
 * Filter images and memoize result
 */
export function useFilteredImages<T extends Image>(images: T[]): ContentFilterResult<T> {
  const { filterImages } = useContentFilter();
  
  return useMemo(() => filterImages(images), [filterImages, images]);
}


