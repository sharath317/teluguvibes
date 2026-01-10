/**
 * AUTO-TAG MOVIES (Enhanced v2.0)
 * 
 * Automatically tags movies with:
 * 
 * LEGACY FLAGS (original):
 * - is_blockbuster: High-profile movies, big stars, high ratings
 * - is_underrated: Lesser-known but well-rated movies (hidden gems)
 * - is_classic: Pre-2005 movies with good legacy
 * - cult-classic (in tags array): Movies with unique characteristics
 * 
 * ENHANCED TAGS (v2.0):
 * - box_office_category: industry-hit, blockbuster, super-hit, hit, average, below-average
 * - mood_tags: feel-good, dark-intense, thought-provoking, patriotic, etc.
 * - quality_tags: masterpiece, critically-acclaimed, cult-classic, hidden-gem, etc.
 * - audience_fit: kids_friendly, family_watch, date_movie, group_watch, solo_watch
 * - watch_recommendation: theater-must, theater-preferred, ott-friendly, any
 * 
 * Usage:
 *   pnpm ts-node scripts/auto-tag-movies.ts --dry           # Preview changes
 *   pnpm ts-node scripts/auto-tag-movies.ts --apply         # Apply legacy tags only
 *   pnpm ts-node scripts/auto-tag-movies.ts --apply --v2    # Apply all v2 enhanced tags
 *   pnpm ts-node scripts/auto-tag-movies.ts --apply --v2 --limit 50  # Process 50 movies
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  deriveAllTags,
  DerivedTags,
} from '../lib/reviews/tag-derivation';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Top Telugu stars whose movies are likely blockbusters
const TOP_HEROES = [
  'Chiranjeevi', 'Pawan Kalyan', 'Mahesh Babu', 'Allu Arjun', 'Jr NTR',
  'Ram Charan', 'Prabhas', 'Nandamuri Balakrishna', 'Venkatesh', 'Ravi Teja',
  'Nagarjuna', 'Nani', 'Vijay Deverakonda', 'Ram Pothineni'
];

const TOP_DIRECTORS = [
  'S.S. Rajamouli', 'Trivikram Srinivas', 'Sukumar', 'Boyapati Srinu',
  'Koratala Siva', 'Shankar', 'Prashanth Neel', 'Anil Ravipudi'
];

interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  release_year: number;
  avg_rating: number | null;
  tmdb_rating?: number;
  imdb_rating?: number;
  popularity_score?: number;
  total_reviews: number;
  hero: string | null;
  director: string | null;
  genres: string[];
  is_underrated: boolean;
  is_blockbuster: boolean;
  is_classic: boolean;
  overview?: string;
  tagline?: string;
  awards?: unknown[];
  content_flags?: Record<string, unknown>;
}

async function autoTagMovies() {
  console.log('🎬 AUTO-TAGGING MOVIES\n');
  
  // Fetch all movies
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, release_year, avg_rating, total_reviews, hero, director, genres, is_underrated, is_blockbuster, is_classic')
    .eq('is_published', true);

  if (error || !movies) {
    console.error('Error fetching movies:', error);
    return;
  }

  console.log(`📊 Found ${movies.length} movies to process\n`);

  const blockbusters: string[] = [];
  const hiddenGems: string[] = [];
  const classics: string[] = [];
  const cultClassics: string[] = [];

  for (const movie of movies as Movie[]) {
    const year = movie.release_year || 2020;
    const rating = movie.avg_rating || 0;
    const hero = movie.hero?.toLowerCase() || '';
    const director = movie.director?.toLowerCase() || '';
    const genres = movie.genres || [];

    // === BLOCKBUSTERS ===
    // Recent movies (2015+) with top stars or high ratings
    const hasTopStar = TOP_HEROES.some(h => hero.includes(h.toLowerCase()));
    const hasTopDirector = TOP_DIRECTORS.some(d => director.includes(d.toLowerCase()));
    
    if (
      (year >= 2015 && (hasTopStar || hasTopDirector) && rating >= 6) ||
      (year >= 2010 && rating >= 8) ||
      (hasTopStar && hasTopDirector && rating >= 5.5)
    ) {
      blockbusters.push(movie.id);
    }

    // === CLASSICS ===
    // Movies before 2005
    if (year <= 2005) {
      classics.push(movie.id);
    }

    // === HIDDEN GEMS ===
    // Movies with decent ratings but not from top stars
    if (
      rating >= 6.5 &&
      !hasTopStar &&
      !hasTopDirector &&
      year >= 2000 &&
      year <= 2020
    ) {
      hiddenGems.push(movie.id);
    }

    // === CULT CLASSICS ===
    // Specific genres + older movies + decent rating
    const hasCultGenre = genres.some(g => 
      ['Horror', 'Crime', 'Thriller', 'Mystery'].includes(g)
    );
    if (hasCultGenre && year <= 2015 && rating >= 5.5) {
      cultClassics.push(movie.id);
    }
  }

  console.log(`🎯 Tagging Results:`);
  console.log(`   - Blockbusters: ${blockbusters.length}`);
  console.log(`   - Classics: ${classics.length}`);
  console.log(`   - Hidden Gems: ${hiddenGems.length}`);
  console.log(`   - Cult Classics: ${cultClassics.length}`);
  console.log('');

  // Apply tags
  const dryRun = process.argv.includes('--dry');
  
  if (dryRun) {
    console.log('🔍 DRY RUN - No changes made\n');
    console.log('Run with --apply to update database');
    return;
  }

  console.log('📝 Updating database...\n');

  // Reset all flags first
  await supabase
    .from('movies')
    .update({ is_blockbuster: false, is_underrated: false, is_classic: false })
    .eq('is_published', true);

  // Apply blockbuster tags
  if (blockbusters.length > 0) {
    const { error: e1 } = await supabase
      .from('movies')
      .update({ is_blockbuster: true })
      .in('id', blockbusters);
    if (e1) console.error('Error tagging blockbusters:', e1);
    else console.log(`✅ Tagged ${blockbusters.length} blockbusters`);
  }

  // Apply classic tags
  if (classics.length > 0) {
    const { error: e2 } = await supabase
      .from('movies')
      .update({ is_classic: true })
      .in('id', classics);
    if (e2) console.error('Error tagging classics:', e2);
    else console.log(`✅ Tagged ${classics.length} classics`);
  }

  // Apply hidden gem tags
  if (hiddenGems.length > 0) {
    const { error: e3 } = await supabase
      .from('movies')
      .update({ is_underrated: true })
      .in('id', hiddenGems);
    if (e3) console.error('Error tagging hidden gems:', e3);
    else console.log(`✅ Tagged ${hiddenGems.length} hidden gems`);
  }

  // Store cult classics in tags array (since we don't have a separate column)
  // We'll use this for a special section
  if (cultClassics.length > 0) {
    for (const id of cultClassics.slice(0, 50)) { // Limit to 50
      const { data: movie } = await supabase
        .from('movies')
        .select('tags')
        .eq('id', id)
        .single();
      
      const tags = movie?.tags || [];
      if (!tags.includes('cult-classic')) {
        await supabase
          .from('movies')
          .update({ tags: [...tags, 'cult-classic'] })
          .eq('id', id);
      }
    }
    console.log(`✅ Tagged ${Math.min(cultClassics.length, 50)} cult classics`);
  }

  console.log('\n🎉 Legacy tagging done!');
  
  // Check if enhanced v2 tagging is requested
  const useV2 = process.argv.includes('--v2');
  if (useV2) {
    await applyEnhancedV2Tags();
  }
}

/**
 * Apply enhanced v2.0 tags using the tag-derivation engine
 * 
 * Flags:
 *   --force : Reprocess all movies, even those with existing mood_tags
 *   --limit N : Process N movies (default: 100)
 */
