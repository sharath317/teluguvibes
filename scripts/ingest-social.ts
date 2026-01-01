#!/usr/bin/env npx tsx
/**
 * Social Handle Ingestion CLI
 * 
 * Fetches and stores social media handles from trusted sources.
 * NO SCRAPING - Uses only Wikidata, Wikipedia, and TMDB APIs.
 * 
 * Usage:
 *   pnpm run ingest:social --source=wikidata,wikipedia,tmdb
 *   pnpm run ingest:social --dry
 *   pnpm run ingest:social --celebrity="Rashmika Mandanna"
 *   pnpm run ingest:social --update
 *   pnpm run ingest:social --confidence=0.7
 * 
 * Flags:
 *   --source        Comma-separated sources: wikidata,wikipedia,tmdb (default: all)
 *   --dry           Preview only, no database writes
 *   --celebrity     Process single celebrity by name
 *   --update        Overwrite existing handles if confidence improves
 *   --confidence    Minimum confidence threshold (default: 0.6)
 *   --limit         Maximum celebrities to process (default: 100)
 *   --help          Show this help message
 */

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  unifiedSocialFetcher,
  wikidataSocialAdapter,
  processAndValidateHandles,
  determineVerificationMethod,
  type SocialHandle,
  type SocialFetchResult,
  type ConfidenceResult,
} from '../lib/social';

// Lazy initialize Supabase (only when needed)
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      console.error('❌ Missing environment variables:');
      if (!url) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
      if (!key) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
      console.error('\nMake sure .env.local is configured.');
      process.exit(1);
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

// Parse CLI arguments
function parseArgs(): {
  sources: string[];
  dry: boolean;
  celebrity?: string;
  update: boolean;
  confidence: number;
  limit: number;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    sources: ['wikidata', 'wikipedia', 'tmdb'],
    dry: false,
    celebrity: undefined as string | undefined,
    update: false,
    confidence: 0.6,
    limit: 100,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--dry') {
      result.dry = true;
    } else if (arg === '--update') {
      result.update = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg.startsWith('--source=')) {
      result.sources = arg.replace('--source=', '').split(',');
    } else if (arg.startsWith('--celebrity=')) {
      result.celebrity = arg.replace('--celebrity=', '');
    } else if (arg.startsWith('--confidence=')) {
      result.confidence = parseFloat(arg.replace('--confidence=', ''));
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.replace('--limit=', ''), 10);
    }
  }

  return result;
}

// Show help
function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              SOCIAL HANDLE INGESTION CLI                         ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
  pnpm run ingest:social [options]

Options:
  --source=...       Comma-separated sources: wikidata,wikipedia,tmdb
                     Default: all sources

  --dry              Preview mode - no database writes
                     Shows what would be added/updated

  --celebrity=NAME   Process single celebrity by name
                     Example: --celebrity="Rashmika Mandanna"

  --update           Overwrite existing handles if confidence improves
                     Without this, existing handles are skipped

  --confidence=N     Minimum confidence threshold (0.0-1.0)
                     Default: 0.6 (60%)

  --limit=N          Maximum celebrities to process
                     Default: 100

  --help             Show this help message

Examples:
  # Preview all Telugu celebrities
  pnpm run ingest:social --dry

  # Ingest from Wikidata only
  pnpm run ingest:social --source=wikidata

  # Update single celebrity
  pnpm run ingest:social --celebrity="Samantha Ruth Prabhu" --update

  # High confidence only
  pnpm run ingest:social --confidence=0.8 --limit=50

Legal:
  ✓ Uses only Wikidata, Wikipedia, TMDB APIs
  ✓ NO scraping of social media platforms
  ✓ Stores metadata only (handles, URLs)
  ✓ Respects rate limits
