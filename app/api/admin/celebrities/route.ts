/**
 * Celebrity Management API
 * CRUD operations for celebrities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List all celebrities
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search');
  const verified = searchParams.get('verified');

  try {
    let query = supabase
      .from('celebrities')
      .select('*', { count: 'exact' })
      .order('popularity_score', { ascending: false });

    // Search filter
    if (search) {
      query = query.or(`name_en.ilike.%${search}%,name_te.ilike.%${search}%`);
    }

    // Verified filter
    if (verified === 'true') {
      query = query.eq('is_verified', true);
    } else if (verified === 'false') {
      query = query.eq('is_verified', false);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      celebrities: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching celebrities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch celebrities' },
      { status: 500 }
    );
  }
}

// POST: Create new celebrity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name_en) {
      return NextResponse.json(
        { error: 'name_en is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('celebrities')
      .insert({
        name_en: body.name_en,
        name_te: body.name_te,
        gender: body.gender,
        birth_date: body.birth_date,
        death_date: body.death_date,
        birth_place: body.birth_place,
        occupation: body.occupation || [],
        short_bio: body.short_bio,
        short_bio_te: body.short_bio_te,
        wikidata_id: body.wikidata_id,
        tmdb_id: body.tmdb_id,
        imdb_id: body.imdb_id,
        profile_image: body.profile_image,
        popularity_score: body.popularity_score || 50,
        is_verified: body.is_verified || false,
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-generate events for the new celebrity
    await supabase.rpc('generate_celebrity_events', { p_celebrity_id: data.id });

    return NextResponse.json({ celebrity: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating celebrity:', error);
    return NextResponse.json(
      { error: 'Failed to create celebrity' },
      { status: 500 }
    );
  }
}








