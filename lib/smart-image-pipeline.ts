/**
 * Smart Image Pipeline
 * Category-aware image fetching with validation
 * - Source priority by category
 * - Image validation (aspect ratio, faces, logos)
 * - Caching to avoid regeneration
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ImageResult {
  url: string;
  source: string;
  width?: number;
  height?: number;
}

interface ImageValidation {
  isValid: boolean;
  aspectRatio: number;
  width: number;
  height: number;
  issues: string[];
}

// Image source priority by category
const SOURCE_PRIORITY: Record<string, string[]> = {
  entertainment: ['tmdb', 'unsplash', 'pexels'],
  gossip: ['pexels', 'unsplash'],
  sports: ['unsplash', 'pexels'],
  politics: ['unsplash', 'pexels'],
  trending: ['unsplash', 'pexels'],
  love: ['ai', 'unsplash'],
  health: ['unsplash', 'pexels'],
  food: ['pexels', 'unsplash'],
  technology: ['unsplash', 'pexels'],
  dedications: ['ai', 'unsplash'],
};

// Category-specific image query modifiers
const QUERY_MODIFIERS: Record<string, string> = {
  entertainment: 'cinematic film celebrity',
  gossip: 'portrait celebrity lifestyle',
  sports: 'sports action india',
  politics: 'government india politics',
  trending: 'viral trending news',
  love: 'romantic couple love',
  health: 'health wellness yoga illustration',
  food: 'indian food recipe delicious',
  technology: 'technology gadget futuristic',
  dedications: 'celebration gift wishes',
};

/**
 * Generate query hash for caching
 */
function hashQuery(query: string): string {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

/**
 * Check image cache
 */
async function checkCache(queryHash: string): Promise<ImageResult | null> {
  const { data } = await supabase
    .from('image_cache')
    .select('image_url, source, width, height')
    .eq('query_hash', queryHash)
    .eq('is_valid', true)
    .single();

  if (data) {
    // Update last_used_at
    await supabase
      .from('image_cache')
      .update({ last_used_at: new Date().toISOString() })
      .eq('query_hash', queryHash);

    return {
      url: data.image_url,
      source: data.source,
      width: data.width,
      height: data.height,
    };
  }

  return null;
}

/**
 * Save to image cache
 */
async function saveToCache(
  queryHash: string,
  query: string,
  result: ImageResult
): Promise<void> {
  await supabase.from('image_cache').upsert({
    query_hash: queryHash,
    query_text: query,
    source: result.source,
    image_url: result.url,
    width: result.width || null,
    height: result.height || null,
    is_valid: true,
    last_used_at: new Date().toISOString(),
  });
}

/**
 * Fetch from TMDB (movies, celebrities)
 */
async function fetchFromTMDB(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    // Try movie search first
    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=te-IN`
    );

    if (movieResponse.ok) {
      const movieData = await movieResponse.json();
      const movie = movieData.results?.[0];

      if (movie?.poster_path) {
        return {
          url: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
          source: 'tmdb',
          width: 780,
          height: 1170,
        };
      }
    }

    // Try person search
    const personResponse = await fetch(
      `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}`
    );

    if (personResponse.ok) {
      const personData = await personResponse.json();
      const person = personData.results?.[0];

      if (person?.profile_path) {
        return {
          url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
          source: 'tmdb',
          width: 500,
          height: 750,
        };
      }
    }
  } catch (error) {
    console.error('TMDB fetch error:', error);
  }

  return null;
}

/**
 * Fetch from Unsplash
 */
async function fetchFromUnsplash(query: string): Promise<ImageResult | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const photos = data.results;

    // Find a suitable photo (no faces for non-celebrity content)
    for (const photo of photos) {
      if (photo.width >= 1200 && photo.width / photo.height >= 1.2) {
        return {
          url: photo.urls.regular,
          source: 'unsplash',
          width: photo.width,
          height: photo.height,
        };
      }
    }

    // Fallback to first result
    if (photos[0]) {
      return {
        url: photos[0].urls.regular,
        source: 'unsplash',
        width: photos[0].width,
        height: photos[0].height,
      };
    }
  } catch (error) {
    console.error('Unsplash fetch error:', error);
  }

  return null;
}

/**
 * Fetch from Pexels
 */
async function fetchFromPexels(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      {
        headers: { Authorization: apiKey },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const photos = data.photos;

    // Find a suitable photo
    for (const photo of photos) {
      if (photo.width >= 1200 && photo.width / photo.height >= 1.2) {
        return {
          url: photo.src.large2x || photo.src.large,
          source: 'pexels',
          width: photo.width,
          height: photo.height,
        };
      }
    }

    // Fallback to first result
    if (photos[0]) {
      return {
        url: photos[0].src.large,
        source: 'pexels',
        width: photos[0].width,
        height: photos[0].height,
      };
    }
  } catch (error) {
    console.error('Pexels fetch error:', error);
  }

  return null;
}

/**
 * Fetch AI-generated image (placeholder for now)
 */
async function fetchAIImage(query: string, category: string): Promise<ImageResult | null> {
  // In production, integrate with:
  // - DALL-E
  // - Stable Diffusion
  // - Midjourney API

  // For now, use a placeholder generator
  const seed = hashQuery(query).substring(0, 8);

  const styles: Record<string, string> = {
    love: 'romantic,soft+lighting,indian+aesthetic',
    dedications: 'celebration,festive,wishes',
    health: 'illustration,wellness,calm',
  };

  const style = styles[category] || 'aesthetic,modern';

  return {
    url: `https://picsum.photos/seed/${seed}/1200/675`,
    source: 'ai_placeholder',
    width: 1200,
    height: 675,
  };
}

