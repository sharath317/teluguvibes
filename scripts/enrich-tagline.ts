#!/usr/bin/env npx tsx
/**
 * TAGLINE ENRICHMENT SCRIPT (Enhanced v2.0)
 * 
 * Fetches movie taglines from multiple sources with confidence tracking:
 * 1. TMDB (highest priority - official taglines) - confidence: 0.95
 * 2. English Wikipedia (from infobox) - confidence: 0.85
 * 3. Telugu Wikipedia (from infobox) - confidence: 0.80 [NEW]
 * 4. OMDB API (fallback) - confidence: 0.50
 * 5. Overview first sentence (promotional style) - confidence: 0.40 [NEW]
 * 
 * NEW: Stores tagline_source and tagline_confidence for audit trail.
 * 
 * Usage:
 *   npx tsx scripts/enrich-tagline.ts --limit=100
 *   npx tsx scripts/enrich-tagline.ts --limit=500 --execute
 *   npx tsx scripts/enrich-tagline.ts --decade=2020 --execute
 *   npx tsx scripts/enrich-tagline.ts --min-confidence=0.7 --execute
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
const OMDB_API_KEY = process.env.OMDB_API_KEY;
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
const MIN_CONFIDENCE = parseFloat(getArg('min-confidence', '0.0'));

// ============================================================
// CONFIDENCE TIERS
// ============================================================

const CONFIDENCE = {
  TMDB: 0.95,
  ENGLISH_WIKIPEDIA: 0.85,
  TELUGU_WIKIPEDIA: 0.80,
  OMDB: 0.50,
  OVERVIEW_EXTRACT: 0.40,
};

// ============================================================
// TYPES
// ============================================================

interface Movie {
  id: string;
  title_en: string;
  title_te: string | null;
  release_year: number;
  tmdb_id: number | null;
  imdb_id: string | null;
  tagline: string | null;
  overview: string | null;
  genres: string[] | null;
}

interface EnrichmentResult {
  movieId: string;
  title: string;
  tagline: string;
  source: string;
  confidence: number;
}

// ============================================================
// TMDB TAGLINE FETCHER
// ============================================================

async function getTMDBTagline(tmdbId: number): Promise<{ tagline: string | null; confidence: number }> {
  if (!TMDB_API_KEY) {
    return { tagline: null, confidence: 0 };
  }

  try {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { tagline: null, confidence: 0 };
    }

    const data = await response.json();
    
    if (data.tagline && data.tagline.trim().length > 0) {
      return { tagline: data.tagline.trim(), confidence: CONFIDENCE.TMDB };
    }

    return { tagline: null, confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  TMDB error for ${tmdbId}:`, error);
    return { tagline: null, confidence: 0 };
  }
}

// ============================================================
// ENGLISH WIKIPEDIA TAGLINE FETCHER
// ============================================================

async function getEnglishWikipediaTagline(title: string, year: number): Promise<{ tagline: string | null; confidence: number }> {
  try {
    const wikiTitle = title.replace(/ /g, '_');
    
    const patterns = [
      `${wikiTitle}_(${year}_film)`,
      `${wikiTitle}_(Telugu_film)`,
      `${wikiTitle}_(film)`,
      wikiTitle,
    ];
    
    for (const pattern of patterns) {
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(pattern)}&format=json`;
      
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const pages = data.query?.pages;
      
      if (!pages) continue;
      
      const pageId = Object.keys(pages)[0];
      if (pageId === '-1') continue;
      
      const content = pages[pageId]?.revisions?.[0]?.slots?.main?.['*'];
      if (!content) continue;

      // Look for tagline in infobox
      const taglinePatterns = [
        /\|\s*tagline\s*=\s*"?([^"|}\n]+)"?/i,
        /\|\s*caption\s*=\s*"?([^"|}\n]+)"?/i,
        /\|\s*slogan\s*=\s*"?([^"|}\n]+)"?/i,
      ];

      for (const regex of taglinePatterns) {
        const match = content.match(regex);
        if (match && match[1]) {
          const tagline = match[1].trim()
            .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2$1')
            .replace(/''/g, '')
            .trim();
          
          if (tagline.length > 5 && tagline.length < 200) {
            return { tagline, confidence: CONFIDENCE.ENGLISH_WIKIPEDIA };
          }
        }
      }
    }

    return { tagline: null, confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  English Wikipedia error for ${title}:`, error);
    return { tagline: null, confidence: 0 };
  }
}

// ============================================================
// TELUGU WIKIPEDIA TAGLINE FETCHER (NEW)
// ============================================================

async function getTeluguWikipediaTagline(
  titleEn: string, 
  titleTe: string | null, 
  year: number
): Promise<{ tagline: string | null; confidence: number }> {
  try {
    const titlesToTry = [titleTe, titleEn].filter(Boolean);
    
    for (const title of titlesToTry) {
      const wikiTitle = title!.replace(/ /g, '_');
      
      const patterns = [
        `${wikiTitle}_(${year}_సినిమా)`,
        `${wikiTitle}_(సినిమా)`,
        `${wikiTitle}_(${year}_film)`,
        wikiTitle,
      ];
      
      for (const pattern of patterns) {
        const apiUrl = `https://te.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(pattern)}&format=json`;
        
        const response = await fetch(apiUrl, {
          headers: { 'User-Agent': 'TeluguPortal/1.0 (movie-archive)' }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const pages = data.query?.pages;
        
        if (!pages) continue;
        
        const pageId = Object.keys(pages)[0];
        if (pageId === '-1') continue;
        
        const content = pages[pageId]?.revisions?.[0]?.slots?.main?.['*'];
        if (!content) continue;

        // Look for tagline in Telugu Wikipedia infobox
        const taglinePatterns = [
          /\|\s*tagline\s*=\s*"?([^"|}\n]+)"?/i,
          /\|\s*caption\s*=\s*"?([^"|}\n]+)"?/i,
          /\|\s*నినాదం\s*=\s*"?([^"|}\n]+)"?/i, // Telugu word for tagline
          /\|\s*slogan\s*=\s*"?([^"|}\n]+)"?/i,
        ];

        for (const regex of taglinePatterns) {
          const match = content.match(regex);
          if (match && match[1]) {
            const tagline = match[1].trim()
              .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, '$2$1')
              .replace(/''/g, '')
              .trim();
            
            if (tagline.length > 3 && tagline.length < 200) {
              return { tagline, confidence: CONFIDENCE.TELUGU_WIKIPEDIA };
            }
          }
        }
      }
    }

    return { tagline: null, confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  Telugu Wikipedia error for ${titleEn}:`, error);
    return { tagline: null, confidence: 0 };
  }
}

// ============================================================
// OMDB TAGLINE FETCHER (Fallback)
// ============================================================

async function getOMDBTagline(imdbId: string): Promise<{ tagline: string | null; confidence: number }> {
  if (!OMDB_API_KEY || !imdbId) {
    return { tagline: null, confidence: 0 };
  }

  try {
    const url = `http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return { tagline: null, confidence: 0 };
    }

    const data = await response.json();
    
    // OMDB doesn't always have taglines, but sometimes in Plot
    if (data.Plot && data.Plot.length < 100 && !data.Plot.includes('.')) {
      return { tagline: data.Plot, confidence: CONFIDENCE.OMDB };
    }

    return { tagline: null, confidence: 0 };
  } catch (error) {
    if (VERBOSE) console.error(`  OMDB error for ${imdbId}:`, error);
    return { tagline: null, confidence: 0 };
  }
}

// ============================================================
// AI TAGLINE GENERATION (Groq LLM)
// ============================================================

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function generateTaglineWithAI(
  title: string, 
  year: number, 
  overview: string | null,
  genres: string[] | null
): Promise<{ tagline: string | null; confidence: number }> {
  if (!GROQ_API_KEY) {
    return { tagline: null, confidence: 0 };
  }

  // Only generate if we have overview or genres
  if (!overview && (!genres || genres.length === 0)) {
    return { tagline: null, confidence: 0 };
  }

  try {
    const genreStr = genres?.join(', ') || 'film';
    const synopsisStr = overview ? overview.substring(0, 500) : '';
    
    const prompt = `Generate a short, catchy movie tagline for the following Telugu film.

Movie: ${title} (${year})
Genre: ${genreStr}
${synopsisStr ? `Synopsis: ${synopsisStr}` : ''}

Requirements:
- Maximum 80 characters
- Should be memorable and promotional
- Can be in English (for Telugu films, English taglines are common)
- No quotes around the tagline
- Just output the tagline, nothing else`;

    // Model fallback chain
    const GROQ_MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
    ];
    
    let tagline: string | null = null;
    
    for (const model of GROQ_MODELS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: 0.8, // Higher creativity for taglines
            max_tokens: 100,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Check for model deprecation or rate limit
          if (errorText.includes('decommissioned') || response.status === 429) {
            if (VERBOSE) console.warn(`  Model ${model} unavailable, trying fallback...`);
            continue;
          }
          if (VERBOSE) console.error(`  Groq API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        tagline = data.choices?.[0]?.message?.content?.trim();
        
        if (tagline) break; // Success, exit loop
      } catch (error) {
        if (VERBOSE) console.warn(`  Model ${model} error, trying fallback...`);
        continue;
      }
    }
    
    if (!tagline) {
      return { tagline: null, confidence: 0 };
    }
    
    // Clean up the tagline
    tagline = tagline
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^Tagline:\s*/i, '') // Remove "Tagline:" prefix
      .trim();
    
    // Validate tagline quality
    if (tagline.length < 10 || tagline.length > 120) {
      return { tagline: null, confidence: 0 };
    }
    
    // AI-generated taglines have medium confidence
    return { tagline, confidence: 0.55 };
  } catch (error) {
    if (VERBOSE) console.error(`  AI tagline generation error:`, error);
    return { tagline: null, confidence: 0 };
  }
}

