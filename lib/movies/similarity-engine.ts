/**
 * Movie Similarity Engine
 * Calculates and provides similar movie recommendations
 */

import type { Movie } from '@/types/reviews';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side usage
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface SimilarMovie {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  release_year?: number;
  runtime_minutes?: number;
  genres?: string[];
  avg_rating?: number;
  our_rating?: number;
  similarity_score?: number;
  similarity_reason?: string;
  relevanceScore?: number;
  hero?: string;
  director?: string;
}

export interface SimilarSection {
  id: string;
  title: string;
  title_te?: string;
  subtitle?: string;
  reason?: string;
  movies: SimilarMovie[];
  icon?: string;
  matchType: 'best' | 'director' | 'hero' | 'heroine' | 'genre' | 'era' | 'tags' | 'rating' | 'classics' | 'blockbusters' | 'recent' | 'music';
  priority: number;
}

export interface SimilarSectionWithVisual extends SimilarSection {
  visualConfidence?: number;
  hasArchivalImages?: boolean;
}

export interface SimilarityOptions {
  includeGenre?: boolean;
  includeDirector?: boolean;
  includeActor?: boolean;
  includeEra?: boolean;
  maxMoviesPerSection?: number;
  maxSections?: number;
}

/**
 * Calculate similarity score between two movies
 */
export function calculateSimilarity(
  movie1: Movie,
  movie2: Partial<Movie>,
  options: SimilarityOptions = {}
): number {
  let score = 0;

  // Genre similarity
  if (options.includeGenre !== false && movie1.genres && movie2.genres) {
    const commonGenres = movie1.genres.filter(g => movie2.genres?.includes(g));
    score += (commonGenres.length / Math.max(movie1.genres.length, 1)) * 40;
  }

  // Director similarity
  if (options.includeDirector !== false && movie1.director && movie2.director) {
    if (movie1.director === movie2.director) {
      score += 30;
    }
  }

  // Actor similarity
  if (options.includeActor !== false && movie1.hero && movie2.hero) {
    if (movie1.hero === movie2.hero) {
      score += 20;
    }
  }

  // Era similarity
  if (options.includeEra !== false && movie1.release_year && movie2.release_year) {
    const yearDiff = Math.abs(movie1.release_year - movie2.release_year);
    if (yearDiff <= 5) {
      score += 10;
    } else if (yearDiff <= 10) {
      score += 5;
    }
  }

  return Math.min(score, 100);
}

/**
 * Get similar movie sections for a given movie
 * Can be called with (movie) or (movie, allMovies, options)
 * If allMovies is not provided, fetches from database
 */
