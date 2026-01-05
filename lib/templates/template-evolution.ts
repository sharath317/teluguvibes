/**
 * Template Evolution Engine
 * 
 * Evolves templates based on performance:
 * - Composes templates from atomic blocks
 * - Tracks success rates
 * - Promotes high-performing blocks
 * - Retires weak blocks
 * - Adapts to audience preferences over time
 * 
 * GOAL: Eventually produce content indistinguishable from human-written articles
 * without needing AI generation.
 */

import { 
  AtomicBlock, 
  BlockType, 
  ATOMIC_BLOCKS,
  getBlocksByType,
  getBlocksByCluster,
  getBestBlock,
  fillBlock,
  updateBlockPerformance,
  BlockFillResult,
} from './atomic-blocks';
import { 
  StyleCluster, 
  STYLE_CLUSTERS,
  getClusterById,
  getBestClusterForContent,
  extractTemplateParams,
} from '../style/style-clusters';
import { calculateTeluguEmotionScore } from '../validation/telugu-emotion';

// ============================================================
// TYPES
// ============================================================

export interface TemplateComposition {
  id: string;
  name: string;
  description: string;
  category: string;                    // 'entertainment', 'hot', 'news', etc.
  styleClusterId: string;
  blockSequence: BlockType[];          // Order of block types to use
  targetWordCount: number;
  
  // Performance tracking
  confidenceScore: number;
  usageCount: number;
  successRate: number;
  avgEngagement: number;
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  evolutionGeneration: number;         // How many times this template has evolved
}

export interface GeneratedContent {
  templateId: string;
  title: string;
  body: string;
  blocks: BlockFillResult[];
  totalChars: number;
  wordCount: number;
  emotionScore: number;
  templateConfidence: number;
  clusterId: string;
  generatedAt: Date;
}

export interface EvolutionResult {
  templatesEvolved: number;
  blocksPromoted: number;
  blocksRetired: number;
  newBlocksCreated: number;
  overallConfidenceChange: number;
}

// ============================================================
// TEMPLATE COMPOSITIONS
// ============================================================

export const TEMPLATE_COMPOSITIONS: TemplateComposition[] = [
  // Entertainment/Celebrity Feature
  {
    id: 'entertainment_celebrity_feature',
    name: 'Celebrity Feature',
    description: 'Fan-focused celebrity feature with emotional connection',
    category: 'entertainment',
    styleClusterId: 'emotional_soft',
    blockSequence: ['hook', 'context', 'emotion', 'glamour', 'fan_connect', 'closing'],
    targetWordCount: 350,
    confidenceScore: 0.75,
    usageCount: 0,
    successRate: 0,
    avgEngagement: 0,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    evolutionGeneration: 1,
  },
  
  // Hot/Glamour Quick Update
  {
    id: 'hot_glamour_quick',
    name: 'Glamour Quick Update',
    description: 'Short, punchy glamour content for hot section',
    category: 'hot',
    styleClusterId: 'mass_punchy',
    blockSequence: ['hook', 'glamour', 'trend', 'closing'],
    targetWordCount: 200,
    confidenceScore: 0.7,
    usageCount: 0,
    successRate: 0,
    avgEngagement: 0,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    evolutionGeneration: 1,
  },
  
  // Nostalgic Throwback
  {
    id: 'nostalgia_throwback',
    name: 'Nostalgic Throwback',
    description: 'Memory-triggering throwback content',
    category: 'entertainment',
    styleClusterId: 'nostalgia_heavy',
    blockSequence: ['hook', 'nostalgia', 'context', 'emotion', 'nostalgia', 'fan_connect', 'closing'],
    targetWordCount: 400,
    confidenceScore: 0.8,
    usageCount: 0,
    successRate: 0,
    avgEngagement: 0,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    evolutionGeneration: 1,
  },
  
  // News Update
  {
    id: 'news_update',
    name: 'News Update',
    description: 'Factual news update with minimal emotion',
    category: 'news',
    styleClusterId: 'news_neutral',
    blockSequence: ['hook', 'context', 'context', 'transition', 'closing'],
    targetWordCount: 300,
    confidenceScore: 0.85,
    usageCount: 0,
    successRate: 0,
    avgEngagement: 0,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    evolutionGeneration: 1,
  },
  
  // Glamour Photoshoot Feature
  {
    id: 'glamour_photoshoot',
    name: 'Photoshoot Feature',
    description: 'Descriptive glamour content for photoshoots',
    category: 'hot',
    styleClusterId: 'glamour_poetic',
    blockSequence: ['hook', 'glamour', 'glamour', 'fan_connect', 'trend', 'closing'],
    targetWordCount: 350,
    confidenceScore: 0.75,
    usageCount: 0,
    successRate: 0,
    avgEngagement: 0,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    evolutionGeneration: 1,
  },
  
  // Viral/Trending Quick
  {
    id: 'viral_trending',
    name: 'Viral Trending',
    description: 'Quick viral content for trending topics',
    category: 'trending',
    styleClusterId: 'mass_punchy',
    blockSequence: ['hook', 'trend', 'emotion', 'closing'],
    targetWordCount: 180,
    confidenceScore: 0.7,
    usageCount: 0,
    successRate: 0,
    avgEngagement: 0,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    evolutionGeneration: 1,
  },
  
  // Achievement/Milestone
  {
    id: 'achievement_milestone',
    name: 'Achievement Milestone',
    description: 'Celebrating successes and milestones',
    category: 'entertainment',
    styleClusterId: 'emotional_soft',
    blockSequence: ['hook', 'achievement', 'context', 'emotion', 'fan_connect', 'closing'],
    targetWordCount: 320,
    confidenceScore: 0.8,
    usageCount: 0,
    successRate: 0,
    avgEngagement: 0,
    isActive: true,
    createdAt: new Date(),
    lastUsedAt: null,
    evolutionGeneration: 1,
  },
];