// ============================================================
// OVERVIEW FIRST SENTENCE EXTRACTOR (Low confidence fallback)
// ============================================================

function extractTaglineFromOverview(overview: string | null): { tagline: string | null; confidence: number } {
  if (!overview || overview.length < 20) {
    return { tagline: null, confidence: 0 };
  }

  // Extract first sentence if it looks like a tagline
  const firstSentence = overview.split(/[.!?]/)[0]?.trim();
  
  if (!firstSentence || firstSentence.length < 10 || firstSentence.length > 120) {
    return { tagline: null, confidence: 0 };
  }

  // Check if it's promotional/tagline-like (not just plot description)
  const taglineIndicators = [
    /^the story of/i,
    /^a tale of/i,
    /^when /i,
    /^after /i,
    /^in a world/i,
    /journey/i,
    /fight for/i,
    /battle for/i,
    /quest for/i,
  ];

  const plotIndicators = [
    /^[A-Z][a-z]+ is a/i,
    /^This film/i,
    /^The movie/i,
    /\d{4}/,  // Years usually indicate plot description
  ];

  // Skip if it looks like a plot description
  if (plotIndicators.some(p => p.test(firstSentence))) {
    return { tagline: null, confidence: 0 };
  }

  // Boost confidence if it has tagline indicators
  const hasTaglineIndicator = taglineIndicators.some(p => p.test(firstSentence));
  
  if (hasTaglineIndicator || firstSentence.length < 60) {
    return { tagline: firstSentence, confidence: CONFIDENCE.OVERVIEW_EXTRACT };
  }

  return { tagline: null, confidence: 0 };
}

