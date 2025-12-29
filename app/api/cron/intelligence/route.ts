/**
 * Daily Intelligence Cron Job
 * Runs trend ingestion, updates learnings, and generates recommendations
 * 
 * Schedule: Every 6 hours
 */

import { NextRequest, NextResponse } from 'next/server';
import { runFullIngestion } from '@/lib/intelligence/trend-ingestion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CRON] Starting intelligence update...');
  const startTime = Date.now();

  try {
    // 1. Run full trend ingestion
    const ingestionResult = await runFullIngestion();
    console.log('[CRON] Ingestion complete:', ingestionResult);

    // 2. Update audience preferences
    await updateAudiencePreferences();
    console.log('[CRON] Audience preferences updated');

    // 3. Validate and prune old learnings
    await pruneOldLearnings();
    console.log('[CRON] Old learnings pruned');

    // 4. Update entity popularity scores
    await updateEntityPopularityBatch();
    console.log('[CRON] Entity popularity updated');

    // 5. Calculate content performance scores
    await calculatePerformanceScores();
    console.log('[CRON] Performance scores calculated');

    // 6. Detect topic saturation
    await updateSaturationScores();
    console.log('[CRON] Saturation scores updated');

    const duration = Date.now() - startTime;
    console.log(`[CRON] Intelligence update complete in ${duration}ms`);

    return NextResponse.json({
      success: true,
      ingestion: ingestionResult,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Intelligence update failed:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

async function updateAudiencePreferences() {
  // Aggregate performance by category
  const { data: categoryPerf } = await supabase
    .from('content_performance')
    .select(`
      engagement_score,
      avg_time_on_page,
      posts!inner(category)
    `)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (!categoryPerf) return;

  // Group by category
  const categoryStats = new Map<string, { total: number; count: number; time: number }>();

  for (const perf of categoryPerf) {
    const category = (perf as any).posts?.category;
    if (!category) continue;

    const stats = categoryStats.get(category) || { total: 0, count: 0, time: 0 };
    stats.total += perf.engagement_score || 0;
    stats.time += perf.avg_time_on_page || 0;
    stats.count += 1;
    categoryStats.set(category, stats);
  }

  // Upsert preferences
  for (const [category, stats] of categoryStats) {
    await supabase
      .from('audience_preferences')
      .upsert({
        dimension_type: 'category',
        dimension_value: category,
        avg_engagement: stats.total / stats.count,
        avg_time_spent: stats.time / stats.count,
        sample_count: stats.count,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'dimension_type,dimension_value'
      });
  }
}

async function pruneOldLearnings() {
  // Remove learnings with low confidence that are old
  await supabase
    .from('ai_learnings')
    .delete()
    .lt('confidence_score', 0.4)
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Deactivate learnings not validated in 60 days
  await supabase
    .from('ai_learnings')
    .update({ is_active: false })
    .is('validated_at', null)
    .lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());
}

async function updateEntityPopularityBatch() {
  // Get recent trend signals for entities
  const { data: signals } = await supabase
    .from('trend_signals')
    .select('entity_type, keyword, normalized_score')
    .in('entity_type', ['actor', 'director', 'movie'])
    .gte('signal_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!signals) return;

  // Aggregate by entity
  const entityScores = new Map<string, { total: number; count: number }>();

  for (const signal of signals) {
    if (!signal.entity_type || !signal.keyword) continue;
    const key = `${signal.entity_type}:${signal.keyword}`;
    const current = entityScores.get(key) || { total: 0, count: 0 };
    current.total += signal.normalized_score || 0;
    current.count += 1;
    entityScores.set(key, current);
  }

  // Update entity_popularity table
  for (const [key, stats] of entityScores) {
    const [entityType, entityName] = key.split(':');
    const avgScore = stats.total / stats.count;

    await supabase
      .from('entity_popularity')
      .upsert({
        entity_type: entityType,
        entity_name: entityName,
        current_score: avgScore,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'entity_type,entity_name'
      });
  }
}

async function calculatePerformanceScores() {
  // Get recent posts without performance scores
  const { data: posts } = await supabase
    .from('posts')
    .select('id')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!posts) return;

  for (const post of posts) {
    await supabase.rpc('calculate_performance_score', { p_post_id: post.id });
  }
}

async function updateSaturationScores() {
  // Get all active topic clusters
  const { data: clusters } = await supabase
    .from('topic_clusters')
    .select('id, primary_keyword')
    .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!clusters) return;

  for (const cluster of clusters) {
    // Count recent posts with this topic
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .ilike('title', `%${cluster.primary_keyword}%`)
      .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

    const saturationScore = Math.min(1, (count || 0) * 0.15);

    await supabase
      .from('topic_clusters')
      .update({
        saturation_score: saturationScore,
        is_saturated: saturationScore > 0.7,
      })
      .eq('id', cluster.id);
  }
}

