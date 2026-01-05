/**
 * CONFIDENCE & RECOMMENDATION SYSTEM
 * 
 * Implements multi-dimensional confidence scoring and mood-based recommendations.
 * Browser-only personalization with no backend tracking.
 */

import type {
  ReviewDimensions,
  AudienceSignals,
  ConfidenceDimensions,
  CompositeScoreBreakdown,
  MoodTag,
} from './review-dimensions.types';

// ============================================================
// CONFIDENCE DIMENSIONS
// ============================================================

export interface MovieConfidence {
  mass_appeal: number;              // 0-10
  critic_confidence: number;        // 0-10
  rewatch_value: number;            // 0-10
  family_friendliness: number;      // 0-10
  mood_fit: {
    action: number;                 // 0-10
    emotional: number;              // 0-10
    comedy: number;                 // 0-10
    thriller: number;               // 0-10
    romance: number;                // 0-10
  };
  overall_confidence: number;       // 0-10
}

/**
 * Calculate comprehensive confidence dimensions for a movie
 */
export function calculateMovieConfidence(
  dimensions: ReviewDimensions,
  signals: AudienceSignals,
  movie: any,
  review: any
): MovieConfidence {
  // Mass appeal (based on box office + mass dimension)
  const boxOfficeScore = movie.worldwide_gross_inr
    ? Math.min((movie.worldwide_gross_inr / 5000000000) * 10, 10)
    : 0;
  const mass_appeal = (dimensions.mass_vs_class.mass * 0.6 + boxOfficeScore * 0.4);

  // Critic confidence (based on rating + review count + class dimension)
  const ratingScore = movie.avg_rating || 0;
  const reviewCountScore = Math.min((review.total_reviews || 0) / 100, 1) * 10;
  const critic_confidence = (
    ratingScore * 0.5 +
    reviewCountScore * 0.2 +
    dimensions.mass_vs_class.class * 0.3
  );

  // Rewatch value (direct from dimensions)
  const rewatch_value = dimensions.rewatch_value;

  // Family friendliness
  const family_friendliness = dimensions.mass_vs_class.family_friendly;

  // Mood fit scores
  const mood_fit = {
    action: dimensions.emotional_impact.thrill,
    emotional: dimensions.emotional_impact.tears,
    comedy: dimensions.emotional_impact.laughter,
    thriller: dimensions.emotional_impact.thrill,
    romance: signals.mood.includes('romantic') ? 8 : 4,
  };

  // Overall confidence (weighted average)
  const overall_confidence = (
    mass_appeal * 0.25 +
    critic_confidence * 0.35 +
    rewatch_value * 0.25 +
    family_friendliness * 0.15
  );

  return {
    mass_appeal,
    critic_confidence,
    rewatch_value,
    family_friendliness,
    mood_fit,
    overall_confidence,
  };
}

// ============================================================
// COMPOSITE SCORING
// ============================================================

export interface ScoringWeights {
  avg_rating: number;
  dimension_score: number;
  engagement_score: number;
  box_office_score: number;
  recency_score: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  avg_rating: 0.35,
  dimension_score: 0.25,
  engagement_score: 0.20,
  box_office_score: 0.10,
  recency_score: 0.10,
};

/**
 * Calculate dimension score from review dimensions
 */
