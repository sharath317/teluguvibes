/**
 * Cron Job: On This Day
 *
 * This endpoint should be called daily by a cron service (Vercel Cron, etc.)
 * It generates draft posts for celebrity birthdays, anniversaries, etc.
 *
 * Schedule: 0 5 * * * (5 AM daily IST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runOnThisDayJob } from '@/lib/celebrity/on-this-day';

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify the request is from a legitimate cron job
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('🕐 On This Day cron job started');

    const stats = await runOnThisDayJob();

    return NextResponse.json({
      success: true,
      message: 'On This Day job completed',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}



