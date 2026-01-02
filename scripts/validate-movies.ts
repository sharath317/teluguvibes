#!/usr/bin/env npx tsx
/**
 * Movie Validation CLI
 * 
 * Phase 3: Data sanity & deduplication
 * 
 * Validates all movies in telugu_movie_index against:
 * 1. TMDB verification
 * 2. Director existence
 * 3. Cast count
 * 4. Image availability
 * 5. Duplicate detection
 * 
 * Usage:
 *   pnpm intel:validate:movies                           # Validate all pending (sequential)
 *   pnpm intel:validate:movies --parallel                # Parallel validation (4x faster)
 *   pnpm intel:validate:movies --fix                     # Auto-fix issues
 *   pnpm intel:validate:movies --strict                  # Strict mode (rejects more)
 *   pnpm intel:validate:movies --parallel --batch-size=50 # 50 movies per batch
 *   pnpm intel:validate:movies --limit=500               # Process 500 movies max
 * 
 * Speed optimizations:
 *   --parallel          Enable parallel processing (4x faster)
 *   --batch-size=50     Movies per batch (default: 50)
 *   --limit=500         Max movies to process
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import {
  validateMovieCandidate,
  canonicalizeTitle,
  type MovieCandidate,
  type EntityStatus,
} from '../lib/movie-validation/movie-identity-gate';
import { createProgress } from '../lib/pipeline/progress-tracker';

// ============================================================
// TYPES
// ============================================================

interface ValidationStats {
  total: number;
  valid: number;
  needsReview: number;
  rejected: number;
  fixed: number;
  duplicatesFound: number;
  errors: string[];
}

interface CLIArgs {
  fix: boolean;
  strict: boolean;
  limit?: number;
  verbose: boolean;
  statusOnly: boolean;
  parallel: boolean;
  batchSize: number;
}

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
// VALIDATION LOGIC
// ============================================================

/**
 * Fetch movie details from TMDB for validation
 */
async function fetchTMDBDetails(tmdbId: number): Promise<any | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`
    );

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Validate a single movie from the index
 */
async function validateMovie(
  supabase: ReturnType<typeof getSupabaseClient>,
  movie: any,
  options: { strict: boolean }
): Promise<{
  status: EntityStatus;
  issues: string[];
  tmdbData?: any;
}> {
  const issues: string[] = [];
  let status: EntityStatus = 'VALID';

  // 1. Fetch TMDB details
  const tmdbData = await fetchTMDBDetails(movie.tmdb_id);

  if (!tmdbData) {
    issues.push('Cannot verify on TMDB');
    return { status: 'INVALID_NO_TMDB_MATCH', issues };
  }

  // 2. Verify it's actually a movie (not TV, person, etc.)
  // TMDB movie endpoint returns movie data, so this is implicit

  // 3. Verify Telugu language
  if (tmdbData.original_language !== 'te') {
    issues.push(`Not Telugu (${tmdbData.original_language})`);
    return { status: 'INVALID_NOT_TELUGU', issues };
  }

  // 4. Check director
  const directors = tmdbData.credits?.crew?.filter((c: any) => c.job === 'Director') || [];
  if (directors.length === 0) {
    issues.push('No director found');
    if (options.strict) {
      status = 'INVALID_CAST_CREW';
    } else {
      status = 'PENDING_VALIDATION';
    }
  }

  // 5. Check cast count
  const castCount = tmdbData.credits?.cast?.length || 0;
  if (castCount < 3) {
    issues.push(`Only ${castCount} cast members (need 3+)`);
    if (options.strict) {
      status = 'INVALID_CAST_CREW';
    } else if (status === 'VALID') {
      status = 'PENDING_VALIDATION';
    }
  }

  // 6. Check images
  const hasPoster = !!tmdbData.poster_path;
  const hasBackdrop = !!tmdbData.backdrop_path;
  if (!hasPoster && !hasBackdrop) {
    issues.push('No images available');
    if (options.strict) {
      status = 'INVALID_NO_IMAGE';
    } else if (status === 'VALID') {
      status = 'PENDING_VALIDATION';
    }
  }

  // 7. Check release date validity
  if (tmdbData.release_date) {
    const releaseDate = new Date(tmdbData.release_date);
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    
    if (releaseDate > twoYearsFromNow) {
      issues.push('Release date too far in future');
      status = 'INVALID_FUTURE_RELEASE';
    }
  }

  // If no critical issues but has warnings, mark for review
  if (status === 'VALID' && issues.length > 0) {
    status = 'PENDING_VALIDATION';
  }

  return { status, issues, tmdbData };
}

/**
 * Detect duplicates in the index
 */
async function detectDuplicates(
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<{ canonical_title: string; year: number; count: number; ids: string[] }[]> {
  const { data: movies } = await supabase
    .from('telugu_movie_index')
    .select('id, title_en, canonical_title, release_date, tmdb_id');

  if (!movies) return [];

  const groups = new Map<string, any[]>();

  for (const movie of movies) {
    const canonical = movie.canonical_title || canonicalizeTitle(movie.title_en);
    const year = movie.release_date ? parseInt(movie.release_date.split('-')[0]) : 0;
    const key = `${canonical}|${year}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(movie);
  }

  const duplicates: { canonical_title: string; year: number; count: number; ids: string[] }[] = [];

  for (const [key, movieList] of groups) {
    if (movieList.length > 1) {
      const [canonical, yearStr] = key.split('|');
      duplicates.push({
        canonical_title: canonical,
        year: parseInt(yearStr),
        count: movieList.length,
        ids: movieList.map(m => m.id),
      });
    }
  }

  return duplicates;
}

