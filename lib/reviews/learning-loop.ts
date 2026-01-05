/**
 * Learning Loop System
 * 
 * Analyzes top-performing content patterns and feeds them back into:
 * - Review templates
 * - Section ordering
 * - Tag weights
 * - Recommendation algorithms
 * 
 * NO new systems created - reuses existing intelligence tables
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface PerformancePattern {
  pattern_type: PatternType;
  pattern_value: string;
  engagement_score: number; // 0-100
  sample_size: number;
  confidence: number; // 0-1
  insights: string[];
}

type PatternType =
  | 'genre_combo'
  | 'actor_era'
  | 'review_length'
  | 'section_order'
  | 'tag_combo'
  | 'mood_appeal'
  | 'rating_range';

interface LearningConfig {
  minSampleSize: number;
  analysisWindow: number; // days
  confidenceThreshold: number;
}

const DEFAULT_CONFIG: LearningConfig = {
  minSampleSize: 10,
  analysisWindow: 30, // last 30 days
  confidenceThreshold: 0.6,
};

// ============================================================
// PATTERN ANALYSIS
// ============================================================

/**
 * Analyze top-performing genre combinations
 */
export async function analyzeTopGenres(
  supabase: ReturnType<typeof createClient>,
  config: Partial<LearningConfig> = {}
): Promise<PerformancePattern[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PerformancePattern[] = [];

  // Get highest-rated movies by genre
  const { data: topMovies } = await supabase
    .from('movies')
    .select('genres, avg_rating, is_blockbuster')
    .eq('language', 'Telugu')
    .gte('avg_rating', 7)
    .not('genres', 'is', null);

  if (!topMovies) return patterns;

  // Count genre occurrences in top movies
  const genreCounts: Record<string, { count: number; avgRating: number; blockbusters: number }> = {};

  topMovies.forEach(movie => {
    (movie.genres || []).forEach((genre: string) => {
      if (!genreCounts[genre]) {
        genreCounts[genre] = { count: 0, avgRating: 0, blockbusters: 0 };
      }
      genreCounts[genre].count++;
      genreCounts[genre].avgRating += movie.avg_rating || 0;
      if (movie.is_blockbuster) genreCounts[genre].blockbusters++;
    });
  });

  // Generate patterns
  Object.entries(genreCounts)
    .filter(([_, stats]) => stats.count >= cfg.minSampleSize)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([genre, stats]) => {
      const avgRating = stats.avgRating / stats.count;
      patterns.push({
        pattern_type: 'genre_combo',
        pattern_value: genre,
        engagement_score: Math.round((avgRating / 10) * 100),
        sample_size: stats.count,
        confidence: Math.min(1, stats.count / 50),
        insights: [
          `${genre} movies average ${avgRating.toFixed(1)}/10`,
          `${stats.blockbusters} blockbusters out of ${stats.count} top movies`,
        ],
      });
    });

  return patterns;
}

/**
 * Analyze top-performing actors by era
 */
