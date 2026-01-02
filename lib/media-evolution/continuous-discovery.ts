/**
 * Phase 7: Continuous Discovery (Safe Mode)
 * 
 * New discovery inputs with strict rules:
 * - No blind re-ingestion
 * - No duplicate creation
 * - Enrichment only unless validated
 */

import { getSupabaseClient } from '../supabase/client';
import { DiscoveryDelta } from './types';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

// ============================================================
// TMDB WEEKLY DELTA
// ============================================================

interface TMDBChange {
  id: number;
  adult: boolean;
}

/**
 * Fetch movies changed in the last N days from TMDB
 */
export async function fetchTMDBWeeklyDelta(options: {
  startDate?: string;
  endDate?: string;
}): Promise<DiscoveryDelta> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not configured');
  }

  const supabase = getSupabaseClient();
  
  // Default to last 7 days
  const endDate = options.endDate || new Date().toISOString().split('T')[0];
  const startDate = options.startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  })();

  // Fetch changed movie IDs from TMDB
  const changesUrl = `${TMDB_API_BASE}/movie/changes?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}&page=1`;
  
  const response = await fetch(changesUrl);
  if (!response.ok) {
    throw new Error(`TMDB changes API failed: ${response.status}`);
  }

  const data = await response.json();
  const changedIds: number[] = (data.results || [])
    .filter((r: TMDBChange) => !r.adult)
    .map((r: TMDBChange) => r.id);

  if (changedIds.length === 0) {
    return {
      source: 'tmdb_weekly',
      fetched_at: new Date().toISOString(),
      new_entries: 0,
      updated_entries: 0,
      entries: []
    };
  }

  // Cross-reference with our index
  const { data: existingInIndex } = await supabase
    .from('telugu_movie_index')
    .select('tmdb_id')
    .in('tmdb_id', changedIds.slice(0, 100));

  const { data: existingInMovies } = await supabase
    .from('movies')
    .select('tmdb_id')
    .in('tmdb_id', changedIds.slice(0, 100));

  const indexSet = new Set((existingInIndex || []).map(r => r.tmdb_id));
  const movieSet = new Set((existingInMovies || []).map(r => r.tmdb_id));

  // Classify each changed ID
  const entries: DiscoveryDelta['entries'] = [];
  let newCount = 0;
  let updateCount = 0;

  for (const tmdbId of changedIds.slice(0, 50)) {
    // Check if it's a Telugu movie
    const detailUrl = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}`;
    const detailResponse = await fetch(detailUrl);
    
    if (!detailResponse.ok) continue;
    
    const detail = await detailResponse.json();
    
    // Only process Telugu movies
    if (detail.original_language !== 'te') continue;

    const inIndex = indexSet.has(tmdbId);
    const inMovies = movieSet.has(tmdbId);

    if (!inIndex && !inMovies) {
      // New Telugu movie discovered
      entries.push({
        tmdb_id: tmdbId,
        title: detail.title,
        action: 'new',
        reason: 'New Telugu movie found in TMDB changes'
      });
      newCount++;
    } else if (inIndex && !inMovies) {
      // In index but not enriched yet
      entries.push({
        tmdb_id: tmdbId,
        title: detail.title,
        action: 'enrich_only',
        reason: 'In index, needs enrichment'
      });
    } else if (inMovies) {
      // Already enriched, check for updates
      entries.push({
        tmdb_id: tmdbId,
        title: detail.title,
        action: 'update',
        reason: 'Existing movie updated in TMDB'
      });
      updateCount++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    source: 'tmdb_weekly',
    fetched_at: new Date().toISOString(),
    new_entries: newCount,
    updated_entries: updateCount,
    entries
  };
}

// ============================================================
// SAFE ENRICHMENT
// ============================================================

/**
 * Process discovery delta safely (enrichment only)
 */
export async function processDiscoveryDelta(
  delta: DiscoveryDelta,
  options: {
    dryRun?: boolean;
    onProgress?: (current: number, total: number, entry: any) => void;
  } = {}
): Promise<{
  processed: number;
  enriched: number;
  skipped: number;
  errors: string[];
}> {
  const { dryRun = true, onProgress } = options;
  const supabase = getSupabaseClient();

  const stats = {
    processed: 0,
    enriched: 0,
    skipped: 0,
    errors: [] as string[]
  };

  for (const entry of delta.entries) {
    stats.processed++;

    if (onProgress) {
      onProgress(stats.processed, delta.entries.length, entry);
    }

    try {
      if (entry.action === 'new') {
        // For new entries, add to index only (no direct movie creation)
        if (!dryRun) {
          const { error } = await supabase
            .from('telugu_movie_index')
            .upsert({
              tmdb_id: entry.tmdb_id,
              title_en: entry.title,
              source: 'tmdb_delta',
              indexed_at: new Date().toISOString(),
              is_verified: false
            }, { onConflict: 'tmdb_id' });

          if (error) {
            stats.errors.push(`Failed to index ${entry.tmdb_id}: ${error.message}`);
            continue;
          }
        }
        stats.enriched++;
      } else if (entry.action === 'update') {
        // For updates, just flag for re-enrichment (don't auto-update)
        stats.skipped++;
      } else if (entry.action === 'enrich_only') {
        // Already in index, skip (enrichment handled by separate command)
        stats.skipped++;
      }
    } catch (error) {
      stats.errors.push(`Error processing ${entry.tmdb_id}: ${error}`);
    }
  }

  return stats;
}

// ============================================================
// DUPLICATE PREVENTION
// ============================================================

/**
 * Check if a movie would create a duplicate before ingestion
 */
export async function wouldCreateDuplicate(
  tmdbId: number,
  title: string,
  year: number | null
): Promise<{
  isDuplicate: boolean;
  reason?: string;
  existing?: { id: string; source: string };
}> {
  const supabase = getSupabaseClient();

  // Check by TMDB ID first (exact match)
  const { data: byTmdbId } = await supabase
    .from('movies')
    .select('id')
    .eq('tmdb_id', tmdbId)
    .limit(1);

  if (byTmdbId && byTmdbId.length > 0) {
    return {
      isDuplicate: true,
      reason: 'Exact TMDB ID match',
      existing: { id: byTmdbId[0].id, source: 'movies.tmdb_id' }
    };
  }

  // Check in index
  const { data: inIndex } = await supabase
    .from('telugu_movie_index')
    .select('tmdb_id')
    .eq('tmdb_id', tmdbId)
    .limit(1);

  if (inIndex && inIndex.length > 0) {
    return {
      isDuplicate: true,
      reason: 'Already in telugu_movie_index',
      existing: { id: String(inIndex[0].tmdb_id), source: 'telugu_movie_index' }
    };
  }

  // Check by normalized title + year (fuzzy)
  if (year) {
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const { data: byTitle } = await supabase
      .from('movies')
      .select('id, title_en, release_year')
      .eq('release_year', year)
      .limit(100);

    const match = byTitle?.find(m => {
      const existing = m.title_en.toLowerCase().replace(/[^a-z0-9]/g, '');
      return existing === normalizedTitle;
    });

    if (match) {
      return {
        isDuplicate: true,
        reason: `Title + year match: "${match.title_en}" (${match.release_year})`,
        existing: { id: match.id, source: 'movies.title+year' }
      };
    }
  }

  return { isDuplicate: false };
}

// ============================================================
// RECONCILIATION STATUS
// ============================================================

export async function getDiscoveryStatus(): Promise<{
  index_total: number;
  movies_total: number;
  enrichment_pending: number;
  last_delta_fetch?: string;
  coverage_percent: number;
}> {
  const supabase = getSupabaseClient();

  const [indexResult, moviesResult] = await Promise.all([
    supabase.from('telugu_movie_index').select('tmdb_id', { count: 'exact' }),
    supabase.from('movies').select('tmdb_id', { count: 'exact' })
  ]);

  const indexTotal = indexResult.count || 0;
  const moviesTotal = moviesResult.count || 0;

  // Get movie tmdb_ids to calculate pending
  const { data: movieIds } = await supabase
    .from('movies')
    .select('tmdb_id')
    .limit(5000);

  const movieSet = new Set((movieIds || []).map(r => r.tmdb_id));

  const { data: indexIds } = await supabase
    .from('telugu_movie_index')
    .select('tmdb_id')
    .limit(5000);

  let pending = 0;
  (indexIds || []).forEach(r => {
    if (!movieSet.has(r.tmdb_id)) pending++;
  });

  return {
    index_total: indexTotal,
    movies_total: moviesTotal,
    enrichment_pending: pending,
    coverage_percent: indexTotal > 0 
      ? Math.round((moviesTotal / indexTotal) * 100) 
      : 0
  };
}

