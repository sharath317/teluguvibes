/**
 * TeluguVibes Ranking & Scoring System
 * Adaptive algorithms that learn from performance
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

export interface RankingWeights {
  recency: number;
  engagement: number;
  views: number;
  entity_popularity: number;
  trend_score: number;
  quality: number;
}

export interface ContentScore {
  post_id: string;
  final_score: number;
  breakdown: {
    recency_score: number;
    engagement_score: number;
    views_score: number;
    trend_score: number;
    quality_score: number;
    boost_score: number;
  };
  rank: number;
}

// ===== ADAPTIVE WEIGHT LEARNING =====

const DEFAULT_WEIGHTS: RankingWeights = {
  recency: 0.25,
  engagement: 0.25,
  views: 0.20,
  entity_popularity: 0.10,
  trend_score: 0.10,
  quality: 0.10,
};

export async function getAdaptiveWeights(context: {
  category?: string;
  time_of_day?: number;
  device?: 'mobile' | 'desktop';
}): Promise<RankingWeights> {
  // Start with defaults
  let weights = { ...DEFAULT_WEIGHTS };

  // Get learned preferences
  const { data: prefs } = await supabase
    .from('audience_preferences')
    .select('*')
    .or(`dimension_value.eq.${context.category},dimension_type.eq.device`)
    .limit(5);

  if (!prefs || prefs.length === 0) return weights;

  // Adjust based on learned patterns
  for (const pref of prefs) {
    if (pref.dimension_type === 'category' && pref.dimension_value === context.category) {
      // Categories with high engagement should prioritize engagement more
      if (pref.avg_engagement > 60) {
        weights.engagement += 0.05;
        weights.recency -= 0.05;
      }
    }

    if (pref.dimension_type === 'device' && pref.dimension_value === context.device) {
      // Mobile users prefer shorter, quicker content
      if (context.device === 'mobile') {
        weights.recency += 0.05;
        weights.quality -= 0.05;
      }
    }
  }

  // Time-based adjustments
  if (context.time_of_day !== undefined) {
    // Evening users (6-10 PM) spend more time, prioritize quality
    if (context.time_of_day >= 18 && context.time_of_day <= 22) {
      weights.quality += 0.05;
      weights.recency -= 0.05;
    }
    // Morning users want quick updates
    if (context.time_of_day >= 6 && context.time_of_day <= 9) {
      weights.recency += 0.05;
      weights.engagement -= 0.05;
    }
  }

  // Normalize weights to sum to 1
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(weights) as (keyof RankingWeights)[]) {
    weights[key] = weights[key] / total;
  }

  return weights;
}

// ===== CONTENT SCORING =====

export async function scoreContent(
  postIds: string[],
  context?: { category?: string; time_of_day?: number; device?: 'mobile' | 'desktop' }
): Promise<ContentScore[]> {
  if (postIds.length === 0) return [];

  // Get adaptive weights
  const weights = await getAdaptiveWeights(context || {});

  // Fetch content data
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, category, created_at,
      content_performance(views, engagement_score, overall_performance)
    `)
    .in('id', postIds);

  if (!posts) return [];

  // Calculate scores
  const now = new Date();
  const scores: ContentScore[] = [];

  for (const post of posts) {
    const perf = (post as any).content_performance?.[0];
    const createdAt = new Date(post.created_at);
    const hoursAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Recency score (exponential decay)
    const recency_score = Math.exp(-hoursAgo / 48) * 100;

    // Engagement score
    const engagement_score = perf?.engagement_score || 0;

    // Views score (logarithmic)
    const views = perf?.views || 0;
    const views_score = Math.log10(views + 1) * 20;

    // Trend score (from clusters)
    const trend_score = await getTrendScore(post.title);

    // Quality score
    const quality_score = perf?.overall_performance || 50;

    // Calculate final score
    const final_score = 
      recency_score * weights.recency +
      engagement_score * weights.engagement +
      views_score * weights.views +
      trend_score * weights.trend_score +
      quality_score * weights.quality;

    scores.push({
      post_id: post.id,
      final_score,
      breakdown: {
        recency_score,
        engagement_score,
        views_score,
        trend_score,
        quality_score,
        boost_score: 0,
      },
      rank: 0,
    });
  }

  // Assign ranks
  scores.sort((a, b) => b.final_score - a.final_score);
  scores.forEach((s, i) => s.rank = i + 1);

  return scores;
}

async function getTrendScore(title: string): Promise<number> {
  const keywords = title.toLowerCase().split(' ').filter(w => w.length > 3);
  
  const { data: clusters } = await supabase
    .from('topic_clusters')
    .select('avg_score')
    .or(keywords.map(k => `primary_keyword.ilike.%${k}%`).join(','))
    .limit(3);

  if (!clusters || clusters.length === 0) return 30;

  return clusters.reduce((sum, c) => sum + (c.avg_score || 0), 0) / clusters.length;
}

// ===== HOT MEDIA RANKING =====

export async function rankHotMedia(limit: number = 20): Promise<any[]> {
  const { data: media } = await supabase
    .from('media_posts')
    .select(`
      *,
      media_entities(name_en, popularity_score)
    `)
    .eq('status', 'approved')
    .order('trending_score', { ascending: false })
    .limit(limit * 2); // Fetch more for re-ranking

  if (!media) return [];

  // Apply adaptive ranking
  const now = new Date();
  const scored = media.map(m => {
    const hoursAgo = (now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.exp(-hoursAgo / 72);
    
    const entityPopularity = (m as any).media_entities?.popularity_score || 50;
    const engagement = (m.views || 0) * 1 + (m.likes || 0) * 5 + (m.shares || 0) * 10;
    
    const score = 
      (engagement / 100) * 0.35 +
      timeDecay * 100 * 0.25 +
      entityPopularity * 0.25 +
      (m.is_hot ? 15 : 0) +
      (m.is_featured ? 10 : 0);

    return { ...m, calculated_score: score };
  });

  // Sort and return
  scored.sort((a, b) => b.calculated_score - a.calculated_score);
  return scored.slice(0, limit);
}

// ===== ENTITY POPULARITY TRACKING =====

export async function updateEntityPopularity(
  entityType: string,
  entityName: string,
  signals: {
    search_volume?: number;
    social_mentions?: number;
    news_mentions?: number;
    site_searches?: number;
  }
): Promise<void> {
  const { data: existing } = await supabase
    .from('entity_popularity')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_name', entityName)
    .single();

  const newScore = calculatePopularityScore(signals, existing);

  if (existing) {
    await supabase
      .from('entity_popularity')
      .update({
        current_score: newScore,
        score_7d_ago: existing.current_score,
        search_volume: signals.search_volume || existing.search_volume,
        social_mentions: signals.social_mentions || existing.social_mentions,
        news_mentions: signals.news_mentions || existing.news_mentions,
        site_searches: signals.site_searches || existing.site_searches,
        trend_direction: newScore > existing.current_score ? 'rising' : 
                         newScore < existing.current_score ? 'falling' : 'stable',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('entity_popularity')
      .insert({
        entity_type: entityType,
        entity_name: entityName,
        current_score: newScore,
        baseline_score: newScore,
        ...signals,
        trend_direction: 'stable',
      });
  }
}

function calculatePopularityScore(signals: any, existing?: any): number {
  const weights = {
    search_volume: 0.3,
    social_mentions: 0.25,
    news_mentions: 0.25,
    site_searches: 0.2,
  };

  let score = 0;
  if (signals.search_volume) score += Math.log10(signals.search_volume + 1) * 10 * weights.search_volume;
  if (signals.social_mentions) score += Math.log10(signals.social_mentions + 1) * 10 * weights.social_mentions;
  if (signals.news_mentions) score += signals.news_mentions * 5 * weights.news_mentions;
  if (signals.site_searches) score += signals.site_searches * 2 * weights.site_searches;

  // Blend with existing if available (smoothing)
  if (existing) {
    score = score * 0.7 + existing.current_score * 0.3;
  }

  return Math.min(100, score);
}

// ===== TOPIC FATIGUE DETECTION =====

export async function getTopicFatigueReport(): Promise<{
  saturated: string[];
  rising: string[];
  underserved: string[];
}> {
  // Get recent topic clusters
  const { data: clusters } = await supabase
    .from('topic_clusters')
    .select('*')
    .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('avg_score', { ascending: false });

  if (!clusters) return { saturated: [], rising: [], underserved: [] };

  const saturated: string[] = [];
  const rising: string[] = [];
  const underserved: string[] = [];

  for (const cluster of clusters) {
    if (cluster.saturation_score > 0.7) {
      saturated.push(cluster.primary_keyword);
    } else if (cluster.trend_direction === 'rising' || cluster.trend_direction === 'spiking') {
      if (cluster.times_covered < 2) {
        rising.push(cluster.primary_keyword);
      }
    }

    // Underserved = high score but low coverage
    if (cluster.avg_score > 60 && cluster.times_covered < 1) {
      underserved.push(cluster.primary_keyword);
    }
  }

  return { saturated, rising, underserved };
}

// ===== RECOMMENDATION ENGINE =====

export async function getContentRecommendations(limit: number = 5): Promise<{
  topic: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggested_format: string;
  urgency: string;
}[]> {
  const fatigue = await getTopicFatigueReport();
  const recommendations: any[] = [];

  // High priority: Rising topics
  for (const topic of fatigue.rising.slice(0, 3)) {
    recommendations.push({
      topic,
      reason: 'Trending now with low coverage',
      priority: 'high',
      suggested_format: 'news',
      urgency: 'today',
    });
  }

  // Medium priority: Underserved topics
  for (const topic of fatigue.underserved.slice(0, 2)) {
    recommendations.push({
      topic,
      reason: 'High interest, no recent content',
      priority: 'medium',
      suggested_format: 'analysis',
      urgency: 'this_week',
    });
  }

  // Check for upcoming celebrity events
  const { data: upcomingEvents } = await supabase
    .from('celebrity_events')
    .select('*, celebrities(name_en)')
    .gte('event_date', new Date().toISOString().slice(5, 10))
    .lte('event_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(5, 10))
    .limit(3);

  for (const event of (upcomingEvents || [])) {
    recommendations.push({
      topic: `${(event as any).celebrities?.name_en} ${event.event_type}`,
      reason: `${event.event_type} in ${event.event_date}`,
      priority: 'medium',
      suggested_format: 'biography',
      urgency: 'schedule',
    });
  }

  return recommendations.slice(0, limit);
}

// ===== LEARNING FEEDBACK =====

export async function recordRankingFeedback(
  postId: string,
  position: number,
  action: 'click' | 'skip' | 'share' | 'engage'
): Promise<void> {
  // Record the interaction
  const actionWeights = {
    click: 1,
    skip: -0.5,
    share: 3,
    engage: 2,
  };

  const weight = actionWeights[action];

  // Update content performance
  if (action === 'click') {
    await supabase.rpc('increment_post_views', { post_id: postId });
  }

  // Record for ranking learning
  await supabase
    .from('ai_learnings')
    .insert({
      learning_type: 'ranking_feedback',
      pattern_description: `Position ${position}: ${action} (weight: ${weight})`,
      success_indicators: { position, action, weight },
      confidence_score: 0.3,
      sample_size: 1,
      is_active: true,
    });
}

