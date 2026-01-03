/**
 * SECTION PAGINATION UTILITY
 * 
 * Provides pagination support for review sections to handle large datasets.
 * Enables "Load More" functionality and infinite scroll capabilities.
 */

import { createClient } from '@supabase/supabase-js';
import type { MovieCard, SectionConfig } from './section-intelligence';

// ============================================================
// TYPES
// ============================================================

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type SectionType =
  | 'recently_released'
  | 'upcoming'
  | 'trending'
  | 'top-10'
  | 'classics'
  | 'blockbusters'
  | 'hidden-gems'
  | 'cult-classics'
  | 'recommended'
  | 'genre'
  | 'actor'
  | 'director';

export interface PaginationParams {
  sectionType: SectionType;
  page: number;
  pageSize: number;
  language?: string;
  genre?: string;
  actor?: string;
  director?: string;
  tag?: string;
  timeframe?: 'all-time' | 'decade' | 'year';
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
// PAGINATION HELPERS
// ============================================================

function createPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize);
  return {
    currentPage: page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================
// SECTION-SPECIFIC PAGINATION
// ============================================================

/**
 * Paginate Recently Released movies
 */
export async function paginateRecentlyReleased(
  params: Omit<PaginationParams, 'sectionType'>
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu' } = params;
  const offset = (page - 1) * pageSize;
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Get total count
  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .or(`release_date.lte.${today},and(release_date.is.null,release_year.lte.${currentYear - 1})`)
    .gte('release_year', currentYear - 2);

  // Get paginated data
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .or(`release_date.lte.${today},and(release_date.is.null,release_year.lte.${currentYear - 1})`)
    .gte('release_year', currentYear - 2)
    .order('release_year', { ascending: false })
    .order('avg_rating', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate Blockbusters
 */
export async function paginateBlockbusters(
  params: Omit<PaginationParams, 'sectionType'>
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu' } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .eq('is_blockbuster', true);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .eq('is_blockbuster', true)
    .order('avg_rating', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate Classics
 */
export async function paginateClassics(
  params: Omit<PaginationParams, 'sectionType'>
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu' } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .eq('is_classic', true);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, is_classic')
    .eq('is_published', true)
    .eq('language', language)
    .eq('is_classic', true)
    .order('release_year', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(m => ({ ...mapToMovieCard(m), is_classic: true })),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate Hidden Gems
 */
export async function paginateHiddenGems(
  params: Omit<PaginationParams, 'sectionType'>
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu' } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .eq('is_underrated', true);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .eq('is_underrated', true)
    .order('avg_rating', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(m => ({ ...mapToMovieCard(m), is_underrated: true })),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate Cult Classics
 */
export async function paginateCultClassics(
  params: Omit<PaginationParams, 'sectionType'>
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu' } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .contains('tags', ['cult-classic']);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, tags')
    .eq('is_published', true)
    .eq('language', language)
    .contains('tags', ['cult-classic'])
    .order('release_year', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate by Genre
 */
export async function paginateByGenre(
  params: Omit<PaginationParams, 'sectionType'> & { genre: string }
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu', genre } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .contains('genres', [genre]);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .contains('genres', [genre])
    .order('avg_rating', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate by Actor (Hero/Heroine)
 */
export async function paginateByActor(
  params: Omit<PaginationParams, 'sectionType'> & { actor: string }
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu', actor } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .or(`hero.eq.${actor},heroine.eq.${actor}`);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .or(`hero.eq.${actor},heroine.eq.${actor}`)
    .order('avg_rating', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate by Director
 */
export async function paginateByDirector(
  params: Omit<PaginationParams, 'sectionType'> & { director: string }
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 18, language = 'Telugu', director } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .eq('director', director);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .eq('director', director)
    .order('avg_rating', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate Top 10
 */
export async function paginateTop10(
  params: Omit<PaginationParams, 'sectionType'>
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 10, language = 'Telugu', timeframe = 'all-time' } = params;
  const offset = (page - 1) * pageSize;
  const currentYear = new Date().getFullYear();

  let countQuery = supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .not('avg_rating', 'is', null)
    .gte('avg_rating', 7.0);

  let dataQuery = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .not('avg_rating', 'is', null)
    .gte('avg_rating', 7.0);

  // Apply timeframe filters
  if (timeframe === 'decade') {
    countQuery = countQuery.gte('release_year', currentYear - 10);
    dataQuery = dataQuery.gte('release_year', currentYear - 10);
  } else if (timeframe === 'year') {
    countQuery = countQuery.eq('release_year', currentYear);
    dataQuery = dataQuery.eq('release_year', currentYear);
  }

  const { count } = await countQuery;

  const { data: movies } = await dataQuery
    .order('avg_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Paginate Top Rated (Trending)
 */
export async function paginateTopRated(
  params: Omit<PaginationParams, 'sectionType'>
): Promise<PaginatedResponse<MovieCard>> {
  const supabase = getSupabaseClient();
  const { page = 1, pageSize = 24, language = 'Telugu' } = params;
  const offset = (page - 1) * pageSize;

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language)
    .not('avg_rating', 'is', null);

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('language', language)
    .not('avg_rating', 'is', null)
    .order('avg_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .range(offset, offset + pageSize - 1);

  return {
    data: (movies || []).map(mapToMovieCard),
    meta: createPaginationMeta(page, pageSize, count || 0),
  };
}

/**
 * Generic paginate function that routes to section-specific pagination
 */
export async function paginateSection(params: PaginationParams): Promise<PaginatedResponse<MovieCard>> {
  switch (params.sectionType) {
    case 'recently_released':
      return paginateRecentlyReleased(params);
    case 'trending':
      return paginateTopRated(params);
    case 'top-10':
      return paginateTop10(params);
    case 'blockbusters':
      return paginateBlockbusters(params);
    case 'classics':
      return paginateClassics(params);
    case 'hidden-gems':
      return paginateHiddenGems(params);
    case 'cult-classics':
      return paginateCultClassics(params);
    case 'genre':
      if (!params.genre) throw new Error('Genre is required for genre pagination');
      return paginateByGenre({ ...params, genre: params.genre });
    case 'actor':
      if (!params.actor) throw new Error('Actor is required for actor pagination');
      return paginateByActor({ ...params, actor: params.actor });
    case 'director':
      if (!params.director) throw new Error('Director is required for director pagination');
      return paginateByDirector({ ...params, director: params.director });
    default:
      throw new Error(`Unsupported section type: ${params.sectionType}`);
  }
}

// ============================================================
// HELPERS
// ============================================================

interface RawMovie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  backdrop_url?: string;
  release_year?: number;
  release_date?: string;
  genres?: string[];
  director?: string;
  hero?: string;
  heroine?: string;
  avg_rating?: number;
  total_reviews?: number;
  is_classic?: boolean;
  is_blockbuster?: boolean;
  is_underrated?: boolean;
}

function mapToMovieCard(movie: RawMovie): MovieCard {
  return {
    id: movie.id,
    title_en: movie.title_en,
    title_te: movie.title_te,
    slug: movie.slug,
    poster_url: movie.poster_url,
    backdrop_url: movie.backdrop_url,
    release_year: movie.release_year,
    release_date: movie.release_date,
    genres: movie.genres || [],
    director: movie.director,
    hero: movie.hero,
    heroine: movie.heroine,
    avg_rating: movie.avg_rating || 0,
    total_reviews: movie.total_reviews || 0,
    is_classic: movie.is_classic,
    is_blockbuster: movie.is_blockbuster,
    is_underrated: movie.is_underrated,
  };
}

