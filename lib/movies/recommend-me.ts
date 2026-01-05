/**
 * RECOMMEND ME - Preference-Based Movie Recommendations
 * 
 * Thin orchestration layer that:
 * - Accepts optional user preferences (languages, genres, moods, era, toggles)
 * - Builds dynamic Supabase queries using existing patterns from similarity-engine
 * - Returns grouped sections for display in carousels
 * - Implements progressive relaxation when results are sparse
 * 
 * REUSES existing systems:
 * - similarity-engine.ts patterns and scoring
 * - audience-signals.ts mood types
 * - SimilarSection structure for UI compatibility
 */

import { createClient } from '@supabase/supabase-js';
import type { SimilarSection, SimilarMovie } from './similarity-engine';

// ============================================================
// TYPES
// ============================================================

export type MoodPreference = 
  | 'feel-good'
  | 'intense'
  | 'emotional'
  | 'inspirational'
  | 'light-hearted'
  | 'dark'
  | 'mass'
  | 'thought-provoking';

export type EraPreference = '90s' | '2000s' | '2010s' | 'recent' | 'classics';

export interface RecommendMePreferences {
  languages?: string[];
  genres?: string[];
  moods?: MoodPreference[];
  era?: EraPreference[];
  familyFriendly?: boolean;
  blockbustersOnly?: boolean;
  hiddenGems?: boolean;
  highlyRatedOnly?: boolean;
  criticsChoice?: boolean;
  // Optional: pre-fill from current movie context
  excludeMovieId?: string;
}

// Configuration
const MIN_MOVIES_FOR_SECTION = 3;
const MAX_SECTIONS = 8;
const MOVIES_PER_SECTION = 8;
const MIN_TOTAL_MOVIES = 30;

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Base query fields - reused from similarity-engine
const MOVIE_SELECT_FIELDS = `
  id, title_en, title_te, slug, poster_url, avg_rating, our_rating,
  release_year, runtime_minutes, genres, director, hero, heroine, music_director,
  is_blockbuster, is_classic, is_underrated, language
`;

// ============================================================
// YEAR RANGE HELPERS
// ============================================================

function getYearRangeForEra(era: EraPreference): { from: number; to: number } {
  const currentYear = new Date().getFullYear();
  switch (era) {
    case '90s':
      return { from: 1990, to: 1999 };
    case '2000s':
      return { from: 2000, to: 2009 };
    case '2010s':
      return { from: 2010, to: 2019 };
    case 'recent':
      return { from: 2020, to: currentYear + 1 };
    case 'classics':
      return { from: 1950, to: 1999 };
    default:
      return { from: 1950, to: currentYear + 1 };
  }
}

// ============================================================
// QUERY BUILDERS (Parallel Execution)
// ============================================================

