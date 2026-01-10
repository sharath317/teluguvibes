/**
 * BACKFILL SCRIPT: Visual Confidence
 * 
 * Calculates and stores visual confidence scores for all movies.
 * 
 * This script:
 * 1. Fetches all movies with poster data
 * 2. Calculates visual confidence using the tier system
 * 3. Generates archive card data for movies needing it
 * 4. Updates the database with new visual intelligence fields
 * 
 * Usage:
 *   npx tsx scripts/backfill-visual-confidence.ts [--dry-run] [--limit N] [--validate-urls]
 * 
 * Options:
 *   --dry-run       Show what would be updated without making changes
 *   --limit N       Process only N movies
 *   --validate-urls Check if poster URLs are accessible (slower)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  calculateVisualConfidence,
  isPlaceholderUrl,
  needsArchiveCard,
} from '../lib/visual-intelligence/visual-confidence';
import { generateArchiveCardData } from '../lib/visual-intelligence/archive-card-generator';
import type { VisualType } from '../lib/visual-intelligence/types';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// CLI ARGUMENTS
// ============================================================

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const validateUrls = args.includes('--validate-urls');
const force = args.includes('--force');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;

// ============================================================
// MAIN BACKFILL FUNCTION
// ============================================================

interface BackfillResult {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  archiveCardsGenerated: number;
}

async function backfillVisualConfidence(): Promise<BackfillResult> {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('VISUAL CONFIDENCE BACKFILL');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Force re-process: ${force ? 'YES' : 'NO (skip existing)'}`);
  console.log(`URL Validation: ${validateUrls ? 'ENABLED' : 'DISABLED'}`);
  if (limit) console.log(`Limit: ${limit} movies`);
  console.log('');

  const result: BackfillResult = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    tier1Count: 0,
    tier2Count: 0,
    tier3Count: 0,
    archiveCardsGenerated: 0,
  };

  // Fetch movies with pagination to get all records
  let allMovies: any[] = [];
  const pageSize = 1000;
  let page = 0;
  
  console.log('Fetching all movies...');
  
  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('movies')
      .select('id, title_en, release_year, poster_url, hero, director, poster_confidence')
      .eq('is_published', true)
      .order('release_year', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) {
      console.error('Error fetching movies:', fetchError.message);
      break;
    }
    
    if (!batch || batch.length === 0) break;
    
    allMovies = allMovies.concat(batch);
    console.log(`  Fetched ${allMovies.length} movies...`);
    page++;
    
    if (batch.length < pageSize) break;
  }
  
  // Apply limit if specified
  const movies = limit ? allMovies.slice(0, limit) : allMovies;

  if (!movies || movies.length === 0) {
    console.error('❌ No movies found to process');
    return result;
  }

  result.total = movies.length;
  console.log(`📊 Found ${movies.length} movies to process\n`);

  // Process in batches
  const batchSize = 50;
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    
    for (const movie of batch) {
      try {
        result.processed++;

        // Skip if already has confidence and not forcing recalculation
        if (movie.poster_confidence !== null && !force) {
          result.skipped++;
          continue;
        }

        // Calculate visual confidence
        const confidenceResult = await calculateVisualConfidence({
          posterUrl: movie.poster_url,
          posterSource: null, // poster_source column doesn't exist in current schema
          releaseYear: movie.release_year,
          validateUrl: validateUrls,
        });

        // Count by tier
        if (confidenceResult.tier === 1) result.tier1Count++;
        else if (confidenceResult.tier === 2) result.tier2Count++;
        else result.tier3Count++;

        // Generate archive card if needed
        let archiveCardData = null;
        if (needsArchiveCard({
          posterUrl: movie.poster_url,
          posterSource: null,
          releaseYear: movie.release_year,
        })) {
          archiveCardData = generateArchiveCardData({
            id: movie.id,
            title_en: movie.title_en,
            release_year: movie.release_year,
            hero: movie.hero,
            director: movie.director,
            poster_url: movie.poster_url,
            poster_source: null,
          });
          if (archiveCardData) {
            result.archiveCardsGenerated++;
          }
        }

        // Prepare update data
        const updateData: any = {
          poster_confidence: confidenceResult.confidence,
          poster_visual_type: confidenceResult.visualType as VisualType,
          visual_verified_at: new Date().toISOString(),
          visual_verified_by: 'backfill_script_v1',
        };

        if (archiveCardData) {
          updateData.archive_card_data = archiveCardData;
        }

        // Log progress
        const tierLabel = `Tier ${confidenceResult.tier}`;
        const confLabel = `${Math.round(confidenceResult.confidence * 100)}%`;
        console.log(
          `${result.processed}/${movies.length} | ` +
          `${movie.release_year || '????'} | ` +
          `${movie.title_en.substring(0, 30).padEnd(30)} | ` +
          `${tierLabel} (${confLabel}) | ` +
          `${confidenceResult.visualType}`
        );

        // Update database (if not dry run)
        if (!isDryRun) {
          const { error: updateError } = await supabase
            .from('movies')
            .update(updateData)
            .eq('id', movie.id);

          if (updateError) {
            console.error(`  ❌ Update failed: ${updateError.message}`);
            result.errors++;
          } else {
            result.updated++;
          }
        } else {
          result.updated++;
        }
      } catch (err: any) {
        console.error(`  ❌ Error processing ${movie.title_en}: ${err.message}`);
        result.errors++;
      }
    }

    // Progress checkpoint
    console.log(`\n📍 Checkpoint: ${Math.min(i + batchSize, movies.length)}/${movies.length} processed\n`);
  }

  return result;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  const startTime = Date.now();
  
  try {
    const result = await backfillVisualConfidence();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('BACKFILL COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`Duration:           ${duration}s`);
    console.log(`Total movies:       ${result.total}`);
    console.log(`Processed:          ${result.processed}`);
    console.log(`Updated:            ${result.updated}`);
    console.log(`Skipped:            ${result.skipped}`);
    console.log(`Errors:             ${result.errors}`);
    console.log('');
    console.log('BY TIER:');
    console.log(`  Tier 1 (Original):  ${result.tier1Count}`);
    console.log(`  Tier 2 (Archival):  ${result.tier2Count}`);
    console.log(`  Tier 3 (Cards):     ${result.tier3Count}`);
    console.log(`  Archive cards:      ${result.archiveCardsGenerated}`);
    console.log('═══════════════════════════════════════════════════════════════════════');

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN - No changes were made to the database');
      console.log('   Run without --dry-run to apply changes\n');
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

