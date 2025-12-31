/**
 * Telugu Movie Catalogue - TMDB Movie Ingestion Service
 * Fetches modern Telugu films (2000-present) from TMDB
 * Also enriches historic films with posters and ratings
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Telugu language code in TMDB
const TELUGU_LANGUAGE = 'te';

// ============================================================
// TYPES
// ============================================================

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  runtime?: number;
  budget?: number;
  revenue?: number;
  tagline?: string;
  imdb_id?: string;
  production_companies?: Array<{ id: number; name: string }>;
}

interface TMDBCredits {
  cast: Array<{
    id: number;
    name: string;
    character: string;
    order: number;
    profile_path: string | null;
    known_for_department: string;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
}

interface TMDBGenre {
  id: number;
  name: string;
}

// Genre ID to name mapping
const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Make a request to TMDB API
 */
async function tmdbRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY not configured');
    return null;
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', apiKey);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`TMDB API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('TMDB request failed:', error);
    return null;
  }
}

/**
 * Get poster URL from TMDB path
 */
function getPosterUrl(path: string | null, size: string = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Get backdrop URL from TMDB path
 */
function getBackdropUrl(path: string | null, size: string = 'w1280'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Convert genre IDs to names
 */
function genreIdsToNames(ids: number[] | undefined): string[] {
  if (!ids) return [];
  return ids.map(id => TMDB_GENRES[id]).filter(Boolean);
}

/**
 * Generate slug from title and year
 */
function generateSlug(title: string, year: number | null): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  return year ? `${normalized}-${year}` : normalized;
}

/**
 * Parse release date
 */
function parseReleaseDate(dateStr: string | undefined): {
  date: string | null;
  year: number | null;
  month: number | null;
} {
  if (!dateStr) return { date: null, year: null, month: null };

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { date: null, year: null, month: null };

    return {
      date: date.toISOString().split('T')[0],
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  } catch {
    return { date: null, year: null, month: null };
  }
}

/**
 * Calculate era from year
 */
function calculateEra(year: number | null): string | null {
  if (!year) return null;
  if (year < 1940) return 'birth_of_talkies';
  if (year < 1950) return 'early_growth';
  if (year < 1960) return 'golden_age_dawn';
  if (year < 1970) return 'golden_age_peak';
  if (year < 1980) return 'transition';
  if (year < 1990) return 'mass_masala';
  if (year < 2000) return 'commercial_peak';
  if (year < 2010) return 'new_millennium';
  if (year < 2020) return 'pan_india_rise';
  return 'pan_india_dominance';
}

// ============================================================
// DISCOVERY FUNCTIONS
// ============================================================

/**
 * Discover Telugu movies from TMDB
 */
export async function discoverTeluguMovies(
  year: number,
  page: number = 1
): Promise<TMDBMovie[]> {
  const data = await tmdbRequest<{
    results: TMDBMovie[];
    total_pages: number;
    total_results: number;
  }>('/discover/movie', {
    with_original_language: TELUGU_LANGUAGE,
    primary_release_year: year.toString(),
    sort_by: 'popularity.desc',
    page: page.toString(),
    'vote_count.gte': '5',  // Minimum votes for quality
  });

  return data?.results || [];
}

/**
 * Get movie details from TMDB
 */
export async function getMovieDetails(tmdbId: number): Promise<TMDBMovie | null> {
  return await tmdbRequest<TMDBMovie>(`/movie/${tmdbId}`, {
    append_to_response: 'credits,external_ids',
  });
}

/**
 * Get movie credits (cast & crew) from TMDB
 */
export async function getMovieCredits(tmdbId: number): Promise<TMDBCredits | null> {
  return await tmdbRequest<TMDBCredits>(`/movie/${tmdbId}/credits`);
}

/**
 * Search for a movie by title
 */
export async function searchMovie(title: string, year?: number): Promise<TMDBMovie[]> {
  const params: Record<string, string> = {
    query: title,
    language: 'te-IN',
    region: 'IN',
  };

  if (year) {
    params.year = year.toString();
  }

  const data = await tmdbRequest<{
    results: TMDBMovie[];
  }>('/search/movie', params);

  return data?.results || [];
}

// ============================================================
// INGESTION FUNCTIONS
// ============================================================

/**
 * Ingest Telugu movies from TMDB for a specific year
 */
export async function ingestMoviesByYear(year: number): Promise<{
  fetched: number;
  inserted: number;
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fetched = 0;
  let inserted = 0;
  let updated = 0;

  // Create ingestion log
  const { data: logEntry } = await supabase
    .from('movie_ingestion_log')
    .insert({
      source: 'tmdb',
      ingestion_type: 'year',
      decade: `${year}`,
      status: 'running',
    })
    .select()
    .single();

  try {
    console.log(`Fetching Telugu movies from TMDB for ${year}...`);

    // Fetch first page to get total
    const firstPage = await discoverTeluguMovies(year, 1);
    if (firstPage.length === 0) {
      console.log(`No movies found for ${year}`);
      return { fetched: 0, inserted: 0, updated: 0, errors: [] };
    }

    // Process first page
    const allMovies: TMDBMovie[] = [...firstPage];

    // Fetch additional pages if needed (up to 5 pages = 100 movies per year)
    const maxPages = 5;
    for (let page = 2; page <= maxPages; page++) {
      const pageMovies = await discoverTeluguMovies(year, page);
      if (pageMovies.length === 0) break;
      allMovies.push(...pageMovies);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    fetched = allMovies.length;
    console.log(`Fetched ${fetched} movies for ${year}`);

    for (const movie of allMovies) {
      try {
        // Get full details including credits
        const details = await getMovieDetails(movie.id);
        const credits = await getMovieCredits(movie.id);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 250));

        if (!details) {
          errors.push(`Failed to get details for ${movie.title}`);
          continue;
        }

        const dateParsed = parseReleaseDate(details.release_date);
        const slug = generateSlug(details.title, dateParsed.year);

        // Extract crew
        const directors = credits?.crew
          .filter(c => c.job === 'Director')
          .map(c => c.name) || [];

        const producers = credits?.crew
          .filter(c => c.job === 'Producer' || c.job === 'Executive Producer')
          .map(c => c.name) || [];

        const musicDirectors = credits?.crew
          .filter(c => c.job === 'Original Music Composer' || c.job === 'Music Director')
          .map(c => c.name) || [];

        const cinematographers = credits?.crew
          .filter(c => c.job === 'Director of Photography')
          .map(c => c.name) || [];

        const writers = credits?.crew
          .filter(c => c.department === 'Writing')
          .map(c => c.name) || [];

        // Extract cast
        const cast = credits?.cast.slice(0, 20) || [];
        const heroes = cast
          .filter(c => c.known_for_department === 'Acting' && c.order < 3)
          .map(c => c.name);

        const heroines = cast
          .filter(c => c.order >= 3 && c.order < 6)
          .map(c => c.name);

        // Build movie data
        const movieData = {
          title_en: details.title,
          title_original: details.original_title,
          slug,
          tmdb_id: details.id,
          imdb_id: (details as any).external_ids?.imdb_id || null,
          release_date: dateParsed.date,
          release_year: dateParsed.year,
          release_month: dateParsed.month,
          release_decade: dateParsed.year ? `${Math.floor(dateParsed.year / 10) * 10}s` : null,
          era: calculateEra(dateParsed.year),
          runtime_minutes: details.runtime,
          genres: genreIdsToNames(details.genre_ids) ||
            ((details as any).genres?.map((g: TMDBGenre) => g.name) || []),
          poster_url: getPosterUrl(details.poster_path),
          poster_source: 'tmdb',
          backdrop_url: getBackdropUrl(details.backdrop_path),
          synopsis: details.overview || null,
          tagline: details.tagline || null,
          director_names: directors,
          producer_names: producers,
          music_director_names: musicDirectors,
          cinematographer_name: cinematographers[0] || null,
          writer_names: writers,
          hero_names: heroes,
          heroine_names: heroines,
          cast_summary: cast.slice(0, 10).map(c => ({
            name: c.name,
            character: c.character,
            order: c.order,
          })),
          production_companies: (details.production_companies || []).map(c => c.name),
          budget_usd: details.budget || null,
          worldwide_gross_inr_crores: details.revenue ?
            Math.round((details.revenue / 10000000) * 100) / 100 : null,
          tmdb_rating: details.vote_average,
          tmdb_vote_count: details.vote_count,
          popularity_score: details.popularity,
          source: 'tmdb',
          source_refs: [{
            source: 'tmdb',
            id: details.id,
            url: `https://www.themoviedb.org/movie/${details.id}`,
            fetched_at: new Date().toISOString(),
          }],
          raw_tmdb: details,
          last_synced_at: new Date().toISOString(),
        };

        // Check if exists by TMDB ID
        const { data: existingByTmdb } = await supabase
          .from('catalogue_movies')
          .select('id')
          .eq('tmdb_id', details.id)
          .single();

        if (existingByTmdb) {
          // Update existing
          const { error } = await supabase
            .from('catalogue_movies')
            .update(movieData)
            .eq('id', existingByTmdb.id);

          if (error) {
            errors.push(`Update error for ${movie.title}: ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // Check for duplicate slug
          const { data: slugExists } = await supabase
            .from('catalogue_movies')
            .select('id')
            .eq('slug', slug)
            .single();

          if (slugExists) {
            movieData.slug = `${slug}-${details.id}`;
          }

          // Insert new
          const { error } = await supabase
            .from('catalogue_movies')
            .insert(movieData);

          if (error) {
            errors.push(`Insert error for ${movie.title}: ${error.message}`);
          } else {
            inserted++;

            // Also insert credits
            await insertMovieCredits(movieData.slug, credits, details.id);
          }
        }
      } catch (e) {
        errors.push(`Processing error for ${movie.title}: ${e}`);
      }
    }

    // Update ingestion log
    await supabase
      .from('movie_ingestion_log')
      .update({
        total_fetched: fetched,
        total_inserted: inserted,
        total_updated: updated,
        total_errors: errors.length,
        error_details: errors.slice(0, 50),
        completed_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', logEntry?.id);

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    errors.push(`Fatal error: ${errorMsg}`);

    await supabase
      .from('movie_ingestion_log')
      .update({
        total_errors: errors.length,
        error_details: errors,
        completed_at: new Date().toISOString(),
        status: 'failed',
      })
      .eq('id', logEntry?.id);
  }

  return { fetched, inserted, updated, errors };
}

/**
 * Insert movie credits
 */
async function insertMovieCredits(
  movieSlug: string,
  credits: TMDBCredits | null,
  tmdbMovieId: number
): Promise<void> {
  if (!credits) return;

  // Get movie ID
  const { data: movie } = await supabase
    .from('catalogue_movies')
    .select('id')
    .eq('slug', movieSlug)
    .single();

  if (!movie) return;

  // Insert cast
  for (const castMember of credits.cast.slice(0, 15)) {
    // Try to find person in kg_persons
    const { data: person } = await supabase
      .from('kg_persons')
      .select('id, name_en, name_te, image_url')
      .ilike('name_en', castMember.name)
      .single();

    const roleCategory = castMember.order < 2 ? 'lead' :
      castMember.order < 5 ? 'supporting' : 'cameo';

    await supabase
      .from('movie_credits')
      .upsert({
        movie_id: movie.id,
        person_id: person?.id || null,
        credit_type: 'cast',
        role_category: roleCategory,
        character_name: castMember.character,
        billing_order: castMember.order,
        person_name_en: castMember.name,
        person_name_te: person?.name_te || null,
        person_image_url: person?.image_url || getPosterUrl(castMember.profile_path, 'w185'),
        tmdb_person_id: castMember.id,
        source: 'tmdb',
      }, {
        onConflict: 'movie_id,person_name_en,credit_type,character_name',
      });
  }

  // Insert key crew
  const keyCrewJobs = ['Director', 'Producer', 'Original Music Composer', 'Director of Photography', 'Screenplay'];

  for (const crewMember of credits.crew.filter(c => keyCrewJobs.includes(c.job))) {
    const { data: person } = await supabase
      .from('kg_persons')
      .select('id, name_en, name_te, image_url')
      .ilike('name_en', crewMember.name)
      .single();

    const creditType = crewMember.job === 'Director' ? 'director' :
      crewMember.job === 'Producer' ? 'producer' :
      crewMember.job === 'Original Music Composer' ? 'music_director' :
      crewMember.job === 'Director of Photography' ? 'cinematographer' :
      'writer';

    await supabase
      .from('movie_credits')
      .upsert({
        movie_id: movie.id,
        person_id: person?.id || null,
        credit_type: creditType,
        person_name_en: crewMember.name,
        person_name_te: person?.name_te || null,
        person_image_url: person?.image_url || getPosterUrl(crewMember.profile_path, 'w185'),
        tmdb_person_id: crewMember.id,
        source: 'tmdb',
      }, {
        onConflict: 'movie_id,person_name_en,credit_type,character_name',
      });
  }
}

/**
 * Ingest Telugu movies from TMDB for a year range
 */
export async function ingestMoviesByYearRange(
  startYear: number,
  endYear: number
): Promise<{
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  years_processed: number[];
}> {
  let total_fetched = 0;
  let total_inserted = 0;
  let total_updated = 0;
  const years_processed: number[] = [];

  for (let year = startYear; year <= endYear; year++) {
    console.log(`\n--- Processing year ${year} ---`);

    const result = await ingestMoviesByYear(year);

    total_fetched += result.fetched;
    total_inserted += result.inserted;
    total_updated += result.updated;
    years_processed.push(year);

    console.log(`${year}: ${result.inserted} inserted, ${result.updated} updated`);

    // Delay between years
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    total_fetched,
    total_inserted,
    total_updated,
    years_processed,
  };
}

/**
 * Enrich existing movies with TMDB data
 */
export async function enrichMoviesWithTMDB(): Promise<{
  processed: number;
  enriched: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  let enriched = 0;

  // Get movies without TMDB ID
  const { data: movies } = await supabase
    .from('catalogue_movies')
    .select('id, title_en, release_year, tmdb_id')
    .is('tmdb_id', null)
    .limit(100);

  if (!movies) return { processed: 0, enriched: 0, errors: ['No movies found'] };

  for (const movie of movies) {
    processed++;

    // Search TMDB
    const results = await searchMovie(movie.title_en, movie.release_year);

    if (results.length === 0) {
      continue;
    }

    // Find best match
    const bestMatch = results.find(r => {
      const releaseYear = parseReleaseDate(r.release_date).year;
      return releaseYear === movie.release_year;
    }) || results[0];

    // Get details
    const details = await getMovieDetails(bestMatch.id);
    if (!details) continue;

    // Update movie
    const { error } = await supabase
      .from('catalogue_movies')
      .update({
        tmdb_id: details.id,
        poster_url: getPosterUrl(details.poster_path) || undefined,
        poster_source: details.poster_path ? 'tmdb' : undefined,
        backdrop_url: getBackdropUrl(details.backdrop_path) || undefined,
        synopsis: details.overview || undefined,
        tmdb_rating: details.vote_average,
        tmdb_vote_count: details.vote_count,
        popularity_score: details.popularity,
        runtime_minutes: details.runtime || undefined,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', movie.id);

    if (error) {
      errors.push(`Enrich error for ${movie.title_en}: ${error.message}`);
    } else {
      enriched++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { processed, enriched, errors };
}

/**
 * Get upcoming Telugu movies from TMDB
 */
export async function getUpcomingTeluguMovies(): Promise<TMDBMovie[]> {
  const today = new Date().toISOString().split('T')[0];
  const sixMonthsLater = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const data = await tmdbRequest<{
    results: TMDBMovie[];
  }>('/discover/movie', {
    with_original_language: TELUGU_LANGUAGE,
    'primary_release_date.gte': today,
    'primary_release_date.lte': sixMonthsLater,
    sort_by: 'primary_release_date.asc',
  });

  return data?.results || [];
}

/**
 * Get popular Telugu movies from TMDB
 */
export async function getPopularTeluguMovies(page: number = 1): Promise<TMDBMovie[]> {
  const data = await tmdbRequest<{
    results: TMDBMovie[];
  }>('/discover/movie', {
    with_original_language: TELUGU_LANGUAGE,
    sort_by: 'popularity.desc',
    page: page.toString(),
    'vote_count.gte': '50',
  });

  return data?.results || [];
}

/**
 * Get now playing Telugu movies
 */
export async function getNowPlayingTeluguMovies(): Promise<TMDBMovie[]> {
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const data = await tmdbRequest<{
    results: TMDBMovie[];
  }>('/discover/movie', {
    with_original_language: TELUGU_LANGUAGE,
    'primary_release_date.gte': oneMonthAgo,
    'primary_release_date.lte': today,
    sort_by: 'popularity.desc',
  });

  return data?.results || [];
}



