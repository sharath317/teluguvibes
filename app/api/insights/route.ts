/**
 * INSIGHTS API
 *
 * Returns interview insights for display.
 * Supports filtering by celebrity, type, topic.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCelebrityInsights,
  getInsightsAbout,
  getControversialInsights
} from '@/lib/evergreen/interview-intelligence';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const celebrityId = searchParams.get('celebrity');
    const type = searchParams.get('type');
    const aboutCelebrity = searchParams.get('aboutCelebrity');
    const aboutMovie = searchParams.get('aboutMovie');
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '10');

    let insights: any[] = [];

    if (type === 'controversy') {
      insights = await getControversialInsights(limit);
    } else if (celebrityId) {
      insights = await getCelebrityInsights(celebrityId, limit);
    } else if (aboutCelebrity || aboutMovie || topic) {
      insights = await getInsightsAbout(
        aboutCelebrity || undefined,
        aboutMovie || undefined,
        topic || undefined
      );
    }

    return NextResponse.json(
      { insights, count: insights.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}



