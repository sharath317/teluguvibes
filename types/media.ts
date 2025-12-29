// Hot Media System Types

export type EntityType = 'actress' | 'anchor' | 'influencer' | 'model' | 'singer';

export type MediaType =
  | 'image'
  | 'instagram_post'
  | 'instagram_reel'
  | 'youtube_video'
  | 'youtube_short'
  | 'twitter_post'
  | 'facebook_post';

export type MediaSource =
  | 'wikimedia'
  | 'unsplash'
  | 'pexels'
  | 'tmdb'
  | 'instagram_embed'
  | 'youtube_embed'
  | 'twitter_embed'
  | 'facebook_embed'
  | 'official_website'
  | 'press_release';

export type MediaCategory =
  | 'photoshoot'
  | 'event'
  | 'movie_promotion'
  | 'traditional'
  | 'casual'
  | 'fitness'
  | 'travel'
  | 'behind_the_scenes'
  | 'general';

export type MediaStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface MediaEntity {
  id: string;
  name_en: string;
  name_te?: string;
  entity_type: EntityType;
  wikidata_id?: string;
  tmdb_id?: number;
  celebrity_id?: string;
  instagram_handle?: string;
  youtube_channel_id?: string;
  twitter_handle?: string;
  facebook_page?: string;
  profile_image?: string;
  cover_image?: string;
  popularity_score: number;
  follower_count: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaPost {
  id: string;
  entity_id?: string;
  entity?: MediaEntity;
  media_type: MediaType;
  source: MediaSource;
  source_url: string;
  source_license?: string;
  embed_html?: string;
  embed_width?: number;
  embed_height?: number;
  image_url?: string;
  thumbnail_url?: string;
  title?: string;
  caption?: string;
  caption_te?: string;
  tags: string[];
  category: MediaCategory;
  views: number;
  likes: number;
  shares: number;
  trending_score: number;
  featured_order?: number;
  status: MediaStatus;
  is_featured: boolean;
  is_hot: boolean;
  is_nsfw: boolean;
  moderation_notes?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaCollection {
  id: string;
  title: string;
  title_te?: string;
  slug: string;
  description?: string;
  cover_image?: string;
  entity_id?: string;
  entity?: MediaEntity;
  collection_type: 'gallery' | 'photoshoot' | 'event' | 'movie' | 'trending';
  post_count: number;
  views: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Types
export interface OEmbedResponse {
  type: 'rich' | 'video' | 'photo' | 'link';
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name: string;
  provider_url: string;
  html: string;
  width?: number;
  height?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export interface MediaFetchResult {
  success: boolean;
  platform: 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'unknown';
  media_type: MediaType;
  source: MediaSource;
  embed_html?: string;
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
  error?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  hasWatermark?: boolean;
  aspectRatio?: number;
  error?: string;
}
