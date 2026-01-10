/**
 * Visual Intelligence Types
 * Type definitions for archival images, visual confidence, and media verification
 */

export type VisualType =
  | 'poster'
  | 'still'
  | 'behind-scenes'
  | 'promotional'
  | 'premiere'
  | 'candid'
  | 'archival'
  | 'archival_still'
  | 'archival_poster'
  | 'restored'
  | 'magazine'
  | 'newspaper'
  | 'portrait'
  | 'group'
  | 'award'
  | 'event'
  | 'lobby_card'
  | 'press_photo'
  | 'original_poster'
  | 'studio_photo'
  | 'press_kit_photo'
  | 'magazine_ad'
  | 'newspaper_clipping'
  | 'song_book_cover'
  | 'cassette_cover'
  | 're_release_poster'
  | 'archive_card'
  | 'placeholder';

export type ArchivalSourceType =
  | 'nfai'
  | 'studio-archive'
  | 'studio_archive'
  | 'family-collection'
  | 'family_collection'
  | 'family_archive'
  | 'magazine-archive'
  | 'magazine'
  | 'newspaper-archive'
  | 'newspaper'
  | 'book'
  | 'film-society'
  | 'film_society'
  | 'museum'
  | 'private-collection'
  | 'private_collection'
  | 'public-domain'
  | 'public_domain'
  | 'fan-contributed'
  | 'government_archive'
  | 'state_cultural_dept'
  | 'university'
  | 'university_archive'
  | 'personal_archive'
  | 'community';

export type LicenseType =
  | 'public-domain'
  | 'public_domain'
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nc'
  | 'permission-granted'
  | 'permission_granted'
  | 'fair-use'
  | 'fair_use'
  | 'editorial'
  | 'editorial_use'
  | 'licensed'
  | 'archive_license'
  | 'unknown';

export type VisualTier = 'gold' | 'silver' | 'bronze' | 'unverified' | 1 | 2 | 3;

export type OutreachStatus =
  | 'not-contacted'
  | 'not_contacted'
  | 'contacted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'draft'
  | 'sent'
  | 'pending_response'
  | 'responded'
  | 'partial_approval'
  | 'negotiating'
  | 'completed'
  | 'cancelled';

export interface MovieArchivalImage {
  id: string;
  movie_id: string;
  image_url: string;
  thumbnail_url?: string;
  visual_type: VisualType;
  image_type?: VisualType; // Alias for visual_type (used in components)
  source_type: ArchivalSourceType;
  license_type: LicenseType;
  source_name?: string; // Name of the archival source
  caption?: string;
  caption_te?: string;
  year_taken?: number;
  year_estimated?: number; // Estimated year if exact year is unknown
  attribution?: string;
  attribution_text?: string; // Attribution text for display
  description?: string; // Description of the image
  is_verified: boolean;
  is_primary?: boolean; // Whether this is the primary image
  verification_date?: string;
  confidence_score: number;
  created_at: string;
}

export interface ArchivalSource {
  id?: string;
  name?: string;
  source_name?: string;
  type?: ArchivalSourceType;
  source_type?: ArchivalSourceType;
  license_type?: LicenseType;
  year_estimated?: number;
  contact_email?: string;
  contact_name?: string;
  website?: string;
  outreach_status?: 'not-contacted' | 'contacted' | 'pending' | 'approved' | 'rejected';
  default_license?: LicenseType;
  notes?: string;
}

export interface ArchiveCardData {
  id: string;
  movie_id: string;
  movie_title: string;
  movie_year?: number;
  visual_tier: VisualTier;
  image_count: number;
  verified_count: number;
  primary_image_url?: string;
  sources: ArchivalSourceType[];
  archival_reasons: string[];
  last_updated: string;
  // Convenience aliases for UI components
  title?: string;
  year?: number;
  lead_actor?: string;
  verified_limitation?: boolean;
  archive_reason?: string;
  metadata_source?: string;
}

export interface VisualConfidenceResult {
  movieId: string;
  tier: VisualTier;
  score: number; // 0-100
  confidence: number; // Alias for score (0-100)
  visualType: VisualType | null; // Inferred visual type
  factors: {
    hasVerifiedImages: boolean;
    hasArchivalSources: boolean;
    hasFamilyPermission: boolean;
    imageCount: number;
    sourceCount: number;
  };
}

// Labels for UI display
export const VISUAL_TYPE_LABELS: Record<VisualType, string> = {
  poster: 'Poster',
  still: 'Movie Still',
  'behind-scenes': 'Behind the Scenes',
  promotional: 'Promotional',
  premiere: 'Premiere',
  candid: 'Candid',
  archival: 'Archival',
  archival_still: 'Archival Still',
  archival_poster: 'Archival Poster',
  restored: 'Restored',
  magazine: 'Magazine',
  newspaper: 'Newspaper',
  portrait: 'Portrait',
  group: 'Group Photo',
  award: 'Award Ceremony',
  event: 'Event',
  lobby_card: 'Lobby Card',
  press_photo: 'Press Photo',
  original_poster: 'Original Poster',
  studio_photo: 'Studio Photo',
  press_kit_photo: 'Press Kit Photo',
  magazine_ad: 'Magazine Ad',
  newspaper_clipping: 'Newspaper Clipping',
  song_book_cover: 'Song Book Cover',
  cassette_cover: 'Cassette Cover',
  re_release_poster: 'Re-release Poster',
  archive_card: 'Archive Card',
  placeholder: 'Placeholder',
};

export const SOURCE_TYPE_LABELS: Record<ArchivalSourceType, string> = {
  nfai: 'National Film Archive of India',
  'studio-archive': 'Studio Archive',
  studio_archive: 'Studio Archive',
  'family-collection': 'Family Collection',
  family_collection: 'Family Collection',
  family_archive: 'Family Archive',
  'magazine-archive': 'Magazine Archive',
  magazine: 'Magazine',
  'newspaper-archive': 'Newspaper Archive',
  newspaper: 'Newspaper',
  book: 'Book',
  'film-society': 'Film Society',
  film_society: 'Film Society',
  museum: 'Museum',
  'private-collection': 'Private Collection',
  private_collection: 'Private Collection',
  'public-domain': 'Public Domain',
  public_domain: 'Public Domain',
  'fan-contributed': 'Fan Contributed',
  government_archive: 'Government Archive',
  state_cultural_dept: 'State Cultural Department',
  university: 'University',
  university_archive: 'University Archive',
  personal_archive: 'Personal Archive',
  community: 'Community',
};

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  'public-domain': 'Public Domain',
  public_domain: 'Public Domain',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'permission-granted': 'Permission Granted',
  permission_granted: 'Permission Granted',
  'fair-use': 'Fair Use',
  fair_use: 'Fair Use',
  editorial: 'Editorial Use',
  editorial_use: 'Editorial Use',
  licensed: 'Licensed',
  archive_license: 'Archive License',
  unknown: 'Unknown',
};

export const VISUAL_TIER_CONFIG: Record<VisualTier, { label: string; color: string; minScore: number }> = {
  // String tiers
  gold: { label: 'Gold', color: '#ffd700', minScore: 80 },
  silver: { label: 'Silver', color: '#c0c0c0', minScore: 60 },
  bronze: { label: 'Bronze', color: '#cd7f32', minScore: 40 },
  unverified: { label: 'Unverified', color: '#808080', minScore: 0 },
  // Numeric tiers (aliases)
  1: { label: 'Gold', color: '#ffd700', minScore: 80 },
  2: { label: 'Silver', color: '#c0c0c0', minScore: 60 },
  3: { label: 'Bronze', color: '#cd7f32', minScore: 40 },
};

