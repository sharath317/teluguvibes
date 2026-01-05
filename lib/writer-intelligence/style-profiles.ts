/**
 * TELUGU EDITORIAL STYLE PROFILES
 * 
 * Defines writing style profiles that reflect real Telugu writer behavior.
 * Each profile captures the rhythm, emotion, and structure patterns
 * of professional Telugu content writers.
 * 
 * These profiles are used to generate template-based content that
 * matches professional Telugu writing standards without AI generation.
 */

// ============================================================
// TYPES
// ============================================================

export interface StyleProfile {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  
  // Rhythm & Flow
  rhythm: 'fast_punchy' | 'balanced' | 'slow_deliberate' | 'poetic';
  emotionalIntensity: 'low' | 'medium' | 'high' | 'very_high';
  sentenceVariance: 'uniform' | 'moderate' | 'high';  // Short-long mix
  
  // Language
  slangUsageLevel: 0 | 1 | 2 | 3;  // 0=none, 3=heavy
  englishWordTolerance: 'minimal' | 'moderate' | 'high';  // English words mixed
  glamourTolerance: 'none' | 'subtle' | 'moderate' | 'explicit';
  
  // Structure patterns
  introPattern: 'hook_first' | 'context_first' | 'question_first' | 'emotional_first';
  paragraphFlow: 'short_staccato' | 'medium_balanced' | 'long_flowing' | 'mixed';
  closingPattern: 'summary' | 'call_to_action' | 'emotional_peak' | 'open_ended';
  
  // Target metrics
  targetWordCount: { min: number; max: number };
  targetParagraphCount: { min: number; max: number };
  
  // Punctuation & formatting
  punctuationStyle: 'minimal' | 'balanced' | 'emphatic';  // ! ? usage
  useEmoji: boolean;
  useBoldHighlights: boolean;
  
  // Mapping
  contentTypes: string[];      // Which content types use this
  audienceSegments: string[];  // Which audiences prefer this
  platformSections: string[];  // Which site sections use this
  
  // Performance
  confidenceScore: number;
  usageCount: number;
  avgEngagement: number;
}

export interface ContentTypeMapping {
  contentType: string;
  primaryProfileId: string;
  fallbackProfileId: string;
  adjustments?: Partial<StyleProfile>;
}

export interface AudienceMapping {
  segment: string;
  preferredProfileIds: string[];
  timePreferences: number[];  // Peak hours
}

// ============================================================
// STYLE PROFILES
// ============================================================

