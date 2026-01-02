/**
 * Orphan Movie Resolver
 * 
 * Resolves "orphan" movies that have no tmdb_id by:
 * 1. Searching TMDB for matches by title + year
 * 2. If an enriched entry already exists, merge orphan into it
 * 3. If no enriched entry, enrich the orphan directly
 * 
 * This runs as part of the finalize pipeline to ensure all movies
 * have proper TMDB data and images before being promoted to verified.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { searchTMDBMovie, canonicalizeTitle, TMDBMovieData } from './movie-identity-gate';

// ============================================================
// TYPES
// ============================================================

export interface OrphanMovie {
  id: string;
  title_en: string;
  title_te: string | null;
  slug: string;
  release_year: number | null;
  is_published: boolean;
}

export interface EnrichedMovie {
  id: string;
  tmdb_id: number;
  title_en: string;
  slug: string;
  poster_url: string | null;
  backdrop_url: string | null;
}

export type ResolutionAction = 'merged' | 'enriched' | 'unresolved' | 'skipped';

export interface OrphanResolution {
  orphan: OrphanMovie;
  action: ResolutionAction;
  targetId?: string;       // ID of movie we merged into (if merged)
  tmdbId?: number;         // TMDB ID found (if any)
  error?: string;
}

export interface OrphanResolutionResult {
  total: number;
  merged: number;
  enriched: number;
  unresolved: number;
  skipped: number;
  resolutions: OrphanResolution[];
  errors: string[];
  duration: number;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

// ============================================================
// ORPHAN DISCOVERY
// ============================================================

/**
 * Find all orphan movies (published but no tmdb_id)
 */
export async function findOrphanMovies(options: {
  limit?: number;
  publishedOnly?: boolean;
}): Promise<OrphanMovie[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, release_year, is_published')
    .is('tmdb_id', null);
  
  if (options.publishedOnly !== false) {
    query = query.eq('is_published', true);
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  query = query.order('created_at', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error finding orphan movies:', error.message);
    return [];
  }
  
  return (data || []) as OrphanMovie[];
}

/**
 * Find existing enriched movie by TMDB ID
 */
async function findEnrichedByTmdbId(tmdbId: number): Promise<EnrichedMovie | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('movies')
    .select('id, tmdb_id, title_en, slug, poster_url, backdrop_url')
    .eq('tmdb_id', tmdbId)
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error finding enriched movie:', error.message);
  }
  
  return data as EnrichedMovie | null;
}

/**
 * Find potential duplicate by canonical title + year
 */
async function findPotentialDuplicate(
  title: string,
  year: number | null
): Promise<EnrichedMovie | null> {
  const supabase = getSupabaseClient();
  const canonical = canonicalizeTitle(title);
  
  let query = supabase
    .from('movies')
    .select('id, tmdb_id, title_en, slug, poster_url, backdrop_url')
    .not('tmdb_id', 'is', null);
  
  if (year) {
    query = query.eq('release_year', year);
  }
  
  const { data, error } = await query;
  
  if (error || !data) return null;
  
  // Find best match by canonical title
  for (const movie of data) {
    const movieCanonical = canonicalizeTitle(movie.title_en);
    if (movieCanonical === canonical) {
      return movie as EnrichedMovie;
    }
  }
  
  return null;
}

// ============================================================
// INVALID ENTRY DETECTION
// ============================================================

/**
 * Patterns that indicate an entry is likely a person name, not a movie
 */
