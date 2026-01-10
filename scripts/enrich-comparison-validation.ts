#!/usr/bin/env npx tsx
/**
 * COMPARISON VALIDATION SCRIPT
 * 
 * Fetches data from comparison-only secondary sources and uses it
 * for confidence scoring and anomaly detection.
 * 
 * IMPORTANT:
 * - Does NOT overwrite any existing data
 * - Only updates confidence scores and alignment metrics
 * - Flags conflicts for manual review
 * - All comparison sources are disabled by default
 * 
 * Usage:
 *   npx tsx scripts/enrich-comparison-validation.ts --dry
 *   npx tsx scripts/enrich-comparison-validation.ts --execute --limit=100
 *   npx tsx scripts/enrich-comparison-validation.ts --enable-sources --execute
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string = ''): string => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '100'));
const EXECUTE = hasFlag('execute');
const ENABLE_SOURCES = hasFlag('enable-sources');
const SOURCES = getArg('sources', 'all'); // comma-separated list or 'all'
const VERBOSE = hasFlag('verbose');

// ============================================================
// TYPES
// ============================================================

interface Movie {
    id: string;
    title_en: string;
    release_year: number;
    tmdb_id?: number;
    imdb_id?: string;
    director?: string;
    hero?: string;
    genres?: string[];
    data_confidence?: number;
}

interface ValidationResult {
    movieId: string;
    movieTitle: string;
    sourcesChecked: string[];
    alignmentScore: number;
    confidenceBefore: number;
    confidenceAfter: number;
    conflicts: Array<{
        field: string;
        severity: 'low' | 'medium' | 'high';
        sources: string[];
    }>;
    needsReview: boolean;
    reviewReason?: string;
}

// ============================================================
// MAIN VALIDATION LOGIC
// ============================================================

async function validateMovie(movie: Movie): Promise<ValidationResult | null> {
    try {
        // Import comparison orchestrator dynamically
        const { comparisonOrchestrator, ComparisonOrchestrator } = await import('../lib/sources/comparison');

        // Enable sources if requested
        if (ENABLE_SOURCES) {
            ComparisonOrchestrator.enableAll();
        }

        // Build query
        const query = {
            tmdbId: movie.tmdb_id,
            imdbId: movie.imdb_id,
            titleEn: movie.title_en,
            releaseYear: movie.release_year,
            director: movie.director,
            hero: movie.hero,
            context: {
                language: 'Telugu' as const,
                genres: movie.genres,
            },
        };

        // Fetch from comparison sources
        const comparison = await comparisonOrchestrator.fetchAll(query);

        // Calculate confidence adjustment
        const confidenceBefore = movie.data_confidence || 0.5;
        const confidenceAfter = Math.max(0, Math.min(1,
            confidenceBefore + comparison.confidenceAdjustment
        ));

        return {
            movieId: movie.id,
            movieTitle: movie.title_en,
            sourcesChecked: comparison.sources.filter(s => s.success).map(s => s.sourceId),
            alignmentScore: comparison.alignmentScore,
            confidenceBefore,
            confidenceAfter,
            conflicts: comparison.conflicts,
            needsReview: comparison.needsManualReview,
            reviewReason: comparison.reviewReason,
        };

    } catch (error) {
        if (VERBOSE) {
            console.error(chalk.red(`  Error validating ${movie.title_en}:`), error);
        }
        return null;
    }
}

async function main(): Promise<void> {
    console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           COMPARISON VALIDATION SCRIPT                               ║
║   Confidence scoring from secondary sources                          ║
╚══════════════════════════════════════════════════════════════════════╝
`));

    console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
    console.log(`  Limit: ${LIMIT} movies`);
    console.log(`  Enable sources: ${ENABLE_SOURCES ? chalk.green('Yes') : chalk.yellow('No')}`);

    if (!ENABLE_SOURCES) {
        console.log(chalk.yellow(`
  ⚠️  Comparison sources are DISABLED by default.
  Run with --enable-sources to enable them.
`));
    }

    // Fetch movies to validate
    const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title_en, release_year, tmdb_id, imdb_id, director, hero, genres, data_confidence')
        .eq('language', 'Telugu')
        .eq('is_published', true)
        .order('release_year', { ascending: false })
        .limit(LIMIT);

    if (error) {
        console.error(chalk.red('Error fetching movies:'), error);
        return;
    }

    if (!movies || movies.length === 0) {
        console.log(chalk.yellow('  No movies to validate'));
        return;
    }

    console.log(`\n  Found ${chalk.cyan(movies.length)} movies to validate\n`);

    // Track statistics
    const stats = {
        processed: 0,
        validated: 0,
        needsReview: 0,
        confidenceIncreased: 0,
        confidenceDecreased: 0,
        conflictsFound: 0,
    };

    const results: ValidationResult[] = [];

    // Process each movie
    for (const movie of movies) {
        stats.processed++;
        
        process.stdout.write(`\r  Processing: ${stats.processed}/${movies.length} - ${movie.title_en.substring(0, 30)}...`);

        const result = await validateMovie(movie);

        if (result) {
            stats.validated++;
            results.push(result);

            if (result.needsReview) stats.needsReview++;
            if (result.confidenceAfter > result.confidenceBefore) stats.confidenceIncreased++;
            if (result.confidenceAfter < result.confidenceBefore) stats.confidenceDecreased++;
            stats.conflictsFound += result.conflicts.length;

            // Update database if executing
            if (EXECUTE && result.sourcesChecked.length > 0) {
                await supabase
                    .from('movies')
                    .update({
                        comparison_alignment_score: result.alignmentScore,
                        needs_manual_review: result.needsReview,
                        review_reason: result.reviewReason,
                        last_verified_at: new Date().toISOString(),
                    })
                    .eq('id', movie.id);
            }
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 200));
    }

    console.log('\n');

    // Print summary
    console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════════════
📊 VALIDATION SUMMARY
═══════════════════════════════════════════════════════════════════`));

    console.log(`  Processed:              ${stats.processed}`);
    console.log(`  Validated:              ${stats.validated}`);
    console.log(`  Confidence increased:   ${chalk.green(stats.confidenceIncreased)}`);
    console.log(`  Confidence decreased:   ${chalk.red(stats.confidenceDecreased)}`);
    console.log(`  Needs manual review:    ${chalk.yellow(stats.needsReview)}`);
    console.log(`  Conflicts found:        ${stats.conflictsFound}`);

    // Show sample results
    if (results.length > 0 && VERBOSE) {
        console.log(`\n  Sample Results (first 5):`);
        results.slice(0, 5).forEach((r) => {
            const change = r.confidenceAfter - r.confidenceBefore;
            const changeStr = change >= 0 
                ? chalk.green(`+${(change * 100).toFixed(1)}%`)
                : chalk.red(`${(change * 100).toFixed(1)}%`);
            
            console.log(`    ${r.movieTitle}: ${changeStr} | Sources: ${r.sourcesChecked.join(', ') || 'none'}`);
        });
    }

    // Show movies needing review
    const reviewMovies = results.filter(r => r.needsReview);
    if (reviewMovies.length > 0) {
        console.log(`\n  Movies Needing Review (${reviewMovies.length}):`);
        reviewMovies.slice(0, 10).forEach((r) => {
            console.log(`    ${chalk.yellow('⚠')} ${r.movieTitle}: ${r.reviewReason}`);
        });
    }

    if (!EXECUTE) {
        console.log(chalk.yellow(`
  ⚠️  DRY RUN - No changes were made.
  Run with --execute to apply changes.`));
    } else {
        console.log(chalk.green(`\n  ✅ Validation complete!`));
    }
}

main().catch(console.error);

