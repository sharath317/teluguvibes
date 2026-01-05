#!/usr/bin/env npx tsx
/**
 * FULL COVERAGE PIPELINE
 * 
 * Orchestrates all enrichment sources to achieve 100% coverage
 * for poster, hero, heroine, and director fields.
 * 
 * Execution Order:
 * 1. TMDB (existing tmdb_id enrichment)
 * 2. Wikidata (SPARQL for director/cast)
 * 3. Wikipedia (images and info)
 * 4. Google CSE (posters only)
 * 5. AI Inference (gap filling)
 * 
 * Usage:
 *   npx tsx scripts/full-coverage-pipeline.ts
 *   npx tsx scripts/full-coverage-pipeline.ts --dry-run
 *   npx tsx scripts/full-coverage-pipeline.ts --skip-phase=3
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CLIArgs {
  dryRun: boolean;
  skipPhases: number[];
  limit: number;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const skipPhasesArg = args.find(a => a.startsWith('--skip-phase='));
  const skipPhases = skipPhasesArg 
    ? skipPhasesArg.split('=')[1].split(',').map(Number)
    : [];
  
  return {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    skipPhases,
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '1000'),
  };
}

/**
 * Get current coverage stats
 */
async function getCoverageStats() {
  const { count: total } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'Telugu');

  const { count: withPoster } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'Telugu')
    .not('poster_url', 'is', null);

  const { count: withHero } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'Telugu')
    .not('hero', 'is', null);

  const { count: withHeroine } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'Telugu')
    .not('heroine', 'is', null);

  const { count: withDirector } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'Telugu')
    .not('director', 'is', null);

  return {
    total: total || 0,
    poster: withPoster || 0,
    hero: withHero || 0,
    heroine: withHeroine || 0,
    director: withDirector || 0,
  };
}

/**
 * Print coverage stats
 */
function printStats(label: string, stats: any) {
  console.log(chalk.cyan.bold(`\n📊 ${label}`));
  console.log(chalk.cyan('────────────────────────────────────────────────'));
  console.log(`  Total Telugu Movies:  ${stats.total}`);
  console.log(`  With Poster:          ${stats.poster} (${((stats.poster / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  With Hero:            ${stats.hero} (${((stats.hero / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  With Heroine:         ${stats.heroine} (${((stats.heroine / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  With Director:        ${stats.director} (${((stats.director / stats.total) * 100).toFixed(1)}%)`);
}

/**
 * Run a script and wait for completion
 */
async function runScript(scriptPath: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(chalk.gray(`\n$ npx tsx ${scriptPath} ${args.join(' ')}\n`));
    
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`Script error: ${err.message}`));
      resolve(false);
    });
  });
}

