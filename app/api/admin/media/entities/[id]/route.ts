/**
 * Individual Entity API
 * GET, PUT, DELETE operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get single entity with stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('media_entities')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  // Get post count
  const { count } = await supabase
    .from('media_posts')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', id);

  return NextResponse.json({
    entity: data,
    post_count: count || 0,
  });
}

// PUT: Update entity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const toNull = (val: any) => (val === '' || val === undefined) ? null : val;

  const { data, error } = await supabase
    .from('media_entities')
    .update({
      name_en: body.name_en,
      name_te: toNull(body.name_te),
      entity_type: body.entity_type,
      instagram_handle: toNull(body.instagram_handle),
      youtube_channel_id: toNull(body.youtube_channel_id),
      twitter_handle: toNull(body.twitter_handle),
      facebook_page: toNull(body.facebook_page),
      profile_image: toNull(body.profile_image),
      cover_image: toNull(body.cover_image),
      popularity_score: body.popularity_score ?? 50,
      is_verified: body.is_verified ?? false,
      is_active: body.is_active ?? true,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 });
  }

  return NextResponse.json({ entity: data });
}

// DELETE: Delete entity (cascades to posts)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from('media_entities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete entity' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
