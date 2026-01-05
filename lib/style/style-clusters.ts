/**
 * Style Clusters Module
 * 
 * Groups writing styles into distinct clusters:
 * - Emotional-Soft: Fan-connect, nostalgic, gradual build
 * - Mass-Punchy: Short sentences, high impact, exclamation heavy
 * - Glamour-Poetic: Flowing descriptions, sensory language
 * - News-Neutral: Factual, balanced, informative
 * - Nostalgia-Heavy: Throwback focused, memory triggers
 * 
 * Each cluster defines a style profile that templates can inherit.
 */

import { WriterStyleSignal, PREDEFINED_STYLE_SIGNALS, compareStyleSignals } from './writer-signals';

// ============================================================
// TYPES
// ============================================================

export interface StyleCluster {
  id: string;
  name: string;
  displayName: string;
  displayNameTe: string;
  description: string;
  descriptionTe: string;
  
  // Core profile
  profile: StyleProfile;
  
  // Usage guidance
  bestFor: string[];         // Content types this style works best for
  avoid: string[];           // Content types to avoid with this style
  targetAudience: string;
  
  // Reference signals (which predefined styles belong here)
  referenceSignalIds: string[];
  
  // Performance tracking
  usageCount: number;
  avgSuccessRate: number;
  lastUsedAt: Date | null;
}

export interface StyleProfile {
  // Rhythm
  rhythm: 'fast' | 'moderate' | 'slow';
  rhythmDescription: string;
  
  // Emotional
  emotionalIntensity: 'low' | 'medium' | 'high';
  emotionalCurve: 'build_up' | 'steady' | 'peak_early' | 'wave';
  
  // Sentence patterns
  sentenceVariance: 'low' | 'medium' | 'high';
  avgSentenceLength: 'short' | 'medium' | 'long';  // <60, 60-90, >90 chars
  punchyRatio: number;  // 0-1, how many short impactful sentences
  
  // Structure
  introPattern: 'hook' | 'context' | 'question' | 'dramatic' | 'factual';
  bodyPattern: 'flowing' | 'punchy' | 'mixed' | 'structured';
  closingPattern: 'cta' | 'emotional' | 'factual' | 'question' | 'prediction';
  
  // Language
  teluguPurity: 'high' | 'mixed' | 'english_heavy';  // How pure Telugu vs English mix
  formalityLevel: 'formal' | 'casual' | 'conversational';
  
  // Special elements
  nostalgiaLevel: 'none' | 'subtle' | 'prominent';
  fanConnectLevel: 'none' | 'subtle' | 'prominent';
  glamourLevel: 'none' | 'subtle' | 'prominent';
  
  // Suggested word count
  minWordCount: number;
  maxWordCount: number;
  optimalWordCount: number;
}

// ============================================================
// STYLE CLUSTER DEFINITIONS
// ============================================================

