/**
 * Connected Stories Graph
 * 
 * Links movie lifecycle events into connected story threads:
 * - Announcement → First Look → Trailer → Release → Review → OTT Release
 * - Actor filmography connections
 * - Director's work timeline
 * - Franchise/sequel connections
 * 
 * Usage:
 *   import { buildStoryGraph, getConnectedStories } from '@/lib/reviews/story-graph';
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface StoryEvent {
  id: string;
  type: EventType;
  title: string;
  title_te?: string;
  date: string;
  entity_id: string; // movie_id or celebrity_id
  entity_type: 'movie' | 'celebrity';
  description?: string;
  link?: string;
  image_url?: string;
}

type EventType = 
  | 'announcement'
  | 'first_look'
  | 'teaser'
  | 'trailer'
  | 'release'
  | 'review'
  | 'ott_release'
  | 'award'
  | 'milestone'
  | 'filmography';

interface StoryThread {
  id: string;
  title: string;
  title_te?: string;
  entity_id: string;
  entity_type: 'movie' | 'celebrity' | 'franchise';
  events: StoryEvent[];
  start_date: string;
  end_date?: string;
  status: 'ongoing' | 'completed';
}

interface RelatedMovie {
  id: string;
  title: string;
  slug: string;
  poster_url?: string;
  release_year?: number;
  relation_type: RelationType;
  relation_strength: number; // 0-1
}

type RelationType = 
  | 'same_hero'
  | 'same_director'
  | 'same_heroine'
  | 'same_genre'
  | 'sequel'
  | 'prequel'
  | 'franchise'
  | 'same_music_director'
  | 'similar_rating';

// ============================================================
// STORY GRAPH BUILDING
// ============================================================

/**
 * Build complete story thread for a movie
 */
export async function buildMovieStoryThread(
  supabase: ReturnType<typeof createClient>,
  movieId: string
): Promise<StoryThread | null> {
  const { data: movie } = await supabase
    .from('movies')
    .select('*')
    .eq('id', movieId)
    .single();

  if (!movie) return null;

  const events: StoryEvent[] = [];

  // 1. Release event
  if (movie.release_date) {
    events.push({
      id: `${movieId}-release`,
      type: 'release',
      title: `${movie.title_en} Released`,
      title_te: movie.title_te ? `${movie.title_te} విడుదల` : undefined,
      date: movie.release_date,
      entity_id: movieId,
      entity_type: 'movie',
      description: `${movie.title_en} hit the screens`,
      link: `/reviews/${movie.slug}`,
      image_url: movie.poster_url,
    });
  }

  // 2. Review event (if exists)
  const { data: review } = await supabase
    .from('movie_reviews')
    .select('created_at, overall_rating')
    .eq('movie_id', movieId)
    .single();

  if (review) {
    const reviewDate = new Date(review.created_at);
    events.push({
      id: `${movieId}-review`,
      type: 'review',
      title: `${movie.title_en} Review: ${review.overall_rating}/10`,
      date: reviewDate.toISOString().split('T')[0],
      entity_id: movieId,
      entity_type: 'movie',
      description: `Our editorial review with rating ${review.overall_rating}/10`,
      link: `/reviews/${movie.slug}`,
    });
  }

  // 3. Milestone events (blockbuster status, awards)
  if (movie.is_blockbuster) {
    events.push({
      id: `${movieId}-blockbuster`,
      type: 'milestone',
      title: `${movie.title_en} declared Blockbuster`,
      date: movie.release_date || new Date().toISOString().split('T')[0],
      entity_id: movieId,
      entity_type: 'movie',
      description: 'Achieved blockbuster status',
    });
  }

  // Sort events by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    id: `story-${movieId}`,
    title: `${movie.title_en} Story`,
    title_te: movie.title_te ? `${movie.title_te} కథ` : undefined,
    entity_id: movieId,
    entity_type: 'movie',
    events,
    start_date: events[0]?.date || movie.release_date || new Date().toISOString(),
    end_date: events[events.length - 1]?.date,
    status: events.length > 0 ? 'completed' : 'ongoing',
  };
}

// ============================================================
// CONNECTED MOVIES
// ============================================================

/**
 * Find movies connected to a given movie
 */