export async function getSimilarMovieSections(
  movie: Movie | Partial<Movie>,
  allMovies?: Movie[],
  options: SimilarityOptions = {}
): Promise<SimilarSection[]> {
  const maxMovies = options.maxMoviesPerSection || 8;
  const maxSections = options.maxSections || 4;
  const sections: SimilarSection[] = [];

  // If no allMovies provided, fetch from database
  let otherMovies: Movie[] = [];
  
  if (!allMovies || allMovies.length === 0) {
    const supabase = getSupabase();
    
    // Fetch movies by director, hero, genre in parallel
    const promises: Promise<Movie[]>[] = [];
    
    // Helper to check if valid UUID
    const isValidUUID = (id: string | undefined) => 
      id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const movieId = movie.id;
    
    // Same director movies
    if (movie.director) {
      let query = supabase
        .from('movies')
        .select('id, title_en, title_te, slug, poster_url, release_year, genres, avg_rating, our_rating, hero, director, runtime_minutes')
        .eq('is_published', true)
        .eq('director', movie.director);
      
      if (isValidUUID(movieId)) {
        query = query.neq('id', movieId!);
      }
      
      promises.push(
        Promise.resolve(
          query
            .order('our_rating', { ascending: false, nullsFirst: false })
            .limit(maxMovies)
            .then(({ data }) => (data || []) as Movie[])
        )
      );
    }
    
    // Same hero movies
    if (movie.hero) {
      let query = supabase
        .from('movies')
        .select('id, title_en, title_te, slug, poster_url, release_year, genres, avg_rating, our_rating, hero, director, runtime_minutes')
        .eq('is_published', true)
        .eq('hero', movie.hero);
      
      if (isValidUUID(movieId)) {
        query = query.neq('id', movieId!);
      }
      
      promises.push(
        Promise.resolve(
          query
            .order('our_rating', { ascending: false, nullsFirst: false })
            .limit(maxMovies)
            .then(({ data }) => (data || []) as Movie[])
        )
      );
    }
    
    // Same genre movies
    if (movie.genres && movie.genres.length > 0) {
      let query = supabase
        .from('movies')
        .select('id, title_en, title_te, slug, poster_url, release_year, genres, avg_rating, our_rating, hero, director, runtime_minutes')
        .eq('is_published', true)
        .contains('genres', [movie.genres[0]]);
      
      if (isValidUUID(movieId)) {
        query = query.neq('id', movieId!);
      }
      
      promises.push(
        Promise.resolve(
          query
            .order('our_rating', { ascending: false, nullsFirst: false })
            .limit(maxMovies * 2)
            .then(({ data }) => (data || []) as Movie[])
        )
      );
    }
    
    // Same era movies
    if (movie.release_year) {
      const decade = Math.floor(movie.release_year / 10) * 10;
      let query = supabase
        .from('movies')
        .select('id, title_en, title_te, slug, poster_url, release_year, genres, avg_rating, our_rating, hero, director, runtime_minutes')
        .eq('is_published', true)
        .gte('release_year', decade)
        .lt('release_year', decade + 10);
      
      if (isValidUUID(movieId)) {
        query = query.neq('id', movieId!);
      }
      
      promises.push(
        Promise.resolve(
          query
            .order('our_rating', { ascending: false, nullsFirst: false })
            .limit(maxMovies * 2)
            .then(({ data }) => (data || []) as Movie[])
        )
      );
    }
    
    // Fetch all in parallel
    const results = await Promise.all(promises);
    
    // Build sections directly from results
    let resultIndex = 0;
    
    // Director section
    if (movie.director && results[resultIndex]) {
      const directorMovies = results[resultIndex];
      if (directorMovies.length > 0) {
        sections.push({
          id: 'director',
          title: `More from ${movie.director}`,
          title_te: `${movie.director} మరిన్ని చిత్రాలు`,
          reason: 'same-director',
          movies: directorMovies.map(m => ({
            ...m,
            similarity_score: 90,
            similarity_reason: `Same director: ${movie.director}`,
          })),
          icon: '🎬',
          matchType: 'director',
          priority: 1,
        });
      }
      resultIndex++;
    }
    
    // Hero section
    if (movie.hero && results[resultIndex]) {
      const heroMovies = results[resultIndex];
      if (heroMovies.length > 0) {
        sections.push({
          id: 'hero',
          title: `More ${movie.hero} Movies`,
          title_te: `${movie.hero} మరిన్ని సినిమాలు`,
          reason: 'same-hero',
          movies: heroMovies.map(m => ({
            ...m,
            similarity_score: 85,
            similarity_reason: `Same lead: ${movie.hero}`,
          })),
          icon: '⭐',
          matchType: 'hero',
          priority: 2,
        });
      }
      resultIndex++;
    }
    
    // Genre section
    if (movie.genres && movie.genres.length > 0 && results[resultIndex]) {
      const genreMovies = results[resultIndex];
      const primaryGenre = movie.genres[0];
      // Filter out movies already in previous sections
      const usedIds = new Set(sections.flatMap(s => s.movies.map(m => m.id)));
      const uniqueGenreMovies = genreMovies.filter(m => !usedIds.has(m.id)).slice(0, maxMovies);
      
      if (uniqueGenreMovies.length > 0) {
        sections.push({
          id: 'genre',
          title: `More ${primaryGenre} Movies`,
          title_te: `మరిన్ని ${primaryGenre} సినిమాలు`,
          reason: 'same-genre',
          movies: uniqueGenreMovies.map(m => ({
            ...m,
            similarity_score: 70,
            similarity_reason: `${primaryGenre} movie`,
          })),
          icon: '🎭',
          matchType: 'genre',
          priority: 3,
        });
      }
      resultIndex++;
    }
    
    // Era section
    if (movie.release_year && results[resultIndex]) {
      const eraMovies = results[resultIndex];
      const decade = Math.floor(movie.release_year / 10) * 10;
      // Filter out movies already in previous sections
      const usedIds = new Set(sections.flatMap(s => s.movies.map(m => m.id)));
      const uniqueEraMovies = eraMovies.filter(m => !usedIds.has(m.id)).slice(0, maxMovies);
      
      if (uniqueEraMovies.length > 0) {
        sections.push({
          id: 'era',
          title: `Best of ${decade}s`,
          title_te: `${decade}ల ఉత్తమ చిత్రాలు`,
          reason: 'same-era',
          movies: uniqueEraMovies.map(m => ({
            ...m,
            similarity_score: 60,
            similarity_reason: `${decade}s movie`,
          })),
          icon: '📅',
          matchType: 'era',
          priority: 4,
        });
      }
    }
    
    return sections.slice(0, maxSections);
  }

  // If allMovies provided, use in-memory filtering (original logic)
  otherMovies = allMovies.filter(m => m.id !== movie.id);

  // Section 1: Same Director
  if (movie.director) {
    const directorMovies = otherMovies
      .filter(m => m.director === movie.director)
      .slice(0, maxMovies)
      .map(m => ({
        ...m,
        similarity_score: 90,
        similarity_reason: `Same director: ${movie.director}`,
      }));

    if (directorMovies.length > 0) {
      sections.push({
        id: 'director',
        title: `More from ${movie.director}`,
        title_te: `${movie.director} మరిన్ని చిత్రాలు`,
        reason: 'same-director',
        movies: directorMovies,
        icon: '🎬',
        matchType: 'director',
        priority: 1,
      });
    }
  }

  // Section 2: Same Hero
  if (movie.hero) {
    const heroMovies = otherMovies
      .filter(m => m.hero === movie.hero)
      .slice(0, maxMovies)
      .map(m => ({
        ...m,
        similarity_score: 85,
        similarity_reason: `Same lead: ${movie.hero}`,
      }));

    if (heroMovies.length > 0) {
      sections.push({
        id: 'hero',
        title: `More ${movie.hero} Movies`,
        title_te: `${movie.hero} మరిన్ని సినిమాలు`,
        reason: 'same-hero',
        movies: heroMovies,
        icon: '⭐',
        matchType: 'hero',
        priority: 2,
      });
    }
  }

  // Section 3: Same Genre
  if (movie.genres && movie.genres.length > 0) {
    const primaryGenre = movie.genres[0];
    const genreMovies = otherMovies
      .filter(m => m.genres?.includes(primaryGenre))
      .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
      .slice(0, maxMovies)
      .map(m => ({
        ...m,
        similarity_score: 70,
        similarity_reason: `${primaryGenre} movie`,
      }));

    if (genreMovies.length > 0) {
      sections.push({
        id: 'genre',
        title: `More ${primaryGenre} Movies`,
        title_te: `మరిన్ని ${primaryGenre} సినిమాలు`,
        reason: 'same-genre',
        movies: genreMovies,
        icon: '🎭',
        matchType: 'genre',
        priority: 3,
      });
    }
  }

  // Section 4: Same Era
  if (movie.release_year) {
    const decade = Math.floor(movie.release_year / 10) * 10;
    const eraMovies = otherMovies
      .filter(m => m.release_year && Math.floor(m.release_year / 10) * 10 === decade)
      .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
      .slice(0, maxMovies)
      .map(m => ({
        ...m,
        similarity_score: 60,
        similarity_reason: `${decade}s movie`,
      }));

    if (eraMovies.length > 0) {
      sections.push({
        id: 'era',
        title: `Best of ${decade}s`,
        title_te: `${decade}ల ఉత్తమ చిత్రాలు`,
        reason: 'same-era',
        movies: eraMovies,
        icon: '📅',
        matchType: 'era',
        priority: 4,
      });
    }
  }

  return sections.slice(0, maxSections);
}

