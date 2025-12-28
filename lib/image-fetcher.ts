/**
 * Smart Image Fetcher - Gets relevant, watermark-free images
 * Priority: TMDB (movies) > Unsplash > Pexels > Picsum
 */

import { extractEntities } from './content-rewriter';
import { searchMovies, detectMovieInText } from './movie-db';

interface ImageResult {
  url: string;
  source: 'unsplash' | 'pexels' | 'picsum';
  query: string;
  description?: string;
}

// Sensitive topics - use abstract images
const SENSITIVE_PATTERNS = [
  /rape/i, /murder/i, /kill/i, /death/i, /suicide/i, /assault/i,
  /attack/i, /terrorist/i, /bomb/i, /accident/i, /crash/i,
  /హత్య/, /మరణం/, /చనిపో/, /ప్రమాదం/, /దాడి/,
];

// Category fallback images
const CATEGORY_QUERIES: Record<string, string[]> = {
  entertainment: [
    'bollywood film set',
    'cinema hall india',
    'movie premiere red carpet',
    'film award ceremony',
  ],
  sports: [
    'cricket stadium india',
    'IPL cricket match',
    'sports arena crowd',
    'cricket bat ball',
  ],
  politics: [
    'indian parliament building',
    'government meeting india',
    'political rally india',
    'delhi india government',
  ],
  gossip: [
    'celebrity red carpet',
    'glamour fashion india',
    'celebrity event',
    'star party event',
  ],
  trending: [
    'social media smartphone',
    'viral content phone',
    'trending news india',
    'breaking news studio',
  ],
};

/**
 * Check if content is sensitive
 */
function isSensitive(text: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Search Unsplash for images
 */
async function searchUnsplash(query: string, count: number = 5): Promise<ImageResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count}`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.results || []).map((photo: any) => ({
      url: photo.urls?.regular || photo.urls?.small,
      source: 'unsplash' as const,
      query,
      description: photo.alt_description,
    }));
  } catch (error) {
    console.error('Unsplash error:', error);
    return [];
  }
}

/**
 * Search Pexels for images
 */
async function searchPexels(query: string, count: number = 5): Promise<ImageResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.photos || []).map((photo: any) => ({
      url: photo.src?.large || photo.src?.medium,
      source: 'pexels' as const,
      query,
      description: photo.alt,
    }));
  } catch (error) {
    console.error('Pexels error:', error);
    return [];
  }
}

/**
 * Get picsum fallback
 */
function getPicsumUrl(seed: string): ImageResult {
  const safeSeed = seed.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || 'default';
  return {
    url: `https://picsum.photos/seed/${safeSeed}/800/600`,
    source: 'picsum',
    query: seed,
  };
}

/**
 * Build search queries based on content analysis
 */
function buildSearchQueries(title: string, content: string, category: string): string[] {
  const fullText = `${title} ${content}`;
  const queries: string[] = [];

  // Check for sensitive content first
  if (isSensitive(fullText)) {
    return ['abstract gradient pattern', 'abstract colorful background'];
  }

  // Extract entities
  const entities = extractEntities(fullText);

  // Priority 1: Celebrities (most specific)
  if (entities.celebrities.length > 0) {
    // Search for celebrity name + context
    const celeb = entities.celebrities[0];
    queries.push(`${celeb} portrait`);
    queries.push(`${celeb} celebrity`);

    // Add context-aware search
    if (fullText.toLowerCase().includes('movie') || fullText.toLowerCase().includes('film')) {
      queries.push(`${celeb} movie`);
    }
    if (fullText.toLowerCase().includes('ipl') || fullText.toLowerCase().includes('cricket')) {
      queries.push(`${celeb} cricket`);
    }
  }

  // Priority 2: Politicians
  if (entities.politicians.length > 0) {
    const politician = entities.politicians[0];
    queries.push(`${politician} politician`);
    queries.push(`india politics government`);
  }

  // Priority 3: Topics
  if (entities.topics.length > 0) {
    queries.push(...entities.topics.slice(0, 2));
  }

  // Priority 4: Category fallbacks
  const categoryQueries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.trending;
  queries.push(...categoryQueries.slice(0, 2));

  return queries;
}

