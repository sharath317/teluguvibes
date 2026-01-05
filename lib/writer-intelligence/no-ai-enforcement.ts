/**
 * NO-AI PUBLISHING ENFORCEMENT
 * 
 * CRITICAL: This module enforces that AI-generated text is NEVER published directly.
 * 
 * Templates are the primary writing system:
 * - AI can ONLY analyze structure, compare patterns, and suggest deltas
 * - AI output is NEVER published directly
 * - All content must pass through template transformation
 * 
 * ENFORCEMENT LAYERS:
 * 1. Config flag: NO_AI_PUBLISH=true
 * 2. Publishing gate check
 * 3. Audit logging
 * 4. Content source tracking
 */

// ============================================================
// CONFIG
// ============================================================

/**
 * Global enforcement flag
 * Set via environment variable or runtime config
 */
export const NO_AI_PUBLISH = process.env.NO_AI_PUBLISH !== 'false';

/**
 * Enforcement mode
 * - 'strict': Block all AI content, log violations
 * - 'audit': Allow with logging (for migration period)
 * - 'disabled': No enforcement (testing only)
 */
export type EnforcementMode = 'strict' | 'audit' | 'disabled';

export const ENFORCEMENT_MODE: EnforcementMode = 
  (process.env.AI_ENFORCEMENT_MODE as EnforcementMode) || 'strict';

// ============================================================
// TYPES
// ============================================================

export type ContentSource = 
  | 'template'           // Pure template-generated
  | 'template_evolved'   // Template with learned patterns
  | 'human_written'      // Written by human editor
  | 'ai_assisted'        // Human-edited AI draft
  | 'ai_generated'       // Raw AI output (BLOCKED)
  | 'unknown';           // Source unclear (BLOCKED in strict mode)

export interface ContentMetadata {
  contentId: string;
  source: ContentSource;
  templateId?: string;
  profileId?: string;
  confidence: number;
  aiAssistType?: 'structure_analysis' | 'pattern_comparison' | 'delta_suggestion';
  humanEdited: boolean;
  generatedAt: Date;
}

export interface PublishGateResult {
  allowed: boolean;
  reason: string;
  source: ContentSource;
  requiresHumanReview: boolean;
  enforcementMode: EnforcementMode;
}

export interface AIAssistLog {
  contentId: string;
  purpose: 'structure_analysis' | 'pattern_comparison' | 'delta_suggestion' | 'quality_check';
  confidenceScore: number;
  timestamp: Date;
  wasUsed: boolean;
  humanOverride: boolean;
}

export interface ViolationLog {
  contentId: string;
  attemptedSource: ContentSource;
  blockedAt: Date;
  reason: string;
  enforcementMode: EnforcementMode;
}

// ============================================================
// CONTENT SOURCE DETECTION
// ============================================================

/**
 * Detect content source from metadata
 */
export function detectContentSource(content: {
  templateId?: string;
  aiGenerated?: boolean;
  humanEdited?: boolean;
  source?: string;
}): ContentSource {
  // Explicitly marked as human-written
  if (content.source === 'human_written' || content.humanEdited === true) {
    return 'human_written';
  }
  
  // Has template ID = template-generated
  if (content.templateId && !content.aiGenerated) {
    return content.humanEdited ? 'template_evolved' : 'template';
  }
  
  // AI generated but human-edited
  if (content.aiGenerated && content.humanEdited) {
    return 'ai_assisted';
  }
  
  // Pure AI generated (BLOCKED)
  if (content.aiGenerated) {
    return 'ai_generated';
  }
  
  // Unknown source
  return 'unknown';
}

/**
 * Check if content source is publishable
 */
export function isPublishableSource(source: ContentSource): boolean {
  const publishableSources: ContentSource[] = [
    'template',
    'template_evolved',
    'human_written',
    'ai_assisted',  // Human-edited AI is okay
  ];
  
  return publishableSources.includes(source);
}

// ============================================================
// PUBLISHING GATE
// ============================================================

/**
 * Main publishing gate - check if content can be published
 */
