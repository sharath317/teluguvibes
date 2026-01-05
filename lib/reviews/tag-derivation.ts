/**
 * TAG DERIVATION ENGINE
 * 
 * Automatically derives tags for movies based on:
 * - Rating and popularity metrics
 * - Genre combinations
 * - Content analysis
 * - Box office data
 * - Awards information
 * 
 * Tags are NOT manually curated - all derivation is rule-based.
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  release_year?: number;
  genres?: string[];
  avg_rating?: number;
  total_reviews?: number;
  tmdb_rating?: number;
  imdb_rating?: number;
  popularity_score?: number;
  is_blockbuster?: boolean;
  is_classic?: boolean;
  is_underrated?: boolean;
  box_office_category?: string;
  awards?: Award[];
  content_flags?: ContentFlags;
  mood_tags?: string[];
  quality_tags?: string[];
  overview?: string;
  tagline?: string;
}

export interface Award {
  type: 'national' | 'filmfare' | 'state' | 'festival' | 'international';
  category: string;
  year: number;
  recipient?: string;
}

export interface ContentFlags {
  pan_india?: boolean;
  remake_of?: string;
  original_language?: string;
  sequel_number?: number;
  franchise?: string;
  biopic?: boolean;
  based_on?: 'true events' | 'book' | 'play' | 'other';
  debut_director?: boolean;
  debut_hero?: boolean;
}

export interface DerivedTags {
  box_office_category?: string;
  mood_tags: string[];
  quality_tags: string[];
  audience_fit: AudienceFit;
  age_rating_suggestion?: string;
  watch_recommendation?: string;
}

export interface AudienceFit {
  kids_friendly: boolean;
  family_watch: boolean;
  date_movie: boolean;
  group_watch: boolean;
  solo_watch: boolean;
}

// ============================================================
// DERIVATION RULES
// ============================================================

/**
 * Box office category derivation rules
 * Based on rating + popularity score combination
 */
const BOX_OFFICE_RULES: Record<string, { minRating?: number; maxRating?: number; minPopularity?: number }> = {
  'industry-hit': { minRating: 7.5, minPopularity: 90 },
  'blockbuster': { minRating: 7.0, minPopularity: 75 },
  'super-hit': { minRating: 7.0, minPopularity: 50 },
  'hit': { minRating: 6.5, minPopularity: 30 },
  'average': { minRating: 5.0, maxRating: 6.5 },
  'below-average': { maxRating: 5.0 },
};

/**
 * Mood tag derivation rules
 * Based on genre combinations and keywords
 */
const MOOD_RULES: Record<string, {
  genres?: string[];
  excludeGenres?: string[];
  minRating?: number;
  maxYear?: number;
  keywords?: string[];
}> = {
  'feel-good': {
    genres: ['Comedy', 'Family', 'Romance'],
    excludeGenres: ['Horror', 'Thriller', 'Crime'],
    minRating: 6.5,
  },
  'dark-intense': {
    genres: ['Thriller', 'Crime', 'Horror', 'Drama'],
    excludeGenres: ['Comedy', 'Family'],
  },
  'thought-provoking': {
    genres: ['Drama'],
    excludeGenres: ['Comedy'],
    minRating: 7.5,
  },
  'patriotic': {
    keywords: ['freedom', 'india', 'independence', 'army', 'soldier', 'nation', 'country', 'war', 'freedom fighter'],
  },
  'nostalgic': {
    maxYear: 2000,
    minRating: 7.0,
  },
  'inspirational': {
    genres: ['Drama', 'Biography'],
    keywords: ['dream', 'success', 'overcome', 'journey', 'rise', 'struggle'],
    minRating: 7.0,
  },
  'emotional': {
    genres: ['Drama', 'Romance', 'Family'],
    keywords: ['emotion', 'heart', 'tears', 'love', 'family', 'sacrifice'],
  },
  'gripping': {
    genres: ['Thriller', 'Crime', 'Mystery'],
    minRating: 7.0,
  },
  'light-hearted': {
    genres: ['Comedy', 'Romance'],
    excludeGenres: ['Drama', 'Thriller', 'Crime', 'Horror'],
  },
  'edge-of-seat': {
    genres: ['Thriller', 'Action', 'Horror'],
    minRating: 7.0,
  },
};

/**
 * Quality tag derivation rules
 */
const QUALITY_RULES: Record<string, {
  minRating?: number;
  minReviews?: number;
  maxYear?: number;
  hasAwards?: boolean;
}> = {
  'masterpiece': { minRating: 9.0 },
  'critically-acclaimed': { minRating: 8.0, minReviews: 10 },
  'cult-classic': { minRating: 7.5, maxYear: 2010 },
  'hidden-gem': { minRating: 7.5, minReviews: 5 },
  'fan-favorite': { minRating: 7.0, minReviews: 20 },
  'crowd-pleaser': { minRating: 7.5, minReviews: 15 },
  'sleeper-hit': { minRating: 7.0 },
};

/**
 * Audience fit derivation based on genre and content
 */
