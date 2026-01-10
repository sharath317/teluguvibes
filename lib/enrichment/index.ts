/**
 * Enrichment Library
 * 
 * Provides tools for enrichment operations:
 * - Session-based logging with before/after tracking
 * - Anomaly detection and validation
 * - Report generation (console, markdown, JSON)
 * - Safe classification (primary_genre, age_rating)
 * - Translation services (Telugu synopsis)
 */

// Types
export * from './types';

// Logger
export { EnrichmentLogger, getEnrichmentLogger } from './enrichment-logger';

// Anomaly Detection
export {
  checkActorAge,
  checkYearSlugMismatch,
  checkDataPlausibility,
  checkSourceConflict,
  checkLowConfidence,
  checkMissingRequired,
  runAllAnomalyChecks,
  getActorBirthYear,
  addActorBirthYear,
} from './anomaly-detector';
export type { AnomalyCheckResult } from './anomaly-detector';

// Reporter
export {
  printConsoleSummary,
  generateMarkdownReport,
  saveMarkdownReport,
  saveJSONReport,
  generateManualReviewReport,
  reporter,
} from './enrichment-reporter';

// Safe Classification (v2.0)
export {
  derivePrimaryGenre,
  deriveAgeRating,
  classifyMovie,
  validateClassification,
} from './safe-classification';
export type {
  GenreSignal,
  GenreResult,
  AgeRatingResult,
  MovieForClassification,
  ClassificationResult,
} from './safe-classification';

// Genre Patterns
export {
  ACTOR_GENRE_MAP,
  DIRECTOR_GENRE_MAP,
  MOOD_GENRE_MAP,
  AUDIENCE_FIT_GENRE_MAP,
  ERA_DEFAULTS,
  PRIMARY_GENRE_PRIORITY,
  normalizeGenre,
  findActorGenres,
  findDirectorGenres,
  getEraGenres,
} from './genre-patterns';

// Translation Service
export {
  translateToTelugu,
  enrichTeluguSynopsis,
  fetchTeluguWikipediaSynopsis,
  fetchAndTranslateEnglishWikipedia,
  fetchWikidataTeluguDescription,
  generateBasicTeluguSynopsis,
  CONFIDENCE_TIERS,
  HIGH_CONFIDENCE_THRESHOLD,
  TELUGU_GENRE_TERMS,
} from './translation-service';
export type { TranslationResult, TranslationOptions } from './translation-service';

