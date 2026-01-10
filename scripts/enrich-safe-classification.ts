#!/usr/bin/env npx tsx
/**
 * SAFE CLASSIFICATION ENRICHMENT SCRIPT
 * 
 * Safely enriches movies with primary_genre and age_rating using
 * multi-signal consensus-based derivation.
 * 
 * SAFETY GUARANTEES:
 * - Never invents/hallucinates data
 * - Requires 2+ independent signals for genre
 * - Never downgrades age rating
 * - Stores uncertainty explicitly
 * - Generates audit report for manual review
 * 
 * Usage:
 *   npx tsx scripts/enrich-safe-classification.ts --dry --limit=100
 *   npx tsx scripts/enrich-safe-classification.ts --execute --fields=primary_genre
 *   npx tsx scripts/enrich-safe-classification.ts --execute --fields=age_rating
 *   npx tsx scripts/enrich-safe-classification.ts --execute --fields=primary_genre,age_rating
 *   npx tsx scripts/enrich-safe-classification.ts --execute --report
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

import {
  classifyMovie,
  derivePrimaryGenre,
  deriveAgeRating,
  validateClassification,
  type MovieForClassification,
  type ClassificationResult,
} from '../lib/enrichment/safe-classification';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// CLI ARGUMENTS
// ============================================================

const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string = ''): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '500'));
const EXECUTE = hasFlag('execute');
const DRY = hasFlag('dry') || !EXECUTE;
const VERBOSE = hasFlag('verbose') || hasFlag('v');
const REPORT = hasFlag('report');
const DECADE = getArg('decade', '');
const ACTOR = getArg('actor', '');
const DIRECTOR = getArg('director', '');

// Parse fields to enrich
const fieldsArg = getArg('fields', 'primary_genre,age_rating');
const FIELDS = fieldsArg.split(',').map(f => f.trim());
const ENRICH_GENRE = FIELDS.includes('primary_genre');
const ENRICH_RATING = FIELDS.includes('age_rating');

// ============================================================
// TYPES
// ============================================================

interface EnrichmentStats {
  total_processed: number;
  genre: {
    enriched_high_confidence: number;
    skipped_low_confidence: number;
    skipped_ambiguous: number;
    skipped_existing: number;
    failed: number;
  };
  age_rating: {
    enriched_high_confidence: number;
    enriched_medium_confidence: number;
    skipped_insufficient_data: number;
    skipped_existing: number;
    failed: number;
  };
  manual_review_needed: number;
}

interface ReviewCase {
  movie_id: string;
  title: string;
  year: number | null;
  field: string;
  reason: string;
  signals?: string[];
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function main(): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           SAFE CLASSIFICATION ENRICHMENT                             ║
║     Multi-signal consensus for primary_genre & age_rating            ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Fields: ${FIELDS.join(', ')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);
  if (ACTOR) console.log(`  Actor: ${ACTOR}`);
  if (DIRECTOR) console.log(`  Director: ${DIRECTOR}`);
  console.log();

  // Build query for movies needing classification
  let query = supabase
    .from('movies')
    .select(`
      id, title_en, release_year, genres, mood_tags, audience_fit,
      hero, director, content_flags, trigger_warnings, overview, synopsis,
      primary_genre, age_rating
    `)
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .order('release_year', { ascending: false })
    .limit(LIMIT);

  // Filter by fields needing enrichment
  if (ENRICH_GENRE && ENRICH_RATING) {
    query = query.or('primary_genre.is.null,age_rating.is.null');
  } else if (ENRICH_GENRE) {
    query = query.is('primary_genre', null);
  } else if (ENRICH_RATING) {
    query = query.is('age_rating', null);
  }

  // Apply filters
  if (DECADE) {
    const startYear = parseInt(DECADE);
    query = query.gte('release_year', startYear).lt('release_year', startYear + 10);
  }
  if (ACTOR) {
    query = query.ilike('hero', `%${ACTOR}%`);
  }
  if (DIRECTOR) {
    query = query.ilike('director', `%${DIRECTOR}%`);
  }

  const { data: movies, error } = await query;

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('  ✅ No movies need classification enrichment.'));
    return;
  }

  console.log(`  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Initialize stats
  const stats: EnrichmentStats = {
    total_processed: 0,
    genre: {
      enriched_high_confidence: 0,
      skipped_low_confidence: 0,
      skipped_ambiguous: 0,
      skipped_existing: 0,
      failed: 0,
    },
    age_rating: {
      enriched_high_confidence: 0,
      enriched_medium_confidence: 0,
      skipped_insufficient_data: 0,
      skipped_existing: 0,
      failed: 0,
    },
    manual_review_needed: 0,
  };

  const reviewCases: ReviewCase[] = [];
  const results: { movie: MovieForClassification; result: ClassificationResult }[] = [];

  // Process movies
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as MovieForClassification;
    stats.total_processed++;

    // Classify the movie
    const result = classifyMovie(movie);
    results.push({ movie, result });

    // Track genre stats
    if (ENRICH_GENRE) {
      if (movie.primary_genre) {
        stats.genre.skipped_existing++;
      } else if (result.genre.ambiguous) {
        stats.genre.skipped_ambiguous++;
        reviewCases.push({
          movie_id: movie.id,
          title: movie.title_en,
          year: movie.release_year || null,
          field: 'primary_genre',
          reason: result.genre.ambiguity_reason || 'Ambiguous signals',
          signals: result.genre.all_signals.map(s => `${s.genre} (${s.source}: ${s.weight.toFixed(2)})`),
        });
      } else if (result.genre.genre_confidence === 'low') {
        stats.genre.skipped_low_confidence++;
        if (result.genre.all_signals.length > 0) {
          reviewCases.push({
            movie_id: movie.id,
            title: movie.title_en,
            year: movie.release_year || null,
            field: 'primary_genre',
            reason: result.genre.ambiguity_reason || 'Low confidence',
            signals: result.genre.all_signals.map(s => `${s.genre} (${s.source}: ${s.weight.toFixed(2)})`),
          });
        }
      } else if (result.genre.primary_genre) {
        stats.genre.enriched_high_confidence++;
      }
    }

    // Track age rating stats
    if (ENRICH_RATING) {
      if (movie.age_rating) {
        stats.age_rating.skipped_existing++;
      } else if (result.age_rating.skipped) {
        stats.age_rating.skipped_insufficient_data++;
        reviewCases.push({
          movie_id: movie.id,
          title: movie.title_en,
          year: movie.release_year || null,
          field: 'age_rating',
          reason: result.age_rating.skip_reason || 'Insufficient data',
        });
      } else if (result.age_rating.age_rating_confidence === 'high') {
        stats.age_rating.enriched_high_confidence++;
      } else if (result.age_rating.age_rating_confidence === 'medium') {
        stats.age_rating.enriched_medium_confidence++;
      }
    }

    if (result.needs_manual_review) {
      stats.manual_review_needed++;
    }

    // Progress
    if (VERBOSE) {
      const genreStr = result.genre.primary_genre 
        ? chalk.green(result.genre.primary_genre) 
        : chalk.yellow('null');
      const ratingStr = result.age_rating.age_rating 
        ? chalk.green(result.age_rating.age_rating) 
        : chalk.yellow('skip');
      console.log(`  ${i + 1}. ${movie.title_en}: genre=${genreStr}, rating=${ratingStr}`);
    } else if ((i + 1) % 50 === 0) {
      process.stdout.write(`\r  Processed: ${i + 1}/${movies.length}`);
    }
  }

  console.log('\n');

  // Print summary
  printSummary(stats, movies.length);

  // Apply changes if --execute flag is set
  if (EXECUTE) {
    await applyChanges(results, stats);
  } else {
    console.log(chalk.yellow('\n  ⚠️  DRY RUN - Run with --execute to apply changes'));
    printSampleChanges(results);
  }

  // Generate report if requested
  if (REPORT || reviewCases.length > 0) {
    generateReport(stats, reviewCases, results);
  }
}

// ============================================================
// OUTPUT HELPERS
// ============================================================

function printSummary(stats: EnrichmentStats, total: number): void {
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('📊 CLASSIFICATION SUMMARY'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

  if (ENRICH_GENRE) {
    console.log(chalk.white.bold('\n  PRIMARY GENRE:'));
    console.log(`    ✅ High confidence:     ${chalk.green(stats.genre.enriched_high_confidence.toString().padStart(4))}`);
    console.log(`    ⚠️  Low confidence:      ${chalk.yellow(stats.genre.skipped_low_confidence.toString().padStart(4))} (skipped)`);
    console.log(`    🔀 Ambiguous:           ${chalk.yellow(stats.genre.skipped_ambiguous.toString().padStart(4))} (needs review)`);
    console.log(`    ⏭️  Already had genre:   ${chalk.gray(stats.genre.skipped_existing.toString().padStart(4))}`);
    
    const genreRate = ((stats.genre.enriched_high_confidence / total) * 100).toFixed(1);
    console.log(`    📈 Enrichment rate:     ${chalk.cyan(genreRate)}%`);
  }

  if (ENRICH_RATING) {
    console.log(chalk.white.bold('\n  AGE RATING:'));
    console.log(`    ✅ High confidence:     ${chalk.green(stats.age_rating.enriched_high_confidence.toString().padStart(4))}`);
    console.log(`    🟡 Medium confidence:   ${chalk.yellow(stats.age_rating.enriched_medium_confidence.toString().padStart(4))}`);
    console.log(`    ⏭️  Insufficient data:   ${chalk.gray(stats.age_rating.skipped_insufficient_data.toString().padStart(4))} (skipped)`);
    console.log(`    ⏭️  Already had rating:  ${chalk.gray(stats.age_rating.skipped_existing.toString().padStart(4))}`);
    
    const enriched = stats.age_rating.enriched_high_confidence + stats.age_rating.enriched_medium_confidence;
    const ratingRate = ((enriched / total) * 100).toFixed(1);
    console.log(`    📈 Enrichment rate:     ${chalk.cyan(ratingRate)}%`);
  }

  console.log(chalk.white.bold('\n  REVIEW STATUS:'));
  console.log(`    👀 Needs manual review: ${chalk.magenta(stats.manual_review_needed.toString().padStart(4))}`);
}

function printSampleChanges(results: { movie: MovieForClassification; result: ClassificationResult }[]): void {
  const changesWithGenre = results.filter(r => 
    r.result.genre.primary_genre && r.result.genre.genre_confidence === 'high'
  );
  const changesWithRating = results.filter(r => 
    r.result.age_rating.age_rating && !r.result.age_rating.skipped
  );

  if (changesWithGenre.length > 0) {
    console.log(chalk.white.bold('\n  Sample Genre Classifications (first 10):'));
    for (const { movie, result } of changesWithGenre.slice(0, 10)) {
      console.log(`    ${movie.title_en}: ${chalk.green(result.genre.primary_genre!)} ← [${result.genre.genre_sources.join(', ')}]`);
    }
  }

  if (changesWithRating.length > 0) {
    console.log(chalk.white.bold('\n  Sample Age Ratings (first 10):'));
    for (const { movie, result } of changesWithRating.slice(0, 10)) {
      const reasons = result.age_rating.age_rating_reasons.slice(0, 2).join('; ');
      console.log(`    ${movie.title_en}: ${chalk.green(result.age_rating.age_rating!)} ← ${reasons}`);
    }
  }
}

async function applyChanges(
  results: { movie: MovieForClassification; result: ClassificationResult }[],
  stats: EnrichmentStats
): Promise<void> {
  console.log(chalk.cyan('\n  Applying changes to database...'));

  let genreSuccess = 0;
  let ratingSuccess = 0;
  let failed = 0;

  for (const { movie, result } of results) {
    const updates: Record<string, unknown> = {};

    // Validate before write
    const validation = validateClassification(movie, result);
    if (!validation.valid) {
      if (VERBOSE) {
        console.log(chalk.yellow(`  ⚠️  Skipping ${movie.title_en}: ${validation.issues.join(', ')}`));
      }
      continue;
    }

    // Add genre update if high confidence and not existing
    if (ENRICH_GENRE && result.genre.primary_genre && result.genre.genre_confidence === 'high' && !movie.primary_genre) {
      updates.primary_genre = result.genre.primary_genre;
      updates.genre_confidence = result.genre.genre_confidence;
      updates.genre_sources = result.genre.genre_sources;
    }

    // Add age rating update if not skipped and not existing
    if (ENRICH_RATING && result.age_rating.age_rating && !result.age_rating.skipped && !movie.age_rating) {
      updates.age_rating = result.age_rating.age_rating;
      updates.age_rating_confidence = result.age_rating.age_rating_confidence;
      updates.age_rating_reasons = result.age_rating.age_rating_reasons;
    }

    if (Object.keys(updates).length === 0) {
      continue;
    }

    // Apply update
    const { error } = await supabase
      .from('movies')
      .update(updates)
      .eq('id', movie.id);

    if (error) {
      failed++;
      if (VERBOSE) {
        console.error(chalk.red(`  ✗ Failed to update ${movie.title_en}:`), error.message);
      }
    } else {
      if (updates.primary_genre) genreSuccess++;
      if (updates.age_rating) ratingSuccess++;
    }
  }

  console.log(chalk.green(`\n  ✅ Applied changes:`));
  if (ENRICH_GENRE) console.log(`     - Primary genre: ${genreSuccess} movies`);
  if (ENRICH_RATING) console.log(`     - Age rating: ${ratingSuccess} movies`);
  if (failed > 0) console.log(chalk.red(`     - Failed: ${failed} movies`));
}

function generateReport(
  stats: EnrichmentStats,
  reviewCases: ReviewCase[],
  results: { movie: MovieForClassification; result: ClassificationResult }[]
): void {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `classification-audit-${timestamp}.md`);

  let report = `# Classification Enrichment Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  report += `**Mode:** ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}\n\n`;

  // Summary table
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Processed | ${stats.total_processed} |\n`;
  
  if (ENRICH_GENRE) {
    report += `| Primary Genre (high conf) | ${stats.genre.enriched_high_confidence} |\n`;
    report += `| Primary Genre (low conf - skipped) | ${stats.genre.skipped_low_confidence} |\n`;
    report += `| Primary Genre (ambiguous) | ${stats.genre.skipped_ambiguous} |\n`;
  }
  
  if (ENRICH_RATING) {
    report += `| Age Rating (high conf) | ${stats.age_rating.enriched_high_confidence} |\n`;
    report += `| Age Rating (medium conf) | ${stats.age_rating.enriched_medium_confidence} |\n`;
    report += `| Age Rating (skipped) | ${stats.age_rating.skipped_insufficient_data} |\n`;
  }
  
  report += `| **Needs Manual Review** | **${stats.manual_review_needed}** |\n\n`;

  // Confidence thresholds
  report += `## Confidence Thresholds\n\n`;
  report += `- Primary Genre: Requires 2+ independent signals with total weight >= 0.65\n`;
  report += `- Age Rating: Requires 2+ signal sources; medium confidence acceptable\n`;
  report += `- Never downgrades existing ratings\n`;
  report += `- Never overwrites existing high-confidence data with low-confidence\n\n`;

  // Cases needing manual review
  if (reviewCases.length > 0) {
    report += `## Cases Needing Manual Review (${reviewCases.length})\n\n`;
    
    const genreCases = reviewCases.filter(c => c.field === 'primary_genre');
    const ratingCases = reviewCases.filter(c => c.field === 'age_rating');

    if (genreCases.length > 0) {
      report += `### Primary Genre Issues\n\n`;
      report += `| Movie | Year | Reason | Signals |\n`;
      report += `|-------|------|--------|--------|\n`;
      
      for (const c of genreCases.slice(0, 50)) {
        const signals = c.signals?.join(', ') || '-';
        report += `| ${c.title} | ${c.year || '-'} | ${c.reason} | ${signals} |\n`;
      }
      
      if (genreCases.length > 50) {
        report += `\n*... and ${genreCases.length - 50} more*\n`;
      }
      report += '\n';
    }

    if (ratingCases.length > 0) {
      report += `### Age Rating Issues\n\n`;
      report += `| Movie | Year | Reason |\n`;
      report += `|-------|------|--------|\n`;
      
      for (const c of ratingCases.slice(0, 50)) {
        report += `| ${c.title} | ${c.year || '-'} | ${c.reason} |\n`;
      }
      
      if (ratingCases.length > 50) {
        report += `\n*... and ${ratingCases.length - 50} more*\n`;
      }
      report += '\n';
    }
  }

  // Sample successful classifications
  const successful = results.filter(r => 
    (r.result.genre.primary_genre && r.result.genre.genre_confidence === 'high') ||
    (r.result.age_rating.age_rating && !r.result.age_rating.skipped)
  ).slice(0, 20);

  if (successful.length > 0) {
    report += `## Sample Successful Classifications\n\n`;
    report += `| Movie | Year | Primary Genre | Sources | Age Rating | Reasons |\n`;
    report += `|-------|------|---------------|---------|------------|--------|\n`;
    
    for (const { movie, result } of successful) {
      const genre = result.genre.primary_genre || '-';
      const sources = result.genre.genre_sources.join(', ') || '-';
      const rating = result.age_rating.age_rating || '-';
      const reasons = result.age_rating.age_rating_reasons.slice(0, 2).join('; ') || '-';
      report += `| ${movie.title_en} | ${movie.release_year || '-'} | ${genre} | ${sources} | ${rating} | ${reasons} |\n`;
    }
    report += '\n';
  }

  // Known limitations
  report += `## Known Limitations\n\n`;
  report += `1. Movies without genres[] array have fewer signals for primary_genre derivation\n`;
  report += `2. Pre-1950 movies default to 'U' rating due to limited content flagging\n`;
  report += `3. Director/Hero patterns only cover major Telugu cinema personalities\n`;
  report += `4. Synopsis keyword extraction is basic; does not use NLP\n`;
  report += `5. Ambiguous cases (Action vs Drama) are common for masala films\n`;

  fs.writeFileSync(reportPath, report);
  console.log(chalk.cyan(`\n  📄 Report generated: ${reportPath}`));
}

// ============================================================
// RUN
// ============================================================

main().catch(console.error);

