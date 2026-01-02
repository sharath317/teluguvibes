#!/usr/bin/env npx tsx
/**
 * FAST FINALIZE PIPELINE
 * 
 * Lightweight version that:
 * - Calculates completeness scores in batches
 * - Promotes movies that meet minimum thresholds
 * - Skips slow external script calls
 * - Provides real-time progress feedback
 * 
 * Usage:
 *   pnpm finalize:fast          # Run fast finalization
 *   pnpm finalize:fast --dry    # Preview mode
 *   pnpm finalize:fast --status # Check status only
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const BATCH_SIZE = 100;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

interface Movie {
  id: string;
  title_en: string | null;
  tmdb_id: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  director: string | null;
  hero: string | null;
  heroine: string | null;
  genres: string[] | null;
  cast_members: string[] | null;
  release_year: number | null;
  is_published: boolean;
  ingestion_status: string | null;
  completeness_score: number | null;
}

function calculateScore(movie: Movie): number {
  let score = 0;
  
  // Essential fields (0.6 total)
  if (movie.tmdb_id) score += 0.15;
  if (movie.title_en && movie.title_en.length > 2) score += 0.15;
  if (movie.poster_url) score += 0.15;
  if (movie.backdrop_url) score += 0.15;
  
  // Metadata fields (0.4 total)
  if (movie.director) score += 0.1;
  if (movie.hero) score += 0.05;
  if (movie.heroine) score += 0.05;
  if (movie.genres && movie.genres.length > 0) score += 0.1;
  if (movie.cast_members && movie.cast_members.length >= 2) score += 0.05;
  if (movie.release_year && movie.release_year >= 1900) score += 0.05;
  
  return Math.round(score * 100) / 100;
}

async function showStatus() {
  const supabase = getSupabaseClient();
  
  console.log(chalk.cyan.bold('\n📊 FINALIZATION STATUS\n'));
  
  // Get counts by ingestion_status
  const statuses = ['raw', 'partial', 'enriched', 'verified', 'published'];
  
  for (const status of statuses) {
    const { count } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .eq('ingestion_status', status);
    
    const bar = '█'.repeat(Math.min(Math.floor((count || 0) / 100), 30));
    console.log(`  ${status.padEnd(12)} ${chalk.green(bar)} ${count || 0}`);
  }
  
  // NULL status
  const { count: nullCount } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .is('ingestion_status', null);
  console.log(`  ${'null'.padEnd(12)} ${chalk.yellow('█'.repeat(Math.min(Math.floor((nullCount || 0) / 100), 30)))} ${nullCount || 0}`);
  
  // Published stats
  const { count: publishedCount } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  
  console.log(chalk.cyan(`\n  Published: ${publishedCount || 0} movies`));
  
  // Quality distribution
  const { data: qualityData } = await supabase
    .from('movies')
    .select('completeness_score')
    .not('completeness_score', 'is', null);
  
  if (qualityData && qualityData.length > 0) {
    const scores = qualityData.map(m => m.completeness_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const high = scores.filter(s => s >= 0.7).length;
    const medium = scores.filter(s => s >= 0.4 && s < 0.7).length;
    const low = scores.filter(s => s < 0.4).length;
    
    console.log(chalk.cyan(`\n  Quality Distribution:`));
    console.log(`    High (≥70%):   ${high}`);
    console.log(`    Medium (40-70%): ${medium}`);
    console.log(`    Low (<40%):    ${low}`);
    console.log(`    Average Score: ${(avg * 100).toFixed(1)}%`);
  }
}

async function runFastFinalize(dryRun: boolean) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();
  
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              FAST FINALIZE PIPELINE                           ║
║         Quick scoring and promotion                           ║
╚══════════════════════════════════════════════════════════════╝
`));
  
  if (dryRun) {
    console.log(chalk.yellow('  🔍 DRY RUN MODE - No changes will be made\n'));
  }
  
  // Step 1: Count movies needing finalization
  console.log(chalk.cyan('Step 1: Counting movies...\n'));
  
  const { count: totalCount } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true });
  
  const { count: needsScoring } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .or('completeness_score.is.null,ingestion_status.is.null,ingestion_status.eq.partial,ingestion_status.eq.raw');
  
  console.log(`  Total movies: ${totalCount}`);
  console.log(`  Needs scoring: ${needsScoring}\n`);
  
  if (!needsScoring || needsScoring === 0) {
    console.log(chalk.green('  ✅ All movies already finalized!'));
    return;
  }
  
  // Step 2: Process in batches
  console.log(chalk.cyan('Step 2: Processing movies in batches...\n'));
  
  let processed = 0;
  let promoted = 0;
  let updated = 0;
  let offset = 0;
  
  while (true) {
    // Fetch batch
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title_en, tmdb_id, poster_url, backdrop_url, director, hero, heroine, genres, cast_members, release_year, is_published, ingestion_status, completeness_score')
      .or('completeness_score.is.null,ingestion_status.is.null,ingestion_status.eq.partial,ingestion_status.eq.raw')
      .range(offset, offset + BATCH_SIZE - 1);
    
    if (error) {
      console.error(chalk.red(`  Error fetching batch: ${error.message}`));
      break;
    }
    
    if (!movies || movies.length === 0) break;
    
    // Process batch
    for (const movie of movies) {
      const score = calculateScore(movie as Movie);
      const shouldPromote = score >= 0.5 && movie.tmdb_id && movie.poster_url;
      
      if (!dryRun) {
        // Determine new status
        let newStatus = movie.ingestion_status || 'raw';
        if (shouldPromote) {
          newStatus = 'verified';
          promoted++;
        } else if (score >= 0.3) {
          newStatus = 'enriched';
        } else if (movie.tmdb_id) {
          newStatus = 'partial';
        }
        
        // Update movie
        const { error: updateError } = await supabase
          .from('movies')
          .update({
            completeness_score: score,
            ingestion_status: newStatus,
          })
          .eq('id', movie.id);
        
        if (!updateError) updated++;
      }
      
      processed++;
    }
    
    // Progress indicator
    const pct = Math.round((processed / needsScoring) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${bar}] ${pct}% (${processed}/${needsScoring})`);
    
    // Move to next batch
    if (movies.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  
  console.log('\n');
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════
📊 FINALIZATION SUMMARY
═══════════════════════════════════════════════════════════
`));
  console.log(`  Processed:    ${processed} movies`);
  console.log(`  Updated:      ${updated} movies`);
  console.log(`  Promoted:     ${promoted} movies (verified)`);
  console.log(`  Duration:     ${duration}s`);
  console.log(`  Speed:        ${(processed / parseFloat(duration)).toFixed(0)} movies/sec`);
  
  if (dryRun) {
    console.log(chalk.yellow('\n  [DRY RUN] No changes were made'));
  } else {
    console.log(chalk.green('\n  ✅ Fast finalization complete!'));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const showStatusOnly = args.includes('--status');
  
  if (showStatusOnly) {
    await showStatus();
  } else {
    await runFastFinalize(dryRun);
  }
}

main().catch(console.error);

