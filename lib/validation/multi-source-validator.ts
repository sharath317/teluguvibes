/**
 * Multi-Source Validator
 * 
 * Validates movie data against multiple external sources
 * to ensure accuracy and build consensus.
 * 
 * v2.0 UPDATE: Now supports "comparison-only" secondary sources
 * for confidence scoring and anomaly detection.
 */

import chalk from 'chalk';

// Import comparison source types and orchestrator
import type {
    ComparisonQuery,
    AggregatedComparison,
    ComparisonResult,
} from '../sources/comparison/types';

// ============================================================
// TYPES
// ============================================================

export interface ValidationSource {
    name: string;
    tier: 1 | 2 | 3;  // 1 = most authoritative
    weight: number;   // 0.0 to 1.0
    enabled: boolean;
}

export interface ValidationResult {
    field: string;
    isValid: boolean;
  confidence: number;
    sources: SourceResult[];
    consensusValue?: unknown;
    originalValue?: unknown;
    suggestedFix?: unknown;
    requiresManualReview: boolean;
}

export interface SourceResult {
    source: string;
    value: unknown;
    confidence: number;
    matched: boolean;
}

export interface ValidationReport {
    movieId: string;
    movieTitle: string;
    overallScore: number;
    validatedFields: ValidationResult[];
    issues: ValidationIssue[];
    timestamp: string;
}

export interface ValidationIssue {
    field: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    currentValue: unknown;
    expectedValue?: unknown;
    autoFixable: boolean;
}

export interface MovieData {
    id: string;
    title_en: string;
    title_te?: string;
    release_year?: number;
    director?: string;
    hero?: string;
    heroine?: string;
    genres?: string[];
    tmdb_id?: number;
    imdb_id?: string;
    runtime_minutes?: number;
    [key: string]: unknown;
}

// ============================================================
// DEFAULT SOURCES
// ============================================================

export const DEFAULT_SOURCES: ValidationSource[] = [
    { name: 'tmdb', tier: 1, weight: 0.95, enabled: true },
    { name: 'wikipedia', tier: 1, weight: 1.0, enabled: true },
    { name: 'imdb', tier: 1, weight: 0.90, enabled: true },
    { name: 'wikidata', tier: 1, weight: 0.90, enabled: true },
    { name: 'omdb', tier: 2, weight: 0.75, enabled: true },
];

// ============================================================
// MULTI-SOURCE VALIDATOR CLASS
// ============================================================

export class MultiSourceValidator {
    private sources: ValidationSource[];
    private tmdbApiKey?: string;
    private rateLimitMs: number;
    private lastRequestTime: number = 0;

    constructor(options: {
        sources?: ValidationSource[];
        tmdbApiKey?: string;
        rateLimitMs?: number;
    } = {}) {
        this.sources = options.sources || DEFAULT_SOURCES;
        this.tmdbApiKey = options.tmdbApiKey || process.env.TMDB_API_KEY;
        this.rateLimitMs = options.rateLimitMs || 250;
    }

