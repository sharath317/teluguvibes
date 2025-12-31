/**
 * Smart Image Fetcher - Gets relevant, watermark-free images
 * Priority: Known TMDB ID > TMDB Search > Movie Poster > Wikipedia > Curated Fallback
 *
 * Target: 99%+ success rate for celebrity images
 */

import { extractEntities } from './content-rewriter';
import { searchMovies, detectMovieInText } from './movie-db';
import { extractCelebrityName, extractAllCelebrities, TELUGU_NAME_MAP, TELUGU_CELEBRITIES } from './telugu-celebrities';
import { getCelebrityTMDBData, getSearchAlternates, CelebrityTMDBData } from './celebrity-tmdb-ids';

interface ImageResult {
  url: string;
  source: 'tmdb' | 'unsplash' | 'pexels' | 'stock';
  query: string;
  description?: string;
}

// Sensitive topics - use abstract images
const SENSITIVE_PATTERNS = [
  /rape/i, /murder/i, /kill/i, /death/i, /suicide/i, /assault/i,
  /attack/i, /terrorist/i, /bomb/i, /accident/i, /crash/i,
  /హత్య/, /మరణం/, /చనిపో/, /ప్రమాదం/, /దాడి/, /ఆత్మహత్య/,
];

// High-quality curated fallback images by category
// These are reliable, free-to-use images that match Telugu entertainment themes
const CURATED_FALLBACK_IMAGES: Record<string, string[]> = {
  entertainment: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200', // Cinema
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200', // Film reel
    'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=1200', // Movie theater
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200', // Cinema seats
  ],
  sports: [
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200', // Cricket
    'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=1200', // Cricket bat
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200', // Stadium
    'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=1200', // Sports action
  ],
  politics: [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200', // Parliament
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200', // Government
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200', // Meeting
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200', // Office
  ],
  gossip: [
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=1200', // Celebrity
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200', // Event
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200', // Party
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200', // Celebration
  ],
  trending: [
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200', // Social media
    'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1200', // Trending
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200', // News
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200', // Breaking news
  ],
  movies: [
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200', // Film
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200', // Director chair
    'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200', // Movie set
    'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=1200', // Clapperboard
  ],
  celebrity: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200', // Portrait
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=1200', // Professional
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1200', // Suit
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200', // Male portrait
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200', // Tech
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200', // Coding
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200', // Devices
  ],
  health: [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200', // Health
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200', // Medical
  ],
  sensitive: [
    'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200', // Abstract gradient
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200', // Purple gradient
    'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=1200', // Blue gradient
  ],
};

// Celebrity data is now imported from telugu-celebrities.ts
// Contains 300+ Telugu celebrities with Telugu-English name mappings

/**
 * Check if content is sensitive
 */
function isSensitive(text: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Get a curated fallback image for a category
 */
function getCuratedFallback(category: string, seed: string): ImageResult {
  const images = CURATED_FALLBACK_IMAGES[category] || CURATED_FALLBACK_IMAGES.trending;
  // Use seed to consistently pick same image for same content
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % images.length;

  return {
    url: images[index],
    source: 'stock',
    query: category,
    description: `${category} themed image`,
  };
}

/**
 * Search Unsplash for images
 */
async function searchUnsplash(query: string, count: number = 5): Promise<ImageResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.log(`   ⚠️ No UNSPLASH_ACCESS_KEY configured`);
    return [];
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count}`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!response.ok) {
      console.log(`   ⚠️ Unsplash API error: ${response.status}`);
      return [];
    }

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
  if (!apiKey) {
    console.log(`   ⚠️ No PEXELS_API_KEY configured`);
    return [];
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );

    if (!response.ok) {
      console.log(`   ⚠️ Pexels API error: ${response.status}`);
      return [];
    }

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
 * Get TMDB person image by known ID (fastest and most reliable)
 */
async function getTMDBPersonById(tmdbId: number, personName: string): Promise<ImageResult | null> {
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/person/${tmdbId}?api_key=${apiKey}&language=en-US`
    );

    if (!response.ok) return null;

    const person = await response.json();
    if (person.profile_path) {
      console.log(`   ✅ Got TMDB person by ID: ${person.name} (ID: ${tmdbId})`);
      return {
        url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
        source: 'tmdb',
        query: personName,
        description: `${person.name} photo`,
      };
    }
  } catch (error) {
    console.error(`TMDB person ID lookup error:`, error);
  }
  return null;
}

