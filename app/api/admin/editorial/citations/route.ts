/**
 * Admin Editorial API - Citation Blocks Management
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateCitationBlocks,
  getCitationBlocks,
  generateAnswerSummary,
  checkZeroClickOptimization
} from '@/lib/editorial/zero-click-seo';

// Get citation data for a post
export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

  try {
    const [citations, optimization] = await Promise.all([
      getCitationBlocks(postId),
      checkZeroClickOptimization(postId),
    ]);

    return NextResponse.json({ citations, optimization });
  } catch (error) {
    console.error('Error fetching citations:', error);
    return NextResponse.json({ error: 'Failed to fetch citations' }, { status: 500 });
  }
}

// Generate citation blocks for a post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post_id, action } = body;

    if (!post_id) {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'generate_citations':
        result = await generateCitationBlocks(post_id);
        return NextResponse.json({
          success: true,
          message: `Generated ${result.length} citation blocks`,
          citations: result
        });

      case 'generate_summary':
        result = await generateAnswerSummary(post_id);
        return NextResponse.json({
          success: !!result,
          message: result ? 'Summary generated' : 'Failed to generate summary',
          summary: result
        });

      case 'check_optimization':
        result = await checkZeroClickOptimization(post_id);
        return NextResponse.json({
          success: true,
          optimization: result
        });

      default:
        // Generate all by default
        const [citations, summary] = await Promise.all([
          generateCitationBlocks(post_id),
          generateAnswerSummary(post_id),
        ]);

        return NextResponse.json({
          success: true,
          message: 'SEO optimization generated',
          citations,
          summary,
        });
    }
  } catch (error) {
    console.error('Error generating citations:', error);
    return NextResponse.json({ error: 'Failed to generate citations' }, { status: 500 });
  }
}








