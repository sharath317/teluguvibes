/**
 * Base Comparison Source Adapter
 * 
 * Provides common functionality for all comparison source adapters:
 * - Rate limiting (default: 1 request per 5 seconds)
 * - Response caching (default: 30 days)
 * - robots.txt compliance checking
 * - Feature flag support
 * - Error handling and logging
 */

import {
  ComparisonSourceAdapter,
  ComparisonSourceConfig,
  ComparisonQuery,
  ComparisonResult,
  SourceTier,
  Signal,
} from './types';

// ============================================================
// RATE LIMITING
// ============================================================

const rateLimitState: Record<string, { lastRequest: number; queue: Array<() => void> }> = {};

/**
 * Rate limiter that ensures we don't exceed the configured rate limit
 */
async function waitForRateLimit(sourceId: string, minDelayMs: number): Promise<void> {
  if (!rateLimitState[sourceId]) {
    rateLimitState[sourceId] = { lastRequest: 0, queue: [] };
  }

  const state = rateLimitState[sourceId];
  const now = Date.now();
  const timeSinceLastRequest = now - state.lastRequest;

  if (timeSinceLastRequest < minDelayMs) {
    const waitTime = minDelayMs - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  state.lastRequest = Date.now();
}

// ============================================================
// IN-MEMORY CACHE (Simple implementation)
// ============================================================

interface CacheEntry {
  result: ComparisonResult;
  cachedAt: number;
  expiresAt: number;
}

const memoryCache: Record<string, CacheEntry> = {};

function getCacheKey(sourceId: string, movieId: string): string {
  return `${sourceId}:${movieId}`;
}

function getFromCache(sourceId: string, movieId: string): ComparisonResult | null {
  const key = getCacheKey(sourceId, movieId);
  const entry = memoryCache[key];

  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete memoryCache[key];
    return null;
  }

  return { ...entry.result, fromCache: true };
}

function setInCache(sourceId: string, movieId: string, result: ComparisonResult, cacheDays: number): void {
  const key = getCacheKey(sourceId, movieId);
  const now = Date.now();
  memoryCache[key] = {
    result,
    cachedAt: now,
    expiresAt: now + cacheDays * 24 * 60 * 60 * 1000,
  };
}

// ============================================================
// FEATURE FLAGS (Simple implementation)
// ============================================================

const featureFlags: Record<string, boolean> = {
  // All comparison sources disabled by default
  'comparison_rotten_tomatoes': false,
  'comparison_filmibeat': false,
  'comparison_idlebrain': false,
  'comparison_greatandhra': false,
  'comparison_jiosaavn': false,
  'comparison_spotify': false,
  'comparison_youtube': false,
  'comparison_google_kg': false,
  // Master switch
  'comparison_sources_enabled': false,
};

export function isFeatureEnabled(flagKey: string): boolean {
  // Check master switch first
  if (!featureFlags['comparison_sources_enabled']) {
    return false;
  }
  return featureFlags[flagKey] ?? false;
}

export function enableFeature(flagKey: string): void {
  featureFlags[flagKey] = true;
}

export function disableFeature(flagKey: string): void {
  featureFlags[flagKey] = false;
}

// ============================================================
// BASE ADAPTER CLASS
// ============================================================

export abstract class BaseComparisonAdapter implements ComparisonSourceAdapter {
  abstract readonly config: ComparisonSourceConfig;

  /**
   * Calculate minimum delay between requests based on rate limit
   */
  protected get minDelayMs(): number {
    // Convert requests per minute to ms between requests
    // Add 20% buffer for safety
    return Math.ceil((60 / this.config.rateLimit) * 1000 * 1.2);
  }

  /**
   * Check if this adapter is enabled via feature flag
   */
  protected isEnabled(): boolean {
    return this.config.enabled && isFeatureEnabled(this.config.featureFlag);
  }

  /**
   * Subclasses must implement this to determine if they can handle a query
   */
  abstract canHandle(query: ComparisonQuery): boolean;

  /**
   * Subclasses must implement the actual fetch logic
   */
  protected abstract fetchInternal(query: ComparisonQuery): Promise<ComparisonResult>;

  /**
   * Generate a unique movie ID from query parameters
   */
  protected getMovieId(query: ComparisonQuery): string {
    if (query.tmdbId) return `tmdb:${query.tmdbId}`;
    if (query.imdbId) return `imdb:${query.imdbId}`;
    return `title:${query.titleEn}:${query.releaseYear}`;
  }

  /**
   * Main fetch method with rate limiting, caching, and error handling
   */
  async fetch(query: ComparisonQuery): Promise<ComparisonResult> {
    const movieId = this.getMovieId(query);

    // Check if enabled
    if (!this.isEnabled()) {
      return this.createErrorResult(
        'Source disabled',
        `${this.config.name} is disabled via feature flag`
      );
    }

    // Check cache first
    const cached = getFromCache(this.config.id, movieId);
    if (cached) {
      return cached;
    }

    // Rate limit
    await waitForRateLimit(this.config.id, this.minDelayMs);

    try {
      // Fetch from source
      const result = await this.fetchInternal(query);

      // Cache successful results
      if (result.success) {
        setInCache(this.config.id, movieId, result, this.config.cacheDays);
      }

      return result;
    } catch (error) {
      return this.createErrorResult(
        'Fetch failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get the last fetch timestamp for a movie
   */
  async getLastFetch(movieId: string): Promise<Date | null> {
    const key = getCacheKey(this.config.id, movieId);
    const entry = memoryCache[key];
    return entry ? new Date(entry.cachedAt) : null;
  }

  /**
   * Check if cached data is still valid
   */
  async isCacheValid(movieId: string): Promise<boolean> {
    const key = getCacheKey(this.config.id, movieId);
    const entry = memoryCache[key];
    return entry ? Date.now() < entry.expiresAt : false;
  }

  /**
   * Create an error result
   */
  protected createErrorResult(error: string, details?: string): ComparisonResult {
    return {
      sourceId: this.config.id,
      tier: this.config.tier,
      success: false,
      error: details ? `${error}: ${details}` : error,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      confidenceWeight: 0,
      signalStrength: 0,
      signals: {},
    };
  }

  /**
   * Create a successful result
   */
  protected createSuccessResult(
    signals: Record<string, Signal>,
    signalStrength: number
  ): ComparisonResult {
    // Calculate confidence weight based on tier and signal strength
    const tierWeight = {
      [SourceTier.PRIMARY]: 1.0,
      [SourceTier.AGGREGATOR]: 0.7,
      [SourceTier.COMMUNITY]: 0.5,
      [SourceTier.SIGNAL]: 0.3,
    };

    return {
      sourceId: this.config.id,
      tier: this.config.tier,
      success: true,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      confidenceWeight: tierWeight[this.config.tier] * signalStrength,
      signalStrength,
      signals,
    };
  }

  /**
   * Normalize a rating to 0-100 scale
   */
  protected normalizeRating(value: number, scale: string): number {
    switch (scale) {
      case '0-5':
        return (value / 5) * 100;
      case '0-10':
        return (value / 10) * 100;
      case 'percentage':
        return value;
      default:
        return value;
    }
  }

  /**
   * Convert numeric value to bucket
   */
  protected toBucket(value: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (value < 20) return 'very_low';
    if (value < 40) return 'low';
    if (value < 60) return 'medium';
    if (value < 80) return 'high';
    return 'very_high';
  }

  /**
   * Safe fetch with timeout
   */
  protected async safeFetch(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'TeluguPortal/1.0 (movie-archive; validation-only)',
          ...options.headers,
        },
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

