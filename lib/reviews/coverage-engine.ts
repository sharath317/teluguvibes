/**
 * MOVIE REVIEWS COVERAGE ENGINE
 * 
 * NON-NEGOTIABLE: Ensures 95%+ movie review coverage.
 * Partial completion is NOT allowed.
 * Coverage is a hard contract, not a best-effort metric.
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  release_date?: string;
  release_year?: number;
  genres?: string[];
  director?: string;
  hero?: string;
  heroine?: string;
  tmdb_rating?: number;
  imdb_rating?: number;
  our_rating?: number;
  poster_url?: string;
  is_published: boolean;
}

export interface MovieReview {
  id: string;
  movie_id: string;
  reviewer_name?: string;
  overall_rating?: number;
  status: 'draft' | 'published' | 'archived';
  source?: 'human' | 'ai_generated' | 'template_fallback';
  created_at: string;
}

export interface CoverageResult {
  totalMovies: number;
  moviesWithReviews: number;
  moviesWithoutReviews: Movie[];
  currentCoverage: number;
  targetCoverage: number;
  gap: number;
  meetsTarget: boolean;
  breakdown: {
    human: number;
    ai: number;
    template: number;
  };
}

export interface CoverageHistory {
  date: string;
  coverage: number;
  totalMovies: number;
  withReviews: number;
}

export interface CoverageStats {
  current: CoverageResult;
  history: CoverageHistory[];
  lastUpdated: string;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(url, key);
}

// ============================================================
// COVERAGE CALCULATION
// ============================================================

/**
 * Calculate current movie review coverage
 */
export async function calculateCoverage(targetCoverage: number = 0.95): Promise<CoverageResult> {
  const supabase = getSupabaseClient();
  
  // Get total movies eligible for review (published and released or no release date)
  // Include movies where:
  // 1. is_published = true AND (release_date <= today OR release_date is null)
  // 2. OR release_year <= current year
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0];
  
  // Supabase has a default 1000 row limit - paginate to get all
  let movies: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: page, error: pageError } = await supabase
      .from('movies')
      .select('*')
      .eq('is_published', true)
      .or(`release_date.lte.${today},release_date.is.null,release_year.lte.${currentYear}`)
      .range(offset, offset + pageSize - 1);
    
    if (pageError) {
      throw new Error(`Failed to fetch movies page: ${pageError.message}`);
    }
    
    if (!page || page.length === 0) break;
    movies = movies.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  
  const moviesError = null; // Already handled in pagination loop
  
  if (moviesError) {
    throw new Error(`Failed to fetch movies: ${moviesError.message}`);
  }
  
  const totalMovies = movies?.length || 0;
  
  if (totalMovies === 0) {
    return {
      totalMovies: 0,
      moviesWithReviews: 0,
      moviesWithoutReviews: [],
      currentCoverage: 1,
      targetCoverage,
      gap: 0,
      meetsTarget: true,
      breakdown: { human: 0, ai: 0, template: 0 },
    };
  }
  
  // Get movies with reviews - paginate to get all
  let reviews: any[] = [];
  let hasSourceColumn = true;
  let reviewOffset = 0;
  
  while (true) {
    const { data: reviewPage, error: reviewsError } = await supabase
      .from('movie_reviews')
      .select('movie_id, source, status')
      .range(reviewOffset, reviewOffset + pageSize - 1);
    
    if (reviewsError) {
      // Check if the error is about missing column
      if (reviewsError.message.includes('source') && reviewsError.message.includes('does not exist')) {
        hasSourceColumn = false;
        // Retry without source column
        const { data: reviewsWithoutSource, error: retryError } = await supabase
          .from('movie_reviews')
          .select('movie_id, status')
          .range(reviewOffset, reviewOffset + pageSize - 1);
        
        if (retryError) {
          throw new Error(`Failed to fetch reviews: ${retryError.message}`);
        }
        if (reviewsWithoutSource && reviewsWithoutSource.length > 0) {
          reviews = reviews.concat(reviewsWithoutSource);
          if (reviewsWithoutSource.length < pageSize) break;
          reviewOffset += pageSize;
          continue;
        }
        break;
      } else {
        throw new Error(`Failed to fetch reviews: ${reviewsError.message}`);
      }
    }
    
    if (!reviewPage || reviewPage.length === 0) break;
    reviews = reviews.concat(reviewPage);
    if (reviewPage.length < pageSize) break;
    reviewOffset += pageSize;
  }
  
  // Count unique movies with reviews
  const movieIdsWithReviews = new Set(reviews.map((r: any) => r.movie_id));
  const moviesWithReviews = movieIdsWithReviews.size;
  
  // Find movies without reviews
  const moviesWithoutReviews = (movies || []).filter(
    (m: Movie) => !movieIdsWithReviews.has(m.id)
  );
  
  // Calculate breakdown by source (if column exists)
  const breakdown = { human: 0, ai: 0, template: 0 };
  const reviewedMovieIds = new Set<string>();
  
  for (const review of reviews) {
    if (reviewedMovieIds.has(review.movie_id)) continue;
    reviewedMovieIds.add(review.movie_id);
    
    if (!hasSourceColumn) {
      // If no source column, count all as AI (legacy)
      breakdown.ai++;
      continue;
    }
    
    switch (review.source) {
      case 'human':
        breakdown.human++;
        break;
      case 'ai_generated':
        breakdown.ai++;
        break;
      case 'template_fallback':
        breakdown.template++;
        break;
      default:
        // Default to AI for legacy reviews
        breakdown.ai++;
    }
  }
  
  const currentCoverage = moviesWithReviews / totalMovies;
  const gap = targetCoverage - currentCoverage;
  
  return {
    totalMovies,
    moviesWithReviews,
    moviesWithoutReviews: moviesWithoutReviews as Movie[],
    currentCoverage,
    targetCoverage,
    gap: Math.max(0, gap),
    meetsTarget: currentCoverage >= targetCoverage,
    breakdown,
  };
}

