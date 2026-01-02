/**
 * MULTI-LANGUAGE MOVIE INGESTION
 * 
 * Smart injection rules for other language movies:
 * - Focus on Telugu (80% of content)
 * - Hindi, Tamil, Malayalam, English, Dubbed (20% combined)
 * - Only ingest HIGH QUALITY movies from other languages:
 *   - Rating >= 7.0 (TMDB)
 *   - OR marked as Classic (older, well-known)
 *   - OR Hidden Gem (lesser-known but highly rated)
 *   - OR Blockbuster (commercially successful)
 * - NO flop movies (rating < 5.0 or known flops)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TYPES
// ============================================================

export type SupportedLanguage = 'Telugu' | 'Hindi' | 'Tamil' | 'Malayalam' | 'English' | 'Kannada' | 'Dubbed';

export interface LanguageConfig {
  language: SupportedLanguage;
  tmdb_language_code: string;
  tmdb_region?: string;
  priority: number; // 1 = highest
  max_movies: number;
  min_rating: number;
  include_classics: boolean;
  include_blockbusters: boolean;
  include_hidden_gems: boolean;
}

export interface QualityGates {
  min_rating: number;
  min_vote_count: number;
  exclude_genres: string[];
  max_age_years?: number; // For classics, no limit
}

// ============================================================
// CONFIGURATION
// ============================================================

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    language: 'Telugu',
    tmdb_language_code: 'te',
    tmdb_region: 'IN',
    priority: 1,
    max_movies: 2000,
    min_rating: 5.0, // Allow more Telugu movies
    include_classics: true,
    include_blockbusters: true,
    include_hidden_gems: true,
  },
  {
    language: 'Hindi',
    tmdb_language_code: 'hi',
    tmdb_region: 'IN',
    priority: 2,
    max_movies: 200,
    min_rating: 7.0, // Higher bar for Hindi
    include_classics: true,
    include_blockbusters: true,
    include_hidden_gems: true,
  },
  {
    language: 'Tamil',
    tmdb_language_code: 'ta',
    tmdb_region: 'IN',
    priority: 3,
    max_movies: 150,
    min_rating: 7.0,
    include_classics: true,
    include_blockbusters: true,
    include_hidden_gems: true,
  },
  {
    language: 'Malayalam',
    tmdb_language_code: 'ml',
    tmdb_region: 'IN',
    priority: 4,
    max_movies: 100,
    min_rating: 7.5, // Even higher - only the best
    include_classics: true,
    include_blockbusters: true,
    include_hidden_gems: true,
  },
  {
    language: 'English',
    tmdb_language_code: 'en',
    priority: 5,
    max_movies: 100,
    min_rating: 7.5, // Only top Hollywood
    include_classics: true,
    include_blockbusters: true,
    include_hidden_gems: false,
  },
  {
    language: 'Kannada',
    tmdb_language_code: 'kn',
    tmdb_region: 'IN',
    priority: 6,
    max_movies: 50,
    min_rating: 7.0,
    include_classics: true,
    include_blockbusters: true,
    include_hidden_gems: true,
  },
];

// Quality gates for non-Telugu movies
export const QUALITY_GATES: QualityGates = {
  min_rating: 6.5,
  min_vote_count: 50, // Avoid obscure movies
  exclude_genres: ['Adult', 'Documentary'], // Focus on feature films
};

// Known blockbuster directors/actors for each language
export const BLOCKBUSTER_MARKERS: Record<SupportedLanguage, { directors: string[]; actors: string[] }> = {
  Telugu: {
    directors: ['S.S. Rajamouli', 'Trivikram Srinivas', 'Sukumar', 'Koratala Siva'],
    actors: ['Chiranjeevi', 'Pawan Kalyan', 'Mahesh Babu', 'Allu Arjun', 'Jr NTR', 'Prabhas', 'Ram Charan'],
  },
  Hindi: {
    directors: ['Rajkumar Hirani', 'Sanjay Leela Bhansali', 'Rohit Shetty', 'S.S. Rajamouli'],
    actors: ['Shah Rukh Khan', 'Aamir Khan', 'Salman Khan', 'Hrithik Roshan', 'Ranbir Kapoor', 'Deepika Padukone'],
  },
  Tamil: {
    directors: ['Mani Ratnam', 'Shankar', 'Lokesh Kanagaraj', 'Vetrimaaran', 'Atlee'],
    actors: ['Rajinikanth', 'Kamal Haasan', 'Vijay', 'Ajith Kumar', 'Suriya', 'Dhanush'],
  },
  Malayalam: {
    directors: ['Jeethu Joseph', 'Aashiq Abu', 'Lijo Jose Pellissery', 'Dileesh Pothan'],
    actors: ['Mohanlal', 'Mammootty', 'Fahadh Faasil', 'Dulquer Salmaan', 'Prithviraj'],
  },
  English: {
    directors: ['Christopher Nolan', 'Steven Spielberg', 'Martin Scorsese', 'Quentin Tarantino', 'Denis Villeneuve'],
    actors: ['Leonardo DiCaprio', 'Tom Hanks', 'Denzel Washington', 'Meryl Streep'],
  },
  Kannada: {
    directors: ['Prashanth Neel', 'Rishab Shetty', 'Rakshit Shetty'],
    actors: ['Yash', 'Kichcha Sudeep', 'Upendra', 'Darshan'],
  },
  Dubbed: {
    directors: [],
    actors: [],
  },
};

// Classic movie year thresholds by language
export const CLASSIC_YEAR_THRESHOLD: Record<SupportedLanguage, number> = {
  Telugu: 2005,
  Hindi: 2000,
  Tamil: 2005,
  Malayalam: 2005,
  English: 1995,
  Kannada: 2010,
  Dubbed: 2010,
};

// ============================================================
// QUALITY CHECK FUNCTIONS
// ============================================================

export interface MovieCandidate {
  tmdb_id: number;
  title: string;
  original_language: string;
  release_year: number;
  vote_average: number;
  vote_count: number;
  genres: string[];
  director?: string;
  cast?: string[];
}

export interface QualityCheckResult {
  passed: boolean;
  category: 'blockbuster' | 'classic' | 'hidden-gem' | 'quality' | 'rejected';
  reason: string;
  confidence: number;
}

export function checkMovieQuality(
  movie: MovieCandidate,
  config: LanguageConfig
): QualityCheckResult {
  const language = config.language;
  const markers = BLOCKBUSTER_MARKERS[language];
  const classicThreshold = CLASSIC_YEAR_THRESHOLD[language];

  // Reject low-rated movies
  if (movie.vote_average < config.min_rating) {
    return {
      passed: false,
      category: 'rejected',
      reason: `Rating ${movie.vote_average} below minimum ${config.min_rating}`,
      confidence: 1.0,
    };
  }

  // Reject movies with too few votes (unreliable ratings)
  if (movie.vote_count < QUALITY_GATES.min_vote_count) {
    return {
      passed: false,
      category: 'rejected',
      reason: `Only ${movie.vote_count} votes - not enough data`,
      confidence: 0.8,
    };
  }

  // Reject excluded genres
  if (movie.genres.some(g => QUALITY_GATES.exclude_genres.includes(g))) {
    return {
      passed: false,
      category: 'rejected',
      reason: `Excluded genre: ${movie.genres.join(', ')}`,
      confidence: 1.0,
    };
  }

  // Check if it's a BLOCKBUSTER
  if (config.include_blockbusters) {
    const isBlockbusterDirector = markers?.directors.some(d => 
      movie.director?.toLowerCase().includes(d.toLowerCase())
    );
    const hasBlockbusterCast = markers?.actors.some(a => 
      movie.cast?.some(c => c.toLowerCase().includes(a.toLowerCase()))
    );
    
    if ((isBlockbusterDirector || hasBlockbusterCast) && movie.vote_average >= 6.5) {
      return {
        passed: true,
        category: 'blockbuster',
        reason: `Blockbuster: ${isBlockbusterDirector ? 'Top director' : 'Star cast'}`,
        confidence: 0.9,
      };
    }
  }

  // Check if it's a CLASSIC
  if (config.include_classics && movie.release_year <= classicThreshold) {
    if (movie.vote_average >= 7.0) {
      return {
        passed: true,
        category: 'classic',
        reason: `Classic from ${movie.release_year} with rating ${movie.vote_average}`,
        confidence: 0.85,
      };
    }
  }

  // Check if it's a HIDDEN GEM
  if (config.include_hidden_gems) {
    const isHiddenGem = movie.vote_average >= 7.5 && movie.vote_count < 500;
    if (isHiddenGem) {
      return {
        passed: true,
        category: 'hidden-gem',
        reason: `Hidden gem: High rating (${movie.vote_average}) with limited exposure`,
        confidence: 0.8,
      };
    }
  }

  // General quality check
  if (movie.vote_average >= config.min_rating && movie.vote_count >= QUALITY_GATES.min_vote_count) {
    return {
      passed: true,
      category: 'quality',
      reason: `Quality movie: ${movie.vote_average} rating with ${movie.vote_count} votes`,
      confidence: 0.75,
    };
  }

  return {
    passed: false,
    category: 'rejected',
    reason: 'Did not meet quality thresholds',
    confidence: 0.5,
  };
}

// ============================================================
// LANGUAGE SECTIONS
// ============================================================

export interface LanguageSection {
  language: SupportedLanguage;
  title: string;
  title_te: string;
  movies: any[];
  total_count: number;
  icon: string;
}

export async function getLanguageSections(primaryLanguage: SupportedLanguage = 'Telugu'): Promise<LanguageSection[]> {
  const sections: LanguageSection[] = [];
  
  const languageLabels: Record<SupportedLanguage, { title: string; title_te: string; icon: string }> = {
    Telugu: { title: 'Telugu Movies', title_te: 'తెలుగు సినిమాలు', icon: '🎬' },
    Hindi: { title: 'Hindi Hits', title_te: 'హిందీ హిట్స్', icon: '🇮🇳' },
    Tamil: { title: 'Tamil Gems', title_te: 'తమిళ రత్నాలు', icon: '🎭' },
    Malayalam: { title: 'Malayalam Masterpieces', title_te: 'మలయాళ మాస్టర్‌పీస్', icon: '🌟' },
    English: { title: 'Hollywood Picks', title_te: 'హాలీవుడ్', icon: '🎥' },
    Kannada: { title: 'Kannada Hits', title_te: 'కన్నడ హిట్స్', icon: '🎪' },
    Dubbed: { title: 'Dubbed in Telugu', title_te: 'తెలుగులో డబ్', icon: '🔄' },
  };

  for (const config of LANGUAGE_CONFIGS) {
    if (config.language === primaryLanguage) continue; // Skip primary language
    
    const { data: movies, count } = await supabase
      .from('movies')
      .select('id, title_en, title_te, slug, poster_url, release_year, genres, director, avg_rating, is_blockbuster, is_classic, is_underrated', { count: 'exact' })
      .eq('is_published', true)
      .eq('language', config.language)
      .or('is_blockbuster.eq.true,is_classic.eq.true,is_underrated.eq.true,avg_rating.gte.7')
      .order('avg_rating', { ascending: false })
      .limit(12);

    if (movies && movies.length > 0) {
      const labels = languageLabels[config.language];
      sections.push({
        language: config.language,
        title: labels.title,
        title_te: labels.title_te,
        movies,
        total_count: count || movies.length,
        icon: labels.icon,
      });
    }
  }

  return sections;
}

// ============================================================
// COVERAGE CALCULATOR
// ============================================================

export async function getLanguageCoverage(): Promise<Record<SupportedLanguage, { count: number; percentage: number }>> {
  const coverage: Record<string, { count: number; percentage: number }> = {};
  
  const { data: allMovies } = await supabase
    .from('movies')
    .select('language')
    .eq('is_published', true);

  const total = allMovies?.length || 0;
  const langCounts = new Map<string, number>();

  for (const m of allMovies || []) {
    const lang = m.language || 'Unknown';
    langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
  }

  for (const lang of Object.keys(BLOCKBUSTER_MARKERS)) {
    const count = langCounts.get(lang) || 0;
    coverage[lang] = {
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  }

  return coverage as Record<SupportedLanguage, { count: number; percentage: number }>;
}

export async function shouldIngestMoreMovies(language: SupportedLanguage): Promise<{ should: boolean; reason: string; current: number; target: number }> {
  const config = LANGUAGE_CONFIGS.find(c => c.language === language);
  if (!config) {
    return { should: false, reason: 'Unknown language', current: 0, target: 0 };
  }

  const { count } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('language', language);

  const current = count || 0;
  const target = config.max_movies;

  if (current >= target) {
    return { should: false, reason: `Already at max (${current}/${target})`, current, target };
  }

  // For non-Telugu, check 20% rule
  if (language !== 'Telugu') {
    const { count: totalCount } = await supabase
      .from('movies')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true);

    const totalMovies = totalCount || 0;
    const otherLangPercentage = ((totalMovies - current) / totalMovies) * 100;
    
    if (otherLangPercentage > 20 && language !== 'Telugu') {
      return { 
        should: false, 
        reason: `Other languages at ${otherLangPercentage.toFixed(1)}%, exceeds 20% limit`, 
        current, 
        target 
      };
    }
  }

  return { should: true, reason: `Can add ${target - current} more movies`, current, target };
}

