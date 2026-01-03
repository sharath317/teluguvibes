/**
 * Content Decay Detection System
 * 
 * Identifies stale content that needs re-enrichment:
 * - Low engagement (views, clicks)
 * - Outdated reviews (old movies with new info)
 * - Missing editorial reviews
 * - OTT release triggers
 * - Actor trend spikes
 * 
 * Usage:
 *   import { detectDecayedContent, triggerReEnrichment } from '@/lib/reviews/content-decay';
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface DecayedContent {
  movie_id: string;
  title: string;
  slug: string;
  decay_reason: DecayReason;
  decay_score: number; // 0-100, higher = more decayed
  priority: 'critical' | 'high' | 'medium' | 'low';
  last_enriched_at?: string;
  suggested_action: string;
}

type DecayReason = 
  | 'missing_editorial_review'
  | 'outdated_review'
  | 'low_engagement'
  | 'new_ott_release'
  | 'actor_trend_spike'
  | 'anniversary_upcoming'
  | 'incomplete_data';

interface DecayConfig {
  // Days since last enrichment to consider outdated
  staleThresholdDays: number;
  // Minimum views per month for active content
  minMonthlyViews: number;
  // Priority movies (blockbusters, classics) get faster decay detection
  priorityMovieDecayMultiplier: number;
}

const DEFAULT_CONFIG: DecayConfig = {
  staleThresholdDays: 180, // 6 months
  minMonthlyViews: 10,
  priorityMovieDecayMultiplier: 1.5,
};

// ============================================================
// DECAY DETECTION
// ============================================================

/**
 * Detect all content that needs re-enrichment
 */
export async function detectDecayedContent(
  supabase: ReturnType<typeof createClient>,
  config: Partial<DecayConfig> = {}
): Promise<DecayedContent[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const decayedContent: DecayedContent[] = [];

  // 1. Find movies missing editorial reviews
  const { data: missingEditorial } = await supabase
    .from('movies')
    .select(`
      id, title_en, slug, is_blockbuster, is_classic,
      movie_reviews!inner(dimensions_json)
    `)
    .eq('language', 'Telugu')
    .not('movie_reviews.dimensions_json->_type', 'eq', 'editorial_review_v2')
    .order('avg_rating', { ascending: false })
    .limit(100);

  if (missingEditorial) {
    for (const movie of missingEditorial) {
      decayedContent.push({
        movie_id: movie.id,
        title: movie.title_en,
        slug: movie.slug,
        decay_reason: 'missing_editorial_review',
        decay_score: movie.is_blockbuster || movie.is_classic ? 90 : 70,
        priority: movie.is_blockbuster || movie.is_classic ? 'critical' : 'high',
        suggested_action: 'Generate editorial review with AI',
      });
    }
  }

  // 2. Find movies with stale data (not enriched recently)
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - cfg.staleThresholdDays);

  const { data: staleMovies } = await supabase
    .from('movies')
    .select('id, title_en, slug, is_blockbuster, is_classic, updated_at')
    .eq('language', 'Telugu')
    .lt('updated_at', staleDate.toISOString())
    .order('avg_rating', { ascending: false })
    .limit(50);

  if (staleMovies) {
    for (const movie of staleMovies) {
      const isPriority = movie.is_blockbuster || movie.is_classic;
      decayedContent.push({
        movie_id: movie.id,
        title: movie.title_en,
        slug: movie.slug,
        decay_reason: 'outdated_review',
        decay_score: isPriority ? 60 : 40,
        priority: isPriority ? 'medium' : 'low',
        last_enriched_at: movie.updated_at,
        suggested_action: 'Re-enrich with latest data from sources',
      });
    }
  }

  // 3. Find incomplete movies (missing key fields)
  const { data: incompleteMovies } = await supabase
    .from('movies')
    .select('id, title_en, slug, is_blockbuster, is_classic, poster_url, director, hero')
    .eq('language', 'Telugu')
    .or('poster_url.is.null,director.is.null,hero.is.null')
    .order('avg_rating', { ascending: false })
    .limit(50);

  if (incompleteMovies) {
    for (const movie of incompleteMovies) {
      const isPriority = movie.is_blockbuster || movie.is_classic;
      if (isPriority) {
        decayedContent.push({
          movie_id: movie.id,
          title: movie.title_en,
          slug: movie.slug,
          decay_reason: 'incomplete_data',
          decay_score: 75,
          priority: 'high',
          suggested_action: 'Fetch missing metadata from TMDB',
        });
      }
    }
  }

  // Sort by decay score (highest first)
  return decayedContent.sort((a, b) => b.decay_score - a.decay_score);
}

