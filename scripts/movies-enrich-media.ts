#!/usr/bin/env npx tsx
/**
 * Phase 3: Tiered Media Enhancement CLI
 * 
 * Enhances movie media (posters, backdrops) using tiered sources.
 * Never overwrites valid images unless replacement is better.
 * 
 * Usage:
 *   pnpm movies:enrich:media --tiered              # Default: backdrop focus
 *   pnpm movies:enrich:media --tiered --focus=poster
 *   pnpm movies:enrich:media --tiered --focus=both --limit=50
 *   pnpm movies:enrich:media --tiered --decade=2020 --dry
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { enhanceMediaBatch, MediaTrustTier } from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  
  const focusArg = args.find(a => a.startsWith('--focus='));
  const focus = focusArg?.split('=')[1] as 'backdrop' | 'poster' | 'both' || 'backdrop';
  
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;
  
  const decadeArg = args.find(a => a.startsWith('--decade='));
  const decade = decadeArg ? parseInt(decadeArg.split('=')[1]) : undefined;
  
  const tierArg = args.find(a => a.startsWith('--tier='));
  const maxTier = tierArg 
    ? parseInt(tierArg.split('=')[1]) 
    : MediaTrustTier.TIER_2_CURATED;
  
  const dryRun = args.includes('--dry') || args.includes('--dry-run');

  console.log(chalk.bold.cyan('\n🖼️  TIERED MEDIA ENHANCEMENT\n'));
  console.log(`Focus: ${chalk.yellow(focus)}`);
  console.log(`Limit: ${chalk.yellow(limit)}`);
  console.log(`Max Tier: ${chalk.yellow(maxTier)} (${maxTier === 1 ? 'TMDB only' : 'TMDB + Wikimedia'})`);
  if (decade) console.log(`Decade: ${chalk.yellow(decade)}s`);
  console.log(`Mode: ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log();

  try {
    const stats = await enhanceMediaBatch({
      limit,
      focusType: focus,
      maxTier,
      dryRun,
      decadeFilter: decade,
      onProgress: (current, total, result) => {
        const status = result.backdrop_updated || result.poster_updated
          ? chalk.green('✓')
          : result.skipped_reason
            ? chalk.gray('○')
            : chalk.yellow('?');
        
        const backdrop = result.backdrop_updated 
          ? chalk.green('BD') 
          : chalk.gray('--');
        const poster = result.poster_updated 
          ? chalk.green('PO') 
          : chalk.gray('--');
        
        process.stdout.write(
          `\r[${current}/${total}] ${status} ${result.title.substring(0, 40).padEnd(40)} ${backdrop} ${poster}`
        );
      }
    });

    console.log('\n');
    console.log(chalk.bold('📊 ENHANCEMENT RESULTS\n'));
    console.log(`Processed: ${chalk.cyan(stats.processed)}`);
    console.log(`Backdrops Updated: ${chalk.green(stats.backdropUpdated)}`);
    console.log(`Posters Updated: ${chalk.green(stats.posterUpdated)}`);
    console.log(`Skipped: ${chalk.gray(stats.skipped)}`);
    console.log(`Errors: ${chalk.red(stats.errors)}`);

    if (dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes were made'));
      console.log('Run without --dry to apply changes');
    }

    // Calculate improvement
    if (stats.backdropUpdated > 0 || stats.posterUpdated > 0) {
      console.log(chalk.green(`\n✅ Enhanced ${stats.backdropUpdated + stats.posterUpdated} media items`));
    }

    // Show sample results
    if (stats.results.length > 0) {
      const updated = stats.results.filter(r => r.backdrop_updated || r.poster_updated);
      if (updated.length > 0) {
        console.log(chalk.bold('\n🎬 SAMPLE UPDATES (first 5):\n'));
        updated.slice(0, 5).forEach(r => {
          console.log(`• ${r.title}`);
          if (r.backdrop_source) {
            console.log(`  Backdrop: ${chalk.cyan(r.backdrop_source.source)} (tier ${r.backdrop_source.trust_tier})`);
          }
          if (r.poster_source) {
            console.log(`  Poster: ${chalk.cyan(r.poster_source.source)} (tier ${r.poster_source.trust_tier})`);
          }
        });
      }
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Enhancement failed:'), error);
    process.exit(1);
  }
}

main();

