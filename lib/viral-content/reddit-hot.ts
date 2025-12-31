/**
 * Reddit Hot Posts Fetcher
 *
 * Fetches viral/hot posts from Telugu cinema subreddits.
 * Uses Reddit's public JSON API (no authentication required).
 *
 * Legal: Public API, respects rate limits
 */

import { detectPlatform } from '@/lib/media/embed-fetcher';

// Telugu/Indian cinema subreddits
const SUBREDDITS = [
  'tollywood',
  'IndianCinema',
  'Ni_Bondha', // Telugu memes
  'TeluguMusicMelodies',
  'Lollywood', // Alternative Tollywood sub
];

// Rate limit: 60 requests per minute
const RATE_LIMIT_MS = 1100;

export interface RedditHotItem {
  id: string;
  subreddit: string;
  title: string;
  author: string;
  url: string;
  permalink: string;
  thumbnail: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'youtube' | 'twitter' | 'instagram' | 'link' | 'text';
  score: number;
  upvoteRatio: number;
  numComments: number;
  createdAt: string;
  isNsfw: boolean;
  flair: string | null;
  extractedPlatform: string | null;
}

interface RedditPost {
  data: {
    id: string;
    subreddit: string;
    title: string;
    author: string;
    url: string;
    permalink: string;
    thumbnail: string;
    score: number;
    upvote_ratio: number;
    num_comments: number;
    created_utc: number;
    over_18: boolean;
    link_flair_text: string | null;
    is_self: boolean;
    selftext: string;
    is_video: boolean;
    media?: {
      reddit_video?: {
        fallback_url: string;
      };
    };
    preview?: {
      images?: Array<{
        source: { url: string };
      }>;
    };
    post_hint?: string;
    domain?: string;
  };
}

/**
 * Detect media type from Reddit post
 */
function detectMediaType(post: RedditPost['data']): RedditHotItem['mediaType'] {
  const url = post.url.toLowerCase();
  const domain = post.domain?.toLowerCase() || '';

  // Self posts (text only)
  if (post.is_self) return 'text';

  // Reddit video
  if (post.is_video || post.media?.reddit_video) return 'video';

  // Image posts
  if (post.post_hint === 'image' || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) {
    return 'image';
  }

  // YouTube
  if (domain.includes('youtube') || domain.includes('youtu.be')) {
    return 'youtube';
  }

  // Twitter/X
  if (domain.includes('twitter') || domain.includes('x.com')) {
    return 'twitter';
  }

  // Instagram
  if (domain.includes('instagram') || domain.includes('instagr.am')) {
    return 'instagram';
  }

  return 'link';
}

/**
 * Extract clean media URL from Reddit post
 */
function extractMediaUrl(post: RedditPost['data']): string | null {
  // Reddit video
  if (post.media?.reddit_video?.fallback_url) {
    return post.media.reddit_video.fallback_url;
  }

  // Image from preview
  if (post.preview?.images?.[0]?.source?.url) {
    // Reddit encodes HTML entities in preview URLs
    return post.preview.images[0].source.url.replace(/&amp;/g, '&');
  }

  // Direct media URL
  const url = post.url;
  if (/\.(jpg|jpeg|png|gif|webp|mp4)(\?|$)/i.test(url)) {
    return url;
  }

  // External platform URLs (for embedding)
  const mediaType = detectMediaType(post);
  if (['youtube', 'twitter', 'instagram'].includes(mediaType)) {
    return post.url;
  }

  return null;
}

/**
 * Fetch hot posts from a single subreddit
 */
async function fetchSubredditHot(subreddit: string, limit: number = 25): Promise<RedditHotItem[]> {
  const results: RedditHotItem[] = [];

  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TeluguVibes/1.0 (Content Aggregator)',
      },
    });

    if (!response.ok) {
      console.warn(`Reddit r/${subreddit} returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const posts: RedditPost[] = data.data?.children || [];

    for (const post of posts) {
      const postData = post.data;

      // Skip stickied posts (usually announcements)
      if ((postData as any).stickied) continue;

      // Skip removed/deleted posts
      if (postData.author === '[deleted]') continue;

      const mediaType = detectMediaType(postData);
      const mediaUrl = extractMediaUrl(postData);

      // For embeddable content, detect the platform
      let extractedPlatform: string | null = null;
      if (mediaUrl && ['youtube', 'twitter', 'instagram'].includes(mediaType)) {
        const detected = detectPlatform(mediaUrl);
        extractedPlatform = detected.platform !== 'unknown' ? detected.platform : null;
      }

      // Get thumbnail
      let thumbnail: string | null = null;
      if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
        thumbnail = postData.thumbnail;
      } else if (postData.preview?.images?.[0]?.source?.url) {
        thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
      }

      results.push({
        id: postData.id,
        subreddit: postData.subreddit,
        title: postData.title,
        author: postData.author,
        url: postData.url,
        permalink: `https://www.reddit.com${postData.permalink}`,
        thumbnail,
        mediaUrl,
        mediaType,
        score: postData.score,
        upvoteRatio: postData.upvote_ratio,
        numComments: postData.num_comments,
        createdAt: new Date(postData.created_utc * 1000).toISOString(),
        isNsfw: postData.over_18,
        flair: postData.link_flair_text,
        extractedPlatform,
      });
    }

  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error);
  }

  return results;
}

