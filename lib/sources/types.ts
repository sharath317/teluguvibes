/**
 * UNIVERSAL SOURCE TYPES
 *
 * Standardized types for all data fetchers.
 * Every fetcher must conform to these interfaces.
 */

// ============================================================
// FETCHER OUTPUT (MANDATORY)
// ============================================================

export interface FetcherResult<T = any> {
  raw_data: T;
  source_name: string;
  confidence_score: number; // 0-1
  fetched_at: string;       // ISO timestamp
  is_telugu_verified: boolean;
  metadata?: {
    query_used?: string;
    total_results?: number;
    page?: number;
    rate_limit_remaining?: number;
  };
}

export interface FetcherConfig {
  limit?: number;
  include_historic?: boolean;
  min_confidence?: number;
  language?: 'te' | 'en' | 'both';
}

// ============================================================
// ENTITY TYPES
// ============================================================

export type EntityCategory =
  | 'movie'
  | 'person'
  | 'studio'
  | 'award'
  | 'interview'
  | 'box_office'
  | 'image';

export type PersonRole =
  | 'actor'
  | 'actress'
  | 'director'
  | 'producer'
  | 'music_director'
  | 'singer'
  | 'lyricist'
  | 'cinematographer'
  | 'editor'
  | 'writer'
  | 'technician';

export type CatalogueStatus = 'verified' | 'partial' | 'historic-estimated';

export type Era =
  | 'golden_age'     // 1930s-1970s
  | 'silver_age'     // 1970s-1990s
  | '90s_era'        // 1990s-2005
  | 'modern'         // 2005-2018
  | 'current';       // 2018+

// ============================================================
// MOVIE DATA
// ============================================================

export interface MovieData {
  // Identity
  tmdb_id?: number;
  wikidata_id?: string;
  imdb_id?: string;

  // Titles
  title_en: string;
  title_te?: string;
  title_original?: string;

  // Release info
  release_date?: string;
  release_year?: number;
  runtime_minutes?: number;

  // Classification
  genres: string[];
  era?: Era;
  movie_type?: 'commercial' | 'art' | 'experimental' | 'devotional' | 'mythological';

  // Credits
  director?: string;
  directors?: string[];
  hero?: string;
  heroine?: string;
  cast?: CastMember[];
  crew?: CrewMember[];

  // Technical
  music_director?: string;
  cinematographer?: string;
  producer?: string;
  production_company?: string;

  // Box office
  budget?: number;
  budget_currency?: string;
  revenue?: number;
  verdict?: 'blockbuster' | 'superhit' | 'hit' | 'average' | 'flop' | 'disaster';

  // Media
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;

  // Ratings
  tmdb_rating?: number;
  imdb_rating?: number;
  vote_count?: number;

  // Descriptions
  overview_en?: string;
  overview_te?: string;
  tagline?: string;

  // Metadata
  catalogue_status?: CatalogueStatus;
  data_sources: string[];
  confidence_score?: number;
}

export interface CastMember {
  name: string;
  character?: string;
  order?: number;
  tmdb_id?: number;
  image_url?: string;
}

export interface CrewMember {
  name: string;
  job: string;
  department?: string;
  tmdb_id?: number;
}

// ============================================================
// PERSON DATA
// ============================================================

export interface PersonData {
  // Identity
  tmdb_id?: number;
  wikidata_id?: string;
  imdb_id?: string;

  // Names
  name_en: string;
  name_te?: string;
  aliases?: string[];

  // Personal
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;

  // Career
  roles: PersonRole[];
  primary_role?: PersonRole;
  debut_year?: number;
  active_years?: string;
  era?: Era;

  // Classification
  popularity_tier?: 'legendary' | 'star' | 'popular' | 'known' | 'emerging';

  // Biography
  biography_en?: string;
  biography_te?: string;

  // Media
  image_url?: string;

  // Filmography
  filmography?: FilmographyEntry[];
  notable_movies?: string[];

  // Awards
  awards?: AwardEntry[];

  // Metadata
  catalogue_status?: CatalogueStatus;
  data_sources: string[];
  confidence_score?: number;
}

export interface FilmographyEntry {
  movie_title: string;
  year?: number;
  role?: string;
  character?: string;
  tmdb_id?: number;
}

export interface AwardEntry {
  award_name: string;
  year: number;
  category?: string;
  movie?: string;
  result: 'won' | 'nominated';
}

// ============================================================
// BOX OFFICE DATA
// ============================================================

export interface BoxOfficeData {
  movie_id?: string;
  movie_title: string;
  release_year: number;

  budget?: number;
  budget_currency?: string;

  // Collections
  domestic_gross?: number;
  overseas_gross?: number;
  worldwide_gross?: number;

  // Analysis
  recovery_percentage?: number;
  verdict?: string;

  // Source
  data_source: string;
  data_date?: string;
  is_estimated: boolean;
}

// ============================================================
// INTERVIEW DATA
// ============================================================

export interface InterviewData {
  // Source
  source_url: string;
  source_type: 'youtube' | 'news' | 'podcast' | 'print';

  // Content
  title: string;
  description?: string;
  transcript?: string;
  duration_seconds?: number;

  // Participants
  interviewer?: string;
  interviewee: string;
  interviewee_id?: string;

  // Context
  related_movie?: string;
  topics?: string[];

  // Engagement
  view_count?: number;
  like_count?: number;

  // Dates
  published_at?: string;
  fetched_at: string;
}

// ============================================================
// IMAGE DATA
// ============================================================

export interface ImageData {
  url: string;
  source: 'tmdb' | 'wikimedia' | 'unsplash' | 'pexels' | 'official' | 'embed';

  // Licensing
  license?: string;
  license_url?: string;
  author?: string;
  attribution_required: boolean;

  // Properties
  width?: number;
  height?: number;
  aspect_ratio?: number;

  // Classification
  image_type: 'poster' | 'backdrop' | 'profile' | 'still' | 'event';

  // Safety
  is_watermarked: boolean;
  is_ai_generated: boolean;
  is_legal: boolean;

  // Entity reference
  entity_type?: EntityCategory;
  entity_id?: string;
  entity_name?: string;
}

// ============================================================
// SOURCE RELIABILITY
// ============================================================

export const SOURCE_RELIABILITY: Record<string, number> = {
  tmdb: 0.95,
  wikidata: 0.90,
  wikipedia: 0.85,
  imdb_dataset: 0.85,
  internet_archive: 0.80,
  youtube_official: 0.75,
  news_rss: 0.60,
  youtube_unofficial: 0.50,
};

export function getSourceReliability(source: string): number {
  return SOURCE_RELIABILITY[source.toLowerCase()] || 0.5;
}



