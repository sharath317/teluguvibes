/**
 * Community Safety System
 * - Rate limiting per IP
 * - Shadow-ban instead of delete
 * - Auto-pin positive comments
 * - Disable comments on risky categories
 */

import { createClient } from '@supabase/supabase-js';
import Filter from 'bad-words';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const filter = new Filter();

// Add Telugu/Hindi bad words
const additionalBadWords = [
  // Add Telugu profanity here (kept minimal for example)
  'దున్నపోతు', 'బుడతడు',
];
filter.addWords(...additionalBadWords);

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetIn: number; // seconds
}

interface CommentSafetyResult {
  isSafe: boolean;
  isPositive: boolean;
  shouldShadowBan: boolean;
  issues: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'toxic';
}

// Rate limit configurations
const RATE_LIMITS = {
  comment: { maxRequests: 10, windowMinutes: 60 },
  create_post: { maxRequests: 5, windowMinutes: 60 },
  dedication: { maxRequests: 3, windowMinutes: 60 },
  report: { maxRequests: 5, windowMinutes: 60 },
};

// Categories where comments are disabled or moderated
const COMMENT_RULES: Record<string, 'enabled' | 'moderated' | 'disabled'> = {
  entertainment: 'enabled',
  gossip: 'enabled',
  sports: 'enabled',
  politics: 'moderated', // All comments require approval
  trending: 'enabled',
  love: 'enabled',
  health: 'moderated',
  food: 'enabled',
  technology: 'enabled',
  dedications: 'disabled', // No comments on dedications
};

// Positive sentiment patterns
const POSITIVE_PATTERNS = [
  /love|great|amazing|awesome|best|wonderful|fantastic/i,
  /ప్రేమ|గొప్ప|అద్భుతం|బెస్ట్|సూపర్|మంచి|బాగుంది/i,
  /👍|❤️|🔥|💯|🙏|👏|😍|🎉/,
  /superb|excellent|perfect|beautiful/i,
  /congratulations|congrats|happy|proud/i,
];

// Toxic patterns (beyond profanity)
const TOXIC_PATTERNS = [
  /you're (stupid|idiot|dumb)/i,
  /go die|kill yourself/i,
  /fake news|fraud|scam/i,
  /worst|hate|terrible|disgusting/i,
  /చెత్త|మోసం|నకిలీ|చంపు/i,
];

// Spam patterns
const SPAM_PATTERNS = [
  /http[s]?:\/\/[^\s]+/g, // URLs
  /(.)\1{4,}/g, // Repeated characters (aaaaaaa)
  /whatsapp|telegram|join now/i,
  /earn money|free gift|click here/i,
  /follow me|subscribe|check out my/i,
];

/**
 * Check rate limit for an action
 */
export async function checkRateLimit(
  identifier: string,
  actionType: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[actionType];
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

  // Get existing rate limit entry
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action_type', actionType)
    .single();

  if (!existing) {
    // Create new entry
    await supabase.from('rate_limits').insert({
      identifier,
      action_type: actionType,
      window_start: new Date().toISOString(),
      request_count: 1,
    });

    return {
      allowed: true,
      remainingRequests: config.maxRequests - 1,
      resetIn: config.windowMinutes * 60,
    };
  }

  const entryWindowStart = new Date(existing.window_start);

  if (entryWindowStart < windowStart) {
    // Window expired, reset
    await supabase
      .from('rate_limits')
      .update({
        window_start: new Date().toISOString(),
        request_count: 1,
      })
      .eq('id', existing.id);

    return {
      allowed: true,
      remainingRequests: config.maxRequests - 1,
      resetIn: config.windowMinutes * 60,
    };
  }

  // Window still active
  const newCount = existing.request_count + 1;

  if (newCount > config.maxRequests) {
    const resetIn = Math.ceil(
      (entryWindowStart.getTime() + config.windowMinutes * 60 * 1000 - Date.now()) / 1000
    );

    return {
      allowed: false,
      remainingRequests: 0,
      resetIn: Math.max(0, resetIn),
    };
  }

  // Update count
  await supabase
    .from('rate_limits')
    .update({ request_count: newCount })
    .eq('id', existing.id);

  return {
    allowed: true,
    remainingRequests: config.maxRequests - newCount,
    resetIn: Math.ceil(
      (entryWindowStart.getTime() + config.windowMinutes * 60 * 1000 - Date.now()) / 1000
    ),
  };
}

/**
 * Analyze comment for safety
 */
