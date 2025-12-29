import slugify from 'slugify';
import type { TrendingTopic } from '@/types/database';

/**
 * Fetch trending topics from multiple sources
 * Since Google Trends RSS is deprecated, we use alternatives
 */
export async function fetchGoogleTrends(): Promise<TrendingTopic[]> {
  const trends: TrendingTopic[] = [];

  // Try NewsData.io API (free tier: 200 requests/day)
  const newsDataApiKey = process.env.NEWSDATA_API_KEY;
  if (newsDataApiKey) {
    try {
      const response = await fetch(
        `https://newsdata.io/api/1/news?apikey=${newsDataApiKey}&country=in&language=te&category=entertainment,sports,politics`,
        { next: { revalidate: 3600 } }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          trends.push(...data.results.slice(0, 10).map((item: any) => ({
            title: item.title || 'Unknown',
            traffic: '10,000+',
            url: item.link || '',
            source: 'newsdata',
          })));
        }
      }
    } catch (error) {
      console.error('NewsData API error:', error);
    }
  }

  // Fallback: Generate trending topics based on popular Telugu keywords
  if (trends.length === 0) {
    const fallbackTrends = generateFallbackTrends();
    trends.push(...fallbackTrends);
  }

  return trends;
}

/**
 * Generate fallback trending topics when APIs are unavailable
 */
function generateFallbackTrends(): TrendingTopic[] {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });

  // Telugu entertainment trending topics (rotate based on day)
  const trendingTopics = [
    { title: 'టాలీవుడ్ బాక్సాఫీస్ అప్‌డేట్స్', category: 'entertainment' },
    { title: 'IPL 2025 లేటెస్ట్ న్యూస్', category: 'sports' },
    { title: 'హైదరాబాద్ లోకల్ న్యూస్', category: 'politics' },
    { title: 'సినిమా రివ్యూలు', category: 'entertainment' },
    { title: 'క్రికెట్ స్కోర్ అప్‌డేట్స్', category: 'sports' },
    { title: 'సెలబ్రిటీ గాసిప్స్', category: 'gossip' },
    { title: 'OTT రిలీజులు', category: 'entertainment' },
    { title: 'టెక్ న్యూస్ తెలుగులో', category: 'trending' },
    { title: 'వైరల్ వీడియోస్', category: 'trending' },
    { title: 'ఆరోగ్య చిట్కాలు', category: 'trending' },
  ];

  // Rotate based on day to show variety
  const dayIndex = today.getDay();
  const rotatedTopics = [
    ...trendingTopics.slice(dayIndex),
    ...trendingTopics.slice(0, dayIndex),
  ];

  return rotatedTopics.slice(0, 8).map((topic, index) => ({
    title: topic.title,
    traffic: `${(10 - index) * 1000}+`,
    url: '',
    source: 'fallback',
  }));
}

/**
 * Fetch trending from Twitter/X (if API key available)
 */
export async function fetchTwitterTrends(): Promise<TrendingTopic[]> {
  // Twitter API requires authentication - placeholder for future
  return [];
}

/**
 * Convert trending topic to post draft format
 * Note: This creates a basic draft. For AI-generated content, use "Import from News Sources"
 */
export function trendToPostDraft(trend: TrendingTopic) {
  const slug = slugify(trend.title, {
    lower: true,
    strict: true,
    locale: 'en',
  });

  const timestamp = Date.now().toString(36);

  // Generate a more detailed template
  const body = `🔥 ${trend.title}

ఈ టాపిక్ ప్రస్తుతం సోషల్ మీడియాలో ట్రెండింగ్‌లో ఉంది! ${trend.traffic} కంటే ఎక్కువ మంది ఈ విషయం గురించి చర్చిస్తున్నారు.

**ట్రెండింగ్ వివరాలు:**

ఈ వార్త భారతదేశంలో, ముఖ్యంగా తెలుగు రాష్ట్రాల్లో పెద్ద ఎత్తున వైరల్ అవుతోంది. సోషల్ మీడియా ప్లాట్‌ఫారమ్‌లలో అభిమానులు మరియు యూజర్లు ఈ టాపిక్‌పై తమ అభిప్రాయాలను షేర్ చేస్తున్నారు.

**సోషల్ మీడియా రియాక్షన్లు:**

ట్విట్టర్, ఫేస్‌బుక్, ఇన్‌స్టాగ్రామ్‌లో ఈ వార్త టాప్ ట్రెండ్‌గా ఉంది. వేలాది మంది యూజర్లు ఈ విషయంపై చర్చిస్తున్నారు.

**ముందుకు:**

ఈ విషయంలో మరిన్ని అప్‌డేట్లు వచ్చినప్పుడు మేము మీకు తెలియజేస్తాము.

📣 ఈ వార్తపై మీ అభిప్రాయం ఏమిటి? కామెంట్స్‌లో మీ థాట్స్ షేర్ చేయండి!`;

  return {
    title: trend.title,
    slug: `trending-${slug}-${timestamp}`,
    telugu_body: body,
    category: 'trending' as const,
    status: 'draft' as const,
    image_urls: [] as string[],
  };
}

/**
 * Generate a unique slug for posts
 */
export function generateSlug(title: string): string {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    locale: 'en',
  });

  return `${baseSlug}-${Date.now().toString(36)}`;
}
