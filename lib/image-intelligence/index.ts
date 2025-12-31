/**
 * Image Intelligence System
 * Zero Copyright Risk Media Management
 *
 * ALLOWED SOURCES ONLY:
 * - TMDB (posters/backdrops)
 * - Wikimedia Commons
 * - Wikipedia PageImages API
 * - Official press kits
 * - Pexels / Unsplash
 * - AI-generated images
 *
 * NEVER:
 * - Scrape Google Images
 * - Store Instagram images
 * - Download from social media
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export interface ImageSource {
  name: string;
  priority: number;
  isRecommended: boolean;
}

export interface FetchedImage {
  source: string;
  sourceUrl: string;
  sourceId?: string;
  licenseType: string;
  licenseUrl?: string;
  authorName?: string;
  authorUrl?: string;
  attributionText?: string;
  width?: number;
  height?: number;
  allowsCommercial: boolean;
  allowsDerivatives: boolean;
  requiresAttribution: boolean;
}

export interface ValidatedImage extends FetchedImage {
  id?: string;
  qualityScore: number;
  hasWatermark: boolean;
  isAdsenseSafe: boolean;
  validationStatus: 'approved' | 'pending' | 'rejected';
  validationNotes?: string;
}

export interface ImageFetchResult {
  success: boolean;
  image?: ValidatedImage;
  source: string;
  fallbackChain: string[];
  error?: string;
}

// ============================================================
// CONFIGURATION
// ============================================================

// Source priority order (highest first)
const SOURCE_PRIORITY: ImageSource[] = [
  { name: 'tmdb', priority: 1, isRecommended: true },
  { name: 'wikimedia_commons', priority: 2, isRecommended: true },
  { name: 'wikipedia', priority: 3, isRecommended: true },
  { name: 'pexels', priority: 4, isRecommended: true },
  { name: 'unsplash', priority: 5, isRecommended: true },
  { name: 'ai_generated', priority: 6, isRecommended: true },
];

// Blocked domains - NEVER fetch from these
const BLOCKED_DOMAINS = [
  'google.com/images',
  'images.google.com',
  'instagram.com',
  'cdninstagram.com',
  'fbcdn.net',
  'imdb.com',
  'media-amazon.com',
  'pinterest.com',
  'getty',
  'shutterstock',
  'istock',
];

// Minimum image dimensions
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const PREFERRED_MIN_WIDTH = 1200;

// ============================================================
// URL VALIDATION
// ============================================================

/**
 * Check if URL is from a blocked source
 */
export function isBlockedSource(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

/**
 * Validate URL is from an allowed source
 */
export function isAllowedSource(url: string): boolean {
  if (isBlockedSource(url)) return false;

  const allowedPatterns = [
    'image.tmdb.org',
    'themoviedb.org',
    'upload.wikimedia.org',
    'commons.wikimedia.org',
    'wikipedia.org',
    'images.pexels.com',
    'images.unsplash.com',
    'oaidalleapiprodscus.blob.core.windows.net', // DALL-E
  ];

  return allowedPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

// ============================================================
// TMDB FETCHING
// ============================================================

interface TMDBImage {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
}

/**
 * Fetch movie poster from TMDB
 */
export async function fetchTMDBMoviePoster(
  movieId: string | number
): Promise<FetchedImage | null> {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/images?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const posters = data.posters as TMDBImage[];

    if (!posters || posters.length === 0) return null;

    // Get best quality poster
    const bestPoster = posters.sort((a, b) => b.width - a.width)[0];

    return {
      source: 'tmdb',
      sourceUrl: `https://image.tmdb.org/t/p/original${bestPoster.file_path}`,
      sourceId: String(movieId),
      licenseType: 'tmdb_api',
      licenseUrl: 'https://www.themoviedb.org/documentation/api/terms-of-use',
      attributionText: 'Image courtesy of TMDB',
      width: bestPoster.width,
      height: bestPoster.height,
      allowsCommercial: true,
      allowsDerivatives: false,
      requiresAttribution: true,
    };
  } catch (error) {
    console.error('TMDB fetch error:', error);
    return null;
  }
}

/**
 * Fetch person profile from TMDB
 */
export async function fetchTMDBPersonImage(
  personId: string | number
): Promise<FetchedImage | null> {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/person/${personId}/images?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const profiles = data.profiles as TMDBImage[];

    if (!profiles || profiles.length === 0) return null;

    const bestProfile = profiles.sort((a, b) => b.width - a.width)[0];

    return {
      source: 'tmdb',
      sourceUrl: `https://image.tmdb.org/t/p/original${bestProfile.file_path}`,
      sourceId: String(personId),
      licenseType: 'tmdb_api',
      licenseUrl: 'https://www.themoviedb.org/documentation/api/terms-of-use',
      attributionText: 'Image courtesy of TMDB',
      width: bestProfile.width,
      height: bestProfile.height,
      allowsCommercial: true,
      allowsDerivatives: false,
      requiresAttribution: true,
    };
  } catch (error) {
    console.error('TMDB person fetch error:', error);
    return null;
  }
}

