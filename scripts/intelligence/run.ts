#!/usr/bin/env npx tsx
/**
 * INTELLIGENCE SYNC CLI
 *
 * Production-grade AI ingestion pipeline for Telugu media platform.
 * Single command to fetch, enrich, and populate all content.
 *
 * Usage:
 *   pnpm intelligence:sync
 *   pnpm intelligence:sync --source=tmdb --target=movies --mode=smart
 *   pnpm intelligence:sync --dry-run --limit=10
 *
 * Flags:
 *   --source    Data sources (tmdb,wikidata,youtube,news) [default: all]
 *   --target    What to update (reviews,celebrities,movies,all) [default: all]
 *   --mode      Update mode (append,update,smart) [default: smart]
 *   --dry-run   Preview changes without writing
 *   --limit     Max records per source
 *   --force-ai  Force AI enrichment even if data exists
 *   --verbose   Show detailed logs
 */

// CRITICAL: Load environment variables BEFORE any other imports
// This ensures all modules see the env vars when they load
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { parseArgs } from 'util';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Source fetchers
import { fetchFromTMDB } from './sources/tmdb';
import { fetchFromWikidata } from './sources/wikidata';
import { fetchFromYouTube } from './sources/youtube';
import { fetchFromNews } from './sources/news';
import { fetchExistingRecords } from './sources/internal';

// Core services
import { AIEnricher } from './ai-enricher';
import { UpdateEngine, UpdateMode } from './update-engine';
import { DatabaseWriter } from './db-writer';
import { Deduplicator } from './deduplicator';

// Types
import type { RawEntity, EnrichedEntity, SyncResult, CLIOptions } from './types';

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

function parseCliArgs(): CLIOptions {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: 'all' },
      target: { type: 'string', default: 'all' },
      mode: { type: 'string', default: 'smart' },
      'dry-run': { type: 'boolean', default: false },
      limit: { type: 'string', default: '100' },
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

  return {
    sources: values.source === 'all'
      ? ['tmdb', 'wikidata', 'youtube', 'news']
      : (values.source as string).split(','),
    targets: values.target === 'all'
      ? ['celebrities', 'movies', 'reviews']
      : (values.target as string).split(','),
    mode: (values.mode as UpdateMode) || 'smart',
    dryRun: values['dry-run'] || false,
    limit: parseInt(values.limit as string) || 100,
    forceAI: values['force-ai'] || false,
    verbose: values.verbose || false,
  };
}

function printHelp(): void {
  console.log(`
${chalk.bold.cyan('🧠 Intelligence Sync CLI')}

${chalk.bold('Usage:')}
  pnpm intelligence:sync [options]

${chalk.bold('Options:')}
  --source=<sources>    Data sources to fetch from
                        Values: tmdb, wikidata, youtube, news, all
                        Default: all

  --target=<targets>    What to update in database
                        Values: celebrities, movies, reviews, all
                        Default: all

  --mode=<mode>         Update strategy
                        append  → Insert only new records
                        update  → Overwrite existing records
                        smart   → Only update missing/weak fields (DEFAULT)

  --dry-run             Preview changes without writing to database

  --limit=<number>      Maximum records per source (default: 100)

  --force-ai            Force AI enrichment even if data exists

  --verbose             Show detailed processing logs

${chalk.bold('Examples:')}
  ${chalk.dim('# Full sync with smart updates')}
  pnpm intelligence:sync

  ${chalk.dim('# Sync only celebrities from TMDB')}
  pnpm intelligence:sync --source=tmdb --target=celebrities

  ${chalk.dim('# Preview what would be updated')}
  pnpm intelligence:sync --dry-run --limit=10

  ${chalk.dim('# Force refresh all movie data')}
  pnpm intelligence:sync --target=movies --mode=update --force-ai
`);
}

// ============================================================
// MAIN SYNC PIPELINE
// ============================================================

class IntelligenceSync {
  private supabase: SupabaseClient;
  private options: CLIOptions;
  private enricher: AIEnricher;
  private updateEngine: UpdateEngine;
  private dbWriter: DatabaseWriter;
  private deduplicator: Deduplicator;

