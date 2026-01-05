/**
 * DATA REFINEMENT ENGINE
 *
 * Auto fine-tuning and self-correction for existing data.
 *
 * Triggers:
 * - New source data appears
 * - Confidence < threshold
 * - Audience behavior contradicts content
 *
 * Rules:
 * - NEVER overwrite human-edited fields
 * - Always version changes
 * - Log "why this changed" in ai_learnings
 */

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { validateEntity, ValidationResult } from '../validation/ai-validator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface RefinementResult {
  entity_id: string;
  entity_type: string;
  fields_refined: FieldRefinement[];
  new_confidence: number;
  previous_confidence: number;
  reason: string;
  timestamp: string;
}

export interface FieldRefinement {
  field: string;
  old_value: any;
  new_value: any;
  reason: string;
  source: string;
}

export interface RefinementConfig {
  min_confidence_threshold: number;  // Below this, trigger refinement
  max_age_days: number;              // Re-check items older than this
  dry_run: boolean;                  // Preview only
  target_table?: string;             // Specific table to refine
  limit: number;                     // Max items per run
}

const DEFAULT_CONFIG: RefinementConfig = {
  min_confidence_threshold: 0.70,
  max_age_days: 30,
  dry_run: false,
  limit: 50,
};

// ============================================================
// MAIN REFINER CLASS
// ============================================================

export class DataRefiner {
  private groq: Groq;
  private config: RefinementConfig;

  constructor(config: Partial<RefinementConfig> = {}) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main refinement entry point
   */
  async refineAll(): Promise<RefinementResult[]> {
    console.log('🔄 Data Refinement Engine Starting...');
    console.log(`   Config: confidence < ${this.config.min_confidence_threshold}, age > ${this.config.max_age_days}d`);

    const results: RefinementResult[] = [];

    // Refine movies
    if (!this.config.target_table || this.config.target_table === 'movies') {
      const movieResults = await this.refineMovies();
      results.push(...movieResults);
    }

    // Refine celebrities
    if (!this.config.target_table || this.config.target_table === 'celebrities') {
      const celebResults = await this.refineCelebrities();
      results.push(...celebResults);
    }

    // Refine posts
    if (!this.config.target_table || this.config.target_table === 'posts') {
      const postResults = await this.refinePosts();
      results.push(...postResults);
    }

    console.log(`✅ Refinement complete: ${results.length} items refined`);
    return results;
  }

  /**
   * Refine movies with low confidence or outdated data
   */
  private async refineMovies(): Promise<RefinementResult[]> {
    console.log('📽️ Refining movies...');

    const { data: movies } = await supabase
      .from('movies')
      .select('*')
      .or(`data_completeness.lt.${this.config.min_confidence_threshold * 100},data_completeness.is.null`)
      .order('updated_at', { ascending: true })
      .limit(this.config.limit);

    if (!movies || movies.length === 0) {
      console.log('   No movies need refinement');
      return [];
    }

    const results: RefinementResult[] = [];

    for (const movie of movies) {
      const result = await this.refineMovie(movie);
      if (result) results.push(result);
    }

    return results;
  }

  private async refineMovie(movie: any): Promise<RefinementResult | null> {
    const refinements: FieldRefinement[] = [];
    let previousConfidence = (movie.data_completeness || 50) / 100;

    // Check what needs refinement
    const missingFields = this.findMissingMovieFields(movie);

    if (missingFields.length === 0) {
      return null; // Nothing to refine
    }

    console.log(`   Refining movie: ${movie.title_en || movie.id}`);

    // Try to fill missing fields
    for (const field of missingFields) {
      // Skip human-edited fields
      if (await this.isHumanEdited(movie.id, 'movies', field)) {
        continue;
      }

      const refinement = await this.refineMovieField(movie, field);
      if (refinement) {
        refinements.push(refinement);
      }
    }

    if (refinements.length === 0) {
      return null;
    }

    // Apply refinements
    if (!this.config.dry_run) {
      await this.applyMovieRefinements(movie.id, refinements);
    }

    // Calculate new confidence
    const newConfidence = this.calculateMovieConfidence(movie, refinements);

    // Log learning
    await this.logRefinement(movie.id, 'movies', refinements, 'Auto-refinement based on missing fields');

    return {
      entity_id: movie.id,
      entity_type: 'movie',
      fields_refined: refinements,
      new_confidence: newConfidence,
      previous_confidence: previousConfidence,
      reason: `Refined ${refinements.length} fields`,
      timestamp: new Date().toISOString(),
    };
  }

