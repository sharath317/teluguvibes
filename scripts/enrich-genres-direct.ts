#!/usr/bin/env npx tsx
/**
 * DIRECT GENRE ENRICHMENT SCRIPT v1.0
 * 
 * Fetches genres directly from TMDB and Wikipedia to populate the genres[] array.
 * This must run BEFORE safe-classification to provide genre signals.
 * 
 * Sources (in priority order):
 * 1. TMDB Genres API - Best for films with tmdb_id
 * 2. English Wikipedia Infobox - Great for Telugu films with wiki pages
 * 3. Telugu Wikipedia Infobox - Telugu-specific categorization
 * 
 * Usage:
 *   npx tsx scripts/enrich-genres-direct.ts --limit=500
 *   npx tsx scripts/enrich-genres-direct.ts --limit=500 --execute
 *   npx tsx scripts/enrich-genres-direct.ts --decade=2020 --execute
 *   npx tsx scripts/enrich-genres-direct.ts --only-empty --execute
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

config({ path: resolve(process.cwd(), '.env.local') });

// ============================================================
// CONFIG
// ============================================================

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const RATE_LIMIT_DELAY = 200;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CLI argument parsing
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue: string = ''): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const LIMIT = parseInt(getArg('limit', '500'));
const EXECUTE = hasFlag('execute');
const DECADE = getArg('decade', '');
const VERBOSE = hasFlag('verbose') || hasFlag('v');
const ONLY_EMPTY = hasFlag('only-empty');
const CONCURRENCY = parseInt(getArg('concurrency', '20'));

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  title_te: string | null;
  release_year: number;
  tmdb_id: number | null;
  genres: string[] | null;
}

interface GenreResult {
  movieId: string;
  title: string;
  genres: string[];
  source: string;
  confidence: number;
}

// ============================================================
// GENRE NORMALIZATION
// ============================================================

const GENRE_MAP: Record<number, string> = {
  // TMDB Genre IDs to our canonical names
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'Historical',
  27: 'Horror',
  10402: 'Musical',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const TEXT_GENRE_MAP: Record<string, string> = {
  'action': 'Action',
  'adventure': 'Adventure',
  'animation': 'Animation',
  'comedy': 'Comedy',
  'crime': 'Crime',
  'documentary': 'Documentary',
  'drama': 'Drama',
  'family': 'Family',
  'fantasy': 'Fantasy',
  'historical': 'Historical',
  'history': 'Historical',
  'horror': 'Horror',
  'musical': 'Musical',
  'mystery': 'Mystery',
  'romance': 'Romance',
  'romantic': 'Romance',
  'sci-fi': 'Sci-Fi',
  'science fiction': 'Sci-Fi',
  'thriller': 'Thriller',
  'war': 'War',
  'western': 'Western',
  'sports': 'Sports',
  'sport': 'Sports',
  'biography': 'Biography',
  'biographical': 'Biography',
  'social': 'Social',
  'mythological': 'Mythological',
  'period': 'Historical',
};

function normalizeGenre(genre: string): string {
  const lower = genre.toLowerCase().trim();
  return TEXT_GENRE_MAP[lower] || genre;
}

function normalizeGenres(genres: string[]): string[] {
  const normalized = genres.map(normalizeGenre);
  // Remove duplicates
  return [...new Set(normalized)];
}

// ============================================================
// TMDB GENRE FETCHER
// ============================================================

async function getTMDBGenres(tmdbId: number): Promise<{ genres: string[] | null; confidence: number }> {
  if (!TMDB_API_KEY) {
    return { genres: null, confidence: 0 };
  }

  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { genres: null, confidence: 0 };
    }

    const data = await response.json();
    
    if (data.genres && data.genres.length > 0) {
      const genres = data.genres.map((g: { id: number; name: string }) => 
        GENRE_MAP[g.id] || normalizeGenre(g.name)
      );
      return { genres: normalizeGenres(genres), confidence: 0.95 };
    }

    return { genres: null, confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  TMDB error for ${tmdbId}:`, error);
    return { genres: null, confidence: 0 };
  }
}

// ============================================================
// WIKIPEDIA GENRE FETCHER
// ============================================================

async function getEnglishWikipediaGenres(title: string, year: number): Promise<{ genres: string[] | null; confidence: number }> {
  try {
    const wikiTitle = title.replace(/ /g, '_');
    
    const patterns = [
      `${wikiTitle}_(${year}_Telugu_film)`,
      `${wikiTitle}_(${year}_film)`,
      `${wikiTitle}_(Telugu_film)`,
      `${wikiTitle}_(film)`,
      wikiTitle,
    ];
    
    for (const pattern of patterns) {
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(pattern)}&format=json`;
      
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const pages = data.query?.pages;
      
      if (!pages) continue;
      
      const pageId = Object.keys(pages)[0];
      if (pageId === '-1') continue;
      
      const content = pages[pageId]?.revisions?.[0]?.slots?.main?.['*'];
      if (!content) continue;

      // Check if this is a Telugu film
      const isTeluguFilm = content.toLowerCase().includes('telugu') ||
                          content.toLowerCase().includes('tollywood');

      // Look for genre in infobox
      const genrePatterns = [
        /\|\s*genre\s*=\s*([^\n|]+)/i,
        /\|\s*genres\s*=\s*([^\n|]+)/i,
      ];

      for (const regex of genrePatterns) {
        const match = content.match(regex);
        if (match && match[1]) {
          // Extract genre names from wiki markup
          const genreText = match[1]
            .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2$1') // Handle [[link|text]] format
            .replace(/<!--[^>]+-->/g, '') // Remove comments
            .replace(/{{[^}]+}}/g, '') // Remove templates
            .replace(/<ref[^>]*>.*?<\/ref>/gi, '') // Remove refs
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/\[\[/g, '')
            .replace(/\]\]/g, '');
          
          // Split by common separators
          const genreList = genreText.split(/[,·•|<>]/)
            .map(g => g.trim())
            .filter(g => g.length > 1 && g.length < 30)
            .map(normalizeGenre)
            .filter(g => g.length > 1);
          
          if (genreList.length > 0) {
            return { 
              genres: normalizeGenres(genreList), 
              confidence: isTeluguFilm ? 0.90 : 0.80 
            };
          }
        }
      }

      // Also check categories
      const categoryMatch = content.matchAll(/\[\[Category:([^\]]+)\]\]/gi);
      const categories = Array.from(categoryMatch).map(m => m[1].toLowerCase());
      
      const categoryGenres: string[] = [];
      for (const cat of categories) {
        if (cat.includes('action')) categoryGenres.push('Action');
        else if (cat.includes('comedy')) categoryGenres.push('Comedy');
        else if (cat.includes('drama')) categoryGenres.push('Drama');
        else if (cat.includes('romance')) categoryGenres.push('Romance');
        else if (cat.includes('thriller')) categoryGenres.push('Thriller');
        else if (cat.includes('horror')) categoryGenres.push('Horror');
        else if (cat.includes('musical')) categoryGenres.push('Musical');
        else if (cat.includes('fantasy')) categoryGenres.push('Fantasy');
        else if (cat.includes('biographical')) categoryGenres.push('Biography');
        else if (cat.includes('sports')) categoryGenres.push('Sports');
      }
      
      if (categoryGenres.length > 0) {
        return { genres: normalizeGenres(categoryGenres), confidence: 0.70 };
      }
    }

    return { genres: null, confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  English Wikipedia error for ${title}:`, error);
    return { genres: null, confidence: 0 };
  }
}

// ============================================================
// TELUGU WIKIPEDIA GENRE FETCHER
// ============================================================

async function getTeluguWikipediaGenres(
  titleEn: string, 
  titleTe: string | null, 
  year: number
): Promise<{ genres: string[] | null; confidence: number }> {
  try {
    const titlesToTry = [titleTe, titleEn].filter(Boolean);
    
    for (const title of titlesToTry) {
      const wikiTitle = title!.replace(/ /g, '_');
      
      const patterns = [
        `${wikiTitle}_(${year}_సినిమా)`,
        `${wikiTitle}_(సినిమా)`,
        `${wikiTitle}_(${year}_film)`,
        wikiTitle,
      ];
      
      for (const pattern of patterns) {
        const apiUrl = `https://te.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(pattern)}&format=json`;
        
        const response = await fetch(apiUrl, {
          headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const pages = data.query?.pages;
        
        if (!pages) continue;
        
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') continue;
        
        const content = pages[pageId]?.revisions?.[0]?.slots?.main?.['*'];
        if (!content) continue;

        // Look for genre in Telugu Wikipedia infobox
        const genrePatterns = [
          /\|\s*genre\s*=\s*([^\n|]+)/i,
          /\|\s*ప్రక్రియ\s*=\s*([^\n|]+)/i, // Telugu word for genre
        ];

        for (const regex of genrePatterns) {
          const match = content.match(regex);
          if (match && match[1]) {
            const genreText = match[1]
              .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2$1')
              .replace(/<!--[^>]+-->/g, '')
              .replace(/{{[^}]+}}/g, '')
              .replace(/<[^>]+>/g, '')
              .replace(/\[\[/g, '')
              .replace(/\]\]/g, '');
            
            const genreList = genreText.split(/[,·•|]/)
              .map(g => g.trim())
              .filter(g => g.length > 1 && g.length < 30)
              .map(normalizeGenre)
              .filter(g => g.length > 1);
            
            if (genreList.length > 0) {
              return { genres: normalizeGenres(genreList), confidence: 0.85 };
            }
          }
        }
      }
    }

    return { genres: null, confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  Telugu Wikipedia error for ${titleEn}:`, error);
    return { genres: null, confidence: 0 };
  }
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function enrichGenres(movie: Movie): Promise<GenreResult | null> {
  // Skip if already has genres and not forcing
  if (!ONLY_EMPTY && movie.genres && movie.genres.length >= 2) {
    return null;
  }

  let bestGenres: string[] | null = null;
  let bestSource = '';
  let bestConfidence = 0;

  // 1. Try TMDB (highest priority)
  if (movie.tmdb_id) {
    const tmdbResult = await getTMDBGenres(movie.tmdb_id);
    if (tmdbResult.genres && tmdbResult.genres.length > 0 && tmdbResult.confidence > bestConfidence) {
      bestGenres = tmdbResult.genres;
      bestSource = 'tmdb';
      bestConfidence = tmdbResult.confidence;
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 2. Try English Wikipedia
  if (!bestGenres || bestGenres.length < 2) {
    const wikiResult = await getEnglishWikipediaGenres(movie.title_en, movie.release_year);
    if (wikiResult.genres && wikiResult.genres.length > 0) {
      if (!bestGenres) {
        bestGenres = wikiResult.genres;
        bestSource = 'english_wikipedia';
        bestConfidence = wikiResult.confidence;
      } else if (wikiResult.genres.length > bestGenres.length) {
        // Merge genres, keeping TMDB ones first
        const merged = [...bestGenres, ...wikiResult.genres.filter(g => !bestGenres!.includes(g))];
        bestGenres = merged.slice(0, 5); // Max 5 genres
        bestSource = `${bestSource}+english_wikipedia`;
      }
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 3. Try Telugu Wikipedia
  if (!bestGenres || bestGenres.length < 2) {
    const teWikiResult = await getTeluguWikipediaGenres(
      movie.title_en, 
      movie.title_te, 
      movie.release_year
    );
    if (teWikiResult.genres && teWikiResult.genres.length > 0) {
      if (!bestGenres) {
        bestGenres = teWikiResult.genres;
        bestSource = 'telugu_wikipedia';
        bestConfidence = teWikiResult.confidence;
      } else {
        // Merge genres
        const merged = [...bestGenres, ...teWikiResult.genres.filter(g => !bestGenres!.includes(g))];
        bestGenres = merged.slice(0, 5);
        bestSource = `${bestSource}+telugu_wikipedia`;
      }
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  if (!bestGenres || bestGenres.length === 0) {
    return null;
  }

  return {
    movieId: movie.id,
    title: movie.title_en,
    genres: bestGenres,
    source: bestSource,
    confidence: bestConfidence,
  };
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main(): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           DIRECT GENRE ENRICHMENT v1.0                               ║
║   Sources: TMDB → En Wikipedia → Te Wikipedia                        ║
║   Populates genres[] array for safe-classification                   ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log(`  Only empty: ${ONLY_EMPTY ? 'Yes' : 'No'}`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);

  // Build query for movies without/with few genres
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, release_year, tmdb_id, genres')
    .eq('language', 'Telugu')
    .order('release_year', { ascending: false })
    .limit(LIMIT);

  if (ONLY_EMPTY) {
    query = query.or('genres.is.null,genres.eq.{}');
  }

  if (DECADE) {
    const startYear = parseInt(DECADE);
    query = query.gte('release_year', startYear).lt('release_year', startYear + 10);
  }

  const { data: movies, error } = await query;

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('  ✅ No movies need genre enrichment.'));
    return;
  }

  console.log(`\n  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Process movies
  const results: GenreResult[] = [];
  const sourceStats: Record<string, number> = {};
  let noGenresFound = 0;
  let skipped = 0;

  // Process with concurrency control
  const batchSize = CONCURRENCY;
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, Math.min(i + batchSize, movies.length));
    
    const batchPromises = batch.map(async (movie) => {
      const result = await enrichGenres(movie as Movie);
      return { movie, result };
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const { movie, result } of batchResults) {
      if (result) {
        results.push(result);
        // Track primary source
        const primarySource = result.source.split('+')[0];
        sourceStats[primarySource] = (sourceStats[primarySource] || 0) + 1;

        if (VERBOSE) {
          console.log(`  ${movie.title_en}: ${result.genres.join(', ')} [${result.source}]`);
        }
      } else if (movie.genres && movie.genres.length >= 2) {
        skipped++;
      } else {
        noGenresFound++;
      }
    }

    // Progress indicator
    const completed = Math.min(i + batchSize, movies.length);
    const pct = Math.round((completed / movies.length) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  [${bar}] ${pct}% (${completed}/${movies.length}) | Found: ${results.length}`);
  }

  console.log('\n\n');

  // Summary
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('📊 GENRE ENRICHMENT SUMMARY'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`
  Results:
    Genres found:       ${chalk.green(results.length.toString().padStart(4))} movies
    No genres found:    ${chalk.yellow(noGenresFound.toString().padStart(4))} movies
    Skipped (had some): ${chalk.gray(skipped.toString().padStart(4))} movies
  `);

  console.log('  Source Distribution:');
  for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    const color = source === 'tmdb' ? chalk.green : chalk.blue;
    console.log(`    ${source.padEnd(20)}: ${color(count.toString())}`);
  }

  // Genre frequency analysis
  const genreFreq: Record<string, number> = {};
  for (const result of results) {
    for (const genre of result.genres) {
      genreFreq[genre] = (genreFreq[genre] || 0) + 1;
    }
  }
  
  console.log('\n  Top Genres Found:');
  const topGenres = Object.entries(genreFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [genre, count] of topGenres) {
    console.log(`    ${genre.padEnd(15)}: ${count}`);
  }

  // Apply changes if --execute flag is set
  if (EXECUTE && results.length > 0) {
    console.log(chalk.cyan('\n  Applying changes to database...'));

    let successCount = 0;
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ genres: result.genres })
        .eq('id', result.movieId);

      if (updateError) {
        console.error(chalk.red(`  ✗ Failed to update ${result.title}:`), updateError.message);
      } else {
        successCount++;
      }
    }

    console.log(chalk.green(`\n  ✅ Updated ${successCount}/${results.length} movies`));
  } else if (!EXECUTE && results.length > 0) {
    console.log(chalk.yellow('\n  ⚠️  DRY RUN - Run with --execute to apply changes'));
    
    // Show sample of changes
    console.log('\n  Sample genres (first 10):');
    for (const result of results.slice(0, 10)) {
      console.log(`    ${result.title}: ${result.genres.join(', ')} [${result.source}]`);
    }
  }
}

main().catch(console.error);

