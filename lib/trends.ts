import slugify from 'slugify';
import type { TrendingTopic } from '@/types/database';
import { generateTeluguContent } from './pipeline/content-generator';
import { getEnhancedImage } from './content/telugu-templates';

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
 * Now includes real Telugu celebrity and movie names for better content generation
 */
function generateFallbackTrends(): TrendingTopic[] {
  const today = new Date();

  // Telugu entertainment trending topics with real names
  const trendingTopics = [
    // Movies
    { title: 'Pushpa 2 The Rule బాక్సాఫీస్ కలెక్షన్లు', category: 'entertainment' },
    { title: 'Jr NTR Devara మూవీ న్యూస్', category: 'entertainment' },
    { title: 'Prabhas Salaar Part 2 అప్‌డేట్', category: 'entertainment' },
    { title: 'Mahesh Babu SSMB29 లేటెస్ట్', category: 'entertainment' },
    { title: 'Ram Charan Game Changer రివ్యూ', category: 'entertainment' },
    { title: 'Allu Arjun పుష్ప సక్సెస్ పార్టీ', category: 'entertainment' },

    // Celebrities
    { title: 'Chiranjeevi Vishwambhara మూవీ షూటింగ్', category: 'entertainment' },
    { title: 'Samantha Ruth Prabhu కొత్త ప్రాజెక్ట్', category: 'entertainment' },
    { title: 'Rashmika Mandanna బాలీవుడ్ న్యూస్', category: 'entertainment' },
    { title: 'Vijay Deverakonda లేటెస్ట్ అప్‌డేట్', category: 'entertainment' },

    // Sports
    { title: 'IPL 2025 SRH టీమ్ న్యూస్', category: 'sports' },
    { title: 'India vs Australia క్రికెట్ మ్యాచ్', category: 'sports' },
    { title: 'Virat Kohli సెంచరీ అప్‌డేట్', category: 'sports' },
    { title: 'Rohit Sharma T20 వరల్డ్ కప్', category: 'sports' },

    // Politics
    { title: 'Telangana సీఎం రేవంత్ రెడ్డి న్యూస్', category: 'politics' },
    { title: 'AP CM Chandrababu Naidu లేటెస్ట్', category: 'politics' },
    { title: 'Pawan Kalyan మంత్రి పదవి న్యూస్', category: 'politics' },

    // Business
    { title: 'Reliance Jio కొత్త ప్లాన్స్', category: 'trending' },
    { title: 'Tata Motors EV లాంచ్', category: 'trending' },
    { title: 'Stock Market BSE NSE అప్‌డేట్', category: 'trending' },

    // Tech
    { title: 'iPhone 16 India ధర', category: 'trending' },
    { title: 'WhatsApp కొత్త ఫీచర్స్', category: 'trending' },
    { title: 'ChatGPT AI న్యూస్', category: 'trending' },

    // Delivery/Business
    { title: 'Swiggy Zomato డెలివరీ న్యూస్', category: 'trending' },
    { title: 'Amazon India సేల్ ఆఫర్స్', category: 'trending' },
  ];

  // Shuffle based on day to show variety
  const dayIndex = today.getDay();
  const hourIndex = today.getHours();
  const shuffleIndex = (dayIndex * 24 + hourIndex) % trendingTopics.length;

  const shuffledTopics = [
    ...trendingTopics.slice(shuffleIndex),
    ...trendingTopics.slice(0, shuffleIndex),
  ];

  return shuffledTopics.slice(0, 25).map((topic, index) => ({
    title: topic.title,
    traffic: `${Math.floor(Math.random() * 50 + 10)}K+`,
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
 * Convert trending topic to post draft format with AI-generated content & images
 * Uses the enhanced Telugu content generator with Wikipedia images
 */
export async function trendToPostDraft(trend: TrendingTopic) {
  const slug = slugify(trend.title, {
    lower: true,
    strict: true,
    locale: 'en',
  });

  const timestamp = Date.now().toString(36);
  const randomId = Math.random().toString(36).substring(2, 7);

  console.log(`   🔄 Generating content for: ${trend.title.slice(0, 40)}...`);

  // Use the enhanced Telugu content generator
  const generatedContent = await generateTeluguContent(trend.title);

  // Get title and body
  const title = generatedContent?.titleTe || trend.title;
  const body = generatedContent?.bodyTe || generateFallbackContent(trend);
  const tags = generatedContent?.tags || [];
  const confidence = generatedContent?.confidence || 0;
  const source = generatedContent?.source || 'fallback';

  // Use the image from content generator or fetch separately
  let imageUrl = generatedContent?.imageUrl || '';
  let imageSource = 'Wikipedia';

  // If no image from generator, try enhanced image search
  if (!imageUrl) {
    try {
      const imageResult = await getEnhancedImage(trend.title);
      if (imageResult && imageResult.url) {
        imageUrl = imageResult.url;
        imageSource = imageResult.source;
      }
    } catch (error) {
      console.error('   ❌ Image fetch failed:', (error as Error).message);
    }
  }

  // Validation logging
  const contentLength = body?.length || 0;
  const hasWikipediaImage = imageUrl?.includes('wikimedia') || imageUrl?.includes('wikipedia');

  console.log(`   📝 Content: ${contentLength} chars (${source})`);
  console.log(`   🖼️ Image: ${imageUrl ? (hasWikipediaImage ? '✅ Wikipedia' : '⚠️ Other') : '❌ None'}`);
  console.log(`   📊 Confidence: ${(confidence * 100).toFixed(0)}%`);

  return {
    title,
    title_te: title,
    slug: `trending-${slug}-${timestamp}-${randomId}`,
    telugu_body: body,
    body_te: body,
    excerpt: body?.slice(0, 150) + '...',
    category: 'trending' as const,
    status: 'draft' as const,
    image_urls: imageUrl ? [imageUrl] : [],
    image_url: imageUrl || null,
    image_source: imageSource,
    image_license: hasWikipediaImage ? 'CC BY-SA' : 'Unknown',
    tags,
  };
}

/**
 * Generate fallback content when AI is unavailable
 */
function generateFallbackContent(trend: TrendingTopic): string {
  return `🔥 ${trend.title}

ఈ టాపిక్ ప్రస్తుతం సోషల్ మీడియాలో ట్రెండింగ్‌లో ఉంది! ${trend.traffic} కంటే ఎక్కువ మంది ఈ విషయం గురించి చర్చిస్తున్నారు.

**ట్రెండింగ్ వివరాలు:**
ఈ వార్త భారతదేశంలో, ముఖ్యంగా తెలుగు రాష్ట్రాల్లో పెద్ద ఎత్తున వైరల్ అవుతోంది.

**సోషల్ మీడియా రియాక్షన్లు:**
ట్విట్టర్, ఫేస్‌బుక్, ఇన్‌స్టాగ్రామ్‌లో ఈ వార్త టాప్ ట్రెండ్‌గా ఉంది.

📣 ఈ వార్తపై మీ అభిప్రాయం ఏమిటి? కామెంట్స్‌లో మీ థాట్స్ షేర్ చేయండి!`;
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
