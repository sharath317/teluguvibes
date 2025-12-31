/**
 * Admin Editorial API - Pending Publishing Gates
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get posts that are ready for review but missing requirements
    const { data: gates } = await supabase
      .from('publishing_gates')
      .select(`
        *,
        posts!inner(id, title, status)
      `)
      .eq('all_gates_passed', false)
      .eq('posts.status', 'draft')
      .order('created_at', { ascending: false })
      .limit(20);

    const formattedGates = (gates || []).map(g => ({
      post_id: g.post_id,
      title: (g as any).posts?.title || 'Untitled',
      has_human_pov: g.has_human_pov,
      has_citation_block: g.has_citation_block,
      has_answer_summary: g.has_answer_summary,
      all_gates_passed: g.all_gates_passed,
    }));

    return NextResponse.json({ gates: formattedGates });
  } catch (error) {
    console.error('Error fetching pending gates:', error);
    return NextResponse.json({ gates: [] });
  }
}



