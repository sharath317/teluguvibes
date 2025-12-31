/**
 * YouTube Trending Videos Fetcher
 *
 * Fetches viral/trending YouTube videos for the Hot page.
 * Uses YouTube Data API v3 Most Popular endpoint.
 *
 * Legal: Uses official YouTube API
 */

import { getYouTubeThumbnail } from '@/lib/media/embed-fetcher';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Telugu language patterns for filtering
const TELUGU_PATTERNS = [
  /[\u0C00-\u0C7F]/, // Telugu Unicode block
  /telugu/i,
  /tollywood/i,
  /తెలుగు/,
];

// Popular Telugu cinema YouTube channels
const TELUGU_CHANNEL_IDS = [
  'UCnJjcn5FrgrOEp5_N45ZLEQ', // Lahari Music
  'UCBPAgxW0rYnj1ANB5vy4ViQ', // Aditya Music
  'UCqYPhGiB9tkShZsq9CGkZDw', // T-Series Telugu
  'UCWtAX-Wm9mH6KVq9mWVE9Sg', // Sri Balaji Video
  'UC9IuX5pBfsRoD-V7uQw5-Dw', // Mango Music
];

export interface YouTubeTrendingItem {
  id: string;
  url: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  tags: string[];
  isTeluguContent: boolean;
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
    tags?: string[];
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

/**
 * Check if content is Telugu-related
 */
function isTeluguContent(item: YouTubeVideoItem): boolean {
  const textToCheck = `${item.snippet.title} ${item.snippet.description} ${(item.snippet.tags || []).join(' ')}`;

  // Check against Telugu patterns
  for (const pattern of TELUGU_PATTERNS) {
    if (pattern.test(textToCheck)) {
      return true;
    }
  }

  // Check if from known Telugu channel
  if (TELUGU_CHANNEL_IDS.includes(item.snippet.channelId)) {
    return true;
  }

  return false;
}

/**
 * Fetch YouTube Most Popular Videos (India region)
 */
export async function fetchYouTubeTrending(options: {
  maxResults?: number;
  teluguOnly?: boolean;
  categoryId?: string; // 24 = Entertainment, 10 = Music
} = {}): Promise<YouTubeTrendingItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('⚠ YOUTUBE_API_KEY not set, skipping YouTube trending fetch');
    return [];
  }

  const { maxResults = 50, teluguOnly = true, categoryId = '24' } = options;
  const results: YouTubeTrendingItem[] = [];

  try {
    // Fetch most popular videos in India
    const params = new URLSearchParams({
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      regionCode: 'IN',
      videoCategoryId: categoryId,
      maxResults: String(maxResults),
      key: apiKey,
    });

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);

    if (!response.ok) {
      console.error('YouTube API error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    const items: YouTubeVideoItem[] = data.items || [];

    for (const item of items) {
      const isTeluguItem = isTeluguContent(item);

      // Skip non-Telugu if teluguOnly is true
      if (teluguOnly && !isTeluguItem) {
        continue;
      }

      const thumbnails = item.snippet.thumbnails;
      const thumbnail = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';

      results.push({
        id: item.id,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        title: item.snippet.title,
        description: item.snippet.description.slice(0, 500),
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        thumbnail: thumbnail || getYouTubeThumbnail(item.id, 'hq'),
        viewCount: parseInt(item.statistics.viewCount) || 0,
        likeCount: parseInt(item.statistics.likeCount) || 0,
        commentCount: parseInt(item.statistics.commentCount) || 0,
        duration: item.contentDetails.duration,
        tags: item.snippet.tags || [],
        isTeluguContent: isTeluguItem,
      });
    }

    // Also fetch from Telugu-specific search if not enough results
    if (teluguOnly && results.length < 10) {
      const additionalResults = await searchTeluguTrending(apiKey, 20 - results.length);
      results.push(...additionalResults);
    }

    console.log(`📺 Fetched ${results.length} YouTube trending videos`);

  } catch (error) {
    console.error('YouTube trending fetch error:', error);
  }

  return results;
}

/**
 * Search for trending Telugu content specifically
 */
