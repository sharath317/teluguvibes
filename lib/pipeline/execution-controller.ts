/**
 * Execution Controller
 * 
 * Provides bounded parallel execution with retry logic, failure isolation,
 * and idempotency enforcement for pipeline operations.
 * 
 * Key features:
 * - Configurable concurrency limits
 * - Automatic retry with exponential backoff
 * - Failure isolation (one task failure doesn't stop batch)
 * - Progress tracking and reporting
 */

// ============================================================
// TYPES
// ============================================================

export interface Task<T> {
  id: string;
  name: string;
  execute: () => Promise<T>;
  retryable?: boolean;
}

export interface TaskResult<T> {
  id: string;
  name: string;
  success: boolean;
  result?: T;
  error?: string;
  attempts: number;
  duration: number;
}

export interface BatchResult<T> {
  total: number;
  successful: number;
  failed: number;
  results: TaskResult<T>[];
  duration: number;
  failedTasks: string[];
}

export interface ExecutionOptions {
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  onProgress?: (completed: number, total: number, current: string) => void;
  onTaskComplete?: <T>(result: TaskResult<T>) => void;
  abortOnFailure?: boolean;
}

export interface SerialOptions {
  continueOnError?: boolean;
  onProgress?: (completed: number, total: number, current: string) => void;
  onTaskComplete?: <T>(result: TaskResult<T>) => void;
}

const DEFAULT_OPTIONS: ExecutionOptions = {
  concurrency: 5,
  maxRetries: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  abortOnFailure: false,
};

// ============================================================
// UTILITIES
// ============================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeWithRetry<T>(
  task: Task<T>,
  options: ExecutionOptions
): Promise<TaskResult<T>> {
  const startTime = Date.now();
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      const result = await task.execute();
      return {
        id: task.id,
        name: task.name,
        success: true,
        result,
        attempts: attempt,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      lastError = error?.message || String(error);
      
      // Don't retry if task is marked as non-retryable
      if (task.retryable === false) {
        break;
      }
      
      // Don't retry on last attempt
      if (attempt < options.maxRetries) {
        const delay = options.retryDelayMs * Math.pow(options.retryBackoffMultiplier, attempt - 1);
        await sleep(delay);
      }
    }
  }
  
  return {
    id: task.id,
    name: task.name,
    success: false,
    error: lastError,
    attempts: options.maxRetries,
    duration: Date.now() - startTime,
  };
}

// ============================================================
// PARALLEL EXECUTION
// ============================================================

/**
 * Run tasks in parallel with bounded concurrency
 * 
 * Features:
 * - Respects concurrency limit
 * - Automatic retry with exponential backoff
 * - Failure isolation (failed tasks don't stop others)
 * - Progress reporting
 */
export async function runParallel<T>(
  tasks: Task<T>[],
  options: Partial<ExecutionOptions> = {}
): Promise<BatchResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  const results: TaskResult<T>[] = [];
  const failedTasks: string[] = [];
  
  let completed = 0;
  let aborted = false;
  
  // Process tasks in chunks based on concurrency
  const chunks: Task<T>[][] = [];
  for (let i = 0; i < tasks.length; i += opts.concurrency) {
    chunks.push(tasks.slice(i, i + opts.concurrency));
  }
  
  for (const chunk of chunks) {
    if (aborted) break;
    
    const chunkResults = await Promise.all(
      chunk.map(async (task) => {
        if (aborted) {
          return {
            id: task.id,
            name: task.name,
            success: false,
            error: 'Aborted',
            attempts: 0,
            duration: 0,
          } as TaskResult<T>;
        }
        
        const result = await executeWithRetry(task, opts);
        
        completed++;
        opts.onProgress?.(completed, tasks.length, task.name);
        opts.onTaskComplete?.(result);
        
        if (!result.success) {
          failedTasks.push(task.id);
          if (opts.abortOnFailure) {
            aborted = true;
          }
        }
        
        return result;
      })
    );
    
    results.push(...chunkResults);
  }
  
  const successful = results.filter(r => r.success).length;
  
  return {
    total: tasks.length,
    successful,
    failed: results.length - successful,
    results,
    duration: Date.now() - startTime,
    failedTasks,
  };
}

// ============================================================
// SERIAL EXECUTION
// ============================================================

/**
 * Run tasks sequentially (for operations requiring serialization)
 * 
 * Use for:
 * - Identity resolution
 * - Deduplication
 * - Entity linking
 * - Cross-record operations
 */
