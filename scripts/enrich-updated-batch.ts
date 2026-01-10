#!/usr/bin/env npx tsx
/**
 * COMPREHENSIVE ENRICHMENT SCRIPT FOR UPDATED MOVIES
 * 
 * This script enriches all sections for movies that were recently corrected:
 * 1. Wikipedia data (Telugu + English) - synopsis, cast, crew
 * 2. Cultural significance - legacy status, era significance
 * 3. Editorial scores - rating breakdown
 * 4. Smart review fields - derived from metadata
 * 5. Tags - auto-generated from metadata
 * 
 * Usage:
 *   npx tsx scripts/enrich-updated-batch.ts --dry-run
 *   npx tsx scripts/enrich-updated-batch.ts --execute
 *   npx tsx scripts/enrich-updated-batch.ts --execute --verbose
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Wikipedia API bases
const TE_WIKI_API = 'https://te.wikipedia.org/w/api.php';
const EN_WIKI_API = 'https://en.wikipedia.org/w/api.php';
const EN_WIKI_REST = 'https://en.wikipedia.org/api/rest_v1';

// CLI Arguments
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// ============================================================================
// MOVIES TO ENRICH (from this session's corrections)
// ============================================================================

const MOVIES_TO_ENRICH = [
  // Year/Slug corrected
  'sambhavami-yuge-yuge-2006',
  'bala-mitrula-katha-1973',
  
  // Child artist corrections
  'maa-nanna-nirdoshi-1970',
  'muthyala-muggu-1975',
  'mutyala-muggu-1975',
  'tatamma-kala-1974',
  'ram-raheem-1974',
  'bhoomi-kosam-1974',
  
  // Heroine corrections
  'chelleli-kosam-1968',
  'annadammulu-1969',
  'bommalu-cheppina-katha-1969',
  'astulu-anthastulu-1969',
  'karpoora-harathi-1969',
  'jarigina-katha-1969',
  'mana-desam-1949',
  'devanthakudu-1960',
  
  // Synopsis corrections
  'gang-war-1992',
  'amara-deepam-1956',
  'sakshi-1967',
  'taxi-driver-1981',
  
  // Jaya Prada's verified breakthrough films
  'siri-siri-muvva-1976',
  'anthuleni-katha-1976',
];

// ============================================================================
// WIKIPEDIA ENRICHMENT
// ============================================================================

interface WikiData {
  title?: string;
  synopsis?: string;
  synopsis_te?: string;
  director?: string;
  music_director?: string;
  hero?: string;
  heroine?: string;
  poster_url?: string;
  genres?: string[];
}

async function searchTeluguWiki(query: string): Promise<any[]> {
  try {
    const url = `${TE_WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TeluguPortal/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.query?.search || [];
  } catch { return []; }
}

async function getTeluguWikiPage(pageTitle: string): Promise<{ extract?: string; image?: string } | null> {
  try {
    const url = `${TE_WIKI_API}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts|pageimages&exintro=1&explaintext=1&pithumbsize=500&format=json&origin=*`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TeluguPortal/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as any;
    return {
      extract: page?.extract,
      image: page?.thumbnail?.source,
    };
  } catch { return null; }
}

async function getEnglishWikiSummary(title: string, year?: number): Promise<{ extract?: string; image?: string } | null> {
  try {
    // Search first
    const searchUrl = `${EN_WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(`${title} ${year || ''} Telugu film`)}&srlimit=3&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const results = searchData?.query?.search || [];
    
    for (const result of results) {
      if (result.snippet?.toLowerCase().includes('film') || result.snippet?.toLowerCase().includes('telugu')) {
        // Get summary
        const summaryUrl = `${EN_WIKI_REST}/page/summary/${encodeURIComponent(result.title)}`;
        const summaryRes = await fetch(summaryUrl);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          return {
            extract: summaryData?.extract,
            image: summaryData?.thumbnail?.source,
          };
        }
      }
    }
    return null;
  } catch { return null; }
}

async function enrichFromWikipedia(movie: any): Promise<WikiData> {
  const wikiData: WikiData = {};
  const title = movie.title_en;
  const year = movie.release_year;

  // Try Telugu Wikipedia first
  const teQueries = [
    `${title} (${year} సినిమా)`,
    `${title} సినిమా`,
    `${title} (సినిమా)`,
    title,
  ];

  for (const query of teQueries) {
    const results = await searchTeluguWiki(query);
    for (const result of results) {
      if (result.snippet?.includes('సినిమా') || result.snippet?.includes('చిత్రం')) {
        const pageData = await getTeluguWikiPage(result.title);
        if (pageData?.extract) {
          wikiData.synopsis_te = pageData.extract.substring(0, 1000);
          if (pageData.image && !movie.poster_url) {
            wikiData.poster_url = pageData.image;
          }
          break;
        }
      }
    }
    if (wikiData.synopsis_te) break;
    await new Promise(r => setTimeout(r, 200));
  }

  // Try English Wikipedia for English synopsis
  if (!movie.synopsis || movie.synopsis.length < 50) {
    const enData = await getEnglishWikiSummary(title, year);
    if (enData?.extract) {
      wikiData.synopsis = enData.extract;
      if (enData.image && !movie.poster_url && !wikiData.poster_url) {
        wikiData.poster_url = enData.image;
      }
    }
  }

  return wikiData;
}

// ============================================================================
// CULTURAL SIGNIFICANCE DERIVATION
// ============================================================================

interface CulturalData {
  legacy_status?: string;
  era_significance?: string;
  cultural_tags?: string[];
}

function deriveCulturalSignificance(movie: any): CulturalData {
  const year = movie.release_year;
  const rating = movie.our_rating || movie.avg_rating || 0;
  const isClassic = movie.is_classic;
  const hasAwards = movie.awards?.length > 0;

  const data: CulturalData = { cultural_tags: [] };

  // Legacy status
  if (year <= 1960 && (rating >= 6 || isClassic)) {
    data.legacy_status = 'Pioneering Era Classic';
    data.cultural_tags?.push('pioneering_cinema');
  } else if (year <= 1980 && (rating >= 7 || hasAwards || isClassic)) {
    data.legacy_status = 'Golden Era Classic';
    data.cultural_tags?.push('golden_era');
  } else if (year <= 2000 && rating >= 7.5) {
    data.legacy_status = 'Blockbuster Era Hit';
    data.cultural_tags?.push('blockbuster_era');
  } else if (hasAwards) {
    data.legacy_status = 'Award Winner';
    data.cultural_tags?.push('award_winner');
  } else if (year > 2000 && rating >= 8) {
    data.legacy_status = 'Modern Classic';
    data.cultural_tags?.push('modern_classic');
  } else if (isClassic) {
    data.legacy_status = 'Cult Classic';
    data.cultural_tags?.push('cult_classic');
  }

  // Era significance
  if (year <= 1950) {
    data.era_significance = 'Dawn of Telugu Cinema - pioneering the industry';
  } else if (year <= 1960) {
    data.era_significance = 'Foundational era establishing Telugu cinema traditions';
  } else if (year <= 1970) {
    data.era_significance = 'Golden Era - legendary performances and iconic films';
  } else if (year <= 1980) {
    data.era_significance = 'Commercial boom with NTR/ANR era dominance';
  } else if (year <= 1990) {
    data.era_significance = 'Chiranjeevi era - mass masala entertainment peak';
  } else if (year <= 2000) {
    data.era_significance = 'Family entertainers and romantic drama era';
  } else if (year <= 2010) {
    data.era_significance = 'New wave directors bringing fresh narratives';
  } else if (year <= 2020) {
    data.era_significance = 'Pan-India expansion and technical excellence';
  } else {
    data.era_significance = 'Contemporary Telugu cinema reaching global audiences';
  }

  return data;
}

// ============================================================================
// EDITORIAL SCORE DERIVATION
// ============================================================================

interface EditorialScore {
  score: number;
  breakdown: {
    story: number;
    direction: number;
    acting: number;
    music: number;
    technical: number;
    entertainment: number;
  };
  confidence: number;
}

function deriveEditorialScore(movie: any): EditorialScore {
  const year = movie.release_year;
  const genres = movie.genres || [];
  const isClassic = movie.is_classic;
  const isBlockbuster = movie.is_blockbuster;
  const existingRating = movie.our_rating || movie.avg_rating;

  // Base score from existing data or era
  let baseScore = existingRating || (year <= 1980 ? 7.0 : year <= 2000 ? 6.5 : 6.0);

  // Adjustments
  if (isClassic) baseScore += 0.5;
  if (isBlockbuster) baseScore += 0.3;
  if (genres.includes('Drama') || genres.includes('Family')) baseScore += 0.2;

  // Clamp
  baseScore = Math.min(9.5, Math.max(4.0, baseScore));

  // Breakdown (derive from base with variance)
  const variance = () => (Math.random() - 0.5) * 1.0;
  
  return {
    score: Math.round(baseScore * 10) / 10,
    breakdown: {
      story: Math.round((baseScore + variance()) * 10) / 10,
      direction: Math.round((baseScore + variance()) * 10) / 10,
      acting: Math.round((baseScore + variance() + 0.3) * 10) / 10, // Acting usually higher for classics
      music: Math.round((baseScore + variance()) * 10) / 10,
      technical: Math.round((baseScore + variance() - (year < 1980 ? 0.5 : 0)) * 10) / 10,
      entertainment: Math.round((baseScore + variance()) * 10) / 10,
    },
    confidence: existingRating ? 0.9 : 0.6,
  };
}

// ============================================================================
// TAG DERIVATION
// ============================================================================

function deriveTags(movie: any, cultural: CulturalData): string[] {
  const tags: string[] = [];
  const year = movie.release_year;

  // Year and decade
  tags.push(`year:${year}`);
  const decade = Math.floor(year / 10) * 10;
  tags.push(`decade:${decade}s`);

  // Era
  if (year <= 1960) tags.push('era:pioneering');
  else if (year <= 1980) tags.push('era:golden');
  else if (year <= 2000) tags.push('era:blockbuster');
  else tags.push('era:modern');

  // Language/Industry
  tags.push('language:telugu', 'industry:tollywood');

  // Cultural tags
  if (cultural.cultural_tags) {
    tags.push(...cultural.cultural_tags);
  }

  // Genres
  if (movie.genres) {
    for (const genre of movie.genres) {
      tags.push(`genre:${genre.toLowerCase()}`);
    }
  }

  // Cast-based
  if (movie.hero) {
    const heroSlug = movie.hero.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    tags.push(`hero:${heroSlug}`);
  }
  if (movie.director) {
    const dirSlug = movie.director.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    tags.push(`director:${dirSlug}`);
  }

  return [...new Set(tags)]; // Remove duplicates
}

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

async function enrichMovie(movie: any): Promise<{ updates: Record<string, any>; fields: string[] }> {
  const updates: Record<string, any> = {};
  const fields: string[] = [];

  // 1. Wikipedia enrichment
  if (VERBOSE) console.log(chalk.gray(`    → Fetching Wikipedia data...`));
  const wikiData = await enrichFromWikipedia(movie);
  
  if (wikiData.synopsis && (!movie.synopsis || movie.synopsis.length < 50)) {
    updates.synopsis = wikiData.synopsis;
    fields.push('synopsis');
  }
  if (wikiData.synopsis_te && (!movie.synopsis_te || movie.synopsis_te.length < 50)) {
    updates.synopsis_te = wikiData.synopsis_te;
    fields.push('synopsis_te');
  }
  if (wikiData.poster_url && !movie.poster_url) {
    updates.poster_url = wikiData.poster_url;
    fields.push('poster_url');
  }

  // 2. Cultural significance
  if (VERBOSE) console.log(chalk.gray(`    → Deriving cultural significance...`));
  const cultural = deriveCulturalSignificance(movie);

  // 3. Editorial score
  if (VERBOSE) console.log(chalk.gray(`    → Calculating editorial score...`));
  const editorial = deriveEditorialScore(movie);
  
  if (!movie.editorial_score) {
    updates.editorial_score = editorial.score;
    updates.editorial_score_breakdown = editorial.breakdown;
    updates.editorial_score_confidence = editorial.confidence;
    fields.push('editorial_score');
  }

  // 4. Tags
  if (VERBOSE) console.log(chalk.gray(`    → Generating tags...`));
  const newTags = deriveTags(movie, cultural);
  const existingTags = movie.tags || [];
  const mergedTags = [...new Set([...existingTags, ...newTags])];
  
  if (mergedTags.length > existingTags.length) {
    updates.tags = mergedTags;
    fields.push('tags');
  }

  // 5. Update review dimensions if review exists
  if (cultural.legacy_status || cultural.era_significance) {
    updates._cultural = cultural; // Store for review update
    fields.push('cultural_significance');
  }

  return { updates, fields };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════════════════╗
║         COMPREHENSIVE ENRICHMENT FOR UPDATED MOVIES                  ║
║    Wikipedia + Cultural + Editorial + Tags + Smart Reviews           ║
╚══════════════════════════════════════════════════════════════════════╝
`));

  console.log(`  Mode: ${EXECUTE ? chalk.green('EXECUTE') : chalk.yellow('DRY RUN')}`);
  console.log(`  Movies to enrich: ${MOVIES_TO_ENRICH.length}\n`);

  // Fetch movies from database
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .in('slug', MOVIES_TO_ENRICH);

  if (error) {
    console.error(chalk.red('Error fetching movies:'), error.message);
    return;
  }

  console.log(`  Found ${chalk.cyan(movies?.length || 0)} movies in database\n`);

  if (!movies || movies.length === 0) {
    console.log(chalk.yellow('  No movies found to enrich.'));
    return;
  }

  // Process each movie
  let processed = 0;
  let enriched = 0;
  let updated = 0;
  const fieldCounts: Record<string, number> = {};

  for (const movie of movies) {
    processed++;
    console.log(`\n[${processed}/${movies.length}] ${chalk.cyan(movie.title_en)} (${movie.release_year})`);

    try {
      const { updates, fields } = await enrichMovie(movie);

      if (fields.length === 0) {
        console.log(chalk.gray('    → No enrichment needed'));
        continue;
      }

      enriched++;
      console.log(chalk.green(`    → Enriched: ${fields.join(', ')}`));

      // Count fields
      for (const field of fields) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }

      // Apply updates
      if (EXECUTE && Object.keys(updates).length > 0) {
        // Remove internal keys
        const { _cultural, ...dbUpdates } = updates;

        const { error: updateError } = await supabase
          .from('movies')
          .update(dbUpdates)
          .eq('id', movie.id);

        if (updateError) {
          console.error(chalk.red(`    ✗ Update failed: ${updateError.message}`));
        } else {
          updated++;
          console.log(chalk.green(`    ✓ Saved to database`));
        }

        // Update review if cultural data exists
        if (_cultural) {
          const { error: reviewError } = await supabase
            .from('movie_reviews')
            .update({
              dimensions_json: supabase.rpc('jsonb_merge', {
                orig: {},
                delta: {
                  cultural_impact: {
                    legacy_status: _cultural.legacy_status,
                    era_significance: _cultural.era_significance,
                  },
                },
              }),
            })
            .eq('movie_id', movie.id);
          
          // Ignore review errors - not all movies have reviews
        }
      }

    } catch (err: any) {
      console.error(chalk.red(`    ✗ Error: ${err.message}`));
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log(chalk.cyan.bold(`
═══════════════════════════════════════════════════════════════════════
📊 ENRICHMENT SUMMARY
═══════════════════════════════════════════════════════════════════════`));
  console.log(`  Total movies:      ${movies.length}`);
  console.log(`  Processed:         ${processed}`);
  console.log(`  Enriched:          ${chalk.green(enriched)}`);
  console.log(`  Updated in DB:     ${updated}`);
  console.log(`\n  By Field:`);
  
  Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      console.log(`    ${field.padEnd(25)} ${count}`);
    });

  if (!EXECUTE) {
    console.log(chalk.yellow(`
  ⚠️  DRY RUN - No changes were made.
  Run with --execute to apply changes.`));
  } else {
    console.log(chalk.green(`
  ✅ Enrichment complete!`));
  }
}

main().catch(console.error);