export function analyzeComment(comment: string): CommentSafetyResult {
  const issues: string[] = [];
  let sentiment: CommentSafetyResult['sentiment'] = 'neutral';
  let shouldShadowBan = false;

  // 1. Check profanity
  if (filter.isProfane(comment)) {
    issues.push('Contains profanity');
    sentiment = 'toxic';
    shouldShadowBan = true;
  }

  // 2. Check toxic patterns
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(comment)) {
      issues.push('Toxic language detected');
      sentiment = 'toxic';
      shouldShadowBan = true;
      break;
    }
  }

  // 3. Check spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(comment)) {
      issues.push('Spam detected');
      shouldShadowBan = true;
      break;
    }
  }

  // 4. Check length
  if (comment.length < 2) {
    issues.push('Too short');
  }
  if (comment.length > 1000) {
    issues.push('Too long');
  }

  // 5. Check positive sentiment (for auto-pinning)
  let isPositive = false;
  if (sentiment !== 'toxic') {
    for (const pattern of POSITIVE_PATTERNS) {
      if (pattern.test(comment)) {
        isPositive = true;
        sentiment = 'positive';
        break;
      }
    }
  }

  return {
    isSafe: issues.length === 0,
    isPositive,
    shouldShadowBan,
    issues,
    sentiment,
  };
}

/**
 * Check if comments are allowed for a category
 */
export function getCommentRule(category: string): 'enabled' | 'moderated' | 'disabled' {
  return COMMENT_RULES[category] || 'enabled';
}

/**
 * Shadow-ban a user's comment (visible only to them)
 */
export async function shadowBanComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .update({ is_shadow_banned: true })
    .eq('id', commentId);

  return !error;
}

/**
 * Pin a positive comment
 */
export async function pinComment(commentId: string): Promise<boolean> {
  // First, unpin any existing pinned comments for this post
  const { data: comment } = await supabase
    .from('comments')
    .select('post_id')
    .eq('id', commentId)
    .single();

  if (!comment) return false;

  await supabase
    .from('comments')
    .update({ is_pinned: false })
    .eq('post_id', comment.post_id)
    .eq('is_pinned', true);

  // Pin the new comment
  const { error } = await supabase
    .from('comments')
    .update({ is_pinned: true })
    .eq('id', commentId);

  return !error;
}

/**
 * Get comments (excluding shadow-banned for other users)
 */
export async function getVisibleComments(
  postId: string,
  currentUserIp?: string
): Promise<any[]> {
  let query = supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // Filter out shadow-banned comments (except for the banner's own comments)
  if (currentUserIp) {
    query = query.or(`is_shadow_banned.eq.false,ip_address.eq.${currentUserIp}`);
  } else {
    query = query.eq('is_shadow_banned', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

/**
 * Process a new comment with safety checks
 */
export async function processNewComment(
  postId: string,
  author: string,
  content: string,
  ipAddress: string,
  category: string
): Promise<{
  success: boolean;
  commentId?: string;
  error?: string;
  isShadowBanned?: boolean;
  isPinned?: boolean;
}> {
  // 1. Check if comments are allowed for this category
  const commentRule = getCommentRule(category);
  if (commentRule === 'disabled') {
    return { success: false, error: 'Comments are disabled for this content' };
  }

  // 2. Check rate limit
  const rateLimit = await checkRateLimit(ipAddress, 'comment');
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many comments. Try again in ${Math.ceil(rateLimit.resetIn / 60)} minutes.`,
    };
  }

  // 3. Analyze comment safety
  const safety = analyzeComment(content);

  // 4. Clean the content if it has profanity
  let cleanContent = content;
  if (safety.issues.includes('Contains profanity')) {
    cleanContent = filter.clean(content);
  }

  // 5. Insert comment
  const { data: comment, error: insertError } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author,
      content: cleanContent,
      ip_address: ipAddress,
      is_shadow_banned: safety.shouldShadowBan,
      is_pinned: false,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 6. Auto-pin positive comments (if first positive comment)
  let isPinned = false;
  if (safety.isPositive && !safety.shouldShadowBan) {
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('is_pinned', true);

    if (count === 0) {
      await pinComment(comment.id);
      isPinned = true;
    }
  }

  return {
    success: true,
    commentId: comment.id,
    isShadowBanned: safety.shouldShadowBan,
    isPinned,
  };
}

/**
 * Report a comment
 */
export async function reportComment(
  commentId: string,
  reason: string,
  reporterIp: string
): Promise<boolean> {
  // Check rate limit for reporting
  const rateLimit = await checkRateLimit(reporterIp, 'report');
  if (!rateLimit.allowed) {
    return false;
  }

  // In production, you'd save this to a reports table
  console.log(`Comment ${commentId} reported: ${reason}`);

  return true;
}

/**
 * Get user's comment history for moderation
 */
export async function getUserCommentHistory(ipAddress: string): Promise<{
  totalComments: number;
  shadowBannedCount: number;
  recentComments: any[];
}> {
  const { data, count } = await supabase
    .from('comments')
    .select('*', { count: 'exact' })
    .eq('ip_address', ipAddress)
    .order('created_at', { ascending: false })
    .limit(10);

  const shadowBannedCount = data?.filter(c => c.is_shadow_banned).length || 0;

  return {
    totalComments: count || 0,
    shadowBannedCount,
    recentComments: data || [],
  };
}



