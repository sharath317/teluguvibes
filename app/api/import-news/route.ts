import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchNewsDataIO,
  fetchGNews,
  articleToPostDraft
} from '@/lib/news-sources';
import { getAvailableAIServices } from '@/lib/ai-content-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Check available sources and AI services
export async function GET() {
  const sources = {
    newsdata: {
      configured: !!process.env.NEWSDATA_API_KEY,
      description: 'Telugu news from NewsData.io',
      signupUrl: 'https://newsdata.io/',
      freeLimit: '200 requests/day',
    },
    gnews: {
      configured: !!process.env.GNEWS_API_KEY,
      description: 'General news from GNews',
      signupUrl: 'https://gnews.io/',
      freeLimit: '100 requests/day',
    },
    unsplash: {
      configured: !!process.env.UNSPLASH_ACCESS_KEY,
      description: 'High-quality images from Unsplash',
      signupUrl: 'https://unsplash.com/developers',
      freeLimit: '50 requests/hour',
    },
    pexels: {
      configured: !!process.env.PEXELS_API_KEY,
      description: 'Stock photos from Pexels',
      signupUrl: 'https://www.pexels.com/api/',
      freeLimit: '200 requests/hour',
    },
    tmdb: {
      configured: !!process.env.TMDB_API_KEY,
      description: 'Movie posters from TMDB',
      signupUrl: 'https://www.themoviedb.org/signup',
      freeLimit: '1000 requests/day',
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      description: 'AI content generation (Google Gemini)',
      signupUrl: 'https://aistudio.google.com/app/apikey',
      freeLimit: '60 requests/minute',
    },
    groq: {
      configured: !!process.env.GROQ_API_KEY,
      description: 'AI content generation (Groq)',
      signupUrl: 'https://console.groq.com/keys',
      freeLimit: '30 requests/minute',
    },
  };

  const aiServices = getAvailableAIServices();

  return NextResponse.json({ sources, aiServices });
}

// POST: Import news from all configured sources
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const source = body.source || 'all'; // 'newsdata', 'gnews', or 'all'
  const useAI = body.useAI !== false; // Default to true
  const limit = Math.min(body.limit || 5, 10); // Max 10 articles per source

  console.log(`\n📰 [ImportNews] Source: ${source}, UseAI: ${useAI}, Limit: ${limit}`);

  const results = {
    imported: 0,
    sources: [] as { name: string; count: number; error?: string }[],
    aiService: getAvailableAIServices()[0],
    posts: [] as any[],
  };

  // Fetch from NewsData.io (Telugu news)
  if (source === 'all' || source === 'newsdata') {
    const newsData = await fetchNewsDataIO();
    if (newsData.error) {
      results.sources.push({ name: 'newsdata.io', count: 0, error: newsData.error });
    } else if (newsData.articles.length > 0) {
      console.log(`   📥 Processing ${Math.min(newsData.articles.length, limit)} articles from NewsData.io...`);

      // Process articles one by one (AI takes time)
      const drafts = [];
      for (const article of newsData.articles.slice(0, limit)) {
        try {
          const draft = await articleToPostDraft(article, useAI);
          drafts.push(draft);
        } catch (error) {
          console.error(`   ❌ Failed to process article:`, error);
        }
      }

      if (drafts.length > 0) {
        const { data, error } = await supabase
          .from('posts')
          .insert(drafts)
          .select();

        if (error) {
          results.sources.push({ name: 'newsdata.io', count: 0, error: error.message });
        } else {
          results.sources.push({ name: 'newsdata.io', count: data?.length || 0 });
          results.imported += data?.length || 0;
          results.posts.push(...(data || []));
        }
      }
    } else {
      results.sources.push({ name: 'newsdata.io', count: 0, error: 'No articles found' });
    }
  }

  // Fetch from GNews (English/Hindi news)
  if (source === 'all' || source === 'gnews') {
    const gNews = await fetchGNews();
    if (gNews.error) {
      results.sources.push({ name: 'gnews.io', count: 0, error: gNews.error });
    } else if (gNews.articles.length > 0) {
      console.log(`   📥 Processing ${Math.min(gNews.articles.length, limit)} articles from GNews...`);

      const drafts = [];
      for (const article of gNews.articles.slice(0, limit)) {
        try {
          const draft = await articleToPostDraft(article, useAI);
          drafts.push(draft);
        } catch (error) {
          console.error(`   ❌ Failed to process article:`, error);
        }
      }

      if (drafts.length > 0) {
        const { data, error } = await supabase
          .from('posts')
          .insert(drafts)
          .select();

        if (error) {
          results.sources.push({ name: 'gnews.io', count: 0, error: error.message });
        } else {
          results.sources.push({ name: 'gnews.io', count: data?.length || 0 });
          results.imported += data?.length || 0;
          results.posts.push(...(data || []));
        }
      }
    } else {
      results.sources.push({ name: 'gnews.io', count: 0, error: 'No articles found' });
    }
  }

  console.log(`   ✅ Imported ${results.imported} articles total`);

  return NextResponse.json({
    success: true,
    message: `Imported ${results.imported} articles as drafts`,
    ...results,
  });
}
