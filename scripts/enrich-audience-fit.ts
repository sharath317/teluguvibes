#!/usr/bin/env npx tsx
/**
 * AUDIENCE FIT ENRICHMENT SCRIPT
 * 
 * Derives audience suitability signals:
 *   - kids_friendly: Safe for children under 12
 *   - family_watch: Suitable for family viewing
 *   - date_movie: Good for couples
 *   - group_watch: Fun for group viewing
 *   - solo_watch: Best experienced alone
 * 
 * Also derives watch_recommendation:
 *   - theater-must: Big screen experience essential
 *   - theater-preferred: Better in theater
 *   - ott-friendly: Works well on streaming
 *   - any: No strong preference
 * 
 * Usage:
 *   npx tsx scripts/enrich-audience-fit.ts --limit=100
 *   npx tsx scripts/enrich-audience-fit.ts --limit=500 --execute
 *   npx tsx scripts/enrich-audience-fit.ts --decade=2020 --execute
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================
// CONFIG
// ============================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CLI argument parsing
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string = ''): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '100'));
const EXECUTE = hasFlag('execute');
const DECADE = getArg('decade', '');
const VERBOSE = hasFlag('verbose') || hasFlag('v');

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

type WatchRecommendation = 'theater-must' | 'theater-preferred' | 'ott-friendly' | 'any';

interface Movie {
  id: string;
  title_en: string;
  release_year: number;
  genres: string[];
  age_rating: string | null;
  trigger_warnings: string[] | null;
  mood_tags: string[] | null;
  avg_rating: number | null;
  runtime_minutes: number | null;
  budget?: number;
  is_blockbuster?: boolean;
  audience_fit: AudienceFit | null;
  watch_recommendation: string | null;
}

interface EnrichmentResult {
  movieId: string;
  title: string;
  audience_fit: AudienceFit;
  watch_recommendation: WatchRecommendation;
  confidence: number;
}

// ============================================================
// GENRE CLASSIFICATIONS
// ============================================================

const KIDS_FRIENDLY_GENRES = ['Animation', 'Family', 'Children', 'Kids'];
const FAMILY_WATCH_GENRES = ['Animation', 'Family', 'Comedy', 'Adventure', 'Fantasy'];
const DATE_MOVIE_GENRES = ['Romance', 'Romantic Comedy', 'Drama', 'Musical'];
const GROUP_WATCH_GENRES = ['Action', 'Comedy', 'Horror', 'Thriller', 'Adventure'];
const SOLO_WATCH_GENRES = ['Drama', 'Art House', 'Documentary', 'Psychological', 'Mystery'];

// Genres that suggest theater viewing
const THEATER_GENRES = ['Action', 'Adventure', 'Sci-Fi', 'Fantasy', 'War', 'Epic'];

// Trigger warnings that affect audience fit
const KIDS_BLOCKING_WARNINGS = ['violence', 'gore', 'sexual-content', 'abuse', 'substance-use', 'suicide'];
const FAMILY_BLOCKING_WARNINGS = ['gore', 'sexual-content', 'abuse', 'suicide'];

// ============================================================
// AUDIENCE FIT DERIVATION
// ============================================================

function deriveAudienceFit(movie: Movie): AudienceFit {
  const genres = movie.genres || [];
  const ageRating = movie.age_rating;
  const warnings = movie.trigger_warnings || [];
  const moodTags = movie.mood_tags || [];

  // Kids friendly check
  let kidsF = false;
  if (ageRating === 'U') {
    kidsF = true;
  }
  if (KIDS_FRIENDLY_GENRES.some(g => genres.includes(g))) {
    kidsF = true;
  }
  // Block if has concerning warnings
  if (warnings.some(w => KIDS_BLOCKING_WARNINGS.includes(w))) {
    kidsF = false;
  }
  if (ageRating === 'A' || ageRating === 'U/A') {
    kidsF = false;
  }

  // Family watch check
  let familyW = false;
  if (ageRating === 'U' || ageRating === 'U/A') {
    familyW = true;
  }
  if (FAMILY_WATCH_GENRES.some(g => genres.includes(g))) {
    familyW = true;
  }
  if (moodTags.includes('feel-good') || moodTags.includes('inspirational')) {
    familyW = true;
  }
  // Block if has concerning warnings
  if (warnings.some(w => FAMILY_BLOCKING_WARNINGS.includes(w))) {
    familyW = false;
  }
  if (ageRating === 'A') {
    familyW = false;
  }

  // Date movie check
  let dateM = false;
  if (DATE_MOVIE_GENRES.some(g => genres.includes(g))) {
    dateM = true;
  }
  if (moodTags.includes('romantic') || moodTags.includes('emotional')) {
    dateM = true;
  }
  // Good rating helps for date movies
  if (movie.avg_rating && movie.avg_rating >= 7.0) {
    if (genres.includes('Romance') || genres.includes('Drama')) {
      dateM = true;
    }
  }
  // Avoid for date if too dark or has disturbing content
  if (warnings.includes('gore') || warnings.includes('disturbing-imagery')) {
    dateM = false;
  }
  if (moodTags.includes('dark-intense') || moodTags.includes('disturbing')) {
    dateM = false;
  }

  // Group watch check
  let groupW = false;
  if (GROUP_WATCH_GENRES.some(g => genres.includes(g))) {
    groupW = true;
  }
  if (moodTags.includes('edge-of-seat') || moodTags.includes('feel-good')) {
    groupW = true;
  }
  // Blockbusters are good for group watch
  if (movie.is_blockbuster) {
    groupW = true;
  }
  // High-energy genres
  if (genres.includes('Action') || genres.includes('Comedy') || genres.includes('Horror')) {
    groupW = true;
  }

  // Solo watch check
  let soloW = false;
  if (SOLO_WATCH_GENRES.some(g => genres.includes(g))) {
    soloW = true;
  }
  if (moodTags.includes('thought-provoking') || moodTags.includes('emotional')) {
    soloW = true;
  }
  // Art films, documentaries
  if (genres.includes('Documentary') || genres.includes('Art House')) {
    soloW = true;
  }
  // Slow-paced dramas
  if (genres.includes('Drama') && !genres.includes('Action')) {
    if (movie.runtime_minutes && movie.runtime_minutes > 150) {
      soloW = true;
    }
  }

  return {
    kids_friendly: kidsF,
    family_watch: familyW,
    date_movie: dateM,
    group_watch: groupW,
    solo_watch: soloW,
  };
}

// ============================================================
// WATCH RECOMMENDATION DERIVATION
// ============================================================

function deriveWatchRecommendation(movie: Movie): WatchRecommendation {
  const genres = movie.genres || [];
  const moodTags = movie.mood_tags || [];
  const runtime = movie.runtime_minutes || 0;
  const isBlockbuster = movie.is_blockbuster || false;

  // Theater must: Big spectacle movies
  if (THEATER_GENRES.some(g => genres.includes(g))) {
    if (isBlockbuster || (movie.avg_rating && movie.avg_rating >= 8.0)) {
      return 'theater-must';
    }
  }
  
  // Epic movies with long runtime
  if (runtime > 150 && genres.some(g => ['Action', 'Adventure', 'War', 'Epic'].includes(g))) {
    return 'theater-must';
  }

  // Theater preferred: High-quality action/adventure
  if (genres.includes('Action') || genres.includes('Adventure')) {
    if (movie.avg_rating && movie.avg_rating >= 7.0) {
      return 'theater-preferred';
    }
  }

  // Visual spectacles
  if (moodTags.includes('edge-of-seat') || moodTags.includes('patriotic')) {
    return 'theater-preferred';
  }

  // OTT friendly: Dramas, comedies, smaller films
  if (genres.includes('Drama') || genres.includes('Romance') || genres.includes('Documentary')) {
    return 'ott-friendly';
  }

  // Shorter films work well on OTT
  if (runtime > 0 && runtime < 120) {
    return 'ott-friendly';
  }

  // Default
  return 'any';
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function enrichAudienceFit(movie: Movie): Promise<EnrichmentResult | null> {
  // Skip if already has audience_fit
  if (movie.audience_fit && Object.keys(movie.audience_fit).length > 0) {
    return null;
  }

  const audienceFit = deriveAudienceFit(movie);
  const watchRecommendation = deriveWatchRecommendation(movie);

  // Calculate confidence based on available data
  let confidence = 0.4; // Base confidence
  if (movie.age_rating) confidence += 0.2;
  if (movie.genres && movie.genres.length > 0) confidence += 0.15;
  if (movie.trigger_warnings && movie.trigger_warnings.length > 0) confidence += 0.1;
  if (movie.mood_tags && movie.mood_tags.length > 0) confidence += 0.1;
  if (movie.avg_rating) confidence += 0.05;
  confidence = Math.min(confidence, 0.95);

  return {
    movieId: movie.id,
    title: movie.title_en,
    audience_fit: audienceFit,
    watch_recommendation: watchRecommendation,
    confidence,
  };
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main(): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           AUDIENCE FIT ENRICHMENT                                    ║
║     Derives: Kids/Family/Date/Group/Solo + Watch Recommendation      ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);

  // Build query for movies without audience_fit
  let query = supabase
    .from('movies')
    .select(`
      id, title_en, release_year, genres, age_rating, trigger_warnings,
      mood_tags, avg_rating, runtime_minutes, is_blockbuster,
      audience_fit, watch_recommendation
    `)
    .eq('language', 'Telugu')
    .or('audience_fit.is.null,audience_fit.eq.{}')
    .order('release_year', { ascending: false })
    .limit(LIMIT);

  if (DECADE) {
    const startYear = parseInt(DECADE);
    query = query.gte('release_year', startYear).lt('release_year', startYear + 10);
  }

  const { data: movies, error } = await query;

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('  ✅ No movies need audience fit enrichment.'));
    return;
  }

  console.log(`\n  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Process movies
  const results: EnrichmentResult[] = [];
  const fitStats = {
    kids_friendly: 0,
    family_watch: 0,
    date_movie: 0,
    group_watch: 0,
    solo_watch: 0,
  };
  const watchStats: Record<WatchRecommendation, number> = {
    'theater-must': 0,
    'theater-preferred': 0,
    'ott-friendly': 0,
    'any': 0,
  };
  let skipped = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    const result = await enrichAudienceFit(movie);

    if (result) {
      results.push(result);
      
      // Count audience fit flags
      if (result.audience_fit.kids_friendly) fitStats.kids_friendly++;
      if (result.audience_fit.family_watch) fitStats.family_watch++;
      if (result.audience_fit.date_movie) fitStats.date_movie++;
      if (result.audience_fit.group_watch) fitStats.group_watch++;
      if (result.audience_fit.solo_watch) fitStats.solo_watch++;
      
      watchStats[result.watch_recommendation]++;

      if (VERBOSE) {
        const flags = Object.entries(result.audience_fit)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(', ');
        console.log(`  ${i + 1}. ${movie.title_en}: [${flags}] → ${result.watch_recommendation}`);
      }
    } else {
      skipped++;
    }

    // Progress indicator
    if ((i + 1) % 20 === 0) {
      process.stdout.write(`\r  Processed: ${i + 1}/${movies.length}`);
    }
  }

  console.log('\n');

  // Summary
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('📊 ENRICHMENT SUMMARY'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`
  Results: ${chalk.cyan(results.length)} enriched, ${chalk.gray(skipped)} skipped
  `);

  console.log('  Audience Fit Distribution:');
  console.log(`    Kids Friendly:  ${chalk.green(fitStats.kids_friendly.toString().padStart(4))} movies`);
  console.log(`    Family Watch:   ${chalk.blue(fitStats.family_watch.toString().padStart(4))} movies`);
  console.log(`    Date Movie:     ${chalk.magenta(fitStats.date_movie.toString().padStart(4))} movies`);
  console.log(`    Group Watch:    ${chalk.yellow(fitStats.group_watch.toString().padStart(4))} movies`);
  console.log(`    Solo Watch:     ${chalk.cyan(fitStats.solo_watch.toString().padStart(4))} movies`);

  console.log('\n  Watch Recommendation Distribution:');
  console.log(`    Theater Must:     ${chalk.red(watchStats['theater-must'].toString().padStart(4))} movies`);
  console.log(`    Theater Preferred:${chalk.yellow(watchStats['theater-preferred'].toString().padStart(4))} movies`);
  console.log(`    OTT Friendly:     ${chalk.green(watchStats['ott-friendly'].toString().padStart(4))} movies`);
  console.log(`    Any:              ${chalk.gray(watchStats['any'].toString().padStart(4))} movies`);

  // Apply changes if --execute flag is set
  if (EXECUTE && results.length > 0) {
    console.log(chalk.cyan('\n  Applying changes to database...'));

    let successCount = 0;
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({
          audience_fit: result.audience_fit,
          watch_recommendation: result.watch_recommendation,
        })
        .eq('id', result.movieId);

      if (updateError) {
        console.error(chalk.red(`  ✗ Failed to update ${result.title}:`), updateError.message);
      } else {
        successCount++;
      }
    }

    console.log(chalk.green(`\n  ✅ Updated ${successCount}/${results.length} movies`));
  } else if (!EXECUTE && results.length > 0) {
    console.log(chalk.yellow('\n  ⚠️  DRY RUN - Run with --execute to apply changes'));
    
    // Show sample of changes
    console.log('\n  Sample changes (first 10):');
    for (const result of results.slice(0, 10)) {
      const flags = Object.entries(result.audience_fit)
        .filter(([, v]) => v)
        .map(([k]) => k.replace('_', '-'))
        .join(', ');
      console.log(`    ${result.title}: [${flags}] → ${result.watch_recommendation}`);
    }
  }
}

main().catch(console.error);

