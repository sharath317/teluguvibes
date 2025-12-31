/**
 * Media Posts API
 * CRUD for photos, embeds, social media content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchMediaEmbed, detectPlatform } from '@/lib/media/embed-fetcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List media posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'approved';
  const type = searchParams.get('type');
  const category = searchParams.get('category');
  const entityId = searchParams.get('entity_id');
  const featured = searchParams.get('featured');
  const hot = searchParams.get('hot');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('media_posts')
    .select(`
      *,
      entity:media_entities(id, name_en, name_te, entity_type, profile_image)
    `, { count: 'exact' })
    .order('trending_score', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (type && type !== 'all') {
    // Support multiple types (comma-separated)
    const types = type.split(',').map(t => t.trim());
    if (types.length > 1) {
      query = query.in('media_type', types);
    } else {
      query = query.eq('media_type', types[0]);
    }
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  if (featured === 'true') {
    query = query.eq('is_featured', true).order('featured_order', { ascending: true });
  }

  if (hot === 'true') {
    query = query.eq('is_hot', true);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }

  return NextResponse.json({
    posts: data,
    total: count,
    limit,
    offset,
  });
}

// POST: Create new media post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_url, entity_id, category, caption, tags } = body;

    // Detect platform and fetch embed if it's a social URL
    const { platform, mediaType } = detectPlatform(source_url);

    let embedData = null;
    let source = body.source || 'official_website';
    let thumbnail_url = body.thumbnail_url;
    let image_url = body.image_url;
    let embed_html = body.embed_html;

    if (platform !== 'unknown') {
      // It's a social media URL - fetch embed
      embedData = await fetchMediaEmbed(source_url);

      if (embedData.success) {
        embed_html = embedData.embed_html;
        thumbnail_url = embedData.thumbnail_url || thumbnail_url;
        source = embedData.source;
      }
    }

    const { data, error } = await supabase
      .from('media_posts')
      .insert({
        entity_id: entity_id || null,
        media_type: mediaType,
        source,
        source_url,
        source_license: body.source_license || 'embed-allowed',
        embed_html,
        image_url,
        thumbnail_url,
        title: body.title || embedData?.title,
        caption,
        caption_te: body.caption_te,
        tags: tags || [],
        category: category || 'general',
        status: 'pending',
        is_featured: false,
        is_hot: false,
      })
      .select(`
        *,
        entity:media_entities(id, name_en, entity_type)
      `)
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
