/**
 * Connected Stories Engine
 * Types and utilities for managing interconnected story arcs
 */

export type StoryPostType = 'initial' | 'update' | 'development' | 'conclusion' | 'reaction' | 'follow-up' | 'resolution';

export type StoryType = 'breaking' | 'developing' | 'feature' | 'series';

export type StoryStatus = 'active' | 'concluded' | 'dormant';

export type StoryEntityType = 'movie' | 'celebrity' | 'event' | 'topic';

export interface StoryPost {
  id: string;
  title: string;
  title_te?: string;
  slug: string;
  excerpt?: string;
  excerpt_te?: string;
  image_url?: string;
  published_at?: string;
  created_at?: string;
  category?: string;
  tags?: string[];
  views?: number;
  likes?: number;
  post_type?: StoryPostType;
}

export interface StoryArc {
  id: string;
  title: string;
  title_te?: string;
  title_en?: string; // English title
  description?: string;
  description_te?: string;
  summary_en?: string;
  summary_te?: string;
  image_url?: string;
  posts: StoryPost[];
  start_date?: string;
  started_at?: string; // Alias for start_date
  end_date?: string;
  last_updated_at?: string;
  is_active?: boolean;
  is_featured?: boolean;
  category?: string;
  related_celebrities?: string[];
  related_movies?: string[];
  story_type?: StoryType;
  status?: StoryStatus;
  entity_type?: StoryEntityType;
  main_entity?: string;
  entity_id?: string;
  slug?: string;
  post_count?: number;
  keywords?: string[];
}

export interface TimelineEvent {
  date: string;
  title: string;
  title_te?: string;
  description?: string;
  post_id?: string;
  importance?: 'major' | 'minor' | 'milestone';
  posts?: StoryPost[];
}

export interface StoryTimeline {
  id: string;
  arcs: StoryArc[];
  timeline?: TimelineEvent[]; // Added timeline property
  title?: string;
  title_te?: string;
  description?: string;
  total_posts?: number;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface StoryConnection {
  from_post_id: string;
  to_post_id: string;
  connection_type: 'continuation' | 'related' | 'reference' | 'update';
  strength?: number;
}

/**
 * Get connected stories for a given post
 */
export function getConnectedStories(postId: string, allPosts: StoryPost[]): StoryPost[] {
  // Placeholder implementation
  return allPosts.filter(p => p.id !== postId).slice(0, 5);
}

/**
 * Build a story timeline from posts
 */
export function buildStoryTimeline(posts: StoryPost[]): StoryTimeline {
  return {
    id: 'timeline-' + Date.now(),
    arcs: [],
    total_posts: posts.length,
  };
}

/**
 * Get story arcs for a celebrity or movie
 */
export function getStoryArcs(entityId: string, entityType: 'celebrity' | 'movie'): StoryArc[] {
  // Placeholder implementation
  return [];
}

