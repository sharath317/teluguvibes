/**
 * Cron Job: Historic Intelligence
 *
 * Comprehensive evergreen content engine that generates:
 * - Celebrity birthdays
 * - Death anniversaries
 * - Debut anniversaries
 * - Movie release anniversaries
 * - "On This Day in Telugu Cinema" posts
 *
 * Features:
 * - Performance-aware recycling
 * - Anti-repetition fatigue
 * - AI-generated Telugu content
 * - Smart priority ranking
 *
 * Schedule: 0 5 * * * (5 AM IST daily)
 *
 * Vercel Cron Config (add to vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/historic-intelligence",
 *       "schedule": "0 5 * * *"
 *     }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runDailyHistoricJob,
  getJobStats,
  fetchUpcomingEvents,
  getRecyclableContent,
} from '@/lib/historic-intelligence';

// Max duration for Vercel serverless function
export const maxDuration = 300; // 5 minutes

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET - Run the daily historic intelligence job
 * Can be triggered by:
 * - Vercel Cron
 * - External cron service (with auth header)
 * - Manual trigger from admin
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'run';

  // Verify authorization
  // Skip auth check for stats (safe read-only operation)
  if (action === 'run' && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    // Check for Vercel cron header
    const vercelCron = request.headers.get('x-vercel-cron');
    if (!vercelCron) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    switch (action) {
      case 'run':
        // Run the full daily job
        console.log('🕐 Historic Intelligence cron job started');
        const jobResult = await runDailyHistoricJob();

        return NextResponse.json({
          success: true,
          message: 'Historic Intelligence job completed',
          data: jobResult,
          timestamp: new Date().toISOString(),
        });

      case 'stats':
        // Get job statistics
        const stats = await getJobStats();
        return NextResponse.json({
          success: true,
          data: stats,
        });

      case 'upcoming':
        // Get upcoming events (next 7 days)
        const days = parseInt(searchParams.get('days') || '7');
        const upcoming = await fetchUpcomingEvents(days);
        return NextResponse.json({
          success: true,
          data: upcoming,
        });

      case 'recyclable':
        // Get recyclable high-performing content
        const limit = parseInt(searchParams.get('limit') || '10');
        const recyclable = await getRecyclableContent(limit);
        return NextResponse.json({
          success: true,
          data: recyclable,
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Historic Intelligence cron job error:', error);
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

/**
 * POST - Manual trigger with options
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  // Verify authorization for POST
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'run' } = body;

    if (action === 'run') {
      console.log('🕐 Historic Intelligence manual job started');
      const jobResult = await runDailyHistoricJob();

      return NextResponse.json({
        success: true,
        message: 'Historic Intelligence job completed',
        data: jobResult,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action',
    }, { status: 400 });
  } catch (error) {
    console.error('Historic Intelligence error:', error);
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



