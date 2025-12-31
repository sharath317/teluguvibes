/**
 * Smart Auto-Moderation for Viral Content
 *
 * Determines if viral content should be auto-approved or flagged for review.
 * Uses content analysis, source verification, and profanity filtering.
 */

import { isClean } from '@/lib/profanity-filter';
import type { MediaType } from '@/types/media';

// Verified/trusted sources that can be auto-approved
const VERIFIED_YOUTUBE_CHANNELS = [
  'UCnJjcn5FrgrOEp5_N45ZLEQ', // Lahari Music
  'UCBPAgxW0rYnj1ANB5vy4ViQ', // Aditya Music
  'UCqYPhGiB9tkShZsq9CGkZDw', // T-Series Telugu
  'UCWtAX-Wm9mH6KVq9mWVE9Sg', // Sri Balaji Video
  'UC9IuX5pBfsRoD-V7uQw5-Dw', // Mango Music
  'UCzee67JnEcuvjErRyWP3GpQ', // Zee Music South
  'UCB56R8fFq_AWjHsf1bpVi3Q', // Sony Music South
  'UCnSqxrSfo1sK4WZ7nBpYs1w', // Saregama Telugu
];

const VERIFIED_TWITTER_HANDLES = [
  'saboruraborin0000',
  'alwaysramcharan',
  'uraborstruly',
  'maheshbabu_',
  'alaborluarjun',
  'rashmikamandanna',
  'pawankalyan',
  'venkymama',
];

const VERIFIED_SUBREDDITS = [
  'tollywood',
  'indiancinema',
];

// Keywords that require manual review
const REVIEW_KEYWORDS = [
  'controversy',
  'scandal',
  'leaked',
  'arrest',
  'death',
  'accident',
  'fight',
  'abuse',
  'fake',
  'rumor',
  'rumour',
];

// Keywords that indicate potentially inappropriate content
const BLOCK_KEYWORDS = [
  'nsfw',
  'nude',
  'explicit',
  'porn',
  'xxx',
  'sex tape',
];

export interface ModerationResult {
  decision: 'auto_approve' | 'pending_review' | 'auto_reject';
  confidence: number; // 0-100
  reasons: string[];
  flags: string[];
}

export interface ContentForModeration {
  title: string;
  description?: string;
  tags?: string[];
  sourceType: 'youtube' | 'reddit' | 'twitter' | 'instagram' | 'unknown';
  sourceId?: string; // channel ID, subreddit, handle
  mediaType: MediaType;
  viralScore: number;
  externalViews?: number;
  externalLikes?: number;
  isVerifiedSource?: boolean;
}

/**
 * Main moderation function
 */
export function moderateContent(content: ContentForModeration): ModerationResult {
  const reasons: string[] = [];
  const flags: string[] = [];
  let score = 50; // Start neutral

  const textToCheck = `${content.title} ${content.description || ''} ${(content.tags || []).join(' ')}`.toLowerCase();

  // === BLOCKING CHECKS (immediate rejection) ===

  // Check for explicit content keywords
  for (const keyword of BLOCK_KEYWORDS) {
    if (textToCheck.includes(keyword)) {
      return {
        decision: 'auto_reject',
        confidence: 95,
        reasons: [`Contains blocked keyword: ${keyword}`],
        flags: ['explicit_content'],
      };
    }
  }

  // Profanity check (isClean returns true if clean, so we negate)
  const hasProfanity = !isClean(content.title) ||
    (content.description && !isClean(content.description));

  if (hasProfanity) {
    flags.push('profanity_detected');
    score -= 30;
    reasons.push('Profanity detected in content');
  }

  // === VERIFICATION CHECKS (boost approval) ===

  // Check verified source
  const isVerified = checkVerifiedSource(content);
  if (isVerified) {
    score += 25;
    reasons.push(`Verified ${content.sourceType} source`);
  }

  // === QUALITY CHECKS ===

  // High viral score indicates quality content
  if (content.viralScore >= 70) {
    score += 15;
    reasons.push('High viral score');
  } else if (content.viralScore >= 50) {
    score += 8;
    reasons.push('Good viral score');
  }

  // High engagement metrics
  if (content.externalViews && content.externalViews > 100000) {
    score += 10;
    reasons.push('High view count');
  }

  if (content.externalLikes && content.externalLikes > 10000) {
    score += 5;
    reasons.push('High like count');
  }

  // === REVIEW FLAGS ===

  // Check for keywords requiring review
  for (const keyword of REVIEW_KEYWORDS) {
    if (textToCheck.includes(keyword)) {
      flags.push(`review_keyword_${keyword}`);
      score -= 15;
      reasons.push(`Contains sensitive keyword: ${keyword}`);
    }
  }

  // === MEDIA TYPE CONSIDERATIONS ===

  // Videos from official embeds are safer
  if (['youtube_video', 'youtube_short'].includes(content.mediaType)) {
    score += 5;
    reasons.push('Official YouTube embed');
  }

  // Twitter posts from verified handles
  if (content.mediaType === 'twitter_post' && isVerified) {
    score += 10;
    reasons.push('Verified Twitter account');
  }

  // === DECISION ===

  const confidence = Math.abs(score - 50) + 50; // Higher deviation = higher confidence

  if (score >= 70 && flags.length === 0) {
    return {
      decision: 'auto_approve',
      confidence: Math.min(95, confidence),
      reasons,
      flags,
    };
  } else if (score <= 30 || flags.includes('profanity_detected')) {
    return {
      decision: 'pending_review',
      confidence: Math.min(90, confidence),
      reasons,
      flags,
    };
  } else {
    // Medium scores go to review
    return {
      decision: 'pending_review',
      confidence: Math.min(85, confidence),
      reasons,
      flags,
    };
  }
}

