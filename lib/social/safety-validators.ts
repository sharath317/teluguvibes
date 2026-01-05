/**
 * Social Handle Safety & Compliance Validators
 * 
 * Ensures all social handles meet:
 * - Platform TOS compliance
 * - AdSense-safe content guidelines
 * - Political/sensitive content flags
 * - Sensuality limit scoring
 */

import type { SocialHandle } from './source-adapters';

// Types
export interface SafetyCheckResult {
  safe: boolean;
  status: 'SAFE_TO_PUBLISH' | 'NEEDS_REVIEW' | 'FLAGGED' | 'BLOCKED';
  flags: SafetyFlag[];
  score: number;
  recommendations: string[];
}

export interface SafetyFlag {
  type: 'political' | 'sensitive' | 'adult' | 'violence' | 'copyright' | 'fake' | 'tos_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  auto_resolve: boolean;
}

// Political figures - handle with caution
const POLITICAL_INDICATORS = [
  'politician', 'minister', 'mp', 'mla', 'ias', 'ips', 'bjp', 'congress',
  'tdp', 'trs', 'ysrcp', 'janasena', 'political', 'election', 'vote',
  'party', 'government', 'cm', 'pm', 'chief minister', 'prime minister',
];

// Adult content indicators
const ADULT_CONTENT_INDICATORS = [
  'xxx', 'adult', 'nsfw', 'onlyfans', '18+', 'explicit', 'nude', 'nudity',
  'sexy', 'hot_', '_hot', 'bikini', 'lingerie', 'intimate', 'sensual',
];

// Fake/unofficial indicators
const FAKE_INDICATORS = [
  'fake', 'parody', 'unofficial', 'fan_', '_fan', 'fc_', '_fc',
  'fanclub', 'impersonator', 'not_real', 'notreal', 'fake_',
];

// Violence indicators
const VIOLENCE_INDICATORS = [
  'violence', 'kill', 'murder', 'death', 'dead', 'gore', 'blood',
  'weapon', 'gun', 'attack', 'terrorist', 'hate',
];

// Copyright risk indicators
const COPYRIGHT_RISK_INDICATORS = [
  'hd_', '_hd', 'download', 'piracy', 'leaked', 'unreleased',
  'bootleg', 'rip', 'stream',
];

/**
 * Check if handle contains political indicators
 */
export function isPoliticalContent(handle: string, metadata?: Record<string, any>): SafetyFlag | null {
  const lowerHandle = handle.toLowerCase();
  const lowerBio = (metadata?.bio || '').toLowerCase();
  const combined = `${lowerHandle} ${lowerBio}`;

  for (const indicator of POLITICAL_INDICATORS) {
    if (combined.includes(indicator)) {
      return {
        type: 'political',
        severity: 'medium',
        reason: `Contains political indicator: ${indicator}`,
        auto_resolve: false,
      };
    }
  }

  return null;
}

/**
 * Check for adult content indicators
 */
export function hasAdultContentIndicators(handle: string, metadata?: Record<string, any>): SafetyFlag | null {
  const lowerHandle = handle.toLowerCase();
  const lowerBio = (metadata?.bio || '').toLowerCase();
  const combined = `${lowerHandle} ${lowerBio}`;

  for (const indicator of ADULT_CONTENT_INDICATORS) {
    if (combined.includes(indicator)) {
      // Bikini/lingerie are flagged but not blocked for glamour content
      const isSoftIndicator = ['bikini', 'lingerie', 'sensual'].includes(indicator);
      
      return {
        type: 'adult',
        severity: isSoftIndicator ? 'low' : 'high',
        reason: `Contains adult content indicator: ${indicator}`,
        auto_resolve: isSoftIndicator,
      };
    }
  }

  return null;
}

/**
 * Check for fake/unofficial account indicators
 */