export const STYLE_CLUSTERS: StyleCluster[] = [
  {
    id: 'emotional_soft',
    name: 'Emotional-Soft',
    displayName: 'Emotional-Soft',
    displayNameTe: 'భావోద్వేగ-సున్నితం',
    description: 'Gradual emotional build-up with strong fan connect and nostalgic undertones',
    descriptionTe: 'క్రమంగా భావోద్వేగ పెరుగుదల, అభిమాన సంబంధం మరియు నాస్టాల్జిక్ టోన్',
    profile: {
      rhythm: 'moderate',
      rhythmDescription: 'Gentle flow with occasional pauses for emotional impact',
      emotionalIntensity: 'high',
      emotionalCurve: 'build_up',
      sentenceVariance: 'medium',
      avgSentenceLength: 'medium',
      punchyRatio: 0.25,
      introPattern: 'hook',
      bodyPattern: 'flowing',
      closingPattern: 'emotional',
      teluguPurity: 'high',
      formalityLevel: 'conversational',
      nostalgiaLevel: 'prominent',
      fanConnectLevel: 'prominent',
      glamourLevel: 'subtle',
      minWordCount: 250,
      maxWordCount: 450,
      optimalWordCount: 350,
    },
    bestFor: ['celebrity features', 'throwback posts', 'fan appreciation', 'milestone celebrations'],
    avoid: ['breaking news', 'controversy', 'factual updates'],
    targetAudience: 'Devoted fans seeking emotional connection',
    referenceSignalIds: ['emotional_soft', 'nostalgia_heavy'],
    usageCount: 0,
    avgSuccessRate: 0,
    lastUsedAt: null,
  },
  
  {
    id: 'mass_punchy',
    name: 'Mass-Punchy',
    displayName: 'Mass-Punchy',
    displayNameTe: 'మాస్-పంచీ',
    description: 'Short, impactful sentences with high energy and excitement',
    descriptionTe: 'చిన్న, ప్రభావశీల వాక్యాలు, అధిక శక్తి మరియు ఉత్సాహం',
    profile: {
      rhythm: 'fast',
      rhythmDescription: 'Rapid-fire delivery with punch lines',
      emotionalIntensity: 'high',
      emotionalCurve: 'peak_early',
      sentenceVariance: 'high',
      avgSentenceLength: 'short',
      punchyRatio: 0.5,
      introPattern: 'dramatic',
      bodyPattern: 'punchy',
      closingPattern: 'cta',
      teluguPurity: 'mixed',
      formalityLevel: 'casual',
      nostalgiaLevel: 'none',
      fanConnectLevel: 'subtle',
      glamourLevel: 'prominent',
      minWordCount: 150,
      maxWordCount: 300,
      optimalWordCount: 200,
    },
    bestFor: ['hot news', 'viral content', 'glamour updates', 'trending topics'],
    avoid: ['analytical pieces', 'nostalgic content', 'formal interviews'],
    targetAudience: 'Casual browsers seeking quick entertainment',
    referenceSignalIds: ['mass_punchy'],
    usageCount: 0,
    avgSuccessRate: 0,
    lastUsedAt: null,
  },
  
  {
    id: 'glamour_poetic',
    name: 'Glamour-Poetic',
    displayName: 'Glamour-Poetic',
    displayNameTe: 'గ్లామర్-కావ్య',
    description: 'Flowing, descriptive style celebrating beauty and elegance',
    descriptionTe: 'ప్రవాహ, వర్ణనాత్మక శైలి - అందం మరియు సొగసు వేడుక',
    profile: {
      rhythm: 'slow',
      rhythmDescription: 'Leisurely pace with rich descriptions',
      emotionalIntensity: 'medium',
      emotionalCurve: 'wave',
      sentenceVariance: 'high',
      avgSentenceLength: 'long',
      punchyRatio: 0.15,
      introPattern: 'context',
      bodyPattern: 'flowing',
      closingPattern: 'emotional',
      teluguPurity: 'mixed',
      formalityLevel: 'conversational',
      nostalgiaLevel: 'subtle',
      fanConnectLevel: 'subtle',
      glamourLevel: 'prominent',
      minWordCount: 300,
      maxWordCount: 500,
      optimalWordCount: 400,
    },
    bestFor: ['photoshoot features', 'fashion events', 'red carpet', 'beauty appreciation'],
    avoid: ['news updates', 'controversy', 'sports'],
    targetAudience: 'Beauty and fashion enthusiasts',
    referenceSignalIds: ['glamour_poetic'],
    usageCount: 0,
    avgSuccessRate: 0,
    lastUsedAt: null,
  },
  
  {
    id: 'news_neutral',
    name: 'News-Neutral',
    displayName: 'News-Neutral',
    displayNameTe: 'వార్త-తటస్థ',
    description: 'Factual, balanced reporting with minimal emotional embellishment',
    descriptionTe: 'వాస్తవ, సమతుల్య నివేదిక - కనీస భావోద్వేగ అలంకారం',
    profile: {
      rhythm: 'moderate',
      rhythmDescription: 'Steady, informative flow',
      emotionalIntensity: 'low',
      emotionalCurve: 'steady',
      sentenceVariance: 'low',
      avgSentenceLength: 'medium',
      punchyRatio: 0.1,
      introPattern: 'factual',
      bodyPattern: 'structured',
      closingPattern: 'factual',
      teluguPurity: 'high',
      formalityLevel: 'formal',
      nostalgiaLevel: 'none',
      fanConnectLevel: 'none',
      glamourLevel: 'none',
      minWordCount: 200,
      maxWordCount: 400,
      optimalWordCount: 300,
    },
    bestFor: ['news updates', 'announcements', 'releases', 'official statements'],
    avoid: ['fan content', 'glamour posts', 'nostalgic pieces'],
    targetAudience: 'Readers seeking factual information',
    referenceSignalIds: ['news_neutral'],
    usageCount: 0,
    avgSuccessRate: 0,
    lastUsedAt: null,
  },
  
  {
    id: 'nostalgia_heavy',
    name: 'Nostalgia-Heavy',
    displayName: 'Nostalgia-Heavy',
    displayNameTe: 'నాస్టాల్జియా-భారీ',
    description: 'Deeply nostalgic with strong throwback elements and memory triggers',
    descriptionTe: 'లోతైన నాస్టాల్జిక్, బలమైన త్రోబ్యాక్ అంశాలు మరియు జ్ఞాపక ట్రిగ్గర్లు',
    profile: {
      rhythm: 'slow',
      rhythmDescription: 'Reflective pace with memory pauses',
      emotionalIntensity: 'high',
      emotionalCurve: 'build_up',
      sentenceVariance: 'medium',
      avgSentenceLength: 'medium',
      punchyRatio: 0.2,
      introPattern: 'hook',
      bodyPattern: 'flowing',
      closingPattern: 'emotional',
      teluguPurity: 'high',
      formalityLevel: 'conversational',
      nostalgiaLevel: 'prominent',
      fanConnectLevel: 'prominent',
      glamourLevel: 'subtle',
      minWordCount: 300,
      maxWordCount: 500,
      optimalWordCount: 400,
    },
    bestFor: ['throwback posts', 'classic movie mentions', 'career retrospectives', 'anniversary features'],
    avoid: ['hot news', 'current events', 'controversy'],
    targetAudience: 'Long-time fans and nostalgic readers',
    referenceSignalIds: ['nostalgia_heavy', 'emotional_soft'],
    usageCount: 0,
    avgSuccessRate: 0,
    lastUsedAt: null,
  },
];

