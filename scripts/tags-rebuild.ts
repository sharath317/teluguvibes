#!/usr/bin/env npx tsx
/**
 * Phase 5: Smart Tags Rebuild CLI
 * 
 * Rebuilds structured, deterministic tags for all movies.
 * 
 * Usage:
 *   pnpm tags:rebuild              # Dry run
 *   pnpm tags:rebuild --apply      # Apply tags
 *   pnpm tags:rebuild --stats      # Show tag distribution only
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { rebuildAllTags, getAvailableTags } from '../lib/media-evolution';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const statsOnly = args.includes('--stats');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;

  console.log(chalk.bold.cyan('\n🏷️  SMART TAG SYSTEM\n'));

  // Show available tags
  if (statsOnly) {
    const available = getAvailableTags();
    console.log(chalk.bold('📚 AVAILABLE TAGS:\n'));
    
    console.log(chalk.cyan('NARRATIVE:'));
    console.log('  ' + available.narrative.join(', '));
    
    console.log(chalk.cyan('\nTONE:'));
    console.log('  ' + available.tone.join(', '));
    
    console.log(chalk.cyan('\nCULTURAL:'));
    console.log('  ' + available.cultural.join(', '));
    
    console.log(chalk.cyan('\nCAREER:'));
    console.log('  ' + available.career.join(', '));
    return;
  }

  console.log(`Limit: ${chalk.yellow(limit)}`);
  console.log(`Mode: ${apply ? chalk.green('APPLY') : chalk.yellow('DRY RUN')}\n`);

  try {
    const result = await rebuildAllTags({
      limit,
      dryRun: !apply,
      onProgress: (current, total) => {
        process.stdout.write(`\rProcessing: ${current}/${total}`);
      }
    });

    console.log('\n');
    console.log(chalk.bold('📊 TAG REBUILD RESULTS\n'));
    console.log(`Processed: ${chalk.cyan(result.processed)}`);
    console.log(`Tagged: ${chalk.green(result.tagged)}`);
    console.log(`Tag Coverage: ${chalk.cyan(Math.round((result.tagged / result.processed) * 100))}%`);

    // Show tag distribution
    console.log(chalk.bold('\n🏷️  TAG DISTRIBUTION (top 20):\n'));
    
    const sorted = Object.entries(result.tag_distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    sorted.forEach(([tag, count]) => {
      const bar = '█'.repeat(Math.min(40, Math.floor(count / 5)));
      console.log(`${tag.padEnd(25)} ${bar} ${count}`);
    });

    // Group by category
    console.log(chalk.bold('\n📊 BY CATEGORY:\n'));
    const byCategory: Record<string, number> = {
      narrative: 0,
      tone: 0,
      cultural: 0,
      career: 0
    };

    Object.entries(result.tag_distribution).forEach(([tag, count]) => {
      const category = tag.split(':')[0];
      if (byCategory[category] !== undefined) {
        byCategory[category] += count;
      }
    });

    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`${category.padEnd(12)} ${chalk.cyan(count)}`);
    });

    if (!apply) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - Tags not persisted'));
      console.log('Run with --apply to save tags');
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Tag rebuild failed:'), error);
    process.exit(1);
  }
}

main();

