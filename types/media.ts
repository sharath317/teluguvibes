/**
 * Media Types
 * Type definitions for hot media, glamour content, and media entities
 */

export type GlamCategory =
  | 'photoshoot'
  | 'event'
  | 'candid'
  | 'movie-promotion'
  | 'award'
  | 'interview'
  | 'fashion'
  | 'lifestyle'
  | 'fitness'
  | 'traditional'
  | 'magazine'
  | 'brand';

export type SafetyRisk =
  | 'safe'
  | 'low'
  | 'medium'
  | 'high'
  | 'blocked'
  | 'pending';

export type MediaPlatform =
  | 'instagram'
  | 'youtube'
  | 'twitter'
  | 'tiktok'
  | 'image'
  | 'custom';

export type MediaStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'archived';

export interface CaptionVariant {
  id: string;
  text: string;
  tone: 'professional' | 'casual' | 'fun' | 'elegant' | 'dramatic';
  style: string;
  language: 'en' | 'te';
  confidence: number;
  selected?: boolean;
}

export interface MediaEntity {
  id: string;
  name: string;
  name_en: string;
  name_te?: string;
  slug: string;
  type: 'actor' | 'actress' | 'director' | 'celebrity' | 'model';
  entity_type: string;
  image_url?: string;
  total_media: number;
  trending_score: number;
  is_verified: boolean;
}

export interface HotMediaItem {
  id: string;
  entity_id?: string;
  entity_name?: string;
  entity_type?: string;
  platform: MediaPlatform;
  source_url?: string;
  embed_html?: string;
  embed_url?: string;
  image_url: string;
  thumbnail_url?: string;
  category: GlamCategory;
  tags: string[];
  ai_caption_variants?: CaptionVariant[];
  selected_caption?: string;
  safety_score: SafetyRisk;
  safety_details?: SafetyDetails;
  views: number;
  likes: number;
  trending_score: number;
  is_featured: boolean;
  is_hot: boolean;
  status: MediaStatus;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface SafetyDetails {
  nudity_score: number;
  violence_score: number;
  hate_score: number;
  overall_risk: SafetyRisk;
  flags: string[];
  reviewed_by?: string;
  reviewed_at?: string;
}

// Glam category configuration (Record version)
export const GLAM_CATEGORY_CONFIG: Record<GlamCategory, {
  label: string;
  labelTe: string;
  emoji: string;
  color: string;
}> = {
  photoshoot: {
    label: 'Photoshoot',
    labelTe: 'ఫోటో షూట్',
    emoji: '📸',
    color: '#ec4899',
  },
  event: {
    label: 'Event',
    labelTe: 'ఈవెంట్',
    emoji: '🎉',
    color: '#8b5cf6',
  },
  candid: {
    label: 'Candid',
    labelTe: 'క్యాండిడ్',
    emoji: '📷',
    color: '#06b6d4',
  },
  'movie-promotion': {
    label: 'Movie Promotion',
    labelTe: 'సినిమా ప్రమోషన్',
    emoji: '🎬',
    color: '#f59e0b',
  },
  award: {
    label: 'Award',
    labelTe: 'అవార్డు',
    emoji: '🏆',
    color: '#eab308',
  },
  interview: {
    label: 'Interview',
    labelTe: 'ఇంటర్వ్యూ',
    emoji: '🎤',
    color: '#3b82f6',
  },
  fashion: {
    label: 'Fashion',
    labelTe: 'ఫ్యాషన్',
    emoji: '👗',
    color: '#f472b6',
  },
  lifestyle: {
    label: 'Lifestyle',
    labelTe: 'లైఫ్‌స్టైల్',
    emoji: '✨',
    color: '#a855f7',
  },
  fitness: {
    label: 'Fitness',
    labelTe: 'ఫిట్‌నెస్',
    emoji: '💪',
    color: '#22c55e',
  },
  traditional: {
    label: 'Traditional',
    labelTe: 'సంప్రదాయ',
    emoji: '🪷',
    color: '#f97316',
  },
  magazine: {
    label: 'Magazine',
    labelTe: 'మ్యాగజైన్',
    emoji: '📖',
    color: '#64748b',
  },
  brand: {
    label: 'Brand',
    labelTe: 'బ్రాండ్',
    emoji: '🏷️',
    color: '#14b8a6',
  },
};

// Glam categories as array (for mapping in UI)
export const GLAM_CATEGORIES = Object.entries(GLAM_CATEGORY_CONFIG).map(([id, config]) => ({
  id: id as GlamCategory,
  ...config,
}));

// Safety risk configuration
export const SAFETY_RISK_CONFIG: Record<SafetyRisk, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  safe: {
    label: 'Safe',
    color: '#22c55e',
    bgColor: '#22c55e20',
    description: 'Content is safe for all audiences',
  },
  low: {
    label: 'Low Risk',
    color: '#84cc16',
    bgColor: '#84cc1620',
    description: 'Minor concerns, generally acceptable',
  },
  medium: {
    label: 'Medium Risk',
    color: '#eab308',
    bgColor: '#eab30820',
    description: 'Requires review before publishing',
  },
  high: {
    label: 'High Risk',
    color: '#f97316',
    bgColor: '#f9731620',
    description: 'Significant concerns, careful review needed',
  },
  blocked: {
    label: 'Blocked',
    color: '#ef4444',
    bgColor: '#ef444420',
    description: 'Content violates guidelines',
  },
  pending: {
    label: 'Pending Review',
    color: '#6b7280',
    bgColor: '#6b728020',
    description: 'Awaiting safety review',
  },
};

// Platform configuration
export const PLATFORM_CONFIG: Record<MediaPlatform, {
  label: string;
  color: string;
  icon: string;
}> = {
  instagram: {
    label: 'Instagram',
    color: '#e4405f',
    icon: '📸',
  },
  youtube: {
    label: 'YouTube',
    color: '#ff0000',
    icon: '▶️',
  },
  twitter: {
    label: 'Twitter/X',
    color: '#1da1f2',
    icon: '🐦',
  },
  tiktok: {
    label: 'TikTok',
    color: '#000000',
    icon: '🎵',
  },
  image: {
    label: 'Image',
    color: '#6b7280',
    icon: '🖼️',
  },
  custom: {
    label: 'Custom',
    color: '#8b5cf6',
    icon: '📁',
  },
};

