/**
 * Movie Audit Engine
 * 
 * Audits existing movies in the database for validity and data quality.
 * Can fix issues automatically or purge invalid entities.
 */

import { createClient } from '@supabase/supabase-js';
import {
  EntityStatus,
  MovieValidationResult,
  validateMovieCandidate,
  ValidationOptions,
  canonicalizeTitle,
  generateSlug,
  verifyTMDBEntityType,
  searchTMDBMovie,
} from './movie-identity-gate';

// ============================================================
// TYPES
// ============================================================

export interface AuditResult {
  movieId: string;
  title: string;
  status: EntityStatus;
  issues: string[];
  fixes: FixAction[];
  validationResult: MovieValidationResult;
}

export interface FixAction {
  type: 'UPDATE' | 'DELETE' | 'ENRICH' | 'MARK_INVALID';
  field?: string;
  oldValue?: any;
  newValue?: any;
  applied: boolean;
  error?: string;
}

export interface AuditSummary {
  totalAudited: number;
  valid: number;
  invalid: number;
  fixed: number;
  purged: number;
  byStatus: Record<EntityStatus, number>;
  topIssues: { code: string; count: number }[];
}

export interface Movie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  tmdb_id?: number;
  release_year?: number;
  release_date?: string;
  director?: string;
  cast_members?: any[];
  poster_url?: string;
  backdrop_url?: string;
  is_published: boolean;
  validation_status?: EntityStatus;
  canonical_title?: string;
  data_quality_score?: number;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

// ============================================================
// AUDIT FUNCTIONS
// ============================================================

/**
 * Audit a single movie
 */
export async function auditMovie(
  movie: Movie,
  options: ValidationOptions = {}
): Promise<AuditResult> {
  const issues: string[] = [];
  const fixes: FixAction[] = [];

  // Run validation
  const validationResult = await validateMovieCandidate({
    title_en: movie.title_en,
    title_te: movie.title_te,
    release_year: movie.release_year,
    tmdb_id: movie.tmdb_id,
    director: movie.director,
    poster_url: movie.poster_url,
    backdrop_url: movie.backdrop_url,
  }, options);

  // Collect issues
  for (const error of validationResult.errors) {
    issues.push(`ERROR: ${error.message}`);
  }
  for (const warning of validationResult.warnings) {
    issues.push(`WARNING: ${warning.message}`);
  }

  // Check for fixable issues
  if (validationResult.tmdbData) {
    const tmdb = validationResult.tmdbData;

    // Fix missing poster
    if (!movie.poster_url && tmdb.poster_path) {
      fixes.push({
        type: 'UPDATE',
        field: 'poster_url',
        oldValue: null,
        newValue: `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`,
        applied: false,
      });
    }

    // Fix missing backdrop
    if (!movie.backdrop_url && tmdb.backdrop_path) {
      fixes.push({
        type: 'UPDATE',
        field: 'backdrop_url',
        oldValue: null,
        newValue: `https://image.tmdb.org/t/p/w1280${tmdb.backdrop_path}`,
        applied: false,
      });
    }

    // Fix missing director
    if (!movie.director && tmdb.credits?.crew) {
      const director = tmdb.credits.crew.find(c => c.job === 'Director');
      if (director) {
        fixes.push({
          type: 'UPDATE',
          field: 'director',
          oldValue: null,
          newValue: director.name,
          applied: false,
        });
      }
    }

    // Fix missing TMDB ID
    if (!movie.tmdb_id) {
      fixes.push({
        type: 'UPDATE',
        field: 'tmdb_id',
        oldValue: null,
        newValue: tmdb.id,
        applied: false,
      });
    }

    // Fix missing cast
    if ((!movie.cast_members || movie.cast_members.length === 0) && tmdb.credits?.cast) {
      fixes.push({
        type: 'UPDATE',
        field: 'cast_members',
        oldValue: null,
        newValue: tmdb.credits.cast.slice(0, 10).map(c => ({
          name: c.name,
          character: c.character,
        })),
        applied: false,
      });
    }

    // Add canonical title if missing
    if (!movie.canonical_title) {
      fixes.push({
        type: 'UPDATE',
        field: 'canonical_title',
        oldValue: null,
        newValue: canonicalizeTitle(tmdb.title),
        applied: false,
      });
    }
  }

  // Mark as invalid if validation failed
  if (!validationResult.isValid) {
    fixes.push({
      type: 'MARK_INVALID',
      field: 'validation_status',
      oldValue: movie.validation_status,
      newValue: validationResult.status,
      applied: false,
    });
  }

  return {
    movieId: movie.id,
    title: movie.title_en,
    status: validationResult.status,
    issues,
    fixes,
    validationResult,
  };
}

/**
 * Apply fixes to a movie
 */