export function checkPublishingGate(
  content: {
    id: string;
    source?: ContentSource;
    templateId?: string;
    aiGenerated?: boolean;
    humanEdited?: boolean;
    confidence?: number;
  }
): PublishGateResult {
  // Detect source if not explicitly provided
  const source = content.source || detectContentSource(content);
  
  // ENFORCEMENT DISABLED
  if (ENFORCEMENT_MODE === 'disabled') {
    return {
      allowed: true,
      reason: 'Enforcement disabled',
      source,
      requiresHumanReview: false,
      enforcementMode: 'disabled',
    };
  }
  
  // AI GENERATED CONTENT - ALWAYS BLOCK IN STRICT MODE
  if (source === 'ai_generated') {
    logViolation({
      contentId: content.id,
      attemptedSource: source,
      blockedAt: new Date(),
      reason: 'AI-generated content cannot be published directly',
      enforcementMode: ENFORCEMENT_MODE,
    });
    
    return {
      allowed: ENFORCEMENT_MODE === 'audit',  // Allow in audit mode with logging
      reason: ENFORCEMENT_MODE === 'strict' 
        ? 'BLOCKED: AI-generated content cannot be published directly. Use templates or human editing.'
        : 'AUDIT: AI-generated content detected. Logging for review.',
      source,
      requiresHumanReview: true,
      enforcementMode: ENFORCEMENT_MODE,
    };
  }
  
  // UNKNOWN SOURCE - BLOCK IN STRICT MODE
  if (source === 'unknown') {
    return {
      allowed: ENFORCEMENT_MODE === 'audit',
      reason: ENFORCEMENT_MODE === 'strict'
        ? 'BLOCKED: Content source unknown. Must use templates or confirm human-written.'
        : 'AUDIT: Unknown content source. Logging for review.',
      source,
      requiresHumanReview: true,
      enforcementMode: ENFORCEMENT_MODE,
    };
  }
  
  // LOW CONFIDENCE TEMPLATE - NEEDS REVIEW
  if (source === 'template' && (content.confidence || 0) < 0.7) {
    return {
      allowed: true,
      reason: 'Template confidence below threshold - human review recommended',
      source,
      requiresHumanReview: true,
      enforcementMode: ENFORCEMENT_MODE,
    };
  }
  
  // PUBLISHABLE SOURCES
  if (isPublishableSource(source)) {
    return {
      allowed: true,
      reason: `Approved: ${source} content`,
      source,
      requiresHumanReview: source === 'ai_assisted',  // AI-assisted still needs review
      enforcementMode: ENFORCEMENT_MODE,
    };
  }
  
  // DEFAULT: Block unknown patterns
  return {
    allowed: false,
    reason: 'Content source not recognized as publishable',
    source,
    requiresHumanReview: true,
    enforcementMode: ENFORCEMENT_MODE,
  };
}

// ============================================================
// AI ASSIST LOGGING
// ============================================================

const aiAssistLogs: AIAssistLog[] = [];
const violationLogs: ViolationLog[] = [];

/**
 * Log AI assistance usage (allowed uses)
 */
export function logAIAssist(log: AIAssistLog): void {
  aiAssistLogs.push({
    ...log,
    timestamp: log.timestamp || new Date(),
  });
  
  // In production, this would go to database
  console.log(`📊 [AI Assist] ${log.purpose} for ${log.contentId} (confidence: ${log.confidenceScore.toFixed(2)})`);
}

/**
 * Log publishing violations
 */
export function logViolation(log: ViolationLog): void {
  violationLogs.push(log);
  
  // In production, this would go to database and alert system
  console.warn(`⚠️ [VIOLATION] ${log.reason} - Content: ${log.contentId}`);
}

/**
 * Get AI assist logs for content
 */
export function getAIAssistLogs(contentId: string): AIAssistLog[] {
  return aiAssistLogs.filter(log => log.contentId === contentId);
}

/**
 * Get all violation logs
 */
export function getViolationLogs(since?: Date): ViolationLog[] {
  if (since) {
    return violationLogs.filter(log => log.blockedAt >= since);
  }
  return [...violationLogs];
}

// ============================================================
// ALLOWED AI OPERATIONS
// ============================================================

/**
 * AI operations that ARE allowed
 */
export const ALLOWED_AI_OPERATIONS = [
  {
    operation: 'structure_analysis',
    description: 'Analyze content structure (paragraph count, sentence length distribution)',
    example: 'Counting paragraphs, measuring sentence variance',
  },
  {
    operation: 'pattern_comparison',
    description: 'Compare content patterns to successful templates',
    example: 'Similarity scoring between content and top-performing templates',
  },
  {
    operation: 'delta_suggestion',
    description: 'Suggest structural improvements (not content)',
    example: '"Consider shorter paragraphs" not "Change this sentence to..."',
  },
  {
    operation: 'quality_check',
    description: 'Validate Telugu nativity, emotion score, readability',
    example: 'Telugu emotion score: 72/100, Readability: Good',
  },
  {
    operation: 'entity_extraction',
    description: 'Extract entities (names, movies, events) from content',
    example: 'Entities: [Allu Arjun, Pushpa 2, Sukumar]',
  },
  {
    operation: 'categorization',
    description: 'Suggest content category based on patterns',
    example: 'Suggested category: entertainment, SubCategory: movie_update',
  },
];