export function calculateDimensionScore(dimensions: ReviewDimensions): number {
  const scores = [
    dimensions.story_screenplay.score,
    dimensions.direction.score,
    dimensions.acting_lead.hero?.score || 0,
    dimensions.acting_lead.heroine?.score || 0,
    dimensions.music_bgm.songs,
    dimensions.music_bgm.bgm,
    dimensions.cinematography.score,
    dimensions.editing_pacing.score,
    dimensions.rewatch_value,
  ];

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Calculate composite score with custom weights
 */
export function calculateCompositeScoreWithWeights(
  avgRating: number,
  dimensions: ReviewDimensions | null,
  performance: any,
  movie: any,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): CompositeScoreBreakdown {
  // Base rating (0-10)
  const avg_rating = avgRating;

  // Dimension score (0-10)
  const dimension_score = dimensions ? calculateDimensionScore(dimensions) : 0;

  // Engagement score (0-10) - from content_performance
  const engagement_score = performance?.views
    ? Math.min((performance.views / 10000) * 10, 10)
    : 0;

  // Box office score (0-10)
  const box_office_score = movie?.worldwide_gross_inr
    ? Math.min((movie.worldwide_gross_inr / 5000000000) * 10, 10)
    : 0;

  // Recency score (0-10) - boost for recent releases
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
// MOOD-BASED RECOMMENDATIONS
// ============================================================

export interface MoodPreference {
  mood: MoodTag;
  weight: number;                   // 0-1
}

export interface RecommendationCriteria {
  moods: MoodPreference[];
  minRating: number;
  minConfidence: number;
  preferMassAppeal?: boolean;
  preferCriticAppeal?: boolean;
  familyFriendly?: boolean;
}

/**
 * Calculate mood match score between movie and user preferences
 */
export function calculateMoodMatchScore(
  movieSignals: AudienceSignals,
  userMoods: MoodPreference[]
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const pref of userMoods) {
    if (movieSignals.mood.includes(pref.mood)) {
      totalScore += pref.weight;
    }
    totalWeight += pref.weight;
  }

  return totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
}

/**
 * Get mood-based recommendations
 */
export function getMoodBasedRecommendations(
  movies: any[],
  criteria: RecommendationCriteria
): any[] {
  return movies
    .filter(movie => {
      // Filter by rating
      if (movie.avg_rating < criteria.minRating) return false;

      // Filter by confidence
      if (movie.confidence_score && movie.confidence_score < criteria.minConfidence) return false;

      // Filter by family friendliness
      if (criteria.familyFriendly && !movie.audience_signals?.family_friendly) return false;

      return true;
    })
    .map(movie => {
      // Calculate mood match score
      const moodScore = calculateMoodMatchScore(movie.audience_signals, criteria.moods);

      // Calculate appeal score
      let appealScore = 0;
      if (criteria.preferMassAppeal) {
        appealScore = movie.audience_signals?.mass_appeal || 0;
      } else if (criteria.preferCriticAppeal) {
        appealScore = movie.audience_signals?.critic_appeal || 0;
      } else {
        appealScore = (
          (movie.audience_signals?.mass_appeal || 0) +
          (movie.audience_signals?.critic_appeal || 0)
        ) / 2;
      }

      // Final recommendation score
      const recommendationScore = (
        moodScore * 0.4 +
        movie.avg_rating * 0.3 +
        appealScore * 0.2 +
        (movie.composite_score || movie.avg_rating) * 0.1
      );

      return {
        ...movie,
        moodScore,
        appealScore,
        recommendationScore,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
}

// ============================================================
// ACTOR/GENRE/ERA AFFINITY
// ============================================================

export interface AffinitySignals {
  actors: Map<string, number>;      // actor name → affinity score (0-1)
  directors: Map<string, number>;   // director name → affinity score (0-1)
  genres: Map<string, number>;      // genre → affinity score (0-1)
  eras: Map<string, number>;        // decade → affinity score (0-1)
  languages: Map<string, number>;   // language → affinity score (0-1)
}

/**
 * Calculate affinity score for a movie based on user signals
 */
export function calculateAffinityScore(movie: any, signals: AffinitySignals): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Actor affinity
  if (movie.hero && signals.actors.has(movie.hero)) {
    totalScore += signals.actors.get(movie.hero)! * 10;
    totalWeight += 1;
  }
  if (movie.heroine && signals.actors.has(movie.heroine)) {
    totalScore += signals.actors.get(movie.heroine)! * 10;
    totalWeight += 1;
  }

  // Director affinity
  if (movie.director && signals.directors.has(movie.director)) {
    totalScore += signals.directors.get(movie.director)! * 10;
    totalWeight += 1;
  }

  // Genre affinity
  if (movie.genres) {
    for (const genre of movie.genres) {
      if (signals.genres.has(genre)) {
        totalScore += signals.genres.get(genre)! * 10;
        totalWeight += 1;
      }
    }
  }

  // Era affinity
  if (movie.release_year) {
    const decade = `${Math.floor(movie.release_year / 10) * 10}s`;
    if (signals.eras.has(decade)) {
      totalScore += signals.eras.get(decade)! * 10;
      totalWeight += 1;
    }
  }

  // Language affinity
  if (movie.language && signals.languages.has(movie.language)) {
    totalScore += signals.languages.get(movie.language)! * 10;
    totalWeight += 1;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 5; // Default 5 if no signals
}

/**
 * Get personalized recommendations based on affinity
 */
export function getAffinityBasedRecommendations(
  movies: any[],
  signals: AffinitySignals,
  limit: number = 20
): any[] {
  return movies
    .map(movie => ({
      ...movie,
      affinityScore: calculateAffinityScore(movie, signals),
    }))
    .sort((a, b) => b.affinityScore - a.affinityScore)
    .slice(0, limit);
}

// ============================================================
// BROWSER-ONLY PERSONALIZATION
// ============================================================

/**
 * Track user interaction (browser-only, localStorage)
 */
export function trackInteraction(
  type: 'view' | 'like' | 'rate',
  movie: any
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = `telugu-vibes-${type}s`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    
    const interaction = {
      movieId: movie.id,
      title: movie.title_en,
      actor: movie.hero,
      director: movie.director,
      genres: movie.genres,
      language: movie.language,
      releaseYear: movie.release_year,
      timestamp: Date.now(),
    };

    existing.push(interaction);
    
    // Keep only last 100 interactions
    if (existing.length > 100) {
      existing.shift();
    }

    localStorage.setItem(key, JSON.stringify(existing));
  } catch (error) {
    console.error('Error tracking interaction:', error);
  }
}

/**
 * Build affinity signals from user interactions (browser-only)
 */
export function buildAffinitySignals(): AffinitySignals {
  if (typeof window === 'undefined') {
    return {
      actors: new Map(),
      directors: new Map(),
      genres: new Map(),
      eras: new Map(),
      languages: new Map(),
    };
  }

  const signals: AffinitySignals = {
    actors: new Map(),
    directors: new Map(),
    genres: new Map(),
    eras: new Map(),
    languages: new Map(),
  };

  try {
    // Combine all interaction types
    const views = JSON.parse(localStorage.getItem('telugu-vibes-views') || '[]');
    const likes = JSON.parse(localStorage.getItem('telugu-vibes-likes') || '[]');
    const rates = JSON.parse(localStorage.getItem('telugu-vibes-rates') || '[]');

    const allInteractions = [...views, ...likes, ...rates];

    // Calculate frequencies
    const actorCounts = new Map<string, number>();
    const directorCounts = new Map<string, number>();
    const genreCounts = new Map<string, number>();
    const eraCounts = new Map<string, number>();
    const languageCounts = new Map<string, number>();

    for (const interaction of allInteractions) {
      if (interaction.actor) {
        actorCounts.set(interaction.actor, (actorCounts.get(interaction.actor) || 0) + 1);
      }
      if (interaction.director) {
        directorCounts.set(interaction.director, (directorCounts.get(interaction.director) || 0) + 1);
      }
      if (interaction.genres) {
        for (const genre of interaction.genres) {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        }
      }
      if (interaction.releaseYear) {
        const decade = `${Math.floor(interaction.releaseYear / 10) * 10}s`;
        eraCounts.set(decade, (eraCounts.get(decade) || 0) + 1);
      }
      if (interaction.language) {
        languageCounts.set(interaction.language, (languageCounts.get(interaction.language) || 0) + 1);
      }
    }

    // Normalize to 0-1 scale
    const maxCount = Math.max(...Array.from(actorCounts.values()), 1);
    
    actorCounts.forEach((count, actor) => {
      signals.actors.set(actor, count / maxCount);
    });
    directorCounts.forEach((count, director) => {
      signals.directors.set(director, count / maxCount);
    });
    genreCounts.forEach((count, genre) => {
      signals.genres.set(genre, count / maxCount);
    });
    eraCounts.forEach((count, era) => {
      signals.eras.set(era, count / maxCount);
    });
    languageCounts.forEach((count, language) => {
      signals.languages.set(language, count / maxCount);
    });

    return signals;
  } catch (error) {
    console.error('Error building affinity signals:', error);
    return signals;
  }
}


