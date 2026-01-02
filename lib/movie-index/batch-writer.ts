/**
 * Batch Writer
 * 
 * Provides efficient batch upsert operations for database writes.
 * Optimized for high-volume ingestion with:
 * - Configurable batch sizes (100-500 records)
 * - UPSERT over SELECT + INSERT pattern
 * - Error isolation per batch
 * - Progress reporting
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface BatchResult {
  total: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: BatchError[];
  duration: number;
}

export interface BatchError {
  batchIndex: number;
  recordIds: string[];
  error: string;
}

export interface BatchWriteOptions {
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
  onBatchComplete?: (batchIndex: number, result: BatchResult) => void;
  continueOnError?: boolean;
}

export interface UpsertOptions extends BatchWriteOptions {
  conflictColumns: string[];
  updateColumns?: string[];
  ignoreDuplicates?: boolean;
}

const DEFAULT_BATCH_SIZE = 100;

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(url, key);
}

// ============================================================
// BATCH OPERATIONS
// ============================================================

/**
 * Split records into batches
 */
export function createBatches<T>(records: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Batch insert records into a table
 */
export async function batchInsert(
  table: string,
  records: Record<string, any>[],
  options: BatchWriteOptions = {}
): Promise<BatchResult> {
  const supabase = getSupabaseClient();
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const batches = createBatches(records, batchSize);
  const startTime = Date.now();
  
  let inserted = 0;
  let failed = 0;
  const errors: BatchError[] = [];
  let completed = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(batch)
        .select('id');
      
      if (error) {
        throw error;
      }
      
      inserted += data?.length || batch.length;
      completed += batch.length;
      options.onProgress?.(completed, records.length);
      
    } catch (error: any) {
      failed += batch.length;
      completed += batch.length;
      
      errors.push({
        batchIndex: i,
        recordIds: batch.map((r: any) => r.id || r.tmdb_id || 'unknown'),
        error: error?.message || String(error),
      });
      
      options.onProgress?.(completed, records.length);
      
      if (!options.continueOnError) {
        break;
      }
    }
  }
  
  return {
    total: records.length,
    inserted,
    updated: 0,
    failed,
    errors,
    duration: Date.now() - startTime,
  };
}

/**
 * Batch upsert records into a table
 * Uses PostgreSQL's ON CONFLICT clause for efficient upserts
 */
export async function batchUpsert(
  table: string,
  records: Record<string, any>[],
  options: UpsertOptions
): Promise<BatchResult> {
  const supabase = getSupabaseClient();
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const batches = createBatches(records, batchSize);
  const startTime = Date.now();
  
  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors: BatchError[] = [];
  let completed = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      // Supabase upsert with conflict resolution
      const { data, error } = await supabase
        .from(table)
        .upsert(batch, {
          onConflict: options.conflictColumns.join(','),
          ignoreDuplicates: options.ignoreDuplicates || false,
        })
        .select('id');
      
      if (error) {
        throw error;
      }
      
      // Note: Supabase doesn't distinguish between insert/update in upsert
      // We count all successful operations as "upserted"
      const count = data?.length || batch.length;
      inserted += count; // Could be inserts or updates
      
      completed += batch.length;
      options.onProgress?.(completed, records.length);
      
      options.onBatchComplete?.(i, {
        total: batch.length,
        inserted: count,
        updated: 0,
        failed: 0,
        errors: [],
        duration: 0,
      });
      
    } catch (error: any) {
      failed += batch.length;
      completed += batch.length;
      
      errors.push({
        batchIndex: i,
        recordIds: batch.map((r: any) => r.id || r.tmdb_id || 'unknown'),
        error: error?.message || String(error),
      });
      
      options.onProgress?.(completed, records.length);
      
      if (!options.continueOnError) {
        break;
      }
    }
  }
  
  return {
    total: records.length,
    inserted,
    updated,
    failed,
    errors,
    duration: Date.now() - startTime,
  };
}

/**
 * Batch update records in a table
 */