// ============================================================
// MAIN ENRICHMENT LOGIC
// ============================================================

async function enrichTagline(movie: Movie): Promise<EnrichmentResult | null> {
  // Skip if already has tagline
  if (movie.tagline && movie.tagline.trim().length > 0) {
    return null;
  }

  let bestTagline: string | null = null;
  let bestSource = '';
  let bestConfidence = 0;

  // 1. Try TMDB (highest priority)
  if (movie.tmdb_id) {
    const tmdbResult = await getTMDBTagline(movie.tmdb_id);
    if (tmdbResult.tagline && tmdbResult.confidence > bestConfidence) {
      bestTagline = tmdbResult.tagline;
      bestSource = 'tmdb';
      bestConfidence = tmdbResult.confidence;
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 2. Try English Wikipedia if no TMDB result
  if (!bestTagline) {
    const wikiResult = await getEnglishWikipediaTagline(movie.title_en, movie.release_year);
    if (wikiResult.tagline && wikiResult.confidence > bestConfidence) {
      bestTagline = wikiResult.tagline;
      bestSource = 'english_wikipedia';
      bestConfidence = wikiResult.confidence;
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 3. Try Telugu Wikipedia (NEW)
  if (!bestTagline) {
    const teWikiResult = await getTeluguWikipediaTagline(
      movie.title_en, 
      movie.title_te, 
      movie.release_year
    );
    if (teWikiResult.tagline && teWikiResult.confidence > bestConfidence) {
      bestTagline = teWikiResult.tagline;
      bestSource = 'telugu_wikipedia';
      bestConfidence = teWikiResult.confidence;
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 4. Try OMDB as fallback
  if (!bestTagline && movie.imdb_id) {
    const omdbResult = await getOMDBTagline(movie.imdb_id);
    if (omdbResult.tagline && omdbResult.confidence > bestConfidence) {
      bestTagline = omdbResult.tagline;
      bestSource = 'omdb';
      bestConfidence = omdbResult.confidence;
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 5. Try AI-generated tagline (medium confidence)
  if (!bestTagline || bestConfidence < 0.6) {
    const aiResult = await generateTaglineWithAI(
      movie.title_en,
      movie.release_year,
      movie.overview,
      movie.genres
    );
    if (aiResult.tagline && aiResult.confidence > bestConfidence) {
      bestTagline = aiResult.tagline;
      bestSource = 'ai_generated';
      bestConfidence = aiResult.confidence;
    }
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
  }

  // 6. Try extracting from overview (low confidence)
  if (!bestTagline && movie.overview) {
    const overviewResult = extractTaglineFromOverview(movie.overview);
    if (overviewResult.tagline && overviewResult.confidence > bestConfidence) {
      bestTagline = overviewResult.tagline;
      bestSource = 'overview_extract';
      bestConfidence = overviewResult.confidence;
    }
  }

  // Apply minimum confidence filter
  if (!bestTagline || bestConfidence < MIN_CONFIDENCE) {
    return null;
  }

  return {
    movieId: movie.id,
    title: movie.title_en,
    tagline: bestTagline,
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
║           TAGLINE ENRICHMENT v2.0                                    ║
║   Sources: TMDB → En Wiki → Te Wiki → OMDB → Overview                ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Limit: ${LIMIT} movies`);
  console.log(`  Min Confidence: ${MIN_CONFIDENCE}`);
  if (DECADE) console.log(`  Decade: ${DECADE}s`);

  // Build query for movies without tagline
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, release_year, tmdb_id, imdb_id, tagline, overview, genres')
    .eq('language', 'Telugu')
    .or('tagline.is.null,tagline.eq.')
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
    console.log(chalk.green('  ✅ No movies need tagline enrichment.'));
    return;
  }

  console.log(`\n  Found ${chalk.cyan(movies.length)} movies to process\n`);

  // Process movies
  const results: EnrichmentResult[] = [];
  const sourceStats: Record<string, number> = {};
  const confidenceStats: Record<string, number> = { high: 0, medium: 0, low: 0 };
  let noTaglineFound = 0;
  let skipped = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i] as Movie;
    const result = await enrichTagline(movie);

    if (result) {
      results.push(result);
      sourceStats[result.source] = (sourceStats[result.source] || 0) + 1;
      
      // Track confidence tiers
      if (result.confidence >= 0.8) confidenceStats.high++;
      else if (result.confidence >= 0.5) confidenceStats.medium++;
      else confidenceStats.low++;

      if (VERBOSE) {
        console.log(`  ${i + 1}. ${movie.title_en}: "${result.tagline}" [${result.source}, ${(result.confidence * 100).toFixed(0)}%]`);
      }
    } else if (movie.tagline) {
      skipped++;
    } else {
      noTaglineFound++;
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
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
    Taglines found:     ${chalk.green(results.length.toString().padStart(4))} movies
    No tagline found:   ${chalk.yellow(noTaglineFound.toString().padStart(4))} movies
    Skipped (had one):  ${chalk.gray(skipped.toString().padStart(4))} movies
  `);

  console.log('  Source Distribution:');
  for (const [source, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    const color = source === 'tmdb' ? chalk.green :
                  source.includes('wikipedia') ? chalk.blue : chalk.yellow;
    console.log(`    ${source.padEnd(20)}: ${color(count.toString())}`);
  }

  console.log('\n  Confidence Distribution:');
  console.log(`    High (≥80%):   ${chalk.green(confidenceStats.high.toString().padStart(4))}`);
  console.log(`    Medium (≥50%): ${chalk.yellow(confidenceStats.medium.toString().padStart(4))}`);
  console.log(`    Low (<50%):    ${chalk.gray(confidenceStats.low.toString().padStart(4))}`);

  // Apply changes if --execute flag is set
  if (EXECUTE && results.length > 0) {
    console.log(chalk.cyan('\n  Applying changes to database...'));

    let successCount = 0;
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ 
          tagline: result.tagline,
          tagline_source: result.source,
          tagline_confidence: result.confidence,
        })
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
    console.log('\n  Sample taglines (first 10):');
    for (const result of results.slice(0, 10)) {
      const truncatedTagline = result.tagline.length > 50 
        ? result.tagline.substring(0, 47) + '...'
        : result.tagline;
      const confStr = `${(result.confidence * 100).toFixed(0)}%`;
      console.log(`    ${result.title}: "${truncatedTagline}" [${result.source}, ${confStr}]`);
    }
  }
}

main().catch(console.error);
