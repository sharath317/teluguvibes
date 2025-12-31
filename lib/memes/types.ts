/**
 * MEMES & CARTOONS - TYPES
 *
 * Legal-only meme and cartoon system.
 *
 * ALLOWED SOURCES ONLY:
 * - Wikimedia Commons
 * - CC-licensed meme templates
 * - Original AI-generated cartoons
 * - Parody captions (transformative)
 *
 * NO GOOGLE IMAGE SCRAPING!
 */

// ============================================================
// MEME TYPES
// ============================================================

export type MemeCategory =
  | 'movie_meme'
  | 'political_satire'
  | 'relatable'
  | 'celebrity'
  | 'sports'
  | 'festival'
  | 'trending';

export type MemeFormat =
  | 'image_text'       // Classic meme format
  | 'cartoon'          // Original cartoon
  | 'quote_card'       // Quote with background
  | 'comparison'       // Before/After
  | 'reaction';        // Reaction image

export type ContentLicense =
  | 'cc0'              // Public domain
  | 'cc_by'            // Attribution required
  | 'cc_by_sa'         // Attribution + ShareAlike
  | 'fair_use'         // Transformative parody
  | 'original'         // Created by us
  | 'ai_generated';    // AI created

// ============================================================
// MEME CONTENT
// ============================================================

export interface TeluguMeme {
  id: string;

  // Content
  title_te: string;
  caption_te: string;
  caption_en?: string;

  // Visual
  image_url: string;
  thumbnail_url?: string;
  format: MemeFormat;

  // Source & License (CRITICAL)
  image_source: string;           // Where the image came from
  image_license: ContentLicense;
  attribution?: string;           // Credit if required
  source_url?: string;            // Original source URL
  is_original: boolean;           // Created by TeluguVibes

  // Classification
  category: MemeCategory;
  tags: string[];

  // Safety
  is_family_safe: boolean;
  contains_political: boolean;

  // Engagement
  view_count: number;
  share_count: number;
  likes: number;

  // Publishing
  status: 'draft' | 'review' | 'published' | 'rejected';
  rejection_reason?: string;
  published_at?: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// CARTOON
// ============================================================

export interface TeluguCartoon {
  id: string;

  // Content
  title_te: string;
  title_en: string;

  // Visual
  image_url: string;
  style: 'simple' | 'detailed' | 'comic_strip';
  panels: number;

  // AI Generation
  ai_generated: boolean;
  generation_prompt?: string;
  ai_model?: string;

  // Topic
  topic: string;
  category: MemeCategory;
  characters?: string[];

  // License
  license: 'original' | 'ai_generated';

  // Publishing
  status: 'draft' | 'review' | 'published';

  created_at: string;
}

// ============================================================
// MEME TEMPLATE
// ============================================================

export interface MemeTemplate {
  id: string;
  name: string;

  // Visual
  template_url: string;
  text_positions: TextPosition[];

  // License (MUST be verified)
  source: string;
  license: ContentLicense;
  attribution?: string;
  verified_legal: boolean;

  // Usage
  popularity: number;
  times_used: number;

  // Examples
  example_captions: string[];
}

export interface TextPosition {
  id: string;
  x: number;      // Percentage
  y: number;
  max_width: number;
  font_size: 'small' | 'medium' | 'large';
  color: string;
  align: 'left' | 'center' | 'right';
}

// ============================================================
// LEGAL SOURCES
// ============================================================

export const LEGAL_IMAGE_SOURCES = [
  {
    name: 'Wikimedia Commons',
    base_url: 'https://commons.wikimedia.org',
    api_url: 'https://commons.wikimedia.org/w/api.php',
    default_license: 'cc_by_sa' as ContentLicense,
  },
  {
    name: 'Unsplash',
    base_url: 'https://unsplash.com',
    api_url: 'https://api.unsplash.com',
    default_license: 'cc0' as ContentLicense,
  },
  {
    name: 'Pexels',
    base_url: 'https://pexels.com',
    api_url: 'https://api.pexels.com/v1',
    default_license: 'cc0' as ContentLicense,
  },
] as const;

// ============================================================
// CATEGORY CONFIG
// ============================================================

export const MEME_CATEGORY_CONFIG: Record<MemeCategory, {
  name_te: string;
  name_en: string;
  emoji: string;
  requires_review: boolean;
}> = {
  movie_meme: {
    name_te: 'సినిమా మీమ్స్',
    name_en: 'Movie Memes',
    emoji: '🎬',
    requires_review: false,
  },
  political_satire: {
    name_te: 'రాజకీయ వ్యంగ్యం',
    name_en: 'Political Satire',
    emoji: '🏛️',
    requires_review: true, // Always review political content
  },
  relatable: {
    name_te: 'రిలేటబుల్',
    name_en: 'Relatable Memes',
    emoji: '😂',
    requires_review: false,
  },
  celebrity: {
    name_te: 'సెలెబ్రిటీ',
    name_en: 'Celebrity Memes',
    emoji: '⭐',
    requires_review: true,
  },
  sports: {
    name_te: 'స్పోర్ట్స్',
    name_en: 'Sports Memes',
    emoji: '🏏',
    requires_review: false,
  },
  festival: {
    name_te: 'పండుగలు',
    name_en: 'Festival Memes',
    emoji: '🎉',
    requires_review: false,
  },
  trending: {
    name_te: 'ట్రెండింగ్',
    name_en: 'Trending Memes',
    emoji: '🔥',
    requires_review: true,
  },
};



