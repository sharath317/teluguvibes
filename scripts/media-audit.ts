#!/usr/bin/env npx tsx
/**
 * Media Audit CLI
 * 
 * Audits media quality and generates comprehensive metrics.
 * 
 * Usage:
 *   pnpm media:audit               # Full audit
 *   pnpm media:audit --missing     # Show missing media only
 *   pnpm media:audit --metrics     # Show evolution metrics
 *   pnpm media:audit --json        # JSON output
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import {
  generateFullMetrics,
  calculateVisualCompleteness,
  calculateDecadeCoverage,
  calculateEntityConfidence
} from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  const showMissing = args.includes('--missing');
  const showMetrics = args.includes('--metrics');
  const jsonOutput = args.includes('--json');
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];

  console.log(chalk.bold.cyan('\n📊 MEDIA AUDIT\n'));

  try {
    if (showMetrics) {
      const metrics = await generateFullMetrics();

      if (jsonOutput) {
        console.log(JSON.stringify(metrics, null, 2));
        return;
      }

      console.log(chalk.bold('🎯 DATA EVOLUTION METRICS\n'));
      
      console.log(`Visual Completeness: ${colorPercent(metrics.visual_completeness)}%`);
      console.log(`Structured Depth: ${colorPercent(metrics.structured_depth_score)}`);
      console.log(`Entity Confidence: ${chalk.cyan(metrics.entity_confidence_avg.toFixed(2))}`);
      
      console.log(chalk.bold('\n📷 MEDIA TIER DISTRIBUTION:'));
      console.log(`  Tier 1 (TMDB): ${chalk.green(metrics.media_tier_distribution.tier_1)}`);
      console.log(`  Tier 2 (Wikimedia): ${chalk.yellow(metrics.media_tier_distribution.tier_2)}`);
      console.log(`  Tier 3 (Fallback): ${chalk.gray(metrics.media_tier_distribution.tier_3)}`);

      console.log(chalk.bold('\n📅 COVERAGE BY DECADE:'));
      Object.entries(metrics.coverage_by_decade)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([decade, percent]) => {
          const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
          console.log(`  ${decade.padEnd(10)} ${bar} ${colorPercent(percent)}%`);
        });

      console.log(chalk.bold('\n🎯 GOALS:'));
      Object.entries(metrics.goals).forEach(([goal, { current, target }]) => {
        const status = current >= target ? chalk.green('✓') : chalk.yellow('○');
        console.log(`  ${status} ${goal.replace(/_/g, ' ')}: ${current}% / ${target}%`);
      });

      if (outputFile) {
        writeFileSync(outputFile, JSON.stringify(metrics, null, 2));
        console.log(chalk.green(`\n✅ Metrics saved to ${outputFile}`));
      }
      return;
    }

    // Full audit
    const [visual, decades, entity] = await Promise.all([
      calculateVisualCompleteness(),
      calculateDecadeCoverage(),
      calculateEntityConfidence()
    ]);

    if (jsonOutput) {
      console.log(JSON.stringify({ visual, decades, entity }, null, 2));
      return;
    }

    // Visual completeness
    console.log(chalk.bold('🖼️  VISUAL COMPLETENESS\n'));
    console.log(`Total Movies: ${chalk.cyan(visual.total)}`);
    console.log(`With Poster: ${chalk.green(visual.withPoster)} (${Math.round(visual.withPoster / visual.total * 100)}%)`);
    console.log(`With Backdrop: ${chalk.yellow(visual.withBackdrop)} (${Math.round(visual.withBackdrop / visual.total * 100)}%)`);
    console.log(`With Both: ${chalk.green(visual.withBoth)} (${visual.percentComplete}%)`);

    // Progress bar for visual completeness
    const posterBar = createProgressBar(visual.withPoster / visual.total * 100);
    const backdropBar = createProgressBar(visual.withBackdrop / visual.total * 100);
    console.log(`\nPosters:   ${posterBar}`);
    console.log(`Backdrops: ${backdropBar}`);

    if (showMissing) {
      const missingPoster = visual.total - visual.withPoster;
      const missingBackdrop = visual.total - visual.withBackdrop;
      
      console.log(chalk.bold('\n⚠️  MISSING MEDIA\n'));
      console.log(`Missing Posters: ${chalk.red(missingPoster)}`);
      console.log(`Missing Backdrops: ${chalk.red(missingBackdrop)}`);
    }

    // Decade breakdown
    console.log(chalk.bold('\n📅 BY DECADE\n'));
    Object.entries(decades)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([decade, stats]) => {
        const completeBar = createProgressBar(stats.percentComplete, 15);
        const status = stats.percentComplete >= 50 
          ? chalk.green('✓') 
          : stats.percentComplete >= 25 
            ? chalk.yellow('○') 
            : chalk.red('✗');
        console.log(`${status} ${decade.padEnd(10)} ${completeBar} ${stats.complete}/${stats.total} (${stats.percentComplete}%)`);
      });

    // Entity confidence
    console.log(chalk.bold('\n👥 ENTITY CONFIDENCE\n'));
    console.log(`Average Confidence: ${chalk.cyan(entity.avgConfidence.toFixed(2))}`);
    console.log(`With Director: ${colorPercent(entity.withDirector)}%`);
    console.log(`With Hero: ${colorPercent(entity.withHero)}%`);
    console.log(`With Heroine: ${colorPercent(entity.withHeroine)}%`);
    console.log(`With Cast 3+: ${colorPercent(entity.withCast3Plus)}%`);
    console.log(`With Cast 5+: ${colorPercent(entity.withCast5Plus)}%`);

    // Recommendations
    console.log(chalk.bold('\n💡 RECOMMENDATIONS\n'));
    
    if (visual.withBackdrop / visual.total < 0.5) {
      console.log(`• Run: ${chalk.cyan('pnpm movies:enrich:media --tiered --focus=backdrop')}`);
    }
    
    if (entity.withCast5Plus < 75) {
      console.log(`• Run: ${chalk.cyan('pnpm movies:enrich:cast --min-cast=5')}`);
    }
    
    const lowDecades = Object.entries(decades)
      .filter(([_, stats]) => stats.percentComplete < 30)
      .map(([decade]) => decade);
    
    if (lowDecades.length > 0) {
      console.log(`• Focus on low-coverage decades: ${chalk.yellow(lowDecades.join(', '))}`);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Audit failed:'), error);
    process.exit(1);
  }
}

function colorPercent(percent: number): string {
  if (percent >= 75) return chalk.green(percent.toString());
  if (percent >= 50) return chalk.yellow(percent.toString());
  return chalk.red(percent.toString());
}

function createProgressBar(percent: number, width: number = 20): string {
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  if (percent >= 75) return chalk.green(bar);
  if (percent >= 50) return chalk.yellow(bar);
  return chalk.red(bar);
}

main();

