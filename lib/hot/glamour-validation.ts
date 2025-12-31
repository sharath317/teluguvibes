/**
 * Glamour-Specific Validation Rules
 * 
 * Extends the quality gates system with rules specific to hot/glamour content:
 * - Actress identity correctness
 * - Image relevance scoring
 * - Sensuality threshold (AdSense-safe)
 * - Telugu language quality
 * - Content length optimization
 */

import { checkContentSafety, type SafetyCheckInput } from '../hot-media/safety-checker';

// Types
export interface GlamourValidationResult {
  isValid: boolean;
  status: 'READY' | 'NEEDS_REWORK' | 'REJECTED';
  score: number; // 0-100
  checks: GlamourCheck[];
  suggestions: string[];
  variants?: ContentVariant[];
}

export interface GlamourCheck {
  name: string;
  passed: boolean;
  score: number;
  reason: string;
  autoFixable: boolean;
}

export interface ContentVariant {
  id: number;
  caption: string;
  score: number;
  style: 'glam' | 'fashion' | 'bold' | 'elegant' | 'viral';
}

export interface GlamourContent {
  entity_name: string;
  entity_type?: 'actress' | 'anchor' | 'model' | 'influencer';
  caption: string;
  caption_te?: string;
  category: string;
  tags: string[];
  image_url?: string;
  platform?: string;
  confidence_score?: number;
}

// Validation thresholds
const THRESHOLDS = {
  minCaptionLength: 20,
  maxCaptionLength: 150,
  minTags: 3,
  maxTags: 10,
  minConfidence: 60,
  minTeluguPercentage: 30,
  minIdentityScore: 70,
};

// Known actress names for identity verification
const KNOWN_ACTRESSES = new Set([
  'samantha', 'rashmika', 'pooja hegde', 'kajal', 'tamannaah', 'tamannah',
  'anupama', 'keerthy', 'shruti', 'nayanthara', 'sai pallavi', 'nabha',
  'krithi', 'sreeleela', 'rakul', 'kiara', 'janhvi', 'shriya', 'nithya',
  'regina', 'lavanya', 'hansika', 'trisha', 'pragya', 'ileana', 'amy',
  'rashi', 'raashi', 'vedhika', 'mehreen', 'ritu', 'priya', 'niveda',
  'divi', 'kavya', 'malavika', 'srijla', 'mrunal', 'kalyani', 'saniya',
]);

// Known anchors/hosts
const KNOWN_ANCHORS = new Set([
  'sreemukhi', 'anasuya', 'rashmi', 'suma', 'lasya', 'vishnu priya',
  'udaya bhanu', 'jhansi', 'varshini', 'manjusha', 'syamala',
]);

// Telugu detection patterns
const TELUGU_PATTERNS = [
  /[\u0C00-\u0C7F]+/, // Telugu Unicode range
  /లో|గా|తో|కు|ను|ని|లు|లా/,
  /అందం|స్టన్నింగ్|గార్జియస్|హాట్|బ్యూటీ|ఫోటోషూట్|ఫ్యాషన్/,
];

// AdSense-safe glam keywords (positive indicators)
const SAFE_GLAM_TERMS = [
  'photoshoot', 'fashion', 'style', 'elegant', 'graceful', 'stunning',
  'gorgeous', 'beautiful', 'radiant', 'glamorous', 'chic', 'trendy',
  'event', 'premiere', 'launch', 'award', 'magazine', 'cover',
  'traditional', 'saree', 'ethnic', 'fitness', 'yoga', 'wellness',
];

// Suggestive but still AdSense-safe terms (use sparingly)
const BORDERLINE_TERMS = [
  'hot', 'sizzling', 'bold', 'daring', 'fierce', 'sultry', 'sensuous',
  'bikini', 'swimwear', 'beach', 'vacation', 'pool', 'summer',
];

// Terms to avoid completely
const UNSAFE_TERMS = [
  'sexy', 'seductive', 'intimate', 'revealing', 'provocative', 'risque',
  'nude', 'naked', 'explicit', 'adult', 'nsfw', 'x-rated',
];

