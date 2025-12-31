/**
 * EVERGREEN CONTENT MODULE INDEX
 *
 * Exports all evergreen content generators and utilities.
 *
 * DESIGN PRINCIPLES:
 * 1. Generate once, cache forever
 * 2. Minimal cron jobs (daily max)
 * 3. Browser-side intelligence where possible
 * 4. SEO-first (all content indexable)
 * 5. Graceful degradation
 */

// On This Day - Telugu Cinema History
export {
  getOnThisDay,
  getCachedOnThisDay,
  generateOnThisDay,
} from './on-this-day';

// Interview Intelligence - Quote Extraction
export {
  processInterview,
  getCelebrityInsights,
  getInsightsAbout,
  getControversialInsights,
  isInterviewProcessed,
} from './interview-intelligence';

// Trend Heat Index - Simple Trending Score
export {
  updateAllHeatScores,
  updateEntityHeatScore,
  getTrendingEntities,
  getEntityHeatScore,
  getHeatMovers,
} from './trend-heat-index';

// Movie Analysis - Post-Release Verdict
export {
  generateMovieAnalysis,
  getMovieAnalysis,
  getMoviesNeedingAnalysis,
  getAnalysesByVerdict,
  getRecentAnalyses,
  hasMovieAnalysis,
  processMoviesForAnalysis,
} from './movie-analysis';



