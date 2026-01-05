#!/usr/bin/env npx tsx
/**
 * WIKIDATA ENRICHMENT SCRIPT
 * 
 * Enriches Telugu movies with director and cast data from Wikidata SPARQL.
 * Matches movies by title and year.
 * 
 * Usage:
 *   npx tsx scripts/enrich-from-wikidata.ts --limit=500
 *   npx tsx scripts/enrich-from-wikidata.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const RATE_LIMIT_MS = 2000; // Wikidata recommends being gentle

interface WikidataMovie {
  filmLabel: string;
  releaseYear?: number;
  directorLabel?: string;
  castLabels?: string[];
  castGenders?: number[]; // 1 = female, 2 = male
  imageUrl?: string;
}

interface CLIArgs {
  dryRun: boolean;
  limit: number;
  verbose: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    verbose: args.includes('-v') || args.includes('--verbose'),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '500'),
  };
}

/**
 * Execute SPARQL query against Wikidata
 */
async function executeSparqlQuery(query: string): Promise<any> {
  const url = `${WIKIDATA_SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com; contact@teluguvibes.com)',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch Telugu movies with cast and director from Wikidata
 */
async function fetchTeluguMoviesFromWikidata(limit: number): Promise<WikidataMovie[]> {
  console.log(chalk.cyan(`📡 Fetching Telugu movies from Wikidata (limit: ${limit})...`));

  // Query for Telugu films with director and cast
  const query = `
    SELECT ?film ?filmLabel 
           (YEAR(?releaseDate) AS ?releaseYear) 
           ?directorLabel 
           ?image
           (GROUP_CONCAT(DISTINCT ?castLabel; SEPARATOR="|") AS ?castLabels)
           (GROUP_CONCAT(DISTINCT ?castGender; SEPARATOR="|") AS ?castGenders)
    WHERE {
      ?film wdt:P31 wd:Q11424.        # Instance of film
      ?film wdt:P364 wd:Q8097.        # Original language: Telugu
      
      OPTIONAL { ?film wdt:P577 ?releaseDate. }
      OPTIONAL { ?film wdt:P57 ?director. }
      OPTIONAL { ?film wdt:P18 ?image. }
      OPTIONAL { 
        ?film wdt:P161 ?cast.
        ?cast wdt:P21 ?gender.
        BIND(IF(?gender = wd:Q6581072, 1, IF(?gender = wd:Q6581097, 2, 0)) AS ?castGender)
        ?cast rdfs:label ?castLabel.
        FILTER(LANG(?castLabel) = "en")
      }
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?film ?filmLabel ?releaseDate ?directorLabel ?image
    ORDER BY DESC(?releaseDate)
    LIMIT ${limit}
  `;

  try {
    const response = await executeSparqlQuery(query);
    const results = response?.results?.bindings || [];

    console.log(chalk.green(`   Found ${results.length} Telugu movies in Wikidata`));

    return results.map((r: any) => ({
      filmLabel: r.filmLabel?.value || '',
      releaseYear: r.releaseYear?.value ? parseInt(r.releaseYear.value) : undefined,
      directorLabel: r.directorLabel?.value,
      castLabels: r.castLabels?.value ? r.castLabels.value.split('|').filter(Boolean) : [],
      castGenders: r.castGenders?.value ? r.castGenders.value.split('|').map(Number) : [],
      imageUrl: r.image?.value,
    }));
  } catch (error) {
    console.error(chalk.red('   Error fetching from Wikidata:'), error);
    return [];
  }
}

/**
 * Normalize title for matching
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Match Wikidata movie to database movie
 */
function findMatchingMovie(
  wikidataMovie: WikidataMovie,
  dbMovies: any[]
): any | null {
  const wikiTitle = normalizeTitle(wikidataMovie.filmLabel);
  
  for (const dbMovie of dbMovies) {
    const dbTitle = normalizeTitle(dbMovie.title_en || '');
    
    // Exact title match
    if (wikiTitle === dbTitle) {
      // If we have years, they should match or be close
      if (wikidataMovie.releaseYear && dbMovie.release_year) {
        if (Math.abs(wikidataMovie.releaseYear - dbMovie.release_year) <= 1) {
          return dbMovie;
        }
      } else {
        return dbMovie; // No year to compare, title match is enough
      }
    }
  }
  
  return null;
}

/**
 * Extract hero (first male) and heroine (first female) from cast
 */
function extractHeroHeroine(
  castLabels: string[],
  castGenders: number[]
): { hero?: string; heroine?: string } {
  let hero: string | undefined;
  let heroine: string | undefined;
  
  for (let i = 0; i < castLabels.length; i++) {
    const gender = castGenders[i];
    const name = castLabels[i];
    
    if (gender === 2 && !hero) {
      hero = name;
    } else if (gender === 1 && !heroine) {
      heroine = name;
    }
    
    if (hero && heroine) break;
  }
  
  return { hero, heroine };
}

async function main() {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              WIKIDATA ENRICHMENT SCRIPT                       ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE\n'));
  }

  // Fetch Telugu movies from database that need enrichment
  console.log(chalk.cyan('📋 Fetching movies from database that need enrichment...'));
  
  const { data: dbMovies, error } = await supabase
    .from('movies')
    .select('id, title_en, release_year, hero, heroine, director, poster_url, our_rating')
    .eq('language', 'Telugu')
    .not('our_rating', 'is', null) // Only verified movies with ratings
    .or('hero.is.null,heroine.is.null,director.is.null,poster_url.is.null');

  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error.message);
    process.exit(1);
  }

  console.log(chalk.green(`   Found ${dbMovies?.length || 0} movies needing enrichment\n`));

  // Fetch from Wikidata
  const wikidataMovies = await fetchTeluguMoviesFromWikidata(args.limit);
  
  if (wikidataMovies.length === 0) {
    console.log(chalk.yellow('No movies found in Wikidata'));
    process.exit(0);
  }

  await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

  // Match and enrich
  let matched = 0;
  let enriched = 0;
  let directorUpdates = 0;
  let heroUpdates = 0;
  let heroineUpdates = 0;
  let posterUpdates = 0;

  console.log(chalk.cyan('\n🔄 Matching and enriching movies...\n'));

  for (const wikiMovie of wikidataMovies) {
    const dbMovie = findMatchingMovie(wikiMovie, dbMovies || []);
    
    if (!dbMovie) continue;
    matched++;

    const updates: Record<string, any> = {};
    const changes: string[] = [];

    // Update director
    if (!dbMovie.director && wikiMovie.directorLabel) {
      updates.director = wikiMovie.directorLabel;
      changes.push('director');
      directorUpdates++;
    }

    // Update hero/heroine from cast
    const { hero, heroine } = extractHeroHeroine(
      wikiMovie.castLabels || [],
      wikiMovie.castGenders || []
    );
    
    if (!dbMovie.hero && hero) {
      updates.hero = hero;
      changes.push('hero');
      heroUpdates++;
    }
    
    if (!dbMovie.heroine && heroine) {
      updates.heroine = heroine;
      changes.push('heroine');
      heroineUpdates++;
    }

    // Update poster from Wikidata image
    if (!dbMovie.poster_url && wikiMovie.imageUrl) {
      updates.poster_url = wikiMovie.imageUrl;
      changes.push('poster');
      posterUpdates++;
    }

    if (Object.keys(updates).length === 0) continue;

    if (args.verbose) {
      console.log(`  ${dbMovie.title_en} (${dbMovie.release_year})`);
      console.log(chalk.gray(`    → ${changes.join(', ')}`));
    }

    if (!args.dryRun) {
      const { error: updateError } = await supabase
        .from('movies')
        .update(updates)
        .eq('id', dbMovie.id);

      if (updateError) {
        console.error(chalk.red(`    Error updating:`, updateError.message));
      } else {
        enriched++;
      }
    } else {
      enriched++;
    }
  }

  // Results
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 WIKIDATA ENRICHMENT RESULTS'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Wikidata movies fetched:  ${wikidataMovies.length}`);
  console.log(`  Matched to database:      ${matched}`);
  console.log(`  Movies enriched:          ${chalk.green(enriched)}`);
  console.log('');
  console.log(`  Directors updated:        ${chalk.green(directorUpdates)}`);
  console.log(`  Heroes updated:           ${chalk.green(heroUpdates)}`);
  console.log(`  Heroines updated:         ${chalk.green(heroineUpdates)}`);
  console.log(`  Posters updated:          ${chalk.green(posterUpdates)}`);

  if (args.dryRun) {
    console.log(chalk.yellow('\n💡 This was a DRY RUN. No changes were made.\n'));
  }

  console.log(chalk.green('\n✅ Wikidata enrichment complete\n'));
}

main().catch(console.error);

