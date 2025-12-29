/**
 * Single Movie API
 * Get movie details with reviews
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Get movie
  const { data: movie, error: movieError } = await supabase
    .from('movies')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (movieError || !movie) {
    return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
  }

  // Get reviews
  const { data: reviews } = await supabase
    .from('movie_reviews')
    .select('*')
    .eq('movie_id', movie.id)
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  // Get similar movies (same genre)
  const { data: similar } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, avg_rating, release_year')
    .eq('is_published', true)
    .neq('id', movie.id)
    .overlaps('genres', movie.genres)
    .order('avg_rating', { ascending: false })
    .limit(6);

  return NextResponse.json({
    movie,
    reviews: reviews || [],
    similar: similar || [],
  });
}
