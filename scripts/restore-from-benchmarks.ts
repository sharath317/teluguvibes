/**
 * Restore Editorial Reviews from Benchmark Data
 * Uses RATING-BENCHMARKS.json to restore key movie reviews
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BenchmarkReview {
  movie: {
    slug: string;
    title_en: string;
    release_year: number;
    hero: string | null;
    director: string | null;
    avg_rating: number;
    is_blockbuster: boolean;
    is_classic: boolean;
  };
  editorial_review: {
    final_rating: number;
    category: string;
    cult: boolean;
    quality_score: number;
    scores: {
      story: number;
      direction: number;
      performances: Array<{ name: string; score: number }>;
    };
    cultural_impact: {
      cult_status: boolean;
      legacy_status: string;
      memorable_elements: string[];
      influence_on_cinema: string;
      cultural_significance: string;
    };
  };
}

async function restoreFromBenchmarks() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 RESTORING EDITORIAL REVIEWS FROM BENCHMARKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Load benchmark data
  const benchmarks: Record<string, BenchmarkReview> = JSON.parse(
    fs.readFileSync('docs/RATING-BENCHMARKS.json', 'utf-8')
  );

  console.log(`📚 Found ${Object.keys(benchmarks).length} benchmark categories\n`);

  // First, get the actual column names from movie_reviews
  const { data: sampleReview } = await supabase
    .from('movie_reviews')
    .select('*')
    .limit(1)
    .single();

  if (sampleReview) {
    console.log('📊 movie_reviews columns:', Object.keys(sampleReview).join(', '));
    console.log('');
  }

  let restored = 0;
  let skipped = 0;
  let errors = 0;

  for (const [category, benchmark] of Object.entries(benchmarks)) {
    const { movie, editorial_review } = benchmark;
    console.log(`\n📽️  Processing: ${movie.title_en} (${movie.release_year}) - ${category}`);

    // Find movie in database
    const { data: dbMovie, error: movieErr } = await supabase
      .from('movies')
      .select('id, title_en, slug')
      .eq('slug', movie.slug)
      .single();

    if (!dbMovie) {
      console.log(`   ⚠️  Movie not found in database: ${movie.slug}`);
      skipped++;
      continue;
    }

    // Build editorial review structure
    const reviewData = {
      _type: 'editorial_review_v2',
      _quality_score: editorial_review.quality_score,
      _generated_at: new Date().toISOString(),
      synopsis: {
        en: `${movie.title_en} is a ${editorial_review.category} from ${movie.release_year}. ${editorial_review.cultural_impact.cultural_significance}`,
        te: '', // Empty for now
      },
      story_screenplay: {
        story_score: editorial_review.scores.story,
        originality_score: editorial_review.scores.story,
        analysis: editorial_review.cultural_impact.cultural_significance,
      },
      performances: {
        lead_actors: editorial_review.scores.performances.map(p => ({
          name: p.name,
          character: '',
          score: p.score,
          highlights: [],
        })),
        supporting_actors: [],
      },
      direction_technicals: {
        direction_score: editorial_review.scores.direction,
        music_score: 7,
        cinematography_score: 7,
        analysis: editorial_review.cultural_impact.influence_on_cinema,
      },
      perspectives: {
        audience_pov: 'Audiences appreciate the engaging storytelling and performances.',
        critics_pov: 'Critics praised the direction and cultural significance.',
      },
      why_watch: {
        reasons: editorial_review.cultural_impact.memorable_elements,
        target_audience: ['Telugu cinema lovers', 'Fans of ' + (movie.hero || 'classic films')],
      },
      why_skip: {
        reasons: [],
        warnings: [],
      },
      cultural_impact: {
        legacy_status: editorial_review.cultural_impact.legacy_status,
        cultural_significance: editorial_review.cultural_impact.cultural_significance,
        influence_on_cinema: editorial_review.cultural_impact.influence_on_cinema,
        memorable_elements: editorial_review.cultural_impact.memorable_elements,
        cult_status: editorial_review.cult,
      },
      awards: [],
      verdict: {
        category: editorial_review.category,
        en: `${movie.title_en} is a ${editorial_review.category} that stands as a testament to Telugu cinema.`,
        te: '',
        final_rating: editorial_review.final_rating,
        confidence_score: 0.85,
      },
      quality_score: editorial_review.quality_score,
    };

    // Check if review exists
    const { data: existingReview } = await supabase
      .from('movie_reviews')
      .select('id')
      .eq('movie_id', dbMovie.id)
      .single();

    if (existingReview) {
      // Update existing review
      const { error } = await supabase
        .from('movie_reviews')
        .update({
          dimensions_json: reviewData,
          overall_rating: editorial_review.final_rating,
        })
        .eq('id', existingReview.id);

      if (error) {
        console.log(`   ❌ Error updating: ${error.message}`);
        errors++;
      } else {
        console.log(`   ✅ Updated existing review`);
        restored++;
      }
    } else {
      // Create new review - use only columns that exist
      const { error } = await supabase
        .from('movie_reviews')
        .insert({
          movie_id: dbMovie.id,
          reviewer_name: 'TeluguVibes Editorial',
          overall_rating: editorial_review.final_rating,
          dimensions_json: reviewData,
        });

      if (error) {
        console.log(`   ❌ Error creating: ${error.message}`);
        errors++;
      } else {
        console.log(`   ✅ Created new review`);
        restored++;
      }
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESTORE COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Restored: ${restored}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log('');
}

restoreFromBenchmarks();