async function main() {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                       FULL COVERAGE PIPELINE                                  ║
║                                                                              ║
║  Goal: 100% coverage for Poster, Hero, Heroine, Director                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE - No database changes will be made\n'));
  }

  // Get initial stats
  const initialStats = await getCoverageStats();
  printStats('INITIAL COVERAGE', initialStats);

  const scriptArgs = args.dryRun ? ['--dry-run'] : [];
  const limitArg = `--limit=${args.limit}`;

  // Phase 1: TMDB enrichment for movies with TMDB ID
  if (!args.skipPhases.includes(1)) {
    console.log(chalk.yellow.bold('\n\n════════════════════════════════════════════════════════════'));
    console.log(chalk.yellow.bold('  PHASE 1: TMDB ENRICHMENT'));
    console.log(chalk.yellow.bold('════════════════════════════════════════════════════════════'));
    
    await runScript('scripts/enrich-movies-tmdb.ts', [
      '--missing-cast',
      '--store-cast-json',
      '--language=Telugu',
      limitArg,
      ...scriptArgs,
    ]);

    const phase1Stats = await getCoverageStats();
    printStats('AFTER PHASE 1 (TMDB)', phase1Stats);
  } else {
    console.log(chalk.gray('\n⏭️  Skipping Phase 1 (TMDB)'));
  }

  // Phase 2: Wikidata enrichment
  if (!args.skipPhases.includes(2)) {
    console.log(chalk.yellow.bold('\n\n════════════════════════════════════════════════════════════'));
    console.log(chalk.yellow.bold('  PHASE 2: WIKIDATA ENRICHMENT'));
    console.log(chalk.yellow.bold('════════════════════════════════════════════════════════════'));
    
    await runScript('scripts/enrich-from-wikidata.ts', [limitArg, ...scriptArgs]);

    const phase2Stats = await getCoverageStats();
    printStats('AFTER PHASE 2 (WIKIDATA)', phase2Stats);
  } else {
    console.log(chalk.gray('\n⏭️  Skipping Phase 2 (Wikidata)'));
  }

  // Phase 3: Wikipedia enrichment
  if (!args.skipPhases.includes(3)) {
    console.log(chalk.yellow.bold('\n\n════════════════════════════════════════════════════════════'));
    console.log(chalk.yellow.bold('  PHASE 3: WIKIPEDIA ENRICHMENT'));
    console.log(chalk.yellow.bold('════════════════════════════════════════════════════════════'));
    
    await runScript('scripts/enrich-from-wikipedia.ts', [limitArg, ...scriptArgs, '-v']);

    const phase3Stats = await getCoverageStats();
    printStats('AFTER PHASE 3 (WIKIPEDIA)', phase3Stats);
  } else {
    console.log(chalk.gray('\n⏭️  Skipping Phase 3 (Wikipedia)'));
  }

  // Phase 4: Google CSE (if configured)
  if (!args.skipPhases.includes(4)) {
    console.log(chalk.yellow.bold('\n\n════════════════════════════════════════════════════════════'));
    console.log(chalk.yellow.bold('  PHASE 4: GOOGLE CUSTOM SEARCH (POSTERS)'));
    console.log(chalk.yellow.bold('════════════════════════════════════════════════════════════'));
    
    if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) {
      await runScript('scripts/enrich-posters-google.ts', ['--limit=100', ...scriptArgs]);
      
      const phase4Stats = await getCoverageStats();
      printStats('AFTER PHASE 4 (GOOGLE CSE)', phase4Stats);
    } else {
      console.log(chalk.gray('\n⏭️  Google CSE not configured - skipping'));
    }
  } else {
    console.log(chalk.gray('\n⏭️  Skipping Phase 4 (Google CSE)'));
  }

  // Phase 5: AI Inference
  if (!args.skipPhases.includes(5)) {
    console.log(chalk.yellow.bold('\n\n════════════════════════════════════════════════════════════'));
    console.log(chalk.yellow.bold('  PHASE 5: AI INFERENCE'));
    console.log(chalk.yellow.bold('════════════════════════════════════════════════════════════'));
    
    await runScript('scripts/enrich-ai-inference.ts', ['--limit=500', ...scriptArgs]);

    const phase5Stats = await getCoverageStats();
    printStats('AFTER PHASE 5 (AI INFERENCE)', phase5Stats);
  } else {
    console.log(chalk.gray('\n⏭️  Skipping Phase 5 (AI Inference)'));
  }

  // Final stats
  const finalStats = await getCoverageStats();
  
  console.log(chalk.green.bold('\n\n════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold('  PIPELINE COMPLETE'));
  console.log(chalk.green.bold('════════════════════════════════════════════════════════════\n'));

  console.log(chalk.bold('  COVERAGE IMPROVEMENT:'));
  console.log(chalk.cyan('  ─────────────────────────────────────────────────────────────────'));
  console.log(`  Field        Before      After       Change      Coverage`);
  console.log(chalk.cyan('  ─────────────────────────────────────────────────────────────────'));
  
  const formatChange = (before: number, after: number) => {
    const change = after - before;
    return change > 0 ? chalk.green(`+${change}`) : change === 0 ? '0' : chalk.red(String(change));
  };

  const formatPct = (value: number, total: number) => {
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  console.log(`  Poster       ${String(initialStats.poster).padStart(5)}       ${String(finalStats.poster).padStart(5)}       ${formatChange(initialStats.poster, finalStats.poster).padStart(6)}      ${formatPct(finalStats.poster, finalStats.total)}`);
  console.log(`  Hero         ${String(initialStats.hero).padStart(5)}       ${String(finalStats.hero).padStart(5)}       ${formatChange(initialStats.hero, finalStats.hero).padStart(6)}      ${formatPct(finalStats.hero, finalStats.total)}`);
  console.log(`  Heroine      ${String(initialStats.heroine).padStart(5)}       ${String(finalStats.heroine).padStart(5)}       ${formatChange(initialStats.heroine, finalStats.heroine).padStart(6)}      ${formatPct(finalStats.heroine, finalStats.total)}`);
  console.log(`  Director     ${String(initialStats.director).padStart(5)}       ${String(finalStats.director).padStart(5)}       ${formatChange(initialStats.director, finalStats.director).padStart(6)}      ${formatPct(finalStats.director, finalStats.total)}`);
  console.log(chalk.cyan('  ─────────────────────────────────────────────────────────────────'));

  if (args.dryRun) {
    console.log(chalk.yellow('\n💡 This was a DRY RUN. No changes were made.\n'));
  }

  console.log(chalk.green('\n✅ Full coverage pipeline complete!\n'));
}

main().catch(console.error);

