/**
 * REVIEWS SECTION INTELLIGENCE
 * 
 * Auto-generates data-driven sections for the Reviews landing page.
 * Uses existing movie data, ratings, and learning engine.
 * ZERO manual curation - all sections are dynamically computed.
 * 
 * Sections:
 * 1. Recently Released (last 30-60 days)
 * 2. Releasing Soon (upcoming)
 * 3. Trending Reviews (from content_performance)
 * 4. Classics (high-rated, older films)
 * 5. Genre Blocks (auto-generated per genre)
 * 6. Hero/Heroine Spotlight (top performers)
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface MovieCard {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  backdrop_url?: string;
  release_year?: number;
  release_date?: string;
  genres: string[];
  director?: string;
  hero?: string;
  heroine?: string;
  avg_rating: number;
  total_reviews: number;
  is_classic?: boolean;
  is_blockbuster?: boolean;
  is_underrated?: boolean;
}

export interface ReviewSection {
  id: string;
  title: string;
  title_te?: string;
  type: 'recently_released' | 'upcoming' | 'trending' | 'classics' | 'genre' | 'spotlight' | 'custom';
  movies: MovieCard[];
  viewAllLink?: string;
  icon?: string;
  priority: number;       // For ordering
  performanceScore?: number;  // From learning engine
  isVisible: boolean;
}

export interface SpotlightSection {
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

export interface SectionConfig {
  recentDays: number;        // Days for "Recently Released"
  upcomingDays: number;      // Days ahead for "Upcoming"
  classicYearThreshold: number;  // Year cutoff for classics
  classicMinRating: number;  // Min rating for classics
  genreMinMovies: number;    // Min movies for a genre section
  spotlightMinMovies: number; // Min movies for spotlight
  maxMoviesPerSection: number;
}

const DEFAULT_CONFIG: SectionConfig = {
  recentDays: 60,
  upcomingDays: 90,
  classicYearThreshold: 2000,
  classicMinRating: 7.5,
  genreMinMovies: 5,
  spotlightMinMovies: 3,
  maxMoviesPerSection: 12,
};

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

// ============================================================
// SECTION GENERATORS
// ============================================================

/**
 * Recently Released Movies (already released, not future)
 */
