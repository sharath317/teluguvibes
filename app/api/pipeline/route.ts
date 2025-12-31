import { NextResponse } from 'next/server';
import { processContent, quickProcessContent, batchProcessContent } from '@/lib/content-pipeline';

/**
 * POST /api/pipeline
 * Process content through the 3-stage AI pipeline
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, articles } = body;

    // Batch mode for multiple articles
    if (mode === 'batch' && Array.isArray(articles)) {
      const useQuick = body.quick !== false; // Default to quick mode for batch
      const result = await batchProcessContent(articles, useQuick);

      return NextResponse.json({
        success: true,
        mode: 'batch',
        ...result,
      });
    }

    // Single article mode
    const { title, content, category, sourceUrl, sourceImage, quick } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, category' },
        { status: 400 }
      );
    }

    const input = {
      title,
      content,
      category,
      sourceUrl,
      sourceImage,
    };

    // Use quick mode if specified
    const result = quick
      ? await quickProcessContent(input)
      : await processContent(input);

    return NextResponse.json({
      success: result.success,
      mode: quick ? 'quick' : 'full',
      postId: result.postId,
      status: result.status,
      score: result.score,
      title: result.title,
      imageUrl: result.imageUrl,
      analysis: {
        entity: result.analysis?.primaryEntity,
        sentiment: result.analysis?.sentiment,
        risk: result.analysis?.contentRisk,
        angle: result.analysis?.writingAngle,
      },
      validation: result.validation ? {
        score: result.validation.score,
        recommendation: result.validation.recommendation,
        teluguPercentage: result.validation.checks?.teluguQuality?.percentage,
        wordCount: result.validation.checks?.wordCount?.count,
      } : null,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Pipeline error:', error);
    return NextResponse.json(
      { error: 'Pipeline processing failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipeline
 * Get pipeline configuration and stats
 */
export async function GET() {
  return NextResponse.json({
    version: '2.0',
    stages: [
      {
        name: 'Content Intelligence',
        description: 'Pre-analysis of content for entity detection, sentiment, risk assessment',
      },
      {
        name: 'Structured Generation',
        description: 'Section-based article generation in Telugu',
      },
      {
        name: 'Validation',
        description: 'Quality checks for Telugu quality, toxicity, duplicates, clickbait',
      },
    ],
    categories: [
      'entertainment', 'gossip', 'sports', 'politics', 'trending',
      'love', 'health', 'food', 'technology', 'dedications',
    ],
    endpoints: {
      single: 'POST /api/pipeline with { title, content, category }',
      batch: 'POST /api/pipeline with { mode: "batch", articles: [...] }',
      quick: 'POST /api/pipeline with { quick: true } for faster processing',
    },
  });
}



