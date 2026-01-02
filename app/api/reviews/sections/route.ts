/**
 * REVIEWS SECTIONS API
 * 
 * Returns auto-generated sections for the Reviews landing page.
 * All sections are data-driven - ZERO manual curation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllReviewSections, 
  unifiedSearch,
  SectionConfig 
} from '@/lib/reviews/section-intelligence';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Search mode
  const search = searchParams.get('search');
  if (search) {
    const results = await unifiedSearch(search, 10);
    return NextResponse.json({ results });
  }

  // Config overrides (for admin tuning)
  const config: Partial<SectionConfig> = {};
  
  if (searchParams.get('recentDays')) {
    config.recentDays = parseInt(searchParams.get('recentDays')!);
  }
  if (searchParams.get('classicYearThreshold')) {
    config.classicYearThreshold = parseInt(searchParams.get('classicYearThreshold')!);
  }

  try {
    const { sections, spotlights } = await getAllReviewSections(config as SectionConfig);

    return NextResponse.json({
      success: true,
      sections,
      spotlights,
      config: {
        recentDays: config.recentDays || 60,
        classicYearThreshold: config.classicYearThreshold || 2000,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating review sections:', error);
    return NextResponse.json(
      { error: 'Failed to generate sections' },
      { status: 500 }
    );
  }
}

