/**
 * Enrichment Logging Types
 * 
 * Core types for the enrichment logging system that provides:
 * - Before/after field-level change tracking
 * - Anomaly detection and flagging
 * - Structured reports with actionable insights
 */

// ============================================================
// FIELD CHANGE TRACKING
// ============================================================

/**
 * Represents a single field change during enrichment
 */
export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  confidence: number;
  anomalyFlags?: AnomalyFlag[];
}

/**
 * Anomaly types detected during enrichment
 */
export type AnomalyType =
  | 'ACTOR_TOO_YOUNG'     // Actor couldn't have acted at that age
  | 'YEAR_MISMATCH'       // Slug year vs release_year differ
  | 'SOURCE_CONFLICT'     // Multiple sources disagree
  | 'LOW_CONFIDENCE'      // Below threshold confidence
  | 'DATA_IMPLAUSIBLE'    // Runtime < 30min, impossible values
  | 'DUPLICATE_SUSPECT'   // Potential duplicate entry
  | 'MISSING_REQUIRED';   // Required field still missing

/**
 * Severity levels for anomalies
 */
export type AnomalySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Anomaly flag attached to a field change
 */
export interface AnomalyFlag {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  suggestedAction?: string;
  autoFixable: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================
// ENRICHMENT RECORDS
// ============================================================

/**
 * Record of enrichment for a single movie
 */
export interface EnrichmentRecord {
  movieId: string;
  title: string;
  year: number;
  phase: string;
  timestamp: string;
  changes: FieldChange[];
  skipped: string[];      // Fields skipped (already had value, etc.)
  failed: string[];       // Fields that failed to enrich
  needsReview: boolean;
  reviewReasons: string[];
  duration_ms?: number;
}

/**
 * Enrichment session containing multiple records
 */
export interface EnrichmentSession {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  phases: string[];
  totalMovies: number;
  records: EnrichmentRecord[];
  options: EnrichmentOptions;
}

/**
 * Options for enrichment session
 */
export interface EnrichmentOptions {
  dryRun: boolean;
  limit: number;
  phases: string[];
  filters?: {
    decade?: string;
    director?: string;
    actor?: string;
    slug?: string;
  };
}

// ============================================================
// COVERAGE STATISTICS
// ============================================================

/**
 * Coverage statistics for a single field
 */
export interface FieldCoverage {
  field: string;
  count: number;
  total: number;
  percentage: number;
}

/**
 * Before/after coverage comparison
 */
export interface CoverageStats {
  fields: FieldCoverage[];
  overallPercentage: number;
  timestamp: string;
}

/**
 * Coverage comparison between before and after states
 */
export interface CoverageComparison {
  before: CoverageStats;
  after: CoverageStats;
  improvement: {
    field: string;
    beforePct: number;
    afterPct: number;
    changePct: number;
    changeCount: number;
  }[];
}

// ============================================================
// SUMMARY AND REPORTING
// ============================================================

/**
 * Statistics by category
 */
export interface CategoryStats {
  byField: Record<string, number>;
  bySource: Record<string, number>;
  byPhase: Record<string, number>;
}

/**
 * Anomaly report for manual review
 */
export interface AnomalyReport {
  movieId: string;
  title: string;
  year: number;
  anomalies: AnomalyFlag[];
  priority: number; // Higher = more urgent
}

/**
 * Complete enrichment summary
 */
export interface EnrichmentSummary {
  session: {
    sessionId: string;
    startedAt: string;
    endedAt: string;
    duration_ms: number;
    phases: string[];
  };
  
  coverage: CoverageComparison;
  
  changes: {
    total: number;
    byField: Record<string, { enriched: number; skipped: number; failed: number }>;
    bySource: Record<string, number>;
  };
  
  anomalies: {
    total: number;
    bySeverity: Record<AnomalySeverity, number>;
    byType: Record<AnomalyType, number>;
    needsManualReview: AnomalyReport[];
  };
  
  skipped: {
    total: number;
    alreadyHadValue: number;
    noSourceFound: number;
    belowThreshold: number;
  };
  
  movies: {
    processed: number;
    enriched: number;
    unchanged: number;
    failed: number;
    needsReview: number;
  };
}

// ============================================================
// SOURCE CONFIGURATION
// ============================================================

/**
 * Source tier for trust scoring
 */
export type SourceTier = 1 | 2 | 3;

/**
 * Source configuration
 */
export interface SourceConfig {
  name: string;
  tier: SourceTier;
  weight: number;
  rateLimit?: number; // ms between requests
  requiresKey?: boolean;
}

/**
 * Default source configurations
 */
export const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  'wikipedia': { name: 'Wikipedia', tier: 1, weight: 1.0 },
  'tmdb': { name: 'TMDB', tier: 1, weight: 0.95, rateLimit: 250, requiresKey: true },
  'wikidata': { name: 'Wikidata', tier: 1, weight: 0.90 },
  'imdb': { name: 'IMDB', tier: 1, weight: 0.90 },
  'omdb': { name: 'OMDB', tier: 2, weight: 0.80, requiresKey: true },
  'archive_org': { name: 'Internet Archive', tier: 2, weight: 0.75 },
  'news_sources': { name: 'News Sources', tier: 2, weight: 0.70 },
  'fan_sites': { name: 'Fan Sites', tier: 3, weight: 0.40 },
  'ai_inference': { name: 'AI Inference', tier: 3, weight: 0.35 },
  'generated': { name: 'Generated', tier: 3, weight: 0.30 },
};

// ============================================================
// PHASE CONFIGURATION
// ============================================================

/**
 * Phase configuration for enrichment orchestrator
 */
export interface PhaseConfig {
  name: string;
  script: string;
  args: string[];
  description: string;
  priority: number;
  dependencies?: string[];
  outputFields?: string[];
}

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * Result of a single enrichment attempt
 */
export interface EnrichmentResult<T = unknown> {
  success: boolean;
  value?: T;
  source?: string;
  confidence?: number;
  error?: string;
  anomalies?: AnomalyFlag[];
}

/**
 * Batch enrichment result
 */
export interface BatchEnrichmentResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: EnrichmentResult[];
}

