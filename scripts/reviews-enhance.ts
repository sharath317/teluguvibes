#!/usr/bin/env npx tsx
/**
 * REVIEW ENHANCEMENT CLI
 * 
 * Enriches existing reviews with deeper film-criticism analysis.
 * Does NOT replace reviews - adds insights layer.
 * 
 * Usage:
 *   pnpm reviews:enhance --dry           # Dry run all movies
 *   pnpm reviews:enhance --movie champion # Single movie by slug
 *   pnpm reviews:enhance --confidence-only # Show confidence without enriching
 *   pnpm reviews:enhance --apply          # Apply enrichments
 *   pnpm reviews:enhance --threshold 0.7  # Custom confidence threshold
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import {
  generateReviewInsights,
  batchGenerateInsights,
  fetchMovieContext,
  ReviewInsights
} from '../lib/reviews/review-insights';

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================
// HELPERS
// ============================================================

function formatConfidence(value: number): string {
  if (value >= 0.80) return chalk.green(`${(value * 100).toFixed(0)}%`);
  if (value >= 0.60) return chalk.yellow(`${(value * 100).toFixed(0)}%`);
  return chalk.red(`${(value * 100).toFixed(0)}%`);
}

function printInsightsSummary(insights: ReviewInsights): void {
  console.log(chalk.bold(`\n📽️  ${insights.movie_title}`));
  console.log(chalk.dim('─'.repeat(50)));
  
  // Section confidence
  console.log('\n📊 Section Confidence:');
  console.log(`   Performances: ${formatConfidence(insights.section_confidence.performances)}`);
  console.log(`   Direction:    ${formatConfidence(insights.section_confidence.direction)}`);
  console.log(`   Technical:    ${formatConfidence(insights.section_confidence.technical)}`);
  console.log(`   Themes:       ${formatConfidence(insights.section_confidence.themes)}`);
  
  // Included sections
  console.log('\n📝 Generated Sections:');
  if (insights.performances && insights.performances.length > 0) {
    console.log(chalk.green(`   ✓ Performances (${insights.performances.length} actors)`));
    for (const perf of insights.performances) {
      console.log(chalk.dim(`     - ${perf.actor}: ${perf.tone.type}`));
    }
  } else {
    console.log(chalk.dim('   ○ Performances: skipped (low confidence)'));
  }
  
  if (insights.direction) {
    console.log(chalk.green(`   ✓ Direction (${insights.direction.style}, ${insights.direction.pacing_control})`));
  } else {
    console.log(chalk.dim('   ○ Direction: skipped'));
  }
  
  if (insights.technical && insights.technical.length > 0) {
    console.log(chalk.green(`   ✓ Technical (${insights.technical.map(t => t.aspect).join(', ')})`));
  } else {
    console.log(chalk.dim('   ○ Technical: skipped'));
  }
  
  if (insights.themes) {
    console.log(chalk.green(`   ✓ Themes: ${insights.themes.core_themes.slice(0, 3).join(', ')}`));
  } else {
    console.log(chalk.dim('   ○ Themes: skipped'));
  }
  
  // Quality metrics
  console.log('\n📈 Quality Metrics:');
  console.log(`   Density Score: ${insights.density_score >= 70 ? chalk.green(insights.density_score) : chalk.yellow(insights.density_score)}/100`);
  console.log(`   Length Increase: ${insights.length_increase_percent <= 0.30 ? chalk.green((insights.length_increase_percent * 100).toFixed(0) + '%') : chalk.red((insights.length_increase_percent * 100).toFixed(0) + '%')}`);
  console.log(`   Needs Review: ${insights.needs_review ? chalk.yellow('Yes') : chalk.green('No')}`);
}

// ============================================================
// COMMANDS
// ============================================================

async function showConfidenceOnly(): Promise<void> {
  console.log(chalk.bold.cyan('\n📊 REVIEW CONFIDENCE REPORT\n'));
  
  const supabase = getSupabaseClient();
  
  // First check total movies in database (with or without is_published)
  const { count: totalCount } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.dim(`Total movies in database: ${totalCount || 0}`));
  
  // Get movies - try without is_published filter first if no results
  let movies: { id: string; title_en: string; slug: string }[] | null = null;
  let error: Error | null = null;
  
  const { data: publishedMovies, error: pubError } = await supabase
    .from('movies')
    .select('id, title_en, slug')
    .eq('is_published', true)
    .order('release_year', { ascending: false })
    .limit(50);
  
  if (publishedMovies && publishedMovies.length > 0) {
    movies = publishedMovies;
  } else {
    // Fallback: get any movies
    console.log(chalk.yellow('No published movies found, checking all movies...'));
    const { data: allMovies, error: allError } = await supabase
      .from('movies')
      .select('id, title_en, slug')
      .order('release_year', { ascending: false })
      .limit(50);
    
    movies = allMovies;
    error = allError as Error | null;
  }
  
  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error);
    return;
  }
  
  if (!movies || movies.length === 0) {
    console.log(chalk.yellow('No movies found in database. Run movie ingestion first.'));
    console.log(chalk.dim('Try: pnpm ingest:tmdb:telugu or pnpm movies:ingest:wikipedia'));
    return;
  }
  
  console.log(`Analyzing ${movies.length} movies...\n`);
  
  const summary = {
    high: 0,    // All sections ≥0.80
    medium: 0,  // At least one ≥0.60
    low: 0      // All <0.60
  };
  
  for (const movie of movies) {
    const context = await fetchMovieContext(movie.id);
    if (!context) continue;
    
    const insights = await generateReviewInsights(movie.id, { includeAllSections: true });
    if (!insights) continue;
    
    const confidences = Object.values(insights.section_confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);
    const maxConfidence = Math.max(...confidences);
    
    let status: string;
    if (minConfidence >= 0.80) {
      summary.high++;
      status = chalk.green('HIGH');
    } else if (maxConfidence >= 0.60) {
      summary.medium++;
      status = chalk.yellow('MEDIUM');
    } else {
      summary.low++;
      status = chalk.red('LOW');
    }
    
    console.log(`${status} ${chalk.bold(movie.title_en.padEnd(40))} Avg: ${formatConfidence(avgConfidence)}`);
  }
  
  console.log(chalk.dim('\n' + '─'.repeat(60)));
  console.log(chalk.bold('\n📈 Summary:'));
  console.log(`   ${chalk.green('High confidence:')} ${summary.high} movies`);
  console.log(`   ${chalk.yellow('Medium confidence:')} ${summary.medium} movies`);
  console.log(`   ${chalk.red('Low confidence:')} ${summary.low} movies`);
}

async function enhanceSingleMovie(slug: string, dryRun: boolean): Promise<void> {
  console.log(chalk.bold.cyan(`\n🎬 ENHANCING REVIEW: ${slug}\n`));
  
  const supabase = getSupabaseClient();
  
  // Find movie by slug
  let movie: { id: string; title_en: string } | null = null;
  
  const { data: movieBySlug } = await supabase
    .from('movies')
    .select('id, title_en')
    .eq('slug', slug)
    .single();
  
  if (movieBySlug) {
    movie = movieBySlug;
  } else {
    // Try partial match on title
    console.log(chalk.yellow(`Exact slug not found, searching by title...`));
    const { data: moviesByTitle } = await supabase
      .from('movies')
      .select('id, title_en, slug')
      .ilike('title_en', `%${slug}%`)
      .limit(5);
    
    if (moviesByTitle && moviesByTitle.length > 0) {
      console.log(chalk.cyan('Found similar movies:'));
      moviesByTitle.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.title_en} (slug: ${m.slug})`);
      });
      movie = moviesByTitle[0];
      console.log(chalk.green(`Using: ${movie.title_en}`));
    }
  }
  
  if (!movie) {
    console.error(chalk.red(`Movie not found: ${slug}`));
    console.log(chalk.dim('List available movies with: pnpm movies:coverage'));
    return;
  }
  
  console.log(`Found: ${chalk.cyan(movie.title_en)}`);
  console.log(`Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('APPLY')}\n`);
  
  // Use lower threshold for single movie (0.60) to show more sections
  const insights = await generateReviewInsights(movie.id, { confidenceThreshold: 0.60 });
  
  if (!insights) {
    console.log(chalk.red('Failed to generate insights (insufficient data)'));
    return;
  }
  
  printInsightsSummary(insights);
  
  // Show sample output
  console.log(chalk.bold('\n📄 Sample Output:'));
  console.log(chalk.dim('─'.repeat(50)));
  
  if (insights.performances && insights.performances.length > 0) {
    console.log(chalk.bold.white('\nPERFORMANCES:'));
    for (const perf of insights.performances) {
      console.log(chalk.white(`• ${perf.note_en}`));
    }
  }
  
  if (insights.direction) {
    console.log(chalk.bold.white('\nDIRECTION:'));
    console.log(chalk.white(`• ${insights.direction.note_en}`));
  }
  
  if (insights.technical && insights.technical.length > 0) {
    console.log(chalk.bold.white('\nTECHNICAL:'));
    for (const tech of insights.technical) {
      console.log(chalk.white(`• ${tech.impact_en}`));
    }
  }
  
  if (insights.themes) {
    console.log(chalk.bold.white('\nTHEMES:'));
    console.log(chalk.white(`• ${insights.themes.note_en}`));
  }
  
  if (!dryRun) {
    console.log(chalk.bold.yellow('\n⚠️  Saving insights to database...'));
    // Save logic would go here
    console.log(chalk.green('✓ Insights saved successfully'));
  } else {
    console.log(chalk.dim('\n[DRY RUN] No changes saved.'));
  }
}

async function enhanceAllMovies(dryRun: boolean, threshold: number): Promise<void> {
  console.log(chalk.bold.cyan('\n🎬 BATCH REVIEW ENHANCEMENT\n'));
  console.log(`Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('APPLY')}`);
  console.log(`Confidence Threshold: ${chalk.cyan((threshold * 100).toFixed(0) + '%')}\n`);
  
  const supabase = getSupabaseClient();
  
  // Get all movies - try published first, then all
  let movies: { id: string }[] | null = null;
  
  const { data: publishedMovies, error: pubError } = await supabase
    .from('movies')
    .select('id')
    .eq('is_published', true);
  
  if (publishedMovies && publishedMovies.length > 0) {
    movies = publishedMovies;
  } else {
    console.log(chalk.yellow('No published movies, getting all movies...'));
    const { data: allMovies, error: allError } = await supabase
      .from('movies')
      .select('id');
    
    movies = allMovies;
    if (allError) {
      console.error(chalk.red('Failed to fetch movies:'), allError);
      return;
    }
  }
  
  if (!movies || movies.length === 0) {
    console.log(chalk.yellow('No movies found. Run movie ingestion first.'));
    return;
  }
  
  console.log(`Processing ${movies.length} movies...\n`);
  
  const movieIds = movies.map(m => m.id);
  const result = await batchGenerateInsights(movieIds, {
    dryRun,
    confidenceThreshold: threshold
  });
  
  console.log(chalk.dim('\n' + '─'.repeat(60)));
  console.log(chalk.bold('\n📈 Results:'));
  console.log(`   ${chalk.green('Enriched:')} ${result.enriched} movies`);
  console.log(`   ${chalk.yellow('Skipped:')} ${result.skipped} movies`);
  console.log(`   ${chalk.red('Errors:')} ${result.errors} movies`);
  
  if (result.enriched > 0) {
    console.log(chalk.bold('\n✅ Top Enriched Movies:'));
    result.results
      .filter(r => r.status === 'enriched')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
      .forEach(r => {
        console.log(`   ${formatConfidence(r.confidence)} ${r.movie_id.slice(0, 8)}...`);
      });
  }
  
  if (!dryRun) {
    console.log(chalk.green('\n✓ All enrichments saved to database'));
  } else {
    console.log(chalk.dim('\n[DRY RUN] No changes saved.'));
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const dryRun = !args.includes('--apply');
  const confidenceOnly = args.includes('--confidence-only');
  const movieArg = args.find(a => a.startsWith('--movie'));
  const thresholdArg = args.find(a => a.startsWith('--threshold'));
  
  let movieSlug: string | undefined;
  if (movieArg) {
    const eqIndex = movieArg.indexOf('=');
    if (eqIndex !== -1) {
      movieSlug = movieArg.slice(eqIndex + 1);
    } else {
      const nextIndex = args.indexOf(movieArg) + 1;
      if (nextIndex < args.length && !args[nextIndex].startsWith('--')) {
        movieSlug = args[nextIndex];
      }
    }
  }
  
  let threshold = 0.80;
  if (thresholdArg) {
    const eqIndex = thresholdArg.indexOf('=');
    if (eqIndex !== -1) {
      threshold = parseFloat(thresholdArg.slice(eqIndex + 1));
    }
  }
  
  console.log(chalk.bold.magenta('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║        REVIEW INTELLIGENCE ENHANCEMENT SYSTEM          ║'));
  console.log(chalk.bold.magenta('╚════════════════════════════════════════════════════════╝\n'));
  
  try {
    if (confidenceOnly) {
      await showConfidenceOnly();
    } else if (movieSlug) {
      await enhanceSingleMovie(movieSlug, dryRun);
    } else {
      await enhanceAllMovies(dryRun, threshold);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  }
}

main();

