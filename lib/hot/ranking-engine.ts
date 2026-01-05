/**
 * Hot & Glamour Ranking Engine
 * 
 * Calculates and maintains hot_score for celebrity ranking.
 * Combines multiple signals into a unified glamour ranking.
 * 
 * Formula:
 * hot_score = 
 *   (instagram_present * 15) +
 *   (instagram_recent_activity * 10) +
 *   (tmdb_popularity / 5, max 20) +
 *   (trend_score * 0.3) +
 *   (glamour_weight * 10) +
 *   (has_safe_embeds * 10) +
 *   (site_performance * 0.2)
 * 
 * @module lib/hot/ranking-engine
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { HOT_CONTENT_PLATFORM_PRIORITY } from '../social/platform-capabilities';

// Types
export interface HotGlamourCandidate {
  celebrity_id: string;
  celebrity_name: string;
  celebrity_name_te?: string;
  
  // Scores
  hot_score: number;
  popularity_score: number;
  trend_score: number;
  engagement_score: number;
  
  // Social
  primary_platform?: string;
  has_instagram: boolean;
  has_youtube: boolean;
  has_twitter: boolean;
  social_profiles_count: number;
  
  // Content
  has_safe_embeds: boolean;
  embeddable_platforms: string[];
  content_count: number;
  approved_content_count: number;
  
  // Metadata
  entity_type: string;
  industry?: string;
  tmdb_popularity?: number;
  
  // Flags
  is_eligible: boolean;
  ineligibility_reasons: string[];
  
  // Timestamps
  last_scored_at: string;
}

export interface RankingConfig {
  // Weights for scoring
  instagramWeight: number;
  youtubeWeight: number;
  tmdbWeight: number;
  trendWeight: number;
  engagementWeight: number;
  glamourWeight: number;
  embedSafetyWeight: number;
  
  // Thresholds
  minScoreForEligibility: number;
  minSocialProfiles: number;
  minConfidence: number;
  
  // Limits
  topNCandidates: number;
}

// Default ranking configuration
export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  instagramWeight: 15,
  youtubeWeight: 10,
  tmdbWeight: 20,
  trendWeight: 10,
  engagementWeight: 15,
  glamourWeight: 15,
  embedSafetyWeight: 10,
  
  minScoreForEligibility: 40,
  minSocialProfiles: 1,
  minConfidence: 0.6,
  
  topNCandidates: 50,
};

/**
 * Calculate hot score for a single celebrity
 */
export function calculateHotScore(data: {
  popularity_score?: number;
  tmdb_popularity?: number;
  trend_score?: number;
  engagement_score?: number;
  has_instagram?: boolean;
  has_youtube?: boolean;
  has_twitter?: boolean;
  has_safe_embeds?: boolean;
  entity_type?: string;
  recent_activity?: boolean;
}, config: RankingConfig = DEFAULT_RANKING_CONFIG): number {
  let score = 0;
  
  // Base popularity (0-100)
  const basePopularity = data.popularity_score || 0;
  score += basePopularity * 0.3;
  
  // TMDB popularity boost (capped at tmdbWeight)
  if (data.tmdb_popularity) {
    score += Math.min(config.tmdbWeight, data.tmdb_popularity / 5);
  }
  
  // Trend score contribution
  score += (data.trend_score || 0) * config.trendWeight / 100;
  
  // Engagement contribution
  score += (data.engagement_score || 0) * config.engagementWeight / 100;
  
  // Social platform bonuses
  if (data.has_instagram) score += config.instagramWeight;
  if (data.has_youtube) score += config.youtubeWeight;
  if (data.has_twitter) score += 5;
  
  // Embed safety bonus
  if (data.has_safe_embeds) score += config.embedSafetyWeight;
  
  // Entity type glamour weight
  const glamourMultipliers: Record<string, number> = {
    actress: 1.0,
    model: 0.95,
    influencer: 0.85,
    anchor: 0.75,
  };
  const glamourMult = glamourMultipliers[data.entity_type || 'actress'] || 1.0;
  score += config.glamourWeight * glamourMult;
  
  // Recent activity bonus
  if (data.recent_activity) score += 5;
  
  return Math.min(100, Math.round(score * 10) / 10);
}

/**
 * Determine primary platform based on availability and priority
 */
export function determinePrimaryPlatform(
  platforms: string[]
): string | undefined {
  for (const platform of HOT_CONTENT_PLATFORM_PRIORITY) {
    if (platforms.includes(platform)) {
      return platform;
    }
  }
  return platforms[0];
}

/**
 * Check candidate eligibility
 */