    /**
     * Validate a single movie against multiple sources
     */
    async validateMovie(movie: MovieData): Promise<ValidationReport> {
        const validatedFields: ValidationResult[] = [];
        const issues: ValidationIssue[] = [];

        // Fetch data from sources
        const sourceData = await this.fetchFromSources(movie);

        // Validate title
        const titleResult = this.validateField('title_en', movie.title_en, sourceData, 'title');
        validatedFields.push(titleResult);
        if (!titleResult.isValid) {
            issues.push(this.createIssue(titleResult, 'high'));
        }

        // Validate release year
        const yearResult = this.validateField('release_year', movie.release_year, sourceData, 'year');
        validatedFields.push(yearResult);
        if (!yearResult.isValid) {
            issues.push(this.createIssue(yearResult, 'critical'));
        }

        // Validate director
        const directorResult = this.validateField('director', movie.director, sourceData, 'director');
        validatedFields.push(directorResult);
        if (!directorResult.isValid) {
            issues.push(this.createIssue(directorResult, 'medium'));
        }

        // Validate runtime
        const runtimeResult = this.validateField('runtime_minutes', movie.runtime_minutes, sourceData, 'runtime');
        validatedFields.push(runtimeResult);
        if (!runtimeResult.isValid && runtimeResult.consensusValue) {
            issues.push(this.createIssue(runtimeResult, 'low'));
        }

        // Calculate overall score
        const overallScore = this.calculateOverallScore(validatedFields);

        return {
            movieId: movie.id,
            movieTitle: movie.title_en,
            overallScore,
            validatedFields,
            issues,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Fetch data from all enabled sources
     */
    private async fetchFromSources(movie: MovieData): Promise<Map<string, Record<string, unknown>>> {
        const data = new Map<string, Record<string, unknown>>();

        for (const source of this.sources.filter(s => s.enabled)) {
            await this.waitForRateLimit();

            try {
                const sourceData = await this.fetchFromSource(source.name, movie);
                if (sourceData) {
                    data.set(source.name, sourceData);
                }
            } catch (error) {
                console.warn(chalk.yellow(`  Warning: Failed to fetch from ${source.name}`));
            }
        }

        return data;
    }

    /**
     * Fetch data from a specific source
     */
    private async fetchFromSource(
        sourceName: string,
        movie: MovieData
    ): Promise<Record<string, unknown> | null> {
        switch (sourceName) {
            case 'tmdb':
                return this.fetchFromTMDB(movie);
            case 'wikipedia':
                return this.fetchFromWikipedia(movie);
            case 'omdb':
                return this.fetchFromOMDB(movie);
            default:
                return null;
        }
    }

    /**
     * Fetch from TMDB
     */
    private async fetchFromTMDB(movie: MovieData): Promise<Record<string, unknown> | null> {
        if (!this.tmdbApiKey || !movie.tmdb_id) return null;

        try {
            const url = `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${this.tmdbApiKey}`;
            const response = await fetch(url);
            if (!response.ok) return null;

          const data = await response.json();
          return {
              title: data.title,
              year: data.release_date ? new Date(data.release_date).getFullYear() : null,
              runtime: data.runtime,
              overview: data.overview,
          };
      } catch {
            return null;
        }
    }

    /**
     * Fetch from Wikipedia
     */
    private async fetchFromWikipedia(movie: MovieData): Promise<Record<string, unknown> | null> {
        try {
            const wikiTitle = movie.title_en.replace(/ /g, '_');
            const patterns = [
                `${wikiTitle}_(${movie.release_year}_film)`,
                `${wikiTitle}_(Telugu_film)`,
                `${wikiTitle}_(film)`,
                wikiTitle,
            ];

            for (const pattern of patterns) {
            const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pattern)}`;
            const response = await fetch(url, {
              headers: { 'User-Agent': 'TeluguPortal/1.0 (validation)' },
          });

                if (response.ok) {
                    const data = await response.json();
                    return {
                        title: data.title,
                        description: data.description,
                        extract: data.extract,
                    };
                }
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Fetch from OMDB
     */
    private async fetchFromOMDB(movie: MovieData): Promise<Record<string, unknown> | null> {
        const omdbKey = process.env.OMDB_API_KEY;
        if (!omdbKey || !movie.imdb_id) return null;

        try {
            const url = `http://www.omdbapi.com/?i=${movie.imdb_id}&apikey=${omdbKey}`;
            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();
            if (data.Response === 'False') return null;

            return {
                title: data.Title,
                year: parseInt(data.Year),
                runtime: parseInt(data.Runtime),
                director: data.Director,
            };
        } catch {
            return null;
        }
    }

    /**
     * Validate a single field against source data
     */
    private validateField(
        fieldName: string,
        currentValue: unknown,
        sourceData: Map<string, Record<string, unknown>>,
        sourceField: string
    ): ValidationResult {
        const sourceResults: SourceResult[] = [];
        let consensusValue: unknown = null;
        const valueCounts = new Map<string, { count: number; weight: number; value: unknown }>();

        // Gather values from all sources
        for (const [sourceName, data] of sourceData) {
            const sourceValue = data[sourceField];
            if (sourceValue === undefined || sourceValue === null) continue;

          const source = this.sources.find(s => s.name === sourceName);
          if (!source) continue;

          const normalizedValue = this.normalizeValue(sourceValue);
          const normalizedCurrent = this.normalizeValue(currentValue);
          const matched = normalizedValue === normalizedCurrent;

          sourceResults.push({
              source: sourceName,
              value: sourceValue,
              confidence: source.weight,
              matched,
          });

          // Track value counts for consensus
          const key = String(normalizedValue);
          const existing = valueCounts.get(key) || { count: 0, weight: 0, value: sourceValue };
          existing.count++;
          existing.weight += source.weight;
          valueCounts.set(key, existing);
    }

        // Find consensus value (highest weighted count)
        let maxWeight = 0;
        for (const entry of valueCounts.values()) {
            if (entry.weight > maxWeight) {
                maxWeight = entry.weight;
                consensusValue = entry.value;
            }
        }

        // Calculate confidence
        const matchedSources = sourceResults.filter(r => r.matched);
        const totalWeight = sourceResults.reduce((sum, r) => sum + r.confidence, 0);
        const matchedWeight = matchedSources.reduce((sum, r) => sum + r.confidence, 0);
        const confidence = totalWeight > 0 ? matchedWeight / totalWeight : 0;

        // Determine if valid (>= 50% weighted match or 2+ tier-1 sources agree)
        const tier1Matches = matchedSources.filter(r => {
            const source = this.sources.find(s => s.name === r.source);
            return source?.tier === 1;
    });
        const isValid = confidence >= 0.5 || tier1Matches.length >= 2;

        // Check if manual review needed
        const requiresManualReview = !isValid && sourceResults.length >= 2 &&
            this.normalizeValue(currentValue) !== this.normalizeValue(consensusValue);

        return {
            field: fieldName,
            isValid,
            confidence,
            sources: sourceResults,
            consensusValue,
            originalValue: currentValue,
            suggestedFix: isValid ? undefined : consensusValue,
            requiresManualReview,
        };
    }

    /**
     * Normalize value for comparison
     */
    private normalizeValue(value: unknown): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value.toLowerCase().trim();
        if (typeof value === 'number') return String(value);
        return JSON.stringify(value);
    }

