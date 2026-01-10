#!/usr/bin/env npx tsx
/**
 * Quick Audit: Check for duplicate IDs in the database
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function auditDuplicates() {
  console.log('\n🔍 DUPLICATE ID AUDIT\n');
  console.log('='.repeat(50));

  // 1. Check movies table
  console.log('\n📽️  Checking movies table...');
  const { data: movies, error: moviesError } = await supabase
    .from('movies')
    .select('id, title_en, release_year')
    .order('id');

  if (moviesError) {
    console.error('Error fetching movies:', moviesError.message);
  } else {
    const movieIds = movies?.map(m => m.id) || [];
    const duplicateMovieIds = movieIds.filter((id, index) => movieIds.indexOf(id) !== index);
    
    if (duplicateMovieIds.length > 0) {
      console.log(`❌ Found ${duplicateMovieIds.length} duplicate movie IDs:`);
      const uniqueDups = [...new Set(duplicateMovieIds)];
      for (const dupId of uniqueDups.slice(0, 10)) {
        const dupes = movies?.filter(m => m.id === dupId);
        console.log(`   ID: ${dupId}`);
        dupes?.forEach(d => console.log(`      - ${d.title_en} (${d.release_year})`));
      }
      if (uniqueDups.length > 10) {
        console.log(`   ... and ${uniqueDups.length - 10} more`);
      }
    } else {
      console.log(`✅ No duplicate IDs found in movies (${movieIds.length} total)`);
    }
  }

  // 2. Check posts table
  console.log('\n📰 Checking posts table...');
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, title, slug')
    .order('id');

  if (postsError) {
    console.error('Error fetching posts:', postsError.message);
  } else {
    const postIds = posts?.map(p => p.id) || [];
    const duplicatePostIds = postIds.filter((id, index) => postIds.indexOf(id) !== index);
    
    if (duplicatePostIds.length > 0) {
      console.log(`❌ Found ${duplicatePostIds.length} duplicate post IDs`);
    } else {
      console.log(`✅ No duplicate IDs found in posts (${postIds.length} total)`);
    }

    // Also check for duplicate slugs
    const postSlugs = posts?.map(p => p.slug) || [];
    const duplicateSlugs = postSlugs.filter((slug, index) => postSlugs.indexOf(slug) !== index);
    if (duplicateSlugs.length > 0) {
      console.log(`⚠️  Found ${duplicateSlugs.length} duplicate slugs in posts`);
      [...new Set(duplicateSlugs)].slice(0, 5).forEach(s => console.log(`   - ${s}`));
    }
  }

  // 3. Check movie_reviews table
  console.log('\n⭐ Checking movie_reviews table...');
  const { data: reviews, error: reviewsError } = await supabase
    .from('movie_reviews')
    .select('id, movie_id')
    .order('id');

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError.message);
  } else {
    const reviewIds = reviews?.map(r => r.id) || [];
    const duplicateReviewIds = reviewIds.filter((id, index) => reviewIds.indexOf(id) !== index);
    
    if (duplicateReviewIds.length > 0) {
      console.log(`❌ Found ${duplicateReviewIds.length} duplicate review IDs`);
    } else {
      console.log(`✅ No duplicate IDs found in reviews (${reviewIds.length} total)`);
    }
  }

  // 4. Check celebrities table
  console.log('\n🌟 Checking celebrities table...');
  const { data: celebs, error: celebsError } = await supabase
    .from('celebrities')
    .select('id, name_en')
    .order('id');

  if (celebsError) {
    console.error('Error fetching celebrities:', celebsError.message);
  } else {
    const celebIds = celebs?.map(c => c.id) || [];
    const duplicateCelebIds = celebIds.filter((id, index) => celebIds.indexOf(id) !== index);
    
    if (duplicateCelebIds.length > 0) {
      console.log(`❌ Found ${duplicateCelebIds.length} duplicate celebrity IDs`);
    } else {
      console.log(`✅ No duplicate IDs found in celebrities (${celebIds.length} total)`);
    }
  }

  // 5. SQL-based duplicate check (more reliable)
  console.log('\n🔎 Running SQL-based duplicate checks...');
  
  // Check for duplicate movies by title+year combo
  const { data: dupMovies } = await supabase.rpc('check_duplicate_movies');
  if (dupMovies && dupMovies.length > 0) {
    console.log(`⚠️  Found ${dupMovies.length} movies with same title+year:`);
    dupMovies.slice(0, 10).forEach((d: any) => 
      console.log(`   - "${d.title_en}" (${d.release_year}) - ${d.count} copies`)
    );
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Audit complete!\n');
}

// Run the audit
auditDuplicates().catch(console.error);