/**
 * Check if entity name matches a known celebrity
 */
function checkActressIdentity(entityName: string, entityType?: string): GlamourCheck {
  const lowerName = entityName.toLowerCase();
  
  // Extract first name/last name parts
  const nameParts = lowerName.split(/\s+/);
  
  let isKnown = false;
  let matchedName = '';
  
  // Check against known actresses
  if (!entityType || entityType === 'actress') {
    for (const actress of KNOWN_ACTRESSES) {
      if (nameParts.some(part => actress.includes(part) || part.includes(actress))) {
        isKnown = true;
        matchedName = actress;
        break;
      }
    }
  }
  
  // Check against known anchors
  if (!entityType || entityType === 'anchor') {
    for (const anchor of KNOWN_ANCHORS) {
      if (nameParts.some(part => anchor.includes(part) || part.includes(anchor))) {
        isKnown = true;
        matchedName = anchor;
        break;
      }
    }
  }
  
  const score = isKnown ? 100 : 50;
  
  return {
    name: 'actress_identity',
    passed: isKnown,
    score,
    reason: isKnown 
      ? `Verified celebrity: ${matchedName}`
      : `Unknown celebrity: ${entityName} - verify manually`,
    autoFixable: false,
  };
}

/**
 * Check image relevance (URL patterns, source quality)
 */
function checkImageRelevance(imageUrl?: string, platform?: string): GlamourCheck {
  if (!imageUrl) {
    return {
      name: 'image_relevance',
      passed: false,
      score: 0,
      reason: 'No image URL provided',
      autoFixable: true,
    };
  }
  
  let score = 50; // Base score
  const reasons: string[] = [];
  
  // High-quality source indicators
  if (imageUrl.includes('tmdb') || imageUrl.includes('themoviedb')) {
    score += 25;
    reasons.push('TMDB source (high quality)');
  }
  
  if (imageUrl.includes('wikimedia') || imageUrl.includes('wikipedia')) {
    score += 20;
    reasons.push('Wikimedia source (licensed)');
  }
  
  if (imageUrl.includes('instagram') || platform === 'instagram') {
    score += 15;
    reasons.push('Instagram oEmbed');
  }
  
  // Quality indicators in URL
  if (imageUrl.includes('/original/') || imageUrl.includes('_original')) {
    score += 10;
    reasons.push('Original resolution');
  }
  
  // Negative indicators
  if (imageUrl.includes('thumbnail') || imageUrl.includes('thumb')) {
    score -= 10;
    reasons.push('Thumbnail only');
  }
  
  const passed = score >= THRESHOLDS.minConfidence;
  
  return {
    name: 'image_relevance',
    passed,
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.length > 0 ? reasons.join(', ') : 'Standard image source',
    autoFixable: !passed,
  };
}

/**
 * Check sensuality threshold (AdSense-safe)
 */
function checkSensualityThreshold(caption: string, category: string, tags: string[]): GlamourCheck {
  const allText = `${caption} ${category} ${tags.join(' ')}`.toLowerCase();
  
  let score = 100;
  const issues: string[] = [];
  
  // Check for unsafe terms
  for (const term of UNSAFE_TERMS) {
    if (allText.includes(term)) {
      score -= 40;
      issues.push(`Unsafe term: "${term}"`);
    }
  }
  
  // Check borderline terms (mild penalty)
  let borderlineCount = 0;
  for (const term of BORDERLINE_TERMS) {
    if (allText.includes(term)) {
      borderlineCount++;
    }
  }
  
  if (borderlineCount > 3) {
    score -= (borderlineCount - 3) * 10;
    issues.push(`Too many bold terms (${borderlineCount})`);
  }
  
  // Boost for safe glam terms
  let safeCount = 0;
  for (const term of SAFE_GLAM_TERMS) {
    if (allText.includes(term)) {
      safeCount++;
    }
  }
  
  if (safeCount > 0) {
    score += Math.min(10, safeCount * 2);
  }
  
  const passed = score >= 60;
  
  return {
    name: 'sensuality_threshold',
    passed,
    score: Math.min(100, Math.max(0, score)),
    reason: passed 
      ? (safeCount > 0 ? `AdSense-safe with ${safeCount} positive terms` : 'Neutral content')
      : issues.join(', '),
    autoFixable: true,
  };
}