// ============================================================
// CLUSTER SELECTION FUNCTIONS
// ============================================================

/**
 * Get cluster by ID
 */
export function getClusterById(clusterId: string): StyleCluster | undefined {
  return STYLE_CLUSTERS.find(c => c.id === clusterId);
}

/**
 * Get best cluster for a content type
 */
export function getBestClusterForContent(
  contentType: string,
  options?: {
    preferNostalgia?: boolean;
    preferGlamour?: boolean;
    isBreakingNews?: boolean;
    emotionalIntensity?: 'low' | 'medium' | 'high';
  }
): StyleCluster {
  const lowerType = contentType.toLowerCase();
  
  // Direct matches
  if (lowerType.includes('throwback') || lowerType.includes('classic') || options?.preferNostalgia) {
    return getClusterById('nostalgia_heavy')!;
  }
  
  if (lowerType.includes('photoshoot') || lowerType.includes('fashion') || lowerType.includes('beauty')) {
    return getClusterById('glamour_poetic')!;
  }
  
  if (options?.isBreakingNews || lowerType.includes('viral') || lowerType.includes('hot')) {
    return getClusterById('mass_punchy')!;
  }
  
  if (lowerType.includes('news') || lowerType.includes('update') || lowerType.includes('release')) {
    return getClusterById('news_neutral')!;
  }
  
  if (lowerType.includes('fan') || lowerType.includes('celebration') || lowerType.includes('milestone')) {
    return getClusterById('emotional_soft')!;
  }
  
  // Default based on emotional intensity
  if (options?.emotionalIntensity === 'high') {
    return getClusterById('emotional_soft')!;
  }
  
  if (options?.preferGlamour) {
    return getClusterById('glamour_poetic')!;
  }
  
  // Default to emotional soft for entertainment content
  return getClusterById('emotional_soft')!;
}