`);
}

// Fetch celebrities from database
async function fetchCelebrities(options: {
  celebrity?: string;
  limit: number;
}): Promise<Array<{
  id: string;
  name_en: string;
  wikidata_id?: string;
  tmdb_id?: number;
}>> {
  let query = getSupabase()
    .from('celebrities')
    .select('id, name_en, wikidata_id, tmdb_id')
    .eq('is_active', true);

  if (options.celebrity) {
    query = query.ilike('name_en', `%${options.celebrity}%`);
  }

  const { data, error } = await query.limit(options.limit);

  if (error) {
    console.error('Error fetching celebrities:', error);
    return [];
  }

  return data || [];
}

// Check if handle is blocked
async function isHandleBlocked(platform: string, handle: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('social_blocked_handles')
    .select('id')
    .eq('platform', platform)
    .eq('handle', handle)
    .single();

  return !!data;
}

// Check if handle exists
async function getExistingHandle(
  celebrity_id: string,
  platform: string,
  handle: string
): Promise<{ id: string; confidence_score: number } | null> {
  const { data } = await getSupabase()
    .from('celebrity_social_profiles')
    .select('id, confidence_score')
    .eq('celebrity_id', celebrity_id)
    .eq('platform', platform)
    .eq('handle', handle)
    .single();

  return data;
}

// Save or update handle
async function saveHandle(
  celebrity_id: string,
  handle: ConfidenceResult,
  options: { update: boolean }
): Promise<'added' | 'updated' | 'skipped' | 'rejected' | 'blocked'> {
  // Check if blocked
  const blocked = await isHandleBlocked(handle.handle.platform, handle.handle.handle);
  if (blocked) {
    return 'blocked';
  }

  // Check if exists
  const existing = await getExistingHandle(
    celebrity_id,
    handle.handle.platform,
    handle.handle.handle
  );

  if (existing) {
    if (options.update && handle.final_score > existing.confidence_score) {
      // Update with better confidence
      const { error } = await getSupabase()
        .from('celebrity_social_profiles')
        .update({
          confidence_score: handle.final_score,
          verified: handle.status === 'VERIFIED',
          verification_method: determineVerificationMethod(
            [handle.handle.source],
            handle.final_score
          ),
          last_checked: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      return error ? 'skipped' : 'updated';
    }
    return 'skipped';
  }

  // Insert new
  const { error } = await getSupabase()
    .from('celebrity_social_profiles')
    .insert({
      celebrity_id,
      platform: handle.handle.platform,
      handle: handle.handle.handle,
      profile_url: handle.handle.profile_url,
      source: handle.handle.source,
      confidence_score: handle.final_score,
      verified: handle.status === 'VERIFIED',
      verification_method: determineVerificationMethod(
        [handle.handle.source],
        handle.final_score
      ),
      is_active: true,
      is_official: handle.final_score >= 0.8,
      metadata: handle.handle.metadata || {},
    });

  return error ? 'rejected' : 'added';
}

// Log ingestion run
async function createIngestionLog(
  source: string,
  runType: string
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('social_ingestion_log')
    .insert({
      source,
      run_type: runType,
      status: 'running',
    })
    .select('id')
    .single();

  return error ? null : data?.id;
}

// Update ingestion log
async function updateIngestionLog(
  logId: string,
  stats: {
    total_celebrities_processed: number;
    handles_added: number;
    handles_updated: number;
    handles_skipped: number;
    handles_rejected: number;
    error_count: number;
    error_details: string[];
  },
  status: 'completed' | 'failed'
): Promise<void> {
  await getSupabase()
    .from('social_ingestion_log')
    .update({
      ...stats,
      status,
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round((Date.now() - Date.now()) / 1000),
    })
    .eq('id', logId);
}

// Main ingestion function
async function runIngestion(options: ReturnType<typeof parseArgs>): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              SOCIAL HANDLE INGESTION CLI                         ║
║              Mode: ${options.dry ? 'DRY RUN' : 'LIVE'}                                      ║
╚══════════════════════════════════════════════════════════════════╝
`);

  console.log(`Sources: ${options.sources.join(', ')}`);
  console.log(`Confidence threshold: ${options.confidence}`);
  console.log(`Update existing: ${options.update}`);
  if (options.celebrity) {
    console.log(`Celebrity filter: ${options.celebrity}`);
  }
  console.log('');

  // Fetch celebrities
  console.log('📋 Fetching celebrities from database...');
  const celebrities = await fetchCelebrities({
    celebrity: options.celebrity,
    limit: options.limit,
  });

  if (celebrities.length === 0) {
    console.log('❌ No celebrities found');
    return;
  }

  console.log(`✅ Found ${celebrities.length} celebrities\n`);

  // Create log entry (unless dry run)
  let logId: string | null = null;
  if (!options.dry) {
    logId = await createIngestionLog(
      options.sources.join(','),
      options.celebrity ? 'single' : 'full'
    );
  }

  // Stats
  const stats = {
    total_celebrities_processed: 0,
    handles_added: 0,
    handles_updated: 0,
    handles_skipped: 0,
    handles_rejected: 0,
    handles_blocked: 0,
    error_count: 0,
    error_details: [] as string[],
  };

  // Process each celebrity
  for (let i = 0; i < celebrities.length; i++) {
    const celeb = celebrities[i];
    console.log(`\n[${i + 1}/${celebrities.length}] ${celeb.name_en}`);
    console.log('━'.repeat(50));

    stats.total_celebrities_processed++;

    try {
      // Fetch social handles
      const result = await unifiedSocialFetcher.fetchAll({
        celebrity_name: celeb.name_en,
        wikidata_id: celeb.wikidata_id,
        tmdb_id: celeb.tmdb_id,
      });

      // Validate and filter
      const { valid, rejected } = processAndValidateHandles(result);

      // Filter by confidence threshold
      const qualified = valid.filter(h => h.final_score >= options.confidence);

      console.log(`   Found ${result.handles.length} handles`);
      console.log(`   Qualified: ${qualified.length} | Rejected: ${rejected.length}`);

      if (qualified.length === 0) {
        console.log('   ⚠️  No handles above confidence threshold');
        continue;
      }

      // Save or preview
      for (const handle of qualified) {
        const statusIcon = {
          VERIFIED: '✓',
          PROBABLE: '?',
          NEEDS_REVIEW: '!',
          REJECTED: '✗',
        }[handle.status];

        const displayStr = `   ${statusIcon} ${handle.handle.platform}: @${handle.handle.handle} (${Math.round(handle.final_score * 100)}%)`;

        if (options.dry) {
          console.log(`${displayStr} [PREVIEW]`);
          stats.handles_added++;
        } else {
          const saveResult = await saveHandle(celeb.id, handle, { update: options.update });
          const resultIcon = {
            added: '✅',
            updated: '🔄',
            skipped: '⏭️',
            rejected: '❌',
            blocked: '🚫',
          }[saveResult];

          console.log(`${displayStr} ${resultIcon}`);

          switch (saveResult) {
            case 'added':
              stats.handles_added++;
              break;
            case 'updated':
              stats.handles_updated++;
              break;
            case 'skipped':
              stats.handles_skipped++;
              break;
            case 'rejected':
              stats.handles_rejected++;
              break;
            case 'blocked':
              stats.handles_blocked++;
              break;
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Error: ${errorMsg}`);
      stats.error_count++;
      stats.error_details.push(`${celeb.name_en}: ${errorMsg}`);
    }

    // Rate limiting between celebrities
    if (i < celebrities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Summary
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 INGESTION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Celebrities processed: ${stats.total_celebrities_processed}`);
  console.log(`Handles added:         ${stats.handles_added}`);
  console.log(`Handles updated:       ${stats.handles_updated}`);
  console.log(`Handles skipped:       ${stats.handles_skipped}`);
  console.log(`Handles rejected:      ${stats.handles_rejected}`);
  console.log(`Handles blocked:       ${stats.handles_blocked}`);
  console.log(`Errors:                ${stats.error_count}`);
  console.log('═'.repeat(60));

  if (options.dry) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database\n');
  }

  // Update log
  if (logId && !options.dry) {
    await updateIngestionLog(logId, {
      ...stats,
      handles_rejected: stats.handles_rejected + stats.handles_blocked,
    }, stats.error_count > 0 ? 'failed' : 'completed');
  }
}

// Run
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await runIngestion(options);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

