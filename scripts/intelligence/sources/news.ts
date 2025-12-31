/**
 * NEWS SOURCE FETCHER
 *
 * Fetches Telugu entertainment news from news APIs.
 * Used for trending topics and interview content.
 */

import type { RawEntity, RawInterviewData } from '../types';

// Read API keys at runtime, not module load time
function getNewsDataApiKey(): string | undefined {
  return process.env.NEWSDATA_API_KEY;
}

function getGNewsApiKey(): string | undefined {
  return process.env.GNEWS_API_KEY;
}

interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image_url?: string;
  published_at: string;
  source: string;
}

/**
 * Main entry point
 */
export async function fetchFromNews(limit: number): Promise<RawEntity[]> {
  const entities: RawEntity[] = [];
  const NEWSDATA_API_KEY = getNewsDataApiKey();
  const GNEWS_API_KEY = getGNewsApiKey();

  // Try NewsData.io first
  if (NEWSDATA_API_KEY) {
    const newsDataArticles = await fetchFromNewsData(limit, NEWSDATA_API_KEY);
    entities.push(...newsDataArticles);
  }

  // Supplement with GNews if needed
  if (entities.length < limit && GNEWS_API_KEY) {
    const gNewsArticles = await fetchFromGNews(limit - entities.length, GNEWS_API_KEY);
    entities.push(...gNewsArticles);
  }

  if (entities.length === 0) {
    console.warn('  ⚠ No news API keys configured, skipping news source');
  }

  return entities;
}

/**
 * Fetch from NewsData.io
 */
async function fetchFromNewsData(limit: number, apiKey: string): Promise<RawEntity[]> {
  try {
    const url = `https://newsdata.io/api/1/news?` +
      `apikey=${apiKey}` +
      `&q=tollywood OR telugu cinema OR telugu movie` +
      `&language=en,te` +
      `&category=entertainment`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    const articles: any[] = data.results || [];

    return articles.slice(0, limit).map(article => {
      // Extract celebrity name if this is an interview
      const celebrityName = extractCelebrityFromArticle(article.title, article.description);

      const rawData: RawInterviewData = {
        type: 'interview',
        celebrity_name: celebrityName || 'Unknown',
        source_url: article.link,
        source_type: 'news',
        title: article.title,
        transcript: article.content || article.description,
        published_at: article.pubDate,
      };

      return {
        entity_type: 'interview' as const,
        source: 'news' as const,
        source_id: `newsdata_${hashString(article.link)}`,
        name_en: celebrityName || extractTopicFromTitle(article.title),
        data: rawData,
        fetched_at: new Date().toISOString(),
      };
    });
  } catch (error) {
    console.warn('  ⚠ NewsData.io fetch failed:', error);
    return [];
  }
}

/**
 * Fetch from GNews API
 */
async function fetchFromGNews(limit: number, apiKey: string): Promise<RawEntity[]> {
  try {
    const url = `https://gnews.io/api/v4/search?` +
      `token=${apiKey}` +
      `&q=tollywood OR telugu film` +
      `&lang=en` +
      `&max=${limit}`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    const articles: any[] = data.articles || [];

    return articles.map(article => {
      const celebrityName = extractCelebrityFromArticle(article.title, article.description);

      const rawData: RawInterviewData = {
        type: 'interview',
        celebrity_name: celebrityName || 'Unknown',
        source_url: article.url,
        source_type: 'news',
        title: article.title,
        transcript: article.content || article.description,
        published_at: article.publishedAt,
      };

      return {
        entity_type: 'interview' as const,
        source: 'news' as const,
        source_id: `gnews_${hashString(article.url)}`,
        name_en: celebrityName || extractTopicFromTitle(article.title),
        data: rawData,
        fetched_at: new Date().toISOString(),
      };
    });
  } catch (error) {
    console.warn('  ⚠ GNews fetch failed:', error);
    return [];
  }
}

/**
 * Extract celebrity name from article title/description
 */
function extractCelebrityFromArticle(title: string, description?: string): string | null {
  const text = `${title} ${description || ''}`;

  // Known Telugu celebrity names (simplified list)
  const knownCelebrities = [
    'Chiranjeevi', 'Pawan Kalyan', 'Ram Charan', 'Allu Arjun', 'Jr NTR',
    'Mahesh Babu', 'Prabhas', 'Vijay Deverakonda', 'Nani',
    'Samantha', 'Rashmika', 'Pooja Hegde', 'Kajal', 'Anushka',
    'SS Rajamouli', 'Sukumar', 'Trivikram', 'Koratala Siva',
  ];

  for (const name of knownCelebrities) {
    if (text.toLowerCase().includes(name.toLowerCase())) {
      return name;
    }
  }

  // Try to extract name pattern
  const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+)/g;
  const matches = title.match(namePattern);

  if (matches && matches.length > 0) {
    // Filter out common non-name phrases
    const nonNames = ['Box Office', 'First Look', 'Official Trailer'];
    const validName = matches.find(m => !nonNames.includes(m));
    if (validName) return validName;
  }

  return null;
}

/**
 * Extract main topic from article title
 */
function extractTopicFromTitle(title: string): string {
  // Remove common prefixes/suffixes
  return title
    .replace(/^(Breaking|Exclusive|Latest):\s*/i, '')
    .replace(/\s*\|.*$/, '')
    .replace(/\s*-.*$/, '')
    .trim()
    .slice(0, 100);
}

/**
 * Simple string hash for creating unique IDs
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
