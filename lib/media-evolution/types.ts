/**
 * Media-Aware Data Evolution System - Type Definitions
 * 
 * Defines trust tiers, gap classifications, and structured data types
 */

// ============================================================
// MEDIA SOURCE TIERS
// ============================================================

export enum MediaTrustTier {
  TIER_1_AUTHORITATIVE = 1,  // TMDB, Official
  TIER_2_CURATED = 2,        // Wikimedia, Wikipedia CC
  TIER_3_FALLBACK = 3,       // Festival stills, Studio promos
  TIER_DISALLOWED = 99       // Instagram, Pinterest, Google
}

export interface MediaSource {
  url: string;
  source: string;
  trust_tier: MediaTrustTier;
  license: string;
  resolution_score: number;  // 0-100 based on dimensions
  aspect_ratio: string;      // "16:9", "2:3", etc.
  verified: boolean;
  fetched_at: string;
  original_filename?: string;
}

export const TIER_1_SOURCES = [
  'tmdb_poster',
  'tmdb_backdrop',
  'tmdb_still',
  'tmdb_profile',
  'tmdb_video_thumbnail'
] as const;

export const TIER_2_SOURCES = [
  'wikimedia_commons',
  'wikipedia_infobox',
  'official_website',
  'youtube_thumbnail'  // Metadata only, no download
] as const;

export const TIER_3_SOURCES = [
  'iffi_press_kit',
  'siima_press_kit',
  'studio_promo',
  'festival_still'
] as const;

export const DISALLOWED_SOURCES = [
  'instagram',
  'pinterest',
  'google_images',
  'fan_upload',
  'twitter',
  'facebook'
] as const;

// ============================================================
// COVERAGE GAP TYPES
// ============================================================

export type GapReasonCode = 
  | 'MISSING_FROM_INDEX'
  | 'OLDER_DECADE_PRE_1990'
  | 'INDIE_LOW_BUDGET'
  | 'MISCLASSIFIED_LANGUAGE'
  | 'DUBBED_MISSING_ORIGINAL'
  | 'MISSING_BACKDROP'
  | 'LOW_QUALITY_POSTER'
  | 'NO_STILLS'
  | 'CAST_UNDER_5'
  | 'NO_DIRECTOR'
  | 'NO_GENRES'
  | 'INCOMPLETE_METADATA';

export interface CoverageGap {
  movie_id: string;
  tmdb_id: number;
  title: string;
  release_year: number | null;
  reason_code: GapReasonCode;
  missing_fields: string[];
  current_completeness: number;  // 0-100
  suggested_source_tier: MediaTrustTier;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggested_action: string;
}

export interface CoverageGapReport {
  generated_at: string;
  total_movies: number;
  analyzed_movies: number;
  gap_summary: {
    missing_backdrop: number;
    missing_poster: number;
    low_cast: number;
    no_director: number;
    no_genres: number;
    pre_1990: number;
  };
  by_decade: Record<string, {
    total: number;
    complete: number;
    incomplete: number;
    poster_coverage: number;
    backdrop_coverage: number;
  }>;
  gaps: CoverageGap[];
  recommendations: string[];
}

// ============================================================
// ENTITY TYPES
// ============================================================

export interface NormalizedEntity {
  id: string;
  canonical_name: string;
  canonical_name_te?: string;
  aliases: string[];
  entity_type: 'actor' | 'director' | 'music_director' | 'producer';
  tmdb_id?: number;
  wikidata_id?: string;
  confidence_score: number;  // 0-1
  career_phase?: 'debut' | 'rising' | 'peak' | 'established' | 'veteran' | 'legend';
  collaborations?: Array<{
    entity_id: string;
    entity_name: string;
    collaboration_count: number;
    relationship_type: 'frequent_director' | 'frequent_actor' | 'frequent_music';
  }>;
}

// ============================================================
// SMART TAG TYPES
// ============================================================

export type TagCategory = 'narrative' | 'tone' | 'cultural' | 'career' | 'technical';

export interface StructuredTag {
  id: string;
  category: TagCategory;
  value: string;
  value_te?: string;
  derived_from: string[];  // Source signals
  confidence: number;
  deterministic: boolean;
}

export const NARRATIVE_TAGS = [
  'revenge', 'family', 'political', 'romance', 'action', 
  'comedy', 'thriller', 'social_message', 'biographical', 
  'mythology', 'rural', 'urban', 'patriotic'
] as const;

export const TONE_TAGS = [
  'mass', 'experimental', 'emotional', 'commercial',
  'artistic', 'light_hearted', 'intense', 'realistic',
  'fantasy', 'satirical'
] as const;

export const CULTURAL_TAGS = [
  'village', 'festival', 'mythology', 'historical',
  'telangana', 'coastal_andhra', 'rayalaseema',
  'nri', 'urban_hyderabad', 'traditional'
] as const;

export const CAREER_TAGS = [
  'debut', 'comeback', 'peak', 'career_best',
  'experimental_phase', 'mass_phase', 'different_role'
] as const;

// ============================================================
// STORY GRAPH TYPES
// ============================================================

export interface StoryArc {
  id: string;
  title: string;
  title_te?: string;
  arc_type: 'incident' | 'movie_journey' | 'controversy' | 'achievement' | 'event';
  status: 'developing' | 'resolved' | 'ongoing';
  created_at: string;
  updated_at: string;
  linked_entities: Array<{
    entity_type: 'movie' | 'celebrity' | 'production_house';
    entity_id: string;
    entity_name: string;
  }>;
  timeline: StoryEvent[];
  summary?: string;
}

export interface StoryEvent {
  id: string;
  arc_id: string;
  event_type: 'initial_report' | 'update' | 'resolution' | 'reaction';
  day_number: number;  // Day 1, Day 3, etc.
  post_id?: string;
  title: string;
  summary: string;
  occurred_at: string;
}

// ============================================================
// DISCOVERY TYPES
// ============================================================

export interface DiscoveryDelta {
  source: 'tmdb_weekly' | 'wikipedia_diff' | 'wikidata_reconciliation';
  fetched_at: string;
  new_entries: number;
  updated_entries: number;
  entries: Array<{
    tmdb_id: number;
    title: string;
    action: 'new' | 'update' | 'enrich_only';
    reason: string;
  }>;
}

// ============================================================
// METRICS TYPES
// ============================================================

export interface DataEvolutionMetrics {
  timestamp: string;
  visual_completeness: number;  // % with poster + backdrop
  media_tier_distribution: {
    tier_1: number;
    tier_2: number;
    tier_3: number;
  };
  structured_depth_score: number;  // 0-100
  entity_confidence_avg: number;   // 0-1
  story_graph_density: number;     // Connections per entity
  coverage_by_decade: Record<string, number>;
  tag_coverage: number;            // % with structured tags
  goals: {
    backdrop_coverage: { current: number; target: number };
    visual_completeness: { current: number; target: number };
    index_coverage: { current: number; target: number };
  };
}

