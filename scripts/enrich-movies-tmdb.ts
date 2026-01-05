#!/usr/bin/env npx tsx
/**
 * Direct TMDB Movie Enrichment
 * 
 * Enriches existing movies in the movies table with TMDB data.
 * Works directly with movies table (doesn't require telugu_movie_index)
 * 
 * Usage:
 *   pnpm enrich:movies                    # Enrich movies without TMDB data
 *   pnpm enrich:movies --dry              # Preview mode
 *   pnpm enrich:movies --limit=10         # Limit to 10 movies
 *   pnpm enrich:movies --all              # Re-enrich all movies
 *   pnpm enrich:movies --missing-cast     # Enrich movies WITH tmdb_id but missing hero/heroine/director
 *   pnpm enrich:movies --store-cast-json  # Save full cast array to cast_json column
 *   pnpm enrich:movies --language=Telugu  # Target specific language (ignores is_published filter)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE
// ============================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TMDB API
// ============================================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const RATE_LIMIT_MS = 300;

async function searchTMDB(title: string, year?: number): Promise<any | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    api_key: apiKey,
    query: title,
    language: 'te', // Telugu
    include_adult: 'false',
  });

  if (year) {
    params.set('year', year.toString());
  }

  try {
    const response = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    
    // Find Telugu movie in results
    const teluguMovie = data.results?.find((m: any) => m.original_language === 'te');
    return teluguMovie || data.results?.[0] || null;
  } catch {
    return null;
  }
}

async function getMovieDetails(tmdbId: number): Promise<any | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ============================================================
// ENRICHMENT
// ============================================================

interface EnrichmentResult {
  movieId: string;
  title: string;
  success: boolean;
  tmdbId?: number;
  changes: string[];
  error?: string;
}

interface EnrichmentOptions {
  dryRun: boolean;
  storeCastJson: boolean;
}

/**
 * Extract hero (lead male actor) using TMDB gender data
 * Gender: 1 = Female, 2 = Male, 0 = Unknown
 */
function extractHero(cast: any[]): string | null {
  // Filter males (gender === 2) and sort by billing order
  const males = cast
    .filter((c: any) => c.gender === 2)
    .sort((a: any, b: any) => a.order - b.order);
  
  if (males.length > 0) {
    return males[0].name;
  }
  
  // Fallback: if no gender data, use first cast member
  return cast[0]?.name || null;
}

/**
 * Extract heroine (lead female actor) using TMDB gender data
 * Gender: 1 = Female, 2 = Male, 0 = Unknown
 */
function extractHeroine(cast: any[]): string | null {
  // Filter females (gender === 1) and sort by billing order
  const females = cast
    .filter((c: any) => c.gender === 1)
    .sort((a: any, b: any) => a.order - b.order);
  
  if (females.length > 0) {
    return females[0].name;
  }
  
  return null;
}