async function queryByGenre(
  genre: string,
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .not('poster_url', 'is', null)
    .contains('genres', [genre]);

  // Apply language filter
  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }

  // Apply era filters
  if (prefs.era && prefs.era.length > 0) {
    const yearRanges = prefs.era.map(getYearRangeForEra);
    const minYear = Math.min(...yearRanges.map(r => r.from));
    const maxYear = Math.max(...yearRanges.map(r => r.to));
    query = query.gte('release_year', minYear).lte('release_year', maxYear);
  }

  // Apply tag filters
  if (prefs.blockbustersOnly) {
    query = query.eq('is_blockbuster', true);
  }
  if (prefs.hiddenGems) {
    query = query.eq('is_underrated', true);
  }
  if (prefs.highlyRatedOnly || prefs.criticsChoice) {
    query = query.gte('avg_rating', 7.0);
  }

  // Exclude current movie if provided
  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryByLanguage(
  language: string,
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION * 2
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', language)
    .not('poster_url', 'is', null);

  // Apply genre filters
  if (prefs.genres && prefs.genres.length > 0) {
    query = query.overlaps('genres', prefs.genres);
  }

  // Apply era filters
  if (prefs.era && prefs.era.length > 0) {
    const yearRanges = prefs.era.map(getYearRangeForEra);
    const minYear = Math.min(...yearRanges.map(r => r.from));
    const maxYear = Math.max(...yearRanges.map(r => r.to));
    query = query.gte('release_year', minYear).lte('release_year', maxYear);
  }

  // Apply tag filters
  if (prefs.blockbustersOnly) {
    query = query.eq('is_blockbuster', true);
  }
  if (prefs.hiddenGems) {
    query = query.eq('is_underrated', true);
  }
  if (prefs.highlyRatedOnly || prefs.criticsChoice) {
    query = query.gte('avg_rating', 7.0);
  }

  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryByEra(
  era: EraPreference,
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  const { from, to } = getYearRangeForEra(era);

  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .not('poster_url', 'is', null)
    .gte('release_year', from)
    .lte('release_year', to);

  // Apply language filter
  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }

  // Apply genre filters
  if (prefs.genres && prefs.genres.length > 0) {
    query = query.overlaps('genres', prefs.genres);
  }

  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryBlockbusters(
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('is_blockbuster', true)
    .not('poster_url', 'is', null);

  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }
  if (prefs.genres && prefs.genres.length > 0) {
    query = query.overlaps('genres', prefs.genres);
  }
  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryHiddenGems(
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('is_underrated', true)
    .not('poster_url', 'is', null);

  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }
  if (prefs.genres && prefs.genres.length > 0) {
    query = query.overlaps('genres', prefs.genres);
  }
  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryClassics(
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('is_classic', true)
    .not('poster_url', 'is', null);

  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }
  if (prefs.genres && prefs.genres.length > 0) {
    query = query.overlaps('genres', prefs.genres);
  }
  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryHighlyRated(
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .gte('avg_rating', 7.5)
    .not('poster_url', 'is', null);

  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }
  if (prefs.genres && prefs.genres.length > 0) {
    query = query.overlaps('genres', prefs.genres);
  }
  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryRecentReleases(
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION
): Promise<SimilarMovie[]> {
  const currentYear = new Date().getFullYear();
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .gte('release_year', currentYear - 2)
    .not('poster_url', 'is', null);

  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }
  if (prefs.genres && prefs.genres.length > 0) {
    query = query.overlaps('genres', prefs.genres);
  }
  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('release_year', { ascending: false })
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

async function queryFallbackTopRated(
  prefs: RecommendMePreferences,
  limit: number = MOVIES_PER_SECTION * 2
): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .not('poster_url', 'is', null)
    .gte('avg_rating', 6.0);

  if (prefs.languages && prefs.languages.length > 0) {
    query = query.in('language', prefs.languages);
  }
  if (prefs.excludeMovieId) {
    query = query.neq('id', prefs.excludeMovieId);
  }

  const { data } = await query
    .order('avg_rating', { ascending: false })
    .limit(limit);

  return data || [];
}

// ============================================================
// MOOD MATCHING (Using Genre Approximation)
// ============================================================

function getMoodGenres(mood: MoodPreference): string[] {
  const moodGenreMap: Record<MoodPreference, string[]> = {
    'feel-good': ['Comedy', 'Family', 'Romance'],
    'intense': ['Action', 'Thriller', 'Crime'],
    'emotional': ['Drama', 'Romance', 'Family'],
    'inspirational': ['Drama', 'Biography', 'Sports'],
    'light-hearted': ['Comedy', 'Romance', 'Family'],
    'dark': ['Thriller', 'Crime', 'Horror'],
    'mass': ['Action', 'Drama'],
    'thought-provoking': ['Drama', 'Mystery', 'Crime'],
  };
  return moodGenreMap[mood] || [];
}

// ============================================================
// SECTION BUILDER
// ============================================================

