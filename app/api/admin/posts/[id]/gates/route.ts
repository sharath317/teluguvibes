/**
 * Quality Gates API
 * Check if a post can be published
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkQualityGates, 
  getPublishBlockReasons,
  getAutoFixableIssues 
} from '@/lib/intelligence/quality-gates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await checkQualityGates(id);

    return NextResponse.json({
      postId: id,
      ...result,
    });
  } catch (error) {
    console.error('Quality gates check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check quality gates' },
      { status: 500 }
    );
  }
}

// POST - Get detailed block reasons or auto-fix suggestions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  try {
    if (action === 'explain') {
      const reasons = await getPublishBlockReasons(id);
      return NextResponse.json(reasons);
    }

    if (action === 'auto-fix-list') {
      const issues = await getAutoFixableIssues(id);
      return NextResponse.json({ issues });
    }

    return NextResponse.json(
      { error: 'Unknown action. Use "explain" or "auto-fix-list"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Quality gates action failed:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

