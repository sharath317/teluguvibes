// Hot Media API - Single item operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSafetyBadge } from '@/lib/hot-media/safety-checker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch single hot media item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('hot_media')
      .select('*, media_entities(name_en, name_te, entity_type, instagram_handle, profile_image)')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      media: data,
    });
  } catch (error) {
    console.error('Hot media GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update hot media item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const {
      category,
      selected_caption,
      caption_te,
      tags,
      is_featured,
      is_hot,
      status,
      moderation_notes,
      display_order,
    } = body;
    
    const updateData: Record<string, unknown> = {};
    
    if (category !== undefined) updateData.category = category;
    if (selected_caption !== undefined) updateData.selected_caption = selected_caption;
    if (caption_te !== undefined) updateData.caption_te = caption_te;
    if (tags !== undefined) updateData.tags = tags;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (is_hot !== undefined) updateData.is_hot = is_hot;
    if (status !== undefined) updateData.status = status;
    if (moderation_notes !== undefined) updateData.moderation_notes = moderation_notes;
    if (display_order !== undefined) updateData.display_order = display_order;
    
    // If approving, set published_at
    if (status === 'approved') {
      updateData.published_at = new Date().toISOString();
    }
    
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('hot_media')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating hot media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      media: data,
    });
  } catch (error) {
    console.error('Hot media PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete hot media item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('hot_media')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting hot media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error('Hot media DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

