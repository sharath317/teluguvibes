import slugify from 'slugify';

interface ImageSearchResult {
  url: string;
  source: 'unsplash' | 'pexels' | 'picsum';
  query: string;
}

// Sensitive topics that should use abstract/illustration images
const SENSITIVE_KEYWORDS = [
  'rape', 'murder', 'death', 'killed', 'suicide', 'accident', 'crash',
  'violence', 'assault', 'abuse', 'attack', 'terrorist', 'bomb',
  'హత్య', 'మరణం', 'చనిపోయారు', 'ఆత్మహత్య', 'ప్రమాదం', 'దాడి',
];

// Category-based default search terms
const CATEGORY_DEFAULTS: Record<string, string[]> = {
  entertainment: ['bollywood cinema', 'indian movie', 'film set', 'celebrity'],
  sports: ['cricket stadium', 'indian sports', 'cricket match', 'stadium crowd'],
  politics: ['india parliament', 'government building', 'political meeting'],
  gossip: ['celebrity fashion', 'red carpet', 'glamour'],
  trending: ['social media', 'viral', 'technology'],
};

// Famous personalities and their search terms
const CELEBRITY_KEYWORDS: Record<string, string> = {
  // Cricket
  'dhoni': 'MS Dhoni cricket',
  'kohli': 'Virat Kohli cricket',
  'rohit': 'Rohit Sharma cricket',
  'sachin': 'Sachin Tendulkar',
  'bumrah': 'Jasprit Bumrah bowling',

  // Tollywood
  'prabhas': 'Prabhas actor',
  'chiranjeevi': 'Chiranjeevi actor',
  'mahesh babu': 'Mahesh Babu actor',
  'allu arjun': 'Allu Arjun actor',
  'pawan kalyan': 'Pawan Kalyan',
  'ntr': 'NTR actor',
  'ram charan': 'Ram Charan actor',
  'vijay': 'Vijay actor',
  'rajinikanth': 'Rajinikanth',
  'kamal haasan': 'Kamal Haasan',

  // Bollywood
  'shahrukh': 'Shah Rukh Khan',
  'salman': 'Salman Khan actor',
  'aamir': 'Aamir Khan actor',
  'deepika': 'Deepika Padukone',
  'priyanka': 'Priyanka Chopra',
  'alia': 'Alia Bhatt actress',
  'ranveer': 'Ranveer Singh actor',

  // Politicians
  'modi': 'Narendra Modi PM India',
  'jagan': 'YS Jagan Mohan Reddy',
  'kcr': 'KCR Telangana',
  'chandrababu': 'Chandrababu Naidu',
  'rahul gandhi': 'Rahul Gandhi politician',
};

// Topic keywords and their image search terms
const TOPIC_KEYWORDS: Record<string, string> = {
  // Health
  'teeth': 'dental health smile',
  'dental': 'dentist teeth care',
  'health': 'healthcare medical',
  'hospital': 'hospital medical',
  'medicine': 'medicine pills pharmacy',
  'covid': 'coronavirus mask healthcare',
  'doctor': 'doctor medical professional',

  // Tech
  'iphone': 'iPhone smartphone',
  'android': 'android smartphone',
  'laptop': 'laptop computer technology',
  'ai': 'artificial intelligence technology',
  'tech': 'technology innovation',

  // Food
  'food': 'indian food cuisine',
  'recipe': 'cooking indian recipe',
  'restaurant': 'restaurant dining',

  // Nature
  'rain': 'rain monsoon weather',
  'weather': 'weather forecast sky',
  'flood': 'flood water disaster',
  'earthquake': 'earthquake disaster',

  // Finance
  'gold': 'gold jewelry price',
  'stock': 'stock market trading',
  'rupee': 'indian rupee currency',
  'bank': 'banking finance',

  // Education
  'exam': 'students exam education',
  'school': 'school education classroom',
  'university': 'university campus education',
  'jobs': 'job interview career',

  // Entertainment
  'movie': 'cinema film bollywood',
  'song': 'music concert singer',
  'wedding': 'indian wedding celebration',
  'festival': 'indian festival celebration',
  'diwali': 'diwali festival lights',

  // Sports
  'ipl': 'IPL cricket stadium',
  'cricket': 'cricket match stadium',
  'football': 'football soccer match',
  'olympics': 'olympics sports athlete',
};

