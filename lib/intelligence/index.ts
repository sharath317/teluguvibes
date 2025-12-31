/**
 * INTELLIGENCE MODULE INDEX
 *
 * Smart Content & Image Intelligence Pipeline
 *
 * Features:
 * - Multi-source ingestion (TMDB, Wikidata, News, YouTube)
 * - AI synthesis with Telugu-first content
 * - Image intelligence with scoring
 * - Validation with status flags
 * - Variant generation for non-READY content
 */

// Types
export type {
  ContentStatus,
  ValidationResult,
  ImageSource,
  ImageCandidate,
  ImageSelectionResult,
  ContentVariant,
  VariantGenerationResult,
  IngestConfig,
  NormalizedEntity,
  SynthesisContext,
  SynthesisResult,
  PipelineStats,
} from './types';

// Image Intelligence
export {
  selectBestImage,
  validateImageUrl,
  getImageOptions,
} from './image-intelligence';

// AI Synthesis
export {
  synthesizeContent,
  generateVariants,
  fetchFollowUpContext,
} from './synthesis-engine';

// Validation
export {
  validateEntity,
  deepValidateWithAI,
  validateBatch,
} from './validator';

// Pipeline
export {
  ContentPipeline,
  runPipeline,
  processAndValidate,
} from './pipeline';