export async function applyFixes(
  movieId: string,
  fixes: FixAction[]
): Promise<{ applied: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  const errors: string[] = [];
  let applied = 0;

  const updates: Record<string, any> = {};

  for (const fix of fixes) {
    if (fix.type === 'UPDATE' && fix.field) {
      updates[fix.field] = fix.newValue;
      fix.applied = true;
      applied++;
    } else if (fix.type === 'MARK_INVALID') {
      updates.validation_status = fix.newValue;
      updates.is_published = false; // Unpublish invalid movies
      fix.applied = true;
      applied++;
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('movies')
      .update(updates)
      .eq('id', movieId);

    if (error) {
      errors.push(`Failed to update movie ${movieId}: ${error.message}`);
      // Mark fixes as not applied
      fixes.forEach(f => f.applied = false);
      applied = 0;
    }
  }

  return { applied, errors };
}

/**
 * Purge invalid movies from database
 */
export async function purgeInvalidMovies(
  statuses: EntityStatus[] = [
    'INVALID_NOT_MOVIE',
    'INVALID_NOT_TELUGU',
    'INVALID_DUPLICATE',
  ]
): Promise<{ purged: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  const errors: string[] = [];
  let purged = 0;

  for (const status of statuses) {
    const { data: movies, error: fetchError } = await supabase
      .from('movies')
      .select('id, title_en')
      .eq('validation_status', status);

    if (fetchError) {
      errors.push(`Failed to fetch ${status} movies: ${fetchError.message}`);
      continue;
    }

    if (!movies || movies.length === 0) continue;

    const { error: deleteError, count } = await supabase
      .from('movies')
      .delete()
      .eq('validation_status', status);

    if (deleteError) {
      errors.push(`Failed to delete ${status} movies: ${deleteError.message}`);
    } else {
      purged += count || movies.length;
    }
  }

  return { purged, errors };
}

/**
 * Detect duplicate movies
 */
export async function detectDuplicates(): Promise<{
  duplicates: { canonical_title: string; year: number; movies: Movie[] }[];
  count: number;
}> {
  const supabase = getSupabaseClient();
  
  // Get all movies with canonical titles
  const { data: movies, error } = await supabase
    .from('movies')
    .select('id, title_en, canonical_title, release_year, tmdb_id, is_published')
    .eq('is_published', true);

  if (error || !movies) {
    return { duplicates: [], count: 0 };
  }

  // Group by canonical_title + year
  const groups = new Map<string, Movie[]>();
  
  for (const movie of movies) {
    const canonical = movie.canonical_title || canonicalizeTitle(movie.title_en);
    const key = `${canonical}|${movie.release_year || 'unknown'}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(movie as Movie);
  }

  // Filter to only duplicates
  const duplicates: { canonical_title: string; year: number; movies: Movie[] }[] = [];
  
  for (const [key, movieList] of groups) {
    if (movieList.length > 1) {
      const [canonical, yearStr] = key.split('|');
      duplicates.push({
        canonical_title: canonical,
        year: yearStr === 'unknown' ? 0 : parseInt(yearStr),
        movies: movieList,
      });
    }
  }

  return { duplicates, count: duplicates.length };
}

/**
 * Run full audit on all movies
 */
export async function runFullAudit(options: {
  fix?: boolean;
  purgeInvalid?: boolean;
  strict?: boolean;
  limit?: number;
  offset?: number;
}): Promise<AuditSummary> {
  const supabase = getSupabaseClient();
  const byStatus: Record<EntityStatus, number> = {} as any;
  const issueCount = new Map<string, number>();
  let totalAudited = 0;
  let valid = 0;
  let invalid = 0;
  let fixed = 0;
  let purged = 0;

  // Get movies to audit
  let query = supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data: movies, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch movies: ${error.message}`);
  }

  if (!movies) {
    return {
      totalAudited: 0,
      valid: 0,
      invalid: 0,
      fixed: 0,
      purged: 0,
      byStatus,
      topIssues: [],
    };
  }

  // Audit each movie
  for (const movie of movies) {
    totalAudited++;

    const result = await auditMovie(movie as Movie, { strict: options.strict });
    
    // Track status
    byStatus[result.status] = (byStatus[result.status] || 0) + 1;

    // Track issues
    for (const issue of result.issues) {
      const code = issue.split(':')[0].trim();
      issueCount.set(code, (issueCount.get(code) || 0) + 1);
    }

    if (result.validationResult.isValid) {
      valid++;
    } else {
      invalid++;
    }

    // Apply fixes if requested
    if (options.fix && result.fixes.length > 0) {
      const { applied, errors } = await applyFixes(movie.id, result.fixes);
      fixed += applied;
      if (errors.length > 0) {
        console.error(`Fix errors for ${movie.title_en}:`, errors);
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Purge invalid if requested
  if (options.purgeInvalid) {
    const { purged: purgedCount, errors } = await purgeInvalidMovies();
    purged = purgedCount;
    if (errors.length > 0) {
      console.error('Purge errors:', errors);
    }
  }

  // Top issues
  const topIssues = Array.from(issueCount.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalAudited,
    valid,
    invalid,
    fixed,
    purged,
    byStatus,
    topIssues,
  };
}

/**
 * Get audit statistics without modifying data
 */
export async function getAuditStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byYear: { year: number; count: number }[];
  withTmdb: number;
  withoutTmdb: number;
  withPoster: number;
  withoutPoster: number;
  duplicateCount: number;
}> {
  const supabase = getSupabaseClient();

  // Total count
  const { count: total } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true });

  // By validation status
  const { data: statusData } = await supabase
    .from('movies')
    .select('validation_status');

  const byStatus: Record<string, number> = {};
  for (const row of statusData || []) {
    const status = row.validation_status || 'PENDING_VALIDATION';
    byStatus[status] = (byStatus[status] || 0) + 1;
  }

  // With/without TMDB
  const { count: withTmdb } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('tmdb_id', 'is', null);

  const { count: withPoster } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .not('poster_url', 'is', null);

  // By year
  const { data: yearData } = await supabase
    .from('movies')
    .select('release_year');

  const yearCounts = new Map<number, number>();
  for (const row of yearData || []) {
    if (row.release_year) {
      yearCounts.set(row.release_year, (yearCounts.get(row.release_year) || 0) + 1);
    }
  }

  const byYear = Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year)
    .slice(0, 20);

  // Duplicates
  const { count: duplicateCount } = await detectDuplicates();

  return {
    total: total || 0,
    byStatus,
    byYear,
    withTmdb: withTmdb || 0,
    withoutTmdb: (total || 0) - (withTmdb || 0),
    withPoster: withPoster || 0,
    withoutPoster: (total || 0) - (withPoster || 0),
    duplicateCount,
  };
}






