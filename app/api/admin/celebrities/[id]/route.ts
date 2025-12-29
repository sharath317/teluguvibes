/**
 * Individual Celebrity API
 * GET, PUT, DELETE operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get single celebrity with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Fetch celebrity
    const { data: celebrity, error: celebError } = await supabase
      .from('celebrities')
      .select('*')
      .eq('id', id)
      .single();

    if (celebError) throw celebError;
    if (!celebrity) {
      return NextResponse.json({ error: 'Celebrity not found' }, { status: 404 });
    }

    // Fetch works
    const { data: works } = await supabase
      .from('celebrity_works')
      .select('*')
      .eq('celebrity_id', id)
      .order('release_date', { ascending: false });

    // Fetch events
    const { data: events } = await supabase
      .from('celebrity_events')
      .select('*')
      .eq('celebrity_id', id)
      .order('event_month', { ascending: true });

    // Fetch historic posts
    const { data: historicPosts } = await supabase
      .from('historic_posts')
      .select('*, post:posts(id, title, status, views)')
      .eq('celebrity_id', id)
      .order('event_year', { ascending: false });

    return NextResponse.json({
      celebrity,
      works: works || [],
      events: events || [],
      historicPosts: historicPosts || [],
    });
  } catch (error) {
    console.error('Error fetching celebrity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch celebrity' },
      { status: 500 }
    );
  }
}

// PUT: Update celebrity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();

    // Helper to convert empty strings to null
    const toNull = (val: any) => (val === '' || val === undefined) ? null : val;

    const updateData = {
      name_en: body.name_en,
      name_te: toNull(body.name_te),
      gender: body.gender,
      birth_date: toNull(body.birth_date),
      death_date: toNull(body.death_date),
      birth_place: toNull(body.birth_place),
      occupation: body.occupation || [],
      short_bio: toNull(body.short_bio),
      short_bio_te: toNull(body.short_bio_te),
      wikidata_id: toNull(body.wikidata_id),
      tmdb_id: toNull(body.tmdb_id),
      imdb_id: toNull(body.imdb_id),
      profile_image: toNull(body.profile_image),
      popularity_score: body.popularity_score ?? 50,
      is_verified: body.is_verified ?? false,
      is_active: body.is_active ?? true,
    };

    console.log('Updating celebrity:', id, updateData);

    const { data, error } = await supabase
      .from('celebrities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    // Regenerate events if dates changed
    if (updateData.birth_date || updateData.death_date) {
      await supabase.rpc('generate_celebrity_events', { p_celebrity_id: id });
    }

    return NextResponse.json({ celebrity: data });
  } catch (error) {
    console.error('Error updating celebrity:', error);
    return NextResponse.json(
      { error: 'Failed to update celebrity', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete celebrity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { error } = await supabase
      .from('celebrities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting celebrity:', error);
    return NextResponse.json(
      { error: 'Failed to delete celebrity' },
      { status: 500 }
    );
  }
}
