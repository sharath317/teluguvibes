#!/usr/bin/env npx tsx
/**
 * AGE RATING ENRICHMENT SCRIPT
 * 
 * Derives Indian censor classification (U/U-A/A/S) from multiple sources:
 * 1. TMDB certification data (highest priority)
 * 2. Genre-based inference
 * 3. Content keyword analysis
 * 
 * Age Rating Mapping:
 *   U    - Universal (suitable for all ages)
 *   U/A  - Parental guidance for children under 12
 *   A    - Adults only (18+)
 *   S    - Restricted to specialized audiences
 * 
 * Usage:
 *   npx tsx scripts/enrich-age-rating.ts --limit=100
 *   npx tsx scripts/enrich-age-rating.ts --limit=500 --execute
 *   npx tsx scripts/enrich-age-rating.ts --decade=2020 --execute
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
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 250; // ms between API calls

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

const LIMIT = parseInt(getArg('limit', '100'));
const EXECUTE = hasFlag('execute');
const DECADE = getArg('decade', '');
const VERBOSE = hasFlag('verbose') || hasFlag('v');

// ============================================================
// TYPES
// ============================================================

type IndianAgeRating = 'U' | 'U/A' | 'A' | 'S';

interface Movie {
  id: string;
  title_en: string;
  release_year: number;
  tmdb_id: number | null;
  genres: string[];
  age_rating: string | null;
  overview?: string;
}

interface EnrichmentResult {
  movieId: string;
  title: string;
  age_rating: IndianAgeRating;
  source: string;
  confidence: number;
}

// ============================================================
// CERTIFICATION MAPPING
// ============================================================

// Map international certifications to Indian age ratings
const CERTIFICATION_MAP: Record<string, IndianAgeRating> = {
  // US Ratings
  'G': 'U',
  'PG': 'U',
  'PG-13': 'U/A',
  'R': 'A',
  'NC-17': 'A',
  'NR': 'U/A',
  
  // UK Ratings
  'U': 'U',
  'PG': 'U',
  '12A': 'U/A',
  '12': 'U/A',
  '15': 'U/A',
  '18': 'A',
  'R18': 'A',
  
  // India Ratings (direct mapping)
  'UA': 'U/A',
  'U/A': 'U/A',
  
  // Australia Ratings
  'E': 'U',
  'M': 'U/A',
  'MA15+': 'U/A',
  'R18+': 'A',
  'X18+': 'A',
  
  // Germany Ratings
  '0': 'U',
  '6': 'U',
  '12': 'U/A',
  '16': 'U/A',
  '18': 'A',
};

// Genre-based age rating inference
const GENRE_AGE_MAP: Record<string, IndianAgeRating> = {
  'Horror': 'A',
  'Adult': 'A',
  'Erotic': 'A',
  'Thriller': 'U/A',
  'Crime': 'U/A',
  'War': 'U/A',
  'Action': 'U/A',
  'Mystery': 'U/A',
  'Animation': 'U',
  'Family': 'U',
  'Children': 'U',
  'Kids': 'U',
  'Comedy': 'U',
  'Romance': 'U/A',
  'Drama': 'U/A',
  'Documentary': 'U',
};

// Content keywords that suggest adult rating
const ADULT_KEYWORDS = [
  'violence', 'gore', 'murder', 'killing', 'death',
  'sexual', 'nude', 'erotic', 'adult',
  'drug', 'cocaine', 'heroin', 'addiction',
  'abuse', 'assault', 'rape', 'torture',
  'horror', 'blood', 'gruesome',
];

// Content keywords that suggest family-friendly
const FAMILY_KEYWORDS = [
  'children', 'kids', 'family', 'animated',
  'cartoon', 'educational', 'fairy tale',
  'adventure', 'wholesome',
];

// ============================================================
// TMDB CERTIFICATION FETCHER
// ============================================================

async function getTMDBCertification(tmdbId: number): Promise<{ rating: IndianAgeRating | null; source: string; confidence: number }> {
  if (!TMDB_API_KEY) {
    return { rating: null, source: 'tmdb', confidence: 0 };
  }

  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/release_dates?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { rating: null, source: 'tmdb', confidence: 0 };
    }

    const data = await response.json();
    const results = data.results || [];

    // Priority order for certification lookup
    const priorityCountries = ['IN', 'US', 'GB', 'AU', 'DE'];
    
    for (const country of priorityCountries) {
      const countryData = results.find((r: { iso_3166_1: string }) => r.iso_3166_1 === country);
      if (countryData?.release_dates) {
        for (const release of countryData.release_dates) {
          if (release.certification) {
            const mappedRating = CERTIFICATION_MAP[release.certification];
            if (mappedRating) {
              const confidence = country === 'IN' ? 0.95 : 0.85;
              return { rating: mappedRating, source: `tmdb-${country}`, confidence };
            }
          }
        }
      }
    }

    return { rating: null, source: 'tmdb', confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  TMDB error for ${tmdbId}:`, error);
    return { rating: null, source: 'tmdb', confidence: 0 };
  }
}

// ============================================================
// GENRE-BASED INFERENCE
// ============================================================

function inferFromGenres(genres: string[]): { rating: IndianAgeRating; confidence: number } {
  if (!genres || genres.length === 0) {
    return { rating: 'U/A', confidence: 0.3 };
  }

  // Check for adult genres first
  for (const genre of genres) {
    if (['Horror', 'Adult', 'Erotic'].includes(genre)) {
      return { rating: 'A', confidence: 0.7 };
    }
  }

  // Check for family genres
  for (const genre of genres) {
    if (['Animation', 'Family', 'Children', 'Kids'].includes(genre)) {
      return { rating: 'U', confidence: 0.75 };
    }
  }

  // Check for U/A genres
  for (const genre of genres) {
    if (['Thriller', 'Crime', 'War', 'Action', 'Mystery'].includes(genre)) {
      return { rating: 'U/A', confidence: 0.6 };
    }
  }

  // Default to U/A for drama, romance, etc.
  return { rating: 'U/A', confidence: 0.5 };
}

// ============================================================
// CONTENT-BASED INFERENCE
// ============================================================

function inferFromContent(overview: string | undefined): { rating: IndianAgeRating | null; confidence: number } {
  if (!overview) {
    return { rating: null, confidence: 0 };
  }

  const lowerOverview = overview.toLowerCase();

  // Check for adult content keywords
  let adultKeywordCount = 0;
  for (const keyword of ADULT_KEYWORDS) {
    if (lowerOverview.includes(keyword)) {
      adultKeywordCount++;
    }
  }

  if (adultKeywordCount >= 3) {
    return { rating: 'A', confidence: 0.65 };
  }

  // Check for family content keywords
  let familyKeywordCount = 0;
  for (const keyword of FAMILY_KEYWORDS) {
    if (lowerOverview.includes(keyword)) {
      familyKeywordCount++;
    }
  }

  if (familyKeywordCount >= 2) {
    return { rating: 'U', confidence: 0.55 };
  }

  return { rating: null, confidence: 0 };
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function enrichAgeRating(movie: Movie): Promise<EnrichmentResult | null> {
  // Skip if already has age rating
  if (movie.age_rating) {
    return null;
  }

  let bestRating: IndianAgeRating | null = null;
  let bestSource = 'inference';
  let bestConfidence = 0;

  // 1. Try TMDB certification (highest priority)
  if (movie.tmdb_id) {
    const tmdbResult = await getTMDBCertification(movie.tmdb_id);
    if (tmdbResult.rating && tmdbResult.confidence > bestConfidence) {
      bestRating = tmdbResult.rating;
      bestSource = tmdbResult.source;
      bestConfidence = tmdbResult.confidence;
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 2. If no TMDB result, try genre-based inference
  if (!bestRating || bestConfidence < 0.7) {
    const genreResult = inferFromGenres(movie.genres);
    if (genreResult.confidence > bestConfidence) {
      bestRating = genreResult.rating;
      bestSource = 'genre-inference';
      bestConfidence = genreResult.confidence;
    }
  }

  // 3. Content-based inference as supplement
  if (!bestRating || bestConfidence < 0.6) {
    const contentResult = inferFromContent(movie.overview);
    if (contentResult.rating && contentResult.confidence > bestConfidence) {
      bestRating = contentResult.rating;
      bestSource = 'content-inference';
      bestConfidence = contentResult.confidence;
    }
  }

  // Default to U/A if no determination could be made
  if (!bestRating) {
    bestRating = 'U/A';
    bestSource = 'default';
    bestConfidence = 0.3;
  }

  return {
    movieId: movie.id,
    title: movie.title_en,
    age_rating: bestRating,
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
║           AGE RATING ENRICHMENT                                      ║
║     Sources: TMDB Certification → Genre → Content Analysis           ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);

  // Build query for movies without age_rating
  let query = supabase
    .from('movies')
    .select('id, title_en, release_year, tmdb_id, genres, age_rating, overview')
    .eq('language', 'Telugu')
    .is('age_rating', null)
    .order('release_year', { ascending: false })
    .limit(LIMIT);

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
    console.log(chalk.green('  ✅ No movies need age rating enrichment.'));
    return;
  }

  console.log(`\n  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Process movies
  const results: EnrichmentResult[] = [];
  const stats = { U: 0, 'U/A': 0, A: 0, S: 0, skipped: 0 };
  const sourceStats: Record<string, number> = {};

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    const result = await enrichAgeRating(movie);

    if (result) {
      results.push(result);
      stats[result.age_rating]++;
      sourceStats[result.source] = (sourceStats[result.source] || 0) + 1;

      if (VERBOSE) {
        console.log(`  ${i + 1}. ${movie.title_en} (${movie.release_year}): ${result.age_rating} [${result.source}, ${(result.confidence * 100).toFixed(0)}%]`);
      }
    } else {
      stats.skipped++;
    }

    // Progress indicator
    if ((i + 1) % 20 === 0) {
      process.stdout.write(`\r  Processed: ${i + 1}/${movies.length}`);
    }
  }

  console.log('\n');

  // Summary
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('📊 ENRICHMENT SUMMARY'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`
  Age Rating Distribution:
    U (Universal):      ${chalk.green(stats.U.toString().padStart(4))} movies
    U/A (12+ guidance): ${chalk.yellow(stats['U/A'].toString().padStart(4))} movies
    A (Adults only):    ${chalk.red(stats.A.toString().padStart(4))} movies
    S (Specialized):    ${chalk.magenta(stats.S.toString().padStart(4))} movies
    Skipped:            ${chalk.gray(stats.skipped.toString().padStart(4))} movies
  `);

  console.log('  Source Distribution:');
  for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${source.padEnd(20)}: ${count}`);
  }

  // Apply changes if --execute flag is set
  if (EXECUTE && results.length > 0) {
    console.log(chalk.cyan('\n  Applying changes to database...'));

    let successCount = 0;
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ age_rating: result.age_rating })
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
    console.log('\n  Sample changes (first 10):');
    for (const result of results.slice(0, 10)) {
      console.log(`    ${result.title}: ${result.age_rating} [${result.source}]`);
    }
  }
}

main().catch(console.error);

