/**
 * Admin Editorial API - Recent Citations
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: citations } = await supabase
      .from('schema_performance')
      .select(`
        *,
        posts!inner(id, title)
      `)
      .eq('event_type', 'ai_overview_citation')
      .order('created_at', { ascending: false })
      .limit(10);

    const formattedCitations = (citations || []).map(c => ({
      id: c.id,
      post_id: c.post_id,
      post_title: (c as any).posts?.title || 'Untitled',
      source: c.source,
      query: c.query,
      snippet_text: c.snippet_text,
      event_date: c.event_date,
    }));

    return NextResponse.json({ citations: formattedCitations });
  } catch (error) {
    console.error('Error fetching recent citations:', error);
    return NextResponse.json({ citations: [] });
  }
}








