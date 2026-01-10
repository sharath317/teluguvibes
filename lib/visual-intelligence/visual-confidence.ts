/**
 * Visual Confidence Module
 * Utilities for calculating visual confidence scores and determining poster quality
 */

import type {
  VisualTier,
  VisualType,
  ArchivalSourceType,
  MovieArchivalImage,
  VisualConfidenceResult,
} from './types';

/**
 * Known placeholder URL patterns that indicate missing/invalid posters
 */
const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /no-image/i,
  /no_image/i,
  /missing/i,
  /default/i,
  /blank/i,
  /null/i,
  /undefined/i,
  /\.gif$/i, // Often used for 1x1 tracking pixels
  /via\.placeholder\.com/i,
  /placehold\.it/i,
  /placekitten/i,
  /picsum/i,
  /dummyimage/i,
  /fakeimg/i,
];

/**
 * TMDb and other API placeholder patterns
 */
const API_PLACEHOLDER_PATTERNS = [
  /w500\/null/i,
  /original\/null/i,
  /w342\/null/i,
  /\/t\/p\/.*\/null/i, // TMDb null poster path
];

/**
 * Check if a URL is a placeholder or invalid poster
 */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') {
    return true;
  }

  const normalizedUrl = url.toLowerCase().trim();

  // Check for empty or whitespace-only
  if (normalizedUrl === '' || normalizedUrl === 'null' || normalizedUrl === 'undefined') {
    return true;
  }

  // Check against placeholder patterns
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(normalizedUrl)) {
      return true;
    }
  }

  // Check against API placeholder patterns
  for (const pattern of API_PLACEHOLDER_PATTERNS) {
    if (pattern.test(normalizedUrl)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a movie needs an archive card instead of a poster
 * Movies need archive cards when:
 * 1. No poster URL available
 * 2. Poster URL is a placeholder
 * 3. Movie is from pre-digital era (before 1990) with low confidence
 * 4. Visual confidence is below threshold
 */
export function needsArchiveCard(movie: {
  poster_url?: string | null;
  posterUrl?: string | null; // Alias for poster_url
  posterSource?: string | null; // Source of the poster (for future use)
  release_year?: number;
  releaseYear?: number; // Alias for release_year
  visual_confidence?: number;
  visual_tier?: VisualTier;
  has_verified_poster?: boolean;
}): boolean {
  // Support both naming conventions
  const posterUrl = movie.poster_url ?? movie.posterUrl;
  const releaseYear = movie.release_year ?? movie.releaseYear;

  // No poster URL
  if (!posterUrl) {
    return true;
  }

  // Placeholder URL
  if (isPlaceholderUrl(posterUrl)) {
    return true;
  }

  // Pre-digital era without verified poster
  if (releaseYear && releaseYear < 1990 && !movie.has_verified_poster) {
    // Only require archive card if visual confidence is low
    if (movie.visual_confidence !== undefined && movie.visual_confidence < 40) {
      return true;
    }
    if (movie.visual_tier === 'unverified' || movie.visual_tier === 3) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate visual confidence score for a movie based on available imagery
 */
export function calculateVisualConfidence(params: {
  posterUrl?: string | null;
  posterSource?: string | null;
  images?: MovieArchivalImage[];
  releaseYear?: number;
  hasVerifiedPoster?: boolean;
  sourceTypes?: ArchivalSourceType[];
  hasFamilyPermission?: boolean;
  hasNFAI?: boolean;
  validateUrl?: boolean;
}): VisualConfidenceResult {
  const {
    posterUrl,
    posterSource,
    images = [],
    releaseYear,
    hasVerifiedPoster = false,
    sourceTypes = [],
    hasFamilyPermission = false,
    hasNFAI = false,
    validateUrl = false,
  } = params;

  let score = 0;
  const factors = {
    hasVerifiedImages: false,
    hasArchivalSources: false,
    hasFamilyPermission,
    imageCount: images.length,
    sourceCount: new Set(sourceTypes).size,
  };

  // Base score for having a poster
  if (posterUrl && !isPlaceholderUrl(posterUrl)) {
    score += 20;
  }

  // Verified poster bonus
  if (hasVerifiedPoster) {
    score += 30;
    factors.hasVerifiedImages = true;
  }

  // Check images for verification and archival sources
  const verifiedImages = images.filter(img => img.is_verified);
  if (verifiedImages.length > 0) {
    factors.hasVerifiedImages = true;
    score += Math.min(verifiedImages.length * 5, 20); // Up to 20 points for verified images
  }

  // Archival source bonus
  const archivalTypes: ArchivalSourceType[] = [
    'nfai', 'studio-archive', 'studio_archive', 'family-collection', 
    'family_collection', 'museum', 'government_archive'
  ];
  const hasArchivalSource = sourceTypes.some(type => archivalTypes.includes(type));
  if (hasArchivalSource) {
    factors.hasArchivalSources = true;
    score += 15;
  }

  // NFAI bonus
  if (hasNFAI) {
    score += 10;
    factors.hasArchivalSources = true;
  }

  // Family permission bonus
  if (hasFamilyPermission) {
    score += 10;
  }

  // Image count bonus
  if (images.length >= 10) {
    score += 10;
  } else if (images.length >= 5) {
    score += 5;
  }

  // Source diversity bonus
  if (factors.sourceCount >= 3) {
    score += 5;
  }

  // Era adjustment - older movies get slightly higher base for any verification
  if (releaseYear && releaseYear < 1970 && factors.hasVerifiedImages) {
    score += 10; // Bonus for verified imagery from golden era
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine tier
  let tier: VisualTier;
  if (score >= 80) {
    tier = 'gold';
  } else if (score >= 60) {
    tier = 'silver';
  } else if (score >= 40) {
    tier = 'bronze';
  } else {
    tier = 'unverified';
  }

  // Infer visual type based on poster source
  let visualType: VisualType | null = null;
  if (posterUrl && !isPlaceholderUrl(posterUrl)) {
    visualType = inferVisualType(posterUrl);
  }

  return {
    movieId: '', // Will be set by caller
    tier,
    score,
    confidence: score, // Alias for score
    visualType,
    factors,
  };
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 80) return 'High Confidence';
  if (score >= 60) return 'Good Confidence';
  if (score >= 40) return 'Moderate Confidence';
  if (score >= 20) return 'Low Confidence';
  return 'Unverified';
}

/**
 * Get confidence color class
 */
export function getConfidenceColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-gray-400';
}

/**
 * Check if poster URL is likely valid (accessible)
 * This is a simple heuristic check, not an actual HTTP request
 */
export function isLikelyValidPosterUrl(url: string | null | undefined): boolean {
  if (!url || isPlaceholderUrl(url)) {
    return false;
  }

  // Check for valid URL structure
  try {
    const parsed = new URL(url);
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Must have a path beyond just /
    if (parsed.pathname === '/' || parsed.pathname === '') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Determine the visual type of an image based on filename/URL patterns
 */
export function inferVisualType(url: string): VisualType {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('poster') || lowerUrl.includes('cover')) {
    return 'poster';
  }
  if (lowerUrl.includes('still') || lowerUrl.includes('scene')) {
    return 'still';
  }
  if (lowerUrl.includes('behind') || lowerUrl.includes('bts') || lowerUrl.includes('making')) {
    return 'behind-scenes';
  }
  if (lowerUrl.includes('promo') || lowerUrl.includes('promotional')) {
    return 'promotional';
  }
  if (lowerUrl.includes('premiere') || lowerUrl.includes('launch')) {
    return 'premiere';
  }
  if (lowerUrl.includes('candid') || lowerUrl.includes('casual')) {
    return 'candid';
  }
  if (lowerUrl.includes('archival') || lowerUrl.includes('archive')) {
    return 'archival';
  }
  if (lowerUrl.includes('magazine')) {
    return 'magazine';
  }
  if (lowerUrl.includes('newspaper')) {
    return 'newspaper';
  }
  if (lowerUrl.includes('lobby')) {
    return 'lobby_card';
  }
  if (lowerUrl.includes('press')) {
    return 'press_photo';
  }

  // Default to poster for most cases
  return 'poster';
}

