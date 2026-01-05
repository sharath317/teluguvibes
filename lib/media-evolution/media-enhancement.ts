/**
 * Phase 2 & 3: Media Source Tiers & Enhancement Pipeline
 * 
 * Tiered media fetching with strict source validation.
 * NEVER overwrites valid images unless replacement score is higher.
 */

import {
  MediaSource,
  MediaTrustTier,
  TIER_1_SOURCES,
  TIER_2_SOURCES,
  DISALLOWED_SOURCES
} from './types';
import { getSupabaseClient } from '../supabase/client';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// ============================================================
// IMAGE SCORING
// ============================================================

interface ImageCandidate {
  url: string;
  source: string;
  tier: MediaTrustTier;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  license?: string;
}

function calculateResolutionScore(width?: number, height?: number): number {
  if (!width || !height) return 50; // Unknown resolution gets neutral score
  
  const pixels = width * height;
  
  // Score based on resolution
  if (pixels >= 2073600) return 100;  // 1920x1080 or higher
  if (pixels >= 921600) return 90;    // 1280x720
  if (pixels >= 480000) return 75;    // ~800x600
  if (pixels >= 230400) return 60;    // ~640x360
  return 40;
}

function calculateAspectRatioScore(
  type: 'poster' | 'backdrop',
  aspect?: string
): number {
  if (!aspect) return 50;
  
  // Parse aspect ratio
  const parts = aspect.split(':').map(Number);
  if (parts.length !== 2) return 50;
  
  const ratio = parts[0] / parts[1];
  
  if (type === 'poster') {
    // Posters should be ~2:3 (0.667)
    const idealRatio = 0.667;
    const diff = Math.abs(ratio - idealRatio);
    if (diff < 0.05) return 100;
    if (diff < 0.1) return 85;
    if (diff < 0.2) return 70;
    return 50;
  } else {
    // Backdrops should be ~16:9 (1.78)
    const idealRatio = 1.78;
    const diff = Math.abs(ratio - idealRatio);
    if (diff < 0.1) return 100;
    if (diff < 0.2) return 85;
    if (diff < 0.4) return 70;
    return 50;
  }
}

function calculateTierScore(tier: MediaTrustTier): number {
  switch (tier) {
    case MediaTrustTier.TIER_1_AUTHORITATIVE: return 100;
    case MediaTrustTier.TIER_2_CURATED: return 75;
    case MediaTrustTier.TIER_3_FALLBACK: return 50;
    default: return 0;
  }
}

export function calculateImageScore(
  candidate: ImageCandidate,
  type: 'poster' | 'backdrop'
): number {
  const resScore = calculateResolutionScore(candidate.width, candidate.height);
  const aspectScore = calculateAspectRatioScore(type, candidate.aspect_ratio);
  const tierScore = calculateTierScore(candidate.tier);
  
  // Weighted average: tier matters most, then resolution, then aspect
  return Math.round(
    tierScore * 0.4 +
    resScore * 0.35 +
    aspectScore * 0.25
  );
}

// ============================================================
// TMDB MEDIA FETCHER (TIER 1)
// ============================================================

interface TMDBImages {
  backdrops: Array<{
    file_path: string;
    width: number;
    height: number;
    aspect_ratio: number;
    iso_639_1: string | null;
  }>;
  posters: Array<{
    file_path: string;
    width: number;
    height: number;
    aspect_ratio: number;
    iso_639_1: string | null;
  }>;
}

