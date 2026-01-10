/**
 * Comparison Sources Module
 * 
 * This module provides adapters for "comparison-only" data sources.
 * These sources are used ONLY for validation and confidence scoring,
 * NOT as primary data sources.
 * 
 * All adapters are DISABLED by default and must be explicitly enabled
 * via feature flags.
 */

// Types
export * from './types';

// Base adapter
export {
  BaseComparisonAdapter,
  isFeatureEnabled,
  enableFeature,
  disableFeature,
} from './base-adapter';

// Individual adapters
export { rottenTomatoesAdapter, RottenTomatoesAdapter } from './rotten-tomatoes';
export { filmibeatAdapter, FilmibeatAdapter } from './filmibeat';
export { idlebrainSentimentAdapter, IdlebrainSentimentAdapter } from './idlebrain-sentiment';
export { musicPopularityAdapter, MusicPopularityAdapter } from './music-popularity';
export { trailerVisibilityAdapter, TrailerVisibilityAdapter } from './trailer-visibility';
export { googleKGAdapter, GoogleKGAdapter } from './google-kg';

// ============================================================
// COMPARISON ORCHESTRATOR
// ============================================================

import {
  ComparisonSourceAdapter,
  ComparisonQuery,
  ComparisonResult,
  AggregatedComparison,
  SourceTier,
} from './types';

import { rottenTomatoesAdapter } from './rotten-tomatoes';
import { filmibeatAdapter } from './filmibeat';
import { idlebrainSentimentAdapter } from './idlebrain-sentiment';
import { musicPopularityAdapter } from './music-popularity';
import { trailerVisibilityAdapter } from './trailer-visibility';
import { googleKGAdapter } from './google-kg';
import { isFeatureEnabled, enableFeature } from './base-adapter';

/**
 * All available comparison adapters
 */
const ALL_ADAPTERS: ComparisonSourceAdapter[] = [
  rottenTomatoesAdapter,
  filmibeatAdapter,
  idlebrainSentimentAdapter,
  musicPopularityAdapter,
  trailerVisibilityAdapter,
  googleKGAdapter,
];

/**
 * Orchestrator for fetching from multiple comparison sources
 */
export class ComparisonOrchestrator {
  private adapters: ComparisonSourceAdapter[];

  constructor(adapters?: ComparisonSourceAdapter[]) {
    this.adapters = adapters || ALL_ADAPTERS;
  }

  /**
   * Enable all comparison sources (master switch)
   */
  static enableAll(): void {
    enableFeature('comparison_sources_enabled');
    ALL_ADAPTERS.forEach((adapter) => {
      enableFeature(adapter.config.featureFlag);
    });
  }

  /**
   * Fetch comparison data from all enabled sources
   */
  async fetchAll(query: ComparisonQuery): Promise<AggregatedComparison> {
    const results: ComparisonResult[] = [];
    
    // Fetch from all adapters that can handle this query
    const fetchPromises = this.adapters
      .filter((adapter) => adapter.canHandle(query))
      .map(async (adapter) => {
        try {
          return await adapter.fetch(query);
        } catch (error) {
          return {
            sourceId: adapter.config.id,
            tier: adapter.config.tier,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            fetchedAt: new Date().toISOString(),
            fromCache: false,
            confidenceWeight: 0,
            signalStrength: 0,
            signals: {},
          } as ComparisonResult;
        }
      });

    const fetchedResults = await Promise.all(fetchPromises);
    results.push(...fetchedResults.filter((r) => r !== null));

    // Aggregate results
    return this.aggregateResults(query, results);
  }

  /**
   * Aggregate results from multiple sources
   */
  private aggregateResults(
    query: ComparisonQuery,
    results: ComparisonResult[]
  ): AggregatedComparison {
    const successfulResults = results.filter((r) => r.success);
    const conflicts: AggregatedComparison['conflicts'] = [];
    
    // Check for rating conflicts
    const ratingSignals = successfulResults
      .flatMap((r) => 
        Object.entries(r.signals)
          .filter(([key]) => key.includes('rating') || key.includes('score'))
          .map(([key, signal]) => ({
            source: r.sourceId,
            field: key,
            value: signal.type === 'numeric' ? signal.value : null,
          }))
      )
      .filter((s) => s.value !== null);

    if (ratingSignals.length >= 2) {
      const values = ratingSignals.map((s) => s.value as number);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const maxDiff = Math.max(...values) - Math.min(...values);
      
      if (maxDiff > 30) {
        conflicts.push({
          field: 'rating',
          sources: ratingSignals.map((s) => s.source),
          values: ratingSignals.map((s) => s.value),
          severity: maxDiff > 50 ? 'high' : 'medium',
        });
      }
    }

    // Calculate confidence adjustment
    let confidenceAdjustment = 0;
    
    // Increase confidence if multiple sources agree
    if (successfulResults.length >= 2 && conflicts.length === 0) {
      confidenceAdjustment += 0.1;
    } else if (successfulResults.length >= 3 && conflicts.length === 0) {
      confidenceAdjustment += 0.15;
    }
    
    // Decrease confidence if there are conflicts
    for (const conflict of conflicts) {
      if (conflict.severity === 'high') {
        confidenceAdjustment -= 0.15;
      } else if (conflict.severity === 'medium') {
        confidenceAdjustment -= 0.08;
      } else {
        confidenceAdjustment -= 0.03;
      }
    }

    // Clamp adjustment
    confidenceAdjustment = Math.max(-0.2, Math.min(0.2, confidenceAdjustment));

    // Calculate alignment score
    const alignmentScore = successfulResults.length > 0
      ? (successfulResults.length - conflicts.length) / successfulResults.length
      : 0;

    // Determine if manual review needed
    const needsManualReview = 
      conflicts.some((c) => c.severity === 'high') ||
      conflicts.length >= 2 ||
      confidenceAdjustment < -0.1;

    return {
      movieId: query.tmdbId ? `tmdb:${query.tmdbId}` : `title:${query.titleEn}:${query.releaseYear}`,
      movieTitle: query.titleEn,
      sources: results,
      confidenceAdjustment,
      alignmentScore,
      conflicts,
      needsManualReview,
      reviewReason: needsManualReview
        ? conflicts.map((c) => `${c.field}: ${c.severity} conflict`).join('; ')
        : undefined,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Get status of all adapters
   */
  getAdapterStatus(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    tier: SourceTier;
  }> {
    return this.adapters.map((adapter) => ({
      id: adapter.config.id,
      name: adapter.config.name,
      enabled: isFeatureEnabled(adapter.config.featureFlag),
      tier: adapter.config.tier,
    }));
  }
}

// Default orchestrator instance
export const comparisonOrchestrator = new ComparisonOrchestrator();

