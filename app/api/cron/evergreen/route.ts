/**
 * EVERGREEN CRON JOB
 *
 * Single daily cron that handles all evergreen content generation.
 * Runs at 5 AM IST daily.
 *
 * WHY SINGLE CRON:
 * - Less infra overhead
 * - Easier to monitor
 * - All tasks are low-frequency (daily)
 * - Each task checks if work is needed before doing anything
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOnThisDay } from '@/lib/evergreen/on-this-day';
import { processMoviesForAnalysis } from '@/lib/evergreen/movie-analysis';
import { updateAllHeatScores } from '@/lib/evergreen/trend-heat-index';

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not set, allowing request');
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron call
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔄 Evergreen Cron Job Starting...');

  const results = {
    on_this_day: { success: false, events: 0 },
    movie_analysis: { success: false, processed: 0, errors: 0 },
    heat_scores: { success: false, updated: 0, errors: 0 },
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Generate "On This Day" for today (if not cached)
    console.log('📅 Generating On This Day...');
    const today = new Date();
    const onThisDay = await generateOnThisDay(today);
    results.on_this_day = {
      success: true,
      events: onThisDay.event_count,
    };
    console.log(`✅ On This Day: ${onThisDay.event_count} events`);
  } catch (error) {
    console.error('On This Day failed:', error);
    results.on_this_day = { success: false, events: 0 };
  }

  try {
    // 2. Process movies needing analysis (7 days post-release)
    console.log('📊 Processing Movie Analyses...');
    const analysisResult = await processMoviesForAnalysis();
    results.movie_analysis = {
      success: true,
      processed: analysisResult.processed,
      errors: analysisResult.errors,
    };
    console.log(`✅ Movie Analysis: ${analysisResult.processed} processed`);
  } catch (error) {
    console.error('Movie Analysis failed:', error);
    results.movie_analysis = { success: false, processed: 0, errors: 0 };
  }

  try {
    // 3. Update heat scores (every 6-12 hours, but we run daily)
    console.log('🔥 Updating Heat Scores...');
    const heatResult = await updateAllHeatScores();
    results.heat_scores = {
      success: true,
      updated: heatResult.updated,
      errors: heatResult.errors,
    };
    console.log(`✅ Heat Scores: ${heatResult.updated} updated`);
  } catch (error) {
    console.error('Heat Scores update failed:', error);
    results.heat_scores = { success: false, updated: 0, errors: 0 };
  }

  console.log('✅ Evergreen Cron Job Complete');

  return NextResponse.json(results);
}

// Also support POST for manual triggers from admin
export async function POST(request: NextRequest) {
  return GET(request);
}








