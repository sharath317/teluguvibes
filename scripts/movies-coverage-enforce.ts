#!/usr/bin/env npx tsx
/**
 * Phase 6: 95% Coverage Enforcement CLI
 * 
 * NON-NEGOTIABLE: Ensures movie review coverage meets the 95% target.
 * 
 * Usage:
 *   pnpm movies:coverage:enforce --dry     # Preview enforcement actions
 *   pnpm movies:coverage:enforce --apply   # Execute enforcement
 *   pnpm movies:coverage:enforce --status  # Show current coverage status
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { 
  calculateCoverage, 
  CoverageResult,
  Movie 
} from '../lib/reviews/coverage-engine';
import { 
  CONFIDENCE_THRESHOLDS, 
  enforceConfidenceGate 
} from '../lib/intelligence/quality-gates';

// ============================================================
// TYPES
// ============================================================

interface EnforcementResult {
  before_coverage: number;
  after_coverage: number;
  ingested_count: number;
  needs_review_count: number;
  blocked_count: number;
  delta_movies: DeltaMovie[];
}

interface DeltaMovie {
  id: string;
  title_en: string;
  source: 'tmdb' | 'index' | 'discovered';
  confidence: number;
  status: 'ingested' | 'needs_review' | 'blocked';
}

interface MissingMovie {
  tmdb_id: number;
  title_en: string;
  title_te?: string;
  release_year?: number;
  genres?: string[];
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// ============================================================
// COVERAGE ENFORCEMENT FUNCTIONS
// ============================================================

/**
 * Get delta between Telugu Movie Index and movies table
 */
async function getIndexVsMoviesDelta(): Promise<{
  in_index_only: number;
  in_movies_only: number;
  in_both: number;
  missing_reviews: number;
  index_titles: string[];
}> {
  const supabase = getSupabaseClient();

  // Get all movies from main table
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, tmdb_id')
    .limit(5000);

  // Get all from index
  const { data: indexEntries } = await supabase
    .from('telugu_movie_index')
    .select('tmdb_id, title')
    .limit(5000);

  const movieTmdbIds = new Set((movies || []).map(m => m.tmdb_id).filter(Boolean));
  const indexTmdbIds = new Set((indexEntries || []).map(e => e.tmdb_id).filter(Boolean));

  const inBoth = [...movieTmdbIds].filter(id => indexTmdbIds.has(id)).length;
  const inIndexOnly = [...indexTmdbIds].filter(id => !movieTmdbIds.has(id)).length;
  const inMoviesOnly = [...movieTmdbIds].filter(id => !indexTmdbIds.has(id)).length;

  // Get movies without reviews
  const { data: reviews } = await supabase
    .from('movie_reviews')
    .select('movie_id')
    .limit(5000);

  const reviewedMovieIds = new Set((reviews || []).map(r => r.movie_id));
  const missingReviews = (movies || []).filter(m => !reviewedMovieIds.has(m.id)).length;

  // Get titles of movies only in index
  const indexOnlyTitles = (indexEntries || [])
    .filter(e => e.tmdb_id && !movieTmdbIds.has(e.tmdb_id))
    .map(e => e.title)
    .slice(0, 20);

  return {
    in_index_only: inIndexOnly,
    in_movies_only: inMoviesOnly,
    in_both: inBoth,
    missing_reviews: missingReviews,
    index_titles: indexOnlyTitles
  };
}

/**
 * Discover missing movies from TMDB Telugu list
 */
async function discoverMissingFromIndex(): Promise<MissingMovie[]> {
  const supabase = getSupabaseClient();

  // Get existing TMDB IDs
  const { data: existingMovies } = await supabase
    .from('movies')
    .select('tmdb_id')
    .limit(5000);

  const existingTmdbIds = new Set(
    (existingMovies || []).map(m => m.tmdb_id).filter(Boolean)
  );

  // Get from index
  const { data: indexEntries } = await supabase
    .from('telugu_movie_index')
    .select('tmdb_id, title, release_year, genres')
    .limit(1000);

  if (!indexEntries) return [];

  const missing: MissingMovie[] = [];

  for (const entry of indexEntries) {
    if (entry.tmdb_id && !existingTmdbIds.has(entry.tmdb_id)) {
      missing.push({
        tmdb_id: entry.tmdb_id,
        title_en: entry.title,
        release_year: entry.release_year,
        genres: entry.genres
      });
    }
  }

  return missing;
}

/**
 * Calculate confidence score for a movie based on available data
 */
