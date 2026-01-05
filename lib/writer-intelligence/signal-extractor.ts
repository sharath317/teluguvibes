/**
 * WRITER STYLE SIGNAL EXTRACTOR
 * 
 * Extracts structural patterns from Telugu news sites WITHOUT reading content.
 * Uses only publicly available, legal signals:
 * - RSS feeds
 * - Sitemap XML
 * - HTML tag structure (no innerText)
 * - Page metadata (publish time, category, author name, section)
 * - URL patterns
 * 
 * ⚠️ STRICTLY FORBIDDEN:
 * - Reading article body text
 * - Tokenizing words/sentences
 * - Storing phrases or headlines
 * - Scraping protected pages
 */

// ============================================================
// TYPES
// ============================================================

export interface WriterStyleSignals {
  siteId: string;
  siteDomain: string;
  sectionType: string;
  
  // Structure metrics (derived from DOM tags)
  avgArticleLengthRange: [number, number];  // min/max paragraph count
  paragraphCountAvg: number;                // average <p> tags per article
  punctuationDensityEstimate: number;       // ratio of punctuation chars to total
  headlineWordCountRange: [number, number]; // estimated from URL/title tag length
  introBlockSizeRatio: number;              // first paragraph size vs article
  midSectionDensity: number;                // paragraph spacing in middle
  closingBlockPattern: 'short' | 'medium' | 'long' | 'cta';
  
  // Language mixing (from meta tags, not content)
  englishMixRatioEstimate: number;          // from meta keywords, URL structure
  
  // Layout patterns
  glamourBlockPosition: 'top' | 'middle' | 'bottom' | 'none';
  imageToTextRatio: number;                 // img tags vs p tags
  
  // Timing patterns
  publishTimePattern: {
    peakHours: number[];
    peakDays: string[];
    avgUpdatesPerDay: number;
  };
  
  // Confidence
  sampleSize: number;
  extractedAt: Date;
  confidenceScore: number;
}

export interface RSSFeedItem {
  pubDate: string;
  category?: string;
  link: string;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
}

export interface HTMLStructure {
  paragraphCount: number;
  headingCounts: Record<string, number>;  // h1, h2, h3, etc.
  imageCount: number;
  listCount: number;
  blockquoteCount: number;
  divDepth: number;
  hasCommentSection: boolean;
  hasSocialShare: boolean;
  hasRelatedArticles: boolean;
}

// ============================================================
// SIGNAL DERIVATION METHODS
// ============================================================

/**
 * Derive paragraph count from HTML structure without reading content
 * Uses only <p> tag count
 */
export function deriveParagraphCount(html: string): number {
  const pTagMatches = html.match(/<p[\s>]/gi);
  return pTagMatches?.length || 0;
}

/**
 * Derive punctuation density from HTML meta tags and structured data
 * Does NOT read article body - uses title/description only
 */