async function applyEnhancedV2Tags() {
  console.log('\n🚀 ENHANCED V2.0 TAGGING\n');
  
  // Parse arguments
  const limitArg = process.argv.find(arg => arg.startsWith('--limit'));
  const limit = limitArg ? parseInt(process.argv[process.argv.indexOf(limitArg) + 1]) || 100 : 100;
  const forceAll = process.argv.includes('--force');
  
  console.log(`  Mode: ${forceAll ? 'FORCE (all movies)' : 'INCREMENTAL (missing only)'}`);
  console.log(`  Limit: ${limit} movies\n`);

  // Build query
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, release_year, avg_rating, tmdb_rating, imdb_rating, popularity_score, total_reviews, hero, director, genres, is_underrated, is_blockbuster, is_classic, overview, tagline, awards, content_flags, mood_tags')
    .eq('is_published', true)
    .order('updated_at', { ascending: true })
    .limit(limit);
  
  // Only filter for null/empty mood_tags if not forcing
  if (!forceAll) {
    query = query.or('mood_tags.is.null,mood_tags.eq.{}');
  }

  const { data: movies, error } = await query;

  if (error || !movies) {
    console.error('Error fetching movies for v2 tagging:', error);
    return;
  }
  
  console.log(`📊 Processing ${movies.length} movies for enhanced tagging...\n`);
  
  const stats = {
    processed: 0,
    failed: 0,
    byMood: {} as Record<string, number>,
    byQuality: {} as Record<string, number>,
    byBoxOffice: {} as Record<string, number>,
  };
  
  for (const movie of movies as Movie[]) {
    try {
      // Derive all tags
      const derived: DerivedTags = deriveAllTags({
        id: movie.id,
        title_en: movie.title_en,
        title_te: movie.title_te,
        release_year: movie.release_year,
        genres: movie.genres,
        avg_rating: movie.avg_rating || undefined,
        tmdb_rating: movie.tmdb_rating,
        imdb_rating: movie.imdb_rating,
        popularity_score: movie.popularity_score,
        total_reviews: movie.total_reviews,
        is_blockbuster: movie.is_blockbuster,
        is_classic: movie.is_classic,
        is_underrated: movie.is_underrated,
        overview: movie.overview,
        tagline: movie.tagline,
        awards: movie.awards as unknown[],
        content_flags: movie.content_flags as Record<string, unknown>,
      });
      
      // Update movie with derived tags
      const { error: updateError } = await supabase
        .from('movies')
        .update({
          box_office_category: derived.box_office_category,
          mood_tags: derived.mood_tags,
          quality_tags: derived.quality_tags,
          audience_fit: derived.audience_fit,
          watch_recommendation: derived.watch_recommendation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', movie.id);
      
      if (updateError) {
        console.error(`❌ Failed to update ${movie.title_en}:`, updateError);
        stats.failed++;
      } else {
        stats.processed++;
        
        // Track stats
        derived.mood_tags?.forEach(tag => {
          stats.byMood[tag] = (stats.byMood[tag] || 0) + 1;
        });
        derived.quality_tags?.forEach(tag => {
          stats.byQuality[tag] = (stats.byQuality[tag] || 0) + 1;
        });
        if (derived.box_office_category) {
          stats.byBoxOffice[derived.box_office_category] = (stats.byBoxOffice[derived.box_office_category] || 0) + 1;
        }
        
        console.log(`✅ ${movie.title_en}: ${derived.mood_tags?.join(', ') || 'no mood'} | ${derived.quality_tags?.join(', ') || 'no quality'}`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${movie.title_en}:`, err);
      stats.failed++;
    }
  }
  
  // Print summary
  console.log('\n📊 V2 TAGGING SUMMARY');
  console.log('====================');
  console.log(`Processed: ${stats.processed}`);
  console.log(`Failed: ${stats.failed}`);
  
  console.log('\nMood Tags Distribution:');
  Object.entries(stats.byMood)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
  
  console.log('\nQuality Tags Distribution:');
  Object.entries(stats.byQuality)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tag, count]) => console.log(`  ${tag}: ${count}`));
  
  console.log('\nBox Office Categories:');
  Object.entries(stats.byBoxOffice)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  
  console.log('\n🎉 Enhanced v2.0 tagging complete!');
}

autoTagMovies().catch(console.error);




