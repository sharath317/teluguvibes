/**
 * ADMIN BULK OPERATIONS
 *
 * Power user mode for mass content management.
 *
 * Features:
 * - Multi-select drafts/posts/media
 * - Batch publish, delete, re-validate
 * - Re-generate titles
 * - Re-attach images
 * - Undo last batch action
 * - Preview AI changes before applying
 */

import { createClient } from '@supabase/supabase-js';
import { validateEntity } from '../validation/ai-validator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export type BulkActionType =
  | 'publish'
  | 'unpublish'
  | 'delete'
  | 'archive'
  | 'revalidate'
  | 'regenerate_title'
  | 'reattach_image'
  | 'mark_human_reviewed'
  | 'add_genre'
  | 'remove_genre'
  | 'change_category';

export interface BulkActionRequest {
  action: BulkActionType;
  entity_ids: string[];
  entity_type: 'posts' | 'movies' | 'celebrities' | 'media';
  params?: Record<string, any>;
  dry_run?: boolean;
}

export interface BulkActionResult {
  action: BulkActionType;
  total_requested: number;
  successful: number;
  failed: number;
  skipped: number;
  results: EntityActionResult[];
  undo_token?: string;
  dry_run: boolean;
  executed_at: string;
}

export interface EntityActionResult {
  id: string;
  success: boolean;
  error?: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  changes_preview?: string[];
}

export interface UndoableAction {
  token: string;
  action: BulkActionType;
  entity_type: string;
  states: { id: string; previous_state: Record<string, any> }[];
  executed_at: string;
  expires_at: string;
}

// ============================================================
// BULK ACTION EXECUTOR
// ============================================================

export class BulkActionExecutor {
  private undoStack: UndoableAction[] = [];

  /**
   * Execute a bulk action
   */
  async execute(request: BulkActionRequest): Promise<BulkActionResult> {
    console.log(`🔄 Bulk ${request.action}: ${request.entity_ids.length} items`);

    const results: EntityActionResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Get current states for undo
    const previousStates = await this.fetchCurrentStates(
      request.entity_type,
      request.entity_ids
    );

    for (const id of request.entity_ids) {
      const currentState = previousStates.find(s => s.id === id);

      if (!currentState) {
        results.push({ id, success: false, error: 'Entity not found' });
        skipped++;
        continue;
      }

      try {
        if (request.dry_run) {
          // Preview mode
          const preview = await this.previewAction(request.action, currentState, request.params);
          results.push({
            id,
            success: true,
            previous_state: currentState,
            changes_preview: preview,
          });
          successful++;
        } else {
          // Execute action
          const result = await this.executeAction(
            request.action,
            request.entity_type,
            id,
            currentState,
            request.params
          );
          results.push(result);

          if (result.success) successful++;
          else failed++;
        }
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    // Store for undo (if not dry run)
    let undoToken: string | undefined;
    if (!request.dry_run && successful > 0) {
      undoToken = await this.storeForUndo(request, previousStates);
    }

    return {
      action: request.action,
      total_requested: request.entity_ids.length,
      successful,
      failed,
      skipped,
      results,
      undo_token: undoToken,
      dry_run: request.dry_run || false,
      executed_at: new Date().toISOString(),
    };
  }

  /**
   * Undo a previous action
   */
  async undo(undoToken: string): Promise<BulkActionResult> {
    const action = this.undoStack.find(a => a.token === undoToken);

    if (!action) {
      throw new Error('Undo token not found or expired');
    }

    if (new Date(action.expires_at) < new Date()) {
      throw new Error('Undo window has expired');
    }

    console.log(`⏪ Undoing bulk action: ${action.action}`);

    const results: EntityActionResult[] = [];
    let successful = 0;

    for (const { id, previous_state } of action.states) {
      try {
        await supabase
          .from(action.entity_type)
          .update({
            ...previous_state,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        results.push({ id, success: true, new_state: previous_state });
        successful++;
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Undo failed',
        });
      }
    }

    // Remove from undo stack
    this.undoStack = this.undoStack.filter(a => a.token !== undoToken);

    return {
      action: 'undo' as any,
      total_requested: action.states.length,
      successful,
      failed: action.states.length - successful,
      skipped: 0,
      results,
      dry_run: false,
      executed_at: new Date().toISOString(),
    };
  }

  // ============================================================
  // ACTION HANDLERS
  // ============================================================

  private async executeAction(
    action: BulkActionType,
    entityType: string,
    id: string,
    currentState: Record<string, any>,
    params?: Record<string, any>
  ): Promise<EntityActionResult> {
    switch (action) {
      case 'publish':
        return this.actionPublish(entityType, id);

      case 'unpublish':
        return this.actionUnpublish(entityType, id);

      case 'delete':
        return this.actionDelete(entityType, id);

      case 'archive':
        return this.actionArchive(entityType, id);

      case 'revalidate':
        return this.actionRevalidate(entityType, id, currentState);

      case 'regenerate_title':
        return this.actionRegenerateTitle(entityType, id, currentState);

      case 'reattach_image':
        return this.actionReattachImage(entityType, id, currentState);

      case 'mark_human_reviewed':
        return this.actionMarkHumanReviewed(entityType, id);

      case 'add_genre':
        return this.actionModifyGenre(entityType, id, params?.genre, 'add');

      case 'remove_genre':
        return this.actionModifyGenre(entityType, id, params?.genre, 'remove');

      case 'change_category':
        return this.actionChangeCategory(entityType, id, params?.category);

      default:
        return { id, success: false, error: `Unknown action: ${action}` };
    }
  }

  private async actionPublish(entityType: string, id: string): Promise<EntityActionResult> {
    const { error } = await supabase
      .from(entityType)
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      new_state: { status: 'published' },
    };
  }

  private async actionUnpublish(entityType: string, id: string): Promise<EntityActionResult> {
    const { error } = await supabase
      .from(entityType)
      .update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      new_state: { status: 'draft' },
    };
  }