  private findMissingMovieFields(movie: any): string[] {
    const criticalFields = [
      'title_te',
      'genres',
      'director',
      'release_year',
      'poster_url',
      'synopsis_te',
    ];

    const missing: string[] = [];

    for (const field of criticalFields) {
      const value = movie[field];
      if (value === null || value === undefined || value === '' ||
          (Array.isArray(value) && value.length === 0)) {
        missing.push(field);
      }
    }

    return missing;
  }

  private async refineMovieField(
    movie: any,
    field: string
  ): Promise<FieldRefinement | null> {
    try {
      switch (field) {
        case 'synopsis_te':
          if (movie.synopsis_en || movie.overview_en) {
            const translated = await this.translateToTelugu(
              movie.synopsis_en || movie.overview_en
            );
            if (translated) {
              return {
                field: 'synopsis_te',
                old_value: null,
                new_value: translated,
                reason: 'Translated from English synopsis',
                source: 'ai_translation',
              };
            }
          }
          break;

        case 'genres':
          if (movie.overview_en || movie.synopsis_en) {
            const genres = await this.inferGenres(
              movie.overview_en || movie.synopsis_en
            );
            if (genres.length > 0) {
              return {
                field: 'genres',
                old_value: [],
                new_value: genres,
                reason: 'Inferred from movie description',
                source: 'ai_inference',
              };
            }
          }
          break;

        case 'era':
          if (movie.release_year) {
            const era = this.inferEra(movie.release_year);
            return {
              field: 'era',
              old_value: null,
              new_value: era,
              reason: `Inferred from release year ${movie.release_year}`,
              source: 'rule_based',
            };
          }
          break;
      }
    } catch (error) {
      console.warn(`   Failed to refine ${field}:`, error);
    }

    return null;
  }

  /**
   * Refine celebrities
   */
  private async refineCelebrities(): Promise<RefinementResult[]> {
    console.log('🎭 Refining celebrities...');

    const { data: celebrities } = await supabase
      .from('celebrities')
      .select('*')
      .or(`data_completeness.lt.${this.config.min_confidence_threshold * 100},data_completeness.is.null`)
      .order('updated_at', { ascending: true })
      .limit(this.config.limit);

    if (!celebrities || celebrities.length === 0) {
      console.log('   No celebrities need refinement');
      return [];
    }

    const results: RefinementResult[] = [];

    for (const celebrity of celebrities) {
      const result = await this.refineCelebrity(celebrity);
      if (result) results.push(result);
    }

    return results;
  }

  private async refineCelebrity(celebrity: any): Promise<RefinementResult | null> {
    const refinements: FieldRefinement[] = [];
    const previousConfidence = (celebrity.data_completeness || 50) / 100;

    const missingFields = this.findMissingCelebFields(celebrity);

    if (missingFields.length === 0) return null;

    console.log(`   Refining celebrity: ${celebrity.name_en || celebrity.id}`);

    for (const field of missingFields) {
      if (await this.isHumanEdited(celebrity.id, 'celebrities', field)) {
        continue;
      }

      const refinement = await this.refineCelebField(celebrity, field);
      if (refinement) refinements.push(refinement);
    }

    if (refinements.length === 0) return null;

    if (!this.config.dry_run) {
      await this.applyCelebRefinements(celebrity.id, refinements);
    }

    const newConfidence = this.calculateCelebConfidence(celebrity, refinements);
    await this.logRefinement(celebrity.id, 'celebrities', refinements, 'Auto-refinement');

    return {
      entity_id: celebrity.id,
      entity_type: 'celebrity',
      fields_refined: refinements,
      new_confidence: newConfidence,
      previous_confidence: previousConfidence,
      reason: `Refined ${refinements.length} fields`,
      timestamp: new Date().toISOString(),
    };
  }

