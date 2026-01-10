/**
 * Review Types
 * Type definitions for movie reviews and related entities
 */

export type Genre =
  | 'Action'
  | 'Comedy'
  | 'Drama'
  | 'Romance'
  | 'Thriller'
  | 'Horror'
  | 'Family'
  | 'Musical'
  | 'Crime'
  | 'Historical'
  | 'Biographical'
  | 'Fantasy'
  | 'Science Fiction'
  | 'Adventure'
  | 'Mystery'
  | 'Sports'
  | 'Documentary'
  | 'Animation'
  | 'Devotional'
  | 'Social'
  | 'Political';

export interface ReviewFilters {
  sortBy: 'rating' | 'release_year' | 'title' | 'popularity' | 'date_added';
  sortOrder: 'asc' | 'desc';
  genre?: Genre | string;
  language?: string;
  era?: string;
  actor?: string;
  director?: string;
  minRating?: number;
  maxRating?: number;
  decade?: string;
  yearRange?: { from: number; to: number };
  isClassic?: boolean;
  isBlockbuster?: boolean;
  isUnderrated?: boolean;
  searchQuery?: string;
}

export interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  backdrop_url?: string;
  release_year?: number;
  release_date?: string;
  genres?: string[];
  runtime?: number;
  language?: string;
  // Crew
  director?: string;
  hero?: string;
  heroine?: string;
  music_director?: string;
  producer?: string;
  cinematographer?: string;
  // Ratings
  avg_rating?: number;
  our_rating?: number;
  editorial_score?: number;
  imdb_rating?: number;
  // Tags
  is_blockbuster?: boolean;
  is_classic?: boolean;
  is_underrated?: boolean;
  is_featured?: boolean;
  // Synopsis
  synopsis?: string;
  synopsis_te?: string;
  tagline?: string;
  // Additional
  budget?: string;
  box_office?: string;
  certification?: string;
  status?: 'released' | 'upcoming' | 'in_production';
  created_at?: string;
  updated_at?: string;
}

export interface MovieReview {
  id: string;
  movie_id: string;
  title: string;
  title_te?: string;
  content: string;
  content_te?: string;
  author_name?: string;
  reviewer_name?: string;
  reviewer_type?: 'critic' | 'audience' | 'editor' | 'expert';
  rating?: number;
  overall_rating?: number;
  is_featured?: boolean;
  is_published?: boolean;
  status: 'draft' | 'published' | 'archived';
  likes?: number;
  views?: number;
  helpful_votes?: number;
  created_at: string;
  updated_at: string;
  // Review text sections
  summary?: string;
  summary_te?: string;
  direction_review?: string;
  screenplay_review?: string;
  acting_review?: string;
  music_review?: string;
  verdict?: string;
  verdict_te?: string;
  // Review verdicts (ratings)
  story_verdict?: string;
  performance_verdict?: string;
  direction_verdict?: string;
  music_verdict?: string;
  technical_verdict?: string;
  final_verdict?: string;
}

export interface ReviewCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface CastMember {
  id: string;
  name: string;
  name_te?: string;
  role: string;
  role_te?: string;
  character_name?: string;
  image_url?: string;
  order: number;
}

export interface CrewMember {
  id: string;
  name: string;
  name_te?: string;
  role: string;
  department: string;
  image_url?: string;
}

export interface MovieImage {
  id: string;
  movie_id: string;
  url: string;
  thumbnail_url?: string;
  type: 'poster' | 'backdrop' | 'still' | 'promotional';
  caption?: string;
  is_primary?: boolean;
}

export interface MovieVideo {
  id: string;
  movie_id: string;
  url: string;
  embed_url?: string;
  type: 'trailer' | 'teaser' | 'song' | 'making' | 'interview';
  title?: string;
  thumbnail_url?: string;
  duration?: string;
}
