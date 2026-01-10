/**
 * Movies API
 * 
 * Provides filtered and paginated movie listings for the reviews page grid view.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Pagination
  const limit = parseInt(searchParams.get('limit') || '24');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  // Filters
  const language = searchParams.get('language') || 'Telugu';
  const genre = searchParams.get('genre');
  const actor = searchParams.get('actor');
  const director = searchParams.get('director');
  const yearFrom = searchParams.get('yearFrom');
  const yearTo = searchParams.get('yearTo');
  const minRating = searchParams.get('minRating');
  const underrated = searchParams.get('underrated') === 'true';
  const blockbuster = searchParams.get('blockbuster') === 'true';
  const classic = searchParams.get('classic') === 'true';
  
  // Sorting
  const sortBy = searchParams.get('sortBy') || 'rating';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  try {
    let query = supabase
      .from('movies')
      .select('*')
      .eq('language', language);

    // Apply filters
    if (genre) {
      query = query.contains('genres', [genre]);
    }
    
    if (actor) {
      // Use exact match for actor names to avoid "N.T. Rama Rao" matching "N.T. Rama Rao Jr."
      query = query.or(`hero.eq.${actor},heroine.eq.${actor}`);
    }
    
    if (director) {
      query = query.ilike('director', `%${director}%`);
    }
    
    if (yearFrom) {
      query = query.gte('release_year', parseInt(yearFrom));
    }
    
    if (yearTo) {
      query = query.lte('release_year', parseInt(yearTo));
    }
    
    if (minRating) {
      query = query.gte('our_rating', parseFloat(minRating));
    }
    
    if (underrated) {
      query = query.eq('is_underrated', true);
    }
    
    if (blockbuster) {
      query = query.eq('is_blockbuster', true);
    }
    
    if (classic) {
      query = query.eq('is_classic', true);
    }

    // Apply sorting
    const sortColumn = sortBy === 'rating' ? 'our_rating' : 
                       sortBy === 'year' ? 'release_year' :
                       sortBy === 'reviews' ? 'total_reviews' :
                       sortBy === 'title' ? 'title_en' : 'our_rating';
    
    query = query.order(sortColumn, { ascending: sortOrder === 'asc', nullsFirst: false });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: movies, error } = await query;

    if (error) {
      console.error('Error fetching movies:', error);
      return NextResponse.json({ movies: [], error: error.message }, { status: 500 });
    }

    // Map to MovieCard format
    const mappedMovies = (movies || []).map(m => ({
      id: m.id,
      title_en: m.title_en || m.title,
      title_te: m.title_te,
      slug: m.slug,
      poster_url: m.poster_url,
      release_year: m.release_year,
      release_date: m.release_date,
      genres: m.genres || [],
      director: m.director,
      hero: m.hero,
      avg_rating: m.avg_rating || m.our_rating || 0,
      our_rating: m.our_rating,
      total_reviews: m.total_reviews || 0,
      is_classic: m.is_classic,
      is_blockbuster: m.is_blockbuster,
      is_underrated: m.is_underrated,
    }));

    return NextResponse.json({
      movies: mappedMovies,
      total: movies?.length || 0,
    });
  } catch (error) {
    console.error('Movies API error:', error);
    return NextResponse.json({ movies: [], error: String(error) }, { status: 500 });
  }
}