export function checkEligibility(
  candidate: Partial<HotGlamourCandidate>,
  config: RankingConfig = DEFAULT_RANKING_CONFIG
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Minimum score
  if ((candidate.hot_score || 0) < config.minScoreForEligibility) {
    reasons.push(`Score ${candidate.hot_score} below minimum ${config.minScoreForEligibility}`);
  }
  
  // Minimum social profiles
  if ((candidate.social_profiles_count || 0) < config.minSocialProfiles) {
    reasons.push(`Only ${candidate.social_profiles_count} social profiles (min: ${config.minSocialProfiles})`);
  }
  
  // Must have embeddable content
  if (!candidate.has_safe_embeds && candidate.content_count === 0) {
    reasons.push('No embeddable content available');
  }
  
  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Build hot glamour candidates from database
 */
export async function buildHotCandidates(
  supabase: SupabaseClient,
  config: RankingConfig = DEFAULT_RANKING_CONFIG
): Promise<HotGlamourCandidate[]> {
  const candidates: HotGlamourCandidate[] = [];
  
  // Fetch celebrities with their social profiles
  const { data: celebrities, error: celebError } = await supabase
    .from('celebrities')
    .select(`
      id,
      name_en,
      name_te,
      popularity_score,
      tmdb_id,
      occupation,
      is_active
    `)
    .eq('is_active', true)
    .order('popularity_score', { ascending: false })
    .limit(200);
  
  if (celebError) {
    console.error('Error fetching celebrities:', celebError);
    return [];
  }
  
  for (const celeb of celebrities || []) {
    // Get social profiles
    const { data: profiles } = await supabase
      .from('celebrity_social_profiles')
      .select('platform, confidence_score, verified')
      .eq('celebrity_id', celeb.id)
      .eq('is_active', true)
      .gte('confidence_score', config.minConfidence);
    
    const platforms = profiles?.map(p => p.platform) || [];
    const hasInstagram = platforms.includes('instagram');
    const hasYoutube = platforms.includes('youtube');
    const hasTwitter = platforms.includes('twitter');
    
    // Get content count
    const { count: contentCount } = await supabase
      .from('hot_media')
      .select('id', { count: 'exact', head: true })
      .eq('entity_name', celeb.name_en);
    
    // Get approved content count
    const { count: approvedCount } = await supabase
      .from('hot_media')
      .select('id', { count: 'exact', head: true })
      .eq('entity_name', celeb.name_en)
      .eq('status', 'approved');
    
    // Determine embeddable platforms
    const embeddablePlatforms = platforms.filter(p => 
      ['instagram', 'youtube', 'twitter', 'tiktok'].includes(p)
    );
    
    // Determine entity type from occupation
    let entityType = 'actress';
    const occupations = celeb.occupation || [];
    if (occupations.some((o: string) => o.toLowerCase().includes('anchor'))) {
      entityType = 'anchor';
    } else if (occupations.some((o: string) => o.toLowerCase().includes('model'))) {
      entityType = 'model';
    }
    
    // Calculate hot score
    const hotScore = calculateHotScore({
      popularity_score: celeb.popularity_score,
      has_instagram: hasInstagram,
      has_youtube: hasYoutube,
      has_twitter: hasTwitter,
      has_safe_embeds: embeddablePlatforms.length > 0,
      entity_type: entityType,
    }, config);
    
    // Check eligibility
    const eligibility = checkEligibility({
      hot_score: hotScore,
      social_profiles_count: profiles?.length || 0,
      has_safe_embeds: embeddablePlatforms.length > 0,
      content_count: contentCount || 0,
    }, config);
    
    candidates.push({
      celebrity_id: celeb.id,
      celebrity_name: celeb.name_en,
      celebrity_name_te: celeb.name_te,
      hot_score: hotScore,
      popularity_score: celeb.popularity_score || 0,
      trend_score: 0,
      engagement_score: 0,
      primary_platform: determinePrimaryPlatform(platforms),
      has_instagram: hasInstagram,
      has_youtube: hasYoutube,
      has_twitter: hasTwitter,
      social_profiles_count: profiles?.length || 0,
      has_safe_embeds: embeddablePlatforms.length > 0,
      embeddable_platforms: embeddablePlatforms,
      content_count: contentCount || 0,
      approved_content_count: approvedCount || 0,
      entity_type: entityType,
      is_eligible: eligibility.eligible,
      ineligibility_reasons: eligibility.reasons,
      last_scored_at: new Date().toISOString(),
    });
  }
  
  // Sort by hot score
  candidates.sort((a, b) => b.hot_score - a.hot_score);
  
  return candidates.slice(0, config.topNCandidates);
}

/**
 * Get top candidates for hot section
 */
export async function getTopHotCandidates(
  supabase: SupabaseClient,
  limit = 20,
  config: RankingConfig = DEFAULT_RANKING_CONFIG
): Promise<HotGlamourCandidate[]> {
  const allCandidates = await buildHotCandidates(supabase, config);
  
  return allCandidates
    .filter(c => c.is_eligible)
    .slice(0, limit);
}

/**
 * Update trending scores from analytics
 */
export async function updateTrendingScoresFromAnalytics(
  supabase: SupabaseClient
): Promise<{ updated: number }> {
  // Fetch engagement data from hot_media
  const { data: engagementData } = await supabase
    .from('hot_media')
    .select('entity_name, views, likes, shares, clicks')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  
  if (!engagementData) return { updated: 0 };
  
  // Aggregate by entity
  const entityEngagement = new Map<string, { views: number; likes: number; shares: number }>();
  
  for (const item of engagementData) {
    const existing = entityEngagement.get(item.entity_name) || { views: 0, likes: 0, shares: 0 };
    entityEngagement.set(item.entity_name, {
      views: existing.views + (item.views || 0),
      likes: existing.likes + (item.likes || 0),
      shares: existing.shares + (item.shares || 0),
    });
  }
  
  let updated = 0;
  
  for (const [name, engagement] of entityEngagement) {
    // Calculate trend score from engagement
    const trendScore = Math.min(100,
      (engagement.views / 100) +
      (engagement.likes * 2) +
      (engagement.shares * 5)
    );
    
    // Update celebrity record
    const { error } = await supabase
      .from('celebrities')
      .update({
        site_performance_score: trendScore,
        updated_at: new Date().toISOString(),
      })
      .eq('name_en', name);
    
    if (!error) updated++;
  }
  
  return { updated };
}

// Export config type
export type { RankingConfig };






