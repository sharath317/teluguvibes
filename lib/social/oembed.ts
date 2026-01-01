/**
 * oEmbed Compatibility Layer for Social Profiles
 * 
 * Provides embed generation for social profiles
 * NEVER downloads media - uses oEmbed URLs only
 * 
 * Supported:
 * - Instagram posts/reels (oEmbed)
 * - YouTube videos (oEmbed)
 * - Twitter/X posts (oEmbed)
 * 
 * This layer is used to:
 * - Generate embed previews in admin
 * - Provide embed HTML for Hot Media
 * - Validate that profiles are public
 */

import { validateUrl, fetchOEmbed, getPlatformInfo } from '../hot-media/embed-validator';

// Types
export interface OEmbedProfileResult {
  success: boolean;
  platform: string;
  profile_url: string;
  embed_html?: string;
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
  is_public: boolean;
  error?: string;
}

export interface ProfileEmbedOptions {
  width?: number;
  height?: number;
  show_header?: boolean;
  show_captions?: boolean;
}

/**
 * Generate Instagram profile embed
 * Uses official embed format - no scraping
 */
export function generateInstagramProfileEmbed(
  handle: string,
  options: ProfileEmbedOptions = {}
): string {
  const { width = 400, height = 480 } = options;
  const profileUrl = `https://www.instagram.com/${handle}/`;
  
  // Instagram profile embed (shows recent posts grid)
  // Note: Instagram's embed endpoint requires a post URL, not profile
  // For profiles, we link to the profile page
  return `
<div class="instagram-profile-embed" style="max-width:${width}px;">
  <a href="${profileUrl}" target="_blank" rel="noopener noreferrer" 
     class="instagram-profile-link"
     style="display:flex;align-items:center;padding:12px;border:1px solid #dbdbdb;border-radius:8px;text-decoration:none;color:inherit;">
    <span style="width:40px;height:40px;border-radius:50%;background:#f0f0f0;margin-right:12px;display:flex;align-items:center;justify-content:center;">📸</span>
    <span>
      <strong>@${handle}</strong>
      <br/>
      <small style="color:#8e8e8e;">View on Instagram</small>
    </span>
  </a>
</div>`;
}

/**
 * Generate YouTube channel embed
 */
export function generateYouTubeChannelEmbed(
  channelId: string,
  options: ProfileEmbedOptions = {}
): string {
  const { width = 560, height = 315 } = options;
  
  // YouTube channel embed - shows channel page
  const channelUrl = channelId.startsWith('UC') 
    ? `https://www.youtube.com/channel/${channelId}`
    : `https://www.youtube.com/@${channelId}`;
  
  return `
<div class="youtube-channel-embed" style="max-width:${width}px;">
  <a href="${channelUrl}" target="_blank" rel="noopener noreferrer"
     class="youtube-channel-link"
     style="display:flex;align-items:center;padding:12px;border:1px solid #e0e0e0;border-radius:8px;text-decoration:none;color:inherit;background:#fafafa;">
    <span style="width:40px;height:40px;border-radius:50%;background:#ff0000;margin-right:12px;display:flex;align-items:center;justify-content:center;color:white;">▶</span>
    <span>
      <strong>${channelId}</strong>
      <br/>
      <small style="color:#606060;">View on YouTube</small>
    </span>
  </a>
</div>`;
}

/**
 * Generate Twitter profile embed
 */
