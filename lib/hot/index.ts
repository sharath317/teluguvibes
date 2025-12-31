/**
 * Hot Content Module - Main Exports
 * 
 * This module provides the source engine and utilities for
 * hot/glamour content management.
 */

// Source Engine - Metadata fetching from multiple sources
export * from './source-engine';

// Glamour Validation - Quality gates for glamour content
export * from './glamour-validation';

// Re-export hot-media utilities for convenience
export {
  checkContentSafety,
  checkEntitySafety,
  getSafetyBadge,
  generateModerationSummary,
} from '../hot-media/safety-checker';

export {
  runAutoPipeline,
  quickPipelineRun,
} from '../hot-media/auto-pipeline';

export {
  discoverContentForCelebrity,
  discoverAllContent,
  validateContent,
} from '../hot-media/content-discovery';

export {
  getDiscoveryRecommendations,
  updateTrendingScores,
  getTopPerformingCelebrities,
} from '../hot-media/learning-service';
