/**
 * TMDB Full Paginator for Telugu Movies
 * 
 * Paginates through ALL Telugu movies on TMDB using:
 * /discover/movie?with_original_language=te
 * 
 * This is the CANONICAL source for Telugu movie discovery.
 * NO AI - pure TMDB data only.
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface TMDBDiscoverResult {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
}

export interface TMDBDiscoverResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: TMDBDiscoverResult[];
}

export interface IndexedMovie {
  tmdb_id: number;
  title_en: string;
  original_title: string;
  release_date: string | null;
  has_poster: boolean;
  has_backdrop: boolean;
  popularity: number;
  vote_average: number;
  vote_count: number;
  confidence_score: number;
  source: string;
  page_number: number;
}

export interface PaginationResult {
  pagesProcessed: number;
  totalFound: number;
  newIndexed: number;
  updated: number;
  rejected: number;
  errors: string[];
  runId: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TELUGU_LANGUAGE = 'te';
const RATE_LIMIT_MS = 250; // TMDB allows ~40 requests/10 seconds

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
// TMDB API FUNCTIONS
// ============================================================

/**
 * Fetch a single page from TMDB discover
 */
async function fetchDiscoverPage(
  page: number,
  options: {
    year?: number;
    sortBy?: string;
  } = {}
): Promise<TMDBDiscoverResponse | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not configured');
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    with_original_language: TELUGU_LANGUAGE,
    sort_by: options.sortBy || 'popularity.desc',
    page: page.toString(),
    include_adult: 'false',
  });

  if (options.year) {
    params.set('primary_release_year', options.year.toString());
  }

  try {
    const response = await fetch(`${TMDB_BASE_URL}/discover/movie?${params}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise(r => setTimeout(r, 2000));
        return fetchDiscoverPage(page, options);
      }
      console.error(`TMDB error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('TMDB fetch error:', error);
    return null;
  }
}

/**
 * Fetch movie credits to check director and cast
 */
async function fetchMovieCredits(tmdbId: number): Promise<{
  hasDirector: boolean;
  castCount: number;
  director?: string;
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const director = data.crew?.find((c: any) => c.job === 'Director');
    const castCount = data.cast?.length || 0;

    return {
      hasDirector: !!director,
      castCount,
      director: director?.name,
    };
  } catch {
    return null;
  }
}

// ============================================================
// CONFIDENCE CALCULATION
// ============================================================

/**
 * Calculate confidence score for a discovered movie
 */
function calculateConfidence(movie: TMDBDiscoverResult, credits?: {
  hasDirector: boolean;
  castCount: number;
}): number {
  let score = 0.5; // Base score

  // Language confirmation (should always be te)
  if (movie.original_language === TELUGU_LANGUAGE) {
    score += 0.2;
  }

  // Has poster/backdrop
  if (movie.poster_path) score += 0.1;
  if (movie.backdrop_path) score += 0.05;

  // Vote count indicates real movie
  if (movie.vote_count >= 100) score += 0.1;
  else if (movie.vote_count >= 10) score += 0.05;

  // Has credits
  if (credits) {
    if (credits.hasDirector) score += 0.1;
    if (credits.castCount >= 3) score += 0.1;
    else if (credits.castCount >= 1) score += 0.05;
  }

  // Cap at 1.0
  return Math.min(1.0, Math.round(score * 100) / 100);
}

// ============================================================
// MAIN PAGINATOR
// ============================================================

export interface PaginatorOptions {
  startPage?: number;
  maxPages?: number;
  year?: number;
  dryRun?: boolean;
  fetchCredits?: boolean;
  verbose?: boolean;
}

/**
 * Paginate through ALL Telugu movies on TMDB
 */