    /**
     * Create an issue from a validation result
     */
    private createIssue(
        result: ValidationResult,
        severity: ValidationIssue['severity']
    ): ValidationIssue {
        return {
            field: result.field,
            severity,
            message: `${result.field} mismatch: current="${result.originalValue}", consensus="${result.consensusValue}"`,
            currentValue: result.originalValue,
            expectedValue: result.consensusValue,
            autoFixable: result.confidence >= 0.7 && result.sources.length >= 2,
        };
    }

    /**
     * Calculate overall validation score
     */
    private calculateOverallScore(results: ValidationResult[]): number {
        if (results.length === 0) return 0;

        const weights: Record<string, number> = {
            title_en: 1.0,
            release_year: 0.9,
            director: 0.8,
            runtime_minutes: 0.5,
        };

        let totalWeight = 0;
        let weightedScore = 0;

        for (const result of results) {
            const weight = weights[result.field] || 0.5;
            totalWeight += weight;
            weightedScore += result.confidence * weight;
        }

        return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) / 100 : 0;
    }

    /**
     * Rate limiting
     */
    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;

        if (elapsed < this.rateLimitMs) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimitMs - elapsed));
    }
    
        this.lastRequestTime = Date.now();
    }
}

// ============================================================
// VALIDATION RULE ENGINE
// ============================================================

export interface ValidationRule {
    name: string;
    field: string;
    validate: (value: unknown, movie: MovieData) => boolean;
    severity: ValidationIssue['severity'];
    message: (value: unknown, movie: MovieData) => string;
}