/**
 * Search TMDB for movie posters
 */
async function searchTMDBPoster(movieName: string): Promise<ImageResult | null> {
  try {
    const movies = await searchMovies(movieName);
    if (movies.length > 0 && movies[0].posterUrl) {
      return {
        url: movies[0].posterUrl,
        source: 'unsplash' as const, // Mark as unsplash for consistency
        query: movieName,
        description: `${movies[0].title} movie poster`,
      };
    }
    // Try backdrop if no poster
    if (movies.length > 0 && movies[0].backdropUrl) {
      return {
        url: movies[0].backdropUrl,
        source: 'unsplash' as const,
        query: movieName,
        description: `${movies[0].title} movie backdrop`,
      };
    }
  } catch (error) {
    console.error('TMDB search error:', error);
  }
  return null;
}

/**
 * Main function - Get the best relevant image for an article
 */
export async function fetchRelevantImage(
  title: string,
  content: string,
  category: string
): Promise<ImageResult> {
  const fullText = `${title} ${content}`;

  console.log(`\n🔍 [ImageFetch] "${title.substring(0, 50)}..."`);

  // Priority 1: Check if this is about a movie - use TMDB for official poster
  const detectedMovie = detectMovieInText(fullText);
  if (detectedMovie) {
    console.log(`   🎬 Detected movie: "${detectedMovie}"`);
    const tmdbResult = await searchTMDBPoster(detectedMovie);
    if (tmdbResult) {
      console.log(`   ✅ Found TMDB poster: "${tmdbResult.description}"`);
      return tmdbResult;
    }
  }

  // Priority 2: Check for movie-related keywords and search TMDB
  const movieKeywords = ['movie', 'film', 'సినిమా', 'మూవీ', 'box office', 'trailer', 'teaser', 'ott', 'release'];
  const hasMovieContext = movieKeywords.some(kw => fullText.toLowerCase().includes(kw));

  if (hasMovieContext && category === 'entertainment') {
    // Try to extract movie name from title
    const titleWords = title.split(/[\s\-:,|]+/).filter(w => w.length > 3);
    for (const word of titleWords.slice(0, 3)) {
      if (word.match(/^[A-Z]/) || word.match(/^[\u0C00-\u0C7F]/)) { // Capitalized or Telugu
        const tmdbResult = await searchTMDBPoster(word);
        if (tmdbResult) {
          console.log(`   ✅ Found TMDB poster for "${word}": "${tmdbResult.description}"`);
          return tmdbResult;
        }
      }
    }
  }

  // Priority 3: Build search queries for Unsplash/Pexels
  const queries = buildSearchQueries(title, content, category);
  console.log(`   Queries: ${queries.slice(0, 3).join(' | ')}`);

  // Try each query until we find a good image
  for (const query of queries) {
    // Try Unsplash first (best quality, no watermarks)
    const unsplashResults = await searchUnsplash(query, 3);
    if (unsplashResults.length > 0) {
      const result = unsplashResults[Math.floor(Math.random() * unsplashResults.length)];
      console.log(`   ✅ Found on Unsplash: "${result.description || query}"`);
      return result;
    }

    // Try Pexels (also good quality, no watermarks)
    const pexelsResults = await searchPexels(query, 3);
    if (pexelsResults.length > 0) {
      const result = pexelsResults[Math.floor(Math.random() * pexelsResults.length)];
      console.log(`   ✅ Found on Pexels: "${result.description || query}"`);
      return result;
    }
  }

  // Fallback to picsum with category-based seed
  console.log(`   ⚠️ Fallback to Picsum`);
  const fallbackQuery = CATEGORY_QUERIES[category]?.[0] || 'news';
  return getPicsumUrl(fallbackQuery);
}

/**
 * Batch fetch images for multiple articles
 */
export async function fetchImagesForArticles(
  articles: Array<{ title: string; content: string; category: string }>
): Promise<ImageResult[]> {
  const results: ImageResult[] = [];

  for (const article of articles) {
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));

    const image = await fetchRelevantImage(
      article.title,
      article.content,
      article.category
    );
    results.push(image);
  }

  return results;
}
