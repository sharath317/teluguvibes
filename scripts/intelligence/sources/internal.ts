/**
 * INTERNAL DATABASE FETCHER
 *
 * Fetches existing records for comparison and update decisions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TargetType } from '../types';

export interface ExistingRecord {
  id: string;
  entity_type: 'celebrity' | 'movie' | 'review';
  name_en: string;
  name_te?: string;
  tmdb_id?: number;
  wikidata_id?: string;
  data_completeness?: number;
  updated_at?: string;
  source_tags?: string[];
}

/**
 * Fetch existing records from database for comparison
 */
export async function fetchExistingRecords(
  supabase: SupabaseClient,
  targets: TargetType[]
): Promise<ExistingRecord[]> {
  const records: ExistingRecord[] = [];

  // Fetch celebrities
  if (targets.includes('celebrities')) {
    const { data: celebrities } = await supabase
      .from('celebrities')
      .select('id, name_en, name_te, tmdb_id, wikidata_id, updated_at, source_tags');

    if (celebrities) {
      records.push(...celebrities.map(c => ({
        id: c.id,
        entity_type: 'celebrity' as const,
        name_en: c.name_en,
        name_te: c.name_te,
        tmdb_id: c.tmdb_id,
        wikidata_id: c.wikidata_id,
        updated_at: c.updated_at,
        source_tags: c.source_tags,
      })));
    }
  }

  // Fetch movies
  if (targets.includes('movies')) {
    const { data: movies } = await supabase
      .from('movies')
      .select('id, title_en, title_te, tmdb_id, wikidata_id, updated_at, source_tags');

    if (movies) {
      records.push(...movies.map(m => ({
        id: m.id,
        entity_type: 'movie' as const,
        name_en: m.title_en,
        name_te: m.title_te,
        tmdb_id: m.tmdb_id,
        wikidata_id: m.wikidata_id,
        updated_at: m.updated_at,
        source_tags: m.source_tags,
      })));
    }
  }

  // Fetch reviews
  if (targets.includes('reviews')) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, movie_id, updated_at, is_ai_generated');

    if (reviews) {
      records.push(...reviews.map(r => ({
        id: r.id,
        entity_type: 'review' as const,
        name_en: r.movie_id, // Use movie_id as identifier
        updated_at: r.updated_at,
      })));
    }
  }

  return records;
}

/**
 * Calculate data completeness score (0-100)
 */
export function calculateCompleteness(record: any, entityType: string): number {
  const requiredFields: Record<string, string[]> = {
    celebrity: [
      'name_en', 'name_te', 'gender', 'birth_date', 'occupation',
      'biography_te', 'image_url', 'era', 'popularity_tier',
    ],
    movie: [
      'title_en', 'title_te', 'release_date', 'genres', 'synopsis_te',
      'poster_url', 'director', 'hero', 'heroine',
    ],
    review: [
      'review_te', 'direction_score', 'screenplay_score', 'acting_score',
      'overall_score', 'verdict_te',
    ],
  };

  const fields = requiredFields[entityType] || [];
  if (fields.length === 0) return 100;

  let filledCount = 0;
  for (const field of fields) {
    const value = record[field];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length > 0) filledCount++;
      else if (!Array.isArray(value)) filledCount++;
    }
  }

  return Math.round((filledCount / fields.length) * 100);
}



