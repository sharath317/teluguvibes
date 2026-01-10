/**
 * Safe Image URL Utilities
 * 
 * Validates and provides fallback for image URLs used with next/image.
 * Ensures only allowed hosts are used to prevent runtime errors.
 */

// Allowed image hosts configured in next.config.ts
export const ALLOWED_IMAGE_HOSTS = [
  'picsum.photos',
  'images.unsplash.com',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'image.tmdb.org',
  'www.themoviedb.org',
  'm.media-amazon.com',
  'i.ytimg.com',
  'archive.org',
  's.ltrbxd.com',
  'a.ltrbxd.com',
];

// Allowed host patterns (for wildcard domains like *.archive.org)
const ALLOWED_HOST_PATTERNS = [
  /\.archive\.org$/,
  /\.ltrbxd\.com$/,
  /\.letterboxd\.com$/,
];

// Common image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];

/**
 * Check if URL is a valid image URL for next/image
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    
    // Check if host is in allowed list
    if (ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
      return true;
    }
    
    // Check if host matches any allowed pattern
    if (ALLOWED_HOST_PATTERNS.some(pattern => pattern.test(parsed.hostname))) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Get a safe image URL with fallback to picsum.photos placeholder
 */
export function getSafeImageUrl(
  imageUrl: string | null | undefined,
  imageUrls: string[] | null | undefined,
  fallbackId: string,
  size: string = '800/600'
): string {
  const fallback = `https://picsum.photos/seed/${fallbackId}/${size}`;
  
  // Try primary image URL first
  if (isValidImageUrl(imageUrl)) {
    return imageUrl!;
  }
  
  // Try first image in array
  const firstImage = imageUrls?.[0];
  if (isValidImageUrl(firstImage)) {
    return firstImage!;
  }
  
  // Return fallback
  return fallback;
}

/**
 * Convenience function for posts
 */
export function getPostImageUrl(
  post: { id: string; image_url?: string | null; image_urls?: string[] | null },
  size: string = '800/600'
): string {
  return getSafeImageUrl(post.image_url, post.image_urls, post.id, size);
}

