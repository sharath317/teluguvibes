/**
 * TeluguVibes Trend Ingestion System
 * Collects signals from multiple sources for learning
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

interface TrendSignal {
  source: string;
  keyword: string;
  keyword_te?: string;
  raw_score: number;
  normalized_score?: number;
  category?: string;
  entity_type?: string;
  entity_id?: string;
  sentiment?: number;
  raw_data?: any;
}

// ===== TMDB TRENDS =====

export async function ingestTMDBTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const tmdbKey = process.env.TMDB_API_KEY;

  if (!tmdbKey) return signals;

  try {
    // Trending movies
    const trendingRes = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${tmdbKey}&language=te-IN`
    );
    const trending = await trendingRes.json();

    for (const movie of (trending.results || []).slice(0, 20)) {
      // Check if Telugu
      const isTeluguRelated = movie.original_language === 'te' ||
        movie.overview?.includes('Telugu') ||
        movie.title?.match(/[\u0C00-\u0C7F]/);

      if (isTeluguRelated || movie.popularity > 100) {
        signals.push({
          source: 'tmdb',
          keyword: movie.title,
          keyword_te: movie.original_title !== movie.title ? movie.original_title : undefined,
          raw_score: movie.popularity,
          normalized_score: Math.min(1, movie.popularity / 200),
          category: 'movies',
          entity_type: 'movie',
          entity_id: String(movie.id),
          raw_data: {
            id: movie.id,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
          },
        });
      }
    }

    // Telugu movie releases
    const now = new Date();
    const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));

    const teluguRes = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&with_original_language=te&primary_release_date.gte=${threeMonthsAgo.toISOString().split('T')[0]}&sort_by=popularity.desc`
    );
    const teluguMovies = await teluguRes.json();

    for (const movie of (teluguMovies.results || []).slice(0, 15)) {
      signals.push({
        source: 'tmdb',
        keyword: movie.title,
        raw_score: movie.popularity,
        normalized_score: Math.min(1, movie.popularity / 150),
        category: 'movies',
        entity_type: 'movie',
        entity_id: String(movie.id),
        raw_data: movie,
      });
    }
  } catch (error) {
    console.error('TMDB ingestion error:', error);
  }

  return signals;
}

// ===== YOUTUBE TRENDS =====

export async function ingestYouTubeTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const ytKey = process.env.YOUTUBE_API_KEY;

  if (!ytKey) return signals;

  try {
    // Search for Telugu movie trailers
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=telugu+movie+trailer+2024&maxResults=20&order=viewCount&key=${ytKey}`
    );
    const searchData = await searchRes.json();

    for (const item of (searchData.items || [])) {
      // Extract movie name from title
      const title = item.snippet?.title || '';
      const movieMatch = title.match(/^([^|]+)/);
      const keyword = movieMatch ? movieMatch[1].trim() : title;

      signals.push({
        source: 'youtube',
        keyword,
        raw_score: 50, // Base score, would need stats API for views
        normalized_score: 0.5,
        category: 'trailers',
        entity_type: 'video',
        entity_id: item.id?.videoId,
        raw_data: {
          title,
          channel: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
        },
      });
    }
  } catch (error) {
    console.error('YouTube ingestion error:', error);
  }

  return signals;
}

// ===== NEWS API TRENDS =====

export async function ingestNewsTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];

  // GNews
  const gnewsKey = process.env.GNEWS_API_KEY;
  if (gnewsKey) {
    try {
      const res = await fetch(
        `https://gnews.io/api/v4/search?q=Telugu+cinema+OR+Tollywood&lang=en&country=in&max=20&token=${gnewsKey}`
      );
      const data = await res.json();

      for (const article of (data.articles || [])) {
        // Extract key topic
        const title = article.title || '';

        signals.push({
          source: 'news_api',
          keyword: title.slice(0, 100),
          raw_score: 30,
          normalized_score: 0.3,
          category: 'news',
          sentiment: detectSentiment(title),
          raw_data: {
            title,
            source: article.source?.name,
            publishedAt: article.publishedAt,
            url: article.url,
          },
        });
      }
    } catch (error) {
      console.error('GNews ingestion error:', error);
    }
  }

  return signals;
}

// ===== INTERNAL ANALYTICS =====

export async function ingestInternalTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];

  try {
    // Get top performing posts from last 7 days
    const { data: topPosts } = await supabase
      .from('content_performance')
      .select(`
        post_id,
        views,
        engagement_score,
        posts!inner(title, category, tags)
      `)
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('engagement_score', { ascending: false })
      .limit(20);

    for (const post of (topPosts || [])) {
      const postData = (post as any).posts;
      if (postData) {
        signals.push({
          source: 'internal',
          keyword: postData.title,
          raw_score: post.engagement_score || 0,
          normalized_score: Math.min(1, (post.engagement_score || 0) / 100),
          category: postData.category,
          entity_type: 'post',
          entity_id: post.post_id,
          raw_data: {
            views: post.views,
            tags: postData.tags,
          },
        });
      }
    }

    // Get search terms (if tracked)
    const { data: searches } = await supabase
      .from('interactions')
      .select('metadata')
      .eq('interaction_type', 'search')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const searchCounts = new Map<string, number>();
    for (const s of (searches || [])) {
      const term = (s.metadata as any)?.query?.toLowerCase();
      if (term) {
        searchCounts.set(term, (searchCounts.get(term) || 0) + 1);
      }
    }

    for (const [term, count] of searchCounts) {
      if (count >= 3) {
        signals.push({
          source: 'internal',
          keyword: term,
          raw_score: count * 10,
          normalized_score: Math.min(1, count / 50),
          category: 'search',
          raw_data: { search_count: count },
        });
      }
    }
  } catch (error) {
    console.error('Internal trend ingestion error:', error);
  }

  return signals;
}

// ===== MAIN INGESTION =====

export async function ingestAllTrends(): Promise<{
  total: number;
  bySource: Record<string, number>;
}> {
  console.log('Starting trend ingestion...');

  const [tmdbSignals, ytSignals, newsSignals, internalSignals] = await Promise.all([
    ingestTMDBTrends(),
    ingestYouTubeTrends(),
    ingestNewsTrends(),
    ingestInternalTrends(),
  ]);

  const allSignals = [
    ...tmdbSignals,
    ...ytSignals,
    ...newsSignals,
    ...internalSignals,
  ];

  // Store signals (only use columns that exist in the table)
  const signalsToInsert = allSignals.map(s => ({
    source: s.source,
    keyword: s.keyword,
    normalized_score: s.normalized_score || 0,
    category: s.category,
    entity_type: s.entity_type,
    raw_data: s.raw_data,
  }));

  if (signalsToInsert.length > 0) {
    const { error } = await supabase
      .from('trend_signals')
      .insert(signalsToInsert);

    if (error) {
      console.error('Error storing signals:', error);
    } else {
      console.log(`Stored ${signalsToInsert.length} signals`);
    }
  }

  // Cluster topics
  await clusterTopics(allSignals);

  const bySource: Record<string, number> = {};
  for (const s of allSignals) {
    bySource[s.source] = (bySource[s.source] || 0) + 1;
  }

  console.log(`Ingested ${allSignals.length} signals`);

  return { total: allSignals.length, bySource };
}

// ===== TOPIC CLUSTERING =====

async function clusterTopics(signals: TrendSignal[]): Promise<void> {
  // Group by similar keywords
  const clusters = new Map<string, TrendSignal[]>();

  for (const signal of signals) {
    const normalizedKey = normalizeKeyword(signal.keyword);

    // Find existing cluster
    let foundCluster = false;
    for (const [clusterKey, clusterSignals] of clusters) {
      if (similarity(normalizedKey, clusterKey) > 0.6) {
        clusterSignals.push(signal);
        foundCluster = true;
        break;
      }
    }

    if (!foundCluster) {
      clusters.set(normalizedKey, [signal]);
    }
  }

  // Update cluster table - use insert (not upsert since no unique constraint)
  for (const [clusterName, clusterSignals] of clusters) {
    // Include single-signal clusters too for better tracking
    const avgScore = clusterSignals.reduce((sum, s) => sum + (s.normalized_score || 0), 0) / clusterSignals.length;

    const { error } = await supabase
      .from('topic_clusters')
      .insert({
        cluster_name: clusterName,
        primary_keyword: clusterSignals[0].keyword,
        keywords: [...new Set(clusterSignals.map(s => s.keyword))],
        total_signals: clusterSignals.length,
        avg_score: avgScore,
        saturation_score: 0,
        is_saturated: false,
        category: clusterSignals[0].category,
      });
    
    if (error) {
      console.error('Cluster insert error:', error);
    } else {
      console.log(`Created cluster: ${clusterName} with ${clusterSignals.length} signals`);
    }
  }
}

// ===== HELPERS =====

function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

function similarity(a: string, b: string): number {
  const aWords = new Set(a.split('_'));
  const bWords = new Set(b.split('_'));
  const intersection = [...aWords].filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return intersection / union;
}

function detectSentiment(text: string): number {
  const positive = ['hit', 'blockbuster', 'success', 'amazing', 'superb', 'love'];
  const negative = ['flop', 'fail', 'disaster', 'bad', 'worst', 'controversy'];

  const lowerText = text.toLowerCase();
  let score = 0;

  for (const word of positive) {
    if (lowerText.includes(word)) score += 0.2;
  }
  for (const word of negative) {
    if (lowerText.includes(word)) score -= 0.2;
  }

  return Math.max(-1, Math.min(1, score));
}
