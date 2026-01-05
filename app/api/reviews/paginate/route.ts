/**
 * API ROUTE: Paginate Review Sections
 * 
 * Enables "Load More" and "View All" functionality for review sections.
 * Supports all section types with proper pagination metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { paginateSection, type SectionType } from '@/lib/reviews/section-pagination';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract pagination parameters
    const sectionType = searchParams.get('sectionType') as SectionType;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '18', 10);
    const language = searchParams.get('language') || 'Telugu';
    const genre = searchParams.get('genre') || undefined;
    const actor = searchParams.get('actor') || undefined;
    const director = searchParams.get('director') || undefined;
    const tag = searchParams.get('tag') || undefined;

    // Validate section type
    if (!sectionType) {
      return NextResponse.json(
        { error: 'sectionType is required' },
        { status: 400 }
      );
    }

    // Validate pagination params
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Get paginated data
    const result = await paginateSection({
      sectionType,
      page,
      pageSize,
      language,
      genre,
      actor,
      director,
      tag,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Pagination API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to paginate movies' },
      { status: 500 }
    );
  }
}