export const DEFAULT_RULES: ValidationRule[] = [
    {
        name: 'year_reasonable',
        field: 'release_year',
        validate: (value) => {
            const year = Number(value);
            return !isNaN(year) && year >= 1930 && year <= new Date().getFullYear() + 2;
        },
        severity: 'critical',
        message: (value) => `Release year ${value} is outside reasonable range (1930-${new Date().getFullYear() + 2})`,
    },
    {
        name: 'title_not_empty',
        field: 'title_en',
        validate: (value) => typeof value === 'string' && value.trim().length > 0,
        severity: 'critical',
        message: () => 'Title cannot be empty',
    },
    {
        name: 'runtime_reasonable',
        field: 'runtime_minutes',
        validate: (value) => {
            if (value === null || value === undefined) return true;
            const runtime = Number(value);
            return !isNaN(runtime) && runtime >= 30 && runtime <= 300;
        },
        severity: 'medium',
        message: (value) => `Runtime ${value} minutes is outside reasonable range (30-300)`,
    },
    {
        name: 'director_not_unknown',
        field: 'director',
        validate: (value) => value !== 'Unknown' && value !== 'TBD',
        severity: 'low',
        message: () => 'Director should not be "Unknown"',
    },
];

export class RuleValidator {
    private rules: ValidationRule[];

    constructor(rules: ValidationRule[] = DEFAULT_RULES) {
        this.rules = rules;
    }

    validate(movie: MovieData): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        for (const rule of this.rules) {
            const value = movie[rule.field];

            if (!rule.validate(value, movie)) {
                issues.push({
                    field: rule.field,
                    severity: rule.severity,
                    message: rule.message(value, movie),
                    currentValue: value,
                    autoFixable: false,
                });
            }
        }

        return issues;
    }
}

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

export function createValidator(options?: {
    sources?: ValidationSource[];
    tmdbApiKey?: string;
}): MultiSourceValidator {
    return new MultiSourceValidator(options);
}

export function createRuleValidator(rules?: ValidationRule[]): RuleValidator {
    return new RuleValidator(rules);
}

// ============================================================
// BATCH VALIDATION FUNCTIONS
// ============================================================

export interface BatchValidationOptions {
    applyAutoFix?: boolean;
    onProgress?: (completed: number, total: number) => void;
    minConfidenceForAutoFix?: number;
    minSourcesForAutoFix?: number;
}

export interface BatchValidationReport {
    total_movies: number;
    auto_fixed: {
        count: number;
        items: Array<{ movieId: string; field: string; oldValue: unknown; newValue: unknown }>;
    };
    needs_review: {
        count: number;
        items: ValidationReport[];
    };
    timestamp: string;
}

/**
 * Validate a single movie (convenience function)
 */
export async function validateMovie(
    movieId: string,
    options?: { tmdbApiKey?: string }
): Promise<ValidationReport | null> {
    // This would need a database lookup - placeholder
    console.log(`Validating movie ${movieId}`);
    return null;
}

/**
 * Validate a batch of movies
 */
export async function validateBatch(
    movieIds: string[],
    options: BatchValidationOptions = {}
): Promise<BatchValidationReport> {
    const {
        applyAutoFix = false,
        onProgress,
        minConfidenceForAutoFix = 0.8,
        minSourcesForAutoFix = 3,
    } = options;

    const report: BatchValidationReport = {
        total_movies: movieIds.length,
        auto_fixed: { count: 0, items: [] },
        needs_review: { count: 0, items: [] },
        timestamp: new Date().toISOString(),
    };

    const validator = new MultiSourceValidator();

    // For now, this is a placeholder - actual implementation would 
    // fetch movie data and validate each one
    for (let i = 0; i < movieIds.length; i++) {
        if (onProgress) {
            onProgress(i + 1, movieIds.length);
    }

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 10));
  }

    return report;
}

/**
 * Generate a markdown report from validation results
 */
