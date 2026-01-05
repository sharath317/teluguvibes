/**
 * Test script for multi-source data integration
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { gatherMultiSourceData, clearCache } from '../lib/reviews/multi-source-data';

async function testMultiSource() {
  console.log('🧪 Testing Multi-Source Data Integration\n');
  console.log('=' .repeat(60));

  // Test with a well-known movie (Athadu)
  const testMovieId = process.argv[2];
  
  if (!testMovieId) {
    console.log('Usage: pnpm tsx scripts/test-multi-source.ts <movie_id>');
    console.log('\nFetching a sample movie ID from database...');
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title_en, release_year, imdb_id')
      .eq('is_published', true)
      .not('avg_rating', 'is', null)
      .order('avg_rating', { ascending: false })
      .limit(1);
    
    if (error || !movies || movies.length === 0) {
      console.error('No published movies found:', error?.message);
      process.exit(1);
    }
    
    const movie = movies[0];
    
    console.log(`\nUsing movie: ${movie.title_en} (${movie.release_year})`);
    console.log(`  IMDB: ${movie.imdb_id || 'N/A'}\n`);
    
    await runTest(movie.id);
  } else {
    await runTest(testMovieId);
  }
}

async function runTest(movieId: string) {
  console.log(`\n📡 Fetching multi-source data for movie: ${movieId}\n`);
  
  const startTime = Date.now();
  
  try {
    // Clear cache to test fresh fetch
    clearCache();
    
    const data = await gatherMultiSourceData(movieId, { skipCache: true });
    
    const elapsed = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n🎬 Movie: ${data.movieTitle} (${data.releaseYear})`);
    console.log(`⏱️  Fetch time: ${elapsed}ms`);
    console.log(`📚 Sources used: ${data.sourcesUsed.join(', ')}`);
    
    console.log('\n--- Synopsis ---');
    if (data.synopsis) {
      console.log(`✅ Found from: ${data.synopsis.source}`);
      console.log(`   Words: ${data.synopsis.wordCount}`);
      console.log(`   Preview: ${data.synopsis.text.slice(0, 200)}...`);
    } else {
      console.log('❌ Not found - will need AI generation');
    }
    
    console.log('\n--- Ratings ---');
    if (data.ratings.sourcesCount > 0) {
      console.log(`✅ Found ${data.ratings.sourcesCount} rating sources:`);
      if (data.ratings.imdb) console.log(`   IMDB: ${data.ratings.imdb}/10`);
      if (data.ratings.rottenTomatoes) console.log(`   Rotten Tomatoes: ${data.ratings.rottenTomatoes}%`);
      if (data.ratings.metacritic) console.log(`   Metacritic: ${data.ratings.metacritic}/100`);
      if (data.ratings.tmdb) console.log(`   TMDB: ${data.ratings.tmdb}/10`);
      if (data.ratings.aggregatedAverage) console.log(`   📊 Aggregated: ${data.ratings.aggregatedAverage}/10`);
    } else {
      console.log('❌ No ratings found');
    }
    
    console.log('\n--- Awards ---');
    if (data.awards.totalWins > 0 || data.awards.structured.length > 0) {
      console.log(`✅ Found from: ${data.awards.source}`);
      console.log(`   Total wins: ${data.awards.totalWins}`);
      console.log(`   Total nominations: ${data.awards.totalNominations}`);
      if (data.awards.majorAwards.length > 0) {
        console.log(`   Major: ${data.awards.majorAwards.join(', ')}`);
      }
    } else {
      console.log('❌ No awards found');
    }
    
    console.log('\n--- Reception ---');
    if (data.reception) {
      console.log(`✅ Found from: ${data.reception.source}`);
      console.log(`   Words: ${data.reception.wordCount}`);
    } else {
      console.log('❌ Not found');
    }
    
    console.log('\n--- Legacy/Cultural Impact ---');
    if (data.legacy) {
      console.log(`✅ Found from: ${data.legacy.source}`);
      console.log(`   Words: ${data.legacy.wordCount}`);
    } else {
      console.log('❌ Not found');
    }
    
    console.log('\n--- AI Context Summary ---');
    const ctx = data.aiContext;
    console.log(`Has Synopsis: ${ctx.hasSynopsis ? '✅' : '❌'}`);
    console.log(`Has Ratings: ${ctx.hasRatings ? '✅' : '❌'}`);
    console.log(`Has Awards: ${ctx.hasAwards ? '✅' : '❌'}`);
    console.log(`Has Reception: ${ctx.hasReception ? '✅' : '❌'}`);
    console.log(`Has Legacy: ${ctx.hasLegacy ? '✅' : '❌'}`);
    
    if (ctx.missingFields.length > 0) {
      console.log(`\n⚠️  Missing fields (need AI): ${ctx.missingFields.join(', ')}`);
    }
    
    console.log(`\n🤖 AI sections still needed: ${ctx.recommendedAiSections.length}`);
    console.log(`   ${ctx.recommendedAiSections.join(', ')}`);
    
    // Calculate savings
    const totalSections = 9;
    const factualSections = [ctx.hasSynopsis, ctx.hasAwards].filter(Boolean).length;
    const savingsPercent = Math.round((factualSections / totalSections) * 100);
    
    console.log('\n' + '='.repeat(60));
    console.log(`💰 ESTIMATED AI COST SAVINGS: ~${savingsPercent}% fewer AI calls`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMultiSource().catch(console.error);