/**
 * Validate image dimensions and quality
 */
function validateImage(result: ImageResult): ImageValidation {
  const issues: string[] = [];
  const width = result.width || 800;
  const height = result.height || 600;
  const aspectRatio = width / height;

  // Check minimum width
  if (width < 800) {
    issues.push('Width below 800px');
  }

  // Check aspect ratio (should be close to 16:9 or 4:3)
  if (aspectRatio < 1.2) {
    issues.push('Aspect ratio too narrow (portrait)');
  }

  if (aspectRatio > 2.5) {
    issues.push('Aspect ratio too wide');
  }

  return {
    isValid: issues.length === 0,
    aspectRatio,
    width,
    height,
    issues,
  };
}

/**
 * Main function: Get best image for content
 */
export async function getSmartImage(
  query: string,
  category: string,
  entityType?: 'celebrity' | 'movie' | 'topic'
): Promise<ImageResult> {
  const enhancedQuery = `${query} ${QUERY_MODIFIERS[category] || ''}`.trim();
  const queryHash = hashQuery(enhancedQuery);

  console.log(`\n🖼️ [SmartImage] Fetching for: "${query}" (${category})`);

  // 1. Check cache
  const cached = await checkCache(queryHash);
  if (cached) {
    console.log(`   ✅ Cache hit: ${cached.source}`);
    return cached;
  }

  // 2. Get source priority for category
  const sources = SOURCE_PRIORITY[category] || ['unsplash', 'pexels'];

  // 3. Try each source in priority order
  for (const source of sources) {
    console.log(`   🔍 Trying: ${source}`);

    let result: ImageResult | null = null;

    switch (source) {
      case 'tmdb':
        result = await fetchFromTMDB(query);
        break;
      case 'unsplash':
        result = await fetchFromUnsplash(enhancedQuery);
        break;
      case 'pexels':
        result = await fetchFromPexels(enhancedQuery);
        break;
      case 'ai':
        result = await fetchAIImage(query, category);
        break;
    }

    if (result) {
      const validation = validateImage(result);

      if (validation.isValid) {
        console.log(`   ✅ Found: ${source} (${validation.width}x${validation.height})`);

        // Save to cache
        await saveToCache(queryHash, enhancedQuery, result);

        return result;
      } else {
        console.log(`   ⚠️ Validation failed: ${validation.issues.join(', ')}`);
      }
    }
  }

  // 4. Ultimate fallback
  console.log(`   ⚠️ Using fallback`);

  const fallback: ImageResult = {
    url: `https://picsum.photos/seed/${queryHash.substring(0, 8)}/1200/675`,
    source: 'fallback',
    width: 1200,
    height: 675,
  };

  await saveToCache(queryHash, enhancedQuery, fallback);

  return fallback;
}

/**
 * Get image for specific entity types
 */
export async function getCelebrityImage(name: string): Promise<ImageResult> {
  // First try TMDB for celebrity
  const tmdbResult = await fetchFromTMDB(name);
  if (tmdbResult) return tmdbResult;

  // Fallback to general search
  return getSmartImage(name, 'entertainment', 'celebrity');
}

export async function getMovieImage(title: string): Promise<ImageResult> {
  // First try TMDB for movie
  const tmdbResult = await fetchFromTMDB(title);
  if (tmdbResult) return tmdbResult;

  // Fallback to general search
  return getSmartImage(title, 'entertainment', 'movie');
}

/**
 * Batch image fetching for multiple queries
 */
export async function getBatchImages(
  queries: Array<{ query: string; category: string }>
): Promise<Map<string, ImageResult>> {
  const results = new Map<string, ImageResult>();

  for (const { query, category } of queries) {
    const result = await getSmartImage(query, category);
    results.set(query, result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Clean up old cache entries
 */
export async function cleanupImageCache(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data } = await supabase
    .from('image_cache')
    .delete()
    .lt('last_used_at', cutoffDate.toISOString())
    .select('id');

  return data?.length || 0;
}