  private stats: SyncResult = {
    fetched: 0,
    enriched: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  constructor(options: CLIOptions) {
    this.options = options;

    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize services
    this.enricher = new AIEnricher({
      forceEnrich: options.forceAI,
      verbose: options.verbose,
    });

    this.updateEngine = new UpdateEngine({
      mode: options.mode,
      verbose: options.verbose,
    });

    this.dbWriter = new DatabaseWriter(this.supabase, {
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    this.deduplicator = new Deduplicator(this.supabase);
  }

  async run(): Promise<SyncResult> {
    console.log(chalk.bold.cyan('\n🧠 Intelligence Sync Starting...\n'));
    console.log(chalk.dim(`Mode: ${this.options.mode}`));
    console.log(chalk.dim(`Sources: ${this.options.sources.join(', ')}`));
    console.log(chalk.dim(`Targets: ${this.options.targets.join(', ')}`));
    console.log(chalk.dim(`Limit: ${this.options.limit}`));
    if (this.options.dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No changes will be made\n'));
    }
    console.log();

    try {
      // Step 1: Fetch raw data from all sources
      const rawEntities = await this.fetchAllSources();
      this.stats.fetched = rawEntities.length;
      this.log(`📥 Fetched ${rawEntities.length} raw entities`);

      // Step 2: Deduplicate entities
      const uniqueEntities = await this.deduplicator.deduplicate(rawEntities);
      this.log(`🔍 ${uniqueEntities.length} unique entities after deduplication`);

      // Step 3: Enrich with AI
      const enrichedEntities = await this.enrichAll(uniqueEntities);
      this.stats.enriched = enrichedEntities.length;
      this.log(`🤖 ${enrichedEntities.length} entities enriched via AI`);

      // Step 4: Process updates
      await this.processUpdates(enrichedEntities);

      // Print final summary
      this.printSummary();

      return this.stats;
    } catch (error) {
      console.error(chalk.red('\n❌ Sync failed:'), error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Fetch data from all configured sources
   */
  private async fetchAllSources(): Promise<RawEntity[]> {
    const allEntities: RawEntity[] = [];

    for (const source of this.options.sources) {
      this.log(`\n📡 Fetching from ${source.toUpperCase()}...`);

      try {
        let entities: RawEntity[] = [];

        switch (source) {
          case 'tmdb':
            entities = await fetchFromTMDB(this.options.limit, this.options.targets);
            break;
          case 'wikidata':
            entities = await fetchFromWikidata(this.options.limit, this.options.targets);
            break;
          case 'youtube':
            entities = await fetchFromYouTube(this.options.limit);
            break;
          case 'news':
            entities = await fetchFromNews(this.options.limit);
            break;
          default:
            this.log(chalk.yellow(`  Unknown source: ${source}`));
        }

        this.log(`  ✓ ${entities.length} entities from ${source}`);
        allEntities.push(...entities);
      } catch (error) {
        this.log(chalk.red(`  ✗ Failed to fetch from ${source}: ${error}`));
        this.stats.errors++;
      }
    }

    // Also fetch existing records for comparison
    const existingRecords = await fetchExistingRecords(
      this.supabase,
      this.options.targets
    );
    this.log(`\n📦 ${existingRecords.length} existing records loaded for comparison`);

    return allEntities;
  }

  /**
   * Enrich all entities with AI
   * Batched to respect rate limits
   */
  private async enrichAll(entities: RawEntity[]): Promise<EnrichedEntity[]> {
    const enriched: EnrichedEntity[] = [];
    const batchSize = 5; // Process 5 at a time to avoid rate limits

    this.log(`\n🤖 AI Enrichment (${entities.length} entities)...`);

    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);

      const enrichedBatch = await Promise.all(
        batch.map(entity => this.enricher.enrich(entity))
      );

      enriched.push(...enrichedBatch.filter((e): e is EnrichedEntity => e !== null));

      // Progress indicator
      const progress = Math.min(i + batchSize, entities.length);
      process.stdout.write(`\r  Processing: ${progress}/${entities.length}`);

      // Small delay between batches to respect rate limits
      if (i + batchSize < entities.length) {
        await this.delay(500);
      }
    }

    console.log(); // New line after progress
    return enriched;
  }

  /**
   * Process updates using the update engine
   */
  private async processUpdates(entities: EnrichedEntity[]): Promise<void> {
    this.log(`\n📝 Processing updates (${this.options.mode} mode)...`);

    for (const entity of entities) {
      try {
        // Get update decision from engine
        const decision = await this.updateEngine.decide(
          entity,
          this.supabase
        );

        if (decision.action === 'skip') {
          this.stats.skipped++;
          if (this.options.verbose) {
            this.log(chalk.dim(`  ⏭ Skipped: ${entity.name_en} (${decision.reason})`));
          }
          continue;
        }

        // Write to database
        const result = await this.dbWriter.write(entity, decision);

        if (result.success) {
          this.stats.updated++;
          if (this.options.verbose) {
            this.log(chalk.green(`  ✓ ${result.action}: ${entity.name_en}`));
          }
        } else {
          this.stats.errors++;
          this.log(chalk.red(`  ✗ Failed: ${entity.name_en} - ${result.error}`));
        }

        this.stats.details.push({
          name: entity.name_en,
          type: entity.entity_type,
          action: result.action,
          fields: decision.fieldsToUpdate,
        });
      } catch (error) {
        this.stats.errors++;
        this.log(chalk.red(`  ✗ Error processing ${entity.name_en}: ${error}`));
      }
    }
  }

  /**
   * Print final summary
   */
  private printSummary(): void {
    console.log(chalk.bold.cyan('\n═══════════════════════════════════════'));
    console.log(chalk.bold.cyan('           SYNC COMPLETE'));
    console.log(chalk.bold.cyan('═══════════════════════════════════════\n'));

    console.log(`${chalk.green('✔')} ${this.stats.fetched} entities fetched`);
    console.log(`${chalk.green('✔')} ${this.stats.enriched} enriched via AI`);
    console.log(`${chalk.green('✔')} ${this.stats.updated} ${this.options.dryRun ? 'would be updated' : 'updated'} (${this.options.mode} mode)`);
    console.log(`${chalk.yellow('⚠')} ${this.stats.skipped} skipped (already complete)`);

    if (this.stats.errors > 0) {
      console.log(`${chalk.red('❌')} ${this.stats.errors} failed (see logs)`);
    }

    if (this.options.dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No actual changes were made'));
      console.log(chalk.dim('   Remove --dry-run flag to apply changes'));
    }

    console.log();
  }

  private log(message: string): void {
    console.log(message);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function main(): Promise<void> {
  // Environment variables are already loaded at the top of the file

  // Validate required env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    console.error(chalk.dim('   NEXT_PUBLIC_SUPABASE_URL'));
    console.error(chalk.dim('   SUPABASE_SERVICE_ROLE_KEY'));
    process.exit(1);
  }

  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error(chalk.red('❌ Missing AI API key:'));
    console.error(chalk.dim('   Set either GROQ_API_KEY or GEMINI_API_KEY'));
    process.exit(1);
  }

  // Parse CLI arguments
  const options = parseCliArgs();

  // Run sync
  const sync = new IntelligenceSync(options);

  try {
    await sync.run();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

// Run if called directly
main();
