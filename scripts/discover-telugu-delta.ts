#!/usr/bin/env npx tsx
/**
 * Phase 7: Continuous Discovery CLI
 * 
 * Fetches new Telugu movies from TMDB weekly changes.
 * Safe mode: enrichment only unless validated.
 * 
 * Usage:
 *   pnpm discover:telugu:delta              # Check for new movies
 *   pnpm discover:telugu:delta --days=14    # Last 14 days
 *   pnpm discover:telugu:delta --apply      # Add to index
 *   pnpm discover:telugu:delta --status     # Show discovery status
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import {
  fetchTMDBWeeklyDelta,
  processDiscoveryDelta,
  getDiscoveryStatus
} from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  const showStatus = args.includes('--status');
  const apply = args.includes('--apply');
  const daysArg = args.find(a => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

  console.log(chalk.bold.cyan('\n🔍 CONTINUOUS DISCOVERY\n'));

  try {
    if (showStatus) {
      const status = await getDiscoveryStatus();
      
      console.log(chalk.bold('📊 DISCOVERY STATUS\n'));
      console.log(`Index Total: ${chalk.cyan(status.index_total)}`);
      console.log(`Movies Total: ${chalk.cyan(status.movies_total)}`);
      console.log(`Enrichment Pending: ${chalk.yellow(status.enrichment_pending)}`);
      console.log(`Coverage: ${chalk.green(status.coverage_percent)}%`);
      
      if (status.enrichment_pending > 0) {
        console.log(chalk.yellow(`\n⚠️  ${status.enrichment_pending} movies in index need enrichment`));
        console.log('Run: pnpm ingest:movies:smart');
      }
      return;
    }

    // Calculate date range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    })();

    console.log(`Date Range: ${chalk.cyan(startDate)} to ${chalk.cyan(endDate)}`);
    console.log(`Mode: ${apply ? chalk.green('APPLY') : chalk.yellow('DRY RUN')}\n`);

    console.log('Fetching TMDB weekly changes...\n');
    
    const delta = await fetchTMDBWeeklyDelta({
      startDate,
      endDate
    });

    console.log(chalk.bold('📊 DISCOVERY RESULTS\n'));
    console.log(`New Telugu Movies: ${chalk.green(delta.new_entries)}`);
    console.log(`Updated Movies: ${chalk.yellow(delta.updated_entries)}`);
    console.log(`Total Entries: ${chalk.cyan(delta.entries.length)}`);

    if (delta.entries.length === 0) {
      console.log(chalk.gray('\nNo new Telugu movies found in the specified period.'));
      return;
    }

    // Show entries by action
    const newMovies = delta.entries.filter(e => e.action === 'new');
    const updates = delta.entries.filter(e => e.action === 'update');
    const enrichOnly = delta.entries.filter(e => e.action === 'enrich_only');

    if (newMovies.length > 0) {
      console.log(chalk.bold('\n🆕 NEW MOVIES:\n'));
      newMovies.slice(0, 10).forEach(e => {
        console.log(`  • ${e.title} (TMDB: ${e.tmdb_id})`);
      });
      if (newMovies.length > 10) {
        console.log(chalk.gray(`  ... and ${newMovies.length - 10} more`));
      }
    }

    if (updates.length > 0) {
      console.log(chalk.bold('\n🔄 UPDATES:\n'));
      updates.slice(0, 5).forEach(e => {
        console.log(`  • ${e.title} - ${e.reason}`);
      });
    }

    if (enrichOnly.length > 0) {
      console.log(chalk.bold('\n📦 NEEDS ENRICHMENT:\n'));
      console.log(`  ${enrichOnly.length} movies in index but not enriched yet`);
    }

    // Process delta if applying
    if (apply) {
      console.log(chalk.bold('\n⚙️  PROCESSING DELTA...\n'));
      
      const result = await processDiscoveryDelta(delta, {
        dryRun: false,
        onProgress: (current, total, entry) => {
          process.stdout.write(`\rProcessing: ${current}/${total} - ${entry.title.substring(0, 30)}`);
        }
      });

      console.log('\n');
      console.log(`Processed: ${chalk.cyan(result.processed)}`);
      console.log(`Enriched: ${chalk.green(result.enriched)}`);
      console.log(`Skipped: ${chalk.gray(result.skipped)}`);
      
      if (result.errors.length > 0) {
        console.log(`Errors: ${chalk.red(result.errors.length)}`);
        result.errors.slice(0, 5).forEach(err => {
          console.log(chalk.red(`  • ${err}`));
        });
      }
    } else {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes were made'));
      console.log('Run with --apply to add new movies to index');
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Discovery failed:'), error);
    process.exit(1);
  }
}

main();