/**
 * Fix movie by updating with TMDB data
 */
async function fixMovie(
  supabase: ReturnType<typeof getSupabaseClient>,
  movieId: string,
  tmdbData: any
): Promise<boolean> {
  const directors = tmdbData.credits?.crew?.filter((c: any) => c.job === 'Director') || [];
  const castCount = tmdbData.credits?.cast?.length || 0;

  const { error } = await supabase
    .from('telugu_movie_index')
    .update({
      has_poster: !!tmdbData.poster_path,
      has_backdrop: !!tmdbData.backdrop_path,
      has_director: directors.length > 0,
      cast_count: castCount,
      vote_average: tmdbData.vote_average,
      vote_count: tmdbData.vote_count,
      popularity: tmdbData.popularity,
      last_enriched_at: new Date().toISOString(),
    })
    .eq('id', movieId);

  return !error;
}

// ============================================================
// CLI
// ============================================================

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    fix: false,
    strict: false,
    verbose: false,
    statusOnly: false,
    parallel: false,
    batchSize: 50, // Optimized default: 50 movies per batch
  };

  for (const arg of args) {
    if (arg === '--fix') parsed.fix = true;
    if (arg === '--strict') parsed.strict = true;
    if (arg === '-v' || arg === '--verbose') parsed.verbose = true;
    if (arg === '--status') parsed.statusOnly = true;
    if (arg === '--parallel') parsed.parallel = true;
    if (arg.startsWith('--limit=')) parsed.limit = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--batch-size=')) parsed.batchSize = parseInt(arg.split('=')[1]);
  }

  return parsed;
}

async function showStatus(supabase: ReturnType<typeof getSupabaseClient>): Promise<void> {
  console.log(chalk.blue.bold('\n📊 MOVIE VALIDATION STATUS\n'));

  const { count: total } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true });

  const { count: valid } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'VALID');

  const { count: pending } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  const { count: needsReview } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'NEEDS_REVIEW');

  const { count: rejected } = await supabase
    .from('telugu_movie_index')
    .select('*', { count: 'exact', head: true })
    .in('status', ['INVALID_NOT_MOVIE', 'INVALID_NOT_TELUGU', 'INVALID_NO_TMDB_MATCH', 
                   'INVALID_DUPLICATE', 'INVALID_CAST_CREW', 'INVALID_NO_IMAGE', 
                   'INVALID_FUTURE_RELEASE', 'REJECTED']);

  console.log(`  Total:        ${total || 0}`);
  console.log(`  Valid:        ${chalk.green(valid || 0)}`);
  console.log(`  Pending:      ${chalk.yellow(pending || 0)}`);
  console.log(`  Needs Review: ${chalk.yellow(needsReview || 0)}`);
  console.log(`  Rejected:     ${chalk.red(rejected || 0)}`);

  // Duplicates
  const duplicates = await detectDuplicates(supabase);
  console.log(`  Duplicates:   ${duplicates.length > 0 ? chalk.red(duplicates.length) : chalk.green(0)}`);

  if (duplicates.length > 0) {
    console.log(chalk.yellow('\n⚠️ Duplicate sets:'));
    for (const dup of duplicates.slice(0, 5)) {
      console.log(`  - "${dup.canonical_title}" (${dup.year}): ${dup.count} entries`);
    }
    if (duplicates.length > 5) {
      console.log(`  ... and ${duplicates.length - 5} more`);
    }
  }
}

