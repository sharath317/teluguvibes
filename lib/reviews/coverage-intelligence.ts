/**
 * COVERAGE INTELLIGENCE MODULE
 * 
 * Advanced analytics for movie review coverage:
 * - Language breakdown (Telugu, Hindi, Tamil, etc.)
 * - Category breakdown (Blockbusters, Classics, Hidden Gems)
 * - Tag distribution (box office, awards, mood)
 * - Quality metrics (missing metadata, weak reviews)
 * - Gap analysis and prioritization
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export type Language = 'Telugu' | 'Hindi' | 'Tamil' | 'Kannada' | 'Malayalam' | 'Other';
export type Category = 'blockbuster' | 'classic' | 'hidden-gem' | 'recent' | 'popular' | 'uncategorized';

export interface LanguageCoverage {
  language: Language;
  total: number;
  with_reviews: number;
  target: number;
  current_percentage: number;
  gap: number;
  priority_movies: string[];  // Top movies needing reviews
}

export interface CategoryCoverage {
  category: Category;
  total: number;
  with_reviews: number;
  current_percentage: number;
}

export interface TagDistribution {
  box_office: Record<string, number>;
  mood: Record<string, number>;
  quality: Record<string, number>;
  audience_fit: Record<string, number>;
}

export interface QualityMetrics {
  missing_metadata: {
    no_director: number;
    no_hero: number;
    no_genres: number;
    no_poster: number;
    total_incomplete: number;
  };
  weak_reviews: {
    low_confidence: number;
    template_only: number;
    needs_upgrade: number;
  };
  duplicate_candidates: {
    by_title: number;
    by_tmdb_id: number;
  };
}

export interface CoverageIntelligence {
  summary: {
    total_movies: number;
    total_reviews: number;
    overall_coverage: number;
    target_coverage: number;
  };
  by_language: Record<Language, LanguageCoverage>;
  by_category: CategoryCoverage[];
  tag_distribution: TagDistribution;
  quality_metrics: QualityMetrics;
  priority_queue: PriorityMovie[];
  last_updated: string;
}

export interface PriorityMovie {
  movie_id: string;
  title: string;
  language: Language;
  priority_score: number;
  priority_reasons: string[];
}

// ============================================================
// LANGUAGE TARGETS
// ============================================================

const LANGUAGE_TARGETS: Record<Language, { targetPercentage: number; description: string }> = {
  Telugu: { targetPercentage: 99, description: 'Complete Telugu coverage is primary goal' },
  Hindi: { targetPercentage: 60, description: 'Only blockbusters and critically acclaimed' },
  Tamil: { targetPercentage: 50, description: 'Pan-India releases and award winners' },
  Kannada: { targetPercentage: 40, description: 'Selected hits and crossover films' },
  Malayalam: { targetPercentage: 40, description: 'Award winners and acclaimed films' },
  Other: { targetPercentage: 20, description: 'Only exceptional films' },
};

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

// ============================================================
// COVERAGE ANALYSIS FUNCTIONS
// ============================================================

/**
 * Get coverage breakdown by language
 */
async function getCoverageByLanguage(): Promise<Record<Language, LanguageCoverage>> {
  const supabase = getSupabaseClient();
  
  const result: Record<Language, LanguageCoverage> = {
    Telugu: { language: 'Telugu', total: 0, with_reviews: 0, target: 99, current_percentage: 0, gap: 0, priority_movies: [] },
    Hindi: { language: 'Hindi', total: 0, with_reviews: 0, target: 60, current_percentage: 0, gap: 0, priority_movies: [] },
    Tamil: { language: 'Tamil', total: 0, with_reviews: 0, target: 50, current_percentage: 0, gap: 0, priority_movies: [] },
    Kannada: { language: 'Kannada', total: 0, with_reviews: 0, target: 40, current_percentage: 0, gap: 0, priority_movies: [] },
    Malayalam: { language: 'Malayalam', total: 0, with_reviews: 0, target: 40, current_percentage: 0, gap: 0, priority_movies: [] },
    Other: { language: 'Other', total: 0, with_reviews: 0, target: 20, current_percentage: 0, gap: 0, priority_movies: [] },
  };
  
  // Get all published movies with their review status
  const { data: movies, error } = await supabase
    .from('movies')
    .select(`
      id, title_en, language, is_blockbuster, avg_rating,
      movie_reviews!left(id)
    `)
    .eq('is_published', true);
  
  if (error || !movies) {
    console.error('Error fetching movies for language coverage:', error);
    return result;
  }
  
  // Count by language
  for (const movie of movies) {
    const lang = (movie.language || 'Telugu') as Language;
    const normalizedLang = Object.keys(result).includes(lang) ? lang : 'Other';
    
    result[normalizedLang].total++;
    
    const hasReview = movie.movie_reviews && movie.movie_reviews.length > 0;
    if (hasReview) {
      result[normalizedLang].with_reviews++;
    } else {
      // Add to priority if blockbuster or high-rated without review
      if (movie.is_blockbuster || (movie.avg_rating && movie.avg_rating >= 7.5)) {
        if (result[normalizedLang].priority_movies.length < 10) {
          result[normalizedLang].priority_movies.push(movie.id);
        }
      }
    }
  }
  
  // Calculate percentages and gaps
  for (const lang of Object.keys(result) as Language[]) {
    const data = result[lang];
    if (data.total > 0) {
      data.current_percentage = Math.round((data.with_reviews / data.total) * 100);
      data.gap = Math.max(0, data.target - data.current_percentage);
    }
    data.target = LANGUAGE_TARGETS[lang].targetPercentage;
  }
  
  return result;
}