async function enrichMovie(movie: any, options: EnrichmentOptions): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    movieId: movie.id,
    title: movie.title_en,
    success: false,
    changes: [],
  };

  try {
    // Search TMDB if no TMDB ID
    let tmdbData: any = null;

    if (movie.tmdb_id) {
      tmdbData = await getMovieDetails(movie.tmdb_id);
    } else {
      const searchResult = await searchTMDB(movie.title_en, movie.release_year);
      if (searchResult) {
        tmdbData = await getMovieDetails(searchResult.id);
      }
    }

    if (!tmdbData) {
      result.error = 'Not found on TMDB';
      return result;
    }

    result.tmdbId = tmdbData.id;

    // Build update data
    const updates: Record<string, any> = {};

    if (!movie.tmdb_id && tmdbData.id) {
      updates.tmdb_id = tmdbData.id;
      result.changes.push('tmdb_id');
    }

    if (!movie.poster_url && tmdbData.poster_path) {
      updates.poster_url = `${TMDB_IMAGE_BASE}/w500${tmdbData.poster_path}`;
      result.changes.push('poster_url');
    }

    if (!movie.backdrop_url && tmdbData.backdrop_path) {
      updates.backdrop_url = `${TMDB_IMAGE_BASE}/w1280${tmdbData.backdrop_path}`;
      result.changes.push('backdrop_url');
    }

    // Extract director
    const director = tmdbData.credits?.crew?.find((c: any) => c.job === 'Director');
    if (!movie.director && director) {
      updates.director = director.name;
      result.changes.push('director');
    }

    // Extract music director
    const musicDirector = tmdbData.credits?.crew?.find((c: any) => 
      c.job === 'Original Music Composer' || c.job === 'Music' || c.job === 'Music Director'
    );
    if (!movie.music_director && musicDirector) {
      updates.music_director = musicDirector.name;
      result.changes.push('music_director');
    }

    // Extract hero/heroine using gender detection
    const cast = tmdbData.credits?.cast || [];
    
    if (!movie.hero) {
      const hero = extractHero(cast);
      if (hero) {
        updates.hero = hero;
        result.changes.push('hero');
      }
    }
    
    if (!movie.heroine) {
      const heroine = extractHeroine(cast);
      if (heroine) {
        updates.heroine = heroine;
        result.changes.push('heroine');
      }
    }

    // Genres
    if ((!movie.genres || movie.genres.length === 0) && tmdbData.genres) {
      updates.genres = tmdbData.genres.map((g: any) => g.name);
      result.changes.push('genres');
    }

    // Runtime
    if (!movie.runtime_minutes && tmdbData.runtime) {
      updates.runtime_minutes = tmdbData.runtime;
      result.changes.push('runtime');
    }

    // Ratings
    if (!movie.avg_rating && tmdbData.vote_average) {
      updates.avg_rating = tmdbData.vote_average;
      result.changes.push('avg_rating');
    }

    // Cast members (legacy format)
    if ((!movie.cast_members || movie.cast_members.length === 0) && cast.length > 0) {
      updates.cast_members = cast.slice(0, 10).map((c: any) => ({
        name: c.name,
        character: c.character,
        order: c.order
      }));
      result.changes.push('cast_members');
    }

    // Store full cast with gender data in cast_members (for review generator)
    // Overwrite existing cast_members with enhanced data including gender
    if (options.storeCastJson && cast.length > 0) {
      updates.cast_members = cast.slice(0, 15).map((c: any) => ({
        name: c.name,
        character: c.character,
        order: c.order,
        gender: c.gender,
        tmdb_id: c.id,
        profile_path: c.profile_path,
      }));
      result.changes.push('cast_members_enhanced');
    }

    if (result.changes.length === 0) {
      result.success = true;
      result.changes.push('already_complete');
      return result;
    }

    if (options.dryRun) {
      result.success = true;
      return result;
    }

    // Apply updates
    const { error } = await supabase
      .from('movies')
      .update(updates)
      .eq('id', movie.id);

    if (error) {
      result.error = error.message;
      return result;
    }

    result.success = true;
    return result;

  } catch (error: any) {
    result.error = error.message;
    return result;
  }
}

// ============================================================
// CLI
// ============================================================

interface CLIArgs {
  dryRun: boolean;
  all: boolean;
  limit: number;
  verbose: boolean;
  missingCast: boolean;      // Target movies WITH tmdb_id but missing hero/heroine/director
  storeCastJson: boolean;    // Save full cast array to cast_json column
  language?: string;         // Target specific language (e.g., "Telugu")
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const languageArg = args.find(a => a.startsWith('--language='));
  
  return {
    dryRun: args.includes('--dry') || args.includes('--dry-run'),
    all: args.includes('--all'),
    verbose: args.includes('-v') || args.includes('--verbose'),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50'),
    missingCast: args.includes('--missing-cast'),
    storeCastJson: args.includes('--store-cast-json'),
    language: languageArg?.split('=')[1],
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║            DIRECT TMDB MOVIE ENRICHMENT                       ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (!process.env.TMDB_API_KEY) {
    console.error(chalk.red('❌ TMDB_API_KEY not set'));
    process.exit(1);
  }

  // Display mode information
  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE'));
  }
  if (args.missingCast) {
    console.log(chalk.cyan('🎭 Mode: Enriching movies WITH tmdb_id but missing cast/crew'));
  }
  if (args.storeCastJson) {
    console.log(chalk.cyan('💾 Storing full cast_json for review generator'));
  }
  if (args.language) {
    console.log(chalk.cyan(`🌐 Language filter: ${args.language}`));
  }
  console.log('');

