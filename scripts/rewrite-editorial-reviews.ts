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
  forceUnknown?: boolean; // Force regeneration of reviews with "Unknown" actors
}

async function fetchTopTeluguMovies(limit: number = 500): Promise<any[]> {
  console.log(`📊 Fetching top ${limit} Telugu movies by our_rating (with images)...`);
  
  const { data, error } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, release_year, our_rating, avg_rating, verdict')
    .eq('language', 'Telugu')
    .eq('is_published', true)
    .not('our_rating', 'is', null)
    .not('poster_url', 'is', null) // Only movies with images
    .order('our_rating', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching movies:', error);
    throw error;
  }

  console.log(`✅ Found ${data?.length || 0} movies\n`);

  // Show top 10
  console.log('Top 10 movies to process:');
  data?.slice(0, 10).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.title_en} (${m.release_year}) - ${m.our_rating} [${m.verdict}]`);
  });
  console.log('');

  return data || [];
}

async function rewriteReview(movie: any, dryRun: boolean = false, skipExisting: boolean = true, forceUnknown: boolean = false): Promise<{ success: boolean; qualityScore: number; skipped?: boolean }> {
  try {
    console.log(`\n🎬 Processing: ${movie.title_en} (${movie.release_year})`);
    
    // Check if review exists and if it's already V2
    const { data: existingReview } = await supabase
      .from('movie_reviews')
      .select('id, dimensions_json')
      .eq('movie_id', movie.id)
      .single();

    const hasExistingReview = !!existingReview;
    const hasV2Review = existingReview?.dimensions_json?._type === 'editorial_review_v2';
    
    // Check if V2 review has all required sections
    const requiredSections = ['verdict', 'synopsis', 'performances', 'story_screenplay', 'direction_technicals', 'cultural_impact', 'why_watch', 'why_skip', 'perspectives'];
    const hasAllSections = hasV2Review && requiredSections.every(section => 
      existingReview?.dimensions_json?.[section] !== undefined
    );
    
    // Check if review has "Unknown" in lead actors
    const hasUnknownActors = hasV2Review && existingReview?.dimensions_json?.performances?.lead_actors?.some(
      (actor: any) => actor.name === 'Unknown' || !actor.name
    );
    
    // Force regeneration if --force-unknown flag is set and review has Unknown actors
    const shouldForceRegen = forceUnknown && hasUnknownActors;
    
    // Skip if already has complete V2 review (unless forcing regeneration for Unknown actors)
    if (skipExisting && hasV2Review && hasAllSections && !shouldForceRegen) {
      console.log(`   ⏭️  SKIPPED: Already has complete V2 review (${requiredSections.length} sections)`);
      return { success: true, qualityScore: existingReview?.dimensions_json?._quality_score || 0.85, skipped: true };
    }
    
    if (shouldForceRegen) {
      console.log(`   🔄 FORCE REGEN: Review has Unknown actors, regenerating...`);
    }
    
    console.log(`   Review status: ${hasExistingReview ? (hasV2Review ? 'V2 EXISTS (incomplete, updating)' : 'OLD FORMAT (upgrading to V2)') : 'MISSING (creating)'}`);

    // Generate editorial review with retry for quality
    let editorialReview = await generateEditorialReview(movie.id);
    let retryCount = 0;
    const maxRetries = 2;
    const minQuality = 0.85; // 85% minimum quality
    
    while (editorialReview.quality_score < minQuality && retryCount < maxRetries) {
      retryCount++;
      console.log(`   ⚠️  Quality ${(editorialReview.quality_score * 100).toFixed(1)}% < ${minQuality * 100}%, retry ${retryCount}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
      editorialReview = await generateEditorialReview(movie.id);
    }
    
    console.log(`   Quality Score: ${(editorialReview.quality_score * 100).toFixed(1)}%${retryCount > 0 ? ` (after ${retryCount} retries)` : ''}`);
    
    // Validate quality - accept 80%+ after retries
    if (editorialReview.quality_score < 0.80) {
      console.warn(`   ❌ Quality too low after retries, skipping...`);
      return { success: false, qualityScore: editorialReview.quality_score };
    }

    if (dryRun) {
      console.log(`   🔍 DRY RUN - Would ${hasExistingReview ? 'update' : 'create'} review`);
      console.log(`   Synopsis length: ${editorialReview.synopsis?.en?.split(' ').length || 0} words`);
      console.log(`   Lead actors: ${editorialReview.performances?.lead_actors?.length || 0}`);
      console.log(`   Verdict: ${editorialReview.verdict?.category || 'N/A'}`);
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

    if (hasExistingReview) {
    // Update existing review
      const { error } = await supabase
        .from('movie_reviews')
        .update({
          dimensions_json: reviewData,
          overall_rating: editorialReview.verdict?.final_rating || null,
        })
        .eq('movie_id', movie.id);

      if (error) {
        console.error(`   ❌ Error updating review:`, error.message);
        return { success: false, qualityScore: editorialReview.quality_score };
      }
    } else {
      // Create new review - use correct column names
      const { error } = await supabase
        .from('movie_reviews')
        .insert({
          movie_id: movie.id,
          reviewer_name: 'TeluguVibes Editorial',
          summary: editorialReview.synopsis?.en || '',
          overall_rating: editorialReview.verdict?.final_rating || null,
          dimensions_json: reviewData,
        });

      if (error) {
        console.error(`   ❌ Error creating review:`, error.message);
        return { success: false, qualityScore: editorialReview.quality_score };
      }
    }

    console.log(`   ✅ Review ${hasExistingReview ? 'updated' : 'created'} successfully`);
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
    forceUnknown = false,
  } = options;

  console.log('\n🚀 Starting Editorial Review Rewriter');
  console.log('=' .repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Target: ${limit} movies`);
  console.log(`Batch Size: ${batchSize}`);
  console.log(`Start From: ${startFrom}`);
  if (forceUnknown) {
    console.log(`Force Unknown: YES (regenerating reviews with Unknown actors)`);
  }
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
    let skippedCount = 0;
    for (const movie of batch) {
      const result = await rewriteReview(movie, dryRun, true, forceUnknown);
      if (result.skipped) {
        skippedCount++;
        successCount++; // Count skipped as success for progress
      } else if (result.success) {
        successCount++;
        totalQualityScore += result.qualityScore;
      } else {
        failureCount++;
      }

      // Small delay to avoid rate limits (skip delay for skipped movies)
      if (!result.skipped) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
    const forceUnknown = args.includes('--force-unknown');
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const batchArg = args.find(arg => arg.startsWith('--batch='));
    const startArg = args.find(arg => arg.startsWith('--start='));

    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 500;
    const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 10;
    const startFrom = startArg ? parseInt(startArg.split('=')[1]) : 0;

    // Initialize AI client with key validation
    console.log('🔑 Initializing AI client...');
    const { smartAI } = await import('../lib/ai/smart-key-manager');
    await smartAI.initialize();
    console.log('✅ AI client ready\n');

    await rewriteTopTeluguReviews({
      limit,
      dryRun,
      batchSize,
      startFrom,
      forceUnknown,
    });
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
