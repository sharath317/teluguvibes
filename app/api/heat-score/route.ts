/**
 * HEAT SCORE API
 *
 * Returns heat score for a specific entity.
 * Light endpoint - just reads from cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEntityHeatScore } from '@/lib/evergreen/trend-heat-index';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('type');
    const entityName = searchParams.get('name');

    if (!entityType || !entityName) {
      return NextResponse.json(
        { error: 'type and name parameters required' },
        { status: 400 }
      );
    }

    const score = await getEntityHeatScore(entityType, entityName);

    if (!score) {
      return NextResponse.json(
        { heat_index: 0, heat_label: 'cold', trending_direction: 'stable', heat_delta: 0 },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=1800', // 30 min cache
          },
        }
      );
    }

    return NextResponse.json(score, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Heat Score API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heat score' },
      { status: 500 }
    );
  }
}
