/**
 * Phase 9: Data Evolution Metrics
 * 
 * Track and report on data quality improvement over time.
 */

import { getSupabaseClient } from '../supabase/client';
import { DataEvolutionMetrics, MediaTrustTier } from './types';

// ============================================================
// VISUAL COMPLETENESS
// ============================================================

export async function calculateVisualCompleteness(): Promise<{
  total: number;
  withPoster: number;
  withBackdrop: number;
  withBoth: number;
  percentComplete: number;
}> {
  const supabase = getSupabaseClient();

  const { data: movies, error } = await supabase
    .from('movies')
    .select('poster_url, backdrop_url')
    .limit(5000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const withPoster = movies.filter(m => m.poster_url).length;
  const withBackdrop = movies.filter(m => m.backdrop_url).length;
  const withBoth = movies.filter(m => m.poster_url && m.backdrop_url).length;

  return {
    total: movies.length,
    withPoster,
    withBackdrop,
    withBoth,
    percentComplete: movies.length > 0 
      ? Math.round((withBoth / movies.length) * 100) 
      : 0
  };
}

// ============================================================
// STRUCTURED DEPTH SCORE
// ============================================================

export async function calculateStructuredDepth(): Promise<{
  avgFieldsPerMovie: number;
  depthScore: number;  // 0-100
  byField: Record<string, number>;
}> {
  const supabase = getSupabaseClient();

  const { data: movies, error } = await supabase
    .from('movies')
    .select('title_en, title_te, director, hero, heroine, cast_members, genres, runtime_minutes, synopsis_te, poster_url, backdrop_url, release_date, release_year, avg_rating')
    .limit(2000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const fields = [
    'title_en', 'title_te', 'director', 'hero', 'heroine',
    'cast_members', 'genres', 'runtime_minutes', 'synopsis_te',
    'poster_url', 'backdrop_url', 'release_date',
    'release_year', 'avg_rating'
  ];

  const byField: Record<string, number> = {};
  let totalFields = 0;

  fields.forEach(field => {
    const count = movies.filter(m => {
      const value = m[field];
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined && value !== '';
    }).length;
    
    byField[field] = Math.round((count / movies.length) * 100);
    totalFields += count;
  });

  const maxPossible = movies.length * fields.length;
  const avgFieldsPerMovie = movies.length > 0 
    ? totalFields / movies.length 
    : 0;

  return {
    avgFieldsPerMovie: Math.round(avgFieldsPerMovie * 10) / 10,
    depthScore: maxPossible > 0 
      ? Math.round((totalFields / maxPossible) * 100) 
      : 0,
    byField
  };
}

// ============================================================
// DECADE COVERAGE
// ============================================================

export async function calculateDecadeCoverage(): Promise<
  Record<string, {
    total: number;
    complete: number;
    percentComplete: number;
  }>
> {
  const supabase = getSupabaseClient();

  const { data: movies, error } = await supabase
    .from('movies')
    .select('release_year, poster_url, backdrop_url, director, cast_members')
    .limit(3000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const byDecade: Record<string, { total: number; complete: number }> = {};

  movies.forEach(movie => {
    const decade = movie.release_year 
      ? `${Math.floor(movie.release_year / 10) * 10}s`
      : 'Unknown';

    if (!byDecade[decade]) {
      byDecade[decade] = { total: 0, complete: 0 };
    }

    byDecade[decade].total++;

    // A movie is "complete" if it has poster, backdrop, director, and 3+ cast
    const isComplete = 
      movie.poster_url &&
      movie.backdrop_url &&
      movie.director &&
      (movie.cast_members?.length || 0) >= 3;

    if (isComplete) {
      byDecade[decade].complete++;
    }
  });

  // Calculate percentages
  const result: Record<string, {
    total: number;
    complete: number;
    percentComplete: number;
  }> = {};

  Object.entries(byDecade)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([decade, stats]) => {
      result[decade] = {
        ...stats,
        percentComplete: stats.total > 0 
          ? Math.round((stats.complete / stats.total) * 100) 
          : 0
      };
    });

  return result;
}

// ============================================================
// ENTITY CONFIDENCE
// ============================================================

export async function calculateEntityConfidence(): Promise<{
  avgConfidence: number;
  withDirector: number;
  withHero: number;
  withHeroine: number;
  withCast3Plus: number;
  withCast5Plus: number;
}> {
  const supabase = getSupabaseClient();

  const { data: movies, error } = await supabase
    .from('movies')
    .select('director, hero, heroine, cast_members')
    .limit(3000);

  if (error || !movies) {
    throw new Error(`Failed to fetch movies: ${error?.message}`);
  }

  const total = movies.length;
  const withDirector = movies.filter(m => m.director).length;
  const withHero = movies.filter(m => m.hero).length;
  const withHeroine = movies.filter(m => m.heroine).length;
  const withCast3Plus = movies.filter(m => (m.cast_members?.length || 0) >= 3).length;
  const withCast5Plus = movies.filter(m => (m.cast_members?.length || 0) >= 5).length;

  // Calculate average confidence based on entity completeness
  let totalConfidence = 0;
  movies.forEach(m => {
    let confidence = 0;
    if (m.director) confidence += 0.3;
    if (m.hero) confidence += 0.2;
    if (m.heroine) confidence += 0.1;
    const castCount = m.cast_members?.length || 0;
    if (castCount >= 5) confidence += 0.4;
    else if (castCount >= 3) confidence += 0.3;
    else if (castCount >= 1) confidence += 0.1;
    totalConfidence += confidence;
  });

  return {
    avgConfidence: total > 0 
      ? Math.round((totalConfidence / total) * 100) / 100 
      : 0,
    withDirector: Math.round((withDirector / total) * 100),
    withHero: Math.round((withHero / total) * 100),
    withHeroine: Math.round((withHeroine / total) * 100),
    withCast3Plus: Math.round((withCast3Plus / total) * 100),
    withCast5Plus: Math.round((withCast5Plus / total) * 100)
  };
}

// ============================================================
// FULL METRICS REPORT
// ============================================================

export async function generateFullMetrics(): Promise<DataEvolutionMetrics> {
  const [visual, depth, decades, entityConf] = await Promise.all([
    calculateVisualCompleteness(),
    calculateStructuredDepth(),
    calculateDecadeCoverage(),
    calculateEntityConfidence()
  ]);

  // Calculate decade coverage as percentages
  const coverageByDecade: Record<string, number> = {};
  Object.entries(decades).forEach(([decade, stats]) => {
    coverageByDecade[decade] = stats.percentComplete;
  });

  // Estimate media tier distribution (based on URL patterns)
  const supabase = getSupabaseClient();
  const { data: movies } = await supabase
    .from('movies')
    .select('poster_url, backdrop_url')
    .limit(2000);

  const tierDist = { tier_1: 0, tier_2: 0, tier_3: 0 };
  (movies || []).forEach(m => {
    if (m.poster_url?.includes('tmdb.org')) tierDist.tier_1++;
    else if (m.poster_url?.includes('wikimedia') || m.poster_url?.includes('wikipedia')) tierDist.tier_2++;
    else if (m.poster_url) tierDist.tier_3++;
    
    if (m.backdrop_url?.includes('tmdb.org')) tierDist.tier_1++;
    else if (m.backdrop_url?.includes('wikimedia') || m.backdrop_url?.includes('wikipedia')) tierDist.tier_2++;
    else if (m.backdrop_url) tierDist.tier_3++;
  });

  return {
    timestamp: new Date().toISOString(),
    visual_completeness: visual.percentComplete,
    media_tier_distribution: tierDist,
    structured_depth_score: depth.depthScore,
    entity_confidence_avg: entityConf.avgConfidence,
    story_graph_density: 0, // Would come from story graph module
    coverage_by_decade: coverageByDecade,
    tag_coverage: 0, // Would come from tag module
    goals: {
      backdrop_coverage: {
        current: Math.round((visual.withBackdrop / visual.total) * 100),
        target: 75
      },
      visual_completeness: {
        current: visual.percentComplete,
        target: 90
      },
      index_coverage: {
        current: 0, // Would calculate from index comparison
        target: 85
      }
    }
  };
}

// ============================================================
// METRICS COMPARISON
// ============================================================

export function compareMetrics(
  current: DataEvolutionMetrics,
  previous: DataEvolutionMetrics
): {
  improvements: string[];
  regressions: string[];
  unchanged: string[];
  summary: string;
} {
  const improvements: string[] = [];
  const regressions: string[] = [];
  const unchanged: string[] = [];

  // Compare visual completeness
  const visualDiff = current.visual_completeness - previous.visual_completeness;
  if (visualDiff > 1) {
    improvements.push(`Visual completeness: ${previous.visual_completeness}% → ${current.visual_completeness}% (+${visualDiff}%)`);
  } else if (visualDiff < -1) {
    regressions.push(`Visual completeness: ${previous.visual_completeness}% → ${current.visual_completeness}% (${visualDiff}%)`);
  } else {
    unchanged.push('Visual completeness');
  }

  // Compare structured depth
  const depthDiff = current.structured_depth_score - previous.structured_depth_score;
  if (depthDiff > 1) {
    improvements.push(`Structured depth: ${previous.structured_depth_score} → ${current.structured_depth_score} (+${depthDiff})`);
  } else if (depthDiff < -1) {
    regressions.push(`Structured depth: ${previous.structured_depth_score} → ${current.structured_depth_score} (${depthDiff})`);
  } else {
    unchanged.push('Structured depth');
  }

  // Compare entity confidence
  const confDiff = current.entity_confidence_avg - previous.entity_confidence_avg;
  if (confDiff > 0.02) {
    improvements.push(`Entity confidence: ${previous.entity_confidence_avg} → ${current.entity_confidence_avg}`);
  } else if (confDiff < -0.02) {
    regressions.push(`Entity confidence decreased`);
  } else {
    unchanged.push('Entity confidence');
  }

  // Generate summary
  let summary = '';
  if (improvements.length > 0 && regressions.length === 0) {
    summary = `✅ Data quality improved in ${improvements.length} areas`;
  } else if (regressions.length > 0 && improvements.length === 0) {
    summary = `⚠️ Data quality regressed in ${regressions.length} areas`;
  } else if (improvements.length > regressions.length) {
    summary = `📈 Net positive: ${improvements.length} improvements, ${regressions.length} regressions`;
  } else {
    summary = `📊 Stable: ${unchanged.length} metrics unchanged`;
  }

  return { improvements, regressions, unchanged, summary };
}

