/**
 * Rotten Tomatoes Comparison Adapter
 * 
 * Fetches ONLY:
 * - Critic score percentage (Tomatometer)
 * - Audience score percentage
 * - Fresh/Rotten/Certified Fresh flag
 * 
 * LEGAL NOTES:
 * - Uses public search API only
 * - No scraping of reviews or text content
 * - Stores only numeric/categorical signals
 * - Rate limited to 12 requests/minute
 */

import { BaseComparisonAdapter } from './base-adapter';
import {
  ComparisonSourceConfig,
  ComparisonQuery,
  ComparisonResult,
  SourceTier,
  Signal,
} from './types';

export class RottenTomatoesAdapter extends BaseComparisonAdapter {
  readonly config: ComparisonSourceConfig = {
    id: 'rotten_tomatoes',
    name: 'Rotten Tomatoes',
    tier: SourceTier.AGGREGATOR,
    baseUrl: 'https://www.rottentomatoes.com',
    rateLimit: 12, // 12 requests per minute
    cacheDays: 30,
    enabled: true,
    featureFlag: 'comparison_rotten_tomatoes',
    legalNotes: 'Public search API only. No review text stored. Numeric scores only.',
  };

  canHandle(query: ComparisonQuery): boolean {
    // RT works best with English titles and IMDb ID
    return Boolean(query.titleEn && query.releaseYear);
  }

  protected async fetchInternal(query: ComparisonQuery): Promise<ComparisonResult> {
    try {
      // Search for the movie using the public search endpoint
      const searchUrl = `https://www.rottentomatoes.com/api/private/v2.0/search?q=${encodeURIComponent(query.titleEn)}&limit=5`;
      
      const response = await this.safeFetch(searchUrl);
      
      if (!response.ok) {
        return this.createErrorResult('API error', `Status ${response.status}`);
      }

      const data = await response.json();
      
      // Find matching movie
      const movies = data.movies || [];
      const match = movies.find((m: { year?: number; name?: string }) => {
        const yearMatch = m.year === query.releaseYear;
        const titleMatch = m.name?.toLowerCase().includes(query.titleEn.toLowerCase());
        return yearMatch || titleMatch;
      });

      if (!match) {
        return this.createErrorResult('Not found', `No match for ${query.titleEn} (${query.releaseYear})`);
      }

      // Extract signals
      const signals: Record<string, Signal> = {};
      let signalCount = 0;

      // Critic score (Tomatometer)
      if (match.meterScore !== undefined && match.meterScore !== null) {
        signals['critic_score'] = {
          type: 'numeric',
          value: match.meterScore,
          rawValue: match.meterScore,
          scale: 'percentage',
        };
        signalCount++;
      }

      // Audience score
      if (match.audienceScore !== undefined && match.audienceScore !== null) {
        signals['audience_score'] = {
          type: 'numeric',
          value: match.audienceScore,
          rawValue: match.audienceScore,
          scale: 'percentage',
        };
        signalCount++;
      }

      // Freshness status
      if (match.meterClass) {
        const freshnessMap: Record<string, string> = {
          'certified_fresh': 'certified_fresh',
          'fresh': 'fresh',
          'rotten': 'rotten',
        };
        signals['freshness'] = {
          type: 'categorical',
          value: freshnessMap[match.meterClass] || 'unknown',
          allowedValues: ['certified_fresh', 'fresh', 'rotten', 'unknown'],
        };
        signalCount++;
      }

      // Cast validation (names only, no bio)
      if (match.castItems && Array.isArray(match.castItems)) {
        const castNames = match.castItems
          .slice(0, 5)
          .map((c: { name?: string }) => c.name)
          .filter(Boolean);
        
        if (castNames.length > 0) {
          signals['cast_count'] = {
            type: 'numeric',
            value: Math.min(castNames.length / 5, 1) * 100,
            rawValue: castNames.length,
            scale: '0-5',
          };
          signalCount++;
        }
      }

      const signalStrength = signalCount / 4; // Max 4 signals

      return this.createSuccessResult(signals, signalStrength);

    } catch (error) {
      return this.createErrorResult(
        'Fetch error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

// Singleton instance
export const rottenTomatoesAdapter = new RottenTomatoesAdapter();