/**
 * Get movie poster as fallback for celebrity without profile image
 */
async function getTMDBMoviePosterById(movieId: number, personName: string): Promise<ImageResult | null> {
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`
    );

    if (!response.ok) return null;

    const movie = await response.json();
    if (movie.poster_path) {
      console.log(`   🎬 Using movie poster fallback: ${movie.title}`);
      return {
        url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        source: 'tmdb',
        query: personName,
        description: `${movie.title} movie poster (featuring ${personName})`,
      };
    }
    if (movie.backdrop_path) {
      return {
        url: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
        source: 'tmdb',
        query: personName,
        description: `${movie.title} movie backdrop`,
      };
    }
  } catch (error) {
    console.error(`TMDB movie lookup error:`, error);
  }
  return null;
}

/**
 * Search Wikipedia for person image (fallback)
 */
async function searchWikipediaImage(personName: string): Promise<ImageResult | null> {
  try {
    // Use Wikipedia API to get page image
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(personName.replace(/ /g, '_'))}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.thumbnail?.source) {
      // Get higher resolution version
      const highResUrl = data.thumbnail.source.replace(/\/\d+px-/, '/500px-');
      console.log(`   📚 Found Wikipedia image for: ${personName}`);
      return {
        url: highResUrl,
        source: 'stock', // Mark as stock since Wikipedia images have various licenses
        query: personName,
        description: `${personName} from Wikipedia`,
      };
    }
  } catch (error) {
    console.error(`Wikipedia image search error:`, error);
  }
  return null;
}

/**
 * Search TMDB for person/celebrity photos with multiple strategies
 */
async function searchTMDBPerson(personName: string): Promise<ImageResult | null> {
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    console.log(`   ⚠️ No TMDB_API_KEY configured`);
    return null;
  }

  // Strategy 1: Check if we have a known TMDB ID for this celebrity
  const knownData = getCelebrityTMDBData(personName);
  if (knownData) {
    console.log(`   🔑 Found known TMDB ID for ${personName}: ${knownData.tmdbId}`);

    // Try direct ID lookup first (fastest and most reliable)
    if (knownData.hasImage) {
      const result = await getTMDBPersonById(knownData.tmdbId, personName);
      if (result) return result;
    }

    // If no profile image, try movie poster fallback
    if (knownData.fallbackMovieId) {
      const movieResult = await getTMDBMoviePosterById(knownData.fallbackMovieId, personName);
      if (movieResult) return movieResult;
    }
  }

  // Strategy 2: Search TMDB API with the name
  const searchQueries = getSearchAlternates(personName);

  for (const query of searchQueries) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US`
      );

      if (!response.ok) continue;

      const data = await response.json();

      // Find best match with profile image
      for (const person of (data.results || [])) {
        if (person.profile_path) {
          console.log(`   👤 Found TMDB person: ${person.name} (${person.known_for_department})`);
          return {
            url: `https://image.tmdb.org/t/p/w500${person.profile_path}`,
            source: 'tmdb',
            query: personName,
            description: `${person.name} photo`,
          };
        }
      }

      // If found but no image, try their known_for movies
      if (data.results?.[0]?.known_for?.length > 0) {
        const movie = data.results[0].known_for.find((m: any) => m.poster_path);
        if (movie) {
          console.log(`   🎬 Using known_for movie: ${movie.title || movie.name}`);
          return {
            url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
            source: 'tmdb',
            query: personName,
            description: `${movie.title || movie.name} poster (featuring ${personName})`,
          };
        }
      }
    } catch (error) {
      console.error(`TMDB search error for "${query}":`, error);
    }
  }

  // Strategy 3: Try Wikipedia as fallback
  const wikiResult = await searchWikipediaImage(personName);
  if (wikiResult) return wikiResult;

  console.log(`   ⚠️ No image found for: ${personName}`);
  return null;
}

/**
 * Search TMDB for movie posters
 */
