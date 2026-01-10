/**
 * Comparison Source Types
 * 
 * These types define the interface for "comparison-only" data sources.
 * These sources are used ONLY for:
 * - Confidence scoring
 * - Validation and anomaly detection
 * - Cross-reference verification
 * 
 * They do NOT:
 * - Store raw text or copyrighted content
 * - Overwrite primary source data
 * - Serve as primary data sources
 */

// ============================================================
// SOURCE CONFIGURATION
// ============================================================

/**
 * Source tier determines the weight given to each source
 * in confidence calculations.
 */
export enum SourceTier {
  /** Official/authoritative sources (TMDB, IMDb) */
  PRIMARY = 1,
  /** Aggregator sites with editorial oversight */
  AGGREGATOR = 2,
  /** Community/crowd-sourced data */
  COMMUNITY = 3,
  /** Derived signals (popularity, visibility) */
  SIGNAL = 4,
}

/**
 * Configuration for a comparison source adapter
 */
export interface ComparisonSourceConfig {
  /** Unique identifier for this source */
  id: string;
  /** Human-readable name */
  name: string;
  /** Source tier for weighting */
  tier: SourceTier;
  /** Base URL for the source */
  baseUrl?: string;
  /** Rate limit: requests per minute */
  rateLimit: number;
  /** Cache duration in days */
  cacheDays: number;
  /** Whether this source is enabled */
  enabled: boolean;
  /** Feature flag key for enabling/disabling */
  featureFlag: string;
  /** Legal/compliance notes */
  legalNotes: string;
}

// ============================================================
// SIGNAL TYPES
// ============================================================

/**
 * Numeric signal (0-100 scale normalized)
 */
export interface NumericSignal {
  type: 'numeric';
  value: number; // 0-100 normalized
  rawValue?: number; // Original value before normalization
  scale?: string; // e.g., "0-10", "0-5", "percentage"
}

/**
 * Boolean signal
 */
export interface BooleanSignal {
  type: 'boolean';
  value: boolean;
}

/**
 * Categorical signal
 */
export interface CategoricalSignal {
  type: 'categorical';
  value: string;
  allowedValues: string[];
}

/**
 * Bucket signal (low/medium/high/very_high)
 */
export interface BucketSignal {
  type: 'bucket';
  value: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  numericEquivalent: number; // 0-100
}

export type Signal = NumericSignal | BooleanSignal | CategoricalSignal | BucketSignal;

// ============================================================
// COMPARISON RESULT
// ============================================================

/**
 * Result from a comparison source query
 */
export interface ComparisonResult {
  /** Source identifier */
  sourceId: string;
  /** Source tier */
  tier: SourceTier;
  /** Whether the query was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Timestamp of fetch */
  fetchedAt: string;
  /** Whether this is from cache */
  fromCache: boolean;
  /** Confidence weight (0-1) for this source */
  confidenceWeight: number;
  /** Signal strength (0-1) - how much data was found */
  signalStrength: number;
  /** The actual signals */
  signals: Record<string, Signal>;
  /** Match indicators for validation */
  matches?: {
    field: string;
    primaryValue: string | number | null;
    comparisonValue: string | number | null;
    isMatch: boolean;
    confidence: number;
  }[];
}

/**
 * Aggregated comparison results from multiple sources
 */
export interface AggregatedComparison {
  /** Movie identifier */
  movieId: string;
  /** Movie title (for reference) */
  movieTitle: string;
  /** Individual source results */
  sources: ComparisonResult[];
  /** Aggregated confidence adjustment */
  confidenceAdjustment: number; // -0.2 to +0.2
  /** Overall alignment score */
  alignmentScore: number; // 0-1
  /** Conflicts detected */
  conflicts: {
    field: string;
    sources: string[];
    values: (string | number | null)[];
    severity: 'low' | 'medium' | 'high';
  }[];
  /** Whether manual review is recommended */
  needsManualReview: boolean;
  /** Reason for manual review */
  reviewReason?: string;
  /** Timestamp */
  computedAt: string;
}

// ============================================================
// ADAPTER INTERFACE
// ============================================================

/**
 * Query parameters for comparison lookup
 */
export interface ComparisonQuery {
  /** TMDB ID if available */
  tmdbId?: number;
  /** IMDb ID if available */
  imdbId?: string;
  /** English title */
  titleEn: string;
  /** Release year */
  releaseYear: number;
  /** Director name */
  director?: string;
  /** Lead actor */
  hero?: string;
  /** Additional context */
  context?: {
    language?: string;
    country?: string;
    genres?: string[];
  };
}

/**
 * Base interface for comparison source adapters
 */
export interface ComparisonSourceAdapter {
  /** Source configuration */
  readonly config: ComparisonSourceConfig;
  
  /**
   * Check if this source can handle the given query
   */
  canHandle(query: ComparisonQuery): boolean;
  
  /**
   * Fetch comparison signals for a movie
   */
  fetch(query: ComparisonQuery): Promise<ComparisonResult>;
  
  /**
   * Get the last fetch timestamp for caching
   */
  getLastFetch(movieId: string): Promise<Date | null>;
  
  /**
   * Check if cached data is still valid
   */
  isCacheValid(movieId: string): Promise<boolean>;
}

// ============================================================
// VALIDATION TYPES
// ============================================================

/**
 * Validation check result
 */
export interface ValidationCheck {
  field: string;
  primarySource: string;
  primaryValue: string | number | null;
  comparisonSources: {
    source: string;
    value: string | number | null;
    matches: boolean;
    confidence: number;
  }[];
  consensus: 'agree' | 'disagree' | 'partial' | 'insufficient';
  confidenceImpact: number; // -0.1 to +0.1
}

/**
 * Full validation report
 */
export interface ValidationReport {
  movieId: string;
  movieTitle: string;
  checks: ValidationCheck[];
  overallConfidenceImpact: number;
  needsManualReview: boolean;
  reviewFlags: string[];
  timestamp: string;
}

// ============================================================
// CACHE TYPES
// ============================================================

/**
 * Cached comparison result
 */
export interface CachedComparison {
  movieId: string;
  sourceId: string;
  result: ComparisonResult;
  cachedAt: string;
  expiresAt: string;
}

