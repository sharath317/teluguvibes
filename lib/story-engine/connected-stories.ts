/**
 * Connected Story Engine
 * 
 * Phase 6: Multi-day story arcs
 * 
 * Extends existing topic clustering to support:
 * - Multi-day story arcs
 * - New post auto-linking to parent story
 * - Timeline UI auto-generated
 * - Mini-story summaries updated automatically
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface StoryArc {
  id: string;
  title_en: string;
  title_te: string;
  slug: string;
  
  // Story type
  story_type: 'breaking' | 'developing' | 'feature' | 'series';
  
  // Timeline
  started_at: Date;
  last_updated_at: Date;
  expected_end_at?: Date;
  
  // Content
  summary_en: string;
  summary_te: string;
  main_entity: string;
  entity_type: 'movie' | 'celebrity' | 'event' | 'topic';
  
  // Posts in this story
  post_count: number;
  post_ids: string[];
  
  // Status
  status: 'active' | 'concluded' | 'dormant';
  
  // Clustering
  cluster_id?: string;
  keywords: string[];
  
  // Engagement
  total_views: number;
  total_engagement: number;
}

export interface StoryPost {
  id: string;
  story_id: string;
  sequence_number: number;
  post_type: 'initial' | 'update' | 'resolution' | 'reaction';
  
  title: string;
  published_at: Date;
  
  // Relationship
  is_main_post: boolean;
  parent_post_id?: string;
}

export interface StoryTimeline {
  story: StoryArc;
  posts: StoryPost[];
  timeline: Array<{
    date: string;
    posts: StoryPost[];
    summary: string;
  }>;
}

// ============================================================
// SUPABASE
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

// ============================================================
// STORY DETECTION
// ============================================================

/**
 * Detect if a new post belongs to an existing story
 */
export async function detectStoryConnection(
  postTitle: string,
  postContent: string,
  category: string,
  entities: string[]
): Promise<{ connected: boolean; storyId?: string; confidence: number }> {
  const supabase = getSupabaseClient();
  
  // Extract keywords from post
  const keywords = extractKeywords(postTitle + ' ' + postContent);
  
  // Check active stories
  const { data: activeStories } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('status', 'active')
    .order('last_updated_at', { ascending: false })
    .limit(50);

  if (!activeStories || activeStories.length === 0) {
    return { connected: false, confidence: 0 };
  }

  // Find best matching story
  let bestMatch: { story: StoryArc; score: number } | null = null;

  for (const story of activeStories) {
    let score = 0;

    // Entity match (strong signal)
    if (entities.some(e => story.main_entity.toLowerCase().includes(e.toLowerCase()))) {
      score += 50;
    }

    // Keyword overlap
    const storyKeywords = story.keywords || [];
    const overlap = keywords.filter(k => storyKeywords.includes(k)).length;
    score += overlap * 10;

    // Recency bonus
    const hoursSinceUpdate = (Date.now() - new Date(story.last_updated_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) score += 20;
    else if (hoursSinceUpdate < 72) score += 10;

    if (score > (bestMatch?.score || 0)) {
      bestMatch = { story: story as StoryArc, score };
    }
  }

  if (bestMatch && bestMatch.score >= 40) {
    return {
      connected: true,
      storyId: bestMatch.story.id,
      confidence: Math.min(1, bestMatch.score / 100),
    };
  }

  return { connected: false, confidence: 0 };
}

/**
 * Create a new story arc
 */
export async function createStoryArc(
  initialPost: {
    id: string;
    title_en: string;
    title_te?: string;
    content: string;
    category: string;
    published_at: Date;
  },
  storyType: StoryArc['story_type'] = 'developing'
): Promise<StoryArc | null> {
  const supabase = getSupabaseClient();
  
  const keywords = extractKeywords(initialPost.title_en + ' ' + initialPost.content);
  const mainEntity = detectMainEntity(initialPost.title_en, initialPost.content);
  const entityType = detectEntityType(initialPost.content, initialPost.category);

  const slug = initialPost.title_en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);

  const storyData = {
    title_en: initialPost.title_en,
    title_te: initialPost.title_te || initialPost.title_en,
    slug: `${slug}-${Date.now()}`,
    story_type: storyType,
    started_at: initialPost.published_at.toISOString(),
    last_updated_at: initialPost.published_at.toISOString(),
    summary_en: initialPost.title_en,
    summary_te: initialPost.title_te || initialPost.title_en,
    main_entity: mainEntity,
    entity_type: entityType,
    post_count: 1,
    post_ids: [initialPost.id],
    status: 'active',
    keywords,
    total_views: 0,
    total_engagement: 0,
  };

  const { data, error } = await supabase
    .from('story_arcs')
    .insert(storyData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create story arc:', error);
    return null;
  }

  return data as StoryArc;
}

/**
 * Add a post to an existing story
 */