function buildSection(
  id: string,
  title: string,
  subtitle: string,
  movies: SimilarMovie[],
  matchType: SimilarSection['matchType'],
  priority: number,
  usedIds: Set<string>
): SimilarSection | null {
  // Filter out already-used movies
  const uniqueMovies = movies.filter(m => !usedIds.has(m.id));
  
  if (uniqueMovies.length < MIN_MOVIES_FOR_SECTION) {
    return null;
  }

  // Mark these movies as used
  const sectionMovies = uniqueMovies.slice(0, MOVIES_PER_SECTION);
  sectionMovies.forEach(m => usedIds.add(m.id));

  return {
    id,
    title,
    subtitle,
    movies: sectionMovies,
    matchType,
    priority,
  };
}

// ============================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================

export async function getRecommendations(
  prefs: RecommendMePreferences = {}
): Promise<SimilarSection[]> {
  const sections: SimilarSection[] = [];
  const usedMovieIds = new Set<string>();

  // Determine effective languages (default to Telugu if none selected)
  const effectiveLanguages = prefs.languages && prefs.languages.length > 0
    ? prefs.languages
    : ['Telugu'];

  // Build parallel queries based on preferences
  const queryPromises: Promise<{ type: string; key: string; movies: SimilarMovie[] }>[] = [];

  // Query by each selected genre
  if (prefs.genres && prefs.genres.length > 0) {
    prefs.genres.forEach(genre => {
      queryPromises.push(
        queryByGenre(genre, prefs).then(movies => ({ type: 'genre', key: genre, movies }))
      );
    });
  }

  // Query by each selected era
  if (prefs.era && prefs.era.length > 0) {
    prefs.era.forEach(era => {
      queryPromises.push(
        queryByEra(era, prefs).then(movies => ({ type: 'era', key: era, movies }))
      );
    });
  }

  // Query by mood-derived genres
  if (prefs.moods && prefs.moods.length > 0) {
    prefs.moods.forEach(mood => {
      const moodGenres = getMoodGenres(mood);
      if (moodGenres.length > 0) {
        queryPromises.push(
          queryByGenre(moodGenres[0], { ...prefs, genres: moodGenres }).then(
            movies => ({ type: 'mood', key: mood, movies })
          )
        );
      }
    });
  }

  // Always query these for fallback sections
  queryPromises.push(
    queryHighlyRated(prefs).then(movies => ({ type: 'rating', key: 'highly-rated', movies }))
  );
  queryPromises.push(
    queryRecentReleases(prefs).then(movies => ({ type: 'recent', key: 'recent', movies }))
  );

  // Conditional section queries
  if (prefs.blockbustersOnly || !prefs.hiddenGems) {
    queryPromises.push(
      queryBlockbusters(prefs).then(movies => ({ type: 'blockbusters', key: 'blockbusters', movies }))
    );
  }
  if (prefs.hiddenGems || !prefs.blockbustersOnly) {
    queryPromises.push(
      queryHiddenGems(prefs).then(movies => ({ type: 'tags', key: 'hidden-gems', movies }))
    );
  }
  if (prefs.era?.includes('classics') || (!prefs.era || prefs.era.length === 0)) {
    queryPromises.push(
      queryClassics(prefs).then(movies => ({ type: 'classics', key: 'classics', movies }))
    );
  }

  // Fallback query for top rated
  queryPromises.push(
    queryFallbackTopRated(prefs).then(movies => ({ type: 'fallback', key: 'top-rated', movies }))
  );

  // Execute all queries in parallel
  const results = await Promise.all(queryPromises);

  // Build "Perfect Matches" section from combined highest-rated across all results
  const allMovies = results.flatMap(r => r.movies);
  const uniqueAllMovies = Array.from(
    new Map(allMovies.map(m => [m.id, m])).values()
  ).sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));

  const perfectMatchSection = buildSection(
    'perfect-matches',
    'Perfect For You',
    'Based on your preferences',
    uniqueAllMovies,
    'best',
    100,
    usedMovieIds
  );
  if (perfectMatchSection) {
    sections.push(perfectMatchSection);
  }

  // Build genre sections
  const genreResults = results.filter(r => r.type === 'genre');
  genreResults.forEach((result, index) => {
    const section = buildSection(
      `genre-${result.key}`,
      `${result.key} Movies`,
      'Matching your taste',
      result.movies,
      'genre',
      90 - index,
      usedMovieIds
    );
    if (section) sections.push(section);
  });

  // Build mood sections
  const moodResults = results.filter(r => r.type === 'mood');
  const moodTitles: Record<string, string> = {
    'feel-good': 'Feel-Good Vibes',
    'intense': 'Intense & Gripping',
    'emotional': 'Emotional Journeys',
    'inspirational': 'Inspirational Stories',
    'light-hearted': 'Light & Fun',
    'dark': 'Dark & Thrilling',
    'mass': 'Mass Entertainers',
    'thought-provoking': 'Mind-Bending',
  };
  moodResults.forEach((result, index) => {
    const section = buildSection(
      `mood-${result.key}`,
      moodTitles[result.key] || result.key,
      'Mood match',
      result.movies,
      'tags',
      80 - index,
      usedMovieIds
    );
    if (section) sections.push(section);
  });

  // Build era sections
  const eraResults = results.filter(r => r.type === 'era');
  const eraTitles: Record<string, string> = {
    '90s': '90s Nostalgia',
    '2000s': '2000s Hits',
    '2010s': '2010s Favorites',
    'recent': 'Recent Releases',
    'classics': 'Timeless Classics',
  };
  eraResults.forEach((result, index) => {
    const section = buildSection(
      `era-${result.key}`,
      eraTitles[result.key] || result.key,
      'From this era',
      result.movies,
      'era',
      70 - index,
      usedMovieIds
    );
    if (section) sections.push(section);
  });

  // Build special sections (blockbusters, hidden gems, classics)
  const blockbusterResult = results.find(r => r.key === 'blockbusters');
  if (blockbusterResult) {
    const section = buildSection(
      'blockbusters',
      'Blockbuster Hits',
      'Box office champions',
      blockbusterResult.movies,
      'blockbusters',
      60,
      usedMovieIds
    );
    if (section) sections.push(section);
  }

  const hiddenGemsResult = results.find(r => r.key === 'hidden-gems');
  if (hiddenGemsResult) {
    const section = buildSection(
      'hidden-gems',
      'Hidden Gems',
      'Underrated picks',
      hiddenGemsResult.movies,
      'tags',
      55,
      usedMovieIds
    );
    if (section) sections.push(section);
  }

  const classicsResult = results.find(r => r.key === 'classics');
  if (classicsResult) {
    const section = buildSection(
      'classics',
      'Timeless Classics',
      'Evergreen favorites',
      classicsResult.movies,
      'classics',
      50,
      usedMovieIds
    );
    if (section) sections.push(section);
  }

  // Build rating section
  const ratingResult = results.find(r => r.key === 'highly-rated');
  if (ratingResult) {
    const section = buildSection(
      'highly-rated',
      "Critics' Favorites",
      'Highly rated picks',
      ratingResult.movies,
      'rating',
      45,
      usedMovieIds
    );
    if (section) sections.push(section);
  }

  // Build recent section
  const recentResult = results.find(r => r.key === 'recent');
  if (recentResult) {
    const section = buildSection(
      'recent-releases',
      'Recent Releases',
      'Fresh from theaters',
      recentResult.movies,
      'recent',
      40,
      usedMovieIds
    );
    if (section) sections.push(section);
  }

  // Fallback: ensure minimum sections
  if (sections.length < 3) {
    const fallbackResult = results.find(r => r.key === 'top-rated');
    if (fallbackResult) {
      const section = buildSection(
        'top-rated-fallback',
        'Top Rated Movies',
        'Highly recommended',
        fallbackResult.movies,
        'rating',
        30,
        usedMovieIds
      );
      if (section) sections.push(section);
    }
  }

  // Sort by priority and limit to MAX_SECTIONS
  sections.sort((a, b) => b.priority - a.priority);

  return sections.slice(0, MAX_SECTIONS);
}

