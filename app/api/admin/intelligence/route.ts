/**
 * ADMIN INTELLIGENCE API
 *
 * Endpoints for running intelligence pipeline operations from admin UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processAndValidate } from '@/lib/intelligence/pipeline';
import { generateVariants } from '@/lib/intelligence/synthesis-engine';
import { getImageOptions, selectBestImage } from '@/lib/intelligence/image-intelligence';
import { validateEntity } from '@/lib/intelligence/validator';
import type { NormalizedEntity } from '@/lib/intelligence/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/intelligence
 *
 * Actions:
 * - validate: Validate a single post
 * - regenerate: Regenerate content for a post
 * - variants: Generate variants for a post
 * - images: Fetch new image options
 * - apply: Apply selected variant/image
 * - bulk_approve: Bulk approve READY posts
 * - bulk_delete: Bulk delete posts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, postId, postIds, variantId, imageUrl } = body;

    switch (action) {
      case 'validate':
        return await handleValidate(postId);

      case 'regenerate':
        return await handleRegenerate(postId);

      case 'variants':
        return await handleVariants(postId);

      case 'images':
        return await handleImages(postId);

      case 'apply':
        return await handleApply(postId, variantId, imageUrl);

      case 'bulk_approve':
        return await handleBulkApprove(postIds);

      case 'bulk_delete':
        return await handleBulkDelete(postIds);

      case 'rerun_intelligence':
        return await handleRerunIntelligence(postId);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Intelligence API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * Validate a single post
 */
async function handleValidate(postId: string) {
  const entity = await processAndValidate(postId);

  if (!entity) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Update post status in database
  await supabase
    .from('posts')
    .update({
      status: entity.status.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  return NextResponse.json({
    success: true,
    validation: entity.validationResult,
    status: entity.status,
  });
}

/**
 * Regenerate content for a post
 */
async function handleRegenerate(postId: string) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Generate new content
  const entity = await processAndValidate(postId);

  if (!entity) {
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 });
  }

  // Update post with new content
  await supabase
    .from('posts')
    .update({
      title_te: entity.title_te,
      body_te: entity.body_te,
      excerpt: entity.excerpt,
      image_url: entity.imageUrl,
      status: entity.status.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  return NextResponse.json({
    success: true,
    entity,
  });
}

/**
 * Generate content variants
 */
async function handleVariants(postId: string) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const variants = await generateVariants({
    topic: post.title,
    entityType: 'post',
    category: post.category,
  }, 3);

  return NextResponse.json({
    success: true,
    variants,
  });
}

/**
 * Fetch new image options
 */
async function handleImages(postId: string) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const images = await getImageOptions({
    topic: post.title,
    entityType: 'post',
    category: post.category,
  }, 5);

  return NextResponse.json({
    success: true,
    images,
  });
}

/**
 * Apply selected variant and image
 */
async function handleApply(postId: string, variantId: string, imageUrl: string) {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (imageUrl) {
    updates.image_url = imageUrl;
  }

  // If variantId is provided, we would look up the variant content
  // For now, just update the image

  await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId);

  return NextResponse.json({ success: true });
}

/**
 * Bulk approve READY posts
 */
async function handleBulkApprove(postIds: string[]) {
  if (!postIds || postIds.length === 0) {
    return NextResponse.json({ error: 'No posts specified' }, { status: 400 });
  }

  // Only approve posts that are READY
  const { data: posts } = await supabase
    .from('posts')
    .select('id, status')
    .in('id', postIds);

  const readyPosts = posts?.filter(p =>
    p.status === 'READY' || p.status === 'ready' || p.status === 'draft'
  ) || [];

  if (readyPosts.length === 0) {
    return NextResponse.json({
      error: 'No posts eligible for approval',
      message: 'Only READY or draft posts can be approved'
    }, { status: 400 });
  }

  await supabase
    .from('posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', readyPosts.map(p => p.id));

  return NextResponse.json({
    success: true,
    approved: readyPosts.length,
    skipped: postIds.length - readyPosts.length,
  });
}

/**
 * Bulk delete posts
 */
async function handleBulkDelete(postIds: string[]) {
  if (!postIds || postIds.length === 0) {
    return NextResponse.json({ error: 'No posts specified' }, { status: 400 });
  }

  await supabase
    .from('posts')
    .delete()
    .in('id', postIds);

  return NextResponse.json({
    success: true,
    deleted: postIds.length,
  });
}

/**
 * Re-run intelligence pipeline on a single post
 */
async function handleRerunIntelligence(postId: string) {
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Build entity
  const entity: NormalizedEntity = {
    id: post.id,
    slug: post.slug,
    entityType: 'post',
    title_en: post.title,
    title_te: post.title_te,
    excerpt: post.excerpt,
    body_te: post.telugu_body || post.body_te,
    imageUrl: post.image_url,
    category: post.category,
    status: 'DRAFT',
    sources: [{ source: 'internal', sourceId: post.id, confidence: 1, fetchedAt: new Date().toISOString() }],
  };

  // Get new image
  const imageResult = await selectBestImage({
    topic: entity.title_en,
    entityType: 'post',
    category: entity.category,
  });

  if (imageResult.selectedImage) {
    entity.imageUrl = imageResult.selectedImage.url;
    entity.imageSource = imageResult.selectedImage.source;
    entity.imageCandidates = imageResult.candidates;
  }

  // Validate
  const validation = validateEntity(entity);
  entity.validationResult = validation;
  entity.status = validation.status;

  // Generate variants if not ready
  if (validation.status !== 'READY') {
    entity.variants = await generateVariants({
      topic: entity.title_en,
      entityType: 'post',
      category: entity.category,
    }, 3);
  }

  // Update database
  await supabase
    .from('posts')
    .update({
      image_url: entity.imageUrl,
      status: entity.status.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  return NextResponse.json({
    success: true,
    entity,
    validation,
    hasVariants: (entity.variants?.length || 0) > 0,
    imageOptions: entity.imageCandidates?.length || 0,
  });
}