// ============================================================
// TEMPLATE SELECTION
// ============================================================

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): TemplateComposition | undefined {
  return TEMPLATE_COMPOSITIONS.find(t => t.id === templateId);
}

/**
 * Get best template for content
 */
export function getBestTemplate(
  category: string,
  options?: {
    preferNostalgia?: boolean;
    isViral?: boolean;
    isGlamour?: boolean;
    minConfidence?: number;
  }
): TemplateComposition {
  let candidates = TEMPLATE_COMPOSITIONS.filter(t => 
    t.isActive && 
    t.confidenceScore >= (options?.minConfidence || 0.5)
  );
  
  // Category match
  const categoryMatch = candidates.filter(t => t.category === category);
  if (categoryMatch.length > 0) {
    candidates = categoryMatch;
  }
  
  // Special preferences
  if (options?.preferNostalgia) {
    const nostalgiaMatch = candidates.filter(t => 
      t.styleClusterId === 'nostalgia_heavy' || 
      t.blockSequence.includes('nostalgia')
    );
    if (nostalgiaMatch.length > 0) candidates = nostalgiaMatch;
  }
  
  if (options?.isViral) {
    const viralMatch = candidates.filter(t => 
      t.styleClusterId === 'mass_punchy' || 
      t.blockSequence.includes('trend')
    );
    if (viralMatch.length > 0) candidates = viralMatch;
  }
  
  if (options?.isGlamour) {
    const glamourMatch = candidates.filter(t => 
      t.styleClusterId === 'glamour_poetic' || 
      t.blockSequence.includes('glamour')
    );
    if (glamourMatch.length > 0) candidates = glamourMatch;
  }
  
  // Sort by confidence and success rate
  candidates.sort((a, b) => {
    const scoreA = a.confidenceScore * 0.6 + a.successRate * 0.4;
    const scoreB = b.confidenceScore * 0.6 + b.successRate * 0.4;
    return scoreB - scoreA;
  });
  
  return candidates[0] || TEMPLATE_COMPOSITIONS[0];
}

// ============================================================
// CONTENT GENERATION
// ============================================================

/**
 * Generate content using a template (NO AI)
 */
export function generateFromTemplate(
  template: TemplateComposition,
  values: Record<string, string>,
  options?: {
    titleOverride?: string;
  }
): GeneratedContent {
  const cluster = getClusterById(template.styleClusterId);
  const blocks: BlockFillResult[] = [];
  
  // Generate each block in sequence
  for (const blockType of template.blockSequence) {
    const block = getBestBlock(blockType, template.styleClusterId, {
      preferEmotion: determinePreferredEmotion(blockType, template),
    });
    
    if (block) {
      const filled = fillBlock(block, values);
      blocks.push(filled);
    }
  }
  
  // Combine blocks into body
  const body = blocks.map(b => b.filledText).join(' ');
  const totalChars = body.length;
  const wordCount = body.split(/\s+/).length;
  
  // Calculate emotion score
  const emotionResult = calculateTeluguEmotionScore(body);
  
  // Generate title from values or use override
  const title = options?.titleOverride || generateTitle(values, template);
  
  // Calculate template confidence
  const templateConfidence = calculateTemplateConfidence(template, blocks, emotionResult.score);
  
  return {
    templateId: template.id,
    title,
    body,
    blocks,
    totalChars,
    wordCount,
    emotionScore: emotionResult.score,
    templateConfidence,
    clusterId: template.styleClusterId,
    generatedAt: new Date(),
  };
}

