'use client';

/**
 * REVIEWS LANDING PAGE
 * 
 * Smart, editorial-style discovery hub with:
 * - Auto-generated sections (Recently Released, Trending, Classics, Genre blocks)
 * - Unified search across movies/actors/directors
 * - Hero/Heroine spotlights
 * - ZERO manual curation - all data-driven
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star, Filter, Search, ChevronDown, ChevronRight, Film, Calendar,
  ThumbsUp, Award, Gem, Clock, X, TrendingUp, Sparkles, User
} from 'lucide-react';
import type { Movie, Genre, ReviewFilters } from '@/types/reviews';
import { HorizontalCarousel } from '@/components/ui/HorizontalCarousel';

// ============================================================
// TYPES
// ============================================================

interface MovieCard {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  poster_url?: string;
  release_year?: number;
  genres: string[];
  director?: string;
  hero?: string;
  avg_rating: number;
  total_reviews: number;
  is_classic?: boolean;
  is_blockbuster?: boolean;
  is_underrated?: boolean;
}

interface ReviewSection {
  id: string;
  title: string;
  title_te?: string;
  type: string;
  movies: MovieCard[];
  viewAllLink?: string;
  icon?: string;
  priority: number;
  isVisible: boolean;
}

interface SpotlightSection {
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

interface SearchResult {
  type: 'movie' | 'actor' | 'director' | 'genre';
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  link: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const GENRES: Genre[] = [
  'Action', 'Drama', 'Romance', 'Comedy', 'Thriller',
  'Horror', 'Fantasy', 'Crime', 'Family', 'Mystery',
];

const LANGUAGES = [
  { code: 'Telugu', label: 'తెలుగు', icon: '🎬', primary: true },
  { code: 'Hindi', label: 'హిందీ', icon: '🇮🇳', primary: false },
  { code: 'Tamil', label: 'తమిళం', icon: '🎭', primary: false },
  { code: 'Malayalam', label: 'మలయాళం', icon: '🌟', primary: false },
  { code: 'English', label: 'ఇంగ్లీష్', icon: '🎥', primary: false },
  { code: 'Kannada', label: 'కన్నడ', icon: '🎪', primary: false },
];

const YEAR_RANGES = [
  { label: 'All Time', from: 1950, to: 2030 },
  { label: '2020s', from: 2020, to: 2029 },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '90s', from: 1990, to: 1999 },
  { label: 'Classics', from: 1950, to: 1989 },
];

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'recently_released': <Calendar className="w-5 h-5" />,
  'upcoming': <Sparkles className="w-5 h-5" />,
  'trending': <TrendingUp className="w-5 h-5" />,
  'recommended': <ThumbsUp className="w-5 h-5" />,
  'blockbusters': <Award className="w-5 h-5" />,
  'hidden-gems': <Gem className="w-5 h-5" />,
  'classics': <Star className="w-5 h-5" />,
  'cult-classics': <Sparkles className="w-5 h-5" />,
  'genre': <Film className="w-5 h-5" />,
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ReviewsPage() {
  // URL state handling for deep linking
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sections state
  const [sections, setSections] = useState<ReviewSection[]>([]);
  const [spotlights, setSpotlights] = useState<SpotlightSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);

  // Filter/search state
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReviewFilters>({
    sortBy: 'rating',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('Telugu');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [viewMode, setViewMode] = useState<'sections' | 'grid'>('sections');

  const searchRef = useRef<HTMLDivElement>(null);

  // Initialize filters from URL params on mount
  useEffect(() => {
    const actor = searchParams.get('actor');
    const director = searchParams.get('director');
    const genre = searchParams.get('genre');
    const language = searchParams.get('language');
    
    if (actor || director || genre || language) {
      const urlFilters: ReviewFilters = {
        sortBy: 'rating',
        sortOrder: 'desc',
        ...(actor && { actor }),
        ...(director && { director }),
        ...(genre && { genre: genre as Genre }),
      };
      setFilters(urlFilters);
      if (language) setSelectedLanguage(language);
      setViewMode('grid'); // Switch to grid when URL has filters
    }
  }, [searchParams]);

  // Update URL when filters change (for bookmarkable links)
  const updateUrl = useCallback((newFilters: ReviewFilters, mode: 'sections' | 'grid') => {
    if (mode === 'sections') {
      // Clear URL params when going back to sections view
      router.replace('/reviews', { scroll: false });
    } else {
      const params = new URLSearchParams();
      if (newFilters.actor) params.set('actor', newFilters.actor);
      if (newFilters.director) params.set('director', newFilters.director);
      if (newFilters.genre) params.set('genre', newFilters.genre);
      
      const url = params.toString() ? `/reviews?${params.toString()}` : '/reviews';
      router.replace(url, { scroll: false });
    }
  }, [router]);

  // Fetch sections on mount
  useEffect(() => {
    fetchSections();
  }, []);

  // Fetch sections
  const fetchSections = async () => {
    setLoadingSections(true);
    try {
      const res = await fetch('/api/reviews/sections');
      const data = await res.json();
      if (data.sections) {
        setSections(data.sections);
        setSpotlights(data.spotlights || []);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
    setLoadingSections(false);
  };

  // Unified search
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const res = await fetch(`/api/reviews/sections?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch filtered movies when switching to grid view
  const fetchMovies = useCallback(async () => {
    if (viewMode !== 'grid') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.genre) params.set('genre', filters.genre);
      if (filters.actor) params.set('actor', filters.actor);
      if (filters.director) params.set('director', filters.director);
      if (filters.yearRange) {
        params.set('yearFrom', String(filters.yearRange.from));
        params.set('yearTo', String(filters.yearRange.to));
      }
      if (filters.minRating) params.set('minRating', String(filters.minRating));
      if (filters.isUnderrated) params.set('underrated', 'true');
      if (filters.isBlockbuster) params.set('blockbuster', 'true');
      if (filters.isClassic) params.set('classic', 'true');
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (selectedLanguage) params.set('language', selectedLanguage);
      params.set('limit', '30');

      const res = await fetch(`/api/movies?${params}`);
      const data = await res.json();
      setMovies(data.movies || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
    setLoading(false);
  }, [filters, viewMode, selectedLanguage]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const clearFilters = useCallback(() => {
    const defaultFilters: ReviewFilters = { sortBy: 'rating', sortOrder: 'desc' };
    setFilters(defaultFilters);
    setSearchQuery('');
    setViewMode('sections');
    updateUrl(defaultFilters, 'sections'); // Clear URL params
  }, [updateUrl]);

  const applyFilter = useCallback((newFilters: Partial<ReviewFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setViewMode('grid');
    updateUrl(updatedFilters, 'grid'); // Update URL with new filters
  }, [filters, updateUrl]);

  const hasActiveFilters = filters.genre || filters.isUnderrated || filters.isBlockbuster || 
    filters.isClassic || filters.minRating || filters.yearRange || filters.actor || filters.director;

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero Section */}
      <section
        className="relative py-6 px-4"
        style={{ background: 'linear-gradient(180deg, rgba(234,179,8,0.08), transparent)' }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              మూవీ రివ్యూలు
            </h1>
          </div>
          <p className="text-sm max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Discover Telugu cinema. In-depth reviews, smart recommendations, and curated collections.
          </p>
        </div>
      </section>

      {/* Sticky Search & Filters Bar */}
      <section
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          opacity: 0.98
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Unified Search */}
            <div className="relative flex-1 min-w-[180px] max-w-md" ref={searchRef}>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                placeholder="Search movies, actors, directors..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-50"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)'
                  }}
                >
                  {searchResults.map((result) => (
                    <Link
                      key={result.id}
                      href={result.link}
                      className="flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity"
                      style={{ borderBottom: '1px solid var(--border-primary)' }}
                      onClick={() => setShowSearchResults(false)}
                    >
                      {result.image_url ? (
                        <Image
                          src={result.image_url}
                          alt={result.title}
                          width={32}
                          height={48}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div 
                          className="w-8 h-12 rounded flex items-center justify-center"
                          style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          {result.type === 'movie' && <Film className="w-4 h-4" />}
                          {result.type === 'actor' && <User className="w-4 h-4" />}
                          {result.type === 'director' && <Award className="w-4 h-4" />}
                          {result.type === 'genre' && <Sparkles className="w-4 h-4" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {result.title}
                        </p>
                        {result.subtitle && (
                          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <span 
                        className="px-2 py-0.5 text-[10px] rounded-full uppercase"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        {result.type}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Tags */}
            <QuickTag
              active={filters.isUnderrated}
              onClick={() => applyFilter({ isUnderrated: !filters.isUnderrated })}
              icon={<Gem className="w-3.5 h-3.5" />}
              label="Hidden Gems"
              activeColor="purple"
            />

            <QuickTag
              active={filters.isBlockbuster}
              onClick={() => applyFilter({ isBlockbuster: !filters.isBlockbuster })}
              icon={<Award className="w-3.5 h-3.5" />}
              label="Blockbusters"
              activeColor="orange"
            />

            <QuickTag
              active={filters.isClassic}
              onClick={() => applyFilter({ isClassic: !filters.isClassic })}
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Classics"
              activeColor="yellow"
            />

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: showFilters ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                color: showFilters ? 'var(--bg-primary)' : 'var(--text-secondary)',
                border: `1px solid ${showFilters ? 'var(--brand-primary)' : 'var(--border-primary)'}`
              }}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-2 rounded-lg text-xs transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div
              className="mt-3 p-3 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)'
              }}
            >
              <FilterSelect
                label="Genre"
                value={filters.genre || ''}
                onChange={(v) => applyFilter({ genre: v as Genre || undefined })}
                options={[{ value: '', label: 'All Genres' }, ...GENRES.map(g => ({ value: g, label: g }))]}
              />

              <FilterSelect
                label="Era"
                value={filters.yearRange ? `${filters.yearRange.from}-${filters.yearRange.to}` : ''}
                onChange={(v) => {
                  if (!v) {
                    applyFilter({ yearRange: undefined });
                  } else {
                    const [from, to] = v.split('-').map(Number);
                    applyFilter({ yearRange: { from, to } });
                  }
                }}
                options={[
                  { value: '', label: 'All Years' },
                  ...YEAR_RANGES.map(r => ({ value: `${r.from}-${r.to}`, label: r.label }))
                ]}
              />

              <FilterSelect
                label="Min Rating"
                value={filters.minRating?.toString() || ''}
                onChange={(v) => applyFilter({ minRating: v ? parseFloat(v) : undefined })}
                options={[
                  { value: '', label: 'Any Rating' },
                  { value: '9', label: '9+ Masterpiece' },
                  { value: '8', label: '8+ Excellent' },
                  { value: '7', label: '7+ Good' },
                  { value: '6', label: '6+ Average' },
                ]}
              />

              <FilterSelect
                label="Sort By"
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(v) => {
                  const [sortBy, sortOrder] = v.split('-');
                  applyFilter({ sortBy: sortBy as ReviewFilters['sortBy'], sortOrder: sortOrder as ReviewFilters['sortOrder'] });
                }}
                options={[
                  { value: 'rating-desc', label: 'Highest Rated' },
                  { value: 'rating-asc', label: 'Lowest Rated' },
                  { value: 'year-desc', label: 'Newest First' },
                  { value: 'year-asc', label: 'Oldest First' },
                  { value: 'reviews-desc', label: 'Most Reviewed' },
                ]}
              />
            </div>
          )}
        </div>
      </section>

      {/* Language Tabs */}
      <section className="max-w-7xl mx-auto px-4 pt-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide border-b" style={{ borderColor: 'var(--border-primary)' }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                // Clear actor/director filters when switching languages
                const resetFilters: ReviewFilters = { sortBy: 'rating', sortOrder: 'desc' };
                setFilters(resetFilters);
                setSelectedLanguage(lang.code);
                if (lang.code !== 'Telugu') {
                  setViewMode('grid');
                } else {
                  setViewMode('sections');
                }
                // Clear URL params when switching languages
                router.replace('/reviews', { scroll: false });
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                selectedLanguage === lang.code
                  ? 'border-yellow-500'
                  : 'border-transparent hover:border-gray-500'
              }`}
              style={{
                color: selectedLanguage === lang.code ? 'var(--brand-primary)' : 'var(--text-secondary)',
              }}
            >
              <span>{lang.icon}</span>
              <span>{lang.label}</span>
              {lang.primary && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 ml-1">
                  Primary
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Genre Pills (only for Telugu) */}
      {selectedLanguage === 'Telugu' && (
        <section className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <GenrePill
              label="All"
              active={!filters.genre && viewMode === 'sections'}
              onClick={() => {
                clearFilters(); // Clears all filters AND updates URL
              }}
            />
            {GENRES.map((genre) => (
              <GenrePill
                key={genre}
                label={genre}
                active={filters.genre === genre}
                onClick={() => applyFilter({ genre })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Other Language Notice */}
      {selectedLanguage !== 'Telugu' && (
        <section className="max-w-7xl mx-auto px-4 py-3">
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
          >
            <Gem className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Showing only <strong style={{ color: 'var(--text-primary)' }}>top-rated, classics, and hidden gems</strong> from {selectedLanguage} cinema.
              {selectedLanguage !== 'Telugu' && (
                <span className="ml-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  (Quality-curated selection)
                </span>
              )}
            </p>
          </div>
        </section>
      )}

      {/* Main Content */}
      {viewMode === 'sections' ? (
        // Smart Sections View
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-8">
          {loadingSections ? (
            // Loading skeleton
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-6 w-48 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <div key={j} className="aspect-[2/3] rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Quick Links Section - Top 10, Best 10, etc. */}
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Quick Links
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                  {[
                    { label: 'Top 10 Movies', icon: '🏆', link: '/reviews?sort=rating&limit=10' },
                    { label: 'Best of 2024', icon: '⭐', link: '/reviews?year=2024&sort=rating' },
                    { label: 'Hidden Gems', icon: '💎', link: '/reviews/hidden-gems' },
                    { label: 'Blockbusters', icon: '🎬', link: '/reviews/blockbusters' },
                    { label: 'Classics', icon: '🎭', link: '/reviews/classics' },
                    { label: 'Most Watched', icon: '👁️', link: '/reviews?sort=views' },
                  ].map((quickLink) => (
                    <Link
                      key={quickLink.label}
                      href={quickLink.link}
                      className="flex-shrink-0 snap-start flex items-center gap-2 px-4 py-3 rounded-xl transition-transform hover:scale-105"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)'
                      }}
                    >
                      <span className="text-2xl">{quickLink.icon}</span>
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {quickLink.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Hero Spotlights - Horizontal Scroll Carousel */}
              {spotlights.length > 0 && (
                <section>
                  <HorizontalCarousel
                    title="Star Spotlight"
                    titleIcon={<User className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />}
                    gap="md"
                  >
                    {spotlights.slice(0, 12).map((spotlight) => (
                      <SpotlightCard 
                        key={spotlight.id} 
                        spotlight={spotlight}
                        onSelect={(name) => {
                          setFilters({ ...filters, actor: name });
                          setViewMode('grid');
                        }}
                      />
                    ))}
                  </HorizontalCarousel>
                </section>
              )}

              {/* Dynamic Sections */}
              {sections.map((section) => (
                <MovieSection key={section.id} section={section} />
              ))}
            </>
          )}
        </div>
      ) : (
        // Grid View (when filters are active)
        <section className="max-w-7xl mx-auto px-4 py-4">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <Film className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <h3 className="text-lg" style={{ color: 'var(--text-secondary)' }}>No movies found</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Try adjusting your filters</p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {movies.length} movies found
                </p>
                <button
                  onClick={clearFilters}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  ← Back to Discover
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {movies.map((movie) => (
                  <SmallMovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MovieSection({ section }: { section: ReviewSection }) {
  if (section.movies.length === 0) return null;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // For upcoming section, show max 12 items
  // For others, show up to 24 items in 2 rows
  const isUpcoming = section.type === 'upcoming';
  const displayMovies = section.movies.slice(0, isUpcoming ? 12 : 24);
  
  return (
    <section className="relative group/section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--brand-primary)' }}>
            {SECTION_ICONS[section.type] || <Film className="w-5 h-5" />}
          </span>
          {section.title}
          {section.title_te && (
            <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-tertiary)' }}>
              ({section.title_te})
            </span>
          )}
        </h2>
        {section.viewAllLink && (
          <Link
            href={section.viewAllLink}
            className="flex items-center gap-1 text-xs hover:underline"
            style={{ color: 'var(--brand-primary)' }}
          >
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      
      {/* Scroll buttons */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 rounded-r-lg opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      >
        <ChevronRight className="w-5 h-5 text-white rotate-180" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 rounded-l-lg opacity-0 group-hover/section:opacity-100 transition-opacity flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>
      
      {/* Horizontal scroll container with 2 rows */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className={`grid gap-3 ${isUpcoming ? 'grid-rows-1' : 'grid-rows-2'} grid-flow-col auto-cols-[calc(33.333%-8px)] sm:auto-cols-[calc(25%-9px)] md:auto-cols-[calc(16.666%-10px)]`}>
          {displayMovies.map((movie) => (
            isUpcoming ? (
              <UpcomingMovieCard key={movie.id} movie={movie} />
            ) : (
              <SmallMovieCard key={movie.id} movie={movie} />
            )
          ))}
        </div>
      </div>
    </section>
  );
}

function SpotlightCard({ spotlight, onSelect }: { spotlight: SpotlightSection; onSelect?: (name: string) => void }) {
  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(spotlight.name);
    }
  };

  // Generate TMDB-style profile URL if no image
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <button
      onClick={handleClick}
      className="group relative rounded-xl overflow-hidden transition-transform hover:scale-[1.02] text-left w-36 sm:w-40 flex-shrink-0"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="relative aspect-[3/4]">
        {spotlight.image_url ? (
          <Image
            src={spotlight.image_url}
            alt={spotlight.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <span className="text-3xl font-bold text-white">{getInitials(spotlight.name)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-bold text-sm truncate group-hover:text-yellow-500 transition-colors">
            {spotlight.name}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
            <span>{spotlight.total_movies} Movies</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              {spotlight.avg_rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function UpcomingMovieCard({ movie }: { movie: MovieCard & { synopsis?: string; release_date?: string } }) {
  const releaseDate = movie.release_date ? new Date(movie.release_date) : null;
  const formattedDate = releaseDate 
    ? releaseDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : movie.release_year?.toString() || 'TBA';

  return (
    <Link
      href={`/reviews/${movie.slug}`}
      className="group relative rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="relative aspect-[2/3]">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title_en}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))' }}
          >
            <Film className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

        {/* Coming Soon Badge */}
        <div className="absolute top-1.5 left-1.5">
          <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold rounded-full">
            🎬 COMING SOON
          </span>
        </div>

        {/* Release Date */}
        <div
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <Calendar className="w-3 h-3 text-yellow-500" />
          <span className="text-white">{formattedDate}</span>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h3 className="text-white text-xs font-bold truncate group-hover:text-yellow-500 transition-colors">
            {movie.title_en}
          </h3>
          {movie.director && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              Dir: {movie.director}
            </p>
          )}
          {movie.synopsis && (
            <p className="text-[9px] text-gray-500 line-clamp-2 mt-1">
              {movie.synopsis}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function SmallMovieCard({ movie }: { movie: MovieCard | Movie }) {
  const m = movie as MovieCard;
  return (
    <Link
      href={`/reviews/${m.slug}`}
      className="group relative rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="relative aspect-[2/3]">
        {m.poster_url ? (
          <Image
            src={m.poster_url}
            alt={m.title_en}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))' }}
          >
            <Film className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          {m.is_underrated && (
            <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded">💎</span>
          )}
          {m.is_blockbuster && (
            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">🎬</span>
          )}
          {m.is_classic && (
            <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded">⭐</span>
          )}
        </div>

        {/* Rating */}
        <div
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-white">{m.avg_rating?.toFixed(1) || '—'}</span>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h3 className="text-white text-xs font-bold truncate group-hover:text-yellow-500 transition-colors">
            {m.title_en}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
            <span>{m.release_year}</span>
            {m.director && (
              <>
                <span>•</span>
                <span className="truncate">{m.director}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickTag({
  active,
  onClick,
  icon,
  label,
  activeColor
}: {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor: 'purple' | 'orange' | 'yellow';
}) {
  const colors = {
    purple: { bg: 'rgba(168,85,247,0.2)', border: 'rgba(168,85,247,0.5)', text: '#a855f7' },
    orange: { bg: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.5)', text: '#f97316' },
    yellow: { bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.5)', text: '#eab308' },
  }[activeColor];

  return (
    <button
      onClick={onClick}
      className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
      style={{
        backgroundColor: active ? colors.bg : 'var(--bg-secondary)',
        border: `1px solid ${active ? colors.border : 'var(--border-primary)'}`,
        color: active ? colors.text : 'var(--text-secondary)'
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-2 rounded-lg text-sm focus:outline-none transition-colors"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)'
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function GenrePill({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
      style={{
        backgroundColor: active ? 'var(--brand-primary)' : 'var(--bg-secondary)',
        color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--brand-primary)' : 'var(--border-primary)'}`
      }}
    >
      {label}
    </button>
  );
}
