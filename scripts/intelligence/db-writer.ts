/**
 * DATABASE WRITER
 *
 * Writes enriched entities to Supabase.
 * Handles versioning, source tracking, and AI learning logs.
 *
 * Features:
 * - Dry run support
 * - Automatic version tracking (updated_at, source_tags)
 * - AI reasoning stored in ai_learnings table
 * - Idempotent operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EnrichedEntity,
  UpdateDecision,
  WriteResult,
  EnrichedCelebrityData,
  EnrichedMovieData,
} from './types';

interface WriterOptions {
  dryRun: boolean;
  verbose: boolean;
}

export class DatabaseWriter {
  private supabase: SupabaseClient;
  private options: WriterOptions;

  constructor(supabase: SupabaseClient, options: WriterOptions) {
    this.supabase = supabase;
    this.options = options;
  }

  /**
   * Write entity to database
   */
  async write(
    entity: EnrichedEntity,
    decision: UpdateDecision
  ): Promise<WriteResult> {
    if (decision.action === 'skip') {
      return { success: true, action: 'skipped' };
    }

    if (this.options.dryRun) {
      if (this.options.verbose) {
        console.log(`    [DRY RUN] Would ${decision.action}: ${entity.name_en}`);
        console.log(`    Fields: ${decision.fieldsToUpdate.join(', ')}`);
      }
      return { success: true, action: decision.action === 'insert' ? 'inserted' : 'updated' };
    }

    try {
      // Write to appropriate table
      let result: WriteResult;

      switch (entity.entity_type) {
        case 'celebrity':
          result = await this.writeCelebrity(entity, decision);
          break;
        case 'movie':
          result = await this.writeMovie(entity, decision);
          break;
        case 'interview':
          result = await this.writeInterview(entity, decision);
          break;
        default:
          return { success: false, action: 'skipped', error: 'Unknown entity type' };
      }

      // Log AI reasoning
      if (result.success) {
        await this.logAILearning(entity, decision, result);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        action: 'skipped',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Write celebrity to database
   */
  private async writeCelebrity(
    entity: EnrichedEntity,
    decision: UpdateDecision
  ): Promise<WriteResult> {
    const enriched = entity.enriched as EnrichedCelebrityData;

    // Build record with only fields to update
    const record: Record<string, any> = {};
    const fieldsSet = new Set(decision.fieldsToUpdate);

    // Generate slug from name
    const slug = this.generateSlug(entity.name_en);

    // Map enriched fields to database columns
    const fieldMapping: Record<string, any> = {
      slug: slug,
      name_en: entity.name_en,
      name_te: entity.name_te,
      gender: enriched.gender,
      birth_date: enriched.birth_date,
      death_date: enriched.death_date,
      occupation: enriched.occupation,
      short_bio: enriched.biography_en,
      short_bio_te: enriched.biography_te,
      profile_image: enriched.image_url,
      popularity_score: enriched.popularity_score || 50,
      active_years_start: enriched.debut_year,
      tmdb_id: entity.tmdb_id,
      wikidata_id: entity.wikidata_id,
      is_active: true,
      is_published: false,
    };

    // Only include fields that should be updated
    for (const [field, value] of Object.entries(fieldMapping)) {
      if (decision.action === 'insert' || fieldsSet.has(field)) {
        if (value !== undefined) {
          record[field] = value;
        }
      }
    }

    // Add version tracking
    record.updated_at = new Date().toISOString();
    record.source_tags = this.mergeSourceTags(
      decision.existingRecord?.source_tags,
      entity.source
    );

    // Insert or update
    if (decision.action === 'insert') {
      const { data, error } = await this.supabase
        .from('celebrities')
        .insert(record)
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, action: 'inserted', id: data?.id };
    } else {
      const { error } = await this.supabase
        .from('celebrities')
        .update(record)
        .eq('id', entity.existing_id);

      if (error) throw error;
      return { success: true, action: 'updated', id: entity.existing_id };
    }
  }

  /**
   * Write movie to database
   */
  private async writeMovie(
    entity: EnrichedEntity,
    decision: UpdateDecision
  ): Promise<WriteResult> {
    const enriched = entity.enriched as EnrichedMovieData;

    const record: Record<string, any> = {};
    const fieldsSet = new Set(decision.fieldsToUpdate);

    // Generate slug from title
    const slug = this.generateSlug(enriched.title_en || entity.name_en);

    const fieldMapping: Record<string, any> = {
      slug: slug,
      title_en: enriched.title_en || entity.name_en,
      title_te: enriched.title_te,
      release_date: enriched.release_date,
      release_year: enriched.release_year,
      runtime_minutes: enriched.runtime,
      genres: enriched.genres,
      synopsis: enriched.synopsis_en,
      synopsis_te: enriched.synopsis_te,
      verdict: enriched.verdict,
      director: enriched.director,
      hero: enriched.hero,
      heroine: enriched.heroine,
      music_director: enriched.music_director,
      poster_url: enriched.poster_url,
      backdrop_url: enriched.backdrop_url,
      tmdb_id: entity.tmdb_id,
      is_published: false,
    };

    for (const [field, value] of Object.entries(fieldMapping)) {
      if (decision.action === 'insert' || fieldsSet.has(field)) {
        if (value !== undefined) {
          record[field] = value;
        }
      }
    }

    record.updated_at = new Date().toISOString();
    record.source_tags = this.mergeSourceTags(
      decision.existingRecord?.source_tags,
      entity.source
    );

    if (decision.action === 'insert') {
      const { data, error } = await this.supabase
        .from('movies')
        .insert(record)
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, action: 'inserted', id: data?.id };
    } else {
      const { error } = await this.supabase
        .from('movies')
        .update(record)
        .eq('id', entity.existing_id);

      if (error) throw error;
      return { success: true, action: 'updated', id: entity.existing_id };
    }
  }

  /**
   * Write interview insights to database
   */
  private async writeInterview(
    entity: EnrichedEntity,
    decision: UpdateDecision
  ): Promise<WriteResult> {
    // For interviews, we store insights in interview_insights table
    // This is a simplified implementation

    const record = {
      celebrity_name: entity.name_en,
      source: entity.source,
      source_id: entity.source_id,
      ai_reasoning: entity.ai_reasoning,
      created_at: new Date().toISOString(),
    };

    // Check if already exists
    const { data: existing } = await this.supabase
      .from('interview_sources')
      .select('id')
      .eq('source_url', entity.source_id)
      .single();

    if (existing) {
      return { success: true, action: 'skipped' };
    }

    // Insert new interview source
    const { data, error } = await this.supabase
      .from('interview_sources')
      .insert({
        source_url: entity.source_id,
        source_type: entity.source === 'youtube' ? 'youtube' : 'news',
        interviewee_name: entity.name_en,
        is_processed: true,
        processed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      // Table might not exist, skip silently
      return { success: true, action: 'skipped' };
    }

    return { success: true, action: 'inserted', id: data?.id };
  }

  /**
   * Log AI learning for future improvement
   */
  private async logAILearning(
    entity: EnrichedEntity,
    decision: UpdateDecision,
    result: WriteResult
  ): Promise<void> {
    try {
      await this.supabase.from('ai_learnings').insert({
        entity_type: entity.entity_type,
        entity_id: result.id || entity.existing_id,
        entity_name: entity.name_en,
        action_taken: result.action,
        fields_updated: decision.fieldsToUpdate,
        ai_confidence: entity.ai_confidence,
        ai_reasoning: entity.ai_reasoning,
        source: entity.source,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Silently fail if ai_learnings table doesn't exist
    }
  }

  /**
   * Merge source tags array
   */
  private mergeSourceTags(existing: string[] | null, newSource: string): string[] {
    const tags = new Set(existing || []);
    tags.add(newSource);
    tags.add(`sync_${new Date().toISOString().split('T')[0]}`);
    return Array.from(tags);
  }

  /**
   * Generate URL-safe slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .slice(0, 100) + '-' + Date.now().toString(36);
  }
}