  private async actionDelete(entityType: string, id: string): Promise<EntityActionResult> {
    const { error } = await supabase
      .from(entityType)
      .delete()
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
    };
  }

  private async actionArchive(entityType: string, id: string): Promise<EntityActionResult> {
    const { error } = await supabase
      .from(entityType)
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      new_state: { status: 'archived' },
    };
  }

  private async actionRevalidate(
    entityType: string,
    id: string,
    currentState: Record<string, any>
  ): Promise<EntityActionResult> {
    // Run validation
    const validation = await validateEntity({
      title_en: currentState.title || currentState.title_en || currentState.name_en,
      overview_en: currentState.telugu_body || currentState.overview_en,
      genres: currentState.genres || [],
      poster_url: currentState.image_url || currentState.poster_url,
      data_sources: currentState.data_sources || ['internal'],
    });

    // Apply auto-fixable suggestions
    const updates: Record<string, any> = {
      ai_confidence: validation.confidence,
      validation_issues: validation.issues,
      last_validated_at: new Date().toISOString(),
    };

    for (const fix of validation.suggested_fixes) {
      if (fix.auto_fixable && fix.suggested_value !== null) {
        updates[fix.field] = fix.suggested_value;
      }
    }

    const { error } = await supabase
      .from(entityType)
      .update(updates)
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      new_state: updates,
      changes_preview: validation.suggested_fixes.map(f =>
        `${f.field}: ${f.reason}`
      ),
    };
  }

  private async actionRegenerateTitle(
    entityType: string,
    id: string,
    currentState: Record<string, any>
  ): Promise<EntityActionResult> {
    // Use AI to generate a better title
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const content = currentState.telugu_body || currentState.overview_en || '';

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{
        role: 'user',
        content: `Generate a compelling Telugu title for this article. Return ONLY the title, nothing else.

Content: ${content.slice(0, 500)}

Current title: ${currentState.title || 'No title'}`
      }],
      temperature: 0.5,
      max_tokens: 100,
    });

    const newTitle = completion.choices[0]?.message?.content?.trim();

    if (!newTitle) {
      return { id, success: false, error: 'Failed to generate title' };
    }

    const { error } = await supabase
      .from(entityType)
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      previous_state: { title: currentState.title },
      new_state: { title: newTitle },
    };
  }

  private async actionReattachImage(
    entityType: string,
    id: string,
    currentState: Record<string, any>
  ): Promise<EntityActionResult> {
    // Use existing image fetcher
    const { fetchRelevantImage } = await import('../image-fetcher');

    const title = currentState.title || currentState.name_en || '';
    const content = currentState.telugu_body || currentState.overview_en || '';
    const category = currentState.category || 'entertainment';

    const image = await fetchRelevantImage(title, content, category);

    if (!image) {
      return { id, success: false, error: 'No suitable image found' };
    }

    const updateField = entityType === 'posts' ? 'image_url' :
                        entityType === 'movies' ? 'poster_url' : 'image_url';

    const { error } = await supabase
      .from(entityType)
      .update({
        [updateField]: image.url,
        image_source: image.source,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      previous_state: { [updateField]: currentState[updateField] },
      new_state: { [updateField]: image.url, image_source: image.source },
    };
  }

  private async actionMarkHumanReviewed(
    entityType: string,
    id: string
  ): Promise<EntityActionResult> {
    const { error } = await supabase
      .from(entityType)
      .update({
        needs_human_review: false,
        human_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      new_state: { needs_human_review: false },
    };
  }

  private async actionModifyGenre(
    entityType: string,
    id: string,
    genre: string,
    operation: 'add' | 'remove'
  ): Promise<EntityActionResult> {
    if (!genre) {
      return { id, success: false, error: 'Genre not specified' };
    }

    // Get current genres
    const { data } = await supabase
      .from(entityType)
      .select('genres')
      .eq('id', id)
      .single();

    let genres: string[] = data?.genres || [];

    if (operation === 'add') {
      if (!genres.includes(genre)) genres.push(genre);
    } else {
      genres = genres.filter(g => g !== genre);
    }

    const { error } = await supabase
      .from(entityType)
      .update({
        genres,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      new_state: { genres },
    };
  }

  private async actionChangeCategory(
    entityType: string,
    id: string,
    category: string
  ): Promise<EntityActionResult> {
    if (!category) {
      return { id, success: false, error: 'Category not specified' };
    }

    const { error } = await supabase
      .from(entityType)
      .update({
        category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      id,
      success: !error,
      error: error?.message,
      new_state: { category },
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async fetchCurrentStates(
    entityType: string,
    ids: string[]
  ): Promise<Record<string, any>[]> {
    const { data } = await supabase
      .from(entityType)
      .select('*')
      .in('id', ids);

    return data || [];
  }

  private async previewAction(
    action: BulkActionType,
    currentState: Record<string, any>,
    params?: Record<string, any>
  ): Promise<string[]> {
    const previews: string[] = [];

    switch (action) {
      case 'publish':
        previews.push(`Status: ${currentState.status || 'draft'} → published`);
        break;
      case 'unpublish':
        previews.push(`Status: ${currentState.status} → draft`);
        break;
      case 'delete':
        previews.push('⚠️ PERMANENT DELETION');
        break;
      case 'archive':
        previews.push(`Status: ${currentState.status} → archived`);
        break;
      case 'revalidate':
        previews.push('Will re-run AI validation and apply auto-fixes');
        break;
      case 'regenerate_title':
        previews.push(`Current title: "${currentState.title}"`);
        previews.push('Will generate new AI title');
        break;
      case 'reattach_image':
        previews.push(`Current image: ${currentState.image_url || 'None'}`);
        previews.push('Will fetch new relevant image');
        break;
      case 'add_genre':
        previews.push(`Add genre: ${params?.genre}`);
        break;
      case 'remove_genre':
        previews.push(`Remove genre: ${params?.genre}`);
        break;
      case 'change_category':
        previews.push(`Category: ${currentState.category} → ${params?.category}`);
        break;
    }

    return previews;
  }

  private async storeForUndo(
    request: BulkActionRequest,
    previousStates: Record<string, any>[]
  ): Promise<string> {
    const token = `undo_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const undoAction: UndoableAction = {
      token,
      action: request.action,
      entity_type: request.entity_type,
      states: previousStates.map(state => ({
        id: state.id,
        previous_state: state,
      })),
      executed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
    };

    this.undoStack.push(undoAction);

    // Keep only last 10 undo actions
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }

    return token;
  }
}

// ============================================================
// EXPORTS
// ============================================================

let executorInstance: BulkActionExecutor | null = null;

export function getBulkExecutor(): BulkActionExecutor {
  if (!executorInstance) {
    executorInstance = new BulkActionExecutor();
  }
  return executorInstance;
}

export async function executeBulkAction(
  request: BulkActionRequest
): Promise<BulkActionResult> {
  return getBulkExecutor().execute(request);
}

export async function undoBulkAction(undoToken: string): Promise<BulkActionResult> {
  return getBulkExecutor().undo(undoToken);
}