const PERSON_NAME_PATTERNS = [
  // Two-part names ending in common Telugu surnames
  /^[A-Z][a-z]+ (Reddy|Rao|Kumar|Naidu|Varma|Raju|Babu|Prasad|Murthy|Chandra|Krishna|Mohan|Srinivas|Venkat|Mahesh|Suresh|Rajesh|Ramesh|Ganesh|Naresh|Lokesh|Harish|Girish|Satish|Nitish|Manish|Ashish|Kiran|Pawan|Sridhar|Sekhar|Shankar|Anand|Vinod|Manoj|Pramod|Amod|Ravi|Sanjay|Vijay|Ajay|Uday|Sudheer|Sameer|Naseer|Zaheer|Anil|Sunil|Gopal|Mukesh|Rakesh|Dinesh|Bhushan|Kishan|Roshan|Yadav|Choudhary|Singh|Sharma|Gupta|Verma|Saxena|Jain|Agarwal|Bansal|Mittal|Goel|Goyal|Bhardwaj|Chauhan|Thakur|Rawat|Negi|Bisht|Joshi|Pant|Pandey|Tiwari|Mishra|Dubey|Shukla|Srivastava|Rastogi|Mathur|Nigam|Kapoor|Khanna|Malhotra|Chopra|Batra|Ahuja|Kohli|Taneja|Juneja|Vohra|Luthra|Mehra|Sethi|Arora|Aurora|Saini|Gill|Sidhu|Sandhu|Bains|Mann|Dhillon|Grewal|Randhawa|Walia|Bajwa|Cheema|Bhullar|Johal|Multani|Dhami|Brar|Athwal|Samra|Sangha|Hundal|Kalsi|Sahota|Malhi|Dhaliwal|Bassi|Sehgal|Kohli|Monga|Bedi|Sodhi|Nayar|Sood|Khurana|Bindra|Chawla|Duggal|Gambhir|Grover|Handa|Jaggi|Kathuria|Khosla|Kochhar|Lakhanpal|Makkar|Narula|Oberoi|Pahwa|Ralhan|Sachdeva|Talwar|Uppal|Wadhwa|Wahi|Zutshi)$/i,
  // Very short names (likely person names, not movie titles)
  /^[A-Z][a-z]+$/,
  // Names with initials
  /^[A-Z]\. ?[A-Z][a-z]+/,
  // Just first and last name pattern (no year suffix)
  /^[A-Z][a-z]{2,10} [A-Z][a-z]{2,15}$/,
];

/**
 * Common Telugu movie title patterns
 */
const VALID_MOVIE_PATTERNS = [
  // Contains year suffix
  /-\d{4}$/,
  // Contains "the", articles, conjunctions typical in titles
  /\b(the|and|of|in|at|on|for|with|to|from|by|about)\b/i,
  // Telugu romanized words commonly in titles
  /\b(prema|priya|love|life|hero|cinema|movie|night|day|sun|moon|star|heart|soul|dream|journey|story|song|dance|fight|war|peace|friend|enemy|king|queen|prince|princess|god|goddess|temple|village|city|home|family|mother|father|son|daughter|brother|sister|baby|child|youth|old|new|first|last|one|two|three)\b/i,
];

/**
 * Check if title looks like a person name rather than a movie title
 */
function isLikelyPersonName(title: string): boolean {
  // If title matches valid movie patterns, it's probably a movie
  for (const pattern of VALID_MOVIE_PATTERNS) {
    if (pattern.test(title)) {
      return false;
    }
  }
  
  // Check person name patterns
  for (const pattern of PERSON_NAME_PATTERNS) {
    if (pattern.test(title)) {
      return true;
    }
  }
  
  return false;
}

// ============================================================
// ORPHAN RESOLUTION
// ============================================================

/**
 * Resolve a single orphan movie
 */
export async function resolveOrphan(
  orphan: OrphanMovie,
  options: { dryRun: boolean }
): Promise<OrphanResolution> {
  const supabase = getSupabaseClient();
  
  // Pre-check: Does this look like a person name instead of a movie?
  if (isLikelyPersonName(orphan.title_en)) {
    // Unpublish invalid entries - use 'raw' status per schema constraint
    if (!options.dryRun) {
      const { error } = await supabase
        .from('movies')
        .update({ is_published: false })
        .eq('id', orphan.id);
      
      if (!error) {
        console.log(`  ⚠ Unpublished invalid entry: "${orphan.title_en}" (looks like a person name)`);
      }
    } else {
      console.log(`  [DRY RUN] Would unpublish: "${orphan.title_en}" (looks like a person name)`);
    }
    
    return {
      orphan,
      action: 'skipped',
      error: 'Invalid entry: looks like a person name',
    };
  }
  
  // Step 1: Search TMDB for this movie
  const tmdbData = await searchTMDBMovie(orphan.title_en, orphan.release_year || undefined);
  
  if (!tmdbData) {
    // Try without year
    const tmdbDataNoYear = await searchTMDBMovie(orphan.title_en);
    
    if (!tmdbDataNoYear) {
      return {
        orphan,
        action: 'unresolved',
        error: 'No TMDB match found',
      };
    }
    
    return await processOrphanWithTmdbData(orphan, tmdbDataNoYear, options.dryRun, supabase);
  }
  
  return await processOrphanWithTmdbData(orphan, tmdbData, options.dryRun, supabase);
}