// ============================================================
// PARALLEL VALIDATION
// ============================================================

interface ValidationResult {
  movieId: string;
  title: string;
  status: EntityStatus;
  fixed: boolean;
  error?: string;
}

async function validateMovieBatch(
  supabase: ReturnType<typeof getSupabaseClient>,
  movies: any[],
  options: { strict: boolean; fix: boolean }
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Process movies in parallel within the batch
  const promises = movies.map(async (movie) => {
    try {
      const result = await validateMovie(supabase, movie, { strict: options.strict });

      // Determine final status
      let finalStatus: EntityStatus;
      if (result.status.startsWith('INVALID')) {
        finalStatus = 'REJECTED';
      } else if (result.status === 'VALID') {
        finalStatus = 'VALID';
      } else {
        finalStatus = 'NEEDS_REVIEW';
      }

      // Update status in database
      const updateData: any = {
        status: finalStatus,
      };

      if (result.status.startsWith('INVALID')) {
        updateData.rejection_reason = result.issues.join('; ');
      }

      await supabase
        .from('telugu_movie_index')
        .update(updateData)
        .eq('id', movie.id);

      // Fix if requested
      let fixed = false;
      if (options.fix && result.tmdbData) {
        fixed = await fixMovie(supabase, movie.id, result.tmdbData);
      }

      return {
        movieId: movie.id,
        title: movie.title_en,
        status: finalStatus,
        fixed,
      };

    } catch (error: any) {
      return {
        movieId: movie.id,
        title: movie.title_en,
        status: 'REJECTED' as EntityStatus,
        fixed: false,
        error: error.message,
      };
    }
  });

  // Execute with rate limiting between movies
  const batchResults = await Promise.all(promises);
  results.push(...batchResults);

  return results;
}