/**
 * Check Telugu language quality
 */
function checkTeluguQuality(captionTe?: string): GlamourCheck {
  if (!captionTe) {
    return {
      name: 'telugu_quality',
      passed: true,
      score: 50,
      reason: 'No Telugu caption (optional)',
      autoFixable: true,
    };
  }
  
  let score = 0;
  const reasons: string[] = [];
  
  // Check for Telugu Unicode characters
  const teluguMatch = captionTe.match(/[\u0C00-\u0C7F]+/g);
  const teluguCharCount = teluguMatch ? teluguMatch.join('').length : 0;
  const totalCharCount = captionTe.replace(/\s/g, '').length;
  
  const teluguPercentage = totalCharCount > 0 
    ? (teluguCharCount / totalCharCount) * 100 
    : 0;
  
  if (teluguPercentage >= THRESHOLDS.minTeluguPercentage) {
    score += 50;
    reasons.push(`${Math.round(teluguPercentage)}% Telugu text`);
  } else {
    reasons.push(`Only ${Math.round(teluguPercentage)}% Telugu (min ${THRESHOLDS.minTeluguPercentage}%)`);
  }
  
  // Check for common glam Telugu words
  const glamTeluguWords = ['అందం', 'స్టన్నింగ్', 'గార్జియస్', 'ఫోటోషూట్', 'ఫ్యాషన్', 'బ్యూటీ', 'అద్భుతం'];
  let glamWordCount = 0;
  for (const word of glamTeluguWords) {
    if (captionTe.includes(word)) {
      glamWordCount++;
    }
  }
  
  if (glamWordCount > 0) {
    score += 30;
    reasons.push(`${glamWordCount} glam keywords`);
  }
  
  // Length check
  if (captionTe.length >= THRESHOLDS.minCaptionLength) {
    score += 20;
  } else {
    reasons.push('Caption too short');
  }
  
  const passed = score >= 50;
  
  return {
    name: 'telugu_quality',
    passed,
    score: Math.min(100, score),
    reason: reasons.join(', '),
    autoFixable: true,
  };
}

/**
 * Check content length optimization
 */
function checkContentLength(caption: string, tags: string[]): GlamourCheck {
  const issues: string[] = [];
  let score = 100;
  
  // Caption length
  if (caption.length < THRESHOLDS.minCaptionLength) {
    score -= 30;
    issues.push(`Caption too short (${caption.length}/${THRESHOLDS.minCaptionLength} chars)`);
  } else if (caption.length > THRESHOLDS.maxCaptionLength) {
    score -= 20;
    issues.push(`Caption too long (${caption.length}/${THRESHOLDS.maxCaptionLength} chars)`);
  }
  
  // Tags count
  if (tags.length < THRESHOLDS.minTags) {
    score -= 20;
    issues.push(`Not enough tags (${tags.length}/${THRESHOLDS.minTags} min)`);
  } else if (tags.length > THRESHOLDS.maxTags) {
    score -= 10;
    issues.push(`Too many tags (${tags.length}/${THRESHOLDS.maxTags} max)`);
  }
  
  const passed = score >= 60;
  
  return {
    name: 'content_length',
    passed,
    score,
    reason: passed ? 'Optimal length' : issues.join(', '),
    autoFixable: true,
  };
}

/**
 * Generate content variants for items that need rework
 */
