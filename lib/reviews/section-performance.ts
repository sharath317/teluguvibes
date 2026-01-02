/**
 * SECTION PERFORMANCE TRACKING
 * 
 * Tracks which sections get the most engagement.
 * Uses existing content_performance patterns.
 * Auto-reorders sections based on performance.
 * 
 * Reuses:
 * - learning-engine.ts patterns
 * - content_performance table
 * - audience_preferences table
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface SectionClick {
  sectionId: string;
  sectionType: string;
  movieId?: string;
  timestamp: Date;
  sessionId?: string;
}

export interface SectionPerformance {
  sectionId: string;
  sectionType: string;
  clicks: number;
  impressions: number;
  ctr: number;  // Click-through rate
  avgPosition: number;
  lastClicked: Date | null;
  performanceScore: number;
}

export interface SectionOrdering {
  sectionId: string;
  priority: number;
  isPromoted: boolean;
  isDemoted: boolean;
  lastUpdated: Date;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================
// TRACKING FUNCTIONS
// ============================================================

/**
 * Record a section click event
 * Uses audience_preferences table for storage
 */
export async function recordSectionClick(click: SectionClick): Promise<void> {
  const supabase = getSupabaseClient();

  // Upsert to audience_preferences (reusing existing table)
  await supabase
    .from('audience_preferences')
    .upsert({
      dimension_type: 'review_section',
      dimension_value: click.sectionId,
      total_views: 1,
      avg_engagement: 1,
      preference_score: 1,
      sample_count: 1,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'dimension_type,dimension_value',
    });

  // Increment existing count
  const { data: existing } = await supabase
    .from('audience_preferences')
    .select('total_views, sample_count, preference_score')
    .eq('dimension_type', 'review_section')
    .eq('dimension_value', click.sectionId)
    .single();

  if (existing) {
    await supabase
      .from('audience_preferences')
      .update({
        total_views: (existing.total_views || 0) + 1,
        sample_count: (existing.sample_count || 0) + 1,
        preference_score: calculatePreferenceScore(existing.total_views + 1, existing.sample_count + 1),
        updated_at: new Date().toISOString(),
      })
      .eq('dimension_type', 'review_section')
      .eq('dimension_value', click.sectionId);
  }
}

/**
 * Record section impression (when section is viewed)
 */
