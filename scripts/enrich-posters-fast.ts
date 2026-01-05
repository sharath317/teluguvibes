#!/usr/bin/env npx tsx
/**
 * FAST POSTER ENRICHMENT
 * 
 * Fetches posters for movies that already have TMDB IDs but no poster.
 * Uses parallel processing for speed.
 * 
 * Usage:
 *   pnpm enrich:posters           # Enrich posters
 *   pnpm enrich:posters --dry     # Preview mode
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const BATCH_SIZE = 20;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

async function fetchTmdbPoster(tmdbId: number): Promise<{ poster: string | null; backdrop: string | null }> {
  try {
    const response = await fetch(
      `${TMDB_BASE}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      return { poster: null, backdrop: null };
    }
    
    const data = await response.json();
    
    return {
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
    };
  } catch {
    return { poster: null, backdrop: null };
  }
}

async function main() {
  const supabase = getSupabaseClient();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              FAST POSTER ENRICHMENT                           ║
║         Fetch posters for movies with TMDB IDs                ║
╚══════════════════════════════════════════════════════════════╝
`));
  
  if (dryRun) {
    console.log(chalk.yellow('  🔍 DRY RUN MODE\n'));
  }
  
  // Get movies with TMDB ID but no poster
  const { data: movies, error, count } = await supabase
    .from('movies')
    .select('id, title_en, tmdb_id, poster_url, backdrop_url', { count: 'exact' })
    .not('tmdb_id', 'is', null)
    .is('poster_url', null)
    .limit(500);  // Process 500 at a time
  
  if (error) {
    console.error(chalk.red('Error:', error.message));
    return;
  }
  
  console.log(`  Found ${count} movies with TMDB ID but no poster`);
  console.log(`  Processing ${movies?.length || 0} movies this batch\n`);
  
  if (!movies || movies.length === 0) {
    console.log(chalk.green('  ✅ All movies with TMDB IDs have posters!'));
    return;
  }
  
  const startTime = Date.now();
  let enriched = 0;
  let failed = 0;
  
  // Process in batches
  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE);
    
    // Fetch all posters in parallel
    const results = await Promise.all(
      batch.map(async (movie) => {
        const { poster, backdrop } = await fetchTmdbPoster(movie.tmdb_id);
        return { movie, poster, backdrop };
      })
    );
    
    // Update database
    for (const { movie, poster, backdrop } of results) {
      if (poster || backdrop) {
        if (!dryRun) {
          const updateData: Record<string, string> = {};
          if (poster) updateData.poster_url = poster;
          if (backdrop) updateData.backdrop_url = backdrop;
          
          const { error: updateError } = await supabase
            .from('movies')
            .update(updateData)
            .eq('id', movie.id);
          
          if (!updateError) {
            enriched++;
          } else {
            failed++;
          }
        } else {
          enriched++;
        }
      } else {
        failed++;
      }
    }
    
    // Progress
    const processed = Math.min(i + BATCH_SIZE, movies.length);
    const pct = Math.round((processed / movies.length) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${bar}] ${pct}% (${processed}/${movies.length}) - ${enriched} enriched`);
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n');
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════
📊 POSTER ENRICHMENT SUMMARY
═══════════════════════════════════════════════════════════
`));
  console.log(`  Processed:    ${movies.length} movies`);
  console.log(`  Enriched:     ${chalk.green(enriched)} movies`);
  console.log(`  Failed:       ${chalk.yellow(failed)} movies`);
  console.log(`  Duration:     ${duration}s`);
  console.log(`  Speed:        ${(movies.length / parseFloat(duration)).toFixed(0)} movies/sec`);
  
  if (dryRun) {
    console.log(chalk.yellow('\n  [DRY RUN] No changes were made'));
  } else {
    console.log(chalk.green('\n  ✅ Poster enrichment complete!'));
    
    // Run auto-promote after enrichment
    console.log(chalk.cyan('\n  Running auto-promotion...'));
  }
}

main().catch(console.error);





