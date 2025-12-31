// Hot Media Safety Checker
// Implements safety flagging system for glamour content

import type { SafetyRisk, SafetyValidation } from '@/types/media';

// Blocked keywords by category
const BLOCKED_KEYWORDS: Record<string, string[]> = {
  explicit: ['nude', 'naked', 'xxx', 'porn', 'sex', 'nsfw', 'erotic', 'adult only', 'x-rated'],
  minor: ['minor', 'underage', 'child', 'kid', 'teen', 'teenage', 'young girl', 'school girl'],
  private: ['leaked', 'private', 'hack', 'stolen', 'mms', 'scandal'],
  violence: ['violence', 'abuse', 'assault', 'fight', 'attack'],
  illegal: ['drugs', 'weapon', 'gun', 'illegal'],
};

// Keywords that require manual review
const REVIEW_KEYWORDS: string[] = [
  'gossip', 'rumor', 'rumour', 'controversial', 'political', 'politician',
  'wardrobe malfunction', 'oops moment', 'intimate', 'romantic',
  'date', 'dating', 'affair', 'relationship', 'breakup', 'divorce',
  'feud', 'fight', 'argument', 'controversy',
];

// Keywords indicating safe glam content
const SAFE_GLAM_KEYWORDS: string[] = [
  'photoshoot', 'fashion', 'event', 'premiere', 'launch', 'promotion',
  'magazine', 'cover', 'interview', 'press meet', 'audio launch',
  'fitness', 'gym', 'yoga', 'workout', 'health', 'wellness',
  'saree', 'traditional', 'ethnic', 'wedding', 'ceremony', 'festival',
  'vacation', 'travel', 'beach', 'holiday', 'trip',
  'award', 'ceremony', 'gala', 'red carpet', 'function',
];

// List of verified actresses/anchors (known safe entities)
const VERIFIED_ENTITIES: string[] = [
  'samantha', 'rashmika', 'pooja hegde', 'kajal', 'tamannah', 'tamannaah',
  'anupama', 'keerthy', 'shruti haasan', 'nayanthara', 'sai pallavi',
  'nabha', 'nidhhi', 'krithi shetty', 'sreeleela', 'shriya', 'rakul',
  'kiara', 'janhvi', 'meenakshi', 'ritu varma',
  'sreemukhi', 'anasuya', 'rashmi gautam', 'suma', 'lasya', 'vishnu priya',
];

export interface SafetyCheckInput {
  text: string;           // Caption/title text to check
  entityName?: string;    // Celebrity name if known
  platform?: string;      // instagram, youtube, twitter
  isEmbed?: boolean;      // Whether this is an embed (safer by default)
  imageUrl?: string;      // For future image analysis
}

/**
 * Check content for safety violations
 */
export function checkContentSafety(input: SafetyCheckInput): SafetyValidation {
  const { text, entityName, isEmbed = false } = input;
  const lowerText = text.toLowerCase();
  const lowerEntity = (entityName || '').toLowerCase();
  
  const flags: string[] = [];
  let risk: SafetyRisk = 'safe';
  let blockedReason: string | undefined;
  
  // Check for blocked keywords
  for (const [category, keywords] of Object.entries(BLOCKED_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        flags.push(`blocked:${category}:${keyword}`);
        risk = 'blocked';
        blockedReason = `Blocked content detected: ${category} (${keyword})`;
      }
    }
  }
  
  // If already blocked, return early
  if (risk === 'blocked') {
    return {
      risk,
      flags,
      blockedReason,
      requiresReview: false,
      autoApproveEligible: false,
    };
  }
  
  // Check for review keywords
  for (const keyword of REVIEW_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      flags.push(`review:${keyword}`);
      if (risk === 'safe') risk = 'medium';
    }
  }
  
  // Check if entity is verified (safer)
  const isVerifiedEntity = VERIFIED_ENTITIES.some(entity => 
    lowerEntity.includes(entity) || lowerText.includes(entity)
  );
  
  if (isVerifiedEntity) {
    flags.push('verified_entity');
  }
  
  // Check for safe glam keywords (positive signal)
  const hasSafeContext = SAFE_GLAM_KEYWORDS.some(keyword => 
    lowerText.includes(keyword)
  );
  
  if (hasSafeContext) {
    flags.push('safe_context');
  }
  
  // Embeds from official platforms are generally safer
  if (isEmbed) {
    flags.push('platform_embed');
  }
  
  // Determine final risk level
  const hasReviewFlags = flags.some(f => f.startsWith('review:'));
  const requiresReview = hasReviewFlags && !isVerifiedEntity;
  
  // Auto-approve eligibility
  const autoApproveEligible = 
    risk === 'safe' &&
    !hasReviewFlags &&
    (isVerifiedEntity || hasSafeContext || isEmbed);
  
  // Adjust risk based on context
  if (risk === 'safe' && !autoApproveEligible && !isVerifiedEntity) {
    risk = 'low';
  }
  
  return {
    risk,
    flags,
    blockedReason,
    requiresReview,
    autoApproveEligible,
  };
}

