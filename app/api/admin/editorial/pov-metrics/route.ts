/**
 * Admin Editorial API - POV Metrics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Count posts with POV
    const { count: withPOV } = await supabase
      .from('human_pov')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true);

    // Count posts without POV
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    const withoutPOV = (totalPosts || 0) - (withPOV || 0);

    // Get average impact score
    const { data: povData } = await supabase
      .from('human_pov')
      .select('pov_impact_score, pov_type')
      .not('pov_impact_score', 'is', null);

    const avgImpactScore = povData && povData.length > 0
      ? povData.reduce((sum, p) => sum + (p.pov_impact_score || 0), 0) / povData.length
      : 0;

    // Aggregate by POV type
    const typeStats = new Map<string, { count: number; totalImpact: number }>();
    for (const pov of (povData || [])) {
      const stats = typeStats.get(pov.pov_type) || { count: 0, totalImpact: 0 };
      stats.count += 1;
      stats.totalImpact += pov.pov_impact_score || 0;
      typeStats.set(pov.pov_type, stats);
    }

    const topPOVTypes = Array.from(typeStats.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        impact: stats.count > 0 ? stats.totalImpact / stats.count : 0,
      }))
      .sort((a, b) => b.impact - a.impact);

    return NextResponse.json({
      totalWithPOV: withPOV || 0,
      totalWithoutPOV: withoutPOV,
      avgImpactScore,
      topPOVTypes,
    });
  } catch (error) {
    console.error('Error fetching POV metrics:', error);
    return NextResponse.json({
      totalWithPOV: 0,
      totalWithoutPOV: 0,
      avgImpactScore: 0,
      topPOVTypes: [],
    });
  }
}



