/**
 * Twitter/X Viral Content Fetcher
 *
 * Fetches viral tweets for the Hot page.
 * Uses Twitter's public oEmbed API (no authentication required).
 *
 * Note: For full trending data, Twitter API v2 requires authentication.
 * This module focuses on embedding known viral tweets from other sources.
 *
 * Legal: Uses official oEmbed API
 */

const TWITTER_OEMBED_URL = 'https://publish.twitter.com/oembed';

// Telugu-related Twitter accounts to monitor
const TELUGU_TWITTER_HANDLES = [
  'saboruraborin0000', // NTR Jr
  'AlwaysRamCharan',
  'uraborstruly',
  'MaheshBabu_',
  'alaborluarjun',
  'RashmikaMandanna',
  'Aborjaboray',
  'PawanKalyan',
  'VenkyMama',
  'aborjaborabororramababu',
];

// Telugu cinema hashtags
const TELUGU_HASHTAGS = [
  'Tollywood',
  'TeluguCinema',
  'Prabhas',
  'NTR',
  'RamCharan',
  'MaheshBabu',
  'AlluArjun',
  'PawanKalyan',
  'Chiranjeevi',
  'RRR',
  'Pushpa',
  'Salaar',
];

export interface TwitterViralItem {
  id: string;
  url: string;
  authorName: string;
  authorUrl: string;
  html: string;
  text?: string;
  createdAt?: string;
  hashtags: string[];
  isVerified?: boolean;
}

export interface TwitterOEmbedResponse {
  url: string;
  author_name: string;
  author_url: string;
  html: string;
  width: number;
  height: number | null;
  type: string;
  cache_age: string;
  provider_name: string;
  provider_url: string;
  version: string;
}

/**
 * Fetch Twitter oEmbed data for a tweet URL
 */
export async function fetchTwitterEmbed(tweetUrl: string): Promise<TwitterViralItem | null> {
  try {
    // Normalize URL (convert x.com to twitter.com)
    const normalizedUrl = tweetUrl.replace('x.com', 'twitter.com');

    // Extract tweet ID from URL
    const tweetIdMatch = normalizedUrl.match(/status\/(\d+)/);
    if (!tweetIdMatch) {
      console.warn('Invalid Twitter URL:', tweetUrl);
      return null;
    }

    const tweetId = tweetIdMatch[1];

    const params = new URLSearchParams({
      url: normalizedUrl,
      omit_script: 'true',
      hide_thread: 'false',
      lang: 'en',
    });

    const response = await fetch(`${TWITTER_OEMBED_URL}?${params}`);

    if (!response.ok) {
      console.warn(`Twitter oEmbed failed for ${tweetUrl}:`, response.status);
      return null;
    }

    const data: TwitterOEmbedResponse = await response.json();

    // Extract hashtags from HTML
    const hashtags = extractHashtagsFromHtml(data.html);

    // Add Twitter widgets script to HTML
    const htmlWithScript = data.html + '\n<script async src="https://platform.twitter.com/widgets.js"></script>';

    return {
      id: tweetId,
      url: data.url,
      authorName: data.author_name,
      authorUrl: data.author_url,
      html: htmlWithScript,
      hashtags,
    };

  } catch (error) {
    console.error('Twitter embed fetch error:', error);
    return null;
  }
}

/**
 * Extract hashtags from Twitter embed HTML
 */