export async function recordSectionImpression(sectionId: string): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from('audience_preferences')
    .upsert({
      dimension_type: 'review_section_impression',
      dimension_value: sectionId,
      total_views: 1,
      sample_count: 1,
      preference_score: 0,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'dimension_type,dimension_value',
    });

  // Increment
  const { data: existing } = await supabase
    .from('audience_preferences')
    .select('total_views')
    .eq('dimension_type', 'review_section_impression')
    .eq('dimension_value', sectionId)
    .single();

  if (existing) {
    await supabase
      .from('audience_preferences')
      .update({
        total_views: (existing.total_views || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('dimension_type', 'review_section_impression')
      .eq('dimension_value', sectionId);
  }
}

// ============================================================
// PERFORMANCE ANALYSIS
// ============================================================

/**
 * Get section performance metrics
 */
export async function getSectionPerformance(): Promise<SectionPerformance[]> {
  const supabase = getSupabaseClient();

  // Get clicks
  const { data: clicks } = await supabase
    .from('audience_preferences')
    .select('dimension_value, total_views, sample_count, preference_score, updated_at')
    .eq('dimension_type', 'review_section');

  // Get impressions
  const { data: impressions } = await supabase
    .from('audience_preferences')
    .select('dimension_value, total_views')
    .eq('dimension_type', 'review_section_impression');

  const impressionMap = new Map<string, number>();
  for (const imp of impressions || []) {
    impressionMap.set(imp.dimension_value, imp.total_views);
  }

  const performance: SectionPerformance[] = [];

  for (const click of clicks || []) {
    const clickCount = click.total_views || 0;
    const impressionCount = impressionMap.get(click.dimension_value) || 1;
    const ctr = clickCount / Math.max(1, impressionCount);

    performance.push({
      sectionId: click.dimension_value,
      sectionType: extractSectionType(click.dimension_value),
      clicks: clickCount,
      impressions: impressionCount,
      ctr,
      avgPosition: 0, // Would need to track this
      lastClicked: click.updated_at ? new Date(click.updated_at) : null,
      performanceScore: click.preference_score || 0,
    });
  }

  // Sort by performance score
  return performance.sort((a, b) => b.performanceScore - a.performanceScore);
}

/**
 * Calculate optimal section ordering based on performance
 */
export async function getOptimalSectionOrdering(): Promise<SectionOrdering[]> {
  const performance = await getSectionPerformance();

  // Default section priorities
  const defaultPriorities: Record<string, number> = {
    'recently-released': 1,
    'upcoming': 2,
    'trending': 3,
    'classics': 5,
    'genre-action': 10,
    'genre-drama': 11,
    'genre-thriller': 12,
    'genre-romance': 13,
    'genre-comedy': 14,
  };

  const orderings: SectionOrdering[] = [];

  // Calculate adjusted priorities
  const avgPerformance = performance.length > 0
    ? performance.reduce((sum, p) => sum + p.performanceScore, 0) / performance.length
    : 0;

  for (const perf of performance) {
    const defaultPriority = defaultPriorities[perf.sectionId] || 20;
    const isHighPerformer = perf.performanceScore > avgPerformance * 1.2;
    const isLowPerformer = perf.performanceScore < avgPerformance * 0.5;

    // Promote high performers, demote low performers
    let adjustedPriority = defaultPriority;
    if (isHighPerformer) adjustedPriority = Math.max(1, defaultPriority - 2);
    if (isLowPerformer) adjustedPriority = defaultPriority + 3;

    orderings.push({
      sectionId: perf.sectionId,
      priority: adjustedPriority,
      isPromoted: isHighPerformer,
      isDemoted: isLowPerformer,
      lastUpdated: new Date(),
    });
  }

  // Sort by adjusted priority
  return orderings.sort((a, b) => a.priority - b.priority);
}

/**
 * Get sections that should be hidden (consistently low performers)
 */
export async function getLowPerformingSections(): Promise<string[]> {
  const performance = await getSectionPerformance();

  // Hide sections with CTR < 1% after 100+ impressions
  return performance
    .filter(p => p.impressions >= 100 && p.ctr < 0.01)
    .map(p => p.sectionId);
}

// ============================================================
// HELPERS
// ============================================================

function calculatePreferenceScore(views: number, samples: number): number {
  // Bayesian-style scoring with smoothing
  const prior = 10;
  const priorWeight = 50;
  const score = (views + prior * priorWeight) / (samples + priorWeight);
  return Math.min(100, score * 10);
}

function extractSectionType(sectionId: string): string {
  if (sectionId.startsWith('genre-')) return 'genre';
  if (sectionId.startsWith('hero-')) return 'spotlight';
  if (sectionId.startsWith('heroine-')) return 'spotlight';
  return sectionId.replace(/-/g, '_');
}

// ============================================================
// ADMIN FUNCTIONS
// ============================================================

/**
 * Toggle section visibility (admin override)
 */
export async function toggleSectionVisibility(
  sectionId: string,
  visible: boolean
): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from('audience_preferences')
    .upsert({
      dimension_type: 'review_section_config',
      dimension_value: sectionId,
      preference_score: visible ? 100 : 0,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'dimension_type,dimension_value',
    });
}

/**
 * Get admin section configuration
 */
export async function getSectionConfig(): Promise<Record<string, { visible: boolean }>> {
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('audience_preferences')
    .select('dimension_value, preference_score')
    .eq('dimension_type', 'review_section_config');

  const config: Record<string, { visible: boolean }> = {};
  for (const item of data || []) {
    config[item.dimension_value] = {
      visible: (item.preference_score || 0) > 0,
    };
  }

  return config;
}

