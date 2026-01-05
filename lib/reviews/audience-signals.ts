/**
 * AUDIENCE SIGNALS DERIVATION MODULE
 * 
 * Automatically derives audience signals for movies based on:
 * - Genre analysis
 * - Rating and content indicators
 * - Trigger warning detection
 * - Watch platform recommendation
 * 
 * These signals help users decide:
 * - Who should watch (family, youth, etc.)
 * - How to watch (theater, OTT)
 * - What to expect (trigger warnings)
 * - When to watch (best time/setting)
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export type AgeRating = 'U' | 'U/A' | 'A' | 'S';
export type TriggerWarning = 
  | 'violence' 
  | 'death' 
  | 'trauma' 
  | 'abuse' 
  | 'substance-use'
  | 'suicide'
  | 'sexual-content'
  | 'gore'
  | 'disturbing-imagery'
  | 'animal-harm';

export type MoodTag = 
  | 'feel-good'
  | 'dark-intense'
  | 'thought-provoking'
  | 'patriotic'
  | 'nostalgic'
  | 'inspirational'
  | 'emotional'
  | 'gripping'
  | 'light-hearted'
  | 'edge-of-seat';

export type BestTimeToWatch = 'weekend' | 'evening' | 'any';
export type WatchPlatform = 'theater-must' | 'theater-preferred' | 'ott-friendly' | 'any';

export interface AudienceSignals {
  age_rating: AgeRating;
  kids_friendly: boolean;
  family_watch: boolean;
  date_movie: boolean;
  group_watch: boolean;
  solo_watch: boolean;
  theater_recommended: boolean;
  ott_recommended: boolean;
  trigger_warnings: TriggerWarning[];
  mood_tags: MoodTag[];
  best_time_to_watch: BestTimeToWatch;
  watch_platform: WatchPlatform;
  // Confidence for each signal
  confidence: {
    age_rating: number;
    audience_fit: number;
    trigger_warnings: number;
    mood: number;
  };
}

export interface Movie {
  id: string;
  title_en: string;
  genres?: string[];
  release_year?: number;
  avg_rating?: number;
  runtime_minutes?: number;
  overview?: string;
  tagline?: string;
  keywords?: string[];
  is_blockbuster?: boolean;
  age_rating?: AgeRating;
}

export interface ReviewDimensions {
  emotional_impact?: { score: number };
  comedy_timing?: { score: number };
  action_choreography?: { score: number };
  vfx_special_effects?: { score: number };
}

// ============================================================
// GENRE-BASED RULES
// ============================================================

const AGE_RATING_RULES: Record<string, { rating: AgeRating; confidence: number }> = {
  Horror: { rating: 'A', confidence: 0.85 },
  Crime: { rating: 'A', confidence: 0.75 },
  Thriller: { rating: 'U/A', confidence: 0.70 },
  War: { rating: 'U/A', confidence: 0.80 },
  Action: { rating: 'U/A', confidence: 0.65 },
  Drama: { rating: 'U/A', confidence: 0.50 },
  Romance: { rating: 'U/A', confidence: 0.55 },
  Comedy: { rating: 'U', confidence: 0.60 },
  Family: { rating: 'U', confidence: 0.90 },
  Animation: { rating: 'U', confidence: 0.95 },
  Kids: { rating: 'U', confidence: 0.95 },
};

const TRIGGER_WARNING_KEYWORDS: Record<TriggerWarning, string[]> = {
  'violence': ['violent', 'fight', 'murder', 'kill', 'blood', 'brutal', 'attack'],
  'death': ['death', 'dies', 'dead', 'funeral', 'suicide', 'murder'],
  'trauma': ['trauma', 'abuse', 'torture', 'victim', 'survivor'],
  'abuse': ['abuse', 'domestic', 'assault', 'harassment'],
  'substance-use': ['alcohol', 'drugs', 'addiction', 'drunk', 'smoking'],
  'suicide': ['suicide', 'self-harm', 'kill himself', 'kill herself'],
  'sexual-content': ['sexual', 'explicit', 'nude', 'intimate'],
  'gore': ['gore', 'bloody', 'gruesome', 'dismember'],
  'disturbing-imagery': ['disturbing', 'graphic', 'intense scenes'],
  'animal-harm': ['animal death', 'animal cruelty'],
};

const MOOD_GENRE_MAP: Record<string, MoodTag[]> = {
  Comedy: ['feel-good', 'light-hearted'],
  Family: ['feel-good', 'emotional'],
  Romance: ['emotional', 'feel-good'],
  Drama: ['emotional', 'thought-provoking'],
  Thriller: ['gripping', 'edge-of-seat', 'dark-intense'],
  Horror: ['dark-intense', 'edge-of-seat'],
  Action: ['edge-of-seat', 'gripping'],
  War: ['patriotic', 'emotional'],
  Historical: ['patriotic', 'nostalgic'],
  Biography: ['inspirational', 'thought-provoking'],
  Crime: ['dark-intense', 'gripping'],
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
 * Derive age rating from genres and content
 */