/**
 * Determine preferred emotion for a block type
 */
function determinePreferredEmotion(
  blockType: BlockType,
  template: TemplateComposition
): AtomicBlock['emotionType'] | undefined {
  const emotionMap: Partial<Record<BlockType, AtomicBlock['emotionType']>> = {
    hook: 'excitement',
    emotion: 'pride',
    nostalgia: 'nostalgia',
    fan_connect: 'pride',
    glamour: 'excitement',
    achievement: 'pride',
    closing: 'pride',
  };
  
  // Nostalgic templates prefer nostalgia
  if (template.styleClusterId === 'nostalgia_heavy') {
    if (blockType === 'emotion' || blockType === 'hook') {
      return 'nostalgia';
    }
  }
  
  return emotionMap[blockType];
}

/**
 * Generate title from values
 */
function generateTitle(
  values: Record<string, string>,
  template: TemplateComposition
): string {
  const celebrity = values.celebrity_name || values.celebrity;
  const topic = values.topic || '';
  
  // Title templates based on category/style
  const titleTemplates: Record<string, string[]> = {
    hot: [
      `${celebrity} - లేటెస్ట్ ఫోటోస్ వైరల్!`,
      `${celebrity} అందాల విందు - ఫ్యాన్స్ ఫిదా!`,
    ],
    entertainment: [
      `${celebrity} - అభిమానుల హృదయాలలో చెరగని ముద్ర`,
      `${celebrity} కొత్త అప్డేట్ - ఫ్యాన్స్ ఎగ్జైటెడ్!`,
    ],
    nostalgia_heavy: [
      `గుర్తున్నాయా ఆ రోజులు - ${celebrity} థ్రోబ్యాక్`,
      `${celebrity} క్లాసిక్ మొమెంట్స్ - మధుర జ్ఞాపకాలు`,
    ],
    trending: [
      `ట్రెండింగ్: ${celebrity} సోషల్ మీడియాలో వైరల్!`,
      `${celebrity} - ఈ వీక్ టాప్ ట్రెండ్!`,
    ],
  };
  
  const templates = titleTemplates[template.category] || titleTemplates[template.styleClusterId] || titleTemplates.entertainment;
  return templates[Math.floor(Math.random() * templates.length)];
}

// ============================================================
// CONFIDENCE CALCULATION
// ============================================================

/**
 * Calculate overall template confidence
 */
function calculateTemplateConfidence(
  template: TemplateComposition,
  blocks: BlockFillResult[],
  emotionScore: number
): number {
  // Base confidence from template
  let confidence = template.confidenceScore * 0.4;
  
  // Block confidence contribution
  const avgBlockConfidence = blocks.length > 0
    ? blocks.reduce((sum, b) => sum + b.block.confidenceScore, 0) / blocks.length
    : 0.5;
  confidence += avgBlockConfidence * 0.3;
  
  // Emotion score contribution
  confidence += (emotionScore / 100) * 0.2;
  
  // Completeness bonus (all blocks filled properly)
  const completenessRatio = blocks.filter(b => !b.filledText.includes('{')).length / blocks.length;
  confidence += completenessRatio * 0.1;
  
  return Math.min(1, Math.max(0, confidence));
}

/**
 * Check if content meets confidence threshold
 */
export function meetsConfidenceThreshold(
  content: GeneratedContent,
  threshold: number = 0.85
): {
  meets: boolean;
  confidence: number;
  action: 'auto_publish' | 'needs_review' | 'ai_assist';
} {
  const confidence = content.templateConfidence;
  
  if (confidence >= threshold) {
    return { meets: true, confidence, action: 'auto_publish' };
  } else if (confidence >= 0.7) {
    return { meets: false, confidence, action: 'needs_review' };
  } else {
    return { meets: false, confidence, action: 'ai_assist' };
  }
}

// ============================================================
// EVOLUTION ENGINE
// ============================================================

/**
 * Record template usage and outcome
 */
export function recordTemplateOutcome(
  templateId: string,
  success: boolean,
  metrics: {
    views?: number;
    engagement?: number;
    bounceRate?: number;
    timeOnPage?: number;
  }
): void {
  const template = TEMPLATE_COMPOSITIONS.find(t => t.id === templateId);
  if (!template) return;
  
  template.usageCount++;
  template.lastUsedAt = new Date();
  
  // Update success rate (exponential moving average)
  const alpha = 0.1; // Smoothing factor
  const outcome = success ? 1 : 0;
  template.successRate = template.usageCount === 1
    ? outcome
    : template.successRate * (1 - alpha) + outcome * alpha;
  
  // Update engagement average
  if (metrics.engagement !== undefined) {
    template.avgEngagement = template.usageCount === 1
      ? metrics.engagement
      : template.avgEngagement * (1 - alpha) + metrics.engagement * alpha;
  }
  
  // Recalculate confidence based on outcomes
  template.confidenceScore = calculateEvolutionConfidence(template);
}

