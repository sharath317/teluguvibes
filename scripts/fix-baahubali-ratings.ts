#!/usr/bin/env npx tsx
/**
 * Fix Baahubali Movie Ratings
 * 
 * Corrects the incorrect seed data for Baahubali: The Epic
 * 
 * Usage: npx tsx scripts/fix-baahubali-ratings.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixBaahubaliRatings() {
  console.log('🎬 Fixing Baahubali movie ratings...\n');

  // First, find the specific movie
  const { data: movie, error: findError } = await supabase
    .from('movies')
    .select('id, title_en, slug, our_rating, avg_rating')
    .eq('slug', 'baahubali-the-epic-2025')
    .single();

  if (findError || !movie) {
    console.error('❌ Could not find Baahubali movie:', findError?.message);
    
    // Try to list all movies with "baahubali" in title
    const { data: allMovies } = await supabase
      .from('movies')
      .select('id, title_en, slug')
      .or('title_en.ilike.%baahubali%,slug.ilike.%baahubali%');
    
    console.log('\nMovies containing "baahubali":');
    allMovies?.forEach(m => console.log(`  - ${m.title_en} (${m.slug})`));
    return;
  }

  console.log(`Found: ${movie.title_en} (${movie.slug})`);
  console.log(`Current rating: ${movie.our_rating || movie.avg_rating}/10\n`);

  // Update movie with correct ratings
  const { error: updateMovieError } = await supabase
    .from('movies')
    .update({
      our_rating: 9.0,
      avg_rating: 8.8,
      is_blockbuster: true,
      is_classic: true,
      is_underrated: false,
    })
    .eq('id', movie.id);

  if (updateMovieError) {
    console.error('❌ Failed to update movie:', updateMovieError.message);
    return;
  }

  console.log('✅ Updated movie ratings to 9.0/10');

  // Find and update the review with correct dimensions
  const { data: review, error: reviewError } = await supabase
    .from('movie_reviews')
    .select('id, dimensions_json')
    .eq('movie_id', movie.id)
    .single();

  if (review) {
    const correctDimensions = {
      _type: 'editorial_review_v2',
      _quality_score: 0.95,
      
      // Story & Screenplay
      story_screenplay: {
        story_score: 9.0,
        screenplay_score: 8.8,
        originality_score: 9.5,
        pacing_score: 8.5,
        summary: 'An epic tale of a warrior destined for greatness, featuring a compelling narrative with emotional depth and grand scale storytelling.',
      },
      
      // Direction & Technicals
      direction_technicals: {
        direction_score: 9.5,
        cinematography_score: 9.5,
        music_score: 9.2,
        editing_score: 8.8,
        vfx_score: 9.0,
        action_score: 9.5,
        summary: 'S.S. Rajamouli delivers a masterclass in epic filmmaking with groundbreaking visuals, spectacular action sequences, and technical excellence.',
      },
      
      // Performances
      performances: {
        overall_score: 9.0,
        lead_actors: [
          {
            name: 'Prabhas',
            role: 'Baahubali',
            score: 9.2,
            verdict: 'Iconic',
            highlight: 'A star-making performance that established Prabhas as a pan-Indian superstar',
          },
          {
            name: 'Anushka Shetty',
            role: 'Devasena',
            score: 8.8,
            verdict: 'Excellent',
            highlight: 'Brings grace and strength to the warrior princess role',
          },
          {
            name: 'Rana Daggubati',
            role: 'Bhallaladeva',
            score: 9.0,
            verdict: 'Excellent',
            highlight: 'Menacing and powerful as the antagonist',
          },
        ],
        supporting_cast_score: 8.5,
      },
      
      // Cultural Impact
      cultural_impact: {
        legacy_status: 'Landmark Indian Cinema',
        cult_status: true,
        cultural_significance: 'Redefined the scope of Indian cinema and proved that regional films can achieve global success',
        memorable_moments: [
          'The iconic waterfall climb scene',
          'The coronation sequence',
          'Epic battle scenes with groundbreaking VFX',
          '"Why did Kattappa kill Baahubali?" phenomenon',
        ],
      },
      
      // Why Watch / Why Skip
      why_watch: {
        reasons: [
          'Groundbreaking visual spectacle with world-class VFX',
          'Epic storytelling on an unprecedented scale',
          'Prabhas delivers an iconic performance',
          'M.M. Keeravaani\'s magnificent score',
          'S.S. Rajamouli\'s visionary direction',
          'Technical achievements that rival Hollywood productions',
        ],
        best_for: [
          'Action movie enthusiasts',
          'Fans of epic cinema',
          'Anyone who loves grand storytelling',
          'Prabhas fans',
        ],
      },
      
      why_skip: {
        reasons: [
          'Very long runtime may test patience',
          'Heavily stylized action may not appeal to those preferring realistic films',
        ],
        not_for: [
          'Those who prefer intimate, character-driven dramas',
        ],
      },
      
      // Verdict
      verdict: {
        en: 'A landmark achievement in Indian cinema. Baahubali is a visual spectacle that combines breathtaking action with emotional storytelling, setting new standards for epic filmmaking.',
        te: 'భారతీయ సినిమాలో ఒక మైలురాయి. బాహుబలి అద్భుతమైన చర్య మరియు భావోద్వేగ కథనంతో కూడిన దృశ్య వైభవం.',
        category: 'Masterpiece',
        final_rating: 9.0,
        cult: true,
      },
      
      // Awards
      awards: {
        national_awards: [
          { award: 'Best Feature Film', winner: 'Baahubali: The Beginning' },
          { award: 'Best Special Effects', winner: 'Baahubali Team' },
        ],
        filmfare_awards: [
          { award: 'Best Film', winner: 'Baahubali: The Beginning' },
          { award: 'Best Director', winner: 'S.S. Rajamouli' },
        ],
        nandi_awards: [
          { award: 'Best Feature Film', winner: 'Baahubali' },
        ],
        box_office_records: [
          'Highest-grossing Indian film at the time of release',
          'First Indian film to gross ₹1000 crore worldwide',
        ],
      },
    };

    const { error: updateReviewError } = await supabase
      .from('movie_reviews')
      .update({
        dimensions_json: correctDimensions,
        rating: 9.0,
        overall_rating: 9.0,
      })
      .eq('id', review.id);

    if (updateReviewError) {
      console.error('❌ Failed to update review:', updateReviewError.message);
    } else {
      console.log('✅ Updated review dimensions with correct ratings');
      console.log('\n📊 New Ratings:');
      console.log('   Story: 9.0/10');
      console.log('   Direction: 9.5/10');
      console.log('   Music: 9.2/10');
      console.log('   Cinematography: 9.5/10');
      console.log('   Overall: 9.0/10 (Masterpiece)');
    }
  } else {
    console.log('ℹ️ No review found for this movie');
  }

  console.log('\n✨ Done! Refresh the page to see updated ratings.');
}

fixBaahubaliRatings().catch(console.error);

