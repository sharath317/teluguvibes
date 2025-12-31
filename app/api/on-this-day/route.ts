/**
 * ON THIS DAY API
 *
 * Returns cached "On This Day" events.
 * Generates if cache is missing (rare, only first call of the day).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOnThisDay } from '@/lib/evergreen/on-this-day';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Parse date or use today
    const date = dateParam ? new Date(dateParam) : new Date();

    // Get cached or generate On This Day data
    const data = await getOnThisDay(date);

    return NextResponse.json(data, {
      headers: {
        // Cache for 1 hour (content is static for the day)
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('On This Day API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch On This Day data' },
      { status: 500 }
    );
  }
}