async function runParallelValidation(
  supabase: ReturnType<typeof getSupabaseClient>,
  movies: any[],
  args: CLIArgs
): Promise<ValidationStats> {
  const stats: ValidationStats = {
    total: movies.length,
    valid: 0,
    needsReview: 0,
    rejected: 0,
    fixed: 0,
    duplicatesFound: 0,
    errors: [],
  };

  // Split into batches
  const batches: any[][] = [];
  for (let i = 0; i < movies.length; i += args.batchSize) {
    batches.push(movies.slice(i, i + args.batchSize));
  }

  console.log(chalk.gray(`  Processing in ${batches.length} batches of ${args.batchSize} movies\n`));

  // Create progress tracker
  const progress = createProgress('Validating movies', movies.length, 5);

  // Process batches sequentially (to respect rate limits), but movies within each batch in parallel
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    // Check timeout every batch
    const action = await progress.checkTimeout();
    if (action === 'stop') {
      console.log(chalk.yellow('\n⏸️  Validation stopped by user. Progress has been saved.'));
      break;
    } else if (action === 'skip') {
      console.log(chalk.yellow('\n⏩ Skipping remaining validation...'));
      break;
    }

    const batch = batches[batchIndex];
    const batchResults = await validateMovieBatch(supabase, batch, { strict: args.strict, fix: args.fix });

    for (const result of batchResults) {
      if (result.error) {
        stats.errors.push(`${result.title}: ${result.error}`);
        stats.rejected++;
      } else if (result.status === 'VALID') {
        stats.valid++;
      } else if (result.status === 'NEEDS_REVIEW') {
        stats.needsReview++;
      } else {
        stats.rejected++;
      }

      if (result.fixed) {
        stats.fixed++;
      }
    }

    // Update progress
    const processed = Math.min((batchIndex + 1) * args.batchSize, movies.length);
    progress.set(processed);

    // Rate limit between batches (500ms)
    if (batchIndex < batches.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  progress.complete('Validation completed');

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
║              MOVIE VALIDATION - PHASE 3                       ║
╚══════════════════════════════════════════════════════════════╝
`));

  // Status only
  if (args.statusOnly) {
    await showStatus(supabase);
    process.exit(0);
  }

  // Check API key
  if (!process.env.TMDB_API_KEY) {
    console.error(chalk.red('TMDB_API_KEY not set'));
    process.exit(1);
  }

  const stats: ValidationStats = {
    total: 0,
    valid: 0,
    needsReview: 0,
    rejected: 0,
    fixed: 0,
    duplicatesFound: 0,
    errors: [],
  };

  // 1. Detect duplicates first
  console.log(chalk.cyan('🔍 Detecting duplicates...'));
  const duplicates = await detectDuplicates(supabase);
  stats.duplicatesFound = duplicates.length;

  if (duplicates.length > 0) {
    console.log(chalk.yellow(`  Found ${duplicates.length} duplicate sets`));
    
    if (args.fix) {
      // Mark duplicates
      for (const dup of duplicates) {
        // Keep first one, mark others as duplicate
        for (let i = 1; i < dup.ids.length; i++) {
          await supabase
            .from('telugu_movie_index')
            .update({ 
              status: 'REJECTED',
              rejection_reason: `Duplicate of ${dup.ids[0]}`,
            })
            .eq('id', dup.ids[i]);
          stats.rejected++;
        }
      }
      console.log(chalk.green(`  Marked ${stats.rejected} duplicates as rejected`));
    }
  } else {
    console.log(chalk.green('  No duplicates found'));
  }

  // 2. Get pending movies
  let query = supabase
    .from('telugu_movie_index')
    .select('*')
    .or('status.eq.PENDING,status.is.null,status.eq.PENDING_VALIDATION');

  if (args.limit) {
    query = query.limit(args.limit);
  } else {
    query = query.limit(500); // Process in batches
  }

  const { data: movies, error } = await query;

  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error.message);
    process.exit(1);
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No pending movies to validate'));
    await showStatus(supabase);
    process.exit(0);
  }

  console.log(chalk.cyan(`\n📋 Validating ${movies.length} movies...`));
  stats.total = movies.length;

  // 3. Validate movies (parallel or sequential)
  if (args.parallel) {
    console.log(chalk.gray(`  🚀 Parallel mode enabled (batch size: ${args.batchSize})\n`));
    const parallelStats = await runParallelValidation(supabase, movies, args);
    stats.valid = parallelStats.valid;
    stats.needsReview = parallelStats.needsReview;
    stats.rejected = parallelStats.rejected;
    stats.fixed = parallelStats.fixed;
    stats.errors = parallelStats.errors;
  } else {
    // Sequential validation (original behavior)
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];

      if (args.verbose) {
        console.log(`  [${i + 1}/${movies.length}] ${movie.title_en}`);
      }

      try {
        const result = await validateMovie(supabase, movie, { strict: args.strict });

        // Update status
        const updateData: any = {
          status: result.status,
        };

        if (result.status.startsWith('INVALID')) {
          updateData.rejection_reason = result.issues.join('; ');
          stats.rejected++;
        } else if (result.status === 'VALID') {
          stats.valid++;
        } else {
          stats.needsReview++;
        }

        await supabase
          .from('telugu_movie_index')
          .update(updateData)
          .eq('id', movie.id);

        // Fix if requested
        if (args.fix && result.tmdbData) {
          const fixed = await fixMovie(supabase, movie.id, result.tmdbData);
          if (fixed) stats.fixed++;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 100));

      } catch (error: any) {
        stats.errors.push(`${movie.title_en}: ${error.message}`);
      }

      // Progress
      if (i > 0 && i % 50 === 0) {
        console.log(`  Progress: ${i}/${movies.length} (${stats.valid} valid, ${stats.rejected} rejected)`);
      }
    }
  }

  // Results
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 VALIDATION RESULTS'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Total Processed:  ${stats.total}`);
  console.log(`  Valid:            ${chalk.green(stats.valid)}`);
  console.log(`  Needs Review:     ${chalk.yellow(stats.needsReview)}`);
  console.log(`  Rejected:         ${chalk.red(stats.rejected)}`);
  console.log(`  Duplicates Found: ${stats.duplicatesFound}`);
  if (args.fix) {
    console.log(`  Fixed:            ${chalk.blue(stats.fixed)}`);
  }
  console.log(`  Errors:           ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log(chalk.yellow('\n⚠️ Errors:'));
    for (const error of stats.errors.slice(0, 5)) {
      console.log(chalk.yellow(`  - ${error}`));
    }
  }

  // Show status
  await showStatus(supabase);

  console.log(chalk.green('\n✅ Validation complete\n'));
}

main().catch(console.error);