export const TELUGU_STYLE_PROFILES: StyleProfile[] = [
  // 1. MASS COMMERCIAL CINEMA
  {
    id: 'mass_commercial',
    name: 'మాస్ కమర్షియల్',
    nameEn: 'Mass Commercial Cinema',
    description: 'High-energy content for mass hero films, action, and commercial blockbusters',
    
    rhythm: 'fast_punchy',
    emotionalIntensity: 'very_high',
    sentenceVariance: 'high',
    
    slangUsageLevel: 2,
    englishWordTolerance: 'high',
    glamourTolerance: 'moderate',
    
    introPattern: 'hook_first',
    paragraphFlow: 'short_staccato',
    closingPattern: 'emotional_peak',
    
    targetWordCount: { min: 200, max: 350 },
    targetParagraphCount: { min: 6, max: 10 },
    
    punctuationStyle: 'emphatic',
    useEmoji: true,
    useBoldHighlights: true,
    
    contentTypes: ['movie_update', 'box_office', 'star_news', 'trailer_launch'],
    audienceSegments: ['mass_audience', 'youth', 'fanboys'],
    platformSections: ['entertainment', 'trending', 'hot'],
    
    confidenceScore: 0.85,
    usageCount: 0,
    avgEngagement: 0,
  },
  
  // 2. SOFT EMOTIONAL / FAMILY
  {
    id: 'soft_emotional',
    name: 'సాఫ్ట్ ఎమోషనల్',
    nameEn: 'Soft Emotional / Family',
    description: 'Gentle, heart-touching content for family audiences and emotional topics',
    
    rhythm: 'balanced',
    emotionalIntensity: 'high',
    sentenceVariance: 'moderate',
    
    slangUsageLevel: 0,
    englishWordTolerance: 'minimal',
    glamourTolerance: 'subtle',
    
    introPattern: 'emotional_first',
    paragraphFlow: 'medium_balanced',
    closingPattern: 'emotional_peak',
    
    targetWordCount: { min: 300, max: 500 },
    targetParagraphCount: { min: 8, max: 14 },
    
    punctuationStyle: 'balanced',
    useEmoji: false,
    useBoldHighlights: false,
    
    contentTypes: ['family_drama', 'tribute', 'biography', 'personal_story', 'festival'],
    audienceSegments: ['family', 'women', 'seniors'],
    platformSections: ['lifestyle', 'stories', 'culture'],
    
    confidenceScore: 0.8,
    usageCount: 0,
    avgEngagement: 0,
  },
  
  // 3. NEUTRAL NEWSROOM
  {
    id: 'neutral_newsroom',
    name: 'న్యూట్రల్ న్యూస్‌రూమ్',
    nameEn: 'Neutral Newsroom',
    description: 'Objective, fact-based reporting with minimal emotional language',
    
    rhythm: 'balanced',
    emotionalIntensity: 'low',
    sentenceVariance: 'uniform',
    
    slangUsageLevel: 0,
    englishWordTolerance: 'moderate',
    glamourTolerance: 'none',
    
    introPattern: 'context_first',
    paragraphFlow: 'medium_balanced',
    closingPattern: 'summary',
    
    targetWordCount: { min: 250, max: 400 },
    targetParagraphCount: { min: 6, max: 12 },
    
    punctuationStyle: 'minimal',
    useEmoji: false,
    useBoldHighlights: false,
    
    contentTypes: ['news_update', 'politics', 'business', 'crime', 'sports_news'],
    audienceSegments: ['general', 'professionals', 'seniors'],
    platformSections: ['news', 'politics', 'business', 'crime'],
    
    confidenceScore: 0.9,
    usageCount: 0,
    avgEngagement: 0,
  },
  
  // 4. GLAMOUR / SENSUAL
  {
    id: 'glamour_sensual',
    name: 'గ్లామర్ సెన్షువల్',
    nameEn: 'Glamour / Sensual',
    description: 'Tasteful glamour content with aesthetic descriptions and admiration',
    
    rhythm: 'poetic',
    emotionalIntensity: 'high',
    sentenceVariance: 'high',
    
    slangUsageLevel: 1,
    englishWordTolerance: 'high',
    glamourTolerance: 'moderate',
    
    introPattern: 'hook_first',
    paragraphFlow: 'mixed',
    closingPattern: 'call_to_action',
    
    targetWordCount: { min: 150, max: 300 },
    targetParagraphCount: { min: 5, max: 8 },
    
    punctuationStyle: 'emphatic',
    useEmoji: true,
    useBoldHighlights: true,
    
    contentTypes: ['photoshoot', 'fashion', 'red_carpet', 'lifestyle_celeb'],
    audienceSegments: ['youth', 'fanboys', 'fashion_conscious'],
    platformSections: ['hot', 'glamour', 'photos', 'celebrities'],
    
    confidenceScore: 0.75,
    usageCount: 0,
    avgEngagement: 0,
  },
  
  // 5. POLITICAL NARRATIVE
  {
    id: 'political_narrative',
    name: 'పొలిటికల్ నేరేటివ్',
    nameEn: 'Political Narrative',
    description: 'Analytical political coverage with context and implications',
    
    rhythm: 'slow_deliberate',
    emotionalIntensity: 'medium',
    sentenceVariance: 'moderate',
    
    slangUsageLevel: 1,
    englishWordTolerance: 'moderate',
    glamourTolerance: 'none',
    
    introPattern: 'context_first',
    paragraphFlow: 'long_flowing',
    closingPattern: 'open_ended',
    
    targetWordCount: { min: 400, max: 700 },
    targetParagraphCount: { min: 10, max: 18 },
    
    punctuationStyle: 'balanced',
    useEmoji: false,
    useBoldHighlights: true,
    
    contentTypes: ['political_analysis', 'election', 'government', 'policy'],
    audienceSegments: ['politically_aware', 'seniors', 'professionals'],
    platformSections: ['politics', 'editorial', 'opinion'],
    
    confidenceScore: 0.85,
    usageCount: 0,
    avgEngagement: 0,
  },
  
  // 6. DEVOTIONAL / CULTURAL
  {
    id: 'devotional_cultural',
    name: 'భక్తి/సాంస్కృతిక',
    nameEn: 'Devotional / Cultural',
    description: 'Respectful, serene content for spiritual and cultural topics',
    
    rhythm: 'slow_deliberate',
    emotionalIntensity: 'high',
    sentenceVariance: 'moderate',
    
    slangUsageLevel: 0,
    englishWordTolerance: 'minimal',
    glamourTolerance: 'none',
    
    introPattern: 'emotional_first',
    paragraphFlow: 'long_flowing',
    closingPattern: 'emotional_peak',
    
    targetWordCount: { min: 300, max: 600 },
    targetParagraphCount: { min: 8, max: 15 },
    
    punctuationStyle: 'balanced',
    useEmoji: false,
    useBoldHighlights: false,
    
    contentTypes: ['festival', 'temple', 'tradition', 'astrology', 'spirituality'],
    audienceSegments: ['devotional', 'family', 'seniors'],
    platformSections: ['culture', 'astrology', 'lifestyle'],
    
    confidenceScore: 0.8,
    usageCount: 0,
    avgEngagement: 0,
  },
  
  // 7. NOSTALGIC / RETRO CINEMA
  {
    id: 'nostalgic_retro',
    name: 'నాస్టాల్జిక్ రెట్రో',
    nameEn: 'Nostalgic / Retro Cinema',
    description: 'Memory-triggering content about classic films and legends',
    
    rhythm: 'poetic',
    emotionalIntensity: 'very_high',
    sentenceVariance: 'high',
    
    slangUsageLevel: 0,
    englishWordTolerance: 'minimal',
    glamourTolerance: 'subtle',
    
    introPattern: 'emotional_first',
    paragraphFlow: 'mixed',
    closingPattern: 'emotional_peak',
    
    targetWordCount: { min: 350, max: 550 },
    targetParagraphCount: { min: 8, max: 14 },
    
    punctuationStyle: 'balanced',
    useEmoji: false,
    useBoldHighlights: false,
    
    contentTypes: ['throwback', 'legend_tribute', 'classic_review', 'retro_gallery'],
    audienceSegments: ['seniors', 'cinephiles', 'general'],
    platformSections: ['entertainment', 'stories', 'photos'],
    
    confidenceScore: 0.85,
    usageCount: 0,
    avgEngagement: 0,
  },
  
  // 8. VIRAL / TRENDING
  {
    id: 'viral_trending',
    name: 'వైరల్ ట్రెండింగ్',
    nameEn: 'Viral / Trending',
    description: 'Quick, punchy content for viral topics and social media trends',
    
    rhythm: 'fast_punchy',
    emotionalIntensity: 'high',
    sentenceVariance: 'high',
    
    slangUsageLevel: 3,
    englishWordTolerance: 'high',
    glamourTolerance: 'moderate',
    
    introPattern: 'hook_first',
    paragraphFlow: 'short_staccato',
    closingPattern: 'call_to_action',
    
    targetWordCount: { min: 100, max: 200 },
    targetParagraphCount: { min: 4, max: 6 },
    
    punctuationStyle: 'emphatic',
    useEmoji: true,
    useBoldHighlights: true,
    
    contentTypes: ['viral_video', 'social_trend', 'meme_coverage', 'quick_update'],
    audienceSegments: ['youth', 'social_media_users'],
    platformSections: ['trending', 'viral', 'memes'],
    
    confidenceScore: 0.7,
    usageCount: 0,
    avgEngagement: 0,
  },
];

