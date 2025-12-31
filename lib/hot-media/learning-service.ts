/**
 * Hot Media Learning Service
 * 
 * Tracks content performance and learns patterns:
 * - Which celebrities perform best
 * - Which categories get most engagement
 * - Optimal posting times
 * - Caption styles that work
 * - Content quality signals
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export interface ContentPerformance {
  entity_name: string;
  category: string;
  views: number;
  likes: number;
  shares: number;
  clicks: number;
  engagement_rate: number;
  trending_score: number;
}

export interface LearningInsight {
  type: 'celebrity' | 'category' | 'time' | 'caption' | 'tag';
  key: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
}

export interface ContentPriority {
  entity_id: string;
  entity_name: string;
  priority_score: number;
  suggested_categories: string[];
  last_content_at: string | null;
  content_gap_days: number;
}

/**
 * Calculate engagement rate
 */
export function calculateEngagement(views: number, likes: number, shares: number, clicks: number): number {
  if (views === 0) return 0;
  // Weighted engagement: likes (1x) + shares (3x) + clicks (2x)
  const interactions = likes + (shares * 3) + (clicks * 2);
  return Math.min(100, (interactions / views) * 100);
}

/**
 * Analyze top performing celebrities
 */
export async function getTopPerformingCelebrities(
  supabase: SupabaseClient,
  limit = 10
): Promise<ContentPriority[]> {
  const { data, error } = await supabase
    .from('hot_media')
    .select(`
      entity_id,
      entity_name,
      views,
      likes,
      shares,
      clicks,
      trending_score,
      created_at
    `)
    .eq('status', 'approved')
    .order('trending_score', { ascending: false });

  if (error || !data) {
    console.error('Error fetching performance data:', error);
    return [];
  }

  // Aggregate by celebrity
  const celebrityStats: Record<string, {
    entity_id: string;
    entity_name: string;
    total_views: number;
    total_likes: number;
    total_shares: number;
    avg_trending: number;
    count: number;
    last_content: string;
  }> = {};

  for (const item of data) {
    const name = item.entity_name;
    if (!celebrityStats[name]) {
      celebrityStats[name] = {
        entity_id: item.entity_id,
        entity_name: name,
        total_views: 0,
        total_likes: 0,
        total_shares: 0,
        avg_trending: 0,
        count: 0,
        last_content: item.created_at,
      };
    }
    
    celebrityStats[name].total_views += item.views || 0;
    celebrityStats[name].total_likes += item.likes || 0;
    celebrityStats[name].total_shares += item.shares || 0;
    celebrityStats[name].avg_trending += item.trending_score || 0;
    celebrityStats[name].count++;
    
    if (item.created_at > celebrityStats[name].last_content) {
      celebrityStats[name].last_content = item.created_at;
    }
  }

  // Calculate priority scores
  const priorities: ContentPriority[] = Object.values(celebrityStats).map(stat => {
    const avgTrending = stat.avg_trending / stat.count;
    const engagement = calculateEngagement(
      stat.total_views,
      stat.total_likes,
      stat.total_shares,
      0
    );
    
    // Content gap in days
    const lastContentDate = new Date(stat.last_content);
    const daysSinceContent = Math.floor(
      (Date.now() - lastContentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Priority = trending + engagement + freshness need
    const freshnessBonus = Math.min(50, daysSinceContent * 5);
    const priorityScore = avgTrending + engagement + freshnessBonus;
    
    return {
      entity_id: stat.entity_id,
      entity_name: stat.entity_name,
      priority_score: Math.round(priorityScore * 100) / 100,
      suggested_categories: getSuggestedCategories(stat.entity_name),
      last_content_at: stat.last_content,
      content_gap_days: daysSinceContent,
    };
  });

  // Sort by priority
  return priorities
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, limit);
}

/**
 * Get suggested categories based on celebrity type
 */
function getSuggestedCategories(celebrityName: string): string[] {
  // In production, this would learn from historical data
  const defaultCategories = ['photoshoot', 'fashion', 'events'];
  
  // Some celebrities have known preferences
  const categoryPrefs: Record<string, string[]> = {
    'Samantha Ruth Prabhu': ['photoshoot', 'fitness', 'fashion'],
    'Rashmika Mandanna': ['events', 'traditional', 'reels'],
    'Pooja Hegde': ['beach', 'western', 'photoshoot'],
    'Tamannaah Bhatia': ['fashion', 'events', 'fitness'],
    'Sai Pallavi': ['traditional', 'events', 'photoshoot'],
  };
  
  return categoryPrefs[celebrityName] || defaultCategories;
}

/**
 * Analyze top performing categories
 */
export async function getTopCategories(
  supabase: SupabaseClient
): Promise<{ category: string; avg_engagement: number; count: number }[]> {
  const { data, error } = await supabase
    .from('hot_media')
    .select('category, views, likes, shares, clicks')
    .eq('status', 'approved');

  if (error || !data) {
    console.error('Error fetching category data:', error);
    return [];
  }

  // Aggregate by category
  const categoryStats: Record<string, {
    total_views: number;
    total_likes: number;
    total_shares: number;
    total_clicks: number;
    count: number;
  }> = {};

  for (const item of data) {
    const cat = item.category || 'other';
    if (!categoryStats[cat]) {
      categoryStats[cat] = {
        total_views: 0,
        total_likes: 0,
        total_shares: 0,
        total_clicks: 0,
        count: 0,
      };
    }
    
    categoryStats[cat].total_views += item.views || 0;
    categoryStats[cat].total_likes += item.likes || 0;
    categoryStats[cat].total_shares += item.shares || 0;
    categoryStats[cat].total_clicks += item.clicks || 0;
    categoryStats[cat].count++;
  }

  return Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      avg_engagement: calculateEngagement(
        stats.total_views,
        stats.total_likes,
        stats.total_shares,
        stats.total_clicks
      ),
      count: stats.count,
    }))
    .sort((a, b) => b.avg_engagement - a.avg_engagement);
}

