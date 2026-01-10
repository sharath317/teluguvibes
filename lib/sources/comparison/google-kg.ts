/**
 * Google Knowledge Graph Adapter
 * 
 * Fetches ONLY:
 * - Entity validation (is this a known movie?)
 * - Entity type confirmation
 * - Description length bucket (not text)
 * - Detailed description available flag
 * 
 * LEGAL NOTES:
 * - Official Google Knowledge Graph API
 * - No description text stored
 * - Only entity validation signals
 * - Rate limited by API quota
 */

import { BaseComparisonAdapter } from './base-adapter';
import {
  ComparisonSourceConfig,
  ComparisonQuery,
  ComparisonResult,
  SourceTier,
  Signal,
} from './types';

export class GoogleKGAdapter extends BaseComparisonAdapter {
  readonly config: ComparisonSourceConfig = {
    id: 'google_kg',
    name: 'Google Knowledge Graph',
    tier: SourceTier.PRIMARY,
    baseUrl: 'https://kgsearch.googleapis.com',
    rateLimit: 100, // API has generous quota
    cacheDays: 90, // KG data is stable
    enabled: true,
    featureFlag: 'comparison_google_kg',
    legalNotes: 'Official Google API. Entity validation only. No text stored.',
  };

  private readonly GOOGLE_KG_API_KEY = process.env.GOOGLE_KG_API_KEY;

  canHandle(query: ComparisonQuery): boolean {
    return Boolean(query.titleEn && this.GOOGLE_KG_API_KEY);
  }

  protected async fetchInternal(query: ComparisonQuery): Promise<ComparisonResult> {
    if (!this.GOOGLE_KG_API_KEY) {
      return this.createErrorResult('Not configured', 'Google KG API key not set');
    }

    try {
      // Search Knowledge Graph
      const searchQuery = `${query.titleEn} ${query.releaseYear} film`;
      const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(searchQuery)}&key=${this.GOOGLE_KG_API_KEY}&limit=5&types=Movie&languages=en`;
      
      const response = await this.safeFetch(url);
      
      if (!response.ok) {
        return this.createErrorResult('API error', `Status ${response.status}`);
      }

      const data = await response.json();
      const items = data.itemListElement || [];
      
      if (items.length === 0) {
        // Try without type restriction
        const fallbackUrl = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(searchQuery)}&key=${this.GOOGLE_KG_API_KEY}&limit=5&languages=en`;
        const fallbackResponse = await this.safeFetch(fallbackUrl);
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.itemListElement?.length > 0) {
            return this.processResults(fallbackData.itemListElement, query);
          }
        }
        
        return this.createErrorResult('Not found', 'No KG entity found');
      }

      return this.processResults(items, query);

    } catch (error) {
      return this.createErrorResult(
        'Fetch error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Process Knowledge Graph results
   */
  private processResults(
    items: Array<{ result?: Record<string, unknown>; resultScore?: number }>,
    query: ComparisonQuery
  ): ComparisonResult {
    // Find best match
    const bestMatch = items.find((item) => {
      const result = item.result;
      if (!result) return false;

      const name = (result.name as string)?.toLowerCase() || '';
      const desc = (result.description as string)?.toLowerCase() || '';
      
      return (
        name.includes(query.titleEn.toLowerCase()) ||
        desc.includes(String(query.releaseYear)) ||
        desc.includes('film') ||
        desc.includes('movie')
      );
    });

    if (!bestMatch || !bestMatch.result) {
      return this.createErrorResult('Not found', 'No matching entity');
    }

    const result = bestMatch.result;
    const signals: Record<string, Signal> = {};

    // Entity confirmed
    signals['entity_confirmed'] = {
      type: 'boolean',
      value: true,
    };

    // Entity score (confidence from Google)
    const score = bestMatch.resultScore || 0;
    signals['entity_score'] = {
      type: 'numeric',
      value: Math.min(score * 100, 100),
      rawValue: score,
      scale: '0-1',
    };

    // Entity type
    const types = (result['@type'] as string[]) || [];
    const isMovie = types.some((t) => 
      t.toLowerCase().includes('movie') || 
      t.toLowerCase().includes('film')
    );
    signals['is_movie_type'] = {
      type: 'boolean',
      value: isMovie,
    };

    // Has description
    const description = result.detailedDescription as { articleBody?: string } | undefined;
    const hasDescription = Boolean(description?.articleBody);
    signals['has_kg_description'] = {
      type: 'boolean',
      value: hasDescription,
    };

    // Description length bucket (without storing text)
    if (hasDescription && description?.articleBody) {
      const length = description.articleBody.length;
      signals['description_length_bucket'] = {
        type: 'bucket',
        value: length < 100 ? 'very_low' : 
               length < 300 ? 'low' : 
               length < 500 ? 'medium' : 
               length < 1000 ? 'high' : 'very_high',
        numericEquivalent: length < 100 ? 10 : 
                          length < 300 ? 30 : 
                          length < 500 ? 50 : 
                          length < 1000 ? 75 : 95,
      };
    }

    // Has image
    const image = result.image as { url?: string } | undefined;
    signals['has_kg_image'] = {
      type: 'boolean',
      value: Boolean(image?.url),
    };

    // Wikipedia link present
    const detailedDesc = result.detailedDescription as { url?: string } | undefined;
    const hasWikipedia = detailedDesc?.url?.includes('wikipedia.org') || false;
    signals['has_wikipedia_link'] = {
      type: 'boolean',
      value: hasWikipedia,
    };

    const signalStrength = Object.keys(signals).length / 7;
    return this.createSuccessResult(signals, signalStrength);
  }
}

export const googleKGAdapter = new GoogleKGAdapter();