/**
 * Search TMDB for person by name
 */
export async function searchTMDBPerson(name: string): Promise<FetchedImage | null> {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results;

    if (!results || results.length === 0) return null;

    const person = results[0];
    if (!person.profile_path) return null;

    return {
      source: 'tmdb',
      sourceUrl: `https://image.tmdb.org/t/p/original${person.profile_path}`,
      sourceId: String(person.id),
      licenseType: 'tmdb_api',
      attributionText: 'Image courtesy of TMDB',
      allowsCommercial: true,
      allowsDerivatives: false,
      requiresAttribution: true,
    };
  } catch (error) {
    console.error('TMDB search error:', error);
    return null;
  }
}

// ============================================================
// WIKIMEDIA COMMONS FETCHING
// ============================================================

interface WikimediaImage {
  title: string;
  url: string;
  descriptionurl: string;
  author?: string;
  license?: string;
  width: number;
  height: number;
}

/**
 * Search Wikimedia Commons for images
 */
export async function searchWikimediaCommons(
  query: string,
  limit: number = 5
): Promise<FetchedImage[]> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=${limit}&format=json&origin=*`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return [];

    const searchData = await searchResponse.json();
    const results = searchData.query?.search || [];

    const images: FetchedImage[] = [];

    for (const result of results) {
      const title = result.title;

      // Get image info
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;

      const infoResponse = await fetch(infoUrl);
      if (!infoResponse.ok) continue;

      const infoData = await infoResponse.json();
      const pages = infoData.query?.pages;
      const page = Object.values(pages)[0] as any;
      const imageInfo = page?.imageinfo?.[0];

      if (!imageInfo?.url) continue;

      // Extract license from metadata
      const metadata = imageInfo.extmetadata || {};
      const license = metadata.LicenseShortName?.value || 'unknown';
      const author = metadata.Artist?.value?.replace(/<[^>]*>/g, '') || 'Unknown';

      // Map Wikimedia license to our types
      const licenseType = mapWikimediaLicense(license);

      // Skip unknown licenses
      if (licenseType === 'unknown') continue;

      images.push({
        source: 'wikimedia_commons',
        sourceUrl: imageInfo.url,
        sourceId: title,
        licenseType,
        licenseUrl: imageInfo.descriptionurl,
        authorName: author,
        authorUrl: imageInfo.descriptionurl,
        attributionText: `${author}, ${license}, via Wikimedia Commons`,
        width: imageInfo.width,
        height: imageInfo.height,
        allowsCommercial: !licenseType.includes('nc'),
        allowsDerivatives: !licenseType.includes('nd'),
        requiresAttribution: licenseType !== 'cc0' && licenseType !== 'public_domain',
      });
    }

    return images;
  } catch (error) {
    console.error('Wikimedia search error:', error);
    return [];
  }
}

/**
 * Map Wikimedia license strings to our license types
 */
function mapWikimediaLicense(license: string): string {
  const lower = license.toLowerCase();

  if (lower.includes('public domain') || lower === 'pd') return 'public_domain';
  if (lower.includes('cc0')) return 'cc0';
  if (lower.includes('cc by-nc-nd') || lower.includes('cc-by-nc-nd')) return 'cc_by_nc_nd';
  if (lower.includes('cc by-nc-sa') || lower.includes('cc-by-nc-sa')) return 'cc_by_nc_sa';
  if (lower.includes('cc by-nc') || lower.includes('cc-by-nc')) return 'cc_by_nc';
  if (lower.includes('cc by-nd') || lower.includes('cc-by-nd')) return 'cc_by_nd';
  if (lower.includes('cc by-sa') || lower.includes('cc-by-sa')) return 'cc_by_sa';
  if (lower.includes('cc by') || lower.includes('cc-by')) return 'cc_by';

  return 'unknown';
}

// ============================================================
// WIKIPEDIA PAGE IMAGES API
// ============================================================

/**
 * Fetch Wikipedia page image for a topic
 */
export async function fetchWikipediaPageImage(
  title: string
): Promise<FetchedImage | null> {
  try {
    // First search for the page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title)}&format=json&origin=*`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    const pageTitle = searchData.query?.search?.[0]?.title;

    if (!pageTitle) return null;

    // Get page image
    const imageUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&piprop=original&format=json&origin=*`;

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) return null;

    const imageData = await imageResponse.json();
    const pages = imageData.query?.pages;
    const page = Object.values(pages)[0] as any;
    const original = page?.original;

    if (!original?.source) return null;

    return {
      source: 'wikipedia',
      sourceUrl: original.source,
      sourceId: pageTitle,
      licenseType: 'cc_by_sa', // Wikipedia images are typically CC BY-SA
      licenseUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      attributionText: `From Wikipedia article: ${pageTitle}`,
      width: original.width,
      height: original.height,
      allowsCommercial: true,
      allowsDerivatives: true,
      requiresAttribution: true,
    };
  } catch (error) {
    console.error('Wikipedia fetch error:', error);
    return null;
  }
}

// ============================================================
// PEXELS API
// ============================================================

/**
 * Search Pexels for images
 */
export async function searchPexels(
  query: string,
  limit: number = 5
): Promise<FetchedImage[]> {
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_API_KEY) return [];

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const photos = data.photos || [];

    return photos.map((photo: any) => ({
      source: 'pexels',
      sourceUrl: photo.src.original,
      sourceId: String(photo.id),
      licenseType: 'pexels',
      licenseUrl: 'https://www.pexels.com/license/',
      authorName: photo.photographer,
      authorUrl: photo.photographer_url,
      attributionText: `Photo by ${photo.photographer} on Pexels`,
      width: photo.width,
      height: photo.height,
      allowsCommercial: true,
      allowsDerivatives: true,
      requiresAttribution: false, // Pexels doesn't require but appreciates
    }));
  } catch (error) {
    console.error('Pexels search error:', error);
    return [];
  }
}

// ============================================================
// UNSPLASH API
// ============================================================

/**
 * Search Unsplash for images
 */
export async function searchUnsplash(
  query: string,
  limit: number = 5
): Promise<FetchedImage[]> {
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
  if (!UNSPLASH_ACCESS_KEY) return [];

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const photos = data.results || [];

    return photos.map((photo: any) => ({
      source: 'unsplash',
      sourceUrl: photo.urls.raw,
      sourceId: photo.id,
      licenseType: 'unsplash',
      licenseUrl: 'https://unsplash.com/license',
      authorName: photo.user.name,
      authorUrl: photo.user.links.html,
      attributionText: `Photo by ${photo.user.name} on Unsplash`,
      width: photo.width,
      height: photo.height,
      allowsCommercial: true,
      allowsDerivatives: true,
      requiresAttribution: false, // Unsplash doesn't require but appreciates
    }));
  } catch (error) {
    console.error('Unsplash search error:', error);
    return [];
  }
}

// ============================================================
// IMAGE VALIDATION
// ============================================================

/**
 * Validate image meets quality standards
 */
export function validateImageQuality(image: FetchedImage): {
  isValid: boolean;
  qualityScore: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check dimensions
  if (image.width && image.height) {
    if (image.width < MIN_WIDTH) {
      issues.push(`Width too small (${image.width}px < ${MIN_WIDTH}px)`);
      score -= 30;
    } else if (image.width < PREFERRED_MIN_WIDTH) {
      score -= 10;
    }

    if (image.height < MIN_HEIGHT) {
      issues.push(`Height too small (${image.height}px < ${MIN_HEIGHT}px)`);
      score -= 30;
    }

    // Check aspect ratio
    const aspectRatio = image.width / image.height;
    if (aspectRatio < 0.5 || aspectRatio > 3) {
      issues.push('Unusual aspect ratio');
      score -= 10;
    }
  } else {
    issues.push('Dimensions unknown');
    score -= 20;
  }

  // Check license
  if (image.licenseType === 'unknown') {
    issues.push('License unclear');
    score -= 50;
  } else if (image.licenseType === 'restricted') {
    issues.push('Restricted license');
    score = 0;
  }

  // Bonus for good licenses
  if (['cc0', 'public_domain', 'pexels', 'unsplash'].includes(image.licenseType)) {
    score += 10;
  }

  // Check source reliability
  if (image.source === 'tmdb') {
    score += 5;
  } else if (image.source === 'wikimedia_commons') {
    score += 3;
  }

  return {
    isValid: score >= 40 && image.licenseType !== 'restricted',
    qualityScore: Math.max(0, Math.min(100, score)),
    issues,
  };
}

/**
 * Check if image has watermark (basic heuristic)
 */
export function checkForWatermark(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Check for common watermark indicators in URL
  const watermarkIndicators = [
    'watermark',
    'preview',
    'sample',
    'comp',
    'draft',
  ];

  return watermarkIndicators.some(indicator => lowerUrl.includes(indicator));
}

/**
 * Validate image is AdSense safe
 */
export function isAdSenseSafe(image: FetchedImage): boolean {
  // For now, assume TMDB and stock photos are safe
  // Could add image content analysis in future
  const safeSourcees = ['tmdb', 'pexels', 'unsplash', 'wikimedia_commons', 'wikipedia'];
  return safeSourcees.includes(image.source);
}

// ============================================================
// MAIN FETCH WITH FALLBACK
// ============================================================

/**
 * Fetch best image for an entity with automatic fallback
 */
export async function fetchImageWithFallback(params: {
  entityType: 'person' | 'movie' | 'topic';
  entityId?: string;
  entityName: string;
  tmdbId?: string | number;
  preferredSource?: string;
}): Promise<ImageFetchResult> {
  const { entityType, entityId, entityName, tmdbId, preferredSource } = params;
  const fallbackChain: string[] = [];

  console.log(`🖼️ Fetching image for: ${entityName} (${entityType})`);

  // Build source order
  let sources = [...SOURCE_PRIORITY];
  if (preferredSource) {
    sources = sources.sort((a, b) => {
      if (a.name === preferredSource) return -1;
      if (b.name === preferredSource) return 1;
      return a.priority - b.priority;
    });
  }

  for (const source of sources) {
    fallbackChain.push(source.name);
    console.log(`  Trying: ${source.name}...`);

    let image: FetchedImage | null = null;

    try {
      switch (source.name) {
        case 'tmdb':
          if (entityType === 'movie' && tmdbId) {
            image = await fetchTMDBMoviePoster(tmdbId);
          } else if (entityType === 'person') {
            if (tmdbId) {
              image = await fetchTMDBPersonImage(tmdbId);
            } else {
              image = await searchTMDBPerson(entityName);
            }
          }
          break;

        case 'wikimedia_commons':
          const wikiImages = await searchWikimediaCommons(entityName, 3);
          image = wikiImages.find(img => {
            const validation = validateImageQuality(img);
            return validation.isValid;
          }) || null;
          break;

        case 'wikipedia':
          image = await fetchWikipediaPageImage(entityName);
          break;

        case 'pexels':
          // Only use for generic topics, not specific people/movies
          if (entityType === 'topic') {
            const pexelsImages = await searchPexels(entityName, 3);
            image = pexelsImages[0] || null;
          }
          break;

        case 'unsplash':
          // Only use for generic topics
          if (entityType === 'topic') {
            const unsplashImages = await searchUnsplash(entityName, 3);
            image = unsplashImages[0] || null;
          }
          break;
      }

      if (image) {
        // Validate
        const validation = validateImageQuality(image);

        if (validation.isValid) {
          console.log(`  ✅ Found valid image from ${source.name}`);

          // Store in database
          const storedImage = await storeImage(image, {
            entityType,
            entityId,
            entityName,
            qualityScore: validation.qualityScore,
          });

          return {
            success: true,
            image: storedImage,
            source: source.name,
            fallbackChain,
          };
        } else {
          console.log(`  ⚠️ Image from ${source.name} failed validation: ${validation.issues.join(', ')}`);
        }
      } else {
        console.log(`  ❌ No image from ${source.name}`);
      }
    } catch (error) {
      console.error(`  Error fetching from ${source.name}:`, error);
    }
  }

  console.log('  ❌ No valid image found from any source');

  return {
    success: false,
    source: 'none',
    fallbackChain,
    error: 'No valid image found from any source',
  };
}

// ============================================================
// DATABASE OPERATIONS
// ============================================================

/**
 * Store image in database
 */
async function storeImage(
  image: FetchedImage,
  context: {
    entityType: string;
    entityId?: string;
    entityName: string;
    qualityScore: number;
  }
): Promise<ValidatedImage> {
  const { entityType, entityId, entityName, qualityScore } = context;

  const hasWatermark = checkForWatermark(image.sourceUrl);
  const adsenseSafe = isAdSenseSafe(image);

  const { data, error } = await supabase
    .from('image_registry')
    .upsert({
      source: image.source,
      source_url: image.sourceUrl,
      source_id: image.sourceId,
      license_type: image.licenseType,
      license_url: image.licenseUrl,
      author_name: image.authorName,
      author_url: image.authorUrl,
      attribution_text: image.attributionText,
      width: image.width,
      height: image.height,
      aspect_ratio: image.width && image.height ? image.width / image.height : null,
      allows_commercial: image.allowsCommercial,
      allows_derivatives: image.allowsDerivatives,
      requires_attribution: image.requiresAttribution,
      quality_score: qualityScore,
      has_watermark: hasWatermark,
      is_adsense_safe: adsenseSafe,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      validation_status: qualityScore >= 60 ? 'approved' : 'pending',
    }, {
      onConflict: 'source,source_url',
    })
    .select()
    .single();

  if (error) {
    console.error('Error storing image:', error);
  }

  // Log fetch
  await supabase.from('image_fetch_log').insert({
    fetch_type: 'search',
    source: image.source,
    query: entityName,
    entity_type: entityType,
    entity_id: entityId,
    images_found: 1,
    images_valid: 1,
    images_stored: 1,
    selected_image_id: data?.id,
    selection_reason: `Best match from ${image.source}`,
    status: 'success',
  });

  return {
    ...image,
    id: data?.id,
    qualityScore,
    hasWatermark,
    isAdsenseSafe: adsenseSafe,
    validationStatus: qualityScore >= 60 ? 'approved' : 'pending',
  };
}

/**
 * Get image from registry by entity
 */
export async function getImageForEntity(
  entityId: string,
  entityType: string,
  imageType?: string
): Promise<ValidatedImage | null> {
  const { data } = await supabase.rpc('get_best_image_for_entity', {
    p_entity_id: entityId,
    p_entity_type: entityType,
    p_image_type: imageType || 'any',
  });

  if (!data || data.length === 0) return null;

  const img = data[0];

  return {
    source: img.source,
    sourceUrl: img.cdn_url,
    licenseType: 'unknown',
    allowsCommercial: true,
    allowsDerivatives: true,
    requiresAttribution: true,
    qualityScore: img.quality_score,
    hasWatermark: false,
    isAdsenseSafe: true,
    validationStatus: 'approved',
    id: img.image_id,
  };
}

/**
 * Track image usage
 */
export async function trackImageUsage(
  imageId: string,
  postId: string,
  usageType: string
): Promise<void> {
  await supabase.from('image_usage_tracking').insert({
    image_id: imageId,
    post_id: postId,
    usage_type: usageType,
  });

  // Update usage count
  await supabase
    .from('image_registry')
    .update({
      times_used: supabase.rpc('increment_times_used'),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', imageId);
}

/**
 * Get source performance stats
 */
export async function getSourcePerformance(): Promise<{
  source: string;
  totalImages: number;
  approvedImages: number;
  avgQuality: number;
  avgCtr: number;
  reliabilityScore: number;
}[]> {
  const { data } = await supabase
    .from('image_source_performance')
    .select('*')
    .order('reliability_score', { ascending: false });

  return (data || []).map(d => ({
    source: d.source,
    totalImages: d.total_images,
    approvedImages: d.approved_images,
    avgQuality: d.avg_quality_score,
    avgCtr: d.avg_ctr,
    reliabilityScore: d.reliability_score,
  }));
}

/**
 * Get images pending review
 */
export async function getImagesPendingReview(
  limit: number = 20
): Promise<{
  id: string;
  sourceUrl: string;
  source: string;
  entityName: string;
  qualityScore: number;
  reviewReason: string;
}[]> {
  const { data } = await supabase
    .from('image_registry')
    .select('*')
    .in('validation_status', ['pending', 'needs_review'])
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map(d => ({
    id: d.id,
    sourceUrl: d.source_url,
    source: d.source,
    entityName: d.entity_name,
    qualityScore: d.quality_score,
    reviewReason: d.license_type === 'unknown' ? 'License unclear' :
      d.quality_score < 50 ? 'Low quality' :
      d.has_watermark ? 'Has watermark' : 'Standard review',
  }));
}

/**
 * Approve or reject image
 */
export async function reviewImage(
  imageId: string,
  status: 'approved' | 'rejected',
  notes?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('image_registry')
    .update({
      validation_status: status,
      validation_notes: notes,
      validated_at: new Date().toISOString(),
    })
    .eq('id', imageId);

  return !error;
}
