/**
 * Calibrate Ratings Script
 * 
 * Recalculates final_rating for all existing editorial reviews
 * using the improved rating algorithm with category boosts.
 * 
 * Does NOT re-call AI - uses existing generated scores.
 * 
 * Usage:
 *   npx tsx scripts/calibrate-ratings.ts           # Dry run
 *   npx tsx scripts/calibrate-ratings.ts --apply   # Apply changes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MovieData {
  avg_rating: number;
  release_year: number;
  is_blockbuster?: boolean;
  is_classic?: boolean;
  is_underrated?: boolean;
}

interface EditorialReview {
  story_screenplay?: {
    story_score?: number;
    originality_score?: number;
  };
  direction_technicals?: {
    direction_score?: number;
  };
  performances?: {
    lead_actors?: Array<{ score?: number }>;
  };
  verdict?: {
    final_rating?: number;
    category?: string;
  };
  cultural_impact?: {
    cult_status?: boolean;
  };
}

/**
 * New rating calculation matching the updated algorithm
 */
function calculateNewRating(
  movie: MovieData,
  review: EditorialReview,
  dbOverallRating: number
): { rating: number; category: string; boost: number } {
  // Determine movie category for differentiated scoring
  const tmdbRating = movie.avg_rating || 5.0;
  const releaseYear = movie.release_year || 2020;
  const isOldClassic = releaseYear < 1990;
  // Use is_blockbuster flag or high TMDB rating
  const isBlockbuster = movie.is_blockbuster || tmdbRating >= 8.5;
  const isHit = tmdbRating >= 7.5;
  const isCultClassic = (isOldClassic && tmdbRating >= 7.0) || movie.is_classic;

  // Calculate category boost (refined to prevent over-inflation)
  let categoryBoost = 0;
  let categoryName = 'regular';
  if (isBlockbuster) {
    // Only movies with explicit blockbuster flag or very high TMDB rating
    categoryBoost = 0.6;
    categoryName = 'blockbuster';
  } else if (isCultClassic && tmdbRating >= 7.5) {
    // Classics must also have good ratings to get boost
    categoryBoost = 0.7;
    categoryName = 'classic';
  } else if (isOldClassic && tmdbRating >= 7.0) {
    // Old movies with decent ratings
    categoryBoost = 0.4;
    categoryName = 'older-classic';
  } else if (isHit) {
    categoryBoost = 0.3;
    categoryName = 'hit';
  }

  // Extract scores from existing review
  const storyScore = review.story_screenplay?.story_score || review.story_screenplay?.originality_score || 0;
  const directionScore = review.direction_technicals?.direction_score || 0;
  const perfScores = (review.performances?.lead_actors || [])
    .map(a => a.score)
    .filter((s): s is number => s !== undefined && s > 0);
  const avgPerf = perfScores.length > 0 
    ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length 
    : 0;

  // Collect scores with new weights
  const scores: number[] = [];
  const weights: number[] = [];

  // 1. Story score (weight: 25%)
  if (storyScore > 0) {
    scores.push(storyScore);
    weights.push(0.25);
  }

  // 2. Direction score (weight: 25%)
  if (directionScore > 0) {
    scores.push(directionScore);
    weights.push(0.25);
  }

  // 3. Performance scores (weight: 20%)
  if (avgPerf > 0) {
    scores.push(avgPerf);
    weights.push(0.20);
  }

  // 4. TMDB rating (weight: 20%)
  const cappedTmdb = isBlockbuster || isCultClassic 
    ? Math.min(tmdbRating, 9.5)
    : Math.min(tmdbRating, 8.5);
  scores.push(cappedTmdb);
  weights.push(0.20);

  // 5. DB Rating (weight: 10%) - only if reliable
  if (dbOverallRating > 6.0 && dbOverallRating <= 10) {
    scores.push(dbOverallRating);
    weights.push(0.10);
  }

  // If we have no scores at all, use TMDB
  if (scores.length === 0) {
    return { 
      rating: Math.min(tmdbRating, 7.5), 
      category: 'one-time-watch',
      boost: categoryBoost 
    };
  }

  // Normalize weights
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  // Calculate weighted average
  let finalRating = 0;
  for (let i = 0; i < scores.length; i++) {
    finalRating += scores[i] * normalizedWeights[i];
  }

  // Apply category boost
  finalRating += categoryBoost;

  // Clamp between 5.0 and 9.5
  finalRating = Math.max(5.0, Math.min(9.5, finalRating));
  finalRating = Math.round(finalRating * 10) / 10;

  // Determine category
  const isCult = review.cultural_impact?.cult_status;
  const isHiddenGem = movie.is_underrated;
  
  let category = 'one-time-watch';
  if (finalRating >= 9.0) category = 'must-watch';
  else if (finalRating >= 8.5 && (isBlockbuster || isOldClassic)) category = 'must-watch';
  else if (finalRating >= 8.0 && isBlockbuster) category = 'blockbuster';
  else if (finalRating >= 8.0 && isCult) category = 'cult';
  else if (finalRating >= 7.5 && isHiddenGem) category = 'hidden-gem';
  else if (finalRating >= 7.5) category = 'blockbuster';
  else if (finalRating >= 7.0) category = 'recommended';
  else if (finalRating >= 6.0) category = 'one-time-watch';
  else if (finalRating >= 5.0) category = 'average';
  else category = 'skippable';

  return { rating: finalRating, category, boost: categoryBoost };
}

