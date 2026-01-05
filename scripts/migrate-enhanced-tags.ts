#!/usr/bin/env npx tsx
/**
 * Enhanced Tags Migration Helper
 * 
 * Guides through the migration process for the enhanced tagging system.
 * 
 * Usage:
 *   npx tsx scripts/migrate-enhanced-tags.ts
 *   npx tsx scripts/migrate-enhanced-tags.ts --verify-only
 *   npx tsx scripts/migrate-enhanced-tags.ts --populate
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

async function checkMigrationStatus(): Promise<{
  moviesColumns: boolean;
  reviewsColumns: boolean;
  canonicalLists: boolean;
}> {
  const supabase = getSupabaseClient();
  const status = {
    moviesColumns: false,
    reviewsColumns: false,
    canonicalLists: false,
  };

  // Check movies table new columns
  const { error: moviesError } = await supabase
    .from('movies')
    .select('box_office_category, mood_tags, age_rating')
    .limit(1);
  status.moviesColumns = !moviesError;

  // Check reviews table new columns
  const { error: reviewsError } = await supabase
    .from('movie_reviews')
    .select('why_watch, why_skip, crew_insights')
    .limit(1);
  status.reviewsColumns = !reviewsError;

  // Check canonical_lists table
  const { error: listsError } = await supabase
    .from('canonical_lists')
    .select('id')
    .limit(1);
  status.canonicalLists = !listsError;

  return status;
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify-only') || args.includes('--verify');
  const populateOnly = args.includes('--populate');

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║         ENHANCED TAGS MIGRATION HELPER                           ║
╚══════════════════════════════════════════════════════════════════╝
`));

  // Step 1: Check current migration status
  console.log(chalk.yellow('📊 Checking migration status...\n'));
  const status = await checkMigrationStatus();

  console.log('Migration Status:');
  console.log(`  Movies table columns:    ${status.moviesColumns ? chalk.green('✅ Migrated') : chalk.red('❌ Pending')}`);
  console.log(`  Reviews table columns:   ${status.reviewsColumns ? chalk.green('✅ Migrated') : chalk.red('❌ Pending')}`);
  console.log(`  Canonical lists table:   ${status.canonicalLists ? chalk.green('✅ Migrated') : chalk.red('❌ Pending')}`);

  if (verifyOnly) {
    console.log(chalk.cyan('\n📋 Verification complete.'));
    return;
  }

  // If all migrated, skip to population
  if (status.moviesColumns && status.reviewsColumns && status.canonicalLists) {
    console.log(chalk.green('\n✅ All migrations already applied!'));
    
    if (!populateOnly) {
      const proceed = await promptUser('\nProceed to populate tags? (y/n): ');
      if (proceed !== 'y' && proceed !== 'yes') {
        console.log('Exiting.');
        return;
      }
    }
  } else {
    // Need to run migrations
    console.log(chalk.yellow('\n📋 Migrations needed. Follow these steps:\n'));

    if (!status.moviesColumns || !status.reviewsColumns) {
      console.log(chalk.cyan('1. Run supabase-enhanced-tags-schema.sql'));
      console.log(chalk.gray('   Copying to clipboard...'));
      try {
        execSync('cat supabase-enhanced-tags-schema.sql | pbcopy', { cwd: process.cwd() });
        console.log(chalk.green('   ✅ Copied to clipboard!'));
      } catch {
        console.log(chalk.yellow('   ⚠️  Could not copy. Run manually:'));
        console.log(chalk.gray('      cat supabase-enhanced-tags-schema.sql | pbcopy'));
      }
      console.log(chalk.gray('   Go to Supabase Dashboard → SQL Editor → Paste & Run\n'));
    }

    if (!status.canonicalLists) {
      console.log(chalk.cyan('2. Run supabase-canonical-lists-schema.sql'));
      console.log(chalk.gray('   After step 1, run:'));
      console.log(chalk.gray('      cat supabase-canonical-lists-schema.sql | pbcopy'));
      console.log(chalk.gray('   Then paste & run in Supabase SQL Editor\n'));
    }

    console.log(chalk.yellow('After running migrations, re-run this script to verify and populate.\n'));
    return;
  }

  // Step 2: Populate tags
  console.log(chalk.yellow('\n🏷️  Populating tags for movies...\n'));

  const supabase = getSupabaseClient();

  // Get movies that need tagging
  const { data: movies, error: fetchError } = await supabase
    .from('movies')
    .select('id, title_en, our_rating, avg_rating, genres, release_year, is_blockbuster')
    .is('box_office_category', null)
    .eq('is_published', true)
    .limit(100);

  if (fetchError) {
    console.error(chalk.red('Error fetching movies:'), fetchError.message);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies need tagging!'));
    return;
  }

  console.log(chalk.gray(`Found ${movies.length} movies to tag\n`));

  let tagged = 0;
  for (const movie of movies) {
    // Derive box_office_category from is_blockbuster and rating
    let box_office_category = 'average';
    const rating = movie.our_rating || movie.avg_rating || 0;
    
    if (movie.is_blockbuster) {
      box_office_category = rating >= 8 ? 'industry-hit' : 'blockbuster';
    } else if (rating >= 8) {
      box_office_category = 'super-hit';
    } else if (rating >= 7) {
      box_office_category = 'hit';
    } else if (rating >= 5) {
      box_office_category = 'average';
    } else {
      box_office_category = 'below-average';
    }

    // Derive mood_tags from genres
    const genres = movie.genres || [];
    const mood_tags: string[] = [];
    
    if (genres.some((g: string) => ['Comedy', 'Family'].includes(g))) {
      mood_tags.push('feel-good');
    }
    if (genres.some((g: string) => ['Thriller', 'Crime', 'Horror'].includes(g))) {
      mood_tags.push('dark-intense');
    }
    if (genres.some((g: string) => ['Drama'].includes(g)) && rating >= 7.5) {
      mood_tags.push('thought-provoking');
    }
    if (genres.some((g: string) => ['Action'].includes(g))) {
      mood_tags.push('edge-of-seat');
    }
    if (movie.release_year && movie.release_year < 2000) {
      mood_tags.push('nostalgic');
    }

    // Update movie
    const { error: updateError } = await supabase
      .from('movies')
      .update({
        box_office_category,
        mood_tags: mood_tags.length > 0 ? mood_tags : null,
      })
      .eq('id', movie.id);

    if (!updateError) {
      tagged++;
      process.stdout.write(`\r  Tagged: ${tagged}/${movies.length}`);
    }
  }

  console.log(chalk.green(`\n\n✅ Tagged ${tagged} movies!`));
  
  // Show sample
  const { data: sample } = await supabase
    .from('movies')
    .select('title_en, box_office_category, mood_tags')
    .not('box_office_category', 'is', null)
    .limit(5);

  if (sample) {
    console.log(chalk.cyan('\n📋 Sample tagged movies:'));
    sample.forEach(m => {
      console.log(`  ${m.title_en}: ${m.box_office_category} | ${(m.mood_tags || []).join(', ')}`);
    });
  }

  console.log(chalk.green('\n✅ Migration and population complete!'));
}

main().catch(console.error);

