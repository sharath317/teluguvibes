/**
 * QUALITY GATES
 *
 * NON-NEGOTIABLE checks before content can be marked READY.
 * Content CANNOT be published unless ALL gates pass.
 */

import { createClient } from '@supabase/supabase-js';
import { hasPOV } from '../editorial/human-pov';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface GateResult {
  gate: string;
  passed: boolean;
  score: number;
  reason: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface QualityGatesResult {
  canPublish: boolean;
  overallScore: number;
  passedCount: number;
  totalGates: number;
  gates: GateResult[];
  blockingGates: string[];
  warningGates: string[];
}

export interface PostData {
  id: string;
  title?: string;
  title_te?: string;
  body_te?: string;
  telugu_body?: string;
  excerpt?: string;
  image_url?: string;
  category?: string;
  tags?: string[];
  genres?: string[];
  data_sources?: string[];
}

// ============================================================
// GATE THRESHOLDS
// ============================================================

const THRESHOLDS = {
  MIN_CONTENT_LENGTH: 300,
  MAX_CONTENT_LENGTH: 2000,
  MIN_TELUGU_PERCENTAGE: 20,
  MIN_GENRE_CONFIDENCE: 0.7,
  REQUIRED_SOURCES: 1,  // At least 1 high-trust source
};

// ============================================================
// INDIVIDUAL GATE CHECKS
// ============================================================

/**
 * Gate 1: Factual Correctness
 * Checks if content has been validated from trusted sources
 */
async function checkFactualCorrectness(post: PostData): Promise<GateResult> {
  const dataSources = post.data_sources || [];
  const highTrustSources = ['tmdb', 'wikidata', 'wikipedia', 'official'];
  
  const hasHighTrustSource = dataSources.some(s => 
    highTrustSources.includes(s.toLowerCase())
  );
  
  const multipleSourcesCount = dataSources.length;
  const score = hasHighTrustSource ? 
    (multipleSourcesCount >= 2 ? 100 : 75) : 
    (multipleSourcesCount >= 2 ? 50 : 25);

  return {
    gate: 'Factual Correctness',
    passed: hasHighTrustSource || multipleSourcesCount >= 2,
    score,
    reason: hasHighTrustSource 
      ? `Verified from ${dataSources.join(', ')}`
      : multipleSourcesCount >= 2
        ? `Cross-referenced from ${multipleSourcesCount} sources`
        : 'No trusted source verification',
    suggestion: !hasHighTrustSource ? 'Add TMDB or Wikipedia reference' : undefined,
    autoFixable: false,
  };
}

/**
 * Gate 2: Emotional Hook (Human POV)
 * MANDATORY: Content must have human perspective
 */
async function checkEmotionalHook(post: PostData): Promise<GateResult> {
  const hasPovContent = await hasPOV(post.id);
  
  // Also check for emotional markers in content
  const emotionalMarkers = [
    'నాస్టాల్జియా', 'గుర్తుకొస్తుంది', 'అభిమానులు', 'ఆనందం',
    'గర్వంగా', 'సంచలనం', 'చరిత్ర', 'ఎమోషనల్',
    'nostalgia', 'fans', 'pride', 'emotional', 'historic'
  ];
  
  const content = (post.body_te || post.telugu_body || '').toLowerCase();
  const hasEmotionalContent = emotionalMarkers.some(marker => 
    content.includes(marker.toLowerCase())
  );

  const score = hasPovContent ? 100 : (hasEmotionalContent ? 60 : 20);

  return {
    gate: 'Emotional Hook / Human POV',
    passed: hasPovContent,
    score,
    reason: hasPovContent 
      ? 'Human POV added by editor'
      : hasEmotionalContent
        ? 'Has emotional content but needs editor POV'
        : 'No human perspective detected',
    suggestion: !hasPovContent ? 'Add editorial perspective (2-4 sentences)' : undefined,
    autoFixable: false,
  };
}

/**
 * Gate 3: Image Relevance
 * Image must be from allowed source and relevant to content
 */
async function checkImageRelevance(post: PostData): Promise<GateResult> {
  const imageUrl = post.image_url;
  
  if (!imageUrl) {
    return {
      gate: 'Image Relevance',
      passed: false,
      score: 0,
      reason: 'No image attached',
      suggestion: 'Add an image from TMDB, Wikipedia, or Wikimedia',
      autoFixable: true,
    };
  }

  // Check source
  const allowedPatterns = [
    /image\.tmdb\.org/i,
    /upload\.wikimedia\.org/i,
    /wikipedia\.org/i,
    /unsplash\.com/i,
    /pexels\.com/i,
  ];

  const blockedPatterns = [
    /google\.(com|co\.\w+)\/images/i,
    /imdb\.com/i,
    /pinterest\./i,
    /instagram\.com.*\/p\//i,
  ];

  const isAllowed = allowedPatterns.some(p => p.test(imageUrl));
  const isBlocked = blockedPatterns.some(p => p.test(imageUrl));

  if (isBlocked) {
    return {
      gate: 'Image Relevance',
      passed: false,
      score: 0,
      reason: 'Image from blocked source (Google Images, IMDb, Pinterest, etc.)',
      suggestion: 'Replace with TMDB or Wikipedia image',
      autoFixable: true,
    };
  }

  const score = isAllowed ? 90 : 50;

  return {
    gate: 'Image Relevance',
    passed: true,
    score,
    reason: isAllowed ? 'Image from verified source' : 'Image source unknown but not blocked',
    autoFixable: false,
  };
}

/**
 * Gate 4: Content Depth
 * Content must meet minimum length and quality standards
 */
async function checkContentDepth(post: PostData): Promise<GateResult> {
  const content = post.body_te || post.telugu_body || '';
  const length = content.length;
  
  if (length < THRESHOLDS.MIN_CONTENT_LENGTH) {
    return {
      gate: 'Content Depth',
      passed: false,
      score: (length / THRESHOLDS.MIN_CONTENT_LENGTH) * 100,
      reason: `Content too short: ${length} chars (min: ${THRESHOLDS.MIN_CONTENT_LENGTH})`,
      suggestion: 'Expand content with more details, context, or analysis',
      autoFixable: true,
    };
  }

  if (length > THRESHOLDS.MAX_CONTENT_LENGTH) {
    return {
      gate: 'Content Depth',
      passed: true,  // Warning, not blocking
      score: 80,
      reason: `Content may be too long: ${length} chars (optimal: ${THRESHOLDS.MAX_CONTENT_LENGTH})`,
      suggestion: 'Consider condensing for better readability',
      autoFixable: true,
    };
  }

  // Check for substance (not just filler)
  const sentences = content.split(/[।.!?]+/).filter(s => s.trim().length > 10);
  const avgSentenceLength = content.length / Math.max(sentences.length, 1);

  const score = sentences.length >= 5 && avgSentenceLength > 30 ? 100 : 70;

  return {
    gate: 'Content Depth',
    passed: true,
    score,
    reason: `${sentences.length} sentences, avg length: ${Math.round(avgSentenceLength)} chars`,
    autoFixable: false,
  };
}

/**
 * Gate 5: Telugu Quality
 * Content must have sufficient Telugu text
 */
async function checkTeluguQuality(post: PostData): Promise<GateResult> {
  const content = post.body_te || post.telugu_body || '';
  
  // Count Telugu characters
  const teluguChars = (content.match(/[\u0C00-\u0C7F]/g) || []).length;
  const totalChars = content.replace(/\s/g, '').length;
  const teluguPercentage = totalChars > 0 ? (teluguChars / totalChars) * 100 : 0;

  if (teluguPercentage < THRESHOLDS.MIN_TELUGU_PERCENTAGE) {
    return {
      gate: 'Telugu Quality',
      passed: false,
      score: teluguPercentage * 5,
      reason: `Telugu content too low: ${teluguPercentage.toFixed(1)}% (min: ${THRESHOLDS.MIN_TELUGU_PERCENTAGE}%)`,
      suggestion: 'Increase Telugu text proportion or regenerate content',
      autoFixable: true,
    };
  }

  // Check for mojibake/garbled text
  const garbledPatterns = [
    /[\uFFFD]{3,}/,           // Replacement characters
    /[à-ÿ]{5,}/,              // Latin extended chars
    /(.)\1{10,}/,             // Same char repeated 10+ times
  ];

  const hasGarbledText = garbledPatterns.some(p => p.test(content));
  
  if (hasGarbledText) {
    return {
      gate: 'Telugu Quality',
      passed: false,
      score: 20,
      reason: 'Content appears to have encoding issues (garbled text)',
      suggestion: 'Regenerate content with proper Telugu encoding',
      autoFixable: true,
    };
  }

  return {
    gate: 'Telugu Quality',
    passed: true,
    score: Math.min(100, teluguPercentage * 2),
    reason: `Telugu content: ${teluguPercentage.toFixed(1)}%`,
    autoFixable: false,
  };
}

/**
 * Gate 6: Genre Accuracy (for movies/reviews)
 */
async function checkGenreAccuracy(post: PostData): Promise<GateResult> {
  const genres = post.genres || [];
  const category = post.category || '';

  // Only check for movie/review content
  if (!['movies', 'reviews', 'cinema'].includes(category.toLowerCase())) {
    return {
      gate: 'Genre Accuracy',
      passed: true,
      score: 100,
      reason: 'Not a movie/review - genre check skipped',
      autoFixable: false,
    };
  }

  if (genres.length === 0) {
    return {
      gate: 'Genre Accuracy',
      passed: false,
      score: 0,
      reason: 'No genres assigned',
      suggestion: 'Add at least 1-3 genres',
      autoFixable: true,
    };
  }

  const validGenres = new Set([
    'Action', 'Drama', 'Romance', 'Comedy', 'Thriller', 'Horror',
    'Family', 'Adventure', 'Crime', 'Fantasy', 'Science Fiction',
    'Musical', 'Documentary', 'Animation', 'Devotional', 'Mythological',
  ]);

  const validCount = genres.filter(g => validGenres.has(g)).length;
  const accuracy = validCount / genres.length;

  return {
    gate: 'Genre Accuracy',
    passed: accuracy >= THRESHOLDS.MIN_GENRE_CONFIDENCE,
    score: accuracy * 100,
    reason: `${validCount}/${genres.length} genres are valid`,
    suggestion: accuracy < THRESHOLDS.MIN_GENRE_CONFIDENCE ? 'Review and correct genre assignments' : undefined,
    autoFixable: true,
  };
}

/**
 * Gate 7: Telugu Emotion Score
 * Content should have cultural/emotional resonance
 */
async function checkTeluguEmotionScore(post: PostData): Promise<GateResult> {
  const content = (post.body_te || post.telugu_body || '').toLowerCase();
  
  // Emotional/cultural markers in Telugu content
  const emotionMarkers = {
    nostalgia: ['గుర్తుకొస్తుంది', 'పాత రోజులు', 'మధుర స్మృతులు', 'చిన్నతనం', 'throwback'],
    pride: ['గర్వంగా', 'గొప్ప', 'ఘనత', 'సాధన', 'విజయం', 'proud'],
    cultural: ['సంప్రదాయం', 'సంస్కృతి', 'తెలుగుతనం', 'పండుగ', 'traditional'],
    excitement: ['సంచలనం', 'అద్భుతం', 'అమోఘం', 'fantastic', 'amazing'],
    fandom: ['అభిమానులు', 'ఫ్యాన్స్', 'craze', 'fans', 'following'],
  };

  let totalScore = 0;
  const detectedEmotions: string[] = [];

  for (const [emotion, markers] of Object.entries(emotionMarkers)) {
    const hasEmotion = markers.some(m => content.includes(m.toLowerCase()));
    if (hasEmotion) {
      totalScore += 20;
      detectedEmotions.push(emotion);
    }
  }

  const score = Math.min(100, totalScore);

  return {
    gate: 'Telugu Emotion Score',
    passed: score >= 20,  // At least one emotion type
    score,
    reason: detectedEmotions.length > 0 
      ? `Emotional markers: ${detectedEmotions.join(', ')}`
      : 'No cultural/emotional markers detected',
    suggestion: score < 20 ? 'Add nostalgic, prideful, or culturally relevant content' : undefined,
    autoFixable: false,
  };
}

// ============================================================
// MAIN GATE CHECK FUNCTION
// ============================================================

export async function checkQualityGates(postId: string): Promise<QualityGatesResult> {
  // Fetch post data
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (error || !post) {
    return {
      canPublish: false,
      overallScore: 0,
      passedCount: 0,
      totalGates: 7,
      gates: [{
        gate: 'Post Fetch',
        passed: false,
        score: 0,
        reason: 'Post not found',
        autoFixable: false,
      }],
      blockingGates: ['Post not found'],
      warningGates: [],
    };
  }

  // Run all gate checks
  const gateResults = await Promise.all([
    checkFactualCorrectness(post),
    checkEmotionalHook(post),
    checkImageRelevance(post),
    checkContentDepth(post),
    checkTeluguQuality(post),
    checkGenreAccuracy(post),
    checkTeluguEmotionScore(post),
  ]);

  // Calculate results
  const passedCount = gateResults.filter(g => g.passed).length;
  const overallScore = gateResults.reduce((sum, g) => sum + g.score, 0) / gateResults.length;
  
  const blockingGates = gateResults
    .filter(g => !g.passed)
    .map(g => g.gate);

  const warningGates = gateResults
    .filter(g => g.passed && g.score < 70)
    .map(g => g.gate);

  // Determine if can publish
  // CRITICAL: Emotional Hook (Human POV) is MANDATORY
  const humanPovGate = gateResults.find(g => g.gate === 'Emotional Hook / Human POV');
  const canPublish = passedCount === gateResults.length && humanPovGate?.passed === true;

  return {
    canPublish,
    overallScore,
    passedCount,
    totalGates: gateResults.length,
    gates: gateResults,
    blockingGates,
    warningGates,
  };
}

/**
 * Quick check if post can be published
 */
export async function canPublishPost(postId: string): Promise<boolean> {
  const result = await checkQualityGates(postId);
  return result.canPublish;
}

/**
 * Get explanation for why post cannot be published
 */
export async function getPublishBlockReasons(postId: string): Promise<{
  blocked: boolean;
  reasons: string[];
  suggestions: string[];
}> {
  const result = await checkQualityGates(postId);
  
  if (result.canPublish) {
    return { blocked: false, reasons: [], suggestions: [] };
  }

  const failedGates = result.gates.filter(g => !g.passed);
  
  return {
    blocked: true,
    reasons: failedGates.map(g => g.reason),
    suggestions: failedGates.map(g => g.suggestion).filter(Boolean) as string[],
  };
}

/**
 * Get auto-fixable issues for a post
 */
export async function getAutoFixableIssues(postId: string): Promise<{
  gate: string;
  issue: string;
  action: string;
}[]> {
  const result = await checkQualityGates(postId);
  
  return result.gates
    .filter(g => !g.passed && g.autoFixable)
    .map(g => ({
      gate: g.gate,
      issue: g.reason,
      action: g.suggestion || 'Auto-fix available',
    }));
}

// ============================================================
// CONFIDENCE-DRIVEN PUBLISHING GATES
// ============================================================

/**
 * Confidence thresholds for content publishing decisions
 * - AUTO_PUBLISH: ≥0.82 → Content is auto-approved for publishing
 * - NEEDS_REVIEW: 0.65-0.82 → Content requires human review
 * - BLOCK: <0.65 → Content is blocked until confidence improves
 */
export const CONFIDENCE_THRESHOLDS = {
  AUTO_PUBLISH: 0.82,
  NEEDS_REVIEW: 0.65,
  BLOCK: 0.65
} as const;

export type ConfidenceDecision = 'publish' | 'review' | 'block';

export interface ConfidenceGateResult {
  decision: ConfidenceDecision;
  confidence: number;
  threshold_used: keyof typeof CONFIDENCE_THRESHOLDS;
  reason: string;
  can_override: boolean;
}

/**
 * Determine publishing decision based on confidence score
 */
export function enforceConfidenceGate(confidence: number): ConfidenceDecision {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_PUBLISH) {
    return 'publish';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.NEEDS_REVIEW) {
    return 'review';
  }
  return 'block';
}

