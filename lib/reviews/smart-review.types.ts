/**
 * Smart Review Types
 * 
 * Type definitions for AI-assisted review derivation
 */

export interface MovieInput {
  id: string;
  title_en: string;
  title_te?: string;
  release_year?: number;
  genres?: string[];
  runtime?: number;
  hero?: string;
  heroine?: string;
  director?: string;
  music_director?: string;
  certification?: string;
  era?: string | null;
  is_blockbuster?: boolean;
  is_classic?: boolean;
  is_cult?: boolean;
  is_underrated?: boolean;
  our_rating?: number;
  avg_rating?: number;
  tmdb_rating?: number;
  imdb_rating?: number;
  overview?: string;
  tagline?: string;
  cast?: string[];
  directors?: string[];
  verdict?: string;
  tags?: string[];
}

export interface ReviewInput {
  overall_rating?: number;
  strengths?: string[];
  weaknesses?: string[];
  dimensions?: Record<string, number>;
  audience_signals?: Record<string, unknown>;
  summary?: string;
  verdict?: string;
}

export interface SmartReviewDerivationInput {
  movie: MovieInput;
  review?: ReviewInput;
  
  // Legacy flat format (for backward compatibility)
  movie_id?: string;
  title_en?: string;
  title_te?: string;
  release_year?: number;
  genres?: string[];
  runtime?: number;
  our_rating?: number;
  avg_rating?: number;
  tmdb_rating?: number;
  imdb_rating?: number;
  overview?: string;
  tagline?: string;
  cast?: string[];
  directors?: string[];
  existing_verdict_en?: string;
  existing_verdict_te?: string;
  existing_summary_en?: string;
  existing_summary_te?: string;
  awards?: unknown[];
  user_reviews_count?: number;
  user_avg_rating?: number;
  popularity_score?: number;
}

export interface SmartReviewFields {
  // Verdicts
  verdict_en?: string;
  verdict_te?: string;
  verdict_emoji?: string;
  
  // One-liner summaries
  one_liner_en?: string;
  one_liner_te?: string;
  
  // Detailed summaries
  summary_en?: string;
  summary_te?: string;
  
  // Performance highlights
  performance_highlights?: {
    actor: string;
    note_en: string;
    note_te?: string;
    rating?: number;
  }[];
  
  // Technical aspects
  technical_notes?: {
    aspect: string;
    note_en: string;
    note_te?: string;
    rating?: number;
  }[];
  
  // Theme analysis
  themes?: string[];
  
  // Audience recommendations
  watch_recommendation?: 'must-watch' | 'highly-recommended' | 'good-watch' | 'one-time-watch' | 'skip';
  best_for?: string[];
  
  // Confidence scores
  confidence: {
    overall: number;
    verdict: number;
    summary: number;
    performances: number;
  };
  
  // Flags for human review
  needs_review: boolean;
  review_flags?: string[];
}

export interface SmartReviewDerived extends SmartReviewFields {
  derived_at: string;
  derived_version: string;
  source: 'ai' | 'human' | 'hybrid';
  
  // Legacy status field
  legacy_status?: 'blockbuster' | 'hit' | 'average' | 'flop' | 'classic' | 'cult' | 'underrated';
  
  // Derivation confidence (alias for confidence.overall)
  derivation_confidence?: number;
}