/**
 * Check if an entity (person) should be blocked
 */
export function checkEntitySafety(entityName: string, entityType?: string): {
  isBlocked: boolean;
  reason?: string;
} {
  const lowerName = entityName.toLowerCase();
  
  // Block minors (check for keywords suggesting minor)
  const minorKeywords = ['kid', 'child', 'minor', 'teen', 'underage', 'young'];
  for (const keyword of minorKeywords) {
    if (lowerName.includes(keyword)) {
      return {
        isBlocked: true,
        reason: 'Entity name suggests minor - blocked for safety',
      };
    }
  }
  
  // Political personalities require special approval
  const politicalKeywords = ['mp', 'mla', 'minister', 'politician', 'political'];
  for (const keyword of politicalKeywords) {
    if (lowerName.includes(keyword)) {
      return {
        isBlocked: true,
        reason: 'Political personality - requires special approval',
      };
    }
  }
  
  return { isBlocked: false };
}

/**
 * Get safety badge info for UI display
 */
export function getSafetyBadge(risk: SafetyRisk): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (risk) {
    case 'safe':
      return { label: 'Safe', color: 'text-green-700', bgColor: 'bg-green-100', icon: '✅' };
    case 'low':
      return { label: 'Low Risk', color: 'text-green-600', bgColor: 'bg-green-50', icon: '🟢' };
    case 'medium':
      return { label: 'Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: '🟡' };
    case 'high':
      return { label: 'High Risk', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: '🟠' };
    case 'blocked':
      return { label: 'Blocked', color: 'text-red-700', bgColor: 'bg-red-100', icon: '🔴' };
    case 'pending':
    default:
      return { label: 'Pending', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: '⏳' };
  }
}

/**
 * Generate moderation summary
 */
export function generateModerationSummary(validation: SafetyValidation): string {
  const parts: string[] = [];
  
  if (validation.autoApproveEligible) {
    parts.push('✅ Auto-approve eligible');
  }
  
  if (validation.requiresReview) {
    parts.push('⚠️ Manual review required');
  }
  
  if (validation.blockedReason) {
    parts.push(`🚫 ${validation.blockedReason}`);
  }
  
  if (validation.flags.includes('verified_entity')) {
    parts.push('👤 Verified celebrity');
  }
  
  if (validation.flags.includes('safe_context')) {
    parts.push('📸 Safe glam context');
  }
  
  if (validation.flags.includes('platform_embed')) {
    parts.push('🔗 Platform embed (lower risk)');
  }
  
  const reviewFlags = validation.flags.filter(f => f.startsWith('review:'));
  if (reviewFlags.length > 0) {
    parts.push(`📋 Review flags: ${reviewFlags.map(f => f.replace('review:', '')).join(', ')}`);
  }
  
  return parts.join('\n');
}

