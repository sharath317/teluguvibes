/**
 * Phase 1: Coverage Gap Analyzer
 * 
 * Diagnoses WHY movies are missing or partially incomplete.
 * Classifies gaps and produces actionable coverage_gap_report.json
 * 
 * NO INGESTION - Analysis only.
 */

import { getSupabaseClient } from '../supabase/client';
import {
  CoverageGap,
  CoverageGapReport,
  GapReasonCode,
  MediaTrustTier,
} from './types';

// ============================================================
// GAP CLASSIFICATION LOGIC
// ============================================================

function calculateCompleteness(movie: any): number {
  let score = 0;
  const checks = [
    { field: 'poster_url', weight: 15 },
    { field: 'backdrop_url', weight: 15 },
    { field: 'director', weight: 10 },
    { field: 'title_te', weight: 5 },
    { field: 'synopsis_te', weight: 5 },
    { field: 'release_date', weight: 5 },
    { field: 'runtime_minutes', weight: 5 },
  ];

  checks.forEach(({ field, weight }) => {
    if (movie[field]) score += weight;
  });

  // Cast scoring (up to 20 points)
  const castCount = movie.cast_members?.length || 0;
  if (castCount >= 10) score += 20;
  else if (castCount >= 5) score += 15;
  else if (castCount >= 3) score += 10;
  else if (castCount >= 1) score += 5;

  // Genres scoring (up to 10 points)
  const genreCount = movie.genres?.length || 0;
  if (genreCount >= 3) score += 10;
  else if (genreCount >= 1) score += 5;

  // Rating presence (5 points)
  if (movie.avg_rating && movie.avg_rating > 0) score += 5;

  return Math.min(100, score);
}

function classifyGaps(movie: any): Array<{ reason: GapReasonCode; fields: string[] }> {
  const gaps: Array<{ reason: GapReasonCode; fields: string[] }> = [];

  // Media gaps
  if (!movie.backdrop_url) {
    gaps.push({
      reason: 'MISSING_BACKDROP',
      fields: ['backdrop_url']
    });
  }

  if (!movie.poster_url) {
    gaps.push({
      reason: 'LOW_QUALITY_POSTER',
      fields: ['poster_url']
    });
  }

  // Cast gaps
  const castCount = movie.cast_members?.length || 0;
  if (castCount < 5) {
    gaps.push({
      reason: 'CAST_UNDER_5',
      fields: ['cast_members']
    });
  }

  // Director gap
  if (!movie.director) {
    gaps.push({
      reason: 'NO_DIRECTOR',
      fields: ['director']
    });
  }

  // Genre gap
  if (!movie.genres || movie.genres.length === 0) {
    gaps.push({
      reason: 'NO_GENRES',
      fields: ['genres']
    });
  }

  // Decade classification
  const year = movie.release_year;
  if (year && year < 1990) {
    gaps.push({
      reason: 'OLDER_DECADE_PRE_1990',
      fields: ['release_year']
    });
  }

  // Check for incomplete metadata
  const missingMeta: string[] = [];
  if (!movie.runtime_minutes) missingMeta.push('runtime_minutes');
  if (!movie.title_te) missingMeta.push('title_te');
  if (!movie.synopsis_te) missingMeta.push('synopsis_te');
  
  if (missingMeta.length >= 2) {
    gaps.push({
      reason: 'INCOMPLETE_METADATA',
      fields: missingMeta
    });
  }

  return gaps;
}

function determinePriority(
  completeness: number,
  year: number | null,
  gaps: Array<{ reason: GapReasonCode }>
): 'critical' | 'high' | 'medium' | 'low' {
  // Recent movies with low completeness are critical
  if (year && year >= 2020 && completeness < 50) return 'critical';
  if (year && year >= 2015 && completeness < 40) return 'critical';
  
  // Missing backdrop on popular movies is high priority
  const hasMissingBackdrop = gaps.some(g => g.reason === 'MISSING_BACKDROP');
  if (hasMissingBackdrop && year && year >= 2010) return 'high';
  
  // General completeness thresholds
  if (completeness < 30) return 'high';
  if (completeness < 50) return 'medium';
  
  return 'low';
}

