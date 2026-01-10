/**
 * YouTube Trailer Visibility Adapter
 * 
 * Fetches ONLY:
 * - View count bucket (not exact numbers)
 * - Like ratio bucket
 * - Whether official trailer exists
 * - Channel verification status
 * 
 * LEGAL NOTES:
 * - Uses official YouTube Data API
 * - No video content stored
 * - Only numeric/bucket visibility signals
 * - Rate limited by YouTube API quota
 */

import { BaseComparisonAdapter } from './base-adapter';
import {
  ComparisonSourceConfig,
  ComparisonQuery,
  ComparisonResult,
  SourceTier,
  Signal,
  BucketSignal,
} from './types';

export class TrailerVisibilityAdapter extends BaseComparisonAdapter {
  readonly config: ComparisonSourceConfig = {
    id: 'trailer_visibility',
    name: 'YouTube Trailer Visibility',
    tier: SourceTier.SIGNAL,
    baseUrl: 'https://www.youtube.com',
    rateLimit: 10, // Limited by API quota
    cacheDays: 7, // View counts change frequently
    enabled: true,
    featureFlag: 'comparison_youtube',
    legalNotes: 'Official YouTube API. Visibility buckets only. No video stored.',
  };

  private readonly YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  canHandle(query: ComparisonQuery): boolean {
    return Boolean(query.titleEn && this.YOUTUBE_API_KEY);
  }

  protected async fetchInternal(query: ComparisonQuery): Promise<ComparisonResult> {
    if (!this.YOUTUBE_API_KEY) {
      return this.createErrorResult('Not configured', 'YouTube API key not set');
    }

    try {
      // Search for official trailer
      const searchQuery = `${query.titleEn} ${query.releaseYear} official trailer Telugu`;
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=5&key=${this.YOUTUBE_API_KEY}`;
      
      const searchResponse = await this.safeFetch(searchUrl);
      
      if (!searchResponse.ok) {
        return this.createErrorResult('API error', `Status ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const videos = searchData.items || [];
      
      if (videos.length === 0) {
        return this.createErrorResult('Not found', 'No trailer found');
      }

      // Get the most relevant video (first result)
      const videoId = videos[0].id?.videoId;
      if (!videoId) {
        return this.createErrorResult('Not found', 'No video ID');
      }

      // Get video statistics
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${this.YOUTUBE_API_KEY}`;
      const statsResponse = await this.safeFetch(statsUrl);
      
      if (!statsResponse.ok) {
        return this.createErrorResult('API error', 'Failed to get stats');
      }

      const statsData = await statsResponse.json();
      const video = statsData.items?.[0];
      
      if (!video) {
        return this.createErrorResult('Not found', 'Video not found');
      }

      const signals: Record<string, Signal> = {};

      // Has trailer
      signals['has_trailer'] = {
        type: 'boolean',
        value: true,
      };

      // View count bucket
      const viewCount = parseInt(video.statistics?.viewCount || '0', 10);
      signals['view_count_bucket'] = this.viewCountToBucket(viewCount);

      // Like ratio bucket (if available)
      const likeCount = parseInt(video.statistics?.likeCount || '0', 10);
      if (likeCount > 0 && viewCount > 0) {
        // Estimate engagement (YouTube doesn't show dislikes anymore)
        const engagementRate = (likeCount / viewCount) * 100;
        signals['engagement_bucket'] = this.engagementToBucket(engagementRate);
      }

      // Channel verification (is it an official channel?)
      const channelTitle = video.snippet?.channelTitle?.toLowerCase() || '';
      const isOfficialChannel = 
        channelTitle.includes('official') ||
        channelTitle.includes('music') ||
        channelTitle.includes('films') ||
        channelTitle.includes('movies');
      
      signals['official_channel'] = {
        type: 'boolean',
        value: isOfficialChannel,
      };

      // Trailer age (days since upload)
      const publishedAt = new Date(video.snippet?.publishedAt);
      const ageInDays = Math.floor((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      signals['trailer_age_days'] = {
        type: 'numeric',
        value: Math.min(ageInDays / 365, 1) * 100, // Normalize: 1 year = 100%
        rawValue: ageInDays,
        scale: '0-365',
      };

      const signalStrength = Object.keys(signals).length / 5;
      return this.createSuccessResult(signals, signalStrength);

    } catch (error) {
      return this.createErrorResult(
        'Fetch error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Convert view count to bucket
   */
  private viewCountToBucket(viewCount: number): BucketSignal {
    let bucket: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    let numericEquivalent: number;

    if (viewCount < 100000) {
      bucket = 'very_low';
      numericEquivalent = 10;
    } else if (viewCount < 1000000) {
      bucket = 'low';
      numericEquivalent = 30;
    } else if (viewCount < 10000000) {
      bucket = 'medium';
      numericEquivalent = 50;
    } else if (viewCount < 100000000) {
      bucket = 'high';
      numericEquivalent = 75;
    } else {
      bucket = 'very_high';
      numericEquivalent = 95;
    }

    return {
      type: 'bucket',
      value: bucket,
      numericEquivalent,
    };
  }

  /**
   * Convert engagement rate to bucket
   */
  private engagementToBucket(engagementRate: number): BucketSignal {
    let bucket: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    let numericEquivalent: number;

    if (engagementRate < 1) {
      bucket = 'very_low';
      numericEquivalent = 10;
    } else if (engagementRate < 2) {
      bucket = 'low';
      numericEquivalent = 30;
    } else if (engagementRate < 3) {
      bucket = 'medium';
      numericEquivalent = 50;
    } else if (engagementRate < 5) {
      bucket = 'high';
      numericEquivalent = 75;
    } else {
      bucket = 'very_high';
      numericEquivalent = 95;
    }

    return {
      type: 'bucket',
      value: bucket,
      numericEquivalent,
    };
  }
}

export const trailerVisibilityAdapter = new TrailerVisibilityAdapter();

