/**
 * REVIEW ENRICHMENT UTILITY
 * 
 * Integrates existing multi-axis review system with new structured dimensions.
 * Converts existing review data into structured JSON format for database storage.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  ReviewDimensions,
  PerformanceScores,
  TechnicalScores,
  AudienceSignals,
  ConfidenceDimensions,
  CompositeScoreBreakdown,
  EnrichedReview,
} from './review-dimensions.types';

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================
// DIMENSION EXTRACTION
// ============================================================

/**
 * Extract structured dimensions from existing review dimensions
 * Handles both old format (dimensions.direction.score) and new format (insights.direction.score)
 */
export function extractDimensionsFromInsights(dimensions: any): ReviewDimensions | null {
  if (!dimensions) return null;

  try {
    // Handle both old and new formats
    const getScore = (key: string) => dimensions[key]?.score || 0;
    
    return {
      story_screenplay: {
        score: getScore('story_screenplay'),
        highlights: dimensions.story_screenplay?.highlights || [],
        weaknesses: dimensions.story_screenplay?.weaknesses || [],
        originality: dimensions.story_screenplay?.originality || getScore('story_screenplay') * 0.9,
        emotional_depth: dimensions.story_screenplay?.emotional_depth || getScore('emotional_impact') * 0.8,
        pacing: dimensions.story_screenplay?.pacing || getScore('editing_pacing') * 0.7,
      },
      direction: {
        score: getScore('direction'),
        style: dimensions.direction?.style || 'balanced',
        innovation: dimensions.direction?.innovation || getScore('direction') * 0.8,
        vision_clarity: dimensions.direction?.vision_clarity || getScore('direction') * 0.9,
        execution: dimensions.direction?.execution || getScore('direction') * 0.85,
      },
      acting_lead: {
        hero: {
          name: dimensions.acting_lead?.hero?.name || 'Lead Actor',
          score: dimensions.acting_lead?.hero?.score || getScore('acting_lead'),
          transformation: dimensions.acting_lead?.hero?.transformation || 0,
          career_best: dimensions.acting_lead?.hero?.career_best || false,
          chemistry: dimensions.acting_lead?.hero?.chemistry || getScore('acting_lead') * 0.8,
        },
        heroine: dimensions.acting_lead?.heroine ? {
          name: dimensions.acting_lead.heroine.name,
          score: dimensions.acting_lead.heroine.score || 0,
          transformation: dimensions.acting_lead.heroine.transformation || 0,
          career_best: dimensions.acting_lead.heroine.career_best || false,
          chemistry: dimensions.acting_lead.heroine.chemistry || 0,
        } : undefined,
        overall_chemistry: dimensions.acting_lead?.overall_chemistry || getScore('acting_lead') * 0.7,
      },
      acting_supporting: {
        standouts: dimensions.acting_supporting?.standouts || [],
        overall_strength: dimensions.acting_supporting?.overall_strength || getScore('acting_supporting'),
      },
      music_bgm: {
        songs: dimensions.music_bgm?.songs || getScore('music_bgm'),
        bgm: dimensions.music_bgm?.bgm || getScore('music_bgm') * 0.9,
        replay_value: dimensions.music_bgm?.replay_value || getScore('music_bgm') * 0.8,
        integration: dimensions.music_bgm?.integration || getScore('music_bgm') * 0.85,
      },
      cinematography: {
        score: getScore('cinematography'),
        memorable_shots: dimensions.cinematography?.memorable_shots || [],
        color_grading: dimensions.cinematography?.color_grading || getScore('cinematography') * 0.9,
        camera_work: dimensions.cinematography?.camera_work || getScore('cinematography') * 0.95,
      },
      editing_pacing: {
        score: getScore('editing_pacing'),
        runtime_efficiency: dimensions.editing_pacing?.runtime_efficiency || getScore('editing_pacing') * 0.85,
        transition_quality: dimensions.editing_pacing?.transition_quality || getScore('editing_pacing') * 0.9,
        montage_effectiveness: dimensions.editing_pacing?.montage_effectiveness || getScore('editing_pacing') * 0.8,
      },
      emotional_impact: {
        tears: dimensions.emotional_impact?.tears || getScore('emotional_impact') * 0.6,
        laughter: dimensions.emotional_impact?.laughter || getScore('emotional_impact') * 0.5,
        thrill: dimensions.emotional_impact?.thrill || getScore('emotional_impact') * 0.7,
        inspiration: dimensions.emotional_impact?.inspiration || getScore('emotional_impact') * 0.5,
        nostalgia: dimensions.emotional_impact?.nostalgia || getScore('emotional_impact') * 0.4,
      },
      rewatch_value: getScore('rewatch_value'),
      mass_vs_class: {
        mass: dimensions.mass_vs_class?.mass || getScore('mass_vs_class') * 0.7,
        class: dimensions.mass_vs_class?.class || getScore('mass_vs_class') * 0.3,
        universal_appeal: dimensions.mass_vs_class?.universal_appeal || getScore('mass_vs_class'),
        family_friendly: dimensions.mass_vs_class?.family_friendly || getScore('mass_vs_class') * 0.8,
      },
    };
  } catch (error) {
    console.error('Error extracting dimensions:', error);
    return null;
  }
}

