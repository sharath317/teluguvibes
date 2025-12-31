/**
 * Trend-Historic Fusion API
 * AI Content Strategy Engine
 *
 * Endpoints:
 * GET ?action=recommendations - Get top content recommendations
 * GET ?action=signals - Get recent trend signals
 * GET ?action=spikes - Get entity relevance spikes
 * POST action=run - Run fusion pipeline
 * POST action=approve - Approve a recommendation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runFusionPipeline,
  getTopRecommendations,
  getRecentTrendSignals,
  detectRelevanceSpikes,
  approveAndGenerateDraft,
} from '@/lib/trend-fusion';

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'recommendations';

  try {
    switch (action) {
      case 'recommendations': {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
        const status = request.nextUrl.searchParams.get('status')?.split(',') || ['pending', 'approved'];
        const recommendations = await getTopRecommendations(limit, status);
        return NextResponse.json({ success: true, data: recommendations });
      }

      case 'signals': {
        const hours = parseInt(request.nextUrl.searchParams.get('hours') || '48');
        const minStrength = parseInt(request.nextUrl.searchParams.get('minStrength') || '30');
        const signals = await getRecentTrendSignals(hours, minStrength);
        return NextResponse.json({ success: true, data: signals });
      }

      case 'spikes': {
        const minChange = parseInt(request.nextUrl.searchParams.get('minChange') || '20');
        const spikes = await detectRelevanceSpikes(minChange);
        return NextResponse.json({ success: true, data: spikes });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Trend fusion API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'run': {
        const result = await runFusionPipeline();
        return NextResponse.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }

      case 'approve': {
        const { recommendationId } = body;
        if (!recommendationId) {
          return NextResponse.json(
            { success: false, error: 'Missing recommendationId' },
            { status: 400 }
          );
        }
        const result = await approveAndGenerateDraft(recommendationId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Trend fusion POST error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}



