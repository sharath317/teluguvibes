/**
 * SMART CONTENT & IMAGE INTELLIGENCE PIPELINE
 * Core type definitions
 */

// ============================================================
// CONTENT STATUS & VALIDATION
// ============================================================

export type ContentStatus = 'READY' | 'NEEDS_REVIEW' | 'NEEDS_REWORK' | 'DRAFT';

export interface ValidationResult {
  status: ContentStatus;
  score: number; // 0-100
  checks: {
    factualCorrectness: { passed: boolean; score: number; reason?: string };
    emotionalHook: { passed: boolean; score: number; reason?: string };
    imageRelevance: { passed: boolean; score: number; reason?: string };
    contentDepth: { passed: boolean; score: number; reason?: string };
    teluguQuality: { passed: boolean; score: number; reason?: string };
  };
  failureReasons: string[];
  suggestions: string[];
}

// ============================================================
// IMAGE INTELLIGENCE
// ============================================================

export type ImageSource = 'tmdb' | 'wikimedia' | 'wikipedia' | 'unsplash' | 'pexels' | 'ai_generated';

export interface ImageCandidate {
  url: string;
  source: ImageSource;
  score: number; // 0-100
  metadata: {
    width?: number;
    height?: number;
    aspectRatio?: number;
    hasFace?: boolean;
    faceClarity?: number;
    emotionMatch?: number;
    relevanceScore?: number;
    license?: string;
    author?: string;
    sourceUrl?: string;
  };
  validationStatus: 'valid' | 'needs_review' | 'rejected';
  rejectionReason?: string;
}

export interface ImageSelectionResult {
  selectedImage: ImageCandidate | null;
  candidates: ImageCandidate[];
  selectionReason: string;
}

// ============================================================
// CONTENT VARIANTS
// ============================================================

export interface ContentVariant {
  id: string;
  title: string;
  title_te: string;
  excerpt: string;
  body_te: string;
  hook: string;
  angle: 'nostalgia' | 'excitement' | 'info' | 'viral' | 'tribute' | 'analysis';
  score: number;
  reasoning: string;
}

export interface VariantGenerationResult {
  variants: ContentVariant[];
  recommendedVariantId: string;
  imageOptions: ImageCandidate[];
  recommendedImageUrl: string;
}

// ============================================================
// INGESTION PIPELINE
// ============================================================

export interface IngestConfig {
  mode: 'dry' | 'smart' | 'reset';
  sources: ('tmdb' | 'wikidata' | 'news' | 'youtube' | 'internal')[];
  targets: ('posts' | 'celebrities' | 'movies' | 'reviews')[];
  limit: number;
  forceAI: boolean;
  verbose: boolean;
}

export interface NormalizedEntity {
  id?: string;
  slug: string;
  entityType: 'post' | 'celebrity' | 'movie' | 'review';

  // Common fields
  title_en: string;
  title_te?: string;
  excerpt?: string;
  body_te?: string;

  // Source tracking
  sources: {
    source: string;
    sourceId: string;
    confidence: number;
    fetchedAt: string;
  }[];

  // Image data
  imageUrl?: string;
  imageCandidates?: ImageCandidate[];
  imageSource?: ImageSource;
  imageLicense?: string;

  // Validation
  validationResult?: ValidationResult;
  status: ContentStatus;

  // Variants (if not READY)
  variants?: ContentVariant[];
  selectedVariantId?: string;

  // Metadata
  category?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;

  // Raw data for reference
  rawData?: Record<string, unknown>;
}

// ============================================================
// AI SYNTHESIS
// ============================================================

export interface SynthesisContext {
  topic: string;
  entityType: 'post' | 'celebrity' | 'movie' | 'review';
  category?: string;

  // Related context
  relatedMovies?: { title: string; year: number; verdict?: string }[];
  relatedCelebrities?: { name: string; relation: string }[];
  historicContext?: { event: string; date: string; significance: string }[];

  // IPL/Sports specific
  sportsContext?: {
    team?: string;
    stats?: Record<string, string | number>;
    recentPerformance?: string;
  };

  // Audience signals
  audienceEmotion?: 'nostalgia' | 'excitement' | 'pride' | 'curiosity' | 'celebration';
  trendingScore?: number;
}

export interface SynthesisResult {
  title_en: string;
  title_te: string;
  excerpt: string;
  body_te: string;

  // Quality markers
  humanPovIncluded: boolean;
  culturalContextIncluded: boolean;
  wordCount: number;

  // Validation
  confidenceScore: number;
  needsHumanReview: boolean;
  reviewReasons?: string[];
}

// ============================================================
// PIPELINE STATS
// ============================================================

export interface PipelineStats {
  totalFetched: number;
  normalized: number;
  synthesized: number;
  imagesProcessed: number;
  validated: number;

  byStatus: {
    READY: number;
    NEEDS_REVIEW: number;
    NEEDS_REWORK: number;
    DRAFT: number;
  };

  bySource: Record<string, number>;

  errors: { entity: string; error: string }[];

  duration: number;
}