export function generateMarkdownReport(report: BatchValidationReport): string {
    const lines: string[] = [];
  
    lines.push(`# Validation Report`);
    lines.push(`\nGenerated: ${new Date(report.timestamp).toLocaleString()}`);
    lines.push(`\n## Summary\n`);
    lines.push(`- **Total Movies**: ${report.total_movies}`);
    lines.push(`- **Auto-Fixed**: ${report.auto_fixed.count}`);
    lines.push(`- **Needs Review**: ${report.needs_review.count}`);
  
    if (report.auto_fixed.items.length > 0) {
        lines.push(`\n## Auto-Fixed Items\n`);
        lines.push(`| Movie ID | Field | Old Value | New Value |`);
        lines.push(`|----------|-------|-----------|-----------|`);
        report.auto_fixed.items.forEach(item => {
            lines.push(`| ${item.movieId.substring(0, 8)}... | ${item.field} | ${item.oldValue} | ${item.newValue} |`);
        });
    }

    if (report.needs_review.items.length > 0) {
        lines.push(`\n## Items Needing Review\n`);
        report.needs_review.items.forEach(item => {
            lines.push(`### ${item.movieTitle}`);
            lines.push(`- **ID**: ${item.movieId}`);
            lines.push(`- **Score**: ${(item.overallScore * 100).toFixed(0)}%`);
            lines.push(`- **Issues**: ${item.issues.length}`);
            item.issues.forEach(issue => {
                lines.push(`  - [${issue.severity.toUpperCase()}] ${issue.message}`);
            });
            lines.push('');
        });
  }
  
    return lines.join('\n');
}

// ============================================================
// COMPARISON SOURCE INTEGRATION (v2.0)
// ============================================================

/**
 * Extended validation result with comparison signals
 */
export interface ExtendedValidationReport extends ValidationReport {
    comparisonSignals?: AggregatedComparison;
    confidenceAdjustment: number;
    finalConfidence: number;
}

/**
 * Extended validation options with comparison support
 */
export interface ExtendedValidationOptions {
    /** Include comparison sources in validation */
    includeComparisonSources?: boolean;
    /** Comparison sources to use (if not set, uses all enabled) */
    comparisonSources?: string[];
    /** Minimum alignment score to trust comparison data */
    minAlignmentScore?: number;
}

/**
 * Multi-Source Validator with Comparison Source Support
 * 
 * This extended validator integrates "comparison-only" secondary sources
 * for confidence scoring and anomaly detection.
 */
export class ExtendedMultiSourceValidator extends MultiSourceValidator {
    private comparisonEnabled: boolean = false;

    constructor(options: {
        sources?: ValidationSource[];
        tmdbApiKey?: string;
        rateLimitMs?: number;
        enableComparison?: boolean;
    } = {}) {
        super(options);
        this.comparisonEnabled = options.enableComparison ?? false;
    }

    /**
     * Enable or disable comparison source integration
     */
    setComparisonEnabled(enabled: boolean): void {
        this.comparisonEnabled = enabled;
    }

    /**
     * Validate movie with comparison source support
     */
    async validateWithComparison(
        movie: MovieData,
        options: ExtendedValidationOptions = {}
    ): Promise<ExtendedValidationReport> {
        // First, run standard validation
        const baseReport = await this.validateMovie(movie);

        // Default extended report
        const extendedReport: ExtendedValidationReport = {
            ...baseReport,
            confidenceAdjustment: 0,
            finalConfidence: baseReport.overallScore,
        };

        // If comparison is disabled or not requested, return base report
        if (!this.comparisonEnabled || !options.includeComparisonSources) {
            return extendedReport;
        }

        try {
            // Dynamically import comparison orchestrator to avoid circular deps
            const { comparisonOrchestrator } = await import('../sources/comparison');

            // Build comparison query
            const query: ComparisonQuery = {
                tmdbId: movie.tmdb_id,
                imdbId: movie.imdb_id,
                titleEn: movie.title_en,
                releaseYear: movie.release_year || 0,
                director: movie.director,
                hero: movie.hero,
                context: {
                    language: 'Telugu',
                    genres: movie.genres,
                },
            };

            // Fetch comparison data
            const comparisonResult = await comparisonOrchestrator.fetchAll(query);

            // Apply comparison adjustment
            extendedReport.comparisonSignals = comparisonResult;
            extendedReport.confidenceAdjustment = comparisonResult.confidenceAdjustment;
            extendedReport.finalConfidence = Math.max(0, Math.min(1,
                baseReport.overallScore + comparisonResult.confidenceAdjustment
            ));

            // Add comparison-based issues
            for (const conflict of comparisonResult.conflicts) {
                extendedReport.issues.push({
                    field: conflict.field,
                    severity: conflict.severity === 'high' ? 'high' :
                        conflict.severity === 'medium' ? 'medium' : 'low',
                    message: `Comparison conflict: ${conflict.sources.join(', ')} disagree on ${conflict.field}`,
                    currentValue: conflict.values[0],
                    expectedValue: undefined,
                    autoFixable: false,
                });
            }

            // Flag for manual review if needed
            if (comparisonResult.needsManualReview) {
                extendedReport.issues.push({
                    field: '_comparison',
                    severity: 'medium',
                    message: `Manual review recommended: ${comparisonResult.reviewReason}`,
                    currentValue: null,
                    autoFixable: false,
                });
            }

        } catch (error) {
            console.warn(chalk.yellow(`  Warning: Comparison sources unavailable`));
        }

        return extendedReport;
    }

