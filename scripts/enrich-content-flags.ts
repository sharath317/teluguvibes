#!/usr/bin/env npx tsx
/**
 * Content Flags Enrichment Script
 * 
 * Enriches movies with content flags:
 * - sequel_number: from TMDB collections
 * - franchise: collection name
 * - pan_india: from existing is_pan_india or multi-language release
 * - biopic: detected from title patterns
 * - remake_of: detected from title patterns (partial)
 * 
 * Usage:
 *   npx tsx scripts/enrich-content-flags.ts
 *   npx tsx scripts/enrich-content-flags.ts --limit=500
 *   npx tsx scripts/enrich-content-flags.ts --dry
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// CONFIGURATION
// ============================================================

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const RATE_LIMIT_DELAY = 300;

// Biopic indicators in titles/overview
const BIOPIC_PATTERNS = [
  /biopic/i,
  /true story/i,
  /based on.*life/i,
  /biography/i,
  /real.?life/i,
  /inspired by/i,
];

// Common franchise patterns
const FRANCHISE_PATTERNS = [
  /part\s*[2-9]/i,
  /chapter\s*[2-9]/i,
  /: part (two|2|ii)/i,
  /sequel/i,
  /returns/i,
  /reloaded/i,
  /[2-9]$/,
];

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

// ============================================================
// TMDB COLLECTION FETCHER
// ============================================================

interface TMDBMovieDetails {
  id: number;
  title: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string;
  };
  overview?: string;
}

interface TMDBCollection {
  id: number;
  name: string;
  parts: Array<{
    id: number;
    title: string;
    release_date: string;
  }>;
}

async function fetchMovieCollection(tmdbId: number): Promise<{
  franchise?: string;
  sequelNumber?: number;
  collectionId?: number;
} | null> {
  if (!TMDB_API_KEY) return null;

  try {
    // Fetch movie details
    const movieUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const movieRes = await fetch(movieUrl);
    
    if (!movieRes.ok) return null;

    const movie: TMDBMovieDetails = await movieRes.json();

    if (!movie.belongs_to_collection) {
      return null;
    }

    // Fetch collection details to get order
    const collectionUrl = `${TMDB_BASE_URL}/collection/${movie.belongs_to_collection.id}?api_key=${TMDB_API_KEY}`;
    const collectionRes = await fetch(collectionUrl);

    if (!collectionRes.ok) {
      return {
        franchise: movie.belongs_to_collection.name,
        collectionId: movie.belongs_to_collection.id,
      };
    }

    const collection: TMDBCollection = await collectionRes.json();

    // Sort by release date to determine sequel number
    const sortedParts = [...collection.parts].sort((a, b) => 
      new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
    );

    const sequelNumber = sortedParts.findIndex(p => p.id === tmdbId) + 1;

    return {
      franchise: collection.name.replace(/ Collection$/i, ''),
      sequelNumber: sequelNumber > 0 ? sequelNumber : undefined,
      collectionId: collection.id,
    };
  } catch (error) {
    return null;
  }
}

function detectBiopic(title: string, overview?: string): boolean {
  const text = `${title} ${overview || ''}`;
  return BIOPIC_PATTERNS.some(pattern => pattern.test(text));
}

function detectSequelFromTitle(title: string): number | null {
  // Check for "Part 2", "Chapter 2", etc.
  const partMatch = title.match(/part\s*(\d+)/i);
  if (partMatch) return parseInt(partMatch[1]);

  const chapterMatch = title.match(/chapter\s*(\d+)/i);
  if (chapterMatch) return parseInt(chapterMatch[1]);

  // Check for number at end (e.g., "Baahubali 2")
  const endMatch = title.match(/\s(\d)$/);
  if (endMatch) return parseInt(endMatch[1]);

  // Roman numerals
  if (/\sII$/i.test(title)) return 2;
  if (/\sIII$/i.test(title)) return 3;
  if (/\sIV$/i.test(title)) return 4;

  return null;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

interface ContentFlags {
  pan_india?: boolean;
  sequel_number?: number;
  franchise?: string;
  biopic?: boolean;
  collection_id?: number;
}

async function enrichContentFlags(limit: number, dryRun: boolean): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║         CONTENT FLAGS ENRICHMENT                                 ║
╚══════════════════════════════════════════════════════════════════╝
`));

  const supabase = getSupabaseClient();

  // Fetch movies without content_flags or with empty content_flags
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, tmdb_id, synopsis, content_flags')
    .or('content_flags.is.null,content_flags.eq.{}')
    .not('tmdb_id', 'is', null)
    .eq('is_published', true)
    .limit(limit);

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error.message);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies need content flags enrichment!'));
    return;
  }

  console.log(chalk.gray(`Found ${movies.length} movies to process\n`));

  if (dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  let processed = 0;
  let withCollection = 0;
  let withBiopic = 0;
  let failed = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    process.stdout.write(`\r  Processing: ${i + 1}/${movies.length} - ${movie.title_en?.substring(0, 30)}...`);

    // Rate limiting for TMDB calls
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    const contentFlags: ContentFlags = {};

    // 1. Check TMDB collection (franchise/sequel)
    if (movie.tmdb_id) {
      const collection = await fetchMovieCollection(movie.tmdb_id);
      if (collection) {
        if (collection.franchise) {
          contentFlags.franchise = collection.franchise;
          withCollection++;
        }
        if (collection.sequelNumber) {
          contentFlags.sequel_number = collection.sequelNumber;
        }
        if (collection.collectionId) {
          contentFlags.collection_id = collection.collectionId;
        }
      }
    }

    // 2. Check for sequel from title if not found in TMDB
    if (!contentFlags.sequel_number) {
      const sequelFromTitle = detectSequelFromTitle(movie.title_en || '');
      if (sequelFromTitle) {
        contentFlags.sequel_number = sequelFromTitle;
      }
    }

    // 3. Check for biopic
    if (detectBiopic(movie.title_en || '', movie.synopsis)) {
      contentFlags.biopic = true;
      withBiopic++;
    }

    // 4. Pan India detection (based on title patterns)
    // Movies with "Pan India" in marketing or multi-language releases
    // For now, skip this as we don't have reliable source data

    // Skip if no flags detected
    if (Object.keys(contentFlags).length === 0) {
      processed++;
      continue;
    }

    if (dryRun) {
      console.log(chalk.gray(`\n  ${movie.title_en}: ${JSON.stringify(contentFlags)}`));
      processed++;
      continue;
    }

    // Update the movie
    const { error: updateError } = await supabase
      .from('movies')
      .update({ content_flags: contentFlags })
      .eq('id', movie.id);

    if (updateError) {
      failed++;
    } else {
      processed++;
    }
  }

  console.log(`\n`);
  console.log(chalk.green(`\n✅ Enrichment complete!`));
  console.log(chalk.gray(`   Processed: ${processed}`));
  console.log(chalk.gray(`   With collection/franchise: ${withCollection}`));
  console.log(chalk.gray(`   With biopic flag: ${withBiopic}`));
  console.log(chalk.gray(`   Failed: ${failed}`));

  // Show sample results
  if (!dryRun) {
    const { data: samples } = await supabase
      .from('movies')
      .select('title_en, content_flags')
      .not('content_flags', 'eq', '{}')
      .not('content_flags', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (samples?.length) {
      console.log(chalk.cyan('\n📋 Sample results:'));
      samples.forEach(m => {
        console.log(`   ${m.title_en}: ${JSON.stringify(m.content_flags)}`);
      });
    }
  }
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '200');
const dryRun = args.includes('--dry') || args.includes('--dry-run');

enrichContentFlags(limit, dryRun).catch(console.error);

