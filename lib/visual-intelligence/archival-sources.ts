/**
 * Archival Sources Module
 * Utilities for managing archival image sources and outreach
 */

import type {
  ArchivalSourceType,
  LicenseType,
  VisualType,
  VisualTier,
  ArchivalSource,
} from './types';

export interface VisualTypeBadgeColors {
  icon: string;
  text: string;
  bg: string;
  border: string;
  label: string;
}

/**
 * Get badge colors for visual type
 */
export function getVisualTypeBadgeColor(type: VisualType): VisualTypeBadgeColors {
  const colorMap: Partial<Record<VisualType, { color: string; label: string }>> = {
    poster: { color: 'blue', label: 'Poster' },
    still: { color: 'green', label: 'Still' },
    'behind-scenes': { color: 'purple', label: 'Behind Scenes' },
    promotional: { color: 'amber', label: 'Promotional' },
    premiere: { color: 'red', label: 'Premiere' },
    candid: { color: 'pink', label: 'Candid' },
    archival: { color: 'indigo', label: 'Archival' },
    archival_still: { color: 'green', label: 'Archival Still' },
    archival_poster: { color: 'indigo', label: 'Archival Poster' },
    restored: { color: 'teal', label: 'Restored' },
    magazine: { color: 'orange', label: 'Magazine' },
    newspaper: { color: 'gray', label: 'Newspaper' },
    portrait: { color: 'violet', label: 'Portrait' },
    group: { color: 'cyan', label: 'Group Photo' },
    award: { color: 'yellow', label: 'Award' },
    event: { color: 'emerald', label: 'Event' },
    lobby_card: { color: 'amber', label: 'Lobby Card' },
    press_photo: { color: 'blue', label: 'Press Photo' },
    original_poster: { color: 'green', label: 'Verified Original' },
    studio_photo: { color: 'sky', label: 'Studio Photo' },
    press_kit_photo: { color: 'blue', label: 'Press Kit' },
    magazine_ad: { color: 'amber', label: 'Magazine Ad' },
    newspaper_clipping: { color: 'gray', label: 'Newspaper Clipping' },
    song_book_cover: { color: 'purple', label: 'Song Book' },
    cassette_cover: { color: 'rose', label: 'Cassette Cover' },
    re_release_poster: { color: 'orange', label: 'Re-release Poster' },
    archive_card: { color: 'indigo', label: 'Archive Card' },
    placeholder: { color: 'gray', label: 'Placeholder' },
  };

  const config = colorMap[type] || { color: 'gray', label: type.replace(/[_-]/g, ' ') };
  const { color, label } = config;

  // Generate Tailwind-compatible class names
  return {
    icon: `text-${color}-400`,
    text: `text-${color}-300`,
    bg: `bg-${color}-900/80`,
    border: `border-${color}-700`,
    label,
  };
}

/**
 * Check if source requires attribution
 */
export function requiresAttribution(license: LicenseType): boolean {
  const noAttributionLicenses: LicenseType[] = ['public-domain'];
  return !noAttributionLicenses.includes(license);
}

/**
 * Generate attribution text for an image
 * Can be called with either an ArchivalSource object or individual parameters
 */
export function generateAttributionText(
  sourceOrType: ArchivalSource | ArchivalSourceType,
  sourceName?: string,
  license?: LicenseType
): string {
  let name: string;
  let licenseType: LicenseType | undefined;

  if (typeof sourceOrType === 'object') {
    // Called with ArchivalSource object
    const source = sourceOrType;
    name = source.source_name || source.name || 'Unknown Source';
    licenseType = source.license_type || source.default_license;
  } else {
    // Called with ArchivalSourceType string
    name = sourceName || sourceOrType.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    licenseType = license;
  }

  if (licenseType === 'public-domain' || licenseType === 'public_domain') {
    return `Image from ${name} (Public Domain)`;
  }

  if (licenseType === 'cc-by' || licenseType === 'cc-by-sa' || licenseType === 'cc-by-nc') {
    return `Image © ${name}, used under ${licenseType.toUpperCase()} license`;
  }

  if (licenseType === 'permission-granted' || licenseType === 'permission_granted') {
    return `Image courtesy of ${name}, used with permission`;
  }

  return `Image from ${name}`;
}

/**
 * Get suggested license for a source type
 */