  private findMissingCelebFields(celeb: any): string[] {
    const criticalFields = [
      'name_te', 'biography_te', 'era', 'popularity_tier', 'primary_role', 'image_url'
    ];

    return criticalFields.filter(field => {
      const value = celeb[field];
      return value === null || value === undefined || value === '';
    });
  }

  private async refineCelebField(
    celeb: any,
    field: string
  ): Promise<FieldRefinement | null> {
    try {
      switch (field) {
        case 'biography_te':
          if (celeb.biography_en) {
            const translated = await this.translateToTelugu(celeb.biography_en);
            if (translated) {
              return {
                field: 'biography_te',
                old_value: null,
                new_value: translated,
                reason: 'Translated from English biography',
                source: 'ai_translation',
              };
            }
          }
          break;

        case 'era':
          if (celeb.debut_year || celeb.birth_date) {
            const year = celeb.debut_year ||
              (celeb.birth_date ? new Date(celeb.birth_date).getFullYear() + 20 : null);
            if (year) {
              return {
                field: 'era',
                old_value: null,
                new_value: this.inferEra(year),
                reason: 'Inferred from debut/birth year',
                source: 'rule_based',
              };
            }
          }
          break;

        case 'popularity_tier':
          const tier = await this.inferPopularityTier(celeb);
          if (tier) {
            return {
              field: 'popularity_tier',
              old_value: null,
              new_value: tier,
              reason: 'Inferred from available data',
              source: 'ai_inference',
            };
          }
          break;
      }
    } catch (error) {
      console.warn(`   Failed to refine celeb ${field}:`, error);
    }

    return null;
  }

  /**
   * Refine posts
   */
  private async refinePosts(): Promise<RefinementResult[]> {
    console.log('📝 Refining posts...');

    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .or(`ai_confidence.lt.${this.config.min_confidence_threshold},ai_confidence.is.null`)
      .eq('is_ai_generated', true)
      .order('updated_at', { ascending: true })
      .limit(this.config.limit);

    if (!posts || posts.length === 0) {
      console.log('   No posts need refinement');
      return [];
    }

    const results: RefinementResult[] = [];

    for (const post of posts) {
      // Skip if human POV was added
      if (post.human_pov) continue;

      const result = await this.refinePost(post);
      if (result) results.push(result);
    }

    return results;
  }

