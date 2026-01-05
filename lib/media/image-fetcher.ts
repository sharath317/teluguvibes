/**
 * Legal Image Fetcher
 *
 * Sources (in priority order):
 * 1. Wikimedia Commons - Public domain
 * 2. Unsplash - Free to use
 * 3. Pexels - Free to use
 * 4. TMDB - Movie posters
 */

import type { ImageValidationResult, MediaSource } from '@/types/media';

interface ImageResult {
  success: boolean;
  source: MediaSource;
  url: string;
  thumbnail_url: string;
  width?: number;
  height?: number;
  license?: string;
  attribution?: string;
  error?: string;
}

/**
 * Fetch image from Wikimedia Commons
 */
export async function fetchWikimediaImage(searchQuery: string): Promise<ImageResult | null> {
  try {
    // Search for images on Commons
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&origin=*`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.query?.search?.length) {
      return null;
    }

    // Get first result
    const title = searchData.query.search[0].title;

    // Get image info
    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;

    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();

    const pages = infoData.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    const imageInfo = page?.imageinfo?.[0];

    if (!imageInfo?.url) return null;

    // Check license
    const license = imageInfo.extmetadata?.LicenseShortName?.value || 'Unknown';
    const isPublicDomain = license.includes('CC0') || license.includes('Public domain');

    return {
      success: true,
      source: 'wikimedia',
      url: imageInfo.url,
      thumbnail_url: imageInfo.thumburl || imageInfo.url,
      width: imageInfo.width,
      height: imageInfo.height,
      license: license,
      attribution: isPublicDomain ? undefined : `Image from Wikimedia Commons (${license})`,
    };
  } catch (error) {
    console.error('Wikimedia fetch error:', error);
    return null;
  }
}

/**
 * Fetch image from Unsplash
 */
export async function fetchUnsplashImage(searchQuery: string): Promise<ImageResult | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    console.warn('UNSPLASH_ACCESS_KEY not configured');
    return null;
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=portrait`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.results?.length) {
      return null;
    }

    const photo = data.results[0];

    return {
      success: true,
      source: 'unsplash',
      url: photo.urls.regular,
      thumbnail_url: photo.urls.small,
      width: photo.width,
      height: photo.height,
      license: 'Unsplash License',
      attribution: `Photo by ${photo.user.name} on Unsplash`,
    };
  } catch (error) {
    console.error('Unsplash fetch error:', error);
    return null;
  }
}

/**
 * Fetch image from Pexels
 */
export async function fetchPexelsImage(searchQuery: string): Promise<ImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn('PEXELS_API_KEY not configured');
    return null;
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=portrait`;

    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
      },
    });

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.photos?.length) {
      return null;
    }

    const photo = data.photos[0];

    return {
      success: true,
      source: 'pexels',
      url: photo.src.large2x || photo.src.large,
      thumbnail_url: photo.src.medium,
      width: photo.width,
      height: photo.height,
      license: 'Pexels License',
      attribution: `Photo by ${photo.photographer} on Pexels`,
    };
  } catch (error) {
    console.error('Pexels fetch error:', error);
    return null;
  }
}

/**
 * Fetch from TMDB (for movie/celebrity content)
 */
export async function fetchTMDBImage(personName: string): Promise<ImageResult | null> {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    console.warn('TMDB_API_KEY not configured');
    return null;
  }

  try {
    // Search for person
    const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(personName)}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.results?.length) {
      return null;
    }

    const person = searchData.results[0];

    if (!person.profile_path) {
      return null;
    }

    return {
      success: true,
      source: 'tmdb',
      url: `https://image.tmdb.org/t/p/original${person.profile_path}`,
      thumbnail_url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
      license: 'TMDB',
      attribution: 'Image from TMDB',
    };
  } catch (error) {
    console.error('TMDB fetch error:', error);
    return null;
  }
}

/**
 * Validate image meets requirements
 */
export async function validateImage(imageUrl: string): Promise<ImageValidationResult> {
  try {
    // Fetch image headers to check size
    const response = await fetch(imageUrl, { method: 'HEAD' });

    if (!response.ok) {
      return { valid: false, error: 'Image URL not accessible' };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return { valid: false, error: 'URL is not an image' };
    }

    // For full validation, we'd need to download and analyze
    // Here we do basic checks

    // Check for known watermark sites in URL
    const watermarkSites = ['shutterstock', 'gettyimages', 'istockphoto', 'depositphotos', 'dreamstime'];
    if (watermarkSites.some(site => imageUrl.toLowerCase().includes(site))) {
      return { valid: false, hasWatermark: true, error: 'Image likely has watermark' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Failed to validate image' };
  }
}

/**
 * Main function: Fetch best available image
 */
export async function fetchBestImage(
  entityName: string,
  entityType: 'actress' | 'anchor' | 'influencer' | 'model' | 'singer',
  category?: string
): Promise<ImageResult> {
  // Build search queries
  const queries = [
    `${entityName} ${entityType}`,
    entityName,
    `${entityName} portrait`,
  ];

  // Try sources in priority order

  // 1. TMDB for celebrities
  if (['actress', 'actor'].includes(entityType)) {
    const tmdbResult = await fetchTMDBImage(entityName);
    if (tmdbResult) return tmdbResult;
  }

  // 2. Wikimedia Commons
  for (const query of queries) {
    const wikiResult = await fetchWikimediaImage(query);
    if (wikiResult) {
      const validation = await validateImage(wikiResult.url);
      if (validation.valid) return wikiResult;
    }
  }

  // 3. Unsplash (for general/styled photos)
  if (category && ['photoshoot', 'fashion', 'casual'].includes(category)) {
    const unsplashResult = await fetchUnsplashImage(`indian ${entityType} ${category}`);
    if (unsplashResult) return unsplashResult;
  }

  // 4. Pexels
  const pexelsResult = await fetchPexelsImage(`indian woman ${entityType}`);
  if (pexelsResult) return pexelsResult;

  // Fallback
  return {
    success: false,
    source: 'unsplash',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    thumbnail_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    error: 'No specific image found, using placeholder',
  };
}

/**
 * Get images for a category (general, not person-specific)
 */
export async function fetchCategoryImages(
  category: string,
  count: number = 5
): Promise<ImageResult[]> {
  const results: ImageResult[] = [];
  const categoryQueries: Record<string, string> = {
    photoshoot: 'indian model photoshoot',
    event: 'indian film event red carpet',
    traditional: 'indian traditional fashion saree',
    fitness: 'indian fitness model workout',
    travel: 'travel india scenic',
  };

  const query = categoryQueries[category] || category;

  // Try Unsplash
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (accessKey) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Client-ID ${accessKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        for (const photo of data.results || []) {
          results.push({
            success: true,
            source: 'unsplash',
            url: photo.urls.regular,
            thumbnail_url: photo.urls.small,
            width: photo.width,
            height: photo.height,
            license: 'Unsplash License',
            attribution: `Photo by ${photo.user.name} on Unsplash`,
          });
        }
      }
    } catch (error) {
      console.error('Category images fetch error:', error);
    }
  }

  return results;
}








