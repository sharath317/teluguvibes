/**
 * Hot Media Embed API
 * Handles Instagram, YouTube, and Twitter embeds
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  fetchInstagramEmbed, 
  isValidInstagramUrl, 
  extractInstagramPostId,
  detectInstagramType,
  createInstagramMediaEntry 
} from '@/lib/hot-media/instagram-embed';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Add a new embed (Instagram, YouTube, Twitter)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, entity_name, entity_id, category = 'photoshoot', caption } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Detect platform
    let platform = 'unknown';
    let embedData: any = null;

    if (isValidInstagramUrl(url)) {
      platform = 'instagram';
      embedData = await fetchInstagramEmbed(url);
      
      if (!embedData.isValid) {
        return NextResponse.json({ error: embedData.error || 'Invalid Instagram URL' }, { status: 400 });
      }
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'youtube';
      // Extract YouTube video ID
      const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
      if (!videoIdMatch) {
        return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      }
      
      const videoId = videoIdMatch[1];
      const isShort = url.includes('/shorts/');
      
      embedData = {
        postId: videoId,
        postUrl: url,
        embedHtml: `<iframe width="100%" height="${isShort ? '600' : '315'}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        isValid: true,
        contentType: isShort ? 'short' : 'video',
      };
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      platform = 'twitter';
      // Basic Twitter embed
      embedData = {
        postId: url.split('/').pop(),
        postUrl: url,
        embedHtml: `<blockquote class="twitter-tweet"><a href="${url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`,
        isValid: true,
      };
    } else {
      return NextResponse.json({ error: 'Unsupported URL. Use Instagram, YouTube, or Twitter.' }, { status: 400 });
    }

    // Create media record
    const supabase = getSupabase();
    
    const contentType = platform === 'instagram' 
      ? (detectInstagramType(url) === 'reel' ? 'reel' : 'embed')
      : embedData.contentType || 'embed';

    const record = {
      entity_id: entity_id || null,
      entity_name: entity_name || embedData.authorName || 'Unknown',
      entity_type: 'actress',
      platform,
      source_url: embedData.postUrl || url,
      embed_url: embedData.postUrl || url,
      embed_html: embedData.embedHtml,
      image_url: null, // Embeds don't need image_url
      thumbnail_url: embedData.thumbnailUrl || null,
      license_source: `${platform}_oembed`,
      license_type: 'embed',
      category,
      content_type: contentType,
      tags: [
        entity_name?.split(' ')[0]?.toLowerCase() || 'celebrity',
        platform,
        category,
        contentType,
      ].filter(Boolean),
      selected_caption: caption || `${entity_name || 'Celebrity'} ${platform} ${contentType}`,
      caption_te: caption || `${entity_name || 'సెలెబ్రిటీ'} ${platform}`,
      confidence_score: 100, // Embeds are 100% safe
      safety_risk: 'low',
      requires_review: false,
      is_blocked: false,
      views: 0,
      likes: 0,
      shares: 0,
      trending_score: 70,
      is_featured: false,
      is_hot: true,
      status: 'approved',
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('hot_media')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      media: data,
      embed: {
        platform,
        html: embedData.embedHtml,
        thumbnail: embedData.thumbnailUrl,
      },
    });
  } catch (error) {
    console.error('Embed API error:', error);
    return NextResponse.json({ error: 'Failed to process embed' }, { status: 500 });
  }
}

// GET - Validate and preview an embed URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    let platform = 'unknown';
    let embedData: any = null;
    let isValid = false;

    if (isValidInstagramUrl(url)) {
      platform = 'instagram';
      embedData = await fetchInstagramEmbed(url);
      isValid = embedData.isValid;
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'youtube';
      const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        embedData = {
          postId: videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          isValid: true,
        };
        isValid = true;
      }
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      platform = 'twitter';
      isValid = true;
      embedData = { postId: url.split('/').pop(), isValid: true };
    }

    return NextResponse.json({
      url,
      platform,
      isValid,
      postId: embedData?.postId,
      thumbnailUrl: embedData?.thumbnailUrl,
      authorName: embedData?.authorName,
      authorHandle: embedData?.authorHandle,
    });
  } catch (error) {
    console.error('Embed validation error:', error);
    return NextResponse.json({ error: 'Failed to validate URL' }, { status: 500 });
  }
}