function suggestSourceTier(gaps: Array<{ reason: GapReasonCode }>): MediaTrustTier {
  // Media gaps should try Tier 1 first
  const hasMediaGap = gaps.some(g => 
    g.reason === 'MISSING_BACKDROP' || g.reason === 'LOW_QUALITY_POSTER'
  );
  
  if (hasMediaGap) return MediaTrustTier.TIER_1_AUTHORITATIVE;
  
  // Old movies might need Tier 2 for historical images
  const isOld = gaps.some(g => g.reason === 'OLDER_DECADE_PRE_1990');
  if (isOld) return MediaTrustTier.TIER_2_CURATED;
  
  return MediaTrustTier.TIER_1_AUTHORITATIVE;
}

function suggestAction(gaps: Array<{ reason: GapReasonCode }>): string {
  if (gaps.some(g => g.reason === 'MISSING_BACKDROP')) {
    return 'Re-fetch backdrops from TMDB with language fallback (te-IN → en-US)';
  }
  if (gaps.some(g => g.reason === 'CAST_UNDER_5')) {
    return 'Re-fetch credits from TMDB and expand cast list';
  }
  if (gaps.some(g => g.reason === 'NO_GENRES')) {
    return 'Fetch genre data from TMDB movie details';
  }
  if (gaps.some(g => g.reason === 'NO_DIRECTOR')) {
    return 'Re-fetch crew from TMDB credits endpoint';
  }
  if (gaps.some(g => g.reason === 'OLDER_DECADE_PRE_1990')) {
    return 'Check Wikimedia Commons for historical posters/stills';
  }
  return 'Standard enrichment via TMDB API';
}

// ============================================================
// MAIN ANALYZER
// ============================================================