  // Build query based on flags
  let query = supabase
    .from('movies')
    .select('*')
    .order('release_year', { ascending: false });

  // Language filter (if specified, ignore is_published)
  if (args.language) {
    query = query.eq('language', args.language);
  } else {
    // Default behavior: only published movies
    query = query.eq('is_published', true);
  }

  // Determine which movies to target
  if (args.missingCast) {
    // Movies that HAVE tmdb_id but are missing hero OR heroine OR director
    query = query
      .not('tmdb_id', 'is', null)
      .or('hero.is.null,heroine.is.null,director.is.null');
  } else if (!args.all) {
    // Default: Only movies without TMDB data
    query = query.is('tmdb_id', null);
  }

  query = query.limit(args.limit);

  const { data: movies, error } = await query;

  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error.message);
    process.exit(1);
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies need enrichment'));
    process.exit(0);
  }

  console.log(chalk.cyan(`📋 Enriching ${movies.length} movies...\n`));

  // Prepare enrichment options
  const enrichmentOptions: EnrichmentOptions = {
    dryRun: args.dryRun,
    storeCastJson: args.storeCastJson,
  };

  let success = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];

    if (args.verbose) {
      console.log(`  [${i + 1}/${movies.length}] ${movie.title_en} (${movie.release_year})`);
    }

    const result = await enrichMovie(movie, enrichmentOptions);

    if (result.success) {
      if (result.changes.includes('already_complete')) {
        skipped++;
      } else {
        success++;
        if (args.verbose) {
          console.log(chalk.gray(`    → ${result.changes.join(', ')}`));
        }
      }
    } else {
      failed++;
      if (result.error) {
        errors.push(`${movie.title_en}: ${result.error}`);
      }
    }

    // Rate limit
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

    // Progress
    if (!args.verbose && i > 0 && i % 10 === 0) {
      console.log(`  Progress: ${i}/${movies.length} (${success} enriched)`);
    }
  }

  // Results
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 ENRICHMENT RESULTS'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Processed:   ${movies.length}`);
  console.log(`  Enriched:    ${chalk.green(success)}`);
  console.log(`  Skipped:     ${chalk.gray(skipped)}`);
  console.log(`  Failed:      ${chalk.red(failed)}`);

  if (errors.length > 0 && args.verbose) {
    console.log(chalk.yellow('\n⚠️ Errors:'));
    for (const error of errors.slice(0, 5)) {
      console.log(chalk.yellow(`  - ${error}`));
    }
  }

  // Quick stats after enrichment
  if (!args.dryRun && success > 0) {
    console.log(chalk.bold('\n📊 UPDATED STATS'));
    console.log(chalk.gray('─'.repeat(50)));

    // Build stats query with language filter if specified
    let statsQuery = supabase.from('movies').select('*', { count: 'exact', head: true });
    if (args.language) {
      statsQuery = statsQuery.eq('language', args.language);
    }

    const { count: withTmdb } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('language', args.language || 'Telugu')
      .not('tmdb_id', 'is', null);

    const { count: withPoster } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('language', args.language || 'Telugu')
      .not('poster_url', 'is', null);

    const { count: withHero } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('language', args.language || 'Telugu')
      .not('hero', 'is', null);

    const { count: withHeroine } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('language', args.language || 'Telugu')
      .not('heroine', 'is', null);

    const { count: withDirector } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('language', args.language || 'Telugu')
      .not('director', 'is', null);

    console.log(`  With TMDB ID:  ${withTmdb}`);
    console.log(`  With Poster:   ${withPoster}`);
    console.log(`  With Hero:     ${withHero}`);
    console.log(`  With Heroine:  ${withHeroine}`);
    console.log(`  With Director: ${withDirector}`);
  }

  console.log(chalk.green('\n✅ Enrichment complete\n'));
}

main().catch(console.error);