/**
 * Extract performance scores from dimensions
 */
export function extractPerformanceScores(dimensions: any, movie: any): PerformanceScores | null {
  if (!dimensions && !movie) return null;

  try {
    const leadActors = [];
    const leadScore = dimensions?.acting_lead?.score || 0;
    
    if (movie?.hero) {
      leadActors.push({
        name: movie.hero,
        role: 'hero' as const,
        score: dimensions?.acting_lead?.hero?.score || leadScore,
        career_best: dimensions?.acting_lead?.hero?.career_best || false,
        transformation: dimensions?.acting_lead?.hero?.transformation || 0,
        chemistry: dimensions?.acting_lead?.hero?.chemistry || leadScore * 0.8,
        screen_presence: dimensions?.acting_lead?.hero?.screen_presence || leadScore * 0.9,
      });
    }
    
    if (movie?.heroine) {
      leadActors.push({
        name: movie.heroine,
        role: 'heroine' as const,
        score: dimensions?.acting_lead?.heroine?.score || leadScore * 0.9,
        career_best: dimensions?.acting_lead?.heroine?.career_best || false,
        transformation: dimensions?.acting_lead?.heroine?.transformation || 0,
        chemistry: dimensions?.acting_lead?.heroine?.chemistry || leadScore * 0.8,
        screen_presence: dimensions?.acting_lead?.heroine?.screen_presence || leadScore * 0.85,
      });
    }

    return {
      lead_actors: leadActors,
      supporting_cast: dimensions?.acting_supporting?.standouts || [],
      ensemble_strength: dimensions?.acting_supporting?.overall_strength || dimensions?.acting_supporting?.score || 0,
    };
  } catch (error) {
    console.error('Error extracting performance scores:', error);
    return null;
  }
}

/**
 * Extract technical scores from dimensions
 */
export function extractTechnicalScores(dimensions: any): TechnicalScores | null {
  if (!dimensions) return null;

  try {
    const cinematographyScore = dimensions.cinematography?.score || 0;
    const editingScore = dimensions.editing_pacing?.score || 0;
    const musicScore = dimensions.music_bgm?.score || 0;
    
    // Calculate overall technical excellence as weighted average
    const overall = (cinematographyScore * 0.3) + (editingScore * 0.25) + (musicScore * 0.25) + 
                   ((cinematographyScore + editingScore) / 2 * 0.2);

    return {
      cinematography: cinematographyScore,
      editing: editingScore,
      sound_design: dimensions.technical?.sound_design || musicScore * 0.8,
      vfx: dimensions.technical?.vfx || 0,
      production_design: dimensions.technical?.production_design || cinematographyScore * 0.7,
      costume_design: dimensions.technical?.costume_design || 0,
      makeup: dimensions.technical?.makeup || 0,
      overall_technical_excellence: dimensions.technical?.overall || overall,
    };
  } catch (error) {
    console.error('Error extracting technical scores:', error);
    return null;
  }
}

/**
 * Extract audience signals from dimensions and movie metadata
 */
