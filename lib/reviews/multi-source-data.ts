/**
 * MULTI-SOURCE DATA ORCHESTRATOR
 * 
 * Gathers movie data from multiple sources for editorial reviews:
 * - Wikipedia: Plot, Reception, Legacy sections
 * - OMDb: Ratings (IMDB, RT, Metacritic), Awards text
 * - Wikidata: Structured awards data
 * - Google KG: Entity descriptions
 * - TMDB: Cast, crew, images (existing)
 * 
 * Reduces AI costs by providing factual data that doesn't need generation.
 */

import { createClient } from '@supabase/supabase-js';
import { getOMDbFetcher, type ParsedOMDbData } from '@/lib/sources/fetchers/omdb-fetcher';
import { getGoogleKGFetcher, type ParsedKGEntity } from '@/lib/sources/fetchers/google-kg-fetcher';
import { getWikidataAwardsFetcher, type MovieAwardsResult } from '@/lib/sources/fetchers/wikidata-awards-fetcher';
import { getWikipediaFetcher, type WikipediaMovieSections } from '@/lib/sources/fetchers/wikipedia-fetcher';

// ============================================================
// TYPES
// ============================================================

export interface MultiSourceMovieData {
  // Source identification
  movieId: string;
  movieTitle: string;
  releaseYear?: number;
  imdbId?: string;
  wikidataId?: string;

  // Synopsis (no AI needed)
  synopsis: {
    source: 'wikipedia' | 'tmdb' | 'omdb' | 'google_kg';
    text: string;
    wordCount: number;
    confidence: number;
  } | null;

  // Ratings from multiple sources
  ratings: {
    imdb?: number;
    rottenTomatoes?: number;
    metacritic?: number;
    tmdb?: number;
    aggregatedAverage?: number;
    sourcesCount: number;
  };

  // Awards data
  awards: {
    source: 'wikidata' | 'omdb' | 'wikipedia';
    rawText?: string;
    structured: Array<{
      name: string;
      category?: string;
      year?: number;
      type: 'win' | 'nomination';
    }>;
    totalWins: number;
    totalNominations: number;
    majorAwards: string[];
  };

  // Critical reception
  reception: {
    source: 'wikipedia';
    text: string;
    wordCount: number;
  } | null;

  // Legacy / Cultural Impact
  legacy: {
    source: 'wikipedia' | 'google_kg';
    text: string;
    wordCount: number;
  } | null;

  // Cast information
  cast: {
    source: 'tmdb' | 'omdb' | 'wikipedia';
    actors: string[];
    director?: string;
    musicDirector?: string;
  };

  // AI context (what AI still needs to generate)
  aiContext: {
    factualSummary: string;
    hasSynopsis: boolean;
    hasRatings: boolean;
    hasAwards: boolean;
    hasReception: boolean;
    hasLegacy: boolean;
    missingFields: string[];
    recommendedAiSections: string[];
  };

  // Metadata
  fetchedAt: string;
  sourcesUsed: string[];
  cacheKey: string;
}

// ============================================================
// CACHE
// ============================================================

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedData {
  data: MultiSourceMovieData;
  timestamp: number;
}

const memoryCache = new Map<string, CachedData>();

function getCacheKey(movieId: string): string {
  return `multi-source:${movieId}`;
}

function getFromCache(cacheKey: string): MultiSourceMovieData | null {
  const cached = memoryCache.get(cacheKey);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL_MS) {
    memoryCache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}

