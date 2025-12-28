import slugify from 'slugify';
import type { Category } from '@/types/database';
import { rewriteTitle } from './content-rewriter';
import { fetchRelevantImage } from './image-fetcher';
import { generateArticleContent } from './ai-content-generator';

interface NewsArticle {
  title: string;
  description: string;
  content?: string;
  image_url?: string;
  source_url?: string;
  source_name?: string;
  category: Category;
  pubDate?: string;
}

interface FetchResult {
  articles: NewsArticle[];
  source: string;
  error?: string;
}

/**
 * Fetch Telugu news from NewsData.io
 * Free tier: 200 requests/day
 */
export async function fetchNewsDataIO(): Promise<FetchResult> {
  const apiKey = process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    return { articles: [], source: 'newsdata.io', error: 'NEWSDATA_API_KEY not configured' };
  }

  try {
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&country=in&language=te`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return { articles: [], source: 'newsdata.io', error: `API error: ${response.status}` };
    }

    const data = await response.json();

    if (!data.results) {
      return { articles: [], source: 'newsdata.io', error: 'No results' };
    }

    const articles: NewsArticle[] = data.results.map((item: any) => ({
      title: item.title || 'Untitled',
      description: item.description || item.content?.substring(0, 200) || '',
      content: item.content || item.description || '',
      image_url: null, // Ignore source images - may have watermarks
      source_url: item.link,
      source_name: item.source_id,
      category: mapCategory(item.category?.[0]),
      pubDate: item.pubDate,
    }));

    return { articles, source: 'newsdata.io' };
  } catch (error) {
    console.error('NewsData.io error:', error);
    return { articles: [], source: 'newsdata.io', error: String(error) };
  }
}

/**
 * Fetch news from GNews API
 * Free tier: 100 requests/day
 */
export async function fetchGNews(): Promise<FetchResult> {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return { articles: [], source: 'gnews.io', error: 'GNEWS_API_KEY not configured' };
  }

  try {
    const categories = ['entertainment', 'sports', 'general'];
    const allArticles: NewsArticle[] = [];

    for (const cat of categories) {
      const response = await fetch(
        `https://gnews.io/api/v4/top-headlines?category=${cat}&country=in&lang=en&apikey=${apiKey}&max=5`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.articles) {
          allArticles.push(...data.articles.map((item: any) => ({
            title: item.title,
            description: item.description,
            content: item.content,
            image_url: null, // Ignore source images
            source_url: item.url,
            source_name: item.source?.name,
            category: mapCategory(cat),
            pubDate: item.publishedAt,
          })));
        }
      }
    }

    return { articles: allArticles, source: 'gnews.io' };
  } catch (error) {
    console.error('GNews error:', error);
    return { articles: [], source: 'gnews.io', error: String(error) };
  }
}

/**
 * Map external category to our categories
 */
function mapCategory(externalCategory?: string): Category {
  const categoryMap: Record<string, Category> = {
    'entertainment': 'entertainment',
    'sports': 'sports',
    'politics': 'politics',
    'top': 'trending',
    'business': 'trending',
    'technology': 'trending',
    'science': 'trending',
    'health': 'trending',
    'general': 'trending',
    'nation': 'politics',
    'world': 'trending',
  };

  return categoryMap[externalCategory?.toLowerCase() || ''] || 'trending';
}

/**
 * Generate unique slug for article
 */
function generateSlug(title: string): string {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    locale: 'en',
  });

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${baseSlug || 'article'}-${timestamp}-${random}`.substring(0, 100);
}

/**
 * Convert news article to post draft with AI-generated content and relevant image
 */
export async function articleToPostDraft(article: NewsArticle, useAI: boolean = true) {
  const originalContent = article.content || article.description || '';

  let finalTitle: string;
  let finalBody: string;

  if (useAI) {
    // Use AI to generate high-quality content
    const generated = await generateArticleContent(
      article.title,
      originalContent,
      article.category
    );
    finalTitle = generated.title || rewriteTitle(article.title);
    finalBody = generated.body;
  } else {
    // Fallback to simple rewriting
    finalTitle = rewriteTitle(article.title);
    finalBody = originalContent;
  }

  // Fetch relevant, watermark-free image
  const imageResult = await fetchRelevantImage(
    article.title,
    originalContent,
    article.category
  );

  return {
    title: finalTitle,
    slug: generateSlug(finalTitle),
    telugu_body: finalBody,
    category: article.category,
    status: 'draft' as const,
    image_urls: [imageResult.url],
  };
}