async function searchTeluguTrending(apiKey: string, maxResults: number): Promise<YouTubeTrendingItem[]> {
  const results: YouTubeTrendingItem[] = [];
  const searchQueries = [
    'Telugu movie trailer 2024',
    'Tollywood trending',
    'Telugu songs trending',
  ];

  for (const query of searchQueries) {
    if (results.length >= maxResults) break;

    try {
      // Search for videos
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'viewCount',
        publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        maxResults: String(Math.min(10, maxResults - results.length)),
        key: apiKey,
      });

      const searchResponse = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
      if (!searchResponse.ok) continue;

      const searchData = await searchResponse.json();
      const videoIds = (searchData.items || [])
        .map((item: { id: { videoId: string } }) => item.id.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) continue;

      // Get full video details
      const detailsParams = new URLSearchParams({
        part: 'snippet,statistics,contentDetails',
        id: videoIds,
        key: apiKey,
      });

      const detailsResponse = await fetch(`${YOUTUBE_API_BASE}/videos?${detailsParams}`);
      if (!detailsResponse.ok) continue;

      const detailsData = await detailsResponse.json();

      for (const item of detailsData.items || []) {
        // Skip duplicates
        if (results.find(r => r.id === item.id)) continue;

        const thumbnails = item.snippet.thumbnails;
        const thumbnail = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';

        results.push({
          id: item.id,
          url: `https://www.youtube.com/watch?v=${item.id}`,
          title: item.snippet.title,
          description: item.snippet.description.slice(0, 500),
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
          publishedAt: item.snippet.publishedAt,
          thumbnail: thumbnail || getYouTubeThumbnail(item.id, 'hq'),
          viewCount: parseInt(item.statistics.viewCount) || 0,
          likeCount: parseInt(item.statistics.likeCount) || 0,
          commentCount: parseInt(item.statistics.commentCount) || 0,
          duration: item.contentDetails.duration,
          tags: item.snippet.tags || [],
          isTeluguContent: true,
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.warn(`Search query "${query}" failed:`, error);
    }
  }

  return results;
}

/**
 * Calculate viral score based on engagement metrics
 */
export function calculateYouTubeViralScore(item: YouTubeTrendingItem): number {
  const ageHours = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);

  // Engagement rate (likes + comments relative to views)
  const engagementRate = item.viewCount > 0
    ? (item.likeCount + item.commentCount * 2) / item.viewCount
    : 0;

  // View velocity (views per hour)
  const viewVelocity = ageHours > 0 ? item.viewCount / ageHours : 0;

  // Base score from view count (logarithmic scale)
  const viewScore = Math.log10(Math.max(1, item.viewCount)) * 10;

  // Engagement bonus
  const engagementScore = Math.min(30, engagementRate * 1000);

  // Velocity bonus (recent viral content)
  const velocityScore = Math.min(20, Math.log10(Math.max(1, viewVelocity)) * 5);

  // Recency bonus (decay after 48 hours)
  const recencyMultiplier = ageHours < 48 ? 1.2 : Math.max(0.5, 1 - (ageHours - 48) / 168);

  const totalScore = (viewScore + engagementScore + velocityScore) * recencyMultiplier;

  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Extract relevant tags for categorization
 */
export function extractYouTubeTags(item: YouTubeTrendingItem): string[] {
  const tags: Set<string> = new Set();

  // Add existing tags (cleaned up)
  for (const tag of item.tags.slice(0, 10)) {
    const cleanTag = tag.toLowerCase().replace(/[^a-z0-9\u0C00-\u0C7F\s]/g, '').trim();
    if (cleanTag.length >= 2 && cleanTag.length <= 30) {
      tags.add(cleanTag);
    }
  }

  // Add inferred tags from title
  const titleLower = item.title.toLowerCase();

  if (/trailer|teaser/.test(titleLower)) tags.add('trailer');
  if (/song|lyrical|video song/.test(titleLower)) tags.add('song');
  if (/review|విమర్శ/.test(titleLower)) tags.add('review');
  if (/interview|ఇంటర్వ్యూ/.test(titleLower)) tags.add('interview');
  if (/making|behind the scenes|bts/.test(titleLower)) tags.add('behind_the_scenes');
  if (/comedy|funny|hilarious/.test(titleLower)) tags.add('comedy');
  if (/fight|action/.test(titleLower)) tags.add('action');

  return Array.from(tags).slice(0, 15);
}



