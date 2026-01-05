#!/usr/bin/env npx tsx
/**
 * Audience Fit Derivation Script
 * 
 * Derives audience_fit JSONB from existing movie data:
 * - kids_friendly: based on age_rating and genres
 * - family_watch: based on genres and rating
 * - date_movie: romance/comedy genres
 * - group_watch: action/comedy/horror genres
 * - solo_watch: high-rated dramas
 * 
 * This is 100% derivation - no external API calls needed.
 * 
 * Usage:
 *   npx tsx scripts/derive-audience-fit.ts
 *   npx tsx scripts/derive-audience-fit.ts --limit=500
 *   npx tsx scripts/derive-audience-fit.ts --dry
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface AudienceFit {
  kids_friendly: boolean;
  family_watch: boolean;
  date_movie: boolean;
  group_watch: boolean;
  solo_watch: boolean;
}

interface Movie {
  id: string;
  title_en: string;
  genres: string[] | null;
  age_rating: string | null;
  our_rating: number | null;
  avg_rating: number | null;
  trigger_warnings: string[] | null;
  is_blockbuster: boolean | null;
}

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
// DERIVATION LOGIC
// ============================================================

function deriveAudienceFit(movie: Movie): AudienceFit {
  const genres = movie.genres || [];
  const rating = movie.our_rating || movie.avg_rating || 0;
  const ageRating = movie.age_rating;
  const warnings = movie.trigger_warnings || [];

  // Check for adult content indicators
  const hasViolence = warnings.includes('violence') || warnings.includes('gore');
  const hasMatureContent = warnings.includes('sexual-content') || warnings.includes('abuse');
  const isAdultRated = ageRating === 'A' || ageRating === 'S';

  // Genre checks
  const hasFamily = genres.some(g => ['Family', 'Animation'].includes(g));
  const hasComedy = genres.includes('Comedy');
  const hasRomance = genres.includes('Romance');
  const hasAction = genres.includes('Action');
  const hasHorror = genres.includes('Horror');
  const hasThriller = genres.includes('Thriller');
  const hasDrama = genres.includes('Drama');
  const hasCrime = genres.includes('Crime');

  // Derive audience fit
  const audienceFit: AudienceFit = {
    // Kids friendly: U rating, family/animation genres, no violence
    kids_friendly: (
      (ageRating === 'U' || (!ageRating && hasFamily)) &&
      !hasViolence &&
      !hasMatureContent &&
      !hasHorror &&
      !hasCrime
    ),

    // Family watch: U/U/A rating, no mature content, family-friendly genres
    family_watch: (
      (ageRating === 'U' || ageRating === 'U/A' || !ageRating) &&
      !hasMatureContent &&
      (hasFamily || hasComedy || (hasDrama && !hasViolence))
    ),

    // Date movie: Romance or light comedy, good ratings
    date_movie: (
      (hasRomance || (hasComedy && !hasHorror)) &&
      rating >= 6 &&
      !isAdultRated
    ),

    // Group watch: Action, comedy, or horror - crowd pleasers
    group_watch: (
      (hasAction || hasComedy || hasHorror || hasThriller) &&
      rating >= 5.5
    ),

    // Solo watch: High-rated dramas or thought-provoking films
    solo_watch: (
      hasDrama &&
      rating >= 7 &&
      !hasAction
    ),
  };

  return audienceFit;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

async function deriveAllAudienceFit(limit: number, dryRun: boolean): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║         AUDIENCE FIT DERIVATION                                  ║
╚══════════════════════════════════════════════════════════════════╝
`));

  const supabase = getSupabaseClient();

  // Fetch movies without audience_fit or with empty audience_fit
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, genres, age_rating, our_rating, avg_rating, trigger_warnings, is_blockbuster')
    .or('audience_fit.is.null,audience_fit.eq.{}')
    .eq('is_published', true)
    .limit(limit);

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error.message);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies need audience fit derivation!'));
    return;
  }

  console.log(chalk.gray(`Found ${movies.length} movies to process\n`));

  if (dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  let processed = 0;
  let failed = 0;

  // Track stats
  const stats = {
    kids_friendly: 0,
    family_watch: 0,
    date_movie: 0,
    group_watch: 0,
    solo_watch: 0,
  };

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    process.stdout.write(`\r  Processing: ${i + 1}/${movies.length}`);

    const audienceFit = deriveAudienceFit(movie);

    // Update stats
    if (audienceFit.kids_friendly) stats.kids_friendly++;
    if (audienceFit.family_watch) stats.family_watch++;
    if (audienceFit.date_movie) stats.date_movie++;
    if (audienceFit.group_watch) stats.group_watch++;
    if (audienceFit.solo_watch) stats.solo_watch++;

    if (dryRun) {
      processed++;
      continue;
    }

    // Update the movie
    const { error: updateError } = await supabase
      .from('movies')
      .update({ audience_fit: audienceFit })
      .eq('id', movie.id);

    if (updateError) {
      failed++;
    } else {
      processed++;
    }
  }

  console.log(`\n`);
  console.log(chalk.green(`\n✅ Derivation complete!`));
  console.log(chalk.gray(`   Processed: ${processed}`));
  console.log(chalk.gray(`   Failed: ${failed}`));

  console.log(chalk.cyan('\n📊 Audience Fit Distribution:'));
  console.log(`   🧒 Kids Friendly:  ${stats.kids_friendly} (${Math.round(stats.kids_friendly/processed*100)}%)`);
  console.log(`   👨‍👩‍👧 Family Watch:   ${stats.family_watch} (${Math.round(stats.family_watch/processed*100)}%)`);
  console.log(`   💕 Date Movie:     ${stats.date_movie} (${Math.round(stats.date_movie/processed*100)}%)`);
  console.log(`   👥 Group Watch:    ${stats.group_watch} (${Math.round(stats.group_watch/processed*100)}%)`);
  console.log(`   🧘 Solo Watch:     ${stats.solo_watch} (${Math.round(stats.solo_watch/processed*100)}%)`);

  // Show sample results
  if (!dryRun && processed > 0) {
    const { data: samples } = await supabase
      .from('movies')
      .select('title_en, audience_fit')
      .not('audience_fit', 'eq', '{}')
      .order('updated_at', { ascending: false })
      .limit(3);

    if (samples?.length) {
      console.log(chalk.cyan('\n📋 Sample results:'));
      samples.forEach(m => {
        const fit = m.audience_fit as AudienceFit;
        const tags = [];
        if (fit.kids_friendly) tags.push('👶');
        if (fit.family_watch) tags.push('👨‍👩‍👧');
        if (fit.date_movie) tags.push('💕');
        if (fit.group_watch) tags.push('👥');
        if (fit.solo_watch) tags.push('🧘');
        console.log(`   ${m.title_en}: ${tags.join(' ')}`);
      });
    }
  }
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '500');
const dryRun = args.includes('--dry') || args.includes('--dry-run');

deriveAllAudienceFit(limit, dryRun).catch(console.error);

