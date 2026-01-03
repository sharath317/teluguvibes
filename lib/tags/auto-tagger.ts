/**
 * AUTO-TAGGING SYSTEM
 * 
 * Automatically generates canonical tags from review intelligence.
 * Tags power ALL UI sections and enable zero-hardcoding architecture.
 */

import { createClient } from '@supabase/supabase-js';
import type { ReviewDimensions, AudienceSignals } from '../reviews/review-dimensions.types';

// ============================================================
// TAG TAXONOMY
// ============================================================

export type ContentNatureTag =
  | 'musical'
  | 'emotional'
  | 'action-heavy'
  | 'dialogue-driven'
  | 'visual-spectacle'
  | 'character-study'
  | 'ensemble-cast'
  | 'slow-burn'
  | 'fast-paced';

export type MoodTag =
  | 'thrilling'
  | 'uplifting'
  | 'dark'
  | 'nostalgic'
  | 'romantic'
  | 'intense'
  | 'light-hearted'
  | 'thought-provoking'
  | 'feel-good'
  | 'tearjerker';

export type CareerMilestoneTag =
  | 'career-best-performance'
  | 'actor-best'
  | 'director-best'
  | 'breakthrough-role'
  | 'comeback-film'
  | 'debut-film';

export type EraLegacyTag =
  | 'classic'
  | 'cult-classic'
  | 'modern-classic'
  | 'timeless'
  | 'era-defining'
  | 'trendsetter'
  | 'game-changer';

export type SectionMappingTag =
  | 'blockbuster'
  | 'hidden-gem'
  | 'top-10'
  | 'must-watch'
  | 'underrated'
  | 'overrated'
  | 'family-entertainer'
  | 'date-movie'
  | 'festival-worthy';

export type CanonicalTag =
  | ContentNatureTag
  | MoodTag
  | CareerMilestoneTag
  | EraLegacyTag
  | SectionMappingTag;

// ============================================================
// TAG GENERATION RULES
// ============================================================

/**
 * Derive content nature tags from review dimensions
 */
export function deriveContentNatureTags(dimensions: ReviewDimensions): ContentNatureTag[] {
  const tags: ContentNatureTag[] = [];

  // Musical
  if (dimensions.music_bgm.songs >= 8 || dimensions.music_bgm.replay_value >= 8) {
    tags.push('musical');
  }

  // Emotional
  if (dimensions.emotional_impact.tears >= 8) {
    tags.push('emotional');
  }

  // Action-heavy
  if (dimensions.emotional_impact.thrill >= 8) {
    tags.push('action-heavy');
  }

  // Visual spectacle
  if (dimensions.cinematography.score >= 8.5) {
    tags.push('visual-spectacle');
  }

  // Character study
  if (dimensions.story_screenplay.emotional_depth >= 8 && dimensions.acting_lead.hero?.transformation && dimensions.acting_lead.hero.transformation >= 8) {
    tags.push('character-study');
  }

  // Ensemble cast
  if (dimensions.acting_supporting.overall_strength >= 8) {
    tags.push('ensemble-cast');
  }

  // Pacing
  if (dimensions.editing_pacing.score >= 8.5) {
    tags.push('fast-paced');
  } else if (dimensions.story_screenplay.pacing <= 6) {
    tags.push('slow-burn');
  }

  return tags;
}

/**
 * Derive mood tags from emotional impact
 */
export function deriveMoodTags(dimensions: ReviewDimensions, signals: AudienceSignals): MoodTag[] {
  const tags: MoodTag[] = [];

  // Thrilling
  if (dimensions.emotional_impact.thrill >= 8) {
    tags.push('thrilling');
  }

  // Uplifting
  if (dimensions.emotional_impact.inspiration >= 8) {
    tags.push('uplifting');
  }

  // Dark
  if (signals.mood.includes('dark') || signals.mood.includes('intense')) {
    tags.push('dark');
  }

  // Nostalgic
  if (dimensions.emotional_impact.nostalgia >= 7) {
    tags.push('nostalgic');
  }

  // Romantic
  if (signals.mood.includes('romantic')) {
    tags.push('romantic');
  }

  // Intense
  if (signals.mood.includes('intense')) {
    tags.push('intense');
  }

  // Light-hearted
  if (dimensions.emotional_impact.laughter >= 7) {
    tags.push('light-hearted');
  }

  // Thought-provoking
  if (dimensions.mass_vs_class.class >= 8) {
    tags.push('thought-provoking');
  }

  // Feel-good
  if (dimensions.emotional_impact.laughter >= 7 && dimensions.emotional_impact.inspiration >= 6) {
    tags.push('feel-good');
  }

  // Tearjerker
  if (dimensions.emotional_impact.tears >= 9) {
    tags.push('tearjerker');
  }

  return tags;
}

