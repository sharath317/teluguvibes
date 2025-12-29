/**
 * Universal Media Embed Fetcher
 *
 * LEGAL: Uses official oEmbed APIs only
 * - Instagram oEmbed: https://developers.facebook.com/docs/instagram/oembed
 * - YouTube oEmbed: https://developers.google.com/youtube/oembed
 * - Twitter oEmbed: https://developer.twitter.com/en/docs/twitter-for-websites/oembed-api
 */

import type { MediaFetchResult, OEmbedResponse, MediaType, MediaSource } from '@/types/media';

// Platform detection patterns
const PLATFORM_PATTERNS = {
  instagram: [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
    /instagr\.am\/p\/([A-Za-z0-9_-]+)/,
  ],
  youtube: [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
    /youtu\.be\/([A-Za-z0-9_-]+)/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]+)/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]+)/,
  ],
  twitter: [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/,
  ],
  facebook: [
    /facebook\.com\/[\w.]+\/(posts|videos|photos)\/(\d+)/,
    /fb\.watch\/([A-Za-z0-9_-]+)/,
  ],
};

// oEmbed endpoints
const OEMBED_ENDPOINTS = {
  instagram: 'https://graph.facebook.com/v18.0/instagram_oembed',
  youtube: 'https://www.youtube.com/oembed',
  twitter: 'https://publish.twitter.com/oembed',
  facebook: 'https://www.facebook.com/plugins/post/oembed.json',
};

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): {
  platform: 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'unknown';
  mediaType: MediaType;
  postId?: string;
} {
  // Instagram
  for (const pattern of PLATFORM_PATTERNS.instagram) {
    const match = url.match(pattern);
    if (match) {
      const isReel = url.includes('/reel/');
      return {
        platform: 'instagram',
        mediaType: isReel ? 'instagram_reel' : 'instagram_post',
        postId: match[1],
      };
    }
  }

  // YouTube
  for (const pattern of PLATFORM_PATTERNS.youtube) {
    const match = url.match(pattern);
    if (match) {
      const isShort = url.includes('/shorts/');
      return {
        platform: 'youtube',
        mediaType: isShort ? 'youtube_short' : 'youtube_video',
        postId: match[1],
      };
    }
  }

  // Twitter/X
  for (const pattern of PLATFORM_PATTERNS.twitter) {
    const match = url.match(pattern);
    if (match) {
      return {
        platform: 'twitter',
        mediaType: 'twitter_post',
        postId: match[1],
      };
    }
  }

  // Facebook
  for (const pattern of PLATFORM_PATTERNS.facebook) {
    const match = url.match(pattern);
    if (match) {
      return {
        platform: 'facebook',
        mediaType: 'facebook_post',
        postId: match[2] || match[1],
      };
    }
  }

  return { platform: 'unknown', mediaType: 'image' };
}

/**
 * Fetch Instagram embed
 * Requires Facebook App Access Token
 */
async function fetchInstagramEmbed(url: string): Promise<OEmbedResponse | null> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('FACEBOOK_ACCESS_TOKEN not configured for Instagram embeds');
    // Fallback: Generate basic embed HTML
    return generateBasicInstagramEmbed(url);
  }

  try {
    const endpoint = `${OEMBED_ENDPOINTS.instagram}?url=${encodeURIComponent(url)}&access_token=${accessToken}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.error('Instagram oEmbed error:', response.status);
      return generateBasicInstagramEmbed(url);
    }

    return await response.json();
  } catch (error) {
    console.error('Instagram fetch error:', error);
    return generateBasicInstagramEmbed(url);
  }
}

/**
 * Generate basic Instagram embed without API
 */
function generateBasicInstagramEmbed(url: string): OEmbedResponse {
  // Instagram allows embedding via their embed.js script
  const embedHtml = `
    <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${url}"
      style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15);
      margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%;">
    </blockquote>
    <script async src="//www.instagram.com/embed.js"></script>
  `;

  return {
    type: 'rich',
    version: '1.0',
    provider_name: 'Instagram',
    provider_url: 'https://www.instagram.com',
    html: embedHtml,
    width: 540,
    height: 700,
  };
}

/**
 * Fetch YouTube embed
 */
async function fetchYouTubeEmbed(url: string): Promise<OEmbedResponse | null> {
  try {
    const endpoint = `${OEMBED_ENDPOINTS.youtube}?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.error('YouTube oEmbed error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('YouTube fetch error:', error);
    return null;
  }
}

