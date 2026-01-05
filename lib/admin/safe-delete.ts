/**
 * SAFE DELETE MODULE
 *
 * Deletes content while preserving:
 * - Analytics data
 * - Learning data
 * - Performance metrics
 *
 * Content is archived, not destroyed.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface SafeDeleteOptions {
  olderThan?: Date;
  status?: string | string[];
  category?: string;
  preserveAnalytics?: boolean;
  preserveLearnings?: boolean;
  dryRun?: boolean;
}

export interface SafeDeleteResult {
  success: boolean;
  deletedCount: number;
  archivedCount: number;
  analyticsPreserved: number;
  learningsPreserved: number;
  errors: string[];
  deletedIds: string[];
  undoToken?: string;
}

export interface SafeResetOptions {
  preserveAnalytics: boolean;
  preserveLearnings: boolean;
  useLearningsForRebuild: boolean;
  dryRun: boolean;
}

export interface SafeResetResult {
  deletedCount: number;
  archivedCount: number;
  learningsApplied: number;
  readyToRebuild: boolean;
  errors: string[];
}

// ============================================================
// SAFE DELETE FUNCTIONS
// ============================================================

/**
 * Safely delete posts with analytics preservation
 */
export async function safeDeletePosts(
  options: SafeDeleteOptions
): Promise<SafeDeleteResult> {
  const result: SafeDeleteResult = {
    success: false,
    deletedCount: 0,
    archivedCount: 0,
    analyticsPreserved: 0,
    learningsPreserved: 0,
    errors: [],
    deletedIds: [],
  };

  const preserveAnalytics = options.preserveAnalytics ?? true;
  const preserveLearnings = options.preserveLearnings ?? true;

  try {
    // Build query
    let query = supabase.from('posts').select('id, title, category, status, created_at');

    if (options.olderThan) {
      query = query.lt('created_at', options.olderThan.toISOString());
    }

    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    const { data: postsToDelete, error: fetchError } = await query;

    if (fetchError) {
      result.errors.push(`Fetch error: ${fetchError.message}`);
      return result;
    }

    if (!postsToDelete || postsToDelete.length === 0) {
      result.success = true;
      return result;
    }

    const postIds = postsToDelete.map(p => p.id);
    result.deletedIds = postIds;

    // DRY RUN - just return what would be deleted
    if (options.dryRun) {
      result.success = true;
      result.deletedCount = postIds.length;
      return result;
    }

    // Step 1: Archive posts (copy to archive table or mark as archived)
    console.log(`Archiving ${postIds.length} posts...`);

    // Get full post data for archive
    const { data: fullPosts } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);

    if (fullPosts && fullPosts.length > 0) {
      // Insert into archive table
      const archiveData = fullPosts.map(p => ({
        ...p,
        original_id: p.id,
        archived_at: new Date().toISOString(),
        archive_reason: 'safe_delete',
      }));

      // Remove id to let archive table generate new one
      archiveData.forEach(a => delete (a as any).id);

      const { error: archiveError } = await supabase
        .from('archived_posts')
        .insert(archiveData);

      if (archiveError) {
        // Archive table might not exist, try alternative
        console.warn('Archive table insert failed, marking as archived instead');
        
        await supabase
          .from('posts')
          .update({ 
            status: 'archived',
            archived_at: new Date().toISOString(),
          })
          .in('id', postIds);
        
        result.archivedCount = postIds.length;
      } else {
        result.archivedCount = fullPosts.length;
      }
    }

    // Step 2: Preserve analytics if requested
    if (preserveAnalytics) {
      // Keep analytics references by marking posts as deleted but not removing
      const { data: analyticsData } = await supabase
        .from('content_performance')
        .select('id')
        .in('post_id', postIds);

      result.analyticsPreserved = analyticsData?.length || 0;
      console.log(`Preserved ${result.analyticsPreserved} analytics records`);
    }

    // Step 3: Preserve learnings if requested
    if (preserveLearnings) {
      // AI learnings are not post-specific, so just count them
      const { count: learningsCount } = await supabase
        .from('ai_learnings')
        .select('*', { count: 'exact', head: true });

      result.learningsPreserved = learningsCount || 0;
      console.log(`Preserved ${result.learningsPreserved} AI learnings`);
    }

    // Step 4: Remove from main posts table (if not using archive approach)
    if (result.archivedCount === postIds.length) {
      // Already archived above, now delete from main
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .in('id', postIds)
        .neq('status', 'archived'); // Don't delete archived ones

      if (deleteError) {
        result.errors.push(`Delete error: ${deleteError.message}`);
      } else {
        result.deletedCount = postIds.length - result.archivedCount;
      }
    }

    // Generate undo token
    result.undoToken = Buffer.from(JSON.stringify({
      ids: postIds,
      timestamp: Date.now(),
      expires: Date.now() + 30 * 60 * 1000, // 30 minutes
    })).toString('base64');

    result.success = true;
  } catch (error) {
    result.errors.push(`Exception: ${String(error)}`);
  }

  return result;
}