export function generateTwitterProfileEmbed(
  handle: string,
  options: ProfileEmbedOptions = {}
): string {
  const { width = 400 } = options;
  const profileUrl = `https://twitter.com/${handle}`;
  
  // Twitter timeline embed
  return `
<a class="twitter-timeline" 
   href="${profileUrl}" 
   data-width="${width}"
   data-tweet-limit="3"
   data-chrome="noheader nofooter noborders transparent">
   Tweets by @${handle}
</a>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
}

/**
 * Generate simple link card for any platform
 */
export function generateProfileLinkCard(
  platform: string,
  handle: string,
  profile_url: string
): string {
  const info = getPlatformInfo(platform);
  
  return `
<div class="profile-link-card" style="max-width:400px;">
  <a href="${profile_url}" target="_blank" rel="noopener noreferrer"
     style="display:flex;align-items:center;padding:12px;border:1px solid #e0e0e0;border-radius:8px;text-decoration:none;color:inherit;">
    <span style="font-size:24px;margin-right:12px;">${info.icon}</span>
    <span>
      <strong>${handle}</strong>
      <br/>
      <small style="color:#666;">View on ${info.name}</small>
    </span>
  </a>
</div>`;
}

/**
 * Generate embed based on platform
 */
export function generateProfileEmbed(
  platform: string,
  handle: string,
  profile_url: string,
  options: ProfileEmbedOptions = {}
): string {
  switch (platform) {
    case 'instagram':
      return generateInstagramProfileEmbed(handle, options);
    case 'youtube':
      return generateYouTubeChannelEmbed(handle, options);
    case 'twitter':
      return generateTwitterProfileEmbed(handle, options);
    default:
      return generateProfileLinkCard(platform, handle, profile_url);
  }
}

/**
 * Check if a profile appears to be public
 * Uses oEmbed as a proxy (private accounts can't be embedded)
 */
export async function checkProfilePublic(
  platform: string,
  handle: string
): Promise<{ is_public: boolean; error?: string }> {
  // For platforms without oEmbed, assume public
  if (!['instagram', 'youtube', 'twitter'].includes(platform)) {
    return { is_public: true };
  }

  // Note: Profile-level oEmbed is limited
  // Instagram requires post URL, not profile
  // YouTube channel check requires API
  // Twitter profile embed works for public accounts

  if (platform === 'twitter') {
    try {
      const profileUrl = `https://twitter.com/${handle}`;
      const result = await fetchOEmbed(profileUrl, 'twitter');
      return { is_public: result.success };
    } catch (error) {
      return { 
        is_public: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // For Instagram and YouTube, we can't easily check via oEmbed
  // Return true and let content discovery handle failures
  return { is_public: true };
}

/**
 * Generate oEmbed data for a specific post from a profile
 * Useful for Hot Media integration
 */
export async function getLatestPostEmbed(
  platform: string,
  postUrl: string
): Promise<OEmbedProfileResult> {
  const validation = validateUrl(postUrl);
  
  if (!validation.valid) {
    return {
      success: false,
      platform,
      profile_url: postUrl,
      is_public: false,
      error: validation.error,
    };
  }

  const oembedResult = await fetchOEmbed(
    validation.cleanUrl!,
    validation.platform as 'instagram' | 'youtube' | 'twitter' | 'facebook'
  );

  if (!oembedResult.success) {
    return {
      success: false,
      platform: validation.platform,
      profile_url: postUrl,
      is_public: false,
      error: oembedResult.error,
    };
  }

  return {
    success: true,
    platform: validation.platform,
    profile_url: postUrl,
    embed_html: oembedResult.data?.html,
    thumbnail_url: oembedResult.data?.thumbnail_url,
    title: oembedResult.data?.title,
    author_name: oembedResult.data?.author_name,
    is_public: true,
  };
}

/**
 * Build social links grid HTML for a celebrity
 */
export function buildSocialLinksGrid(
  handles: Array<{
    platform: string;
    handle: string;
    profile_url: string;
    verified?: boolean;
  }>
): string {
  if (handles.length === 0) {
    return '<p style="color:#666;">No social profiles found</p>';
  }

  const links = handles.map(h => {
    const info = getPlatformInfo(h.platform);
    const verifiedBadge = h.verified ? '✓' : '';
    
    return `
<a href="${h.profile_url}" target="_blank" rel="noopener noreferrer"
   class="social-link-item ${h.verified ? 'verified' : ''}"
   style="display:inline-flex;align-items:center;padding:8px 12px;margin:4px;border:1px solid #e0e0e0;border-radius:6px;text-decoration:none;color:inherit;font-size:14px;">
  <span style="margin-right:6px;">${info.icon}</span>
  <span>@${h.handle}</span>
  ${verifiedBadge ? `<span style="color:#1da1f2;margin-left:4px;">✓</span>` : ''}
</a>`;
  }).join('');

  return `<div class="social-links-grid" style="display:flex;flex-wrap:wrap;gap:4px;">${links}</div>`;
}

/**
 * Get platform-specific embed instructions
 */
export function getEmbedInstructions(platform: string): string {
  const instructions: Record<string, string> = {
    instagram: 'Copy a post or reel URL from Instagram to embed it. Profile embeds show a link to the profile.',
    youtube: 'Copy a video or channel URL from YouTube. Videos will show as embeds, channels as links.',
    twitter: 'Copy a tweet URL or profile URL from Twitter/X. Tweets embed fully, profiles show timeline.',
    facebook: 'Copy a post URL from Facebook. Note: Many Facebook posts require login to view.',
    tiktok: 'TikTok embeds are limited. Copy video URLs for best results.',
  };

  return instructions[platform] || 'Paste the profile or content URL to generate an embed.';
}

// Export helper for admin UI
export const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  youtube: '▶️',
  twitter: '🐦',
  facebook: '📘',
  tiktok: '🎵',
  imdb: '🎬',
  wikipedia: '📚',
  official_website: '🌐',
};

