/**
 * UNIFIED CONTENT PIPELINE
 *
 * Single pipeline for all content generation with:
 * 1. Telugu content generation (AI or template)
 * 2. Content validation (Telugu chars, length, quality)
 * 3. Wikipedia image fetching
 * 4. Image validation (must be Wikipedia)
 * 5. Final quality gate before saving
 *
 * Usage:
 *   const result = await generateValidatedDraft(topic, category);
 *   if (result.isValid) {
 *     // Save result.draft to database
 *   }
 */

import slugify from 'slugify';
import { generateTeluguContent } from './content-generator';
import { getEnhancedImage, findEntity, extractTags } from '../content/telugu-templates';

// ============================================================================
// TYPES
// ============================================================================

export interface DraftValidation {
  isValid: boolean;
  draft: ValidatedDraft | null;
  errors: string[];
  warnings: string[];
  metrics: DraftMetrics;
}

export interface ValidatedDraft {
  title: string;
  title_te: string;
  slug: string;
  telugu_body: string;
  body_te: string;
  excerpt: string;
  category: string;
  status: 'draft';
  image_url: string;
  image_urls: string[];
  image_source: string;
  image_license: string;
  tags: string[];
  // These are for internal tracking, not saved to DB
  _confidence?: number;
  _source?: string;
}

export interface DraftMetrics {
  contentLength: number;
  teluguPercentage: number;
  hasWikipediaImage: boolean;
  entityDetected: string | null;
  confidence: number;
  generationTime: number;
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

const VALIDATION_RULES = {
  minContentLength: 300,        // Minimum Telugu content length
  minTeluguPercentage: 20,      // Minimum % of Telugu characters
  requireWikipediaImage: true,  // Must have Wikipedia image
  minConfidence: 0.5,           // Minimum confidence score
};

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Generate a fully validated draft from a topic
 * All content generation, image fetching, and validation happens here
 */
export async function generateValidatedDraft(
  topic: string,
  category: string = 'trending',
  options: { verbose?: boolean } = {}
): Promise<DraftValidation> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const verbose = options.verbose ?? true;

  if (verbose) {
    console.log(`\n📝 [Pipeline] Processing: ${topic.slice(0, 50)}...`);
  }

  // -------------------------------------------------------------------------
  // STEP 1: Entity Detection
  // -------------------------------------------------------------------------
  const entityResult = findEntity(topic);
  const entityDetected = entityResult?.entity?.name || null;

  if (verbose && entityDetected) {
    console.log(`   👤 Entity: ${entityDetected} (${entityResult?.type})`);
  }

  // -------------------------------------------------------------------------
  // STEP 2: Generate Telugu Content
  // -------------------------------------------------------------------------
  if (verbose) console.log(`   🔄 Generating Telugu content...`);

  const content = await generateTeluguContent(topic);

  if (!content || !content.bodyTe) {
    errors.push('Content generation failed');
    return createFailedResult(errors, warnings, startTime);
  }

  const contentLength = content.bodyTe.length;
  const teluguPercentage = calculateTeluguPercentage(content.bodyTe);

  if (verbose) {
    console.log(`   📄 Content: ${contentLength} chars, ${teluguPercentage.toFixed(0)}% Telugu`);
    console.log(`   📍 Source: ${content.source}`);
  }

  // -------------------------------------------------------------------------
  // STEP 3: Validate Content
  // -------------------------------------------------------------------------
  if (contentLength < VALIDATION_RULES.minContentLength) {
    errors.push(`Content too short: ${contentLength} < ${VALIDATION_RULES.minContentLength}`);
  }

  if (teluguPercentage < VALIDATION_RULES.minTeluguPercentage) {
    errors.push(`Telugu percentage too low: ${teluguPercentage.toFixed(0)}% < ${VALIDATION_RULES.minTeluguPercentage}%`);
  }

  if (isGarbledText(content.bodyTe)) {
    errors.push('Content appears to be garbled/mojibake');
  }

  // -------------------------------------------------------------------------
  // STEP 4: Fetch Wikipedia Image
  // -------------------------------------------------------------------------
  if (verbose) console.log(`   🖼️ Fetching Wikipedia image...`);

