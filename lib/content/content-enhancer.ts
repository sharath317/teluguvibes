/**
 * Content Enhancer Module
 * Utilities for enhancing and classifying content automatically
 */

import type { ContentProfile } from '@/types/content';
import type { ContentSector, ContentType } from '@/types/content-sectors';

interface EnhancedContent {
  id: string;
  title: string;
  titleTe?: string;
  body: string;
  bodyTe?: string;
  contentProfile?: ContentProfile;
  contentSector?: ContentSector;
  contentType?: ContentType;
  tags?: string[];
  suggestedTags?: string[];
  keywords?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  enhancedAt: string;
  enhancedBy: 'auto' | 'manual';
  
  // Content suggestions
  suggestedContentType?: ContentType;
  suggestedSubsector?: string;
  suggestedAudienceProfile?: string;
  suggestedSensitivityLevel?: string;
  
  // Verification
  factConfidenceScore?: number;
  verificationStatus?: 'verified' | 'unverified' | 'disputed' | 'needs_review';
  
  // Labels
  requiresFictionalLabel?: boolean;
  requiresDisclaimer?: boolean;
  disclaimerType?: string;
  historicalPeriod?: string;
  
  // Context
  geoContext?: string;
  
  // AI generated fields
  aiGeneratedSummary?: string;
  aiGeneratedSummaryTe?: string;
}

interface EnhanceOptions {
  generateTranslation?: boolean;
  classifyContent?: boolean;
  extractKeywords?: boolean;
  analyzeSentiment?: boolean;
}

interface SourceInfo {
  id: string;
  sourceType: string;
  sourceName: string;
  sourceUrl?: string;
  trustLevel: number;
  claimType: string;
  isVerified: boolean;
  fetchedAt: string;
}

/**
 * Enhance content with automatic classification and metadata
 */
export async function enhanceContent(
  content: {
    id?: string;
    title: string;
    titleTe?: string;
    body: string;
    bodyTe?: string;
    sector?: ContentSector;
    existingSector?: ContentSector;
    type?: ContentType;
    sources?: SourceInfo[];
    metadata?: Record<string, unknown>;
  },
  options: EnhanceOptions = {}
): Promise<EnhancedContent> {
  const {
    generateTranslation = false,
    classifyContent = true,
    extractKeywords = true,
    analyzeSentiment = true,
  } = options;

  const enhanced: EnhancedContent = {
    id: content.id || generateId(),
    title: content.title,
    titleTe: content.titleTe,
    body: content.body,
    bodyTe: content.bodyTe,
    contentSector: content.sector ?? content.existingSector,
    contentType: content.type,
    enhancedAt: new Date().toISOString(),
    enhancedBy: 'auto',
  };

  // Extract keywords from title and body
  if (extractKeywords) {
    enhanced.keywords = extractKeywordsFromText(content.title + ' ' + content.body);
  }

  // Analyze sentiment
  if (analyzeSentiment) {
    enhanced.sentiment = analyzeSentimentFromText(content.body);
  }

  // Generate tags based on content
  enhanced.tags = generateTags(content, enhanced.keywords || []);
  enhanced.suggestedTags = enhanced.tags;

  return enhanced;
}

/**
 * Batch enhance multiple content items
 */
export async function batchEnhanceContent(
  items: Array<{
    id?: string;
    title: string;
    body: string;
    sector?: ContentSector;
    type?: ContentType;
  }>,
  options: EnhanceOptions = {}
): Promise<EnhancedContent[]> {
  const results: EnhancedContent[] = [];
  
  for (const item of items) {
    const enhanced = await enhanceContent(item, options);
    results.push(enhanced);
  }
  
  return results;
}

// ============================================================
// Helper functions
// ============================================================

function generateId(): string {
  return `content-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function extractKeywordsFromText(text: string): string[] {
  // Simple keyword extraction - in production, this would use NLP
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'once', 'here', 'there', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now']);
  
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  // Count frequency
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }
  
  // Return top 10 keywords
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function analyzeSentimentFromText(text: string): 'positive' | 'negative' | 'neutral' {
  // Simple sentiment analysis - in production, this would use ML
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'best', 'happy', 'success', 'win', 'beautiful', 'perfect', 'incredible'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'fail', 'sad', 'angry', 'poor', 'disappointing', 'tragic', 'disaster', 'wrong', 'problem'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of positiveWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    positiveCount += matches ? matches.length : 0;
  }
  
  for (const word of negativeWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lowerText.match(regex);
    negativeCount += matches ? matches.length : 0;
  }
  
  if (positiveCount > negativeCount + 2) return 'positive';
  if (negativeCount > positiveCount + 2) return 'negative';
  return 'neutral';
}

function generateTags(
  content: { title: string; body: string; sector?: ContentSector },
  keywords: string[]
): string[] {
  const tags: Set<string> = new Set();
  
  // Add sector as tag if available
  if (content.sector) {
    tags.add(content.sector.replace(/_/g, '-'));
  }
  
  // Add top keywords as tags
  for (const keyword of keywords.slice(0, 5)) {
    tags.add(keyword);
  }
  
  return Array.from(tags);
}
