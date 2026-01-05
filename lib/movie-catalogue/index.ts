/**
 * Telugu Movie Catalogue - Main Service
 * Combines Wikidata and TMDB sources with deduplication and linking
 */

import { createClient } from '@supabase/supabase-js';
import {
  ingestAllTeluguFilms,
  ingestFilmsByDecade,
  linkMoviesToPersons,
  getCatalogueStats
} from './wikidata-movies';
import {
  ingestMoviesByYear,
  ingestMoviesByYearRange,
  enrichMoviesWithTMDB,
  getUpcomingTeluguMovies,
  getPopularTeluguMovies,
  getNowPlayingTeluguMovies,
} from './tmdb-movies';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// DEDUPLICATION LOGIC
// ============================================================

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(the|a|an)\b/g, '')
    .trim();
}

/**
 * Calculate title similarity using Levenshtein distance
 */
function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);

  if (normA === normB) return 1;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;

  // Simple character-based similarity
  let matches = 0;
  const shorter = normA.length < normB.length ? normA : normB;
  const longer = normA.length < normB.length ? normB : normA;

  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }

  return matches / maxLen;
}

/**
 * Find potential duplicate movies
 */
export async function findDuplicates(): Promise<{
  duplicates: Array<{
    movie1: { id: string; title: string; year: number; source: string };
    movie2: { id: string; title: string; year: number; source: string };
    similarity: number;
  }>;
}> {
  const { data: movies } = await supabase
    .from('catalogue_movies')
    .select('id, title_en, release_year, source, wikidata_id, tmdb_id')
    .order('release_year', { ascending: true });

  if (!movies) return { duplicates: [] };

  const duplicates: Array<{
    movie1: { id: string; title: string; year: number; source: string };
    movie2: { id: string; title: string; year: number; source: string };
    similarity: number;
  }> = [];

  // Group by year for efficient comparison
  const byYear: Record<number, typeof movies> = {};
  for (const movie of movies) {
    if (!movie.release_year) continue;
    if (!byYear[movie.release_year]) byYear[movie.release_year] = [];
    byYear[movie.release_year].push(movie);
  }

  // Compare movies within same year
  for (const [year, yearMovies] of Object.entries(byYear)) {
    for (let i = 0; i < yearMovies.length; i++) {
      for (let j = i + 1; j < yearMovies.length; j++) {
        const movie1 = yearMovies[i];
        const movie2 = yearMovies[j];

        // Skip if already linked
        if (movie1.wikidata_id && movie2.wikidata_id &&
            movie1.wikidata_id === movie2.wikidata_id) continue;
        if (movie1.tmdb_id && movie2.tmdb_id &&
            movie1.tmdb_id === movie2.tmdb_id) continue;

        const similarity = calculateSimilarity(movie1.title_en, movie2.title_en);

        if (similarity > 0.8) {
          duplicates.push({
            movie1: {
              id: movie1.id,
              title: movie1.title_en,
              year: movie1.release_year!,
              source: movie1.source,
            },
            movie2: {
              id: movie2.id,
              title: movie2.title_en,
              year: movie2.release_year!,
              source: movie2.source,
            },
            similarity,
          });
        }
      }
    }
  }

  return { duplicates };
}

/**
 * Merge duplicate movies
 * Keeps the movie with more data, updates references
 */