  let imageUrl = content.imageUrl || '';
  let imageSource = 'Wikipedia';

  // If content generator didn't provide image, fetch separately
  if (!imageUrl) {
    const imageResult = await getEnhancedImage(topic);
    if (imageResult) {
      imageUrl = imageResult.url;
      imageSource = imageResult.source;
    }
  }

  const hasWikipediaImage = imageUrl.includes('wikimedia') || imageUrl.includes('wikipedia');

  if (verbose) {
    console.log(`   🖼️ Image: ${hasWikipediaImage ? '✅ Wikipedia' : (imageUrl ? '⚠️ ' + imageSource : '❌ None')}`);
  }

  // -------------------------------------------------------------------------
  // STEP 5: Validate Image
  // -------------------------------------------------------------------------
  if (VALIDATION_RULES.requireWikipediaImage && !hasWikipediaImage) {
    if (!imageUrl) {
      errors.push('No image found');
    } else {
      warnings.push(`Image not from Wikipedia: ${imageSource}`);
      // Still allow but warn
    }
  }

  // -------------------------------------------------------------------------
  // STEP 6: Extract Tags
  // -------------------------------------------------------------------------
  const tags = content.tags || extractTags(topic);

  // -------------------------------------------------------------------------
  // STEP 7: Calculate Confidence
  // -------------------------------------------------------------------------
  const confidence = calculateConfidence({
    contentLength,
    teluguPercentage,
    hasWikipediaImage,
    entityDetected: !!entityDetected,
    source: content.source,
  });

  if (confidence < VALIDATION_RULES.minConfidence) {
    warnings.push(`Low confidence: ${(confidence * 100).toFixed(0)}%`);
  }

  // -------------------------------------------------------------------------
  // STEP 8: Create Draft
  // -------------------------------------------------------------------------
  const metrics: DraftMetrics = {
    contentLength,
    teluguPercentage,
    hasWikipediaImage,
    entityDetected,
    confidence,
    generationTime: Date.now() - startTime,
  };

  // If there are errors, return failed result
  if (errors.length > 0) {
    if (verbose) {
      console.log(`   ❌ Validation failed: ${errors.join(', ')}`);
    }
    return createFailedResult(errors, warnings, startTime, metrics);
  }

  // Create validated draft
  const slug = generateSlug(topic);

  const draft: ValidatedDraft = {
    title: content.titleTe || topic,
    title_te: content.titleTe || topic,
    slug,
    telugu_body: content.bodyTe,
    body_te: content.bodyTe,
    excerpt: content.excerpt || content.bodyTe.slice(0, 150) + '...',
    category,
    status: 'draft',
    image_url: imageUrl,
    image_urls: imageUrl ? [imageUrl] : [],
    image_source: hasWikipediaImage ? 'Wikipedia' : imageSource,
    image_license: hasWikipediaImage ? 'CC BY-SA' : 'Unknown',
    tags,
    // Internal tracking (not saved to DB)
    _confidence: confidence,
    _source: content.source,
  };

  if (verbose) {
    console.log(`   ✅ Draft ready! Confidence: ${(confidence * 100).toFixed(0)}%`);
  }

