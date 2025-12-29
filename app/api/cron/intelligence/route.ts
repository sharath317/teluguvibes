/**
 * TeluguVibes Intelligence Cron Job
 * Runs every 6 hours for trend ingestion & learning
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestAllTrends } from '@/lib/intelligence/trend-ingestion';
import { runLearningCycle, updateAudiencePreferences } from '@/lib/intelligence/learning-engine';
import { updateImageEngagement } from '@/lib/intelligence/image-intelligence';
import { runReviewPipeline, learnFromReviewPerformance, trackOTTReleases } from '@/lib/intelligence/review-pipeline';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (process.env.NODE_ENV === 'production') {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('Starting intelligence cron job...');
  const startTime = Date.now();

  const results: Record<string, any> = {};
  const errors: string[] = [];

  try {
    // 1. Trend Ingestion (TMDB, YouTube, News, Internal)
    console.log('Step 1: Ingesting trends...');
    try {
      results.trends = await ingestAllTrends();
    } catch (e) {
      errors.push(`Trend ingestion: ${e}`);
      results.trends = { error: String(e) };
    }

    // 2. Learning Cycle (Preferences, Performance, Entity Popularity)
    console.log('Step 2: Running learning cycle...');
    try {
      results.learning = await runLearningCycle();
    } catch (e) {
      errors.push(`Learning cycle: ${e}`);
      results.learning = { error: String(e) };
    }

    // 3. Image Engagement Update
    console.log('Step 3: Updating image engagement...');
    try {
      await updateImageEngagement();
      results.imageEngagement = { updated: true };
    } catch (e) {
      errors.push(`Image engagement: ${e}`);
      results.imageEngagement = { error: String(e) };
    }

    // 4. Review Pipeline (Detect new movies, generate reviews)
    console.log('Step 4: Running review pipeline...');
    try {
      results.reviews = await runReviewPipeline();
    } catch (e) {
      errors.push(`Review pipeline: ${e}`);
      results.reviews = { error: String(e) };
    }

    // 5. Review Learning
    console.log('Step 5: Learning from review performance...');
    try {
      await learnFromReviewPerformance();
      results.reviewLearning = { updated: true };
    } catch (e) {
      errors.push(`Review learning: ${e}`);
      results.reviewLearning = { error: String(e) };
    }

    // 6. OTT Release Tracking
    console.log('Step 6: Tracking OTT releases...');
    try {
      await trackOTTReleases();
      results.ottTracking = { updated: true };
    } catch (e) {
      errors.push(`OTT tracking: ${e}`);
      results.ottTracking = { error: String(e) };
    }

  } catch (error) {
    errors.push(`Critical error: ${error}`);
  }

  const duration = Date.now() - startTime;
  console.log(`Intelligence cron completed in ${duration}ms`);

  return NextResponse.json({
    success: errors.length === 0,
    duration: `${duration}ms`,
    results,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
}
