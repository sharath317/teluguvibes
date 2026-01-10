#!/usr/bin/env npx tsx
/**
 * TELUGU SYNOPSIS ENRICHMENT SCRIPT (Enhanced v2.0)
 * 
 * Generates Telugu language synopses from multiple sources with confidence tracking.
 * 
 * Source Priority (with confidence tiers):
 * 1. Telugu Wikipedia (te.wikipedia.org) - 0.95 (HIGH)
 * 2. English synopsis translated - 0.80-0.85 (HIGH) [NEW]
 * 3. English Wikipedia translated - 0.85 (HIGH) [NEW]
 * 4. Wikidata Telugu descriptions - 0.70 (MEDIUM)
 * 5. Basic generated synopsis - 0.30 (LOW - DO NOT COUNT as enriched)
 * 
 * NEW: Only counts as "enriched" if confidence >= 0.65
 * NEW: Stores synopsis_te_source and synopsis_te_confidence
 * 
 * Usage:
 *   npx tsx scripts/enrich-telugu-synopsis.ts --limit=100
 *   npx tsx scripts/enrich-telugu-synopsis.ts --limit=500 --execute
 *   npx tsx scripts/enrich-telugu-synopsis.ts --decade=2020 --execute
 *   npx tsx scripts/enrich-telugu-synopsis.ts --high-confidence-only --execute
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

import {
  enrichTeluguSynopsis,
  CONFIDENCE_TIERS,
  HIGH_CONFIDENCE_THRESHOLD,
  type TranslationResult,
} from '../lib/enrichment/translation-service';

config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================
// CONFIG
// ============================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RATE_LIMIT_DELAY = 300;

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
const HIGH_CONFIDENCE_ONLY = hasFlag('high-confidence-only');
const SKIP_LOW_CONFIDENCE = hasFlag('skip-low-confidence') || HIGH_CONFIDENCE_ONLY;

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  title_te: string | null;
  release_year: number;
  synopsis: string | null;
  overview: string | null;
  synopsis_te: string | null;
  wikidata_id: string | null;
  genres: string[] | null;
  hero: string | null;
  director: string | null;
}

interface EnrichmentResult {
  movieId: string;
  title: string;
  synopsis_te: string;
  source: string;
  confidence: number;
  isHighConfidence: boolean;
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function enrichMovie(movie: Movie): Promise<EnrichmentResult | null> {
  // Skip if already has Telugu synopsis with high confidence
  if (movie.synopsis_te && movie.synopsis_te.trim().length > 50) {
    return null;
  }

  // Get English synopsis for potential translation
  const englishSynopsis = movie.synopsis || movie.overview || null;

  // Use the translation service for waterfall enrichment
  const result = await enrichTeluguSynopsis({
    titleEn: movie.title_en,
    titleTe: movie.title_te,
    year: movie.release_year,
    wikidataId: movie.wikidata_id,
    englishSynopsis: englishSynopsis,
    genres: movie.genres,
    director: movie.director,
    hero: movie.hero,
  }, RATE_LIMIT_DELAY);

  const isHighConfidence = result.confidence >= HIGH_CONFIDENCE_THRESHOLD;

  // Skip low confidence results if flag is set
  if (SKIP_LOW_CONFIDENCE && !isHighConfidence) {
    return null;
  }

  return {
    movieId: movie.id,
    title: movie.title_en,
    synopsis_te: result.text,
    source: result.source,
    confidence: result.confidence,
    isHighConfidence,
  };
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main(): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           TELUGU SYNOPSIS ENRICHMENT v2.0                            ║
║   Sources: Te Wiki → Translate → En Wiki → Wikidata → Generated      ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  console.log(`  High Confidence Only: ${HIGH_CONFIDENCE_ONLY ? chalk.green('YES') : chalk.gray('NO')}`);
  console.log(`  High Confidence Threshold: ${(HIGH_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);

  console.log(chalk.gray('\n  Confidence Tiers:'));
  console.log(chalk.gray(`    Telugu Wikipedia:       ${(CONFIDENCE_TIERS.TELUGU_WIKIPEDIA * 100).toFixed(0)}% (HIGH)`));
  console.log(chalk.gray(`    English Wiki Translated: ${(CONFIDENCE_TIERS.ENGLISH_WIKIPEDIA_TRANSLATED * 100).toFixed(0)}% (HIGH)`));
  console.log(chalk.gray(`    TMDB Overview Translated: ${(CONFIDENCE_TIERS.TMDB_OVERVIEW_TRANSLATED * 100).toFixed(0)}% (HIGH)`));
  console.log(chalk.gray(`    Wikidata Telugu:         ${(CONFIDENCE_TIERS.WIKIDATA_TELUGU * 100).toFixed(0)}% (MEDIUM)`));
  console.log(chalk.gray(`    Basic Generated:         ${(CONFIDENCE_TIERS.BASIC_GENERATED * 100).toFixed(0)}% (LOW - not counted)`));

  // Build query for movies without Telugu synopsis
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, release_year, synopsis, overview, synopsis_te, wikidata_id, genres, hero, director')
    .eq('language', 'Telugu')
    .or('synopsis_te.is.null,synopsis_te.eq.')
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
    console.log(chalk.green('  ✅ No movies need Telugu synopsis enrichment.'));
    return;
  }

  console.log(`\n  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Process movies
  const results: EnrichmentResult[] = [];
  const sourceStats: Record<string, number> = {};
  const confidenceStats = { 
    high: 0,      // >= 0.65
    medium: 0,    // 0.40-0.64
    low: 0,       // < 0.40 (generated)
  };
  let skipped = 0;
  let lowConfidenceSkipped = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    
    try {
      const result = await enrichMovie(movie);

      if (result) {
        results.push(result);
        sourceStats[result.source] = (sourceStats[result.source] || 0) + 1;
        
        // Track confidence tiers
        if (result.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
          confidenceStats.high++;
        } else if (result.confidence >= 0.40) {
          confidenceStats.medium++;
        } else {
          confidenceStats.low++;
        }

        if (VERBOSE) {
          const truncated = result.synopsis_te.length > 60
            ? result.synopsis_te.substring(0, 57) + '...'
            : result.synopsis_te;
          const confColor = result.isHighConfidence ? chalk.green : chalk.yellow;
          console.log(`  ${i + 1}. ${movie.title_en}: "${truncated}" [${result.source}, ${confColor((result.confidence * 100).toFixed(0) + '%')}]`);
        }
      } else if (movie.synopsis_te) {
        skipped++;
      } else if (SKIP_LOW_CONFIDENCE) {
        lowConfidenceSkipped++;
      }
    } catch (err) {
      if (VERBOSE) {
        console.error(chalk.red(`  Error processing ${movie.title_en}:`), err);
      }
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r  Processed: ${i + 1}/${movies.length}`);
    }
  }

  console.log('\n');

  // Summary
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('📊 ENRICHMENT SUMMARY'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`
  Results:
    Total enriched:     ${chalk.green(results.length.toString().padStart(4))} movies
    Skipped (had one):  ${chalk.gray(skipped.toString().padStart(4))} movies
    Low conf skipped:   ${chalk.yellow(lowConfidenceSkipped.toString().padStart(4))} movies
  `);

  console.log('  Source Distribution:');
  for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    const color = source === 'telugu_wikipedia' ? chalk.green :
                  source.includes('translated') ? chalk.blue :
                  source === 'wikidata_telugu' ? chalk.cyan :
                  chalk.yellow;
    console.log(`    ${source.padEnd(28)}: ${color(count.toString())}`);
  }

  console.log(chalk.white.bold('\n  Confidence Distribution:'));
  console.log(`    High (≥${(HIGH_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%):  ${chalk.green(confidenceStats.high.toString().padStart(4))} ✓ Counts as enriched`);
  console.log(`    Medium (40-64%): ${chalk.yellow(confidenceStats.medium.toString().padStart(4))} ~ Partial`);
  console.log(`    Low (<40%):      ${chalk.red(confidenceStats.low.toString().padStart(4))} ✗ Does NOT count`);

  // Calculate effective enrichment rate
  const effectiveEnriched = confidenceStats.high;
  const effectiveRate = movies.length > 0 ? ((effectiveEnriched / movies.length) * 100).toFixed(1) : '0';
  console.log(chalk.white.bold(`\n  Effective Enrichment Rate: ${chalk.cyan(effectiveRate)}% (high confidence only)`));

  // Apply changes if --execute flag is set
  if (EXECUTE && results.length > 0) {
    console.log(chalk.cyan('\n  Applying changes to database...'));

    let successCount = 0;
    let highConfUpdated = 0;

    for (const result of results) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ 
          synopsis_te: result.synopsis_te,
          synopsis_te_source: result.source,
          synopsis_te_confidence: result.confidence,
        })
        .eq('id', result.movieId);

      if (updateError) {
        console.error(chalk.red(`  ✗ Failed to update ${result.title}:`), updateError.message);
      } else {
        successCount++;
        if (result.isHighConfidence) highConfUpdated++;
      }
    }

    console.log(chalk.green(`\n  ✅ Updated ${successCount}/${results.length} movies`));
    console.log(chalk.green(`     - High confidence: ${highConfUpdated}`));
    console.log(chalk.yellow(`     - Lower confidence: ${successCount - highConfUpdated}`));
  } else if (!EXECUTE && results.length > 0) {
    console.log(chalk.yellow('\n  ⚠️  DRY RUN - Run with --execute to apply changes'));
    
    // Show sample of high confidence changes
    const highConfResults = results.filter(r => r.isHighConfidence);
    if (highConfResults.length > 0) {
      console.log(chalk.white.bold('\n  Sample HIGH confidence synopses (first 5):'));
      for (const result of highConfResults.slice(0, 5)) {
        const truncated = result.synopsis_te.length > 80
          ? result.synopsis_te.substring(0, 77) + '...'
          : result.synopsis_te;
        console.log(`    ${result.title} [${result.source}]:`);
        console.log(`      "${truncated}"`);
      }
    }

    // Show sample of low confidence
    const lowConfResults = results.filter(r => !r.isHighConfidence);
    if (lowConfResults.length > 0) {
      console.log(chalk.yellow.bold('\n  Sample LOW confidence synopses (first 3):'));
      for (const result of lowConfResults.slice(0, 3)) {
        const truncated = result.synopsis_te.length > 80
          ? result.synopsis_te.substring(0, 77) + '...'
          : result.synopsis_te;
        console.log(`    ${result.title} [${result.source}, ${(result.confidence * 100).toFixed(0)}%]:`);
        console.log(`      "${truncated}"`);
      }
    }
  }
}

main().catch(console.error);