function extractHashtagsFromHtml(html: string): string[] {
  const hashtags: string[] = [];
  const hashtagPattern = /#(\w+)/g;
  let match;

  while ((match = hashtagPattern.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    if (!hashtags.includes(tag)) {
      hashtags.push(tag);
    }
  }

  return hashtags;
}

/**
 * Check if a tweet URL is Telugu-related based on URL patterns
 */
export function isTeluguRelatedTweet(url: string, hashtags: string[] = []): boolean {
  const urlLower = url.toLowerCase();

  // Check if from known Telugu handle
  for (const handle of TELUGU_TWITTER_HANDLES) {
    if (urlLower.includes(`/${handle.toLowerCase()}/`)) {
      return true;
    }
  }

  // Check hashtags
  for (const hashtag of hashtags) {
    if (TELUGU_HASHTAGS.map(h => h.toLowerCase()).includes(hashtag.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Batch fetch Twitter embeds for multiple URLs
 */
export async function fetchTwitterEmbeds(
  tweetUrls: string[],
  options: {
    teluguOnly?: boolean;
    maxConcurrent?: number;
  } = {}
): Promise<TwitterViralItem[]> {
  const { teluguOnly = false, maxConcurrent = 5 } = options;
  const results: TwitterViralItem[] = [];

  console.log(`🐦 Fetching Twitter embeds for ${tweetUrls.length} URLs...`);

  // Process in batches to avoid rate limiting
  for (let i = 0; i < tweetUrls.length; i += maxConcurrent) {
    const batch = tweetUrls.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(url => fetchTwitterEmbed(url))
    );

    for (const result of batchResults) {
      if (result) {
        // Apply Telugu filter if needed
        if (teluguOnly && !isTeluguRelatedTweet(result.url, result.hashtags)) {
          continue;
        }
        results.push(result);
      }
    }

    // Rate limiting between batches
    if (i + maxConcurrent < tweetUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`🐦 Fetched ${results.length} Twitter embeds`);

  return results;
}

/**
 * Generate Twitter profile URL
 */
export function getTwitterProfileUrl(handle: string): string {
  return `https://twitter.com/${handle.replace('@', '')}`;
}

/**
 * Generate Twitter search URL for a hashtag
 */
export function getTwitterHashtagUrl(hashtag: string): string {
  return `https://twitter.com/hashtag/${hashtag.replace('#', '')}`;
}

/**
 * Extract tweet URL from various formats
 */
export function normalizeTweetUrl(input: string): string | null {
  // Direct URL patterns
  const patterns = [
    /https?:\/\/(www\.)?(twitter|x)\.com\/\w+\/status\/\d+/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[0].replace('x.com', 'twitter.com');
    }
  }

  return null;
}

/**
 * Calculate viral score for Twitter content
 * Note: Without API access, we estimate based on available data
 */
export function calculateTwitterViralScore(item: TwitterViralItem): number {
  let score = 50; // Base score

  // Verified account bonus (check if author is in our known list)
  const isKnownAccount = TELUGU_TWITTER_HANDLES
    .map(h => h.toLowerCase())
    .some(h => item.authorUrl.toLowerCase().includes(h));

  if (isKnownAccount) {
    score += 20;
  }

  // Telugu hashtag relevance
  const teluguHashtagCount = item.hashtags.filter(h =>
    TELUGU_HASHTAGS.map(t => t.toLowerCase()).includes(h.toLowerCase())
  ).length;

  score += Math.min(15, teluguHashtagCount * 5);

  // Total hashtags (engagement indicator)
  score += Math.min(10, item.hashtags.length * 2);

  return Math.min(100, Math.max(0, score));
}

/**
 * Extract tags from Twitter item
 */
export function extractTwitterTags(item: TwitterViralItem): string[] {
  const tags: Set<string> = new Set();

  // Add hashtags as tags
  for (const hashtag of item.hashtags.slice(0, 10)) {
    const cleanTag = hashtag.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanTag.length >= 2 && cleanTag.length <= 30) {
      tags.add(cleanTag);
    }
  }

  // Add platform tag
  tags.add('twitter');

  // Add author handle as tag
  const handleMatch = item.authorUrl.match(/twitter\.com\/(\w+)/);
  if (handleMatch) {
    tags.add(handleMatch[1].toLowerCase());
  }

  return Array.from(tags).slice(0, 10);
}

/**
 * Get known Telugu cinema Twitter handles
 */
export function getTeluguTwitterHandles(): string[] {
  return [...TELUGU_TWITTER_HANDLES];
}

/**
 * Get Telugu cinema hashtags
 */
export function getTeluguHashtags(): string[] {
  return [...TELUGU_HASHTAGS];
}