const AUDIENCE_RULES = {
  kids_friendly: {
    safeGenres: ['Family', 'Animation', 'Comedy'],
    unsafeGenres: ['Horror', 'Crime', 'Thriller', 'War'],
    maxAgeRating: 'U',
  },
  family_watch: {
    preferredGenres: ['Family', 'Drama', 'Comedy', 'Romance'],
    excludeGenres: ['Horror'],
  },
  date_movie: {
    preferredGenres: ['Romance', 'Comedy', 'Drama'],
    excludeGenres: ['Horror', 'War', 'Crime'],
  },
  group_watch: {
    preferredGenres: ['Action', 'Comedy', 'Horror', 'Thriller'],
  },
};

// ============================================================
// SUPABASE CLIENT
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
// DERIVATION FUNCTIONS
// ============================================================

/**
 * Derive box office category from rating and popularity
 */
export function deriveBoxOfficeCategory(movie: Movie): string | undefined {
  const rating = movie.avg_rating || movie.tmdb_rating || movie.imdb_rating;
  const popularity = movie.popularity_score || 0;
  
  if (!rating) return undefined;
  
  for (const [category, rules] of Object.entries(BOX_OFFICE_RULES)) {
    const meetsMinRating = !rules.minRating || rating >= rules.minRating;
    const meetsMaxRating = !rules.maxRating || rating < rules.maxRating;
    const meetsPopularity = !rules.minPopularity || popularity >= rules.minPopularity;
    
    if (meetsMinRating && meetsMaxRating && meetsPopularity) {
      return category;
    }
  }
  
  return undefined;
}

/**
 * Derive mood tags from genre and content
 */
export function deriveMoodTags(movie: Movie): string[] {
  const tags: string[] = [];
  const genres = movie.genres || [];
  const rating = movie.avg_rating || movie.tmdb_rating || 0;
  const year = movie.release_year || new Date().getFullYear();
  const textContent = `${movie.overview || ''} ${movie.tagline || ''}`.toLowerCase();
  
  for (const [tag, rules] of Object.entries(MOOD_RULES)) {
    let matches = true;
    
    // Check genre inclusion
    if (rules.genres) {
      const hasRequiredGenre = rules.genres.some(g => genres.includes(g));
      if (!hasRequiredGenre) matches = false;
    }
    
    // Check genre exclusion
    if (rules.excludeGenres && matches) {
      const hasExcludedGenre = rules.excludeGenres.some(g => genres.includes(g));
      if (hasExcludedGenre) matches = false;
    }
    
    // Check minimum rating
    if (rules.minRating && matches) {
      if (rating < rules.minRating) matches = false;
    }
    
    // Check max year
    if (rules.maxYear && matches) {
      if (year > rules.maxYear) matches = false;
    }
    
    // Check keywords
    if (rules.keywords && matches) {
      const hasKeyword = rules.keywords.some(kw => textContent.includes(kw));
      if (!hasKeyword && !rules.genres) {
        matches = false;
      }
    }
    
    if (matches) {
      tags.push(tag);
    }
  }
  
  return tags;
}

/**
 * Derive quality tags from rating and reviews
 */
export function deriveQualityTags(movie: Movie): string[] {
  const tags: string[] = [];
  const rating = movie.avg_rating || movie.tmdb_rating || 0;
  const reviews = movie.total_reviews || 0;
  const year = movie.release_year || new Date().getFullYear();
  const hasAwards = (movie.awards?.length || 0) > 0;
  
  for (const [tag, rules] of Object.entries(QUALITY_RULES)) {
    let matches = true;
    
    if (rules.minRating && rating < rules.minRating) matches = false;
    if (rules.minReviews && reviews < rules.minReviews) matches = false;
    if (rules.maxYear && year > rules.maxYear) matches = false;
    if (rules.hasAwards && !hasAwards) matches = false;
    
    if (matches) {
      tags.push(tag);
    }
  }
  
  // Special case: hidden-gem is for underrated movies (low popularity but high rating)
  if (rating >= 7.5 && (movie.popularity_score || 0) < 30 && !movie.is_blockbuster) {
    if (!tags.includes('hidden-gem')) {
      tags.push('hidden-gem');
    }
  }
  
  return tags;
}

/**
 * Derive audience fit from genres and content
 */
export function deriveAudienceFit(movie: Movie): AudienceFit {
  const genres = movie.genres || [];
  
  // Kids friendly
  const kidsHasSafe = AUDIENCE_RULES.kids_friendly.safeGenres.some(g => genres.includes(g));
  const kidsHasUnsafe = AUDIENCE_RULES.kids_friendly.unsafeGenres.some(g => genres.includes(g));
  const kids_friendly = kidsHasSafe && !kidsHasUnsafe;
  
  // Family watch
  const familyHasPreferred = AUDIENCE_RULES.family_watch.preferredGenres.some(g => genres.includes(g));
  const familyHasExcluded = AUDIENCE_RULES.family_watch.excludeGenres.some(g => genres.includes(g));
  const family_watch = familyHasPreferred && !familyHasExcluded;
  
  // Date movie
  const dateHasPreferred = AUDIENCE_RULES.date_movie.preferredGenres.some(g => genres.includes(g));
  const dateHasExcluded = AUDIENCE_RULES.date_movie.excludeGenres.some(g => genres.includes(g));
  const date_movie = dateHasPreferred && !dateHasExcluded;
  
  // Group watch
  const group_watch = AUDIENCE_RULES.group_watch.preferredGenres.some(g => genres.includes(g));
  
  // Solo watch - dramas and thrillers are good for solo viewing
  const solo_watch = genres.includes('Drama') || genres.includes('Thriller') || genres.includes('Mystery');
  
  return {
    kids_friendly,
    family_watch,
    date_movie,
    group_watch,
    solo_watch,
  };
}

