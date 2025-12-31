/**
 * TeluguVibes Learning Engine
 * Learns from content performance and adapts strategies
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

interface ContentContext {
  topic: string;
  category: string;
  entityType?: string;
  trendScore: number;
  saturation: number;
}

interface GenerationRecommendation {
  shouldGenerate: boolean;
  reason: string;
  recommendedAngle: string;
  recommendedTone: string;
  recommendedLength: number;
  optimalPublishTime: Date;
  titleSuggestions: string[];
  avoidPatterns: string[];
}

interface PerformanceLearning {
  pattern: string;
  impact: 'positive' | 'negative';
  confidence: number;
  recommendation: string;
}

// ===== SATURATION DETECTION =====

export async function checkTopicSaturation(topic: string): Promise<{
  isSaturated: boolean;
  saturationScore: number;
  lastCoveredAt: Date | null;
  avgPerformance: number;
}> {
  // Check recent posts on this topic
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, title, created_at')
    .or(`title.ilike.%${topic}%,tags.cs.{${topic}}`)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  const postCount = recentPosts?.length || 0;

  // Get performance of similar posts
  let avgPerformance = 50;
  if (recentPosts && recentPosts.length > 0) {
    const postIds = recentPosts.map(p => p.id);
    const { data: performances } = await supabase
      .from('content_performance')
      .select('overall_performance')
      .in('post_id', postIds);

    if (performances && performances.length > 0) {
      avgPerformance = performances.reduce((sum, p) => sum + (p.overall_performance || 0), 0) / performances.length;
    }
  }

  // Calculate saturation (0-1)
  const saturationScore = Math.min(1, postCount * 0.15 + (avgPerformance < 30 ? 0.3 : 0));

  return {
    isSaturated: saturationScore > 0.7,
    saturationScore,
    lastCoveredAt: recentPosts?.[0]?.created_at ? new Date(recentPosts[0].created_at) : null,
    avgPerformance,
  };
}

// ===== AUDIENCE PREFERENCE LEARNING =====

export async function updateAudiencePreferences(): Promise<void> {
  console.log('Updating audience preferences...');

  // Learn category preferences
  const { data: categoryPerf } = await supabase
    .from('content_performance')
    .select(`
      posts!inner(category),
      views,
      engagement_score,
      avg_time_on_page
    `)
    .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const categoryStats = new Map<string, { views: number; engagement: number; time: number; count: number }>();

  for (const p of (categoryPerf || [])) {
    const cat = (p as any).posts?.category;
    if (cat) {
      const stats = categoryStats.get(cat) || { views: 0, engagement: 0, time: 0, count: 0 };
      stats.views += p.views || 0;
      stats.engagement += p.engagement_score || 0;
      stats.time += p.avg_time_on_page || 0;
      stats.count += 1;
      categoryStats.set(cat, stats);
    }
  }

  for (const [category, stats] of categoryStats) {
    await supabase
      .from('audience_preferences')
      .upsert({
        dimension_type: 'category',
        dimension_value: category,
        total_views: stats.views,
        avg_engagement: stats.count > 0 ? stats.engagement / stats.count : 0,
        avg_time_spent: stats.count > 0 ? stats.time / stats.count : 0,
        preference_score: calculatePreferenceScore(stats),
        sample_count: stats.count,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'dimension_type,dimension_value',
      });
  }

  // Learn time preferences from page views
  const { data: timeData } = await supabase
    .from('page_views')
    .select('created_at, time_on_page')
    .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  const hourStats = new Map<number, { views: number; avgTime: number[] }>();

  for (const pv of (timeData || [])) {
    const hour = new Date(pv.created_at).getHours();
    const stats = hourStats.get(hour) || { views: 0, avgTime: [] };
    stats.views += 1;
    if (pv.time_on_page) stats.avgTime.push(pv.time_on_page);
    hourStats.set(hour, stats);
  }

  const peakHours = [...hourStats.entries()]
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 5)
    .map(([h]) => h);

  await supabase
    .from('audience_preferences')
    .upsert({
      dimension_type: 'timing',
      dimension_value: 'peak_hours',
      peak_hours: peakHours,
      sample_count: timeData?.length || 0,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'dimension_type,dimension_value',
    });

  console.log('Audience preferences updated');
}

function calculatePreferenceScore(stats: { views: number; engagement: number; time: number; count: number }): number {
  if (stats.count === 0) return 0;

  const avgViews = stats.views / stats.count;
  const avgEngagement = stats.engagement / stats.count;
  const avgTime = stats.time / stats.count;

  return Math.min(100, (avgViews / 100) * 0.4 + avgEngagement * 0.4 + (avgTime / 60) * 0.2);
}

// ===== CONTENT GENERATION CONTEXT =====

export async function getGenerationContext(
  topic: string,
  category: string
): Promise<GenerationRecommendation> {
  // Check saturation
  const saturation = await checkTopicSaturation(topic);

  // Get category preferences
  const { data: catPref } = await supabase
    .from('audience_preferences')
    .select('*')
    .eq('dimension_type', 'category')
    .eq('dimension_value', category)
    .single();

  // Get timing preferences
  const { data: timePref } = await supabase
    .from('audience_preferences')
    .select('peak_hours')
    .eq('dimension_type', 'timing')
    .eq('dimension_value', 'peak_hours')
    .single();

  // Get learned patterns for this category
  const { data: learnings } = await supabase
    .from('ai_learnings')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('confidence_score', { ascending: false })
    .limit(5);

  // Build recommendation
  const avoidPatterns: string[] = [];
  const titleSuggestions: string[] = [];
  let recommendedTone = 'informative';
  let recommendedLength = 400;

  for (const learning of (learnings || [])) {
    if (learning.learning_type === 'title_pattern') {
      if (learning.pattern_description.includes('avoid')) {
        avoidPatterns.push(learning.pattern_description);
      } else {
        titleSuggestions.push(learning.pattern_description);
      }
    }
    if (learning.learning_type === 'tone' && learning.confidence_score > 0.7) {
      recommendedTone = learning.pattern_description;
    }
    if (learning.learning_type === 'length' && learning.success_indicators) {
      recommendedLength = (learning.success_indicators as any).optimal_length || 400;
    }
  }

  // Determine optimal publish time
  const peakHours = (timePref?.peak_hours as number[]) || [9, 12, 18, 21];
  const now = new Date();
  const optimalHour = peakHours.find(h => h > now.getHours()) || peakHours[0];
  const optimalPublishTime = new Date(now);
  optimalPublishTime.setHours(optimalHour, 0, 0, 0);
  if (optimalHour <= now.getHours()) {
    optimalPublishTime.setDate(optimalPublishTime.getDate() + 1);
  }

  // Determine if we should generate
  const shouldGenerate = !saturation.isSaturated || saturation.avgPerformance > 60;

  let reason = '';
  if (saturation.isSaturated && saturation.avgPerformance < 60) {
    reason = `Topic "${topic}" is saturated (${saturation.saturationScore.toFixed(2)}) with low performance (${saturation.avgPerformance.toFixed(0)})`;
  } else if (saturation.isSaturated) {
    reason = `Topic is saturated but performance is good - generate with unique angle`;
  } else {
    reason = `Topic has space for coverage`;
  }

  // Determine angle
  let recommendedAngle = 'standard_coverage';
  if (saturation.saturationScore > 0.3) {
    recommendedAngle = 'unique_perspective';
  }
  if (category === 'entertainment') {
    recommendedAngle = 'emotional_connect';
  }

  // Store this context for later learning
  const contextId = await storeGenerationContext({
    topic,
    category,
    saturation: saturation.saturationScore,
    recommendation: {
      shouldGenerate,
      reason,
      recommendedAngle,
      recommendedTone,
      recommendedLength,
      optimalPublishTime,
      titleSuggestions,
      avoidPatterns,
    },
  });

  return {
    shouldGenerate,
    reason,
    recommendedAngle,
    recommendedTone,
    recommendedLength,
    optimalPublishTime,
    titleSuggestions,
    avoidPatterns,
  };
}

async function storeGenerationContext(context: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('generation_contexts')
    .insert({
      trigger_type: 'recommendation_request',
      detected_intent: context.topic,
      topic_saturation: context.saturation,
      recommended_angle: context.recommendation.recommendedAngle,
      recommended_tone: context.recommendation.recommendedTone,
      recommended_length: context.recommendation.recommendedLength,
      optimal_publish_time: context.recommendation.optimalPublishTime.toISOString(),
      reasoning_json: context,
    })
    .select('id')
    .single();

  return data?.id || null;
}

// ===== PERFORMANCE-BASED LEARNING =====

export async function learnFromPerformance(): Promise<PerformanceLearning[]> {
  const learnings: PerformanceLearning[] = [];

  // Get recent high and low performers
  const { data: highPerformers } = await supabase
    .from('content_performance')
    .select(`
      post_id,
      overall_performance,
      scroll_depth_avg,
      avg_time_on_page,
      posts!inner(title, category, body)
    `)
    .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .gte('overall_performance', 70)
    .order('overall_performance', { ascending: false })
    .limit(20);

  const { data: lowPerformers } = await supabase
    .from('content_performance')
    .select(`
      post_id,
      overall_performance,
      scroll_depth_avg,
      avg_time_on_page,
      posts!inner(title, category, body)
    `)
    .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .lte('overall_performance', 30)
    .order('overall_performance', { ascending: true })
    .limit(20);

  // Analyze title patterns
  const highTitlePatterns = analyzeTitlePatterns((highPerformers || []).map(p => (p as any).posts?.title).filter(Boolean));
  const lowTitlePatterns = analyzeTitlePatterns((lowPerformers || []).map(p => (p as any).posts?.title).filter(Boolean));

  // Store positive patterns
  for (const pattern of highTitlePatterns) {
    if (pattern.frequency > 2) {
      learnings.push({
        pattern: `Use "${pattern.pattern}" in titles`,
        impact: 'positive',
        confidence: Math.min(1, pattern.frequency / 10),
        recommendation: `Titles with "${pattern.pattern}" perform ${pattern.frequency}x better`,
      });

      await supabase.from('ai_learnings').upsert({
        learning_type: 'title_pattern',
        pattern_description: pattern.pattern,
        confidence_score: Math.min(1, pattern.frequency / 10),
        positive_examples: highPerformers?.slice(0, 5).map(p => p.post_id) || [],
        sample_size: highPerformers?.length || 0,
        is_active: true,
      }, {
        onConflict: 'learning_type,pattern_description',
        ignoreDuplicates: false,
      });
    }
  }

  // Store negative patterns
  for (const pattern of lowTitlePatterns) {
    if (pattern.frequency > 2 && !highTitlePatterns.some(hp => hp.pattern === pattern.pattern)) {
      learnings.push({
        pattern: `Avoid "${pattern.pattern}" in titles`,
        impact: 'negative',
        confidence: Math.min(1, pattern.frequency / 10),
        recommendation: `Titles with "${pattern.pattern}" underperform`,
      });

      await supabase.from('ai_learnings').upsert({
        learning_type: 'title_pattern_avoid',
        pattern_description: `avoid: ${pattern.pattern}`,
        confidence_score: Math.min(1, pattern.frequency / 10),
        negative_examples: lowPerformers?.slice(0, 5).map(p => p.post_id) || [],
        sample_size: lowPerformers?.length || 0,
        is_active: true,
      }, {
        onConflict: 'learning_type,pattern_description',
        ignoreDuplicates: false,
      });
    }
  }

  // Analyze content length
  const highLengths = (highPerformers || []).map(p => {
    const body = (p as any).posts?.body;
    return body ? body.split(/\s+/).length : 0;
  }).filter(l => l > 0);

  const lowLengths = (lowPerformers || []).map(p => {
    const body = (p as any).posts?.body;
    return body ? body.split(/\s+/).length : 0;
  }).filter(l => l > 0);

  if (highLengths.length > 5 && lowLengths.length > 5) {
    const avgHighLength = highLengths.reduce((a, b) => a + b, 0) / highLengths.length;
    const avgLowLength = lowLengths.reduce((a, b) => a + b, 0) / lowLengths.length;

    learnings.push({
      pattern: `Optimal length: ${Math.round(avgHighLength)} words`,
      impact: 'positive',
      confidence: 0.7,
      recommendation: `High performers average ${Math.round(avgHighLength)} words vs ${Math.round(avgLowLength)} for low performers`,
    });

    await supabase.from('ai_learnings').upsert({
      learning_type: 'length',
      pattern_description: `optimal_length_${Math.round(avgHighLength / 100) * 100}`,
      success_indicators: { optimal_length: Math.round(avgHighLength) },
      confidence_score: 0.7,
      sample_size: highLengths.length,
      is_active: true,
    }, {
      onConflict: 'learning_type,pattern_description',
      ignoreDuplicates: false,
    });
  }

  console.log(`Generated ${learnings.length} learnings`);
  return learnings;
}

function analyzeTitlePatterns(titles: string[]): { pattern: string; frequency: number }[] {
  const patterns: Map<string, number> = new Map();

  // Common starting patterns
  const starters = ['Breaking:', 'WATCH:', 'EXCLUSIVE:', 'విజయం:', 'సంచలనం:'];

  for (const title of titles) {
    for (const starter of starters) {
      if (title.toLowerCase().includes(starter.toLowerCase())) {
        patterns.set(starter, (patterns.get(starter) || 0) + 1);
      }
    }

    // Check for question marks (engagement)
    if (title.includes('?')) {
      patterns.set('question_format', (patterns.get('question_format') || 0) + 1);
    }

    // Check for numbers
    if (/\d+/.test(title)) {
      patterns.set('contains_numbers', (patterns.get('contains_numbers') || 0) + 1);
    }
  }

  return [...patterns.entries()]
    .map(([pattern, frequency]) => ({ pattern, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}

// ===== ENTITY POPULARITY TRACKING =====

export async function updateEntityPopularity(): Promise<void> {
  console.log('Updating entity popularity...');

  // Update celebrity popularity
  const { data: celebrities } = await supabase
    .from('celebrities')
    .select('id, name_en');

  for (const celeb of (celebrities || [])) {
    // Count recent mentions
    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .or(`title.ilike.%${celeb.name_en}%,body.ilike.%${celeb.name_en}%`)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    // Get trend signals
    const { data: signals } = await supabase
      .from('trend_signals')
      .select('normalized_score')
      .ilike('keyword', `%${celeb.name_en}%`)
      .gte('signal_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const trendScore = (signals || []).reduce((sum, s) => sum + (s.normalized_score || 0), 0);
    const currentScore = ((postCount || 0) * 10) + (trendScore * 50);

    // Get previous score
    const { data: existing } = await supabase
      .from('entity_popularity')
      .select('current_score')
      .eq('entity_type', 'celebrity')
      .eq('entity_name', celeb.name_en)
      .single();

    const trendDirection = existing
      ? currentScore > existing.current_score ? 'up' : currentScore < existing.current_score ? 'down' : 'stable'
      : 'new';

    await supabase.from('entity_popularity').upsert({
      entity_type: 'celebrity',
      entity_id: celeb.id,
      entity_name: celeb.name_en,
      current_score: currentScore,
      score_7d_ago: existing?.current_score,
      news_mentions: postCount || 0,
      trend_direction: trendDirection,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'entity_type,entity_name',
    });
  }

  console.log('Entity popularity updated');
}

// ===== MAIN LEARNING CYCLE =====

export async function runLearningCycle(): Promise<{
  preferencesUpdated: boolean;
  learningsGenerated: number;
  popularityUpdated: boolean;
}> {
  console.log('Starting learning cycle...');

  await updateAudiencePreferences();
  const learnings = await learnFromPerformance();
  await updateEntityPopularity();

  console.log('Learning cycle complete');

  return {
    preferencesUpdated: true,
    learningsGenerated: learnings.length,
    popularityUpdated: true,
  };
}



