/**
 * OPTIMIZED SECTION QUERIES
 * 
 * SQL query templates and logic for all review sections.
 * Includes tag-based filtering, confidence thresholds, and composite scoring.
 */

import { createClient } from '@supabase/supabase-js';
import type { CanonicalTag } from '../tags/auto-tagger';

// ============================================================
// TYPES
// ============================================================

export interface SectionQueryConfig {
  language: string;
  limit: number;
  minRating?: number;
  minConfidence?: number;
  requiredTags?: CanonicalTag[];
  excludeTags?: CanonicalTag[];
  sortBy?: 'rating' | 'composite' | 'recency' | 'box_office' | 'rewatch';
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================
// QUERY BUILDERS
// ============================================================

/**
 * Build base query with common filters
 */
function buildBaseQuery(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('movies')
    .select(`
      id,
      title_en,
      title_te,
      slug,
      poster_url,
      backdrop_url,
      release_year,
      release_date,
      genres,
      director,
      hero,
      heroine,
      avg_rating,
      total_reviews,
      tags,
      is_classic,
      is_blockbuster,
      is_underrated,
      worldwide_gross_inr
    `)
    .eq('is_published', true)
    .eq('language', config.language);

  // Apply rating filter
  if (config.minRating) {
    query = query.gte('avg_rating', config.minRating);
  }

  // Apply tag filters
  if (config.requiredTags && config.requiredTags.length > 0) {
    config.requiredTags.forEach(tag => {
      query = query.contains('tags', [tag]);
    });
  }

  return query;
}

/**
 * Apply sorting to query
 */
function applySorting(query: any, sortBy: string = 'rating') {
  switch (sortBy) {
    case 'composite':
      // Requires composite_score from movie_reviews join
      return query.order('composite_score', { ascending: false, nullsLast: true });
    
    case 'rating':
      return query
        .order('avg_rating', { ascending: false })
        .order('total_reviews', { ascending: false });
    
    case 'recency':
      return query
        .order('release_year', { ascending: false })
        .order('release_date', { ascending: false, nullsLast: true });
    
    case 'box_office':
      return query.order('worldwide_gross_inr', { ascending: false, nullsLast: true });
    
    case 'rewatch':
      // Requires rewatch_value from dimensions_json
      return query.order('avg_rating', { ascending: false }); // Fallback
    
    default:
      return query.order('avg_rating', { ascending: false });
  }
}

// ============================================================
// SECTION-SPECIFIC QUERIES
// ============================================================

/**
 * Blockbusters Query
 * Criteria: High box office OR blockbuster tag, avg_rating >= 7.0
 */
export async function queryBlockbusters(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, worldwide_gross_inr')
    .eq('is_published', true)
    .eq('language', config.language)
    .or(`is_blockbuster.eq.true,worldwide_gross_inr.gte.1000000000`)
    .gte('avg_rating', config.minRating || 7.0)
    .order('worldwide_gross_inr', { ascending: false, nullsLast: true })
    .order('avg_rating', { ascending: false })
    .limit(config.limit);

  return movies || [];
}

/**
 * Hidden Gems Query
 * Criteria: High rating, low review count, underrated tag
 */
export async function queryHiddenGems(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', config.language)
    .gte('avg_rating', config.minRating || 7.5)
    .lt('total_reviews', 50)
    .or(`is_underrated.eq.true,worldwide_gross_inr.lt.500000000`)
    .order('avg_rating', { ascending: false })
    .limit(config.limit);

  return movies || [];
}

/**
 * Cult Classics Query
 * Criteria: Older films, high rewatch value, sustained engagement
 */
export async function queryCultClassics(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  const currentYear = new Date().getFullYear();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, tags')
    .eq('is_published', true)
    .eq('language', config.language)
    .lte('release_year', currentYear - 10) // At least 10 years old
    .gte('avg_rating', config.minRating || 7.0)
    .contains('tags', ['cult-classic'])
    .order('release_year', { ascending: false })
    .limit(config.limit);

  return movies || [];
}

/**
 * Classics Query
 * Criteria: 20+ years old OR classic tag, high rating
 */
export async function queryClassics(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  const currentYear = new Date().getFullYear();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, is_classic')
    .eq('is_published', true)
    .eq('language', config.language)
    .or(`is_classic.eq.true,release_year.lte.${currentYear - 20}`)
    .gte('avg_rating', config.minRating || 7.0)
    .order('release_year', { ascending: false })
    .limit(config.limit);

  return movies || [];
}

/**
 * Top 10 Query
 * Criteria: Exceptional across all dimensions
 */
export async function queryTop10(config: SectionQueryConfig & { timeframe?: 'all-time' | 'decade' | 'year' }) {
  const supabase = getSupabaseClient();
  const currentYear = new Date().getFullYear();
  
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', config.language)
    .gte('avg_rating', config.minRating || 8.0);

  // Apply timeframe filter
  if (config.timeframe === 'decade') {
    query = query.gte('release_year', currentYear - 10);
  } else if (config.timeframe === 'year') {
    query = query.eq('release_year', currentYear);
  }

  const { data: movies } = await query
    .order('avg_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .limit(10);

  return movies || [];
}

/**
 * Family Entertainers Query
 * Criteria: Family-friendly tags, U/U/A certification
 */
export async function queryFamilyEntertainers(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, tags, certification')
    .eq('is_published', true)
    .eq('language', config.language)
    .contains('tags', ['family-entertainer'])
    .gte('avg_rating', config.minRating || 6.5)
    .order('avg_rating', { ascending: false })
    .limit(config.limit);

  return movies || [];
}

/**
 * Emotional Movies Query
 * Criteria: Emotional/tearjerker tags
 */
export async function queryEmotionalMovies(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, tags')
    .eq('is_published', true)
    .eq('language', config.language)
    .or(`tags.cs.{emotional},tags.cs.{tearjerker}`)
    .gte('avg_rating', config.minRating || 7.0)
    .order('avg_rating', { ascending: false })
    .limit(config.limit);

  return movies || [];
}

/**
 * Thrilling Movies Query
 * Criteria: Thrilling/intense tags
 */
export async function queryThrillingMovies(config: SectionQueryConfig) {
  const supabase = getSupabaseClient();
  
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, tags')
    .eq('is_published', true)
    .eq('language', config.language)
    .or(`tags.cs.{thrilling},tags.cs.{intense}`)
    .gte('avg_rating', config.minRating || 7.0)
    .order('avg_rating', { ascending: false })
    .limit(config.limit);

  return movies || [];
}

// ============================================================
// GENERIC TAG-BASED QUERY
// ============================================================

/**
 * Query movies by tags (flexible)
 */
export async function queryByTags(
  tags: CanonicalTag[],
  config: SectionQueryConfig
) {
  let query = buildBaseQuery(config);

  // Apply tag filters
  tags.forEach(tag => {
    query = query.contains('tags', [tag]);
  });

  // Apply sorting
  query = applySorting(query, config.sortBy);

  const { data: movies } = await query.limit(config.limit);

  return movies || [];
}

// ============================================================
// SECTION STRENGTHENING ANALYSIS
// ============================================================

export interface SectionStrength {
  sectionName: string;
  currentCount: number;
  potentialCount: number;
  avgRating: number;
  weaknessReasons: string[];
  strengtheningSuggestions: string[];
}

/**
 * Analyze why a section is weak and suggest fixes
 */
export async function analyzeSectionStrength(
  sectionName: string,
  language: string = 'Telugu'
): Promise<SectionStrength> {
  const supabase = getSupabaseClient();
  
  let currentCount = 0;
  let potentialCount = 0;
  let avgRating = 0;
  const weaknessReasons: string[] = [];
  const strengtheningSuggestions: string[] = [];

  switch (sectionName) {
    case 'blockbusters': {
      // Current: strict criteria
      const { data: current } = await supabase
        .from('movies')
        .select('avg_rating', { count: 'exact' })
        .eq('is_published', true)
        .eq('language', language)
        .eq('is_blockbuster', true)
        .gte('avg_rating', 7.0);

      currentCount = current?.length || 0;
      avgRating = current ? current.reduce((sum, m) => sum + (m.avg_rating || 0), 0) / current.length : 0;

      // Potential: relaxed criteria
      const { count: potential } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('language', language)
        .or(`is_blockbuster.eq.true,worldwide_gross_inr.gte.500000000`)
        .gte('avg_rating', 6.5);

      potentialCount = potential || 0;

      if (currentCount < 20) {
        weaknessReasons.push('Too few movies marked as blockbusters');
        strengtheningSuggestions.push('Lower box office threshold to 50 crores');
        strengtheningSuggestions.push('Include movies with verdict="superhit"');
      }
      break;
    }

    case 'hidden-gems': {
      const { data: current } = await supabase
        .from('movies')
        .select('avg_rating', { count: 'exact' })
        .eq('is_published', true)
        .eq('language', language)
        .eq('is_underrated', true);

      currentCount = current?.length || 0;
      avgRating = current ? current.reduce((sum, m) => sum + (m.avg_rating || 0), 0) / current.length : 0;

      const { count: potential } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('language', language)
        .gte('avg_rating', 7.5)
        .lt('total_reviews', 100);

      potentialCount = potential || 0;

      if (currentCount < 15) {
        weaknessReasons.push('Not enough movies tagged as underrated');
        strengtheningSuggestions.push('Auto-tag movies with rating >= 7.5 and reviews < 50');
        strengtheningSuggestions.push('Include low-budget high-quality films');
      }
      break;
    }

    case 'classics': {
      const currentYear = new Date().getFullYear();
      const { data: current } = await supabase
        .from('movies')
        .select('avg_rating', { count: 'exact' })
        .eq('is_published', true)
        .eq('language', language)
        .eq('is_classic', true);

      currentCount = current?.length || 0;
      avgRating = current ? current.reduce((sum, m) => sum + (m.avg_rating || 0), 0) / current.length : 0;

      const { count: potential } = await supabase
        .from('movies')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('language', language)
        .lte('release_year', currentYear - 15)
        .gte('avg_rating', 7.0);

      potentialCount = potential || 0;

      if (currentCount < 30) {
        weaknessReasons.push('Classic threshold too strict (pre-2000)');
        strengtheningSuggestions.push('Relax to pre-2010 for modern classics');
        strengtheningSuggestions.push('Auto-tag based on rewatch value >= 8');
      }
      break;
    }
  }

  return {
    sectionName,
    currentCount,
    potentialCount,
    avgRating,
    weaknessReasons,
    strengtheningSuggestions,
  };
}

