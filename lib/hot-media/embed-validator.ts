// Embed Validator for Hot Media
// Validates and fetches oEmbed data from Instagram, YouTube, Twitter

import type { MediaFetchResult, MediaType, MediaSource, OEmbedResponse } from '@/types/media';

// Platform regex patterns
const PLATFORM_PATTERNS = {
  instagram_post: /(?:instagram\.com|instagr\.am)\/p\/([A-Za-z0-9_-]+)/,
  instagram_reel: /(?:instagram\.com|instagr\.am)\/reel\/([A-Za-z0-9_-]+)/,
  youtube_video: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/,
  youtube_short: /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]+)/,
  twitter_post: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  facebook_post: /facebook\.com\/(?:\w+\/)?(?:posts|videos)\/(\d+)/,
};

// oEmbed endpoints
const OEMBED_ENDPOINTS = {
  instagram: 'https://graph.facebook.com/v18.0/instagram_oembed',
  youtube: 'https://www.youtube.com/oembed',
  twitter: 'https://publish.twitter.com/oembed',
  facebook: 'https://www.facebook.com/plugins/post/oembed.json',
};

export interface ValidateUrlResult {
  valid: boolean;
  platform: 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'unknown';
  mediaType: MediaType;
  mediaId?: string;
  cleanUrl?: string;
  error?: string;
}

/**
 * Validate and identify platform from URL
 */
export function validateUrl(url: string): ValidateUrlResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, platform: 'unknown', mediaType: 'image', error: 'Invalid URL' };
  }

  const trimmedUrl = url.trim();

  // Check Instagram post
  const instaPostMatch = trimmedUrl.match(PLATFORM_PATTERNS.instagram_post);
  if (instaPostMatch) {
    return {
      valid: true,
      platform: 'instagram',
      mediaType: 'instagram_post',
      mediaId: instaPostMatch[1],
      cleanUrl: `https://www.instagram.com/p/${instaPostMatch[1]}/`,
    };
  }

  // Check Instagram reel
  const instaReelMatch = trimmedUrl.match(PLATFORM_PATTERNS.instagram_reel);
  if (instaReelMatch) {
    return {
      valid: true,
      platform: 'instagram',
      mediaType: 'instagram_reel',
      mediaId: instaReelMatch[1],
      cleanUrl: `https://www.instagram.com/reel/${instaReelMatch[1]}/`,
    };
  }

  // Check YouTube video
  const ytVideoMatch = trimmedUrl.match(PLATFORM_PATTERNS.youtube_video);
  if (ytVideoMatch) {
    return {
      valid: true,
      platform: 'youtube',
      mediaType: 'youtube_video',
      mediaId: ytVideoMatch[1],
      cleanUrl: `https://www.youtube.com/watch?v=${ytVideoMatch[1]}`,
    };
  }

  // Check YouTube short
  const ytShortMatch = trimmedUrl.match(PLATFORM_PATTERNS.youtube_short);
  if (ytShortMatch) {
    return {
      valid: true,
      platform: 'youtube',
      mediaType: 'youtube_short',
      mediaId: ytShortMatch[1],
      cleanUrl: `https://www.youtube.com/shorts/${ytShortMatch[1]}`,
    };
  }

  // Check Twitter/X post
  const twitterMatch = trimmedUrl.match(PLATFORM_PATTERNS.twitter_post);
  if (twitterMatch) {
    return {
      valid: true,
      platform: 'twitter',
      mediaType: 'twitter_post',
      mediaId: twitterMatch[1],
      cleanUrl: trimmedUrl.replace('x.com', 'twitter.com'),
    };
  }

  // Check Facebook post
  const fbMatch = trimmedUrl.match(PLATFORM_PATTERNS.facebook_post);
  if (fbMatch) {
    return {
      valid: true,
      platform: 'facebook',
      mediaType: 'facebook_post',
      mediaId: fbMatch[1],
      cleanUrl: trimmedUrl,
    };
  }

  return {
    valid: false,
    platform: 'unknown',
    mediaType: 'image',
    error: 'URL does not match supported platforms (Instagram, YouTube, Twitter, Facebook)',
  };
}

/**
 * Fetch oEmbed data from platform
 */
export async function fetchOEmbed(url: string, platform: 'instagram' | 'youtube' | 'twitter' | 'facebook'): Promise<{
  success: boolean;
  data?: OEmbedResponse;
  error?: string;
}> {
  try {
    let oembedUrl: string;

    switch (platform) {
      case 'youtube':
        oembedUrl = `${OEMBED_ENDPOINTS.youtube}?url=${encodeURIComponent(url)}&format=json`;
        break;
      case 'twitter':
        oembedUrl = `${OEMBED_ENDPOINTS.twitter}?url=${encodeURIComponent(url)}&omit_script=true`;
        break;
      case 'instagram':
        // Instagram oEmbed requires access token (use fallback)
        return {
          success: true,
          data: generateInstagramEmbed(url),
        };
      case 'facebook':
        oembedUrl = `${OEMBED_ENDPOINTS.facebook}?url=${encodeURIComponent(url)}`;
        break;
      default:
        return { success: false, error: 'Unsupported platform' };
    }

    const response = await fetch(oembedUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return { success: false, error: `oEmbed request failed: ${response.status}` };
    }

    const data = await response.json() as OEmbedResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching oEmbed',
    };
  }
}

