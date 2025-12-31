/**
 * CAREER VISUALIZATION API
 *
 * Returns career data for a celebrity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCareerVisualization } from '@/lib/career/visualizer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const data = await getCareerVisualization(slug);

    if (!data) {
      return NextResponse.json(
        { error: 'Celebrity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Career API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load career data' },
      { status: 500 }
    );
  }
}
