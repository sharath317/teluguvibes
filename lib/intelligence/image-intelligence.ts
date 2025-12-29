/**
 * TeluguVibes Image Intelligence Layer
 * Legal, Performant, Self-Learning Image System
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

interface ImageSource {
  url: string;
  source: 'tmdb' | 'wikimedia' | 'wikipedia' | 'unsplash' | 'pexels' | 'official_kit' | 'ai_generated';
  license?: string;
  author?: string;
  width?: number;
  height?: number;
}

interface ImageSearchResult {
  images: ImageSource[];
  recommended: ImageSource | null;
  reason: string;
}

interface ImagePerformance {
  imageId: string;
  engagementLift: number;
  ctr: number;
  impressions: number;
}

// ===== LEGAL IMAGE SOURCES =====

const PRIORITY_SOURCES = [
  { source: 'tmdb', trust: 0.95, legal: true },
  { source: 'wikimedia', trust: 0.90, legal: true },
  { source: 'wikipedia', trust: 0.85, legal: true },
  { source: 'official_kit', trust: 0.80, legal: true },
  { source: 'unsplash', trust: 0.75, legal: true },
  { source: 'pexels', trust: 0.75, legal: true },
  { source: 'ai_generated', trust: 0.60, legal: true },
];

// ===== TMDB IMAGES =====

async function fetchTMDBImage(
  entityType: 'movie' | 'person',
  query: string,
  tmdbId?: number
): Promise<ImageSource | null> {
  const tmdbKey = process.env.TMDB_API_KEY;
  if (!tmdbKey) return null;

  try {
    if (tmdbId && entityType === 'movie') {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${tmdbKey}`
      );
      const data = await res.json();

      if (data.posters?.length > 0) {
        const poster = data.posters[0];
        return {
          url: `https://image.tmdb.org/t/p/w780${poster.file_path}`,
          source: 'tmdb',
          license: 'TMDB Terms of Use',
          width: poster.width,
          height: poster.height,
        };
      }
    }

    // Search by name
    const searchType = entityType === 'movie' ? 'movie' : 'person';
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/${searchType}?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`
    );
    const searchData = await searchRes.json();

    if (searchData.results?.length > 0) {
      const result = searchData.results[0];
      const imagePath = entityType === 'movie' ? result.poster_path : result.profile_path;

      if (imagePath) {
        return {
          url: `https://image.tmdb.org/t/p/w780${imagePath}`,
          source: 'tmdb',
          license: 'TMDB Terms of Use',
        };
      }
    }
  } catch (error) {
    console.error('TMDB image fetch error:', error);
  }

  return null;
}

// ===== WIKIMEDIA COMMONS =====

async function fetchWikimediaImage(query: string): Promise<ImageSource | null> {
  try {
    // Search Wikimedia Commons
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.query?.search?.length > 0) {
      const title = searchData.query.search[0].title;

      // Get image info
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata|size&format=json&origin=*`;
      const infoRes = await fetch(infoUrl);
      const infoData = await infoRes.json();

      const pages = infoData.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0] as any;
        const imageinfo = page.imageinfo?.[0];

        if (imageinfo) {
          const meta = imageinfo.extmetadata || {};
          const license = meta.LicenseShortName?.value || 'CC';

          return {
            url: imageinfo.url,
            source: 'wikimedia',
            license,
            author: meta.Artist?.value?.replace(/<[^>]*>/g, '') || 'Wikimedia Commons',
            width: imageinfo.width,
            height: imageinfo.height,
          };
        }
      }
    }
  } catch (error) {
    console.error('Wikimedia image fetch error:', error);
  }

  return null;
}

// ===== WIKIPEDIA PAGE IMAGE =====

async function fetchWikipediaImage(query: string): Promise<ImageSource | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();

      if (data.thumbnail?.source) {
        return {
          url: data.originalimage?.source || data.thumbnail.source,
          source: 'wikipedia',
          license: 'Wikipedia/Fair Use',
          width: data.thumbnail.width,
          height: data.thumbnail.height,
        };
      }
    }
  } catch (error) {
    console.error('Wikipedia image fetch error:', error);
  }

  return null;
}

// ===== UNSPLASH (Generic) =====

async function fetchUnsplashImage(query: string): Promise<ImageSource | null> {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashKey) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          Authorization: `Client-ID ${unsplashKey}`,
        },
      }
    );
    const data = await res.json();

    if (data.results?.length > 0) {
      const photo = data.results[0];
      return {
        url: photo.urls.regular,
        source: 'unsplash',
        license: 'Unsplash License',
        author: photo.user.name,
        width: photo.width,
        height: photo.height,
      };
    }
  } catch (error) {
    console.error('Unsplash image fetch error:', error);
  }

  return null;
}

// ===== MAIN SEARCH FUNCTION =====

export async function searchImages(
  query: string,
  entityType: 'movie' | 'celebrity' | 'event' | 'generic',
  options?: {
    tmdbId?: number;
    preferSource?: string;
    minWidth?: number;
  }
): Promise<ImageSearchResult> {
  const images: ImageSource[] = [];
  const minWidth = options?.minWidth || 600;

  // Strategy based on entity type
  if (entityType === 'movie') {
    // 1. TMDB (highest priority for movies)
    const tmdbImage = await fetchTMDBImage('movie', query, options?.tmdbId);
    if (tmdbImage) images.push(tmdbImage);

    // 2. Wikimedia for classic movies
    if (images.length === 0 || query.toLowerCase().includes('classic')) {
      const wikiImage = await fetchWikimediaImage(`${query} Telugu film`);
      if (wikiImage) images.push(wikiImage);
    }
  } else if (entityType === 'celebrity') {
    // 1. TMDB person
    const tmdbImage = await fetchTMDBImage('person', query);
    if (tmdbImage) images.push(tmdbImage);

    // 2. Wikipedia
    const wikiImage = await fetchWikipediaImage(query);
    if (wikiImage) images.push(wikiImage);

    // 3. Wikimedia Commons
    if (images.length === 0) {
      const wikimediaImage = await fetchWikimediaImage(query);
      if (wikimediaImage) images.push(wikimediaImage);
    }
  } else {
    // Generic search
    const unsplashImage = await fetchUnsplashImage(query);
    if (unsplashImage) images.push(unsplashImage);

    const wikimediaImage = await fetchWikimediaImage(query);
    if (wikimediaImage) images.push(wikimediaImage);
  }

  // Filter by minimum width
  const validImages = images.filter(img => !img.width || img.width >= minWidth);

  // Get performance data for sources
  const sourcePerformance = await getSourcePerformance();

  // Rank and recommend
  let recommended: ImageSource | null = null;
  let reason = '';

  if (validImages.length > 0) {
    // Score each image
    const scored = validImages.map(img => {
      const sourcePriority = PRIORITY_SOURCES.find(s => s.source === img.source);
      const perfScore = sourcePerformance.get(img.source) || 0.5;

      return {
        image: img,
        score: (sourcePriority?.trust || 0.5) * 0.6 + perfScore * 0.4,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    recommended = scored[0].image;
    reason = `Selected ${recommended.source} (score: ${scored[0].score.toFixed(2)}) - legal & high engagement`;
  } else {
    reason = 'No suitable images found from legal sources';
  }

  return { images: validImages, recommended, reason };
}

// ===== PERFORMANCE TRACKING =====

async function getSourcePerformance(): Promise<Map<string, number>> {
  const performance = new Map<string, number>();

  const { data } = await supabase
    .from('image_registry')
    .select('source, avg_engagement')
    .gt('times_used', 0);

  if (data) {
    const sourceStats = new Map<string, { total: number; count: number }>();

    for (const img of data) {
      const stats = sourceStats.get(img.source) || { total: 0, count: 0 };
      stats.total += img.avg_engagement || 0;
      stats.count += 1;
      sourceStats.set(img.source, stats);
    }

    for (const [source, stats] of sourceStats) {
      performance.set(source, stats.count > 0 ? stats.total / stats.count / 100 : 0.5);
    }
  }

  return performance;
}

// ===== REGISTER IMAGE =====

export async function registerImage(
  image: ImageSource,
  entityType: string,
  entityId?: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('image_registry')
    .insert({
      source: image.source,
      source_url: image.url,
      license_type: image.license,
      author: image.author,
      cdn_url: image.url, // Would be CDN URL after upload
      width: image.width,
      height: image.height,
      aspect_ratio: image.width && image.height ? image.width / image.height : null,
      image_type: entityType === 'movie' ? 'poster' : entityType === 'celebrity' ? 'headshot' : 'generic',
      entity_type: entityType,
      entity_id: entityId,
      is_verified: image.source === 'tmdb',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error registering image:', error);
    return null;
  }

  return data.id;
}

// ===== TRACK IMAGE PERFORMANCE =====

export async function trackImagePerformance(
  imageId: string,
  postId: string,
  context: 'featured' | 'thumbnail' | 'inline'
): Promise<void> {
  // Increment usage
  await supabase
    .from('image_registry')
    .update({
      times_used: supabase.rpc('increment', { row_id: imageId, column_name: 'times_used' }),
    })
    .eq('id', imageId);

  // Record performance entry
  await supabase
    .from('image_performance')
    .insert({
      image_id: imageId,
      post_id: postId,
      context,
      impressions: 1,
    });
}

// ===== UPDATE IMAGE ENGAGEMENT =====

export async function updateImageEngagement(): Promise<void> {
  console.log('Updating image engagement scores...');

  // Get recent image performance
  const { data: imagePerf } = await supabase
    .from('image_performance')
    .select(`
      image_id,
      impressions,
      clicks,
      engagement_lift
    `)
    .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const imageStats = new Map<string, { impressions: number; clicks: number; engagement: number; count: number }>();

  for (const perf of (imagePerf || [])) {
    const stats = imageStats.get(perf.image_id) || { impressions: 0, clicks: 0, engagement: 0, count: 0 };
    stats.impressions += perf.impressions || 0;
    stats.clicks += perf.clicks || 0;
    stats.engagement += perf.engagement_lift || 0;
    stats.count += 1;
    imageStats.set(perf.image_id, stats);
  }

  for (const [imageId, stats] of imageStats) {
    const avgEngagement = stats.count > 0 ? stats.engagement / stats.count : 0;

    await supabase
      .from('image_registry')
      .update({
        avg_engagement: avgEngagement,
        updated_at: new Date().toISOString(),
      })
      .eq('id', imageId);
  }

  console.log(`Updated engagement for ${imageStats.size} images`);
}

// ===== GET BEST IMAGE FOR ENTITY =====

export async function getBestImageForEntity(
  entityType: string,
  entityId: string
): Promise<ImageSource | null> {
  const { data } = await supabase
    .from('image_registry')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('avg_engagement', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    return {
      url: data.cdn_url || data.source_url,
      source: data.source,
      license: data.license_type,
      author: data.author,
      width: data.width,
      height: data.height,
    };
  }

  return null;
}

// ===== VALIDATE IMAGE =====

export async function validateImage(imageUrl: string): Promise<{
  isValid: boolean;
  hasWatermark: boolean;
  isSafe: boolean;
  reason?: string;
}> {
  // Basic validation
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return { isValid: false, hasWatermark: false, isSafe: false, reason: 'Invalid URL' };
  }

  // Check known problematic domains
  const blockedDomains = ['imdb.com', 'google.com/images', 'pinterest.com'];
  for (const domain of blockedDomains) {
    if (imageUrl.includes(domain)) {
      return { isValid: false, hasWatermark: false, isSafe: false, reason: `Blocked source: ${domain}` };
    }
  }

  // Check trusted domains
  const trustedDomains = ['tmdb.org', 'wikimedia.org', 'unsplash.com', 'pexels.com', 'wikipedia.org'];
  const isTrusted = trustedDomains.some(d => imageUrl.includes(d));

  return {
    isValid: true,
    hasWatermark: !isTrusted, // Assume untrusted may have watermarks
    isSafe: true,
    reason: isTrusted ? 'Trusted source' : 'Needs manual verification',
  };
}

// ===== SMART IMAGE SELECTION =====

export async function getSmartImage(
  topic: string,
  category: string,
  options?: {
    movieTitle?: string;
    celebrityName?: string;
    tmdbId?: number;
  }
): Promise<{ image: ImageSource | null; source: string; confidence: number }> {
  let result: ImageSource | null = null;
  let source = '';
  let confidence = 0;

  // Detect entity type from topic/options
  if (options?.movieTitle || category === 'movies') {
    const searchResult = await searchImages(
      options?.movieTitle || topic,
      'movie',
      { tmdbId: options?.tmdbId }
    );
    if (searchResult.recommended) {
      result = searchResult.recommended;
      source = 'movie_search';
      confidence = 0.9;
    }
  } else if (options?.celebrityName) {
    const searchResult = await searchImages(options.celebrityName, 'celebrity');
    if (searchResult.recommended) {
      result = searchResult.recommended;
      source = 'celebrity_search';
      confidence = 0.85;
    }
  } else {
    // Generic topic search
    const searchResult = await searchImages(topic, 'generic');
    if (searchResult.recommended) {
      result = searchResult.recommended;
      source = 'topic_search';
      confidence = 0.6;
    }
  }

  return { image: result, source, confidence };
}
