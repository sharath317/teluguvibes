/**
 * TREND HEAT INDEX
 *
 * Simple arithmetic scoring (0-100) - NO ML required.
 * Updates every 6-12 hours to minimize API calls.
 *
 * WHY THIS APPROACH:
 * - Pure arithmetic formula (transparent, debuggable)
 * - Infrequent updates (6-12 hour intervals)
 * - Uses existing data sources
 * - Easy to extend with new signals
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HeatScore {
  entity_type: 'celebrity' | 'movie' | 'topic';
  entity_id?: string;
  entity_name: string;
  search_score: number;
  youtube_score: number;
  tmdb_score: number;
  site_score: number;
  social_score: number;
  heat_index: number;
  heat_label: 'cold' | 'warm' | 'hot' | 'viral';
}

// Weights for each signal (must sum to 1)
const SIGNAL_WEIGHTS = {
  search: 0.25,   // Google Trends importance
  youtube: 0.25,  // YouTube velocity importance
  tmdb: 0.20,     // TMDB popularity importance
  site: 0.20,     // Internal site clicks
  social: 0.10,   // Social mentions (future)
};

/**
 * Calculate heat index from individual scores
 * Formula: Weighted average of all signals
 */
function calculateHeatIndex(scores: {
  search: number;
  youtube: number;
  tmdb: number;
  site: number;
  social: number;
}): number {
  const weightedSum =
    scores.search * SIGNAL_WEIGHTS.search +
    scores.youtube * SIGNAL_WEIGHTS.youtube +
    scores.tmdb * SIGNAL_WEIGHTS.tmdb +
    scores.site * SIGNAL_WEIGHTS.site +
    scores.social * SIGNAL_WEIGHTS.social;

  // Apply slight boost for entities with multiple strong signals
  const strongSignals = Object.values(scores).filter(s => s >= 60).length;
  const multiSignalBoost = strongSignals >= 3 ? 1.1 : strongSignals >= 2 ? 1.05 : 1;

  return Math.min(100, Math.round(weightedSum * multiSignalBoost));
}

/**
 * Get heat label from score
 */
function getHeatLabel(score: number): 'cold' | 'warm' | 'hot' | 'viral' {
  if (score >= 80) return 'viral';
  if (score >= 60) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

/**
 * Normalize a value to 0-100 scale
 */
function normalizeToScore(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return Math.round(((value - min) / (max - min)) * 100);
}

/**
 * Fetch TMDB popularity score for an entity
 */
async function fetchTMDBScore(entityType: string, entityName: string): Promise<number> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return 0;

  try {
    const endpoint = entityType === 'movie'
      ? `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(entityName)}`
      : `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(entityName)}`;

    const response = await fetch(endpoint);
    if (!response.ok) return 0;

    const data = await response.json();
    const item = data.results?.[0];
    if (!item) return 0;

    // TMDB popularity ranges from 0 to ~1000+
    // Normalize to 0-100 (50 is average popularity)
    return normalizeToScore(item.popularity, 0, 100);
  } catch {
    return 0;
  }
}

/**
 * Calculate internal site popularity score
 */
async function fetchSiteScore(entityId: string | undefined, entityName: string): Promise<number> {
  if (!entityId) return 0;

  // Count views in last 7 days from content_performance
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data } = await supabase
    .from('content_performance')
    .select('view_count')
    .or(`post_id.eq.${entityId},movie_id.eq.${entityId},celebrity_id.eq.${entityId}`)
    .gte('created_at', weekAgo.toISOString());

  if (!data || data.length === 0) return 0;

  const totalViews = data.reduce((sum, r) => sum + (r.view_count || 0), 0);

  // Normalize: 0 views = 0, 1000+ views = 100
  return normalizeToScore(totalViews, 0, 1000);
}

/**
 * Update heat scores for all entities
 * Should be called every 6-12 hours via cron
 */
export async function updateAllHeatScores(): Promise<{ updated: number; errors: number }> {
  console.log('🔥 Updating Trend Heat Index...');

  let updated = 0;
  let errors = 0;

  // 1. Update celebrity heat scores
  const { data: celebrities } = await supabase
    .from('celebrities')
    .select('id, name_en')
    .limit(100); // Process in batches

  for (const celeb of (celebrities || [])) {
    try {
      await updateEntityHeatScore('celebrity', celeb.id, celeb.name_en);
      updated++;
    } catch (e) {
      errors++;
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  // 2. Update movie heat scores (recent movies only)
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en')
    .gte('release_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50);

  for (const movie of (movies || [])) {
    try {
      await updateEntityHeatScore('movie', movie.id, movie.title_en);
      updated++;
    } catch (e) {
      errors++;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`✅ Heat scores updated: ${updated} entities, ${errors} errors`);
  return { updated, errors };
}

/**
 * Update heat score for a single entity
 */
export async function updateEntityHeatScore(
  entityType: 'celebrity' | 'movie' | 'topic',
  entityId: string | undefined,
  entityName: string
): Promise<HeatScore> {
  // Fetch current scores from various sources
  const tmdbScore = await fetchTMDBScore(entityType, entityName);
  const siteScore = await fetchSiteScore(entityId, entityName);

  // For now, set search/youtube/social to base values
  // These can be implemented when APIs are available
  const searchScore = Math.round(tmdbScore * 0.8); // Estimate from TMDB
  const youtubeScore = Math.round(tmdbScore * 0.7); // Estimate from TMDB
  const socialScore = 0; // Future implementation

  const heatIndex = calculateHeatIndex({
    search: searchScore,
    youtube: youtubeScore,
    tmdb: tmdbScore,
    site: siteScore,
    social: socialScore,
  });

  // Get previous score for delta calculation
  const { data: existing } = await supabase
    .from('trend_heat_scores')
    .select('heat_index')
    .eq('entity_type', entityType)
    .eq('entity_name', entityName)
    .single();

  const previousHeat = existing?.heat_index || 0;

  // Upsert the score
  await supabase
    .from('trend_heat_scores')
    .upsert({
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      search_score: searchScore,
      youtube_score: youtubeScore,
      tmdb_score: tmdbScore,
      site_score: siteScore,
      social_score: socialScore,
      heat_index: heatIndex,
      previous_heat: previousHeat,
      last_updated: new Date().toISOString(),
      update_count: (existing ? 1 : 0) + 1,
    }, {
      onConflict: 'entity_type,entity_name',
    });

  return {
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    search_score: searchScore,
    youtube_score: youtubeScore,
    tmdb_score: tmdbScore,
    site_score: siteScore,
    social_score: socialScore,
    heat_index: heatIndex,
    heat_label: getHeatLabel(heatIndex),
  };
}

/**
 * Get trending entities (heat_index >= threshold)
 */
export async function getTrendingEntities(
  entityType?: 'celebrity' | 'movie' | 'topic',
  minHeat: number = 40,
  limit: number = 20
) {
  let query = supabase
    .from('trend_heat_scores')
    .select('*')
    .gte('heat_index', minHeat)
    .order('heat_index', { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Get heat score for a specific entity
 */
export async function getEntityHeatScore(entityType: string, entityName: string) {
  const { data } = await supabase
    .from('trend_heat_scores')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_name', entityName)
    .single();

  return data;
}

/**
 * Get entities with biggest heat changes (rising/falling)
 */
export async function getHeatMovers(direction: 'up' | 'down', limit: number = 10) {
  const { data } = await supabase
    .from('trend_heat_scores')
    .select('*')
    .eq('trending_direction', direction)
    .order('heat_delta', { ascending: direction === 'down' })
    .limit(limit);

  return data || [];
}