export async function mergeDuplicates(
  keepId: string,
  removeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get both movies
    const { data: keepMovie } = await supabase
      .from('catalogue_movies')
      .select('*')
      .eq('id', keepId)
      .single();

    const { data: removeMovie } = await supabase
      .from('catalogue_movies')
      .select('*')
      .eq('id', removeId)
      .single();

    if (!keepMovie || !removeMovie) {
      return { success: false, error: 'Movie not found' };
    }

    // Merge data - prefer non-null values
    const mergedData: Record<string, any> = {};

    const fieldsToMerge = [
      'title_te', 'synopsis', 'synopsis_te', 'tagline', 'runtime_minutes',
      'poster_url', 'backdrop_url', 'trailer_url', 'tmdb_rating', 'imdb_rating',
      'budget_inr_crores', 'worldwide_gross_inr_crores', 'verdict',
      'wikidata_id', 'tmdb_id', 'imdb_id',
    ];

    for (const field of fieldsToMerge) {
      if (!keepMovie[field] && removeMovie[field]) {
        mergedData[field] = removeMovie[field];
      }
    }

    // Merge arrays
    const arrayFields = [
      'director_names', 'hero_names', 'heroine_names', 'genres', 'aliases',
      'production_companies', 'ott_platforms',
    ];

    for (const field of arrayFields) {
      const keepArr = keepMovie[field] || [];
      const removeArr = removeMovie[field] || [];
      const merged = [...new Set([...keepArr, ...removeArr])];
      if (merged.length > keepArr.length) {
        mergedData[field] = merged;
      }
    }

    // Merge source refs
    const sourceRefs = [
      ...(keepMovie.source_refs || []),
      ...(removeMovie.source_refs || []),
      { merged_from: removeId, merged_at: new Date().toISOString() },
    ];
    mergedData.source_refs = sourceRefs;

    // Update keep movie with merged data
    if (Object.keys(mergedData).length > 0) {
      await supabase
        .from('catalogue_movies')
        .update(mergedData)
        .eq('id', keepId);
    }

    // Update credits to point to keep movie
    await supabase
      .from('movie_credits')
      .update({ movie_id: keepId })
      .eq('movie_id', removeId);

    // Update box office records
    await supabase
      .from('movie_box_office')
      .update({ movie_id: keepId })
      .eq('movie_id', removeId);

    // Update awards
    await supabase
      .from('movie_awards')
      .update({ movie_id: keepId })
      .eq('movie_id', removeId);

    // Delete duplicate
    await supabase
      .from('catalogue_movies')
      .delete()
      .eq('id', removeId);

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

// ============================================================
// STATS & ANALYTICS
// ============================================================

/**
 * Get comprehensive catalogue statistics
 */
export async function getFullCatalogueStats(): Promise<{
  total_movies: number;
  by_decade: Record<string, number>;
  by_era: Record<string, number>;
  by_verdict: Record<string, number>;
  with_wikidata: number;
  with_tmdb: number;
  with_poster: number;
  with_rating: number;
  avg_rating: number;
  total_gross_crores: number;
}> {
  const { data: movies } = await supabase
    .from('catalogue_movies')
    .select(`
      release_decade, era, verdict,
      wikidata_id, tmdb_id,
      poster_url, tmdb_rating,
      worldwide_gross_inr_crores
    `);

  if (!movies) {
    return {
      total_movies: 0,
      by_decade: {},
      by_era: {},
      by_verdict: {},
      with_wikidata: 0,
      with_tmdb: 0,
      with_poster: 0,
      with_rating: 0,
      avg_rating: 0,
      total_gross_crores: 0,
    };
  }

  const by_decade: Record<string, number> = {};
  const by_era: Record<string, number> = {};
  const by_verdict: Record<string, number> = {};
  let with_wikidata = 0;
  let with_tmdb = 0;
  let with_poster = 0;
  let with_rating = 0;
  let total_rating = 0;
  let total_gross_crores = 0;

  for (const movie of movies) {
    if (movie.release_decade) {
      by_decade[movie.release_decade] = (by_decade[movie.release_decade] || 0) + 1;
    }
    if (movie.era) {
      by_era[movie.era] = (by_era[movie.era] || 0) + 1;
    }
    if (movie.verdict) {
      by_verdict[movie.verdict] = (by_verdict[movie.verdict] || 0) + 1;
    }
    if (movie.wikidata_id) with_wikidata++;
    if (movie.tmdb_id) with_tmdb++;
    if (movie.poster_url) with_poster++;
    if (movie.tmdb_rating) {
      with_rating++;
      total_rating += movie.tmdb_rating;
    }
    if (movie.worldwide_gross_inr_crores) {
      total_gross_crores += movie.worldwide_gross_inr_crores;
    }
  }

  return {
    total_movies: movies.length,
    by_decade,
    by_era,
    by_verdict,
    with_wikidata,
    with_tmdb,
    with_poster,
    with_rating,
    avg_rating: with_rating > 0 ? Math.round(total_rating / with_rating * 10) / 10 : 0,
    total_gross_crores: Math.round(total_gross_crores * 100) / 100,
  };
}

/**
 * Get top movies by various criteria
 */
export async function getTopMovies(criteria: {
  sortBy: 'rating' | 'gross' | 'popularity';
  era?: string;
  decade?: string;
  limit?: number;
}): Promise<{
  id: string;
  title_en: string;
  title_te: string | null;
  release_year: number;
  director_names: string[];
  hero_names: string[];
  verdict: string | null;
  tmdb_rating: number | null;
  worldwide_gross_inr_crores: number | null;
  popularity_score: number | null;
}[]> {
  let query = supabase
    .from('catalogue_movies')
    .select(`
      id, title_en, title_te, release_year,
      director_names, hero_names, verdict,
      tmdb_rating, worldwide_gross_inr_crores, popularity_score
    `)
    .eq('is_published', true);

  if (criteria.era) {
    query = query.eq('era', criteria.era);
  }
  if (criteria.decade) {
    query = query.eq('release_decade', criteria.decade);
  }

  switch (criteria.sortBy) {
    case 'rating':
      query = query.order('tmdb_rating', { ascending: false, nullsFirst: false });
      break;
    case 'gross':
      query = query.order('worldwide_gross_inr_crores', { ascending: false, nullsFirst: false });
      break;
    case 'popularity':
      query = query.order('popularity_score', { ascending: false, nullsFirst: false });
      break;
  }

  query = query.limit(criteria.limit || 20);

  const { data } = await query;
  return data || [];
}

/**
 * Get actor filmography with stats
 */
export async function getActorFilmography(personId: string): Promise<{
  person: { name_en: string; name_te: string | null; image_url: string | null };
  movies: Array<{
    id: string;
    title_en: string;
    release_year: number;
    role: string;
    character: string | null;
    verdict: string | null;
    rating: number | null;
  }>;
  stats: {
    total_movies: number;
    hits: number;
    flops: number;
    hit_ratio: number;
    avg_rating: number;
  };
}> {
  // Get person
  const { data: person } = await supabase
    .from('kg_persons')
    .select('name_en, name_te, image_url')
    .eq('id', personId)
    .single();

  if (!person) {
    return {
      person: { name_en: '', name_te: null, image_url: null },
      movies: [],
      stats: { total_movies: 0, hits: 0, flops: 0, hit_ratio: 0, avg_rating: 0 },
    };
  }

  // Get filmography
  const { data: credits } = await supabase
    .from('movie_credits')
    .select(`
      movie_id,
      credit_type,
      role_category,
      character_name,
      catalogue_movies (
        id, title_en, release_year, verdict, tmdb_rating
      )
    `)
    .eq('person_id', personId)
    .order('billing_order', { ascending: true });

  const movies = (credits || [])
    .filter(c => c.catalogue_movies)
    .map(c => ({
      id: (c.catalogue_movies as any).id,
      title_en: (c.catalogue_movies as any).title_en,
      release_year: (c.catalogue_movies as any).release_year,
      role: c.role_category || c.credit_type,
      character: c.character_name,
      verdict: (c.catalogue_movies as any).verdict,
      rating: (c.catalogue_movies as any).tmdb_rating,
    }));

  // Calculate stats
  const hits = movies.filter(m =>
    ['all_time_blockbuster', 'blockbuster', 'super_hit', 'hit'].includes(m.verdict || '')
  ).length;

  const flops = movies.filter(m =>
    ['flop', 'disaster'].includes(m.verdict || '')
  ).length;

  const ratings = movies.filter(m => m.rating).map(m => m.rating!);
  const avgRating = ratings.length > 0
    ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10
    : 0;

  return {
    person,
    movies,
    stats: {
      total_movies: movies.length,
      hits,
      flops,
      hit_ratio: movies.length > 0 ? Math.round(hits / movies.length * 100) : 0,
      avg_rating: avgRating,
    },
  };
}

/**
 * Update actor performance stats
 */
export async function updateActorStats(): Promise<{
  updated: number;
  errors: string[];
}> {
  const { data: result, error } = await supabase.rpc('update_actor_performance_stats');

  if (error) {
    return { updated: 0, errors: [error.message] };
  }

  return { updated: result || 0, errors: [] };
}

// ============================================================
// FULL INGESTION PIPELINE
// ============================================================

/**
 * Run full catalogue ingestion
 */
export async function runFullIngestion(options: {
  wikidataDecades?: boolean;
  tmdbYears?: { start: number; end: number };
  enrichWithTMDB?: boolean;
  linkPersons?: boolean;
  updateStats?: boolean;
}): Promise<{
  wikidata: { fetched: number; inserted: number; updated: number } | null;
  tmdb: { fetched: number; inserted: number; updated: number } | null;
  enriched: number;
  linked: number;
  stats_updated: number;
  errors: string[];
}> {
  const result = {
    wikidata: null as { fetched: number; inserted: number; updated: number } | null,
    tmdb: null as { fetched: number; inserted: number; updated: number } | null,
    enriched: 0,
    linked: 0,
    stats_updated: 0,
    errors: [] as string[],
  };

  try {
    // Step 1: Wikidata ingestion (historic films)
    if (options.wikidataDecades) {
      console.log('\n=== WIKIDATA INGESTION ===');
      const wdResult = await ingestAllTeluguFilms();
      result.wikidata = {
        fetched: wdResult.total_fetched,
        inserted: wdResult.total_inserted,
        updated: wdResult.total_updated,
      };
      console.log(`Wikidata: ${wdResult.total_inserted} inserted, ${wdResult.total_updated} updated`);
    }

    // Step 2: TMDB ingestion (modern films)
    if (options.tmdbYears) {
      console.log('\n=== TMDB INGESTION ===');
      const tmdbResult = await ingestMoviesByYearRange(
        options.tmdbYears.start,
        options.tmdbYears.end
      );
      result.tmdb = {
        fetched: tmdbResult.total_fetched,
        inserted: tmdbResult.total_inserted,
        updated: tmdbResult.total_updated,
      };
      console.log(`TMDB: ${tmdbResult.total_inserted} inserted, ${tmdbResult.total_updated} updated`);
    }

    // Step 3: Enrich historic films with TMDB
    if (options.enrichWithTMDB) {
      console.log('\n=== TMDB ENRICHMENT ===');
      const enrichResult = await enrichMoviesWithTMDB();
      result.enriched = enrichResult.enriched;
      result.errors.push(...enrichResult.errors);
      console.log(`Enriched: ${enrichResult.enriched} movies`);
    }

    // Step 4: Link movies to persons
    if (options.linkPersons) {
      console.log('\n=== PERSON LINKING ===');
      const linkResult = await linkMoviesToPersons();
      result.linked = linkResult.linked;
      result.errors.push(...linkResult.errors);
      console.log(`Linked: ${linkResult.linked} credits`);
    }

    // Step 5: Update actor stats
    if (options.updateStats) {
      console.log('\n=== STATS UPDATE ===');
      const statsResult = await updateActorStats();
      result.stats_updated = statsResult.updated;
      result.errors.push(...statsResult.errors);
      console.log(`Stats updated: ${statsResult.updated} actors`);
    }

  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }

  return result;
}

// Re-export individual services
export {
  // Wikidata
  ingestAllTeluguFilms,
  ingestFilmsByDecade,
  linkMoviesToPersons,
  getCatalogueStats,
  // TMDB
  ingestMoviesByYear,
  ingestMoviesByYearRange,
  enrichMoviesWithTMDB,
  getUpcomingTeluguMovies,
  getPopularTeluguMovies,
  getNowPlayingTeluguMovies,
};








