#!/usr/bin/env npx tsx
/**
 * WIKIPEDIA ENRICHMENT SCRIPT
 * 
 * Enriches Telugu movies with images and info from Wikipedia.
 * Searches for movie articles and extracts thumbnail images.
 * 
 * Usage:
 *   npx tsx scripts/enrich-from-wikipedia.ts --limit=500
 *   npx tsx scripts/enrich-from-wikipedia.ts --dry-run
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

const WIKI_REST_BASE = 'https://en.wikipedia.org/api/rest_v1';
const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';
const RATE_LIMIT_MS = 500; // Wikipedia is more lenient

interface WikipediaResult {
  title: string;
  thumbnail?: string;
  extract?: string;
  director?: string;
  cast?: string[];
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
 * Search Wikipedia for a movie
 */
async function searchWikipedia(query: string): Promise<any[]> {
  const url = `${WIKI_API_BASE}?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    `&srlimit=5&format=json&origin=*`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data?.query?.search || [];
  } catch {
    return [];
  }
}

/**
 * Get article summary with thumbnail
 */
async function getArticleSummary(title: string): Promise<WikipediaResult | null> {
  const url = `${WIKI_REST_BASE}/page/summary/${encodeURIComponent(title)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    const result: WikipediaResult = {
      title: data.title,
      thumbnail: data.thumbnail?.source,
      extract: data.extract,
    };

    // Try to extract director from extract
    const directorMatch = data.extract?.match(/directed by ([^,\.]+)/i);
    if (directorMatch) {
      result.director = directorMatch[1].trim();
    }

    // Try to extract cast from extract
    const castMatch = data.extract?.match(/starring ([^\.]+)/i);
    if (castMatch) {
      result.cast = castMatch[1].split(/,|and/).map((s: string) => s.trim()).filter(Boolean);
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Find best matching Wikipedia article for a movie
 */
async function findMovieArticle(
  title: string,
  year?: number
): Promise<WikipediaResult | null> {
  // Search strategies
  const queries = [
    `${title} ${year || ''} Telugu film`,
    `${title} ${year || ''} Indian film`,
    `${title} film ${year || ''}`,
    title,
  ];

  for (const query of queries) {
    const results = await searchWikipedia(query);
    
    for (const result of results) {
      // Check if it's likely a film article
      const searchTitle = result.title.toLowerCase();
      const titleLower = title.toLowerCase();
      
      if (
        searchTitle.includes(titleLower) ||
        titleLower.includes(searchTitle.replace(/\(.*\)/, '').trim())
      ) {
        // Check if it's a film article
        if (
          result.snippet?.toLowerCase().includes('film') ||
          result.snippet?.toLowerCase().includes('movie') ||
          result.title.includes('film')
        ) {
          const summary = await getArticleSummary(result.title);
          if (summary?.thumbnail) {
            return summary;
          }
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 200)); // Small delay between searches
  }

  return null;
}

/**
 * Extract hero from cast array (first male-sounding name)
 */
function extractHeroFromCast(cast: string[]): string | undefined {
  // Common Telugu actor name patterns
  const maleIndicators = ['Kumar', 'Rao', 'Babu', 'Reddy', 'Naidu', 'Prasad', 'Mohan', 'Raju'];
  
  for (const name of cast) {
    if (maleIndicators.some(ind => name.includes(ind))) {
      return name;
    }
  }
  
  return cast[0]; // Default to first cast member
}

/**
 * Extract heroine from cast array (first female-sounding name)
 */
function extractHeroineFromCast(cast: string[]): string | undefined {
  // Common Telugu actress name patterns
  const femaleIndicators = ['Devi', 'Sri', 'Priya', 'Lakshmi', 'Madhavi', 'Sridevi', 'Anjali'];
  
  for (const name of cast) {
    if (femaleIndicators.some(ind => name.includes(ind))) {
      return name;
    }
  }
  
  return cast.length > 1 ? cast[1] : undefined; // Default to second cast member
}

async function main() {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║              WIKIPEDIA ENRICHMENT SCRIPT                      ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE\n'));
  }

  // Fetch Telugu movies from database that need enrichment (prioritize those without poster)
  console.log(chalk.cyan('📋 Fetching movies from database that need enrichment...'));
  
  const { data: dbMovies, error } = await supabase
    .from('movies')
    .select('id, title_en, release_year, hero, heroine, director, poster_url')
    .eq('language', 'Telugu')
    .is('poster_url', null) // Prioritize movies without poster
    .not('our_rating', 'is', null) // Only verified movies with ratings
    .order('our_rating', { ascending: false }) // High rated first
    .limit(args.limit);

  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error.message);
    process.exit(1);
  }

  console.log(chalk.green(`   Found ${dbMovies?.length || 0} movies needing posters\n`));

  if (!dbMovies || dbMovies.length === 0) {
    console.log(chalk.green('✅ No movies need enrichment'));
    process.exit(0);
  }

  let enriched = 0;
  let posterUpdates = 0;
  let directorUpdates = 0;
  let heroUpdates = 0;
  let heroineUpdates = 0;
  let notFound = 0;

  console.log(chalk.cyan('🔄 Searching Wikipedia for movie articles...\n'));

  for (let i = 0; i < dbMovies.length; i++) {
    const movie = dbMovies[i];
    
    if (args.verbose) {
      console.log(`  [${i + 1}/${dbMovies.length}] ${movie.title_en} (${movie.release_year})`);
    }

    const wikiResult = await findMovieArticle(movie.title_en, movie.release_year);
    
    if (!wikiResult) {
      notFound++;
      if (args.verbose) {
        console.log(chalk.gray(`    → Not found on Wikipedia`));
      }
      continue;
    }

    const updates: Record<string, any> = {};
    const changes: string[] = [];

    // Update poster
    if (!movie.poster_url && wikiResult.thumbnail) {
      updates.poster_url = wikiResult.thumbnail;
      changes.push('poster');
      posterUpdates++;
    }

    // Update director
    if (!movie.director && wikiResult.director) {
      updates.director = wikiResult.director;
      changes.push('director');
      directorUpdates++;
    }

    // Update hero/heroine from cast
    if (wikiResult.cast && wikiResult.cast.length > 0) {
      if (!movie.hero) {
        const hero = extractHeroFromCast(wikiResult.cast);
        if (hero) {
          updates.hero = hero;
          changes.push('hero');
          heroUpdates++;
        }
      }
      
      if (!movie.heroine) {
        const heroine = extractHeroineFromCast(wikiResult.cast);
        if (heroine) {
          updates.heroine = heroine;
          changes.push('heroine');
          heroineUpdates++;
        }
      }
    }

    if (Object.keys(updates).length === 0) continue;

    if (args.verbose) {
      console.log(chalk.green(`    → ${changes.join(', ')}`));
    }

    if (!args.dryRun) {
      const { error: updateError } = await supabase
        .from('movies')
        .update(updates)
        .eq('id', movie.id);

      if (updateError) {
        console.error(chalk.red(`    Error updating:`, updateError.message));
      } else {
        enriched++;
      }
    } else {
      enriched++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

    // Progress
    if (!args.verbose && i > 0 && i % 20 === 0) {
      console.log(`  Progress: ${i}/${dbMovies.length} (${enriched} enriched)`);
    }
  }

  // Results
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 WIKIPEDIA ENRICHMENT RESULTS'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Movies processed:         ${dbMovies.length}`);
  console.log(`  Not found on Wikipedia:   ${notFound}`);
  console.log(`  Movies enriched:          ${chalk.green(enriched)}`);
  console.log('');
  console.log(`  Posters updated:          ${chalk.green(posterUpdates)}`);
  console.log(`  Directors updated:        ${chalk.green(directorUpdates)}`);
  console.log(`  Heroes updated:           ${chalk.green(heroUpdates)}`);
  console.log(`  Heroines updated:         ${chalk.green(heroineUpdates)}`);

  if (args.dryRun) {
    console.log(chalk.yellow('\n💡 This was a DRY RUN. No changes were made.\n'));
  }

  console.log(chalk.green('\n✅ Wikipedia enrichment complete\n'));
}

main().catch(console.error);

