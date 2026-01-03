/**
 * BATCH AUTO-TAGGING SCRIPT
 * 
 * Generates canonical tags for all movies from review intelligence.
 * Tags power all UI sections and enable zero-hardcoding architecture.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { autoTagMovie, batchAutoTagMovies } from '../lib/tags/auto-tagger';

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
  console.log('🚀 Starting batch auto-tagging...\n');
  console.log('=' .repeat(60));

  const dryRun = process.argv.includes('--dry-run');
  const limit = parseInt(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '0') || undefined;
  const batchSize = parseInt(process.argv.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '10') || 10;

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Get all movies with enriched reviews
  console.log('\n📊 Fetching enriched reviews...');
  
  // First, get all movies that have enriched reviews
  let reviewQuery = supabase
    .from('movie_reviews')
    .select('movie_id')
    .not('dimensions_json', 'is', null)
    .not('audience_signals', 'is', null);
  
  if (limit) {
    reviewQuery = reviewQuery.limit(limit);
  }
  
  const { data: enrichedReviews, error: reviewsError } = await reviewQuery;

  if (reviewsError) {
    console.error('❌ Error fetching enriched reviews:', reviewsError.message);
    process.exit(1);
  }

  if (!enrichedReviews || enrichedReviews.length === 0) {
    console.log('⚠️  No enriched reviews found');
    console.log('💡 Run: pnpm enrich:reviews first');
    return;
  }

  const uniqueMovieIds = [...new Set(enrichedReviews.map(r => r.movie_id))];
  
  console.log(`\n📈 Found ${enrichedReviews.length} enriched reviews`);
  console.log(`   ${uniqueMovieIds.length} unique movies`);

  // Fetch movie details in batches (Supabase has a limit on IN clause size)
  console.log('\n🔍 Fetching movie details...');
  const movieBatchSize = 100;
  let moviesToTag: any[] = [];

  for (let i = 0; i < uniqueMovieIds.length; i += movieBatchSize) {
    const batchIds = uniqueMovieIds.slice(i, i + movieBatchSize);
    const { data: batchMovies, error: moviesError } = await supabase
      .from('movies')
      .select('id, title_en, language, tags')
      .in('id', batchIds)
      .eq('is_published', true);

    if (moviesError) {
      console.error(`❌ Error fetching movies batch ${i / movieBatchSize + 1}:`, moviesError.message);
      continue;
    }

    if (batchMovies) {
      moviesToTag.push(...batchMovies);
    }
  }
  
  const movies = moviesToTag; // For compatibility with rest of script
  const error = null; // No error at this point

  if (moviesToTag.length === 0) {
    console.log('\n⚠️  No movies ready for tagging.');
    console.log('💡 Run: pnpm enrich:reviews first');
    return;
  }
  
  console.log(`   Ready to tag: ${moviesToTag.length} movies`);

  console.log(`\n   Batch size: ${batchSize}`);
  console.log(`   Estimated time: ${Math.ceil(moviesToTag.length / batchSize * 2)} minutes\n`);

  if (dryRun) {
    console.log('🔍 Sample movies to be tagged:');
    moviesToTag.slice(0, 5).forEach(m => {
      const currentTags = m.tags?.length || 0;
      console.log(`   - ${m.title_en} (${m.language}) [Current tags: ${currentTags}]`);
    });
    console.log(`   ... and ${moviesToTag.length - 5} more\n`);
    console.log('💡 Run without --dry-run to apply tags');
    return;
  }

  // Group by language for better progress tracking
  const byLanguage = moviesToTag.reduce((acc, m) => {
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

    const result = await batchAutoTagMovies(movieIds, batchSize);
    totalSuccess += result.success;
    totalFailed += result.failed;

    console.log(`\n✅ ${language} complete: ${result.success} success, ${result.failed} failed`);
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 TAGGING COMPLETE!\n');
  console.log('📊 FINAL SUMMARY:');
  console.log(`   Total processed: ${moviesToTag.length}`);
  console.log(`   ✅ Successful: ${totalSuccess}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(`   ⏱️  Duration: ${duration}s (${(duration / 60).toFixed(1)} minutes)`);
  console.log(`   📈 Rate: ${(moviesToTag.length / duration * 60).toFixed(1)} movies/minute\n`);

  if (totalFailed > 0) {
    console.log('⚠️  Some tagging failed. Check logs above for details.');
  }

  console.log('Next steps:');
  console.log('  1. Run: pnpm validate:data');
  console.log('  2. Verify tags in admin dashboard');
  console.log('  3. Check section population on /reviews');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