export function getSuggestedLicense(sourceType: ArchivalSourceType): LicenseType {
  const suggestions: Partial<Record<ArchivalSourceType, LicenseType>> = {
    nfai: 'permission-granted',
    'studio-archive': 'licensed',
    studio_archive: 'licensed',
    'family-collection': 'permission-granted',
    family_collection: 'permission-granted',
    family_archive: 'permission-granted',
    'magazine-archive': 'fair-use',
    magazine: 'fair-use',
    'newspaper-archive': 'fair-use',
    newspaper: 'fair-use',
    book: 'fair-use',
    'film-society': 'cc-by-nc',
    film_society: 'cc-by-nc',
    museum: 'permission-granted',
    'private-collection': 'permission-granted',
    private_collection: 'permission-granted',
    'public-domain': 'public-domain',
    public_domain: 'public-domain',
    'fan-contributed': 'cc-by',
    government_archive: 'permission-granted',
    state_cultural_dept: 'permission-granted',
    university: 'fair-use',
    university_archive: 'fair-use',
    personal_archive: 'permission-granted',
    community: 'cc-by',
  };
  return suggestions[sourceType] || 'unknown';
}

/**
 * Generate NFAI request email template
 * Accepts either a single movie title or an array of titles
 */
export function generateNFAIRequestEmail(movieTitleOrTitles: string | string[], movieYear?: number): string {
  const titles = Array.isArray(movieTitleOrTitles) ? movieTitleOrTitles : [movieTitleOrTitles];
  const year = movieYear ? ` (${movieYear})` : '';
  
  if (titles.length === 1) {
    return `
Subject: Request for Archival Images - ${titles[0]}${year}

Dear Sir/Madam,

I am writing to request permission to use archival images of the Telugu film "${titles[0]}"${year} for educational and documentary purposes on our film heritage website.

We are committed to:
1. Proper attribution to NFAI
2. Non-commercial use only
3. Maintaining image integrity
4. Linking back to NFAI resources

Please let us know if this would be possible and what the process would be.

Thank you for preserving our cinematic heritage.

Best regards,
Telugu Portal Team
    `.trim();
  }
  
  const movieList = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  return `
Subject: Request for Archival Images - ${titles.length} Telugu Films

Dear Sir/Madam,

I am writing to request permission to use archival images of the following Telugu films for educational and documentary purposes on our film heritage website:

${movieList}

We are committed to:
1. Proper attribution to NFAI
2. Non-commercial use only
3. Maintaining image integrity
4. Linking back to NFAI resources

Please let us know if this would be possible and what the process would be.

Thank you for preserving our cinematic heritage.

Best regards,
Telugu Portal Team
  `.trim();
}

/**
 * Generate family outreach template
 */
export function generateFamilyOutreachTemplate(
  celebrityName: string,
  relationship: string
): string {
  return `
Subject: Request to Share ${celebrityName}'s Legacy

Dear ${relationship},

We are building a digital archive celebrating the legacy of ${celebrityName} and Telugu cinema.

We would be honored if you could share any photographs, memories, or documents that could help preserve and celebrate this legacy for future generations.

All materials would be:
- Properly credited to your family
- Used only with your explicit permission
- Preserved in high quality for historical purposes

We deeply respect ${celebrityName}'s contribution to Telugu cinema and want to ensure their legacy is properly documented.

Would you be open to a conversation about this?

With respect,
Telugu Portal Team
  `.trim();
}

/**
 * Calculate visual tier based on factors
 */
export function calculateVisualTier(factors: {
  hasVerifiedImages: boolean;
  hasArchivalSources: boolean;
  hasFamilyPermission: boolean;
  imageCount: number;
  sourceCount: number;
}): VisualTier {
  let score = 0;

  if (factors.hasVerifiedImages) score += 30;
  if (factors.hasArchivalSources) score += 25;
  if (factors.hasFamilyPermission) score += 25;
  if (factors.imageCount >= 10) score += 10;
  else if (factors.imageCount >= 5) score += 5;
  if (factors.sourceCount >= 3) score += 10;
  else if (factors.sourceCount >= 2) score += 5;

  if (score >= 80) return 'gold';
  if (score >= 60) return 'silver';
  if (score >= 40) return 'bronze';
  return 'unverified';
}

/**
 * Calculate archival confidence score
 * Can be called with object params or individual parameters
 */