/**
 * Get detailed confidence gate result with explanation
 */
export function getConfidenceGateResult(confidence: number): ConfidenceGateResult {
  const decision = enforceConfidenceGate(confidence);
  
  switch (decision) {
    case 'publish':
      return {
        decision,
        confidence,
        threshold_used: 'AUTO_PUBLISH',
        reason: `Confidence ${(confidence * 100).toFixed(1)}% meets auto-publish threshold (≥${CONFIDENCE_THRESHOLDS.AUTO_PUBLISH * 100}%)`,
        can_override: false
      };
    case 'review':
      return {
        decision,
        confidence,
        threshold_used: 'NEEDS_REVIEW',
        reason: `Confidence ${(confidence * 100).toFixed(1)}% requires human review (${CONFIDENCE_THRESHOLDS.NEEDS_REVIEW * 100}-${CONFIDENCE_THRESHOLDS.AUTO_PUBLISH * 100}%)`,
        can_override: true
      };
    case 'block':
      return {
        decision,
        confidence,
        threshold_used: 'BLOCK',
        reason: `Confidence ${(confidence * 100).toFixed(1)}% is below minimum threshold (<${CONFIDENCE_THRESHOLDS.BLOCK * 100}%)`,
        can_override: false
      };
  }
}

/**
 * Apply confidence gate to content and update its status
 */