/**
 * Fetch hot posts from all Telugu-related subreddits
 */
export async function fetchRedditHot(options: {
  maxPerSubreddit?: number;
  subreddits?: string[];
  includeNsfw?: boolean;
  minScore?: number;
  embeddableOnly?: boolean;
} = {}): Promise<RedditHotItem[]> {
  const {
    maxPerSubreddit = 25,
    subreddits = SUBREDDITS,
    includeNsfw = false,
    minScore = 10,
    embeddableOnly = false,
  } = options;

  const allResults: RedditHotItem[] = [];

  console.log(`📱 Fetching Reddit hot posts from ${subreddits.length} subreddits...`);

  for (const subreddit of subreddits) {
    const posts = await fetchSubredditHot(subreddit, maxPerSubreddit);

    // Filter posts
    const filtered = posts.filter(post => {
      // NSFW filter
      if (!includeNsfw && post.isNsfw) return false;

      // Minimum score filter
      if (post.score < minScore) return false;

      // Embeddable only filter
      if (embeddableOnly) {
        return ['youtube', 'twitter', 'instagram', 'image', 'video'].includes(post.mediaType);
      }

      return true;
    });

    allResults.push(...filtered);

    // Rate limiting between subreddits
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
  }

  // Sort by score (highest first)
  allResults.sort((a, b) => b.score - a.score);

  console.log(`📱 Fetched ${allResults.length} Reddit hot posts`);

  return allResults;
}

/**
 * Calculate viral score based on Reddit engagement
 */
export function calculateRedditViralScore(item: RedditHotItem): number {
  const ageHours = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);

  // Score component (logarithmic)
  const scoreComponent = Math.log10(Math.max(1, item.score)) * 15;

  // Comment engagement
  const commentComponent = Math.log10(Math.max(1, item.numComments)) * 10;

  // Upvote ratio quality (>0.9 is very positive)
  const ratioBonus = item.upvoteRatio > 0.9 ? 10 : item.upvoteRatio > 0.8 ? 5 : 0;

  // Velocity bonus (score per hour)
  const velocity = ageHours > 0 ? item.score / ageHours : 0;
  const velocityBonus = Math.min(15, Math.log10(Math.max(1, velocity)) * 5);

  // Recency multiplier
  const recencyMultiplier = ageHours < 24 ? 1.3 : ageHours < 48 ? 1.1 : Math.max(0.6, 1 - (ageHours - 48) / 168);

  // Embeddable content bonus
  const embeddableBonus = ['youtube', 'twitter', 'instagram', 'video'].includes(item.mediaType) ? 10 : 0;

  const totalScore = (scoreComponent + commentComponent + ratioBonus + velocityBonus + embeddableBonus) * recencyMultiplier;

  return Math.min(100, Math.max(0, totalScore));
}

/**
 * Extract tags from Reddit post
 */
export function extractRedditTags(item: RedditHotItem): string[] {
  const tags: Set<string> = new Set();

  // Add subreddit as tag
  tags.add(item.subreddit.toLowerCase());

  // Add flair as tag
  if (item.flair) {
    const cleanFlair = item.flair.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (cleanFlair.length >= 2 && cleanFlair.length <= 30) {
      tags.add(cleanFlair);
    }
  }

  // Add media type as tag
  if (item.mediaType !== 'link' && item.mediaType !== 'text') {
    tags.add(item.mediaType);
  }

  // Extract from title
  const titleLower = item.title.toLowerCase();

  if (/trailer|teaser/.test(titleLower)) tags.add('trailer');
  if (/song|music/.test(titleLower)) tags.add('song');
  if (/review/.test(titleLower)) tags.add('review');
  if (/meme|funny|comedy/.test(titleLower)) tags.add('meme');
  if (/first look|poster/.test(titleLower)) tags.add('first_look');
  if (/box office|collection/.test(titleLower)) tags.add('box_office');
  if (/ott|streaming|netflix|prime|hotstar/.test(titleLower)) tags.add('ott');

  return Array.from(tags).slice(0, 10);
}

/**
 * Filter to get only embeddable content (YouTube, Twitter, Instagram links)
 */
export function getEmbeddableRedditPosts(posts: RedditHotItem[]): RedditHotItem[] {
  return posts.filter(post =>
    post.extractedPlatform !== null &&
    ['youtube', 'twitter', 'instagram'].includes(post.mediaType)
  );
}