    /**
     * Calculate confidence with comparison signals
     * 
     * Rules:
     * - Increase confidence when comparison sources agree with primary
     * - Decrease confidence when there are conflicts
     * - Never overwrite primary data, only adjust confidence
     */
    calculateAdjustedConfidence(
        baseConfidence: number,
        comparisonResult: AggregatedComparison
    ): number {
        let adjustment = 0;

        // Agreement bonus
        if (comparisonResult.alignmentScore >= 0.8) {
            adjustment += 0.1;
        } else if (comparisonResult.alignmentScore >= 0.6) {
            adjustment += 0.05;
        }

        // Conflict penalty
        const highConflicts = comparisonResult.conflicts.filter(c => c.severity === 'high').length;
        const mediumConflicts = comparisonResult.conflicts.filter(c => c.severity === 'medium').length;

        adjustment -= (highConflicts * 0.1);
        adjustment -= (mediumConflicts * 0.05);

        // Clamp adjustment
        adjustment = Math.max(-0.2, Math.min(0.15, adjustment));

        // Calculate final confidence
        const finalConfidence = Math.max(0, Math.min(1, baseConfidence + adjustment));

        return finalConfidence;
    }
}

/**
 * Store comparison signals in the database
 */
export interface ComparisonSignalsData {
    movie_id: string;
    signals: Record<string, unknown>;
    sources: string[];
    confidence_adjustment: number;
    alignment_score: number;
    conflicts: Array<{
        field: string;
        severity: string;
        sources: string[];
    }>;
    needs_review: boolean;
    fetched_at: string;
}

/**
 * Create comparison signals data for database storage
 */
export function createComparisonSignalsData(
    movieId: string,
    comparison: AggregatedComparison
): ComparisonSignalsData {
    // Aggregate all signals from all sources
    const aggregatedSignals: Record<string, unknown> = {};
    const sources: string[] = [];

    for (const source of comparison.sources) {
        if (source.success) {
            sources.push(source.sourceId);
            for (const [key, signal] of Object.entries(source.signals)) {
                const prefixedKey = `${source.sourceId}_${key}`;
                if (signal.type === 'numeric' || signal.type === 'bucket') {
                    aggregatedSignals[prefixedKey] = signal.type === 'bucket'
                        ? signal.numericEquivalent
                        : signal.value;
                } else if (signal.type === 'boolean') {
                    aggregatedSignals[prefixedKey] = signal.value;
                } else if (signal.type === 'categorical') {
                    aggregatedSignals[prefixedKey] = signal.value;
                }
            }
        }
    }

    return {
        movie_id: movieId,
        signals: aggregatedSignals,
        sources,
        confidence_adjustment: comparison.confidenceAdjustment,
        alignment_score: comparison.alignmentScore,
        conflicts: comparison.conflicts.map(c => ({
            field: c.field,
            severity: c.severity,
            sources: c.sources,
        })),
        needs_review: comparison.needsManualReview,
        fetched_at: comparison.computedAt,
    };
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default MultiSourceValidator;

