/**
 * TRENDING NOW API
 *
 * Returns top trending entities across all types.
 * Cached response - minimal DB load.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrendingEntities } from '@/lib/evergreen/trend-heat-index';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('type') as 'celebrity' | 'movie' | 'topic' | undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    const items = await getTrendingEntities(entityType || undefined, 40, Math.min(limit, 50));

    return NextResponse.json(
      { items, count: items.length },
      {
        headers: {
          // Cache for 30 minutes
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('Trending Now API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending items' },
      { status: 500 }
    );
  }
}








