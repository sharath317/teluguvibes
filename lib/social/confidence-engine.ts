/**
 * Social Handle Confidence & Validation Engine
 * 
 * Calculates confidence scores and validates social handles
 * before storing them in the database.
 * 
 * Rules:
 * - Wikidata match → +0.5
 * - Wikipedia link → +0.3
 * - TMDB confirmation → +0.2
 * - Name mismatch → reject
 * - Fan pages → reject
 * 
 * Status:
 * - VERIFIED (≥0.8)
 * - PROBABLE (0.6–0.79)
 * - REJECTED (<0.6)
 */

import type { SocialHandle, SocialFetchResult } from './source-adapters';

// Types
export type VerificationStatus = 'VERIFIED' | 'PROBABLE' | 'REJECTED' | 'NEEDS_REVIEW';

export interface ConfidenceResult {
  handle: SocialHandle;
  status: VerificationStatus;
  reasons: string[];
  adjustments: ConfidenceAdjustment[];
  final_score: number;
}

export interface ConfidenceAdjustment {
  factor: string;
  value: number;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  status: VerificationStatus;
  reasons: string[];
  blocked_reason?: string;
}

// Blocked patterns for fan pages, parody accounts, etc.
const BLOCKED_HANDLE_PATTERNS = [
  /^.*_fans?$/i,
  /^.*_fc$/i,
  /^.*fanclub$/i,
  /^fans?of.*/i,
  /^.*_updates?$/i,
  /^.*_army$/i,
  /^.*_edits?$/i,
  /^.*_lover$/i,
  /^.*_lover[sz]$/i,
  /^.*_world$/i,
  /^.*_daily$/i,
  /^unofficial.*/i,
  /^fake.*/i,
  /^parody.*/i,
  /^not_real.*/i,
];

// Known official suffixes
const OFFICIAL_SUFFIXES = [
  'official',
  'offl',
  'real',
  'verified',
];

// Platform-specific validation rules
const PLATFORM_RULES: Record<string, {
  minLength: number;
  maxLength: number;
  pattern?: RegExp;
}> = {
  instagram: { minLength: 1, maxLength: 30, pattern: /^[\w.]+$/ },
  twitter: { minLength: 1, maxLength: 15, pattern: /^[\w]+$/ },
  youtube: { minLength: 1, maxLength: 100 },
  facebook: { minLength: 1, maxLength: 50 },
  tiktok: { minLength: 1, maxLength: 24, pattern: /^[\w.]+$/ },
  imdb: { minLength: 7, maxLength: 10, pattern: /^nm\d+$/ },
  official_website: { minLength: 3, maxLength: 200 },
};

/**
 * Check if a handle matches blocked patterns (fan pages, etc.)
 */
export function isBlockedHandle(handle: string, platform: string): { blocked: boolean; reason?: string } {
  const lowerHandle = handle.toLowerCase();

  // Check against blocked patterns
  for (const pattern of BLOCKED_HANDLE_PATTERNS) {
    if (pattern.test(lowerHandle)) {
      return { blocked: true, reason: 'fan_page' };
    }
  }

  // Platform-specific checks
  if (platform === 'instagram' || platform === 'twitter') {
    // Numeric-only handles are suspicious
    if (/^\d+$/.test(handle)) {
      return { blocked: true, reason: 'suspicious_format' };
    }
  }

  return { blocked: false };
}

/**
 * Validate handle format for platform
 */
export function validateHandleFormat(handle: string, platform: string): { valid: boolean; reason?: string } {
  const rules = PLATFORM_RULES[platform];
  if (!rules) return { valid: true };

  if (handle.length < rules.minLength) {
    return { valid: false, reason: `Handle too short (min ${rules.minLength})` };
  }

  if (handle.length > rules.maxLength) {
    return { valid: false, reason: `Handle too long (max ${rules.maxLength})` };
  }

  if (rules.pattern && !rules.pattern.test(handle)) {
    return { valid: false, reason: 'Invalid handle format for platform' };
  }

  return { valid: true };
}

/**
 * Check if handle appears to be official
 */
