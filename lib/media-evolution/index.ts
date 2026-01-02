/**
 * Media-Aware Data Evolution System
 * 
 * A comprehensive system for improving Telugu movie data quality
 * through intelligent gap analysis, tiered media sourcing,
 * entity normalization, and continuous discovery.
 */

// Types
export * from './types';

// Phase 1: Coverage Gap Analysis
export {
  analyzeCoverageGaps,
  analyzeIndexVsMovies
} from './coverage-gap-analyzer';

// Phase 2 & 3: Media Enhancement
export {
  fetchTMDBImages,
  fetchWikimediaImage,
  enhanceMovieMedia,
  enhanceMediaBatch,
  calculateImageScore
} from './media-enhancement';

// Phase 4: Entity Normalization
export {
  canonicalizeName,
  generateNameVariations,
  detectDuplicateEntities,
  detectCollaborations,
  normalizeEntities,
  detectCareerPhase,
  enrichEntitiesWithCareerPhase
} from './entity-normalizer';

// Phase 5: Smart Tags
export {
  generateMovieTags,
  rebuildAllTags,
  getMoviesByTag,
  getAvailableTags
} from './smart-tags';

// Phase 6: Story Graph
export {
  detectRelatedPosts,
  createStoryArc,
  addStoryEvent,
  getStoryArcsForEntity,
  getDevelopingStories,
  autoLinkPost,
  getStoryGraphDensity
} from './story-graph';

// Phase 7: Continuous Discovery
export {
  fetchTMDBWeeklyDelta,
  processDiscoveryDelta,
  wouldCreateDuplicate,
  getDiscoveryStatus
} from './continuous-discovery';

// Phase 9: Metrics
export {
  calculateVisualCompleteness,
  calculateStructuredDepth,
  calculateDecadeCoverage,
  calculateEntityConfidence,
  generateFullMetrics,
  compareMetrics
} from './metrics';

