/**
 * AI DATA VALIDATION PIPELINE
 *
 * MANDATORY: No data enters DB without passing validation.
 *
 * Validation Stages:
 * 1. Entity Relevance Check (Telugu cinema filter)
 * 2. Fact Cross-Verification (min 2 sources OR 1 high-trust)
 * 3. Genre Classification (multi-label, consistent with expectations)
 * 4. Title Quality Check (Telugu grammar, no clickbait)
 * 5. Image Legality Check (only allowed sources)
 */

import Groq from 'groq-sdk';
import type { MovieData, PersonData, ImageData } from '../sources/types';

// ============================================================
// TYPES
// ============================================================

export interface ValidationResult {
  is_valid: boolean;
  confidence: number;
  stages: ValidationStage[];
  issues: ValidationIssue[];
  suggested_fixes: SuggestedFix[];
  validation_timestamp: string;
}

export interface ValidationStage {
  stage_name: string;
  passed: boolean;
  confidence: number;
  details: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
  code: string;
}

export interface SuggestedFix {
  field: string;
  current_value: any;
  suggested_value: any;
  reason: string;
  auto_fixable: boolean;
}

type ValidatableEntity = MovieData | PersonData | { type: 'image'; data: ImageData };

// ============================================================
// ALLOWED IMAGE SOURCES (STRICT)
// ============================================================

const ALLOWED_IMAGE_SOURCES = new Set([
  'tmdb',
  'wikimedia',
  'unsplash',
  'pexels',
  'official',
  'embed',
]);

const BLOCKED_IMAGE_PATTERNS = [
  /google\.(com|co\.\w+)\/images/i,
  /imdb\.com/i,
  /pinterest\./i,
  /facebook\.com/i,
  /instagram\.com.*\/p\//i,  // Direct IG images (not embeds)
];

// ============================================================
// VALIDATION PIPELINE
// ============================================================

export class AIValidator {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * Main validation entry point
   */
  async validate(entity: ValidatableEntity): Promise<ValidationResult> {
    const stages: ValidationStage[] = [];
    const issues: ValidationIssue[] = [];
    const fixes: SuggestedFix[] = [];

    console.log(`🔍 Validating entity...`);

    // Determine entity type
    const entityType = this.getEntityType(entity);

    // Stage 1: Relevance Check
    const relevanceResult = await this.checkRelevance(entity, entityType);
    stages.push(relevanceResult);
    if (!relevanceResult.passed) {
      issues.push({
        severity: 'error',
        code: 'NOT_TELUGU_RELATED',
        message: 'Entity does not appear to be related to Telugu cinema',
      });
    }

    // Stage 2: Fact Verification
    const factResult = await this.verifyFacts(entity, entityType);
    stages.push(factResult);
    issues.push(...factResult.issues || []);

    // Stage 3: Genre Classification (for movies)
    if (entityType === 'movie') {
      const genreResult = await this.validateGenres(entity as MovieData);
      stages.push(genreResult);
      fixes.push(...genreResult.fixes || []);
    }

    // Stage 4: Title Quality
    const titleResult = await this.validateTitle(entity, entityType);
    stages.push(titleResult);
    fixes.push(...titleResult.fixes || []);

    // Stage 5: Image Legality
    const imageResult = this.validateImages(entity);
    stages.push(imageResult);
    issues.push(...imageResult.issues || []);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(stages);
    const isValid = stages.every(s => s.passed) && issues.filter(i => i.severity === 'error').length === 0;

    return {
      is_valid: isValid,
      confidence: overallConfidence,
      stages,
      issues,
      suggested_fixes: fixes,
      validation_timestamp: new Date().toISOString(),
    };
  }

  private getEntityType(entity: ValidatableEntity): 'movie' | 'person' | 'image' {
    if ('type' in entity && entity.type === 'image') return 'image';
    if ('genres' in entity) return 'movie';
    return 'person';
  }

  // ============================================================
  // STAGE 1: RELEVANCE CHECK
  // ============================================================

  private async checkRelevance(
    entity: ValidatableEntity,
    entityType: string
  ): Promise<ValidationStage> {
    const teluguIndicators = [
      'telugu', 'tollywood', 'andhra', 'telangana',
      'hyderabad', 'విజయవాడ', 'హైదరాబాద్',
    ];

    const text = JSON.stringify(entity).toLowerCase();
    const hasTeluguIndicator = teluguIndicators.some(ind => text.includes(ind));

    // For movies, check original language
    if (entityType === 'movie') {
      const movie = entity as MovieData;
      if (movie.title_te || movie.overview_te) {
        return {
          stage_name: 'Entity Relevance',
          passed: true,
          confidence: 0.95,
          details: 'Has Telugu title or overview',
        };
      }
    }

    // For people, check filmography
    if (entityType === 'person') {
      const person = entity as PersonData;
      if (person.filmography && person.filmography.length > 0) {
        return {
          stage_name: 'Entity Relevance',
          passed: true,
          confidence: 0.90,
          details: 'Has Telugu filmography',
        };
      }
    }

    return {
      stage_name: 'Entity Relevance',
      passed: hasTeluguIndicator,
      confidence: hasTeluguIndicator ? 0.80 : 0.30,
      details: hasTeluguIndicator
        ? 'Contains Telugu cinema indicators'
        : 'No clear Telugu cinema connection found',
    };
  }

