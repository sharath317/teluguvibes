/**
 * Admin Intelligence API - Entity Popularity
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: entities } = await supabase
      .from('entity_popularity')
      .select('*')
      .order('current_score', { ascending: false })
      .limit(50);

    return NextResponse.json({ entities: entities || [] });
  } catch (error) {
    console.error('Error fetching entity popularity:', error);
    return NextResponse.json({ entities: [] });
  }
}