// ============================================================
// CONTENT TYPE MAPPINGS
// ============================================================

export const CONTENT_TYPE_MAPPINGS: ContentTypeMapping[] = [
  // Entertainment
  { contentType: 'movie_update', primaryProfileId: 'mass_commercial', fallbackProfileId: 'neutral_newsroom' },
  { contentType: 'box_office', primaryProfileId: 'mass_commercial', fallbackProfileId: 'neutral_newsroom' },
  { contentType: 'star_news', primaryProfileId: 'mass_commercial', fallbackProfileId: 'soft_emotional' },
  { contentType: 'trailer_launch', primaryProfileId: 'mass_commercial', fallbackProfileId: 'neutral_newsroom' },
  { contentType: 'movie_review', primaryProfileId: 'neutral_newsroom', fallbackProfileId: 'mass_commercial' },
  
  // Glamour
  { contentType: 'photoshoot', primaryProfileId: 'glamour_sensual', fallbackProfileId: 'soft_emotional' },
  { contentType: 'fashion', primaryProfileId: 'glamour_sensual', fallbackProfileId: 'soft_emotional' },
  { contentType: 'red_carpet', primaryProfileId: 'glamour_sensual', fallbackProfileId: 'mass_commercial' },
  
  // News
  { contentType: 'news_update', primaryProfileId: 'neutral_newsroom', fallbackProfileId: 'political_narrative' },
  { contentType: 'politics', primaryProfileId: 'political_narrative', fallbackProfileId: 'neutral_newsroom' },
  { contentType: 'crime', primaryProfileId: 'neutral_newsroom', fallbackProfileId: 'political_narrative' },
  { contentType: 'business', primaryProfileId: 'neutral_newsroom', fallbackProfileId: 'political_narrative' },
  
  // Lifestyle
  { contentType: 'festival', primaryProfileId: 'devotional_cultural', fallbackProfileId: 'soft_emotional' },
  { contentType: 'astrology', primaryProfileId: 'devotional_cultural', fallbackProfileId: 'soft_emotional' },
  { contentType: 'health', primaryProfileId: 'soft_emotional', fallbackProfileId: 'neutral_newsroom' },
  { contentType: 'food', primaryProfileId: 'soft_emotional', fallbackProfileId: 'neutral_newsroom' },
  
  // Nostalgia
  { contentType: 'throwback', primaryProfileId: 'nostalgic_retro', fallbackProfileId: 'soft_emotional' },
  { contentType: 'legend_tribute', primaryProfileId: 'nostalgic_retro', fallbackProfileId: 'soft_emotional' },
  
  // Viral
  { contentType: 'viral_video', primaryProfileId: 'viral_trending', fallbackProfileId: 'mass_commercial' },
  { contentType: 'social_trend', primaryProfileId: 'viral_trending', fallbackProfileId: 'mass_commercial' },
  { contentType: 'meme', primaryProfileId: 'viral_trending', fallbackProfileId: 'mass_commercial' },
];

