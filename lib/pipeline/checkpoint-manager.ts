/**
 * Checkpoint Manager
 * 
 * Provides stage tracking and resumability for pipeline operations.
 * Tracks completion state per movie and per stage to enable:
 * - Resume from last successful stage
 * - Skip already-processed entities
 * - Recovery from partial failures
 * 
 * Uses in-memory + optional persistent storage (Supabase)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export type IngestionStage = 
  | 'discovery'
  | 'validation'
  | 'enrichment'
  | 'media'
  | 'tagging'
  | 'review'
  | 'orphan_resolution'
  | 'normalize'
  | 'dedupe'
  | 'finalize';

export type IngestionStatus = 'raw' | 'partial' | 'enriched' | 'verified' | 'published';

export interface StageCheckpoint {
  movieId: string;
  stage: IngestionStage;
  completedAt: Date;
  success: boolean;
  error?: string;
}

export interface MovieCheckpoint {
  movieId: string;
  status: IngestionStatus;
  completedStages: IngestionStage[];
  lastStage: IngestionStage | null;
  lastStageAt: Date | null;
  completenessScore: number;
  errors: string[];
}

export interface CheckpointSummary {
  total: number;
  byStatus: Record<IngestionStatus, number>;
  byLastStage: Record<IngestionStage, number>;
  incomplete: number;
  averageCompleteness: number;
}

// ============================================================
// STAGE ORDER & SCORING
// ============================================================

const STAGE_ORDER: IngestionStage[] = [
  'discovery',
  'validation',
  'enrichment',
  'media',
  'tagging',
  'review',
  'orphan_resolution',
  'normalize',
  'dedupe',
  'finalize',
];

const STAGE_COMPLETENESS_SCORE: Record<IngestionStage, number> = {
  discovery: 0.1,
  validation: 0.2,
  enrichment: 0.4,
  media: 0.5,
  tagging: 0.55,
  review: 0.65,
  orphan_resolution: 0.7,
  normalize: 0.75,
  dedupe: 0.85,
  finalize: 1.0,
};

/**
 * Get the status based on completed stages
 */
function deriveStatus(completedStages: IngestionStage[]): IngestionStatus {
  if (completedStages.includes('finalize')) return 'verified';
  if (completedStages.includes('review')) return 'enriched';
  if (completedStages.includes('enrichment')) return 'partial';
  if (completedStages.includes('discovery')) return 'raw';
  return 'raw';
}

/**
 * Calculate completeness score from stages
 */
function calculateCompleteness(completedStages: IngestionStage[]): number {
  if (completedStages.length === 0) return 0;
  
  const maxScore = Math.max(
    ...completedStages.map(s => STAGE_COMPLETENESS_SCORE[s] || 0)
  );
  
  return Math.round(maxScore * 100) / 100;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    return null;
  }
  
  return createClient(url, key);
}

// ============================================================
// CHECKPOINT MANAGER CLASS
// ============================================================

export class CheckpointManager {
  private checkpoints: Map<string, MovieCheckpoint> = new Map();
  private supabase: SupabaseClient | null = null;
  private persistToDb: boolean;
  
  constructor(options: { persistToDb?: boolean } = {}) {
    this.persistToDb = options.persistToDb ?? true;
    if (this.persistToDb) {
      this.supabase = getSupabaseClient();
    }
  }
  
  // ============================================================
  // STAGE TRACKING
  // ============================================================
  
  /**
   * Mark a stage as complete for a movie
   */
  async markStageComplete(
    movieId: string,
    stage: IngestionStage,
    options: { error?: string } = {}
  ): Promise<void> {
    const checkpoint = this.getOrCreateCheckpoint(movieId);
    
    if (!checkpoint.completedStages.includes(stage)) {
      checkpoint.completedStages.push(stage);
    }
    
    checkpoint.lastStage = stage;
    checkpoint.lastStageAt = new Date();
    checkpoint.completenessScore = calculateCompleteness(checkpoint.completedStages);
    checkpoint.status = deriveStatus(checkpoint.completedStages);
    
    if (options.error) {
      checkpoint.errors.push(`${stage}: ${options.error}`);
    }
    
    this.checkpoints.set(movieId, checkpoint);
    
    // Persist to database if enabled
    if (this.persistToDb && this.supabase) {
      await this.persistCheckpoint(movieId, checkpoint);
    }
  }
  
