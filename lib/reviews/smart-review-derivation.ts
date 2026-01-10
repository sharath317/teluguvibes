/**
 * Smart Review Derivation
 * 
 * Automatically derives review fields from movie metadata
 */

import type { SmartReviewDerivationInput, SmartReviewFields, SmartReviewDerived } from './smart-review.types';

const DERIVATION_VERSION = '1.0.0';

/**
 * Derive smart review fields from movie input
 */
export function deriveSmartReviewFields(input: SmartReviewDerivationInput): SmartReviewDerived {
  // Handle both nested and flat input formats
  const movie = input.movie || {
    id: input.movie_id || '',
    title_en: input.title_en || '',
  };
  const review = input.review;
  
  const rating = review?.overall_rating || movie.our_rating || movie.avg_rating || input.our_rating || input.avg_rating || input.tmdb_rating || input.imdb_rating || 0;
  const genres = movie.genres || input.genres || [];
  
  // Derive verdict based on rating
  let verdictEn = '';
  let verdictEmoji = '';
  if (rating >= 4.5) {
    verdictEn = 'Masterpiece';
    verdictEmoji = '🏆';
  } else if (rating >= 4.0) {
    verdictEn = 'Excellent';
    verdictEmoji = '⭐';
  } else if (rating >= 3.5) {
    verdictEn = 'Very Good';
    verdictEmoji = '👍';
  } else if (rating >= 3.0) {
    verdictEn = 'Good';
    verdictEmoji = '👌';
  } else if (rating >= 2.5) {
    verdictEn = 'Average';
    verdictEmoji = '😐';
  } else if (rating >= 2.0) {
    verdictEn = 'Below Average';
    verdictEmoji = '👎';
  } else {
    verdictEn = 'Poor';
    verdictEmoji = '❌';
  }
  
  // Derive watch recommendation
  let watchRecommendation: SmartReviewFields['watch_recommendation'] = 'one-time-watch';
  if (rating >= 4.5) {
    watchRecommendation = 'must-watch';
  } else if (rating >= 4.0) {
    watchRecommendation = 'highly-recommended';
  } else if (rating >= 3.5) {
    watchRecommendation = 'good-watch';
  } else if (rating >= 2.5) {
    watchRecommendation = 'one-time-watch';
  } else {
    watchRecommendation = 'skip';
  }
  
  // Derive best for audience
  const bestFor: string[] = [];
  if (genres.includes('family') || genres.includes('animation')) {
    bestFor.push('Family audiences');
  }
  if (genres.includes('action') || genres.includes('thriller')) {
    bestFor.push('Action fans');
  }
  if (genres.includes('romance')) {
    bestFor.push('Romance lovers');
  }
  if (genres.includes('drama')) {
    bestFor.push('Drama enthusiasts');
  }
  if (genres.includes('comedy')) {
    bestFor.push('Comedy fans');
  }
  
  // Get overview from various sources
  const overview = movie.overview || input.overview;
  const cast = movie.cast || input.cast || [];
  const tagline = movie.tagline || input.tagline;
  
  // Calculate confidence
  const hasRating = rating > 0;
  const hasOverview = !!overview;
  const hasGenres = genres.length > 0;
  const hasCast = cast.length > 0;
  
  const confidenceFactors = [hasRating, hasOverview, hasGenres, hasCast];
  const overallConfidence = Math.round((confidenceFactors.filter(Boolean).length / confidenceFactors.length) * 100);
  
  // Determine if human review is needed
  const needsReview = overallConfidence < 60 || !hasRating;
  const reviewFlags: string[] = [];
  if (!hasRating) reviewFlags.push('missing_rating');
  if (!hasOverview) reviewFlags.push('missing_overview');
  if (!hasGenres) reviewFlags.push('missing_genres');
  if (!hasCast) reviewFlags.push('missing_cast');
  
  // Derive legacy status
  let legacyStatus: SmartReviewDerived['legacy_status'];
  if (movie.is_blockbuster) legacyStatus = 'blockbuster';
  else if (movie.is_classic) legacyStatus = 'classic';
  else if (movie.is_cult) legacyStatus = 'cult';
  else if (movie.is_underrated) legacyStatus = 'underrated';
  else if (rating >= 3.5) legacyStatus = 'hit';
  else if (rating >= 2.5) legacyStatus = 'average';
  else if (rating > 0) legacyStatus = 'flop';

  return {
    verdict_en: movie.verdict || review?.verdict || input.existing_verdict_en || verdictEn,
    verdict_te: input.existing_verdict_te,
    verdict_emoji: verdictEmoji,
    one_liner_en: tagline || undefined,
    summary_en: review?.summary || input.existing_summary_en || overview,
    summary_te: input.existing_summary_te,
    watch_recommendation: watchRecommendation,
    best_for: bestFor,
    themes: genres.slice(0, 5),
    confidence: {
      overall: overallConfidence,
      verdict: hasRating ? 90 : 30,
      summary: hasOverview ? 80 : 20,
      performances: hasCast ? 70 : 10,
    },
    needs_review: needsReview,
    review_flags: reviewFlags.length > 0 ? reviewFlags : undefined,
    derived_at: new Date().toISOString(),
    derived_version: DERIVATION_VERSION,
    source: 'ai',
    legacy_status: legacyStatus,
    derivation_confidence: overallConfidence,
  };
}

/**
 * Get list of fields that need human review
 */
export function getFieldsNeedingReview(derived: SmartReviewDerived): string[] {
  const fields: string[] = [];
  
  if (derived.confidence.verdict < 50) fields.push('verdict');
  if (derived.confidence.summary < 50) fields.push('summary');
  if (derived.confidence.performances < 50) fields.push('performances');
  if (derived.review_flags?.includes('missing_rating')) fields.push('rating');
  
  return fields;
}

/**
 * Merge AI-derived fields with human-reviewed fields
 */
export function mergeWithHumanReview(
  derived: SmartReviewDerived,
  humanFields: Partial<SmartReviewFields>
): SmartReviewDerived {
  return {
    ...derived,
    ...humanFields,
    source: 'hybrid',
    needs_review: false,
    review_flags: undefined,
  };
}