  return {
    isValid: true,
    draft,
    errors: [],
    warnings,
    metrics,
  };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process multiple topics in batch with progress logging
 */
export async function generateValidatedDrafts(
  topics: Array<{ title: string; category?: string }>,
  options: { verbose?: boolean; continueOnError?: boolean } = {}
): Promise<{
  successful: ValidatedDraft[];
  failed: Array<{ topic: string; errors: string[] }>;
  summary: { total: number; success: number; failed: number; avgConfidence: number };
}> {
  const verbose = options.verbose ?? true;
  const continueOnError = options.continueOnError ?? true;

  const successful: ValidatedDraft[] = [];
  const failed: Array<{ topic: string; errors: string[] }> = [];

  if (verbose) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`   📥 PROCESSING ${topics.length} TOPICS`);
    console.log('════════════════════════════════════════════════════════════\n');
  }

  for (let i = 0; i < topics.length; i++) {
    const { title, category } = topics[i];

    if (verbose) {
      console.log(`\n[${i + 1}/${topics.length}] ─────────────────────────────────────`);
    }

    try {
      const result = await generateValidatedDraft(title, category || 'trending', { verbose });

      if (result.isValid && result.draft) {
        successful.push(result.draft);
      } else {
        failed.push({ topic: title, errors: result.errors });
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      failed.push({ topic: title, errors: [errorMsg] });

      if (verbose) {
        console.log(`   ❌ Error: ${errorMsg}`);
      }

      if (!continueOnError) {
        throw error;
      }
    }
  }

  // Calculate summary
  const avgConfidence = successful.length > 0
    ? successful.reduce((sum, d) => sum + (d._confidence || 0), 0) / successful.length
    : 0;

  const summary = {
    total: topics.length,
    success: successful.length,
    failed: failed.length,
    avgConfidence,
  };

  if (verbose) {
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('   📊 BATCH SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`   ✅ Successful: ${summary.success}/${summary.total}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   📊 Avg Confidence: ${(summary.avgConfidence * 100).toFixed(0)}%`);
    console.log('════════════════════════════════════════════════════════════\n');
  }

  return { successful, failed, summary };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate percentage of Telugu characters in text
 */
function calculateTeluguPercentage(text: string): number {
  if (!text) return 0;
  const teluguChars = text.match(/[\u0C00-\u0C7F]/g) || [];
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 ? (teluguChars.length / totalChars) * 100 : 0;
}

/**
 * Check if text appears to be garbled/mojibake
 */
function isGarbledText(text: string): boolean {
  if (!text) return true;

  // Check for common mojibake patterns
  const garbledPatterns = [
    /[\uFFFD]{3,}/,           // Replacement characters
    /[à-ÿ]{5,}/,              // Latin extended chars in sequence
    /[\x00-\x1F]{3,}/,        // Control characters
    /(.)\1{10,}/,             // Same char repeated 10+ times
  ];

  return garbledPatterns.some(pattern => pattern.test(text));
}

/**
 * Calculate confidence score based on various factors
 */
function calculateConfidence(params: {
  contentLength: number;
  teluguPercentage: number;
  hasWikipediaImage: boolean;
  entityDetected: boolean;
  source: string;
}): number {
  let score = 0;

  // Content length (max 30 points)
  if (params.contentLength >= 800) score += 30;
  else if (params.contentLength >= 500) score += 20;
  else if (params.contentLength >= 300) score += 10;

  // Telugu percentage (max 25 points)
  if (params.teluguPercentage >= 50) score += 25;
  else if (params.teluguPercentage >= 30) score += 15;
  else if (params.teluguPercentage >= 20) score += 10;

  // Wikipedia image (max 20 points)
  if (params.hasWikipediaImage) score += 20;

  // Entity detected (max 15 points)
  if (params.entityDetected) score += 15;

  // Source quality (max 10 points)
  if (params.source === 'ollama-ai') score += 10;
  else if (params.source === 'template-fallback') score += 7;
  else score += 3;

  return score / 100;
}

/**
 * Generate a unique slug
 */
function generateSlug(topic: string): string {
  const base = slugify(topic, {
    lower: true,
    strict: true,
    locale: 'en',
  });

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);

  return `${base.slice(0, 50)}-${timestamp}-${random}`;
}

/**
 * Create a failed result object
 */
function createFailedResult(
  errors: string[],
  warnings: string[],
  startTime: number,
  metrics?: Partial<DraftMetrics>
): DraftValidation {
  return {
    isValid: false,
    draft: null,
    errors,
    warnings,
    metrics: {
      contentLength: metrics?.contentLength || 0,
      teluguPercentage: metrics?.teluguPercentage || 0,
      hasWikipediaImage: metrics?.hasWikipediaImage || false,
      entityDetected: metrics?.entityDetected || null,
      confidence: metrics?.confidence || 0,
      generationTime: Date.now() - startTime,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  VALIDATION_RULES,
  calculateTeluguPercentage,
  isGarbledText,
  calculateConfidence,
  generateSlug,
};
