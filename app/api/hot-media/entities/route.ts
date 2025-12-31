// Hot Media Entities API - Fetch actresses, anchors, influencers
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch media entities
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const entityType = searchParams.get('type'); // actress, anchor, influencer, model
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const verified = searchParams.get('verified');
  
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('media_entities')
      .select('*')
      .eq('is_active', true)
      .order('popularity_score', { ascending: false });
    
    if (entityType) query = query.eq('entity_type', entityType);
    if (verified === 'true') query = query.eq('is_verified', true);
    if (search) {
      query = query.or(`name_en.ilike.%${search}%,name_te.ilike.%${search}%,instagram_handle.ilike.%${search}%`);
    }
    
    query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching entities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      entities: data || [],
    });
  } catch (error) {
    console.error('Entities GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

