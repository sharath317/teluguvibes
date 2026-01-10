#!/usr/bin/env npx tsx
/**
 * WIKIPEDIA ENRICHMENT SCRIPT (Multi-Language)
 * 
 * Enriches Telugu movies with images and info from Wikipedia.
 * Searches Telugu Wikipedia (te.wikipedia.org) FIRST, then English Wikipedia.
 * Extracts thumbnail images, director, cast information.
 * 
 * Usage:
 *   npx tsx scripts/enrich-from-wikipedia.ts --limit=500
 *   npx tsx scripts/enrich-from-wikipedia.ts --dry-run
 *   npx tsx scripts/enrich-from-wikipedia.ts --actor=Krishna --limit=500
 *   npx tsx scripts/enrich-from-wikipedia.ts --te-only   # Telugu Wikipedia only
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

// English Wikipedia
const EN_WIKI_REST_BASE = 'https://en.wikipedia.org/api/rest_v1';
const EN_WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';

// Telugu Wikipedia (PRIMARY for Telugu films)
const TE_WIKI_API_BASE = 'https://te.wikipedia.org/w/api.php';

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
  actor: string;
  teOnly: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    verbose: args.includes('-v') || args.includes('--verbose'),
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '500'),
    actor: args.find(a => a.startsWith('--actor='))?.split('=')[1] || '',
    teOnly: args.includes('--te-only'),
  };
}

/**
 * Search English Wikipedia for a movie
 */
async function searchEnglishWikipedia(query: string): Promise<any[]> {
  const url = `${EN_WIKI_API_BASE}?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
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
 * Search Telugu Wikipedia for a movie (PRIMARY SOURCE for Telugu films)
 */
async function searchTeluguWikipedia(query: string): Promise<any[]> {
  const url = `${TE_WIKI_API_BASE}?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    `&srlimit=5&format=json&origin=*`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-enrichment)' }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data?.query?.search || [];
  } catch {
    return [];
  }
}

/**
 * Get image from Telugu Wikipedia page
 */
async function getTeluguWikipediaImage(pageTitle: string): Promise<string | null> {
  try {
    const url = `${TE_WIKI_API_BASE}?action=query&titles=${encodeURIComponent(pageTitle)}` +
      `&prop=pageimages&pithumbsize=500&format=json&origin=*`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-enrichment)' }
    });
    if (!response.ok) return null;
    
    const data = await response.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    
    const pageId = Object.keys(pages)[0];
    return pages[pageId]?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

/**
 * Find movie on Telugu Wikipedia (PRIMARY)
 */