export async function runSerial<T>(
  tasks: Task<T>[],
  options: SerialOptions = {}
): Promise<BatchResult<T>> {
  const startTime = Date.now();
  const results: TaskResult<T>[] = [];
  const failedTasks: string[] = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskStart = Date.now();
    
    try {
      const result = await task.execute();
      const taskResult: TaskResult<T> = {
        id: task.id,
        name: task.name,
        success: true,
        result,
        attempts: 1,
        duration: Date.now() - taskStart,
      };
      
      results.push(taskResult);
      options.onProgress?.(i + 1, tasks.length, task.name);
      options.onTaskComplete?.(taskResult);
      
    } catch (error: any) {
      const taskResult: TaskResult<T> = {
        id: task.id,
        name: task.name,
        success: false,
        error: error?.message || String(error),
        attempts: 1,
        duration: Date.now() - taskStart,
      };
      
      results.push(taskResult);
      failedTasks.push(task.id);
      options.onProgress?.(i + 1, tasks.length, task.name);
      options.onTaskComplete?.(taskResult);
      
      if (!options.continueOnError) {
        break;
      }
    }
  }
  
  const successful = results.filter(r => r.success).length;
  
  return {
    total: tasks.length,
    successful,
    failed: results.length - successful,
    results,
    duration: Date.now() - startTime,
    failedTasks,
  };
}

// ============================================================
// BATCH HELPERS
// ============================================================

/**
 * Create tasks from an array of items
 */
export function createTasks<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  nameExtractor: (item: T) => string,
  idExtractor: (item: T) => string
): Task<R>[] {
  return items.map(item => ({
    id: idExtractor(item),
    name: nameExtractor(item),
    execute: () => processor(item),
    retryable: true,
  }));
}

/**
 * Split items into batches
 */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Run processor on items in parallel batches
 */
export async function runBatchParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    concurrency?: number;
    nameExtractor?: (item: T) => string;
    idExtractor?: (item: T) => string;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<BatchResult<R>> {
  const {
    batchSize = 20,
    concurrency = 5,
    nameExtractor = (item: any) => item?.id || item?.name || 'item',
    idExtractor = (item: any) => item?.id || String(Math.random()),
  } = options;
  
  const batches = createBatches(items, batchSize);
  const allResults: TaskResult<R>[] = [];
  const allFailedTasks: string[] = [];
  const startTime = Date.now();
  let totalCompleted = 0;
  
  for (const batch of batches) {
    const tasks = createTasks(batch, processor, nameExtractor, idExtractor);
    
    const batchResult = await runParallel(tasks, {
      concurrency,
      onProgress: () => {
        totalCompleted++;
        options.onProgress?.(totalCompleted, items.length);
      },
    });
    
    allResults.push(...batchResult.results);
    allFailedTasks.push(...batchResult.failedTasks);
  }
  
  const successful = allResults.filter(r => r.success).length;
  
  return {
    total: items.length,
    successful,
    failed: allResults.length - successful,
    results: allResults,
    duration: Date.now() - startTime,
    failedTasks: allFailedTasks,
  };
}

// ============================================================
// EXECUTION CONTROLLER CLASS
// ============================================================

/**
 * ExecutionController provides a unified interface for managing
 * parallel and serial execution of pipeline tasks
 */
export class ExecutionController {
  private options: ExecutionOptions;
  
  constructor(options: Partial<ExecutionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Run tasks in parallel with bounded concurrency
   */
  async parallel<T>(
    tasks: Task<T>[],
    options?: Partial<ExecutionOptions>
  ): Promise<BatchResult<T>> {
    return runParallel(tasks, { ...this.options, ...options });
  }
  
  /**
   * Run tasks sequentially
   */
  async serial<T>(
    tasks: Task<T>[],
    options?: SerialOptions
  ): Promise<BatchResult<T>> {
    return runSerial(tasks, options);
  }
  
  /**
   * Run a batch processor on items
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: Parameters<typeof runBatchParallel>[2]
  ): Promise<BatchResult<R>> {
    return runBatchParallel(items, processor, {
      concurrency: this.options.concurrency,
      ...options,
    });
  }
  
  /**
   * Get current concurrency setting
   */
  getConcurrency(): number {
    return this.options.concurrency;
  }
  
  /**
   * Update concurrency limit
   */
  setConcurrency(concurrency: number): void {
    this.options.concurrency = concurrency;
  }
}

// ============================================================
// EXPORT DEFAULT INSTANCE
// ============================================================

export const defaultController = new ExecutionController();