export async function batchUpdate(
  table: string,
  records: Array<{ id: string; updates: Record<string, any> }>,
  options: BatchWriteOptions = {}
): Promise<BatchResult> {
  const supabase = getSupabaseClient();
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const startTime = Date.now();
  
  let updated = 0;
  let failed = 0;
  const errors: BatchError[] = [];
  let completed = 0;
  
  // Process updates individually but in parallel batches
  const batches = createBatches(records, batchSize);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    // Execute batch updates in parallel
    const results = await Promise.allSettled(
      batch.map(async (record) => {
        const { error } = await supabase
          .from(table)
          .update(record.updates)
          .eq('id', record.id);
        
        if (error) throw error;
        return record.id;
      })
    );
    
    for (const result of results) {
      completed++;
      if (result.status === 'fulfilled') {
        updated++;
      } else {
        failed++;
        errors.push({
          batchIndex: i,
          recordIds: ['unknown'],
          error: result.reason?.message || String(result.reason),
        });
      }
    }
    
    options.onProgress?.(completed, records.length);
    
    if (failed > 0 && !options.continueOnError) {
      break;
    }
  }
  
  return {
    total: records.length,
    inserted: 0,
    updated,
    failed,
    errors,
    duration: Date.now() - startTime,
  };
}

// ============================================================
// SPECIALIZED BATCH OPERATIONS
// ============================================================

/**
 * Batch upsert movies table
 */
export async function batchUpsertMovies(
  movies: Record<string, any>[],
  options: Omit<UpsertOptions, 'conflictColumns'> = {}
): Promise<BatchResult> {
  return batchUpsert('movies', movies, {
    ...options,
    conflictColumns: ['tmdb_id'],
    batchSize: options.batchSize || 100,
  });
}

/**
 * Batch upsert movie reviews table
 */
export async function batchUpsertReviews(
  reviews: Record<string, any>[],
  options: Omit<UpsertOptions, 'conflictColumns'> = {}
): Promise<BatchResult> {
  return batchUpsert('movie_reviews', reviews, {
    ...options,
    conflictColumns: ['movie_id'],
    batchSize: options.batchSize || 100,
  });
}

/**
 * Batch upsert telugu_movie_index table
 */
export async function batchUpsertIndex(
  movies: Record<string, any>[],
  options: Omit<UpsertOptions, 'conflictColumns'> = {}
): Promise<BatchResult> {
  return batchUpsert('telugu_movie_index', movies, {
    ...options,
    conflictColumns: ['tmdb_id'],
    batchSize: options.batchSize || 100,
  });
}

/**
 * Batch update movie status fields
 */
export async function batchUpdateMovieStatus(
  updates: Array<{
    id: string;
    ingestion_status?: string;
    completeness_score?: number;
    last_stage_completed?: string;
  }>,
  options: BatchWriteOptions = {}
): Promise<BatchResult> {
  const records = updates.map(u => ({
    id: u.id,
    updates: {
      ...(u.ingestion_status && { ingestion_status: u.ingestion_status }),
      ...(u.completeness_score !== undefined && { completeness_score: u.completeness_score }),
      ...(u.last_stage_completed && { last_stage_completed: u.last_stage_completed }),
      stage_completed_at: new Date().toISOString(),
    },
  }));
  
  return batchUpdate('movies', records, options);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get optimal batch size based on record size
 */
export function getOptimalBatchSize(
  records: Record<string, any>[],
  options: { maxBatchSize?: number; targetPayloadKb?: number } = {}
): number {
  const maxBatchSize = options.maxBatchSize || 500;
  const targetPayloadKb = options.targetPayloadKb || 256;
  
  if (records.length === 0) return DEFAULT_BATCH_SIZE;
  
  // Estimate average record size
  const sampleSize = Math.min(10, records.length);
  const sample = records.slice(0, sampleSize);
  const avgSize = sample.reduce((sum, r) => sum + JSON.stringify(r).length, 0) / sampleSize;
  
  // Calculate batch size to stay under target payload
  const targetBytes = targetPayloadKb * 1024;
  const calculatedSize = Math.floor(targetBytes / avgSize);
  
  // Clamp between reasonable bounds
  return Math.max(10, Math.min(maxBatchSize, calculatedSize));
}

/**
 * Create a batch writer with default configuration
 */
export function createBatchWriter(defaultOptions: BatchWriteOptions = {}) {
  return {
    insert: (table: string, records: Record<string, any>[]) => 
      batchInsert(table, records, defaultOptions),
    
    upsert: (table: string, records: Record<string, any>[], conflictColumns: string[]) =>
      batchUpsert(table, records, { ...defaultOptions, conflictColumns }),
    
    update: (table: string, records: Array<{ id: string; updates: Record<string, any> }>) =>
      batchUpdate(table, records, defaultOptions),
    
    upsertMovies: (movies: Record<string, any>[]) =>
      batchUpsertMovies(movies, defaultOptions),
    
    upsertReviews: (reviews: Record<string, any>[]) =>
      batchUpsertReviews(reviews, defaultOptions),
    
    upsertIndex: (movies: Record<string, any>[]) =>
      batchUpsertIndex(movies, defaultOptions),
  };
}