export function deriveAgeRating(movie: Movie): { rating: AgeRating; confidence: number } {
  const genres = movie.genres || [];
  
  // If already set, return it with high confidence
  if (movie.age_rating) {
    return { rating: movie.age_rating, confidence: 1.0 };
  }
  
  // Check each genre and pick the most restrictive
  let mostRestrictive: AgeRating = 'U';
  let highestConfidence = 0.5;
  
  for (const genre of genres) {
    const rule = AGE_RATING_RULES[genre];
    if (rule) {
      const restrictionLevel = { 'U': 0, 'U/A': 1, 'A': 2, 'S': 3 };
      if (restrictionLevel[rule.rating] > restrictionLevel[mostRestrictive]) {
        mostRestrictive = rule.rating;
        highestConfidence = rule.confidence;
      }
    }
  }
  
  // Content-based adjustments from overview/tagline
  const content = `${movie.overview || ''} ${movie.tagline || ''}`.toLowerCase();
  
  if (content.includes('murder') || content.includes('violence') || content.includes('crime')) {
    if (mostRestrictive === 'U') {
      mostRestrictive = 'U/A';
      highestConfidence = 0.70;
    }
  }
  
  if (content.includes('horror') || content.includes('terror') || content.includes('blood')) {
    mostRestrictive = 'A';
    highestConfidence = 0.80;
  }
  
  return { rating: mostRestrictive, confidence: highestConfidence };
}

/**
 * Derive audience fit signals
 */
export function deriveAudienceFit(movie: Movie): {
  kids_friendly: boolean;
  family_watch: boolean;
  date_movie: boolean;
  group_watch: boolean;
  solo_watch: boolean;
  confidence: number;
} {
  const genres = movie.genres || [];
  const rating = movie.avg_rating || 0;
  
  // Kids friendly - safe genres, no violence
  const safeGenres = ['Family', 'Animation', 'Comedy'];
  const unsafeGenres = ['Horror', 'Crime', 'Thriller', 'War', 'Action'];
  
  const hasSafe = safeGenres.some(g => genres.includes(g));
  const hasUnsafe = unsafeGenres.some(g => genres.includes(g));
  
  const kids_friendly = hasSafe && !hasUnsafe;
  
  // Family watch - broad appeal, not too dark
  const familyGenres = ['Family', 'Drama', 'Comedy', 'Romance'];
  const hasFamilyGenre = familyGenres.some(g => genres.includes(g));
  const family_watch = hasFamilyGenre && !genres.includes('Horror');
  
  // Date movie - romance or comedy, not too intense
  const dateGenres = ['Romance', 'Comedy', 'Drama'];
  const notDateGenres = ['Horror', 'War', 'Crime'];
  const hasDateGenre = dateGenres.some(g => genres.includes(g));
  const hasNotDate = notDateGenres.some(g => genres.includes(g));
  const date_movie = hasDateGenre && !hasNotDate;
  
  // Group watch - action, comedy, thriller
  const groupGenres = ['Action', 'Comedy', 'Horror', 'Thriller'];
  const group_watch = groupGenres.some(g => genres.includes(g));
  
  // Solo watch - drama, thriller, mystery
  const soloGenres = ['Drama', 'Thriller', 'Mystery', 'Documentary'];
  const solo_watch = soloGenres.some(g => genres.includes(g));
  
  // Confidence based on how clear the signals are
  let confidence = 0.6;
  if (genres.length >= 2) confidence += 0.1;
  if (rating >= 7) confidence += 0.1;
  if (hasSafe || hasUnsafe) confidence += 0.1;
  
  return {
    kids_friendly,
    family_watch,
    date_movie,
    group_watch,
    solo_watch,
    confidence: Math.min(1, confidence),
  };
}

