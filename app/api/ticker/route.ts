/**
 * Trending Ticker API (Edge Runtime)
 *
 * Returns trending items for the ticker:
 * - Telugu film news
 * - Cricket scores (if live)
 * - Google Trends
 *
 * Cached for 5 minutes, failure-safe.
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 300; // 5 minutes

interface TickerItem {
  id: string;
  text: string;
  category: 'news' | 'cricket' | 'trend' | 'gossip';
  url?: string;
  isLive?: boolean;
}

// Fallback ticker items (always available)
const FALLBACK_ITEMS: TickerItem[] = [
  {
    id: 'fallback-1',
    text: '🎬 తెలుగు సినిమా వార్తలు - TeluguVibes',
    category: 'news',
  },
  {
    id: 'fallback-2',
    text: '⭐ సినిమా రివ్యూలు & రేటింగ్స్',
    category: 'gossip',
  },
  {
    id: 'fallback-3',
    text: '🔥 ట్రెండింగ్ గాసిప్ & న్యూస్',
    category: 'trend',
  },
];

export async function GET() {
  try {
    const items: TickerItem[] = [];

    // 1. Fetch internal trending posts
    const internalItems = await fetchInternalTrending();
    items.push(...internalItems);

    // 2. Fetch cricket scores (if available)
    const cricketItems = await fetchCricketScores();
    items.push(...cricketItems);

    // 3. Fetch Google Trends Telugu
    const trendItems = await fetchGoogleTrends();
    items.push(...trendItems);

    // If we got items, return them; otherwise fallback
    const finalItems = items.length > 0 ? items : FALLBACK_ITEMS;

    return NextResponse.json(
      {
        items: finalItems.slice(0, 10), // Max 10 items
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Ticker API error:', error);
    // Return fallback on any error
    return NextResponse.json(
      {
        items: FALLBACK_ITEMS,
        lastUpdated: new Date().toISOString(),
        error: 'Using fallback data',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  }
}

/**
 * Fetch trending posts from our database
 */
async function fetchInternalTrending(): Promise<TickerItem[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return [];
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/posts?status=eq.published&order=views.desc&limit=5`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return [];
    }

    const posts = await response.json();

    return posts.map((post: { id: string; title: string; slug: string; category: string }) => ({
      id: `post-${post.id}`,
      text: `📰 ${post.title}`,
      category: post.category as TickerItem['category'],
      url: `/post/${post.slug}`,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch live cricket scores
 * Uses CricAPI if key is available, falls back to ESPNCricinfo RSS
 */
async function fetchCricketScores(): Promise<TickerItem[]> {
  try {
    // Try API first if key is configured
    const apiKey = process.env.CRICKET_API_KEY;
    if (apiKey) {
      return await fetchCricketFromAPI(apiKey);
    }

    // Fallback to RSS (no API key needed)
    return await fetchCricketFromRSS();
  } catch {
    return [];
  }
}

/**
 * Fetch from CricAPI (requires API key)
 * Get free key from: https://cricketdata.org/
 */
async function fetchCricketFromAPI(apiKey: string): Promise<TickerItem[]> {
  try {
    const response = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.data?.length) return [];

    // Filter for Indian team matches
    const indiaMatches = data.data.filter(
      (match: { teams?: string[]; matchType?: string }) =>
        match.teams?.some((team: string) =>
          team.toLowerCase().includes('india')
        ) && match.matchType
    );

    return indiaMatches.slice(0, 2).map((match: { id: string; teams: string[]; status: string; matchStarted: boolean }) => ({
      id: `cricket-${match.id}`,
      text: `🏏 ${match.teams.join(' vs ')} - ${match.status}`,
      category: 'cricket' as const,
      isLive: match.matchStarted,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch from ESPNCricinfo RSS (no API key needed)
 * Less real-time but always available
 */
async function fetchCricketFromRSS(): Promise<TickerItem[]> {
  try {
    // ESPNCricinfo India team RSS
    const rssUrl = 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml';

    const response = await fetch(rssUrl, {
      next: { revalidate: 300 }, // Cache 5 minutes
      headers: {
        'User-Agent': 'TeluguVibes/1.0',
      },
    });

    if (!response.ok) return [];

    const text = await response.text();

    // Parse RSS items (simple regex parsing)
    const titleMatches = text.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
    if (!titleMatches || titleMatches.length <= 1) return [];

    // Skip first title (feed title), take next 2
    const headlines = titleMatches
      .slice(1, 3)
      .map((match, index) => {
        const title = match.replace(/<title><!\[CDATA\[|\]\]><\/title>/g, '');
        // Only include cricket-related headlines
        if (title.toLowerCase().includes('india') ||
            title.toLowerCase().includes('ipl') ||
            title.toLowerCase().includes('cricket')) {
          return {
            id: `cricket-rss-${index}`,
            text: `🏏 ${title}`,
            category: 'cricket' as const,
            isLive: false,
          };
        }
        return null;
      })
      .filter((item): item is TickerItem => item !== null);

    return headlines;
  } catch {
    return [];
  }
}

/**
 * Fetch Google Trends for Telugu
 */
async function fetchGoogleTrends(): Promise<TickerItem[]> {
  try {
    // We can't directly access Google Trends API without scraping
    // Instead, we'll use our internal trend_signals table
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return [];
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/trend_signals?source=eq.google_trends&order=normalized_score.desc&limit=3`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      return [];
    }

    const trends = await response.json();

    return trends.map((trend: { id: string; keyword: string }) => ({
      id: `trend-${trend.id}`,
      text: `🔥 ట్రెండింగ్: ${trend.keyword}`,
      category: 'trend' as const,
    }));
  } catch {
    return [];
  }
}
