#!/usr/bin/env npx tsx
/**
 * TRIGGER WARNINGS ENRICHMENT SCRIPT
 * 
 * Derives content warnings based on:
 * 1. TMDB keywords
 * 2. Genre mapping
 * 3. Overview/synopsis analysis
 * 4. Certification data
 * 
 * Trigger Warning Categories:
 *   violence, death, trauma, abuse, substance-use, suicide,
 *   sexual-content, gore, disturbing-imagery, animal-harm
 * 
 * Usage:
 *   npx tsx scripts/enrich-trigger-warnings.ts --limit=100
 *   npx tsx scripts/enrich-trigger-warnings.ts --limit=500 --execute
 *   npx tsx scripts/enrich-trigger-warnings.ts --decade=2020 --execute
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
const RATE_LIMIT_DELAY = 250;

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

type TriggerWarning = 
  | 'violence'
  | 'death'
  | 'trauma'
  | 'abuse'
  | 'substance-use'
  | 'suicide'
  | 'sexual-content'
  | 'gore'
  | 'disturbing-imagery'
  | 'animal-harm';

interface Movie {
  id: string;
  title_en: string;
  release_year: number;
  tmdb_id: number | null;
  genres: string[];
  trigger_warnings: string[] | null;
  overview?: string;
  age_rating?: string;
}

interface EnrichmentResult {
  movieId: string;
  title: string;
  trigger_warnings: TriggerWarning[];
  sources: string[];
  confidence: number;
}

// ============================================================
// TRIGGER WARNING PATTERNS
// ============================================================

const TRIGGER_PATTERNS: Record<TriggerWarning, string[]> = {
  'violence': [
    'violence', 'violent', 'fight', 'battle', 'war', 'murder', 'kill',
    'assault', 'attack', 'combat', 'shooting', 'stabbing', 'beating',
    'gangster', 'mafia', 'crime', 'criminal', 'revenge'
  ],
  'death': [
    'death', 'dying', 'funeral', 'grief', 'loss', 'mourning',
    'terminal', 'cancer', 'illness', 'accident', 'tragedy'
  ],
  'trauma': [
    'trauma', 'ptsd', 'flashback', 'nightmare', 'haunted',
    'abduction', 'kidnap', 'imprisonment', 'torture'
  ],
  'abuse': [
    'abuse', 'domestic violence', 'child abuse', 'harassment',
    'bullying', 'exploitation', 'trafficking'
  ],
  'substance-use': [
    'drug', 'drugs', 'alcohol', 'alcoholic', 'addiction', 'addict',
    'cocaine', 'heroin', 'overdose', 'drinking', 'smoking', 'drunk'
  ],
  'suicide': [
    'suicide', 'suicidal', 'self-harm', 'self harm', 'hanging',
    'overdose', 'jumping off', 'ending life'
  ],
  'sexual-content': [
    'sexual', 'sex', 'nude', 'nudity', 'erotic', 'affair',
    'intimacy', 'seduction', 'prostitution', 'romance'
  ],
  'gore': [
    'gore', 'gory', 'blood', 'bloody', 'gruesome', 'dismember',
    'mutilation', 'decapitation', 'graphic violence'
  ],
  'disturbing-imagery': [
    'disturbing', 'horror', 'scary', 'creepy', 'terrifying',
    'nightmare', 'ghost', 'paranormal', 'demon', 'possessed'
  ],
  'animal-harm': [
    'animal cruelty', 'animal death', 'hunting', 'poaching',
    'pet death', 'animal abuse', 'slaughter'
  ]
};

// Genre to trigger warning mapping
const GENRE_TRIGGER_MAP: Record<string, TriggerWarning[]> = {
  'Horror': ['disturbing-imagery', 'violence', 'death'],
  'Thriller': ['violence', 'trauma'],
  'Crime': ['violence', 'death', 'substance-use'],
  'War': ['violence', 'death', 'trauma', 'gore'],
  'Action': ['violence'],
  'Drama': [], // Too broad, needs content analysis
  'Mystery': ['death'],
  'Adult': ['sexual-content'],
};

// TMDB keywords to trigger warnings
const KEYWORD_TRIGGER_MAP: Record<number, TriggerWarning[]> = {
  // Violence related
  10685: ['violence'], // murder
  10051: ['violence', 'trauma'], // kidnapping
  5927: ['violence'], // violence
  10681: ['violence', 'gore'], // serial killer
  10714: ['violence'], // gun
  
  // Trauma related
  9663: ['trauma'], // imprisonment
  4565: ['trauma'], // hostage
  
  // Substance use
  599: ['substance-use'], // drug
  191819: ['substance-use'], // alcoholism
  
  // Death related
  10183: ['death'], // death
  12339: ['death', 'grief'], // loss of loved one
  
  // Sexual content
  155: ['sexual-content'], // sex
  6054: ['sexual-content'], // nudity
  
  // Horror/disturbing
  6152: ['disturbing-imagery'], // supernatural
  162846: ['disturbing-imagery'], // paranormal
};

// ============================================================
// TMDB KEYWORDS FETCHER
// ============================================================

async function getTMDBKeywords(tmdbId: number): Promise<{ keywords: number[]; names: string[] }> {
  if (!TMDB_API_KEY) {
    return { keywords: [], names: [] };
  }

  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/keywords?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { keywords: [], names: [] };
    }

    const data = await response.json();
    const keywords = data.keywords || [];
    
    return {
      keywords: keywords.map((k: { id: number }) => k.id),
      names: keywords.map((k: { name: string }) => k.name.toLowerCase())
    };
  } catch (error) {
    if (VERBOSE) console.error(`  TMDB keywords error for ${tmdbId}:`, error);
    return { keywords: [], names: [] };
  }
}

// ============================================================
// CONTENT ANALYSIS
// ============================================================

function analyzeContent(text: string): TriggerWarning[] {
  if (!text) return [];
  
  const lowerText = text.toLowerCase();
  const warnings = new Set<TriggerWarning>();

  for (const [warning, patterns] of Object.entries(TRIGGER_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        warnings.add(warning as TriggerWarning);
        break;
      }
    }
  }

  return Array.from(warnings);
}

function analyzeGenres(genres: string[]): TriggerWarning[] {
  if (!genres) return [];
  
  const warnings = new Set<TriggerWarning>();
  
  for (const genre of genres) {
    const genreWarnings = GENRE_TRIGGER_MAP[genre];
    if (genreWarnings) {
      genreWarnings.forEach(w => warnings.add(w));
    }
  }

  return Array.from(warnings);
}

function analyzeKeywords(keywordIds: number[], keywordNames: string[]): TriggerWarning[] {
  const warnings = new Set<TriggerWarning>();

  // Check keyword IDs
  for (const id of keywordIds) {
    const idWarnings = KEYWORD_TRIGGER_MAP[id];
    if (idWarnings) {
      idWarnings.forEach(w => warnings.add(w));
    }
  }

  // Check keyword names against patterns
  for (const name of keywordNames) {
    for (const [warning, patterns] of Object.entries(TRIGGER_PATTERNS)) {
      for (const pattern of patterns) {
        if (name.includes(pattern)) {
          warnings.add(warning as TriggerWarning);
          break;
        }
      }
    }
  }

  return Array.from(warnings);
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function enrichTriggerWarnings(movie: Movie): Promise<EnrichmentResult | null> {
  // Skip if already has trigger warnings
  if (movie.trigger_warnings && movie.trigger_warnings.length > 0) {
    return null;
  }

  const allWarnings = new Set<TriggerWarning>();
  const sources: string[] = [];

  // 1. Analyze genres
  const genreWarnings = analyzeGenres(movie.genres);
  if (genreWarnings.length > 0) {
    genreWarnings.forEach(w => allWarnings.add(w));
    sources.push('genres');
  }

  // 2. Get TMDB keywords
  if (movie.tmdb_id) {
    const { keywords, names } = await getTMDBKeywords(movie.tmdb_id);
    const keywordWarnings = analyzeKeywords(keywords, names);
    if (keywordWarnings.length > 0) {
      keywordWarnings.forEach(w => allWarnings.add(w));
      sources.push('tmdb-keywords');
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 3. Analyze overview/synopsis
  if (movie.overview) {
    const contentWarnings = analyzeContent(movie.overview);
    if (contentWarnings.length > 0) {
      contentWarnings.forEach(w => allWarnings.add(w));
      sources.push('content-analysis');
    }
  }

  // 4. Consider age rating
  if (movie.age_rating === 'A') {
    // Adult-rated movies likely have content worth warning about
    if (!allWarnings.has('violence') && !allWarnings.has('sexual-content')) {
      // If no specific warnings found, but it's A-rated, add general warning
      allWarnings.add('violence');
      sources.push('age-rating');
    }
  }

  const warnings = Array.from(allWarnings);
  
  // Calculate confidence based on sources
  let confidence = 0.3; // Base confidence
  if (sources.includes('tmdb-keywords')) confidence += 0.3;
  if (sources.includes('genres')) confidence += 0.2;
  if (sources.includes('content-analysis')) confidence += 0.15;
  if (sources.includes('age-rating')) confidence += 0.05;
  confidence = Math.min(confidence, 0.95);

  return {
    movieId: movie.id,
    title: movie.title_en,
    trigger_warnings: warnings,
    sources,
    confidence,
  };
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main(): Promise<void> {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║           TRIGGER WARNINGS ENRICHMENT                                ║
║     Sources: TMDB Keywords → Genres → Content Analysis               ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);

  // Build query for movies without trigger_warnings
  let query = supabase
    .from('movies')
    .select('id, title_en, release_year, tmdb_id, genres, trigger_warnings, overview, age_rating')
    .eq('language', 'Telugu')
    .or('trigger_warnings.is.null,trigger_warnings.eq.{}')
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
    console.log(chalk.green('  ✅ No movies need trigger warning enrichment.'));
    return;
  }

  console.log(`\n  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Process movies
  const results: EnrichmentResult[] = [];
  const warningStats: Record<TriggerWarning, number> = {
    'violence': 0,
    'death': 0,
    'trauma': 0,
    'abuse': 0,
    'substance-use': 0,
    'suicide': 0,
    'sexual-content': 0,
    'gore': 0,
    'disturbing-imagery': 0,
    'animal-harm': 0,
  };
  let skipped = 0;
  let noWarnings = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    const result = await enrichTriggerWarnings(movie);

    if (result) {
      if (result.trigger_warnings.length > 0) {
        results.push(result);
        result.trigger_warnings.forEach(w => warningStats[w]++);
      } else {
        noWarnings++;
      }

      if (VERBOSE && result.trigger_warnings.length > 0) {
        console.log(`  ${i + 1}. ${movie.title_en}: [${result.trigger_warnings.join(', ')}]`);
      }
    } else {
      skipped++;
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
  Results:
    Movies with warnings: ${chalk.yellow(results.length)}
    Movies without warnings: ${chalk.green(noWarnings)}
    Skipped (already had): ${chalk.gray(skipped)}
  `);

  console.log('  Warning Distribution:');
  const sortedWarnings = Object.entries(warningStats)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [warning, count] of sortedWarnings) {
    const bar = '█'.repeat(Math.min(Math.ceil(count / 5), 30));
    console.log(`    ${warning.padEnd(20)}: ${bar} ${count}`);
  }

  // Apply changes if --execute flag is set
  if (EXECUTE && results.length > 0) {
    console.log(chalk.cyan('\n  Applying changes to database...'));

    let successCount = 0;
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ trigger_warnings: result.trigger_warnings })
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
      console.log(`    ${result.title}: [${result.trigger_warnings.join(', ')}]`);
    }
  }
}

main().catch(console.error);

