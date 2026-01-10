/**
 * BACKFILL SCRIPT: Smart Reviews
 * 
 * Derives and stores smart review fields for all movies with reviews.
 * 
 * This script:
 * 1. Fetches all movies with existing reviews
 * 2. Derives smart review fields from metadata
 * 3. Flags fields needing human review
 * 4. Updates the database with enriched review data
 * 
 * Usage:
 *   npx tsx scripts/backfill-smart-reviews.ts [--dry-run] [--limit N] [--force]
 * 
 * Options:
 *   --dry-run   Show what would be updated without making changes
 *   --limit N   Process only N reviews
 *   --force     Re-derive even for reviews that already have smart_review data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  deriveSmartReviewFields,
  getFieldsNeedingReview,
} from '../lib/reviews/smart-review-derivation';
import type { SmartReviewDerivationInput } from '../lib/reviews/smart-review.types';

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
  needsHumanReview: number;
  avgConfidence: number;
  byLegacyStatus: Record<string, number>;
}

async function backfillSmartReviews(): Promise<BackfillResult> {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('SMART REVIEW BACKFILL');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Force re-derive: ${force ? 'YES' : 'NO'}`);
  if (limit) console.log(`Limit: ${limit} reviews`);
  console.log('');

  const result: BackfillResult = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    needsHumanReview: 0,
    avgConfidence: 0,
    byLegacyStatus: {},
  };

  // Fetch all reviews with pagination
  let allReviews: any[] = [];
  const pageSize = 1000;
  let page = 0;
  
  console.log('Fetching all reviews...');
  
  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('movie_reviews')
      .select(`
        id,
        movie_id,
        overall_rating,
        strengths,
        weaknesses,
        dimensions_json,
        audience_signals,
        summary,
        verdict,
        smart_review,
        movies!inner (
          id,
          title_en,
          release_year,
          genres,
          hero,
          heroine,
          director,
          music_director,
          certification,
          is_blockbuster,
          is_classic,
          avg_rating,
          verdict,
          tags
        )
      `)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) {
      console.error('Error fetching reviews:', fetchError.message);
      break;
    }
    
    if (!batch || batch.length === 0) break;
    
    allReviews = allReviews.concat(batch);
    console.log(`  Fetched ${allReviews.length} reviews...`);
    page++;
    
    if (batch.length < pageSize) break;
  }
  
  // Apply limit if specified
  const reviews = limit ? allReviews.slice(0, limit) : allReviews;

  if (!reviews || reviews.length === 0) {
    console.error('❌ No reviews found to process');
    return result;
  }

  result.total = reviews.length;
  console.log(`📊 Found ${reviews.length} reviews to process\n`);

  let totalConfidence = 0;

  // Process in batches
  const batchSize = 20;

  for (let i = 0; i < reviews.length; i += batchSize) {
    const batch = reviews.slice(i, i + batchSize);

    for (const review of batch) {
      try {
        result.processed++;

        // Skip if already has smart_review and not forcing
        if (review.smart_review && !force) {
          result.skipped++;
          continue;
        }

        const movie = (review as any).movies;
        if (!movie) {
          console.log(`  ⏭️  Skipping review ${review.id} - no movie data`);
          result.skipped++;
          continue;
        }

        // Build derivation input - only use columns that exist
        const input: SmartReviewDerivationInput = {
          movie: {
            id: movie.id,
            title_en: movie.title_en,
            release_year: movie.release_year,
            genres: movie.genres,
            hero: movie.hero,
            heroine: movie.heroine,
            director: movie.director,
            music_director: movie.music_director,
            certification: movie.certification,
            era: null,
            is_blockbuster: movie.is_blockbuster,
            is_classic: movie.is_classic,
            is_cult: false, // Column doesn't exist in schema
            is_underrated: false, // Column doesn't exist in schema
            avg_rating: movie.avg_rating,
            verdict: movie.verdict,
            tags: movie.tags,
          },
          review: {
            overall_rating: review.overall_rating,
            strengths: review.strengths,
            weaknesses: review.weaknesses,
            dimensions: review.dimensions_json,
            audience_signals: review.audience_signals,
            summary: review.summary,
            verdict: review.verdict,
          },
        };

        // Derive smart review fields
        const smartReview = deriveSmartReviewFields(input);
        const fieldsNeedingReview = getFieldsNeedingReview(smartReview);

        // Track statistics
        totalConfidence += smartReview.confidence.overall;
        if (fieldsNeedingReview.length > 0) {
          result.needsHumanReview++;
        }
        if (smartReview.legacy_status) {
          result.byLegacyStatus[smartReview.legacy_status] =
            (result.byLegacyStatus[smartReview.legacy_status] || 0) + 1;
        }

        // Log progress
        const confLabel = `${Math.round((smartReview.derivation_confidence || 0) * 100)}%`;
        const legacyLabel = smartReview.legacy_status || '-';
        const needsReviewLabel = fieldsNeedingReview.length > 0 ? '⚠️' : '✓';
        
        console.log(
          `${result.processed}/${reviews.length} | ` +
          `${movie.release_year || '????'} | ` +
          `${movie.title_en.substring(0, 30).padEnd(30)} | ` +
          `${confLabel.padStart(4)} | ` +
          `${legacyLabel.padEnd(15)} | ` +
          `${needsReviewLabel}`
        );

        // Update database (if not dry run)
        if (!isDryRun) {
          const { error: updateError } = await supabase
            .from('movie_reviews')
            .update({
              smart_review: smartReview,
              smart_review_derived_at: new Date().toISOString(),
              needs_human_review: fieldsNeedingReview.length > 0,
            })
            .eq('id', review.id);

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
        console.error(`  ❌ Error processing review ${review.id}: ${err.message}`);
        result.errors++;
      }
    }

    // Progress checkpoint
    console.log(`\n📍 Checkpoint: ${Math.min(i + batchSize, reviews.length)}/${reviews.length} processed\n`);
  }

  // Calculate average confidence
  if (result.processed > 0) {
    result.avgConfidence = totalConfidence / (result.processed - result.skipped);
  }

  return result;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  const startTime = Date.now();

  try {
    const result = await backfillSmartReviews();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('BACKFILL COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`Duration:             ${duration}s`);
    console.log(`Total reviews:        ${result.total}`);
    console.log(`Processed:            ${result.processed}`);
    console.log(`Updated:              ${result.updated}`);
    console.log(`Skipped:              ${result.skipped}`);
    console.log(`Errors:               ${result.errors}`);
    console.log(`Needs human review:   ${result.needsHumanReview}`);
    console.log(`Avg confidence:       ${Math.round(result.avgConfidence * 100)}%`);
    console.log('');
    console.log('BY LEGACY STATUS:');
    Object.entries(result.byLegacyStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status.padEnd(20)} ${count}`);
      });
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

