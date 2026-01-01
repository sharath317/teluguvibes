/**
 * Platform Capabilities Configuration
 * 
 * Defines embedding support, media fetching, and glamour suitability
 * for each social media platform.
 * 
 * LEGAL CONSTRAINTS:
 * - Snapchat: No public embedding API
 * - TikTok: Limited oEmbed, web-only
 * - Twitter/X: Full oEmbed but rate limited
 * - Instagram: oEmbed requires business auth for some features
 * - YouTube: Full oEmbed support
 * - Facebook: oEmbed with restrictions
 */

export type PlatformType = 
  | 'instagram' 
  | 'youtube' 
  | 'twitter' 
  | 'facebook' 
  | 'tiktok' 
  | 'snapchat'
  | 'imdb'
  | 'wikipedia'
  | 'official_website';

export interface PlatformCapability {
  /** Platform identifier */
  id: PlatformType;
  
  /** Display name */
  name: string;
  
  /** Emoji icon */
  icon: string;
  
  /** Whether oEmbed is supported */
  supportsEmbed: boolean;
  
  /** Embed support level: 'full' | 'partial' | 'none' */
  embedLevel: 'full' | 'partial' | 'none';
  
  /** Whether media can be fetched (ALWAYS FALSE - no scraping) */
  supportsMedia: false;
  
  /** Priority score for content selection (1.0 = highest) */
  priorityScore: number;
  
  /** Glamour content suitability score (1.0 = highest) */
  glamSuitabilityScore: number;
  
  /** oEmbed endpoint URL (if supported) */
  oembedEndpoint?: string;
  
  /** Maximum embed width */
  maxEmbedWidth?: number;
  
  /** Whether profile embeds are supported */
  supportsProfileEmbed: boolean;
  
  /** Whether post embeds are supported */
  supportsPostEmbed: boolean;
  
  /** Wikidata property ID */
  wikidataProperty?: string;
  
  /** URL patterns for detection */
  urlPatterns: RegExp[];
  
  /** Legal notes and constraints */
  legalNotes: string;
  
  /** Rate limit info */
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

/**
 * Platform capabilities configuration
 */
export const PLATFORM_CAPABILITIES: Record<PlatformType, PlatformCapability> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    supportsEmbed: true,
    embedLevel: 'full',
    supportsMedia: false,
    priorityScore: 1.0,
    glamSuitabilityScore: 1.0,
    oembedEndpoint: 'https://graph.facebook.com/v18.0/instagram_oembed',
    maxEmbedWidth: 540,
    supportsProfileEmbed: false,
    supportsPostEmbed: true,
    wikidataProperty: 'P2003',
    urlPatterns: [
      /instagram\.com\/([^\/\?]+)/,
      /instagr\.am\/([^\/\?]+)/,
    ],
    legalNotes: 'oEmbed requires Facebook Graph API token for full access. Profile embedding requires app review.',
    rateLimit: { requests: 200, windowMs: 3600000 },
  },

  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    supportsEmbed: true,
    embedLevel: 'full',
    supportsMedia: false,
    priorityScore: 0.95,
    glamSuitabilityScore: 0.8,
    oembedEndpoint: 'https://www.youtube.com/oembed',
    maxEmbedWidth: 640,
    supportsProfileEmbed: false,
    supportsPostEmbed: true,
    wikidataProperty: 'P2397',
    urlPatterns: [
      /youtube\.com\/(channel|c|user)\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /youtu\.be\/([^\/\?]+)/,
    ],
    legalNotes: 'Full oEmbed support. Respect YouTube Terms of Service.',
    rateLimit: { requests: 10000, windowMs: 86400000 },
  },

  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    icon: '🐦',
    supportsEmbed: true,
    embedLevel: 'full',
    supportsMedia: false,
    priorityScore: 0.85,
    glamSuitabilityScore: 0.6,
    oembedEndpoint: 'https://publish.twitter.com/oembed',
    maxEmbedWidth: 550,
    supportsProfileEmbed: false,
    supportsPostEmbed: true,
    wikidataProperty: 'P2002',
    urlPatterns: [
      /twitter\.com\/([^\/\?]+)/,
      /x\.com\/([^\/\?]+)/,
    ],
    legalNotes: 'Full oEmbed support via publish.twitter.com. Profile embeds not supported.',
    rateLimit: { requests: 300, windowMs: 900000 },
  },

  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    supportsEmbed: true,
    embedLevel: 'partial',
    supportsMedia: false,
    priorityScore: 0.7,
    glamSuitabilityScore: 0.5,
    oembedEndpoint: 'https://graph.facebook.com/v18.0/oembed_page',
    maxEmbedWidth: 500,
    supportsProfileEmbed: false,
    supportsPostEmbed: true,
    wikidataProperty: 'P2013',
    urlPatterns: [
      /facebook\.com\/([^\/\?]+)/,
      /fb\.com\/([^\/\?]+)/,
    ],
    legalNotes: 'Limited oEmbed. Page embeds require app review. Post embeds work with public posts only.',
    rateLimit: { requests: 200, windowMs: 3600000 },
  },

  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    supportsEmbed: true,
    embedLevel: 'partial',
    supportsMedia: false,
    priorityScore: 0.9,
    glamSuitabilityScore: 0.9,
    oembedEndpoint: 'https://www.tiktok.com/oembed',
    maxEmbedWidth: 325,
    supportsProfileEmbed: false,
    supportsPostEmbed: true,
    wikidataProperty: 'P7085',
    urlPatterns: [
      /tiktok\.com\/@([^\/\?]+)/,
      /vm\.tiktok\.com\/([^\/\?]+)/,
    ],
    legalNotes: 'oEmbed for videos only. Profile embeds not supported. Web-only rendering.',
  },

  snapchat: {
    id: 'snapchat',
    name: 'Snapchat',
    icon: '👻',
    supportsEmbed: false,
    embedLevel: 'none',
    supportsMedia: false,
    priorityScore: 0.5,
    glamSuitabilityScore: 0.7,
    supportsProfileEmbed: false,
    supportsPostEmbed: false,
    wikidataProperty: 'P11012',
    urlPatterns: [
      /snapchat\.com\/add\/([^\/\?]+)/,
      /snap\.chat\/([^\/\?]+)/,
    ],
    legalNotes: 'NO PUBLIC EMBEDDING API. Metadata storage only. Cannot display content.',
  },

  imdb: {
    id: 'imdb',
    name: 'IMDB',
    icon: '🎬',
    supportsEmbed: false,
    embedLevel: 'none',
    supportsMedia: false,
    priorityScore: 0.3,
    glamSuitabilityScore: 0.2,
    supportsProfileEmbed: false,
    supportsPostEmbed: false,
    wikidataProperty: 'P345',
    urlPatterns: [
      /imdb\.com\/name\/(nm\d+)/,
    ],
    legalNotes: 'Reference only. No embedding support.',
  },

  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    icon: '📖',
    supportsEmbed: false,
    embedLevel: 'none',
    supportsMedia: false,
    priorityScore: 0.2,
    glamSuitabilityScore: 0.1,
    supportsProfileEmbed: false,
    supportsPostEmbed: false,
    urlPatterns: [
      /wikipedia\.org\/wiki\/([^\/\?]+)/,
    ],
    legalNotes: 'Reference only. Images under various licenses.',
  },

  official_website: {
    id: 'official_website',
    name: 'Official Website',
    icon: '🌐',
    supportsEmbed: false,
    embedLevel: 'none',
    supportsMedia: false,
    priorityScore: 0.4,
    glamSuitabilityScore: 0.3,
    supportsProfileEmbed: false,
    supportsPostEmbed: false,
    wikidataProperty: 'P856',
    urlPatterns: [
      /.+/,
    ],
    legalNotes: 'Reference only.',
  },
};

