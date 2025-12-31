/**
 * DEDUPLICATION LAYER
 *
 * Matches and merges entities across different sources.
 *
 * Matching Strategy:
 * 1. Exact ID match (tmdb_id, wikidata_id)
 * 2. Normalized name match (Telugu + English)
 * 3. Fuzzy name match with confidence threshold
 *
 * Also filters out non-Telugu entities.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RawEntity, RawCelebrityData, RawMovieData } from './types';

interface MatchedEntity extends RawEntity {
  existing_id?: string;
  match_confidence: number;
  match_reason: string;
}

export class Deduplicator {
  private supabase: SupabaseClient;
  private existingCelebrities: Map<string, any> = new Map();
  private existingMovies: Map<string, any> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Load existing records for matching
   */
  private async loadExistingRecords(): Promise<void> {
    // Load celebrities
    const { data: celebrities } = await this.supabase
      .from('celebrities')
      .select('id, name_en, name_te, tmdb_id, wikidata_id');

    for (const c of (celebrities || [])) {
      // Index by all possible keys
      if (c.tmdb_id) this.existingCelebrities.set(`tmdb_${c.tmdb_id}`, c);
      if (c.wikidata_id) this.existingCelebrities.set(`wikidata_${c.wikidata_id}`, c);
      if (c.name_en) this.existingCelebrities.set(`name_en_${this.normalize(c.name_en)}`, c);
      if (c.name_te) this.existingCelebrities.set(`name_te_${c.name_te}`, c);
    }

    // Load movies
    const { data: movies } = await this.supabase
      .from('movies')
      .select('id, title_en, title_te, tmdb_id, wikidata_id, release_date');

    for (const m of (movies || [])) {
      if (m.tmdb_id) this.existingMovies.set(`tmdb_${m.tmdb_id}`, m);
      if (m.wikidata_id) this.existingMovies.set(`wikidata_${m.wikidata_id}`, m);
      if (m.title_en) {
        const year = m.release_date ? new Date(m.release_date).getFullYear() : '';
        this.existingMovies.set(`title_${this.normalize(m.title_en)}_${year}`, m);
      }
    }
  }

  /**
   * Deduplicate entities
   */
  async deduplicate(entities: RawEntity[]): Promise<RawEntity[]> {
    await this.loadExistingRecords();

    const seen = new Map<string, RawEntity>();
    const result: RawEntity[] = [];

    for (const entity of entities) {
      // Filter non-Telugu entities
      if (!this.isTeluguEntity(entity)) {
        continue;
      }

      // Create dedup key
      const dedupKey = this.createDedupKey(entity);

      // Check if we've seen this in current batch
      if (seen.has(dedupKey)) {
        // Merge with existing
        const existing = seen.get(dedupKey)!;
        seen.set(dedupKey, this.mergeEntities(existing, entity));
        continue;
      }

      // Check if exists in database
      const match = this.findExistingMatch(entity);
      if (match) {
        // Attach existing ID for update
        (entity as any).existing_id = match.id;
        (entity as any).match_confidence = match.confidence;
        (entity as any).match_reason = match.reason;
      }

      seen.set(dedupKey, entity);
    }

    return Array.from(seen.values());
  }

  /**
   * Check if entity is Telugu-related
   */
  private isTeluguEntity(entity: RawEntity): boolean {
    // Always accept Telugu-language sources
    if (entity.source === 'wikidata') return true;

    // Check data for Telugu indicators
    const data = entity.data;

    if (data.type === 'movie') {
      const movieData = data as RawMovieData;
      // Accept if has Telugu title or from Telugu movie search
      return !!(movieData.title_te || entity.source === 'tmdb');
    }

    if (data.type === 'celebrity') {
      const celebData = data as RawCelebrityData;
      // Accept if has Telugu filmography
      if (celebData.filmography && celebData.filmography.length > 0) {
        return true;
      }
      // Accept if from TMDB Telugu movie credits
      return entity.source === 'tmdb';
    }

    // Accept interviews/news (they're already filtered by search)
    return true;
  }

  /**
   * Create deduplication key
   */
  private createDedupKey(entity: RawEntity): string {
    const data = entity.data;

    // Priority: External IDs > Normalized name
    if (data.type === 'celebrity' || data.type === 'movie') {
      const typedData = data as RawCelebrityData | RawMovieData;
      if (typedData.tmdb_id) return `tmdb_${typedData.tmdb_id}`;
      if (typedData.wikidata_id) return `wikidata_${typedData.wikidata_id}`;
    }

    // Fall back to normalized name
    return `${entity.entity_type}_${this.normalize(entity.name_en)}`;
  }

  /**
   * Find matching existing record
   */
  private findExistingMatch(entity: RawEntity): { id: string; confidence: number; reason: string } | null {
    const data = entity.data;
    const store = entity.entity_type === 'celebrity' ? this.existingCelebrities : this.existingMovies;

    // Try exact ID match first
    if (data.type === 'celebrity' || data.type === 'movie') {
      const typedData = data as RawCelebrityData | RawMovieData;

      if (typedData.tmdb_id) {
        const match = store.get(`tmdb_${typedData.tmdb_id}`);
        if (match) return { id: match.id, confidence: 100, reason: 'tmdb_id' };
      }

      if (typedData.wikidata_id) {
        const match = store.get(`wikidata_${typedData.wikidata_id}`);
        if (match) return { id: match.id, confidence: 100, reason: 'wikidata_id' };
      }
    }

    // Try name match
    const normalizedName = this.normalize(entity.name_en);

    if (entity.entity_type === 'celebrity') {
      const match = this.existingCelebrities.get(`name_en_${normalizedName}`);
      if (match) return { id: match.id, confidence: 90, reason: 'name_en' };

      if (entity.name_te) {
        const teMatch = this.existingCelebrities.get(`name_te_${entity.name_te}`);
        if (teMatch) return { id: teMatch.id, confidence: 95, reason: 'name_te' };
      }
    }

    if (entity.entity_type === 'movie') {
      const movieData = data as RawMovieData;
      const year = movieData.release_date ? new Date(movieData.release_date).getFullYear() : '';
      const match = this.existingMovies.get(`title_${normalizedName}_${year}`);
      if (match) return { id: match.id, confidence: 85, reason: 'title_year' };
    }

    return null;
  }

  /**
   * Merge two entities (prefer more complete data)
   */
  private mergeEntities(existing: RawEntity, incoming: RawEntity): RawEntity {
    // Simple merge: keep existing, add missing fields from incoming
    const merged = { ...existing };

    if (!merged.name_te && incoming.name_te) {
      merged.name_te = incoming.name_te;
    }

    // Merge data objects
    merged.data = { ...existing.data };
    for (const [key, value] of Object.entries(incoming.data)) {
      if (!(key in merged.data) || !merged.data[key as keyof typeof merged.data]) {
        (merged.data as any)[key] = value;
      }
    }

    return merged;
  }

  /**
   * Normalize string for matching
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
  }
}
