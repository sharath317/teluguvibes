/**
 * Draft Pipeline for TeluguVibes
 *
 * Features:
 * - Generate 3 content variants per topic
 * - Validate structure & genre accuracy
 * - Attach best legal image
 * - Assign confidence score
 * - Flag: Ready / Review / Rework
 */

import { getAIRouter } from '../ai/router';
import { fetchWikipediaImage } from '../sources/free-fetchers';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type DraftStatus = 'ready' | 'review' | 'rework' | 'failed';

export interface ContentVariant {
  id: string;
  title: string;
  titleTe: string;
  excerpt: string;
  body: string;
  wordCount: number;
  confidence: number;
  reasoning: string;
}

export interface ImageOption {
  url: string;
  source: 'wikipedia' | 'tmdb' | 'wikimedia' | 'unsplash';
  license: string;
  relevanceScore: number;
  alt: string;
}

export interface DraftResult {
  topic: string;
  status: DraftStatus;
  variants: ContentVariant[];
  selectedVariant?: number;
  images: ImageOption[];
  selectedImage?: number;
  overallConfidence: number;
  validationErrors: string[];
  generatedAt: string;
  provider: string;
}

// ═══════════════════════════════════════════════════════════════
// DRAFT PIPELINE
// ═══════════════════════════════════════════════════════════════

export class DraftPipeline {
  private ai = getAIRouter();
  private dryRun: boolean;

  constructor(options?: { dryRun?: boolean }) {
    this.dryRun = options?.dryRun ?? true; // Default: DRY RUN
  }

