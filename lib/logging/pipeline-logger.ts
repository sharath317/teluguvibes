/**
 * Structured Pipeline Logger
 * 
 * Provides consistent, JSON-friendly logging across all pipeline commands.
 * 
 * Features:
 * - Structured JSON output for parsing
 * - Human-readable summaries
 * - Timestamps on all entries
 * - Phase tracking
 * - Performance metrics
 * - Error categorization
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type PipelinePhase = 
  | 'discovery'
  | 'fast'
  | 'enrichment'
  | 'media'
  | 'tagging'
  | 'reviews'
  | 'finalize'
  | 'orphan_resolution'
  | 'deduplication'
  | 'validation'
  | 'normalization'
  | 'scoring';

export type EntityType = 
  | 'movie'
  | 'review'
  | 'actor'
  | 'director'
  | 'collection'
  | 'promotion'
  | 'media_asset'
  | 'spotlight';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  command: string;
  phase: PipelinePhase;
  message: string;
  entityType?: EntityType;
  inputCount?: number;
  outputCount?: number;
  durationMs?: number;
  error?: string;
  retryAttempt?: number;
  metadata?: Record<string, unknown>;
}

export interface PhaseMetrics {
  phase: PipelinePhase;
  startTime: number;
  endTime?: number;
  inputCount: number;
  outputCount: number;
  errorCount: number;
  retryCount: number;
}

export interface PipelineSession {
  sessionId: string;
  command: string;
  startedAt: string;
  phases: PhaseMetrics[];
  totalInputCount: number;
  totalOutputCount: number;
  totalErrors: number;
}

// ============================================================
// COLOR UTILITIES
// ============================================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// ============================================================
// PIPELINE LOGGER CLASS
// ============================================================

export class PipelineLogger {
  private command: string;
  private session: PipelineSession;
  private currentPhase: PhaseMetrics | null = null;
  private verbose: boolean;
  private jsonMode: boolean;
  private logs: LogEntry[] = [];

  constructor(options: {
    command: string;
    verbose?: boolean;
    jsonMode?: boolean;
  }) {
    this.command = options.command;
    this.verbose = options.verbose ?? false;
    this.jsonMode = options.jsonMode ?? false;
    
    this.session = {
      sessionId: this.generateSessionId(),
      command: options.command,
      startedAt: new Date().toISOString(),
      phases: [],
      totalInputCount: 0,
      totalOutputCount: 0,
      totalErrors: 0,
    };
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private createEntry(
    level: LogLevel,
    phase: PipelinePhase,
    message: string,
    extra?: Partial<LogEntry>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      command: this.command,
      phase,
      message,
      ...extra,
    };
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  private formatCount(input: number, output: number): string {
    const diff = output - input;
    const diffStr = diff >= 0 ? colorize(`+${diff}`, 'green') : colorize(`${diff}`, 'red');
    return `${input} → ${output} (${diffStr})`;
  }

  private logToConsole(entry: LogEntry): void {
    if (this.jsonMode) {
      console.log(JSON.stringify(entry));
      return;
    }

    const levelColors: Record<LogLevel, keyof typeof colors> = {
      debug: 'gray',
      info: 'cyan',
      warn: 'yellow',
      error: 'red',
    };

    const levelIcon: Record<LogLevel, string> = {
      debug: '○',
      info: '●',
      warn: '⚠',
      error: '✗',
    };

    const timeStr = colorize(entry.timestamp.split('T')[1].split('.')[0], 'gray');
    const levelStr = colorize(levelIcon[entry.level], levelColors[entry.level]);
    const phaseStr = colorize(`[${entry.phase}]`, 'blue');
    
    let line = `${timeStr} ${levelStr} ${phaseStr} ${entry.message}`;

    if (entry.inputCount !== undefined && entry.outputCount !== undefined) {
      line += ` ${this.formatCount(entry.inputCount, entry.outputCount)}`;
    }

    if (entry.durationMs !== undefined) {
      line += ` ${colorize(`(${this.formatDuration(entry.durationMs)})`, 'gray')}`;
    }

    if (entry.retryAttempt !== undefined && entry.retryAttempt > 0) {
      line += ` ${colorize(`[retry ${entry.retryAttempt}]`, 'yellow')}`;
    }

    console.log(line);

    if (entry.error && (this.verbose || entry.level === 'error')) {
      console.log(colorize(`  └─ ${entry.error}`, 'red'));
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  /**
   * Start a new phase
   */
  startPhase(phase: PipelinePhase, inputCount: number): void {
    // End previous phase if exists
    if (this.currentPhase) {
      this.endPhase(this.currentPhase.outputCount);
    }

    this.currentPhase = {
      phase,
      startTime: Date.now(),
      inputCount,
      outputCount: 0,
      errorCount: 0,
      retryCount: 0,
    };

    const entry = this.createEntry('info', phase, `Starting ${phase} phase`, {
      inputCount,
    });
    this.logs.push(entry);
    this.logToConsole(entry);
  }

  /**
   * End current phase
   */
  endPhase(outputCount: number, errors?: string[]): void {
    if (!this.currentPhase) return;

    this.currentPhase.endTime = Date.now();
    this.currentPhase.outputCount = outputCount;

    const duration = this.currentPhase.endTime - this.currentPhase.startTime;

    const entry = this.createEntry(
      errors && errors.length > 0 ? 'warn' : 'info',
      this.currentPhase.phase,
      `Completed ${this.currentPhase.phase} phase`,
      {
        inputCount: this.currentPhase.inputCount,
        outputCount,
        durationMs: duration,
        error: errors?.join('; '),
      }
    );
    
    this.logs.push(entry);
    this.logToConsole(entry);

    this.session.phases.push({ ...this.currentPhase });
    this.session.totalInputCount += this.currentPhase.inputCount;
    this.session.totalOutputCount += outputCount;
    this.session.totalErrors += this.currentPhase.errorCount;

    this.currentPhase = null;
  }

  /**
   * Log an entity operation
   */
  logEntity(
    entityType: EntityType,
    action: string,
    count: number,
    extra?: { error?: string; retryAttempt?: number }
  ): void {
    if (!this.currentPhase) return;

    const entry = this.createEntry(
      extra?.error ? 'error' : 'debug',
      this.currentPhase.phase,
      `${action} ${count} ${entityType}(s)`,
      {
        entityType,
        outputCount: count,
        ...extra,
      }
    );

    this.logs.push(entry);
    
    if (this.verbose || extra?.error) {
      this.logToConsole(entry);
    }

    if (extra?.error) {
      this.currentPhase.errorCount++;
    }
    if (extra?.retryAttempt) {
      this.currentPhase.retryCount++;
    }
  }

  /**
   * Log progress
   */
  progress(current: number, total: number, message?: string): void {
    if (!this.currentPhase) return;
    
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    
    if (!this.jsonMode) {
      process.stdout.write(`\r  ${bar} ${percent}% (${current}/${total}) ${message || ''}`);
      if (current === total) {
        console.log(); // New line at 100%
      }
    }
  }

  /**
   * Log info message
   */
  info(message: string, extra?: Partial<LogEntry>): void {
    const phase = this.currentPhase?.phase || 'discovery';
    const entry = this.createEntry('info', phase, message, extra);
    this.logs.push(entry);
    this.logToConsole(entry);
  }

  /**
   * Log warning
   */
  warn(message: string, extra?: Partial<LogEntry>): void {
    const phase = this.currentPhase?.phase || 'discovery';
    const entry = this.createEntry('warn', phase, message, extra);
    this.logs.push(entry);
    this.logToConsole(entry);
  }

  /**
   * Log error
   */
  error(message: string, error?: Error | string): void {
    const phase = this.currentPhase?.phase || 'discovery';
    const entry = this.createEntry('error', phase, message, {
      error: error instanceof Error ? error.message : error,
    });
    this.logs.push(entry);
    this.logToConsole(entry);
    
    if (this.currentPhase) {
      this.currentPhase.errorCount++;
    }
  }

  /**
   * Print session summary
   */
  printSummary(): void {
    const totalDuration = Date.now() - new Date(this.session.startedAt).getTime();

    console.log('\n' + colorize('═'.repeat(60), 'cyan'));
    console.log(colorize('  📊 PIPELINE SUMMARY', 'bold'));
    console.log(colorize('═'.repeat(60), 'cyan'));

    console.log(`\n  ${colorize('Session:', 'gray')} ${this.session.sessionId}`);
    console.log(`  ${colorize('Command:', 'gray')} ${this.command}`);
    console.log(`  ${colorize('Duration:', 'gray')} ${this.formatDuration(totalDuration)}`);

    console.log(`\n  ${colorize('Phases:', 'bold')}`);
    for (const phase of this.session.phases) {
      const duration = phase.endTime ? phase.endTime - phase.startTime : 0;
      const status = phase.errorCount > 0 
        ? colorize('⚠', 'yellow') 
        : colorize('✓', 'green');
      
      console.log(`    ${status} ${phase.phase}: ${this.formatCount(phase.inputCount, phase.outputCount)} ${colorize(`(${this.formatDuration(duration)})`, 'gray')}`);
    }

    console.log(`\n  ${colorize('Totals:', 'bold')}`);
    console.log(`    Entities In:  ${colorize(this.session.totalInputCount.toString(), 'cyan')}`);
    console.log(`    Entities Out: ${colorize(this.session.totalOutputCount.toString(), 'green')}`);
    console.log(`    Errors:       ${this.session.totalErrors > 0 ? colorize(this.session.totalErrors.toString(), 'red') : colorize('0', 'gray')}`);

    console.log('\n' + colorize('═'.repeat(60), 'cyan') + '\n');
  }

  /**
   * Get session data for persistence
   */
  getSession(): PipelineSession {
    return { ...this.session };
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Export as JSON
   */
  toJSON(): string {
    return JSON.stringify({
      session: this.session,
      logs: this.logs,
    }, null, 2);
  }
}

// ============================================================
// SINGLETON FACTORY
// ============================================================

let currentLogger: PipelineLogger | null = null;

export function createLogger(options: {
  command: string;
  verbose?: boolean;
  jsonMode?: boolean;
}): PipelineLogger {
  currentLogger = new PipelineLogger(options);
  return currentLogger;
}

export function getLogger(): PipelineLogger | null {
  return currentLogger;
}

export default PipelineLogger;

