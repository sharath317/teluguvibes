'use server';

/**
 * Admin Server Actions
 *
 * Next.js Server Actions for admin operations.
 * Reduces API route duplication and improves security.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// AUTH CHECK
// ============================================================

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

// ============================================================
// POST ACTIONS
// ============================================================

export async function publishPost(postId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to publish: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');
  revalidatePath('/admin/drafts');

  return { success: true };
}

export async function unpublishPost(postId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'draft',
      published_at: null,
    })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to unpublish: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');

  return { success: true };
}

export async function deletePost(postId: string) {
  await requireAdmin();

  const { error } = await supabase.from('posts').delete().eq('id', postId);

  if (error) {
    throw new Error(`Failed to delete: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');

  return { success: true };
}

export async function archivePost(postId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('posts')
    .update({ status: 'archived' })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to archive: ${error.message}`);
  }

  revalidatePath('/admin/posts');

  return { success: true };
}

// ============================================================
// BULK ACTIONS
// ============================================================

export async function bulkPublish(postIds: string[]) {
  await requireAdmin();

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .in('id', postIds);

  if (error) {
    throw new Error(`Failed to bulk publish: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');
  revalidatePath('/admin/drafts');

  return { success: true, count: postIds.length };
}

export async function bulkDelete(postIds: string[]) {
  await requireAdmin();

  const { error } = await supabase.from('posts').delete().in('id', postIds);

  if (error) {
    throw new Error(`Failed to bulk delete: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');

  return { success: true, count: postIds.length };
}

export async function bulkArchive(postIds: string[]) {
  await requireAdmin();

  const { error } = await supabase
    .from('posts')
    .update({ status: 'archived' })
    .in('id', postIds);

  if (error) {
    throw new Error(`Failed to bulk archive: ${error.message}`);
  }

  revalidatePath('/admin/posts');

  return { success: true, count: postIds.length };
}

// ============================================================
// DRAFT ACTIONS
// ============================================================

export async function approveDraft(draftId: string) {
  return publishPost(draftId);
}

export async function rejectDraft(draftId: string, reason?: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('posts')
    .update({
      status: 'rejected',
      rejection_reason: reason,
    })
    .eq('id', draftId);

  if (error) {
    throw new Error(`Failed to reject: ${error.message}`);
  }

  revalidatePath('/admin/drafts');

  return { success: true };
}

export async function deleteAllDrafts() {
  await requireAdmin();

  const { error, count } = await supabase
    .from('posts')
    .delete()
    .eq('status', 'draft');

  if (error) {
    throw new Error(`Failed to delete drafts: ${error.message}`);
  }

  revalidatePath('/admin/drafts');

  return { success: true, count };
}

// ============================================================
// REVIEW ACTIONS
// ============================================================

export async function approveReview(reviewId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('reviews')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) {
    throw new Error(`Failed to approve review: ${error.message}`);
  }

  revalidatePath('/reviews');
  revalidatePath('/admin/reviews');

  return { success: true };
}

export async function rejectReview(reviewId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('reviews')
    .update({ status: 'rejected' })
    .eq('id', reviewId);

  if (error) {
    throw new Error(`Failed to reject review: ${error.message}`);
  }

  revalidatePath('/admin/reviews');

  return { success: true };
}

// ============================================================
// CELEBRITY ACTIONS
// ============================================================

export async function updateCelebrity(
  celebrityId: string,
  data: {
    name_en?: string;
    name_te?: string;
    bio?: string;
    occupation?: string;
    birth_date?: string;
    death_date?: string;
    image_url?: string;
    social_links?: Record<string, string>;
  }
) {
  await requireAdmin();

  const { error } = await supabase
    .from('celebrities')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', celebrityId);

  if (error) {
    throw new Error(`Failed to update celebrity: ${error.message}`);
  }

  revalidatePath('/admin/celebrities');
  revalidatePath(`/celebrity/${celebrityId}`);

  return { success: true };
}

export async function deleteCelebrity(celebrityId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('celebrities')
    .delete()
    .eq('id', celebrityId);

  if (error) {
    throw new Error(`Failed to delete celebrity: ${error.message}`);
  }

  revalidatePath('/admin/celebrities');

  return { success: true };
}

// ============================================================
// MEDIA ACTIONS
// ============================================================

export async function approveMedia(mediaId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('media_posts')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', mediaId);

  if (error) {
    throw new Error(`Failed to approve media: ${error.message}`);
  }

  revalidatePath('/hot');
  revalidatePath('/admin/media');

  return { success: true };
}

export async function deleteMedia(mediaId: string) {
  await requireAdmin();

  const { error } = await supabase.from('media_posts').delete().eq('id', mediaId);

  if (error) {
    throw new Error(`Failed to delete media: ${error.message}`);
  }

  revalidatePath('/hot');
  revalidatePath('/admin/media');

  return { success: true };
}

// ============================================================
// DEDICATION ACTIONS
// ============================================================

export async function approveDedication(dedicationId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('dedications')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', dedicationId);

  if (error) {
    throw new Error(`Failed to approve dedication: ${error.message}`);
  }

  revalidatePath('/admin/dedications');

  return { success: true };
}

export async function deleteDedication(dedicationId: string) {
  await requireAdmin();

  const { error } = await supabase
    .from('dedications')
    .delete()
    .eq('id', dedicationId);

  if (error) {
    throw new Error(`Failed to delete dedication: ${error.message}`);
  }

  revalidatePath('/admin/dedications');

  return { success: true };
}

// ============================================================
// CONTENT REGENERATION
// ============================================================

export async function regeneratePostContent(postId: string) {
  await requireAdmin();

  // Get the post
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    throw new Error('Post not found');
  }

  // Mark for regeneration
  const { error } = await supabase
    .from('posts')
    .update({
      needs_regeneration: true,
      regeneration_requested_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to mark for regeneration: ${error.message}`);
  }

  revalidatePath('/admin/posts');

  return { success: true, message: 'Post marked for regeneration' };
}

// ============================================================
// HUMAN POV ACTIONS
// ============================================================

export async function addHumanPOV(
  postId: string,
  pov: string,
  category: 'trivia' | 'cultural' | 'opinion' | 'industry'
) {
  const user = await requireAdmin();

  // Insert POV
  const { error: povError } = await supabase.from('human_pov').insert({
    post_id: postId,
    text: pov,
    category,
    editor_id: user.email,
    created_at: new Date().toISOString(),
  });

  if (povError) {
    throw new Error(`Failed to add POV: ${povError.message}`);
  }

  // Update post
  const { error: postError } = await supabase
    .from('posts')
    .update({
      has_human_pov: true,
      human_pov: pov,
    })
    .eq('id', postId);

  if (postError) {
    throw new Error(`Failed to update post: ${postError.message}`);
  }

  revalidatePath('/admin/posts');
  revalidatePath(`/post/${postId}`);

  return { success: true };
}

// ============================================================
// STATS
// ============================================================

export async function getAdminStats() {
  await requireAdmin();

  const [postsResult, reviewsResult, mediaResult, celebritiesResult] =
    await Promise.all([
      supabase
        .from('posts')
        .select('status', { count: 'exact', head: true })
        .eq('status', 'draft'),
      supabase
        .from('reviews')
        .select('status', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('media_posts')
        .select('status', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('celebrities')
        .select('id', { count: 'exact', head: true }),
    ]);

  return {
    pendingDrafts: postsResult.count || 0,
    pendingReviews: reviewsResult.count || 0,
    pendingMedia: mediaResult.count || 0,
    totalCelebrities: celebritiesResult.count || 0,
  };
}
