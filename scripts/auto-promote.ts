#!/usr/bin/env npx tsx
/**
 * AUTO-PROMOTION SCRIPT
 * 
 * Automatically promotes movies to is_published = true based on quality gates:
 * - Valid title (not null, not a person name)
 * - Valid year (1900-2030)
 * - Has poster OR backdrop
 * - Has at least 1 genre OR TMDB ID
 * 
 * Reviews ENHANCE visibility, they don't block it.
 * 
 * Usage:
 *   pnpm promote:auto           # Run auto-promotion
 *   pnpm promote:auto --dry     # Preview mode
 *   pnpm promote:auto --status  # Show current status
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const BATCH_SIZE = 200;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// Patterns that indicate a person name, not a movie
const PERSON_NAME_PATTERNS = [
  /^[A-Z]\.\s*[A-Z]/i,           // Initials like "A. B. Name"
  /\b(Reddy|Rao|Naidu|Sharma|Kumar|Singh|Varma|Babu)\s*$/i, // Common surname endings
  /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,  // Simple "First Last" pattern
];

function isLikelyPersonName(title: string | null): boolean {
  if (!title) return true;
  if (title.length < 3) return true;
  
  // Check for person name patterns
  for (const pattern of PERSON_NAME_PATTERNS) {
    if (pattern.test(title)) {
      // But allow if it contains typical movie keywords
      const movieKeywords = /movie|film|story|love|war|hero|action|drama|comedy|thriller|horror/i;
      if (!movieKeywords.test(title)) {
        return true;
      }
    }
  }
  
  return false;
}

interface Movie {
  id: string;
  title_en: string | null;
  release_year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  tmdb_id: number | null;
  language: string | null;
  is_published: boolean;
  ingestion_status: string | null;
}

function shouldPromote(movie: Movie): { promote: boolean; reason: string } {
  // Must have valid title
  if (!movie.title_en || movie.title_en.length < 2) {
    return { promote: false, reason: 'No valid title' };
  }
  
  // Check if likely person name
  if (isLikelyPersonName(movie.title_en)) {
    return { promote: false, reason: 'Looks like person name' };
  }
  
  // Must have valid year
  if (!movie.release_year || movie.release_year < 1900 || movie.release_year > 2030) {
    return { promote: false, reason: 'Invalid year' };
  }
  
  // Must have poster OR backdrop
  if (!movie.poster_url && !movie.backdrop_url) {
    return { promote: false, reason: 'No poster or backdrop' };
  }
  
  // Must have genre OR TMDB ID (indicates verified movie)
  if ((!movie.genres || movie.genres.length === 0) && !movie.tmdb_id) {
    return { promote: false, reason: 'No genre or TMDB ID' };
  }
  
  return { promote: true, reason: 'Meets promotion criteria' };
}

async function showStatus() {
  const supabase = getSupabaseClient();
  
  console.log(chalk.cyan.bold('\n📊 PROMOTION STATUS\n'));
  
  // Total and published
  const { count: total } = await supabase.from('movies').select('id', { count: 'exact', head: true });
  const { count: published } = await supabase.from('movies').select('id', { count: 'exact', head: true }).eq('is_published', true);
  const { count: notPublished } = await supabase.from('movies').select('id', { count: 'exact', head: true }).eq('is_published', false);
  
  console.log(`  Total movies:     ${total}`);
  console.log(`  Published:        ${chalk.green(published)} (${((published || 0) / (total || 1) * 100).toFixed(1)}%)`);
  console.log(`  Not published:    ${chalk.yellow(notPublished)}`);
  
  // Promotable count (has poster + title + year)
  const { count: promotable } = await supabase.from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', false)
    .not('title_en', 'is', null)
    .not('release_year', 'is', null)
    .or('poster_url.not.is.null,backdrop_url.not.is.null');
  
  console.log(`  Promotable:       ${chalk.cyan(promotable)} (have media + title + year)`);
  
  // By language
  console.log(chalk.cyan('\n  By Language:'));
  const languages = ['Telugu', 'Hindi', 'Tamil', 'Malayalam', 'Kannada', 'English'];
  for (const lang of languages) {
    const { count: langTotal } = await supabase.from('movies').select('id', { count: 'exact', head: true }).eq('language', lang);
    const { count: langPub } = await supabase.from('movies').select('id', { count: 'exact', head: true }).eq('language', lang).eq('is_published', true);
    const pct = (langTotal || 0) > 0 ? ((langPub || 0) / (langTotal || 1) * 100).toFixed(0) : '0';
    console.log(`    ${lang.padEnd(12)} ${langPub}/${langTotal} (${pct}% visible)`);
  }
}

async function runAutoPromotion(dryRun: boolean) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();
  
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              AUTO-PROMOTION PIPELINE                          ║
║         Promote verified movies to UI visibility              ║
╚══════════════════════════════════════════════════════════════╝
`));
  
  if (dryRun) {
    console.log(chalk.yellow('  🔍 DRY RUN MODE - No changes will be made\n'));
  }
  
  // Get all unpublished movies
  const { data: movies, error, count } = await supabase
    .from('movies')
    .select('id, title_en, release_year, poster_url, backdrop_url, genres, tmdb_id, language, is_published, ingestion_status', { count: 'exact' })
    .eq('is_published', false);
  
  if (error) {
    console.error(chalk.red('Error fetching movies:', error.message));
    return;
  }
  
  console.log(`  Found ${count} unpublished movies to evaluate\n`);
  
  if (!movies || movies.length === 0) {
    console.log(chalk.green('  ✅ All movies are already published!'));
    return;
  }
  
  let promoted = 0;
  let skipped = 0;
  let processed = 0;
  const promotionBatch: string[] = [];
  const reasons: Record<string, number> = {};
  
  for (const movie of movies) {
    const { promote, reason } = shouldPromote(movie as Movie);
    
    if (promote) {
      promotionBatch.push(movie.id);
      promoted++;
    } else {
      reasons[reason] = (reasons[reason] || 0) + 1;
      skipped++;
    }
    
    processed++;
    
    // Process batch
    if (promotionBatch.length >= BATCH_SIZE || processed === movies.length) {
      if (promotionBatch.length > 0 && !dryRun) {
        const { error: updateError } = await supabase
          .from('movies')
          .update({ is_published: true })
          .in('id', promotionBatch);
        
        if (updateError) {
          console.error(chalk.red(`  Error updating batch: ${updateError.message}`));
        }
        promotionBatch.length = 0; // Clear batch
      }
      
      // Progress
      const pct = Math.round((processed / movies.length) * 100);
      const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
      process.stdout.write(`\r  [${bar}] ${pct}% (${processed}/${movies.length})`);
    }
  }
  
  console.log('\n');
  
  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════
📊 PROMOTION SUMMARY
═══════════════════════════════════════════════════════════
`));
  console.log(`  Evaluated:    ${processed} movies`);
  console.log(`  Promoted:     ${chalk.green(promoted)} movies`);
  console.log(`  Skipped:      ${chalk.yellow(skipped)} movies`);
  console.log(`  Duration:     ${duration}s`);
  
  if (Object.keys(reasons).length > 0) {
    console.log(chalk.cyan('\n  Skip Reasons:'));
    Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => {
        console.log(`    ${reason.padEnd(25)} ${count}`);
      });
  }
  
  if (dryRun) {
    console.log(chalk.yellow('\n  [DRY RUN] No changes were made'));
  } else {
    console.log(chalk.green('\n  ✅ Auto-promotion complete!'));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const showStatusOnly = args.includes('--status');
  
  if (showStatusOnly) {
    await showStatus();
  } else {
    await runAutoPromotion(dryRun);
    console.log('\n');
    await showStatus();
  }
}

main().catch(console.error);

