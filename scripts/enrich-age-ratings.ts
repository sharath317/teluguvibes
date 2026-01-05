#!/usr/bin/env npx tsx
/**
 * Age Rating Enrichment Script
 * 
 * Fetches movie certifications from TMDB and populates the age_rating column.
 * Prioritizes Indian (CBFC) certifications, then maps US ratings.
 * 
 * Usage:
 *   npx tsx scripts/enrich-age-ratings.ts
 *   npx tsx scripts/enrich-age-ratings.ts --limit=500
 *   npx tsx scripts/enrich-age-ratings.ts --dry
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

// Rate limiting: TMDB allows ~40 requests/10 seconds
const RATE_LIMIT_DELAY = 300; // ms between requests

// Mapping from various certification systems to our schema
const CERTIFICATION_MAP: Record<string, string> = {
  // Indian CBFC ratings
  'U': 'U',
  'UA': 'U/A',
  'U/A': 'U/A',
  'A': 'A',
  'S': 'S',
  
  // US ratings mapped to Indian equivalents
  'G': 'U',
  'PG': 'U',
  'PG-13': 'U/A',
  'R': 'A',
  'NC-17': 'A',
  
  // UK ratings
  'U': 'U',
  '12': 'U/A',
  '12A': 'U/A',
  '15': 'A',
  '18': 'A',
};

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
// TMDB CERTIFICATION FETCHER
// ============================================================

interface ReleaseDateResult {
  iso_3166_1: string;
  release_dates: Array<{
    certification: string;
    release_date: string;
    type: number;
  }>;
}

async function fetchCertification(tmdbId: number): Promise<string | null> {
  if (!TMDB_API_KEY) return null;

  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/release_dates?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const results: ReleaseDateResult[] = data.results || [];

    // Priority order: India (IN) > US > UK > first available
    const priorityCountries = ['IN', 'US', 'GB', 'AU', 'CA'];
    
    for (const country of priorityCountries) {
      const countryData = results.find(r => r.iso_3166_1 === country);
      if (countryData?.release_dates) {
        // Find the first release with a certification
        for (const release of countryData.release_dates) {
          if (release.certification) {
            return mapCertification(release.certification, country);
          }
        }
      }
    }

    // Fall back to any certification we can find
    for (const result of results) {
      for (const release of result.release_dates || []) {
        if (release.certification) {
          return mapCertification(release.certification, result.iso_3166_1);
        }
      }
    }

    return null;
  } catch (error) {
    console.error(chalk.red(`Error fetching certification for TMDB ${tmdbId}:`), error);
    return null;
  }
}

function mapCertification(cert: string, country: string): string | null {
  // Normalize the certification
  const normalized = cert.toUpperCase().trim();
  
  // Direct mapping
  if (CERTIFICATION_MAP[normalized]) {
    return CERTIFICATION_MAP[normalized];
  }

  // Country-specific mappings
  if (country === 'IN') {
    // Indian certifications should match directly
    if (['U', 'U/A', 'UA', 'A', 'S'].includes(normalized)) {
      return normalized === 'UA' ? 'U/A' : normalized;
    }
  }

  // Try to infer from common patterns
  if (normalized.includes('13') || normalized.includes('12')) return 'U/A';
  if (normalized.includes('17') || normalized.includes('18') || normalized === 'R') return 'A';
  if (normalized === 'G' || normalized === 'PG') return 'U';

  return null;
}

// ============================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================

async function enrichAgeRatings(limit: number, dryRun: boolean): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════╗
║         AGE RATING ENRICHMENT                                    ║
╚══════════════════════════════════════════════════════════════════╝
`));

  if (!TMDB_API_KEY) {
    console.error(chalk.red('❌ TMDB_API_KEY not configured'));
    return;
  }

  const supabase = getSupabaseClient();

  // Fetch movies without age_rating that have tmdb_id
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, tmdb_id, release_year')
    .is('age_rating', null)
    .not('tmdb_id', 'is', null)
    .eq('is_published', true)
    .order('release_year', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error.message);
    return;
  }

  if (!movies || movies.length === 0) {
    console.log(chalk.green('✅ No movies need age rating enrichment!'));
    return;
  }

  console.log(chalk.gray(`Found ${movies.length} movies to enrich\n`));

  if (dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    process.stdout.write(`\r  Processing: ${i + 1}/${movies.length} - ${movie.title_en?.substring(0, 30)}...`);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    const certification = await fetchCertification(movie.tmdb_id);

    if (!certification) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(chalk.gray(`\n  Would set ${movie.title_en} -> ${certification}`));
      enriched++;
      continue;
    }

    // Update the movie
    const { error: updateError } = await supabase
      .from('movies')
      .update({ age_rating: certification })
      .eq('id', movie.id);

    if (updateError) {
      failed++;
      console.error(chalk.red(`\n  ❌ Failed to update ${movie.title_en}: ${updateError.message}`));
    } else {
      enriched++;
    }
  }

  console.log(`\n`);
  console.log(chalk.green(`\n✅ Enrichment complete!`));
  console.log(chalk.gray(`   Enriched: ${enriched}`));
  console.log(chalk.gray(`   Skipped (no certification): ${skipped}`));
  console.log(chalk.gray(`   Failed: ${failed}`));

  // Show sample results
  if (!dryRun && enriched > 0) {
    const { data: samples } = await supabase
      .from('movies')
      .select('title_en, age_rating')
      .not('age_rating', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (samples?.length) {
      console.log(chalk.cyan('\n📋 Sample results:'));
      samples.forEach(m => {
        console.log(`   ${m.title_en}: ${m.age_rating}`);
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

enrichAgeRatings(limit, dryRun).catch(console.error);