export async function paginateTeluguMovies(
  options: PaginatorOptions = {}
): Promise<PaginationResult> {
  const {
    startPage = 1,
    maxPages,
    year,
    dryRun = false,
    fetchCredits = false,
    verbose = false,
  } = options;

  const supabase = getSupabaseClient();
  const errors: string[] = [];
  let pagesProcessed = 0;
  let totalFound = 0;
  let newIndexed = 0;
  let updated = 0;
  let rejected = 0;

  // Create ingestion log
  let runId = '';
  if (!dryRun) {
    const { data: logEntry, error: logError } = await supabase
      .from('telugu_movie_ingestion_log')
      .insert({
        source: 'tmdb_discover',
        run_type: 'discover',
        status: 'running',
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to create log entry:', logError);
    } else {
      runId = logEntry?.id || '';
    }
  }

  try {
    // First request to get total pages
    const firstPage = await fetchDiscoverPage(startPage, { year });
    if (!firstPage) {
      throw new Error('Failed to fetch first page');
    }

    const totalPages = maxPages 
      ? Math.min(maxPages, firstPage.total_pages)
      : firstPage.total_pages;
    
    totalFound = firstPage.total_results;

    console.log(`📊 Total Telugu movies on TMDB: ${totalFound}`);
    console.log(`📄 Total pages: ${totalPages}`);

    // Process all pages
    for (let page = startPage; page <= totalPages; page++) {
      if (verbose) {
        console.log(`\n📄 Processing page ${page}/${totalPages}...`);
      }

      const pageData = page === startPage 
        ? firstPage 
        : await fetchDiscoverPage(page, { year });

      if (!pageData) {
        errors.push(`Failed to fetch page ${page}`);
        continue;
      }

      pagesProcessed++;

      // Process each movie
      for (const movie of pageData.results) {
        // Skip adult content
        if (movie.adult) {
          rejected++;
          continue;
        }

        // Verify Telugu language
        if (movie.original_language !== TELUGU_LANGUAGE) {
          rejected++;
          if (verbose) {
            console.log(`  ⚠️ Skipping non-Telugu: ${movie.title} (${movie.original_language})`);
          }
          continue;
        }

        // Optionally fetch credits for better confidence
        let credits;
        if (fetchCredits) {
          credits = await fetchMovieCredits(movie.id);
          await new Promise(r => setTimeout(r, RATE_LIMIT_MS / 2));
        }

        const confidence = calculateConfidence(movie, credits);

        const indexedMovie: IndexedMovie = {
          tmdb_id: movie.id,
          title_en: movie.title,
          original_title: movie.original_title,
          release_date: movie.release_date || null,
          has_poster: !!movie.poster_path,
          has_backdrop: !!movie.backdrop_path,
          popularity: movie.popularity,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          confidence_score: confidence,
          source: 'tmdb_discover',
          page_number: page,
        };

        if (dryRun) {
          if (verbose) {
            console.log(`  [DRY] ${movie.title} (${movie.release_date?.split('-')[0] || 'N/A'}) - confidence: ${confidence}`);
          }
          newIndexed++;
          continue;
        }

        // Upsert to database
        const { data: existing } = await supabase
          .from('telugu_movie_index')
          .select('id')
          .eq('tmdb_id', movie.id)
          .single();

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('telugu_movie_index')
            .update({
              title_en: indexedMovie.title_en,
              original_title: indexedMovie.original_title,
              release_date: indexedMovie.release_date,
              has_poster: indexedMovie.has_poster,
              has_backdrop: indexedMovie.has_backdrop,
              popularity: indexedMovie.popularity,
              vote_average: indexedMovie.vote_average,
              vote_count: indexedMovie.vote_count,
              confidence_score: Math.max(confidence, 0.5), // Don't decrease
              has_director: credits?.hasDirector ?? false,
              cast_count: credits?.castCount ?? 0,
              last_enriched_at: new Date().toISOString(),
            })
            .eq('tmdb_id', movie.id);

          if (updateError) {
            errors.push(`Update failed for ${movie.title}: ${updateError.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('telugu_movie_index')
            .insert({
              ...indexedMovie,
              has_director: credits?.hasDirector ?? false,
              cast_count: credits?.castCount ?? 0,
            });

          if (insertError) {
            if (insertError.code === '23505') {
              // Duplicate - already exists
              updated++;
            } else {
              errors.push(`Insert failed for ${movie.title}: ${insertError.message}`);
            }
          } else {
            newIndexed++;
          }
        }
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

      // Progress update
      if (page % 10 === 0) {
        console.log(`  📈 Progress: ${page}/${totalPages} pages, ${newIndexed} new, ${updated} updated`);
      }
    }

    // Update ingestion log
    if (!dryRun && runId) {
      await supabase
        .from('telugu_movie_ingestion_log')
        .update({
          completed_at: new Date().toISOString(),
          pages_processed: pagesProcessed,
          total_found: totalFound,
          new_indexed: newIndexed,
          updated,
          rejected,
          errors: errors.slice(0, 100), // Limit stored errors
          status: errors.length > 0 ? 'completed' : 'completed',
        })
        .eq('id', runId);
    }

    return {
      pagesProcessed,
      totalFound,
      newIndexed,
      updated,
      rejected,
      errors,
      runId,
    };
  } catch (error: any) {
    // Update log with failure
    if (!dryRun && runId) {
      await supabase
        .from('telugu_movie_ingestion_log')
        .update({
          status: 'failed',
          error_message: error.message,
          pages_processed: pagesProcessed,
          new_indexed: newIndexed,
          errors: errors.slice(0, 100),
        })
        .eq('id', runId);
    }

    throw error;
  }
}

/**
 * Paginate by year for more thorough coverage
 */
export async function paginateByYear(
  startYear: number,
  endYear: number,
  options: Omit<PaginatorOptions, 'year'> = {}
): Promise<PaginationResult> {
  let totalResult: PaginationResult = {
    pagesProcessed: 0,
    totalFound: 0,
    newIndexed: 0,
    updated: 0,
    rejected: 0,
    errors: [],
    runId: '',
  };

  for (let year = startYear; year <= endYear; year++) {
    console.log(`\n📅 Processing year ${year}...`);

    try {
      const result = await paginateTeluguMovies({
        ...options,
        year,
      });

      totalResult.pagesProcessed += result.pagesProcessed;
      totalResult.totalFound += result.totalFound;
      totalResult.newIndexed += result.newIndexed;
      totalResult.updated += result.updated;
      totalResult.rejected += result.rejected;
      totalResult.errors.push(...result.errors);

      console.log(`  ✓ Year ${year}: ${result.newIndexed} new, ${result.updated} updated`);
    } catch (error: any) {
      totalResult.errors.push(`Year ${year} failed: ${error.message}`);
      console.error(`  ✗ Year ${year} failed:`, error.message);
    }
  }

  return totalResult;
}

/**
 * Get current index statistics
 */
export async function getIndexStats(): Promise<{
  total: number;
  verified: number;
  valid: number;
  needsReview: number;
  rejected: number;
  withPoster: number;
  withDirector: number;
  withCast3Plus: number;
  byYear: Record<number, number>;
}> {
  const supabase = getSupabaseClient();

  const { count: total } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true });

  const { count: verified } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true);

  const { count: valid } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'VALID');

  const { count: needsReview } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'NEEDS_REVIEW');

  const { count: rejected } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'REJECTED');

  const { count: withPoster } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('has_poster', true);

  const { count: withDirector } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('has_director', true);

  const { count: withCast3Plus } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .gte('cast_count', 3);

  // Get by year
  const { data: yearData } = await supabase
    .from('telugu_movie_index')
    .select('release_date');

  const byYear: Record<number, number> = {};
  for (const row of yearData || []) {
    if (row.release_date) {
      const year = parseInt(row.release_date.split('-')[0]);
      byYear[year] = (byYear[year] || 0) + 1;
    }
  }

  return {
    total: total || 0,
    verified: verified || 0,
    valid: valid || 0,
    needsReview: needsReview || 0,
    rejected: rejected || 0,
    withPoster: withPoster || 0,
    withDirector: withDirector || 0,
    withCast3Plus: withCast3Plus || 0,
    byYear,
  };
}