async function findTeluguWikipediaArticle(
  title: string,
  year?: number
): Promise<WikipediaResult | null> {
  // Telugu Wikipedia search patterns
  const queries = [
    `${title} (${year} సినిమా)`,      // Title (Year సినిమా)
    `${title} సినిమా`,                  // Title సినిమా
    `${title} (సినిమా)`,                // Title (సినిమా)
    title,
  ];

  for (const query of queries) {
    const results = await searchTeluguWikipedia(query);
    
    for (const result of results) {
      const searchTitle = result.title.toLowerCase();
      const titleLower = title.toLowerCase();
      
      // Check if title matches
      if (
        searchTitle.includes(titleLower) ||
        titleLower.includes(searchTitle.replace(/\(.*\)/, '').trim())
      ) {
        // Check if it's a film article (సినిమా = film in Telugu)
        if (
          result.snippet?.includes('సినిమా') ||
          result.snippet?.includes('చిత్రం') ||
          result.title.includes('సినిమా') ||
          result.snippet?.toLowerCase().includes('film')
        ) {
          const imageUrl = await getTeluguWikipediaImage(result.title);
          if (imageUrl) {
            return {
              title: result.title,
              thumbnail: imageUrl,
              extract: result.snippet,
            };
          }
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 200));
  }

  return null;
}

/**
 * Get article summary with thumbnail from English Wikipedia
 */
async function getEnglishArticleSummary(title: string): Promise<WikipediaResult | null> {
  const url = `${EN_WIKI_REST_BASE}/page/summary/${encodeURIComponent(title)}`;

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
 * Find best matching English Wikipedia article for a movie (FALLBACK)
 */
async function findEnglishWikipediaArticle(
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
    const results = await searchEnglishWikipedia(query);
    
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
          const summary = await getEnglishArticleSummary(result.title);
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
 * Find movie article - tries Telugu Wikipedia first, then English
 */
async function findMovieArticle(
  title: string,
  year?: number,
  teOnly: boolean = false
): Promise<{ result: WikipediaResult | null; source: 'te' | 'en' | null }> {
  // Try Telugu Wikipedia FIRST (primary source for Telugu films)
  const teResult = await findTeluguWikipediaArticle(title, year);
  if (teResult) {
    return { result: teResult, source: 'te' };
  }

  // Fall back to English Wikipedia (unless te-only mode)
  if (!teOnly) {
    const enResult = await findEnglishWikipediaArticle(title, year);
    if (enResult) {
      return { result: enResult, source: 'en' };
    }
  }

  return { result: null, source: null };
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
║        WIKIPEDIA ENRICHMENT SCRIPT (Multi-Language)           ║
║      te.wikipedia.org (PRIMARY) → en.wikipedia.org            ║
╚══════════════════════════════════════════════════════════════╝
`));

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE\n'));
  }
  
  console.log(`  Mode: ${args.teOnly ? chalk.cyan('Telugu Wikipedia ONLY') : chalk.green('Telugu → English fallback')}`);
  if (args.actor) {
    console.log(`  Actor filter: ${chalk.cyan(args.actor)}`);
  }
  console.log(`  Limit: ${args.limit}\n`);

  // Fetch Telugu movies from database that need enrichment (prioritize those without poster)
  console.log(chalk.cyan('📋 Fetching movies from database that need enrichment...'));
  
  let query = supabase
    .from('movies')
    .select('id, title_en, release_year, hero, heroine, director, poster_url')
    .eq('language', 'Telugu')
    .is('poster_url', null) // Prioritize movies without poster
    .not('our_rating', 'is', null) // Only verified movies with ratings
    .order('our_rating', { ascending: false }); // High rated first

  // Apply actor filter if specified
  if (args.actor) {
    query = query.eq('hero', args.actor);
  }

  const { data: dbMovies, error } = await query.limit(args.limit);

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
  let teluguWikiHits = 0;
  let englishWikiHits = 0;

  console.log(chalk.cyan('🔄 Searching Wikipedia for movie articles (Telugu → English)...\n'));

  for (let i = 0; i < dbMovies.length; i++) {
    const movie = dbMovies[i];
    
    if (args.verbose) {
      console.log(`  [${i + 1}/${dbMovies.length}] ${movie.title_en} (${movie.release_year})`);
    }

    const { result: wikiResult, source } = await findMovieArticle(
      movie.title_en, 
      movie.release_year,
      args.teOnly
    );
    
    if (!wikiResult) {
      notFound++;
      if (args.verbose) {
        console.log(chalk.gray(`    → Not found on Wikipedia`));
      }
      continue;
    }

    // Track source statistics
    if (source === 'te') {
      teluguWikiHits++;
    } else if (source === 'en') {
      englishWikiHits++;
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
      const sourceLabel = source === 'te' ? chalk.cyan('te.wiki') : chalk.yellow('en.wiki');
      console.log(chalk.green(`    → [${sourceLabel}] ${changes.join(', ')}`));
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
  console.log(chalk.cyan('  By Source:'));
  console.log(`    Telugu Wikipedia (te):  ${chalk.cyan(teluguWikiHits)}`);
  console.log(`    English Wikipedia (en): ${chalk.yellow(englishWikiHits)}`);
  console.log('');
  console.log(chalk.cyan('  Fields Updated:'));
  console.log(`    Posters:                ${chalk.green(posterUpdates)}`);
  console.log(`    Directors:              ${chalk.green(directorUpdates)}`);
  console.log(`    Heroes:                 ${chalk.green(heroUpdates)}`);
  console.log(`    Heroines:               ${chalk.green(heroineUpdates)}`);

  if (args.dryRun) {
    console.log(chalk.yellow('\n💡 This was a DRY RUN. No changes were made.\n'));
  }

  console.log(chalk.green('\n✅ Wikipedia enrichment complete\n'));
}

main().catch(console.error);

