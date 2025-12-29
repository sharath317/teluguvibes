import { NextResponse } from 'next/server';
import {
  getOnThisDayEvents,
  generateTodaysNostalgiaPosts,
  getUpcomingBirthdays,
  generateEnhancedNostalgiaContent,
} from '@/lib/on-this-day';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/on-this-day
 * Get events for today or a specific date
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const day = searchParams.get('day');
  const type = searchParams.get('type'); // 'events', 'upcoming', or 'generate'

  try {
    // Get upcoming birthdays for the week
    if (type === 'upcoming') {
      const days = parseInt(searchParams.get('days') || '7');
      const events = await getUpcomingBirthdays(days);

      return NextResponse.json({
        success: true,
        type: 'upcoming_birthdays',
        count: events.length,
        events,
      });
    }

    // Generate nostalgia posts for today
    if (type === 'generate') {
      const result = await generateTodaysNostalgiaPosts();

      return NextResponse.json({
        success: true,
        type: 'generated',
        ...result,
      });
    }

    // Get events for a specific date
    const events = await getOnThisDayEvents(
      month ? parseInt(month) : undefined,
      day ? parseInt(day) : undefined
    );

    const today = new Date();

    return NextResponse.json({
      success: true,
      date: {
        month: month ? parseInt(month) : today.getMonth() + 1,
        day: day ? parseInt(day) : today.getDate(),
      },
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('On This Day error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch On This Day events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/on-this-day
 * Add a new On This Day event
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, day, event_type, entity_name, entity_name_te, year_occurred, description, description_te, image_url, metadata } = body;

    if (!month || !day || !event_type || !entity_name) {
      return NextResponse.json(
        { error: 'Missing required fields: month, day, event_type, entity_name' },
        { status: 400 }
      );
    }

    // Validate event type
    const validTypes = ['birthday', 'movie_release', 'sports', 'historical', 'death_anniversary'];
    if (!validTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('on_this_day_events')
      .upsert({
        month,
        day,
        event_type,
        entity_name,
        entity_name_te,
        year_occurred,
        description,
        description_te,
        image_url,
        metadata: metadata || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: data,
    });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Failed to create On This Day event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/on-this-day
 * Remove an On This Day event
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing event id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('on_this_day_events')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deactivated',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}