export async function addPostToStory(
  storyId: string,
  post: {
    id: string;
    title: string;
    published_at: Date;
  },
  postType: StoryPost['post_type'] = 'update'
): Promise<boolean> {
  const supabase = getSupabaseClient();

  // Get current story
  const { data: story, error: fetchError } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('id', storyId)
    .single();

  if (fetchError || !story) {
    return false;
  }

  // Update story
  const postIds = [...(story.post_ids || []), post.id];
  
  const { error: updateError } = await supabase
    .from('story_arcs')
    .update({
      last_updated_at: post.published_at.toISOString(),
      post_count: postIds.length,
      post_ids: postIds,
      // Keep status active if we're getting updates
      status: 'active',
    })
    .eq('id', storyId);

  if (updateError) {
    console.error('Failed to update story:', updateError);
    return false;
  }

  // Create story post record
  const { error: postError } = await supabase
    .from('story_posts')
    .insert({
      story_id: storyId,
      post_id: post.id,
      sequence_number: postIds.length,
      post_type: postType,
      title: post.title,
      published_at: post.published_at.toISOString(),
      is_main_post: false,
    });

  return !postError;
}

/**
 * Get story timeline
 */
export async function getStoryTimeline(storyId: string): Promise<StoryTimeline | null> {
  const supabase = getSupabaseClient();

  // Get story
  const { data: story, error: storyError } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('id', storyId)
    .single();

  if (storyError || !story) {
    return null;
  }

  // Get all posts in story
  const { data: posts, error: postsError } = await supabase
    .from('story_posts')
    .select('*')
    .eq('story_id', storyId)
    .order('published_at', { ascending: true });

  if (postsError) {
    return null;
  }

  // Group by date
  const byDate = new Map<string, StoryPost[]>();

  for (const post of (posts || [])) {
    const date = new Date(post.published_at).toISOString().split('T')[0];
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(post as StoryPost);
  }

  const timeline = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, datePosts]) => ({
      date,
      posts: datePosts,
      summary: datePosts.map(p => p.title).join(' | '),
    }));

  return {
    story: story as StoryArc,
    posts: posts as StoryPost[],
    timeline,
  };
}

/**
 * Update story summary based on all posts
 */
export async function updateStorySummary(storyId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const timeline = await getStoryTimeline(storyId);
  if (!timeline) return false;

  // Generate summary from timeline
  const eventCount = timeline.posts.length;
  const daysSpan = timeline.timeline.length;

  let summary = `${timeline.story.main_entity}: `;
  
  if (timeline.posts[0]) {
    summary += timeline.posts[0].title;
  }
  
  if (eventCount > 1) {
    summary += ` (${eventCount} updates over ${daysSpan} days)`;
  }

  const { error } = await supabase
    .from('story_arcs')
    .update({
      summary_en: summary,
      summary_te: summary, // Ideally translate
    })
    .eq('id', storyId);

  return !error;
}

/**
 * Mark story as concluded
 */
export async function concludeStory(storyId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('story_arcs')
    .update({
      status: 'concluded',
    })
    .eq('id', storyId);

  return !error;
}

/**
 * Get active stories for display
 */
export async function getActiveStories(limit: number = 10): Promise<StoryArc[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('status', 'active')
    .order('last_updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data || []) as StoryArc[];
}

/**
 * Auto-detect dormant stories
 */
export async function markDormantStories(
  hoursThreshold: number = 72
): Promise<number> {
  const supabase = getSupabaseClient();

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursThreshold);

  const { data, error } = await supabase
    .from('story_arcs')
    .update({ status: 'dormant' })
    .eq('status', 'active')
    .lt('last_updated_at', cutoff.toISOString())
    .select();

  if (error) {
    console.error('Failed to mark dormant stories:', error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================
// HELPERS
// ============================================================

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'and', 'or', 'but', 'not', 'this', 'that', 'these', 'those',
    'it', 'he', 'she', 'they', 'we', 'you', 'i', 'me', 'my', 'your', 'our',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 20);
}

function detectMainEntity(title: string, content: string): string {
  // Simple extraction - first capitalized proper noun
  const matches = title.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
  return matches?.[0] || title.split(' ').slice(0, 3).join(' ');
}

function detectEntityType(
  content: string,
  category: string
): StoryArc['entity_type'] {
  const lowerCategory = category.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (lowerCategory === 'movies' || lowerContent.includes('movie') || lowerContent.includes('film')) {
    return 'movie';
  }
  if (lowerCategory === 'celebrities' || lowerContent.includes('actor') || lowerContent.includes('actress')) {
    return 'celebrity';
  }
  if (lowerContent.includes('event') || lowerContent.includes('ceremony')) {
    return 'event';
  }
  return 'topic';
}

// ============================================================
// EXPORTS
// ============================================================

export const StoryEngine = {
  detectConnection: detectStoryConnection,
  createArc: createStoryArc,
  addPost: addPostToStory,
  getTimeline: getStoryTimeline,
  updateSummary: updateStorySummary,
  conclude: concludeStory,
  getActive: getActiveStories,
  markDormant: markDormantStories,
};






