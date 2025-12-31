// Hot Media API - CRUD operations for glamour content
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for fetching all data (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}
import { fetchMediaFromUrl, validateUrl } from '@/lib/hot-media/embed-validator';
import { analyzeGlamContent, suggestCategory, suggestTags } from '@/lib/hot-media/ai-caption-generator';
import { checkContentSafety, getSafetyBadge } from '@/lib/hot-media/safety-checker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch hot media with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'approved';
  const entityId = searchParams.get('entity_id');
  const platform = searchParams.get('platform');
  const featured = searchParams.get('featured');
  const hot = searchParams.get('hot');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 500);
  const offset = parseInt(searchParams.get('offset') || '0');
  const sortBy = searchParams.get('sort') || 'trending_score';
  const sortOrder = searchParams.get('order') || 'desc';
  
  try {
    const supabase = getSupabase();
    
    let query = supabase
      .from('hot_media')
      .select('*, media_entities(name_en, name_te, entity_type, instagram_handle, profile_image)')
      .eq('is_blocked', false);
    
    // Apply filters
    if (status && status !== 'all') query = query.eq('status', status);
    if (category && category !== 'all') query = query.eq('category', category);
    if (entityId) query = query.eq('entity_id', entityId);
    if (platform) query = query.eq('platform', platform);
    if (featured === 'true') query = query.eq('is_featured', true);
    if (hot === 'true') query = query.eq('is_hot', true);
    
    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching hot media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      media: data || [],
      total: count || data?.length || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Hot media GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new hot media from URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, entity_id, entity_name, category, caption_override, is_featured, is_hot } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Validate and fetch embed data
    const validation = validateUrl(url);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    const mediaResult = await fetchMediaFromUrl(url);
    if (!mediaResult.success) {
      return NextResponse.json({ error: mediaResult.error || 'Failed to fetch media' }, { status: 400 });
    }
    
    // Get entity info if entity_id provided
    let entityInfo = { name: entity_name || 'Celebrity', type: 'actress' };
    if (entity_id) {
      const supabase = getSupabase();
      const { data: entity } = await supabase
        .from('media_entities')
        .select('name_en, entity_type')
        .eq('id', entity_id)
        .single();
      
      if (entity) {
        entityInfo = { name: entity.name_en, type: entity.entity_type };
      }
    }
    
    // AI analysis
    const analysis = await analyzeGlamContent({
      url,
      text: mediaResult.title || caption_override || '',
      entityName: entityInfo.name,
      entityType: entityInfo.type,
      platform: validation.platform,
    });
    
    // Determine status based on safety
    let status = 'pending';
    if (analysis.safety.risk === 'blocked') {
      status = 'rejected';
    } else if (analysis.safety.autoApproveEligible) {
      status = 'approved';
    }
    
    // Prepare media record
    const mediaRecord = {
      entity_id: entity_id || null,
      entity_name: entityInfo.name,
      entity_type: entityInfo.type,
      platform: validation.platform,
      source_url: validation.cleanUrl,
      embed_url: validation.cleanUrl,
      embed_html: mediaResult.embed_html,
      thumbnail_url: mediaResult.thumbnail_url,
      license_source: `${validation.platform}_embed`,
      license_type: 'platform-embed',
      category: category || analysis.suggestedCategory,
      tags: suggestTags(mediaResult.title || '', analysis.suggestedCategory, entityInfo.name),
      ai_caption_variants: analysis.captions,
      selected_caption: caption_override || analysis.captions[0]?.text || '',
      detected_emotion: analysis.audienceEmotion,
      content_angle: analysis.glamAngle,
      confidence_score: Math.round(analysis.confidence * 100),
      safety_risk: analysis.safety.risk === 'blocked' ? 'high' : analysis.safety.risk === 'medium' ? 'medium' : 'low',
      requires_review: analysis.safety.requiresReview,
      is_blocked: analysis.safety.risk === 'blocked',
      block_reason: analysis.safety.blockedReason,
      is_featured: is_featured || false,
      is_hot: is_hot || false,
      status,
    };
    
    // Insert into database
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('hot_media')
      .insert(mediaRecord)
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting hot media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      media: data,
      analysis: {
        captions: analysis.captions,
        suggestedCategory: analysis.suggestedCategory,
        suggestedTags: analysis.captions,
        safety: {
          ...analysis.safety,
          badge: getSafetyBadge(analysis.safety.risk),
        },
      },
    });
  } catch (error) {
    console.error('Hot media POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

