import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { generateEditorialReview, EditorialReview } from '../lib/reviews/editorial-review-generator';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RewriteOptions {
  limit?: number;
  dryRun?: boolean;
  batchSize?: number;
  startFrom?: number;
}

async function fetchTopTeluguMovies(limit: number = 500): Promise<any[]> {
  console.log(`📊 Fetching top ${limit} Telugu movies...`);
  
  const { data, error } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, release_year, avg_rating')
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .not('avg_rating', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching movies:', error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} movies\n`);
  return data || [];
}

async function rewriteReview(movie: any, dryRun: boolean = false): Promise<{ success: boolean; qualityScore: number }> {
  try {
    console.log(`\n🎬 Processing: ${movie.title_en} (${movie.release_year})`);
    
    // Generate editorial review
    const editorialReview = await generateEditorialReview(movie.id);
    
    console.log(`   Quality Score: ${(editorialReview.quality_score * 100).toFixed(1)}%`);
    
    // Validate quality
    if (editorialReview.quality_score < 0.7) {
      console.warn(`   ⚠️  Low quality score, skipping...`);
      return { success: false, qualityScore: editorialReview.quality_score };
    }

    if (dryRun) {
      console.log(`   🔍 DRY RUN - Would save review`);
      console.log(`   Synopsis length: ${editorialReview.synopsis.en.split(' ').length} words`);
      console.log(`   Lead actors: ${editorialReview.performances.lead_actors.length}`);
      console.log(`   Verdict: ${editorialReview.verdict.category}`);
      return { success: true, qualityScore: editorialReview.quality_score };
    }

    // Store editorial review in dimensions_json (existing JSONB column)
    // The editorial review structure includes all 9 sections + metadata
    const reviewData = {
      ...editorialReview,
      _type: 'editorial_review_v2',
      _quality_score: editorialReview.quality_score,
      _generated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('movie_reviews')
      .update({
        dimensions_json: reviewData,
      })
      .eq('movie_id', movie.id);

    if (error) {
      console.error(`   ❌ Error saving review:`, error.message);
      return { success: false, qualityScore: editorialReview.quality_score };
    }

    console.log(`   ✅ Review saved successfully`);
    return { success: true, qualityScore: editorialReview.quality_score };
  } catch (error: any) {
    console.error(`   ❌ Error generating review:`, error.message);
    return { success: false, qualityScore: 0 };
  }
}

async function rewriteTopTeluguReviews(options: RewriteOptions = {}) {
  const {
    limit = 500,
    dryRun = false,
    batchSize = 10,
    startFrom = 0,
  } = options;

  console.log('\n🚀 Starting Editorial Review Rewriter');
  console.log('=' .repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Target: ${limit} movies`);
  console.log(`Batch Size: ${batchSize}`);
  console.log(`Start From: ${startFrom}`);
  console.log('=' .repeat(60) + '\n');

  // Fetch movies
  const movies = await fetchTopTeluguMovies(limit + startFrom);
  const moviesToProcess = movies.slice(startFrom, startFrom + limit);

  console.log(`📈 Processing ${moviesToProcess.length} movies in batches of ${batchSize}...\n`);

  let successCount = 0;
  let failureCount = 0;
  let totalQualityScore = 0;
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < moviesToProcess.length; i += batchSize) {
    const batch = moviesToProcess.slice(i, i + batchSize);
    console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(moviesToProcess.length / batchSize)}`);
    console.log('-'.repeat(60));

    // Process batch sequentially (to avoid rate limits)
    for (const movie of batch) {
      const result = await rewriteReview(movie, dryRun);
      if (result.success) {
        successCount++;
        totalQualityScore += result.qualityScore;
      } else {
        failureCount++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n   Progress: ${i + batch.length}/${moviesToProcess.length} (${Math.round((i + batch.length) / moviesToProcess.length * 100)}%)`);
    console.log(`   Success: ${successCount} | Failed: ${failureCount}`);
    console.log(`   Avg Quality: ${successCount > 0 ? (totalQualityScore / successCount * 100).toFixed(1) : 0}%`);

    // Longer delay between batches
    if (i + batchSize < moviesToProcess.length) {
      console.log(`\n   ⏸️  Pausing 5 seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 REWRITE COMPLETE!\n');
  console.log('📊 FINAL SUMMARY:');
  console.log(`   Total Processed: ${moviesToProcess.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📈 Success Rate: ${Math.round(successCount / moviesToProcess.length * 100)}%`);
  console.log(`   ⭐ Avg Quality Score: ${successCount > 0 ? (totalQualityScore / successCount * 100).toFixed(1) : 0}%`);
  console.log(`   ⏱️  Duration: ${duration}s (${(duration / 60).toFixed(1)} minutes)`);
  console.log(`   📈 Rate: ${(moviesToProcess.length / duration * 60).toFixed(1)} movies/minute\n`);

  if (dryRun) {
    console.log('💡 This was a DRY RUN. No changes were made to the database.');
    console.log('   Run without --dry-run to apply changes.\n');
  } else {
    console.log('✅ All changes have been saved to the database.\n');
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const batchArg = args.find(arg => arg.startsWith('--batch='));
    const startArg = args.find(arg => arg.startsWith('--start='));

    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;
    const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 10;
    const startFrom = startArg ? parseInt(startArg.split('=')[1]) : 0;

    await rewriteTopTeluguReviews({
      limit,
      dryRun,
      batchSize,
      startFrom,
    });
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