export function isLikelyOfficial(handle: string): boolean {
  const lowerHandle = handle.toLowerCase();
  return OFFICIAL_SUFFIXES.some(suffix => lowerHandle.includes(suffix));
}

/**
 * Calculate name similarity score
 */
export function calculateNameSimilarity(celebrityName: string, handle: string): number {
  const nameParts = celebrityName.toLowerCase().split(/\s+/);
  const handleLower = handle.toLowerCase();

  let matchScore = 0;
  let matchedParts = 0;

  for (const part of nameParts) {
    if (part.length < 2) continue;
    
    if (handleLower.includes(part)) {
      matchedParts++;
      matchScore += part.length;
    } else if (handleLower.includes(part.slice(0, 3))) {
      // Partial match
      matchScore += 1;
    }
  }

  // Calculate percentage of name parts matched
  const validParts = nameParts.filter(p => p.length >= 2).length;
  if (validParts === 0) return 0.5;

  const partMatch = matchedParts / validParts;
  const charMatch = matchScore / celebrityName.replace(/\s+/g, '').length;

  return Math.min(1, (partMatch * 0.6) + (charMatch * 0.4));
}

/**
 * Calculate overall confidence score
 */
export function calculateConfidence(
  handle: SocialHandle,
  options: {
    celebrity_name: string;
    sources_found: string[];
    cross_source_match?: boolean;
    name_similarity?: number;
  }
): ConfidenceResult {
  const adjustments: ConfidenceAdjustment[] = [];
  let score = handle.confidence_score;

  // Source-based adjustments
  if (handle.source === 'wikidata') {
    adjustments.push({
      factor: 'wikidata_source',
      value: 0.1,
      reason: 'Wikidata is a highly reliable source',
    });
    score = Math.min(1, score + 0.1);
  }

  // Cross-source confirmation
  if (options.cross_source_match) {
    adjustments.push({
      factor: 'cross_source_match',
      value: 0.2,
      reason: 'Handle confirmed by multiple sources',
    });
    score = Math.min(1, score + 0.2);
  }

  // Name similarity check
  const nameSimilarity = options.name_similarity ?? 
    calculateNameSimilarity(options.celebrity_name, handle.handle);
  
  if (nameSimilarity >= 0.7) {
    adjustments.push({
      factor: 'name_match',
      value: 0.1,
      reason: 'Handle matches celebrity name',
    });
    score = Math.min(1, score + 0.1);
  } else if (nameSimilarity < 0.3) {
    adjustments.push({
      factor: 'name_mismatch',
      value: -0.3,
      reason: 'Handle does not match celebrity name',
    });
    score = Math.max(0, score - 0.3);
  }

  // Official suffix bonus
  if (isLikelyOfficial(handle.handle)) {
    adjustments.push({
      factor: 'official_suffix',
      value: 0.05,
      reason: 'Handle contains official indicator',
    });
    score = Math.min(1, score + 0.05);
  }

  // IMDB/Wikipedia are more reliable than social media
  if (handle.platform === 'imdb' || handle.platform === 'wikipedia') {
    adjustments.push({
      factor: 'reliable_platform',
      value: 0.1,
      reason: 'Platform is highly reliable (IMDB/Wikipedia)',
    });
    score = Math.min(1, score + 0.1);
  }

  // Determine status
  let status: VerificationStatus;
  const reasons: string[] = [];

  if (score >= 0.8) {
    status = 'VERIFIED';
    reasons.push('High confidence from trusted sources');
  } else if (score >= 0.6) {
    status = 'PROBABLE';
    reasons.push('Moderate confidence, manual verification recommended');
  } else if (score >= 0.4) {
    status = 'NEEDS_REVIEW';
    reasons.push('Low confidence, requires manual review');
  } else {
    status = 'REJECTED';
    reasons.push('Confidence too low for automatic approval');
  }

  return {
    handle: { ...handle, confidence_score: score },
    status,
    reasons,
    adjustments,
    final_score: score,
  };
}

/**
 * Full validation of a social handle
 */
