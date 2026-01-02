#!/usr/bin/env npx tsx
/**
 * Smart Movie Enrichment CLI
 * 
 * Phase 4: Enriches valid movies from telugu_movie_index to movies table
 * 
 * For each VALID movie:
 * - Fetches full cast (actors, director, music director)
 * - Fetches genres with confidence
 * - Fetches runtime, certification, budget
 * - Downloads posters/backdrops from TMDB
 * - Links to celebrities and similar movies
 * 
 * Usage:
 *   pnpm ingest:movies:smart                           # Enrich 300 movies (default)
 *   pnpm ingest:movies:smart --dry                     # Preview mode
 *   pnpm ingest:movies:smart --force                   # Re-enrich all
 *   pnpm ingest:movies:smart --batch                   # Enable batch mode (default off)
 *   pnpm ingest:movies:smart --limit=500               # Process 500 movies
 *   pnpm ingest:movies:smart --batch --concurrency=25  # 25 concurrent batches
 *   pnpm ingest:movies:smart --batch --batch-size=50   # 50 movies per batch
 * 
 * Optimized defaults for batch mode:
 *   --concurrency=25  (25 parallel batches)
 *   --batch-size=50   (50 movies per batch)
 *   --limit=300       (process 300 movies)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import slugify from 'slugify';

import { createProgress } from '../lib/pipeline/progress-tracker';

// ============================================================
// TYPES
// ============================================================

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

interface EnrichedMovie {
  // Core
  tmdb_id: number;
  title_en: string;
  title_te?: string;
  slug: string;
  canonical_title: string;
  
  // Release
  release_date: string | null;
  release_year: number | null;
  runtime_minutes: number | null;
  
  // Classification
  genres: string[];
  certification?: string;
  
  // Credits
  director: string | null;
  hero: string | null;
  heroine: string | null;
  music_director: string | null;
  cast_members: Array<{ name: string; character?: string; order: number }>;
  
  // Media
  poster_url: string | null;
  backdrop_url: string | null;
  
  // Ratings
  imdb_rating: number | null;
  our_rating: number | null;
  vote_count: number;
  popularity: number;
  
  // Content
  overview_te: string | null;
  tagline: string | null;
  
  // Quality
  data_quality_score: number;
  validation_status: string;
  is_published: boolean;
}

interface EnrichmentStats {
  total: number;
  enriched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ============================================================
// CONSTANTS
// ============================================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const GENRE_MAP: Record<number, string> = {
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
  10402: 'Musical',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

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
// TMDB API
// ============================================================

async function fetchFullMovieDetails(tmdbId: number): Promise<any | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,release_dates,videos,similar`
    );

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ============================================================
// ENRICHMENT LOGIC
// ============================================================

function extractDirector(credits: TMDBCredits): string | null {
  const director = credits.crew?.find(c => c.job === 'Director');
  return director?.name || null;
}

function extractMusicDirector(credits: TMDBCredits): string | null {
  const music = credits.crew?.find(c => 
    c.job === 'Original Music Composer' || 
    c.job === 'Music' ||
    c.job === 'Music Director'
  );
  return music?.name || null;
}

function extractHeroHeroine(credits: TMDBCredits): { hero: string | null; heroine: string | null } {
  const sortedCast = credits.cast?.sort((a, b) => a.order - b.order) || [];
  
  let hero: string | null = null;
  let heroine: string | null = null;

  for (const member of sortedCast.slice(0, 5)) {
    // This is a simplification - ideally we'd have gender data
    if (!hero && member.known_for_department === 'Acting') {
      hero = member.name;
    } else if (!heroine && member.known_for_department === 'Acting') {
      heroine = member.name;
    }
  }

  return { hero, heroine };
}

function extractCastMembers(credits: TMDBCredits): Array<{ name: string; character?: string; order: number }> {
  return credits.cast
    ?.slice(0, 15)
    .map(c => ({
      name: c.name,
      character: c.character || undefined,
      order: c.order,
    })) || [];
}

function extractGenres(tmdbData: any): string[] {
  if (tmdbData.genres) {
    return tmdbData.genres.map((g: any) => g.name);
  }
  if (tmdbData.genre_ids) {
    return tmdbData.genre_ids.map((id: number) => GENRE_MAP[id]).filter(Boolean);
  }
  return [];
}

function extractCertification(tmdbData: any): string | undefined {
  const releaseDates = tmdbData.release_dates?.results || [];
  
  // Try to find Indian certification first
  const india = releaseDates.find((r: any) => r.iso_3166_1 === 'IN');
  if (india?.release_dates?.[0]?.certification) {
    return india.release_dates[0].certification;
  }

  // Fall back to US
  const us = releaseDates.find((r: any) => r.iso_3166_1 === 'US');
  if (us?.release_dates?.[0]?.certification) {
    return us.release_dates[0].certification;
  }

  return undefined;
}

function calculateDataQuality(movie: EnrichedMovie): number {
  let score = 0.3; // Base score

  if (movie.poster_url) score += 0.1;
  if (movie.backdrop_url) score += 0.05;
  if (movie.director) score += 0.15;
  if (movie.cast_members.length >= 3) score += 0.1;
  if (movie.cast_members.length >= 5) score += 0.05;
  if (movie.genres.length > 0) score += 0.1;
  if (movie.runtime_minutes) score += 0.05;
  if (movie.overview_te || movie.tagline) score += 0.1;
  if (movie.vote_count >= 10) score += 0.05;
  if (movie.vote_count >= 100) score += 0.05;

  return Math.min(1.0, Math.round(score * 100) / 100);
}

async function enrichMovie(
  tmdbData: any,
  indexMovie: any
): Promise<EnrichedMovie> {
  const credits = tmdbData.credits || { cast: [], crew: [] };
  const { hero, heroine } = extractHeroHeroine(credits);
  
  const enriched: EnrichedMovie = {
    tmdb_id: tmdbData.id,
    title_en: tmdbData.title,
    title_te: indexMovie.title_te || undefined,
    slug: slugify(tmdbData.title, { lower: true, strict: true }) + 
          (tmdbData.release_date ? `-${tmdbData.release_date.split('-')[0]}` : ''),
    canonical_title: indexMovie.canonical_title || 
                     tmdbData.title.toLowerCase().replace(/[^a-z0-9]/g, ''),
    
    release_date: tmdbData.release_date || null,
    release_year: tmdbData.release_date 
      ? parseInt(tmdbData.release_date.split('-')[0]) 
      : null,
    runtime_minutes: tmdbData.runtime || null,
    
    genres: extractGenres(tmdbData),
    certification: extractCertification(tmdbData),
    
    director: extractDirector(credits),
    hero,
    heroine,
    music_director: extractMusicDirector(credits),
    cast_members: extractCastMembers(credits),
    
    poster_url: tmdbData.poster_path 
      ? `${TMDB_IMAGE_BASE}/w500${tmdbData.poster_path}`
      : null,
    backdrop_url: tmdbData.backdrop_path 
      ? `${TMDB_IMAGE_BASE}/w1280${tmdbData.backdrop_path}`
      : null,
    
    imdb_rating: tmdbData.vote_average || null,
    our_rating: null, // Will be set after review
    vote_count: tmdbData.vote_count || 0,
    popularity: tmdbData.popularity || 0,
    
    overview_te: null, // Will be generated later
    tagline: tmdbData.tagline || null,
    
    data_quality_score: 0, // Will be calculated
    validation_status: 'VALID',
    is_published: true,
  };

  enriched.data_quality_score = calculateDataQuality(enriched);

  return enriched;
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================

async function upsertMovie(
  supabase: ReturnType<typeof getSupabaseClient>,
  movie: EnrichedMovie
): Promise<{ inserted: boolean; updated: boolean; error?: string }> {
  // Check if exists by tmdb_id
  const { data: existingByTmdb } = await supabase
    .from('movies')
    .select('id')
    .eq('tmdb_id', movie.tmdb_id)
    .single();

  // Also check by slug (for movies created without TMDB ID)
  const { data: existingBySlug } = await supabase
    .from('movies')
    .select('id, tmdb_id')
    .eq('slug', movie.slug)
    .single();

  // Determine existing record
  const existing = existingByTmdb || existingBySlug;

  // Map to actual movies table schema
  // Safely handle numeric fields to avoid overflow
  const safeRuntime = movie.runtime_minutes !== null && 
    movie.runtime_minutes !== undefined && 
    movie.runtime_minutes > 0 && 
    movie.runtime_minutes < 1000 
    ? movie.runtime_minutes : null;
  
  // Database avg_rating column is DECIMAL(2,1) - max 9.9, min 0
  const safeRating = movie.imdb_rating !== null && 
    movie.imdb_rating !== undefined && 
    movie.imdb_rating >= 0 
    ? Math.min(9.9, Math.round(movie.imdb_rating * 10) / 10) : null;

  const movieData: Record<string, any> = {
    tmdb_id: movie.tmdb_id,
    title_en: movie.title_en,
    title_te: movie.title_te || null,
    slug: movie.slug,
    release_date: movie.release_date,
    release_year: movie.release_year,
    genres: movie.genres,
    director: movie.director,
    hero: movie.hero,
    heroine: movie.heroine,
    music_director: movie.music_director,
    cast_members: movie.cast_members,
    poster_url: movie.poster_url,
    backdrop_url: movie.backdrop_url,
    is_published: movie.is_published,
  };

  // Only include numeric fields if valid
  if (safeRuntime !== null) {
    movieData.runtime_minutes = safeRuntime;
  }
  if (safeRating !== null) {
    movieData.avg_rating = safeRating;
  }

  if (existing) {
    const { error } = await supabase
      .from('movies')
      .update(movieData)
      .eq('id', existing.id);

    if (error) return { inserted: false, updated: false, error: error.message };
    return { inserted: false, updated: true };
  } else {
    const { error } = await supabase
      .from('movies')
      .insert(movieData);

    if (error) {
      if (error.code === '23505') {
        // Duplicate - try update by tmdb_id
        const { error: updateError } = await supabase
          .from('movies')
          .update(movieData)
          .eq('tmdb_id', movie.tmdb_id);
        
        if (updateError) return { inserted: false, updated: false, error: updateError.message };
        return { inserted: false, updated: true };
      }
      return { inserted: false, updated: false, error: error.message };
    }
    return { inserted: true, updated: false };
  }
}

async function updateIndexEnriched(
  supabase: ReturnType<typeof getSupabaseClient>,
  indexId: string
): Promise<void> {
  await supabase
    .from('telugu_movie_index')
    .update({ last_enriched_at: new Date().toISOString() })
    .eq('id', indexId);
}

// ============================================================
// CLI
// ============================================================

interface CLIArgs {
  dryRun: boolean;
  force: boolean;
  limit?: number;
  verbose: boolean;
  batchMode: boolean;
  batchSize: number;
  concurrency: number;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry') || args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('-v') || args.includes('--verbose'),
    batchMode: args.includes('--batch-mode') || args.includes('--batch'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : undefined,
    batchSize: args.find(a => a.startsWith('--batch-size='))
      ? parseInt(args.find(a => a.startsWith('--batch-size='))!.split('=')[1])
      : 50, // Optimized default: process 50 movies per batch
    concurrency: args.find(a => a.startsWith('--concurrency='))
      ? parseInt(args.find(a => a.startsWith('--concurrency='))!.split('=')[1])
      : 25, // Optimized default: 25 concurrent batches
  };
}

// ============================================================
// BATCH PROCESSING
// ============================================================

interface BatchEnrichmentResult {
  tmdbId: number;
  title: string;
  success: boolean;
  inserted: boolean;
  updated: boolean;
  error?: string;
}

async function enrichMovieBatch(
  supabase: ReturnType<typeof getSupabaseClient>,
  movies: any[],
  args: CLIArgs
): Promise<BatchEnrichmentResult[]> {
  const results: BatchEnrichmentResult[] = [];

  // Process movies in parallel within the batch
  const promises = movies.map(async (indexMovie) => {
    try {
      const tmdbData = await fetchFullMovieDetails(indexMovie.tmdb_id);

      if (!tmdbData) {
        return {
          tmdbId: indexMovie.tmdb_id,
          title: indexMovie.title_en,
          success: false,
          inserted: false,
          updated: false,
          error: 'TMDB fetch failed',
        };
      }

      const enriched = await enrichMovie(tmdbData, indexMovie);

      if (args.dryRun) {
        return {
          tmdbId: indexMovie.tmdb_id,
          title: indexMovie.title_en,
          success: true,
          inserted: false,
          updated: false,
        };
      }

      const result = await upsertMovie(supabase, enriched);

      if (!result.error) {
        await updateIndexEnriched(supabase, indexMovie.id);
      }

      return {
        tmdbId: indexMovie.tmdb_id,
        title: indexMovie.title_en,
        success: !result.error,
        inserted: result.inserted,
        updated: result.updated,
        error: result.error,
      };

    } catch (error: any) {
      return {
        tmdbId: indexMovie.tmdb_id,
        title: indexMovie.title_en,
        success: false,
        inserted: false,
        updated: false,
        error: error.message,
      };
    }
  });

  // Execute with rate limiting between batches
  const batchResults = await Promise.all(promises);
  results.push(...batchResults);

  return results;
}

async function runBatchEnrichment(
  supabase: ReturnType<typeof getSupabaseClient>,
  movies: any[],
  args: CLIArgs
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: movies.length,
    enriched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Split into batches
  const batches: any[][] = [];
  for (let i = 0; i < movies.length; i += args.batchSize) {
    batches.push(movies.slice(i, i + args.batchSize));
  }

  console.log(chalk.gray(`  Processing in ${batches.length} batches of ${args.batchSize} movies (concurrency: ${args.concurrency})\n`));

  // Create progress tracker
  const progress = createProgress('Enriching movies', movies.length, 5);

  // Process batches with controlled concurrency
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += args.concurrency) {
    // Check timeout every batch group
    const action = await progress.checkTimeout();
    if (action === 'stop') {
      console.log(chalk.yellow('\n⏸️  Enrichment stopped by user. Progress has been saved.'));
      break;
    } else if (action === 'skip') {
      console.log(chalk.yellow('\n⏩ Skipping remaining enrichment...'));
      break;
    }

    const concurrentBatches = batches.slice(batchIndex, batchIndex + args.concurrency);

    const batchPromises = concurrentBatches.map(batch => enrichMovieBatch(supabase, batch, args));
    const batchResultsArray = await Promise.all(batchPromises);

    for (const batchResults of batchResultsArray) {
      for (const result of batchResults) {
        if (result.success) {
          stats.enriched++;
          if (result.inserted) stats.inserted++;
          if (result.updated) stats.updated++;
        } else {
          stats.skipped++;
          if (result.error) {
            stats.errors.push(`${result.title}: ${result.error}`);
          }
        }
      }
    }

    // Update progress
    const processed = Math.min((batchIndex + args.concurrency) * args.batchSize, movies.length);
    progress.set(processed);

    // Rate limit between batch groups
    if (batchIndex + args.concurrency < batches.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  progress.complete('Enrichment completed');

  return stats;
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();
  const supabase = getSupabaseClient();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║            SMART MOVIE ENRICHMENT - PHASE 4                   ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE\n'));
  }

  // Check API key
  if (!process.env.TMDB_API_KEY) {
    console.error(chalk.red('TMDB_API_KEY not set'));
    process.exit(1);
  }

  // Get movies to enrich
  let query = supabase
    .from('telugu_movie_index')
    .select('*')
    .eq('status', 'VALID');

  if (!args.force) {
    query = query.is('last_enriched_at', null);
  }

  if (args.limit) {
    query = query.limit(args.limit);
  } else {
    query = query.limit(300); // Optimized default for faster batch processing
  }

  query = query.order('popularity', { ascending: false });

  const { data: movies, error } = await query;

  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error.message);
    process.exit(1);
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies to enrich'));
    process.exit(0);
  }

  console.log(chalk.cyan(`📋 Enriching ${movies.length} movies...\n`));

  let stats: EnrichmentStats;

  // Use batch mode for parallel processing if enabled
  if (args.batchMode) {
    console.log(chalk.gray(`  🚀 Batch mode enabled (${args.concurrency} concurrent batches)\n`));
    stats = await runBatchEnrichment(supabase, movies, args);
  } else {
    // Sequential processing (original behavior)
    stats = {
      total: movies.length,
      enriched: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < movies.length; i++) {
      const indexMovie = movies[i];

      if (args.verbose) {
        console.log(`  [${i + 1}/${movies.length}] ${indexMovie.title_en}`);
      }

      try {
        // Fetch full details
        const tmdbData = await fetchFullMovieDetails(indexMovie.tmdb_id);

        if (!tmdbData) {
          stats.skipped++;
          stats.errors.push(`${indexMovie.title_en}: TMDB fetch failed`);
          continue;
        }

        // Enrich
        const enriched = await enrichMovie(tmdbData, indexMovie);
        stats.enriched++;

        if (args.dryRun) {
          if (args.verbose) {
            console.log(chalk.gray(`    Director: ${enriched.director || 'N/A'}`));
            console.log(chalk.gray(`    Cast: ${enriched.cast_members.length} members`));
            console.log(chalk.gray(`    Quality: ${(enriched.data_quality_score * 100).toFixed(0)}%`));
          }
          continue;
        }

        // Save to movies table
        const result = await upsertMovie(supabase, enriched);

        if (result.error) {
          stats.errors.push(`${indexMovie.title_en}: ${result.error}`);
        } else {
          if (result.inserted) stats.inserted++;
          if (result.updated) stats.updated++;

          // Update index
          await updateIndexEnriched(supabase, indexMovie.id);
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 150));

      } catch (error: any) {
        stats.errors.push(`${indexMovie.title_en}: ${error.message}`);
      }

      // Progress
      if (i > 0 && i % 20 === 0) {
        console.log(`  Progress: ${i}/${movies.length} (${stats.inserted} new, ${stats.updated} updated)`);
      }
    }
  }

  // Results
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 ENRICHMENT RESULTS'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Total:     ${stats.total}`);
  console.log(`  Enriched:  ${chalk.cyan(stats.enriched)}`);
  console.log(`  Inserted:  ${chalk.green(stats.inserted)}`);
  console.log(`  Updated:   ${chalk.blue(stats.updated)}`);
  console.log(`  Skipped:   ${chalk.yellow(stats.skipped)}`);
  console.log(`  Errors:    ${chalk.red(stats.errors.length)}`);

  if (stats.errors.length > 0) {
    console.log(chalk.yellow('\n⚠️ Errors:'));
    for (const error of stats.errors.slice(0, 5)) {
      console.log(chalk.yellow(`  - ${error}`));
    }
  }

  // Next steps
  if (!args.dryRun && stats.inserted > 0) {
    console.log(chalk.bold('\n📋 NEXT STEPS'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  Run ${chalk.cyan('pnpm reviews:coverage --target=0.95')} to generate reviews`);
  }

  console.log(chalk.green('\n✅ Enrichment complete\n'));
}

main().catch(console.error);

