/**
 * Social Handle Intelligence System
 * 
 * Complete system for ingesting, validating, and managing
 * celebrity social media handles from trusted sources.
 * 
 * NO SCRAPING - Metadata only from:
 * - Wikidata (P2003, P2002, P2397)
 * - Wikipedia (external links)
 * - TMDB (external_ids API)
 */

// Source Adapters
export {
  WikidataSocialAdapter,
  WikipediaSocialAdapter,
  TMDBSocialAdapter,
  UnifiedSocialFetcher,
  wikidataSocialAdapter,
  wikipediaSocialAdapter,
  tmdbSocialAdapter,
  unifiedSocialFetcher,
  type SocialHandle,
  type SocialFetchResult,
} from './source-adapters';

// Confidence Engine
export {
  calculateConfidence,
  validateSocialHandle,
  processAndValidateHandles,
  isBlockedHandle,
  validateHandleFormat,
  isLikelyOfficial,
  calculateNameSimilarity,
  determineVerificationMethod,
  type VerificationStatus,
  type ConfidenceResult,
  type ConfidenceAdjustment,
  type ValidationResult,
} from './confidence-engine';

// oEmbed Layer
export {
  generateInstagramProfileEmbed,
  generateYouTubeChannelEmbed,
  generateTwitterProfileEmbed,
  generateProfileLinkCard,
  generateProfileEmbed,
  checkProfilePublic,
  getLatestPostEmbed,
  buildSocialLinksGrid,
  getEmbedInstructions,
  PLATFORM_ICONS,
  type OEmbedProfileResult,
  type ProfileEmbedOptions,
} from './oembed';

// Safety Validators
export {
  checkHandleSafety,
  batchCheckSafety,
  isAdSenseSafe,
  generateSafetyReport,
  isPoliticalContent,
  hasAdultContentIndicators,
  isFakeOrUnofficial,
  hasViolenceIndicators,
  hasCopyrightRisk,
  checkPlatformTOS,
  calculateSensualityScore,
  type SafetyCheckResult,
  type SafetyFlag,
} from './safety-validators';

// Platform Capabilities
export {
  PLATFORM_CAPABILITIES,
  getPlatformCapability,
  supportsEmbed,
  getEmbedLevel,
  getHotContentPriorityOrder,
  getEmbeddablePlatforms,
  getWikidataProperties,
  detectPlatformFromUrl,
  getEmbedBadge,
  getPlatformLegalNotes,
  HOT_CONTENT_PLATFORM_PRIORITY,
  NO_EMBED_PLATFORMS,
  type PlatformType,
  type PlatformCapability,
} from './platform-capabilities';

