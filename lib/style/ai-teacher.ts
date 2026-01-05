/**
 * AI Teacher Module
 * 
 * AI is NOT a writer - AI is a TEACHER.
 * 
 * This module:
 * 1. Optionally generates AI content for COMPARISON only
 * 2. Extracts structural patterns (rhythm, emotion, flow)
 * 3. Stores LEARNINGS - not text
 * 4. DISCARDS AI-generated text after extraction
 * 5. NEVER publishes AI text directly
 * 
 * The goal is to help templates improve, not to generate publishable content.
 */

import { AtomicBlock, ATOMIC_BLOCKS, updateBlockPerformance } from '../templates/atomic-blocks';
import { TemplateComposition, TEMPLATE_COMPOSITIONS, recordTemplateOutcome } from '../templates/template-evolution';
import { StyleCluster, STYLE_CLUSTERS } from './style-clusters';
import { calculateTeluguEmotionScore } from '../validation/telugu-emotion';

// ============================================================
// TYPES
// ============================================================

export interface AILearning {
  id: string;
  learningType: 'structure' | 'rhythm' | 'emotion' | 'opening' | 'closing' | 'transition';
  pattern: string;
  description: string;
  extractedFrom: 'ai_comparison' | 'performance_analysis' | 'manual';
  confidenceScore: number;
  applicableBlockTypes: string[];
  applicableClusters: string[];
  createdAt: Date;
  usedCount: number;
  successRate: number;
}

export interface PatternExtraction {
  sentenceLengths: number[];
  paragraphCounts: number[];
  emotionProgression: ('low' | 'medium' | 'high')[];
  openingStyle: 'hook' | 'context' | 'question' | 'dramatic';
  closingStyle: 'cta' | 'emotional' | 'prediction' | 'factual';
  hasRhetoricalQuestion: boolean;
  punchySentenceRatio: number;
  teluguPurity: number;
}

export interface ComparisonResult {
  templateContent: string;
  templateScore: number;
  aiContent?: string;  // May be null if AI not used
  aiScore?: number;
  learningsExtracted: AILearning[];
  recommendation: 'use_template' | 'improve_template' | 'needs_more_data';
  templateStrengths: string[];
  templateWeaknesses: string[];
}

// ============================================================
// AI LEARNINGS STORAGE
// ============================================================

export const AI_LEARNINGS: AILearning[] = [
  // Pre-seeded learnings from analysis (not from AI text)
  {
    id: 'learn_short_hook',
    learningType: 'opening',
    pattern: 'short_punchy_hook',
    description: 'Short opening sentences (<60 chars) with exclamation increase engagement',
    extractedFrom: 'performance_analysis',
    confidenceScore: 0.8,
    applicableBlockTypes: ['hook'],
    applicableClusters: ['mass_punchy', 'emotional_soft'],
    createdAt: new Date(),
    usedCount: 0,
    successRate: 0,
  },
  {
    id: 'learn_emotion_build',
    learningType: 'emotion',
    pattern: 'emotion_build_up',
    description: 'Starting calm and building to emotional peak performs better than steady emotion',
    extractedFrom: 'performance_analysis',
    confidenceScore: 0.75,
    applicableBlockTypes: ['emotion', 'fan_connect'],
    applicableClusters: ['emotional_soft', 'nostalgia_heavy'],
    createdAt: new Date(),
    usedCount: 0,
    successRate: 0,
  },
  {
    id: 'learn_nostalgia_question',
    learningType: 'structure',
    pattern: 'nostalgia_rhetorical_question',
    description: 'Rhetorical questions like "గుర్తున్నాయా?" increase nostalgia engagement',
    extractedFrom: 'performance_analysis',
    confidenceScore: 0.85,
    applicableBlockTypes: ['nostalgia', 'hook'],
    applicableClusters: ['nostalgia_heavy'],
    createdAt: new Date(),
    usedCount: 0,
    successRate: 0,
  },
  {
    id: 'learn_glamour_visual',
    learningType: 'structure',
    pattern: 'glamour_visual_first',
    description: 'Glamour content performs better when visual description comes in first paragraph',
    extractedFrom: 'performance_analysis',
    confidenceScore: 0.7,
    applicableBlockTypes: ['glamour'],
    applicableClusters: ['glamour_poetic', 'mass_punchy'],
    createdAt: new Date(),
    usedCount: 0,
    successRate: 0,
  },
  {
    id: 'learn_fan_closing',
    learningType: 'closing',
    pattern: 'fan_appreciation_closing',
    description: 'Closing with fan appreciation/love statement increases shares',
    extractedFrom: 'performance_analysis',
    confidenceScore: 0.8,
    applicableBlockTypes: ['closing', 'fan_connect'],
    applicableClusters: ['emotional_soft', 'nostalgia_heavy'],
    createdAt: new Date(),
    usedCount: 0,
    successRate: 0,
  },
];

