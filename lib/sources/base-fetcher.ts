/**
 * BASE FETCHER CLASS
 *
 * Abstract base for all data fetchers.
 * Enforces consistent output format and error handling.
 */

import { FetcherResult, FetcherConfig, getSourceReliability } from './types';

export abstract class BaseFetcher<T> {
  protected sourceName: string;
  protected baseReliability: number;
  protected rateLimit: { requests: number; windowMs: number };
  protected requestCount: number = 0;
  protected windowStart: number = Date.now();

  constructor(sourceName: string) {
    this.sourceName = sourceName;
    this.baseReliability = getSourceReliability(sourceName);
    this.rateLimit = { requests: 40, windowMs: 10000 }; // Default: 40 per 10s
  }

  /**
   * Main fetch method - must be implemented by subclasses
   */
  abstract fetch(config: FetcherConfig): Promise<FetcherResult<T>[]>;

  /**
   * Check if entity is Telugu cinema related
   */
  protected abstract isTeluguRelated(data: T): boolean;

  /**
   * Calculate confidence score for the data
   */
  protected calculateConfidence(
    data: T,
    additionalFactors: Record<string, number> = {}
  ): number {
    let confidence = this.baseReliability;

    // Apply additional factors
    for (const [factor, weight] of Object.entries(additionalFactors)) {
      confidence *= weight;
    }

    // Telugu verification boost
    if (this.isTeluguRelated(data)) {
      confidence = Math.min(1, confidence * 1.05);
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Wrap raw data in standard format
   */
  protected wrapResult(
    rawData: T,
    confidence: number,
    isTeluguVerified: boolean = false,
    metadata?: FetcherResult<T>['metadata']
  ): FetcherResult<T> {
    return {
      raw_data: rawData,
      source_name: this.sourceName,
      confidence_score: confidence,
      fetched_at: new Date().toISOString(),
      is_telugu_verified: isTeluguVerified || this.isTeluguRelated(rawData),
      metadata,
    };
  }

  /**
   * Rate limiting helper
   */
  protected async respectRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart > this.rateLimit.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Wait if at limit
    if (this.requestCount >= this.rateLimit.requests) {
      const waitTime = this.rateLimit.windowMs - (now - this.windowStart);
      if (waitTime > 0) {
        await this.delay(waitTime);
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }

    this.requestCount++;
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe JSON fetch with error handling
   */
  protected async fetchJSON<R>(
    url: string,
    options: RequestInit = {}
  ): Promise<R | null> {
    try {
      await this.respectRateLimit();

      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        console.warn(`Fetch failed: ${url} - ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn(`Fetch error: ${url} - ${error}`);
      return null;
    }
  }
}



