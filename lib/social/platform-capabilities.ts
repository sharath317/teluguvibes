/**
 * Social Platform Capabilities
 * Defines what features each social platform supports
 */

export type PlatformType = 
  | 'instagram'
  | 'twitter'
  | 'youtube'
  | 'facebook'
  | 'tiktok'
  | 'threads'
  | 'linkedin'
  | 'other';

export interface PlatformCapability {
  name: string;
  icon?: string;
  supportsEmbed: boolean;
  supportsOAuth: boolean;
  supportsApi: boolean;
  maxPostLength?: number;
  mediaTypes: ('image' | 'video' | 'text' | 'link' | 'carousel')[];
  color: string;
  iconBg: string;
  embedWidth?: number;
  embedHeight?: number;
  apiDocs?: string;
}

export const PLATFORM_CAPABILITIES: Record<PlatformType, PlatformCapability> = {
  instagram: {
    name: 'Instagram',
    supportsEmbed: true,
    supportsOAuth: true,
    supportsApi: true,
    maxPostLength: 2200,
    mediaTypes: ['image', 'video', 'carousel'],
    color: 'from-purple-600 to-pink-500',
    iconBg: 'bg-gradient-to-br from-purple-600 to-pink-500',
    embedWidth: 400,
    embedHeight: 480,
  },
  twitter: {
    name: 'Twitter/X',
    supportsEmbed: true,
    supportsOAuth: true,
    supportsApi: true,
    maxPostLength: 280,
    mediaTypes: ['image', 'video', 'text', 'link'],
    color: 'text-blue-400',
    iconBg: 'bg-blue-400',
    embedWidth: 550,
    embedHeight: 400,
  },
  youtube: {
    name: 'YouTube',
    supportsEmbed: true,
    supportsOAuth: true,
    supportsApi: true,
    mediaTypes: ['video'],
    color: 'text-red-600',
    iconBg: 'bg-red-600',
    embedWidth: 560,
    embedHeight: 315,
  },
  facebook: {
    name: 'Facebook',
    supportsEmbed: true,
    supportsOAuth: true,
    supportsApi: true,
    maxPostLength: 63206,
    mediaTypes: ['image', 'video', 'text', 'link'],
    color: 'text-blue-600',
    iconBg: 'bg-blue-600',
    embedWidth: 500,
    embedHeight: 400,
  },
  tiktok: {
    name: 'TikTok',
    supportsEmbed: true,
    supportsOAuth: false,
    supportsApi: true,
    mediaTypes: ['video'],
    color: 'text-black dark:text-white',
    iconBg: 'bg-black',
    embedWidth: 325,
    embedHeight: 580,
  },
  threads: {
    name: 'Threads',
    supportsEmbed: true,
    supportsOAuth: false,
    supportsApi: false,
    maxPostLength: 500,
    mediaTypes: ['image', 'text'],
    color: 'text-black dark:text-white',
    iconBg: 'bg-black',
  },
  linkedin: {
    name: 'LinkedIn',
    supportsEmbed: false,
    supportsOAuth: true,
    supportsApi: true,
    maxPostLength: 3000,
    mediaTypes: ['image', 'video', 'text', 'link'],
    color: 'text-blue-700',
    iconBg: 'bg-blue-700',
  },
  other: {
    name: 'Other',
    supportsEmbed: false,
    supportsOAuth: false,
    supportsApi: false,
    mediaTypes: ['link'],
    color: 'text-gray-500',
    iconBg: 'bg-gray-500',
  },
};

/**
 * Get a badge/label for embed support
 */
export function getEmbedBadge(platform: PlatformType): { text: string; label: string; color: string; icon: string } {
  const capability = PLATFORM_CAPABILITIES[platform];
  
  if (capability.supportsEmbed && capability.supportsApi) {
    return { text: 'Full Support', label: 'Full Support', color: 'green', icon: '✅' };
  }
  if (capability.supportsEmbed) {
    return { text: 'Embed Only', label: 'Embed Only', color: 'yellow', icon: '📦' };
  }
  if (capability.supportsApi) {
    return { text: 'API Only', label: 'API Only', color: 'blue', icon: '🔌' };
  }
  return { text: 'Link Only', label: 'Link Only', color: 'gray', icon: '🔗' };
}

/**
 * Check if a platform supports a specific feature
 */
export function platformSupports(
  platform: PlatformType, 
  feature: 'embed' | 'oauth' | 'api'
): boolean {
  const capability = PLATFORM_CAPABILITIES[platform];
  
  switch (feature) {
    case 'embed': return capability.supportsEmbed;
    case 'oauth': return capability.supportsOAuth;
    case 'api': return capability.supportsApi;
    default: return false;
  }
}

