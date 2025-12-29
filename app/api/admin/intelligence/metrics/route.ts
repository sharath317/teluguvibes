/**
 * Admin Intelligence API - Performance Metrics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get today's performance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Today's views
    const { data: todayPerf } = await supabase
      .from('content_performance')
      .select('views, engagement_score')
      .gte('updated_at', today.toISOString());

    const todayViews = todayPerf?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
    const todayEngagement = todayPerf?.length 
      ? todayPerf.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / todayPerf.length 
      : 0;

    // Yesterday's views for comparison
    const { data: yesterdayPerf } = await supabase
      .from('content_performance')
      .select('views')
      .gte('updated_at', yesterday.toISOString())
      .lt('updated_at', today.toISOString());

    const yesterdayViews = yesterdayPerf?.reduce((sum, p) => sum + (p.views || 0), 0) || 1;
    const viewsChange = Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100);

    // Count trending topics
    const { count: trendingCount } = await supabase
      .from('topic_clusters')
      .select('*', { count: 'exact', head: true })
      .eq('trend_direction', 'spiking');

    const metrics = [
      {
        label: 'Total Views (24h)',
        value: todayViews,
        change: viewsChange,
        trend: viewsChange > 0 ? 'up' : viewsChange < 0 ? 'down' : 'stable',
      },
      {
        label: 'Avg Engagement',
        value: Math.round(todayEngagement),
        change: 0,
        trend: 'stable',
      },
      {
        label: 'Trending Topics',
        value: trendingCount || 0,
        change: 0,
        trend: 'stable',
      },
    ];

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ metrics: [] });
  }
}