/**
 * Check if a specific movie needs re-enrichment
 */
export async function checkMovieDecay(
  supabase: ReturnType<typeof createClient>,
  movieId: string
): Promise<{ needsReEnrichment: boolean; reasons: DecayReason[] }> {
  const reasons: DecayReason[] = [];

  const { data: movie } = await supabase
    .from('movies')
    .select(`
      id, title_en, slug, is_blockbuster, is_classic, updated_at,
      poster_url, director, hero,
      movie_reviews(dimensions_json)
    `)
    .eq('id', movieId)
    .single();

  if (!movie) {
    return { needsReEnrichment: false, reasons: [] };
  }

  // Check for missing editorial review
  const hasEditorialReview = movie.movie_reviews?.some(
    (r: any) => r.dimensions_json?._type === 'editorial_review_v2'
  );
  if (!hasEditorialReview) {
    reasons.push('missing_editorial_review');
  }

  // Check for stale data
  const lastUpdate = new Date(movie.updated_at);
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - DEFAULT_CONFIG.staleThresholdDays);
  if (lastUpdate < staleDate) {
    reasons.push('outdated_review');
  }

  // Check for incomplete data
  if (!movie.poster_url || !movie.director || !movie.hero) {
    reasons.push('incomplete_data');
  }

  return {
    needsReEnrichment: reasons.length > 0,
    reasons,
  };
}

// ============================================================
// RE-ENRICHMENT TRIGGERS
// ============================================================

/**
 * Mark movies for re-enrichment based on triggers
 */
export async function markForReEnrichment(
  supabase: ReturnType<typeof createClient>,
  movieIds: string[],
  reason: DecayReason
): Promise<{ success: boolean; count: number }> {
  try {
    // Update movies to mark them for re-enrichment
    const { error, count } = await supabase
      .from('movies')
      .update({
        tags: supabase.sql`array_append(tags, 'needs-re-enrichment')`,
        updated_at: new Date().toISOString(),
      })
      .in('id', movieIds);

    if (error) throw error;

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Failed to mark movies for re-enrichment:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Get movies due for anniversary re-enrichment
 * (Movies celebrating 10, 25, 50 year anniversaries)
 */
export async function getAnniversaryMovies(
  supabase: ReturnType<typeof createClient>
): Promise<Array<{ id: string; title: string; anniversary_year: number }>> {
  const currentYear = new Date().getFullYear();
  const anniversaryYears = [
    currentYear - 10,  // 10th anniversary
    currentYear - 25,  // Silver Jubilee
    currentYear - 50,  // Golden Jubilee
  ];

  const { data } = await supabase
    .from('movies')
    .select('id, title_en, release_year')
    .in('release_year', anniversaryYears)
    .eq('language', 'Telugu');

  return (data || []).map(movie => ({
    id: movie.id,
    title: movie.title_en,
    anniversary_year: currentYear - movie.release_year,
  }));
}

// ============================================================
// EXPORTS
// ============================================================

export const contentDecay = {
  detectDecayedContent,
  checkMovieDecay,
  markForReEnrichment,
  getAnniversaryMovies,
};

export default contentDecay;

