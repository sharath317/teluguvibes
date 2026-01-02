/**
 * MOVIE CONTEXT API
 * 
 * Returns contextual sections for a movie detail page:
 * - Similar movies (genre + tone)
 * - Same actor movies
 * - Same director movies
 * - Related classics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMovieContextSections } from '@/lib/reviews/section-intelligence';
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

  try {
    // Get movie ID from slug
    const { data: movie } = await supabase
      .from('movies')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const context = await getMovieContextSections(movie.id);

    return NextResponse.json({
      success: true,
      ...context,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching movie context:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movie context' },
      { status: 500 }
    );
  }
}

