/**
 * API Route: Knowledge Graph Statistics
 * GET /api/admin/knowledge-graph/stats
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Total persons
    const { count: totalPersons } = await supabase
      .from('kg_persons')
      .select('*', { count: 'exact', head: true })
      .eq('is_canonical', true);

    // By role
    const { count: totalActors } = await supabase
      .from('kg_persons')
      .select('*', { count: 'exact', head: true })
      .eq('is_actor', true)
      .eq('is_canonical', true);

    const { count: totalActresses } = await supabase
      .from('kg_persons')
      .select('*', { count: 'exact', head: true })
      .eq('is_actress', true)
      .eq('is_canonical', true);

    const { count: totalDirectors } = await supabase
      .from('kg_persons')
      .select('*', { count: 'exact', head: true })
      .eq('is_director', true)
      .eq('is_canonical', true);

    // By era
    const { data: eraStats } = await supabase
      .from('kg_persons')
      .select('era')
      .eq('is_canonical', true)
      .not('era', 'is', null);

    const eraCounts: Record<string, number> = {};
    (eraStats || []).forEach((p: any) => {
      eraCounts[p.era] = (eraCounts[p.era] || 0) + 1;
    });

    // Living legends (pre-1970 debut, still alive)
    const { count: livingLegends } = await supabase
      .from('kg_persons')
      .select('*', { count: 'exact', head: true })
      .lt('debut_year', 1980)
      .is('death_date', null)
      .eq('is_canonical', true);

    // Recent additions
    const { data: recentAdditions } = await supabase
      .from('kg_persons')
      .select('id, name_en, name_te, era, created_at')
      .eq('is_canonical', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Data quality
    const { data: qualityData } = await supabase
      .from('kg_persons')
      .select('data_quality_score')
      .eq('is_canonical', true);

    const avgQuality = qualityData && qualityData.length > 0
      ? qualityData.reduce((sum, p) => sum + (p.data_quality_score || 0), 0) / qualityData.length
      : 0;

    // Ingestion history
    const { data: ingestionLogs } = await supabase
      .from('kg_ingestion_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      totals: {
        persons: totalPersons || 0,
        actors: totalActors || 0,
        actresses: totalActresses || 0,
        directors: totalDirectors || 0,
        livingLegends: livingLegends || 0,
      },
      byEra: eraCounts,
      dataQuality: {
        averageScore: avgQuality.toFixed(2),
        totalWithImages: 0, // TODO: Calculate
      },
      recentAdditions,
      ingestionHistory: ingestionLogs,
    });
  } catch (error) {
    console.error('Failed to fetch KG stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
