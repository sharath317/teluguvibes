/**
 * TeluguVibes Trend Ingestion System
 * Continuously collects signals from safe, legal sources
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===== TYPES =====

export interface TrendSignal {
  source: 'google_trends' | 'tmdb' | 'youtube' | 'twitter' | 'reddit' | 'internal' | 'news_api';
  keyword: string;
  keyword_te?: string;
  related_keywords?: string[];
  raw_score: number;
  normalized_score: number;
  velocity?: number;
  category?: string;
  entity_type?: string;
  entity_id?: string;
  sentiment?: number;
  raw_data?: any;
  signal_timestamp: Date;
}

export interface TopicCluster {
  cluster_name: string;
  primary_keyword: string;
  keywords: string[];
  category?: string;
  avg_score: number;
  trend_direction: 'rising' | 'falling' | 'stable' | 'spiking';
}

// ===== TMDB TREND INGESTION =====

export async function ingestTMDBTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    console.warn('TMDB API key not configured');
    return signals;
  }

  try {
    // Fetch trending movies (day & week)
    const [dayTrending, weekTrending, upcoming] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&language=te-IN`),
      fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}&language=te-IN`),
      fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=te-IN&region=IN`)
    ]);

    const dayData = await dayTrending.json();
    const weekData = await weekTrending.json();
    const upcomingData = await upcoming.json();

    // Process daily trends (highest urgency)
    for (const movie of (dayData.results || []).slice(0, 10)) {
      // Check if Telugu movie
      if (movie.original_language === 'te' || movie.title !== movie.original_title) {
        signals.push({
          source: 'tmdb',
          keyword: movie.title,
          keyword_te: movie.original_title,
          raw_score: movie.popularity || 0,
          normalized_score: Math.min(100, (movie.popularity / 100) * 100),
          velocity: movie.vote_count > 100 ? 1.5 : 1.0,
          category: 'entertainment',
          entity_type: 'movie',
          entity_id: String(movie.id),
          sentiment: (movie.vote_average - 5) / 5, // Normalize to -1 to 1
          raw_data: movie,
          signal_timestamp: new Date(),
        });
      }
    }

    // Process weekly trends (sustained interest)
    for (const movie of (weekData.results || []).slice(0, 20)) {
      if (movie.original_language === 'te') {
        const existingSignal = signals.find(s => s.entity_id === String(movie.id));
        if (!existingSignal) {
          signals.push({
            source: 'tmdb',
            keyword: movie.title,
            keyword_te: movie.original_title,
            raw_score: movie.popularity || 0,
            normalized_score: Math.min(80, (movie.popularity / 100) * 80),
            category: 'entertainment',
            entity_type: 'movie',
            entity_id: String(movie.id),
            sentiment: (movie.vote_average - 5) / 5,
            raw_data: movie,
            signal_timestamp: new Date(),
          });
        }
      }
    }

    // Process upcoming releases (anticipation)
    for (const movie of (upcomingData.results || []).slice(0, 10)) {
      if (movie.original_language === 'te') {
        signals.push({
          source: 'tmdb',
          keyword: `${movie.title} release`,
          keyword_te: movie.original_title,
          related_keywords: ['upcoming', 'release date', 'trailer'],
          raw_score: movie.popularity || 0,
          normalized_score: Math.min(70, (movie.popularity / 100) * 70),
          category: 'entertainment',
          entity_type: 'movie_upcoming',
          entity_id: String(movie.id),
          raw_data: movie,
          signal_timestamp: new Date(),
        });
      }
    }

    // Fetch trending people (actors/directors)
    const peopleRes = await fetch(
      `https://api.themoviedb.org/3/trending/person/week?api_key=${apiKey}`
    );
    const peopleData = await peopleRes.json();

    for (const person of (peopleData.results || []).slice(0, 15)) {
      // Check for known Telugu celebrities
      const teluguCelebrities = [
        'prabhas', 'allu arjun', 'mahesh babu', 'jr ntr', 'ram charan',
        'samantha', 'rashmika', 'pooja hegde', 'nani', 'vijay deverakonda'
      ];
      
      const isTeluguCeleb = teluguCelebrities.some(
        celeb => person.name.toLowerCase().includes(celeb)
      );

      if (isTeluguCeleb) {
        signals.push({
          source: 'tmdb',
          keyword: person.name,
          raw_score: person.popularity || 0,
          normalized_score: Math.min(100, (person.popularity / 50) * 100),
          category: 'entertainment',
          entity_type: person.known_for_department === 'Directing' ? 'director' : 'actor',
          entity_id: String(person.id),
          raw_data: person,
          signal_timestamp: new Date(),
        });
      }
    }

    console.log(`[TMDB] Ingested ${signals.length} trend signals`);
  } catch (error) {
    console.error('[TMDB] Ingestion error:', error);
  }

  return signals;
}

// ===== YOUTUBE TREND INGESTION =====

export async function ingestYouTubeTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('YouTube API key not configured');
    return signals;
  }

  try {
    // Search for trending Telugu movie trailers
    const searchTerms = [
      'Telugu movie trailer 2024',
      'Telugu movie teaser',
      'Telugu song trending',
      'Tollywood news today'
    ];

    for (const term of searchTerms) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&q=${encodeURIComponent(term)}&type=video&` +
        `order=viewCount&publishedAfter=${getDateDaysAgo(7)}&` +
        `maxResults=10&key=${apiKey}`
      );

      const data = await res.json();

      for (const item of (data.items || [])) {
        // Extract movie/celebrity name from title
        const title = item.snippet.title;
        const cleanTitle = extractMainEntity(title);

        if (cleanTitle) {
          signals.push({
            source: 'youtube',
            keyword: cleanTitle,
            related_keywords: extractKeywords(title),
            raw_score: 50, // Default, would need views API
            normalized_score: 50,
            category: 'entertainment',
            entity_type: detectEntityType(title),
            raw_data: {
              videoId: item.id.videoId,
              title: title,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
            },
            signal_timestamp: new Date(),
          });
        }
      }
    }

    console.log(`[YouTube] Ingested ${signals.length} trend signals`);
  } catch (error) {
    console.error('[YouTube] Ingestion error:', error);
  }

  return signals;
}

// ===== INTERNAL ANALYTICS INGESTION =====

export async function ingestInternalTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];

  try {
    // Get top performing content from last 24 hours
    const { data: topContent } = await supabase
      .from('content_performance')
      .select(`
        post_id,
        views,
        engagement_score,
        posts!inner(title, category)
      `)
      .gte('created_at', getDateDaysAgo(1))
      .order('views', { ascending: false })
      .limit(20);

    for (const item of (topContent || [])) {
      const post = (item as any).posts;
      if (post) {
        signals.push({
          source: 'internal',
          keyword: extractMainEntity(post.title),
          raw_score: item.views || 0,
          normalized_score: Math.min(100, (item.views / 1000) * 100),
          velocity: item.engagement_score || 1,
          category: post.category,
          entity_type: 'trending_topic',
          raw_data: { post_id: item.post_id, views: item.views },
          signal_timestamp: new Date(),
        });
      }
    }

    // Get search queries (if implemented)
    const { data: searches } = await supabase
      .from('search_logs')
      .select('query, count')
      .gte('created_at', getDateDaysAgo(1))
      .order('count', { ascending: false })
      .limit(20);

    for (const search of (searches || [])) {
      signals.push({
        source: 'internal',
        keyword: search.query,
        raw_score: search.count,
        normalized_score: Math.min(100, search.count * 10),
        category: 'user_interest',
        entity_type: 'search_query',
        signal_timestamp: new Date(),
      });
    }

    console.log(`[Internal] Ingested ${signals.length} trend signals`);
  } catch (error) {
    console.error('[Internal] Ingestion error:', error);
  }

  return signals;
}

// ===== NEWS API INGESTION =====

export async function ingestNewsTrends(): Promise<TrendSignal[]> {
  const signals: TrendSignal[] = [];
  const apiKey = process.env.GNEWS_API_KEY || process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    console.warn('News API key not configured');
    return signals;
  }

  try {
    const queries = ['Telugu cinema', 'Tollywood', 'Hyderabad entertainment'];
    
    for (const query of queries) {
      const res = await fetch(
        `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=in&max=10&apikey=${apiKey}`
      );
      
      const data = await res.json();

      for (const article of (data.articles || [])) {
        const mainEntity = extractMainEntity(article.title);
        
        if (mainEntity && mainEntity.length > 3) {
          signals.push({
            source: 'news_api',
            keyword: mainEntity,
            related_keywords: extractKeywords(article.title),
            raw_score: 60,
            normalized_score: 60,
            category: detectCategory(article.title),
            entity_type: detectEntityType(article.title),
            raw_data: {
              title: article.title,
              source: article.source.name,
              url: article.url,
              publishedAt: article.publishedAt,
            },
            signal_timestamp: new Date(article.publishedAt),
          });
        }
      }
    }

    console.log(`[News] Ingested ${signals.length} trend signals`);
  } catch (error) {
    console.error('[News] Ingestion error:', error);
  }

  return signals;
}

// ===== STORE SIGNALS =====

export async function storeTrendSignals(signals: TrendSignal[]): Promise<number> {
  if (signals.length === 0) return 0;

  const { data, error } = await supabase
    .from('trend_signals')
    .insert(
      signals.map(s => ({
        source: s.source,
        keyword: s.keyword,
        keyword_te: s.keyword_te,
        related_keywords: s.related_keywords || [],
        raw_score: s.raw_score,
        normalized_score: s.normalized_score,
        velocity: s.velocity || 1,
        category: s.category,
        entity_type: s.entity_type,
        entity_id: s.entity_id,
        sentiment: s.sentiment,
        raw_data: s.raw_data,
        signal_timestamp: s.signal_timestamp,
      }))
    )
    .select();

  if (error) {
    console.error('Error storing signals:', error);
    return 0;
  }

  return data?.length || 0;
}

// ===== CLUSTER SIGNALS =====

export async function clusterTrendSignals(): Promise<TopicCluster[]> {
  const clusters: TopicCluster[] = [];

  // Get recent signals
  const { data: signals } = await supabase
    .from('trend_signals')
    .select('*')
    .gte('signal_timestamp', getDateDaysAgo(3))
    .order('normalized_score', { ascending: false });

  if (!signals || signals.length === 0) return clusters;

  // Group by similar keywords
  const keywordGroups = new Map<string, typeof signals>();

  for (const signal of signals) {
    const normalizedKey = normalizeKeyword(signal.keyword);
    const existing = keywordGroups.get(normalizedKey);
    
    if (existing) {
      existing.push(signal);
    } else {
      keywordGroups.set(normalizedKey, [signal]);
    }
  }

  // Create clusters
  for (const [key, groupSignals] of keywordGroups) {
    if (groupSignals.length < 1) continue;

    const avgScore = groupSignals.reduce((sum, s) => sum + s.normalized_score, 0) / groupSignals.length;
    const allKeywords = [...new Set(groupSignals.flatMap(s => [s.keyword, ...(s.related_keywords || [])]))];

    // Determine trend direction
    const recentSignals = groupSignals.filter(s => 
      new Date(s.signal_timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const olderSignals = groupSignals.filter(s => 
      new Date(s.signal_timestamp) <= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    let direction: 'rising' | 'falling' | 'stable' | 'spiking' = 'stable';
    if (recentSignals.length > olderSignals.length * 2) {
      direction = 'spiking';
    } else if (recentSignals.length > olderSignals.length) {
      direction = 'rising';
    } else if (recentSignals.length < olderSignals.length) {
      direction = 'falling';
    }

    const cluster: TopicCluster = {
      cluster_name: key,
      primary_keyword: groupSignals[0].keyword,
      keywords: allKeywords,
      category: groupSignals[0].category,
      avg_score: avgScore,
      trend_direction: direction,
    };

    clusters.push(cluster);

    // Store/update in database
    await supabase
      .from('topic_clusters')
      .upsert({
        cluster_name: cluster.cluster_name,
        primary_keyword: cluster.primary_keyword,
        keywords: cluster.keywords,
        signal_ids: groupSignals.map(s => s.id),
        total_signals: groupSignals.length,
        avg_score: cluster.avg_score,
        trend_direction: cluster.trend_direction,
        category: cluster.category,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'cluster_name'
      });
  }

  console.log(`[Clustering] Created ${clusters.length} topic clusters`);
  return clusters;
}

// ===== MASTER INGESTION =====

export async function runFullIngestion(): Promise<{
  tmdb: number;
  youtube: number;
  internal: number;
  news: number;
  clusters: number;
}> {
  console.log('[Ingestion] Starting full trend ingestion...');

  // Collect from all sources in parallel
  const [tmdbSignals, youtubeSignals, internalSignals, newsSignals] = await Promise.all([
    ingestTMDBTrends(),
    ingestYouTubeTrends(),
    ingestInternalTrends(),
    ingestNewsTrends(),
  ]);

  // Store all signals
  const allSignals = [...tmdbSignals, ...youtubeSignals, ...internalSignals, ...newsSignals];
  await storeTrendSignals(allSignals);

  // Cluster signals
  const clusters = await clusterTrendSignals();

  const result = {
    tmdb: tmdbSignals.length,
    youtube: youtubeSignals.length,
    internal: internalSignals.length,
    news: newsSignals.length,
    clusters: clusters.length,
  };

  console.log('[Ingestion] Complete:', result);
  return result;
}

// ===== HELPER FUNCTIONS =====

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function extractMainEntity(title: string): string {
  // Remove common noise words
  const noiseWords = [
    'official', 'trailer', 'teaser', 'song', 'video', 'full', 'hd',
    'new', 'latest', 'update', 'news', '2024', '2025'
  ];
  
  let clean = title.toLowerCase();
  for (const word of noiseWords) {
    clean = clean.replace(new RegExp(word, 'gi'), '');
  }
  
  // Extract first meaningful phrase
  const parts = clean.split(/[-|:]/).map(p => p.trim()).filter(p => p.length > 2);
  return parts[0] || title.slice(0, 50);
}

function extractKeywords(title: string): string[] {
  const words = title.toLowerCase().split(/\s+/);
  return words.filter(w => w.length > 3 && !['the', 'and', 'for', 'with'].includes(w));
}

function detectEntityType(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('trailer') || lower.includes('teaser')) return 'movie_promo';
  if (lower.includes('song') || lower.includes('lyrical')) return 'music';
  if (lower.includes('interview')) return 'interview';
  if (lower.includes('review')) return 'review';
  return 'general';
}

function detectCategory(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('movie') || lower.includes('film') || lower.includes('cinema')) return 'entertainment';
  if (lower.includes('politics') || lower.includes('election')) return 'politics';
  if (lower.includes('cricket') || lower.includes('ipl')) return 'sports';
  return 'entertainment';
}

function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