/**
 * Process orphan after finding TMDB data
 */
async function processOrphanWithTmdbData(
  orphan: OrphanMovie,
  tmdbData: TMDBMovieData,
  dryRun: boolean,
  supabase: SupabaseClient
): Promise<OrphanResolution> {
  // Step 2: Check if we already have an enriched entry with this TMDB ID
  const existingEnriched = await findEnrichedByTmdbId(tmdbData.id);
  
  if (existingEnriched) {
    // Merge orphan into existing enriched entry
    if (!dryRun) {
      await mergeOrphanIntoEnriched(orphan, existingEnriched, supabase);
    }
    
    return {
      orphan,
      action: 'merged',
      targetId: existingEnriched.id,
      tmdbId: tmdbData.id,
    };
  }
  
  // Step 3: Check for potential duplicate by title + year
  const releaseYear = tmdbData.release_date 
    ? parseInt(tmdbData.release_date.substring(0, 4))
    : orphan.release_year;
  
  const potentialDuplicate = await findPotentialDuplicate(orphan.title_en, releaseYear);
  
  if (potentialDuplicate) {
    // Merge orphan into potential duplicate
    if (!dryRun) {
      await mergeOrphanIntoEnriched(orphan, potentialDuplicate, supabase);
    }
    
    return {
      orphan,
      action: 'merged',
      targetId: potentialDuplicate.id,
      tmdbId: potentialDuplicate.tmdb_id,
    };
  }
  
  // Step 4: No enriched entry exists - enrich the orphan directly
  if (!dryRun) {
    await enrichOrphanWithTmdbData(orphan, tmdbData, supabase);
  }
  
  return {
    orphan,
    action: 'enriched',
    tmdbId: tmdbData.id,
  };
}

/**
 * Merge orphan movie into an enriched entry
 * - Moves reviews and references to the enriched entry
 * - Deletes the orphan entry
 */
async function mergeOrphanIntoEnriched(
  orphan: OrphanMovie,
  enriched: EnrichedMovie,
  supabase: SupabaseClient
): Promise<void> {
  // Move reviews from orphan to enriched
  const { error: reviewError } = await supabase
    .from('movie_reviews')
    .update({ movie_id: enriched.id })
    .eq('movie_id', orphan.id);
  
  if (reviewError) {
    console.warn(`Could not move reviews for ${orphan.title_en}:`, reviewError.message);
  }
  
  // Move trending entries if any
  const { error: trendingError } = await supabase
    .from('trending_movies')
    .update({ movie_id: enriched.id })
    .eq('movie_id', orphan.id);
  
  if (trendingError && trendingError.code !== 'PGRST116') {
    console.warn(`Could not move trending for ${orphan.title_en}:`, trendingError.message);
  }
  
  // Move watchlist entries if any
  const { error: watchlistError } = await supabase
    .from('watchlist')
    .update({ movie_id: enriched.id })
    .eq('movie_id', orphan.id);
  
  if (watchlistError && watchlistError.code !== 'PGRST116') {
    console.warn(`Could not move watchlist for ${orphan.title_en}:`, watchlistError.message);
  }
  
  // Delete the orphan entry
  const { error: deleteError } = await supabase
    .from('movies')
    .delete()
    .eq('id', orphan.id);
  
  if (deleteError) {
    throw new Error(`Failed to delete orphan ${orphan.id}: ${deleteError.message}`);
  }
  
  console.log(`  ✓ Merged "${orphan.title_en}" (${orphan.slug}) → "${enriched.title_en}" (${enriched.slug})`);
}

