#!/usr/bin/env npx tsx
/**
 * Optimized Pipeline Runner
 * 
 * Orchestrates the optimized ingestion pipeline with speed-first approach.
 * 
 * Pipeline stages:
 * 1. TMDB Discovery (chunked by decade)
 * 2. Parallel Validation (50 movies per batch)
 * 3. Core Enrichment (skip media/reviews/tags)
 * 4. Batch Parallel Enrichment (25 concurrent)
 * 
 * Usage:
 *   pnpm pipeline:optimized                    # Run full optimized pipeline
 *   pnpm pipeline:optimized --dry              # Preview mode
 *   pnpm pipeline:optimized --skip-discovery   # Skip discovery stage
 *   pnpm pipeline:optimized --skip-validation  # Skip validation stage
 * 
 * Expected performance:
 *   - 300 movies enriched in ~2-3 minutes
 *   - 500 movies validated in ~1 minute
 *   - Chunked discovery: ~60s per decade
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface CLIArgs {
  dryRun: boolean;
  skipDiscovery: boolean;
  skipValidation: boolean;
  skipEnrichment: boolean;
  verbose: boolean;
  limit: number;
}

interface StageResult {
  stage: string;
  success: boolean;
  duration: number;
  output: string;
}

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
  return {
    dryRun: args.includes('--dry') || args.includes('--dry-run'),
    skipDiscovery: args.includes('--skip-discovery'),
    skipValidation: args.includes('--skip-validation'),
    skipEnrichment: args.includes('--skip-enrichment'),
    verbose: args.includes('-v') || args.includes('--verbose'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : 300,
  };
}

// ============================================================
// COMMAND EXECUTION
// ============================================================

async function runCommand(command: string, args: string[]): Promise<StageResult> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsx', command, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit', // Show output in real-time
    });

    let output = '';

    proc.on('close', (code) => {
      resolve({
        stage: command,
        success: code === 0,
        duration: Date.now() - startTime,
        output,
      });
    });

    proc.on('error', (err) => {
      resolve({
        stage: command,
        success: false,
        duration: Date.now() - startTime,
        output: err.message,
      });
    });
  });
}

// ============================================================
// PIPELINE STATS
// ============================================================

async function getPipelineStats(): Promise<{
  totalMovies: number;
  teluguMovies: number;
  validInIndex: number;
  pendingInIndex: number;
}> {
  const supabase = getSupabaseClient();

  const [
    { count: totalMovies },
    { count: teluguMovies },
    { count: validInIndex },
    { count: pendingInIndex },
  ] = await Promise.all([
    supabase.from('movies').select('id', { count: 'exact', head: true }),
    supabase.from('movies').select('id', { count: 'exact', head: true }).eq('language', 'te'),
    supabase.from('telugu_movie_index').select('id', { count: 'exact', head: true }).eq('status', 'VALID'),
    supabase.from('telugu_movie_index').select('id', { count: 'exact', head: true }).or('status.eq.PENDING,status.is.null'),
  ]);

  return {
    totalMovies: totalMovies || 0,
    teluguMovies: teluguMovies || 0,
    validInIndex: validInIndex || 0,
    pendingInIndex: pendingInIndex || 0,
  };
}

// ============================================================
// MAIN PIPELINE
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║           OPTIMIZED INGESTION PIPELINE                        ║
║           Speed-First Approach (5min target)                  ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  // Show initial stats
  console.log(chalk.cyan('📊 Initial Statistics'));
  console.log(chalk.gray('─'.repeat(50)));
  const initialStats = await getPipelineStats();
  console.log(`  Total Movies:        ${chalk.cyan(initialStats.totalMovies)}`);
  console.log(`  Telugu Movies:       ${chalk.cyan(initialStats.teluguMovies)}`);
  console.log(`  Valid in Index:      ${chalk.green(initialStats.validInIndex)}`);
  console.log(`  Pending Validation:  ${chalk.yellow(initialStats.pendingInIndex)}`);
  console.log('');

  const pipelineStartTime = Date.now();
  const results: StageResult[] = [];

  // Stage 1: Validation (if needed)
  if (!args.skipValidation && initialStats.pendingInIndex > 0) {
    console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold.cyan('STAGE 1: PARALLEL VALIDATION'));
    console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const validationArgs = ['--parallel', '--batch-size=50', `--limit=${Math.min(500, initialStats.pendingInIndex)}`];
    if (args.dryRun) validationArgs.push('--dry');
    if (args.verbose) validationArgs.push('-v');

    const validationResult = await runCommand('scripts/validate-movies.ts', validationArgs);
    results.push(validationResult);

    if (!validationResult.success) {
      console.log(chalk.red('\n❌ Validation stage failed. Pipeline aborted.'));
      process.exit(1);
    }
  }

  // Stage 2: Core Enrichment
  if (!args.skipEnrichment) {
    console.log(chalk.bold.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold.cyan('STAGE 2: BATCH ENRICHMENT (CORE DATA)'));
    console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const enrichmentArgs = ['--batch', '--concurrency=25', `--limit=${args.limit}`];
    if (args.dryRun) enrichmentArgs.push('--dry');
    if (args.verbose) enrichmentArgs.push('-v');

    const enrichmentResult = await runCommand('scripts/smart-movie-enrichment.ts', enrichmentArgs);
    results.push(enrichmentResult);

    if (!enrichmentResult.success) {
      console.log(chalk.yellow('\n⚠️ Enrichment stage failed, but continuing...'));
    }
  }

  // Show final stats
  const pipelineDuration = Date.now() - pipelineStartTime;

  console.log(chalk.cyan.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('📊 FINAL STATISTICS'));
  console.log(chalk.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const finalStats = await getPipelineStats();
  console.log(`  Total Movies:        ${chalk.cyan(finalStats.totalMovies)} (${chalk.green(`+${finalStats.totalMovies - initialStats.totalMovies}`)})`);
  console.log(`  Telugu Movies:       ${chalk.cyan(finalStats.teluguMovies)} (${chalk.green(`+${finalStats.teluguMovies - initialStats.teluguMovies}`)})`);
  console.log(`  Valid in Index:      ${chalk.green(finalStats.validInIndex)} (${chalk.green(`+${finalStats.validInIndex - initialStats.validInIndex}`)})`);
  console.log(`  Pending Validation:  ${chalk.yellow(finalStats.pendingInIndex)}`);

  console.log(chalk.cyan.bold('\n📋 PIPELINE SUMMARY'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Stages Run:     ${results.length}`);
  console.log(`  Stages Passed:  ${chalk.green(results.filter(r => r.success).length)}`);
  console.log(`  Stages Failed:  ${results.filter(r => !r.success).length > 0 ? chalk.red(results.filter(r => !r.success).length) : chalk.gray('0')}`);
  console.log(`  Total Duration: ${chalk.cyan((pipelineDuration / 1000).toFixed(1))}s`);

  // Stage-by-stage timing
  console.log(chalk.cyan.bold('\n⏱️  STAGE TIMING'));
  console.log(chalk.gray('─'.repeat(50)));
  for (const result of results) {
    const stageName = result.stage.split('/').pop()?.replace('.ts', '') || result.stage;
    const status = result.success ? chalk.green('✓') : chalk.red('✗');
    const duration = (result.duration / 1000).toFixed(1);
    console.log(`  ${status} ${stageName.padEnd(30)} ${chalk.cyan(duration)}s`);
  }

  console.log(chalk.bold('\n📋 NEXT STEPS'));
  console.log(chalk.gray('─'.repeat(50)));
  
  if (finalStats.pendingInIndex > 0) {
    console.log(`  ${chalk.cyan('pnpm validate:parallel')} - Validate ${finalStats.pendingInIndex} pending movies`);
  }
  
  const gap = finalStats.validInIndex - finalStats.teluguMovies;
  if (gap > 0) {
    console.log(`  ${chalk.cyan('pnpm enrich:batch')} - Enrich ${gap} validated movies`);
  }
  
  console.log(`  ${chalk.cyan('pnpm movies:enrich:media')} - Add missing posters/backdrops`);
  console.log(`  ${chalk.cyan('pnpm reviews:coverage')} - Generate reviews`);

  console.log(chalk.green('\n✅ Optimized pipeline complete\n'));
}

main().catch(console.error);

