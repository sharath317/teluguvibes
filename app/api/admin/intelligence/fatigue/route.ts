/**
 * Admin Intelligence API - Topic Fatigue
 */

import { NextResponse } from 'next/server';
import { getTopicFatigueReport } from '@/lib/intelligence/ranking-system';

export async function GET() {
  try {
    const fatigue = await getTopicFatigueReport();
    return NextResponse.json(fatigue);
  } catch (error) {
    console.error('Error fetching fatigue report:', error);
    return NextResponse.json({ saturated: [], rising: [], underserved: [] });
  }
}

