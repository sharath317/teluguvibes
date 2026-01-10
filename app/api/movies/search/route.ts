/**
 * Movies Search API
 * 
 * Provides quick search functionality for the search bar autocomplete.
 * Searches movies by title (English and Telugu).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '5');

  if (query.length < 2) {
    return NextResponse.json({ movies: [] });
  }

  try {
    // Search by title (English or Telugu) - only published movies
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title_en, title_te, slug, release_year, poster_url, our_rating, director, hero')
      .eq('is_published', true)
      .or(`title_en.ilike.%${query}%,title_te.ilike.%${query}%`)
      .order('our_rating', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ movies: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ movies: movies || [] });
  } catch (error) {
    console.error('Movies search API error:', error);
    return NextResponse.json({ movies: [], error: String(error) }, { status: 500 });
  }
}