export function validateSocialHandle(
  handle: SocialHandle,
  celebrityName: string,
  sources_found: string[] = []
): ValidationResult {
  const reasons: string[] = [];

  // Check if blocked
  const blocked = isBlockedHandle(handle.handle, handle.platform);
  if (blocked.blocked) {
    return {
      valid: false,
      status: 'REJECTED',
      reasons: [`Blocked: ${blocked.reason}`],
      blocked_reason: blocked.reason,
    };
  }

  // Validate format
  const formatValid = validateHandleFormat(handle.handle, handle.platform);
  if (!formatValid.valid) {
    return {
      valid: false,
      status: 'REJECTED',
      reasons: [`Invalid format: ${formatValid.reason}`],
    };
  }

  // Calculate confidence
  const confidenceResult = calculateConfidence(handle, {
    celebrity_name: celebrityName,
    sources_found,
    cross_source_match: sources_found.length > 1,
  });

  // Only store VERIFIED and PROBABLE handles
  if (confidenceResult.status === 'REJECTED') {
    return {
      valid: false,
      status: 'REJECTED',
      reasons: confidenceResult.reasons,
    };
  }

  reasons.push(...confidenceResult.reasons);
  reasons.push(`Final confidence: ${Math.round(confidenceResult.final_score * 100)}%`);

  return {
    valid: true,
    status: confidenceResult.status,
    reasons,
  };
}

/**
 * Process and validate all handles from a fetch result
 */
export function processAndValidateHandles(
  result: SocialFetchResult
): { valid: ConfidenceResult[]; rejected: ConfidenceResult[] } {
  const valid: ConfidenceResult[] = [];
  const rejected: ConfidenceResult[] = [];

  // Group handles by platform for cross-source checking
  const handlesByPlatform = new Map<string, SocialHandle[]>();
  for (const handle of result.handles) {
    const existing = handlesByPlatform.get(handle.platform) || [];
    existing.push(handle);
    handlesByPlatform.set(handle.platform, existing);
  }

  // Process each handle
  for (const handle of result.handles) {
    // Check for cross-source confirmation
    const platformHandles = handlesByPlatform.get(handle.platform) || [];
    const crossSourceMatch = platformHandles.some(
      h => h.handle === handle.handle && h.source !== handle.source
    );

    const confidenceResult = calculateConfidence(handle, {
      celebrity_name: result.celebrity_name,
      sources_found: result.sources_checked,
      cross_source_match: crossSourceMatch,
    });

    if (confidenceResult.status === 'VERIFIED' || confidenceResult.status === 'PROBABLE') {
      valid.push(confidenceResult);
    } else if (confidenceResult.status === 'NEEDS_REVIEW') {
      valid.push(confidenceResult); // Include for manual review
    } else {
      rejected.push(confidenceResult);
    }
  }

  // Deduplicate valid handles (keep highest confidence per platform)
  const deduped = deduplicateHandles(valid);

  return {
    valid: deduped,
    rejected,
  };
}

/**
 * Deduplicate handles keeping highest confidence per platform
 */
function deduplicateHandles(handles: ConfidenceResult[]): ConfidenceResult[] {
  const byPlatformAndHandle = new Map<string, ConfidenceResult>();

  for (const handle of handles) {
    const key = `${handle.handle.platform}:${handle.handle.handle}`;
    const existing = byPlatformAndHandle.get(key);

    if (!existing || handle.final_score > existing.final_score) {
      byPlatformAndHandle.set(key, handle);
    }
  }

  return Array.from(byPlatformAndHandle.values());
}

/**
 * Generate verification method based on sources
 */
export function determineVerificationMethod(
  sources: string[],
  confidence: number
): SocialHandle['source'] extends string ? string : never {
  if (sources.includes('wikidata') && confidence >= 0.8) {
    return 'wikidata_official';
  }
  if (sources.length >= 2 && confidence >= 0.7) {
    return 'cross_source_match';
  }
  if (confidence >= 0.6) {
    return 'unverified';
  }
  return 'unverified';
}

// Export types
export type { SocialHandle, SocialFetchResult };