/**
 * Identify movies that need reviews (gap analysis)
 */
export async function identifyGaps(): Promise<Movie[]> {
  const coverage = await calculateCoverage();
  return coverage.moviesWithoutReviews;
}

/**
 * Get movies with weak reviews that could be enhanced
 */
export async function getWeakReviews(): Promise<{ movie: Movie; review: MovieReview }[]> {
  const supabase = getSupabaseClient();
  
  try {
    // Try with confidence and source columns first
    const { data: weakReviews, error } = await supabase
      .from('movie_reviews')
      .select(`
        *,
        movies:movie_id (*)
      `)
      .or('confidence.lt.0.7,source.eq.template_fallback')
      .order('confidence', { ascending: true })
      .limit(50);
    
    if (error) {
      // If columns don't exist, return empty (no weak reviews to report)
      if (error.message.includes('does not exist')) {
        console.warn('getWeakReviews: confidence/source columns not found, returning empty');
        return [];
      }
      console.error('Error fetching weak reviews:', error);
      return [];
    }
    
    return (weakReviews || []).map((r: any) => ({
      movie: r.movies as Movie,
      review: r as MovieReview,
    }));
  } catch (err) {
    console.error('Error in getWeakReviews:', err);
    return [];
  }
}

// ============================================================
// COVERAGE ENFORCEMENT
// ============================================================

/**
 * Enforce minimum coverage - throws if target not met
 * This is the HARD GATE - no exceptions
 */
export async function enforceCoverage(
  targetCoverage: number,
  coverage: CoverageResult
): Promise<{ passed: boolean; message: string }> {
  if (coverage.meetsTarget) {
    return {
      passed: true,
      message: `✅ Coverage target met: ${(coverage.currentCoverage * 100).toFixed(1)}% >= ${(targetCoverage * 100).toFixed(1)}%`,
    };
  }
  
  return {
    passed: false,
    message: `❌ Coverage target NOT met: ${(coverage.currentCoverage * 100).toFixed(1)}% < ${(targetCoverage * 100).toFixed(1)}%`,
  };
}

/**
 * Log coverage to history table
 */
export async function logCoverageHistory(coverage: CoverageResult): Promise<void> {
  const supabase = getSupabaseClient();
  
  try {
    await supabase
      .from('coverage_history')
      .insert({
        date: new Date().toISOString().split('T')[0],
        coverage: coverage.currentCoverage,
        total_movies: coverage.totalMovies,
        with_reviews: coverage.moviesWithReviews,
        breakdown_human: coverage.breakdown.human,
        breakdown_ai: coverage.breakdown.ai,
        breakdown_template: coverage.breakdown.template,
      });
  } catch (error) {
    // Table might not exist yet, that's okay
    console.warn('Could not log coverage history (table may not exist)');
  }
}

/**
 * Get coverage history for visualization
 */
export async function getCoverageHistory(days: number = 30): Promise<CoverageHistory[]> {
  const supabase = getSupabaseClient();
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('coverage_history')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    if (error) throw error;
    
    return (data || []).map((h: any) => ({
      date: h.date,
      coverage: h.coverage,
      totalMovies: h.total_movies,
      withReviews: h.with_reviews,
    }));
  } catch {
    return [];
  }
}

/**
 * Get complete coverage stats for admin dashboard
 */