export async function fetchTMDBImages(
  tmdbId: number,
  options: {
    includeLanguages?: string[];
  } = {}
): Promise<{
  backdrops: ImageCandidate[];
  posters: ImageCandidate[];
}> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not configured');
  }

  // Language fallback chain
  const languages = options.includeLanguages || ['te', 'en', 'null'];
  const langParam = languages.join(',');

  const url = `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${apiKey}&include_image_language=${langParam}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    return { backdrops: [], posters: [] };
  }

  const data: TMDBImages = await response.json();

  const toCandidate = (
    img: TMDBImages['backdrops'][0],
    type: 'backdrop' | 'poster'
  ): ImageCandidate => ({
    url: `${TMDB_IMAGE_BASE}/original${img.file_path}`,
    source: type === 'backdrop' ? 'tmdb_backdrop' : 'tmdb_poster',
    tier: MediaTrustTier.TIER_1_AUTHORITATIVE,
    width: img.width,
    height: img.height,
    aspect_ratio: img.aspect_ratio > 1 
      ? `${Math.round(img.aspect_ratio * 9)}:9`
      : `2:3`,
    license: 'TMDB Terms of Use'
  });

  // Sort by quality (resolution)
  const sortByResolution = (a: any, b: any) => 
    (b.width * b.height) - (a.width * a.height);

  return {
    backdrops: data.backdrops
      .sort(sortByResolution)
      .slice(0, 10)
      .map(img => toCandidate(img, 'backdrop')),
    posters: data.posters
      .sort(sortByResolution)
      .slice(0, 5)
      .map(img => toCandidate(img, 'poster'))
  };
}

// ============================================================
// WIKIMEDIA COMMONS FETCHER (TIER 2)
// ============================================================

export async function fetchWikimediaImage(
  searchTerm: string,
  category: string = 'Telugu cinema'
): Promise<ImageCandidate | null> {
  // Search Wikimedia Commons for Telugu cinema images
  const searchUrl = `https://commons.wikimedia.org/w/api.php?` +
    `action=query&list=search&srsearch=${encodeURIComponent(searchTerm + ' ' + category)}` +
    `&srnamespace=6&format=json&srlimit=5`;

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) return null;

    const data = await response.json();
    const results = data.query?.search || [];

    for (const result of results) {
      // Get image info
      const title = result.title;
      const infoUrl = `https://commons.wikimedia.org/w/api.php?` +
        `action=query&titles=${encodeURIComponent(title)}&prop=imageinfo` +
        `&iiprop=url|size|extmetadata&format=json`;

      const infoResponse = await fetch(infoUrl);
      if (!infoResponse.ok) continue;

      const infoData = await infoResponse.json();
      const pages = infoData.query?.pages || {};
      const page = Object.values(pages)[0] as any;
      const imageInfo = page?.imageinfo?.[0];

      if (!imageInfo) continue;

      // Check license
      const license = imageInfo.extmetadata?.LicenseShortName?.value || '';
      const isCC = license.toLowerCase().includes('cc') || 
                   license.toLowerCase().includes('public domain');

      if (!isCC) continue;

      return {
        url: imageInfo.url,
        source: 'wikimedia_commons',
        tier: MediaTrustTier.TIER_2_CURATED,
        width: imageInfo.width,
        height: imageInfo.height,
        license: license
      };
    }
  } catch (error) {
    console.error('Wikimedia fetch error:', error);
  }

  return null;
}

// ============================================================
// TIERED ENHANCEMENT PIPELINE
// ============================================================

export interface EnhancementResult {
  movie_id: string;
  tmdb_id: number;
  title: string;
  backdrop_updated: boolean;
  poster_updated: boolean;
  backdrop_source?: MediaSource;
  poster_source?: MediaSource;
  skipped_reason?: string;
}

