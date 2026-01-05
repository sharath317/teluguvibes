#!/usr/bin/env npx tsx
/**
 * GOOGLE CUSTOM SEARCH POSTER ENRICHMENT
 * 
 * Fetches movie posters using Google Custom Search API.
 * Use as a fallback after TMDB, Wikidata, and Wikipedia.
 * 
 * Requires:
 *   GOOGLE_CSE_API_KEY - Google API Key with Custom Search enabled
 *   GOOGLE_CSE_ID - Custom Search Engine ID (configured for image search)
 * 
 * Usage:
 *   npx tsx scripts/enrich-posters-google.ts --limit=100
 *   npx tsx scripts/enrich-posters-google.ts --dry-run
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

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const RATE_LIMIT_MS = 1000; // Google CSE has rate limits

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
    limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100'),
  };
}

/**
 * Search for movie poster using Google Custom Search
 */
async function searchPoster(title: string, year?: number): Promise<string | null> {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) {
    return null;
  }

  const query = `${title} ${year || ''} Telugu movie poster`;
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}&searchType=image&q=${encodeURIComponent(query)}&num=5`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        console.log(chalk.yellow('   Rate limited, waiting...'));
        await new Promise(r => setTimeout(r, 5000));
        return null;
      }
      return null;
    }

    const data = await response.json();
    const items = data.items || [];

    // Find best poster-like image
    for (const item of items) {
      const imageUrl = item.link;
      const width = item.image?.width || 0;
      const height = item.image?.height || 0;
      
      // Poster aspect ratio check (roughly 2:3)
      const aspectRatio = height / width;
      if (aspectRatio > 1.2 && aspectRatio < 1.8) {
        return imageUrl;
      }
    }

    // Return first result if no poster-like image found
    return items[0]?.link || null;
  } catch (error) {
    console.error(chalk.red('   Search error:'), error);
    return null;
  }
}

async function main() {
  const args = parseArgs();

  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════╗
║          GOOGLE CUSTOM SEARCH POSTER ENRICHMENT               ║
╚══════════════════════════════════════════════════════════════╝
`));

  // Check for API keys
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_ID) {
    console.log(chalk.yellow(`
⚠️  Google Custom Search API keys not configured.

To enable this feature, add to your .env.local:
  GOOGLE_CSE_API_KEY=your_api_key
  GOOGLE_CSE_ID=your_search_engine_id

For now, skipping Google poster search.
`));
    process.exit(0);
  }

  if (args.dryRun) {
    console.log(chalk.yellow.bold('🔍 DRY RUN MODE\n'));
  }

  // Fetch Telugu movies without posters
  console.log(chalk.cyan('📋 Fetching movies without posters...'));
  
  const { data: dbMovies, error } = await supabase
    .from('movies')
    .select('id, title_en, release_year')
    .eq('language', 'Telugu')
    .is('poster_url', null)
    .order('release_year', { ascending: false })
    .limit(args.limit);

  if (error) {
    console.error(chalk.red('Failed to fetch movies:'), error.message);
    process.exit(1);
  }

  console.log(chalk.green(`   Found ${dbMovies?.length || 0} movies without posters\n`));

  if (!dbMovies || dbMovies.length === 0) {
    console.log(chalk.green('✅ All movies have posters'));
    process.exit(0);
  }

  let enriched = 0;
  let notFound = 0;

  console.log(chalk.cyan('🔄 Searching for posters...\n'));

  for (let i = 0; i < dbMovies.length; i++) {
    const movie = dbMovies[i];
    
    if (args.verbose) {
      console.log(`  [${i + 1}/${dbMovies.length}] ${movie.title_en} (${movie.release_year})`);
    }

    const posterUrl = await searchPoster(movie.title_en, movie.release_year);
    
    if (!posterUrl) {
      notFound++;
      if (args.verbose) {
        console.log(chalk.gray(`    → No poster found`));
      }
      continue;
    }

    if (args.verbose) {
      console.log(chalk.green(`    → Found poster`));
    }

    if (!args.dryRun) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ poster_url: posterUrl })
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
    if (!args.verbose && i > 0 && i % 10 === 0) {
      console.log(`  Progress: ${i}/${dbMovies.length} (${enriched} enriched)`);
    }
  }

  // Results
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold('📊 GOOGLE CSE POSTER ENRICHMENT RESULTS'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  console.log(`  Movies processed:         ${dbMovies.length}`);
  console.log(`  No poster found:          ${notFound}`);
  console.log(`  Posters added:            ${chalk.green(enriched)}`);

  if (args.dryRun) {
    console.log(chalk.yellow('\n💡 This was a DRY RUN. No changes were made.\n'));
  }

  console.log(chalk.green('\n✅ Google CSE enrichment complete\n'));
}

main().catch(console.error);