export async function getRecentlyReleased(config: SectionConfig = DEFAULT_CONFIG): Promise<ReviewSection> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Get movies that have already been released
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .or(`release_date.lte.${today},and(release_date.is.null,release_year.lte.${currentYear - 1})`)
    .gte('release_year', currentYear - 2)
    .order('release_year', { ascending: false })
    .order('avg_rating', { ascending: false })
    .limit(config.maxMoviesPerSection);

  return {
    id: 'recently-released',
    title: 'Recent Releases',
    title_te: 'ఇటీవల విడుదలైనవి',
    type: 'recently_released',
    movies: (movies || []).map(mapToMovieCard),
    viewAllLink: '/reviews?sortBy=recent',
    icon: '🎬',
    priority: 1,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Upcoming Releases (future releases - show synopsis not review)
 */
export async function getUpcoming(config: SectionConfig = DEFAULT_CONFIG): Promise<ReviewSection> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Get movies with future release dates OR next year without date
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, synopsis')
    .eq('is_published', true)
    .or(`release_date.gt.${today},and(release_date.is.null,release_year.gt.${currentYear})`)
    .order('release_date', { ascending: true, nullsFirst: false })
    .limit(config.maxMoviesPerSection);

  // Map with isUpcoming flag for special rendering
  const upcomingMovies = (movies || []).map(m => ({
    ...mapToMovieCard(m),
    isUpcoming: true,
    synopsis: m.synopsis,
    release_date: m.release_date,
  }));

  return {
    id: 'upcoming',
    title: 'Coming Soon',
    title_te: 'త్వరలో వస్తున్నవి',
    type: 'upcoming',
    movies: upcomingMovies,
    viewAllLink: '/reviews?upcoming=true',
    icon: '📅',
    priority: 2,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Trending Reviews (based on rating and reviews)
 */
export async function getTrending(): Promise<ReviewSection> {
  const supabase = getSupabaseClient();

  // Get popular movies sorted by rating and reviews
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .not('avg_rating', 'is', null)
    .order('avg_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .limit(12);

  return {
    id: 'trending',
    title: 'Top Rated',
    title_te: 'టాప్ రేటెడ్',
    type: 'trending',
    movies: (movies || []).map(mapToMovieCard),
    viewAllLink: '/reviews?sortBy=rating',
    icon: '🔥',
    priority: 3,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Classics (older films before 2010)
 */
export async function getClassics(config: SectionConfig = DEFAULT_CONFIG): Promise<ReviewSection> {
  const supabase = getSupabaseClient();

  // Get movies tagged as classics
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, is_classic')
    .eq('is_published', true)
    .eq('is_classic', true)
    .order('release_year', { ascending: false })
    .limit(config.maxMoviesPerSection);

  return {
    id: 'classics',
    title: 'Telugu Classics',
    title_te: 'క్లాసిక్స్',
    type: 'classics',
    movies: (movies || []).map(m => ({ ...mapToMovieCard(m), is_classic: true })),
    viewAllLink: '/reviews?classic=true',
    icon: '⭐',
    priority: 5,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Blockbusters (big-budget, star-studded hits)
 */
export async function getBlockbusters(): Promise<ReviewSection> {
  const supabase = getSupabaseClient();

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('is_blockbuster', true)
    .order('avg_rating', { ascending: false })
    .limit(12);

  return {
    id: 'blockbusters',
    title: 'Blockbusters',
    title_te: 'బ్లాక్‌బస్టర్లు',
    type: 'blockbusters',
    movies: (movies || []).map(m => ({ ...mapToMovieCard(m), is_blockbuster: true })),
    viewAllLink: '/reviews?blockbuster=true',
    icon: '🏆',
    priority: 4,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Hidden Gems (underrated movies worth discovering)
 */
export async function getHiddenGems(): Promise<ReviewSection> {
  const supabase = getSupabaseClient();

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .eq('is_underrated', true)
    .order('avg_rating', { ascending: false })
    .limit(12);

  return {
    id: 'hidden-gems',
    title: 'Hidden Gems',
    title_te: 'దాగిన రత్నాలు',
    type: 'hidden-gems',
    movies: (movies || []).map(m => ({ ...mapToMovieCard(m), is_underrated: true })),
    viewAllLink: '/reviews?underrated=true',
    icon: '💎',
    priority: 6,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Cult Classics (movies with cult following)
 */
export async function getCultClassics(): Promise<ReviewSection> {
  const supabase = getSupabaseClient();

  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews, tags')
    .eq('is_published', true)
    .contains('tags', ['cult-classic'])
    .order('release_year', { ascending: false })
    .limit(12);

  return {
    id: 'cult-classics',
    title: 'Cult Classics',
    title_te: 'కల్ట్ క్లాసిక్స్',
    type: 'cult-classics',
    movies: (movies || []).map(mapToMovieCard),
    viewAllLink: '/reviews?tag=cult-classic',
    icon: '🎭',
    priority: 7,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Most Recommended - rotating selection of highly rated classic and modern films
 */
export async function getMostRecommended(): Promise<ReviewSection> {
  const supabase = getSupabaseClient();

  // Get a mix of highly rated classics and modern hits
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .not('avg_rating', 'is', null)
    .gte('avg_rating', 7)
    .order('avg_rating', { ascending: false })
    .limit(24);

  // Shuffle to create rotation effect
  const shuffled = (movies || []).sort(() => Math.random() - 0.5).slice(0, 12);

  return {
    id: 'most-recommended',
    title: 'Most Recommended',
    title_te: 'సిఫారసు చేయబడినవి',
    type: 'recommended',
    movies: shuffled.map(mapToMovieCard),
    viewAllLink: '/reviews?sortBy=rating&minRating=7',
    icon: '⭐',
    priority: 3.5,
    isVisible: (movies?.length || 0) >= 1,
  };
}

/**
 * Genre-based sections (auto-generated)
 */
export async function getGenreSections(config: SectionConfig = DEFAULT_CONFIG): Promise<ReviewSection[]> {
  const supabase = getSupabaseClient();
  
  const PRIORITY_GENRES = [
    { genre: 'Action', title: 'Action Entertainers', title_te: 'యాక్షన్', icon: '💥' },
    { genre: 'Drama', title: 'Family Dramas', title_te: 'డ్రామా', icon: '🎭' },
    { genre: 'Thriller', title: 'Thriller Picks', title_te: 'థ్రిల్లర్', icon: '🔪' },
    { genre: 'Romance', title: 'Romantic Films', title_te: 'రొమాన్స్', icon: '❤️' },
    { genre: 'Comedy', title: 'Comedy Hits', title_te: 'కామెడీ', icon: '😂' },
    { genre: 'Horror', title: 'Horror & Supernatural', title_te: 'హారర్', icon: '👻' },
    { genre: 'Crime', title: 'Crime Thrillers', title_te: 'క్రైమ్', icon: '🔍' },
    { genre: 'Family', title: 'Family Entertainment', title_te: 'ఫ్యామిలీ', icon: '👨‍👩‍👧‍👦' },
  ];

  const sections: ReviewSection[] = [];
  let priority = 10;

  for (const { genre, title, title_te, icon } of PRIORITY_GENRES) {
    const { data: movies } = await supabase
      .from('movies')
      .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
      .eq('is_published', true)
      .contains('genres', [genre])
      .order('avg_rating', { ascending: false })
      .limit(config.maxMoviesPerSection);

    if ((movies?.length || 0) >= 1) {
      sections.push({
        id: `genre-${genre.toLowerCase()}`,
        title,
        title_te,
        type: 'genre',
        movies: (movies || []).map(mapToMovieCard),
        viewAllLink: `/reviews?genre=${genre}`,
        icon,
        priority: priority++,
        isVisible: true,
      });
    }
  }

  return sections;
}

/**
 * Hero/Heroine Spotlight sections
 */
export async function getSpotlightSections(config: SectionConfig = DEFAULT_CONFIG): Promise<SpotlightSection[]> {
  const supabase = getSupabaseClient();
  const spotlights: SpotlightSection[] = [];

  // Get top heroes by movie count and rating
  const { data: heroStats } = await supabase
    .from('movies')
    .select('hero')
    .eq('is_published', true)
    .not('hero', 'is', null);

  const heroCounts = new Map<string, number>();
  for (const m of heroStats || []) {
    if (m.hero) {
      heroCounts.set(m.hero, (heroCounts.get(m.hero) || 0) + 1);
    }
  }

  // Get top 3 heroes with most movies
  const topHeroes = Array.from(heroCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [heroName, count] of topHeroes) {
    if (count >= 1) {
      const { data: movies } = await supabase
        .from('movies')
        .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
        .eq('is_published', true)
        .eq('hero', heroName)
        .order('avg_rating', { ascending: false })
        .limit(8);

      const avgRating = movies?.reduce((sum, m) => sum + (m.avg_rating || 0), 0) / (movies?.length || 1);

      // Try to get celebrity image
      const { data: celeb } = await supabase
        .from('celebrities')
        .select('profile_image, name_te')
        .ilike('name_en', heroName)
        .single();

      spotlights.push({
        id: `hero-${heroName.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'hero',
        name: heroName,
        name_te: celeb?.name_te,
        image_url: celeb?.profile_image,
        movies: (movies || []).map(mapToMovieCard),
        total_movies: count,
        avg_rating: avgRating,
        link: `/reviews?actor=${encodeURIComponent(heroName)}`,
      });
    }
  }

  // Similar for heroines
  const { data: heroineStats } = await supabase
    .from('movies')
    .select('heroine')
    .eq('is_published', true)
    .not('heroine', 'is', null);

  const heroineCounts = new Map<string, number>();
  for (const m of heroineStats || []) {
    if (m.heroine) {
      heroineCounts.set(m.heroine, (heroineCounts.get(m.heroine) || 0) + 1);
    }
  }

  const topHeroines = Array.from(heroineCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  for (const [heroineName, count] of topHeroines) {
    if (count >= 1) {
      const { data: movies } = await supabase
        .from('movies')
        .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
        .eq('is_published', true)
        .eq('heroine', heroineName)
        .order('avg_rating', { ascending: false })
        .limit(8);

      const avgRating = movies?.reduce((sum, m) => sum + (m.avg_rating || 0), 0) / (movies?.length || 1);

      const { data: celeb } = await supabase
        .from('celebrities')
        .select('profile_image, name_te')
        .ilike('name_en', heroineName)
        .single();

      spotlights.push({
        id: `heroine-${heroineName.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'heroine',
        name: heroineName,
        name_te: celeb?.name_te,
        image_url: celeb?.profile_image,
        movies: (movies || []).map(mapToMovieCard),
        total_movies: count,
        avg_rating: avgRating,
        link: `/reviews?actor=${encodeURIComponent(heroineName)}`,
      });
    }
  }

  return spotlights;
}

/**
 * Get all sections for the Reviews page
 */
export async function getAllReviewSections(config: SectionConfig = DEFAULT_CONFIG): Promise<{
  sections: ReviewSection[];
  spotlights: SpotlightSection[];
}> {
  const [
    recentlyReleased,
    upcoming,
    trending,
    mostRecommended,
    blockbusters,
    hiddenGems,
    classics,
    cultClassics,
    genreSections,
    spotlights,
  ] = await Promise.all([
    getRecentlyReleased(config),
    getUpcoming(config),
    getTrending(),
    getMostRecommended(),
    getBlockbusters(),
    getHiddenGems(),
    getClassics(config),
    getCultClassics(),
    getGenreSections(config),
    getSpotlightSections(config),
  ]);

  // Combine and sort by priority
  const allSections = [
    recentlyReleased,
    upcoming,
    trending,
    mostRecommended,
    blockbusters,
    hiddenGems,
    classics,
    cultClassics,
    ...genreSections,
  ].filter(s => s.isVisible);

  // Sort by priority (can be reordered by learning engine later)
  allSections.sort((a, b) => a.priority - b.priority);

  return {
    sections: allSections,
    spotlights,
  };
}

// ============================================================
// UNIFIED SEARCH
// ============================================================

export interface SearchResult {
  type: 'movie' | 'actor' | 'director' | 'genre';
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  link: string;
  score: number;
}

/**
 * Unified search across movies, actors, directors
 */
export async function unifiedSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const supabase = getSupabaseClient();
  const results: SearchResult[] = [];
  const searchTerm = `%${query}%`;

  // Search movies
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, director, release_year')
    .eq('is_published', true)
    .or(`title_en.ilike.${searchTerm},title_te.ilike.${searchTerm}`)
    .limit(limit);

  for (const m of movies || []) {
    results.push({
      type: 'movie',
      id: m.id,
      title: m.title_en,
      subtitle: `${m.release_year} • ${m.director || 'Unknown Director'}`,
      image_url: m.poster_url,
      link: `/reviews/${m.slug}`,
      score: 100,
    });
  }

  // Search by director
  const { data: directorMovies } = await supabase
    .from('movies')
    .select('director')
    .eq('is_published', true)
    .ilike('director', searchTerm)
    .limit(5);

  const directors = [...new Set((directorMovies || []).map(m => m.director).filter(Boolean))];
  for (const director of directors.slice(0, 3)) {
    results.push({
      type: 'director',
      id: `director-${director}`,
      title: director!,
      subtitle: 'Director',
      link: `/reviews?director=${encodeURIComponent(director!)}`,
      score: 80,
    });
  }

  // Search by actor (hero/heroine)
  const { data: actorMovies } = await supabase
    .from('movies')
    .select('hero, heroine')
    .eq('is_published', true)
    .or(`hero.ilike.${searchTerm},heroine.ilike.${searchTerm}`)
    .limit(10);

  const actors = new Set<string>();
  for (const m of actorMovies || []) {
    if (m.hero && m.hero.toLowerCase().includes(query.toLowerCase())) actors.add(m.hero);
    if (m.heroine && m.heroine.toLowerCase().includes(query.toLowerCase())) actors.add(m.heroine);
  }

  for (const actor of Array.from(actors).slice(0, 3)) {
    results.push({
      type: 'actor',
      id: `actor-${actor}`,
      title: actor,
      subtitle: 'Actor',
      link: `/reviews?actor=${encodeURIComponent(actor)}`,
      score: 75,
    });
  }

  // Search genres
  const GENRES = ['Action', 'Drama', 'Romance', 'Comedy', 'Thriller', 'Horror', 'Fantasy', 'Crime', 'Period', 'Family'];
  const matchingGenres = GENRES.filter(g => g.toLowerCase().includes(query.toLowerCase()));
  for (const genre of matchingGenres.slice(0, 2)) {
    results.push({
      type: 'genre',
      id: `genre-${genre}`,
      title: genre,
      subtitle: 'Genre',
      link: `/reviews?genre=${genre}`,
      score: 60,
    });
  }

  // Sort by score and limit
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ============================================================
// MOVIE DETAIL CONTEXTUAL SECTIONS
// ============================================================

/**
 * Get contextual sections for a movie detail page
 */
export async function getMovieContextSections(movieId: string): Promise<{
  similarMovies: MovieCard[];
  sameActor: MovieCard[];
  sameDirector: MovieCard[];
  relatedClassics: MovieCard[];
}> {
  const supabase = getSupabaseClient();

  // Get the movie first
  const { data: movie } = await supabase
    .from('movies')
    .select('*')
    .eq('id', movieId)
    .single();

  if (!movie) {
    return { similarMovies: [], sameActor: [], sameDirector: [], relatedClassics: [] };
  }

  // Similar movies (same genre + high rating)
  const { data: similar } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .neq('id', movieId)
    .overlaps('genres', movie.genres || [])
    .order('avg_rating', { ascending: false })
    .limit(6);

  // Same actor movies
  let sameActorMovies: MovieCard[] = [];
  if (movie.hero) {
    const { data } = await supabase
      .from('movies')
      .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
      .eq('is_published', true)
      .eq('hero', movie.hero)
      .neq('id', movieId)
      .order('avg_rating', { ascending: false })
      .limit(6);
    sameActorMovies = (data || []).map(mapToMovieCard);
  }

  // Same director movies
  let sameDirectorMovies: MovieCard[] = [];
  if (movie.director) {
    const { data } = await supabase
      .from('movies')
      .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
      .eq('is_published', true)
      .eq('director', movie.director)
      .neq('id', movieId)
      .order('avg_rating', { ascending: false })
      .limit(6);
    sameDirectorMovies = (data || []).map(mapToMovieCard);
  }

  // Related classics (same genre, older, high-rated)
  const { data: classics } = await supabase
    .from('movies')
    .select('id, title_en, title_te, slug, poster_url, release_year, release_date, genres, director, hero, heroine, avg_rating, total_reviews')
    .eq('is_published', true)
    .neq('id', movieId)
    .overlaps('genres', movie.genres || [])
    .lte('release_year', 2000)
    .gte('avg_rating', 7.5)
    .order('avg_rating', { ascending: false })
    .limit(6);

  return {
    similarMovies: (similar || []).map(mapToMovieCard),
    sameActor: sameActorMovies,
    sameDirector: sameDirectorMovies,
    relatedClassics: (classics || []).map(mapToMovieCard),
  };
}

// ============================================================
// HELPERS
// ============================================================

function mapToMovieCard(movie: any): MovieCard {
  return {
    id: movie.id,
    title_en: movie.title_en,
    title_te: movie.title_te,
    slug: movie.slug,
    poster_url: movie.poster_url,
    backdrop_url: movie.backdrop_url,
    release_year: movie.release_year,
    release_date: movie.release_date,
    genres: movie.genres || [],
    director: movie.director,
    hero: movie.hero,
    heroine: movie.heroine,
    avg_rating: movie.avg_rating || 0,
    total_reviews: movie.total_reviews || 0,
    is_classic: movie.is_classic,
    is_blockbuster: movie.is_blockbuster,
    is_underrated: movie.is_underrated,
  };
}