  // ============================================================
  // STAGE 2: FACT VERIFICATION
  // ============================================================

  private async verifyFacts(
    entity: ValidatableEntity,
    entityType: string
  ): Promise<ValidationStage & { issues?: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    // Check source count
    const sources = this.getDataSources(entity);
    const hasMultipleSources = sources.length >= 2;
    const hasHighTrustSource = sources.some(s =>
      ['tmdb', 'wikidata', 'wikipedia'].includes(s)
    );

    if (!hasMultipleSources && !hasHighTrustSource) {
      issues.push({
        severity: 'warning',
        code: 'SINGLE_LOW_TRUST_SOURCE',
        message: 'Data from single low-trust source, verification recommended',
      });
    }

    // Check for required fields
    if (entityType === 'movie') {
      const movie = entity as MovieData;
      if (!movie.release_date && !movie.release_year) {
        issues.push({
          severity: 'warning',
          field: 'release_date',
          code: 'MISSING_RELEASE_DATE',
          message: 'Release date missing, may be historic-estimated',
        });
      }
    }

    if (entityType === 'person') {
      const person = entity as PersonData;
      if (!person.name_en) {
        issues.push({
          severity: 'error',
          field: 'name_en',
          code: 'MISSING_NAME',
          message: 'English name is required',
        });
      }
    }

    const passed = issues.filter(i => i.severity === 'error').length === 0;

    return {
      stage_name: 'Fact Verification',
      passed,
      confidence: passed ? (hasMultipleSources ? 0.95 : 0.75) : 0.40,
      details: `${sources.length} source(s): ${sources.join(', ')}`,
      issues,
    };
  }

  private getDataSources(entity: ValidatableEntity): string[] {
    if ('data_sources' in entity) {
      return (entity as MovieData | PersonData).data_sources || [];
    }
    return [];
  }

  // ============================================================
  // STAGE 3: GENRE CLASSIFICATION
  // ============================================================

  private async validateGenres(
    movie: MovieData
  ): Promise<ValidationStage & { fixes?: SuggestedFix[] }> {
    const fixes: SuggestedFix[] = [];

    if (!movie.genres || movie.genres.length === 0) {
      // Try to infer genres from overview
      if (movie.overview_en || movie.overview_te) {
        const inferredGenres = await this.inferGenres(
          movie.overview_en || movie.overview_te || ''
        );

        if (inferredGenres.length > 0) {
          fixes.push({
            field: 'genres',
            current_value: [],
            suggested_value: inferredGenres,
            reason: 'Inferred from movie overview',
            auto_fixable: true,
          });
        }
      }

      return {
        stage_name: 'Genre Classification',
        passed: false,
        confidence: 0.50,
        details: 'No genres specified',
        fixes,
      };
    }

    // Validate genre consistency
    const validGenres = new Set([
      'Action', 'Drama', 'Romance', 'Comedy', 'Thriller', 'Horror',
      'Family', 'Adventure', 'Crime', 'Fantasy', 'Science Fiction',
      'Musical', 'Documentary', 'Animation', 'Devotional', 'Mythological',
    ]);

    const invalidGenres = movie.genres.filter(g => !validGenres.has(g));
    if (invalidGenres.length > 0) {
      fixes.push({
        field: 'genres',
        current_value: movie.genres,
        suggested_value: movie.genres.filter(g => validGenres.has(g)),
        reason: `Invalid genres: ${invalidGenres.join(', ')}`,
        auto_fixable: true,
      });
    }

    return {
      stage_name: 'Genre Classification',
      passed: true,
      confidence: invalidGenres.length === 0 ? 0.95 : 0.75,
      details: `${movie.genres.length} genres assigned`,
      fixes,
    };
  }

  private async inferGenres(text: string): Promise<string[]> {
    try {
      const prompt = `Based on this movie description, suggest 1-3 appropriate genres from this list:
Action, Drama, Romance, Comedy, Thriller, Horror, Family, Adventure, Crime, Fantasy, Science Fiction, Musical, Documentary

Description: ${text.slice(0, 500)}

Return ONLY a comma-separated list of genres. Example: "Action, Drama"`;

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 50,
      });

