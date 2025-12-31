/**
 * Viral Content Module
 *
 * Exports all viral content fetchers and utilities.
 */

// Main ingestion pipeline
export {
  ingestViralContent,
  getIngestionStats,
  type ViralIngestionResult
} from './viral-ingestion';

// YouTube Trending
export {
  fetchYouTubeTrending,
  calculateYouTubeViralScore,
  extractYouTubeTags,
  type YouTubeTrendingItem
} from './youtube-trending';

// Reddit Hot
export {
  fetchRedditHot,
  calculateRedditViralScore,
  extractRedditTags,
  getEmbeddableRedditPosts,
  type RedditHotItem
} from './reddit-hot';

// Twitter Viral
export {
  fetchTwitterEmbed,
  fetchTwitterEmbeds,
  calculateTwitterViralScore,
  extractTwitterTags,
  isTeluguRelatedTweet,
  getTeluguTwitterHandles,
  getTeluguHashtags,
  type TwitterViralItem
} from './twitter-viral';

// Moderation
export {
  moderateContent,
  moderateContentBatch,
  getModerationSummary,
  shouldFeatureContent,
  getModerationLabel,
  type ModerationResult,
  type ContentForModeration
} from './moderation';
