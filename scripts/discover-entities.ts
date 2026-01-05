#!/usr/bin/env npx tsx
/**
 * Entity Discovery CLI
 * 
 * Automatically discovers Telugu/Indian celebrities from Wikidata and TMDB.
 * NO scraping - metadata only.
 * 
 * Usage:
 *   pnpm run discover --dry          # Preview what would be discovered
 *   pnpm run discover --source=wikidata
 *   pnpm run discover --limit=50
 *   pnpm run discover --type=actress,anchor
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import {
  discoverEntities,
  saveDiscoveredEntities,
  type DiscoveredEntity,
} from '../lib/hot/entity-discovery';
import {
  buildHotCandidates,
  getTopHotCandidates,
  DEFAULT_RANKING_CONFIG,
} from '../lib/hot/ranking-engine';
import { unifiedSocialFetcher, processAndValidateHandles } from '../lib/social';

// Parse CLI arguments
function parseArgs(): {
  mode: 'discover' | 'rank' | 'full' | 'help';
  sources: ('wikidata' | 'tmdb')[];
  entityTypes: ('actress' | 'anchor' | 'model' | 'influencer')[];
  limit: number;
  dry: boolean;
  verbose: boolean;
} {
  const args = process.argv.slice(2);
  
  let mode: 'discover' | 'rank' | 'full' | 'help' = 'full';
  let sources: ('wikidata' | 'tmdb')[] = ['wikidata', 'tmdb'];
  let entityTypes: ('actress' | 'anchor' | 'model' | 'influencer')[] = ['actress'];
  let limit = 100;
  let dry = false;
  let verbose = false;
  
  for (const arg of args) {
    if (arg === '--dry') dry = true;
    else if (arg === '--verbose' || arg === '-v') verbose = true;
    else if (arg === '--help' || arg === '-h') mode = 'help';
    else if (arg === '--discover-only') mode = 'discover';
    else if (arg === '--rank-only') mode = 'rank';
    else if (arg.startsWith('--source=')) {
      sources = arg.split('=')[1].split(',') as any;
    }
    else if (arg.startsWith('--type=')) {
      entityTypes = arg.split('=')[1].split(',') as any;
    }
    else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10) || 100;
    }
  }
  
  return { mode, sources, entityTypes, limit, dry, verbose };
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ENTITY DISCOVERY CLI                                ║
╚══════════════════════════════════════════════════════════════════╝

DESCRIPTION:
  Automatically discovers Telugu/Indian celebrities from trusted sources.
  NO scraping - uses Wikidata SPARQL and TMDB APIs only.

USAGE:
  pnpm run discover [OPTIONS]

MODES:
  --discover-only  Only discover entities (no social handle resolution)
  --rank-only      Only calculate rankings for existing entities
  (default)        Full pipeline: discover → resolve socials → rank

OPTIONS:
  --source=...     Comma-separated sources: wikidata,tmdb
                   Default: wikidata,tmdb

  --type=...       Entity types to discover: actress,anchor,model,influencer
                   Default: actress

  --limit=N        Maximum entities to discover
                   Default: 100

  --dry            Preview mode - no database writes

  --verbose, -v    Show detailed logs

  --help, -h       Show this help

EXAMPLES:
  # Preview discovery
  pnpm run discover --dry

  # Discover from Wikidata only
  pnpm run discover --source=wikidata --limit=50

  # Discover actresses and anchors
  pnpm run discover --type=actress,anchor

  # Full pipeline with social resolution
  pnpm run discover --limit=30

OUTPUT:
  - Discovered entities saved to 'celebrities' table
  - Social handles saved to 'celebrity_social_profiles' table
  - Rankings calculated and displayed

LEGAL COMPLIANCE:
  ✓ Uses Wikidata SPARQL (public API)
  ✓ Uses TMDB API (requires API key)
  ✓ NO scraping of any social platforms
  ✓ Stores metadata only
`);
}

async function main() {
  const options = parseArgs();
  
  if (options.mode === 'help') {
    showHelp();
    process.exit(0);
  }
  
  // Initialize Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ENTITY DISCOVERY PIPELINE                           ║
║              Mode: ${options.dry ? 'DRY RUN' : 'LIVE'}                                        ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  console.log(`Sources: ${options.sources.join(', ')}`);
  console.log(`Entity types: ${options.entityTypes.join(', ')}`);
  console.log(`Limit: ${options.limit}`);
  console.log('');
  
  // STEP 1: Discover entities
  if (options.mode === 'discover' || options.mode === 'full') {
    console.log('━━━ STEP 1: ENTITY DISCOVERY ━━━\n');
    
    const discovery = await discoverEntities({
      limit: options.limit,
      entityTypes: options.entityTypes,
      sources: options.sources,
    });
    
    console.log(`\n📊 Discovery Results:`);
    console.log(`   Total found: ${discovery.total_found}`);
    console.log(`   Sources checked: ${discovery.sources_checked.join(', ')}`);
    
    if (discovery.errors.length > 0) {
      console.log(`   Errors: ${discovery.errors.length}`);
      for (const err of discovery.errors) {
        console.log(`     ⚠️ ${err}`);
      }
    }
    
    // Show top discoveries
    console.log(`\n📋 Top 10 Discovered Entities:`);
    for (let i = 0; i < Math.min(10, discovery.entities.length); i++) {
      const entity = discovery.entities[i];
      console.log(`   ${i + 1}. ${entity.name_en} (${entity.entity_type})`);
      console.log(`      Hot Score: ${entity.hot_score || 'N/A'} | Popularity: ${entity.popularity_score}`);
      if (entity.wikidata_id) console.log(`      Wikidata: ${entity.wikidata_id}`);
      if (entity.tmdb_id) console.log(`      TMDB: ${entity.tmdb_id}`);
    }
    
    // Save to database
    if (!options.dry && discovery.entities.length > 0) {
      console.log('\n💾 Saving to database...');
      const saveResult = await saveDiscoveredEntities(
        supabase,
        discovery.entities,
        { dryRun: false, updateExisting: true }
      );
      
      console.log(`   Added: ${saveResult.added}`);
      console.log(`   Updated: ${saveResult.updated}`);
      console.log(`   Skipped: ${saveResult.skipped}`);
      
      if (saveResult.errors.length > 0) {
        console.log(`   Errors: ${saveResult.errors.length}`);
      }
    }
  }
  
  // STEP 2: Resolve social handles
  if (options.mode === 'full' && !options.dry) {
    console.log('\n━━━ STEP 2: SOCIAL HANDLE RESOLUTION ━━━\n');
    
    // Fetch celebrities without social profiles
    const { data: celebsWithoutSocial } = await supabase
      .from('celebrities')
      .select('id, name_en, wikidata_id, tmdb_id')
      .eq('is_active', true)
      .order('popularity_score', { ascending: false })
      .limit(options.limit);
    
    if (!celebsWithoutSocial || celebsWithoutSocial.length === 0) {
      console.log('No celebrities to process');
    } else {
      console.log(`Processing ${celebsWithoutSocial.length} celebrities...\n`);
      
      let processed = 0;
      let handlesFound = 0;
      
      for (const celeb of celebsWithoutSocial) {
        // Check if already has profiles
        const { count } = await supabase
          .from('celebrity_social_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('celebrity_id', celeb.id);
        
        if ((count || 0) >= 2) {
          // Already has profiles
          continue;
        }
        
        console.log(`   🔍 ${celeb.name_en}...`);
        
        try {
          const result = await unifiedSocialFetcher.fetchAll({
            celebrity_name: celeb.name_en,
            wikidata_id: celeb.wikidata_id,
            tmdb_id: celeb.tmdb_id,
          });
          
          const { valid } = processAndValidateHandles(result);
          
          if (valid.length > 0) {
            console.log(`      ✅ Found ${valid.length} handles`);
            handlesFound += valid.length;
            
            // Save handles
            for (const handle of valid) {
              await supabase
                .from('celebrity_social_profiles')
                .upsert({
                  celebrity_id: celeb.id,
                  platform: handle.handle.platform,
                  handle: handle.handle.handle,
                  profile_url: handle.handle.profile_url,
                  source: handle.handle.source,
                  confidence_score: handle.final_score,
                  verified: handle.status === 'VERIFIED',
                  is_active: true,
                }, {
                  onConflict: 'celebrity_id,platform,handle',
                });
            }
          } else {
            console.log(`      ⚠️ No handles found`);
          }
        } catch (error) {
          console.log(`      ❌ Error: ${error}`);
        }
        
        processed++;
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
        
        if (processed >= 20) break; // Limit per run
      }
      
      console.log(`\n   Processed: ${processed} | Handles found: ${handlesFound}`);
    }
  }
  
  // STEP 3: Calculate rankings
  if (options.mode === 'rank' || options.mode === 'full') {
    console.log('\n━━━ STEP 3: RANKING CALCULATION ━━━\n');
    
    const candidates = await getTopHotCandidates(
      supabase,
      20,
      DEFAULT_RANKING_CONFIG
    );
    
    console.log(`📊 Top Hot Glamour Candidates:\n`);
    console.log('┌────┬────────────────────────────────┬───────┬──────────────┬───────────┐');
    console.log('│ #  │ Celebrity                      │ Score │ Platform     │ Status    │');
    console.log('├────┼────────────────────────────────┼───────┼──────────────┼───────────┤');
    
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const name = c.celebrity_name.padEnd(30).substring(0, 30);
      const score = c.hot_score.toFixed(1).padStart(5);
      const platform = (c.primary_platform || 'none').padEnd(12);
      const status = c.is_eligible ? '✅ Eligible' : '⚠️ Review ';
      
      console.log(`│ ${String(i + 1).padStart(2)} │ ${name} │ ${score} │ ${platform} │ ${status} │`);
    }
    
    console.log('└────┴────────────────────────────────┴───────┴──────────────┴───────────┘');
    
    // Show ineligibility reasons if verbose
    if (options.verbose) {
      const ineligible = candidates.filter(c => !c.is_eligible);
      if (ineligible.length > 0) {
        console.log('\n⚠️ Ineligibility Reasons:');
        for (const c of ineligible) {
          console.log(`   ${c.celebrity_name}:`);
          for (const reason of c.ineligibility_reasons) {
            console.log(`     - ${reason}`);
          }
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Discovery pipeline completed');
  if (options.dry) {
    console.log('⚠️  DRY RUN - No changes were made');
  }
  console.log('═'.repeat(60));
}

main().catch(console.error);






