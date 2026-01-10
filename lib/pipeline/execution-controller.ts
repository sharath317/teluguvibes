/**
 * Execution Controller for Pipeline Operations
 * 
 * Provides concurrency control, rate limiting, and batch processing
 * for enrichment and validation scripts.
 */

import chalk from 'chalk';

// ============================================================
// TYPES
// ============================================================

export interface ExecutionOptions {
  concurrency: number;
  rateLimitMs: number;
  batchSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  onProgress?: (progress: ProgressInfo) => void;
  onError?: (error: Error, item: unknown) => void;
  abortSignal?: AbortSignal;
}

export interface ProgressInfo {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentItem?: string;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export interface BatchResult<T> {
  succeeded: T[];
  failed: Array<{ item: T; error: Error }>;
  totalProcessed: number;
  durationMs: number;
}

export interface RateLimiter {
  acquire(): Promise<void>;
  release(): void;
}

// ============================================================
// EXECUTION CONTROLLER CLASS
// ============================================================

export class ExecutionController {
  private options: ExecutionOptions;
  private activeCount: number = 0;
  private lastRequestTime: number = 0;
  private startTime: number = 0;
  private processed: number = 0;
  private succeeded: number = 0;
  private failed: number = 0;
  private total: number = 0;

  constructor(options: Partial<ExecutionOptions> = {}) {
    this.options = {
      concurrency: options.concurrency || 10,
      rateLimitMs: options.rateLimitMs || 200,
      batchSize: options.batchSize || 50,
      retryAttempts: options.retryAttempts || 3,
      retryDelayMs: options.retryDelayMs || 1000,
      onProgress: options.onProgress,
      onError: options.onError,
      abortSignal: options.abortSignal,
    };
  }

  /**
   * Process items with concurrency control and rate limiting
   */
  async processAll<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>
  ): Promise<BatchResult<T>> {
    this.startTime = Date.now();
    this.total = items.length;
    this.processed = 0;
    this.succeeded = 0;
    this.failed = 0;

    const succeededItems: T[] = [];
    const failedItems: Array<{ item: T; error: Error }> = [];

    // Process in batches
    for (let i = 0; i < items.length; i += this.options.batchSize) {
      if (this.options.abortSignal?.aborted) {
        break;
      }

      const batch = items.slice(i, i + this.options.batchSize);
      const batchResults = await this.processBatch(batch, processor, i);

      succeededItems.push(...batchResults.succeeded);
      failedItems.push(...batchResults.failed);
    }

    return {
      succeeded: succeededItems,
      failed: failedItems,
      totalProcessed: this.processed,
      durationMs: Date.now() - this.startTime,
    };
  }

