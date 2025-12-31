/**
 * Movies API
 * List and filter movies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Filters
  const genre = searchParams.get('genre');
  const actor = searchParams.get('actor');
  const director = searchParams.get('director');
  const year = searchParams.get('year');
  const yearFrom = searchParams.get('yearFrom');
  const yearTo = searchParams.get('yearTo');
  const minRating = searchParams.get('minRating');
  const underrated = searchParams.get('underrated');
  const blockbuster = searchParams.get('blockbuster');
  const classic = searchParams.get('classic');
  const search = searchParams.get('search');

  // Pagination & Sorting
  const sortBy = searchParams.get('sortBy') || 'rating';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .eq('is_published', true);

  // Apply filters
  if (genre) {
    query = query.contains('genres', [genre]);
  }

  if (actor) {
    query = query.or(`hero.ilike.%${actor}%,heroine.ilike.%${actor}%,cast_members.cs.{${actor}}`);
  }

  if (director) {
    query = query.ilike('director', `%${director}%`);
  }

  if (year) {
    query = query.eq('release_year', parseInt(year));
  }

  if (yearFrom) {
    query = query.gte('release_year', parseInt(yearFrom));
  }

  if (yearTo) {
    query = query.lte('release_year', parseInt(yearTo));
  }

  if (minRating) {
    query = query.gte('avg_rating', parseFloat(minRating));
  }

  if (underrated === 'true') {
    query = query.eq('is_underrated', true);
  }

  if (blockbuster === 'true') {
    query = query.eq('is_blockbuster', true);
  }

  if (classic === 'true') {
    query = query.eq('is_classic', true);
  }

  if (search) {
    query = query.or(`title_en.ilike.%${search}%,title_te.ilike.%${search}%,director.ilike.%${search}%`);
  }

  // Sorting
  const sortColumn = {
    rating: 'avg_rating',
    year: 'release_year',
    reviews: 'total_reviews',
    recent: 'created_at',
  }[sortBy] || 'avg_rating';

  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }

  return NextResponse.json({
    movies: data,
    total: count,
    limit,
    offset,
  });
}



