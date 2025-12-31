/**
 * Admin Intelligence API - Audience Preferences
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: preferences } = await supabase
      .from('audience_preferences')
      .select('*')
      .eq('dimension_type', 'category')
      .order('preference_score', { ascending: false })
      .limit(20);

    return NextResponse.json({ preferences: preferences || [] });
  } catch (error) {
    console.error('Error fetching audience preferences:', error);
    return NextResponse.json({ preferences: [] });
  }
}