  /**
   * Process a batch of items with concurrency control
   */
  private async processBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    startIndex: number
  ): Promise<{ succeeded: T[]; failed: Array<{ item: T; error: Error }> }> {
    const succeeded: T[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    const promises = items.map(async (item, i) => {
      const index = startIndex + i;
      
      // Wait for rate limit
      await this.waitForRateLimit();
      
      // Wait for concurrency slot
      await this.acquireConcurrencySlot();

      try {
        await this.processWithRetry(item, index, processor);
        succeeded.push(item);
        this.succeeded++;
      } catch (error) {
        failed.push({ item, error: error as Error });
        this.failed++;
        this.options.onError?.(error as Error, item);
      } finally {
        this.releaseConcurrencySlot();
        this.processed++;
        this.reportProgress(item);
      }
    });

    await Promise.all(promises);
    return { succeeded, failed };
  }

  /**
   * Process with retry logic
   */
  private async processWithRetry<T, R>(
    item: T,
    index: number,
    processor: (item: T, index: number) => Promise<R>
  ): Promise<R> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        return await processor(item, index);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.options.retryAttempts) {
          const delay = this.options.retryDelayMs * attempt;
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Wait for rate limit
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.options.rateLimitMs) {
      await this.sleep(this.options.rateLimitMs - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Acquire concurrency slot
   */
  private async acquireConcurrencySlot(): Promise<void> {
    while (this.activeCount >= this.options.concurrency) {
      await this.sleep(10);
    }
    this.activeCount++;
  }

  /**
   * Release concurrency slot
   */
  private releaseConcurrencySlot(): void {
    this.activeCount--;
  }

  /**
   * Report progress
   */
  private reportProgress<T>(item: T): void {
    const elapsedMs = Date.now() - this.startTime;
    const avgTimePerItem = elapsedMs / this.processed;
    const remaining = this.total - this.processed;
    const estimatedRemainingMs = avgTimePerItem * remaining;

    const itemStr = typeof item === 'object' && item !== null
      ? (item as Record<string, unknown>).title_en || (item as Record<string, unknown>).id || 'item'
      : String(item);

    this.options.onProgress?.({
      total: this.total,
      processed: this.processed,
      succeeded: this.succeeded,
      failed: this.failed,
      currentItem: String(itemStr),
      elapsedMs,
      estimatedRemainingMs,
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// RATE LIMITER
// ============================================================

export class TokenBucketRateLimiter implements RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRateMs: number;
  private lastRefill: number;

  constructor(maxTokens: number = 10, refillRateMs: number = 1000) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRateMs = refillRateMs;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    
    while (this.tokens < 1) {
      await new Promise(resolve => setTimeout(resolve, this.refillRateMs / this.maxTokens));
      this.refill();
    }
    
    this.tokens--;
  }

  release(): void {
    // No-op for token bucket
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.refillRateMs) * this.maxTokens;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// ============================================================
// PROGRESS REPORTER
// ============================================================

export class ProgressReporter {
  private startTime: number = 0;
  private lastReportTime: number = 0;
  private reportIntervalMs: number;

  constructor(reportIntervalMs: number = 1000) {
    this.reportIntervalMs = reportIntervalMs;
  }

  start(): void {
    this.startTime = Date.now();
    this.lastReportTime = this.startTime;
  }

  report(info: ProgressInfo, force: boolean = false): void {
    const now = Date.now();
    
    if (!force && now - this.lastReportTime < this.reportIntervalMs) {
      return;
    }

    this.lastReportTime = now;
    const pct = Math.round((info.processed / info.total) * 100);
    const etaMin = Math.round(info.estimatedRemainingMs / 1000 / 60);
    
    process.stdout.write(`\r  Progress: ${pct}% (${info.processed}/${info.total}) | ` +
      `✓ ${info.succeeded} ✗ ${info.failed} | ETA: ${etaMin}m`);
  }

  complete(result: BatchResult<unknown>): void {
    console.log('\n');
    console.log(chalk.green(`✅ Completed in ${(result.durationMs / 1000).toFixed(1)}s`));
    console.log(chalk.gray(`   Succeeded: ${result.succeeded.length}`));
    console.log(chalk.gray(`   Failed: ${result.failed.length}`));
  }
}

// ============================================================
// TASK INTERFACE FOR PARALLEL EXECUTION
// ============================================================

export interface Task<T = unknown> {
  id: string;
  data: T;
  execute: () => Promise<unknown>;
}

// ============================================================
// PARALLEL EXECUTION FUNCTION
// ============================================================

export interface ParallelOptions {
  concurrency?: number;
  rateLimitMs?: number;
  onProgress?: (completed: number, total: number, current?: string) => void;
  onError?: (error: Error, task: Task) => void;
}

/**
 * Run tasks in parallel with concurrency control
 */
export async function runParallel<T, R>(
  tasks: Task<T>[],
  options: ParallelOptions = {}
): Promise<Map<string, R | Error>> {
  const {
    concurrency = 10,
    rateLimitMs = 100,
    onProgress,
    onError,
  } = options;

  const results = new Map<string, R | Error>();
  let completed = 0;
  let activeCount = 0;
  let lastRequestTime = 0;

  const queue = [...tasks];

  async function processTask(task: Task<T>): Promise<void> {
    // Rate limiting
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < rateLimitMs) {
      await new Promise(resolve => setTimeout(resolve, rateLimitMs - elapsed));
    }
    lastRequestTime = Date.now();

    try {
      const result = await task.execute();
      results.set(task.id, result as R);
    } catch (error) {
      results.set(task.id, error as Error);
      onError?.(error as Error, task);
    } finally {
      completed++;
      activeCount--;
      onProgress?.(completed, tasks.length, task.id);
    }
  }

  // Process queue with concurrency limit
  const promises: Promise<void>[] = [];

  while (queue.length > 0 || activeCount > 0) {
    // Start new tasks up to concurrency limit
    while (queue.length > 0 && activeCount < concurrency) {
      const task = queue.shift()!;
      activeCount++;
      promises.push(processTask(task));
    }

    // Wait a bit before checking again
    if (queue.length > 0 || activeCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  await Promise.all(promises);
  return results;
}

// ============================================================
// FACTORY FUNCTIONS
// ============================================================

export function createExecutionController(options?: Partial<ExecutionOptions>): ExecutionController {
  return new ExecutionController(options);
}

export function createRateLimiter(tokensPerSecond: number = 5): RateLimiter {
  return new TokenBucketRateLimiter(tokensPerSecond, 1000);
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default ExecutionController;