function setCache(cacheKey: string, data: MultiSourceMovieData): void {
  memoryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

/**
 * Gather data from all configured sources for a movie
 */
export async function gatherMultiSourceData(
  movieId: string,
  options: {
    skipCache?: boolean;
    sources?: ('wikipedia' | 'omdb' | 'wikidata' | 'google_kg' | 'tmdb')[];
  } = {}
): Promise<MultiSourceMovieData> {
  const cacheKey = getCacheKey(movieId);
  
  // Check cache first
  if (!options.skipCache) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`[MultiSource] Cache hit for ${movieId}`);
      return cached;
    }
  }

  console.log(`[MultiSource] Fetching data for ${movieId}`);
  const sourcesToUse = options.sources || ['wikipedia', 'omdb', 'wikidata', 'google_kg', 'tmdb'];

  // Get movie metadata from database
  const supabase = getSupabase();
  const { data: movie } = await supabase
    .from('movies')
    .select('id, title_en, title_te, release_year, imdb_id, director, hero, heroine, music_director, avg_rating, synopsis')
    .eq('id', movieId)
    .single();

  if (!movie) {
    throw new Error(`Movie not found: ${movieId}`);
  }

  // Initialize result
  const result: MultiSourceMovieData = {
    movieId: movie.id,
    movieTitle: movie.title_en,
    releaseYear: movie.release_year,
    imdbId: movie.imdb_id,
    wikidataId: movie.wikidata_id,
    synopsis: null,
    ratings: { sourcesCount: 0 },
    awards: {
      source: 'wikidata',
      structured: [],
      totalWins: 0,
      totalNominations: 0,
      majorAwards: [],
    },
    reception: null,
    legacy: null,
    cast: {
      source: 'tmdb',
      actors: [],
      director: movie.director,
      musicDirector: movie.music_director,
    },
    aiContext: {
      factualSummary: '',
      hasSynopsis: false,
      hasRatings: false,
      hasAwards: false,
      hasReception: false,
      hasLegacy: false,
      missingFields: [],
      recommendedAiSections: [],
    },
    fetchedAt: new Date().toISOString(),
    sourcesUsed: [],
    cacheKey,
  };

  // Parallel fetch from all sources
  const fetchPromises: Promise<void>[] = [];

  // Wikipedia
  if (sourcesToUse.includes('wikipedia')) {
    fetchPromises.push(
      fetchWikipediaData(movie.title_en, movie.release_year, result)
    );
  }

  // OMDb
  if (sourcesToUse.includes('omdb') && movie.imdb_id) {
    fetchPromises.push(
      fetchOMDbData(movie.imdb_id, result)
    );
  }

  // Wikidata Awards
  if (sourcesToUse.includes('wikidata') && movie.wikidata_id) {
    fetchPromises.push(
      fetchWikidataAwards(movie.wikidata_id, result)
    );
  }

  // Google KG (as fallback/supplement)
  if (sourcesToUse.includes('google_kg')) {
    fetchPromises.push(
      fetchGoogleKGData(movie.title_en, movie.release_year, result)
    );
  }

  // TMDB data is already in DB - just use it
  if (sourcesToUse.includes('tmdb')) {
    if (movie.avg_rating) {
      result.ratings.tmdb = movie.avg_rating;
      result.ratings.sourcesCount++;
    }
    if (movie.synopsis && !result.synopsis) {
      result.synopsis = {
        source: 'tmdb',
        text: movie.synopsis,
        wordCount: movie.synopsis.split(/\s+/).length,
        confidence: 0.8,
      };
    }
    if (movie.hero) {
      result.cast.actors.push(movie.hero);
    }
    if (movie.heroine) {
      result.cast.actors.push(movie.heroine);
    }
    result.sourcesUsed.push('tmdb');
  }

  // Wait for all fetches
  await Promise.allSettled(fetchPromises);

  // Calculate aggregated rating
  const ratingValues: number[] = [];
  if (result.ratings.imdb) ratingValues.push(result.ratings.imdb);
  if (result.ratings.rottenTomatoes) ratingValues.push(result.ratings.rottenTomatoes / 10);
  if (result.ratings.metacritic) ratingValues.push(result.ratings.metacritic / 10);
  if (result.ratings.tmdb) ratingValues.push(result.ratings.tmdb);
  
  if (ratingValues.length > 0) {
    result.ratings.aggregatedAverage = 
      Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10;
    result.ratings.sourcesCount = ratingValues.length;
  }

  // Build AI context
  buildAIContext(result);

  // Cache the result
  setCache(cacheKey, result);

  console.log(`[MultiSource] Gathered data from ${result.sourcesUsed.length} sources for ${movie.title_en}`);
  return result;
}

