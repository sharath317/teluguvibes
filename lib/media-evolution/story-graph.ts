/**
 * Phase 6: Connected Story & Content Graph
 * 
 * Links ongoing events into timelines, attaches news updates
 * to movies/celebrities, creates story arcs.
 */

import { getSupabaseClient } from '../supabase/client';
import { StoryArc, StoryEvent } from './types';
import { randomUUID } from 'crypto';

// Use crypto.randomUUID for UUID generation
const uuidv4 = () => randomUUID();

// ============================================================
// STORY ARC DETECTION
// ============================================================

interface PostWithEntities {
  id: string;
  title: string;
  title_te?: string;
  created_at: string;
  published_at?: string;
  category?: string;
  tags?: string[];
  linked_movie_id?: string;
  linked_celebrity_id?: string;
}

/**
 * Detect related posts that could form a story arc
 */
export async function detectRelatedPosts(
  postId: string,
  options: {
    lookbackDays?: number;
    minSimilarity?: number;
  } = {}
): Promise<PostWithEntities[]> {
  const supabase = getSupabaseClient();
  const { lookbackDays = 14, minSimilarity = 0.5 } = options;

  // Get the source post
  const { data: sourcePost, error } = await supabase
    .from('posts')
    .select('id, title, title_te, created_at, category, tags')
    .eq('id', postId)
    .single();

  if (error || !sourcePost) {
    return [];
  }

  // Calculate date range
  const sourceDate = new Date(sourcePost.created_at);
  const lookbackDate = new Date(sourceDate);
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Find posts in the same category and timeframe
  const { data: candidates } = await supabase
    .from('posts')
    .select('id, title, title_te, created_at, category, tags')
    .eq('category', sourcePost.category)
    .gte('created_at', lookbackDate.toISOString())
    .neq('id', postId)
    .limit(50);

  if (!candidates) return [];

  // Score by tag overlap
  const sourceTags = new Set(sourcePost.tags || []);
  const related = candidates
    .map(post => {
      const postTags = new Set(post.tags || []);
      let overlap = 0;
      sourceTags.forEach(tag => {
        if (postTags.has(tag)) overlap++;
      });
      const similarity = sourceTags.size > 0 
        ? overlap / sourceTags.size 
        : 0;
      return { ...post, similarity };
    })
    .filter(post => post.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);

  return related;
}

// ============================================================
// STORY ARC CREATION
// ============================================================

export async function createStoryArc(params: {
  title: string;
  title_te?: string;
  arc_type: StoryArc['arc_type'];
  initial_post_id?: string;
  linked_entities?: StoryArc['linked_entities'];
}): Promise<StoryArc> {
  const supabase = getSupabaseClient();
  
  const arc: StoryArc = {
    id: uuidv4(),
    title: params.title,
    title_te: params.title_te,
    arc_type: params.arc_type,
    status: 'developing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    linked_entities: params.linked_entities || [],
    timeline: []
  };

  // If initial post provided, create first event
  if (params.initial_post_id) {
    const { data: post } = await supabase
      .from('posts')
      .select('id, title, excerpt, created_at')
      .eq('id', params.initial_post_id)
      .single();

    if (post) {
      arc.timeline.push({
        id: uuidv4(),
        arc_id: arc.id,
        event_type: 'initial_report',
        day_number: 1,
        post_id: post.id,
        title: post.title,
        summary: post.excerpt || '',
        occurred_at: post.created_at
      });
    }
  }

  // Store arc (requires story_arcs table)
  const { error } = await supabase
    .from('story_arcs')
    .insert({
      id: arc.id,
      title: arc.title,
      title_te: arc.title_te,
      arc_type: arc.arc_type,
      status: arc.status,
      linked_entities: arc.linked_entities,
      timeline: arc.timeline,
      created_at: arc.created_at,
      updated_at: arc.updated_at
    });

  if (error) {
    console.error('Failed to create story arc:', error);
  }

  return arc;
}

/**
 * Add an event to an existing story arc
 */
export async function addStoryEvent(
  arcId: string,
  event: Omit<StoryEvent, 'id' | 'arc_id'>
): Promise<StoryEvent | null> {
  const supabase = getSupabaseClient();

  // Fetch existing arc
  const { data: arc, error: fetchError } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('id', arcId)
    .single();

  if (fetchError || !arc) {
    console.error('Story arc not found:', arcId);
    return null;
  }

  const newEvent: StoryEvent = {
    id: uuidv4(),
    arc_id: arcId,
    ...event
  };

  const timeline = [...(arc.timeline || []), newEvent];

  // Update arc
  const { error: updateError } = await supabase
    .from('story_arcs')
    .update({
      timeline,
      updated_at: new Date().toISOString(),
      status: event.event_type === 'resolution' ? 'resolved' : arc.status
    })
    .eq('id', arcId);

  if (updateError) {
    console.error('Failed to update story arc:', updateError);
    return null;
  }

  return newEvent;
}

// ============================================================
// STORY GRAPH QUERIES
// ============================================================

