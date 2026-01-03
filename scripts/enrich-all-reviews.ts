/**
 * BATCH REVIEW ENRICHMENT SCRIPT
 * 
 * Applies structured review intelligence to all existing reviews.
 * Extracts dimensions, performance scores, technical scores, and audience signals.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { enrichReview, batchEnrichReviews } from '../lib/reviews/review-enrichment';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🚀 Starting batch review enrichment...\n');
  console.log('=' .repeat(60));

  const dryRun = process.argv.includes('--dry-run');
  const limit = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0') || undefined;
  const batchSize = parseInt(process.argv.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '10') || 10;

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Get all movie IDs that have reviews and need enrichment
  console.log('\n📊 Fetching reviews to enrich...');
  
  // Fetch reviews that need enrichment
  let query = supabase
    .from('movie_reviews')
    .select('movie_id')
    .or('dimensions_json.is.null,enriched_at.is.null');
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: reviewsToEnrich, error: reviewsError } = await query;
  
  if (reviewsError) {
    console.error('❌ Error fetching reviews:', reviewsError.message);
    process.exit(1);
  }
  
  if (!reviewsToEnrich || reviewsToEnrich.length === 0) {
    console.log('✅ No reviews need enrichment');
    return;
  }
  
  // Get unique movie IDs
  const uniqueMovieIds = [...new Set(reviewsToEnrich.map(r => r.movie_id))];
  
  console.log(`\n📈 Found ${reviewsToEnrich.length} reviews (${uniqueMovieIds.length} unique movies)`);
  
  // Fetch movie details in batches (Supabase has a limit on IN clause size)
  const movieBatchSize = 100;
  let movies: any[] = [];
  
  for (let i = 0; i < uniqueMovieIds.length; i += movieBatchSize) {
    const batchIds = uniqueMovieIds.slice(i, i + movieBatchSize);
    const { data: batchMovies, error: moviesError } = await supabase
      .from('movies')
      .select('id, title_en, language')
      .in('id', batchIds)
      .eq('is_published', true);
    
    if (moviesError) {
      console.error(`❌ Error fetching movies batch ${i / movieBatchSize + 1}:`, moviesError.message);
      continue;
    }
    
    if (batchMovies) {
      movies.push(...batchMovies);
    }
  }
  
  const error = null; // No error at this point

  if (error) {
    console.error('❌ Error fetching movies:', error.message);
    process.exit(1);
  }

  if (!movies || movies.length === 0) {
    console.log('✅ No movies found to enrich');
    return;
  }

  console.log(`\n📈 Found ${movies.length} movies to process`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Estimated time: ${Math.ceil(movies.length / batchSize * 2)} minutes\n`);

  if (dryRun) {
    console.log('🔍 Sample movies to be enriched:');
    movies.slice(0, 5).forEach(m => {
      console.log(`   - ${m.title_en} (${m.language}) [ID: ${m.id}]`);
    });
    console.log(`   ... and ${movies.length - 5} more\n`);
    console.log('💡 Run without --dry-run to apply enrichment');
    return;
  }

  // Group by language for better progress tracking
  const byLanguage = movies.reduce((acc, m) => {
    if (!acc[m.language]) acc[m.language] = [];
    acc[m.language].push(m.id);
    return acc;
  }, {} as Record<string, string[]>);

  console.log('📊 Movies by language:');
  Object.entries(byLanguage).forEach(([lang, ids]) => {
    console.log(`   ${lang}: ${ids.length} movies`);
  });
  console.log('');

  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const [language, movieIds] of Object.entries(byLanguage)) {
    console.log(`\n🔄 Processing ${language} movies (${movieIds.length})...\n`);

    const result = await batchEnrichReviews(movieIds, batchSize);
    totalSuccess += result.success;
    totalFailed += result.failed;

    console.log(`\n✅ ${language} complete: ${result.success} success, ${result.failed} failed`);
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 ENRICHMENT COMPLETE!\n');
  console.log('📊 FINAL SUMMARY:');
  console.log(`   Total processed: ${movies.length}`);
  console.log(`   ✅ Successful: ${totalSuccess}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   ⏱️  Duration: ${duration}s (${(duration / 60).toFixed(1)} minutes)`);
  console.log(`   📈 Rate: ${(movies.length / duration * 60).toFixed(1)} movies/minute\n`);

  if (totalFailed > 0) {
    console.log('⚠️  Some enrichments failed. Check logs above for details.');
  }

  console.log('Next steps:');
  console.log('  1. Run: pnpm tag:movies');
  console.log('  2. Run: pnpm validate:data');
  console.log('  3. Verify in admin dashboard');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