/**
 * Safe reset - clears content but preserves intelligence
 */
export async function safeReset(
  options: SafeResetOptions
): Promise<SafeResetResult> {
  const result: SafeResetResult = {
    deletedCount: 0,
    archivedCount: 0,
    learningsApplied: 0,
    readyToRebuild: false,
    errors: [],
  };

  console.log('\n🔄 SAFE RESET MODE');
  console.log('='.repeat(50));

  try {
    if (options.dryRun) {
      console.log('⚠️  DRY RUN - No changes will be made\n');
    }

    // Step 1: Count what will be affected
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'archived');

    console.log(`Total posts to archive: ${totalPosts}`);

    if (options.dryRun) {
      result.deletedCount = totalPosts || 0;
      result.readyToRebuild = true;
      return result;
    }

    // Step 2: Archive all non-archived posts
    if (options.preserveAnalytics) {
      console.log('📊 Preserving analytics data...');
      
      // Move to archive with status change
      const { error: archiveError } = await supabase
        .from('posts')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archive_reason: 'safe_reset',
        })
        .neq('status', 'archived');

      if (archiveError) {
        result.errors.push(`Archive error: ${archiveError.message}`);
      } else {
        result.archivedCount = totalPosts || 0;
      }
    } else {
      // Delete outright
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .neq('status', 'archived');

      if (deleteError) {
        result.errors.push(`Delete error: ${deleteError.message}`);
      } else {
        result.deletedCount = totalPosts || 0;
      }
    }

    // Step 3: Count preserved learnings
    if (options.preserveLearnings) {
      const { count: learnings } = await supabase
        .from('ai_learnings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      console.log(`✅ Preserved ${learnings || 0} AI learnings`);
      
      if (options.useLearningsForRebuild) {
        result.learningsApplied = learnings || 0;
      }
    }

    // Step 4: Log reset event
    await supabase.from('system_events').insert({
      event_type: 'safe_reset',
      event_data: {
        archived: result.archivedCount,
        deleted: result.deletedCount,
        learnings_preserved: options.preserveLearnings,
        analytics_preserved: options.preserveAnalytics,
      },
      created_at: new Date().toISOString(),
    }).catch(() => {
      // system_events table might not exist
    });

    result.readyToRebuild = result.errors.length === 0;

    console.log('\n📊 RESET SUMMARY');
    console.log('-'.repeat(50));
    console.log(`Archived: ${result.archivedCount}`);
    console.log(`Deleted: ${result.deletedCount}`);
    console.log(`Learnings available: ${result.learningsApplied}`);
    console.log(`Ready to rebuild: ${result.readyToRebuild ? 'YES' : 'NO'}`);

  } catch (error) {
    result.errors.push(`Exception: ${String(error)}`);
  }

  return result;
}

/**
 * Undo a safe delete operation
 */
export async function undoSafeDelete(undoToken: string): Promise<{
  success: boolean;
  restoredCount: number;
  error?: string;
}> {
  try {
    const tokenData = JSON.parse(Buffer.from(undoToken, 'base64').toString());

    if (Date.now() > tokenData.expires) {
      return { success: false, restoredCount: 0, error: 'Undo token expired' };
    }

    const { ids } = tokenData;

    // Restore from archive
    const { data: archived } = await supabase
      .from('archived_posts')
      .select('*')
      .in('original_id', ids);

    if (!archived || archived.length === 0) {
      // Try un-archiving from main table
      const { error } = await supabase
        .from('posts')
        .update({ status: 'draft', archived_at: null })
        .in('id', ids)
        .eq('status', 'archived');

      if (error) {
        return { success: false, restoredCount: 0, error: error.message };
      }

      return { success: true, restoredCount: ids.length };
    }

    // Restore archived posts
    for (const post of archived) {
      const { original_id, archived_at, archive_reason, ...postData } = post;
      
      await supabase
        .from('posts')
        .upsert({
          ...postData,
          id: original_id,
          status: 'draft',
        });
    }

    // Remove from archive
    await supabase
      .from('archived_posts')
      .delete()
      .in('original_id', ids);

    return { success: true, restoredCount: archived.length };
  } catch (error) {
    return { success: false, restoredCount: 0, error: String(error) };
  }
}

/**
 * Get deletion candidates without deleting
 */
export async function getDeletionCandidates(
  options: Omit<SafeDeleteOptions, 'dryRun'>
): Promise<{
  count: number;
  posts: Array<{ id: string; title: string; status: string; created_at: string }>;
}> {
  let query = supabase.from('posts').select('id, title, status, created_at');

  if (options.olderThan) {
    query = query.lt('created_at', options.olderThan.toISOString());
  }

  if (options.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status);
    } else {
      query = query.eq('status', options.status);
    }
  }

  if (options.category) {
    query = query.eq('category', options.category);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    return { count: 0, posts: [] };
  }

  return {
    count: data?.length || 0,
    posts: data || [],
  };
}