export async function analyzeActorEras(
  supabase: ReturnType<typeof createClient>,
  config: Partial<LearningConfig> = {}
): Promise<PerformancePattern[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PerformancePattern[] = [];

  // Get movies grouped by hero and decade
  const { data: movies } = await supabase
    .from('movies')
    .select('hero, release_year, avg_rating, is_blockbuster')
    .eq('language', 'Telugu')
    .gte('avg_rating', 6)
    .not('hero', 'is', null);

  if (!movies) return patterns;

  // Group by actor + decade
  const actorDecadeStats: Record<string, { count: number; avgRating: number; decades: Set<number> }> = {};

  movies.forEach(movie => {
    const actor = movie.hero;
    if (!actor) return;

    if (!actorDecadeStats[actor]) {
      actorDecadeStats[actor] = { count: 0, avgRating: 0, decades: new Set() };
    }
    actorDecadeStats[actor].count++;
    actorDecadeStats[actor].avgRating += movie.avg_rating || 0;
    if (movie.release_year) {
      actorDecadeStats[actor].decades.add(Math.floor(movie.release_year / 10) * 10);
    }
  });

  // Generate patterns for actors with cross-decade appeal
  Object.entries(actorDecadeStats)
    .filter(([_, stats]) => stats.count >= cfg.minSampleSize && stats.decades.size >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .forEach(([actor, stats]) => {
      const avgRating = stats.avgRating / stats.count;
      patterns.push({
        pattern_type: 'actor_era',
        pattern_value: actor,
        engagement_score: Math.round((avgRating / 10) * 100),
        sample_size: stats.count,
        confidence: Math.min(1, stats.count / 30),
        insights: [
          `${actor} has ${stats.count} highly-rated movies`,
          `Active across ${stats.decades.size} decades`,
          `Cross-generational appeal detected`,
        ],
      });
    });

  return patterns;
}

/**
 * Analyze optimal review characteristics
 */
export async function analyzeReviewPatterns(
  supabase: ReturnType<typeof createClient>
): Promise<PerformancePattern[]> {
  const patterns: PerformancePattern[] = [];

  // Get reviews with dimensions_json
  const { data: reviews } = await supabase
    .from('movie_reviews')
    .select('dimensions_json, overall_rating, movie_id')
    .not('dimensions_json', 'is', null)
    .gte('overall_rating', 7);

  if (!reviews) return patterns;

  // Count editorial vs non-editorial reviews
  let editorialCount = 0;
  let regularCount = 0;
  let editorialRatingSum = 0;
  let regularRatingSum = 0;

  reviews.forEach(review => {
    if (review.dimensions_json?._type === 'editorial_review_v2') {
      editorialCount++;
      editorialRatingSum += review.overall_rating || 0;
    } else {
      regularCount++;
      regularRatingSum += review.overall_rating || 0;
    }
  });

  if (editorialCount >= 10) {
    patterns.push({
      pattern_type: 'review_length',
      pattern_value: 'editorial_review_v2',
      engagement_score: 85,
      sample_size: editorialCount,
      confidence: Math.min(1, editorialCount / 50),
      insights: [
        `${editorialCount} editorial reviews generated`,
        `Average rating: ${(editorialRatingSum / editorialCount).toFixed(1)}/10`,
        `Editorial reviews provide richer content`,
      ],
    });
  }

  return patterns;
}

// ============================================================
// LEARNING RECOMMENDATIONS
// ============================================================

/**
 * Generate recommendations based on learned patterns
 */
export async function generateLearningRecommendations(
  supabase: ReturnType<typeof createClient>
): Promise<{
  section_priorities: string[];
  tag_weights: Record<string, number>;
  content_focus: string[];
}> {
  const [genrePatterns, actorPatterns, reviewPatterns] = await Promise.all([
    analyzeTopGenres(supabase),
    analyzeActorEras(supabase),
    analyzeReviewPatterns(supabase),
  ]);

  // Determine section priorities based on patterns
  const sectionPriorities: string[] = [];
  
  // Top genres should be prioritized
  const topGenres = genrePatterns
    .filter(p => p.engagement_score > 70)
    .map(p => p.pattern_value.toLowerCase());
  
  if (topGenres.includes('action')) sectionPriorities.push('blockbusters');
  if (topGenres.includes('drama')) sectionPriorities.push('classics');
  if (topGenres.includes('comedy')) sectionPriorities.push('feel-good');
  
  sectionPriorities.push('recently_released', 'trending', 'hidden-gems');

  // Calculate tag weights
  const tagWeights: Record<string, number> = {};
  genrePatterns.forEach(p => {
    tagWeights[`genre:${p.pattern_value.toLowerCase()}`] = p.engagement_score / 100;
  });
  actorPatterns.forEach(p => {
    tagWeights[`actor:${p.pattern_value}`] = p.engagement_score / 100;
  });

  // Content focus recommendations
  const contentFocus = [
    'Prioritize editorial reviews for blockbusters',
    'Cross-generational actors drive engagement',
    ...genrePatterns.slice(0, 3).map(p => `${p.pattern_value} genre performs well`),
  ];

  return {
    section_priorities: sectionPriorities,
    tag_weights: tagWeights,
    content_focus: contentFocus,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export const learningLoop = {
  analyzeTopGenres,
  analyzeActorEras,
  analyzeReviewPatterns,
  generateLearningRecommendations,
};

export default learningLoop;


