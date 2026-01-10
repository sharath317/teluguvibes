/**
 * Idlebrain & GreatAndhra Sentiment Adapter
 * 
 * Fetches ONLY:
 * - Sentiment classification (positive/neutral/negative)
 * - Rating bucket (hit/average/flop)
 * - Coverage flag (whether the movie was reviewed)
 * 
 * LEGAL NOTES:
 * - Telugu cinema review sites
 * - NO review text stored
 * - Only sentiment classification derived from public pages
 * - Rate limited to 6 requests/minute
 */

import { BaseComparisonAdapter } from './base-adapter';
import {
  ComparisonSourceConfig,
  ComparisonQuery,
  ComparisonResult,
  SourceTier,
  Signal,
} from './types';

/**
 * Sentiment categories for Telugu movie reviews
 */
type Sentiment = 'very_positive' | 'positive' | 'mixed' | 'negative' | 'very_negative';

/**
 * Verdict categories used by Telugu review sites
 */
type Verdict = 'blockbuster' | 'super_hit' | 'hit' | 'above_average' | 'average' | 'below_average' | 'flop' | 'disaster';

export class IdlebrainSentimentAdapter extends BaseComparisonAdapter {
  readonly config: ComparisonSourceConfig = {
    id: 'idlebrain_sentiment',
    name: 'Idlebrain/GreatAndhra Sentiment',
    tier: SourceTier.COMMUNITY,
    baseUrl: 'https://www.idlebrain.com',
    rateLimit: 6, // 6 requests per minute (shared between sites)
    cacheDays: 90, // Sentiments rarely change
    enabled: true,
    featureFlag: 'comparison_idlebrain',
    legalNotes: 'Telugu review sites. Sentiment classification only. No text stored.',
  };

  canHandle(query: ComparisonQuery): boolean {
    // Only for Telugu movies
    return query.context?.language === 'Telugu' || 
           Boolean(query.titleEn && query.releaseYear);
  }

  protected async fetchInternal(query: ComparisonQuery): Promise<ComparisonResult> {
    const signals: Record<string, Signal> = {};
    let signalCount = 0;
    let totalSources = 0;

    // Try Idlebrain
    const idlebrainResult = await this.fetchIdlebrain(query);
    if (idlebrainResult) {
      Object.assign(signals, idlebrainResult);
      signalCount += Object.keys(idlebrainResult).length;
      totalSources++;
    }

    // Try GreatAndhra
    const greatAndhraResult = await this.fetchGreatAndhra(query);
    if (greatAndhraResult) {
      // Merge with prefix to distinguish
      for (const [key, value] of Object.entries(greatAndhraResult)) {
        signals[`ga_${key}`] = value;
      }
      signalCount += Object.keys(greatAndhraResult).length;
      totalSources++;
    }

    if (signalCount === 0) {
      return this.createErrorResult('Not found', 'No sentiment data found');
    }

    // Calculate aggregated sentiment if we have both sources
    if (totalSources === 2 && signals['sentiment'] && signals['ga_sentiment']) {
      signals['sentiment_agreement'] = {
        type: 'boolean',
        value: signals['sentiment'].value === signals['ga_sentiment'].value,
      };
    }

    const signalStrength = Math.min(signalCount / 6, 1);
    return this.createSuccessResult(signals, signalStrength);
  }

  /**
   * Fetch sentiment from Idlebrain
   */
  private async fetchIdlebrain(query: ComparisonQuery): Promise<Record<string, Signal> | null> {
    try {
      // Idlebrain URL pattern: /review/{title}.html
      const slug = this.createSlug(query.titleEn);
      const url = `https://www.idlebrain.com/movie/review/${slug}.html`;
      
      const response = await this.safeFetch(url, {}, 5000);
      
      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      
      // Extract sentiment from page (simplified)
      const sentiment = this.extractSentiment(html);
      const verdict = this.extractVerdict(html);
      const ratingMatch = html.match(/Rating:\s*([\d.]+)\s*\/\s*5/i);
      
      const result: Record<string, Signal> = {};
      
      if (sentiment) {
        result['sentiment'] = {
          type: 'categorical',
          value: sentiment,
          allowedValues: ['very_positive', 'positive', 'mixed', 'negative', 'very_negative'],
        };
      }

      if (verdict) {
        result['verdict'] = {
          type: 'categorical',
          value: verdict,
          allowedValues: ['blockbuster', 'super_hit', 'hit', 'above_average', 'average', 'below_average', 'flop', 'disaster'],
        };

        // Convert verdict to numeric score
        const verdictScores: Record<string, number> = {
          'blockbuster': 95,
          'super_hit': 85,
          'hit': 75,
          'above_average': 65,
          'average': 50,
          'below_average': 35,
          'flop': 20,
          'disaster': 5,
        };
        result['verdict_score'] = {
          type: 'numeric',
          value: verdictScores[verdict] || 50,
          rawValue: verdictScores[verdict] || 50,
          scale: 'percentage',
        };
      }

      if (ratingMatch) {
        const rating = parseFloat(ratingMatch[1]);
        result['rating'] = {
          type: 'numeric',
          value: this.normalizeRating(rating, '0-5'),
          rawValue: rating,
          scale: '0-5',
        };
      }

      result['has_coverage'] = {
        type: 'boolean',
        value: true,
      };

      return Object.keys(result).length > 0 ? result : null;

    } catch {
      return null;
    }
  }

  /**
   * Fetch sentiment from GreatAndhra
   */
  private async fetchGreatAndhra(query: ComparisonQuery): Promise<Record<string, Signal> | null> {
    try {
      // GreatAndhra URL pattern varies
      const searchUrl = `https://www.greatandhra.com/search?q=${encodeURIComponent(query.titleEn + ' movie review')}`;
      
      // For now, return null as implementation would require HTML parsing
      // Real implementation would search and extract sentiment
      
      return null;

    } catch {
      return null;
    }
  }

  /**
   * Extract sentiment from HTML (simplified keyword analysis)
   */
  private extractSentiment(html: string): Sentiment | null {
    const lowerHtml = html.toLowerCase();
    
    // Count positive/negative indicators
    const positiveWords = ['excellent', 'fantastic', 'superb', 'masterpiece', 'brilliant', 'must watch', 'highly recommended'];
    const negativeWords = ['terrible', 'worst', 'boring', 'disappointing', 'avoid', 'waste', 'disaster'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of positiveWords) {
      if (lowerHtml.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (lowerHtml.includes(word)) negativeCount++;
    }
    
    const diff = positiveCount - negativeCount;
    
    if (diff >= 3) return 'very_positive';
    if (diff >= 1) return 'positive';
    if (diff <= -3) return 'very_negative';
    if (diff <= -1) return 'negative';
    return 'mixed';
  }

  /**
   * Extract verdict from HTML
   */
  private extractVerdict(html: string): Verdict | null {
    const lowerHtml = html.toLowerCase();
    
    const verdicts: [string, Verdict][] = [
      ['blockbuster', 'blockbuster'],
      ['super hit', 'super_hit'],
      ['superhit', 'super_hit'],
      ['hit', 'hit'],
      ['above average', 'above_average'],
      ['average', 'average'],
      ['below average', 'below_average'],
      ['flop', 'flop'],
      ['disaster', 'disaster'],
    ];
    
    for (const [text, verdict] of verdicts) {
      if (lowerHtml.includes(text)) {
        return verdict;
      }
    }
    
    return null;
  }

  /**
   * Create URL-friendly slug from title
   */
  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

export const idlebrainSentimentAdapter = new IdlebrainSentimentAdapter();