/**
 * Derive career milestone tags
 */
export function deriveCareerMilestoneTags(dimensions: ReviewDimensions, movie: any): CareerMilestoneTag[] {
  const tags: CareerMilestoneTag[] = [];

  // Career-best performance
  if (dimensions.acting_lead.hero?.career_best || dimensions.acting_lead.heroine?.career_best) {
    tags.push('career-best-performance');
  }

  // Actor-best
  if (dimensions.acting_lead.hero?.score && dimensions.acting_lead.hero.score >= 9.5) {
    tags.push('actor-best');
  }

  // Director-best
  if (dimensions.direction.score >= 9.5) {
    tags.push('director-best');
  }

  // Breakthrough role
  if (dimensions.acting_lead.hero?.transformation && dimensions.acting_lead.hero.transformation >= 9) {
    tags.push('breakthrough-role');
  }

  // Debut film (requires movie metadata)
  if (movie?.is_debut) {
    tags.push('debut-film');
  }

  // Comeback film (requires movie metadata)
  if (movie?.is_comeback) {
    tags.push('comeback-film');
  }

  return tags;
}

/**
 * Derive era & legacy tags
 */
export function deriveEraLegacyTags(dimensions: ReviewDimensions, movie: any): EraLegacyTag[] {
  const tags: EraLegacyTag[] = [];
  const currentYear = new Date().getFullYear();
  const releaseYear = movie?.release_year || currentYear;
  const age = currentYear - releaseYear;

  // Classic (20+ years old, high rating)
  if (age >= 20 && dimensions.rewatch_value >= 7.5) {
    tags.push('classic');
  }

  // Cult classic (high rewatch value, niche appeal)
  if (dimensions.rewatch_value >= 9 && dimensions.mass_vs_class.class >= 7) {
    tags.push('cult-classic');
  }

  // Modern classic (5-15 years old, exceptional quality)
  if (age >= 5 && age <= 15 && dimensions.rewatch_value >= 8.5) {
    tags.push('modern-classic');
  }

  // Timeless (any age, universal appeal + high rewatch)
  if (dimensions.rewatch_value >= 9 && dimensions.mass_vs_class.universal_appeal >= 8) {
    tags.push('timeless');
  }

  // Era-defining (high innovation + cultural impact)
  if (dimensions.direction.innovation >= 9) {
    tags.push('era-defining');
  }

  // Trendsetter
  if (dimensions.direction.innovation >= 8.5) {
    tags.push('trendsetter');
  }

  // Game-changer
  if (dimensions.direction.innovation >= 9.5 && dimensions.story_screenplay.originality >= 9) {
    tags.push('game-changer');
  }

  return tags;
}

/**
 * Derive section mapping tags (for UI sections)
 */
export function deriveSectionMappingTags(
  dimensions: ReviewDimensions,
  signals: AudienceSignals,
  movie: any
): SectionMappingTag[] {
  const tags: SectionMappingTag[] = [];

  // Blockbuster (high box office OR marked as blockbuster)
  if (movie?.is_blockbuster || (movie?.worldwide_gross_inr && movie.worldwide_gross_inr >= 1000000000)) {
    tags.push('blockbuster');
  }

  // Hidden gem (high rating, low visibility)
  if (movie?.is_underrated || (movie?.avg_rating >= 7.5 && movie?.total_reviews < 50)) {
    tags.push('hidden-gem');
  }

  // Top 10 (exceptional across all dimensions)
  const avgDimensionScore = (
    dimensions.story_screenplay.score +
    dimensions.direction.score +
    (dimensions.acting_lead.hero?.score || 0) +
    dimensions.music_bgm.songs +
    dimensions.cinematography.score
  ) / 5;
  if (avgDimensionScore >= 8.5 && movie?.avg_rating >= 8.5) {
    tags.push('top-10');
  }

  // Must-watch
  if (dimensions.rewatch_value >= 8 && movie?.avg_rating >= 8) {
    tags.push('must-watch');
  }

  // Underrated
  if (movie?.is_underrated) {
    tags.push('underrated');
  }

  // Family entertainer
  if (signals.family_friendly && dimensions.mass_vs_class.family_friendly >= 7) {
    tags.push('family-entertainer');
  }

  // Date movie
  if (signals.date_movie) {
    tags.push('date-movie');
  }

  // Festival worthy
  if (signals.festival_worthy || dimensions.mass_vs_class.class >= 8.5) {
    tags.push('festival-worthy');
  }

  return tags;
}

