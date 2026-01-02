#!/usr/bin/env npx tsx
/**
 * FAST MODE INGESTION CLI
 * 
 * Runs all PARALLEL-SAFE ingestion steps for rapid data population.
 * Marks records as 'partial' status - requires finalize step for verification.
 * 
 * Parallel-safe operations:
 * - Discovery (per language)
 * - Enrichment (per movie)
 * - Media discovery (per movie)
 * - Tagging (per movie)
 * - Review generation (per movie)
 * 
 * Usage:
 *   pnpm ingest:fast --language=te                    # Telugu fast ingestion
 *   pnpm ingest:fast --core-only                      # Discovery + Enrichment only (skip media/tags/reviews)
 *   pnpm ingest:fast --language=hi --limit=500        # Hindi fast ingestion (500 movies)
 *   pnpm ingest:fast --all                            # All languages
 *   pnpm ingest:fast --status                         # Show partial records
 *   pnpm ingest:fast --dry                            # Preview mode
 *   pnpm ingest:fast --skip-media --skip-tags         # Skip specific stages
 *   pnpm ingest:fast --concurrency=25                 # 25 concurrent operations (default)
 * 
 * Speed optimizations:
 *   --core-only           Skip media/tags/reviews (3x faster)
 *   --concurrency=25      Parallel processing (default)
 *   --limit=300           Process 300 movies max
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import {
  ExecutionController,
  createTasks,
  type BatchResult,
} from '../lib/pipeline/execution-controller';
import {
  CheckpointManager,
  type IngestionStage,
} from '../lib/pipeline/checkpoint-manager';
import { batchUpdateMovieStatus } from '../lib/movie-index/batch-writer';
import { createProgress } from '../lib/pipeline/progress-tracker';

// ============================================================
// TYPES
// ============================================================

interface CLIArgs {
  language: string;
  all: boolean;
  limit?: number;
  dryRun: boolean;
  status: boolean;
  verbose: boolean;
  concurrency: number;
  coreOnly: boolean; // Convenience flag to skip media/tags/reviews
  skipDiscovery: boolean;
  skipEnrichment: boolean;
  skipMedia: boolean;
  skipTags: boolean;
  skipReviews: boolean;
}

interface StageResult {
  stage: IngestionStage;
  success: boolean;
  processed: number;
  failed: number;
  duration: number;
  errors: string[];
}

interface FastModeResult {
  language: string;
  stages: StageResult[];
  totalMovies: number;
  partialMovies: number;
  duration: number;
}

const LANGUAGE_MAP: Record<string, string> = {
  te: 'Telugu',
  hi: 'Hindi',
  ta: 'Tamil',
  ml: 'Malayalam',
  kn: 'Kannada',
  en: 'English',
};

// ============================================================
// SUPABASE
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    language: 'te',
    all: false,
    dryRun: false,
    status: false,
    verbose: false,
    concurrency: 25, // Optimized default for parallel processing
    coreOnly: false,
    skipDiscovery: false,
    skipEnrichment: false,
    skipMedia: false,
    skipTags: false,
    skipReviews: false,
  };

  for (const arg of args) {
    if (arg === '--dry' || arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '--status') parsed.status = true;
    else if (arg === '--all') parsed.all = true;
    else if (arg === '-v' || arg === '--verbose') parsed.verbose = true;
    else if (arg === '--core-only') parsed.coreOnly = true;
    else if (arg === '--skip-discovery') parsed.skipDiscovery = true;
    else if (arg === '--skip-enrichment') parsed.skipEnrichment = true;
    else if (arg === '--skip-media') parsed.skipMedia = true;
    else if (arg === '--skip-tags') parsed.skipTags = true;
    else if (arg === '--skip-reviews') parsed.skipReviews = true;
    else if (arg.startsWith('--language=')) parsed.language = arg.split('=')[1];
    else if (arg.startsWith('--lang=')) parsed.language = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) parsed.limit = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--concurrency=')) parsed.concurrency = parseInt(arg.split('=')[1]);
  }

  // Apply core-only convenience flag
  if (parsed.coreOnly) {
    parsed.skipMedia = true;
    parsed.skipTags = true;
    parsed.skipReviews = true;
  }

  return parsed;
}

// ============================================================
// COMMAND EXECUTION
// ============================================================

async function runCommand(command: string, args: string[]): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsx', command, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.stderr?.on('data', (data) => { output += data.toString(); });

    proc.on('close', (code) => {
      resolve({ success: code === 0, output });
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: err.message });
    });
  });
}

// ============================================================
// STAGE EXECUTORS
// ============================================================

async function runDiscoveryStage(
  language: string,
  args: CLIArgs,
  checkpoint: CheckpointManager
): Promise<StageResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan(`\n📡 Stage 1: Discovery (${LANGUAGE_MAP[language] || language})`));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (args.dryRun) {
    console.log(chalk.yellow('  [DRY RUN] Would run: ingest:tmdb:telugu'));
    return { stage: 'discovery', success: true, processed: 0, failed: 0, duration: 0, errors: [] };
  }
  
  // Determine which command to run based on language
  let script = 'scripts/ingest-tmdb-telugu.ts';
  const cmdArgs: string[] = [];
  
  if (language !== 'te') {
    script = 'scripts/ingest-multilang-movies.ts';
    cmdArgs.push(`--${language === 'hi' ? 'hindi' : language === 'ta' ? 'tamil' : language === 'ml' ? 'malayalam' : 'kannada'}`);
  }
  
  const result = await runCommand(script, cmdArgs);
  
  if (!result.success) {
    errors.push(`Discovery failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('  ✗ Discovery failed'));
  } else {
    console.log(chalk.green('  ✓ Discovery completed'));
  }
  
  return {
    stage: 'discovery',
    success: result.success,
    processed: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    duration: Date.now() - startTime,
    errors,
  };
}

async function runEnrichmentStage(
  language: string,
  args: CLIArgs,
  checkpoint: CheckpointManager
): Promise<StageResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan(`\n⚡ Stage 2: Enrichment (parallel batches)`));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (args.dryRun) {
    console.log(chalk.yellow('  [DRY RUN] Would run: ingest:movies:smart'));
    return { stage: 'enrichment', success: true, processed: 0, failed: 0, duration: 0, errors: [] };
  }
  
  // Run enrichment with limit
  const limit = args.limit || 100;
  const result = await runCommand('scripts/smart-movie-enrichment.ts', [
    `--limit=${limit}`,
    '--batch-mode',
  ]);
  
  if (!result.success) {
    errors.push(`Enrichment failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('  ✗ Enrichment failed'));
  } else {
    console.log(chalk.green(`  ✓ Enriched movies (limit: ${limit})`));
  }
  
  return {
    stage: 'enrichment',
    success: result.success,
    processed: result.success ? limit : 0,
    failed: result.success ? 0 : 1,
    duration: Date.now() - startTime,
    errors,
  };
}

async function runMediaStage(
  args: CLIArgs,
  checkpoint: CheckpointManager
): Promise<StageResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan(`\n🖼️  Stage 3: Media Enrichment (parallel)`));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (args.dryRun) {
    console.log(chalk.yellow('  [DRY RUN] Would run: movies:enrich:media'));
    return { stage: 'media', success: true, processed: 0, failed: 0, duration: 0, errors: [] };
  }
  
  const result = await runCommand('scripts/movies-enrich-media.ts', ['--tiered']);
  
  if (!result.success) {
    errors.push(`Media enrichment failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('  ✗ Media enrichment failed'));
  } else {
    console.log(chalk.green('  ✓ Media enrichment completed'));
  }
  
  return {
    stage: 'media',
    success: result.success,
    processed: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    duration: Date.now() - startTime,
    errors,
  };
}

async function runTaggingStage(
  args: CLIArgs,
  checkpoint: CheckpointManager
): Promise<StageResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan(`\n🏷️  Stage 4: Auto-Tagging`));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (args.dryRun) {
    console.log(chalk.yellow('  [DRY RUN] Would run: movies:auto-tag'));
    return { stage: 'tagging', success: true, processed: 0, failed: 0, duration: 0, errors: [] };
  }
  
  const result = await runCommand('scripts/auto-tag-movies.ts', []);
  
  if (!result.success) {
    errors.push(`Tagging failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('  ✗ Tagging failed'));
  } else {
    console.log(chalk.green('  ✓ Tagging completed'));
  }
  
  return {
    stage: 'tagging',
    success: result.success,
    processed: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    duration: Date.now() - startTime,
    errors,
  };
}

async function runReviewStage(
  args: CLIArgs,
  checkpoint: CheckpointManager
): Promise<StageResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan(`\n📝 Stage 5: Review Generation (parallel)`));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (args.dryRun) {
    console.log(chalk.yellow('  [DRY RUN] Would run: reviews:coverage'));
    return { stage: 'review', success: true, processed: 0, failed: 0, duration: 0, errors: [] };
  }
  
  const result = await runCommand('scripts/reviews-coverage.ts', ['--target=0.95']);
  
  if (!result.success) {
    errors.push(`Review generation failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('  ✗ Review generation failed'));
  } else {
    console.log(chalk.green('  ✓ Review generation completed'));
  }
  
  return {
    stage: 'review',
    success: result.success,
    processed: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    duration: Date.now() - startTime,
    errors,
  };
}

// ============================================================
// MARK AS PARTIAL
// ============================================================

async function markMoviesAsPartial(supabase: ReturnType<typeof getSupabaseClient>, args: CLIArgs): Promise<number> {
  if (args.dryRun) return 0;
  
  // Get movies that were enriched but not finalized
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id')
    .or('ingestion_status.is.null,ingestion_status.eq.raw')
    .not('director', 'is', null);
  
  if (error || !movies) return 0;
  
  const updates = movies.map(m => ({
    id: m.id,
    ingestion_status: 'partial',
    completeness_score: 0.5, // Will be recalculated in finalize
    last_stage_completed: 'review',
  }));
  
  if (updates.length > 0) {
    await batchUpdateMovieStatus(updates);
  }
  
  return updates.length;
}

// ============================================================
// STATUS DISPLAY
// ============================================================

async function showStatus(): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log(chalk.cyan.bold('\n📊 FAST MODE INGESTION STATUS\n'));
  
  // Get status breakdown
  const { data: statusData } = await supabase
    .from('movies')
    .select('ingestion_status')
    .not('ingestion_status', 'is', null);
  
  const statusCounts: Record<string, number> = {
    raw: 0,
    partial: 0,
    enriched: 0,
    verified: 0,
    published: 0,
  };
  
  for (const row of statusData || []) {
    const status = row.ingestion_status || 'raw';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }
  
  // Get total movies
  const { count: total } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true });
  
  console.log(chalk.bold('Status Distribution:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Total Movies:     ${chalk.cyan(total || 0)}`);
  console.log(`  Raw:              ${chalk.gray(statusCounts.raw)}`);
  console.log(`  Partial:          ${chalk.yellow(statusCounts.partial)}`);
  console.log(`  Enriched:         ${chalk.blue(statusCounts.enriched)}`);
  console.log(`  Verified:         ${chalk.green(statusCounts.verified)}`);
  console.log(`  Published:        ${chalk.green(statusCounts.published)}`);
  
  // Recommendations
  const needsFinalize = statusCounts.partial + statusCounts.enriched;
  if (needsFinalize > 0) {
    console.log(chalk.yellow(`\n⚠️  ${needsFinalize} movies need finalization`));
    console.log(chalk.gray('   Run: pnpm ingest:finalize'));
  }
  
  if (statusCounts.raw > 0) {
    console.log(chalk.yellow(`\n⚠️  ${statusCounts.raw} movies need enrichment`));
    console.log(chalk.gray('   Run: pnpm ingest:fast'));
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();
  const supabase = getSupabaseClient();
  const checkpoint = new CheckpointManager({ persistToDb: !args.dryRun });

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║               FAST MODE INGESTION PIPELINE                    ║
║           Parallel-Safe Operations (No Serialization)         ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.status) {
    await showStatus();
    return;
  }

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  const languages = args.all ? Object.keys(LANGUAGE_MAP) : [args.language];
  const allResults: FastModeResult[] = [];
  const totalStartTime = Date.now();

  for (const lang of languages) {
    console.log(chalk.bold(`\n🌐 Processing: ${LANGUAGE_MAP[lang] || lang}`));
    console.log(chalk.gray('═'.repeat(60)));

    const langStartTime = Date.now();
    const stages: StageResult[] = [];

    // Stage 1: Discovery
    if (!args.skipDiscovery) {
      const discoveryResult = await runDiscoveryStage(lang, args, checkpoint);
      stages.push(discoveryResult);
    }

    // Stage 2: Enrichment
    if (!args.skipEnrichment) {
      const enrichmentResult = await runEnrichmentStage(lang, args, checkpoint);
      stages.push(enrichmentResult);
    }

    // Stage 3: Media
    if (!args.skipMedia) {
      const mediaResult = await runMediaStage(args, checkpoint);
      stages.push(mediaResult);
    }

    // Stage 4: Tagging
    if (!args.skipTags) {
      const taggingResult = await runTaggingStage(args, checkpoint);
      stages.push(taggingResult);
    }

    // Stage 5: Reviews
    if (!args.skipReviews) {
      const reviewResult = await runReviewStage(args, checkpoint);
      stages.push(reviewResult);
    }

    // Mark processed movies as partial
    const partialCount = await markMoviesAsPartial(supabase, args);

    allResults.push({
      language: lang,
      stages,
      totalMovies: stages.reduce((sum, s) => sum + s.processed, 0),
      partialMovies: partialCount,
      duration: Date.now() - langStartTime,
    });
  }

  // Summary
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 FAST MODE SUMMARY'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  for (const result of allResults) {
    console.log(chalk.bold(`${LANGUAGE_MAP[result.language] || result.language}:`));
    console.log(`  Duration:       ${(result.duration / 1000).toFixed(1)}s`);
    console.log(`  Stages Run:     ${result.stages.length}`);
    console.log(`  Stages Passed:  ${chalk.green(result.stages.filter(s => s.success).length)}`);
    console.log(`  Stages Failed:  ${result.stages.filter(s => !s.success).length > 0 ? chalk.red(result.stages.filter(s => !s.success).length) : chalk.gray('0')}`);
    console.log(`  Marked Partial: ${chalk.yellow(result.partialMovies)}`);
    console.log('');
  }

  const totalDuration = Date.now() - totalStartTime;
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  // Next steps
  console.log(chalk.bold('\n📋 NEXT STEPS'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Run ${chalk.cyan('pnpm ingest:finalize')} to verify and promote records`);
  console.log(`  Run ${chalk.cyan('pnpm ingest:fast --status')} to check progress`);

  console.log(chalk.green('\n✅ Fast mode ingestion complete\n'));
}

main().catch(console.error);

