#!/usr/bin/env npx tsx

/**
 * MASTER INJECTION ORCHESTRATOR
 * 
 * Consolidates all injection commands into a single resumable pipeline.
 * 
 * Commands:
 * - pnpm inject:all              - Run complete injection pipeline
 * - pnpm inject:all --dry        - Dry run mode
 * - pnpm inject:all --resume     - Resume from last checkpoint
 * - pnpm inject:all --status     - Show pipeline status
 * - pnpm inject:all --movies     - Only movies
 * - pnpm inject:all --reviews    - Only reviews
 * - pnpm inject:all --sections   - Only content sections
 * 
 * Pipeline Stages:
 * 1. Database hygiene (orphan resolution)
 * 2. Telugu movie ingestion
 * 3. Other language movies
 * 4. Review generation
 * 5. Collections injection
 * 6. OTT recommendations
 * 7. Promotions injection
 * 8. Content sections (stories, cricket, bigg boss)
 * 9. Verification
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const chalk = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

// ============================================================
// TYPES
// ============================================================

interface PipelineStage {
  id: string;
  name: string;
  command: string;
  args?: string[];
  optional?: boolean;
  dependsOn?: string[];
  category: 'hygiene' | 'movies' | 'reviews' | 'sections' | 'verify';
}

interface PipelineState {
  currentStage: string | null;
  completedStages: string[];
  failedStages: string[];
  startedAt: string;
  lastUpdated: string;
}

interface CLIArgs {
  dryRun: boolean;
  resume: boolean;
  status: boolean;
  moviesOnly: boolean;
  reviewsOnly: boolean;
  sectionsOnly: boolean;
  verbose: boolean;
}

// ============================================================
// PIPELINE STAGES
// ============================================================

const PIPELINE_STAGES: PipelineStage[] = [
  // Database Hygiene
  {
    id: 'orphan-resolve',
    name: 'Resolve Orphan Movies',
    command: 'pnpm',
    args: ['orphan:resolve'],
    category: 'hygiene',
  },
  
  // Movies
  {
    id: 'telugu-enrich',
    name: 'Enrich Telugu Movies',
    command: 'pnpm',
    args: ['enrich:movies:full'],
    category: 'movies',
    dependsOn: ['orphan-resolve'],
  },
  
  // Reviews
  {
    id: 'reviews-coverage',
    name: 'Generate Review Coverage',
    command: 'pnpm',
    args: ['reviews:coverage'],
    category: 'reviews',
    dependsOn: ['telugu-enrich'],
    optional: true,
  },
  
  // Finalization
  {
    id: 'finalize',
    name: 'Finalize Pipeline',
    command: 'pnpm',
    args: ['ingest:finalize'],
    category: 'verify',
    dependsOn: ['telugu-enrich'],
  },
];

// ============================================================
// STATE MANAGEMENT
// ============================================================

const STATE_FILE = resolve(process.cwd(), '.inject-all-state.json');

function loadState(): PipelineState | null {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function saveState(state: PipelineState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not save state file'));
  }
}

function clearState(): void {
  try {
    if (existsSync(STATE_FILE)) {
      const fs = require('fs');
      fs.unlinkSync(STATE_FILE);
    }
  } catch {
    // Ignore
  }
}

// ============================================================
// COMMAND EXECUTION
// ============================================================

function runCommand(command: string, args: string[], dryRun: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    if (dryRun) {
      console.log(chalk.yellow(`  [DRY RUN] Would run: ${command} ${args.join(' ')}`));
      resolve(true);
      return;
    }

    console.log(chalk.gray(`  Running: ${command} ${args.join(' ')}`));
    
    const proc: ChildProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry'),
    resume: args.includes('--resume'),
    status: args.includes('--status'),
    moviesOnly: args.includes('--movies'),
    reviewsOnly: args.includes('--reviews'),
    sectionsOnly: args.includes('--sections'),
    verbose: args.includes('--verbose'),
  };
}

// ============================================================
// STATUS DISPLAY
// ============================================================

function displayStatus(): void {
  const state = loadState();

  console.log(chalk.cyan(chalk.bold(`
╔══════════════════════════════════════════════════════════════╗
║              INJECTION PIPELINE STATUS                        ║
╚══════════════════════════════════════════════════════════════╝
`)));

  if (!state) {
    console.log(chalk.gray('No active pipeline. Run pnpm inject:all to start.'));
    return;
  }

  console.log(`Started:    ${chalk.gray(state.startedAt)}`);
  console.log(`Updated:    ${chalk.gray(state.lastUpdated)}`);
  console.log(`Current:    ${state.currentStage ? chalk.yellow(state.currentStage) : chalk.gray('None')}`);
  console.log();

  console.log(chalk.bold('Stages:'));
  console.log(chalk.gray('─'.repeat(50)));

  PIPELINE_STAGES.forEach((stage) => {
    let status = '○';
    let color = chalk.gray;

    if (state.completedStages.includes(stage.id)) {
      status = '✓';
      color = chalk.green;
    } else if (state.failedStages.includes(stage.id)) {
      status = '✗';
      color = chalk.red;
    } else if (state.currentStage === stage.id) {
      status = '●';
      color = chalk.yellow;
    }

    console.log(`  ${color(`${status} ${stage.name}`)}`);
  });

  console.log();

  if (state.failedStages.length > 0) {
    console.log(chalk.red(`Failed stages: ${state.failedStages.join(', ')}`));
    console.log(chalk.gray('Run pnpm inject:all --resume to retry'));
  } else if (state.completedStages.length === PIPELINE_STAGES.length) {
    console.log(chalk.green('✅ Pipeline complete!'));
    console.log(chalk.gray('Run pnpm inject:all to start a fresh run'));
  } else {
    console.log(chalk.yellow(`Progress: ${state.completedStages.length}/${PIPELINE_STAGES.length} stages`));
  }
}

// ============================================================
// MAIN PIPELINE
// ============================================================

async function runPipeline(args: CLIArgs): Promise<void> {
  const startTime = Date.now();

  console.log(chalk.cyan(chalk.bold(`
╔══════════════════════════════════════════════════════════════╗
║              MASTER INJECTION PIPELINE                        ║
║        Complete content ingestion and enrichment              ║
╚══════════════════════════════════════════════════════════════╝
`)));

  if (args.dryRun) {
    console.log(chalk.yellow(chalk.bold('🔍 DRY RUN MODE - No changes will be made\n')));
  }

  // Determine which stages to run
  let stagesToRun = PIPELINE_STAGES;

  if (args.moviesOnly) {
    stagesToRun = PIPELINE_STAGES.filter((s) => s.category === 'movies' || s.category === 'hygiene');
    console.log(chalk.gray('Running movies-only stages\n'));
  } else if (args.reviewsOnly) {
    stagesToRun = PIPELINE_STAGES.filter((s) => s.category === 'reviews');
    console.log(chalk.gray('Running reviews-only stages\n'));
  } else if (args.sectionsOnly) {
    stagesToRun = PIPELINE_STAGES.filter((s) => s.category === 'sections');
    console.log(chalk.gray('Running sections-only stages\n'));
  }

  // Load or initialize state
  let state: PipelineState;
  
  if (args.resume) {
    const existingState = loadState();
    if (existingState) {
      state = existingState;
      console.log(chalk.yellow(`Resuming from stage: ${state.currentStage || 'beginning'}`));
      console.log(chalk.gray(`Completed: ${state.completedStages.length}/${stagesToRun.length}\n`));
    } else {
      console.log(chalk.gray('No previous state found. Starting fresh.\n'));
      state = {
        currentStage: null,
        completedStages: [],
        failedStages: [],
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };
    }
  } else {
    // Fresh start
    clearState();
    state = {
      currentStage: null,
      completedStages: [],
      failedStages: [],
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }

  // Run stages
  for (const stage of stagesToRun) {
    // Skip already completed stages when resuming
    if (state.completedStages.includes(stage.id)) {
      console.log(chalk.gray(`⏭️  Skipping ${stage.name} (already completed)`));
      continue;
    }

    // Check dependencies
    if (stage.dependsOn) {
      const unmetDeps = stage.dependsOn.filter(
        (dep) => !state.completedStages.includes(dep)
      );
      if (unmetDeps.length > 0 && !args.dryRun) {
        console.log(chalk.yellow(`⏭️  Skipping ${stage.name} (dependencies not met: ${unmetDeps.join(', ')})`));
        continue;
      }
    }

    console.log(chalk.blue(`\n▶ Stage: ${stage.name}`));
    console.log(chalk.gray('─'.repeat(50)));

    state.currentStage = stage.id;
    state.lastUpdated = new Date().toISOString();
    saveState(state);

    const success = await runCommand(stage.command, stage.args || [], args.dryRun);

    if (success) {
      state.completedStages.push(stage.id);
      state.failedStages = state.failedStages.filter((s) => s !== stage.id);
      console.log(chalk.green(`  ✓ ${stage.name} completed`));
    } else {
      if (stage.optional) {
        console.log(chalk.yellow(`  ⚠ ${stage.name} failed (optional, continuing)`));
      } else {
        state.failedStages.push(stage.id);
        saveState(state);
        console.log(chalk.red(`  ✗ ${stage.name} failed`));
        console.log(chalk.yellow('\nPipeline paused. Run pnpm inject:all --resume to retry.'));
        process.exit(1);
      }
    }

    state.lastUpdated = new Date().toISOString();
    saveState(state);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(chalk.cyan(chalk.bold(`
═══════════════════════════════════════════════════════════
📊 PIPELINE SUMMARY
═══════════════════════════════════════════════════════════
`)));

  console.log(`  Stages Completed: ${chalk.green(state.completedStages.length.toString())}/${stagesToRun.length}`);
  console.log(`  Stages Failed:    ${state.failedStages.length > 0 ? chalk.red(state.failedStages.length.toString()) : chalk.gray('0')}`);
  console.log(`  Duration:         ${chalk.gray(duration)}s`);

  if (state.failedStages.length > 0) {
    console.log(chalk.red(`\n❌ Failed: ${state.failedStages.join(', ')}`));
  } else {
    console.log(chalk.green('\n✅ All stages completed successfully!\n'));
    clearState();
  }
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.status) {
    displayStatus();
    return;
  }

  await runPipeline(args);
}

main().catch(console.error);

