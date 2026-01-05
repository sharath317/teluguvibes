#!/usr/bin/env npx tsx
/**
 * Run database migrations for the Telugu movie pipeline
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Load environment
config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigrations() {
  console.log(chalk.cyan.bold('\n📦 Running Database Migrations...\n'));

  // Check if telugu_movie_index table exists
  const { data: existingTable, error: checkError } = await supabase
    .from('telugu_movie_index')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log(chalk.green('✅ telugu_movie_index table already exists'));
  } else if (checkError.code === 'PGRST116' || checkError.message.includes('Could not find')) {
    console.log(chalk.yellow('Creating telugu_movie_index table...'));
    
    // We need to create via SQL - use Supabase Dashboard or direct SQL
    console.log(chalk.red('\n⚠️ Table does not exist. Please run the SQL migration:'));
    console.log(chalk.gray('\n1. Go to Supabase Dashboard → SQL Editor'));
    console.log(chalk.gray('2. Copy and run the contents of: supabase-telugu-movie-index.sql'));
    console.log(chalk.gray('3. Then run this migration again\n'));
    
    console.log(chalk.cyan('Alternatively, you can use the existing movies table.'));
    console.log(chalk.cyan('The discovery will work with --use-existing flag (to be implemented).\n'));
    
    return false;
  }

  // Check story_arcs table
  const { error: storyError } = await supabase
    .from('story_arcs')
    .select('id')
    .limit(1);

  if (!storyError) {
    console.log(chalk.green('✅ story_arcs table already exists'));
  } else {
    console.log(chalk.yellow('⚠️ story_arcs table missing - run supabase-story-arcs.sql'));
  }

  return true;
}

// Alternative: Just use the existing movies table directly
async function testExistingMoviesTable() {
  console.log(chalk.cyan('\n📊 Testing existing movies table...\n'));

  const { count, error } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(chalk.red('❌ movies table error:', error.message));
    return;
  }

  console.log(chalk.green(`✅ movies table exists with ${count} movies`));

  // Get some stats
  const { count: withTmdb } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('tmdb_id', 'is', null);

  const { count: withPoster } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('poster_url', 'is', null);

  const { count: withDirector } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('director', 'is', null);

  console.log(`   With TMDB ID: ${withTmdb || 0}`);
  console.log(`   With Poster: ${withPoster || 0}`);
  console.log(`   With Director: ${withDirector || 0}`);
}

async function main() {
  const migrationOk = await runMigrations();
  await testExistingMoviesTable();

  if (!migrationOk) {
    console.log(chalk.yellow('\n📋 RECOMMENDED ACTIONS:'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('1. Run the SQL migration via Supabase Dashboard');
    console.log('2. Or use existing pipelines that work with movies table:');
    console.log(chalk.cyan('   pnpm movies:ingest:wikipedia --from=2020'));
    console.log(chalk.cyan('   pnpm intel:movie-audit'));
    console.log(chalk.cyan('   pnpm reviews:coverage'));
  }
}

main().catch(console.error);






