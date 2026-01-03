/**
 * STRUCTURED REVIEW INTELLIGENCE TYPES
 * 
 * Defines the schema for decomposed review dimensions,
 * performance scores, technical aspects, and audience signals.
 */

// ============================================================
// CORE REVIEW DIMENSIONS
// ============================================================

export interface StoryScreenplayDimension {
  score: number;                    // 0-10
  highlights: string[];             // Key strengths
  weaknesses: string[];             // Areas of improvement
  originality: number;              // 0-10
  emotional_depth: number;          // 0-10
  pacing: number;                   // 0-10
}

export interface DirectionDimension {
  score: number;                    // 0-10
  style: 'mass-commercial' | 'class-artistic' | 'balanced' | 'experimental';
  innovation: number;               // 0-10
  vision_clarity: number;           // 0-10
  execution: number;                // 0-10
}

export interface ActorPerformance {
  name: string;
  score: number;                    // 0-10
  transformation: number;           // Physical/emotional range (0-10)
  career_best: boolean;
  chemistry?: number;               // With co-star (0-10)
}

export interface ActingLeadDimension {
  hero?: ActorPerformance;
  heroine?: ActorPerformance;
  overall_chemistry: number;        // 0-10
}

export interface SupportingActor {
  name: string;
  role: string;                     // 'villain', 'comedian', 'character-actor'
  impact: 'low' | 'medium' | 'high' | 'scene-stealer';
  score: number;                    // 0-10
}

export interface ActingSupportingDimension {
  standouts: SupportingActor[];
  overall_strength: number;         // 0-10
}

export interface MusicBGMDimension {
  songs: number;                    // Song quality (0-10)
  bgm: number;                      // Background score (0-10)
  replay_value: number;             // Chartbuster potential (0-10)
  integration: number;              // How well music fits narrative (0-10)
}

export interface CinematographyDimension {
  score: number;                    // 0-10
  memorable_shots: string[];        // Descriptions of standout visuals
  color_grading: number;            // 0-10
  camera_work: number;              // 0-10
}

export interface EditingPacingDimension {
  score: number;                    // 0-10
  runtime_efficiency: number;       // Percentage (0-100)
  transition_quality: number;       // 0-10
  montage_effectiveness: number;    // 0-10
}

export interface EmotionalImpactDimension {
  tears: number;                    // Emotional intensity (0-10)
  laughter: number;                 // Comedy quotient (0-10)
  thrill: number;                   // Edge-of-seat moments (0-10)
  inspiration: number;              // Motivational impact (0-10)
  nostalgia: number;                // Nostalgic resonance (0-10)
}

export interface MassVsClassDimension {
  mass: number;                     // Mass appeal (0-10)
  class: number;                    // Class/artistic appeal (0-10)
  universal_appeal: number;         // Cross-demographic appeal (0-10)
  family_friendly: number;          // Family audience suitability (0-10)
}

/**
 * Complete Review Dimensions Structure
 */
export interface ReviewDimensions {
  story_screenplay: StoryScreenplayDimension;
  direction: DirectionDimension;
  acting_lead: ActingLeadDimension;
  acting_supporting: ActingSupportingDimension;
  music_bgm: MusicBGMDimension;
  cinematography: CinematographyDimension;
  editing_pacing: EditingPacingDimension;
  emotional_impact: EmotionalImpactDimension;
  rewatch_value: number;            // 0-10
  mass_vs_class: MassVsClassDimension;
}

// ============================================================
// PERFORMANCE SCORES
// ============================================================

export interface LeadActorPerformance {
  name: string;
  role: 'hero' | 'heroine';
  score: number;                    // 0-10
  career_best: boolean;
  transformation: number;           // 0-10
  chemistry: number;                // 0-10 (with co-star)
  screen_presence: number;          // 0-10
}

export interface SupportingActorPerformance {
  name: string;
  role: string;
  score: number;                    // 0-10
  impact: 'low' | 'medium' | 'high' | 'scene-stealer';
  memorable_scenes: string[];
}

export interface PerformanceScores {
  lead_actors: LeadActorPerformance[];
  supporting_cast: SupportingActorPerformance[];
  ensemble_strength: number;        // 0-10
}

// ============================================================
// TECHNICAL SCORES
// ============================================================

export interface TechnicalScores {
  cinematography: number;           // 0-10
  editing: number;                  // 0-10
  sound_design: number;             // 0-10
  vfx: number;                      // 0-10 (if applicable)
  production_design: number;        // 0-10
  costume_design: number;           // 0-10
  makeup: number;                   // 0-10
  overall_technical_excellence: number; // 0-10
}

// ============================================================
// AUDIENCE SIGNALS
// ============================================================

export type MoodTag =
  | 'thrilling'
  | 'emotional'
  | 'uplifting'
  | 'dark'
  | 'nostalgic'
  | 'romantic'
  | 'intense'
  | 'light-hearted'
  | 'thought-provoking'
  | 'action-packed';

export type AgeRating = 'U' | 'U/A' | 'A' | 'S';

export type RewatchPotential = 'low' | 'medium' | 'high' | 'cult-classic';

export interface AudienceSignals {
  mood: MoodTag[];
  family_friendly: boolean;
  age_rating: AgeRating;
  rewatch_potential: RewatchPotential;
  mass_appeal: number;              // 0-10
  critic_appeal: number;            // 0-10
  kids_friendly: boolean;
  date_movie: boolean;
  festival_worthy: boolean;
}

// ============================================================
// CONFIDENCE DIMENSIONS
// ============================================================

export interface ConfidenceDimensions {
  data_completeness: number;        // 0-1 (% of fields populated)
  source_reliability: number;       // 0-1 (trust in data sources)
  review_count: number;             // Number of reviews aggregated
  recency: number;                  // 0-1 (how recent is the data)
  overall_confidence: number;       // 0-1 (composite confidence score)
}

// ============================================================
// COMPOSITE SCORING
// ============================================================

export interface CompositeScoreBreakdown {
  avg_rating: number;               // Base rating (0-10)
  dimension_score: number;          // From review dimensions (0-10)
  engagement_score: number;         // From content performance (0-10)
  box_office_score: number;         // Normalized box office (0-10)
  recency_score: number;            // Recency boost (0-10)
  composite_score: number;          // Final weighted score (0-10)
  weights: {
    avg_rating: number;
    dimension_score: number;
    engagement_score: number;
    box_office_score: number;
    recency_score: number;
  };
}

// ============================================================
// ENRICHED REVIEW STRUCTURE
// ============================================================

export interface EnrichedReview {
  // Existing fields
  id: string;
  movie_id: string;
  review_text: string;
  avg_rating: number;
  total_reviews: number;
  
  // New structured fields
  dimensions_json?: ReviewDimensions;
  performance_scores?: PerformanceScores;
  technical_scores?: TechnicalScores;
  audience_signals?: AudienceSignals;
  confidence_score?: number;
  composite_score?: number;
  
  // Metadata
  enriched_at?: string;
  enrichment_version?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// SECTION SCORING HELPERS
// ============================================================

export interface SectionScoringCriteria {
  min_avg_rating?: number;
  min_dimension_score?: number;
  min_confidence?: number;
  required_tags?: string[];
  required_mood?: MoodTag[];
  min_rewatch_value?: number;
  min_mass_appeal?: number;
  min_critic_appeal?: number;
}

export interface MovieSectionScore {
  movie_id: string;
  section_fit_score: number;        // 0-100 (how well movie fits section)
  criteria_met: string[];           // Which criteria were satisfied
  criteria_failed: string[];        // Which criteria were not met
  rank_score: number;               // Final ranking score for ordering
}