export function isFakeOrUnofficial(handle: string): SafetyFlag | null {
  const lowerHandle = handle.toLowerCase();

  for (const indicator of FAKE_INDICATORS) {
    if (lowerHandle.includes(indicator)) {
      return {
        type: 'fake',
        severity: 'high',
        reason: `Likely fake/unofficial account: ${indicator}`,
        auto_resolve: false,
      };
    }
  }

  return null;
}

/**
 * Check for violence indicators
 */
export function hasViolenceIndicators(handle: string): SafetyFlag | null {
  const lowerHandle = handle.toLowerCase();

  for (const indicator of VIOLENCE_INDICATORS) {
    if (lowerHandle.includes(indicator)) {
      return {
        type: 'violence',
        severity: 'critical',
        reason: `Contains violence indicator: ${indicator}`,
        auto_resolve: false,
      };
    }
  }

  return null;
}

/**
 * Check for copyright risk
 */
export function hasCopyrightRisk(handle: string): SafetyFlag | null {
  const lowerHandle = handle.toLowerCase();

  for (const indicator of COPYRIGHT_RISK_INDICATORS) {
    if (lowerHandle.includes(indicator)) {
      return {
        type: 'copyright',
        severity: 'high',
        reason: `Copyright risk indicator: ${indicator}`,
        auto_resolve: false,
      };
    }
  }

  return null;
}

/**
 * Check platform TOS compliance
 */
export function checkPlatformTOS(handle: SocialHandle): SafetyFlag | null {
  // Platform-specific checks
  const platform = handle.platform;

  // Instagram: No special characters except . and _
  if (platform === 'instagram') {
    if (!/^[\w.]+$/.test(handle.handle)) {
      return {
        type: 'tos_violation',
        severity: 'medium',
        reason: 'Instagram handle contains invalid characters',
        auto_resolve: false,
      };
    }
  }

  // Twitter: No special characters except _
  if (platform === 'twitter') {
    if (!/^\w+$/.test(handle.handle)) {
      return {
        type: 'tos_violation',
        severity: 'medium',
        reason: 'Twitter handle contains invalid characters',
        auto_resolve: false,
      };
    }
  }

  return null;
}

/**
 * Calculate sensuality score (0-100)
 * Higher = more sensual content likely
 */
