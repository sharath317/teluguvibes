#!/usr/bin/env npx tsx
/**
 * ACCELERATED INGESTION PIPELINE
 * 
 * Full orchestrator that runs both FAST and FINALIZE phases in sequence.
 * Provides 5-10x faster ingestion while maintaining data integrity.
 * 
 * Flow:
 * 1. PARALLEL PHASE (fast mode)
 *    - Discovery → Enrichment → Media → Tags → Reviews
 * 2. SERIAL PHASE (finalize mode)  
 *    - Normalize → Dedupe → Audit → Score → Promote
 * 3. OUTPUT
 *    - Coverage metrics and failure summary
 * 
 * Usage:
 *   pnpm ingest:accelerated --language=te    # Full Telugu pipeline
 *   pnpm ingest:accelerated --all            # All languages
 *   pnpm ingest:accelerated --resume         # Resume from checkpoint
 *   pnpm ingest:accelerated --dry            # Preview mode
 *   pnpm ingest:accelerated --status         # Show pipeline status
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { CheckpointManager } from '../lib/pipeline/checkpoint-manager';

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
  resume: boolean;
  resumeFrom?: string;
  skipFast: boolean;
  skipFinalize: boolean;
  concurrency: number;
}

interface PhaseResult {
  phase: 'fast' | 'finalize';
  success: boolean;
  duration: number;
  output: string;
}

interface PipelineResult {
  language: string;
  phases: PhaseResult[];
  totalDuration: number;
  moviesProcessed: number;
  moviesVerified: number;
  errors: string[];
}

interface CoverageMetrics {
  total: number;
  verified: number;
  partial: number;
  raw: number;
  coveragePercent: number;
  avgCompleteness: number;
}

const LANGUAGE_MAP: Record<string, string> = {
  te: 'Telugu',
  hi: 'Hindi',
  ta: 'Tamil',
  ml: 'Malayalam',
  kn: 'Kannada',
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
    resume: false,
    skipFast: false,
    skipFinalize: false,
    concurrency: 5,
  };

  for (const arg of args) {
    if (arg === '--dry' || arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '--status') parsed.status = true;
    else if (arg === '--all') parsed.all = true;
    else if (arg === '-v' || arg === '--verbose') parsed.verbose = true;
    else if (arg === '--resume') parsed.resume = true;
    else if (arg === '--skip-fast') parsed.skipFast = true;
    else if (arg === '--skip-finalize') parsed.skipFinalize = true;
    else if (arg.startsWith('--language=')) parsed.language = arg.split('=')[1];
    else if (arg.startsWith('--lang=')) parsed.language = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) parsed.limit = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--concurrency=')) parsed.concurrency = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--resume-from=')) parsed.resumeFrom = arg.split('=')[1];
  }

  return parsed;
}

// ============================================================
// COMMAND EXECUTION
// ============================================================

async function runCommand(
  command: string, 
  args: string[],
  options: { verbose?: boolean } = {}
): Promise<{ success: boolean; output: string; duration: number }> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsx', command, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: options.verbose ? 'inherit' : ['inherit', 'pipe', 'pipe'],
    });

    let output = '';
    if (!options.verbose) {
      proc.stdout?.on('data', (data) => { output += data.toString(); });
      proc.stderr?.on('data', (data) => { output += data.toString(); });
    }

    proc.on('close', (code) => {
      resolve({ 
        success: code === 0, 
        output,
        duration: Date.now() - startTime,
      });
    });

    proc.on('error', (err) => {
      resolve({ 
        success: false, 
        output: err.message,
        duration: Date.now() - startTime,
      });
    });
  });
}

// ============================================================
// PHASE EXECUTION
// ============================================================

async function runFastPhase(args: CLIArgs): Promise<PhaseResult> {
  console.log(chalk.cyan.bold('\n┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan.bold('│                    PARALLEL PHASE (FAST)                     │'));
  console.log(chalk.cyan.bold('└─────────────────────────────────────────────────────────────┘'));
  
  const fastArgs: string[] = [`--language=${args.language}`];
  if (args.dryRun) fastArgs.push('--dry');
  if (args.limit) fastArgs.push(`--limit=${args.limit}`);
  if (args.verbose) fastArgs.push('--verbose');
  if (args.concurrency) fastArgs.push(`--concurrency=${args.concurrency}`);
  
  console.log(chalk.gray(`\n  Running: pnpm ingest:fast ${fastArgs.join(' ')}\n`));
  
  const result = await runCommand('scripts/ingest-fast.ts', fastArgs, { verbose: args.verbose });
  
  if (result.success) {
    console.log(chalk.green('\n  ✓ Parallel phase completed'));
  } else {
    console.log(chalk.red('\n  ✗ Parallel phase failed'));
    if (!args.verbose && result.output) {
      console.log(chalk.gray(result.output.slice(-500)));
    }
  }
  
  return {
    phase: 'fast',
    success: result.success,
    duration: result.duration,
    output: result.output,
  };
}

async function runFinalizePhase(args: CLIArgs): Promise<PhaseResult> {
  console.log(chalk.cyan.bold('\n┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan.bold('│                   SERIAL PHASE (FINALIZE)                    │'));
  console.log(chalk.cyan.bold('└─────────────────────────────────────────────────────────────┘'));
  
  const finalizeArgs: string[] = [];
  if (args.dryRun) finalizeArgs.push('--dry');
  if (args.verbose) finalizeArgs.push('--verbose');
  if (args.language) finalizeArgs.push(`--language=${args.language}`);
  
  console.log(chalk.gray(`\n  Running: pnpm ingest:finalize ${finalizeArgs.join(' ')}\n`));
  
  const result = await runCommand('scripts/ingest-finalize.ts', finalizeArgs, { verbose: args.verbose });
  
  if (result.success) {
    console.log(chalk.green('\n  ✓ Serial phase completed'));
  } else {
    console.log(chalk.red('\n  ✗ Serial phase failed'));
    if (!args.verbose && result.output) {
      console.log(chalk.gray(result.output.slice(-500)));
    }
  }
  
  return {
    phase: 'finalize',
    success: result.success,
    duration: result.duration,
    output: result.output,
  };
}

// ============================================================
// METRICS & REPORTING
// ============================================================

async function getCoverageMetrics(): Promise<CoverageMetrics> {
  const supabase = getSupabaseClient();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('ingestion_status, completeness_score');
  
  const metrics: CoverageMetrics = {
    total: movies?.length || 0,
    verified: 0,
    partial: 0,
    raw: 0,
    coveragePercent: 0,
    avgCompleteness: 0,
  };
  
  let totalScore = 0;
  
  for (const movie of movies || []) {
    switch (movie.ingestion_status) {
      case 'verified':
      case 'published':
        metrics.verified++;
        break;
      case 'partial':
      case 'enriched':
        metrics.partial++;
        break;
      default:
        metrics.raw++;
    }
    
    if (movie.completeness_score) {
      totalScore += movie.completeness_score;
    }
  }
  
  if (metrics.total > 0) {
    metrics.coveragePercent = Math.round((metrics.verified / metrics.total) * 100 * 10) / 10;
    metrics.avgCompleteness = Math.round((totalScore / metrics.total) * 100 * 10) / 10;
  }
  
  return metrics;
}

async function showPipelineStatus(): Promise<void> {
  const metrics = await getCoverageMetrics();
  
  console.log(chalk.cyan.bold('\n📊 ACCELERATED PIPELINE STATUS\n'));
  
  // Coverage bar
  const barWidth = 40;
  const filledWidth = Math.round((metrics.verified / Math.max(metrics.total, 1)) * barWidth);
  const bar = chalk.green('█'.repeat(filledWidth)) + chalk.gray('░'.repeat(barWidth - filledWidth));
  
  console.log(chalk.bold('Coverage:'));
  console.log(`  [${bar}] ${metrics.coveragePercent}%`);
  console.log('');
  
  console.log(chalk.bold('Movie Distribution:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Total:    ${chalk.cyan(metrics.total)}`);
  console.log(`  Verified: ${chalk.green(metrics.verified)} (${metrics.coveragePercent}%)`);
  console.log(`  Partial:  ${chalk.yellow(metrics.partial)}`);
  console.log(`  Raw:      ${chalk.gray(metrics.raw)}`);
  console.log('');
  
  console.log(chalk.bold('Quality:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Avg Completeness: ${metrics.avgCompleteness}%`);
  console.log('');
  
  // Recommendations
  if (metrics.partial > 0 || metrics.raw > 0) {
    console.log(chalk.bold('Recommendations:'));
    console.log(chalk.gray('─'.repeat(40)));
    
    if (metrics.raw > 0) {
      console.log(chalk.yellow(`  • ${metrics.raw} movies need discovery/enrichment`));
      console.log(chalk.gray('    Run: pnpm ingest:accelerated'));
    }
    
    if (metrics.partial > 0) {
      console.log(chalk.yellow(`  • ${metrics.partial} movies need finalization`));
      console.log(chalk.gray('    Run: pnpm ingest:finalize'));
    }
  } else {
    console.log(chalk.green('  ✅ All movies are verified!'));
  }
}

function printPipelineDiagram(): void {
  console.log(chalk.gray(`
  ┌─────────────────────────────────────────────────────────────┐
  │                    ACCELERATED PIPELINE                      │
  ├─────────────────────────────────────────────────────────────┤
  │  PARALLEL PHASE (ingest:fast)                               │
  │  ├─ Discovery: ingest:tmdb:{lang} (1 call)                  │
  │  ├─ Enrichment: 5 parallel batches × 20 movies              │
  │  ├─ Media: 5 parallel batches × 20 movies                   │
  │  └─ Tags & Reviews: Parallel per movie                      │
  │                                                              │
  │  SERIAL PHASE (ingest:finalize)                             │
  │  ├─ Gate 1: intel:normalize:all                             │
  │  ├─ Gate 2: intel:entity-merge:auto                         │
  │  ├─ Gate 3: intel:movie-audit --fix                         │
  │  └─ Gate 4: Completeness scoring + promotion                │
  │                                                              │
  │  OUTPUT                                                      │
  │  └─ Coverage metrics + failure summary                       │
  └─────────────────────────────────────────────────────────────┘
`));
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║            ACCELERATED INGESTION PIPELINE                     ║
║         Fast Parallel + Serial Integrity Gates                ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.status) {
    await showPipelineStatus();
    return;
  }

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  printPipelineDiagram();

  const languages = args.all ? Object.keys(LANGUAGE_MAP) : [args.language];
  const allResults: PipelineResult[] = [];
  const totalStartTime = Date.now();

  // Get initial metrics
  const initialMetrics = await getCoverageMetrics();
  console.log(chalk.gray(`\nInitial state: ${initialMetrics.verified}/${initialMetrics.total} verified (${initialMetrics.coveragePercent}%)\n`));

  for (const lang of languages) {
    console.log(chalk.bold.cyan(`\n${'═'.repeat(60)}`));
    console.log(chalk.bold(`🌐 Processing: ${LANGUAGE_MAP[lang] || lang}`));
    console.log(chalk.bold.cyan(`${'═'.repeat(60)}`));

    const langStartTime = Date.now();
    const phases: PhaseResult[] = [];
    const errors: string[] = [];

    // Phase 1: Fast (Parallel)
    if (!args.skipFast) {
      const langArgs = { ...args, language: lang };
      const fastResult = await runFastPhase(langArgs);
      phases.push(fastResult);
      
      if (!fastResult.success) {
        errors.push(`Fast phase failed for ${lang}`);
        if (!args.dryRun) {
          console.log(chalk.yellow('\n⚠️  Fast phase failed, but continuing to finalize...'));
        }
      }
    }

    // Phase 2: Finalize (Serial)
    if (!args.skipFinalize) {
      const finalizeResult = await runFinalizePhase(args);
      phases.push(finalizeResult);
      
      if (!finalizeResult.success) {
        errors.push(`Finalize phase failed`);
      }
    }

    // Get updated metrics for this language
    const langMetrics = await getCoverageMetrics();

    allResults.push({
      language: lang,
      phases,
      totalDuration: Date.now() - langStartTime,
      moviesProcessed: langMetrics.total,
      moviesVerified: langMetrics.verified,
      errors,
    });
  }

  // Final metrics
  const finalMetrics = await getCoverageMetrics();

  // Summary
  console.log(chalk.cyan.bold('\n╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║                    PIPELINE SUMMARY                           ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝\n'));

  // Per-language results
  for (const result of allResults) {
    const langName = LANGUAGE_MAP[result.language] || result.language;
    const success = result.phases.every(p => p.success);
    const icon = success ? chalk.green('✓') : chalk.yellow('⚠');
    
    console.log(`${icon} ${chalk.bold(langName.padEnd(12))} ${(result.totalDuration / 1000).toFixed(1)}s`);
    for (const phase of result.phases) {
      const phaseIcon = phase.success ? chalk.green('✓') : chalk.red('✗');
      console.log(`    ${phaseIcon} ${phase.phase.padEnd(10)} ${(phase.duration / 1000).toFixed(1)}s`);
    }
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(chalk.red(`    └─ ${error}`));
      }
    }
  }

  // Overall metrics
  console.log(chalk.bold('\n📊 Coverage Metrics:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Before:  ${initialMetrics.verified}/${initialMetrics.total} (${initialMetrics.coveragePercent}%)`);
  console.log(`  After:   ${finalMetrics.verified}/${finalMetrics.total} (${finalMetrics.coveragePercent}%)`);
  
  const delta = finalMetrics.verified - initialMetrics.verified;
  if (delta > 0) {
    console.log(chalk.green(`  Delta:   +${delta} newly verified`));
  }

  // Performance
  const totalDuration = Date.now() - totalStartTime;
  console.log(chalk.bold('\n⏱️  Performance:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Avg per Movie:  ${finalMetrics.total > 0 ? (totalDuration / finalMetrics.total).toFixed(0) : 0}ms`);

  // Next steps
  if (finalMetrics.partial > 0 || finalMetrics.raw > 0) {
    console.log(chalk.bold('\n📋 Next Steps:'));
    console.log(chalk.gray('─'.repeat(50)));
    if (finalMetrics.raw > 0) {
      console.log(`  • Run ${chalk.cyan('pnpm ingest:accelerated')} to process ${finalMetrics.raw} raw movies`);
    }
    if (finalMetrics.partial > 0) {
      console.log(`  • Run ${chalk.cyan('pnpm ingest:finalize')} to verify ${finalMetrics.partial} partial movies`);
    }
    console.log(`  • Run ${chalk.cyan('pnpm ingest:accelerated --status')} to check progress`);
  } else {
    console.log(chalk.green('\n✅ All movies verified! Pipeline complete.'));
  }

  console.log(chalk.green('\n✅ Accelerated pipeline complete\n'));
}

main().catch(console.error);

