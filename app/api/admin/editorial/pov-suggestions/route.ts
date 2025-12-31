/**
 * Admin Editorial API - POV Suggestions
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: suggestions } = await supabase
      .from('pov_suggestions')
      .select(`
        *,
        posts!inner(id, title)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    const formattedSuggestions = (suggestions || []).map(s => ({
      id: s.id,
      post_id: s.post_id,
      post_title: (s as any).posts?.title || 'Untitled',
      suggested_type: s.suggested_type,
      suggested_text: s.suggested_text,
      reasoning: s.reasoning,
    }));

    return NextResponse.json({ suggestions: formattedSuggestions });
  } catch (error) {
    console.error('Error fetching POV suggestions:', error);
    return NextResponse.json({ suggestions: [] });
  }
}



