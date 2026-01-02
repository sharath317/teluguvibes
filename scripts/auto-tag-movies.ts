/**
 * AUTO-TAG MOVIES
 * 
 * Automatically tags movies as:
 * - Blockbusters: High-profile movies, big stars, high ratings
 * - Hidden Gems: Lesser-known but well-rated movies
 * - Classics: Pre-2005 movies with good legacy
 * - Cult Classics: Movies with unique characteristics
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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
  release_year: number;
  avg_rating: number | null;
  total_reviews: number;
  hero: string | null;
  director: string | null;
  genres: string[];
  is_underrated: boolean;
  is_blockbuster: boolean;
  is_classic: boolean;
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

  console.log('\n🎉 Done!');
}

autoTagMovies().catch(console.error);