/**
 * Find cluster that best matches a style signal
 */
export function matchSignalToCluster(signal: WriterStyleSignal): StyleCluster {
  let bestMatch: StyleCluster = STYLE_CLUSTERS[0];
  let bestScore = 0;
  
  for (const cluster of STYLE_CLUSTERS) {
    // Get reference signals for this cluster
    const refSignals = cluster.referenceSignalIds
      .map(id => PREDEFINED_STYLE_SIGNALS.find(s => s.siteId === id))
      .filter(Boolean) as WriterStyleSignal[];
    
    // Calculate average similarity
    if (refSignals.length > 0) {
      const avgSimilarity = refSignals.reduce((sum, ref) => 
        sum + compareStyleSignals(signal, ref), 0
      ) / refSignals.length;
      
      if (avgSimilarity > bestScore) {
        bestScore = avgSimilarity;
        bestMatch = cluster;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Get cluster recommendations based on past performance
 */
export function getClusterRecommendations(
  category: string
): { cluster: StyleCluster; reason: string }[] {
  const recommendations: { cluster: StyleCluster; reason: string }[] = [];
  
  // Category-based recommendations
  const categoryMappings: Record<string, string[]> = {
    'hot': ['mass_punchy', 'glamour_poetic'],
    'entertainment': ['emotional_soft', 'nostalgia_heavy'],
    'gossip': ['mass_punchy', 'emotional_soft'],
    'movies': ['emotional_soft', 'news_neutral'],
    'reviews': ['news_neutral', 'emotional_soft'],
    'trending': ['mass_punchy', 'emotional_soft'],
    'sports': ['news_neutral', 'mass_punchy'],
    'politics': ['news_neutral'],
  };
  
  const clusterIds = categoryMappings[category] || ['emotional_soft'];
  
  for (const clusterId of clusterIds) {
    const cluster = getClusterById(clusterId);
    if (cluster) {
      recommendations.push({
        cluster,
        reason: `Best for ${category} content based on style analysis`,
      });
    }
  }
  
  return recommendations;
}

// ============================================================
// PROFILE EXTRACTION
// ============================================================

/**
 * Extract template parameters from a cluster profile
 */
export function extractTemplateParams(cluster: StyleCluster): {
  sentenceTarget: number;
  wordCount: { min: number; max: number; optimal: number };
  emotionProgression: string[];
  introType: string;
  closingType: string;
  punchyRatio: number;
  teluguRatio: number;
} {
  const profile = cluster.profile;
  
  // Map sentence length to character count
  const sentenceTargets = {
    short: 50,
    medium: 75,
    long: 95,
  };
  
  // Map emotion curve to progression
  const emotionProgressions: Record<string, string[]> = {
    build_up: ['calm', 'rising', 'peak', 'warm'],
    steady: ['neutral', 'neutral', 'neutral', 'neutral'],
    peak_early: ['peak', 'high', 'moderate', 'closing'],
    wave: ['rising', 'peak', 'falling', 'rising_again'],
  };
  
  // Map Telugu purity to ratio
  const teluguRatios = {
    high: 0.85,
    mixed: 0.7,
    english_heavy: 0.5,
  };
  
  return {
    sentenceTarget: sentenceTargets[profile.avgSentenceLength],
    wordCount: {
      min: profile.minWordCount,
      max: profile.maxWordCount,
      optimal: profile.optimalWordCount,
    },
    emotionProgression: emotionProgressions[profile.emotionalCurve],
    introType: profile.introPattern,
    closingType: profile.closingPattern,
    punchyRatio: profile.punchyRatio,
    teluguRatio: teluguRatios[profile.teluguPurity],
  };
}

export default {
  STYLE_CLUSTERS,
  getClusterById,
  getBestClusterForContent,
  matchSignalToCluster,
  getClusterRecommendations,
  extractTemplateParams,
};






