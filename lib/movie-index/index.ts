/**
 * Telugu Movie Index Module
 * 
 * Unified exports for the canonical Telugu movie indexing system.
 */

// TMDB Paginator
export {
  paginateTeluguMovies,
  paginateByYear,
  getIndexStats,
  type TMDBDiscoverResult,
  type TMDBDiscoverResponse,
  type IndexedMovie,
  type PaginationResult,
  type PaginatorOptions,
} from './tmdb-paginator';

// Quality Enforcement
export {
  enforceQualityGates,
  batchQualityCheck,
  markNeedsRework,
  type QualityGateResult,
  type QualityCheckResult,
  type MovieToCheck,
} from './quality-enforcement';






