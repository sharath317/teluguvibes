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
  heroine?: string;
  music_director?: string;
  relevanceScore?: number;
}

export interface SimilarSection {
  id: string;
  title: string;
  subtitle?: string;
  movies: SimilarMovie[];
  matchType: 'best' | 'director' | 'hero' | 'heroine' | 'genre' | 'era' | 'tags' | 'rating' | 'classics' | 'blockbusters' | 'recent' | 'music';
  priority: number;
}

export interface SourceMovie {
  id: string;
  title_en: string;
  director?: string;
  hero?: string;
  heroine?: string;
  music_director?: string;
  genres?: string[];
  release_year?: number;
  language?: string;
  is_blockbuster?: boolean;
  is_classic?: boolean;
  is_underrated?: boolean;
  our_rating?: number;
  avg_rating?: number;
}

// Configuration
const MIN_MOVIES_FOR_SECTION = 3;
const MAX_SECTIONS = 8;
const MOVIES_PER_SECTION = 8;

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
  release_year, runtime_minutes, genres, director, hero, heroine, music_director,
  is_blockbuster, is_classic, is_underrated, language
`;

// Find similar movies by category
async function findByDirector(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
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

async function findByHero(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
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

async function findByHeroine(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  if (!source.heroine) return [];
  
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('heroine', source.heroine)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findByMusicDirector(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  if (!source.music_director) return [];
  
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('music_director', source.music_director)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findByGenre(source: SourceMovie, primaryGenre: string, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .contains('genres', [primaryGenre])
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findByEra(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
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

// Fallback sections - always available
async function findClassics(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .eq('is_classic', true)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findBlockbusters(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .eq('is_blockbuster', true)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findHiddenGems(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .eq('is_underrated', true)
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findHighlyRated(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .gte('avg_rating', 7.0)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

async function findRecentHits(source: SourceMovie, limit: number = MOVIES_PER_SECTION): Promise<SimilarMovie[]> {
  const currentYear = new Date().getFullYear();
  const supabase = getSupabase();
  const { data } = await supabase
    .from('movies')
    .select(MOVIE_SELECT_FIELDS)
    .eq('is_published', true)
    .eq('language', source.language || 'Telugu')
    .neq('id', source.id)
    .not('poster_url', 'is', null)
    .gte('release_year', currentYear - 5)
    .gte('avg_rating', 6.5)
    .order('release_year', { ascending: false })
    .order('avg_rating', { ascending: false })
    .limit(limit);
  
  return data || [];
}

// Main function: Get all similar movie sections (target: 6-8 sections, 30-40+ movies)
export async function getSimilarMovieSections(source: SourceMovie): Promise<SimilarSection[]> {
  const primaryGenre = source.genres?.[0];
  const secondaryGenre = source.genres?.[1];
  
  // Run all category queries in parallel for maximum data gathering
  const [
    directorMovies,
    heroMovies,
    heroineMovies,
    musicDirectorMovies,
    primaryGenreMovies,
    secondaryGenreMovies,
    eraMovies,
    classicsMovies,
    blockbustersMovies,
    hiddenGemsMovies,
    highlyRatedMovies,
    recentHitsMovies,
  ] = await Promise.all([
    findByDirector(source),
    findByHero(source),
    findByHeroine(source),
    findByMusicDirector(source),
    primaryGenre ? findByGenre(source, primaryGenre) : Promise.resolve([]),
    secondaryGenre ? findByGenre(source, secondaryGenre) : Promise.resolve([]),
    findByEra(source),
    findClassics(source),
    findBlockbusters(source),
    findHiddenGems(source),
    findHighlyRated(source),
    findRecentHits(source),
  ]);
  
  // Calculate relevance scores for best matches
  const allCandidates = new Map<string, any>();
  
  // Collect all unique movies for best matches scoring
  [
    ...directorMovies, 
    ...heroMovies, 
    ...heroineMovies,
    ...primaryGenreMovies, 
    ...eraMovies, 
    ...highlyRatedMovies
  ].forEach(movie => {
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
    .slice(0, MOVIES_PER_SECTION);
  
  // Track used movie IDs to avoid duplicates across sections
  const usedMovieIds = new Set<string>();
  
  // Helper to get unique movies
  const getUniqueMovies = (movies: SimilarMovie[], markAsUsed = false): SimilarMovie[] => {
    const unique = movies.filter(m => !usedMovieIds.has(m.id));
    if (markAsUsed) {
      unique.forEach(m => usedMovieIds.add(m.id));
    }
    return unique;
  };
  
  // Build all potential sections
  const allSections: SimilarSection[] = [];
  
  // 1. Best Matches (always first, highest priority)
  if (bestMatches.length >= MIN_MOVIES_FOR_SECTION) {
    bestMatches.forEach(m => usedMovieIds.add(m.id));
    allSections.push({
      id: 'best-matches',
      title: 'You May Also Like',
      subtitle: 'Based on similarity',
      movies: bestMatches,
      matchType: 'best',
      priority: 100,
    });
  }
  
  // 2. Director section
  if (source.director && directorMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(directorMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'director',
        title: `More from ${source.director}`,
        subtitle: 'Same director',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'director',
        priority: 95,
      });
    }
  }
  
  // 3. Hero section
  if (source.hero && heroMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(heroMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'hero',
        title: `More with ${source.hero}`,
        subtitle: 'Same lead actor',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'hero',
        priority: 90,
      });
    }
  }
  
  // 4. Heroine section
  if (source.heroine && heroineMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(heroineMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'heroine',
        title: `Films with ${source.heroine}`,
        subtitle: 'Same lead actress',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'heroine',
        priority: 85,
      });
    }
  }
  
  // 5. Primary genre section
  if (primaryGenre && primaryGenreMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(primaryGenreMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'genre-primary',
        title: `${primaryGenre} Movies`,
        subtitle: 'Same genre',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'genre',
        priority: 80,
      });
    }
  }
  
  // 6. Era section
  if (source.release_year && eraMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(eraMovies, true);
    const decade = getDecade(source.release_year);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'era',
        title: `${decade} Telugu Hits`,
        subtitle: 'Same era',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'era',
        priority: 75,
      });
    }
  }
  
  // 7. Music Director section
  if (source.music_director && musicDirectorMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(musicDirectorMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'music',
        title: `Music by ${source.music_director}`,
        subtitle: 'Same composer',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'music',
        priority: 70,
      });
    }
  }
  
  // 8. Secondary genre section (if primary is already used)
  if (secondaryGenre && secondaryGenreMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(secondaryGenreMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'genre-secondary',
        title: `${secondaryGenre} Movies`,
        subtitle: 'Related genre',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'genre',
        priority: 65,
      });
    }
  }
  
  // FALLBACK SECTIONS (always try to add these if we need more sections)
  
  // 9. Telugu Classics
  if (classicsMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(classicsMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'classics',
        title: 'Telugu Classics',
        subtitle: 'Timeless masterpieces',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'classics',
        priority: 60,
      });
    }
  }
  
  // 10. Blockbusters
  if (blockbustersMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(blockbustersMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'blockbusters',
        title: 'Blockbuster Hits',
        subtitle: 'Box office champions',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'blockbusters',
        priority: 55,
      });
    }
  }
  
  // 11. Hidden Gems
  if (hiddenGemsMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(hiddenGemsMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'hidden-gems',
        title: 'Hidden Gems',
        subtitle: 'Underrated picks',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'tags',
        priority: 50,
      });
    }
  }
  
  // 12. Highly Rated
  if (highlyRatedMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(highlyRatedMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'highly-rated',
        title: 'Top Rated Telugu',
        subtitle: 'Critics favorites',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'rating',
        priority: 45,
      });
    }
  }
  
  // 13. Recent Hits
  if (recentHitsMovies.length >= MIN_MOVIES_FOR_SECTION) {
    const uniqueMovies = getUniqueMovies(recentHitsMovies, true);
    if (uniqueMovies.length >= MIN_MOVIES_FOR_SECTION) {
      allSections.push({
        id: 'recent-hits',
        title: 'Recent Hits',
        subtitle: 'Latest releases',
        movies: uniqueMovies.slice(0, MOVIES_PER_SECTION),
        matchType: 'recent',
        priority: 40,
      });
    }
  }
  
  // Sort by priority and return top MAX_SECTIONS
  allSections.sort((a, b) => b.priority - a.priority);
  
  return allSections.slice(0, MAX_SECTIONS);
}

