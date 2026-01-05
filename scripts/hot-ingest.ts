#!/usr/bin/env npx tsx
/**
 * Hot Content Ingestion CLI
 * 
 * Usage:
 *   pnpm hot:ingest --dry          # Preview what would be ingested (no DB writes)
 *   pnpm hot:ingest --smart        # Preserve high performers, replace weak content
 *   pnpm hot:ingest --full         # Full ingestion with all sources
 *   pnpm hot:ingest --refresh      # Refresh stale metadata only
 *   pnpm hot:ingest --help         # Show help
 * 
 * Options:
 *   --limit=N         Number of celebrities to process (default: 20)
 *   --categories=a,b  Comma-separated categories to include
 *   --type=actress    Entity type filter (actress|anchor|model|influencer)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  batchFetchMetadata,
  saveCelebrityMetadata,
  refreshStaleMetadata,
  getTopTrendingCelebrities,
  CELEBRITY_SOCIAL_DATA,
} from '../lib/hot/source-engine';
import { runAutoPipeline, quickPipelineRun } from '../lib/hot-media/auto-pipeline';
import { getDiscoveryRecommendations, updateTrendingScores } from '../lib/hot-media/learning-service';

dotenv.config({ path: '.env.local' });

// Parse CLI arguments
function parseArgs(): {
  mode: 'dry' | 'smart' | 'full' | 'refresh' | 'reset' | 'help';
  limit: number;
  categories: string[];
  entityType: 'actress' | 'anchor' | 'model' | 'influencer';
  confirm: boolean;
} {
  const args = process.argv.slice(2);
  
  let mode: 'dry' | 'smart' | 'full' | 'refresh' | 'reset' | 'help' = 'full';
  let limit = 20;
  let categories: string[] = [];
  let entityType: 'actress' | 'anchor' | 'model' | 'influencer' = 'actress';
  let confirm = false;
  
  for (const arg of args) {
    if (arg === '--dry') mode = 'dry';
    else if (arg === '--smart') mode = 'smart';
    else if (arg === '--full') mode = 'full';
    else if (arg === '--refresh') mode = 'refresh';
    else if (arg === '--reset') mode = 'reset';
    else if (arg === '--help' || arg === '-h') mode = 'help';
    else if (arg === '--confirm') confirm = true;
    else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10) || 20;
    }
    else if (arg.startsWith('--categories=')) {
      categories = arg.split('=')[1].split(',');
    }
    else if (arg.startsWith('--type=')) {
      entityType = arg.split('=')[1] as any;
    }
  }
  
  return { mode, limit, categories, entityType, confirm };
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              HOT CONTENT INGESTION CLI                           ║
╚══════════════════════════════════════════════════════════════════╝

USAGE:
  pnpm hot:ingest [MODE] [OPTIONS]

MODES:
  --dry           Preview what would be ingested (no database writes)
                  Shows metadata that would be fetched from all sources

  --smart         Smart ingestion mode
                  - Preserves high-performing content
                  - Replaces weak content/images
                  - Uses learning insights for prioritization

  --full          Full ingestion (default)
                  - Fetches from all sources
                  - Creates new content entries
                  - Updates existing metadata

  --refresh       Refresh stale metadata only
                  - Updates celebrities not seen in 24+ hours
                  - No new content creation

  --reset         Reset all hot content (DANGEROUS)
                  - Requires --confirm flag
                  - Archives existing content
                  - Rebuilds from scratch

OPTIONS:
  --limit=N             Number of celebrities to process (default: 20)
  --categories=a,b,c    Filter by categories (comma-separated)
                        Categories: photoshoot, fashion, traditional, western,
                                   fitness, reels, events, beach
  --type=TYPE           Entity type filter
                        Types: actress, anchor, model, influencer
  --confirm             Required for destructive operations

EXAMPLES:
  pnpm hot:ingest --dry --limit=5
    Preview ingestion for 5 celebrities

  pnpm hot:ingest --smart --type=anchor
    Smart ingestion for anchors only

  pnpm hot:ingest --refresh
    Update stale celebrity metadata

  pnpm hot:ingest --reset --confirm
    Reset and rebuild all hot content (use with caution!)

SOURCES:
  ✓ TMDB          - Celebrity profiles, tagged images, movie backdrops
  ✓ Wikipedia     - Profile images, biographical data
  ✓ Wikimedia     - CC-licensed event photos
  ✓ Google Trends - Trending signals (simulated)
  ✓ Instagram     - oEmbed only (no scraping)
  ✓ YouTube       - oEmbed only (no scraping)

`);
}

async function runDryMode(
  supabase: ReturnType<typeof createClient>,
  limit: number,
  entityType: string
): Promise<void> {
  console.log('\n🧪 DRY RUN MODE - No database writes\n');
  console.log('━'.repeat(50));
  
  // Get celebrities to process
  const { data: entities } = await supabase
    .from('media_entities')
    .select('name_en, entity_type, popularity_score')
    .eq('entity_type', entityType)
    .order('popularity_score', { ascending: false })
    .limit(limit);
  
  const celebrities = entities?.map(e => e.name_en) || Object.keys(CELEBRITY_SOCIAL_DATA).slice(0, limit);
  
  console.log(`\nWould process ${celebrities.length} celebrities:\n`);
  
  // Fetch metadata (but don't save)
  const results = await batchFetchMetadata(celebrities, { entityType: entityType as any });
  
  console.log('\n📊 DRY RUN SUMMARY');
  console.log('━'.repeat(50));
  
  let totalImages = 0;
  let totalTrends = 0;
  
  for (const result of results) {
    const imageCount = result.celebrity.image_sources.length;
    const trendCount = result.celebrity.trending_keywords?.length || 0;
    totalImages += imageCount;
    totalTrends += trendCount;
    
    console.log(`
${result.success ? '✅' : '❌'} ${result.celebrity.name_en}
   Popularity: ${result.celebrity.popularity_score}
   Images: ${imageCount} from ${result.sources_checked.join(', ')}
   Trends: ${trendCount}
   ${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}`);
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log(`Total celebrities: ${results.length}`);
  console.log(`Total image sources: ${totalImages}`);
  console.log(`Total trend signals: ${totalTrends}`);
  console.log(`Success rate: ${Math.round(results.filter(r => r.success).length / results.length * 100)}%`);
  console.log('\n⚠️  DRY RUN - No changes were made to the database\n');
}

async function runSmartMode(
  supabase: ReturnType<typeof createClient>,
  limit: number,
  categories: string[]
): Promise<void> {
  console.log('\n🧠 SMART INGESTION MODE\n');
  console.log('━'.repeat(50));
  
  // Get recommendations from learning service
  const recommendations = await getDiscoveryRecommendations(supabase);
  
  console.log('\n📊 Learning Insights:');
  console.log(`   Priority celebrities: ${recommendations.priorityCelebrities.length}`);
  console.log(`   Recommended categories: ${recommendations.recommendedCategories.join(', ')}`);
  
  if (recommendations.insights.length > 0) {
    console.log('\n   Insights:');
    for (const insight of recommendations.insights.slice(0, 5)) {
      console.log(`   ${insight.trend === 'up' ? '📈' : insight.trend === 'down' ? '📉' : '➡️'} ${insight.recommendation}`);
    }
  }
  
  // Run auto pipeline with smart settings
  const result = await runAutoPipeline({
    maxNewItems: limit,
    autoPublishThreshold: 80, // Higher threshold for smart mode
    requireReview: false,
    categories: categories.length > 0 
      ? categories 
      : recommendations.recommendedCategories,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
  
  console.log('\n✅ Smart Ingestion Complete');
  console.log(`   Discovered: ${result.discovered}`);
  console.log(`   Validated: ${result.validated}`);
  console.log(`   Auto-published: ${result.autoPublished}`);
  console.log(`   Queued for review: ${result.queuedForReview}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${result.errors.length}`);
    result.errors.slice(0, 3).forEach(e => console.log(`   - ${e}`));
  }
}

async function runFullMode(
  supabase: ReturnType<typeof createClient>,
  limit: number,
  categories: string[],
  entityType: string
): Promise<void> {
  console.log('\n🚀 FULL INGESTION MODE\n');
  console.log('━'.repeat(50));
  
  // Step 1: Refresh celebrity metadata
  console.log('\n📡 Step 1: Fetching celebrity metadata...\n');
  
  const { data: entities } = await supabase
    .from('media_entities')
    .select('name_en, entity_type')
    .eq('entity_type', entityType)
    .order('popularity_score', { ascending: false })
    .limit(limit);
  
  const celebrities = entities?.map(e => e.name_en) || Object.keys(CELEBRITY_SOCIAL_DATA).slice(0, limit);
  
  const metadataResults = await batchFetchMetadata(celebrities, { entityType: entityType as any });
  
  // Save metadata
  let savedCount = 0;
  for (const result of metadataResults) {
    if (result.success) {
      const saveResult = await saveCelebrityMetadata(supabase, result.celebrity);
      if (saveResult.success) savedCount++;
    }
  }
  
  console.log(`\n   ✅ Saved metadata for ${savedCount}/${metadataResults.length} celebrities`);
  
  // Step 2: Run content pipeline
  console.log('\n📸 Step 2: Running content pipeline...\n');
  
  const pipelineResult = await quickPipelineRun(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    limit * 3 // More content items than celebrities
  );
  
  // Step 3: Update trending scores
  console.log('\n📈 Step 3: Updating trending scores...\n');
  
  const updatedScores = await updateTrendingScores(supabase);
  console.log(`   Updated ${updatedScores} trending scores`);
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 FULL INGESTION SUMMARY');
  console.log('═'.repeat(50));
  console.log(`   Celebrities processed: ${metadataResults.length}`);
  console.log(`   Metadata saved: ${savedCount}`);
  console.log(`   Content discovered: ${pipelineResult.discovered}`);
  console.log(`   Content validated: ${pipelineResult.validated}`);
  console.log(`   Auto-published: ${pipelineResult.autoPublished}`);
  console.log(`   Queued for review: ${pipelineResult.queuedForReview}`);
  console.log(`   Blocked: ${pipelineResult.blocked}`);
  console.log('═'.repeat(50));
}

async function runRefreshMode(supabase: ReturnType<typeof createClient>, limit: number): Promise<void> {
  console.log('\n🔄 REFRESH MODE - Updating stale metadata\n');
  console.log('━'.repeat(50));
  
  const results = await refreshStaleMetadata(supabase, 24, limit);
  
  console.log(`\n✅ Refreshed ${results.filter(r => r.success).length}/${results.length} celebrities`);
}

async function runResetMode(supabase: ReturnType<typeof createClient>, confirm: boolean): Promise<void> {
  if (!confirm) {
    console.log('\n⚠️  RESET MODE requires --confirm flag');
    console.log('   This will archive all existing hot content and rebuild from scratch.');
    console.log('   Run: pnpm hot:ingest --reset --confirm\n');
    return;
  }
  
  console.log('\n🔴 RESET MODE - Archiving and rebuilding\n');
  console.log('━'.repeat(50));
  
  // Archive existing content
  console.log('\n📦 Step 1: Archiving existing content...');
  
  const { data: existing, error: countError } = await supabase
    .from('hot_media')
    .select('id', { count: 'exact' });
  
  if (countError) {
    console.error('Error counting existing content:', countError);
    return;
  }
  
  const existingCount = existing?.length || 0;
  console.log(`   Found ${existingCount} existing items`);
  
  // Update status to archived
  const { error: archiveError } = await supabase
    .from('hot_media')
    .update({ status: 'archived' })
    .neq('status', 'archived');
  
  if (archiveError) {
    console.error('Error archiving content:', archiveError);
    return;
  }
  
  console.log(`   ✅ Archived ${existingCount} items`);
  
  // Run fresh ingestion
  console.log('\n🚀 Step 2: Running fresh ingestion...\n');
  
  const result = await quickPipelineRun(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    50 // Fresh batch
  );
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 RESET SUMMARY');
  console.log('═'.repeat(50));
  console.log(`   Archived: ${existingCount} items`);
  console.log(`   New content: ${result.autoPublished + result.queuedForReview} items`);
  console.log('═'.repeat(50));
}

async function main(): Promise<void> {
  const { mode, limit, categories, entityType, confirm } = parseArgs();
  
  if (mode === 'help') {
    showHelp();
    return;
  }
  
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              HOT CONTENT INGESTION CLI                           ║
║              Mode: ${mode.toUpperCase().padEnd(44)}║
╚══════════════════════════════════════════════════════════════════╝`);
  
  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY\n');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const startTime = Date.now();
  
  switch (mode) {
    case 'dry':
      await runDryMode(supabase, limit, entityType);
      break;
    case 'smart':
      await runSmartMode(supabase, limit, categories);
      break;
    case 'full':
      await runFullMode(supabase, limit, categories, entityType);
      break;
    case 'refresh':
      await runRefreshMode(supabase, limit);
      break;
    case 'reset':
      await runResetMode(supabase, confirm);
      break;
  }
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n⏱️  Completed in ${duration}s\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});