/**
 * Enrich an orphan with TMDB data directly
 */
async function enrichOrphanWithTmdbData(
  orphan: OrphanMovie,
  tmdbData: TMDBMovieData,
  supabase: SupabaseClient
): Promise<void> {
  const posterUrl = tmdbData.poster_path 
    ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
    : null;
  
  const backdropUrl = tmdbData.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`
    : null;
  
  const releaseYear = tmdbData.release_date
    ? parseInt(tmdbData.release_date.substring(0, 4))
    : orphan.release_year;
  
  // Only update columns that exist in the movies table schema
  const updateData: Record<string, unknown> = {
    tmdb_id: tmdbData.id,
    poster_url: posterUrl,
    backdrop_url: backdropUrl,
    release_year: releaseYear,
    updated_at: new Date().toISOString(),
  };
  
  // Optional: add synopsis if available
  if (tmdbData.overview) {
    updateData.synopsis = tmdbData.overview;
  }
  
  // Note: Director, cast, hero, heroine columns may not exist in schema
  // These are typically stored in the telugu_movie_index table instead
  
  const { error } = await supabase
    .from('movies')
    .update(updateData)
    .eq('id', orphan.id);
  
  if (error) {
    throw new Error(`Failed to enrich orphan ${orphan.id}: ${error.message}`);
  }
  
  console.log(`  ✓ Enriched "${orphan.title_en}" with TMDB ID ${tmdbData.id}`);
}

// ============================================================
// BATCH RESOLUTION
// ============================================================

/**
 * Resolve all orphan movies
 */
export async function resolveAllOrphans(options: {
  dryRun: boolean;
  limit?: number;
  verbose?: boolean;
}): Promise<OrphanResolutionResult> {
  const startTime = Date.now();
  
  const orphans = await findOrphanMovies({ 
    limit: options.limit,
    publishedOnly: true,
  });
  
  if (orphans.length === 0) {
    return {
      total: 0,
      merged: 0,
      enriched: 0,
      unresolved: 0,
      skipped: 0,
      resolutions: [],
      errors: [],
      duration: Date.now() - startTime,
    };
  }
  
  console.log(`\nFound ${orphans.length} orphan movies to resolve\n`);
  
  const resolutions: OrphanResolution[] = [];
  const errors: string[] = [];
  let merged = 0;
  let enriched = 0;
  let unresolved = 0;
  let skipped = 0;
  
  for (const orphan of orphans) {
    if (options.verbose) {
      console.log(`Processing: ${orphan.title_en} (${orphan.slug})`);
    }
    
    try {
      const resolution = await resolveOrphan(orphan, { dryRun: options.dryRun });
      resolutions.push(resolution);
      
      switch (resolution.action) {
        case 'merged':
          merged++;
          break;
        case 'enriched':
          enriched++;
          break;
        case 'unresolved':
          unresolved++;
          if (options.verbose && resolution.error) {
            console.log(`  ⚠ ${resolution.error}`);
          }
          break;
        case 'skipped':
          skipped++;
          break;
      }
      
      // Rate limit TMDB API calls
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`${orphan.title_en}: ${errorMessage}`);
      resolutions.push({
        orphan,
        action: 'unresolved',
        error: errorMessage,
      });
      unresolved++;
    }
  }
  
  return {
    total: orphans.length,
    merged,
    enriched,
    unresolved,
    skipped,
    resolutions,
    errors,
    duration: Date.now() - startTime,
  };
}

// ============================================================
// CLI HELPERS
// ============================================================

/**
 * Run orphan resolution as a standalone operation
 * Called from finalize pipeline or standalone CLI
 */
export async function runOrphanResolution(options: {
  dryRun: boolean;
  limit?: number;
  verbose?: boolean;
}): Promise<{
  success: boolean;
  processed: number;
  fixed: number;
  duration: number;
  errors: string[];
}> {
  const result = await resolveAllOrphans(options);
  
  return {
    success: result.errors.length === 0,
    processed: result.total,
    fixed: result.merged + result.enriched,
    duration: result.duration,
    errors: result.errors,
  };
}

