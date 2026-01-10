/**
 * Enrichment Logger
 * 
 * Provides session-based logging for enrichment operations with:
 * - Before/after field-level change tracking
 * - Anomaly flagging
 * - Coverage statistics
 * - Session management
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  FieldChange,
  EnrichmentRecord,
  EnrichmentSession,
  EnrichmentOptions,
  CoverageStats,
  CoverageComparison,
  EnrichmentSummary,
  AnomalyFlag,
  AnomalySeverity,
} from './types';

// ============================================================
// SINGLETON LOGGER
// ============================================================

let instance: EnrichmentLogger | null = null;

/**
 * Enrichment Logger - Singleton pattern for global access
 */
export class EnrichmentLogger {
  private session: EnrichmentSession | null = null;
  private records: EnrichmentRecord[] = [];
  private beforeStats: CoverageStats | null = null;
  private startTime: number = 0;

  /**
   * Get singleton instance
   */
  static getInstance(): EnrichmentLogger {
    if (!instance) {
      instance = new EnrichmentLogger();
    }
    return instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    instance = null;
  }

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================

  /**
   * Start a new enrichment session
   */
  startSession(phases: string[], options: Partial<EnrichmentOptions> = {}): EnrichmentSession {
    this.startTime = Date.now();
    
    this.session = {
      sessionId: `enrich-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      startedAt: new Date().toISOString(),
      phases,
      totalMovies: 0,
      records: [],
      options: {
        dryRun: options.dryRun ?? false,
        limit: options.limit ?? 500,
        phases,
        filters: options.filters,
      },
    };

    this.records = [];
    this.beforeStats = null;

    return this.session;
  }

  /**
   * Set before state for coverage comparison
   */
  setBeforeStats(stats: CoverageStats): void {
    this.beforeStats = stats;
  }

  /**
   * Get current session
   */
  getSession(): EnrichmentSession | null {
    return this.session;
  }

  /**
   * End session and generate summary
   */
  endSession(afterStats?: CoverageStats): EnrichmentSummary {
    if (!this.session) {
      throw new Error('No active session to end');
    }

    const endTime = Date.now();
    this.session.endedAt = new Date().toISOString();
    this.session.records = this.records;
    this.session.totalMovies = this.records.length;

    // Generate summary
    const summary = this.generateSummary(afterStats);

    // Save session log
    this.saveSessionLog();

    return summary;
  }

  // ============================================================
  // RECORD LOGGING
  // ============================================================

  /**
   * Log enrichment for a single movie
   */
  logEnrichment(record: Omit<EnrichmentRecord, 'timestamp'>): EnrichmentRecord {
    const fullRecord: EnrichmentRecord = {
      ...record,
      timestamp: new Date().toISOString(),
    };

    this.records.push(fullRecord);
    return fullRecord;
  }

  /**
   * Create a field change record
   */
  createFieldChange(
    field: string,
    oldValue: unknown,
    newValue: unknown,
    source: string,
    confidence: number,
    anomalies?: AnomalyFlag[]
  ): FieldChange {
    return {
      field,
      oldValue,
      newValue,
      source,
      confidence,
      anomalyFlags: anomalies,
    };
  }

  /**
   * Build changes array from before/after objects
   */
  buildChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    source: string,
    confidence: number
  ): FieldChange[] {
    const changes: FieldChange[] = [];

    for (const [field, newValue] of Object.entries(after)) {
      const oldValue = before[field];
      
      // Skip if values are equal
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        continue;
      }

      // Skip if new value is null/undefined and old value exists
      if ((newValue === null || newValue === undefined) && oldValue !== null && oldValue !== undefined) {
        continue;
      }

      changes.push(this.createFieldChange(field, oldValue, newValue, source, confidence));
    }

    return changes;
  }

  // ============================================================
  // SUMMARY GENERATION
  // ============================================================

  /**
   * Generate enrichment summary
   */
  private generateSummary(afterStats?: CoverageStats): EnrichmentSummary {
    if (!this.session) {
      throw new Error('No session to summarize');
    }

    const endTime = Date.now();
    
    // Calculate coverage comparison
    const coverage = this.calculateCoverageComparison(afterStats);

    // Calculate change statistics
    const changeStats = this.calculateChangeStats();

    // Calculate anomaly statistics
    const anomalyStats = this.calculateAnomalyStats();

    // Calculate skip statistics
    const skipStats = this.calculateSkipStats();

    // Calculate movie statistics
    const movieStats = this.calculateMovieStats();

    return {
      session: {
        sessionId: this.session.sessionId,
        startedAt: this.session.startedAt,
        endedAt: this.session.endedAt || new Date().toISOString(),
        duration_ms: endTime - this.startTime,
        phases: this.session.phases,
      },
      coverage,
      changes: changeStats,
      anomalies: anomalyStats,
      skipped: skipStats,
      movies: movieStats,
    };
  }

  /**
   * Calculate coverage comparison
   */
  private calculateCoverageComparison(afterStats?: CoverageStats): CoverageComparison {
    const emptyStats: CoverageStats = {
      fields: [],
      overallPercentage: 0,
      timestamp: new Date().toISOString(),
    };

    const before = this.beforeStats || emptyStats;
    const after = afterStats || emptyStats;

    const improvement: CoverageComparison['improvement'] = [];

    // Calculate improvement for each field
    const allFields = new Set([
      ...before.fields.map(f => f.field),
      ...after.fields.map(f => f.field),
    ]);

    for (const field of allFields) {
      const beforeField = before.fields.find(f => f.field === field);
      const afterField = after.fields.find(f => f.field === field);

      const beforePct = beforeField?.percentage ?? 0;
      const afterPct = afterField?.percentage ?? 0;
      const beforeCount = beforeField?.count ?? 0;
      const afterCount = afterField?.count ?? 0;

      improvement.push({
        field,
        beforePct,
        afterPct,
        changePct: afterPct - beforePct,
        changeCount: afterCount - beforeCount,
      });
    }

    return { before, after, improvement };
  }

  /**
   * Calculate change statistics
   */
  private calculateChangeStats() {
    const byField: Record<string, { enriched: number; skipped: number; failed: number }> = {};
    const bySource: Record<string, number> = {};
    let total = 0;

    for (const record of this.records) {
      // Count changes
      for (const change of record.changes) {
        total++;
        
        // By field
        if (!byField[change.field]) {
          byField[change.field] = { enriched: 0, skipped: 0, failed: 0 };
        }
        byField[change.field].enriched++;

        // By source
        bySource[change.source] = (bySource[change.source] || 0) + 1;
      }

      // Count skipped
      for (const field of record.skipped) {
        if (!byField[field]) {
          byField[field] = { enriched: 0, skipped: 0, failed: 0 };
        }
        byField[field].skipped++;
      }

      // Count failed
      for (const field of record.failed) {
        if (!byField[field]) {
          byField[field] = { enriched: 0, skipped: 0, failed: 0 };
        }
        byField[field].failed++;
      }
    }

    return { total, byField, bySource };
  }

  /**
   * Calculate anomaly statistics
   */
  private calculateAnomalyStats() {
    const bySeverity: Record<AnomalySeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    const byType: Record<string, number> = {};
    const needsManualReview: EnrichmentSummary['anomalies']['needsManualReview'] = [];

    for (const record of this.records) {
      if (!record.needsReview) continue;

      const anomalies: AnomalyFlag[] = [];
      
      // Collect anomalies from changes
      for (const change of record.changes) {
        if (change.anomalyFlags) {
          for (const flag of change.anomalyFlags) {
            anomalies.push(flag);
            bySeverity[flag.severity]++;
            byType[flag.type] = (byType[flag.type] || 0) + 1;
          }
        }
      }

      if (anomalies.length > 0) {
        // Calculate priority based on severity
        const priorityMap: Record<AnomalySeverity, number> = {
          CRITICAL: 100,
          HIGH: 75,
          MEDIUM: 50,
          LOW: 25,
        };
        const priority = Math.max(...anomalies.map(a => priorityMap[a.severity]));

        needsManualReview.push({
          movieId: record.movieId,
          title: record.title,
          year: record.year,
          anomalies,
          priority,
        });
      }
    }

    // Sort by priority
    needsManualReview.sort((a, b) => b.priority - a.priority);

    return {
      total: Object.values(bySeverity).reduce((a, b) => a + b, 0),
      bySeverity,
      byType: byType as Record<string, number>,
      needsManualReview,
    };
  }

  /**
   * Calculate skip statistics
   */
  private calculateSkipStats() {
    let total = 0;
    let alreadyHadValue = 0;
    let noSourceFound = 0;
    let belowThreshold = 0;

    for (const record of this.records) {
      total += record.skipped.length;
      // Note: We'd need more granular tracking to differentiate skip reasons
      // For now, assume all skips are "already had value"
      alreadyHadValue += record.skipped.length;
    }

    return { total, alreadyHadValue, noSourceFound, belowThreshold };
  }

  /**
   * Calculate movie statistics
   */
  private calculateMovieStats() {
    let processed = this.records.length;
    let enriched = 0;
    let unchanged = 0;
    let failed = 0;
    let needsReview = 0;

    for (const record of this.records) {
      if (record.changes.length > 0) {
        enriched++;
      } else if (record.failed.length > 0) {
        failed++;
      } else {
        unchanged++;
      }

      if (record.needsReview) {
        needsReview++;
      }
    }

    return { processed, enriched, unchanged, failed, needsReview };
  }

  // ============================================================
  // PERSISTENCE
  // ============================================================

  /**
   * Save session log to disk
   */
  private saveSessionLog(): void {
    if (!this.session) return;

    const logsDir = path.join(process.cwd(), 'docs', 'enrichment-logs');
    
    // Ensure directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const filename = `session-${this.session.sessionId}.json`;
    const filepath = path.join(logsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.session, null, 2));
  }

  /**
   * Load a previous session log
   */
  static loadSession(sessionId: string): EnrichmentSession | null {
    const filepath = path.join(
      process.cwd(),
      'docs',
      'enrichment-logs',
      `session-${sessionId}.json`
    );

    if (!fs.existsSync(filepath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  }
}

// Export singleton getter
export const getEnrichmentLogger = EnrichmentLogger.getInstance;

