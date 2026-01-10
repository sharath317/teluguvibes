/**
 * Reviews Sections API
 * 
 * Provides movie sections for the reviews page:
 * - Recently Released
 * - Trending
 * - Hidden Gems
 * - Blockbusters
 * - Classics
 * - Genre-based sections
 * - Star spotlights
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MovieCard {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  release_year?: number;
  release_date?: string;
  genres: string[];
  director?: string;
  hero?: string;
  avg_rating: number;
  our_rating?: number;
  total_reviews: number;
  is_classic?: boolean;
  is_blockbuster?: boolean;
  is_underrated?: boolean;
}

interface Section {
  id: string;
  title: string;
  title_te?: string;
  type: string;
  movies: MovieCard[];
  viewAllLink?: string;
  priority: number;
  isVisible: boolean;
}

interface Spotlight {
  id: string;
  type: 'hero' | 'heroine' | 'director';
  name: string;
  name_te?: string;
  image_url?: string;
  movies: MovieCard[];
  total_movies: number;
  avg_rating: number;
  link: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'initial';
  const language = searchParams.get('language') || 'Telugu';
  const search = searchParams.get('search');

  // Handle search
  if (search) {
    return handleSearch(search, language);
  }

  // Handle sections
  if (mode === 'initial') {
    return getInitialSections(language);
  } else {
    return getLazySections(language);
  }
}

async function handleSearch(query: string, language: string) {
  try {
    // Search movies
    const { data: movies } = await supabase
      .from('movies')
      .select('id, title_en, title_te, slug, poster_url, release_year, director, hero')
      .or(`title_en.ilike.%${query}%,title_te.ilike.%${query}%,director.ilike.%${query}%,hero.ilike.%${query}%`)
      .eq('language', language)
      .limit(10);

    const results = (movies || []).map(m => ({
      type: 'movie' as const,
      id: m.id,
      title: m.title_en,
      subtitle: `${m.release_year || ''} • ${m.director || ''}`,
      image_url: m.poster_url,
      link: `/reviews/${m.slug}`,
    }));

    // Also search for actors/directors if query matches
    const uniqueDirectors = [...new Set((movies || []).map(m => m.director).filter(Boolean))];
    const uniqueActors = [...new Set((movies || []).map(m => m.hero).filter(Boolean))];

    const actorResults = uniqueActors.slice(0, 3).map(name => ({
      type: 'actor' as const,
      id: `actor-${name}`,
      title: name!,
      subtitle: 'Actor',
      link: `/reviews?actor=${encodeURIComponent(name!)}`,
    }));

    const directorResults = uniqueDirectors.slice(0, 3).map(name => ({
      type: 'director' as const,
      id: `director-${name}`,
      title: name!,
      subtitle: 'Director',
      link: `/reviews?director=${encodeURIComponent(name!)}`,
    }));

    return NextResponse.json({
      results: [...results, ...actorResults, ...directorResults],
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }
}

async function getInitialSections(language: string): Promise<NextResponse> {
  try {
    const sections: Section[] = [];
    const currentYear = new Date().getFullYear();

    // 1. Recently Released (this year)
    const { data: recentMovies } = await supabase
      .from('movies')
      .select('*')
      .eq('language', language)
      .gte('release_year', currentYear - 1)
      .order('release_date', { ascending: false })
      .limit(12);

    if (recentMovies && recentMovies.length > 0) {
      sections.push({
        id: 'recently-released',
        title: 'Recently Released',
        title_te: 'ఇటీవల విడుదలైనవి',
        type: 'recently_released',
        movies: mapMovies(recentMovies),
        viewAllLink: '/reviews?year=' + currentYear,
        priority: 1,
        isVisible: true,
      });
    }

    // 2. Top Rated
    const { data: topRated } = await supabase
      .from('movies')
      .select('*')
      .eq('language', language)
      .not('our_rating', 'is', null)
      .order('our_rating', { ascending: false })
      .limit(12);

    if (topRated && topRated.length > 0) {
      sections.push({
        id: 'top-rated',
        title: 'Top Rated',
        title_te: 'అత్యుత్తమ రేటింగ్',
        type: 'recommended',
        movies: mapMovies(topRated),
        viewAllLink: '/reviews?sort=rating',
        priority: 2,
        isVisible: true,
      });
    }

    // 3. Hidden Gems (underrated)
    const { data: hiddenGems } = await supabase
      .from('movies')
      .select('*')
      .eq('language', language)
      .eq('is_underrated', true)
      .order('our_rating', { ascending: false })
      .limit(12);

    if (hiddenGems && hiddenGems.length > 0) {
      sections.push({
        id: 'hidden-gems',
        title: 'Hidden Gems',
        title_te: 'దాగిన రత్నాలు',
        type: 'hidden-gems',
        movies: mapMovies(hiddenGems),
        viewAllLink: '/reviews?underrated=true',
        priority: 3,
        isVisible: true,
      });
    }

    return NextResponse.json({
      sections,
      spotlights: [],
      hasMore: true,
    });
  } catch (error) {
    console.error('Error fetching initial sections:', error);
    return NextResponse.json({ sections: [], spotlights: [], hasMore: false });
  }
}

async function getLazySections(language: string): Promise<NextResponse> {
  try {
    const sections: Section[] = [];
    const spotlights: Spotlight[] = [];

    // 4. Blockbusters
    const { data: blockbusters } = await supabase
      .from('movies')
      .select('*')
      .eq('language', language)
      .eq('is_blockbuster', true)
      .order('release_year', { ascending: false })
      .limit(12);

    if (blockbusters && blockbusters.length > 0) {
      sections.push({
        id: 'blockbusters',
        title: 'Blockbusters',
        title_te: 'బ్లాక్‌బస్టర్స్',
        type: 'blockbusters',
        movies: mapMovies(blockbusters),
        viewAllLink: '/reviews?blockbuster=true',
        priority: 4,
        isVisible: true,
      });
    }

    // 5. Classics
    const { data: classics } = await supabase
      .from('movies')
      .select('*')
      .eq('language', language)
      .eq('is_classic', true)
      .order('our_rating', { ascending: false })
      .limit(12);

    if (classics && classics.length > 0) {
      sections.push({
        id: 'classics',
        title: 'Classics',
        title_te: 'క్లాసిక్స్',
        type: 'classics',
        movies: mapMovies(classics),
        viewAllLink: '/reviews?classic=true',
        priority: 5,
        isVisible: true,
      });
    }

    // 6. Action Movies
    const { data: actionMovies } = await supabase
      .from('movies')
      .select('*')
      .eq('language', language)
      .contains('genres', ['Action'])
      .order('our_rating', { ascending: false })
      .limit(12);

    if (actionMovies && actionMovies.length > 0) {
      sections.push({
        id: 'genre-action',
        title: 'Action Movies',
        title_te: 'యాక్షన్ సినిమాలు',
        type: 'genre',
        movies: mapMovies(actionMovies),
        viewAllLink: '/reviews?genre=Action',
        priority: 6,
        isVisible: true,
      });
    }

    // 7. Drama Movies
    const { data: dramaMovies } = await supabase
      .from('movies')
      .select('*')
      .eq('language', language)
      .contains('genres', ['Drama'])
      .order('our_rating', { ascending: false })
      .limit(12);

    if (dramaMovies && dramaMovies.length > 0) {
      sections.push({
        id: 'genre-drama',
        title: 'Drama Movies',
        title_te: 'డ్రామా సినిమాలు',
        type: 'genre',
        movies: mapMovies(dramaMovies),
        viewAllLink: '/reviews?genre=Drama',
        priority: 7,
        isVisible: true,
      });
    }

    // Get Star Spotlights (top actors)
    const { data: allMovies } = await supabase
      .from('movies')
      .select('hero, our_rating, poster_url, title_en, slug, release_year, id')
      .eq('language', language)
      .not('hero', 'is', null)
      .order('our_rating', { ascending: false })
      .limit(100);

    if (allMovies && allMovies.length > 0) {
      // Group by hero
      const heroMovies: Record<string, typeof allMovies> = {};
      allMovies.forEach(m => {
        if (m.hero) {
          if (!heroMovies[m.hero]) heroMovies[m.hero] = [];
          heroMovies[m.hero].push(m);
        }
      });

      // Get top 6 heroes by movie count
      const topHeroes = Object.entries(heroMovies)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 6);

      topHeroes.forEach(([heroName, movies]) => {
        const avgRating = movies.reduce((sum, m) => sum + (m.our_rating || 0), 0) / movies.length;
        spotlights.push({
          id: `hero-${heroName.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'hero',
          name: heroName,
          image_url: movies[0]?.poster_url, // Use first movie poster as placeholder
          movies: movies.slice(0, 4).map(m => ({
            id: m.id,
            title_en: m.title_en,
            slug: m.slug,
            poster_url: m.poster_url,
            release_year: m.release_year,
            avg_rating: m.our_rating || 0,
            genres: [],
            total_reviews: 0,
          })),
          total_movies: movies.length,
          avg_rating: avgRating,
          link: `/reviews?actor=${encodeURIComponent(heroName)}`,
        });
      });
    }

    return NextResponse.json({
      sections,
      spotlights,
      hasMore: false,
    });
  } catch (error) {
    console.error('Error fetching lazy sections:', error);
    return NextResponse.json({ sections: [], spotlights: [], hasMore: false });
  }
}

function mapMovies(movies: any[]): MovieCard[] {
  return movies.map(m => ({
    id: m.id,
    title_en: m.title_en || m.title,
    title_te: m.title_te,
    slug: m.slug,
    poster_url: m.poster_url,
    release_year: m.release_year,
    release_date: m.release_date,
    genres: m.genres || [],
    director: m.director,
    hero: m.hero,
    avg_rating: m.avg_rating || m.our_rating || 0,
    our_rating: m.our_rating,
    total_reviews: m.total_reviews || 0,
    is_classic: m.is_classic,
    is_blockbuster: m.is_blockbuster,
    is_underrated: m.is_underrated,
  }));
}