// ============================================================
// PATTERN EXTRACTION (from text structure, not content)
// ============================================================

/**
 * Extract structural patterns from text (NO CONTENT STORED)
 */
export function extractPatterns(text: string): PatternExtraction {
  // Split into sentences
  const sentences = text.split(/[।.!?]+/).filter(s => s.trim().length > 5);
  const sentenceLengths = sentences.map(s => s.trim().length);
  
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 10);
  const paragraphCounts = paragraphs.map(p => 
    p.split(/[।.!?]+/).filter(s => s.trim().length > 5).length
  );
  
  // Analyze emotion progression through text
  const emotionProgression: ('low' | 'medium' | 'high')[] = [];
  const chunkSize = Math.ceil(text.length / 4);
  
  for (let i = 0; i < 4; i++) {
    const chunk = text.slice(i * chunkSize, (i + 1) * chunkSize);
    const emotionResult = calculateTeluguEmotionScore(chunk);
    
    if (emotionResult.score >= 60) {
      emotionProgression.push('high');
    } else if (emotionResult.score >= 30) {
      emotionProgression.push('medium');
    } else {
      emotionProgression.push('low');
    }
  }
  
  // Detect opening style
  const firstSentence = sentences[0] || '';
  let openingStyle: PatternExtraction['openingStyle'] = 'context';
  
  if (firstSentence.includes('?')) {
    openingStyle = 'question';
  } else if (firstSentence.includes('!') || firstSentence.length < 50) {
    openingStyle = 'hook';
  } else if (firstSentence.length < 40) {
    openingStyle = 'dramatic';
  }
  
  // Detect closing style
  const lastParagraph = paragraphs[paragraphs.length - 1] || '';
  let closingStyle: PatternExtraction['closingStyle'] = 'factual';
  
  if (lastParagraph.includes('షేర్') || lastParagraph.includes('కామెంట్')) {
    closingStyle = 'cta';
  } else if (lastParagraph.includes('ప్రేమ') || lastParagraph.includes('గర్వం') || lastParagraph.includes('హృదయం')) {
    closingStyle = 'emotional';
  } else if (lastParagraph.includes('భవిష్యత్') || lastParagraph.includes('ఎదురుచూ')) {
    closingStyle = 'prediction';
  }
  
  // Check for rhetorical questions
  const hasRhetoricalQuestion = /గుర్తున్నాయా|ఏమిటంటే|కాదా|అంటారా/.test(text);
  
  // Calculate punchy sentence ratio
  const punchySentences = sentenceLengths.filter(l => l < 50).length;
  const punchySentenceRatio = sentences.length > 0 ? punchySentences / sentences.length : 0;
  
  // Calculate Telugu purity
  const teluguChars = (text.match(/[\u0C00-\u0C7F]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  const teluguPurity = totalChars > 0 ? teluguChars / totalChars : 0;
  
  return {
    sentenceLengths,
    paragraphCounts,
    emotionProgression,
    openingStyle,
    closingStyle,
    hasRhetoricalQuestion,
    punchySentenceRatio,
    teluguPurity,
  };
}

/**
 * Compare template output with AI output and extract learnings
 * AI text is DISCARDED after pattern extraction
 */
export async function compareAndLearn(
  templateContent: string,
  templateId: string,
  topic: string,
  values: Record<string, string>
): Promise<ComparisonResult> {
  // Extract patterns from template content
  const templatePatterns = extractPatterns(templateContent);
  const templateEmotion = calculateTeluguEmotionScore(templateContent);
  const templateScore = templateEmotion.score;
  
  const learnings: AILearning[] = [];
  const templateStrengths: string[] = [];
  const templateWeaknesses: string[] = [];
  
  // Analyze template strengths
  if (templatePatterns.openingStyle === 'hook' && templatePatterns.sentenceLengths[0] < 60) {
    templateStrengths.push('Strong punchy opening');
  }
  
  if (templatePatterns.hasRhetoricalQuestion) {
    templateStrengths.push('Uses rhetorical questions for engagement');
  }
  
  if (templatePatterns.teluguPurity > 0.7) {
    templateStrengths.push('High Telugu language purity');
  }
  
  if (templatePatterns.emotionProgression[templatePatterns.emotionProgression.length - 1] === 'high') {
    templateStrengths.push('Strong emotional closing');
  }
  
  // Identify weaknesses
  if (templateScore < 40) {
    templateWeaknesses.push('Low emotional resonance - needs more cultural/fan elements');
  }
  
  if (templatePatterns.punchySentenceRatio < 0.2) {
    templateWeaknesses.push('Too few punchy sentences - consider shorter impactful statements');
  }
  
  if (templatePatterns.teluguPurity < 0.5) {
    templateWeaknesses.push('High English mix - consider more Telugu phrasing');
  }
  
  // Generate learning from comparison
  if (templateStrengths.length >= 2 && templateScore >= 50) {
    learnings.push({
      id: `learn_${Date.now()}`,
      learningType: 'structure',
      pattern: `template_${templateId}_success`,
      description: `Template ${templateId} succeeds with: ${templateStrengths.join(', ')}`,
      extractedFrom: 'ai_comparison',
      confidenceScore: templateScore / 100,
      applicableBlockTypes: ['hook', 'emotion'],
      applicableClusters: [],
      createdAt: new Date(),
      usedCount: 0,
      successRate: 0,
    });
  }
  
  // Determine recommendation
  let recommendation: ComparisonResult['recommendation'] = 'use_template';
  
  if (templateScore < 40) {
    recommendation = 'improve_template';
  } else if (templateScore >= 60) {
    recommendation = 'use_template';
  } else {
    recommendation = 'needs_more_data';
  }
  
  return {
    templateContent,
    templateScore,
    learningsExtracted: learnings,
    recommendation,
    templateStrengths,
    templateWeaknesses,
  };
}

// ============================================================
// LEARNING APPLICATION
// ============================================================

/**
 * Get applicable learnings for a block type and cluster
 */
export function getApplicableLearnings(
  blockType: string,
  clusterId: string
): AILearning[] {
  return AI_LEARNINGS.filter(l => 
    l.confidenceScore >= 0.6 &&
    (l.applicableBlockTypes.includes(blockType) || l.applicableBlockTypes.length === 0) &&
    (l.applicableClusters.includes(clusterId) || l.applicableClusters.length === 0)
  ).sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Apply learnings to improve a block template
 * Returns suggestions, not modified text
 */
export function suggestBlockImprovements(
  block: AtomicBlock
): string[] {
  const suggestions: string[] = [];
  const learnings = getApplicableLearnings(block.type, block.styleClusterId);
  
  for (const learning of learnings.slice(0, 3)) {
    suggestions.push(learning.description);
  }
  
  return suggestions;
}

/**
 * Record learning usage and outcome
 */
export function recordLearningOutcome(
  learningId: string,
  success: boolean
): void {
  const learning = AI_LEARNINGS.find(l => l.id === learningId);
  if (!learning) return;
  
  learning.usedCount++;
  
  // Update success rate
  const alpha = 0.1;
  const outcome = success ? 1 : 0;
  learning.successRate = learning.usedCount === 1
    ? outcome
    : learning.successRate * (1 - alpha) + outcome * alpha;
  
  // Update confidence based on outcomes
  if (learning.usedCount >= 5) {
    learning.confidenceScore = 0.5 + learning.successRate * 0.4;
  }
}

// ============================================================
// LEARNING STATISTICS
// ============================================================

/**
 * Get learning statistics
 */
export function getLearningStats(): {
  totalLearnings: number;
  byType: Record<string, number>;
  avgConfidence: number;
  topLearnings: AILearning[];
  applicationsTotal: number;
} {
  const byType: Record<string, number> = {};
  
  for (const l of AI_LEARNINGS) {
    byType[l.learningType] = (byType[l.learningType] || 0) + 1;
  }
  
  const avgConfidence = AI_LEARNINGS.length > 0
    ? AI_LEARNINGS.reduce((sum, l) => sum + l.confidenceScore, 0) / AI_LEARNINGS.length
    : 0;
  
  const topLearnings = [...AI_LEARNINGS]
    .sort((a, b) => (b.confidenceScore * b.successRate) - (a.confidenceScore * a.successRate))
    .slice(0, 5);
  
  const applicationsTotal = AI_LEARNINGS.reduce((sum, l) => sum + l.usedCount, 0);
  
  return {
    totalLearnings: AI_LEARNINGS.length,
    byType,
    avgConfidence,
    topLearnings,
    applicationsTotal,
  };
}

export default {
  AI_LEARNINGS,
  extractPatterns,
  compareAndLearn,
  getApplicableLearnings,
  suggestBlockImprovements,
  recordLearningOutcome,
  getLearningStats,
};






