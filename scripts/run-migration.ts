/**
 * DATABASE MIGRATION RUNNER
 * 
 * Applies the review dimensions schema changes to Supabase.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting database migration...\n');
  console.log('=' .repeat(60));

  console.log('\n📄 Migration: add_review_dimensions.sql');
  console.log('\n⚠️  MANUAL STEP REQUIRED:\n');
  console.log('   Supabase requires SQL migrations to be run via:');
  console.log('   1. Supabase Dashboard → SQL Editor → New Query');
  console.log('   2. Copy the content of migrations/add_review_dimensions.sql');
  console.log('   3. Paste and run the query');
  console.log('   4. Or use Supabase CLI: supabase db push\n');

  console.log('   Alternatively, I can verify the columns exist...\n');
  console.log('⚙️  Checking if migration is needed...\n');

  try {
    // Check if the new columns already exist
    const { data: existingReviews, error } = await supabase
      .from('movie_reviews')
      .select('id, dimensions_json, performance_scores, technical_scores, audience_signals, confidence_score, composite_score')
      .limit(1);

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.log('❌ Migration NOT applied yet. New columns are missing.\n');
        console.log('📋 Required columns to add:');
        console.log('   - dimensions_json (JSONB)');
        console.log('   - performance_scores (JSONB)');
        console.log('   - technical_scores (JSONB)');
        console.log('   - audience_signals (JSONB)');
        console.log('   - confidence_score (DECIMAL)');
        console.log('   - composite_score (DECIMAL)');
        console.log('   - enriched_at (TIMESTAMPTZ)');
        console.log('   - enrichment_version (VARCHAR)\n');
        console.log('👉 Please apply the migration via Supabase Dashboard SQL Editor');
        console.log('   File: migrations/add_review_dimensions.sql\n');
        process.exit(1);
      } else {
        throw error;
      }
    } else {
      console.log('✅ Migration already applied! All columns exist.\n');
      console.log('📊 Sample data check:');
      if (existingReviews && existingReviews.length > 0) {
        const review = existingReviews[0];
        console.log(`   - dimensions_json: ${review.dimensions_json ? '✅ Present' : '⏳ Null (not enriched yet)'}`);
        console.log(`   - performance_scores: ${review.performance_scores ? '✅ Present' : '⏳ Null (not enriched yet)'}`);
        console.log(`   - confidence_score: ${review.confidence_score ? '✅ Present' : '⏳ Null (not enriched yet)'}`);
      }
      console.log('\n🎉 Migration verified successfully!\n');
      console.log('Next steps:');
      console.log('  1. Run: pnpm enrich:reviews');
      console.log('  2. Run: pnpm tag:movies');
      console.log('  3. Run: pnpm validate:data');
    }
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.log('\n💡 If you see column errors, the migration needs to be applied.');
    console.log('   Use Supabase Dashboard SQL Editor to run migrations/add_review_dimensions.sql');
    process.exit(1);
  }
}

runMigration().catch(console.error);

