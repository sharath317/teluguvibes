/**
 * Media Preview API
 * Preview social media embeds before saving
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchMediaEmbed, detectPlatform, getYouTubeVideoId, getYouTubeThumbnail } from '@/lib/media/embed-fetcher';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Detect platform
    const { platform, mediaType, postId } = detectPlatform(url);

    if (platform === 'unknown') {
      return NextResponse.json({
        success: false,
        error: 'Unsupported platform. Supported: Instagram, YouTube, Twitter/X, Facebook',
        platform: 'unknown',
      });
    }

    // Fetch embed
    const result = await fetchMediaEmbed(url);

    // Add YouTube thumbnail if available
    if (platform === 'youtube' && postId) {
      result.thumbnail_url = result.thumbnail_url || getYouTubeThumbnail(postId, 'hq');
    }

    return NextResponse.json({
      ...result,
      platform,
      media_type: mediaType,
      post_id: postId,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ error: 'Failed to preview URL' }, { status: 500 });
  }
}