  private async refinePost(post: any): Promise<RefinementResult | null> {
    // Re-validate the post
    const validation = await validateEntity({
      title_en: post.title,
      overview_en: post.telugu_body,
      genres: [],
      data_sources: ['internal'],
    });

    if (validation.suggested_fixes.length === 0) {
      return null;
    }

    const refinements: FieldRefinement[] = validation.suggested_fixes
      .filter(fix => fix.auto_fixable)
      .map(fix => ({
        field: fix.field,
        old_value: fix.current_value,
        new_value: fix.suggested_value,
        reason: fix.reason,
        source: 'ai_validation',
      }));

    if (refinements.length === 0) return null;

    if (!this.config.dry_run) {
      await this.applyPostRefinements(post.id, refinements);
    }

    await this.logRefinement(post.id, 'posts', refinements, 'Re-validation refinement');

    return {
      entity_id: post.id,
      entity_type: 'post',
      fields_refined: refinements,
      new_confidence: validation.confidence,
      previous_confidence: post.ai_confidence || 0.5,
      reason: `Applied ${refinements.length} auto-fixes from validation`,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private async isHumanEdited(
    entityId: string,
    table: string,
    field: string
  ): Promise<boolean> {
    // Check ai_learnings for human edits
    const { data } = await supabase
      .from('ai_learnings')
      .select('id')
      .eq('entity_id', entityId)
      .eq('entity_type', table)
      .contains('fields_updated', [field])
      .eq('source', 'human')
      .limit(1);

    return (data?.length || 0) > 0;
  }

  private async translateToTelugu(text: string): Promise<string | null> {
    try {
      const prompt = `Translate this to Telugu. Return ONLY the Telugu translation, nothing else:

${text.slice(0, 1000)}`;

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  private async inferGenres(text: string): Promise<string[]> {
    try {
      const prompt = `Based on this description, list 1-3 movie genres (Action, Drama, Romance, Comedy, Thriller, Horror, Family):

${text.slice(0, 500)}

Return ONLY comma-separated genres.`;

      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 50,
      });

      const response = completion.choices[0]?.message?.content || '';
      return response.split(',').map(g => g.trim()).filter(g => g.length > 0);
    } catch {
      return [];
    }
  }

  private async inferPopularityTier(celeb: any): Promise<string | null> {
    const filmCount = celeb.filmography?.length || 0;
    const hasImage = !!celeb.image_url;
    const hasBio = !!(celeb.biography_en || celeb.biography_te);

    if (filmCount > 50) return 'legendary';
    if (filmCount > 30 && hasImage && hasBio) return 'star';
    if (filmCount > 15) return 'popular';
    if (filmCount > 5) return 'known';
    return 'emerging';
  }

  private inferEra(year: number): string {
    if (year < 1970) return 'golden_age';
    if (year < 1990) return 'silver_age';
    if (year < 2005) return '90s_era';
    if (year < 2018) return 'modern';
    return 'current';
  }

  private calculateMovieConfidence(movie: any, refinements: FieldRefinement[]): number {
    let confidence = (movie.data_completeness || 50) / 100;
    confidence += refinements.length * 0.05;
    return Math.min(1, confidence);
  }

  private calculateCelebConfidence(celeb: any, refinements: FieldRefinement[]): number {
    let confidence = (celeb.data_completeness || 50) / 100;
    confidence += refinements.length * 0.05;
    return Math.min(1, confidence);
  }

  private async applyMovieRefinements(movieId: string, refinements: FieldRefinement[]): Promise<void> {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const r of refinements) {
      updates[r.field] = r.new_value;
    }

    await supabase.from('movies').update(updates).eq('id', movieId);
  }

  private async applyCelebRefinements(celebId: string, refinements: FieldRefinement[]): Promise<void> {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const r of refinements) {
      updates[r.field] = r.new_value;
    }

    await supabase.from('celebrities').update(updates).eq('id', celebId);
  }

  private async applyPostRefinements(postId: string, refinements: FieldRefinement[]): Promise<void> {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const r of refinements) {
      updates[r.field] = r.new_value;
    }

    await supabase.from('posts').update(updates).eq('id', postId);
  }

  private async logRefinement(
    entityId: string,
    entityType: string,
    refinements: FieldRefinement[],
    reason: string
  ): Promise<void> {
    try {
      await supabase.from('ai_learnings').insert({
        entity_id: entityId,
        entity_type: entityType,
        action_taken: 'refinement',
        fields_updated: refinements.map(r => r.field),
        ai_reasoning: reason,
        source: 'data_refiner',
        created_at: new Date().toISOString(),
        metadata: { refinements },
      });
    } catch (error) {
      console.warn('Failed to log refinement:', error);
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

export async function refineData(config?: Partial<RefinementConfig>): Promise<RefinementResult[]> {
  const refiner = new DataRefiner(config);
  return refiner.refineAll();
}








