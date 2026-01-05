/**
 * WEEKLY DATA REFINEMENT CRON
 *
 * Auto fine-tunes low-confidence data.
 * Schedule: Weekly (Sunday 3 AM)
 */

import { NextRequest, NextResponse } from 'next/server';
import { refineData } from '@/lib/refinement/data-refiner';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔄 Weekly data refinement starting...');

  try {
    const results = await refineData({
      min_confidence_threshold: 0.70,
      max_age_days: 30,
      dry_run: false,
      limit: 100, // Process up to 100 items per run
    });

    const summary = {
      total_refined: results.length,
      by_type: {} as Record<string, number>,
      total_fields_updated: 0,
      avg_confidence_improvement: 0,
    };

    for (const r of results) {
      summary.by_type[r.entity_type] = (summary.by_type[r.entity_type] || 0) + 1;
      summary.total_fields_updated += r.fields_refined.length;
      summary.avg_confidence_improvement += (r.new_confidence - r.previous_confidence);
    }

    if (results.length > 0) {
      summary.avg_confidence_improvement /= results.length;
    }

    console.log('✅ Refinement complete:', summary);

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Refinement failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Refinement failed',
    }, { status: 500 });
  }
}








