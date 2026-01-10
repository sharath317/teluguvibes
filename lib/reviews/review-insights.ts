/**
 * Review Insights Module
 * Types and utilities for movie review insights
 */

export interface ReviewInsight {
  type: 'positive' | 'negative' | 'neutral';
  category: string;
  text: string;
  weight: number;
}

export interface SectionConfidence {
  performances?: number;
  direction?: number;
  technical?: number;
  themes?: number;
}

export interface ReviewInsights {
  summary?: string;
  positives: ReviewInsight[];
  negatives: ReviewInsight[];
  verdict: string;
  watchRecommendation: string;
  targetAudience?: string[];
  moodTags?: string[];
  comparisonMovies?: string[];
  standoutElements?: string[];
  caveats?: string[];
  performances?: PerformanceInsight[];
  direction?: DirectionInsight;
  technical?: TechnicalInsight[];
  themes?: ThemeInsight[];
  section_confidence?: SectionConfidence;
  density_score?: number;
  needs_review?: boolean;
  generated_at?: string;
}

export interface WhyWatchItem {
  title: string;
  description: string;
  icon?: string;
}

export interface PerformanceTone {
  type: 'natural' | 'intense' | 'subtle' | 'over-the-top' | 'nuanced' | 'consistent' | 'varied';
  description?: string;
}

export interface PerformanceInsight {
  actor: string;
  role?: string;
  role_type?: string;
  rating: number;
  highlights: string[];
  tone?: PerformanceTone;
  note_en?: string;
  note_te?: string;
}

export interface DirectionInsight {
  director: string;
  style?: string;
  pacing_control?: 'tight' | 'measured' | 'uneven' | 'rushed';
  emotional_payoff?: 'strong' | 'moderate' | 'weak';
  rating: number;
  highlights: string[];
  note_en?: string;
  note_te?: string;
}

export interface TechnicalInsight {
  aspect: 'cinematography' | 'music' | 'editing' | 'vfx' | 'sound' | 'production';
  rating: number;
  description: string;
  highlights?: string[];
  notable?: boolean;
  mood?: string;
  note_en?: string;
  note_te?: string;
  impact_en?: string;
  impact_te?: string;
}

export interface ThemeInsight {
  theme: string;
  strength: 'strong' | 'moderate' | 'subtle';
  description?: string;
  core_themes?: string[];
  cultural_relevance?: 'high' | 'medium' | 'low';
  emotional_resonance?: 'deep' | 'moderate' | 'surface';
  note_en?: string;
  note_te?: string;
}

/**
 * Generate review insights from movie data
 */
export function generateReviewInsights(movie: {
  our_rating?: number;
  avg_rating?: number;
  genres?: string[];
  director?: string;
  hero?: string;
}): ReviewInsights {
  const rating = movie.our_rating || movie.avg_rating || 0;
  
  let verdict = 'Average';
  let watchRecommendation = 'One-time watch';
  
  if (rating >= 8) {
    verdict = 'Excellent';
    watchRecommendation = 'Must watch';
  } else if (rating >= 7) {
    verdict = 'Good';
    watchRecommendation = 'Worth watching';
  } else if (rating >= 6) {
    verdict = 'Decent';
    watchRecommendation = 'Can watch once';
  } else if (rating < 5) {
    verdict = 'Below Average';
    watchRecommendation = 'Skip it';
  }

  return {
    positives: [],
    negatives: [],
    verdict,
    watchRecommendation,
    targetAudience: movie.genres || [],
    moodTags: [],
    standoutElements: movie.director ? [`${movie.director}'s direction`] : [],
  };
}

/**
 * Get watch recommendation based on rating
 */
export function getWatchRecommendation(rating: number): {
  text: string;
  color: string;
  emoji: string;
} {
  if (rating >= 8.5) {
    return { text: 'Must Watch', color: '#22c55e', emoji: '🔥' };
  }
  if (rating >= 7.5) {
    return { text: 'Highly Recommended', color: '#84cc16', emoji: '👍' };
  }
  if (rating >= 6.5) {
    return { text: 'Worth Watching', color: '#eab308', emoji: '✓' };
  }
  if (rating >= 5) {
    return { text: 'One-time Watch', color: '#f97316', emoji: '🎬' };
  }
  return { text: 'Skip It', color: '#ef4444', emoji: '❌' };
}