/**
 * Calculate evolved confidence score
 */
function calculateEvolutionConfidence(template: TemplateComposition): number {
  // Base confidence
  let confidence = 0.5;
  
  // Success rate contribution (max 0.3)
  confidence += template.successRate * 0.3;
  
  // Usage count contribution (more usage = more reliable, max 0.15)
  const usageBonus = Math.min(0.15, template.usageCount * 0.01);
  confidence += usageBonus;
  
  // Engagement contribution (max 0.05)
  confidence += Math.min(0.05, template.avgEngagement / 100 * 0.05);
  
  return Math.min(0.95, Math.max(0.3, confidence));
}

/**
 * Run evolution cycle - improve templates based on performance
 */
export function runEvolutionCycle(): EvolutionResult {
  const result: EvolutionResult = {
    templatesEvolved: 0,
    blocksPromoted: 0,
    blocksRetired: 0,
    newBlocksCreated: 0,
    overallConfidenceChange: 0,
  };
  
  const prevAvgConfidence = TEMPLATE_COMPOSITIONS
    .filter(t => t.isActive)
    .reduce((sum, t) => sum + t.confidenceScore, 0) / TEMPLATE_COMPOSITIONS.filter(t => t.isActive).length;
  
  // Evolve templates with enough data
  for (const template of TEMPLATE_COMPOSITIONS) {
    if (template.usageCount >= 10) {
      // Low performers get adjusted
      if (template.successRate < 0.4) {
        // Try to improve by adjusting block sequence
        template.evolutionGeneration++;
        result.templatesEvolved++;
      }
      
      // High performers are stable
      if (template.successRate > 0.7 && template.confidenceScore < 0.9) {
        template.confidenceScore = Math.min(0.9, template.confidenceScore + 0.05);
      }
    }
  }
  
  // Update block confidence based on usage
  for (const block of ATOMIC_BLOCKS) {
    const total = block.successCount + block.failureCount;
    
    if (total >= 10) {
      const rate = block.successCount / total;
      
      // Promote high performers
      if (rate > 0.7 && block.confidenceScore < 0.9) {
        block.confidenceScore = Math.min(0.9, block.confidenceScore + 0.05);
        result.blocksPromoted++;
      }
      
      // Retire consistent failures
      if (rate < 0.3 && total >= 20) {
        block.isActive = false;
        result.blocksRetired++;
      }
    }
  }
  
  const newAvgConfidence = TEMPLATE_COMPOSITIONS
    .filter(t => t.isActive)
    .reduce((sum, t) => sum + t.confidenceScore, 0) / TEMPLATE_COMPOSITIONS.filter(t => t.isActive).length;
  
  result.overallConfidenceChange = newAvgConfidence - prevAvgConfidence;
  
  return result;
}

/**
 * Get template statistics
 */
export function getTemplateStats(): {
  totalTemplates: number;
  activeTemplates: number;
  avgConfidence: number;
  avgSuccessRate: number;
  byCategory: Record<string, number>;
  topPerformers: TemplateComposition[];
} {
  const active = TEMPLATE_COMPOSITIONS.filter(t => t.isActive);
  
  const byCategory: Record<string, number> = {};
  for (const t of active) {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  }
  
  const avgConfidence = active.length > 0
    ? active.reduce((sum, t) => sum + t.confidenceScore, 0) / active.length
    : 0;
  
  const avgSuccessRate = active.filter(t => t.usageCount > 0).length > 0
    ? active.filter(t => t.usageCount > 0).reduce((sum, t) => sum + t.successRate, 0) / active.filter(t => t.usageCount > 0).length
    : 0;
  
  const topPerformers = [...active]
    .filter(t => t.usageCount > 0)
    .sort((a, b) => (b.successRate * b.confidenceScore) - (a.successRate * a.confidenceScore))
    .slice(0, 3);
  
  return {
    totalTemplates: TEMPLATE_COMPOSITIONS.length,
    activeTemplates: active.length,
    avgConfidence,
    avgSuccessRate,
    byCategory,
    topPerformers,
  };
}

export default {
  TEMPLATE_COMPOSITIONS,
  getTemplateById,
  getBestTemplate,
  generateFromTemplate,
  meetsConfidenceThreshold,
  recordTemplateOutcome,
  runEvolutionCycle,
  getTemplateStats,
};






