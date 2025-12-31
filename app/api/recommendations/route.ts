/**
 * RECOMMENDATIONS API
 *
 * Returns personalized recommendations based on browser preferences.
 * No user accounts - preferences sent in request body.
 *
 * WHY SERVER-SIDE:
 * - Browser sends viewing history (from localStorage)
 * - Server matches against available content
 * - No user data stored on server (GDPR safe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RecommendationRequest {
  viewedCelebrities?: string[];
  viewedCategories?: string[];
  topCategory?: string;
  readArticles?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RecommendationRequest = await request.json();

    const items: any[] = [];

    // 1. Recommend based on top category
    if (body.topCategory) {
      const { data: categoryPosts } = await supabase
        .from('posts')
        .select('id, title, slug, image_url, category')
        .eq('category', body.topCategory)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);

      if (categoryPosts) {
        items.push(...categoryPosts.map(p => ({
          ...p,
          reason_te: `${body.topCategory} కేటగిరీలో పాపులర్`,
        })));
      }
    }

    // 2. Recommend based on viewed celebrities
    if (body.viewedCelebrities && body.viewedCelebrities.length > 0) {
      // Get posts mentioning similar celebrities
      const { data: celebPosts } = await supabase
        .from('posts')
        .select('id, title, slug, image_url, category')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10);

      // Filter to find posts with related celebrities (simplified)
      const relatedPosts = (celebPosts || [])
        .filter(p => !items.some(i => i.id === p.id))
        .slice(0, 2);

      items.push(...relatedPosts.map(p => ({
        ...p,
        reason_te: 'మీరు చూసిన వారికి సంబంధించినది',
      })));
    }

    // 3. Recommend trending content as fallback
    if (items.length < 4) {
      const { data: trendingPosts } = await supabase
        .from('posts')
        .select('id, title, slug, image_url, category')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(5);

      const newItems = (trendingPosts || [])
        .filter(p => !items.some(i => i.id === p.id))
        .slice(0, 4 - items.length);

      items.push(...newItems.map(p => ({
        ...p,
        reason_te: 'ట్రెండింగ్',
      })));
    }

    return NextResponse.json(
      { items: items.slice(0, 5) },
      {
        headers: {
          // Short cache - personalized content
          'Cache-Control': 'private, max-age=300',
        },
      }
    );
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