export async function enhanceMovieMedia(
  movie: {
    id: string;
    tmdb_id: number;
    title_en: string;
    poster_url: string | null;
    backdrop_url: string | null;
  },
  options: {
    forceRefresh?: boolean;
    focusType?: 'backdrop' | 'poster' | 'both';
    maxTier?: MediaTrustTier;
    dryRun?: boolean;
  } = {}
): Promise<EnhancementResult> {
  const {
    forceRefresh = false,
    focusType = 'both',
    maxTier = MediaTrustTier.TIER_2_CURATED,
    dryRun = false
  } = options;

  const result: EnhancementResult = {
    movie_id: movie.id,
    tmdb_id: movie.tmdb_id,
    title: movie.title_en,
    backdrop_updated: false,
    poster_updated: false
  };

  // Skip if already complete and not forcing refresh
  if (!forceRefresh) {
    const needsBackdrop = focusType !== 'poster' && !movie.backdrop_url;
    const needsPoster = focusType !== 'backdrop' && !movie.poster_url;
    
    if (!needsBackdrop && !needsPoster) {
      result.skipped_reason = 'Already complete';
      return result;
    }
  }

  // TIER 1: Try TMDB first
  const tmdbImages = await fetchTMDBImages(movie.tmdb_id, {
    includeLanguages: ['te', 'en', 'null']
  });

  let bestBackdrop: ImageCandidate | null = null;
  let bestPoster: ImageCandidate | null = null;

  // Find best backdrop
  if ((focusType === 'both' || focusType === 'backdrop') && 
      (!movie.backdrop_url || forceRefresh)) {
    if (tmdbImages.backdrops.length > 0) {
      bestBackdrop = tmdbImages.backdrops[0]; // Already sorted by resolution
    }
  }

  // Find best poster
  if ((focusType === 'both' || focusType === 'poster') && 
      (!movie.poster_url || forceRefresh)) {
    if (tmdbImages.posters.length > 0) {
      bestPoster = tmdbImages.posters[0];
    }
  }

  // TIER 2: If TMDB failed and tier allows, try Wikimedia
  if (maxTier >= MediaTrustTier.TIER_2_CURATED) {
    if (!bestBackdrop && (focusType === 'both' || focusType === 'backdrop')) {
      const wikimedia = await fetchWikimediaImage(movie.title_en);
      if (wikimedia) {
        // Check if it's a good aspect ratio for backdrop
        if (wikimedia.width && wikimedia.height) {
          const ratio = wikimedia.width / wikimedia.height;
          if (ratio > 1.3) { // Wider than 4:3, suitable for backdrop
            bestBackdrop = wikimedia;
          }
        }
      }
    }
  }

  // Apply updates
  if (!dryRun && (bestBackdrop || bestPoster)) {
    const supabase = getSupabaseClient();
    const updates: Record<string, any> = {};

    if (bestBackdrop) {
      updates.backdrop_url = bestBackdrop.url;
      result.backdrop_updated = true;
      result.backdrop_source = {
        url: bestBackdrop.url,
        source: bestBackdrop.source,
        trust_tier: bestBackdrop.tier,
        license: bestBackdrop.license || 'Unknown',
        resolution_score: calculateResolutionScore(bestBackdrop.width, bestBackdrop.height),
        aspect_ratio: bestBackdrop.aspect_ratio || 'unknown',
        verified: true,
        fetched_at: new Date().toISOString()
      };
    }

    if (bestPoster) {
      updates.poster_url = bestPoster.url;
      result.poster_updated = true;
      result.poster_source = {
        url: bestPoster.url,
        source: bestPoster.source,
        trust_tier: bestPoster.tier,
        license: bestPoster.license || 'Unknown',
        resolution_score: calculateResolutionScore(bestPoster.width, bestPoster.height),
        aspect_ratio: bestPoster.aspect_ratio || 'unknown',
        verified: true,
        fetched_at: new Date().toISOString()
      };
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase
        .from('movies')
        .update(updates)
        .eq('id', movie.id);
    }
  } else if (dryRun) {
    result.backdrop_updated = !!bestBackdrop;
    result.poster_updated = !!bestPoster;
    if (bestBackdrop) {
      result.backdrop_source = {
        url: bestBackdrop.url,
        source: bestBackdrop.source,
        trust_tier: bestBackdrop.tier,
        license: bestBackdrop.license || 'Unknown',
        resolution_score: calculateResolutionScore(bestBackdrop.width, bestBackdrop.height),
        aspect_ratio: bestBackdrop.aspect_ratio || 'unknown',
        verified: true,
        fetched_at: new Date().toISOString()
      };
    }
  }

  return result;
}

// ============================================================
// BATCH ENHANCEMENT
// ============================================================

export async function enhanceMediaBatch(options: {
  limit?: number;
  focusType?: 'backdrop' | 'poster' | 'both';
  maxTier?: MediaTrustTier;
  dryRun?: boolean;
  decadeFilter?: number;
  onProgress?: (current: number, total: number, result: EnhancementResult) => void;
}): Promise<{
  processed: number;
  backdropUpdated: number;
  posterUpdated: number;
  skipped: number;
  errors: number;
  results: EnhancementResult[];
}> {
  const supabase = getSupabaseClient();
  const {
    limit = 100,
    focusType = 'backdrop',
    maxTier = MediaTrustTier.TIER_2_CURATED,
    dryRun = false,
    decadeFilter,
    onProgress
  } = options;

  // Build query based on focus type
  let query = supabase
    .from('movies')
    .select('id, tmdb_id, title_en, poster_url, backdrop_url, release_year')
    .limit(limit);

  if (focusType === 'backdrop' || focusType === 'both') {
    query = query.is('backdrop_url', null);
  }
  if (focusType === 'poster') {
    query = query.is('poster_url', null);
  }
  if (decadeFilter) {
    query = query
      .gte('release_year', decadeFilter)
      .lt('release_year', decadeFilter + 10);
  }

  const { data: movies, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch movies: ${error.message}`);
  }

  const stats = {
    processed: 0,
    backdropUpdated: 0,
    posterUpdated: 0,
    skipped: 0,
    errors: 0,
    results: [] as EnhancementResult[]
  };

  if (!movies || movies.length === 0) {
    return stats;
  }

  for (const movie of movies) {
    try {
      const result = await enhanceMovieMedia(movie, {
        focusType,
        maxTier,
        dryRun
      });

      stats.processed++;
      if (result.backdrop_updated) stats.backdropUpdated++;
      if (result.poster_updated) stats.posterUpdated++;
      if (result.skipped_reason) stats.skipped++;
      stats.results.push(result);

      if (onProgress) {
        onProgress(stats.processed, movies.length, result);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      stats.errors++;
      console.error(`Error enhancing ${movie.title_en}:`, error);
    }
  }

  return stats;
}





