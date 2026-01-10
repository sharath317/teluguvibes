/**
 * Social Media oEmbed Utilities
 * Handles embedding social media content
 */

import { Instagram, Twitter, Youtube, Facebook, ExternalLink, type LucideIcon } from 'lucide-react';

export type SocialPlatform = 
  | 'instagram'
  | 'twitter'
  | 'youtube'
  | 'facebook'
  | 'tiktok'
  | 'threads'
  | 'linkedin'
  | 'other';

// Emoji icons for simple rendering as string
export const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  twitter: '🐦',
  youtube: '📺',
  facebook: '👤',
  tiktok: '🎵',
  threads: '🧵',
  linkedin: '💼',
  other: '🔗',
};

// Lucide icon components for when you need actual components
export const PLATFORM_ICON_COMPONENTS: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  facebook: Facebook,
  tiktok: ExternalLink,
  threads: ExternalLink,
  linkedin: ExternalLink,
  other: ExternalLink,
};

export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: 'from-purple-600 to-pink-500',
  twitter: 'text-blue-400',
  youtube: 'text-red-600',
  facebook: 'text-blue-600',
  tiktok: 'text-black dark:text-white',
  threads: 'text-black dark:text-white',
  linkedin: 'text-blue-700',
  other: 'text-gray-500',
};

export interface OEmbedResponse {
  html: string;
  width?: number;
  height?: number;
  thumbnail_url?: string;
  author_name?: string;
  title?: string;
  type: string;
}

/**
 * Extract platform from URL
 */
export function detectPlatform(url: string): SocialPlatform {
  const lowercaseUrl = url.toLowerCase();
  
  if (lowercaseUrl.includes('instagram.com')) return 'instagram';
  if (lowercaseUrl.includes('twitter.com') || lowercaseUrl.includes('x.com')) return 'twitter';
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) return 'youtube';
  if (lowercaseUrl.includes('facebook.com') || lowercaseUrl.includes('fb.com')) return 'facebook';
  if (lowercaseUrl.includes('tiktok.com')) return 'tiktok';
  if (lowercaseUrl.includes('threads.net')) return 'threads';
  if (lowercaseUrl.includes('linkedin.com')) return 'linkedin';
  
  return 'other';
}

/**
 * Fetch oEmbed data for a URL
 */
export async function fetchOEmbed(url: string): Promise<OEmbedResponse | null> {
  const platform = detectPlatform(url);
  
  // In a real implementation, this would call the respective oEmbed APIs
  // For now, we return a placeholder
  console.log(`Fetching oEmbed for ${platform}: ${url}`);
  
  return null;
}

