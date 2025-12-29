/**
 * Admin Intelligence API - AI Learnings
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: learnings } = await supabase
      .from('ai_learnings')
      .select('*')
      .eq('is_active', true)
      .order('confidence_score', { ascending: false })
      .limit(30);

    return NextResponse.json({ learnings: learnings || [] });
  } catch (error) {
    console.error('Error fetching AI learnings:', error);
    return NextResponse.json({ learnings: [] });
  }
}