export function extractAudienceSignals(dimensions: any, movie: any): AudienceSignals | null {
  try {
    const mood: any[] = [];
    
    const emotionalScore = dimensions?.emotional_impact?.score || 0;
    const rewatchScore = dimensions?.rewatch_value?.score || dimensions?.rewatch_value || 0;
    const massClassScore = dimensions?.mass_vs_class?.score || 0;
    
    // Derive mood from emotional impact (use score if individual values not available)
    if (dimensions?.emotional_impact) {
      const ei = dimensions.emotional_impact;
      if ((ei.thrill || emotionalScore * 0.7) >= 7) mood.push('thrilling');
      if ((ei.tears || emotionalScore * 0.6) >= 7) mood.push('emotional');
      if ((ei.laughter || emotionalScore * 0.5) >= 7) mood.push('light-hearted');
      if ((ei.inspiration || emotionalScore * 0.5) >= 7) mood.push('uplifting');
      if ((ei.nostalgia || emotionalScore * 0.4) >= 7) mood.push('nostalgic');
    }
    
    // Derive from genres
    if (movie?.genres) {
      if (movie.genres.includes('Romance')) mood.push('romantic');
      if (movie.genres.includes('Action')) mood.push('action-packed');
      if (movie.genres.includes('Thriller')) mood.push('intense');
      if (movie.genres.includes('Drama')) mood.push('thought-provoking');
    }

    const familyFriendlyScore = dimensions?.mass_vs_class?.family_friendly || massClassScore * 0.8;
    const massAppeal = dimensions?.mass_vs_class?.mass || massClassScore * 0.7;
    const criticAppeal = dimensions?.mass_vs_class?.class || massClassScore * 0.3;

    return {
      mood: [...new Set(mood)],
      family_friendly: familyFriendlyScore >= 7 || movie?.certification === 'U',
      age_rating: movie?.certification || 'U/A',
      rewatch_potential: rewatchScore >= 8 ? 'high' : 
                        rewatchScore >= 6 ? 'medium' : 'low',
      mass_appeal: massAppeal,
      critic_appeal: criticAppeal,
      kids_friendly: movie?.certification === 'U',
      date_movie: movie?.genres?.includes('Romance') || false,
      festival_worthy: criticAppeal >= 8 || false,
    };
  } catch (error) {
    console.error('Error extracting audience signals:', error);
    return null;
  }
}

// ============================================================
// CONFIDENCE CALCULATION
// ============================================================

/**
 * Calculate confidence dimensions for a review
 */