// ============================================================
// AUDIENCE MAPPINGS
// ============================================================

export const AUDIENCE_MAPPINGS: AudienceMapping[] = [
  {
    segment: 'mass_audience',
    preferredProfileIds: ['mass_commercial', 'viral_trending'],
    timePreferences: [9, 12, 18, 21],
  },
  {
    segment: 'family',
    preferredProfileIds: ['soft_emotional', 'devotional_cultural', 'neutral_newsroom'],
    timePreferences: [7, 19, 21],
  },
  {
    segment: 'youth',
    preferredProfileIds: ['viral_trending', 'mass_commercial', 'glamour_sensual'],
    timePreferences: [10, 14, 22, 23],
  },
  {
    segment: 'seniors',
    preferredProfileIds: ['neutral_newsroom', 'political_narrative', 'nostalgic_retro'],
    timePreferences: [6, 9, 18],
  },
  {
    segment: 'cinephiles',
    preferredProfileIds: ['nostalgic_retro', 'neutral_newsroom', 'mass_commercial'],
    timePreferences: [11, 20, 22],
  },
  {
    segment: 'professionals',
    preferredProfileIds: ['neutral_newsroom', 'political_narrative'],
    timePreferences: [7, 12, 18],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get profile by ID
 */
export function getProfileById(profileId: string): StyleProfile | undefined {
  return TELUGU_STYLE_PROFILES.find(p => p.id === profileId);
}

/**
 * Get best profile for content type
 */
export function getProfileForContentType(contentType: string): StyleProfile {
  const mapping = CONTENT_TYPE_MAPPINGS.find(m => m.contentType === contentType);
  
  if (mapping) {
    const primary = getProfileById(mapping.primaryProfileId);
    if (primary) return primary;
    
    const fallback = getProfileById(mapping.fallbackProfileId);
    if (fallback) return fallback;
  }
  
  // Default to neutral newsroom
  return TELUGU_STYLE_PROFILES.find(p => p.id === 'neutral_newsroom')!;
}

/**
 * Get best profile for platform section
 */
export function getProfileForSection(section: string): StyleProfile {
  const matching = TELUGU_STYLE_PROFILES.filter(p => 
    p.platformSections.includes(section)
  );
  
  if (matching.length > 0) {
    // Return highest confidence
    return matching.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  }
  
  return TELUGU_STYLE_PROFILES.find(p => p.id === 'neutral_newsroom')!;
}

/**
 * Get profiles for audience segment
 */
export function getProfilesForAudience(segment: string): StyleProfile[] {
  const mapping = AUDIENCE_MAPPINGS.find(m => m.segment === segment);
  
  if (!mapping) {
    return [TELUGU_STYLE_PROFILES.find(p => p.id === 'neutral_newsroom')!];
  }
  
  return mapping.preferredProfileIds
    .map(id => getProfileById(id))
    .filter(Boolean) as StyleProfile[];
}

/**
 * Record profile usage and update stats
 */
export function recordProfileUsage(
  profileId: string,
  success: boolean,
  engagement?: number
): void {
  const profile = TELUGU_STYLE_PROFILES.find(p => p.id === profileId);
  if (!profile) return;
  
  profile.usageCount++;
  
  if (engagement !== undefined) {
    const alpha = 0.1;
    profile.avgEngagement = profile.usageCount === 1
      ? engagement
      : profile.avgEngagement * (1 - alpha) + engagement * alpha;
  }
  
  // Adjust confidence based on success
  if (profile.usageCount >= 10) {
    const successImpact = success ? 0.01 : -0.01;
    profile.confidenceScore = Math.max(0.3, Math.min(0.95, profile.confidenceScore + successImpact));
  }
}

/**
 * Get profile statistics
 */
export function getProfileStats(): {
  total: number;
  byConfidence: { high: number; medium: number; low: number };
  mostUsed: string[];
  highestEngagement: string[];
} {
  const sorted = [...TELUGU_STYLE_PROFILES].sort((a, b) => b.usageCount - a.usageCount);
  const byEngagement = [...TELUGU_STYLE_PROFILES].sort((a, b) => b.avgEngagement - a.avgEngagement);
  
  return {
    total: TELUGU_STYLE_PROFILES.length,
    byConfidence: {
      high: TELUGU_STYLE_PROFILES.filter(p => p.confidenceScore >= 0.8).length,
      medium: TELUGU_STYLE_PROFILES.filter(p => p.confidenceScore >= 0.6 && p.confidenceScore < 0.8).length,
      low: TELUGU_STYLE_PROFILES.filter(p => p.confidenceScore < 0.6).length,
    },
    mostUsed: sorted.slice(0, 3).map(p => p.id),
    highestEngagement: byEngagement.slice(0, 3).map(p => p.id),
  };
}

export default {
  TELUGU_STYLE_PROFILES,
  CONTENT_TYPE_MAPPINGS,
  AUDIENCE_MAPPINGS,
  getProfileById,
  getProfileForContentType,
  getProfileForSection,
  getProfilesForAudience,
  recordProfileUsage,
  getProfileStats,
};






