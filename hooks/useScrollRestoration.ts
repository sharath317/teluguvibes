'use client';

/**
 * useScrollRestoration Hook
 * 
 * Preserves and restores scroll position across:
 * - Tab switches
 * - Filter changes
 * - Modal open/close
 * - Back/forward navigation
 * 
 * Uses sessionStorage for persistence and history state for navigation.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface ScrollPosition {
  x: number;
  y: number;
  timestamp: number;
}

interface UseScrollRestorationOptions {
  /** Key prefix for storage (default: 'scroll') */
  keyPrefix?: string;
  /** Element to track scroll on (default: window) */
  scrollElement?: HTMLElement | null;
  /** Debounce delay in ms (default: 100) */
  debounceDelay?: number;
  /** Max age for stored positions in ms (default: 30 minutes) */
  maxAge?: number;
  /** Whether to restore on mount (default: true) */
  restoreOnMount?: boolean;
}

const STORAGE_KEY_PREFIX = 'telugu_scroll_';
const DEFAULT_MAX_AGE = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a unique key for the current page state
 */
function generateScrollKey(pathname: string, searchParams: string, prefix: string): string {
  const hash = `${pathname}${searchParams ? '?' + searchParams : ''}`;
  return `${STORAGE_KEY_PREFIX}${prefix}_${hash}`;
}

/**
 * Main scroll restoration hook
 */
export function useScrollRestoration(options: UseScrollRestorationOptions = {}) {
  const {
    keyPrefix = 'scroll',
    scrollElement = null,
    debounceDelay = 100,
    maxAge = DEFAULT_MAX_AGE,
    restoreOnMount = true,
  } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams?.toString() || '';
  
  const scrollKey = generateScrollKey(pathname, searchString, keyPrefix);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);

  /**
   * Get scroll position from storage
   */
  const getStoredPosition = useCallback((): ScrollPosition | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = sessionStorage.getItem(scrollKey);
      if (!stored) return null;
      
      const position: ScrollPosition = JSON.parse(stored);
      
      // Check if position is expired
      if (Date.now() - position.timestamp > maxAge) {
        sessionStorage.removeItem(scrollKey);
        return null;
      }
      
      return position;
    } catch {
      return null;
    }
  }, [scrollKey, maxAge]);

  /**
   * Save current scroll position to storage
   */
  const savePosition = useCallback(() => {
    if (typeof window === 'undefined' || isRestoringRef.current) return;
    
    const position: ScrollPosition = scrollElement
      ? { x: scrollElement.scrollLeft, y: scrollElement.scrollTop, timestamp: Date.now() }
      : { x: window.scrollX, y: window.scrollY, timestamp: Date.now() };
    
    try {
      sessionStorage.setItem(scrollKey, JSON.stringify(position));
    } catch {
      // Storage full or unavailable - fail silently
    }
  }, [scrollKey, scrollElement]);

  /**
   * Debounced save handler
   */
  const debouncedSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(savePosition, debounceDelay);
  }, [savePosition, debounceDelay]);

  /**
   * Restore scroll position
   */
  const restorePosition = useCallback(() => {
    const position = getStoredPosition();
    if (!position) return false;
    
    isRestoringRef.current = true;
    
    // Use requestAnimationFrame for smooth restoration
    requestAnimationFrame(() => {
      if (scrollElement) {
        scrollElement.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
      } else {
        window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 50);
    });
    
    return true;
  }, [getStoredPosition, scrollElement]);

  /**
   * Clear stored position for current key
   */
  const clearPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(scrollKey);
  }, [scrollKey]);

  /**
   * Scroll to top (useful for new content loads)
   */
  const scrollToTop = useCallback((smooth = true) => {
    isRestoringRef.current = true;
    
    if (scrollElement) {
      scrollElement.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
    }
    
    clearPosition();
    
    setTimeout(() => {
      isRestoringRef.current = false;
    }, smooth ? 500 : 50);
  }, [scrollElement, clearPosition]);

  // Set up scroll listener
  useEffect(() => {
    const target = scrollElement || window;
    
    target.addEventListener('scroll', debouncedSave, { passive: true });
    
    return () => {
      target.removeEventListener('scroll', debouncedSave);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [scrollElement, debouncedSave]);

  // Restore on mount if enabled
  useEffect(() => {
    if (restoreOnMount) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        restorePosition();
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [restoreOnMount, restorePosition]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setTimeout(restorePosition, 50);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [restorePosition]);

  return {
    /** Save current scroll position */
    savePosition,
    /** Restore saved scroll position */
    restorePosition,
    /** Clear saved position for current page */
    clearPosition,
    /** Scroll to top and clear saved position */
    scrollToTop,
    /** Current scroll key */
    scrollKey,
  };
}

/**
 * Hook for preserving scroll position within a specific tab/section
 */
export function useTabScrollMemory(tabId: string) {
  return useScrollRestoration({
    keyPrefix: `tab_${tabId}`,
    restoreOnMount: false,
  });
}

/**
 * Hook for filter state scroll preservation
 */
export function useFilterScrollMemory(filterKey: string) {
  return useScrollRestoration({
    keyPrefix: `filter_${filterKey}`,
    debounceDelay: 200,
  });
}

export default useScrollRestoration;

