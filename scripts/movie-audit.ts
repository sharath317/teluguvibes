#!/usr/bin/env npx tsx
/**
 * Movie Audit CLI
 * 
 * Audits and hardens the movie database.
 * 
 * Usage:
 *   pnpm intel:movie-audit                    # Status report only
 *   pnpm intel:movie-audit --fix              # Fix issues automatically
 *   pnpm intel:movie-audit --purge-invalid    # Remove invalid entries
 *   pnpm intel:movie-audit --fix --purge-invalid --strict
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import chalk from 'chalk';
import {
  runFullAudit,
  getAuditStats,
  detectDuplicates,
  purgeInvalidMovies,
  EntityStatus,
} from '../lib/movie-validation';

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

const args = process.argv.slice(2);
const flags = {
  fix: args.includes('--fix'),
  purgeInvalid: args.includes('--purge-invalid'),
  strict: args.includes('--strict'),
  status: args.includes('--status'),
  duplicates: args.includes('--duplicates'),
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || undefined,
};

// ============================================================
// DISPLAY FUNCTIONS
// ============================================================

function showHelp() {
  console.log(chalk.bold.blue('\n╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║               MOVIE AUDIT CLI                                  ║'));
  console.log(chalk.bold.blue('╚══════════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.cyan('Usage:'));
  console.log('  pnpm intel:movie-audit [options]\n');

  console.log(chalk.cyan('Options:'));
  console.log('  --status         Show audit statistics only (default)');
  console.log('  --fix            Fix issues automatically');
  console.log('  --purge-invalid  Remove invalid entries after audit');
  console.log('  --strict         Fail on warnings (stricter validation)');
  console.log('  --duplicates     Show duplicate movies');
  console.log('  --limit=N        Limit movies to audit');
  console.log('  --verbose, -v    Show detailed output');
  console.log('  --help, -h       Show this help\n');

  console.log(chalk.cyan('Examples:'));
  console.log('  pnpm intel:movie-audit --status');
  console.log('  pnpm intel:movie-audit --fix');
  console.log('  pnpm intel:movie-audit --fix --purge-invalid --strict');
  console.log('  pnpm intel:movie-audit --duplicates\n');
}

function showHeader() {
  console.log(chalk.bold.blue('\n╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('║               MOVIE DATABASE AUDIT                             ║'));
  console.log(chalk.bold.blue('╚══════════════════════════════════════════════════════════════╝\n'));
}

function formatStatus(status: EntityStatus): string {
  const colors: Record<EntityStatus, typeof chalk.red> = {
    'VALID': chalk.green,
    'PENDING_VALIDATION': chalk.yellow,
    'INVALID_NOT_MOVIE': chalk.red,
    'INVALID_NOT_TELUGU': chalk.red,
    'INVALID_NO_TMDB_MATCH': chalk.yellow,
    'INVALID_DUPLICATE': chalk.magenta,
    'INVALID_MISSING_DATA': chalk.red,
    'INVALID_CAST_CREW': chalk.red,
    'INVALID_NO_IMAGE': chalk.yellow,
    'INVALID_FUTURE_RELEASE': chalk.cyan,
  };
  return (colors[status] || chalk.gray)(status);
}

// ============================================================
// MAIN FUNCTIONS
// ============================================================

async function showStatus() {
  console.log(chalk.cyan('📊 Fetching audit statistics...\n'));

  try {
    const stats = await getAuditStats();

    console.log(chalk.bold('OVERVIEW'));
    console.log('━'.repeat(60));
    console.log(`  Total Movies: ${chalk.bold(stats.total)}`);
    console.log(`  With TMDB ID: ${chalk.green(stats.withTmdb)} (${((stats.withTmdb / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  Without TMDB: ${chalk.yellow(stats.withoutTmdb)}`);
    console.log(`  With Poster:  ${chalk.green(stats.withPoster)} (${((stats.withPoster / stats.total) * 100).toFixed(1)}%)`);
    console.log(`  Without Poster: ${chalk.yellow(stats.withoutPoster)}`);
    console.log(`  Duplicates:   ${stats.duplicateCount > 0 ? chalk.red(stats.duplicateCount) : chalk.green('0')}`);
    console.log();

    console.log(chalk.bold('BY VALIDATION STATUS'));
    console.log('━'.repeat(60));
    for (const [status, count] of Object.entries(stats.byStatus)) {
      console.log(`  ${formatStatus(status as EntityStatus)}: ${count}`);
    }
    console.log();

    console.log(chalk.bold('BY RELEASE YEAR (Top 10)'));
    console.log('━'.repeat(60));
    for (const { year, count } of stats.byYear.slice(0, 10)) {
      const bar = '█'.repeat(Math.min(40, Math.round((count / stats.total) * 100)));
      console.log(`  ${year}: ${chalk.cyan(bar)} ${count}`);
    }
    console.log();

    // Data quality score
    const qualityScore = (
      (stats.withTmdb / stats.total) * 0.3 +
      (stats.withPoster / stats.total) * 0.3 +
      ((stats.total - stats.duplicateCount) / stats.total) * 0.2 +
      ((stats.byStatus['VALID'] || 0) / stats.total) * 0.2
    ) * 100;

    console.log(chalk.bold('DATA QUALITY SCORE'));
    console.log('━'.repeat(60));
    const scoreColor = qualityScore >= 80 ? chalk.green : qualityScore >= 60 ? chalk.yellow : chalk.red;
    console.log(`  ${scoreColor(`${qualityScore.toFixed(1)}%`)}`);
    console.log();

  } catch (error: any) {
    console.error(chalk.red('Error fetching stats:'), error.message);
    process.exit(1);
  }
}

async function showDuplicates() {
  console.log(chalk.cyan('🔍 Detecting duplicates...\n'));

  try {
    const { duplicates, count } = await detectDuplicates();

    if (count === 0) {
      console.log(chalk.green('✅ No duplicates found!'));
      return;
    }

    console.log(chalk.yellow(`⚠️  Found ${count} duplicate groups:\n`));

    for (const dup of duplicates.slice(0, 20)) {
      console.log(chalk.bold(`  ${dup.canonical_title} (${dup.year || 'unknown year'})`));
      for (const movie of dup.movies) {
        const tmdbBadge = movie.tmdb_id ? chalk.green(`TMDB:${movie.tmdb_id}`) : chalk.gray('no TMDB');
        console.log(`    - ${movie.title_en} [${movie.id.slice(0, 8)}...] ${tmdbBadge}`);
      }
      console.log();
    }

    if (count > 20) {
      console.log(chalk.gray(`  ... and ${count - 20} more duplicate groups`));
    }

  } catch (error: any) {
    console.error(chalk.red('Error detecting duplicates:'), error.message);
    process.exit(1);
  }
}

async function runAudit() {
  const mode = flags.fix ? 'FIX MODE' : flags.purgeInvalid ? 'PURGE MODE' : 'AUDIT MODE';
  console.log(chalk.cyan(`🔍 Running audit in ${mode}...\n`));

  if (flags.fix) {
    console.log(chalk.yellow('⚠️  Fix mode enabled - will update database'));
  }
  if (flags.purgeInvalid) {
    console.log(chalk.red('⚠️  Purge mode enabled - will DELETE invalid entries'));
  }
  if (flags.strict) {
    console.log(chalk.magenta('🔒 Strict mode enabled - warnings treated as errors'));
  }
  console.log();

  try {
    const summary = await runFullAudit({
      fix: flags.fix,
      purgeInvalid: flags.purgeInvalid,
      strict: flags.strict,
      limit: flags.limit,
    });

    console.log(chalk.bold('\n═══════════════════════════════════════════════════════════'));
    console.log(chalk.bold('                    AUDIT SUMMARY                           '));
    console.log(chalk.bold('═══════════════════════════════════════════════════════════\n'));

    console.log(`  Total Audited: ${summary.totalAudited}`);
    console.log(`  Valid:         ${chalk.green(summary.valid)}`);
    console.log(`  Invalid:       ${chalk.red(summary.invalid)}`);
    if (flags.fix) {
      console.log(`  Fixes Applied: ${chalk.blue(summary.fixed)}`);
    }
    if (flags.purgeInvalid) {
      console.log(`  Purged:        ${chalk.red(summary.purged)}`);
    }
    console.log();

    console.log(chalk.bold('BY STATUS'));
    console.log('━'.repeat(50));
    for (const [status, count] of Object.entries(summary.byStatus)) {
      console.log(`  ${formatStatus(status as EntityStatus)}: ${count}`);
    }
    console.log();

    if (summary.topIssues.length > 0) {
      console.log(chalk.bold('TOP ISSUES'));
      console.log('━'.repeat(50));
      for (const issue of summary.topIssues) {
        console.log(`  ${issue.code}: ${issue.count}`);
      }
      console.log();
    }

    // Exit code based on results
    if (summary.invalid > 0 && !flags.fix && !flags.purgeInvalid) {
      console.log(chalk.yellow('⚠️  Invalid movies found. Run with --fix to repair or --purge-invalid to remove.\n'));
      process.exit(1);
    }

    console.log(chalk.green('✅ Audit complete.\n'));

  } catch (error: any) {
    console.error(chalk.red('Error running audit:'), error.message);
    process.exit(1);
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  showHeader();

  // Check for required env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Missing Supabase credentials.'));
    console.error(chalk.gray('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'));
    process.exit(1);
  }

  if (!process.env.TMDB_API_KEY) {
    console.warn(chalk.yellow('⚠️  TMDB_API_KEY not set. TMDB validation will be limited.\n'));
  }

  if (flags.duplicates) {
    await showDuplicates();
  } else if (flags.fix || flags.purgeInvalid) {
    await runAudit();
  } else {
    // Default: show status
    await showStatus();
  }
}

main().catch(err => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});