export async function getConnectedMovies(
  supabase: ReturnType<typeof createClient>,
  movieId: string,
  limit: number = 10
): Promise<RelatedMovie[]> {
  const { data: movie } = await supabase
    .from('movies')
    .select('*')
    .eq('id', movieId)
    .single();

  if (!movie) return [];

  const relatedMovies: Map<string, RelatedMovie> = new Map();

  // 1. Same Hero
  if (movie.hero) {
    const { data: sameHero } = await supabase
      .from('movies')
      .select('id, title_en, slug, poster_url, release_year')
      .eq('hero', movie.hero)
      .neq('id', movieId)
      .order('avg_rating', { ascending: false })
      .limit(5);

    sameHero?.forEach((m, idx) => {
      if (!relatedMovies.has(m.id)) {
        relatedMovies.set(m.id, {
          ...m,
          title: m.title_en,
          relation_type: 'same_hero',
          relation_strength: 0.9 - (idx * 0.1),
        });
      }
    });
  }

  // 2. Same Director
  if (movie.director) {
    const { data: sameDirector } = await supabase
      .from('movies')
      .select('id, title_en, slug, poster_url, release_year')
      .eq('director', movie.director)
      .neq('id', movieId)
      .order('avg_rating', { ascending: false })
      .limit(5);

    sameDirector?.forEach((m, idx) => {
      const existing = relatedMovies.get(m.id);
      if (existing) {
        existing.relation_strength = Math.min(1, existing.relation_strength + 0.3);
      } else {
        relatedMovies.set(m.id, {
          ...m,
          title: m.title_en,
          relation_type: 'same_director',
          relation_strength: 0.8 - (idx * 0.1),
        });
      }
    });
  }

  // 3. Same Genre (if genres array exists)
  if (movie.genres?.length > 0) {
    const { data: sameGenre } = await supabase
      .from('movies')
      .select('id, title_en, slug, poster_url, release_year')
      .contains('genres', [movie.genres[0]])
      .neq('id', movieId)
      .order('avg_rating', { ascending: false })
      .limit(5);

    sameGenre?.forEach((m, idx) => {
      const existing = relatedMovies.get(m.id);
      if (existing) {
        existing.relation_strength = Math.min(1, existing.relation_strength + 0.2);
      } else {
        relatedMovies.set(m.id, {
          ...m,
          title: m.title_en,
          relation_type: 'same_genre',
          relation_strength: 0.6 - (idx * 0.1),
        });
      }
    });
  }

  // Sort by relation strength and return top N
  return Array.from(relatedMovies.values())
    .sort((a, b) => b.relation_strength - a.relation_strength)
    .slice(0, limit);
}

/**
 * Get actor's filmography as story thread
 */
export async function getActorFilmography(
  supabase: ReturnType<typeof createClient>,
  actorName: string,
  limit: number = 20
): Promise<StoryThread | null> {
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_date, release_year, avg_rating')
    .or(`hero.eq.${actorName},heroine.eq.${actorName}`)
    .order('release_year', { ascending: false })
    .limit(limit);

  if (!movies?.length) return null;

  const events: StoryEvent[] = movies.map(movie => ({
    id: `film-${movie.id}`,
    type: 'filmography' as EventType,
    title: movie.title_en,
    title_te: movie.title_te,
    date: movie.release_date || `${movie.release_year}-01-01`,
    entity_id: movie.id,
    entity_type: 'movie' as const,
    description: `Rating: ${movie.avg_rating?.toFixed(1) || 'N/A'}`,
    link: `/reviews/${movie.slug}`,
    image_url: movie.poster_url,
  }));

  return {
    id: `filmography-${actorName.toLowerCase().replace(/\s+/g, '-')}`,
    title: `${actorName} Filmography`,
    entity_id: actorName,
    entity_type: 'celebrity',
    events: events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    start_date: events[events.length - 1]?.date || '',
    end_date: events[0]?.date,
    status: 'ongoing',
  };
}

// ============================================================
// CONTINUE THE STORY
// ============================================================

/**
 * Get "Continue the Story" suggestions for a movie
 */
export async function getContinueStory(
  supabase: ReturnType<typeof createClient>,
  movieId: string
): Promise<{
  next_in_timeline: RelatedMovie[];
  related_by_cast: RelatedMovie[];
  related_by_theme: RelatedMovie[];
}> {
  const [connected, movie] = await Promise.all([
    getConnectedMovies(supabase, movieId, 15),
    supabase.from('movies').select('release_year').eq('id', movieId).single()
  ]);

  // Categorize connections
  const nextInTimeline = connected
    .filter(m => m.release_year && movie.data?.release_year && m.release_year > movie.data.release_year)
    .slice(0, 5);

  const relatedByCast = connected
    .filter(m => m.relation_type === 'same_hero' || m.relation_type === 'same_director')
    .slice(0, 5);

  const relatedByTheme = connected
    .filter(m => m.relation_type === 'same_genre')
    .slice(0, 5);

  return {
    next_in_timeline: nextInTimeline,
    related_by_cast: relatedByCast,
    related_by_theme: relatedByTheme,
  };
}

// ============================================================
// EXPORTS
// ============================================================

export const storyGraph = {
  buildMovieStoryThread,
  getConnectedMovies,
  getActorFilmography,
  getContinueStory,
};

export default storyGraph;