/**
 * Generate Instagram embed HTML (fallback without oEmbed API)
 */
function generateInstagramEmbed(url: string): OEmbedResponse {
  // Clean URL to get embed URL
  const embedUrl = url.endsWith('/') ? `${url}embed/` : `${url}/embed/`;
  
  return {
    type: 'rich',
    version: '1.0',
    provider_name: 'Instagram',
    provider_url: 'https://www.instagram.com',
    html: `<iframe src="${embedUrl}" width="400" height="500" frameborder="0" scrolling="no" allowtransparency="true" style="max-width:100%;"></iframe>`,
    width: 400,
    height: 500,
  };
}

/**
 * Generate YouTube embed HTML
 */
export function generateYouTubeEmbed(videoId: string, isShort = false): string {
  const width = isShort ? 315 : 560;
  const height = isShort ? 560 : 315;
  return `<iframe width="${width}" height="${height}" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="max-width:100%;"></iframe>`;
}

/**
 * Generate Twitter embed HTML
 */
export function generateTwitterEmbed(tweetUrl: string): string {
  return `<blockquote class="twitter-tweet"><a href="${tweetUrl}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string {
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    mq: 'mqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Full media fetch: validate URL, get oEmbed, return complete result
 */
export async function fetchMediaFromUrl(url: string): Promise<MediaFetchResult> {
  // Validate URL first
  const validation = validateUrl(url);
  
  if (!validation.valid) {
    return {
      success: false,
      platform: 'unknown',
      media_type: 'image',
      source: 'instagram_embed',
      error: validation.error,
    };
  }

  const { platform, mediaType, mediaId, cleanUrl } = validation;
  
  // Determine source type
  const sourceMap: Record<string, MediaSource> = {
    instagram: 'instagram_embed',
    youtube: 'youtube_embed',
    twitter: 'twitter_embed',
    facebook: 'facebook_embed',
  };
  const source = sourceMap[platform] || 'instagram_embed';

  // Fetch oEmbed
  const oembedResult = await fetchOEmbed(cleanUrl!, platform);
  
  if (!oembedResult.success) {
    // Fallback: generate embed HTML manually
    let embedHtml: string;
    let thumbnailUrl: string | undefined;

    switch (platform) {
      case 'youtube':
        embedHtml = generateYouTubeEmbed(mediaId!, mediaType === 'youtube_short');
        thumbnailUrl = getYouTubeThumbnail(mediaId!);
        break;
      case 'twitter':
        embedHtml = generateTwitterEmbed(cleanUrl!);
        break;
      case 'instagram':
        embedHtml = `<iframe src="${cleanUrl}embed/" width="400" height="500" frameborder="0" scrolling="no" allowtransparency="true" style="max-width:100%;"></iframe>`;
        break;
      default:
        return {
          success: false,
          platform,
          media_type: mediaType,
          source,
          error: oembedResult.error,
        };
    }

    return {
      success: true,
      platform,
      media_type: mediaType,
      source,
      embed_html: embedHtml,
      thumbnail_url: thumbnailUrl,
    };
  }

  // Success with oEmbed data
  const { data } = oembedResult;
  
  return {
    success: true,
    platform,
    media_type: mediaType,
    source,
    embed_html: data?.html,
    thumbnail_url: data?.thumbnail_url || (platform === 'youtube' && mediaId ? getYouTubeThumbnail(mediaId) : undefined),
    title: data?.title,
    author_name: data?.author_name,
  };
}

/**
 * Check if URL is from a private account (basic check)
 */
export function isLikelyPrivateAccount(html?: string): boolean {
  if (!html) return false;
  
  const privateIndicators = [
    'This Account is Private',
    'private account',
    'Login to see',
    'Sorry, this page',
    'This video is unavailable',
    'This Tweet is from a suspended account',
  ];
  
  return privateIndicators.some(indicator => 
    html.toLowerCase().includes(indicator.toLowerCase())
  );
}

/**
 * Get platform icon and color for UI
 */
export function getPlatformInfo(platform: string): {
  icon: string;
  name: string;
  color: string;
  bgColor: string;
} {
  const platforms: Record<string, { icon: string; name: string; color: string; bgColor: string }> = {
    instagram: { icon: '📸', name: 'Instagram', color: 'text-pink-500', bgColor: 'bg-pink-50' },
    youtube: { icon: '▶️', name: 'YouTube', color: 'text-red-500', bgColor: 'bg-red-50' },
    twitter: { icon: '🐦', name: 'Twitter/X', color: 'text-blue-500', bgColor: 'bg-blue-50' },
    facebook: { icon: '📘', name: 'Facebook', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    unknown: { icon: '🔗', name: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  };
  
  return platforms[platform] || platforms.unknown;
}






