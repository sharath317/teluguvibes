/**
 * EDITORIAL ANALYSIS API
 *
 * Analyzes a topic and returns an editorial plan.
 * MUST be called before content generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeEditorialIntent } from '@/lib/intelligence/editorial-analyzer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, rawContent, source, language } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const plan = await analyzeEditorialIntent({
      topic,
      rawContent,
      source,
      language: language || 'te',
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Editorial analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze topic' },
      { status: 500 }
    );
  }
}



