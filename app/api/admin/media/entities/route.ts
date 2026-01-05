/**
 * Media Entities API
 * CRUD operations for actresses, anchors, influencers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all media entities
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('media_entities')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('popularity_score', { ascending: false });

  if (type && type !== 'all') {
    query = query.eq('entity_type', type);
  }

  if (search) {
    query = query.or(`name_en.ilike.%${search}%,name_te.ilike.%${search}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching entities:', error);
    return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
  }

  return NextResponse.json({
    entities: data,
    total: count,
    limit,
    offset,
  });
}

// POST: Create new media entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('media_entities')
      .insert({
        name_en: body.name_en,
        name_te: body.name_te || null,
        entity_type: body.entity_type,
        instagram_handle: body.instagram_handle || null,
        youtube_channel_id: body.youtube_channel_id || null,
        twitter_handle: body.twitter_handle || null,
        profile_image: body.profile_image || null,
        popularity_score: body.popularity_score || 50,
        is_verified: body.is_verified || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating entity:', error);
      return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 });
    }

    return NextResponse.json({ entity: data });
  } catch (error) {
    console.error('Create entity error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}








