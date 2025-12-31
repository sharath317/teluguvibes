/**
 * CONTENT VALIDATION SYSTEM
 *
 * Validates content and assigns status:
 * - READY: Ready for publishing
 * - NEEDS_REVIEW: Human review required
 * - NEEDS_REWORK: Significant issues, regeneration needed
 */

import Groq from 'groq-sdk';
import type { ValidationResult, ContentStatus, NormalizedEntity, ImageCandidate } from './types';

// ============================================================
// VALIDATION THRESHOLDS
// ============================================================

const THRESHOLDS = {
  // Overall score thresholds
  READY_MIN_SCORE: 80,
  REVIEW_MIN_SCORE: 60,

  // Individual check thresholds
  FACTUAL_MIN: 70,
  EMOTIONAL_MIN: 60,
  IMAGE_MIN: 50,
  DEPTH_MIN: 60,
  TELUGU_MIN: 70,

  // Content requirements
  MIN_WORD_COUNT: 150,
  MAX_WORD_COUNT: 1000,
  MIN_TELUGU_RATIO: 0.7, // 70% Telugu characters
};

// ============================================================
// VALIDATION CHECKS
// ============================================================

function checkFactualCorrectness(entity: NormalizedEntity): { passed: boolean; score: number; reason?: string } {
  let score = 70; // Base score
  const reasons: string[] = [];

  // Check if we have source data
  if (entity.sources && entity.sources.length > 0) {
    score += 10;
  } else {
    reasons.push('No source data available');
  }

  // Check source confidence
  const avgConfidence = entity.sources?.reduce((sum, s) => sum + s.confidence, 0) / (entity.sources?.length || 1);
  if (avgConfidence > 0.8) score += 10;
  if (avgConfidence < 0.5) {
    score -= 15;
    reasons.push('Low source confidence');
  }

  // Check for multiple sources (cross-verification)
  if (entity.sources && entity.sources.length >= 2) {
    score += 10;
  }

  // Penalize if content seems generated without context
  if (!entity.body_te || entity.body_te.length < 100) {
    score -= 20;
    reasons.push('Content too short for factual verification');
  }

  return {
    passed: score >= THRESHOLDS.FACTUAL_MIN,
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}

function checkEmotionalHook(entity: NormalizedEntity): { passed: boolean; score: number; reason?: string } {
  let score = 50;
  const reasons: string[] = [];
  const body = entity.body_te || '';

  // Check for emotional Telugu phrases
  const emotionalPhrases = [
    'అద్భుతం', 'అసాధారణం', 'మరపురాని', 'హృదయాన్ని', 'గర్వకారణం',
    'అభిమానులు', 'సంచలనం', 'చరిత్ర', 'ఎమోషనల్', 'ఆశ్చర్యం',
    '!', '...', '?', // Punctuation that indicates emotion
  ];

  const emotionCount = emotionalPhrases.filter(phrase => body.includes(phrase)).length;

  if (emotionCount >= 3) {
    score += 30;
  } else if (emotionCount >= 1) {
    score += 15;
  } else {
    reasons.push('Lacks emotional language');
  }

  // Check title for hook quality
  const title = entity.title_te || '';
  if (title.includes('!') || title.includes('?') || title.length > 30) {
    score += 10;
  }

  // Check excerpt
  if (entity.excerpt && entity.excerpt.length > 50) {
    score += 10;
  }

  return {
    passed: score >= THRESHOLDS.EMOTIONAL_MIN,
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}

function checkImageRelevance(entity: NormalizedEntity): { passed: boolean; score: number; reason?: string } {
  let score = 0;
  const reasons: string[] = [];

  // No image at all
  if (!entity.imageUrl) {
    reasons.push('No image selected');
    return { passed: false, score: 0, reason: reasons.join('; ') };
  }

  // Check image source priority
  const sourceScores: Record<string, number> = {
    tmdb: 90,
    wikimedia: 80,
    wikipedia: 70,
    unsplash: 50,
    pexels: 50,
    ai_generated: 40,
  };

  score = sourceScores[entity.imageSource || 'unsplash'] || 50;

  // Check if we have multiple candidates (indicates good search)
  if (entity.imageCandidates && entity.imageCandidates.length >= 3) {
    score += 10;
  }

  // Check license
  if (!entity.imageLicense) {
    score -= 10;
    reasons.push('Missing license information');
  }

  return {
    passed: score >= THRESHOLDS.IMAGE_MIN,
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}

function checkContentDepth(entity: NormalizedEntity): { passed: boolean; score: number; reason?: string } {
  let score = 50;
  const reasons: string[] = [];
  const body = entity.body_te || '';

  // Word count check
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;

  if (wordCount < THRESHOLDS.MIN_WORD_COUNT) {
    score -= 30;
    reasons.push(`Content too short (${wordCount} words, min: ${THRESHOLDS.MIN_WORD_COUNT})`);
  } else if (wordCount >= 300) {
    score += 20;
  } else if (wordCount >= 200) {
    score += 10;
  }

  // Check for structure (headings, sections)
  const hasHeadings = body.includes('#') || body.includes('**') || body.includes('##');
  if (hasHeadings) {
    score += 15;
  }

  // Check for paragraphs
  const paragraphs = body.split('\n\n').filter(p => p.trim().length > 0).length;
  if (paragraphs >= 3) {
    score += 10;
  } else if (paragraphs < 2) {
    score -= 10;
    reasons.push('Lacks proper paragraph structure');
  }

  // Check for lists or bullet points
  if (body.includes('•') || body.includes('-') || body.includes('1.')) {
    score += 5;
  }

  return {
    passed: score >= THRESHOLDS.DEPTH_MIN,
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}

function checkTeluguQuality(entity: NormalizedEntity): { passed: boolean; score: number; reason?: string } {
  let score = 50;
  const reasons: string[] = [];
  const body = entity.body_te || '';

  // Count Telugu characters (Unicode range: 0C00-0C7F)
  const teluguChars = (body.match(/[\u0C00-\u0C7F]/g) || []).length;
  const totalChars = body.replace(/\s/g, '').length;
  const teluguRatio = totalChars > 0 ? teluguChars / totalChars : 0;

  if (teluguRatio >= 0.8) {
    score += 30;
  } else if (teluguRatio >= 0.6) {
    score += 15;
  } else if (teluguRatio < 0.4) {
    score -= 20;
    reasons.push(`Low Telugu content ratio (${(teluguRatio * 100).toFixed(0)}%)`);
  }

  // Check for common Telugu words
  const teluguWords = ['సినిమా', 'నటుడు', 'దర్శకుడు', 'అభిమానులు', 'విడుదల', 'చిత్రం'];
  const foundTeluguWords = teluguWords.filter(word => body.includes(word)).length;

  if (foundTeluguWords >= 3) {
    score += 15;
  } else if (foundTeluguWords === 0) {
    reasons.push('Missing common Telugu cinema vocabulary');
  }

  // Check title is in Telugu
  const title = entity.title_te || '';
  const titleTeluguChars = (title.match(/[\u0C00-\u0C7F]/g) || []).length;
  if (titleTeluguChars > 5) {
    score += 10;
  }

  return {
    passed: score >= THRESHOLDS.TELUGU_MIN,
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}

// ============================================================
// MAIN VALIDATION FUNCTION
// ============================================================

export function validateEntity(entity: NormalizedEntity): ValidationResult {
  const checks = {
    factualCorrectness: checkFactualCorrectness(entity),
    emotionalHook: checkEmotionalHook(entity),
    imageRelevance: checkImageRelevance(entity),
    contentDepth: checkContentDepth(entity),
    teluguQuality: checkTeluguQuality(entity),
  };

  // Calculate overall score (weighted average)
  const weights = {
    factualCorrectness: 0.25,
    emotionalHook: 0.15,
    imageRelevance: 0.20,
    contentDepth: 0.20,
    teluguQuality: 0.20,
  };

  let totalScore = 0;
  for (const [check, result] of Object.entries(checks)) {
    totalScore += result.score * (weights[check as keyof typeof weights] || 0.2);
  }

  // Collect failure reasons
  const failureReasons: string[] = [];
  const suggestions: string[] = [];

  for (const [check, result] of Object.entries(checks)) {
    if (!result.passed && result.reason) {
      failureReasons.push(`${check}: ${result.reason}`);
    }
  }

  // Generate suggestions
  if (!checks.factualCorrectness.passed) {
    suggestions.push('Add more source references or cross-verify facts');
  }
  if (!checks.emotionalHook.passed) {
    suggestions.push('Strengthen the opening hook with emotional language');
  }
  if (!checks.imageRelevance.passed) {
    suggestions.push('Select a more relevant image from TMDB or Wikimedia');
  }
  if (!checks.contentDepth.passed) {
    suggestions.push('Add more content sections and increase word count');
  }
  if (!checks.teluguQuality.passed) {
    suggestions.push('Increase Telugu language usage and add cinema vocabulary');
  }

  // Determine status
  let status: ContentStatus;
  if (totalScore >= THRESHOLDS.READY_MIN_SCORE && failureReasons.length === 0) {
    status = 'READY';
  } else if (totalScore >= THRESHOLDS.REVIEW_MIN_SCORE) {
    status = 'NEEDS_REVIEW';
  } else {
    status = 'NEEDS_REWORK';
  }

  return {
    status,
    score: Math.round(totalScore),
    checks,
    failureReasons,
    suggestions,
  };
}

// ============================================================
// AI-POWERED DEEP VALIDATION
// ============================================================

export async function deepValidateWithAI(entity: NormalizedEntity): Promise<ValidationResult | null> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  if (!groq) return null;

  const prompt = `Validate this Telugu content for quality and accuracy.

TITLE (EN): ${entity.title_en}
TITLE (TE): ${entity.title_te}
EXCERPT: ${entity.excerpt}
BODY (first 500 chars): ${entity.body_te?.slice(0, 500)}...

EVALUATE:
1. Factual Correctness (0-100): Is the content accurate and verifiable?
2. Emotional Hook (0-100): Does it capture attention effectively?
3. Content Depth (0-100): Is it comprehensive enough?
4. Telugu Quality (0-100): Is the Telugu natural and well-written?
5. Image Relevance (0-100): Would the image (${entity.imageSource}) match this content?

OUTPUT (JSON):
{
  "factualScore": 0-100,
  "emotionalScore": 0-100,
  "depthScore": 0-100,
  "teluguScore": 0-100,
  "imageScore": 0-100,
  "overallScore": 0-100,
  "status": "READY" | "NEEDS_REVIEW" | "NEEDS_REWORK",
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a Telugu content quality validator. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      status: parsed.status as ContentStatus,
      score: parsed.overallScore,
      checks: {
        factualCorrectness: { passed: parsed.factualScore >= 70, score: parsed.factualScore },
        emotionalHook: { passed: parsed.emotionalScore >= 60, score: parsed.emotionalScore },
        imageRelevance: { passed: parsed.imageScore >= 50, score: parsed.imageScore },
        contentDepth: { passed: parsed.depthScore >= 60, score: parsed.depthScore },
        teluguQuality: { passed: parsed.teluguScore >= 70, score: parsed.teluguScore },
      },
      failureReasons: parsed.issues || [],
      suggestions: parsed.suggestions || [],
    };
  } catch (error) {
    console.error('AI validation failed:', error);
    return null;
  }
}

// ============================================================
// BATCH VALIDATION
// ============================================================

export function validateBatch(entities: NormalizedEntity[]): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const entity of entities) {
    const id = entity.id || entity.slug;
    results.set(id, validateEntity(entity));
  }

  return results;
}
