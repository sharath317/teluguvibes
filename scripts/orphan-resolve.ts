#!/usr/bin/env npx tsx
/**
 * Orphan Movie Resolution CLI
 * 
 * Resolves movies that have no TMDB ID by:
 * 1. Searching TMDB for matches
 * 2. Merging duplicates or enriching directly
 * 
 * Usage:
 *   pnpm orphan:resolve         # Resolve all orphan movies
 *   pnpm orphan:resolve --dry   # Preview mode
 *   pnpm orphan:resolve --limit=10  # Limit to 10 movies
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { resolveAllOrphans, findOrphanMovies } from '../lib/movie-validation/orphan-resolver';

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

interface CLIArgs {
  dryRun: boolean;
  verbose: boolean;
  limit?: number;
  status: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    dryRun: false,
    verbose: false,
    status: false,
  };

  for (const arg of args) {
    if (arg === '--dry' || arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '-v' || arg === '--verbose') parsed.verbose = true;
    else if (arg === '--status') parsed.status = true;
    else if (arg.startsWith('--limit=')) parsed.limit = parseInt(arg.split('=')[1]);
  }

  return parsed;
}

// ============================================================
// STATUS DISPLAY
// ============================================================

async function showStatus(): Promise<void> {
  console.log(chalk.cyan.bold('\n🔍 ORPHAN MOVIE STATUS\n'));
  
  const orphans = await findOrphanMovies({ publishedOnly: true });
  const allOrphans = await findOrphanMovies({ publishedOnly: false });
  
  console.log(chalk.bold('Orphan Movies (no TMDB ID):'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Published:    ${chalk.red(orphans.length)}`);
  console.log(`  Total:        ${chalk.yellow(allOrphans.length)}`);
  
  if (orphans.length > 0) {
    console.log(chalk.bold('\nTop 10 Published Orphans:'));
    console.log(chalk.gray('─'.repeat(40)));
    
    for (const orphan of orphans.slice(0, 10)) {
      console.log(`  - ${chalk.yellow(orphan.title_en)} (${orphan.slug})`);
    }
    
    if (orphans.length > 10) {
      console.log(chalk.gray(`  ... and ${orphans.length - 10} more`));
    }
    
    console.log(chalk.yellow(`\n⚠️  ${orphans.length} published movies need TMDB resolution`));
    console.log(chalk.gray('Run: pnpm orphan:resolve'));
  } else {
    console.log(chalk.green('\n✅ No orphan movies found'));
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              ORPHAN MOVIE RESOLUTION                          ║
║       Resolve movies missing TMDB data                        ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.status) {
    await showStatus();
    return;
  }

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  console.log(chalk.gray('Searching for orphan movies (no TMDB ID)...\n'));

  const result = await resolveAllOrphans({
    dryRun: args.dryRun,
    limit: args.limit,
    verbose: args.verbose,
  });

  // Summary
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 RESOLUTION SUMMARY'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Total Orphans:    ${result.total}`);
  console.log(`  Merged:           ${chalk.green(result.merged)}`);
  console.log(`  Enriched:         ${chalk.blue(result.enriched)}`);
  console.log(`  Unresolved:       ${chalk.yellow(result.unresolved)}`);
  console.log(`  Duration:         ${(result.duration / 1000).toFixed(1)}s`);

  if (result.errors.length > 0) {
    console.log(chalk.bold('\nErrors:'));
    for (const error of result.errors.slice(0, 5)) {
      console.log(chalk.red(`  - ${error}`));
    }
    if (result.errors.length > 5) {
      console.log(chalk.gray(`  ... and ${result.errors.length - 5} more`));
    }
  }

  if (result.unresolved > 0) {
    console.log(chalk.yellow(`\n⚠️  ${result.unresolved} movies could not be matched on TMDB`));
    console.log(chalk.gray('   These may need manual resolution or different titles'));
  }

  console.log(chalk.green('\n✅ Orphan resolution complete\n'));
}

main().catch(console.error);