async function calibrateRatings(applyChanges: boolean = false) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 RATING CALIBRATION ${applyChanges ? '(APPLYING CHANGES)' : '(DRY RUN)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Fetch all editorial reviews
  let allReviews: any[] = [];
  let offset = 0;
  const batchSize = 500;

  while (true) {
    const { data: reviews, error } = await supabase
      .from('movie_reviews')
      .select(`
        id,
        movie_id,
        overall_rating,
        dimensions_json,
        movies!inner(
          title_en,
          avg_rating,
          release_year,
          is_blockbuster,
          is_classic,
          is_underrated
        )
      `)
      .not('dimensions_json', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching reviews:', error);
      break;
    }

    if (!reviews || reviews.length === 0) break;
    allReviews = allReviews.concat(reviews);
    offset += batchSize;
    if (reviews.length < batchSize) break;
  }

  // Filter for editorial reviews
  const editorialReviews = allReviews.filter(
    r => r.dimensions_json && r.dimensions_json._type === 'editorial_review_v2'
  );

  console.log(`📊 Found ${editorialReviews.length} editorial reviews to calibrate`);
  console.log('');

  // Track changes
  let updated = 0;
  let unchanged = 0;
  const changes: Array<{
    title: string;
    oldRating: number;
    newRating: number;
    oldCategory: string;
    newCategory: string;
    boost: number;
  }> = [];

  // Process each review
  for (const review of editorialReviews) {
    const movie = review.movies as MovieData;
    const editorial = review.dimensions_json as EditorialReview;
    const oldRating = editorial.verdict?.final_rating || 0;
    const oldCategory = editorial.verdict?.category || 'unknown';

    // Calculate new rating
    const { rating: newRating, category: newCategory, boost } = calculateNewRating(
      movie,
      editorial,
      review.overall_rating || 0
    );

    // Check if changed
    if (Math.abs(oldRating - newRating) > 0.1 || oldCategory !== newCategory) {
      updated++;
      changes.push({
        title: (review.movies as any).title_en,
        oldRating,
        newRating,
        oldCategory,
        newCategory,
        boost,
      });

      if (applyChanges) {
        // Update the dimensions_json
        const updatedDimensions = {
          ...editorial,
          verdict: {
            ...editorial.verdict,
            final_rating: newRating,
            category: newCategory,
          },
        };

        const { error } = await supabase
          .from('movie_reviews')
          .update({ dimensions_json: updatedDimensions })
          .eq('id', review.id);

        if (error) {
          console.error(`Error updating ${(review.movies as any).title_en}:`, error);
        }
      }
    } else {
      unchanged++;
    }
  }

  // Print summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CALIBRATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Total reviews: ${editorialReviews.length}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log('');

  // Show biggest changes
  const biggestIncreases = changes
    .sort((a, b) => (b.newRating - b.oldRating) - (a.newRating - a.oldRating))
    .slice(0, 20);

  console.log('📈 TOP 20 BIGGEST RATING INCREASES:');
  console.log('');
  console.log('| # | Movie | Old | New | Change | Category |');
  console.log('|---|-------|-----|-----|--------|----------|');
  biggestIncreases.forEach((c, i) => {
    const change = (c.newRating - c.oldRating).toFixed(1);
    console.log(`| ${(i + 1).toString().padStart(2)} | ${c.title.substring(0, 30).padEnd(30)} | ${c.oldRating.toFixed(1)} | ${c.newRating.toFixed(1)} | +${change} | ${c.newCategory} |`);
  });

  console.log('');

  // New distribution
  const newDist: Record<string, number> = { '9.0+': 0, '8.0-8.9': 0, '7.0-7.9': 0, '6.0-6.9': 0, '<6.0': 0 };
  for (const review of editorialReviews) {
    const editorial = review.dimensions_json as EditorialReview;
    const { rating } = calculateNewRating(
      review.movies as MovieData,
      editorial,
      review.overall_rating || 0
    );
    
    if (rating >= 9.0) newDist['9.0+']++;
    else if (rating >= 8.0) newDist['8.0-8.9']++;
    else if (rating >= 7.0) newDist['7.0-7.9']++;
    else if (rating >= 6.0) newDist['6.0-6.9']++;
    else newDist['<6.0']++;
  }

  console.log('📊 NEW RATING DISTRIBUTION:');
  console.log('');
  Object.entries(newDist).forEach(([range, count]) => {
    const pct = ((count / editorialReviews.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / 5));
    console.log(`${range.padEnd(8)}: ${count.toString().padStart(3)} movies (${pct}%) ${bar}`);
  });

  console.log('');
  if (!applyChanges) {
    console.log('⚠️  DRY RUN - No changes applied. Run with --apply to apply changes.');
  } else {
    console.log('✅ All changes applied to database!');
  }
}

// Main
const applyChanges = process.argv.includes('--apply');
calibrateRatings(applyChanges);