/**
 * Derive suggested age rating from genres and content
 */
export function deriveAgeRatingSuggestion(movie: Movie): string {
  const genres = movie.genres || [];
  
  // A rating for adult content
  if (genres.includes('Horror') || genres.includes('Crime')) {
    return 'A';
  }
  
  // U/A for thriller, action with violence
  if (genres.includes('Thriller') || genres.includes('War')) {
    return 'U/A';
  }
  
  if (genres.includes('Action')) {
    return 'U/A';
  }
  
  // U for family-friendly
  if (genres.includes('Family') || genres.includes('Animation')) {
    return 'U';
  }
  
  // Default to U/A
  return 'U/A';
}

/**
 * Derive watch recommendation (theater vs OTT)
 */
export function deriveWatchRecommendation(movie: Movie): string {
  const genres = movie.genres || [];
  const rating = movie.avg_rating || movie.tmdb_rating || 0;
  
  // Big-budget action, fantasy films are theater-must
  if (genres.includes('Action') || genres.includes('Fantasy')) {
    if (rating >= 7.5) return 'theater-must';
    return 'theater-preferred';
  }
  
  // Horror is great in theaters
  if (genres.includes('Horror')) {
    return 'theater-preferred';
  }
  
  // Drama and romance are fine on OTT
  if (genres.includes('Drama') || genres.includes('Romance')) {
    return 'ott-friendly';
  }
  
  // Comedy works anywhere
  if (genres.includes('Comedy')) {
    return 'any';
  }
  
  return 'any';
}

/**
 * Derive all tags for a movie
 */
export function deriveAllTags(movie: Movie): DerivedTags {
  return {
    box_office_category: deriveBoxOfficeCategory(movie),
    mood_tags: deriveMoodTags(movie),
    quality_tags: deriveQualityTags(movie),
    audience_fit: deriveAudienceFit(movie),
    age_rating_suggestion: deriveAgeRatingSuggestion(movie),
    watch_recommendation: deriveWatchRecommendation(movie),
  };
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================

/**
 * Apply derived tags to a movie in the database
 */
export async function applyDerivedTags(movieId: string): Promise<DerivedTags | null> {
  const supabase = getSupabaseClient();
  
  // Fetch movie
  const { data: movie, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', movieId)
    .single();
  
  if (error || !movie) {
    console.error(`Failed to fetch movie ${movieId}:`, error);
    return null;
  }
  
  // Derive tags
  const derived = deriveAllTags(movie as Movie);
  
  // Update movie
  const { error: updateError } = await supabase
    .from('movies')
    .update({
      box_office_category: derived.box_office_category,
      mood_tags: derived.mood_tags,
      quality_tags: derived.quality_tags,
      audience_fit: derived.audience_fit,
      watch_recommendation: derived.watch_recommendation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', movieId);
  
  if (updateError) {
    console.error(`Failed to update movie ${movieId}:`, updateError);
    return null;
  }
  
  return derived;
}

/**
 * Batch apply derived tags to all movies
 */
export async function batchApplyDerivedTags(options: {
  limit?: number;
  onlyMissing?: boolean;
}): Promise<{ processed: number; failed: number }> {
  const supabase = getSupabaseClient();
  const limit = options.limit || 100;
  
  let query = supabase
    .from('movies')
    .select('id, title_en, release_year, genres, avg_rating, total_reviews, tmdb_rating, imdb_rating, popularity_score, is_blockbuster, is_classic, is_underrated, awards, content_flags, overview, tagline')
    .eq('is_published', true)
    .order('updated_at', { ascending: true })
    .limit(limit);
  
  // Only movies without mood_tags if onlyMissing
  if (options.onlyMissing) {
    query = query.is('mood_tags', null);
  }
  
  const { data: movies, error } = await query;
  
  if (error) {
    console.error('Failed to fetch movies:', error);
    return { processed: 0, failed: 0 };
  }
  
  let processed = 0;
  let failed = 0;
  
  for (const movie of movies || []) {
    const result = await applyDerivedTags(movie.id);
    if (result) {
      processed++;
      console.log(`✅ Tagged: ${movie.title_en} - ${result.mood_tags.join(', ')}`);
    } else {
      failed++;
    }
  }
  
  return { processed, failed };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  BOX_OFFICE_RULES,
  MOOD_RULES,
  QUALITY_RULES,
  AUDIENCE_RULES,
};