/**
 * Fetch Twitter/X embed
 */
async function fetchTwitterEmbed(url: string): Promise<OEmbedResponse | null> {
  try {
    // Convert x.com to twitter.com for API
    const twitterUrl = url.replace('x.com', 'twitter.com');
    const endpoint = `${OEMBED_ENDPOINTS.twitter}?url=${encodeURIComponent(twitterUrl)}&omit_script=true`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.error('Twitter oEmbed error:', response.status);
      return null;
    }

    const data = await response.json();

    // Add Twitter widgets script
    data.html = data.html + '\n<script async src="https://platform.twitter.com/widgets.js"></script>';

    return data;
  } catch (error) {
    console.error('Twitter fetch error:', error);
    return null;
  }
}

/**
 * Fetch Facebook embed
 */
async function fetchFacebookEmbed(url: string): Promise<OEmbedResponse | null> {
  try {
    const endpoint = `${OEMBED_ENDPOINTS.facebook}?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      // Fallback: Generate basic embed
      return {
        type: 'rich',
        version: '1.0',
        provider_name: 'Facebook',
        provider_url: 'https://www.facebook.com',
        html: `
          <div class="fb-post" data-href="${url}" data-width="500"></div>
          <script async defer src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"></script>
        `,
        width: 500,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Facebook fetch error:', error);
    return null;
  }
}

/**
 * Main function: Fetch media from any supported platform
 */
export async function fetchMediaEmbed(url: string): Promise<MediaFetchResult> {
  const { platform, mediaType, postId } = detectPlatform(url);

  if (platform === 'unknown') {
    return {
      success: false,
      platform: 'unknown',
      media_type: 'image',
      source: 'official_website',
      error: 'Unsupported platform. Supported: Instagram, YouTube, Twitter/X, Facebook',
    };
  }

  let oembed: OEmbedResponse | null = null;
  let source: MediaSource;

  switch (platform) {
    case 'instagram':
      oembed = await fetchInstagramEmbed(url);
      source = 'instagram_embed';
      break;
    case 'youtube':
      oembed = await fetchYouTubeEmbed(url);
      source = 'youtube_embed';
      break;
    case 'twitter':
      oembed = await fetchTwitterEmbed(url);
      source = 'twitter_embed';
      break;
    case 'facebook':
      oembed = await fetchFacebookEmbed(url);
      source = 'facebook_embed';
      break;
    default:
      return {
        success: false,
        platform,
        media_type: mediaType,
        source: 'official_website',
        error: 'Platform not supported',
      };
  }

  if (!oembed) {
    return {
      success: false,
      platform,
      media_type: mediaType,
      source,
      error: 'Failed to fetch embed from platform',
    };
  }

  return {
    success: true,
    platform,
    media_type: mediaType,
    source,
    embed_html: oembed.html,
    thumbnail_url: oembed.thumbnail_url,
    title: oembed.title,
    author_name: oembed.author_name,
  };
}

/**
 * Generate safe embed HTML for rendering
 */
export function sanitizeEmbedHtml(html: string): string {
  // Basic sanitization - in production use a proper sanitizer like DOMPurify
  return html
    .replace(/<script(?![^>]*src=["']https:\/\/(www\.)?(instagram\.com|platform\.twitter\.com|connect\.facebook\.net|www\.youtube\.com))/gi, '<!-- blocked script')
    .replace(/on\w+=/gi, 'data-blocked-');
}

/**
 * Get YouTube video ID from URL
 */
export function getYouTubeVideoId(url: string): string | null {
  for (const pattern of PLATFORM_PATTERNS.youtube) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Generate YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
