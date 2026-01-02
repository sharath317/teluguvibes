/**
 * DERIVED SECTIONS API
 * 
 * Returns data-driven sections based on tags.
 * NO hardcoded lists. ALL derived from movie data.
 * 
 * Sections:
 * - blockbusters: High-rated movies
 * - classics: Old + high rating
 * - hidden-gems: High rating + low visibility
 * - top-10: By language/year/decade
 * - by-actor: Popular movies per actor
 * - by-director: Notable films per director
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SectionParams {
  type: string;
  language?: string;
  year?: string;
  decade?: string;
  actor?: string;
  director?: string;
  limit?: number;
}

async function getBlockbusters(params: SectionParams) {
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .eq('is_blockbuster', true)
    .order('avg_rating', { ascending: false })
    .limit(params.limit || 20);
  
  if (params.language) {
    query = query.eq('language', params.language);
  }
  
  const { data, error } = await query;
  
  return {
    title: params.language ? `${params.language} Blockbusters` : 'Blockbusters',
    subtitle: 'Top-rated movies that defined their era',
    movies: data || [],
    error: error?.message,
  };
}

async function getClassics(params: SectionParams) {
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .eq('is_classic', true)
    .order('release_year', { ascending: true })
    .limit(params.limit || 20);
  
  if (params.language) {
    query = query.eq('language', params.language);
  }
  
  const { data, error } = await query;
  
  return {
    title: params.language ? `${params.language} Classics` : 'Timeless Classics',
    subtitle: 'Golden era masterpieces',
    movies: data || [],
    error: error?.message,
  };
}

async function getHiddenGems(params: SectionParams) {
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .eq('is_underrated', true)
    .gte('avg_rating', 7.0)
    .order('avg_rating', { ascending: false })
    .limit(params.limit || 20);
  
  if (params.language) {
    query = query.eq('language', params.language);
  }
  
  const { data, error } = await query;
  
  return {
    title: params.language ? `${params.language} Hidden Gems` : 'Hidden Gems',
    subtitle: 'Underrated movies worth discovering',
    movies: data || [],
    error: error?.message,
  };
}

async function getTop10(params: SectionParams) {
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .order('avg_rating', { ascending: false })
    .limit(10);
  
  let title = 'Top 10 Movies';
  
  if (params.language) {
    query = query.eq('language', params.language);
    title = `Top 10 ${params.language} Movies`;
  }
  
  if (params.year) {
    query = query.eq('release_year', parseInt(params.year));
    title += ` of ${params.year}`;
  } else if (params.decade) {
    const startYear = parseInt(params.decade);
    query = query.gte('release_year', startYear).lt('release_year', startYear + 10);
    title += ` of ${params.decade}s`;
  }
  
  const { data, error } = await query;
  
  return {
    title,
    subtitle: 'Highest rated based on audience scores',
    movies: data || [],
    error: error?.message,
  };
}

async function getByActor(params: SectionParams) {
  if (!params.actor) {
    return { title: 'Movies by Actor', subtitle: '', movies: [], error: 'Actor parameter required' };
  }
  
  const { data, error } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .or(`hero.ilike.%${params.actor}%,heroine.ilike.%${params.actor}%`)
    .order('release_year', { ascending: false })
    .limit(params.limit || 20);
  
  return {
    title: `${params.actor} Movies`,
    subtitle: `Best films featuring ${params.actor}`,
    movies: data || [],
    error: error?.message,
  };
}

async function getByDirector(params: SectionParams) {
  if (!params.director) {
    return { title: 'Movies by Director', subtitle: '', movies: [], error: 'Director parameter required' };
  }
  
  const { data, error } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .ilike('director', `%${params.director}%`)
    .order('avg_rating', { ascending: false })
    .limit(params.limit || 20);
  
  return {
    title: `${params.director} Films`,
    subtitle: `Filmography of ${params.director}`,
    movies: data || [],
    error: error?.message,
  };
}

async function getByDecade(params: SectionParams) {
  if (!params.decade) {
    return { title: 'Movies by Decade', subtitle: '', movies: [], error: 'Decade parameter required' };
  }
  
  const startYear = parseInt(params.decade);
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .gte('release_year', startYear)
    .lt('release_year', startYear + 10)
    .order('avg_rating', { ascending: false })
    .limit(params.limit || 30);
  
  if (params.language) {
    query = query.eq('language', params.language);
  }
  
  const { data, error } = await query;
  
  return {
    title: params.language ? `${params.language} ${params.decade}s` : `Best of ${params.decade}s`,
    subtitle: `Top films from ${startYear} to ${startYear + 9}`,
    movies: data || [],
    error: error?.message,
  };
}

async function getRecent(params: SectionParams) {
  let query = supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year, genres, director, hero')
    .eq('is_published', true)
    .gte('release_year', new Date().getFullYear() - 2)
    .order('release_year', { ascending: false })
    .order('avg_rating', { ascending: false })
    .limit(params.limit || 20);
  
  if (params.language) {
    query = query.eq('language', params.language);
  }
  
  const { data, error } = await query;
  
  return {
    title: params.language ? `Recent ${params.language} Releases` : 'Recent Releases',
    subtitle: 'Latest movies in theaters and streaming',
    movies: data || [],
    error: error?.message,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const params: SectionParams = {
    type: searchParams.get('type') || 'blockbusters',
    language: searchParams.get('language') || undefined,
    year: searchParams.get('year') || undefined,
    decade: searchParams.get('decade') || undefined,
    actor: searchParams.get('actor') || undefined,
    director: searchParams.get('director') || undefined,
    limit: parseInt(searchParams.get('limit') || '20'),
  };
  
  let result;
  
  switch (params.type) {
    case 'blockbusters':
      result = await getBlockbusters(params);
      break;
    case 'classics':
      result = await getClassics(params);
      break;
    case 'hidden-gems':
      result = await getHiddenGems(params);
      break;
    case 'top-10':
      result = await getTop10(params);
      break;
    case 'by-actor':
      result = await getByActor(params);
      break;
    case 'by-director':
      result = await getByDirector(params);
      break;
    case 'by-decade':
      result = await getByDecade(params);
      break;
    case 'recent':
      result = await getRecent(params);
      break;
    default:
      result = await getBlockbusters(params);
  }
  
  return NextResponse.json(result);
}