/**
 * Extract keywords from title and content
 */
export function extractKeywords(title: string, content?: string): string[] {
  const text = `${title} ${content || ''}`.toLowerCase();
  const keywords: string[] = [];

  // Check for celebrities first
  for (const [name, searchTerm] of Object.entries(CELEBRITY_KEYWORDS)) {
    if (text.includes(name.toLowerCase())) {
      keywords.push(searchTerm);
    }
  }

  // Check for topic keywords
  for (const [keyword, searchTerm] of Object.entries(TOPIC_KEYWORDS)) {
    if (text.includes(keyword.toLowerCase())) {
      keywords.push(searchTerm);
    }
  }

  return keywords;
}

/**
 * Check if content is sensitive
 */
export function isSensitiveContent(title: string, content?: string): boolean {
  const text = `${title} ${content || ''}`.toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * Get best search query for image
 */
export function getImageSearchQuery(
  title: string,
  content: string | undefined,
  category: string
): { query: string; type: 'specific' | 'category' | 'abstract' } {
  // Check for sensitive content first
  if (isSensitiveContent(title, content)) {
    return {
      query: 'abstract pattern gradient',
      type: 'abstract'
    };
  }

  // Extract keywords from title/content
  const keywords = extractKeywords(title, content);
  if (keywords.length > 0) {
    return {
      query: keywords[0], // Use the first matched keyword
      type: 'specific'
    };
  }

  // Fall back to category defaults
  const categoryDefaults = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.trending;
  const randomDefault = categoryDefaults[Math.floor(Math.random() * categoryDefaults.length)];

  return {
    query: randomDefault,
    type: 'category'
  };
}

/**
 * Fetch image from Unsplash with smart query
 */
export async function fetchSmartUnsplashImage(query: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=5`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }
    );

    if (!response.ok) {
      console.error('Unsplash API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      // Pick a random image from top 5 results
      const randomIndex = Math.floor(Math.random() * Math.min(5, data.results.length));
      return data.results[randomIndex]?.urls?.regular || data.results[0]?.urls?.regular;
    }
    return null;
  } catch (error) {
    console.error('Unsplash fetch error:', error);
    return null;
  }
}

/**
 * Fetch image from Pexels with smart query
 */
export async function fetchSmartPexelsImage(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      {
        headers: { Authorization: apiKey },
      }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(5, data.photos.length));
      return data.photos[randomIndex]?.src?.large || data.photos[0]?.src?.large;
    }
    return null;
  } catch (error) {
    console.error('Pexels fetch error:', error);
    return null;
  }
}

/**
 * Get the best relevant image for an article
 */
export async function getRelevantImage(
  title: string,
  content: string | undefined,
  category: string
): Promise<ImageSearchResult> {
  const { query, type } = getImageSearchQuery(title, content, category);

  console.log(`[SmartImage] Title: "${title.substring(0, 50)}..." → Query: "${query}" (${type})`);

  // Try Unsplash first
  const unsplashUrl = await fetchSmartUnsplashImage(query);
  if (unsplashUrl) {
    return { url: unsplashUrl, source: 'unsplash', query };
  }

  // Try Pexels
  const pexelsUrl = await fetchSmartPexelsImage(query);
  if (pexelsUrl) {
    return { url: pexelsUrl, source: 'pexels', query };
  }

  // Fallback to picsum with query-based seed
  const seed = slugify(query, { lower: true, strict: true }).substring(0, 20) || 'default';
  return {
    url: `https://picsum.photos/seed/${seed}/800/600`,
    source: 'picsum',
    query
  };
}