  /**
   * Generate draft for a topic
   */
  async generateDraft(topic: string, options?: {
    category?: string;
    entityType?: 'person' | 'movie' | 'event' | 'news';
    variantCount?: number;
  }): Promise<DraftResult> {
    const variantCount = options?.variantCount || 3;
    const category = options?.category || 'entertainment';
    const entityType = options?.entityType || 'news';

    console.log(`\n📝 Generating draft for: ${topic}`);
    console.log(`   Category: ${category}, Entity: ${entityType}`);
    console.log(`   Variants: ${variantCount}, Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);

    // Step 1: Generate content variants
    const variants = await this.generateVariants(topic, category, entityType, variantCount);

    // Step 2: Find relevant images
    const images = await this.findImages(topic, entityType);

    // Step 3: Validate content
    const validation = this.validateContent(variants);

    // Step 4: Calculate overall confidence
    const overallConfidence = this.calculateConfidence(variants, images, validation);

    // Step 5: Determine status
    const status = this.determineStatus(overallConfidence, validation);

    // Step 6: Select best variant and image
    const selectedVariant = variants.length > 0
      ? variants.reduce((best, curr, idx) => curr.confidence > variants[best].confidence ? idx : best, 0)
      : undefined;
    const selectedImage = images.length > 0 ? 0 : undefined;

    const result: DraftResult = {
      topic,
      status,
      variants,
      selectedVariant,
      images,
      selectedImage,
      overallConfidence,
      validationErrors: validation.errors,
      generatedAt: new Date().toISOString(),
      provider: 'ollama', // Will be dynamic based on router
    };

    console.log(`\n✅ Draft generated: ${status.toUpperCase()}`);
    console.log(`   Confidence: ${(overallConfidence * 100).toFixed(0)}%`);
    console.log(`   Variants: ${variants.length}, Images: ${images.length}`);

    return result;
  }

  /**
   * Generate multiple content variants
   */
  private async generateVariants(
    topic: string,
    category: string,
    entityType: string,
    count: number
  ): Promise<ContentVariant[]> {
    const variants: ContentVariant[] = [];

    const angles = ['informative', 'emotional', 'analytical'];

    for (let i = 0; i < count; i++) {
      const angle = angles[i % angles.length];

      try {
        const variant = await this.generateSingleVariant(topic, category, entityType, angle, i + 1);
        if (variant) {
          variants.push(variant);
        }
      } catch (error) {
        console.error(`   ⚠️ Variant ${i + 1} failed:`, error);
      }
    }

    return variants;
  }

  /**
   * Generate a single content variant
   */
  private async generateSingleVariant(
    topic: string,
    category: string,
    entityType: string,
    angle: string,
    variantNum: number
  ): Promise<ContentVariant | null> {
    console.log(`   📄 Generating variant ${variantNum} (${angle})...`);

    const prompt = this.buildPrompt(topic, category, entityType, angle);

    try {
      const response = await this.ai.generate({
        messages: [
          {
            role: 'system',
            content: `You are an expert Telugu entertainment journalist. Generate content with a ${angle} angle.
Always output valid JSON. Write naturally in Telugu with English names for celebrities/movies.`,
          },
          { role: 'user', content: prompt },
        ],
        jsonMode: true,
        temperature: 0.8 + (variantNum * 0.05), // Slight variation
      });

      const content = this.parseResponse(response.content);
      if (!content) return null;

      const wordCount = content.body_te?.split(/\s+/).length || 0;
      const confidence = this.scoreVariant(content, wordCount);

      return {
        id: `v${variantNum}-${Date.now()}`,
        title: content.title || topic,
        titleTe: content.title_te || '',
        excerpt: content.excerpt || '',
        body: content.body_te || '',
        wordCount,
        confidence,
        reasoning: `${angle} angle, ${wordCount} words`,
      };
    } catch (error) {
      console.error(`   ❌ Variant generation error:`, error);
      return null;
    }
  }

  /**
   * Build prompt for content generation
   */
  private buildPrompt(topic: string, category: string, entityType: string, angle: string): string {
    const angleInstructions = {
      informative: 'Focus on facts, details, and comprehensive information.',
      emotional: 'Create an emotional connection with nostalgia, pride, or excitement.',
      analytical: 'Provide analysis, context, and deeper insights.',
    };

    return `Write a Telugu entertainment article about: ${topic}

Category: ${category}
Entity Type: ${entityType}
Angle: ${angleInstructions[angle as keyof typeof angleInstructions]}

Requirements:
1. Write 300-400 words in Telugu
2. Use natural Telugu expressions
3. Include English names for people/movies
4. Be engaging and authentic
5. Structure with clear paragraphs

Output JSON:
{
  "title": "English title",
  "title_te": "Telugu title",
  "excerpt": "2-3 line Telugu summary",
  "body_te": "Full Telugu article 300+ words"
}`;
  }

  /**
   * Parse AI response
   */
  private parseResponse(content: string): Record<string, string> | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  /**
   * Score a variant
   */
  private scoreVariant(content: Record<string, string>, wordCount: number): number {
    let score = 0.5;

    // Word count scoring
    if (wordCount >= 300) score += 0.2;
    else if (wordCount >= 200) score += 0.1;
    else if (wordCount < 100) score -= 0.2;

    // Has Telugu title
    if (content.title_te && content.title_te.length > 10) score += 0.1;

    // Has excerpt
    if (content.excerpt && content.excerpt.length > 50) score += 0.1;

    // Has structured content
    if (content.body_te?.includes('\n')) score += 0.05;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Find relevant images
   */
  private async findImages(topic: string, entityType: string): Promise<ImageOption[]> {
    const images: ImageOption[] = [];

    // Extract entity name for image search
    const searchTerm = this.extractEntityForImage(topic);

    // Try Wikipedia
    const wikiImage = await fetchWikipediaImage(searchTerm);
    if (wikiImage) {
      images.push({
        url: wikiImage,
        source: 'wikipedia',
        license: 'CC BY-SA',
        relevanceScore: 0.8,
        alt: searchTerm,
      });
    }

    // Could add more image sources here
    // - TMDB for movies
    // - Wikimedia Commons
    // - Unsplash for generic

    return images;
  }

  /**
   * Extract entity name for image search
   */
  private extractEntityForImage(topic: string): string {
    // Simple extraction - could be enhanced with NER
    const celebrities = [
      'Chiranjeevi', 'Nagarjuna', 'Mahesh Babu', 'Prabhas', 'NTR', 'Ram Charan',
      'Allu Arjun', 'Vijay Deverakonda', 'Samantha', 'Rashmika',
    ];

    for (const celeb of celebrities) {
      if (topic.toLowerCase().includes(celeb.toLowerCase())) {
        return celeb;
      }
    }

    // Return first few words as search term
    return topic.split(' ').slice(0, 3).join(' ');
  }

  /**
   * Validate content
   */
  private validateContent(variants: ContentVariant[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (variants.length === 0) {
      errors.push('No variants generated');
    }

    for (const variant of variants) {
      if (variant.wordCount < 100) {
        errors.push(`Variant ${variant.id}: Too short (${variant.wordCount} words)`);
      }
      if (!variant.titleTe) {
        errors.push(`Variant ${variant.id}: Missing Telugu title`);
      }
      if (!variant.body) {
        errors.push(`Variant ${variant.id}: Missing body content`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    variants: ContentVariant[],
    images: ImageOption[],
    validation: { valid: boolean; errors: string[] }
  ): number {
    if (variants.length === 0) return 0;

    // Average variant confidence
    const avgVariantConf = variants.reduce((sum, v) => sum + v.confidence, 0) / variants.length;

    // Image bonus
    const imageBonus = images.length > 0 ? 0.1 : 0;

    // Validation penalty
    const validationPenalty = validation.errors.length * 0.05;

    return Math.min(1, Math.max(0, avgVariantConf + imageBonus - validationPenalty));
  }

  /**
   * Determine draft status
   */
  private determineStatus(confidence: number, validation: { valid: boolean; errors: string[] }): DraftStatus {
    if (confidence >= 0.8 && validation.valid) return 'ready';
    if (confidence >= 0.5) return 'review';
    if (confidence >= 0.3) return 'rework';
    return 'failed';
  }

  /**
   * Set dry run mode
   */
  setDryRun(enabled: boolean): void {
    this.dryRun = enabled;
  }

  /**
   * Check if in dry run mode
   */
  isDryRun(): boolean {
    return this.dryRun;
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

let pipelineInstance: DraftPipeline | null = null;

export function getDraftPipeline(options?: { dryRun?: boolean }): DraftPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new DraftPipeline(options);
  }
  return pipelineInstance;
}
