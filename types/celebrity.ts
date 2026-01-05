// Celebrity System Types

export interface Celebrity {
  id: string;
  name_en: string;
  name_te?: string;
  gender: 'male' | 'female' | 'other';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  occupation: string[];
  active_years_start?: number;
  active_years_end?: number;
  short_bio?: string;
  short_bio_te?: string;
  wikidata_id?: string;
  wikipedia_url?: string;
  tmdb_id?: number;
  imdb_id?: string;
  profile_image?: string;
  profile_image_source?: string;
  gallery_images: string[];
  popularity_score: number;
  site_performance_score: number;
  is_verified: boolean;
  is_active: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CelebrityWork {
  id: string;
  celebrity_id: string;
  title_en: string;
  title_te?: string;
  work_type: 'movie' | 'tv_show' | 'web_series' | 'short_film';
  release_date?: string;
  release_year?: number;
  role_name?: string;
  role_type?: 'lead' | 'supporting' | 'cameo' | 'voice' | 'special_appearance';
  is_debut: boolean;
  is_iconic: boolean;
  is_blockbuster: boolean;
  box_office_rank?: number;
  tmdb_movie_id?: number;
  imdb_movie_id?: string;
  poster_url?: string;
  created_at: string;
}

export type EventType =
  | 'birthday'
  | 'death_anniversary'
  | 'debut_anniversary'
  | 'movie_anniversary'
  | 'award_anniversary'
  | 'career_milestone';

export interface CelebrityEvent {
  id: string;
  celebrity_id: string;
  event_type: EventType;
  event_month: number;
  event_day: number;
  event_year?: number;
  title_template?: string;
  description?: string;
  description_te?: string;
  related_work_id?: string;
  priority_score: number;
  is_active: boolean;
  created_at: string;
}

export interface HistoricPost {
  id: string;
  celebrity_id: string;
  event_id?: string;
  post_id?: string;
  event_type: EventType;
  event_year: number;
  slug_pattern: string;
  views_count: number;
  engagement_score: number;
  status: 'draft' | 'published' | 'archived';
  generated_at: string;
  published_at?: string;
  updated_at: string;
}

// API Response Types
export interface TodaysEvent {
  event_id: string;
  celebrity_id: string;
  celebrity_name: string;
  celebrity_name_te?: string;
  event_type: EventType;
  event_year: number;
  years_ago: number;
  priority_score: number;
  popularity_score: number;
  profile_image?: string;
}

export interface WikidataPerson {
  id: string;
  name: string;
  name_te?: string;
  description?: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  occupation?: string[];
  image?: string;
}

export interface TMDBPerson {
  id: number;
  name: string;
  known_for_department: string;
  popularity: number;
  profile_path?: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  imdb_id?: string;
}

export interface TMDBMovieCredit {
  id: number;
  title: string;
  release_date?: string;
  character?: string;
  poster_path?: string;
}

// Content Generation Types
export interface HistoricPostContent {
  title: string;
  title_te: string;
  body: string;
  summary: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
}

export interface PostGenerationContext {
  celebrity: Celebrity;
  event: CelebrityEvent;
  works: CelebrityWork[];
  yearsAgo: number;
  currentYear: number;
}