/**
 * AI operations that are FORBIDDEN
 */
export const FORBIDDEN_AI_OPERATIONS = [
  {
    operation: 'text_generation',
    description: 'Generating article body text',
    reason: 'All content must come from templates or humans',
  },
  {
    operation: 'headline_generation',
    description: 'AI-generating headlines for publishing',
    reason: 'Headlines must use template patterns or human writing',
  },
  {
    operation: 'content_rewriting',
    description: 'AI rewriting human or template content',
    reason: 'Preserves authenticity and style consistency',
  },
  {
    operation: 'direct_publishing',
    description: 'Publishing AI output without template transformation',
    reason: 'Core enforcement rule: No AI text in published content',
  },
];

/**
 * Check if AI operation is allowed
 */
export function isAIOperationAllowed(operation: string): boolean {
  return ALLOWED_AI_OPERATIONS.some(op => op.operation === operation);
}

// ============================================================
// TEMPLATE-FIRST CONTENT WRAPPER
// ============================================================

/**
 * Wrap content generation to enforce template-first approach
 */
export async function generateWithTemplateFirst<T>(
  templateGenerator: () => T | Promise<T>,
  aiGenerator?: () => T | Promise<T>,
  options?: {
    templateConfidenceThreshold?: number;
    allowAIFallback?: boolean;
  }
): Promise<{ content: T; source: ContentSource; confidence: number }> {
  const threshold = options?.templateConfidenceThreshold || 0.85;
  
  // Always try template first
  try {
    const templateContent = await templateGenerator();
    
    // Calculate template confidence (would be done by template system)
    const confidence = 0.9; // Placeholder
    
    if (confidence >= threshold) {
      return {
        content: templateContent,
        source: 'template',
        confidence,
      };
    }
    
    // Template below threshold but still usable
    return {
      content: templateContent,
      source: 'template',
      confidence,
    };
  } catch (templateError) {
    console.log('Template generation failed:', templateError);
    
    // AI fallback only in audit mode and if explicitly allowed
    if (options?.allowAIFallback && ENFORCEMENT_MODE === 'audit' && aiGenerator) {
      console.warn('⚠️ Using AI fallback (audit mode only)');
      
      const aiContent = await aiGenerator();
      
      logAIAssist({
        contentId: 'fallback_' + Date.now(),
        purpose: 'delta_suggestion',
        confidenceScore: 0.5,
        timestamp: new Date(),
        wasUsed: true,
        humanOverride: false,
      });
      
      return {
        content: aiContent,
        source: 'ai_generated',  // Will be blocked by publishing gate
        confidence: 0.5,
      };
    }
    
    throw new Error('Template generation failed and AI fallback not allowed');
  }
}

// ============================================================
// ENFORCEMENT STATISTICS
// ============================================================

/**
 * Get enforcement statistics
 */
export function getEnforcementStats(): {
  mode: EnforcementMode;
  noAiPublishEnabled: boolean;
  totalAssistLogs: number;
  totalViolations: number;
  recentViolations: number;
  publishedBySource: Record<ContentSource, number>;
} {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return {
    mode: ENFORCEMENT_MODE,
    noAiPublishEnabled: NO_AI_PUBLISH,
    totalAssistLogs: aiAssistLogs.length,
    totalViolations: violationLogs.length,
    recentViolations: violationLogs.filter(v => v.blockedAt >= last24h).length,
    publishedBySource: {
      template: 0,      // Would be populated from DB
      template_evolved: 0,
      human_written: 0,
      ai_assisted: 0,
      ai_generated: 0,
      unknown: 0,
    },
  };
}

export default {
  NO_AI_PUBLISH,
  ENFORCEMENT_MODE,
  detectContentSource,
  isPublishableSource,
  checkPublishingGate,
  logAIAssist,
  logViolation,
  getAIAssistLogs,
  getViolationLogs,
  isAIOperationAllowed,
  ALLOWED_AI_OPERATIONS,
  FORBIDDEN_AI_OPERATIONS,
  generateWithTemplateFirst,
  getEnforcementStats,
};






