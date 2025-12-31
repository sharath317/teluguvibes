/**
 * Admin Editorial API - Human POV Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { addHumanPOV, getPOV, generatePOVSuggestions } from '@/lib/editorial/human-pov';

// Get POV for a post
export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

  try {
    const pov = await getPOV(postId);
    const suggestions = await generatePOVSuggestions(postId);

    return NextResponse.json({ pov, suggestions });
  } catch (error) {
    console.error('Error fetching POV:', error);
    return NextResponse.json({ error: 'Failed to fetch POV' }, { status: 500 });
  }
}

// Add/update POV for a post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post_id, pov_text, pov_type, editor_id, editor_name } = body;

    if (!post_id || !pov_text || !pov_type || !editor_id) {
      return NextResponse.json({
        error: 'post_id, pov_text, pov_type, and editor_id are required'
      }, { status: 400 });
    }

    const result = await addHumanPOV({
      post_id,
      pov_text,
      pov_type,
      editor_id,
      editor_name,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'POV added successfully' });
  } catch (error) {
    console.error('Error adding POV:', error);
    return NextResponse.json({ error: 'Failed to add POV' }, { status: 500 });
  }
}



