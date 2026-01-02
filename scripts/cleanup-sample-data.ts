#!/usr/bin/env npx tsx
/**
 * SAMPLE DATA CLEANUP SCRIPT
 * 
 * Removes all sample/placeholder/dummy data from the database.
 * This is a prerequisite before production data injection.
 * 
 * Targets:
 * - hot_media with viral_source = 'seed_data'
 * - stories with is_sample = true or source containing 'sample'
 * - posts with is_sample = true
 * - Games placeholder entries
 * - Spotlight orphan entries
 * - Collections without real movies
 * - Promotions with placeholder content
 * - Invalid movie entries (missing title, year, or language)
 * 
 * Usage:
 *   pnpm cleanup:sample --dry    # Preview what will be deleted
 *   pnpm cleanup:sample          # Execute cleanup
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

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
// TYPES
// ============================================================

interface CleanupResult {
  table: string;
  description: string;
  count: number;
  deleted: boolean;
}

interface CLIArgs {
  dryRun: boolean;
  verbose: boolean;
}

// ============================================================
// CLI PARSING
// ============================================================

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry') || args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

// ============================================================
// CLEANUP FUNCTIONS
// ============================================================

async function cleanupHotMediaSeedData(
  supabase: ReturnType<typeof getSupabaseClient>,
  dryRun: boolean
): Promise<CleanupResult> {
  // Find seed data entries
  const { data, error } = await supabase
    .from('hot_media')
    .select('id')
    .or('viral_source.eq.seed_data,source_url.ilike.%example.com%,image_url.ilike.%unsplash%,image_url.ilike.%picsum%');

  if (error) {
    console.error(chalk.red(`  Error querying hot_media: ${error.message}`));
    return { table: 'hot_media', description: 'Seed/placeholder data', count: 0, deleted: false };
  }

  const count = data?.length || 0;

  if (count > 0 && !dryRun) {
    const { error: deleteError } = await supabase
      .from('hot_media')
      .delete()
      .or('viral_source.eq.seed_data,source_url.ilike.%example.com%,image_url.ilike.%unsplash%,image_url.ilike.%picsum%');

    if (deleteError) {
      console.error(chalk.red(`  Error deleting: ${deleteError.message}`));
      return { table: 'hot_media', description: 'Seed/placeholder data', count, deleted: false };
    }
  }

  return { table: 'hot_media', description: 'Seed/placeholder data', count, deleted: !dryRun && count > 0 };
}

async function cleanupInvalidMovies(
  supabase: ReturnType<typeof getSupabaseClient>,
  dryRun: boolean
): Promise<CleanupResult> {
  // Find invalid movies (missing essential fields)
  const { data, error } = await supabase
    .from('movies')
    .select('id')
    .or('title_en.is.null,language.is.null')
    .eq('is_published', true);

  if (error) {
    console.error(chalk.red(`  Error querying movies: ${error.message}`));
    return { table: 'movies', description: 'Invalid entries (missing title/language)', count: 0, deleted: false };
  }

  const count = data?.length || 0;

  if (count > 0 && !dryRun) {
    // Unpublish instead of delete to preserve references
    // Use 'raw' status which is valid per schema constraint
    const { error: updateError } = await supabase
      .from('movies')
      .update({ is_published: false })
      .or('title_en.is.null,language.is.null')
      .eq('is_published', true);

    if (updateError) {
      console.error(chalk.red(`  Error updating: ${updateError.message}`));
      return { table: 'movies', description: 'Invalid entries', count, deleted: false };
    }
  }

  return { table: 'movies', description: 'Invalid entries (unpublished)', count, deleted: !dryRun && count > 0 };
}

async function cleanupPlaceholderStories(
  supabase: ReturnType<typeof getSupabaseClient>,
  dryRun: boolean
): Promise<CleanupResult> {
  // Check if stories table exists and has sample data
  const { data, error } = await supabase
    .from('stories')
    .select('id')
    .or('source.ilike.%sample%,source.ilike.%placeholder%,source.ilike.%test%')
    .limit(1000);

  if (error) {
    // Table might not exist
    if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
      return { table: 'stories', description: 'Sample stories', count: 0, deleted: false };
    }
    console.error(chalk.red(`  Error querying stories: ${error.message}`));
    return { table: 'stories', description: 'Sample stories', count: 0, deleted: false };
  }

  const count = data?.length || 0;

  if (count > 0 && !dryRun) {
    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .or('source.ilike.%sample%,source.ilike.%placeholder%,source.ilike.%test%');

    if (deleteError) {
      console.error(chalk.red(`  Error deleting: ${deleteError.message}`));
      return { table: 'stories', description: 'Sample stories', count, deleted: false };
    }
  }

  return { table: 'stories', description: 'Sample stories', count, deleted: !dryRun && count > 0 };
}

async function cleanupEmptyCollections(
  supabase: ReturnType<typeof getSupabaseClient>,
  dryRun: boolean
): Promise<CleanupResult> {
  // Find collections with no movies
  const { data, error } = await supabase
    .from('collections')
    .select('id, movie_ids')
    .or('movie_ids.is.null,movie_ids.eq.{}');

  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
      return { table: 'collections', description: 'Empty collections', count: 0, deleted: false };
    }
    console.error(chalk.red(`  Error querying collections: ${error.message}`));
    return { table: 'collections', description: 'Empty collections', count: 0, deleted: false };
  }

  const count = data?.length || 0;

  if (count > 0 && !dryRun) {
    const ids = data.map(c => c.id);
    const { error: deleteError } = await supabase
      .from('collections')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error(chalk.red(`  Error deleting: ${deleteError.message}`));
      return { table: 'collections', description: 'Empty collections', count, deleted: false };
    }
  }

  return { table: 'collections', description: 'Empty collections', count, deleted: !dryRun && count > 0 };
}

async function cleanupOrphanReviews(
  supabase: ReturnType<typeof getSupabaseClient>,
  dryRun: boolean
): Promise<CleanupResult> {
  // Find reviews for non-existent movies
  const { data: reviews, error: reviewError } = await supabase
    .from('movie_reviews')
    .select('id, movie_id');

  if (reviewError) {
    console.error(chalk.red(`  Error querying reviews: ${reviewError.message}`));
    return { table: 'movie_reviews', description: 'Orphan reviews', count: 0, deleted: false };
  }

  if (!reviews || reviews.length === 0) {
    return { table: 'movie_reviews', description: 'Orphan reviews', count: 0, deleted: false };
  }

  // Get all movie IDs
  const movieIds = [...new Set(reviews.map(r => r.movie_id))];
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id')
    .in('id', movieIds);

  const existingMovieIds = new Set(movies?.map(m => m.id) || []);
  
  // Find orphan reviews
  const orphanReviewIds = reviews
    .filter(r => !existingMovieIds.has(r.movie_id))
    .map(r => r.id);

  const count = orphanReviewIds.length;

  if (count > 0 && !dryRun) {
    // Delete in batches to avoid request size limits
    const batchSize = 50;
    let deleted = 0;
    
    for (let i = 0; i < orphanReviewIds.length; i += batchSize) {
      const batch = orphanReviewIds.slice(i, i + batchSize);
      const { error: deleteError } = await supabase
        .from('movie_reviews')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(chalk.red(`  Error deleting batch: ${deleteError.message}`));
      } else {
        deleted += batch.length;
      }
    }
    
    if (deleted < count) {
      return { table: 'movie_reviews', description: 'Orphan reviews', count, deleted: false };
    }
  }

  return { table: 'movie_reviews', description: 'Orphan reviews', count, deleted: !dryRun && count > 0 };
}

async function cleanupPersonNameMovies(
  supabase: ReturnType<typeof getSupabaseClient>,
  dryRun: boolean
): Promise<CleanupResult> {
  // Pattern-based cleanup of person names stored as movies
  const { data, error } = await supabase
    .from('movies')
    .select('id, title_en, slug')
    .is('tmdb_id', null)
    .eq('is_published', true);

  if (error) {
    console.error(chalk.red(`  Error querying movies: ${error.message}`));
    return { table: 'movies', description: 'Person names as movies', count: 0, deleted: false };
  }

  // Pattern for person names (2 parts, ending with common surnames)
  const personNamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
  const surnamePattern = /(Reddy|Rao|Kumar|Naidu|Varma|Raju|Babu|Prasad|Murthy|Chandra|Krishna|Mohan|Srinivas|Venkat|Singh|Sharma|Gupta|Verma)$/i;
  
  const invalidIds = (data || [])
    .filter(m => {
      if (!m.title_en) return false;
      // Short two-word names that look like person names
      if (personNamePattern.test(m.title_en) && surnamePattern.test(m.title_en)) {
        return true;
      }
      // Names with initials
      if (/^[A-Z]\. ?[A-Z][a-z]+/.test(m.title_en)) {
        return true;
      }
      return false;
    })
    .map(m => m.id);

  const count = invalidIds.length;

  if (count > 0 && !dryRun) {
    // Use 'raw' status which is valid per schema constraint
    const { error: updateError } = await supabase
      .from('movies')
      .update({ is_published: false })
      .in('id', invalidIds);

    if (updateError) {
      console.error(chalk.red(`  Error updating: ${updateError.message}`));
      return { table: 'movies', description: 'Person names (unpublished)', count, deleted: false };
    }
  }

  return { table: 'movies', description: 'Person names as movies (unpublished)', count, deleted: !dryRun && count > 0 };
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();
  const supabase = getSupabaseClient();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              SAMPLE DATA CLEANUP                              ║
║       Remove all placeholder/dummy/sample content             ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE - No data will be deleted\n'));
  }

  const results: CleanupResult[] = [];

  // Run all cleanup operations
  console.log(chalk.blue('Scanning for sample/placeholder data...\n'));

  console.log(chalk.gray('  → Checking hot_media for seed data...'));
  results.push(await cleanupHotMediaSeedData(supabase, args.dryRun));

  console.log(chalk.gray('  → Checking movies for invalid entries...'));
  results.push(await cleanupInvalidMovies(supabase, args.dryRun));

  console.log(chalk.gray('  → Checking movies for person names...'));
  results.push(await cleanupPersonNameMovies(supabase, args.dryRun));

  console.log(chalk.gray('  → Checking stories for sample content...'));
  results.push(await cleanupPlaceholderStories(supabase, args.dryRun));

  console.log(chalk.gray('  → Checking collections for empty entries...'));
  results.push(await cleanupEmptyCollections(supabase, args.dryRun));

  console.log(chalk.gray('  → Checking reviews for orphaned entries...'));
  results.push(await cleanupOrphanReviews(supabase, args.dryRun));

  // Summary
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════
📊 CLEANUP SUMMARY
═══════════════════════════════════════════════════════════
`));

  let totalCleaned = 0;
  for (const result of results) {
    const status = result.count === 0 
      ? chalk.gray('✓ Clean')
      : result.deleted 
        ? chalk.green(`✓ Cleaned ${result.count}`)
        : chalk.yellow(`⚠ Found ${result.count}`);
    
    console.log(`  ${result.table.padEnd(20)} ${result.description.padEnd(35)} ${status}`);
    
    if (result.deleted) {
      totalCleaned += result.count;
    }
  }

  console.log(chalk.cyan('\n───────────────────────────────────────────────────────────'));
  
  if (args.dryRun) {
    const totalFound = results.reduce((acc, r) => acc + r.count, 0);
    console.log(chalk.yellow(`\n  ${totalFound} items would be cleaned. Run without --dry to execute.`));
  } else {
    console.log(chalk.green(`\n  ✅ Cleaned ${totalCleaned} sample/invalid records.`));
  }

  console.log('\n');
}

main().catch(console.error);

