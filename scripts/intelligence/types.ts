/**
 * INTELLIGENCE SYNC TYPES
 *
 * Shared type definitions for the ingestion pipeline.
 */

// ============================================================
// CLI OPTIONS
// ============================================================

export type UpdateMode = 'append' | 'update' | 'smart';
export type DataSource = 'tmdb' | 'wikidata' | 'youtube' | 'news';
export type TargetType = 'celebrities' | 'movies' | 'reviews';
export type EntityType = 'celebrity' | 'movie' | 'review' | 'interview';

export interface CLIOptions {
  sources: DataSource[];
  targets: TargetType[];
  mode: UpdateMode;
  dryRun: boolean;
  limit: number;
  forceAI: boolean;
  verbose: boolean;
}

// ============================================================
// RAW ENTITIES (FROM SOURCES)
// ============================================================

export interface RawEntity {
  // Identification
  entity_type: EntityType;
  source: DataSource;
  source_id: string; // ID from source (tmdb_id, wikidata_id, etc.)

  // Basic info
  name_en: string;
  name_te?: string;

  // Type-specific data
  data: RawCelebrityData | RawMovieData | RawReviewData | RawInterviewData;

  // Metadata
  fetched_at: string;
  raw_response?: any; // Original API response for debugging
}

export interface RawCelebrityData {
  type: 'celebrity';
  tmdb_id?: number;
  wikidata_id?: string;
  gender?: string;
  birth_date?: string;
  death_date?: string;
  occupation?: string[];
  biography?: string;
  image_url?: string;
  popularity?: number;
  known_for?: string[];
  filmography?: { title: string; year: number; role?: string }[];
}

export interface RawMovieData {
  type: 'movie';
  tmdb_id?: number;
  wikidata_id?: string;
  title_en: string;
  title_te?: string;
  release_date?: string;
  runtime?: number;
  genres?: string[];
  overview?: string;
  poster_url?: string;
  backdrop_url?: string;
  budget?: number;
  revenue?: number;
  popularity?: number;
  vote_average?: number;
  vote_count?: number;
  cast?: { name: string; character: string; order: number }[];
  crew?: { name: string; job: string; department: string }[];
}

export interface RawReviewData {
  type: 'review';
  movie_id: string;
  movie_title: string;
  source_url?: string;
  author?: string;
  content?: string;
  rating?: number;
  published_at?: string;
}

export interface RawInterviewData {
  type: 'interview';
  celebrity_name: string;
  source_url: string;
  source_type: 'youtube' | 'news' | 'podcast';
  title: string;
  transcript?: string;
  captions?: string;
  published_at?: string;
}

// ============================================================
// ENRICHED ENTITIES (AFTER AI PROCESSING)
// ============================================================

export interface EnrichedEntity {
  // Original identification
  entity_type: EntityType;
  source: DataSource;
  source_id: string;

  // Normalized names
  name_en: string;
  name_te: string;
  name_aliases?: string[];

  // AI-enriched fields
  enriched: EnrichedCelebrityData | EnrichedMovieData | EnrichedReviewData;

  // AI metadata
  ai_confidence: number; // 0-100
  ai_reasoning: string;
  ai_timestamp: string;

  // Matching IDs (from deduplication)
  existing_id?: string; // If matched to existing record
  tmdb_id?: number;
  wikidata_id?: string;
}

export interface EnrichedCelebrityData {
  type: 'celebrity';

  // Core fields
  biography_te: string;
  biography_en: string;
  occupation: string[];
  gender: string;

  // Dates
  birth_date?: string;
  death_date?: string;
  debut_year?: number;
  active_years?: string; // e.g., "1980-present"

  // AI classifications
  era: 'classic' | 'golden' | 'silver' | '90s' | 'modern' | 'current';
  popularity_tier: 'legendary' | 'star' | 'popular' | 'known' | 'emerging';
  primary_role: 'actor' | 'actress' | 'director' | 'producer' | 'singer' | 'composer' | 'other';

  // Career highlights
  career_highlights: string[];
  notable_movies: string[];
  awards?: string[];

  // Interview insights (if available)
  notable_quotes?: { quote: string; context: string }[];

  // Images
  image_url?: string;

  // Scores
  popularity_score: number; // 0-100
  data_completeness: number; // 0-100
}

export interface EnrichedMovieData {
  type: 'movie';

  // Titles
  title_en: string;
  title_te: string;

  // Basic info
  release_date: string;
  release_year: number;
  runtime?: number;
  genres: string[];

  // AI-generated summary
  synopsis_te: string;
  synopsis_en: string;

  // Classification
  era: 'classic' | 'golden' | 'silver' | '90s' | 'modern' | 'current';
  movie_type: 'commercial' | 'arthouse' | 'experimental' | 'devotional' | 'mythological';

  // Box office
  budget?: number;
  revenue?: number;
  verdict?: 'blockbuster' | 'superhit' | 'hit' | 'average' | 'flop' | 'disaster';

  // Cast/Crew
  director?: string;
  hero?: string;
  heroine?: string;
  music_director?: string;

  // Images
  poster_url?: string;
  backdrop_url?: string;

  // Scores
  popularity_score: number;
  rating?: number;
  data_completeness: number;
}

export interface EnrichedReviewData {
  type: 'review';

  movie_id: string;
  movie_title: string;

  // AI-generated structured review
  review_te: string;
  review_en: string;

  // Section scores (0-10)
  direction_score: number;
  screenplay_score: number;
  acting_score: number;
  music_score: number;
  visuals_score: number;
  overall_score: number;

  // Analysis
  strengths: string[];
  weaknesses: string[];
  verdict_te: string;

  // Metadata
  is_ai_generated: boolean;
  confidence: number;
}

// ============================================================
// UPDATE ENGINE TYPES
// ============================================================

export interface UpdateDecision {
  action: 'insert' | 'update' | 'skip';
  reason: string;
  fieldsToUpdate: string[];
  fieldsToKeep: string[];
  existingRecord?: any;
}

export interface FieldComparison {
  field: string;
  existing: any;
  new: any;
  decision: 'keep' | 'update' | 'ignore';
  reason: string;
}

// ============================================================
// DATABASE WRITER TYPES
// ============================================================

export interface WriteResult {
  success: boolean;
  action: 'inserted' | 'updated' | 'skipped';
  id?: string;
  error?: string;
}

// ============================================================
// SYNC RESULT
// ============================================================

export interface SyncResult {
  fetched: number;
  enriched: number;
  updated: number;
  skipped: number;
  errors: number;
  details: {
    name: string;
    type: EntityType;
    action: string;
    fields?: string[];
  }[];
}