function generateVariants(content: GlamourContent, failedChecks: GlamourCheck[]): ContentVariant[] {
  const variants: ContentVariant[] = [];
  const { entity_name, category } = content;
  
  const styles: Array<{ style: ContentVariant['style']; template: string; emoji: string }> = [
    { style: 'glam', template: `✨ ${entity_name} లేటెస్ట్ ${category} లుక్ - అద్భుతంగా!`, emoji: '✨' },
    { style: 'fashion', template: `👗 ${entity_name} ఫ్యాషన్ స్టేట్‌మెంట్ - స్టైలిష్!`, emoji: '👗' },
    { style: 'bold', template: `🔥 ${entity_name} బోల్డ్ లుక్ - ట్రెండింగ్!`, emoji: '🔥' },
    { style: 'elegant', template: `🌟 ${entity_name} ఎలిగెంట్ ఫోటోలు - గార్జియస్!`, emoji: '🌟' },
    { style: 'viral', template: `💫 ${entity_name} వైరల్ ఫోటో - అందరూ చూడాల్సిందే!`, emoji: '💫' },
  ];
  
  for (let i = 0; i < Math.min(3, styles.length); i++) {
    const { style, template, emoji } = styles[i];
    variants.push({
      id: i + 1,
      caption: template,
      score: 75 + (10 - i * 5),
      style,
    });
  }
  
  return variants;
}

/**
 * Main validation function for glamour content
 */
export function validateGlamourContent(content: GlamourContent): GlamourValidationResult {
  const checks: GlamourCheck[] = [];
  
  // Run all checks
  checks.push(checkActressIdentity(content.entity_name, content.entity_type));
  checks.push(checkImageRelevance(content.image_url, content.platform));
  checks.push(checkSensualityThreshold(content.caption, content.category, content.tags));
  checks.push(checkTeluguQuality(content.caption_te));
  checks.push(checkContentLength(content.caption, content.tags));
  
  // Calculate overall score
  const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
  const avgScore = Math.round(totalScore / checks.length);
  
  // Determine status
  const failedChecks = checks.filter(c => !c.passed);
  const criticalFailures = failedChecks.filter(c => 
    c.name === 'sensuality_threshold' && c.score < 50
  );
  
  let status: GlamourValidationResult['status'];
  if (criticalFailures.length > 0) {
    status = 'REJECTED';
  } else if (failedChecks.length > 0) {
    status = 'NEEDS_REWORK';
  } else {
    status = 'READY';
  }
  
  // Generate suggestions
  const suggestions: string[] = [];
  for (const check of failedChecks) {
    if (check.autoFixable) {
      suggestions.push(`[${check.name}] ${check.reason}`);
    }
  }
  
  // Generate variants if needs rework
  let variants: ContentVariant[] | undefined;
  if (status === 'NEEDS_REWORK') {
    variants = generateVariants(content, failedChecks);
  }
  
  return {
    isValid: status === 'READY',
    status,
    score: avgScore,
    checks,
    suggestions,
    variants,
  };
}

/**
 * Quick validation for batch processing
 */
export function quickValidateGlamour(content: Partial<GlamourContent>): {
  isValid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;
  
  // Essential checks only
  if (!content.entity_name) {
    issues.push('Missing entity name');
    score -= 50;
  }
  
  if (!content.caption || content.caption.length < 10) {
    issues.push('Caption too short');
    score -= 30;
  }
  
  if (!content.tags || content.tags.length < 2) {
    issues.push('Need more tags');
    score -= 20;
  }
  
  const allText = `${content.caption || ''} ${content.category || ''}`.toLowerCase();
  const hasUnsafe = UNSAFE_TERMS.some(term => allText.includes(term));
  if (hasUnsafe) {
    issues.push('Contains unsafe content');
    score -= 60;
  }
  
  return {
    isValid: score >= 60 && !hasUnsafe,
    score: Math.max(0, score),
    issues,
  };
}

// Export constants for other modules
export { SAFE_GLAM_TERMS, BORDERLINE_TERMS, UNSAFE_TERMS, KNOWN_ACTRESSES, KNOWN_ANCHORS };

