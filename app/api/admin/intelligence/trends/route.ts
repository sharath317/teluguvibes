/**
 * Admin Intelligence API - Trends
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: trends } = await supabase
      .from('topic_clusters')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('avg_score', { ascending: false })
      .limit(20);

    return NextResponse.json({ trends: trends || [] });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json({ trends: [] });
  }
}