export async function getStoryArcsForEntity(
  entityType: 'movie' | 'celebrity',
  entityId: string
): Promise<StoryArc[]> {
  const supabase = getSupabaseClient();

  const { data: arcs, error } = await supabase
    .from('story_arcs')
    .select('*')
    .contains('linked_entities', [{ entity_type: entityType, entity_id: entityId }])
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch story arcs:', error);
    return [];
  }

  return arcs || [];
}

export async function getDevelopingStories(
  limit: number = 10
): Promise<StoryArc[]> {
  const supabase = getSupabaseClient();

  const { data: arcs, error } = await supabase
    .from('story_arcs')
    .select('*')
    .eq('status', 'developing')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch developing stories:', error);
    return [];
  }

  return arcs || [];
}

// ============================================================
// AUTO-LINKING
// ============================================================

/**
 * Automatically link a new post to existing story arcs
 */
export async function autoLinkPost(
  postId: string,
  movieId?: string,
  celebrityId?: string
): Promise<{ linked_to: string[]; created_arc: boolean }> {
  const supabase = getSupabaseClient();
  const linkedTo: string[] = [];
  let createdArc = false;

  // Get the post
  const { data: post, error } = await supabase
    .from('posts')
    .select('id, title, title_te, category, tags, created_at')
    .eq('id', postId)
    .single();

  if (error || !post) {
    return { linked_to: [], created_arc: false };
  }

  // Find related developing stories
  const developingArcs = await getDevelopingStories(20);

  for (const arc of developingArcs) {
    // Check entity match
    const hasEntityMatch = arc.linked_entities.some(
      entity =>
        (movieId && entity.entity_type === 'movie' && entity.entity_id === movieId) ||
        (celebrityId && entity.entity_type === 'celebrity' && entity.entity_id === celebrityId)
    );

    if (hasEntityMatch) {
      // Calculate day number
      const arcStart = new Date(arc.created_at);
      const postDate = new Date(post.created_at);
      const dayDiff = Math.ceil((postDate.getTime() - arcStart.getTime()) / (1000 * 60 * 60 * 24));

      // Add as update event
      await addStoryEvent(arc.id, {
        event_type: 'update',
        day_number: Math.max(1, dayDiff),
        post_id: post.id,
        title: post.title,
        summary: '',
        occurred_at: post.created_at
      });

      linkedTo.push(arc.id);
    }
  }

  // If no existing arc found but has entity, consider creating new arc
  if (linkedTo.length === 0 && (movieId || celebrityId)) {
    // Check for related posts that could form a new arc
    const related = await detectRelatedPosts(postId, { lookbackDays: 7 });
    
    if (related.length >= 2) {
      // Create new arc
      const entities: StoryArc['linked_entities'] = [];
      if (movieId) {
        entities.push({
          entity_type: 'movie',
          entity_id: movieId,
          entity_name: post.title
        });
      }
      if (celebrityId) {
        entities.push({
          entity_type: 'celebrity',
          entity_id: celebrityId,
          entity_name: post.title
        });
      }

      const arc = await createStoryArc({
        title: `Story: ${post.title}`,
        arc_type: 'incident',
        initial_post_id: postId,
        linked_entities: entities
      });

      linkedTo.push(arc.id);
      createdArc = true;
    }
  }

  return { linked_to: linkedTo, created_arc: createdArc };
}

// ============================================================
// STORY GRAPH METRICS
// ============================================================

export async function getStoryGraphDensity(): Promise<{
  total_arcs: number;
  developing: number;
  resolved: number;
  avg_events_per_arc: number;
  avg_entities_per_arc: number;
  entity_coverage: {
    movies_in_arcs: number;
    celebrities_in_arcs: number;
  };
}> {
  const supabase = getSupabaseClient();

  const { data: arcs, error, count } = await supabase
    .from('story_arcs')
    .select('*', { count: 'exact' });

  if (error || !arcs) {
    return {
      total_arcs: 0,
      developing: 0,
      resolved: 0,
      avg_events_per_arc: 0,
      avg_entities_per_arc: 0,
      entity_coverage: {
        movies_in_arcs: 0,
        celebrities_in_arcs: 0
      }
    };
  }

  const developing = arcs.filter(a => a.status === 'developing').length;
  const resolved = arcs.filter(a => a.status === 'resolved').length;

  const totalEvents = arcs.reduce((sum, arc) => sum + (arc.timeline?.length || 0), 0);
  const totalEntities = arcs.reduce((sum, arc) => sum + (arc.linked_entities?.length || 0), 0);

  const movieIds = new Set<string>();
  const celebrityIds = new Set<string>();
  arcs.forEach(arc => {
    (arc.linked_entities || []).forEach((entity: any) => {
      if (entity.entity_type === 'movie') movieIds.add(entity.entity_id);
      if (entity.entity_type === 'celebrity') celebrityIds.add(entity.entity_id);
    });
  });

  return {
    total_arcs: count || 0,
    developing,
    resolved,
    avg_events_per_arc: arcs.length > 0 ? totalEvents / arcs.length : 0,
    avg_entities_per_arc: arcs.length > 0 ? totalEntities / arcs.length : 0,
    entity_coverage: {
      movies_in_arcs: movieIds.size,
      celebrities_in_arcs: celebrityIds.size
    }
  };
}

