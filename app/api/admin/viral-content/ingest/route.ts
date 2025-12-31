/**
 * Manual Viral Content Ingestion API
 *
 * Allows admins to manually trigger viral content ingestion
 * for testing or on-demand updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestViralContent, getIngestionStats } from '@/lib/viral-content';

export const maxDuration = 120; // 2 minutes
export const dynamic = 'force-dynamic';

/**
 * GET: Get ingestion statistics
 */
export async function GET() {
  try {
    const stats = await getIngestionStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}

/**
 * POST: Trigger viral content ingestion
 */
export async function POST(request: NextRequest) {
  // In production, you'd want to check for admin auth here
  // const session = await getServerSession();
  // if (!session?.user?.isAdmin) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  console.log('Manual viral content ingestion triggered');

  try {
    const startTime = Date.now();
    const result = await ingestViralContent();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: result.errors.length === 0,
      result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      {
        error: 'Ingestion failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
