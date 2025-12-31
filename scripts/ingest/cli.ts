#!/usr/bin/env npx tsx
/**
 * SMART CONTENT & IMAGE INTELLIGENCE CLI
 *
 * Production-grade ingestion pipeline with multiple modes.
 *
 * Usage:
 *   pnpm run ingest --mode=dry     # Preview only, no DB writes
 *   pnpm run ingest --mode=smart   # Update weak fields only (DEFAULT)
 *   pnpm run ingest --mode=reset   # Archive + rebuild safely
 *
 * Options:
 *   --source    Data sources (tmdb,wikidata,news,youtube,internal)
 *   --target    What to process (posts,celebrities,movies,reviews)
 *   --limit     Max records per source
 *   --force-ai  Force AI regeneration even if content exists
 *   --verbose   Show detailed logs
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { parseArgs } from 'util';
import chalk from 'chalk';
import { ContentPipeline } from '../../lib/intelligence/pipeline';
import type { IngestConfig } from '../../lib/intelligence/types';

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

function parseCliArgs(): IngestConfig {
  const { values } = parseArgs({
    options: {
      mode: { type: 'string', default: 'smart' },
      source: { type: 'string', default: 'internal,tmdb' },
      target: { type: 'string', default: 'posts' },
      limit: { type: 'string', default: '20' },
      'force-ai': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Validate mode
  const mode = values.mode as string;
  if (!['dry', 'smart', 'reset'].includes(mode)) {
    console.error(chalk.red(`Invalid mode: ${mode}`));
    console.error(chalk.dim('Valid modes: dry, smart, reset'));
    process.exit(1);
  }

  return {
    mode: mode as 'dry' | 'smart' | 'reset',
    sources: (values.source as string).split(',').map(s => s.trim()) as IngestConfig['sources'],
    targets: (values.target as string).split(',').map(s => s.trim()) as IngestConfig['targets'],
    limit: parseInt(values.limit as string) || 20,
    forceAI: values['force-ai'] || false,
    verbose: values.verbose || false,
  };
}

function printHelp(): void {
  console.log(`
${chalk.bold.cyan('🧠 Smart Content & Image Intelligence Pipeline')}

${chalk.bold('Usage:')}
  pnpm run ingest [options]

${chalk.bold('Modes:')}
  ${chalk.yellow('--mode=dry')}      Preview changes without writing to database
                   Shows what would be processed and validated

  ${chalk.yellow('--mode=smart')}    ${chalk.dim('(DEFAULT)')} Intelligent update mode
                   Only updates weak/missing fields
                   Preserves human-edited content
                   Safe for production use

  ${chalk.yellow('--mode=reset')}    Archive and rebuild mode
                   Archives NEEDS_REWORK items
                   Re-processes from scratch
                   Use with caution!

${chalk.bold('Options:')}
  --source=<sources>    Data sources to fetch from
                        ${chalk.dim('Values: internal, tmdb, wikidata, news, youtube')}
                        ${chalk.dim('Default: internal,tmdb')}

  --target=<targets>    What to process
                        ${chalk.dim('Values: posts, celebrities, movies, reviews')}
                        ${chalk.dim('Default: posts')}

  --limit=<number>      Maximum records to process
                        ${chalk.dim('Default: 20')}

  --force-ai            Force AI regeneration even if content exists
                        ${chalk.dim('Useful for refreshing stale content')}

  --verbose             Show detailed processing logs

${chalk.bold('Examples:')}
  ${chalk.dim('# Preview what would be processed')}
  pnpm run ingest --mode=dry

  ${chalk.dim('# Smart update posts with TMDB data')}
  pnpm run ingest --mode=smart --target=posts --limit=50

  ${chalk.dim('# Force refresh celebrities with AI')}
  pnpm run ingest --target=celebrities --force-ai

  ${chalk.dim('# Full rebuild (careful!)')}
  pnpm run ingest --mode=reset --source=internal,tmdb,wikidata

${chalk.bold('Status Meanings:')}
  ${chalk.green('READY')}         Content is publication-ready
  ${chalk.yellow('NEEDS_REVIEW')}  Human review required
  ${chalk.red('NEEDS_REWORK')}  Significant issues, regeneration needed
  ${chalk.dim('DRAFT')}         Initial state, not yet processed

${chalk.bold('Safety:')}
  • No Google Images or IMDb scraping
  • oEmbed only for social media
  • All images have license metadata
  • Never auto-publishes without READY status
`);
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function main(): Promise<void> {
  console.log(chalk.bold.cyan('\n🧠 Smart Content & Image Intelligence Pipeline\n'));

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Missing Supabase environment variables'));
    process.exit(1);
  }

  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.warn(chalk.yellow('⚠️ No AI API key configured - synthesis will be skipped'));
  }

  // Parse arguments
  const config = parseCliArgs();

  // Show configuration
  console.log(chalk.bold('Configuration:'));
  console.log(`  Mode:     ${getModeDisplay(config.mode)}`);
  console.log(`  Sources:  ${config.sources.join(', ')}`);
  console.log(`  Targets:  ${config.targets.join(', ')}`);
  console.log(`  Limit:    ${config.limit}`);
  if (config.forceAI) console.log(`  Force AI: ${chalk.yellow('Yes')}`);
  console.log();

  // Confirm reset mode
  if (config.mode === 'reset') {
    console.log(chalk.yellow.bold('⚠️  RESET MODE'));
    console.log(chalk.yellow('This will archive NEEDS_REWORK items and rebuild.'));
    console.log(chalk.dim('Press Ctrl+C within 3 seconds to cancel...\n'));
    await sleep(3000);
  }

  // Run pipeline
  const pipeline = new ContentPipeline(config);

  try {
    const stats = await pipeline.run();

    // Exit code based on results
    if (stats.errors.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Pipeline failed:'), error);
    process.exit(1);
  }
}

function getModeDisplay(mode: string): string {
  switch (mode) {
    case 'dry':
      return chalk.blue('DRY RUN (preview only)');
    case 'smart':
      return chalk.green('SMART (update weak fields)');
    case 'reset':
      return chalk.red('RESET (archive + rebuild)');
    default:
      return mode;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
main();