/**
 * Get coverage breakdown by category
 */
async function getCoverageByCategory(): Promise<CategoryCoverage[]> {
  const supabase = getSupabaseClient();
  
  const categories: CategoryCoverage[] = [];
  
  // Blockbusters
  const { data: blockbusters } = await supabase
    .from('movies')
    .select('id, movie_reviews!left(id)')
    .eq('is_published', true)
    .eq('is_blockbuster', true);
  
  if (blockbusters) {
    const withReviews = blockbusters.filter(m => m.movie_reviews && m.movie_reviews.length > 0).length;
    categories.push({
      category: 'blockbuster',
      total: blockbusters.length,
      with_reviews: withReviews,
      current_percentage: blockbusters.length > 0 ? Math.round((withReviews / blockbusters.length) * 100) : 100,
    });
  }
  
  // Classics
  const { data: classics } = await supabase
    .from('movies')
    .select('id, movie_reviews!left(id)')
    .eq('is_published', true)
    .eq('is_classic', true);
  
  if (classics) {
    const withReviews = classics.filter(m => m.movie_reviews && m.movie_reviews.length > 0).length;
    categories.push({
      category: 'classic',
      total: classics.length,
      with_reviews: withReviews,
      current_percentage: classics.length > 0 ? Math.round((withReviews / classics.length) * 100) : 100,
    });
  }
  
  // Hidden Gems (underrated)
  const { data: hiddenGems } = await supabase
    .from('movies')
    .select('id, movie_reviews!left(id)')
    .eq('is_published', true)
    .eq('is_underrated', true);
  
  if (hiddenGems) {
    const withReviews = hiddenGems.filter(m => m.movie_reviews && m.movie_reviews.length > 0).length;
    categories.push({
      category: 'hidden-gem',
      total: hiddenGems.length,
      with_reviews: withReviews,
      current_percentage: hiddenGems.length > 0 ? Math.round((withReviews / hiddenGems.length) * 100) : 100,
    });
  }
  
  // Recent (last 2 years)
  const twoYearsAgo = new Date().getFullYear() - 2;
  const { data: recent } = await supabase
    .from('movies')
    .select('id, movie_reviews!left(id)')
    .eq('is_published', true)
    .gte('release_year', twoYearsAgo);
  
  if (recent) {
    const withReviews = recent.filter(m => m.movie_reviews && m.movie_reviews.length > 0).length;
    categories.push({
      category: 'recent',
      total: recent.length,
      with_reviews: withReviews,
      current_percentage: recent.length > 0 ? Math.round((withReviews / recent.length) * 100) : 100,
    });
  }
  
  return categories;
}

/**
 * Get tag distribution stats
 */
async function getTagDistribution(): Promise<TagDistribution> {
  const supabase = getSupabaseClient();
  
  const result: TagDistribution = {
    box_office: {},
    mood: {},
    quality: {},
    audience_fit: {},
  };
  
  // Box office categories
  const { data: boxOfficeData } = await supabase
    .from('movies')
    .select('box_office_category')
    .eq('is_published', true)
    .not('box_office_category', 'is', null);
  
  if (boxOfficeData) {
    for (const movie of boxOfficeData) {
      const cat = movie.box_office_category;
      result.box_office[cat] = (result.box_office[cat] || 0) + 1;
    }
  }
  
  // Mood tags
  const { data: moodData } = await supabase
    .from('movies')
    .select('mood_tags')
    .eq('is_published', true)
    .not('mood_tags', 'is', null);
  
  if (moodData) {
    for (const movie of moodData) {
      for (const tag of (movie.mood_tags || [])) {
        result.mood[tag] = (result.mood[tag] || 0) + 1;
      }
    }
  }
  
  // Quality tags
  const { data: qualityData } = await supabase
    .from('movies')
    .select('quality_tags')
    .eq('is_published', true)
    .not('quality_tags', 'is', null);
  
  if (qualityData) {
    for (const movie of qualityData) {
      for (const tag of (movie.quality_tags || [])) {
        result.quality[tag] = (result.quality[tag] || 0) + 1;
      }
    }
  }
  
  // Audience fit (from reviews)
  const { data: audienceData } = await supabase
    .from('movie_reviews')
    .select('audience_signals')
    .not('audience_signals', 'is', null);
  
  if (audienceData) {
    let family = 0, kids = 0, date = 0, group = 0;
    for (const review of audienceData) {
      const signals = review.audience_signals as { family_watch?: boolean; kids_friendly?: boolean; date_movie?: boolean; group_watch?: boolean } | null;
      if (signals) {
        if (signals.family_watch) family++;
        if (signals.kids_friendly) kids++;
        if (signals.date_movie) date++;
        if (signals.group_watch) group++;
      }
    }
    result.audience_fit = { family_watch: family, kids_friendly: kids, date_movie: date, group_watch: group };
  }
  
  return result;
}

