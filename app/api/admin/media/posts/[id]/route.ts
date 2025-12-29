/**
 * Individual Media Post API
 * GET, PUT, DELETE operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('media_posts')
    .select(`
      *,
      entity:media_entities(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}

// PUT: Update post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const toNull = (val: any) => (val === '' || val === undefined) ? null : val;

  const { data, error } = await supabase
    .from('media_posts')
    .update({
      entity_id: toNull(body.entity_id),
      title: toNull(body.title),
      caption: toNull(body.caption),
      caption_te: toNull(body.caption_te),
      tags: body.tags || [],
      category: body.category || 'general',
      status: body.status,
      is_featured: body.is_featured ?? false,
      is_hot: body.is_hot ?? false,
      featured_order: body.featured_order,
      moderation_notes: toNull(body.moderation_notes),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}

// DELETE: Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from('media_posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