export function calculateArchivalConfidence(
  sourceTypeOrParams: ArchivalSourceType | {
    verifiedCount: number;
    totalCount: number;
    sourceCount: number;
    hasFamilyPermission: boolean;
    hasNFAI: boolean;
  },
  imageType?: VisualType,
  isVerified?: boolean
): number {
  // Handle object-style params
  if (typeof sourceTypeOrParams === 'object') {
    const { verifiedCount, totalCount, sourceCount, hasFamilyPermission, hasNFAI } = sourceTypeOrParams;
    let score = 0;

    // Verification ratio (0-40 points)
    if (totalCount > 0) {
      score += (verifiedCount / totalCount) * 40;
    }

    // Source diversity (0-20 points)
    score += Math.min(sourceCount * 5, 20);

    // Special permissions (0-40 points)
    if (hasFamilyPermission) score += 20;
    if (hasNFAI) score += 20;

    return Math.min(Math.round(score), 100);
  }

  // Handle individual params (sourceType, imageType, isVerified)
  const sourceType = sourceTypeOrParams;
  let score = 50; // Base score

  // Boost for official sources
  if (sourceType === 'nfai' || sourceType === 'government_archive') {
    score += 30;
  } else if (sourceType === 'studio_archive' || sourceType === 'studio-archive') {
    score += 25;
  } else if (sourceType === 'family_collection' || sourceType === 'family-collection') {
    score += 20;
  } else if (sourceType === 'museum' || sourceType === 'university') {
    score += 15;
  }

  // Boost for certain image types
  if (imageType === 'archival' || imageType === 'archival_still' || imageType === 'archival_poster') {
    score += 10;
  }

  // Boost for verified
  if (isVerified) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Known archival sources (alias for DEFAULT_ARCHIVAL_SOURCES)
 */
export const KNOWN_SOURCES = [
  { id: 'nfai', code: 'nfai', name: 'NFAI', description: 'National Film Archive of India - Premier film preservation institution', type: 'nfai' as ArchivalSourceType, typicalLicense: 'permission_granted' as LicenseType, tier: 1, accessType: 'request_required', email: 'director@nfrn.in', website: 'https://nfrn.in' },
  { id: 'studio', code: 'studio', name: 'Studio Archive', description: 'Official studio archives with production stills and promotional material', type: 'studio_archive' as ArchivalSourceType, typicalLicense: 'licensed' as LicenseType, tier: 1, accessType: 'request_required', email: '', website: '' },
  { id: 'family', code: 'family', name: 'Family Collection', description: 'Personal collections from celebrity families', type: 'family_collection' as ArchivalSourceType, typicalLicense: 'permission_granted' as LicenseType, tier: 2, accessType: 'request_required', email: '', website: '' },
  { id: 'public', code: 'public', name: 'Public Domain', description: 'Works in the public domain with no copyright restrictions', type: 'public_domain' as ArchivalSourceType, typicalLicense: 'public_domain' as LicenseType, tier: 1, accessType: 'open_access', email: '', website: '' },
  { id: 'wikimedia', code: 'wikimedia', name: 'Wikimedia Commons', description: 'Free media repository with Creative Commons licensing', type: 'public_domain' as ArchivalSourceType, typicalLicense: 'cc-by-sa' as LicenseType, tier: 1, accessType: 'open_access', email: '', website: 'https://commons.wikimedia.org' },
  { id: 'archive-org', code: 'archive-org', name: 'Internet Archive', description: 'Digital library with historical content', type: 'public_domain' as ArchivalSourceType, typicalLicense: 'public_domain' as LicenseType, tier: 1, accessType: 'open_access', email: '', website: 'https://archive.org' },
  { id: 'government', code: 'government', name: 'Government Archive', description: 'State and central government cultural archives', type: 'government_archive' as ArchivalSourceType, typicalLicense: 'archive_license' as LicenseType, tier: 2, accessType: 'request_required', email: '', website: '' },
  { id: 'museum', code: 'museum', name: 'Museum', description: 'Film and cultural museum collections', type: 'museum' as ArchivalSourceType, typicalLicense: 'permission_granted' as LicenseType, tier: 2, accessType: 'request_required', email: '', website: '' },
  { id: 'university', code: 'university', name: 'University Archive', description: 'Academic film studies and media archives', type: 'university' as ArchivalSourceType, typicalLicense: 'archive_license' as LicenseType, tier: 2, accessType: 'request_required', email: '', website: '' },
];

/**
 * Default archival sources
 */
export const DEFAULT_ARCHIVAL_SOURCES: ArchivalSource[] = [
  {
    id: 'nfai',
    name: 'National Film Archive of India',
    type: 'nfai',
    website: 'https://nfrn.in',
    outreach_status: 'not-contacted',
    default_license: 'permission-granted',
  },
  {
    id: 'internet-archive',
    name: 'Internet Archive',
    type: 'public-domain',
    website: 'https://archive.org',
    outreach_status: 'approved',
    default_license: 'public-domain',
  },
  {
    id: 'wikimedia',
    name: 'Wikimedia Commons',
    type: 'public-domain',
    website: 'https://commons.wikimedia.org',
    outreach_status: 'approved',
    default_license: 'cc-by-sa',
  },
];

