/**
 * Database Types
 * Type definitions for Supabase database tables
 */

export type Category =
  | 'news'
  | 'movies'
  | 'gossip'
  | 'photos'
  | 'videos'
  | 'hot'
  | 'editorial'
  | 'stories'
  | 'quizzes'
  | 'memes'
  | 'web-series'
  | 'jobs'
  | 'astrology'
  | 'lifestyle'
  | 'entertainment'
  | 'sports'
  | 'politics'
  | 'trending'
  | 'reviews'
  | 'interviews'
  | 'features';

export type PostStatus = 'draft' | 'published' | 'archived' | 'scheduled';

export interface Post {
  id: string;
  title: string;
  title_en: string;
  title_te?: string;
  slug: string;
  excerpt?: string;
  excerpt_te?: string;
  content?: string;
  content_te?: string;
  telugu_body?: string;
  body?: string;
  category: Category;
  tags: string[];
  featured_image?: string;
  thumbnail_url?: string;
  image_url?: string;
  image_urls?: string[];
  author_id?: string;
  author_name?: string;
  status: PostStatus;
  is_featured: boolean;
  is_trending: boolean;
  views: number;
  likes: number;
  comments_count: number;
  published_at?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  // SEO fields
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  // Editorial fields
  has_human_pov?: boolean;
  has_citation_block?: boolean;
  editorial_score?: number;
}

export interface Author {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  role: 'admin' | 'editor' | 'contributor';
  is_active: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  post_count: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id?: string;
  user_name: string;
  user_email?: string;
  content: string;
  is_approved: boolean;
  parent_id?: string;
  likes: number;
  created_at: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  original_name: string;
  url: string;
  thumbnail_url?: string;
  mime_type: string;
  size_bytes: number;
  width?: number;
  height?: number;
  alt_text?: string;
  caption?: string;
  uploaded_by: string;
  created_at: string;
}

// Supabase query helpers
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: Category;
  status?: PostStatus;
  tags?: string[];
}