export function calculateConfidence(review: any, movie: any): ConfidenceDimensions {
  // Data completeness (0-1)
  const requiredFields = ['review_text', 'avg_rating', 'insights'];
  const presentFields = requiredFields.filter(field => review[field]).length;
  const data_completeness = presentFields / requiredFields.length;

  // Source reliability (0-1)
  const hasMultipleSources = (review.total_reviews || 0) > 1;
  const hasInsights = !!review.insights;
  const source_reliability = (hasMultipleSources ? 0.5 : 0.3) + (hasInsights ? 0.5 : 0.2);

  // Review count factor
  const review_count = review.total_reviews || 0;

  // Recency (0-1)
  const daysSinceUpdate = review.updated_at 
    ? Math.floor((Date.now() - new Date(review.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 365;
  const recency = Math.max(0, 1 - (daysSinceUpdate / 365));

  // Overall confidence
  const overall_confidence = (
    data_completeness * 0.3 +
    source_reliability * 0.4 +
    Math.min(review_count / 10, 1) * 0.2 +
    recency * 0.1
  );

  return {
    data_completeness,
    source_reliability,
    review_count,
    recency,
    overall_confidence: Math.min(overall_confidence, 1),
  };
}

// ============================================================
// COMPOSITE SCORING
// ============================================================

/**
 * Calculate composite score from multiple dimensions
 */
export function calculateCompositeScore(
  review: any,
  dimensions: ReviewDimensions | null,
  performance: any,
  movie: any
): CompositeScoreBreakdown {
  const weights = {
    avg_rating: 0.35,
    dimension_score: 0.25,
    engagement_score: 0.20,
    box_office_score: 0.10,
    recency_score: 0.10,
  };

  // Base rating (0-10)
  const avg_rating = review.avg_rating || 0;

  // Dimension score (0-10)
  let dimension_score = 0;
  if (dimensions) {
    const scores = [
      dimensions.story_screenplay.score,
      dimensions.direction.score,
      dimensions.acting_lead.hero?.score || 0,
      dimensions.music_bgm.songs,
      dimensions.cinematography.score,
      dimensions.editing_pacing.score,
      dimensions.rewatch_value,
    ];
    dimension_score = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  // Engagement score (0-10)
  const engagement_score = performance?.views 
    ? Math.min((performance.views / 10000) * 10, 10)
    : 0;

  // Box office score (0-10)
  const box_office_score = movie?.worldwide_gross_inr
    ? Math.min((movie.worldwide_gross_inr / 5000000000) * 10, 10)
    : 0;

  // Recency score (0-10)
  const daysSinceRelease = movie?.release_date
    ? Math.floor((Date.now() - new Date(movie.release_date).getTime()) / (1000 * 60 * 60 * 24))
    : 365;
  const recency_score = Math.max(0, 10 - (daysSinceRelease / 365) * 10);

  // Weighted composite
  const composite_score = (
    avg_rating * weights.avg_rating +
    dimension_score * weights.dimension_score +
    engagement_score * weights.engagement_score +
    box_office_score * weights.box_office_score +
    recency_score * weights.recency_score
  );

  return {
    avg_rating,
    dimension_score,
    engagement_score,
    box_office_score,
    recency_score,
    composite_score: Math.min(composite_score, 10),
    weights,
  };
}

// ============================================================
// ENRICHMENT PIPELINE
// ============================================================

/**
 * Enrich a single review with structured dimensions
 */
export async function enrichReview(movieId: string): Promise<EnrichedReview | null> {
  const supabase = getSupabaseClient();

  try {
    // Fetch movie and review data
    const { data: movie } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single();

    if (!movie) {
      console.error(`Movie not found: ${movieId}`);
      return null;
    }

    const { data: review } = await supabase
      .from('movie_reviews')
      .select('*')
      .eq('movie_id', movieId)
      .single();

    if (!review) {
      console.error(`Review not found for movie: ${movieId}`);
      return null;
    }

    // Extract structured data (from existing 'dimensions' field, not 'insights')
    const existingDimensions = review.dimensions || review.insights;
    
    if (!existingDimensions) {
      console.warn(`No dimensions found for movie ${movie.title_en}`);
    }
    
    const dimensions = extractDimensionsFromInsights(existingDimensions);
    const performance_scores = extractPerformanceScores(existingDimensions, movie);
    const technical_scores = extractTechnicalScores(existingDimensions);
    const audience_signals = extractAudienceSignals(existingDimensions, movie);
    
    if (!dimensions) {
      console.warn(`Failed to extract dimensions for movie ${movie.title_en}`);
    }
    if (!technical_scores) {
      console.warn(`Failed to extract technical scores for movie ${movie.title_en}`);
    }
    
    // Calculate confidence
    const confidence = calculateConfidence(review, movie);
    
    // Calculate composite score
    const composite = calculateCompositeScore(review, dimensions, null, movie);

    // Update review with enriched data
    const { data: enriched, error } = await supabase
      .from('movie_reviews')
      .update({
        dimensions_json: dimensions,
        performance_scores,
        technical_scores,
        audience_signals,
        confidence_score: confidence.overall_confidence,
        composite_score: composite.composite_score,
        enriched_at: new Date().toISOString(),
        enrichment_version: 'v1.0',
      })
      .eq('id', review.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      return null;
    }

    return enriched as EnrichedReview;
  } catch (error) {
    console.error('Error enriching review:', error);
    return null;
  }
}

/**
 * Batch enrich multiple reviews
 */
export async function batchEnrichReviews(
  movieIds: string[],
  batchSize: number = 10
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(id => enrichReview(id))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        success++;
      } else {
        failed++;
      }
    });

    console.log(`Enriched ${i + batch.length}/${movieIds.length} reviews`);
  }

  return { success, failed };
}

/**
 * Get dimension score for section filtering
 */
export function getDimensionScore(dimensions: ReviewDimensions | null, dimension: string): number {
  if (!dimensions) return 0;

  switch (dimension) {
    case 'story':
      return dimensions.story_screenplay.score;
    case 'direction':
      return dimensions.direction.score;
    case 'acting':
      return (dimensions.acting_lead.hero?.score || 0 + dimensions.acting_lead.heroine?.score || 0) / 2;
    case 'music':
      return (dimensions.music_bgm.songs + dimensions.music_bgm.bgm) / 2;
    case 'technical':
      return (dimensions.cinematography.score + dimensions.editing_pacing.score) / 2;
    case 'rewatch':
      return dimensions.rewatch_value;
    case 'mass_appeal':
      return dimensions.mass_vs_class.mass;
    case 'class_appeal':
      return dimensions.mass_vs_class.class;
    default:
      return 0;
  }
}