/**
 * Apply visual confidence boost to sections
 * Sections with verified archival images get boosted in display
 */
export function applyVisualConfidenceBoost(
  sections: SimilarSection[],
  visualData?: { movieId: string; confidence: number; hasArchival: boolean }[]
): SimilarSectionWithVisual[] {
  if (!visualData || visualData.length === 0) {
    return sections.map(s => ({ ...s, visualConfidence: 0.5, hasArchivalImages: false }));
  }

  const visualMap = new Map(visualData.map(v => [v.movieId, v]));

  return sections.map(section => {
    const moviesWithVisual = section.movies.map(movie => {
      const visual = visualMap.get(movie.id);
      return {
        ...movie,
        visualConfidence: visual?.confidence || 0.5,
        hasArchivalImages: visual?.hasArchival || false,
      };
    });

    // Calculate section-level visual confidence
    const avgConfidence =
      moviesWithVisual.reduce((sum, m) => sum + (m.visualConfidence || 0.5), 0) /
      moviesWithVisual.length;

    const hasArchival = moviesWithVisual.some(m => m.hasArchivalImages);

    return {
      ...section,
      movies: moviesWithVisual,
      visualConfidence: avgConfidence,
      hasArchivalImages: hasArchival,
    };
  });
}

/**
 * Get quick similar movies without sections
 */
export function getQuickSimilar(
  movie: Movie,
  allMovies: Movie[],
  limit = 6
): SimilarMovie[] {
  const otherMovies = allMovies.filter(m => m.id !== movie.id);

  return otherMovies
    .map(m => ({
      ...m,
      similarity_score: calculateSimilarity(movie, m),
      similarity_reason: 'overall-similarity',
    }))
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);
}