export async function analyzeCoverageGaps(options: {
  limit?: number;
  decadeFilter?: number;
  onlyIncomplete?: boolean;
}): Promise<CoverageGapReport> {
  const supabase = getSupabaseClient();
  const { limit = 2000, decadeFilter, onlyIncomplete = false } = options;

  // Fetch all movies
  let query = supabase
    .from('movies')
    .select('id, tmdb_id, title_en, title_te, release_year, release_date, poster_url, backdrop_url, director, cast_members, genres, runtime_minutes, synopsis_te, avg_rating, is_published')
    .limit(limit);

  if (decadeFilter) {
    query = query
      .gte('release_year', decadeFilter)
      .lt('release_year', decadeFilter + 10);
  }

  const { data: movies, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch movies: ${error.message}`);
  }

  if (!movies || movies.length === 0) {
    return {
      generated_at: new Date().toISOString(),
      total_movies: 0,
      analyzed_movies: 0,
      gap_summary: {
        missing_backdrop: 0,
        missing_poster: 0,
        low_cast: 0,
        no_director: 0,
        no_genres: 0,
        pre_1990: 0
      },
      by_decade: {},
      gaps: [],
      recommendations: ['No movies found to analyze']
    };
  }

  // Analyze each movie
  const gaps: CoverageGap[] = [];
  const byDecade: Record<string, {
    total: number;
    complete: number;
    incomplete: number;
    poster_coverage: number;
    backdrop_coverage: number;
  }> = {};

  const summary = {
    missing_backdrop: 0,
    missing_poster: 0,
    low_cast: 0,
    no_director: 0,
    no_genres: 0,
    pre_1990: 0
  };

  for (const movie of movies) {
    const completeness = calculateCompleteness(movie);
    const movieGaps = classifyGaps(movie);
    const decade = movie.release_year 
      ? `${Math.floor(movie.release_year / 10) * 10}s`
      : 'unknown';

    // Initialize decade stats
    if (!byDecade[decade]) {
      byDecade[decade] = {
        total: 0,
        complete: 0,
        incomplete: 0,
        poster_coverage: 0,
        backdrop_coverage: 0
      };
    }

    byDecade[decade].total++;
    if (completeness >= 80) {
      byDecade[decade].complete++;
    } else {
      byDecade[decade].incomplete++;
    }
    if (movie.poster_url) byDecade[decade].poster_coverage++;
    if (movie.backdrop_url) byDecade[decade].backdrop_coverage++;

    // Update summary counts
    if (!movie.backdrop_url) summary.missing_backdrop++;
    if (!movie.poster_url) summary.missing_poster++;
    if ((movie.cast_members?.length || 0) < 5) summary.low_cast++;
    if (!movie.director) summary.no_director++;
    if (!movie.genres || movie.genres.length === 0) summary.no_genres++;
    if (movie.release_year && movie.release_year < 1990) summary.pre_1990++;

    // Only add to gaps list if incomplete or flag is set
    if (movieGaps.length > 0 && (!onlyIncomplete || completeness < 80)) {
      const primaryGap = movieGaps[0];
      gaps.push({
        movie_id: movie.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title_en,
        release_year: movie.release_year,
        reason_code: primaryGap.reason,
        missing_fields: movieGaps.flatMap(g => g.fields),
        current_completeness: completeness,
        suggested_source_tier: suggestSourceTier(movieGaps),
        priority: determinePriority(completeness, movie.release_year, movieGaps),
        suggested_action: suggestAction(movieGaps)
      });
    }
  }

  // Convert decade stats to percentages
  Object.keys(byDecade).forEach(decade => {
    const d = byDecade[decade];
    d.poster_coverage = Math.round((d.poster_coverage / d.total) * 100);
    d.backdrop_coverage = Math.round((d.backdrop_coverage / d.total) * 100);
  });

  // Sort gaps by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (summary.missing_backdrop > movies.length * 0.5) {
    recommendations.push(
      `CRITICAL: ${summary.missing_backdrop} movies (${Math.round(summary.missing_backdrop/movies.length*100)}%) missing backdrops. ` +
      `Run: pnpm movies:enrich:media --tiered --focus=backdrop`
    );
  }
  
  const recentDecade = byDecade['2020s'];
  if (recentDecade && recentDecade.backdrop_coverage < 50) {
    recommendations.push(
      `HIGH: 2020s movies have only ${recentDecade.backdrop_coverage}% backdrop coverage. ` +
      `These are priority for visual completeness.`
    );
  }
  
  if (summary.low_cast > movies.length * 0.2) {
    recommendations.push(
      `MEDIUM: ${summary.low_cast} movies have fewer than 5 cast members. ` +
      `Run: pnpm movies:enrich:cast --min-cast=5`
    );
  }
  
  if (summary.no_genres > 0) {
    recommendations.push(
      `LOW: ${summary.no_genres} movies missing genres. ` +
      `This affects tag generation and categorization.`
    );
  }

  return {
    generated_at: new Date().toISOString(),
    total_movies: movies.length,
    analyzed_movies: movies.length,
    gap_summary: summary,
    by_decade: byDecade,
    gaps: gaps.slice(0, 500), // Limit output size
    recommendations
  };
}

// ============================================================
// COMPARISON WITH INDEX
// ============================================================

export async function analyzeIndexVsMovies(): Promise<{
  in_index_only: number;
  in_movies_only: number;
  in_both: number;
  index_coverage_percent: number;
}> {
  const supabase = getSupabaseClient();

  // Get counts from both tables
  const [indexResult, moviesResult] = await Promise.all([
    supabase.from('telugu_movie_index').select('tmdb_id', { count: 'exact' }),
    supabase.from('movies').select('tmdb_id', { count: 'exact' })
  ]);

  const indexCount = indexResult.count || 0;
  const moviesCount = moviesResult.count || 0;

  // Get intersection (movies that are in both)
  const { data: indexIds } = await supabase
    .from('telugu_movie_index')
    .select('tmdb_id')
    .limit(5000);

  const { data: movieIds } = await supabase
    .from('movies')
    .select('tmdb_id')
    .limit(5000);

  const indexSet = new Set((indexIds || []).map(r => r.tmdb_id));
  const movieSet = new Set((movieIds || []).map(r => r.tmdb_id));

  let inBoth = 0;
  movieSet.forEach(id => {
    if (indexSet.has(id)) inBoth++;
  });

  return {
    in_index_only: indexCount - inBoth,
    in_movies_only: moviesCount - inBoth,
    in_both: inBoth,
    index_coverage_percent: indexCount > 0 
      ? Math.round((inBoth / indexCount) * 100) 
      : 0
  };
}