/**
 * Get quality metrics
 */
async function getQualityMetrics(): Promise<QualityMetrics> {
  const supabase = getSupabaseClient();
  
  const result: QualityMetrics = {
    missing_metadata: {
      no_director: 0,
      no_hero: 0,
      no_genres: 0,
      no_poster: 0,
      total_incomplete: 0,
    },
    weak_reviews: {
      low_confidence: 0,
      template_only: 0,
      needs_upgrade: 0,
    },
    duplicate_candidates: {
      by_title: 0,
      by_tmdb_id: 0,
    },
  };
  
  // Missing metadata
  const { data: metadataIssues } = await supabase
    .from('movies')
    .select('director, hero, genres, poster_url')
    .eq('is_published', true);
  
  if (metadataIssues) {
    for (const movie of metadataIssues) {
      let hasIssue = false;
      if (!movie.director) { result.missing_metadata.no_director++; hasIssue = true; }
      if (!movie.hero) { result.missing_metadata.no_hero++; hasIssue = true; }
      if (!movie.genres || movie.genres.length === 0) { result.missing_metadata.no_genres++; hasIssue = true; }
      if (!movie.poster_url) { result.missing_metadata.no_poster++; hasIssue = true; }
      if (hasIssue) result.missing_metadata.total_incomplete++;
    }
  }
  
  // Weak reviews
  try {
    const { data: weakReviews } = await supabase
      .from('movie_reviews')
      .select('confidence, source')
      .or('confidence.lt.0.6,source.eq.template_fallback');
    
    if (weakReviews) {
      for (const review of weakReviews) {
        const reviewData = review as { confidence?: number; source?: string };
        if (reviewData.confidence && reviewData.confidence < 0.6) {
          result.weak_reviews.low_confidence++;
        }
        if (reviewData.source === 'template_fallback') {
          result.weak_reviews.template_only++;
        }
        result.weak_reviews.needs_upgrade++;
      }
    }
  } catch {
    // Columns may not exist
    console.warn('Could not fetch weak reviews (columns may not exist)');
  }
  
  // Duplicate candidates - titles that appear more than once
  const { data: titleCounts } = await supabase
    .from('movies')
    .select('title_en')
    .eq('is_published', true);
  
  if (titleCounts) {
    const counts: Record<string, number> = {};
    for (const movie of titleCounts) {
      const title = movie.title_en?.toLowerCase() || '';
      counts[title] = (counts[title] || 0) + 1;
    }
    result.duplicate_candidates.by_title = Object.values(counts).filter(c => c > 1).length;
  }
  
  return result;
}

/**
 * Generate priority queue for movies needing reviews
 */
async function generatePriorityQueue(limit: number = 50): Promise<PriorityMovie[]> {
  const supabase = getSupabaseClient();
  
  // Get movies without reviews
  const { data: movies, error } = await supabase
    .from('movies')
    .select(`
      id, title_en, language, is_blockbuster, is_classic, avg_rating, popularity_score,
      movie_reviews!left(id)
    `)
    .eq('is_published', true)
    .order('popularity_score', { ascending: false })
    .limit(500);
  
  if (error || !movies) {
    console.error('Error fetching priority queue:', error);
    return [];
  }
  
  // Filter to movies without reviews and score them
  const priority: PriorityMovie[] = [];
  
  for (const movie of movies) {
    const hasReview = movie.movie_reviews && movie.movie_reviews.length > 0;
    if (hasReview) continue;
    
    let score = 0;
    const reasons: string[] = [];
    
    // Blockbuster priority
    if (movie.is_blockbuster) {
      score += 30;
      reasons.push('Blockbuster');
    }
    
    // Classic priority
    if (movie.is_classic) {
      score += 20;
      reasons.push('Classic');
    }
    
    // High-rated priority
    if (movie.avg_rating && movie.avg_rating >= 8) {
      score += 25;
      reasons.push('Highly rated');
    } else if (movie.avg_rating && movie.avg_rating >= 7) {
      score += 15;
      reasons.push('Well rated');
    }
    
    // Telugu priority
    if (movie.language === 'Telugu') {
      score += 20;
      reasons.push('Telugu film');
    }
    
    // Popularity priority
    if (movie.popularity_score && movie.popularity_score >= 50) {
      score += 10;
      reasons.push('Popular');
    }
    
    if (score > 0) {
      priority.push({
        movie_id: movie.id,
        title: movie.title_en,
        language: (movie.language || 'Telugu') as Language,
        priority_score: score,
        priority_reasons: reasons,
      });
    }
  }
  
  // Sort by priority score and return top N
  return priority
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, limit);
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Generate comprehensive coverage intelligence report
 */