/**
 * Check if content is from a verified source
 */
function checkVerifiedSource(content: ContentForModeration): boolean {
  if (content.isVerifiedSource) return true;

  const sourceId = content.sourceId?.toLowerCase() || '';

  switch (content.sourceType) {
    case 'youtube':
      return VERIFIED_YOUTUBE_CHANNELS.some(ch =>
        ch.toLowerCase() === sourceId
      );

    case 'twitter':
      return VERIFIED_TWITTER_HANDLES.some(h =>
        h.toLowerCase() === sourceId
      );

    case 'reddit':
      return VERIFIED_SUBREDDITS.some(sr =>
        sr.toLowerCase() === sourceId
      );

    default:
      return false;
  }
}

/**
 * Batch moderate multiple items
 */
export function moderateContentBatch(
  items: ContentForModeration[]
): Map<number, ModerationResult> {
  const results = new Map<number, ModerationResult>();

  for (let i = 0; i < items.length; i++) {
    results.set(i, moderateContent(items[i]));
  }

  return results;
}

/**
 * Get summary statistics for moderation batch
 */
export function getModerationSummary(results: ModerationResult[]): {
  autoApproved: number;
  pendingReview: number;
  autoRejected: number;
  avgConfidence: number;
  commonFlags: Record<string, number>;
} {
  const summary = {
    autoApproved: 0,
    pendingReview: 0,
    autoRejected: 0,
    avgConfidence: 0,
    commonFlags: {} as Record<string, number>,
  };

  let totalConfidence = 0;

  for (const result of results) {
    totalConfidence += result.confidence;

    switch (result.decision) {
      case 'auto_approve':
        summary.autoApproved++;
        break;
      case 'pending_review':
        summary.pendingReview++;
        break;
      case 'auto_reject':
        summary.autoRejected++;
        break;
    }

    for (const flag of result.flags) {
      summary.commonFlags[flag] = (summary.commonFlags[flag] || 0) + 1;
    }
  }

  summary.avgConfidence = results.length > 0
    ? Math.round(totalConfidence / results.length)
    : 0;

  return summary;
}

/**
 * Check if content should be featured (highlighted) on the Hot page
 */
export function shouldFeatureContent(content: ContentForModeration): boolean {
  // High viral score
  if (content.viralScore < 80) return false;

  // From verified source
  if (!checkVerifiedSource(content)) return false;

  // High engagement
  if (content.externalViews && content.externalViews < 500000) return false;

  // Video content preferred for featuring
  if (!['youtube_video', 'youtube_short', 'instagram_reel'].includes(content.mediaType)) {
    return false;
  }

  return true;
}

/**
 * Get moderation status label for display
 */
export function getModerationLabel(decision: ModerationResult['decision']): {
  label: string;
  color: string;
} {
  switch (decision) {
    case 'auto_approve':
      return { label: 'Auto-Approved', color: 'green' };
    case 'pending_review':
      return { label: 'Pending Review', color: 'yellow' };
    case 'auto_reject':
      return { label: 'Rejected', color: 'red' };
    default:
      return { label: 'Unknown', color: 'gray' };
  }
}
