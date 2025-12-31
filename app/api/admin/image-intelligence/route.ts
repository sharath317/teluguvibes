/**
 * Image Intelligence API
 * Zero Copyright Risk Media Management
 *
 * Endpoints:
 * GET ?action=pending - Get images pending review
 * GET ?action=performance - Get source performance stats
 * GET ?action=fetch - Fetch image for entity
 * POST action=review - Approve/reject image
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchImageWithFallback,
  getImagesPendingReview,
  getSourcePerformance,
  reviewImage,
} from '@/lib/image-intelligence';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'pending';

  try {
    switch (action) {
      case 'pending': {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
        const images = await getImagesPendingReview(limit);
        return NextResponse.json({ success: true, data: images });
      }

      case 'performance': {
        const stats = await getSourcePerformance();
        return NextResponse.json({ success: true, data: stats });
      }

      case 'fetch': {
        const entityType = request.nextUrl.searchParams.get('entityType') as 'person' | 'movie' | 'topic';
        const entityName = request.nextUrl.searchParams.get('entityName');
        const entityId = request.nextUrl.searchParams.get('entityId') || undefined;
        const tmdbId = request.nextUrl.searchParams.get('tmdbId') || undefined;

        if (!entityType || !entityName) {
          return NextResponse.json(
            { success: false, error: 'Missing entityType or entityName' },
            { status: 400 }
          );
        }

        const result = await fetchImageWithFallback({
          entityType,
          entityName,
          entityId,
          tmdbId,
        });

        return NextResponse.json({ success: result.success, data: result });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Image Intelligence API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'review': {
        const { imageId, status, notes } = body;
        if (!imageId || !status) {
          return NextResponse.json(
            { success: false, error: 'Missing imageId or status' },
            { status: 400 }
          );
        }

        const success = await reviewImage(imageId, status, notes);
        return NextResponse.json({ success });
      }

      case 'fetch': {
        const { entityType, entityName, entityId, tmdbId } = body;

        if (!entityType || !entityName) {
          return NextResponse.json(
            { success: false, error: 'Missing entityType or entityName' },
            { status: 400 }
          );
        }

        const result = await fetchImageWithFallback({
          entityType,
          entityName,
          entityId,
          tmdbId,
        });

        return NextResponse.json({ success: result.success, data: result });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Image Intelligence POST error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}