// ============================================================
// SOURCE-SPECIFIC FETCHERS
// ============================================================

async function fetchWikipediaData(
  title: string,
  year: number | undefined,
  result: MultiSourceMovieData
): Promise<void> {
  try {
    const fetcher = getWikipediaFetcher();
    const sections = await fetcher.getEditorialSections(title, year);

    if (sections.plot.found) {
      result.synopsis = {
        source: 'wikipedia',
        text: sections.plot.content,
        wordCount: sections.plot.wordCount,
        confidence: 0.9,
      };
    }

    if (sections.reception.found) {
      result.reception = {
        source: 'wikipedia',
        text: sections.reception.content,
        wordCount: sections.reception.wordCount,
      };
    }

    if (sections.legacy.found) {
      result.legacy = {
        source: 'wikipedia',
        text: sections.legacy.content,
        wordCount: sections.legacy.wordCount,
      };
    }

    if (sections.accolades.found) {
      result.awards.source = 'wikipedia';
      result.awards.rawText = sections.accolades.content;
    }

    result.sourcesUsed.push('wikipedia');
  } catch (error) {
    console.warn(`[MultiSource] Wikipedia fetch failed for "${title}":`, error);
  }
}

async function fetchOMDbData(
  imdbId: string,
  result: MultiSourceMovieData
): Promise<void> {
  try {
    const fetcher = getOMDbFetcher();
    const data = await fetcher.fetchByImdbId(imdbId);

    if (!data) return;

    // Ratings
    if (data.ratings.imdb) {
      result.ratings.imdb = data.ratings.imdb;
    }
    if (data.ratings.rottenTomatoes) {
      result.ratings.rottenTomatoes = data.ratings.rottenTomatoes;
    }
    if (data.ratings.metacritic) {
      result.ratings.metacritic = data.ratings.metacritic;
    }

    // Awards
    if (data.awards && data.awards !== 'N/A') {
      result.awards.rawText = result.awards.rawText 
        ? `${result.awards.rawText} ${data.awards}`
        : data.awards;
      
      for (const award of data.parsedAwards) {
        result.awards.structured.push({
          name: award.description,
          type: award.type,
        });
        if (award.type === 'win') {
          result.awards.totalWins += award.count;
        } else {
          result.awards.totalNominations += award.count;
        }
      }
    }

    // Synopsis fallback
    if (!result.synopsis && data.plot) {
      result.synopsis = {
        source: 'omdb',
        text: data.plot,
        wordCount: data.plot.split(/\s+/).length,
        confidence: 0.85,
      };
    }

    // Cast
    if (data.actors.length > 0) {
      result.cast.source = 'omdb';
      result.cast.actors = [...new Set([...result.cast.actors, ...data.actors])];
    }
    if (data.director && data.director !== 'N/A') {
      result.cast.director = data.director;
    }

    result.sourcesUsed.push('omdb');
  } catch (error) {
    console.warn(`[MultiSource] OMDb fetch failed for ${imdbId}:`, error);
  }
}

async function fetchWikidataAwards(
  wikidataId: string,
  result: MultiSourceMovieData
): Promise<void> {
  try {
    const fetcher = getWikidataAwardsFetcher();
    const awardsData = await fetcher.getMovieAwards(wikidataId);

    if (awardsData.awards.length > 0) {
      result.awards.source = 'wikidata';
      
      for (const award of awardsData.awards) {
        result.awards.structured.push({
          name: award.awardName,
          category: award.awardCategory,
          year: award.year,
          type: 'win', // Wikidata P166 is for awards received
        });
      }

      result.awards.totalWins = Math.max(result.awards.totalWins, awardsData.totalWins);
      result.awards.majorAwards = awardsData.majorAwards;
    }

    result.sourcesUsed.push('wikidata');
  } catch (error) {
    console.warn(`[MultiSource] Wikidata fetch failed for ${wikidataId}:`, error);
  }
}

