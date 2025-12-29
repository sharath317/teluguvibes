/**
 * Dedications API
 * Public: Get active dedications
 * POST: Submit new dedication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get active dedications
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const type = searchParams.get('type');

  let query = supabase
    .from('dedications')
    .select('*')
    .eq('status', 'approved')
    .gt('expires_at', new Date().toISOString())
    .order('is_premium', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type && type !== 'all') {
    query = query.eq('dedication_type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching dedications:', error);
    return NextResponse.json({ error: 'Failed to fetch dedications' }, { status: 500 });
  }

  return NextResponse.json({ dedications: data || [] });
}

// POST: Submit new dedication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.from_name || !body.to_name || !body.message || !body.dedication_type) {
      return NextResponse.json(
        { error: 'Missing required fields: from_name, to_name, message, dedication_type' },
        { status: 400 }
      );
    }

    // Validate message length
    if (body.message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Basic profanity check (simple version)
    const badWords = ['abuse', 'hate', 'kill']; // Extend this list
    const hasProhibited = badWords.some(word =>
      body.message.toLowerCase().includes(word) ||
      body.to_name.toLowerCase().includes(word)
    );

    if (hasProhibited) {
      return NextResponse.json(
        { error: 'Message contains prohibited content' },
        { status: 400 }
      );
    }

    // Calculate expiry (24 hours by default, 48 for premium)
    const durationHours = body.is_premium ? 48 : 24;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('dedications')
      .insert({
        dedication_type: body.dedication_type,
        from_name: body.from_name.trim(),
        from_location: body.from_location?.trim() || null,
        to_name: body.to_name.trim(),
        to_relation: body.to_relation?.trim() || null,
        message: body.message.trim(),
        message_te: body.message_te?.trim() || null,
        celebrity_id: body.celebrity_id || null,
        celebrity_name: body.celebrity_name?.trim() || null,
        photo_url: body.photo_url || null,
        animation_type: body.animation_type || 'flowers',
        display_date: body.display_date || new Date().toISOString().split('T')[0],
        display_duration_hours: durationHours,
        is_premium: body.is_premium || false,
        status: 'pending', // Requires admin approval
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating dedication:', error);
      return NextResponse.json({ error: 'Failed to submit dedication' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Dedication submitted for approval',
      dedication: data,
    });
  } catch (error) {
    console.error('Dedication error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