/**
 * Get platform capability by ID
 */
export function getPlatformCapability(platform: PlatformType): PlatformCapability {
  return PLATFORM_CAPABILITIES[platform];
}

/**
 * Check if a platform supports embedding
 */
export function supportsEmbed(platform: PlatformType): boolean {
  return PLATFORM_CAPABILITIES[platform]?.supportsEmbed ?? false;
}

/**
 * Get embed level for a platform
 */
export function getEmbedLevel(platform: PlatformType): 'full' | 'partial' | 'none' {
  return PLATFORM_CAPABILITIES[platform]?.embedLevel ?? 'none';
}

/**
 * Get platforms sorted by priority for Hot content
 */
export function getHotContentPriorityOrder(): PlatformType[] {
  return Object.values(PLATFORM_CAPABILITIES)
    .filter(p => p.glamSuitabilityScore > 0.5)
    .sort((a, b) => b.glamSuitabilityScore - a.glamSuitabilityScore)
    .map(p => p.id);
}

/**
 * Get platforms that support embedding
 */
export function getEmbeddablePlatforms(): PlatformType[] {
  return Object.values(PLATFORM_CAPABILITIES)
    .filter(p => p.supportsEmbed)
    .map(p => p.id);
}

/**
 * Get all platforms with their Wikidata properties
 */
export function getWikidataProperties(): Record<PlatformType, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [id, cap] of Object.entries(PLATFORM_CAPABILITIES)) {
    result[id] = cap.wikidataProperty;
  }
  return result as Record<PlatformType, string | undefined>;
}

/**
 * Detect platform from URL
 */
export function detectPlatformFromUrl(url: string): PlatformType | null {
  for (const [platformId, capability] of Object.entries(PLATFORM_CAPABILITIES)) {
    for (const pattern of capability.urlPatterns) {
      if (pattern.test(url)) {
        return platformId as PlatformType;
      }
    }
  }
  return null;
}

/**
 * Get embed badge info for Admin UI
 */
export function getEmbedBadge(platform: PlatformType): {
  label: string;
  color: string;
  icon: string;
} {
  const cap = PLATFORM_CAPABILITIES[platform];
  
  if (!cap) {
    return { label: 'Unknown', color: 'gray', icon: '❓' };
  }
  
  switch (cap.embedLevel) {
    case 'full':
      return { label: 'Full Embed', color: 'green', icon: '✓' };
    case 'partial':
      return { label: 'Partial Embed', color: 'yellow', icon: '⚠️' };
    case 'none':
      return { label: 'No Embed', color: 'red', icon: '✗' };
    default:
      return { label: 'Unknown', color: 'gray', icon: '❓' };
  }
}

/**
 * Get legal notes for a platform
 */
export function getPlatformLegalNotes(platform: PlatformType): string {
  return PLATFORM_CAPABILITIES[platform]?.legalNotes ?? 'No specific legal notes.';
}

// Export default order for Hot & Glamour content
export const HOT_CONTENT_PLATFORM_PRIORITY: PlatformType[] = [
  'instagram',  // Best for glamour content
  'tiktok',     // Good for viral/trending
  'youtube',    // Good for longer content
  'twitter',    // Good for news/buzz
  'facebook',   // Lower priority
  // snapchat - NO EMBED, metadata only
  // imdb, wikipedia, official_website - reference only
];

// Platforms that should NEVER attempt embedding
export const NO_EMBED_PLATFORMS: PlatformType[] = [
  'snapchat',
  'imdb',
  'wikipedia',
  'official_website',
];

