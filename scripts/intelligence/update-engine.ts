/**
 * UPDATE DECISION ENGINE
 *
 * Decides what fields to update based on mode:
 * - append: Only insert new records
 * - update: Overwrite all fields
 * - smart: Only update missing or weak fields (DEFAULT)
 *
 * SMART UPDATE LOGIC:
 * For each field, decide to keep existing or use new value based on:
 * 1. Field completeness (empty vs filled)
 * 2. Data quality (AI confidence, source reliability)
 * 3. Field priority (some fields are more important)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnrichedEntity, UpdateDecision, FieldComparison, UpdateMode } from './types';

interface UpdateEngineOptions {
  mode: UpdateMode;
  verbose: boolean;
}

// Field priority weights (higher = more important to fill)
const FIELD_PRIORITY: Record<string, number> = {
  // High priority - core identity
  name_en: 100,
  name_te: 95,
  image_url: 90,
  biography_te: 85,
  poster_url: 85,

  // Medium priority - key metadata
  birth_date: 70,
  release_date: 70,
  genres: 65,
  era: 60,
  popularity_tier: 60,
  director: 60,

  // Lower priority - supplementary
  career_highlights: 50,
  notable_movies: 50,
  synopsis_te: 50,
  verdict: 45,

  // Default
  default: 40,
};

// Source reliability scores
const SOURCE_RELIABILITY: Record<string, number> = {
  wikidata: 90,  // Most reliable for historic data
  tmdb: 85,      // Good for modern data
  internal: 80,  // Our own verified data
  youtube: 50,   // Metadata only
  news: 40,      // Can be inaccurate
};

export class UpdateEngine {
  private options: UpdateEngineOptions;

  constructor(options: UpdateEngineOptions) {
    this.options = options;
  }

  /**
   * Decide what to do with an enriched entity
   */
  async decide(
    entity: EnrichedEntity,
    supabase: SupabaseClient
  ): Promise<UpdateDecision> {
    // If no existing record, always insert (unless append mode and it somehow exists)
    if (!entity.existing_id) {
      return {
        action: 'insert',
        reason: 'New entity',
        fieldsToUpdate: this.getAllFields(entity),
        fieldsToKeep: [],
      };
    }

    // Fetch existing record
    const existingRecord = await this.fetchExistingRecord(
      supabase,
      entity.entity_type,
      entity.existing_id
    );

    if (!existingRecord) {
      return {
        action: 'insert',
        reason: 'Record not found (ID mismatch)',
        fieldsToUpdate: this.getAllFields(entity),
        fieldsToKeep: [],
      };
    }

    // Apply mode-specific logic
    switch (this.options.mode) {
      case 'append':
        return {
          action: 'skip',
          reason: 'Append mode - record exists',
          fieldsToUpdate: [],
          fieldsToKeep: this.getAllFields(entity),
          existingRecord,
        };

      case 'update':
        return {
          action: 'update',
          reason: 'Update mode - overwriting all fields',
          fieldsToUpdate: this.getAllFields(entity),
          fieldsToKeep: [],
          existingRecord,
        };

      case 'smart':
      default:
        return this.smartDecision(entity, existingRecord);
    }
  }

  /**
   * Smart update decision
   * Only update fields that are missing or weak in existing record
   */
  private smartDecision(
    entity: EnrichedEntity,
    existingRecord: any
  ): UpdateDecision {
    const comparisons = this.compareFields(entity, existingRecord);

    const fieldsToUpdate: string[] = [];
    const fieldsToKeep: string[] = [];

    for (const comparison of comparisons) {
      if (comparison.decision === 'update') {
        fieldsToUpdate.push(comparison.field);
      } else {
        fieldsToKeep.push(comparison.field);
      }
    }

    // Skip if no fields need updating
    if (fieldsToUpdate.length === 0) {
      return {
        action: 'skip',
        reason: 'All fields complete',
        fieldsToUpdate: [],
        fieldsToKeep,
        existingRecord,
      };
    }

    return {
      action: 'update',
      reason: `${fieldsToUpdate.length} fields to update`,
      fieldsToUpdate,
      fieldsToKeep,
      existingRecord,
    };
  }

  /**
   * Compare fields between new and existing data
   */
  private compareFields(
    entity: EnrichedEntity,
    existingRecord: any
  ): FieldComparison[] {
    const comparisons: FieldComparison[] = [];
    const enriched = entity.enriched as any;

    // Get all fields from enriched data
    const newFields = new Set([
      ...Object.keys(enriched),
      'name_te', 'tmdb_id', 'wikidata_id',
    ]);

    for (const field of newFields) {
      // Skip internal fields
      if (field === 'type') continue;

      const existingValue = existingRecord[field];
      const newValue = field === 'name_te' ? entity.name_te :
                       field === 'tmdb_id' ? entity.tmdb_id :
                       field === 'wikidata_id' ? entity.wikidata_id :
                       enriched[field];

      const comparison = this.compareField(
        field,
        existingValue,
        newValue,
        entity.source,
        entity.ai_confidence
      );

      comparisons.push(comparison);
    }

    return comparisons;
  }

  /**
   * Compare a single field
   */
  private compareField(
    field: string,
    existing: any,
    newValue: any,
    source: string,
    aiConfidence: number
  ): FieldComparison {
    // If new value is empty, keep existing
    if (this.isEmpty(newValue)) {
      return {
        field,
        existing,
        new: newValue,
        decision: 'keep',
        reason: 'New value is empty',
      };
    }

    // If existing is empty, update
    if (this.isEmpty(existing)) {
      return {
        field,
        existing,
        new: newValue,
        decision: 'update',
        reason: 'Existing value is empty',
      };
    }

    // Both have values - use heuristics
    const priority = FIELD_PRIORITY[field] || FIELD_PRIORITY.default;
    const sourceReliability = SOURCE_RELIABILITY[source] || 50;

    // Calculate update score
    const existingQuality = this.calculateQuality(existing);
    const newQuality = this.calculateQuality(newValue) * (sourceReliability / 100) * (aiConfidence / 100);

    // Only update if new quality is significantly better
    if (newQuality > existingQuality * 1.3) {
      return {
        field,
        existing,
        new: newValue,
        decision: 'update',
        reason: `New quality (${newQuality.toFixed(0)}) > existing (${existingQuality.toFixed(0)})`,
      };
    }

    // Keep existing for high-priority fields unless new is clearly better
    if (priority >= 80 && newQuality <= existingQuality) {
      return {
        field,
        existing,
        new: newValue,
        decision: 'keep',
        reason: 'High priority field - keeping existing',
      };
    }

    return {
      field,
      existing,
      new: newValue,
      decision: 'keep',
      reason: 'Existing value is adequate',
    };
  }

  /**
   * Check if value is empty
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  /**
   * Calculate quality score for a value
   */
  private calculateQuality(value: any): number {
    if (this.isEmpty(value)) return 0;

    if (typeof value === 'string') {
      // Longer strings are generally better (up to a point)
      const length = value.length;
      if (length < 10) return 30;
      if (length < 50) return 50;
      if (length < 200) return 70;
      return 90;
    }

    if (Array.isArray(value)) {
      // More items = better (up to a point)
      const length = value.length;
      if (length < 2) return 40;
      if (length < 5) return 60;
      return 80;
    }

    if (typeof value === 'number') {
      return value > 0 ? 80 : 40;
    }

    return 50; // Default for other types
  }

  /**
   * Get all fields from enriched entity
   */
  private getAllFields(entity: EnrichedEntity): string[] {
    const enriched = entity.enriched as any;
    return Object.keys(enriched).filter(k => k !== 'type');
  }

  /**
   * Fetch existing record from database
   */
  private async fetchExistingRecord(
    supabase: SupabaseClient,
    entityType: string,
    id: string
  ): Promise<any> {
    const table = entityType === 'celebrity' ? 'celebrities' :
                  entityType === 'movie' ? 'movies' :
                  entityType === 'review' ? 'reviews' : null;

    if (!table) return null;

    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    return data;
  }
}
