#!/usr/bin/env npx tsx
/**
 * FINALIZE MODE INGESTION CLI
 * 
 * Runs SERIAL integrity gates to verify and promote partial records.
 * Only ONE of these operations can run at a time to ensure data integrity.
 * 
 * Serial gates (in order):
 * 0. Orphan Resolution - Fix movies with missing TMDB data
 * 1. Normalization - Title/name standardization
 * 2. Deduplication - Entity merge
 * 3. Audit & Fix - Data issue correction
 * 4. Completeness Scoring - Calculate final scores
 * 5. Promotion - Mark as verified
 * 
 * Usage:
 *   pnpm ingest:finalize               # Finalize all partial records
 *   pnpm ingest:finalize --language=te # Telugu only
 *   pnpm ingest:finalize --dry         # Preview mode
 *   pnpm ingest:finalize --status      # Show verification status
 *   pnpm ingest:finalize --skip-orphan # Skip orphan resolution
 *   pnpm ingest:finalize --skip-audit  # Skip audit step
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import {
  runSerial,
  type Task,
  type BatchResult,
} from '../lib/pipeline/execution-controller';
import {
  CheckpointManager,
  type IngestionStage,
} from '../lib/pipeline/checkpoint-manager';
import { batchUpdateMovieStatus } from '../lib/movie-index/batch-writer';
import { runOrphanResolution } from '../lib/movie-validation/orphan-resolver';

// ============================================================
// TYPES
// ============================================================

interface CLIArgs {
  language?: string;
  dryRun: boolean;
  status: boolean;
  verbose: boolean;
  skipOrphan: boolean;
  skipNormalize: boolean;
  skipDedupe: boolean;
  skipAudit: boolean;
  minScore: number;
}

interface GateResult {
  gate: string;
  success: boolean;
  processed: number;
  fixed: number;
  duration: number;
  errors: string[];
}

interface FinalizeResult {
  gates: GateResult[];
  promotedCount: number;
  rejectedCount: number;
  totalDuration: number;
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
  const parsed: CLIArgs = {
    dryRun: false,
    status: false,
    verbose: false,
    skipOrphan: false,
    skipNormalize: false,
    skipDedupe: false,
    skipAudit: false,
    minScore: 0.8,
  };

  for (const arg of args) {
    if (arg === '--dry' || arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '--status') parsed.status = true;
    else if (arg === '-v' || arg === '--verbose') parsed.verbose = true;
    else if (arg === '--skip-orphan') parsed.skipOrphan = true;
    else if (arg === '--skip-normalize') parsed.skipNormalize = true;
    else if (arg === '--skip-dedupe') parsed.skipDedupe = true;
    else if (arg === '--skip-audit') parsed.skipAudit = true;
    else if (arg.startsWith('--language=')) parsed.language = arg.split('=')[1];
    else if (arg.startsWith('--min-score=')) parsed.minScore = parseFloat(arg.split('=')[1]);
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
// SERIAL GATES
// ============================================================

async function runOrphanResolutionGate(args: CLIArgs): Promise<GateResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan('\n🔗 Gate 0: Orphan Resolution (SERIAL)'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('   Resolving movies with missing TMDB data...'));
  
  if (args.dryRun) {
    console.log(chalk.yellow('   [DRY RUN] Would resolve orphan movies'));
    const result = await runOrphanResolution({ dryRun: true, verbose: args.verbose });
    console.log(chalk.yellow(`   [DRY RUN] Found ${result.processed} orphan movies`));
    return { gate: 'orphan_resolution', success: true, processed: result.processed, fixed: 0, duration: Date.now() - startTime, errors: [] };
  }
  
  try {
    const result = await runOrphanResolution({ dryRun: false, verbose: args.verbose });
    
    if (result.errors.length > 0) {
      errors.push(...result.errors.slice(0, 5)); // Limit logged errors
    }
    
    console.log(chalk.green(`   ✓ Orphan resolution completed`));
    console.log(chalk.gray(`     - Processed: ${result.processed}`));
    console.log(chalk.gray(`     - Fixed: ${result.fixed} (merged + enriched)`));
    
    if (result.errors.length > 0) {
      console.log(chalk.yellow(`     - Unresolved: ${result.errors.length}`));
    }
    
    return {
      gate: 'orphan_resolution',
      success: true,
      processed: result.processed,
      fixed: result.fixed,
      duration: result.duration,
      errors,
    };
    
  } catch (error: any) {
    errors.push(`Orphan resolution failed: ${error.message}`);
    console.log(chalk.red('   ✗ Orphan resolution failed'));
    return {
      gate: 'orphan_resolution',
      success: false,
      processed: 0,
      fixed: 0,
      duration: Date.now() - startTime,
      errors,
    };
  }
}

async function runNormalizationGate(args: CLIArgs): Promise<GateResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan('\n🔧 Gate 1: Normalization (SERIAL)'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('   Standardizing titles and entity names...'));
  
  if (args.dryRun) {
    console.log(chalk.yellow('   [DRY RUN] Would run: intel:normalize:all'));
    return { gate: 'normalize', success: true, processed: 0, fixed: 0, duration: 0, errors: [] };
  }
  
  const result = await runCommand('scripts/entities-normalize.ts', ['--all', '--fix']);
  
  if (!result.success) {
    errors.push(`Normalization failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('   ✗ Normalization failed'));
  } else {
    console.log(chalk.green('   ✓ Normalization completed'));
  }
  
  return {
    gate: 'normalize',
    success: result.success,
    processed: 1,
    fixed: 0,
    duration: Date.now() - startTime,
    errors,
  };
}

async function runDeduplicationGate(args: CLIArgs): Promise<GateResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan('\n🔀 Gate 2: Deduplication (SERIAL)'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('   Merging duplicate entities...'));
  
  if (args.dryRun) {
    console.log(chalk.yellow('   [DRY RUN] Would run: intel:entity-merge:auto'));
    return { gate: 'dedupe', success: true, processed: 0, fixed: 0, duration: 0, errors: [] };
  }
  
  const result = await runCommand('scripts/entity-merge.ts', ['--apply', '--auto', '--min-confidence=0.85']);
  
  if (!result.success) {
    errors.push(`Deduplication failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('   ✗ Deduplication failed'));
  } else {
    console.log(chalk.green('   ✓ Deduplication completed'));
  }
  
  return {
    gate: 'dedupe',
    success: result.success,
    processed: 1,
    fixed: 0,
    duration: Date.now() - startTime,
    errors,
  };
}

async function runAuditGate(args: CLIArgs): Promise<GateResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan('\n🔍 Gate 3: Audit & Fix (SERIAL)'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('   Auditing and fixing data issues...'));
  
  if (args.dryRun) {
    console.log(chalk.yellow('   [DRY RUN] Would run: intel:movie-audit --fix'));
    return { gate: 'audit', success: true, processed: 0, fixed: 0, duration: 0, errors: [] };
  }
  
  const result = await runCommand('scripts/movie-audit.ts', ['--fix']);
  
  if (!result.success) {
    errors.push(`Audit failed: ${result.output.slice(-200)}`);
    console.log(chalk.red('   ✗ Audit failed'));
  } else {
    console.log(chalk.green('   ✓ Audit completed'));
  }
  
  return {
    gate: 'audit',
    success: result.success,
    processed: 1,
    fixed: 0,
    duration: Date.now() - startTime,
    errors,
  };
}

async function calculateCompletenessScores(
  supabase: ReturnType<typeof getSupabaseClient>,
  args: CLIArgs
): Promise<GateResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  console.log(chalk.cyan('\n📊 Gate 4: Completeness Scoring (SERIAL)'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('   Calculating final completeness scores...'));
  
  if (args.dryRun) {
    console.log(chalk.yellow('   [DRY RUN] Would calculate completeness scores'));
    return { gate: 'scoring', success: true, processed: 0, fixed: 0, duration: 0, errors: [] };
  }
  
  try {
    // Fetch all partial/enriched movies
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title_en, tmdb_id, poster_url, backdrop_url, director, hero, heroine, genres, cast_members, release_date, is_published')
      .or('ingestion_status.eq.partial,ingestion_status.eq.enriched,ingestion_status.is.null');
    
    if (error) throw error;
    
    // Calculate scores
    const updates: Array<{ id: string; ingestion_status?: string; completeness_score?: number; last_stage_completed?: string }> = [];
    
    for (const movie of movies || []) {
      let score = 0;
      
      // Core fields
      if (movie.tmdb_id) score += 0.1;
      if (movie.title_en) score += 0.1;
      if (movie.poster_url) score += 0.1;
      if (movie.backdrop_url) score += 0.05;
      if (movie.director) score += 0.15;
      if (movie.hero) score += 0.1;
      if (movie.heroine) score += 0.05;
      if (movie.genres && movie.genres.length > 0) score += 0.1;
      if (movie.cast_members && (Array.isArray(movie.cast_members) ? movie.cast_members.length >= 3 : true)) score += 0.1;
      if (movie.release_date) score += 0.05;
      if (movie.is_published) score += 0.1;
      
      score = Math.round(score * 100) / 100;
      
      updates.push({
        id: movie.id,
        completeness_score: score,
        last_stage_completed: 'dedupe',
      });
    }
    
    // Batch update
    if (updates.length > 0) {
      await batchUpdateMovieStatus(updates);
    }
    
    console.log(chalk.green(`   ✓ Calculated scores for ${updates.length} movies`));
    
    return {
      gate: 'scoring',
      success: true,
      processed: updates.length,
      fixed: 0,
      duration: Date.now() - startTime,
      errors,
    };
    
  } catch (error: any) {
    errors.push(`Scoring failed: ${error.message}`);
    console.log(chalk.red('   ✗ Scoring failed'));
    return {
      gate: 'scoring',
      success: false,
      processed: 0,
      fixed: 0,
      duration: Date.now() - startTime,
      errors,
    };
  }
}

async function promoteVerifiedRecords(
  supabase: ReturnType<typeof getSupabaseClient>,
  args: CLIArgs
): Promise<{ promoted: number; rejected: number }> {
  console.log(chalk.cyan('\n✅ Gate 5: Promotion (SERIAL)'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray(`   Promoting records with score >= ${args.minScore}...`));
  
  if (args.dryRun) {
    // Count how many would be promoted
    const { count: wouldPromote } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .or('ingestion_status.eq.partial,ingestion_status.eq.enriched')
      .gte('completeness_score', args.minScore);
    
    const { count: wouldReject } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .or('ingestion_status.eq.partial,ingestion_status.eq.enriched')
      .lt('completeness_score', args.minScore);
    
    console.log(chalk.yellow(`   [DRY RUN] Would promote ${wouldPromote || 0} records`));
    console.log(chalk.yellow(`   [DRY RUN] Would leave ${wouldReject || 0} as partial`));
    
    return { promoted: 0, rejected: 0 };
  }
  
  try {
    // Promote high-score records
    const { data: toPromote, error: promoteError } = await supabase
      .from('movies')
      .update({
        ingestion_status: 'verified',
        last_stage_completed: 'finalize',
        stage_completed_at: new Date().toISOString(),
      })
      .or('ingestion_status.eq.partial,ingestion_status.eq.enriched')
      .gte('completeness_score', args.minScore)
      .select('id');
    
    if (promoteError) throw promoteError;
    
    const promoted = toPromote?.length || 0;
    
    // Count rejected (low score)
    const { count: rejected } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .or('ingestion_status.eq.partial,ingestion_status.eq.enriched')
      .lt('completeness_score', args.minScore);
    
    console.log(chalk.green(`   ✓ Promoted ${promoted} records to verified`));
    if ((rejected || 0) > 0) {
      console.log(chalk.yellow(`   ⚠️  ${rejected} records remain partial (score < ${args.minScore})`));
    }
    
    return { promoted, rejected: rejected || 0 };
    
  } catch (error: any) {
    console.log(chalk.red(`   ✗ Promotion failed: ${error.message}`));
    return { promoted: 0, rejected: 0 };
  }
}

// ============================================================
// STATUS DISPLAY
// ============================================================

async function showStatus(): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log(chalk.cyan.bold('\n📊 FINALIZATION STATUS\n'));
  
  // Get status breakdown
  const { data: movies } = await supabase
    .from('movies')
    .select('ingestion_status, completeness_score');
  
  const statusCounts: Record<string, number> = {
    raw: 0,
    partial: 0,
    enriched: 0,
    verified: 0,
    published: 0,
  };
  
  let totalScore = 0;
  let scoreCount = 0;
  const scoreBuckets = { low: 0, medium: 0, high: 0 };
  
  for (const movie of movies || []) {
    const status = movie.ingestion_status || 'raw';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    if (movie.completeness_score !== null) {
      totalScore += movie.completeness_score;
      scoreCount++;
      
      if (movie.completeness_score < 0.5) scoreBuckets.low++;
      else if (movie.completeness_score < 0.8) scoreBuckets.medium++;
      else scoreBuckets.high++;
    }
  }
  
  const avgScore = scoreCount > 0 ? (totalScore / scoreCount) : 0;
  
  console.log(chalk.bold('Status Distribution:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Raw:       ${chalk.gray(statusCounts.raw)}`);
  console.log(`  Partial:   ${chalk.yellow(statusCounts.partial)}`);
  console.log(`  Enriched:  ${chalk.blue(statusCounts.enriched)}`);
  console.log(`  Verified:  ${chalk.green(statusCounts.verified)}`);
  console.log(`  Published: ${chalk.green(statusCounts.published)}`);
  
  console.log(chalk.bold('\nCompleteness Scores:'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`  Average Score:  ${(avgScore * 100).toFixed(1)}%`);
  console.log(`  Low (<50%):     ${chalk.red(scoreBuckets.low)}`);
  console.log(`  Medium (50-80%): ${chalk.yellow(scoreBuckets.medium)}`);
  console.log(`  High (≥80%):    ${chalk.green(scoreBuckets.high)}`);
  
  // Readiness assessment
  const readyToPromote = scoreBuckets.high;
  const needsWork = scoreBuckets.low + scoreBuckets.medium;
  const needsFinalize = statusCounts.partial + statusCounts.enriched;
  
  console.log(chalk.bold('\nReadiness Assessment:'));
  console.log(chalk.gray('─'.repeat(40)));
  if (needsFinalize > 0) {
    console.log(chalk.yellow(`  ⚠️  ${needsFinalize} movies need finalization`));
  }
  console.log(`  Ready to promote: ${chalk.green(readyToPromote)}`);
  console.log(`  Needs enrichment: ${chalk.yellow(needsWork)}`);
  
  if (needsFinalize > 0) {
    console.log(chalk.gray('\nRun: pnpm ingest:finalize'));
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();
  const supabase = getSupabaseClient();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║             FINALIZE MODE INGESTION PIPELINE                  ║
║           Serial Integrity Gates (One at a Time)              ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.status) {
    await showStatus();
    return;
  }

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  console.log(chalk.gray('⚠️  Running SERIAL operations - this ensures data integrity'));
  console.log(chalk.gray('   Each gate must complete before the next begins.\n'));

  const startTime = Date.now();
  const gates: GateResult[] = [];

  // Gate 0: Orphan Resolution (runs first to fix missing TMDB data)
  if (!args.skipOrphan) {
    const orphanResult = await runOrphanResolutionGate(args);
    gates.push(orphanResult);
    if (!orphanResult.success && !args.dryRun) {
      console.log(chalk.yellow('\n⚠️  Orphan resolution had issues but continuing...'));
    }
  }

  // Gate 1: Normalization
  if (!args.skipNormalize) {
    const normalizeResult = await runNormalizationGate(args);
    gates.push(normalizeResult);
    if (!normalizeResult.success && !args.dryRun) {
      console.log(chalk.red('\n❌ Pipeline halted: Normalization gate failed'));
      process.exit(1);
    }
  }

  // Gate 2: Deduplication
  if (!args.skipDedupe) {
    const dedupeResult = await runDeduplicationGate(args);
    gates.push(dedupeResult);
    if (!dedupeResult.success && !args.dryRun) {
      console.log(chalk.red('\n❌ Pipeline halted: Deduplication gate failed'));
      process.exit(1);
    }
  }

  // Gate 3: Audit
  if (!args.skipAudit) {
    const auditResult = await runAuditGate(args);
    gates.push(auditResult);
    if (!auditResult.success && !args.dryRun) {
      console.log(chalk.yellow('\n⚠️  Audit gate failed but continuing...'));
    }
  }

  // Gate 4: Completeness Scoring
  const scoringResult = await calculateCompletenessScores(supabase, args);
  gates.push(scoringResult);

  // Gate 5: Promotion
  const { promoted, rejected } = await promoteVerifiedRecords(supabase, args);

  // Summary
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 FINALIZATION SUMMARY'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(chalk.bold('Gates Executed:'));
  for (const gate of gates) {
    const status = gate.success ? chalk.green('✓') : chalk.red('✗');
    console.log(`  ${status} ${gate.gate.padEnd(15)} (${(gate.duration / 1000).toFixed(1)}s)`);
    if (gate.errors.length > 0) {
      for (const error of gate.errors) {
        console.log(chalk.red(`      └─ ${error.slice(0, 60)}...`));
      }
    }
  }

  console.log(chalk.bold('\nResults:'));
  console.log(`  Promoted to Verified: ${chalk.green(promoted)}`);
  console.log(`  Remaining Partial:    ${chalk.yellow(rejected)}`);
  console.log(`  Total Duration:       ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  if (rejected > 0) {
    console.log(chalk.yellow(`\n⚠️  ${rejected} movies need more data to reach verification threshold`));
    console.log(chalk.gray('   Run: pnpm ingest:fast to enrich remaining movies'));
  }

  console.log(chalk.green('\n✅ Finalization complete\n'));
}

main().catch(console.error);

