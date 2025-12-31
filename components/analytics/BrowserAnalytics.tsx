'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * TeluguVibes Browser-Native Analytics
 * Zero external dependencies, minimal impact
 * Uses: IntersectionObserver, requestIdleCallback, localStorage
 */

interface AnalyticsEvent {
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

// ===== VISITOR ID (Anonymous) =====

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';

  let visitorId = localStorage.getItem('tv_visitor_id');
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('tv_visitor_id', visitorId);
  }
  return visitorId;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('tv_session_id');
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('tv_session_id', sessionId);
  }
  return sessionId;
}

// ===== PREFERENCE LEARNING (localStorage) =====

interface UserPreferences {
  categories: Record<string, number>;
  timeSlots: Record<number, number>;
  readingPatterns: {
    avgScrollDepth: number;
    avgTimeOnPage: number;
    preferredLength: 'short' | 'medium' | 'long';
  };
  lastUpdated: number;
}

function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return createDefaultPreferences();
  }

  try {
    const stored = localStorage.getItem('tv_preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}

  return createDefaultPreferences();
}

function createDefaultPreferences(): UserPreferences {
  return {
    categories: {},
    timeSlots: {},
    readingPatterns: {
      avgScrollDepth: 50,
      avgTimeOnPage: 60,
      preferredLength: 'medium',
    },
    lastUpdated: Date.now(),
  };
}

function updatePreferences(update: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return;

  const current = getPreferences();
  const updated = {
    ...current,
    ...update,
    lastUpdated: Date.now(),
  };

  localStorage.setItem('tv_preferences', JSON.stringify(updated));
}

// ===== EVENT QUEUE =====

const eventQueue: AnalyticsEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

function queueEvent(type: string, data: Record<string, any>): void {
  eventQueue.push({
    type,
    data: {
      ...data,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
    },
    timestamp: Date.now(),
  });

  // Batch and send using requestIdleCallback
  if (!flushTimeout && eventQueue.length >= 5) {
    flushTimeout = setTimeout(flushEvents, 2000);
  }
}

async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue.length = 0;
  flushTimeout = null;

  // Use requestIdleCallback for non-critical work
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => sendEvents(events), { timeout: 5000 });
  } else {
    setTimeout(() => sendEvents(events), 100);
  }
}

async function sendEvents(events: AnalyticsEvent[]): Promise<void> {
  try {
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/events', JSON.stringify(events));
    } else {
      // Fallback to fetch
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
        keepalive: true,
      });
    }
  } catch (error) {
    console.error('Analytics send error:', error);
  }
}

// ===== MAIN COMPONENT =====

interface BrowserAnalyticsProps {
  postId?: string;
  category?: string;
  contentLength?: number;
}

export function BrowserAnalytics({ postId, category, contentLength }: BrowserAnalyticsProps) {
  const pathname = usePathname();
  const startTime = useRef(Date.now());
  const maxScrollDepth = useRef(0);
  const hasTrackedPageview = useRef(false);

  // Track page view
  useEffect(() => {
    if (hasTrackedPageview.current) return;
    hasTrackedPageview.current = true;

    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);

    queueEvent('pageview', {
      path: pathname,
      postId,
      category,
      referrer,
      utmSource: urlParams.get('utm_source'),
      utmMedium: urlParams.get('utm_medium'),
      utmCampaign: urlParams.get('utm_campaign'),
      deviceType: getDeviceType(),
      screenWidth: window.innerWidth,
    });

    // Update category preference
    if (category) {
      const prefs = getPreferences();
      prefs.categories[category] = (prefs.categories[category] || 0) + 1;

      const hour = new Date().getHours();
      prefs.timeSlots[hour] = (prefs.timeSlots[hour] || 0) + 1;

      updatePreferences(prefs);
    }

    return () => {
      hasTrackedPageview.current = false;
    };
  }, [pathname, postId, category]);

  // Scroll depth tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

      if (scrollPercent > maxScrollDepth.current) {
        maxScrollDepth.current = scrollPercent;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track time on page & send on leave
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const timeOnPage = Math.round((Date.now() - startTime.current) / 1000);

        queueEvent('page_leave', {
          path: pathname,
          postId,
          timeOnPage,
          scrollDepth: maxScrollDepth.current,
        });

        // Update reading patterns
        if (postId && timeOnPage > 5) {
          const prefs = getPreferences();
          const { avgScrollDepth, avgTimeOnPage } = prefs.readingPatterns;

          // Rolling average
          prefs.readingPatterns.avgScrollDepth = Math.round(
            (avgScrollDepth * 0.8) + (maxScrollDepth.current * 0.2)
          );
          prefs.readingPatterns.avgTimeOnPage = Math.round(
            (avgTimeOnPage * 0.8) + (timeOnPage * 0.2)
          );

          // Determine preferred length
          if (contentLength) {
            if (maxScrollDepth.current > 80 && contentLength > 500) {
              prefs.readingPatterns.preferredLength = 'long';
            } else if (maxScrollDepth.current < 40 && contentLength > 300) {
              prefs.readingPatterns.preferredLength = 'short';
            } else {
              prefs.readingPatterns.preferredLength = 'medium';
            }
          }

          updatePreferences(prefs);
        }

        flushEvents();
      }
    };

    // Flush on page hide
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', () => flushEvents());

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, postId, contentLength]);

  return null; // Invisible component
}

// ===== ENGAGEMENT TRACKING HOOK =====

export function useEngagementTracker(elementId: string, postId?: string) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const viewStartTime = useRef<number | null>(null);

  useEffect(() => {
    const element = document.getElementById(elementId);
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            viewStartTime.current = Date.now();
          } else if (viewStartTime.current) {
            const viewTime = Date.now() - viewStartTime.current;

            if (viewTime > 2000) { // At least 2 seconds
              queueEvent('element_engagement', {
                elementId,
                postId,
                viewTime: Math.round(viewTime / 1000),
                visibleRatio: entry.intersectionRatio,
              });
            }

            viewStartTime.current = null;
          }
        }
      },
      { threshold: [0.25, 0.5, 0.75, 1.0] }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [elementId, postId]);
}

// ===== CLICK TRACKING =====

export function trackClick(
  target: string,
  context: Record<string, any> = {}
): void {
  queueEvent('click', {
    target,
    ...context,
  });
}

// ===== SHARE TRACKING =====

export function trackShare(
  platform: string,
  postId?: string,
  title?: string
): void {
  queueEvent('share', {
    platform,
    postId,
    title,
    method: 'native' in navigator && 'share' in navigator ? 'native' : 'fallback',
  });
}

// ===== SEARCH TRACKING =====

export function trackSearch(query: string, resultCount?: number): void {
  queueEvent('search', {
    query,
    resultCount,
  });
}

// ===== WEB SHARE API =====

export async function shareContent(options: {
  title: string;
  text?: string;
  url: string;
  postId?: string;
}): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      trackShare('native', options.postId, options.title);
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share error:', error);
      }
    }
  }

  // Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(options.url);
    trackShare('clipboard', options.postId, options.title);
    return true;
  } catch {
    return false;
  }
}

// ===== HELPERS =====

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// ===== GET USER PREFERENCES (for personalization) =====

export function getUserPreferences(): UserPreferences {
  return getPreferences();
}

export function getTopCategories(limit: number = 3): string[] {
  const prefs = getPreferences();
  return Object.entries(prefs.categories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([cat]) => cat);
}

export function getOptimalPublishHours(): number[] {
  const prefs = getPreferences();
  return Object.entries(prefs.timeSlots)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
}



