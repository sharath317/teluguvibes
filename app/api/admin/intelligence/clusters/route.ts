/**
 * Admin Intelligence API - Topic Clusters
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: clusters } = await supabase
      .from('topic_clusters')
      .select('*')
      .order('avg_score', { ascending: false })
      .limit(50);

    // Mark saturated topics
    const withSaturation = (clusters || []).map(c => ({
      ...c,
      is_saturated: c.saturation_score > 0.7,
    }));

    return NextResponse.json({ clusters: withSaturation });
  } catch (error) {
    console.error('Error fetching clusters:', error);
    return NextResponse.json({ clusters: [] });
  }
}








