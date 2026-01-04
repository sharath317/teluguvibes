/**
 * Calibrate Ratings V3 - Pure AI Scores (No TMDB)
 * 
 * Since we have 100% AI score coverage, we don't need TMDB at all.
 * This removes external rating dependency and uses only:
 * - Story Score (25%)
 * - Direction Score (25%)
 * - Performance Scores (25%)
 * - Category/Era boost (up to +1.0)
 * 
 * No TMDB = No spam rating inflation
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// TRUE Telugu masterpieces (manually curated - 9.0+ only)
const VERIFIED_MASTERPIECES = new Set([
  'baahubali-the-beginning-2015',
  'baahubali-2-the-conclusion-2017',
  'rrr-2022',
  'magadheera-2009',
  'mayabazar-1957',
  'pathala-bhairavi-1951',
  'malliswari-1951',
  'sankarabharanam-1980',
  'sagara-sangamam-1983',
  'sri-venkateswara-mahatmyam-1960',
  'ntr-mahanayakudu-2019'
]);

// Verified blockbusters (8.0-8.9 tier)
const VERIFIED_BLOCKBUSTERS = new Set([
  'athadu-2005',
  'pokiri-2006',
  'dookudu-2011',
  'srimanthudu-2015',
  'rangasthalam-2018',
  'pushpa-the-rise-2021',
  'arjun-reddy-2017',
  'eega-2012',
  'geetha-govindam-2018',
  'ala-vaikunthapurramuloo-2020',
  'fidaa-2017',
  'bommarillu-2006',
  'khaleja-2010',
  'gabbar-singh-2012',
  'attarintiki-daredi-2013',
  'race-gurram-2014',
  'temper-2015',
  'sarrainodu-2016',
  'julayi-2012',
  'okkadu-2003',
  'ready-2008',
  'uppena-2021',
  'bheemla-nayak-2022',
  'dasara-2023'
]);

function calculateRatingV3(
  slug: string,
  releaseYear: number,
  isBlockbusterFlag: boolean,
  isClassicFlag: boolean,
  storyScore: number,
  directionScore: number,
  performanceScores: number[]
): { rating: number; category: string; reason: string } {
  
  // === PURE AI SCORE CALCULATION ===
  const scores: number[] = [];
  
  // Story (33% if no performance, else 25%)
  if (storyScore > 0) scores.push(storyScore);
  
  // Direction (33% if no performance, else 25%)
  if (directionScore > 0) scores.push(directionScore);
  
  // Performance average (25-50% depending on count)
  if (performanceScores.length > 0) {
    const avgPerf = performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length;
    scores.push(avgPerf);
  }
  
  if (scores.length === 0) {
    return { rating: 6.0, category: 'unrated', reason: 'no_ai_scores' };
  }
  
  // Simple average of available AI scores
  const baseRating = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // === BOOST SYSTEM (based on curation + era) ===
  let boost = 0;
  let reason = 'ai_scores_only';
  
  // Tier 1: Verified Masterpieces
  if (VERIFIED_MASTERPIECES.has(slug)) {
    boost = 1.2;
    reason = 'verified_masterpiece';
  }
  // Tier 2: Verified Blockbusters
  else if (VERIFIED_BLOCKBUSTERS.has(slug)) {
    boost = 0.6;
    reason = 'verified_blockbuster';
  }
  // Tier 3: Flagged + Old classics
  else if (isClassicFlag && releaseYear < 1990) {
    boost = 0.5;
    reason = 'flagged_classic';
  }
  // Tier 4: Flagged blockbusters
  else if (isBlockbusterFlag) {
    boost = 0.4;
    reason = 'flagged_blockbuster';
  }
  // Tier 5: Vintage bonus (pre-1980)
  else if (releaseYear < 1980) {
    boost = 0.3;
    reason = 'vintage_bonus';
  }
  // Tier 6: Classic era (1980-1999)
  else if (releaseYear < 2000) {
    boost = 0.1;
    reason = 'classic_era';
  }
  // No boost for modern films without flags
  
  let finalRating = baseRating + boost;
  
  // === CEILING ENFORCEMENT ===
  // Only verified masterpieces can reach 9.0+
  if (!VERIFIED_MASTERPIECES.has(slug) && finalRating >= 9.0) {
    finalRating = 8.9;
    reason += '_capped';
  }
  
  // Absolute bounds
  finalRating = Math.min(9.5, Math.max(5.0, finalRating));
  finalRating = Math.round(finalRating * 10) / 10;
  
  // === CATEGORY ASSIGNMENT ===
  let category = 'one-time-watch';
  if (VERIFIED_MASTERPIECES.has(slug) && finalRating >= 9.0) {
    category = 'masterpiece';
  } else if (finalRating >= 8.5) {
    category = 'must-watch';
  } else if (finalRating >= 8.0) {
    category = 'mass-classic';
  } else if (finalRating >= 7.5) {
    category = 'highly-recommended';
  } else if (finalRating >= 7.0) {
    category = 'recommended';
  } else if (finalRating >= 6.5) {
    category = 'watchable';
  } else if (finalRating >= 6.0) {
    category = 'one-time-watch';
  } else {
    category = 'skip';
  }
  
  return { rating: finalRating, category, reason };
}

async function calibrateV3(applyChanges: boolean = false) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 RATING CALIBRATION V3 - NO TMDB ${applyChanges ? '(APPLYING)' : '(DRY RUN)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Formula: Story (33%) + Direction (33%) + Performance (33%) + Boost');
  console.log('');
  console.log('NO external ratings used. Pure AI evaluation.');
  console.log('');

  // Fetch all reviews
  let allReviews: any[] = [];
  let offset = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('movie_reviews')
      .select(`
        id,
        movie_id,
        dimensions_json,
        movies!inner(
          title_en,
          slug,
          release_year,
          is_blockbuster,
          is_classic
        )
      `)
      .not('dimensions_json', 'is', null)
      .range(offset, offset + 500);

    if (error) { console.error('Error:', error); break; }
    if (!data || data.length === 0) break;
    allReviews = allReviews.concat(data);
    offset += 500;
    if (data.length < 500) break;
  }

  const reviewsWithVerdict = allReviews.filter(
    r => r.dimensions_json?.verdict?.final_rating
  );

  console.log(`📊 Found ${reviewsWithVerdict.length} reviews`);
  console.log('');

  let updated = 0;
  const changes: any[] = [];
  const newDist: Record<string, number> = {
    '9.0+': 0, '8.5-8.9': 0, '8.0-8.4': 0, '7.5-7.9': 0, 
    '7.0-7.4': 0, '6.5-6.9': 0, '<6.5': 0
  };

  for (const review of reviewsWithVerdict) {
    const movie = review.movies;
    const ed = review.dimensions_json;
    const oldRating = ed.verdict?.final_rating || 0;
    const oldCategory = ed.verdict?.category || 'unknown';
    
    // Extract AI scores
    const storyScore = ed.story_screenplay?.story_score || ed.story_screenplay?.originality_score || 0;
    const directionScore = ed.direction_technicals?.direction_score || 0;
    const perfScores = (ed.performances?.lead_actors || [])
      .map((a: any) => a.score)
      .filter((s: any) => s && s > 0);
    
    const { rating: newRating, category: newCategory, reason } = calculateRatingV3(
      movie.slug,
      movie.release_year || 2020,
      movie.is_blockbuster || false,
      movie.is_classic || false,
      storyScore,
      directionScore,
      perfScores
    );
    
    // Track distribution
    if (newRating >= 9.0) newDist['9.0+']++;
    else if (newRating >= 8.5) newDist['8.5-8.9']++;
    else if (newRating >= 8.0) newDist['8.0-8.4']++;
    else if (newRating >= 7.5) newDist['7.5-7.9']++;
    else if (newRating >= 7.0) newDist['7.0-7.4']++;
    else if (newRating >= 6.5) newDist['6.5-6.9']++;
    else newDist['<6.5']++;
    
    if (Math.abs(oldRating - newRating) > 0.05 || oldCategory !== newCategory) {
      updated++;
      changes.push({
        title: movie.title_en,
        slug: movie.slug,
        year: movie.release_year,
        oldRating,
        newRating,
        oldCategory,
        newCategory,
        reason,
        storyScore,
        directionScore,
        perfAvg: perfScores.length > 0 ? (perfScores.reduce((a: number, b: number) => a + b, 0) / perfScores.length).toFixed(1) : 'N/A'
      });

      if (applyChanges) {
        const updatedDimensions = {
          ...ed,
          verdict: {
            ...ed.verdict,
            final_rating: newRating,
            category: newCategory,
          },
        };

        await supabase
          .from('movie_reviews')
          .update({ dimensions_json: updatedDimensions })
          .eq('id', review.id);
      }
    }
  }

  // Print results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 NEW RATING DISTRIBUTION (Pure AI)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  Object.entries(newDist).forEach(([range, count]) => {
    const pct = ((count / reviewsWithVerdict.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / 5));
    console.log(`${range.padEnd(8)}: ${count.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`);
  });
  
  console.log('');
  console.log(`Updated: ${updated} / ${reviewsWithVerdict.length}`);
  console.log('');

  // Show top 25 movies
  const allMovies = changes.sort((a, b) => b.newRating - a.newRating);
  
  console.log('📊 TOP 25 (Pure AI Scores):');
  console.log('');
  console.log('| # | Rating | Movie                          | Story | Dir | Perf | Category         |');
  console.log('|---|--------|--------------------------------|-------|-----|------|------------------|');
  allMovies.slice(0, 25).forEach((m, i) => {
    console.log(`| ${(i+1).toString().padStart(2)} | ${m.newRating.toFixed(1)}   | ${m.title.substring(0,30).padEnd(30)} | ${m.storyScore.toString().padStart(5)} | ${m.directionScore.toString().padStart(3)} | ${m.perfAvg.toString().padStart(4)} | ${m.newCategory.padEnd(16)} |`);
  });

  console.log('');
  if (!applyChanges) {
    console.log('⚠️  DRY RUN - Run with --apply to apply changes');
  } else {
    console.log('✅ Changes applied to database!');
  }
}

const applyChanges = process.argv.includes('--apply');
calibrateV3(applyChanges);