  /**
   * Mark multiple movies as having completed a stage
   */
  async markBatchStageComplete(
    movieIds: string[],
    stage: IngestionStage
  ): Promise<void> {
    for (const movieId of movieIds) {
      await this.markStageComplete(movieId, stage);
    }
  }
  
  /**
   * Check if a movie has completed a specific stage
   */
  hasCompletedStage(movieId: string, stage: IngestionStage): boolean {
    const checkpoint = this.checkpoints.get(movieId);
    return checkpoint?.completedStages.includes(stage) ?? false;
  }
  
  /**
   * Get the last completed stage for a movie
   */
  getLastCompletedStage(movieId: string): IngestionStage | null {
    const checkpoint = this.checkpoints.get(movieId);
    return checkpoint?.lastStage ?? null;
  }
  
  /**
   * Get all completed stages for a movie
   */
  getCompletedStages(movieId: string): IngestionStage[] {
    const checkpoint = this.checkpoints.get(movieId);
    return checkpoint?.completedStages ?? [];
  }
  
  // ============================================================
  // QUERYING
  // ============================================================
  
  /**
   * Get movies that haven't completed a specific stage
   */
  getIncompleteMovies(stage: IngestionStage, movieIds?: string[]): string[] {
    const candidates = movieIds || Array.from(this.checkpoints.keys());
    
    return candidates.filter(id => !this.hasCompletedStage(id, stage));
  }
  
  /**
   * Get movies at a specific status
   */
  getMoviesByStatus(status: IngestionStatus): string[] {
    const result: string[] = [];
    
    for (const [movieId, checkpoint] of this.checkpoints) {
      if (checkpoint.status === status) {
        result.push(movieId);
      }
    }
    
    return result;
  }
  
  /**
   * Get movies that need to resume from a specific stage
   */
  getMoviesToResumeFrom(stage: IngestionStage): string[] {
    const stageIndex = STAGE_ORDER.indexOf(stage);
    if (stageIndex === -1) return [];
    
    const previousStage = stageIndex > 0 ? STAGE_ORDER[stageIndex - 1] : null;
    const result: string[] = [];
    
    for (const [movieId, checkpoint] of this.checkpoints) {
      // Has completed previous stage but not current stage
      const hasCompletedPrevious = previousStage === null || 
        checkpoint.completedStages.includes(previousStage);
      const hasNotCompletedCurrent = !checkpoint.completedStages.includes(stage);
      
      if (hasCompletedPrevious && hasNotCompletedCurrent) {
        result.push(movieId);
      }
    }
    
    return result;
  }
  
  /**
   * Get checkpoint for a movie
   */
  getCheckpoint(movieId: string): MovieCheckpoint | null {
    return this.checkpoints.get(movieId) ?? null;
  }
  
  /**
   * Get completeness score for a movie
   */
  getCompletenessScore(movieId: string): number {
    return this.checkpoints.get(movieId)?.completenessScore ?? 0;
  }
  
  // ============================================================
  // SUMMARY & REPORTING
  // ============================================================
  
  /**
   * Get summary of all checkpoints
   */
  getSummary(): CheckpointSummary {
    const byStatus: Record<IngestionStatus, number> = {
      raw: 0,
      partial: 0,
      enriched: 0,
      verified: 0,
      published: 0,
    };
    
    const byLastStage: Record<IngestionStage, number> = {
      discovery: 0,
      validation: 0,
      enrichment: 0,
      media: 0,
      tagging: 0,
      review: 0,
      orphan_resolution: 0,
      normalize: 0,
      dedupe: 0,
      finalize: 0,
    };
    
    let totalCompleteness = 0;
    let incomplete = 0;
    
    for (const checkpoint of this.checkpoints.values()) {
      byStatus[checkpoint.status]++;
      if (checkpoint.lastStage) {
        byLastStage[checkpoint.lastStage]++;
      }
      totalCompleteness += checkpoint.completenessScore;
      if (checkpoint.status !== 'verified' && checkpoint.status !== 'published') {
        incomplete++;
      }
    }
    
    return {
      total: this.checkpoints.size,
      byStatus,
      byLastStage,
      incomplete,
      averageCompleteness: this.checkpoints.size > 0 
        ? Math.round((totalCompleteness / this.checkpoints.size) * 100) / 100
        : 0,
    };
  }
  