export async function applyConfidenceGateToContent(
  contentId: string,
  confidence: number,
  contentType: 'post' | 'movie' | 'review' = 'post'
): Promise<{
  success: boolean;
  gate_result: ConfidenceGateResult;
  status_updated: string | null;
  error?: string;
}> {
  const gateResult = getConfidenceGateResult(confidence);
  
  // Determine table based on content type
  const table = contentType === 'post' ? 'posts' 
    : contentType === 'movie' ? 'movies' 
    : 'movie_reviews';
  
  // Determine status based on decision
  const newStatus = gateResult.decision === 'publish' ? 'READY'
    : gateResult.decision === 'review' ? 'NEEDS_REVIEW'
    : 'BLOCKED';
  
  try {
    const { error } = await supabase
      .from(table)
      .update({ 
        status: newStatus,
        confidence_score: confidence,
        confidence_decision: gateResult.decision,
        confidence_updated_at: new Date().toISOString()
      })
      .eq('id', contentId);
    
    if (error) {
      return {
        success: false,
        gate_result: gateResult,
        status_updated: null,
        error: error.message
      };
    }
    
    return {
      success: true,
      gate_result: gateResult,
      status_updated: newStatus
    };
  } catch (err) {
    return {
      success: false,
      gate_result: gateResult,
      status_updated: null,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Batch apply confidence gates to multiple content items
 */
export async function batchApplyConfidenceGates(
  items: Array<{ id: string; confidence: number; type?: 'post' | 'movie' | 'review' }>
): Promise<{
  total: number;
  published: number;
  needs_review: number;
  blocked: number;
  errors: number;
}> {
  const stats = {
    total: items.length,
    published: 0,
    needs_review: 0,
    blocked: 0,
    errors: 0
  };
  
  for (const item of items) {
    const result = await applyConfidenceGateToContent(
      item.id,
      item.confidence,
      item.type || 'post'
    );
    
    if (!result.success) {
      stats.errors++;
      continue;
    }
    
    switch (result.gate_result.decision) {
      case 'publish':
        stats.published++;
        break;
      case 'review':
        stats.needs_review++;
        break;
      case 'block':
        stats.blocked++;
        break;
    }
  }
  
  return stats;
}

/**
 * Calculate aggregate confidence from multiple signals
 */
export function calculateAggregateConfidence(signals: {
  source_confidence?: number;      // From data source (TMDB, Wikipedia)
  content_quality?: number;        // From quality gates
  image_quality?: number;          // From image validation
  entity_match?: number;           // From entity resolution
  fact_validation?: number;        // From fact checker
}): number {
  const weights = {
    source_confidence: 0.25,
    content_quality: 0.25,
    image_quality: 0.15,
    entity_match: 0.20,
    fact_validation: 0.15
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    const value = signals[key as keyof typeof signals];
    if (value !== undefined) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}