/**
 * Derive trigger warnings from content and genres
 */
export function deriveTriggerWarnings(movie: Movie): {
  warnings: TriggerWarning[];
  confidence: number;
} {
  const genres = movie.genres || [];
  const content = `${movie.overview || ''} ${movie.tagline || ''} ${(movie.keywords || []).join(' ')}`.toLowerCase();
  
  const warnings: TriggerWarning[] = [];
  let matchCount = 0;
  
  // Genre-based warnings
  if (genres.includes('Horror')) {
    warnings.push('violence', 'disturbing-imagery');
    matchCount += 2;
  }
  if (genres.includes('Crime') || genres.includes('Thriller')) {
    warnings.push('violence');
    matchCount += 1;
  }
  if (genres.includes('War')) {
    warnings.push('violence', 'death');
    matchCount += 2;
  }
  
  // Keyword-based warnings
  for (const [warning, keywords] of Object.entries(TRIGGER_WARNING_KEYWORDS)) {
    if (keywords.some(kw => content.includes(kw))) {
      if (!warnings.includes(warning as TriggerWarning)) {
        warnings.push(warning as TriggerWarning);
        matchCount += 1;
      }
    }
  }
  
  // Deduplicate
  const uniqueWarnings = [...new Set(warnings)];
  
  // Confidence based on match quality
  const confidence = Math.min(1, 0.5 + (matchCount * 0.1));
  
  return {
    warnings: uniqueWarnings,
    confidence,
  };
}

/**
 * Derive mood tags from genres and rating
 */
export function deriveMoodTags(movie: Movie, dimensions?: ReviewDimensions): {
  moods: MoodTag[];
  confidence: number;
} {
  const genres = movie.genres || [];
  const rating = movie.avg_rating || 0;
  const year = movie.release_year || new Date().getFullYear();
  
  const moods: MoodTag[] = [];
  
  // Genre-based moods
  for (const genre of genres) {
    const genreMoods = MOOD_GENRE_MAP[genre];
    if (genreMoods) {
      moods.push(...genreMoods);
    }
  }
  
  // Rating-based moods
  if (rating >= 7.5 && genres.includes('Drama')) {
    moods.push('thought-provoking');
  }
  
  // Nostalgic for older films
  if (year <= 2000) {
    moods.push('nostalgic');
  }
  
  // Inspirational for biopics and sports
  if (genres.includes('Biography') || genres.includes('Sport')) {
    moods.push('inspirational');
  }
  
  // Dimension-based moods
  if (dimensions) {
    if (dimensions.emotional_impact && dimensions.emotional_impact.score >= 8) {
      moods.push('emotional');
    }
    if (dimensions.comedy_timing && dimensions.comedy_timing.score >= 8) {
      moods.push('light-hearted');
    }
    if (dimensions.action_choreography && dimensions.action_choreography.score >= 8) {
      moods.push('edge-of-seat');
    }
  }
  
  // Deduplicate
  const uniqueMoods = [...new Set(moods)];
  
  // Confidence
  const confidence = Math.min(1, 0.6 + (genres.length * 0.05) + (uniqueMoods.length * 0.05));
  
  return {
    moods: uniqueMoods.slice(0, 4), // Max 4 moods
    confidence,
  };
}

/**
 * Derive watch platform recommendation
 */
export function deriveWatchPlatform(movie: Movie): {
  platform: WatchPlatform;
  theater_recommended: boolean;
  ott_recommended: boolean;
  best_time: BestTimeToWatch;
} {
  const genres = movie.genres || [];
  const rating = movie.avg_rating || 0;
  const runtime = movie.runtime_minutes || 140;
  const isBlockbuster = movie.is_blockbuster || false;
  
  let platform: WatchPlatform = 'any';
  let theater_recommended = false;
  let ott_recommended = true;
  let best_time: BestTimeToWatch = 'any';
  
  // Theater-must for big spectacles
  if (genres.includes('Action') || genres.includes('Fantasy')) {
    if (rating >= 7.5 || isBlockbuster) {
      platform = 'theater-must';
      theater_recommended = true;
      best_time = 'weekend';
    } else {
      platform = 'theater-preferred';
      theater_recommended = true;
    }
  }
  
  // Horror is great in theaters
  if (genres.includes('Horror')) {
    platform = 'theater-preferred';
    theater_recommended = true;
    best_time = 'evening';
  }
  
  // Drama and romance work fine on OTT
  if (genres.includes('Drama') || genres.includes('Romance')) {
    if (!genres.includes('Action')) {
      platform = 'ott-friendly';
      ott_recommended = true;
      theater_recommended = rating >= 8;
    }
  }
  
  // Comedy works anywhere
  if (genres.includes('Comedy') && !genres.includes('Action')) {
    platform = 'any';
    best_time = 'any';
  }
  
  // Long movies better for weekend
  if (runtime >= 160) {
    best_time = 'weekend';
  }
  
  return {
    platform,
    theater_recommended,
    ott_recommended,
    best_time,
  };
}

