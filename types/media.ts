// Hot Media System Types

export type EntityType = 'actress' | 'anchor' | 'influencer' | 'model' | 'singer';

// Safety risk levels for content moderation
export type SafetyRisk = 'safe' | 'low' | 'medium' | 'high' | 'blocked' | 'pending';

// Audience emotion detection
export type AudienceEmotion = 'excitement' | 'admiration' | 'nostalgia' | 'curiosity' | 'bold';

// Glam content angle
export type GlamAngle = 'glam' | 'fashion' | 'viral' | 'bold' | 'elegant' | 'classic';

// Glam-specific categories for Hot section
export type GlamCategory =
  | 'beach_bikini'      // Beach & Swimwear
  | 'photoshoot_glam'   // Studio photoshoots
  | 'fashion_event'     // Fashion shows & events
  | 'magazine_cover'    // Magazine covers
  | 'viral_reel'        // Viral Instagram/YouTube
  | 'red_carpet'        // Red carpet looks
  | 'gym_fitness'       // Fitness & workout
  | 'traditional_glam'  // Saree & ethnic glam
  | 'western_glam'      // Western outfit glam
  | 'influencer';       // Influencer content

export type MediaType =
  | 'image'
  | 'instagram_post'
  | 'instagram_reel'
  | 'youtube_video'
  | 'youtube_short'
  | 'twitter_post'
  | 'facebook_post';

export type MediaSource =
  | 'wikimedia'
  | 'unsplash'
  | 'pexels'
  | 'tmdb'
  | 'instagram_embed'
  | 'youtube_embed'
  | 'twitter_embed'
  | 'facebook_embed'
  | 'official_website'
  | 'press_release';

export type MediaCategory =
  | 'photoshoot'
  | 'glamour'           // Glamour photos
  | 'magazine'          // Magazine covers & editorial
  | 'beach_vacation'    // Beach/vacation photos
  | 'red_carpet'        // Red carpet events
  | 'gym_fitness'       // Gym/workout posts
  | 'saree_traditional' // Traditional glamour in sarees
  | 'western_glam'      // Western outfit glamour
  | 'event'
  | 'movie_promotion'
  | 'traditional'
  | 'casual'
  | 'fitness'
  | 'travel'
  | 'behind_the_scenes'
  | 'general';