export function calculateSensualityScore(handle: string, metadata?: Record<string, any>): number {
  const sensualKeywords = [
    'glam', 'glamour', 'hot', 'sexy', 'bold', 'stunning',
    'gorgeous', 'beauty', 'model', 'fashion', 'bikini',
    'beach', 'pool', 'fitness', 'gym', 'yoga',
  ];

  const lowerHandle = handle.toLowerCase();
  const lowerBio = (metadata?.bio || '').toLowerCase();
  const combined = `${lowerHandle} ${lowerBio}`;

  let score = 0;
  for (const keyword of sensualKeywords) {
    if (combined.includes(keyword)) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

/**
 * Full safety check for a social handle
 */
export function checkHandleSafety(
  handle: SocialHandle,
  metadata?: Record<string, any>
): SafetyCheckResult {
  const flags: SafetyFlag[] = [];
  const recommendations: string[] = [];

  // Run all checks
  const politicalFlag = isPoliticalContent(handle.handle, metadata);
  if (politicalFlag) flags.push(politicalFlag);

  const adultFlag = hasAdultContentIndicators(handle.handle, metadata);
  if (adultFlag) flags.push(adultFlag);

  const fakeFlag = isFakeOrUnofficial(handle.handle);
  if (fakeFlag) flags.push(fakeFlag);

  const violenceFlag = hasViolenceIndicators(handle.handle);
  if (violenceFlag) flags.push(violenceFlag);

  const copyrightFlag = hasCopyrightRisk(handle.handle);
  if (copyrightFlag) flags.push(copyrightFlag);

  const tosFlag = checkPlatformTOS(handle);
  if (tosFlag) flags.push(tosFlag);

  // Calculate sensuality score
  const sensualityScore = calculateSensualityScore(handle.handle, metadata);

  // Add sensuality warning if high
  if (sensualityScore >= 50) {
    recommendations.push('High sensuality score - ensure AdSense compliance');
  }

  // Determine status
  const criticalFlags = flags.filter(f => f.severity === 'critical');
  const highFlags = flags.filter(f => f.severity === 'high');
  const mediumFlags = flags.filter(f => f.severity === 'medium');

  let status: SafetyCheckResult['status'];
  let safe: boolean;

  if (criticalFlags.length > 0) {
    status = 'BLOCKED';
    safe = false;
    recommendations.push('Critical safety flags detected - do not use');
  } else if (highFlags.length > 0) {
    status = 'FLAGGED';
    safe = false;
    recommendations.push('High severity flags require manual review');
  } else if (mediumFlags.length > 0 || sensualityScore >= 70) {
    status = 'NEEDS_REVIEW';
    safe = true; // Can be used with review
    recommendations.push('Manual verification recommended');
  } else {
    status = 'SAFE_TO_PUBLISH';
    safe = true;
  }

  // Calculate overall score (0-100, higher = safer)
  const score = Math.max(0, 100 - (criticalFlags.length * 50) - (highFlags.length * 25) - (mediumFlags.length * 10));

  return {
    safe,
    status,
    flags,
    score,
    recommendations,
  };
}

/**
 * Batch safety check for multiple handles
 */
export function batchCheckSafety(
  handles: SocialHandle[],
  metadataMap?: Map<string, Record<string, any>>
): Map<string, SafetyCheckResult> {
  const results = new Map<string, SafetyCheckResult>();

  for (const handle of handles) {
    const key = `${handle.platform}:${handle.handle}`;
    const metadata = metadataMap?.get(key);
    results.set(key, checkHandleSafety(handle, metadata));
  }

  return results;
}

/**
 * Check if handle is safe for AdSense monetization
 */
export function isAdSenseSafe(handle: SocialHandle): boolean {
  const result = checkHandleSafety(handle);
  
  // Must be SAFE_TO_PUBLISH or NEEDS_REVIEW with low sensuality
  if (result.status === 'SAFE_TO_PUBLISH') return true;
  if (result.status === 'NEEDS_REVIEW') {
    const sensuality = calculateSensualityScore(handle.handle);
    return sensuality < 50;
  }
  
  return false;
}

/**
 * Generate safety report for a celebrity's profiles
 */
export function generateSafetyReport(
  celebrityName: string,
  handles: SocialHandle[]
): {
  celebrity: string;
  total_profiles: number;
  safe_count: number;
  flagged_count: number;
  blocked_count: number;
  overall_status: 'GREEN' | 'YELLOW' | 'RED';
  details: Array<{
    platform: string;
    handle: string;
    status: SafetyCheckResult['status'];
    score: number;
    flags: string[];
  }>;
} {
  const details = handles.map(handle => {
    const result = checkHandleSafety(handle);
    return {
      platform: handle.platform,
      handle: handle.handle,
      status: result.status,
      score: result.score,
      flags: result.flags.map(f => f.reason),
    };
  });

  const safeCount = details.filter(d => d.status === 'SAFE_TO_PUBLISH').length;
  const flaggedCount = details.filter(d => ['FLAGGED', 'NEEDS_REVIEW'].includes(d.status)).length;
  const blockedCount = details.filter(d => d.status === 'BLOCKED').length;

  let overallStatus: 'GREEN' | 'YELLOW' | 'RED';
  if (blockedCount > 0) {
    overallStatus = 'RED';
  } else if (flaggedCount > 0) {
    overallStatus = 'YELLOW';
  } else {
    overallStatus = 'GREEN';
  }

  return {
    celebrity: celebrityName,
    total_profiles: handles.length,
    safe_count: safeCount,
    flagged_count: flaggedCount,
    blocked_count: blockedCount,
    overall_status: overallStatus,
    details,
  };
}






