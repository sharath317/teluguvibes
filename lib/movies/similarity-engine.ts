import { createClient } from '@supabase/supabase-js';

// Types
export interface SimilarMovie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  avg_rating?: number;
  release_year?: number;
  runtime_minutes?: number;
  genres?: string[];
  director?: string;
  hero?: string;
  relevanceScore?: number;
}

export interface SimilarSection {
  id: string;
  title: string;
  subtitle?: string;
  movies: SimilarMovie[];
  matchType: 'best' | 'director' | 'hero' | 'genre' | 'era' | 'tags' | 'rating';
  priority: number;
}

export interface SourceMovie {
  id: string;
  title_en: string;
  director?: string;
  hero?: string;
  heroine?: string;
  genres?: string[];
  release_year?: number;
  language?: string;
  is_blockbuster?: boolean;
  is_classic?: boolean;
  is_underrated?: boolean;
  our_rating?: number;
  avg_rating?: number;
}

// Weights for relevance scoring
const WEIGHTS = {
  director: 0.25,
  hero: 0.20,
  genre: 0.20,
  era: 0.10,
  tags: 0.15,
  rating: 0.10,
};

// Calculate decade from year
function getDecade(year?: number): string {
  if (!year) return '';
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

// Calculate era proximity score (0-1)
function calculateEraProximity(sourceYear?: number, targetYear?: number): number {
  if (!sourceYear || !targetYear) return 0;
  const diff = Math.abs(sourceYear - targetYear);
  if (diff <= 2) return 1.0;
  if (diff <= 5) return 0.8;
  if (diff <= 10) return 0.5;
  if (diff <= 20) return 0.3;
  return 0.1;
}

// Calculate genre overlap score (0-1)
function calculateGenreOverlap(sourceGenres?: string[], targetGenres?: string[]): number {
  if (!sourceGenres?.length || !targetGenres?.length) return 0;
  const sourceSet = new Set(sourceGenres.map(g => g.toLowerCase()));
  const matchCount = targetGenres.filter(g => sourceSet.has(g.toLowerCase())).length;
  return matchCount / Math.max(sourceGenres.length, 1);
}

// Calculate tag match score (0-1)
function calculateTagMatch(source: SourceMovie, target: SimilarMovie & { is_blockbuster?: boolean; is_classic?: boolean; is_underrated?: boolean }): number {
  let matches = 0;
  let total = 0;
  
  if (source.is_blockbuster) {
    total++;
    if (target.is_blockbuster) matches++;
  }
  if (source.is_classic) {
    total++;
    if (target.is_classic) matches++;
  }
  if (source.is_underrated) {
    total++;
    if (target.is_underrated) matches++;
  }
  
  return total > 0 ? matches / total : 0;
}

// Calculate rating tier match (0-1)
function calculateRatingTierMatch(sourceRating?: number, targetRating?: number): number {
  if (!sourceRating || !targetRating) return 0;
  const diff = Math.abs(sourceRating - targetRating);
  if (diff <= 0.5) return 1.0;
  if (diff <= 1.0) return 0.8;
  if (diff <= 1.5) return 0.5;
  if (diff <= 2.0) return 0.3;
  return 0.1;
}

// Calculate overall relevance score
export function calculateRelevanceScore(source: SourceMovie, target: any): number {
  let score = 0;
  
  // Director match
  if (source.director && target.director && 
      source.director.toLowerCase() === target.director.toLowerCase()) {
    score += WEIGHTS.director;
  }
  
  // Hero match
  if (source.hero && target.hero && 
      source.hero.toLowerCase() === target.hero.toLowerCase()) {
    score += WEIGHTS.hero;
  }
  
  // Genre overlap
  score += WEIGHTS.genre * calculateGenreOverlap(source.genres, target.genres);
  
  // Era proximity
  score += WEIGHTS.era * calculateEraProximity(source.release_year, target.release_year);
  
  // Tag match
  score += WEIGHTS.tags * calculateTagMatch(source, target);
  
  // Rating tier match
  const sourceRating = source.our_rating || source.avg_rating;
  const targetRating = target.our_rating || target.avg_rating;
  score += WEIGHTS.rating * calculateRatingTierMatch(sourceRating, targetRating);
  
  return score;
}

// Get Supabase client
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Base query fields for similar movies
const MOVIE_SELECT_FIELDS = `
  id, title_en, title_te, slug, poster_url, avg_rating, our_rating,
  release_year, runtime_minutes, genres, director, hero,
  is_blockbuster, is_classic, is_underrated, language
`;

// Find similar movies by category
async function findByDirector(source: SourceMovie, limit: number = 8): Promise<SimilarMovie[]> {
  if (!source.director) return [];
  
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('director', source.director)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findByHero(source: SourceMovie, limit: number = 8): Promise<SimilarMovie[]> {
  if (!source.hero) return [];
  
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('hero', source.hero)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findByGenre(source: SourceMovie, limit: number = 8): Promise<SimilarMovie[]> {
  if (!source.genres?.length) return [];
  
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .overlaps('genres', source.genres)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findByEra(source: SourceMovie, limit: number = 8): Promise<SimilarMovie[]> {
  if (!source.release_year) return [];
  
  const decade = Math.floor(source.release_year / 10) * 10;
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .gte('release_year', decade)
    .lt('release_year', decade + 10)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findByTags(source: SourceMovie, limit: number = 8): Promise<{ movies: SimilarMovie[]; tagType: string }> {
  const supabase = getSupabase();
  
  // Determine which tag to match
  let tagFilter: { field: string; value: boolean; label: string } | null = null;
  
  if (source.is_blockbuster) {
    tagFilter = { field: 'is_blockbuster', value: true, label: 'Blockbusters' };
  } else if (source.is_classic) {
    tagFilter = { field: 'is_classic', value: true, label: 'Classics' };
  } else if (source.is_underrated) {
    tagFilter = { field: 'is_underrated', value: true, label: 'Hidden Gems' };
  }
  
  if (!tagFilter) {
    return { movies: [], tagType: '' };
  }
  
  const query = supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .eq(tagFilter.field, tagFilter.value)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  const { data } = await query;
  return { movies: data || [], tagType: tagFilter.label };
}

async function findHighlyRated(source: SourceMovie, limit: number = 8): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .gte('avg_rating', 7.5)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

// Main function: Get all similar movie sections
export async function getSimilarMovieSections(source: SourceMovie): Promise<SimilarSection[]> {
  const MIN_MOVIES_FOR_SECTION = 3;
  const MAX_SECTIONS = 3;
  
  // Run all category queries in parallel
  const [
    directorMovies,
    heroMovies,
    genreMovies,
    eraMovies,
    tagsResult,
    highlyRatedMovies,
  ] = await Promise.all([
    findByDirector(source),
    findByHero(source),
    findByGenre(source),
    findByEra(source),
    findByTags(source),
    findHighlyRated(source),
  ]);
  
  // Calculate relevance scores for best matches
  const allCandidates = new Map<string, any>();
  
  // Collect all unique movies
  [...directorMovies, ...heroMovies, ...genreMovies, ...eraMovies, ...tagsResult.movies, ...highlyRatedMovies].forEach(movie => {
    if (!allCandidates.has(movie.id)) {
      allCandidates.set(movie.id, {
        ...movie,
        relevanceScore: calculateRelevanceScore(source, movie),
      });
    }
  });
  
  // Sort by relevance score for best matches
  const bestMatches = Array.from(allCandidates.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 8);
  
  // Build sections array
  const sections: SimilarSection[] = [];
  const usedMovieIds = new Set<string>();
  
  // Section 1: Best Matches (always first if we have enough)
  if (bestMatches.length >= MIN_MOVIES_FOR_SECTION) {
    sections.push({
      id: 'best-matches',
      title: 'You May Also Like',
      subtitle: 'Based on your viewing',
      movies: bestMatches,
      matchType: 'best',
      priority: 100,
    });
    bestMatches.forEach(m => usedMovieIds.add(m.id));
  }
  
  // Build category sections with priority
  const categorySections: SimilarSection[] = [];
  
  // Director section
  if (directorMovies.length >= MIN_MOVIES_FOR_SECTION && source.director) {
    const uniqueMovies = directorMovies.filter(m => !usedMovieIds.has(m.id));
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      categorySections.push({
        id: 'director',
        title: `More from ${source.director}`,
        subtitle: 'Same director',
        movies: uniqueMovies,
        matchType: 'director',
        priority: 90,
      });
    }
  }
  
  // Hero section
  if (heroMovies.length >= MIN_MOVIES_FOR_SECTION && source.hero) {
    const uniqueMovies = heroMovies.filter(m => !usedMovieIds.has(m.id));
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      categorySections.push({
        id: 'hero',
        title: `More with ${source.hero}`,
        subtitle: 'Same lead actor',
        movies: uniqueMovies,
        matchType: 'hero',
        priority: 85,
      });
    }
  }
  
  // Genre section
  if (genreMovies.length >= MIN_MOVIES_FOR_SECTION && source.genres?.length) {
    const uniqueMovies = genreMovies.filter(m => !usedMovieIds.has(m.id));
    const primaryGenre = source.genres[0];
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      categorySections.push({
        id: 'genre',
        title: `Similar ${primaryGenre} Movies`,
        subtitle: 'Same genre',
        movies: uniqueMovies,
        matchType: 'genre',
        priority: 80,
      });
    }
  }
  
  // Era section
  if (eraMovies.length >= MIN_MOVIES_FOR_SECTION && source.release_year) {
    const uniqueMovies = eraMovies.filter(m => !usedMovieIds.has(m.id));
    const decade = getDecade(source.release_year);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      categorySections.push({
        id: 'era',
        title: `${decade} Telugu Hits`,
        subtitle: 'Same era',
        movies: uniqueMovies,
        matchType: 'era',
        priority: 70,
      });
    }
  }
  
  // Tags section
  if (tagsResult.movies.length >= MIN_MOVIES_FOR_SECTION && tagsResult.tagType) {
    const uniqueMovies = tagsResult.movies.filter(m => !usedMovieIds.has(m.id));
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      categorySections.push({
        id: 'tags',
        title: `More ${tagsResult.tagType}`,
        subtitle: tagsResult.tagType === 'Hidden Gems' ? 'Underrated picks' : 'Top performers',
        movies: uniqueMovies,
        matchType: 'tags',
        priority: 65,
      });
    }
  }
  
  // Highly Rated fallback
  if (categorySections.length < 2 && highlyRatedMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = highlyRatedMovies.filter(m => !usedMovieIds.has(m.id));
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      categorySections.push({
        id: 'highly-rated',
        title: 'Highly Rated Telugu Movies',
        subtitle: 'Top picks',
        movies: uniqueMovies,
        matchType: 'rating',
        priority: 60,
      });
    }
  }
  
  // Sort category sections by priority and take top ones
  categorySections.sort((a, b) => b.priority - a.priority);
  
  // Add top category sections (up to MAX_SECTIONS total including best matches)
  const remainingSlots = MAX_SECTIONS - sections.length;
  sections.push(...categorySections.slice(0, remainingSlots));
  
  return sections;
}