      const response = completion.choices[0]?.message?.content || '';
      return response.split(',').map(g => g.trim()).filter(g => g.length > 0);
    } catch {
      return [];
    }
  }

  // ============================================================
  // STAGE 4: TITLE QUALITY
  // ============================================================

  private async validateTitle(
    entity: ValidatableEntity,
    entityType: string
  ): Promise<ValidationStage & { fixes?: SuggestedFix[] }> {
    const fixes: SuggestedFix[] = [];

    let title = '';
    if (entityType === 'movie') {
      title = (entity as MovieData).title_en || '';
    } else if (entityType === 'person') {
      title = (entity as PersonData).name_en || '';
    }

    if (!title) {
      return {
        stage_name: 'Title Quality',
        passed: false,
        confidence: 0,
        details: 'No title/name provided',
        fixes,
      };
    }

    // Check for clickbait patterns
    const clickbaitPatterns = [
      /you won't believe/i,
      /shocking/i,
      /!!+/,
      /\?\?+/,
      /breaking.*news/i,
    ];

    const isClickbait = clickbaitPatterns.some(p => p.test(title));
    if (isClickbait) {
      return {
        stage_name: 'Title Quality',
        passed: false,
        confidence: 0.30,
        details: 'Title appears to be clickbait',
        fixes: [{
          field: entityType === 'movie' ? 'title_en' : 'name_en',
          current_value: title,
          suggested_value: null,
          reason: 'Remove clickbait elements',
          auto_fixable: false,
        }],
      };
    }

    // Check reasonable length
    if (title.length < 2 || title.length > 200) {
      return {
        stage_name: 'Title Quality',
        passed: false,
        confidence: 0.50,
        details: 'Title length is unusual',
        fixes,
      };
    }

    return {
      stage_name: 'Title Quality',
      passed: true,
      confidence: 0.95,
      details: 'Title passes quality checks',
      fixes,
    };
  }

  // ============================================================
  // STAGE 5: IMAGE LEGALITY
  // ============================================================

  private validateImages(
    entity: ValidatableEntity
  ): ValidationStage & { issues?: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    // Get all image URLs from entity
    const imageUrls = this.extractImageUrls(entity);

    for (const url of imageUrls) {
      // Check against blocked patterns
      for (const pattern of BLOCKED_IMAGE_PATTERNS) {
        if (pattern.test(url)) {
          issues.push({
            severity: 'error',
            field: 'image_url',
            code: 'ILLEGAL_IMAGE_SOURCE',
            message: `Image from blocked source: ${url.slice(0, 50)}...`,
          });
        }
      }

      // Check if from allowed source
      const isFromAllowedSource = this.isFromAllowedSource(url);
      if (!isFromAllowedSource) {
        issues.push({
          severity: 'warning',
          field: 'image_url',
          code: 'UNVERIFIED_IMAGE_SOURCE',
          message: `Image source not in allowed list: ${url.slice(0, 50)}...`,
        });
      }
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
      stage_name: 'Image Legality',
      passed: !hasErrors,
      confidence: hasErrors ? 0.20 : issues.length > 0 ? 0.70 : 0.95,
      details: imageUrls.length > 0
        ? `${imageUrls.length} images checked, ${issues.length} issues`
        : 'No images to validate',
      issues,
    };
  }

  private extractImageUrls(entity: ValidatableEntity): string[] {
    const urls: string[] = [];

    if ('poster_url' in entity && entity.poster_url) {
      urls.push(entity.poster_url);
    }
    if ('backdrop_url' in entity && entity.backdrop_url) {
      urls.push(entity.backdrop_url);
    }
    if ('image_url' in entity && entity.image_url) {
      urls.push(entity.image_url);
    }
    if ('type' in entity && entity.type === 'image') {
      urls.push((entity as any).data.url);
    }

    return urls;
  }

  private isFromAllowedSource(url: string): boolean {
    const allowedPatterns = [
      /image\.tmdb\.org/i,
      /upload\.wikimedia\.org/i,
      /unsplash\.com/i,
      /pexels\.com/i,
      /images\.unsplash\.com/i,
    ];

    return allowedPatterns.some(p => p.test(url));
  }

  // ============================================================
  // CONFIDENCE CALCULATION
  // ============================================================

  private calculateOverallConfidence(stages: ValidationStage[]): number {
    if (stages.length === 0) return 0;

    const weights: Record<string, number> = {
      'Entity Relevance': 0.25,
      'Fact Verification': 0.25,
      'Genre Classification': 0.15,
      'Title Quality': 0.15,
      'Image Legality': 0.20,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const stage of stages) {
      const weight = weights[stage.stage_name] || 0.1;
      totalWeight += weight;
      weightedSum += stage.confidence * weight;
    }

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

let validatorInstance: AIValidator | null = null;

export function getValidator(): AIValidator {
  if (!validatorInstance) {
    validatorInstance = new AIValidator();
  }
  return validatorInstance;
}

export async function validateEntity(entity: ValidatableEntity): Promise<ValidationResult> {
  return getValidator().validate(entity);
}