// ============================================================
// MAIN AUTO-TAGGING FUNCTION
// ============================================================

/**
 * Generate all canonical tags for a movie from review intelligence
 */
export function generateCanonicalTags(
  dimensions: ReviewDimensions,
  signals: AudienceSignals,
  movie: any
): CanonicalTag[] {
  const contentNature = deriveContentNatureTags(dimensions);
  const mood = deriveMoodTags(dimensions, signals);
  const careerMilestone = deriveCareerMilestoneTags(dimensions, movie);
  const eraLegacy = deriveEraLegacyTags(dimensions, movie);
  const sectionMapping = deriveSectionMappingTags(dimensions, signals, movie);

  return [
    ...contentNature,
    ...mood,
    ...careerMilestone,
    ...eraLegacy,
    ...sectionMapping,
  ];
}

// ============================================================
// DATABASE INTEGRATION
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

/**
 * Auto-tag a single movie
 */
export async function autoTagMovie(movieId: string): Promise<CanonicalTag[] | null> {
  const supabase = getSupabaseClient();

  try {
    // Fetch movie data
    const { data: movie } = await supabase
      .from('movies')
      .select('*')
      .eq('id', movieId)
      .single();

    if (!movie) {
      console.error(`Movie not found: ${movieId}`);
      return null;
    }

    // Fetch review with dimensions
    const { data: review } = await supabase
      .from('movie_reviews')
      .select('dimensions_json, audience_signals')
      .eq('movie_id', movieId)
      .single();

    if (!review || !review.dimensions_json || !review.audience_signals) {
      console.error(`Missing review intelligence for movie: ${movieId}`);
      return null;
    }

    // Generate tags
    const tags = generateCanonicalTags(
      review.dimensions_json as ReviewDimensions,
      review.audience_signals as AudienceSignals,
      movie
    );

    // Update movie with tags
    const { error } = await supabase
      .from('movies')
      .update({
        tags,
      })
      .eq('id', movieId);

    if (error) {
      console.error('Error updating movie tags:', error);
      return null;
    }

    return tags;
  } catch (error) {
    console.error('Error auto-tagging movie:', error);
    return null;
  }
}

/**
 * Batch auto-tag multiple movies
 */
export async function batchAutoTagMovies(
  movieIds: string[],
  batchSize: number = 10
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < movieIds.length; i += batchSize) {
    const batch = movieIds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(id => autoTagMovie(id))
    );

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        success++;
      } else {
        failed++;
      }
    });

    console.log(`Auto-tagged ${i + batch.length}/${movieIds.length} movies`);
  }

  return { success, failed };
}

// ============================================================
// SECTION TAG MAPPING
// ============================================================

/**
 * Map section types to required tags
 */
export const SECTION_TAG_MAPPING: Record<string, CanonicalTag[]> = {
  blockbusters: ['blockbuster'],
  'hidden-gems': ['hidden-gem', 'underrated'],
  'cult-classics': ['cult-classic'],
  'top-10': ['top-10', 'must-watch'],
  'family-entertainer': ['family-entertainer'],
  emotional: ['emotional', 'tearjerker'],
  thrilling: ['thrilling', 'intense'],
  'feel-good': ['feel-good', 'uplifting'],
  classics: ['classic', 'timeless'],
  'modern-classics': ['modern-classic'],
};

/**
 * Get movies by tag for a specific section
 */
export async function getMoviesByTag(
  tag: CanonicalTag,
  language: string = 'Telugu',
  limit: number = 18
) {
  const supabase = getSupabaseClient();

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .contains('tags', [tag])
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return movies || [];
}

/**
 * Get movies matching multiple tags (AND logic)
 */
export async function getMoviesByTags(
  tags: CanonicalTag[],
  language: string = 'Telugu',
  limit: number = 18
) {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language);

  // Apply each tag filter
  tags.forEach(tag => {
    query = query.contains('tags', [tag]);
  });

  const { data: movies } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return movies || [];
}

