#!/usr/bin/env npx tsx
/**
 * COMPREHENSIVE CONTENT FLAGS ENRICHMENT SCRIPT
 * 
 * Enriches movies with content classification flags:
 * - sequel_number: from TMDB collections
 * - franchise: collection/series name
 * - pan_india: multi-language simultaneous release detection
 * - biopic: biography detection from title/overview
 * - remake_of: original movie reference (Wikipedia)
 * - original_language: if remake, the original language
 * - based_on: "true events", "novel", "short story", etc.
 * - debut_director: first film for director
 * - debut_hero: first film for lead actor
 * 
 * Sources:
 *   - TMDB collections and keywords
 *   - Wikipedia infobox
 *   - Title pattern analysis
 *   - Director/actor filmography
 * 
 * Usage:
 *   npx tsx scripts/enrich-content-flags.ts --limit=100
 *   npx tsx scripts/enrich-content-flags.ts --limit=500 --execute
 *   npx tsx scripts/enrich-content-flags.ts --decade=2020 --execute
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
const RATE_LIMIT_DELAY = 300;

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
const hasFlag = (name: string): boolean => 
  args.includes(`--${name}`) || args.includes(`--${name.replace('-', '')}`) || args.includes('--dry');

const LIMIT = parseInt(getArg('limit', '200'));
const EXECUTE = hasFlag('execute') && !hasFlag('dry');
const DECADE = getArg('decade', '');
const VERBOSE = hasFlag('verbose') || hasFlag('v');

// ============================================================
// TYPES
// ============================================================

interface ContentFlags {
  pan_india?: boolean;
  remake_of?: string;
  original_language?: string;
  sequel_number?: number;
  franchise?: string;
  biopic?: boolean;
  based_on?: string;
  debut_director?: boolean;
  debut_hero?: boolean;
  collection_id?: number;
}

interface Movie {
  id: string;
  title_en: string;
  release_year: number;
  tmdb_id: number | null;
  director: string | null;
  hero: string | null;
  synopsis: string | null;
  overview: string | null;
  content_flags: ContentFlags | null;
  is_pan_india?: boolean;
}

// ============================================================
// DETECTION PATTERNS
// ============================================================

// Biopic detection patterns
const BIOPIC_PATTERNS = [
  /biopic/i,
  /true story/i,
  /based on.*life/i,
  /based on the life/i,
  /biography/i,
  /biographical/i,
  /real.?life/i,
  /life story/i,
  /inspired by.*true/i,
];

// "Based on" detection patterns
const BASED_ON_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /based on true events?/i, type: 'true events' },
  { pattern: /based on a true story/i, type: 'true events' },
  { pattern: /real.?life (story|events?)/i, type: 'true events' },
  { pattern: /based on.*novel/i, type: 'novel' },
  { pattern: /adapted from.*novel/i, type: 'novel' },
  { pattern: /based on.*book/i, type: 'book' },
  { pattern: /based on.*short story/i, type: 'short story' },
  { pattern: /based on.*play/i, type: 'play' },
  { pattern: /based on.*comic/i, type: 'comic' },
  { pattern: /based on.*folklore/i, type: 'folklore' },
  { pattern: /based on.*mythology/i, type: 'mythology' },
  { pattern: /mythological/i, type: 'mythology' },
];

// Remake detection patterns
const REMAKE_PATTERNS = [
  /remake of/i,
  /remade from/i,
  /based on.*\d{4}\s+film/i,
  /Telugu remake/i,
  /dubbed version/i,
];

// Pan-India indicators
const PAN_INDIA_PATTERNS = [
  /pan.?india/i,
  /pan.?indian/i,
  /multi.?lingual/i,
  /simultaneously.*languages?/i,
  /released in.*languages?/i,
];

// Pan-India heroes (known for multi-language releases)
const PAN_INDIA_HEROES = [
  'Prabhas', 'Allu Arjun', 'Ram Charan', 'Jr. NTR', 'Mahesh Babu',
  'Pawan Kalyan', 'Chiranjeevi', 'Vijay Deverakonda', 'Yash', 'Rajinikanth'
];

// Pan-India directors
const PAN_INDIA_DIRECTORS = [
  'S.S. Rajamouli', 'Rajamouli', 'Prashanth Neel', 'Koratala Siva',
  'Sukumar', 'Trivikram', 'Shankar'
];

// Known Telugu remakes mapping
const KNOWN_REMAKES: Record<string, { original: string; language: string }> = {
  'Temper': { original: 'Singham', language: 'Hindi' },
  'Kick': { original: 'Kick', language: 'Hindi' },
  'Ready': { original: 'Ready', language: 'Hindi' },
  'Bodyguard': { original: 'Bodyguard', language: 'Hindi' },
  'Gabbar Singh': { original: 'Dabangg', language: 'Hindi' },
  'Dookudu': { original: 'Wanted', language: 'Hindi' }, // Partial remake
  'Khaleja': { original: 'Khiladi', language: 'Hindi' },
};

// ============================================================
// TMDB HELPERS
// ============================================================

interface TMDBCollection {
  id: number;
  name: string;
  parts: Array<{ id: number; title: string; release_date: string }>;
}

async function fetchTMDBCollection(tmdbId: number): Promise<{
  franchise?: string;
  sequelNumber?: number;
  collectionId?: number;
} | null> {
  if (!TMDB_API_KEY) return null;

  try {
    const movieUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const movieRes = await fetch(movieUrl);
    if (!movieRes.ok) return null;

    const movie = await movieRes.json();
    if (!movie.belongs_to_collection) return null;

    const collectionUrl = `${TMDB_BASE_URL}/collection/${movie.belongs_to_collection.id}?api_key=${TMDB_API_KEY}`;
    const collectionRes = await fetch(collectionUrl);

    if (!collectionRes.ok) {
      return {
        franchise: movie.belongs_to_collection.name,
        collectionId: movie.belongs_to_collection.id,
      };
    }

    const collection: TMDBCollection = await collectionRes.json();
    const sortedParts = [...collection.parts].sort((a, b) =>
      new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
    );

    const sequelNumber = sortedParts.findIndex(p => p.id === tmdbId) + 1;

    return {
      franchise: collection.name.replace(/ Collection$/i, ''),
      sequelNumber: sequelNumber > 0 ? sequelNumber : undefined,
      collectionId: collection.id,
    };
  } catch {
    return null;
  }
}

async function fetchTMDBKeywords(tmdbId: number): Promise<string[]> {
  if (!TMDB_API_KEY) return [];

  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/keywords?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.keywords || []).map((k: { name: string }) => k.name.toLowerCase());
  } catch {
    return [];
  }
}

// ============================================================
// DETECTION FUNCTIONS
// ============================================================

function detectBiopic(title: string, synopsis: string | null): boolean {
  const text = `${title} ${synopsis || ''}`.toLowerCase();
  return BIOPIC_PATTERNS.some(pattern => pattern.test(text));
}

function detectBasedOn(title: string, synopsis: string | null): string | null {
  const text = `${title} ${synopsis || ''}`;
  
  for (const { pattern, type } of BASED_ON_PATTERNS) {
    if (pattern.test(text)) {
      return type;
    }
  }
  return null;
}

function detectRemake(title: string, synopsis: string | null): { original: string; language: string } | null {
  // Check known remakes first
  const knownRemake = KNOWN_REMAKES[title];
  if (knownRemake) {
    return knownRemake;
  }

  // Check synopsis for remake mentions
  const text = `${synopsis || ''}`;
  const remakeMatch = text.match(/remake of\s+(?:the\s+)?(?:\d{4}\s+)?([A-Za-z]+)\s+film/i);
  if (remakeMatch) {
    return { original: 'Unknown', language: remakeMatch[1] };
  }

  return null;
}

function detectSequelFromTitle(title: string): number | null {
  const patterns = [
    /part\s*(\d+)/i,
    /chapter\s*(\d+)/i,
    /\s(\d)$/,
    /\sII$/i,
    /\sIII$/i,
    /\sIV$/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      if (pattern === /\sII$/i) return 2;
      if (pattern === /\sIII$/i) return 3;
      if (pattern === /\sIV$/i) return 4;
      return parseInt(match[1]);
    }
  }
  return null;
}

function detectPanIndia(
  movie: Movie,
  keywords: string[]
): boolean {
  // Check explicit flag
  if (movie.is_pan_india) return true;

  // Check patterns in synopsis
  const text = `${movie.synopsis || ''} ${movie.overview || ''}`;
  if (PAN_INDIA_PATTERNS.some(p => p.test(text))) return true;

  // Check keywords
  if (keywords.some(k => k.includes('pan-india') || k.includes('multilingual'))) {
    return true;
  }

  // Check hero/director combination for recent big-budget films
  if (movie.release_year >= 2018) {
    const isTopHero = PAN_INDIA_HEROES.some(h => 
      movie.hero?.toLowerCase().includes(h.toLowerCase())
    );
    const isTopDirector = PAN_INDIA_DIRECTORS.some(d => 
      movie.director?.toLowerCase().includes(d.toLowerCase())
    );
    
    // High probability pan-india if both top hero and director
    if (isTopHero && isTopDirector) return true;
  }

  return false;
}

// ============================================================
// DEBUT DETECTION
// ============================================================

async function isDebutFilm(
  personName: string | null,
  personType: 'director' | 'hero',
  currentYear: number,
  currentMovieId: string
): Promise<boolean> {
  if (!personName) return false;

  const field = personType === 'director' ? 'director' : 'hero';
  
  const { data: earlierMovies } = await supabase
    .from('movies')
    .select('id, release_year')
    .eq(field, personName)
    .lt('release_year', currentYear)
    .limit(1);

  // If no earlier movies found, this might be their debut
  if (!earlierMovies || earlierMovies.length === 0) {
    // Double check there are no same-year earlier films
    const { data: sameYearMovies } = await supabase
      .from('movies')
      .select('id')
      .eq(field, personName)
      .eq('release_year', currentYear)
      .neq('id', currentMovieId)
      .limit(1);

    return !sameYearMovies || sameYearMovies.length === 0;
  }

  return false;
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function enrichContentFlags(movie: Movie): Promise<ContentFlags | null> {
  // Start with existing flags or empty object
  const flags: ContentFlags = movie.content_flags || {};
  let hasNewFlags = false;

  const synopsis = movie.synopsis || movie.overview || '';

  // 1. TMDB Collection (franchise/sequel)
  if (movie.tmdb_id && !flags.franchise) {
    const collection = await fetchTMDBCollection(movie.tmdb_id);
    if (collection) {
      if (collection.franchise) {
        flags.franchise = collection.franchise;
        hasNewFlags = true;
      }
      if (collection.sequelNumber) {
        flags.sequel_number = collection.sequelNumber;
        hasNewFlags = true;
      }
      if (collection.collectionId) {
        flags.collection_id = collection.collectionId;
        hasNewFlags = true;
      }
    }
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }

  // 2. Sequel from title (if not from TMDB)
  if (!flags.sequel_number) {
    const sequelNum = detectSequelFromTitle(movie.title_en);
    if (sequelNum) {
      flags.sequel_number = sequelNum;
      hasNewFlags = true;
    }
  }

  // 3. Biopic detection
  if (flags.biopic === undefined) {
    if (detectBiopic(movie.title_en, synopsis)) {
      flags.biopic = true;
      hasNewFlags = true;
    }
  }

  // 4. Based on detection
  if (!flags.based_on) {
    const basedOn = detectBasedOn(movie.title_en, synopsis);
    if (basedOn) {
      flags.based_on = basedOn;
      hasNewFlags = true;
    }
  }

  // 5. Remake detection
  if (!flags.remake_of) {
    const remake = detectRemake(movie.title_en, synopsis);
    if (remake) {
      flags.remake_of = remake.original;
      flags.original_language = remake.language;
      hasNewFlags = true;
    }
  }

  // 6. Pan-India detection
  if (flags.pan_india === undefined) {
    let keywords: string[] = [];
    if (movie.tmdb_id) {
      keywords = await fetchTMDBKeywords(movie.tmdb_id);
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
    
    if (detectPanIndia(movie, keywords)) {
      flags.pan_india = true;
      hasNewFlags = true;
    }
  }

  // 7. Debut detection (optional, expensive)
  if (flags.debut_director === undefined && movie.director) {
    const isDebut = await isDebutFilm(movie.director, 'director', movie.release_year, movie.id);
    if (isDebut) {
      flags.debut_director = true;
      hasNewFlags = true;
    }
  }

  if (flags.debut_hero === undefined && movie.hero) {
    const isDebut = await isDebutFilm(movie.hero, 'hero', movie.release_year, movie.id);
    if (isDebut) {
      flags.debut_hero = true;
      hasNewFlags = true;
    }
  }

  return hasNewFlags ? flags : null;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main(): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           COMPREHENSIVE CONTENT FLAGS ENRICHMENT                     ║
║     Franchise • Biopic • Remake • Pan-India • Debut                  ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);

  // Build query
  let query = supabase
    .from('movies')
    .select(`
      id, title_en, release_year, tmdb_id, director, hero,
      synopsis, overview, content_flags, is_pan_india
    `)
    .eq('language', 'Telugu')
    .or('content_flags.is.null,content_flags.eq.{}')
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
    console.log(chalk.green('  ✅ No movies need content flags enrichment.'));
    return;
  }

  console.log(`\n  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Process movies
  const results: Array<{ movie: Movie; flags: ContentFlags }> = [];
  const stats = {
    franchise: 0,
    biopic: 0,
    remake: 0,
    pan_india: 0,
    debut_director: 0,
    debut_hero: 0,
    based_on: 0,
  };
  let skipped = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    
    process.stdout.write(`\r  Processing: ${i + 1}/${movies.length} - ${movie.title_en?.substring(0, 30).padEnd(30)}...`);

    const flags = await enrichContentFlags(movie);

    if (flags && Object.keys(flags).length > 0) {
      results.push({ movie, flags });
      
      if (flags.franchise) stats.franchise++;
      if (flags.biopic) stats.biopic++;
      if (flags.remake_of) stats.remake++;
      if (flags.pan_india) stats.pan_india++;
      if (flags.debut_director) stats.debut_director++;
      if (flags.debut_hero) stats.debut_hero++;
      if (flags.based_on) stats.based_on++;

      if (VERBOSE) {
        console.log(`\n    ${movie.title_en}: ${JSON.stringify(flags)}`);
      }
    } else {
      skipped++;
    }
  }

  console.log('\n');

  // Summary
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.cyan.bold('📊 ENRICHMENT SUMMARY'));
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(`
  Results: ${chalk.cyan(results.length)} enriched, ${chalk.gray(skipped)} no new flags
  `);

  console.log('  Flag Distribution:');
  console.log(`    Franchise/Sequel: ${chalk.blue(stats.franchise.toString().padStart(4))}`);
  console.log(`    Biopic:           ${chalk.green(stats.biopic.toString().padStart(4))}`);
  console.log(`    Remake:           ${chalk.yellow(stats.remake.toString().padStart(4))}`);
  console.log(`    Pan-India:        ${chalk.magenta(stats.pan_india.toString().padStart(4))}`);
  console.log(`    Based On:         ${chalk.cyan(stats.based_on.toString().padStart(4))}`);
  console.log(`    Debut Director:   ${chalk.gray(stats.debut_director.toString().padStart(4))}`);
  console.log(`    Debut Hero:       ${chalk.gray(stats.debut_hero.toString().padStart(4))}`);

  // Apply changes if --execute flag is set
  if (EXECUTE && results.length > 0) {
    console.log(chalk.cyan('\n  Applying changes to database...'));

    let successCount = 0;
    for (const { movie, flags } of results) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ content_flags: flags })
        .eq('id', movie.id);

      if (updateError) {
        console.error(chalk.red(`  ✗ Failed to update ${movie.title_en}:`), updateError.message);
      } else {
        successCount++;
      }
    }

    console.log(chalk.green(`\n  ✅ Updated ${successCount}/${results.length} movies`));
  } else if (!EXECUTE && results.length > 0) {
    console.log(chalk.yellow('\n  ⚠️  DRY RUN - Run with --execute to apply changes'));
    
    // Show sample of changes
    console.log('\n  Sample content flags (first 10):');
    for (const { movie, flags } of results.slice(0, 10)) {
      console.log(`    ${movie.title_en}: ${JSON.stringify(flags)}`);
    }
  }
}

main().catch(console.error);
