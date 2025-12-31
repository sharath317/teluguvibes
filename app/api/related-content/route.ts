/**
 * RELATED CONTENT API
 *
 * Returns related articles based on provided article IDs.
 * Used by browser-side personalization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleIds } = body;

    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Fetch the categories of viewed articles
    const { data: viewedArticles } = await supabase
      .from('posts')
      .select('category')
      .in('id', articleIds);

    if (!viewedArticles || viewedArticles.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Get unique categories
    const categories = [...new Set(viewedArticles.map(a => a.category).filter(Boolean))];

    // Fetch related articles from same categories
    const { data: relatedArticles } = await supabase
      .from('posts')
      .select('id, title, slug, image_url, category')
      .in('category', categories)
      .not('id', 'in', `(${articleIds.join(',')})`)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6);

    return NextResponse.json(
      { items: relatedArticles || [] },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    );
  } catch (error) {
    console.error('Related Content API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related content' },
      { status: 500 }
    );
  }
}