export type MediaStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface MediaEntity {
  id: string;
  name_en: string;
  name_te?: string;
  entity_type: EntityType;
  wikidata_id?: string;
  tmdb_id?: number;
  celebrity_id?: string;
  instagram_handle?: string;
  youtube_channel_id?: string;
  twitter_handle?: string;
  facebook_page?: string;
  profile_image?: string;
  cover_image?: string;
  popularity_score: number;
  follower_count: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaPost {
  id: string;
  entity_id?: string;
  entity?: MediaEntity;
  media_type: MediaType;
  source: MediaSource;
  source_url: string;
  source_license?: string;
  embed_html?: string;
  embed_width?: number;
  embed_height?: number;
  image_url?: string;
  thumbnail_url?: string;
  title?: string;
  caption?: string;
  caption_te?: string;
  tags: string[];
  category: MediaCategory;
  views: number;
  likes: number;
  shares: number;
  trending_score: number;
  featured_order?: number;
  status: MediaStatus;
  is_featured: boolean;
  is_hot: boolean;
  is_nsfw: boolean;
  moderation_notes?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaCollection {
  id: string;
  title: string;
  title_te?: string;
  slug: string;
  description?: string;
  cover_image?: string;
  entity_id?: string;
  entity?: MediaEntity;
  collection_type: 'gallery' | 'photoshoot' | 'event' | 'movie' | 'trending';
  post_count: number;
  views: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Types
export interface OEmbedResponse {
  type: 'rich' | 'video' | 'photo' | 'link';
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name: string;
  provider_url: string;
  html: string;
  width?: number;
  height?: number;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export interface MediaFetchResult {
  success: boolean;
  platform: 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'unknown';
  media_type: MediaType;
  source: MediaSource;
  embed_html?: string;
  thumbnail_url?: string;
  title?: string;
  author_name?: string;
  error?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  hasWatermark?: boolean;
  aspectRatio?: number;
  error?: string;
}

// ============================================
// HOT/GLAM SECTION - AI & SAFETY TYPES
// ============================================

// AI-generated caption variant
export interface CaptionVariant {
  text: string;
  style: 'glam' | 'fashion' | 'viral' | 'bold' | 'elegant';
  emoji: string;
  confidence: number;
}

// Safety validation result
export interface SafetyValidation {
  risk: SafetyRisk;
  flags: string[];
  blockedReason?: string;
  requiresReview: boolean;
  autoApproveEligible: boolean;
}

// Extended MediaPost with AI fields for Hot section
export interface HotMediaPost extends MediaPost {
  // AI Caption Generation
  ai_caption_variants: CaptionVariant[];
  selected_caption_index: number;
  
  // Safety & Moderation
  confidence_score: number;
  safety_risk: SafetyRisk;
  safety_flags: string[];
  requires_review: boolean;
  
  // Content Analysis
  audience_emotion: AudienceEmotion;
  glam_angle: GlamAngle;
  glam_category: GlamCategory;
  
  // Engagement Tracking
  click_count: number;
  scroll_depth: number;
  share_count: number;
}

// AI Analysis Result
export interface AIGlamAnalysis {
  captions: CaptionVariant[];
  suggestedCategory: GlamCategory;
  suggestedTags: string[];
  audienceEmotion: AudienceEmotion;
  glamAngle: GlamAngle;
  safety: SafetyValidation;
  confidence: number;
}

// Admin workflow state
export interface HotMediaWorkflowState {
  step: 'paste' | 'validate' | 'analyze' | 'review' | 'publish';
  isLoading: boolean;
  error?: string;
  embedPreview?: MediaFetchResult;
  aiAnalysis?: AIGlamAnalysis;
  selectedCaptionIndex: number;
  overriddenCategory?: GlamCategory;
  moderationNote?: string;
}

// Glam category metadata for UI
export interface GlamCategoryMeta {
  id: GlamCategory;
  label: string;
  labelTe: string;
  emoji: string;
  description: string;
  color: string;
  slug: string;
}

// Pre-defined glam categories with metadata
export const GLAM_CATEGORIES: GlamCategoryMeta[] = [
  { id: 'beach_bikini', label: 'Beach & Bikini', labelTe: 'బీచ్ & బికినీ', emoji: '🏖️', description: 'Beach looks & swimwear', color: 'from-cyan-500 to-blue-500', slug: 'beach-bikini' },
  { id: 'photoshoot_glam', label: 'Photoshoots', labelTe: 'ఫోటోషూట్స్', emoji: '📸', description: 'Studio & outdoor photoshoots', color: 'from-pink-500 to-rose-500', slug: 'photoshoots' },
  { id: 'fashion_event', label: 'Fashion Events', labelTe: 'ఫ్యాషన్ ఈవెంట్స్', emoji: '👗', description: 'Fashion shows & launches', color: 'from-purple-500 to-violet-500', slug: 'fashion-events' },
  { id: 'magazine_cover', label: 'Magazine Covers', labelTe: 'మ్యాగజైన్ కవర్స్', emoji: '📰', description: 'Magazine covers & editorials', color: 'from-amber-500 to-orange-500', slug: 'magazine-covers' },
  { id: 'viral_reel', label: 'Viral Reels', labelTe: 'వైరల్ రీల్స్', emoji: '🎬', description: 'Trending reels & shorts', color: 'from-red-500 to-pink-500', slug: 'viral-reels' },
  { id: 'red_carpet', label: 'Red Carpet', labelTe: 'రెడ్ కార్పెట్', emoji: '✨', description: 'Award shows & premieres', color: 'from-yellow-500 to-amber-500', slug: 'red-carpet' },
  { id: 'gym_fitness', label: 'Fitness', labelTe: 'ఫిట్‌నెస్', emoji: '💪', description: 'Gym & workout content', color: 'from-green-500 to-emerald-500', slug: 'fitness' },
  { id: 'traditional_glam', label: 'Traditional Glam', labelTe: 'సంప్రదాయ గ్లామ్', emoji: '🪷', description: 'Saree & ethnic looks', color: 'from-orange-500 to-red-500', slug: 'traditional' },
  { id: 'western_glam', label: 'Western Glam', labelTe: 'వెస్ట్రన్ గ్లామ్', emoji: '👠', description: 'Western outfit glamour', color: 'from-indigo-500 to-purple-500', slug: 'western' },
  { id: 'influencer', label: 'Influencers', labelTe: 'ఇన్‌ఫ్లుయెన్సర్స్', emoji: '🌟', description: 'Top influencer content', color: 'from-fuchsia-500 to-pink-500', slug: 'influencers' },
];