export function derivePunctuationDensity(metaContent: string): number {
  if (!metaContent) return 0.5; // default
  
  const punctuationChars = metaContent.match(/[।.!?,;:'""\-–—]/g);
  const totalChars = metaContent.length;
  
  if (totalChars === 0) return 0;
  return (punctuationChars?.length || 0) / totalChars;
}

/**
 * Derive headline word count range from URL structure
 * Analyzes URL slugs to estimate headline lengths
 */
export function deriveHeadlineWordCountFromURL(urls: string[]): [number, number] {
  if (urls.length === 0) return [5, 15];
  
  const wordCounts = urls.map(url => {
    // Extract slug from URL
    const slug = url.split('/').pop()?.replace(/\.html?$/, '') || '';
    // Count hyphenated segments as words
    const words = slug.split(/[-_]/).filter(w => w.length > 0);
    return words.length;
  });
  
  const sorted = wordCounts.sort((a, b) => a - b);
  return [
    sorted[Math.floor(sorted.length * 0.1)] || 5,
    sorted[Math.floor(sorted.length * 0.9)] || 15,
  ];
}

/**
 * Derive intro block ratio from HTML structure
 * Compares first <p> tag position to total structure
 */
export function deriveIntroBlockRatio(html: string): number {
  const firstPIndex = html.search(/<p[\s>]/i);
  const lastPIndex = html.lastIndexOf('</p>');
  
  if (firstPIndex === -1 || lastPIndex === -1) return 0.2;
  
  // Estimate based on position ratio
  const totalArticleSpan = lastPIndex - firstPIndex;
  if (totalArticleSpan <= 0) return 0.2;
  
  // Find closing of first paragraph
  const firstPClose = html.indexOf('</p>', firstPIndex);
  if (firstPClose === -1) return 0.2;
  
  const introSpan = firstPClose - firstPIndex;
  return Math.min(0.5, introSpan / totalArticleSpan);
}

/**
 * Derive English mix ratio from meta keywords and URL structure
 * Does NOT read article content
 */
export function deriveEnglishMixRatio(
  metaKeywords: string,
  url: string
): number {
  const combined = `${metaKeywords} ${url}`;
  
  // Count English words (A-Za-z sequences)
  const englishWords = combined.match(/[A-Za-z]{3,}/g) || [];
  // Count Telugu characters
  const teluguChars = combined.match(/[\u0C00-\u0C7F]/g) || [];
  
  const total = englishWords.length + teluguChars.length;
  if (total === 0) return 0.3;
  
  return englishWords.length / total;
}

/**
 * Derive glamour block position from HTML structure
 * Looks for image tags with specific class patterns or positions
 */
export function deriveGlamourBlockPosition(html: string): 'top' | 'middle' | 'bottom' | 'none' {
  // Look for common glamour image patterns without reading content
  const glamourPatterns = [
    /class="[^"]*(?:featured|hero|main-image|gallery)[^"]*"/i,
    /class="[^"]*(?:celebrity|actress|star|glamour)[^"]*"/i,
    /<figure[^>]*>/i,
  ];
  
  let firstMatch = -1;
  for (const pattern of glamourPatterns) {
    const match = html.search(pattern);
    if (match !== -1 && (firstMatch === -1 || match < firstMatch)) {
      firstMatch = match;
    }
  }
  
  if (firstMatch === -1) return 'none';
  
  const articleStart = html.search(/<article|<main|class="content"/i);
  const articleEnd = html.search(/<\/article>|<\/main>/i);
  
  if (articleStart === -1) return 'top';
  
  const relativePosition = (firstMatch - articleStart) / (articleEnd - articleStart || 1);
  
  if (relativePosition < 0.2) return 'top';
  if (relativePosition > 0.7) return 'bottom';
  return 'middle';
}

/**
 * Derive closing block pattern from DOM structure
 * Analyzes last few <p> tags' structural patterns
 */
export function deriveClosingBlockPattern(html: string): 'short' | 'medium' | 'long' | 'cta' {
  // Check for CTA patterns
  const ctaPatterns = [
    /class="[^"]*(?:subscribe|newsletter|follow|cta|share)[^"]*"/i,
    /<button[^>]*>.*(?:subscribe|follow|share)/i,
  ];
  
  const htmlEnd = html.slice(-5000); // Last 5000 chars
  
  for (const pattern of ctaPatterns) {
    if (pattern.test(htmlEnd)) {
      return 'cta';
    }
  }
  
  // Count <p> tags in last section
  const lastParagraphs = htmlEnd.match(/<p[\s>]/gi);
  const count = lastParagraphs?.length || 0;
  
  if (count <= 1) return 'short';
  if (count <= 3) return 'medium';
  return 'long';
}

/**
 * Derive publish time patterns from RSS/sitemap dates
 */
export function derivePublishTimePattern(dates: Date[]): {
  peakHours: number[];
  peakDays: string[];
  avgUpdatesPerDay: number;
} {
  if (dates.length === 0) {
    return {
      peakHours: [9, 12, 18],
      peakDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      avgUpdatesPerDay: 10,
    };
  }
  
  // Count by hour
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (const date of dates) {
    const hour = date.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    
    const day = dayNames[date.getDay()];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  
  // Sort by count
  const peakHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([h]) => parseInt(h));
  
  const peakDays = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([d]) => d);
  
  // Calculate average updates per day
  const uniqueDays = new Set(dates.map(d => d.toDateString())).size;
  const avgUpdatesPerDay = uniqueDays > 0 ? dates.length / uniqueDays : 10;
  
  return {
    peakHours,
    peakDays,
    avgUpdatesPerDay,
  };
}

/**
 * Derive image to text ratio from HTML structure
 */
export function deriveImageToTextRatio(html: string): number {
  const imgCount = (html.match(/<img[\s>]/gi) || []).length;
  const pCount = (html.match(/<p[\s>]/gi) || []).length;
  
  if (pCount === 0) return 0;
  return imgCount / pCount;
}

// ============================================================
// MAIN EXTRACTION FUNCTION
// ============================================================

/**
 * Extract writer style signals from a site using ONLY legal methods
 */
export async function extractWriterStyleSignals(
  siteDomain: string,
  options: {
    rssUrl?: string;
    sitemapUrl?: string;
    sampleUrls?: string[];
    sectionType?: string;
  }
): Promise<WriterStyleSignals> {
  const signals: Partial<WriterStyleSignals> = {
    siteId: siteDomain.replace(/\./g, '_'),
    siteDomain,
    sectionType: options.sectionType || 'general',
    extractedAt: new Date(),
    sampleSize: 0,
    confidenceScore: 0,
  };
  
  const dates: Date[] = [];
  const urls: string[] = options.sampleUrls || [];
  const htmlSamples: string[] = [];
  
  // 1. Fetch RSS feed if available
  if (options.rssUrl) {
    try {
      const rssData = await fetchRSSMetadata(options.rssUrl);
      dates.push(...rssData.dates);
      urls.push(...rssData.urls);
      signals.sampleSize = (signals.sampleSize || 0) + rssData.urls.length;
    } catch (e) {
      console.log(`RSS fetch failed for ${siteDomain}:`, e);
    }
  }
  
  // 2. Fetch sitemap if available
  if (options.sitemapUrl) {
    try {
      const sitemapData = await fetchSitemapMetadata(options.sitemapUrl);
      dates.push(...sitemapData.dates);
      urls.push(...sitemapData.urls);
      signals.sampleSize = (signals.sampleSize || 0) + sitemapData.urls.length;
    } catch (e) {
      console.log(`Sitemap fetch failed for ${siteDomain}:`, e);
    }
  }
  
  // 3. Derive signals from collected data
  signals.publishTimePattern = derivePublishTimePattern(dates);
  signals.headlineWordCountRange = deriveHeadlineWordCountFromURL(urls);
  
  // 4. For HTML structure analysis, we only look at tag structure
  // This would typically be done via a sample of public pages
  // For now, use defaults that can be refined with actual data
  signals.avgArticleLengthRange = [8, 20];  // paragraphs
  signals.paragraphCountAvg = 12;
  signals.punctuationDensityEstimate = 0.08;
  signals.introBlockSizeRatio = 0.15;
  signals.midSectionDensity = 0.7;
  signals.closingBlockPattern = 'medium';
  signals.englishMixRatioEstimate = 0.25;
  signals.glamourBlockPosition = 'top';
  signals.imageToTextRatio = 0.3;
  
  // 5. Calculate confidence
  signals.confidenceScore = calculateConfidence(signals);
  
  return signals as WriterStyleSignals;
}

/**
 * Fetch metadata from RSS feed (dates and URLs only)
 */
async function fetchRSSMetadata(rssUrl: string): Promise<{
  dates: Date[];
  urls: string[];
}> {
  // In production, this would fetch and parse RSS XML
  // For now, return empty arrays (to be implemented with actual fetch)
  console.log(`📡 Would fetch RSS from: ${rssUrl}`);
  
  return {
    dates: [],
    urls: [],
  };
}

/**
 * Fetch metadata from sitemap XML (dates and URLs only)
 */
async function fetchSitemapMetadata(sitemapUrl: string): Promise<{
  dates: Date[];
  urls: string[];
}> {
  // In production, this would fetch and parse sitemap XML
  // For now, return empty arrays (to be implemented with actual fetch)
  console.log(`🗺️ Would fetch sitemap from: ${sitemapUrl}`);
  
  return {
    dates: [],
    urls: [],
  };
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(signals: Partial<WriterStyleSignals>): number {
  let confidence = 0.3; // Base
  
  if ((signals.sampleSize || 0) >= 10) confidence += 0.2;
  if ((signals.sampleSize || 0) >= 50) confidence += 0.2;
  if (signals.publishTimePattern?.peakHours?.length) confidence += 0.15;
  if (signals.headlineWordCountRange?.[0]) confidence += 0.15;
  
  return Math.min(1, confidence);
}

// ============================================================
// SITE OBSERVATION MATRIX
// ============================================================

export interface SiteObservation {
  domain: string;
  category: 'news' | 'entertainment' | 'lifestyle' | 'devotional' | 'glamour';
  tier: 'primary' | 'secondary' | 'tertiary';
  rssUrl?: string;
  sitemapUrl?: string;
  signalsToObserve: string[];
  lastObserved?: Date;
  observationStatus: 'pending' | 'active' | 'paused';
}

/**
 * LEGAL OBSERVATION TARGETS
 * These sites' RSS/sitemap are publicly accessible
 */
export const TELUGU_SITE_OBSERVATION_MATRIX: SiteObservation[] = [
  // 🟢 PRIMARY: High-quality, writer-driven news
  {
    domain: 'sakshi.com',
    category: 'news',
    tier: 'primary',
    rssUrl: 'https://www.sakshi.com/rss',
    sitemapUrl: 'https://www.sakshi.com/sitemap.xml',
    signalsToObserve: ['paragraph_rhythm', 'headline_structure', 'timing_patterns'],
    observationStatus: 'pending',
  },
  {
    domain: 'eenadu.net',
    category: 'news',
    tier: 'primary',
    rssUrl: 'https://www.eenadu.net/rss',
    sitemapUrl: 'https://www.eenadu.net/sitemap.xml',
    signalsToObserve: ['long_form_structure', 'traditional_telugu', 'editorial_flow'],
    observationStatus: 'pending',
  },
  {
    domain: 'andhrajyothy.com',
    category: 'news',
    tier: 'primary',
    sitemapUrl: 'https://www.andhrajyothy.com/sitemap.xml',
    signalsToObserve: ['opinion_structure', 'editorial_tone', 'paragraph_flow'],
    observationStatus: 'pending',
  },
  {
    domain: 'greatandhra.com',
    category: 'entertainment',
    tier: 'primary',
    sitemapUrl: 'https://www.greatandhra.com/sitemap.xml',
    signalsToObserve: ['emotional_intro', 'cinema_structure', 'opinion_mix'],
    observationStatus: 'pending',
  },
  
  // 🎬 ENTERTAINMENT / CINEMA (Style-rich)
  {
    domain: '123telugu.com',
    category: 'entertainment',
    tier: 'secondary',
    sitemapUrl: 'https://www.123telugu.com/sitemap.xml',
    signalsToObserve: ['glamour_placement', 'review_structure', 'headline_style'],
    observationStatus: 'pending',
  },
  {
    domain: 'gulte.com',
    category: 'entertainment',
    tier: 'secondary',
    sitemapUrl: 'https://www.gulte.com/sitemap.xml',
    signalsToObserve: ['breaking_pattern', 'quick_update_style', 'image_ratio'],
    observationStatus: 'pending',
  },
  {
    domain: 'idlebrain.com',
    category: 'entertainment',
    tier: 'secondary',
    signalsToObserve: ['review_depth', 'rating_structure', 'nostalgia_patterns'],
    observationStatus: 'pending',
  },
  {
    domain: 'cinejosh.com',
    category: 'entertainment',
    tier: 'secondary',
    sitemapUrl: 'https://www.cinejosh.com/sitemap.xml',
    signalsToObserve: ['gossip_style', 'headline_aggression', 'image_density'],
    observationStatus: 'pending',
  },
  {
    domain: 'tupaki.com',
    category: 'entertainment',
    tier: 'secondary',
    signalsToObserve: ['viral_structure', 'click_patterns', 'short_form'],
    observationStatus: 'pending',
  },
  {
    domain: 'mirchi9.com',
    category: 'entertainment',
    tier: 'secondary',
    signalsToObserve: ['review_style', 'rating_patterns', 'section_layout'],
    observationStatus: 'pending',
  },
  
  // 📰 DIGITAL-FIRST / FAST CONTENT
  {
    domain: 'telugusamacharam.com',
    category: 'news',
    tier: 'tertiary',
    signalsToObserve: ['short_paragraph', 'emotional_hooks', 'speed_layout'],
    observationStatus: 'pending',
  },
  {
    domain: 'telugubulletin.com',
    category: 'news',
    tier: 'tertiary',
    signalsToObserve: ['breaking_speed', 'paragraph_stacking', 'mobile_layout'],
    observationStatus: 'pending',
  },
  
  // 🌸 CULTURE / DEVOTIONAL
  {
    domain: 'bhaktipustakalu.com',
    category: 'devotional',
    tier: 'tertiary',
    signalsToObserve: ['soft_emotional', 'closing_wisdom', 'traditional_flow'],
    observationStatus: 'pending',
  },
  
  // 🔥 GLAMOUR / POP CULTURE
  {
    domain: 'filmibeat.com/telugu',
    category: 'glamour',
    tier: 'secondary',
    signalsToObserve: ['glamour_tolerance', 'image_first', 'caption_density'],
    observationStatus: 'pending',
  },
  {
    domain: 'pinkvilla.com/telugu',
    category: 'glamour',
    tier: 'secondary',
    signalsToObserve: ['lifestyle_mix', 'gallery_structure', 'headline_style'],
    observationStatus: 'pending',
  },
];

/**
 * Get observation targets by category
 */
export function getObservationTargets(category?: string): SiteObservation[] {
  if (!category) return TELUGU_SITE_OBSERVATION_MATRIX;
  return TELUGU_SITE_OBSERVATION_MATRIX.filter(s => s.category === category);
}

/**
 * Get observation targets by tier
 */
export function getObservationTargetsByTier(tier: 'primary' | 'secondary' | 'tertiary'): SiteObservation[] {
  return TELUGU_SITE_OBSERVATION_MATRIX.filter(s => s.tier === tier);
}

export default {
  extractWriterStyleSignals,
  deriveParagraphCount,
  derivePunctuationDensity,
  deriveHeadlineWordCountFromURL,
  deriveIntroBlockRatio,
  deriveEnglishMixRatio,
  deriveGlamourBlockPosition,
  deriveClosingBlockPattern,
  derivePublishTimePattern,
  deriveImageToTextRatio,
  TELUGU_SITE_OBSERVATION_MATRIX,
  getObservationTargets,
  getObservationTargetsByTier,
};