export async function generateCoverageIntelligence(): Promise<CoverageIntelligence> {
  const supabase = getSupabaseClient();
  
  // Get summary counts
  const { count: totalMovies } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  
  const { count: totalReviews } = await supabase
    .from('movie_reviews')
    .select('id', { count: 'exact', head: true });
  
  const overallCoverage = totalMovies && totalReviews
    ? Math.round((totalReviews / totalMovies) * 100)
    : 0;
  
  // Generate all sections
  const [byLanguage, byCategory, tagDistribution, qualityMetrics, priorityQueue] = await Promise.all([
    getCoverageByLanguage(),
    getCoverageByCategory(),
    getTagDistribution(),
    getQualityMetrics(),
    generatePriorityQueue(),
  ]);
  
  return {
    summary: {
      total_movies: totalMovies || 0,
      total_reviews: totalReviews || 0,
      overall_coverage: overallCoverage,
      target_coverage: 95,
    },
    by_language: byLanguage,
    by_category: byCategory,
    tag_distribution: tagDistribution,
    quality_metrics: qualityMetrics,
    priority_queue: priorityQueue,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Print coverage intelligence report to console
 */
export async function printCoverageReport(): Promise<void> {
  console.log('\n📊 COVERAGE INTELLIGENCE REPORT\n');
  console.log('================================\n');
  
  const intel = await generateCoverageIntelligence();
  
  // Summary
  console.log('📌 SUMMARY');
  console.log(`   Total Movies: ${intel.summary.total_movies}`);
  console.log(`   Total Reviews: ${intel.summary.total_reviews}`);
  console.log(`   Overall Coverage: ${intel.summary.overall_coverage}%`);
  console.log(`   Target: ${intel.summary.target_coverage}%`);
  console.log('');
  
  // By Language
  console.log('🌐 BY LANGUAGE');
  for (const [lang, data] of Object.entries(intel.by_language)) {
    if (data.total > 0) {
      const status = data.current_percentage >= data.target ? '✅' : '⚠️';
      console.log(`   ${status} ${lang}: ${data.with_reviews}/${data.total} (${data.current_percentage}%, target: ${data.target}%)`);
    }
  }
  console.log('');
  
  // By Category
  console.log('📁 BY CATEGORY');
  for (const cat of intel.by_category) {
    const status = cat.current_percentage >= 90 ? '✅' : '⚠️';
    console.log(`   ${status} ${cat.category}: ${cat.with_reviews}/${cat.total} (${cat.current_percentage}%)`);
  }
  console.log('');
  
  // Quality Issues
  console.log('⚠️ QUALITY ISSUES');
  console.log(`   Missing Director: ${intel.quality_metrics.missing_metadata.no_director}`);
  console.log(`   Missing Hero: ${intel.quality_metrics.missing_metadata.no_hero}`);
  console.log(`   Weak Reviews: ${intel.quality_metrics.weak_reviews.needs_upgrade}`);
  console.log(`   Duplicate Candidates: ${intel.quality_metrics.duplicate_candidates.by_title}`);
  console.log('');
  
  // Priority Queue
  console.log('🎯 TOP PRIORITY (Need Reviews)');
  for (const movie of intel.priority_queue.slice(0, 10)) {
    console.log(`   [${movie.priority_score}] ${movie.title} (${movie.language}) - ${movie.priority_reasons.join(', ')}`);
  }
  console.log('');
  
  console.log(`Last Updated: ${intel.last_updated}`);
}

// ============================================================
// EXPORTS
// ============================================================

export {
  LANGUAGE_TARGETS,
  getCoverageByLanguage,
  getCoverageByCategory,
  getTagDistribution,
  getQualityMetrics,
  generatePriorityQueue,
};