/**
 * Derive all audience signals for a movie
 */
export function deriveAudienceSignals(
  movie: Movie, 
  dimensions?: ReviewDimensions
): AudienceSignals {
  const ageRating = deriveAgeRating(movie);
  const audienceFit = deriveAudienceFit(movie);
  const triggerWarnings = deriveTriggerWarnings(movie);
  const moodTags = deriveMoodTags(movie, dimensions);
  const watchPlatform = deriveWatchPlatform(movie);
  
  return {
    age_rating: ageRating.rating,
    kids_friendly: audienceFit.kids_friendly,
    family_watch: audienceFit.family_watch,
    date_movie: audienceFit.date_movie,
    group_watch: audienceFit.group_watch,
    solo_watch: audienceFit.solo_watch,
    theater_recommended: watchPlatform.theater_recommended,
    ott_recommended: watchPlatform.ott_recommended,
    trigger_warnings: triggerWarnings.warnings,
    mood_tags: moodTags.moods,
    best_time_to_watch: watchPlatform.best_time,
    watch_platform: watchPlatform.platform,
    confidence: {
      age_rating: ageRating.confidence,
      audience_fit: audienceFit.confidence,
      trigger_warnings: triggerWarnings.confidence,
      mood: moodTags.confidence,
    },
  };
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================

/**
 * Apply audience signals to a movie review
 */
export async function applyAudienceSignals(
  movieId: string,
  dimensions?: ReviewDimensions
): Promise<AudienceSignals | null> {
  const supabase = getSupabaseClient();
  
  // Fetch movie
  const { data: movie, error } = await supabase
    .from('movies')
    .select('id, title_en, genres, release_year, avg_rating, runtime_minutes, overview, tagline, tags, is_blockbuster, age_rating')
    .eq('id', movieId)
    .single();
  
  if (error || !movie) {
    console.error(`Failed to fetch movie ${movieId}:`, error);
    return null;
  }
  
  // Derive signals
  const signals = deriveAudienceSignals(
    {
      ...movie,
      keywords: movie.tags,
    } as Movie,
    dimensions
  );
  
  // Update movie_reviews with signals
  const { error: updateError } = await supabase
    .from('movie_reviews')
    .update({
      audience_signals: signals,
      updated_at: new Date().toISOString(),
    })
    .eq('movie_id', movieId);
  
  if (updateError) {
    console.error(`Failed to update review for ${movieId}:`, updateError);
    return null;
  }
  
  return signals;
}

/**
 * Batch apply audience signals
 */
export async function batchApplyAudienceSignals(options: {
  limit?: number;
  onlyMissing?: boolean;
}): Promise<{ processed: number; failed: number }> {
  const supabase = getSupabaseClient();
  const limit = options.limit || 100;
  
  // Fetch movies with reviews but no audience signals
  let query = supabase
    .from('movie_reviews')
    .select('movie_id')
    .order('updated_at', { ascending: true })
    .limit(limit);
  
  if (options.onlyMissing) {
    query = query.is('audience_signals', null);
  }
  
  const { data: reviews, error } = await query;
  
  if (error || !reviews) {
    console.error('Failed to fetch reviews:', error);
    return { processed: 0, failed: 0 };
  }
  
  let processed = 0;
  let failed = 0;
  
  for (const review of reviews) {
    const result = await applyAudienceSignals(review.movie_id);
    if (result) {
      processed++;
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
  AGE_RATING_RULES,
  TRIGGER_WARNING_KEYWORDS,
  MOOD_GENRE_MAP,
};