async function searchTMDBPoster(movieName: string): Promise<ImageResult | null> {
  try {
    const movies = await searchMovies(movieName);
    if (movies.length > 0 && movies[0].posterUrl) {
      console.log(`   🎬 Found TMDB movie: ${movies[0].title}`);
      return {
        url: movies[0].posterUrl,
        source: 'tmdb',
        query: movieName,
        description: `${movies[0].title} movie poster`,
      };
    }
    // Try backdrop if no poster
    if (movies.length > 0 && movies[0].backdropUrl) {
      return {
        url: movies[0].backdropUrl,
        source: 'tmdb',
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
 * Detect category from content
 */
function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();

  if (/cricket|ipl|match|wicket|బ్యాట్|క్రికెట్/.test(lowerText)) return 'sports';
  if (/movie|film|సినిమా|మూవీ|release|trailer|ott/.test(lowerText)) return 'movies';
  if (/politics|election|minister|ఎన్నిక|మంత్రి|ముఖ్యమంత్రి|అసెంబ్లీ/.test(lowerText)) return 'politics';
  if (/marriage|wedding|పెళ్లి|వివాహం|gossip/.test(lowerText)) return 'gossip';
  if (/tech|satellite|space|app|అంతరిక్ష/.test(lowerText)) return 'technology';
  if (/health|medical|ఆరోగ్య/.test(lowerText)) return 'health';

  return 'trending';
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
  const detectedCategory = detectCategory(fullText) || category;

  console.log(`\n🔍 [ImageFetch] "${title.substring(0, 60)}..."`);
  console.log(`   Category: ${category} (detected: ${detectedCategory})`);

  // Check for sensitive content first
  if (isSensitive(fullText)) {
    console.log(`   ⚠️ Sensitive content detected - using abstract image`);
    return getCuratedFallback('sensitive', title);
  }

  // Priority 1: Check for celebrity/person name - search TMDB for their photo
  const celebrityName = extractCelebrityName(fullText);
  if (celebrityName) {
    console.log(`   👤 Detected celebrity: "${celebrityName}"`);
    const personResult = await searchTMDBPerson(celebrityName);
    if (personResult) {
      console.log(`   ✅ Found TMDB person photo`);
      return personResult;
    }
  }

  // Priority 2: Check if this is about a movie - use TMDB for official poster
  const detectedMovie = detectMovieInText(fullText);
  if (detectedMovie) {
    console.log(`   🎬 Detected movie: "${detectedMovie}"`);
    const tmdbResult = await searchTMDBPoster(detectedMovie);
    if (tmdbResult) {
      console.log(`   ✅ Found TMDB poster`);
      return tmdbResult;
    }
  }

  // Priority 3: Try Unsplash with category-specific queries
  const categoryQueries: Record<string, string[]> = {
    entertainment: ['indian cinema', 'film industry india', 'bollywood'],
    sports: ['cricket match india', 'IPL cricket', 'indian cricket'],
    politics: ['indian parliament', 'government meeting', 'political rally india'],
    gossip: ['celebrity event india', 'red carpet bollywood', 'glamour party'],
    movies: ['movie theater india', 'film premiere', 'cinema india'],
    trending: ['social media india', 'breaking news', 'viral trend'],
    technology: ['technology innovation', 'satellite space', 'digital india'],
    health: ['healthcare india', 'medical wellness'],
  };

  const queries = categoryQueries[detectedCategory] || categoryQueries.trending;

  for (const query of queries.slice(0, 2)) {
    const unsplashResults = await searchUnsplash(query, 3);
    if (unsplashResults.length > 0) {
      const result = unsplashResults[0];
      console.log(`   ✅ Found on Unsplash: "${query}"`);
      return result;
    }

    const pexelsResults = await searchPexels(query, 3);
    if (pexelsResults.length > 0) {
      const result = pexelsResults[0];
      console.log(`   ✅ Found on Pexels: "${query}"`);
      return result;
    }
  }

  // Priority 4: Use curated fallback images (guaranteed to work)
  console.log(`   📷 Using curated ${detectedCategory} fallback image`);
  return getCuratedFallback(detectedCategory, title);
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
