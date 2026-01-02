/**
 * SECTION TRACKING API
 * 
 * Tracks section clicks and impressions for performance learning.
 * Used by the Reviews page to optimize section ordering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  recordSectionClick, 
  recordSectionImpression,
  getSectionPerformance,
  getOptimalSectionOrdering 
} from '@/lib/reviews/section-performance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, sectionId, sectionType, movieId, sessionId } = body;

    if (!sectionId) {
      return NextResponse.json({ error: 'sectionId is required' }, { status: 400 });
    }

    if (type === 'click') {
      await recordSectionClick({
        sectionId,
        sectionType: sectionType || 'unknown',
        movieId,
        timestamp: new Date(),
        sessionId,
      });
    } else if (type === 'impression') {
      await recordSectionImpression(sectionId);
    } else {
      return NextResponse.json({ error: 'Invalid type. Use "click" or "impression"' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [performance, ordering] = await Promise.all([
      getSectionPerformance(),
      getOptimalSectionOrdering(),
    ]);

    return NextResponse.json({
      success: true,
      performance,
      ordering,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Performance fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}

