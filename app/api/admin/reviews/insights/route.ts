/**
 * REVIEW INSIGHTS API
 * 
 * Admin endpoint for generating/previewing review insights.
 * Does NOT modify existing reviews - insights are stored separately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateReviewInsights, saveReviewInsights } from '@/lib/reviews/review-insights';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');
  const confidenceThreshold = parseFloat(searchParams.get('threshold') || '0.80');
  const includeAll = searchParams.get('includeAll') === 'true';

  if (!movieId) {
    return NextResponse.json({ error: 'movieId is required' }, { status: 400 });
  }

  try {
    const insights = await generateReviewInsights(movieId, {
      confidenceThreshold,
      includeAllSections: includeAll
    });

    if (!insights) {
      return NextResponse.json({ 
        error: 'Could not generate insights',
        reason: 'Insufficient movie data'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      insights,
      meta: {
        hasPerformances: !!insights.performances,
        hasDirection: !!insights.direction,
        hasTechnical: !!insights.technical,
        hasThemes: !!insights.themes,
        avgConfidence: Object.values(insights.section_confidence).reduce((a, b) => a + b, 0) / 4,
        densityScore: insights.density_score,
        needsReview: insights.needs_review
      }
    });
  } catch (error) {
    console.error('Review insights generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movieId, confidenceThreshold = 0.80, save = false } = body;

    if (!movieId) {
      return NextResponse.json({ error: 'movieId is required' }, { status: 400 });
    }

    const insights = await generateReviewInsights(movieId, { confidenceThreshold });

    if (!insights) {
      return NextResponse.json({ 
        error: 'Could not generate insights',
        reason: 'Insufficient movie data'
      }, { status: 404 });
    }

    if (save) {
      const saved = await saveReviewInsights(insights);
      if (!saved) {
        return NextResponse.json({ 
          error: 'Insights generated but save failed',
          insights
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      saved: save,
      insights
    });
  } catch (error) {
    console.error('Review insights save error:', error);
    return NextResponse.json({ 
      error: 'Failed to process insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

