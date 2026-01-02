#!/usr/bin/env npx tsx
/**
 * MULTI-LANGUAGE MOVIE INGESTION
 * 
 * Ingests high-quality movies from Hindi, Tamil, Malayalam, English, Kannada
 * with strict quality gates - only blockbusters, classics, hidden gems allowed.
 * 
 * Usage:
 *   pnpm movies:ingest:multilang --dry          # Preview only
 *   pnpm movies:ingest:multilang --hindi        # Ingest Hindi only
 *   pnpm movies:ingest:multilang --all          # Ingest all languages
 *   pnpm movies:ingest:multilang --status       # Check coverage
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

// ============================================================
// TYPES
// ============================================================

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface TMDBCredits {
  cast: { name: string; character: string; order: number }[];
  crew: { name: string; job: string; department: string }[];
}

type Language = 'Hindi' | 'Tamil' | 'Malayalam' | 'English' | 'Kannada';

interface LanguageConfig {
  name: Language;
  tmdb_code: string;
  region: string;
  min_rating: number;
  max_count: number;
  include_popular: boolean;
  include_top_rated: boolean;
}

// ============================================================
// CONFIGURATION
// ============================================================

// Updated for Phase 2: 500+ movies per language (relaxed quality gates for volume)
const LANGUAGE_CONFIGS: LanguageConfig[] = [
  { name: 'Hindi', tmdb_code: 'hi', region: 'IN', min_rating: 5.5, max_count: 600, include_popular: true, include_top_rated: true },
  { name: 'Tamil', tmdb_code: 'ta', region: 'IN', min_rating: 5.5, max_count: 550, include_popular: true, include_top_rated: true },
  { name: 'Malayalam', tmdb_code: 'ml', region: 'IN', min_rating: 5.5, max_count: 550, include_popular: true, include_top_rated: true },
  { name: 'Kannada', tmdb_code: 'kn', region: 'IN', min_rating: 5.5, max_count: 550, include_popular: true, include_top_rated: true },
  { name: 'English', tmdb_code: 'en', region: 'US', min_rating: 6.0, max_count: 550, include_popular: true, include_top_rated: true },
];

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

// ============================================================
// TMDB API FUNCTIONS
// ============================================================

async function fetchTMDB(endpoint: string): Promise<any> {
  const url = `${TMDB_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

async function discoverMovies(config: LanguageConfig, page: number = 1): Promise<TMDBMovie[]> {
  // Lower vote_count requirement for regional languages to find more movies
  const minVotes = ['ml', 'kn', 'ta'].includes(config.tmdb_code) ? 20 : 50;
  const endpoint = `/discover/movie?with_original_language=${config.tmdb_code}&region=${config.region}&sort_by=vote_average.desc&vote_count.gte=${minVotes}&vote_average.gte=${config.min_rating}&page=${page}`;
  const data = await fetchTMDB(endpoint);
  return data.results || [];
}

async function getPopularMovies(config: LanguageConfig, page: number = 1): Promise<TMDBMovie[]> {
  // Discover by popularity - often finds different movies
  const endpoint = `/discover/movie?with_original_language=${config.tmdb_code}&sort_by=popularity.desc&page=${page}`;
  const data = await fetchTMDB(endpoint);
  return data.results || [];
}

async function getTopRatedMovies(config: LanguageConfig, page: number = 1): Promise<TMDBMovie[]> {
  const minVotes = ['ml', 'kn', 'ta'].includes(config.tmdb_code) ? 50 : 100;
  const endpoint = `/discover/movie?with_original_language=${config.tmdb_code}&sort_by=vote_average.desc&vote_count.gte=${minVotes}&page=${page}`;
  const data = await fetchTMDB(endpoint);
  return data.results || [];
}

async function getMovieCredits(tmdbId: number): Promise<TMDBCredits> {
  const data = await fetchTMDB(`/movie/${tmdbId}/credits`);
  return data;
}

async function getMovieDetails(tmdbId: number): Promise<any> {
  return fetchTMDB(`/movie/${tmdbId}`);
}

// ============================================================
// QUALITY CHECKS
// ============================================================

function isQualityMovie(movie: TMDBMovie, config: LanguageConfig): { pass: boolean; category: string; reason: string } {
  // Reject low-rated
  if (movie.vote_average < config.min_rating) {
    return { pass: false, category: 'rejected', reason: `Rating ${movie.vote_average} < ${config.min_rating}` };
  }

  // Lower vote threshold for regional languages
  const minVotes = ['ml', 'kn', 'ta'].includes(config.tmdb_code) ? 10 : 30;
  if (movie.vote_count < minVotes) {
    return { pass: false, category: 'rejected', reason: `Only ${movie.vote_count} votes` };
  }

  // Determine category
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 2020;
  
  if (year <= 2005 && movie.vote_average >= 6.5) {
    return { pass: true, category: 'classic', reason: `Classic from ${year}` };
  }
  
  if (movie.vote_average >= 7.5) {
    return { pass: true, category: 'blockbuster', reason: `Exceptional rating ${movie.vote_average}` };
  }
  
  if (movie.vote_average >= 7.0 && movie.vote_count < 1000) {
    return { pass: true, category: 'hidden-gem', reason: `Hidden gem with ${movie.vote_average} rating` };
  }

  if (movie.vote_average >= config.min_rating) {
    return { pass: true, category: 'quality', reason: `Quality movie` };
  }

  return { pass: false, category: 'rejected', reason: 'Did not meet thresholds' };
}

// ============================================================
// INGESTION
// ============================================================

async function ingestMovie(movie: TMDBMovie, config: LanguageConfig, category: string): Promise<boolean> {
  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', movie.id)
      .single();

    if (existing) {
      console.log(`  ⏭ Already exists: ${movie.title}`);
      return false;
    }

    // Get additional details
    const [details, credits] = await Promise.all([
      getMovieDetails(movie.id),
      getMovieCredits(movie.id),
    ]);

    const director = credits.crew.find(c => c.job === 'Director')?.name;
    const cast = credits.cast.slice(0, 5);
    const hero = cast[0]?.name;
    const heroine = cast.find(c => c.order > 0)?.name;
    const genres = movie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);
    const year = new Date(movie.release_date).getFullYear();
    const slug = `${movie.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;

    const movieData = {
      tmdb_id: movie.id,
      title_en: movie.title,
      slug,
      language: config.name,
      release_date: movie.release_date,
      release_year: year,
      genres,
      director,
      hero,
      heroine,
      cast_members: cast.map(c => JSON.stringify({ name: c.name, character: c.character, order: c.order })),
      poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
      synopsis: movie.overview,
      avg_rating: movie.vote_average,
      runtime_minutes: details.runtime,
      is_published: true,
      is_classic: category === 'classic',
      is_blockbuster: category === 'blockbuster',
      is_underrated: category === 'hidden-gem',
    };

    const { error } = await supabase.from('movies').insert(movieData);
    if (error) {
      console.error(`  ❌ Error inserting ${movie.title}:`, error.message);
      return false;
    }

    console.log(`  ✅ Added: ${movie.title} (${year}) [${category}]`);
    return true;
  } catch (err) {
    console.error(`  ❌ Error processing ${movie.title}:`, err);
    return false;
  }
}

async function ingestLanguage(config: LanguageConfig, dryRun: boolean): Promise<{ added: number; skipped: number }> {
  console.log(`\n🎬 Processing ${config.name} movies...`);
  console.log(`   Min rating: ${config.min_rating}, Max count: ${config.max_count}`);

  // Check current count
  const { count: currentCount } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('language', config.name)
    .eq('is_published', true);

  console.log(`   Current: ${currentCount || 0} movies`);

  if ((currentCount || 0) >= config.max_count) {
    console.log(`   ⏭ Already at max capacity`);
    return { added: 0, skipped: 0 };
  }

  const remaining = config.max_count - (currentCount || 0);
  let added = 0;
  let skipped = 0;

  // Fetch movies from TMDB using multiple strategies
  const movieMap = new Map<number, TMDBMovie>();
  
  // Strategy 1: Top rated movies (up to 20 pages)
  console.log(`   Fetching top-rated...`);
  for (let page = 1; page <= 20 && movieMap.size < remaining * 3; page++) {
    const movies = await getTopRatedMovies(config, page);
    if (movies.length === 0) break;
    movies.forEach(m => movieMap.set(m.id, m));
    await new Promise(r => setTimeout(r, 150)); // Rate limit
  }
  
  // Strategy 2: Discover by rating (up to 20 pages)
  console.log(`   Fetching by rating...`);
  for (let page = 1; page <= 20 && movieMap.size < remaining * 3; page++) {
    const movies = await discoverMovies(config, page);
    if (movies.length === 0) break;
    movies.forEach(m => movieMap.set(m.id, m));
    await new Promise(r => setTimeout(r, 150)); // Rate limit
  }
  
  // Strategy 3: Popular movies (up to 15 pages)
  if (config.include_popular) {
    console.log(`   Fetching popular...`);
    for (let page = 1; page <= 15 && movieMap.size < remaining * 3; page++) {
      const movies = await getPopularMovies(config, page);
      if (movies.length === 0) break;
      movies.forEach(m => movieMap.set(m.id, m));
      await new Promise(r => setTimeout(r, 150)); // Rate limit
    }
  }

  const allMovies = Array.from(movieMap.values());
  console.log(`   Found ${allMovies.length} unique candidates from TMDB`);

  // Process each movie
  for (const movie of allMovies) {
    if (added >= remaining) break;

    const check = isQualityMovie(movie, config);
    if (!check.pass) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  📋 Would add: ${movie.title} (${movie.vote_average}) [${check.category}]`);
      added++;
    } else {
      const success = await ingestMovie(movie, config, check.category);
      if (success) added++;
      else skipped++;
      await new Promise(r => setTimeout(r, 300)); // Rate limit
    }
  }

  return { added, skipped };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const showStatus = args.includes('--status');
  const ingestAll = args.includes('--all');

  console.log('🌍 MULTI-LANGUAGE MOVIE INGESTION');
  console.log('==================================\n');

  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not set');
    process.exit(1);
  }

  // Show current status
  const { data: langStats } = await supabase
    .from('movies')
    .select('language')
    .eq('is_published', true);

  const counts = new Map<string, number>();
  for (const m of langStats || []) {
    counts.set(m.language || 'Unknown', (counts.get(m.language || 'Unknown') || 0) + 1);
  }

  console.log('📊 Current Distribution:');
  for (const [lang, count] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1])) {
    const total = langStats?.length || 1;
    console.log(`   ${lang}: ${count} (${((count / total) * 100).toFixed(1)}%)`);
  }

  if (showStatus) {
    console.log('\n✅ Status check complete');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Determine which languages to process
  const languagesToProcess: LanguageConfig[] = [];
  
  if (ingestAll) {
    languagesToProcess.push(...LANGUAGE_CONFIGS);
  } else {
    for (const config of LANGUAGE_CONFIGS) {
      if (args.includes(`--${config.name.toLowerCase()}`)) {
        languagesToProcess.push(config);
      }
    }
  }

  if (languagesToProcess.length === 0) {
    console.log('\n⚠️ No languages specified. Use:');
    console.log('   --all          Ingest all languages');
    console.log('   --hindi        Ingest Hindi only');
    console.log('   --tamil        Ingest Tamil only');
    console.log('   --malayalam    Ingest Malayalam only');
    console.log('   --english      Ingest English only');
    console.log('   --kannada      Ingest Kannada only');
    console.log('   --dry          Preview without making changes');
    console.log('   --status       Show current coverage only');
    return;
  }

  // Process each language
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const config of languagesToProcess) {
    const result = await ingestLanguage(config, dryRun);
    totalAdded += result.added;
    totalSkipped += result.skipped;
  }

  console.log('\n==================================');
  console.log(`✅ Complete: ${totalAdded} added, ${totalSkipped} skipped`);
  
  if (dryRun) {
    console.log('\n💡 Run without --dry to apply changes');
  }
}

main().catch(console.error);