/**
 * Generate learning insights
 */
export async function generateInsights(
  supabase: SupabaseClient
): Promise<LearningInsight[]> {
  const insights: LearningInsight[] = [];

  // Get top celebrities
  const topCelebs = await getTopPerformingCelebrities(supabase, 5);
  for (const celeb of topCelebs) {
    if (celeb.content_gap_days > 7) {
      insights.push({
        type: 'celebrity',
        key: celeb.entity_name,
        value: celeb.priority_score,
        trend: celeb.content_gap_days > 14 ? 'down' : 'stable',
        recommendation: `Add new content for ${celeb.entity_name} - ${celeb.content_gap_days} days since last post`,
      });
    }
  }

  // Get top categories
  const topCategories = await getTopCategories(supabase);
  const avgEngagement = topCategories.reduce((acc, c) => acc + c.avg_engagement, 0) / topCategories.length;
  
  for (const cat of topCategories.slice(0, 3)) {
    insights.push({
      type: 'category',
      key: cat.category,
      value: cat.avg_engagement,
      trend: cat.avg_engagement > avgEngagement ? 'up' : 'stable',
      recommendation: `${cat.category} performing ${cat.avg_engagement > avgEngagement ? 'above' : 'at'} average - ${cat.count} posts`,
    });
  }

  // Low performing categories
  for (const cat of topCategories.slice(-2)) {
    if (cat.count > 0 && cat.avg_engagement < avgEngagement * 0.5) {
      insights.push({
        type: 'category',
        key: cat.category,
        value: cat.avg_engagement,
        trend: 'down',
        recommendation: `Consider improving ${cat.category} content quality or reducing focus`,
      });
    }
  }

  return insights;
}

/**
 * Update trending scores based on recent engagement
 */
export async function updateTrendingScores(
  supabase: SupabaseClient
): Promise<number> {
  // Get all approved posts
  const { data, error } = await supabase
    .from('hot_media')
    .select('id, views, likes, shares, clicks, created_at, trending_score')
    .eq('status', 'approved');

  if (error || !data) {
    console.error('Error fetching posts for trending update:', error);
    return 0;
  }

  let updated = 0;

  for (const post of data) {
    const engagement = calculateEngagement(
      post.views || 0,
      post.likes || 0,
      post.shares || 0,
      post.clicks || 0
    );

    // Time decay - older posts get lower scores
    const ageInDays = Math.floor(
      (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeDecay = Math.max(0.1, 1 - (ageInDays * 0.02)); // 2% decay per day

    const newScore = Math.round(engagement * timeDecay * 100) / 100;

    // Only update if score changed significantly
    if (Math.abs(newScore - (post.trending_score || 0)) > 1) {
      const { error: updateError } = await supabase
        .from('hot_media')
        .update({ trending_score: newScore })
        .eq('id', post.id);

      if (!updateError) updated++;
    }
  }

  return updated;
}

/**
 * Get content recommendations for discovery
 */
export async function getDiscoveryRecommendations(
  supabase: SupabaseClient
): Promise<{
  priorityCelebrities: ContentPriority[];
  recommendedCategories: string[];
  insights: LearningInsight[];
}> {
  const [priorityCelebrities, categories, insights] = await Promise.all([
    getTopPerformingCelebrities(supabase, 10),
    getTopCategories(supabase),
    generateInsights(supabase),
  ]);

  // Recommend categories that are performing well but have low content
  const recommendedCategories = categories
    .filter(c => c.count < 10 && c.avg_engagement > 5)
    .map(c => c.category)
    .slice(0, 3);

  return {
    priorityCelebrities,
    recommendedCategories: recommendedCategories.length > 0 
      ? recommendedCategories 
      : ['photoshoot', 'fashion', 'events'],
    insights,
  };
}