  // ============================================================
  // MANAGEMENT
  // ============================================================
  
  /**
   * Clear checkpoints for specific movies
   */
  clearCheckpoints(movieIds: string[]): void {
    for (const id of movieIds) {
      this.checkpoints.delete(id);
    }
  }
  
  /**
   * Clear all checkpoints
   */
  clearAll(): void {
    this.checkpoints.clear();
  }
  
  /**
   * Initialize checkpoints from movie IDs (marks as raw/discovery)
   */
  initializeMovies(movieIds: string[]): void {
    for (const id of movieIds) {
      if (!this.checkpoints.has(id)) {
        this.checkpoints.set(id, {
          movieId: id,
          status: 'raw',
          completedStages: [],
          lastStage: null,
          lastStageAt: null,
          completenessScore: 0,
          errors: [],
        });
      }
    }
  }
  
  /**
   * Load checkpoints from database
   */
  async loadFromDatabase(): Promise<void> {
    if (!this.supabase) return;
    
    try {
      const { data: movies, error } = await this.supabase
        .from('movies')
        .select('id, ingestion_status, completeness_score, last_stage_completed, stage_completed_at')
        .not('ingestion_status', 'is', null);
      
      if (error) {
        console.warn('Could not load checkpoints from database:', error.message);
        return;
      }
      
      for (const movie of movies || []) {
        // Reconstruct checkpoint from database fields
        const lastStage = movie.last_stage_completed as IngestionStage | null;
        const completedStages = lastStage ? this.deriveCompletedStages(lastStage) : [];
        
        this.checkpoints.set(movie.id, {
          movieId: movie.id,
          status: (movie.ingestion_status as IngestionStatus) || 'raw',
          completedStages,
          lastStage,
          lastStageAt: movie.stage_completed_at ? new Date(movie.stage_completed_at) : null,
          completenessScore: movie.completeness_score || 0,
          errors: [],
        });
      }
    } catch (error) {
      console.warn('Error loading checkpoints:', error);
    }
  }
  
  // ============================================================
  // PRIVATE HELPERS
  // ============================================================
  
  private getOrCreateCheckpoint(movieId: string): MovieCheckpoint {
    const existing = this.checkpoints.get(movieId);
    if (existing) return existing;
    
    const newCheckpoint: MovieCheckpoint = {
      movieId,
      status: 'raw',
      completedStages: [],
      lastStage: null,
      lastStageAt: null,
      completenessScore: 0,
      errors: [],
    };
    
    this.checkpoints.set(movieId, newCheckpoint);
    return newCheckpoint;
  }
  
  private async persistCheckpoint(movieId: string, checkpoint: MovieCheckpoint): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase
        .from('movies')
        .update({
          ingestion_status: checkpoint.status,
          completeness_score: checkpoint.completenessScore,
          last_stage_completed: checkpoint.lastStage,
          stage_completed_at: checkpoint.lastStageAt?.toISOString(),
        })
        .eq('id', movieId);
    } catch (error) {
      // Silently fail - checkpoints are best-effort for persistence
      console.warn(`Could not persist checkpoint for ${movieId}:`, error);
    }
  }
  
  /**
   * Derive all completed stages from the last completed stage
   * (assumes linear progression)
   */
  private deriveCompletedStages(lastStage: IngestionStage): IngestionStage[] {
    const index = STAGE_ORDER.indexOf(lastStage);
    if (index === -1) return [];
    return STAGE_ORDER.slice(0, index + 1);
  }
}

// ============================================================
// EXPORT UTILITIES
// ============================================================

export const STAGES = STAGE_ORDER;

export function getNextStage(currentStage: IngestionStage): IngestionStage | null {
  const index = STAGE_ORDER.indexOf(currentStage);
  if (index === -1 || index >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[index + 1];
}

export function getPreviousStage(currentStage: IngestionStage): IngestionStage | null {
  const index = STAGE_ORDER.indexOf(currentStage);
  if (index <= 0) return null;
  return STAGE_ORDER[index - 1];
}

export function getStageScore(stage: IngestionStage): number {
  return STAGE_COMPLETENESS_SCORE[stage] || 0;
}

// ============================================================
// DEFAULT INSTANCE
// ============================================================

export const defaultCheckpointManager = new CheckpointManager();

