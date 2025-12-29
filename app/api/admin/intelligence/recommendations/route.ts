/**
 * Admin Intelligence API - Recommendations
 */

import { NextResponse } from 'next/server';
import { getContentRecommendations } from '@/lib/intelligence/ranking-system';

export async function GET() {
  try {
    const recommendations = await getContentRecommendations(5);
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json({ recommendations: [] });
  }
}

