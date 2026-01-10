/**
 * Music Popularity Adapter (JioSaavn / Spotify)
 * 
 * Fetches ONLY:
 * - Album/soundtrack popularity score
 * - Number of tracks
 * - Play count bucket (not exact numbers)
 * - Artist match validation
 * 
 * LEGAL NOTES:
 * - Uses public APIs where available
 * - No audio content stored
 * - Only numeric popularity signals
 * - Rate limited to 10 requests/minute
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

export class MusicPopularityAdapter extends BaseComparisonAdapter {
  readonly config: ComparisonSourceConfig = {
    id: 'music_popularity',
    name: 'Music Popularity (JioSaavn/Spotify)',
    tier: SourceTier.SIGNAL,
    rateLimit: 10, // 10 requests per minute
    cacheDays: 7, // Popularity changes more frequently
    enabled: true,
    featureFlag: 'comparison_jiosaavn',
    legalNotes: 'Public API popularity signals only. No audio stored.',
  };

  canHandle(query: ComparisonQuery): boolean {
    // Music data is useful for most movies
    return Boolean(query.titleEn && query.releaseYear);
  }

  protected async fetchInternal(query: ComparisonQuery): Promise<ComparisonResult> {
    const signals: Record<string, Signal> = {};
    let signalCount = 0;

    // Try JioSaavn (primary for Telugu)
    const jiosaavnResult = await this.fetchJioSaavn(query);
    if (jiosaavnResult) {
      Object.assign(signals, jiosaavnResult);
      signalCount += Object.keys(jiosaavnResult).length;
    }

    // Try Spotify (secondary)
    const spotifyResult = await this.fetchSpotify(query);
    if (spotifyResult) {
      // Merge with prefix
      for (const [key, value] of Object.entries(spotifyResult)) {
        signals[`spotify_${key}`] = value;
      }
      signalCount += Object.keys(spotifyResult).length;
    }

    if (signalCount === 0) {
      return this.createErrorResult('Not found', 'No music data found');
    }

    const signalStrength = Math.min(signalCount / 6, 1);
    return this.createSuccessResult(signals, signalStrength);
  }

  /**
   * Fetch from JioSaavn
   */
  private async fetchJioSaavn(query: ComparisonQuery): Promise<Record<string, Signal> | null> {
    try {
      // JioSaavn search API (unofficial but commonly used)
      const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&p=1&q=${encodeURIComponent(query.titleEn)}&_format=json&_marker=0&ctx=wap6dot0&api_version=4`;
      
      const response = await this.safeFetch(searchUrl, {}, 5000);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const results = data.results || data.albums?.data || [];
      
      // Find matching album
      const match = results.find((album: { title?: string; year?: string }) => {
        const titleMatch = album.title?.toLowerCase().includes(query.titleEn.toLowerCase());
        const yearMatch = album.year === String(query.releaseYear);
        return titleMatch || yearMatch;
      });

      if (!match) {
        return null;
      }

      const signals: Record<string, Signal> = {};

      // Play count bucket
      if (match.play_count !== undefined) {
        const playCountBucket = this.playCountToBucket(match.play_count);
        signals['play_count_bucket'] = playCountBucket;
      }

      // Song count
      if (match.song_count !== undefined) {
        signals['track_count'] = {
          type: 'numeric',
          value: Math.min(match.song_count / 20, 1) * 100, // Normalize: 20 tracks = 100%
          rawValue: match.song_count,
          scale: '0-20',
        };
      }

      // Has soundtrack
      signals['has_soundtrack'] = {
        type: 'boolean',
        value: true,
      };

      // Music director match (if available)
      if (match.primary_artists && query.context?.genres) {
        signals['artist_present'] = {
          type: 'boolean',
          value: true,
        };
      }

      return Object.keys(signals).length > 0 ? signals : null;

    } catch {
      return null;
    }
  }

  /**
   * Fetch from Spotify (requires API key)
   */
  private async fetchSpotify(query: ComparisonQuery): Promise<Record<string, Signal> | null> {
    // Spotify requires OAuth - skip if no token
    const spotifyToken = process.env.SPOTIFY_ACCESS_TOKEN;
    if (!spotifyToken) {
      return null;
    }

    try {
      const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query.titleEn + ' soundtrack')}&type=album&limit=5`;
      
      const response = await this.safeFetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
        },
      }, 5000);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const albums = data.albums?.items || [];
      
      // Find matching album
      const match = albums.find((album: { name?: string; release_date?: string }) => {
        const titleMatch = album.name?.toLowerCase().includes(query.titleEn.toLowerCase());
        const yearMatch = album.release_date?.startsWith(String(query.releaseYear));
        return titleMatch || yearMatch;
      });

      if (!match) {
        return null;
      }

      const signals: Record<string, Signal> = {};

      // Spotify popularity (0-100)
      if (match.popularity !== undefined) {
        signals['popularity'] = {
          type: 'numeric',
          value: match.popularity,
          rawValue: match.popularity,
          scale: 'percentage',
        };
      }

      // Track count
      if (match.total_tracks !== undefined) {
        signals['track_count'] = {
          type: 'numeric',
          value: Math.min(match.total_tracks / 20, 1) * 100,
          rawValue: match.total_tracks,
          scale: '0-20',
        };
      }

      signals['available_on_spotify'] = {
        type: 'boolean',
        value: true,
      };

      return Object.keys(signals).length > 0 ? signals : null;

    } catch {
      return null;
    }
  }

  /**
   * Convert play count to bucket signal
   */
  private playCountToBucket(playCount: number): BucketSignal {
    let bucket: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    let numericEquivalent: number;

    if (playCount < 10000) {
      bucket = 'very_low';
      numericEquivalent = 10;
    } else if (playCount < 100000) {
      bucket = 'low';
      numericEquivalent = 30;
    } else if (playCount < 1000000) {
      bucket = 'medium';
      numericEquivalent = 50;
    } else if (playCount < 10000000) {
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

export const musicPopularityAdapter = new MusicPopularityAdapter();

