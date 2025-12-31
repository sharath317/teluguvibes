/**
 * Celebrity Events API
 * Get today's events and upcoming events calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchTodaysEvents, getUpcomingEvents } from '@/lib/celebrity/on-this-day';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Get events (today or upcoming)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'today'; // 'today', 'upcoming', 'month'
  const days = parseInt(searchParams.get('days') || '7');
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

  try {
    if (type === 'today') {
      const events = await fetchTodaysEvents();
      return NextResponse.json({ events, date: new Date().toISOString() });
    }

    if (type === 'upcoming') {
      const events = await getUpcomingEvents(days);
      return NextResponse.json({ events, days });
    }

    if (type === 'month') {
      // Get all events for a specific month
      const { data: events, error } = await supabase
        .from('celebrity_events')
        .select(`
          id,
          event_type,
          event_month,
          event_day,
          event_year,
          priority_score,
          celebrity:celebrities (
            id,
            name_en,
            name_te,
            popularity_score,
            profile_image
          )
        `)
        .eq('event_month', month)
        .eq('is_active', true)
        .order('event_day', { ascending: true })
        .order('priority_score', { ascending: false });

      if (error) throw error;

      // Group by day
      const groupedByDay: Record<number, any[]> = {};
      for (const event of events || []) {
        const day = event.event_day;
        if (!groupedByDay[day]) groupedByDay[day] = [];
        groupedByDay[day].push({
          ...event,
          years_ago: year - (event.event_year || year),
        });
      }

      return NextResponse.json({
        events: groupedByDay,
        month,
        year,
        totalEvents: events?.length || 0,
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST: Manually trigger event generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { celebrity_id, event_type, event_date } = body;

    if (!celebrity_id || !event_type || !event_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const date = new Date(event_date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    const { data, error } = await supabase
      .from('celebrity_events')
      .insert({
        celebrity_id,
        event_type,
        event_month: month,
        event_day: day,
        event_year: year,
        priority_score: 50,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ event: data }, { status: 201 });

  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}



