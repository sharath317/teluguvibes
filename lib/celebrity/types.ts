/**
 * Celebrity Types
 * Type definitions for celebrity-related data
 */

export interface Celebrity {
  id: string;
  name: string;
  name_en: string;
  name_te?: string;
  slug: string;
  image_url?: string;
  profile_image?: string;
  cover_image_url?: string;
  profession: CelebrityProfession[];
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  nationality?: string;
  biography?: string;
  biography_te?: string;
  is_featured?: boolean;
  is_verified?: boolean;
  social_links?: SocialLink[];
  created_at?: string;
  updated_at?: string;
}

export type CelebrityProfession = 
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
  | 'choreographer'
  | 'costume_designer'
  | 'art_director'
  | 'stunt_coordinator'
  | 'playback_singer'
  | 'dubbing_artist'
  | 'other';

export interface SocialLink {
  platform: 'instagram' | 'twitter' | 'facebook' | 'youtube' | 'wikipedia' | 'imdb' | 'other';
  url: string;
  handle?: string;
}

export interface CelebrityAward {
  id: string;
  name: string;
  name_te?: string;
  category: string;
  category_te?: string;
  year: number;
  movie_title?: string;
  movie_title_te?: string;
  is_won: boolean;
  is_nomination?: boolean;
  award_type?: 'national' | 'state' | 'filmfare' | 'nandi' | 'zee' | 'cinemaa' | 'siima' | 'other';
  award_body?: string;
  award_body_te?: string;
  image_url?: string;
}

export interface CelebrityFilmography {
  id: string;
  movie_id: string;
  movie_title: string;
  movie_title_te?: string;
  movie_slug: string;
  release_year?: number;
  role: string;
  role_te?: string;
  character_name?: string;
  character_name_te?: string;
  poster_url?: string;
  is_lead?: boolean;
  is_cameo?: boolean;
}

// FilmographyItem is an alias for CelebrityFilmography with additional display fields
export interface FilmographyItem extends CelebrityFilmography {
  slug?: string; // Movie slug for URL
  title_en?: string; // English title (alias for movie_title)
  title_te?: string; // Telugu title
  avg_rating?: number;
  box_office_status?: 'blockbuster' | 'hit' | 'average' | 'flop' | 'unknown';
  our_rating?: number;
  verdict?: string; // Verdict text (e.g., "Blockbuster", "Hit", "Flop")
  verdict_color?: string; // Color for the verdict/status indicator
  verdict_label?: string;
  is_blockbuster?: boolean;
  is_hit?: boolean;
  is_flop?: boolean;
  genres?: string[];
}

export interface RelatedCelebrity {
  id: string;
  name: string;
  name_en: string;
  name_te?: string;
  slug: string;
  image_url?: string;
  profile_image?: string;
  profession?: CelebrityProfession[];
  relation_type: 'frequent_costar' | 'director' | 'music_director' | 'collaborator' | 'contemporary' | 'similar';
  relation_label?: string;
  collaboration_count?: number;
  latest_movie?: string;
}

export interface CelebrityGalleryImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  caption_te?: string;
  type: 'portrait' | 'event' | 'movie' | 'behind_the_scenes' | 'candid';
  movie_id?: string;
  event_name?: string;
  uploaded_at?: string;
}

export interface CelebrityStats {
  total_movies: number;
  total_awards: number;
  total_nominations: number;
  box_office_total?: string;
  avg_rating?: number;
  debut_year?: number;
  latest_movie_year?: number;
  career_span?: string;
}

export type MilestoneType = 'debut' | 'blockbuster' | 'award' | 'milestone' | '100_film' | '200_film' | 'collaboration' | 'other';

export interface CelebrityMilestone {
  id: string;
  year: number;
  title: string;
  title_te?: string;
  description?: string;
  description_te?: string;
  type?: MilestoneType;
  milestone_type: MilestoneType;
  movie_id?: string;
  movie_title?: string;
  movie_title_te?: string;
  image_url?: string;
  importance: 'major' | 'minor' | 'notable';
  impact_score?: number; // 0-1 score indicating impact/significance
}

export interface CelebrityProfile extends Celebrity {
  // Extended profile with computed/additional fields
  age?: number;
  zodiac_sign?: string;
  height?: string;
  known_for?: string[];
  nicknames?: string[];
  filmography_count?: number;
  awards_count?: number;
  era?: 'classic' | 'golden' | 'modern' | 'contemporary';
  occupation?: string[];
  wikipedia_url?: string;
  imdb_id?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  youtube_channel?: string;
}

export interface AwardsSummary {
  total: number;
  wins: number;
  nominations: number;
  major_wins?: number;
  national_awards?: number;
  filmfare?: number;
  nandi?: number;
  siima?: number;
  other?: number;
}

export interface CareerStats {
  total_films: number;
  total_movies?: number; // Alias for total_films
  as_lead: number;
  as_supporting: number;
  as_cameo?: number;
  debut_year?: number;
  latest_release_year?: number;
  active_years?: number;
  avg_rating?: number;
  highest_rated_film?: {
    title: string;
    rating: number;
  };
  blockbusters?: number;
  hits?: number;
  hit_rate?: number; // Percentage of hit movies
  avg_films_per_year?: number;
}

export type TriviaCategory = 'personal' | 'career' | 'education' | 'family' | 'records' | 'fun_fact' | 'controversy' | 'other';

export interface CelebrityTrivia {
  id: string;
  content: string;
  content_te?: string;
  trivia_text?: string; // Alias for content
  trivia_text_te?: string; // Alias for content_te
  category?: TriviaCategory;
  is_verified?: boolean;
  source?: string;
  source_url?: string;
  created_at?: string;
}

