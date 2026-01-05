/**
 * Admin Editorial API - Citation Metrics
 */

import { NextResponse } from 'next/server';
import { getCitationAnalytics } from '@/lib/editorial/zero-click-seo';

export async function GET() {
  try {
    const analytics = await getCitationAnalytics(30);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching citation metrics:', error);
    return NextResponse.json({
      totalCitations: 0,
      citedPosts: 0,
      topSources: [],
      topQueries: [],
    });
  }
}