async function fetchGoogleKGData(
  title: string,
  year: number | undefined,
  result: MultiSourceMovieData
): Promise<void> {
  try {
    const fetcher = getGoogleKGFetcher();
    const entity = await fetcher.searchMovie(title, year);

    if (!entity) return;

    // Use detailed description for legacy/cultural context if we don't have it
    if (!result.legacy && entity.detailedDescription) {
      result.legacy = {
        source: 'google_kg',
        text: entity.detailedDescription,
        wordCount: entity.detailedDescription.split(/\s+/).length,
      };
    }

    // Synopsis fallback from Google KG
    if (!result.synopsis && entity.description) {
      result.synopsis = {
        source: 'google_kg',
        text: entity.description,
        wordCount: entity.description.split(/\s+/).length,
        confidence: 0.75,
      };
    }

    result.sourcesUsed.push('google_kg');
  } catch (error) {
    console.warn(`[MultiSource] Google KG fetch failed for "${title}":`, error);
  }
}

// ============================================================
// AI CONTEXT BUILDER
// ============================================================

function buildAIContext(result: MultiSourceMovieData): void {
  const ctx = result.aiContext;

  // Determine what we have
  ctx.hasSynopsis = !!result.synopsis;
  ctx.hasRatings = result.ratings.sourcesCount > 0;
  ctx.hasAwards = result.awards.structured.length > 0 || !!result.awards.rawText;
  ctx.hasReception = !!result.reception;
  ctx.hasLegacy = !!result.legacy;

  // Build factual summary for AI
  const facts: string[] = [];
  
  if (result.synopsis) {
    facts.push(`Plot: ${result.synopsis.text.slice(0, 500)}...`);
  }
  
  if (result.ratings.aggregatedAverage) {
    facts.push(`Ratings: ${result.ratings.aggregatedAverage}/10 from ${result.ratings.sourcesCount} sources`);
    if (result.ratings.imdb) facts.push(`IMDB: ${result.ratings.imdb}`);
    if (result.ratings.rottenTomatoes) facts.push(`Rotten Tomatoes: ${result.ratings.rottenTomatoes}%`);
    if (result.ratings.metacritic) facts.push(`Metacritic: ${result.ratings.metacritic}`);
  }
  
  if (result.awards.totalWins > 0) {
    facts.push(`Awards: ${result.awards.totalWins} wins, ${result.awards.totalNominations} nominations`);
    if (result.awards.majorAwards.length > 0) {
      facts.push(`Major: ${result.awards.majorAwards.join(', ')}`);
    }
  }
  
  if (result.reception) {
    facts.push(`Critical Reception: ${result.reception.text.slice(0, 300)}...`);
  }
  
  if (result.legacy) {
    facts.push(`Cultural Impact: ${result.legacy.text.slice(0, 300)}...`);
  }

  ctx.factualSummary = facts.join('\n');

  // Determine missing fields
  if (!ctx.hasSynopsis) ctx.missingFields.push('synopsis');
  if (!ctx.hasRatings) ctx.missingFields.push('ratings');
  if (!ctx.hasAwards) ctx.missingFields.push('awards');
  if (!ctx.hasReception) ctx.missingFields.push('reception');
  if (!ctx.hasLegacy) ctx.missingFields.push('legacy');

  // Recommend AI sections to generate
  // These always need AI analysis regardless of factual data
  ctx.recommendedAiSections = [
    'story_screenplay',    // Subjective analysis
    'performances',        // Subjective analysis  
    'direction_technicals', // Subjective analysis
    'perspectives',        // Synthesis
    'why_watch',          // Recommendation
    'why_skip',           // Recommendation
    'verdict',            // Final synthesis
  ];

  // If we don't have certain data, AI needs to help more
  if (!ctx.hasSynopsis) {
    ctx.recommendedAiSections.unshift('synopsis');
  }
  if (!ctx.hasLegacy) {
    ctx.recommendedAiSections.push('cultural_impact');
  }
}

// ============================================================
// UTILITY EXPORTS
// ============================================================

export function clearCache(): void {
  memoryCache.clear();
  console.log('[MultiSource] Cache cleared');
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys()),
  };
}