function calculateMovieConfidence(movie: {
  title_en: string;
  tmdb_id?: number;
  release_year?: number;
  genres?: string[];
  director?: string;
  hero?: string;
  poster_url?: string;
}): number {
  let confidence = 0;

  // TMDB ID is a strong indicator
  if (movie.tmdb_id) confidence += 0.3;
  
  // Basic metadata
  if (movie.title_en) confidence += 0.1;
  if (movie.release_year) confidence += 0.1;
  if (movie.genres && movie.genres.length > 0) confidence += 0.1;
  
  // Entity data
  if (movie.director) confidence += 0.15;
  if (movie.hero) confidence += 0.1;
  
  // Media
  if (movie.poster_url) confidence += 0.15;

  return Math.min(1, confidence);
}

/**
 * Ingest metadata-only for missing movies
 */
async function ingestMetadataOnly(
  movies: MissingMovie[],
  options: { dryRun: boolean }
): Promise<{
  ingested: DeltaMovie[];
  needsReview: DeltaMovie[];
  blocked: DeltaMovie[];
}> {
  const supabase = getSupabaseClient();
  const ingested: DeltaMovie[] = [];
  const needsReview: DeltaMovie[] = [];
  const blocked: DeltaMovie[] = [];

  for (const movie of movies) {
    const confidence = calculateMovieConfidence({
      title_en: movie.title_en,
      tmdb_id: movie.tmdb_id,
      release_year: movie.release_year,
      genres: movie.genres
    });

    const decision = enforceConfidenceGate(confidence);
    
    const deltaMovie: DeltaMovie = {
      id: `pending_${movie.tmdb_id}`,
      title_en: movie.title_en,
      source: 'index',
      confidence,
      status: decision === 'publish' ? 'ingested' 
        : decision === 'review' ? 'needs_review' 
        : 'blocked'
    };

    if (!options.dryRun && decision !== 'block') {
      // Create movie record with minimal metadata
      const { data: inserted, error } = await supabase
        .from('movies')
        .insert({
          title_en: movie.title_en,
          tmdb_id: movie.tmdb_id,
          release_year: movie.release_year,
          genres: movie.genres,
          confidence_score: confidence,
          status: decision === 'publish' ? 'READY' : 'NEEDS_REVIEW',
          is_published: decision === 'publish',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (inserted) {
        deltaMovie.id = inserted.id;
      }

      if (error) {
        console.error(`Failed to insert ${movie.title_en}:`, error.message);
        continue;
      }
    }

    switch (decision) {
      case 'publish':
        ingested.push(deltaMovie);
        break;
      case 'review':
        needsReview.push(deltaMovie);
        break;
      case 'block':
        blocked.push(deltaMovie);
        break;
    }
  }

  return { ingested, needsReview, blocked };
}

/**
 * Main enforcement function
 */
async function enforceCoverage(options: {
  dryRun: boolean;
  targetCoverage?: number;
}): Promise<EnforcementResult> {
  const { dryRun, targetCoverage = 0.95 } = options;

  // Get current coverage
  const beforeCoverage = await calculateCoverage(targetCoverage);
  
  // Discover missing movies
  const missingMovies = await discoverMissingFromIndex();
  
  // Ingest with confidence scoring
  const { ingested, needsReview, blocked } = await ingestMetadataOnly(
    missingMovies.slice(0, 100), // Limit batch size
    { dryRun }
  );

  // Calculate after coverage (estimate for dry run)
  let afterCoverage: number;
  if (dryRun) {
    const potentialNew = ingested.length;
    const currentWithReviews = beforeCoverage.moviesWithReviews;
    const currentTotal = beforeCoverage.totalMovies;
    // Estimate: new movies will eventually get template reviews
    afterCoverage = (currentWithReviews + potentialNew) / (currentTotal + potentialNew);
  } else {
    const actualCoverage = await calculateCoverage(targetCoverage);
    afterCoverage = actualCoverage.currentCoverage;
  }

  return {
    before_coverage: beforeCoverage.currentCoverage,
    after_coverage: afterCoverage,
    ingested_count: ingested.length,
    needs_review_count: needsReview.length,
    blocked_count: blocked.length,
    delta_movies: [...ingested, ...needsReview, ...blocked]
  };
}

// ============================================================
// CLI MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry') || !args.includes('--apply');
  const showStatus = args.includes('--status');
  const targetArg = args.find(a => a.startsWith('--target='));
  const targetCoverage = targetArg ? parseFloat(targetArg.split('=')[1]) : 0.95;

  console.log(chalk.bold.cyan('\n📊 COVERAGE ENFORCEMENT CLI\n'));

  try {
    // Status only mode
    if (showStatus) {
      console.log(chalk.bold('📈 CURRENT COVERAGE STATUS\n'));
      
      const coverage = await calculateCoverage(targetCoverage);
      const delta = await getIndexVsMoviesDelta();

      console.log(`Total Movies: ${chalk.cyan(coverage.totalMovies)}`);
      console.log(`With Reviews: ${chalk.green(coverage.moviesWithReviews)}`);
      console.log(`Missing Reviews: ${chalk.yellow(coverage.totalMovies - coverage.moviesWithReviews)}`);
      console.log(`\nCurrent Coverage: ${colorCoverage(coverage.currentCoverage * 100)}%`);
      console.log(`Target Coverage: ${chalk.cyan((targetCoverage * 100).toFixed(1))}%`);
      console.log(`Gap: ${chalk.yellow((coverage.gap * 100).toFixed(1))}%`);
      console.log(`Meets Target: ${coverage.meetsTarget ? chalk.green('YES ✓') : chalk.red('NO ✗')}`);

      console.log(chalk.bold('\n📊 INDEX VS MOVIES DELTA\n'));
      console.log(`In Both: ${chalk.green(delta.in_both)}`);
      console.log(`In Index Only: ${chalk.yellow(delta.in_index_only)}`);
      console.log(`In Movies Only: ${chalk.cyan(delta.in_movies_only)}`);

      if (delta.index_titles.length > 0) {
        console.log(chalk.bold('\n📝 SAMPLE MISSING FROM MOVIES TABLE:\n'));
        delta.index_titles.slice(0, 10).forEach((title, i) => {
          console.log(`  ${i + 1}. ${title}`);
        });
        if (delta.index_titles.length > 10) {
          console.log(chalk.gray(`  ... and ${delta.in_index_only - 10} more`));
        }
      }

      console.log(chalk.bold('\n📊 REVIEW BREAKDOWN\n'));
      console.log(`Human Reviews: ${chalk.green(coverage.breakdown.human)}`);
      console.log(`AI Reviews: ${chalk.cyan(coverage.breakdown.ai)}`);
      console.log(`Template Reviews: ${chalk.yellow(coverage.breakdown.template)}`);

      return;
    }

    // Enforcement mode
    console.log(`Target Coverage: ${chalk.cyan((targetCoverage * 100).toFixed(1))}%`);
    console.log(`Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('APPLY')}\n`);

    console.log('Analyzing coverage gap...\n');
    const result = await enforceCoverage({ dryRun, targetCoverage });

    console.log(chalk.bold('📊 ENFORCEMENT RESULTS\n'));
    console.log(`Before Coverage: ${colorCoverage(result.before_coverage * 100)}%`);
    console.log(`After Coverage: ${colorCoverage(result.after_coverage * 100)}%`);
    console.log(`Improvement: ${chalk.green(`+${((result.after_coverage - result.before_coverage) * 100).toFixed(1)}%`)}`);

    console.log(chalk.bold('\n📥 INGESTION BREAKDOWN\n'));
    console.log(`Auto-Published: ${chalk.green(result.ingested_count)}`);
    console.log(`Needs Review: ${chalk.yellow(result.needs_review_count)}`);
    console.log(`Blocked: ${chalk.red(result.blocked_count)}`);

    if (result.delta_movies.length > 0) {
      console.log(chalk.bold('\n📝 PROCESSED MOVIES (top 10):\n'));
      
      const statusIcon = (status: string) => {
        if (status === 'ingested') return chalk.green('✓');
        if (status === 'needs_review') return chalk.yellow('⚠');
        return chalk.red('✗');
      };

      result.delta_movies.slice(0, 10).forEach((movie, i) => {
        console.log(`  ${statusIcon(movie.status)} ${movie.title_en} (${(movie.confidence * 100).toFixed(0)}%)`);
      });

      if (result.delta_movies.length > 10) {
        console.log(chalk.gray(`  ... and ${result.delta_movies.length - 10} more`));
      }
    }

    // Show confidence thresholds
    console.log(chalk.bold('\n🎯 CONFIDENCE THRESHOLDS\n'));
    console.log(`Auto-Publish: ${chalk.green(`≥${CONFIDENCE_THRESHOLDS.AUTO_PUBLISH * 100}%`)}`);
    console.log(`Needs Review: ${chalk.yellow(`${CONFIDENCE_THRESHOLDS.NEEDS_REVIEW * 100}-${CONFIDENCE_THRESHOLDS.AUTO_PUBLISH * 100}%`)}`);
    console.log(`Block: ${chalk.red(`<${CONFIDENCE_THRESHOLDS.BLOCK * 100}%`)}`);

    if (dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes made'));
      console.log('\nTo enforce coverage, run:');
      console.log(chalk.cyan('  pnpm movies:coverage:enforce --apply'));
    } else {
      console.log(chalk.green('\n✅ Coverage enforcement completed'));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Coverage enforcement failed:'), error);
    process.exit(1);
  }
}

function colorCoverage(percent: number): string {
  const formatted = percent.toFixed(1);
  if (percent >= 95) return chalk.green(formatted);
  if (percent >= 80) return chalk.yellow(formatted);
  return chalk.red(formatted);
}

main();

