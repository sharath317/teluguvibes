#!/usr/bin/env npx tsx
/**
 * Phase 1: Coverage Gap Analysis CLI
 * 
 * Analyzes why movies are missing or incomplete.
 * Outputs: coverage_gap_report.json
 * 
 * Usage:
 *   pnpm movies:coverage:analyze           # Full analysis
 *   pnpm movies:coverage:analyze --decade=1990  # Filter by decade
 *   pnpm movies:coverage:analyze --json    # JSON output only
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { analyzeCoverageGaps, analyzeIndexVsMovies } from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  const decadeArg = args.find(a => a.startsWith('--decade='));
  const decade = decadeArg ? parseInt(decadeArg.split('=')[1]) : undefined;
  const jsonOnly = args.includes('--json');
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];

  if (!jsonOnly) {
    console.log(chalk.bold.cyan('\n🔍 COVERAGE GAP ANALYSIS\n'));
    console.log(chalk.gray('Analyzing movie database for gaps and incompleteness...\n'));
  }

  try {
    // Run gap analysis
    const report = await analyzeCoverageGaps({
      limit: 2000,
      decadeFilter: decade,
      onlyIncomplete: true
    });

    // Also compare index vs movies
    const indexComparison = await analyzeIndexVsMovies();

    if (jsonOnly) {
      console.log(JSON.stringify({ report, indexComparison }, null, 2));
      return;
    }

    // Display summary
    console.log(chalk.bold('📊 GAP SUMMARY\n'));
    console.log(`Total Movies Analyzed: ${chalk.yellow(report.total_movies)}`);
    console.log(`Missing Backdrop: ${chalk.red(report.gap_summary.missing_backdrop)} (${Math.round(report.gap_summary.missing_backdrop / report.total_movies * 100)}%)`);
    console.log(`Missing Poster: ${chalk.red(report.gap_summary.missing_poster)} (${Math.round(report.gap_summary.missing_poster / report.total_movies * 100)}%)`);
    console.log(`Low Cast (<5): ${chalk.yellow(report.gap_summary.low_cast)}`);
    console.log(`No Director: ${chalk.yellow(report.gap_summary.no_director)}`);
    console.log(`No Genres: ${chalk.yellow(report.gap_summary.no_genres)}`);
    console.log(`Pre-1990: ${chalk.gray(report.gap_summary.pre_1990)}`);

    // Display by decade
    console.log(chalk.bold('\n📅 BY DECADE\n'));
    Object.entries(report.by_decade)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([decade, stats]) => {
        const posterBar = '█'.repeat(Math.floor(stats.poster_coverage / 10)) + '░'.repeat(10 - Math.floor(stats.poster_coverage / 10));
        const backdropBar = '█'.repeat(Math.floor(stats.backdrop_coverage / 10)) + '░'.repeat(10 - Math.floor(stats.backdrop_coverage / 10));
        
        console.log(`${chalk.cyan(decade.padEnd(10))} ${stats.total.toString().padStart(4)} movies`);
        console.log(`  Poster:   ${posterBar} ${stats.poster_coverage}%`);
        console.log(`  Backdrop: ${backdropBar} ${stats.backdrop_coverage}%`);
      });

    // Index comparison
    console.log(chalk.bold('\n🔗 INDEX vs MOVIES\n'));
    console.log(`In Index Only: ${chalk.gray(indexComparison.in_index_only)} (need enrichment)`);
    console.log(`In Movies Only: ${chalk.yellow(indexComparison.in_movies_only)} (not indexed)`);
    console.log(`In Both: ${chalk.green(indexComparison.in_both)}`);
    console.log(`Index Coverage: ${chalk.cyan(indexComparison.index_coverage_percent)}%`);

    // Recommendations
    console.log(chalk.bold('\n💡 RECOMMENDATIONS\n'));
    report.recommendations.forEach(rec => {
      console.log(`• ${rec}`);
    });

    // Top priority gaps
    const criticalGaps = report.gaps.filter(g => g.priority === 'critical');
    const highGaps = report.gaps.filter(g => g.priority === 'high');

    console.log(chalk.bold('\n🚨 PRIORITY GAPS\n'));
    console.log(`Critical: ${chalk.red(criticalGaps.length)}`);
    console.log(`High: ${chalk.yellow(highGaps.length)}`);

    if (criticalGaps.length > 0) {
      console.log(chalk.bold('\n📋 TOP 10 CRITICAL GAPS:\n'));
      criticalGaps.slice(0, 10).forEach((gap, i) => {
        console.log(`${i + 1}. ${gap.title} (${gap.release_year || 'N/A'})`);
        console.log(`   Missing: ${gap.missing_fields.join(', ')}`);
        console.log(`   Action: ${gap.suggested_action}`);
      });
    }

    // Save report
    const outputPath = outputFile || 'coverage_gap_report.json';
    writeFileSync(outputPath, JSON.stringify({
      report,
      indexComparison,
      generated_at: new Date().toISOString()
    }, null, 2));
    console.log(chalk.green(`\n✅ Report saved to ${outputPath}`));

  } catch (error) {
    console.error(chalk.red('\n❌ Analysis failed:'), error);
    process.exit(1);
  }
}

main();