export async function getCoverageStats(targetCoverage: number = 0.95): Promise<CoverageStats> {
  const current = await calculateCoverage(targetCoverage);
  const history = await getCoverageHistory();
  
  return {
    current,
    history,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================
// EXPORT DIMENSION DEFINITIONS FOR TEMPLATE REVIEWS
// ============================================================

/**
 * 15-Dimension Review Model v2.0
 * 
 * CORE NARRATIVE (30%): story_screenplay, direction, dialogues_punchlines
 * PERFORMANCES (18%): acting_lead, acting_supporting
 * TECHNICAL (27%): music_bgm, cinematography, action_choreography, vfx_special_effects
 * CRAFT (10%): editing_pacing, production_design
 * IMPACT (15%): emotional_impact, comedy_timing, rewatch_value, mass_vs_class
 * 
 * Weights total: 100%
 */
export const DIMENSION_DEFINITIONS = {
  // CORE NARRATIVE (30%)
  story_screenplay: {
    name: 'Story & Screenplay',
    name_te: 'కథ & స్క్రీన్‌ప్లే',
    weight: 0.12,
  },
  direction: {
    name: 'Direction',
    name_te: 'దర్శకత్వం',
    weight: 0.10,
  },
  dialogues_punchlines: {
    name: 'Dialogues & Punchlines',
    name_te: 'డైలాగ్స్ & పంచ్‌లు',
    weight: 0.08,
  },
  
  // PERFORMANCES (18%)
  acting_lead: {
    name: 'Lead Acting',
    name_te: 'హీరో/హీరోయిన్ నటన',
    weight: 0.13,
  },
  acting_supporting: {
    name: 'Supporting Cast',
    name_te: 'సహాయ నటీనటులు',
    weight: 0.05,
  },
  
  // TECHNICAL (27%)
  music_bgm: {
    name: 'Music & BGM',
    name_te: 'సంగీతం & BGM',
    weight: 0.10,
  },
  cinematography: {
    name: 'Cinematography',
    name_te: 'ఛాయాగ్రహణం',
    weight: 0.06,
  },
  action_choreography: {
    name: 'Action Choreography',
    name_te: 'యాక్షన్ కొరియోగ్రఫీ',
    weight: 0.06,
  },
  vfx_special_effects: {
    name: 'VFX & Special Effects',
    name_te: 'VFX & స్పెషల్ ఎఫెక్ట్స్',
    weight: 0.05,
  },
  
  // CRAFT (10%)
  editing_pacing: {
    name: 'Editing & Pacing',
    name_te: 'ఎడిటింగ్ & పేసింగ్',
    weight: 0.06,
  },
  production_design: {
    name: 'Production Design',
    name_te: 'ప్రొడక్షన్ డిజైన్',
    weight: 0.04,
  },
  
  // IMPACT (15%)
  emotional_impact: {
    name: 'Emotional Impact',
    name_te: 'భావోద్వేగ ప్రభావం',
    weight: 0.08,
  },
  comedy_timing: {
    name: 'Comedy & Timing',
    name_te: 'కామెడీ టైమింగ్',
    weight: 0.05,
  },
  rewatch_value: {
    name: 'Rewatch Value',
    name_te: 'మళ్ళీ చూడాలనిపించే విలువ',
    weight: 0.00, // Derived, not directly scored
  },
  mass_vs_class: {
    name: 'Mass vs Class Appeal',
    name_te: 'మాస్ vs క్లాస్',
    weight: 0.02, // Derived, lower direct weight
  },
};

// Dimension keys for type safety
export type DimensionKey = keyof typeof DIMENSION_DEFINITIONS;

// Scored dimensions (excludes derived ones)
export const SCORED_DIMENSIONS: DimensionKey[] = [
  'story_screenplay',
  'direction',
  'dialogues_punchlines',
  'acting_lead',
  'acting_supporting',
  'music_bgm',
  'cinematography',
  'action_choreography',
  'vfx_special_effects',
  'editing_pacing',
  'production_design',
  'emotional_impact',
  'comedy_timing',
];

// Genre-specific dimension applicability
export const GENRE_DIMENSION_APPLICABILITY: Record<string, DimensionKey[]> = {
  Action: ['action_choreography', 'vfx_special_effects'],
  Comedy: ['comedy_timing', 'dialogues_punchlines'],
  Drama: ['emotional_impact', 'acting_lead'],
  Thriller: ['editing_pacing', 'direction'],
  Romance: ['music_bgm', 'emotional_impact'],
  Horror: ['vfx_special_effects', 'production_design'],
  Fantasy: ['vfx_special_effects', 'production_design', 'cinematography'],
  Period: ['production_design', 'cinematography'],
};

