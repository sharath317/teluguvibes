'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star, Filter, Search, ChevronDown, Film, Calendar,
  ThumbsUp, Eye, Award, Gem, Clock
} from 'lucide-react';
import type { Movie, Genre, ReviewFilters } from '@/types/reviews';

const GENRES: Genre[] = [
  'Action', 'Drama', 'Romance', 'Comedy', 'Thriller',
  'Horror', 'Fantasy', 'Crime', 'Period', 'Family',
];

const YEAR_RANGES = [
  { label: 'All Time', from: 1950, to: 2025 },
  { label: '2020s', from: 2020, to: 2029 },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '90s', from: 1990, to: 1999 },
  { label: 'Classics', from: 1950, to: 1989 },
];

export default function ReviewsPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReviewFilters>({
    sortBy: 'rating',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch movies with filters
  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.genre) params.set('genre', filters.genre);
      if (filters.actor) params.set('actor', filters.actor);
      if (filters.director) params.set('director', filters.director);
      if (filters.year) params.set('year', String(filters.year));
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
      if (searchQuery) params.set('search', searchQuery);

      params.set('limit', '30');

      const res = await fetch(`/api/movies?${params}`);
      const data = await res.json();
      setMovies(data.movies || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
    setLoading(false);
  }, [filters, searchQuery]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Hero Section */}
      <section className="relative py-12 px-4 bg-gradient-to-b from-yellow-500/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Film className="w-10 h-10 text-yellow-500" />
            <h1 className="text-4xl font-bold text-white">మూవీ రివ్యూలు</h1>
          </div>
          <p className="text-gray-400 max-w-2xl">
            In-depth Telugu movie reviews covering direction, screenplay, acting, music,
            and cinematography. Find your next watch based on our expert analysis.
          </p>
        </div>
      </section>

      {/* Quick Filters */}
      <section className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, actors, directors..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            {/* Quick Tags */}
            <button
              onClick={() => setFilters({ ...filters, isUnderrated: !filters.isUnderrated })}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                filters.isUnderrated
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              <Gem className="w-4 h-4" />
              Underrated
            </button>

            <button
              onClick={() => setFilters({ ...filters, isBlockbuster: !filters.isBlockbuster })}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                filters.isBlockbuster
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              <Award className="w-4 h-4" />
              Blockbusters
            </button>

            <button
              onClick={() => setFilters({ ...filters, isClassic: !filters.isClassic })}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                filters.isClassic
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Classics
            </button>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                showFilters
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-900 rounded-xl border border-gray-800 grid md:grid-cols-4 gap-4">
              {/* Genre */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Genre</label>
                <select
                  value={filters.genre || ''}
                  onChange={(e) => setFilters({ ...filters, genre: e.target.value as Genre || undefined })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">All Genres</option>
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Era */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Era</label>
                <select
                  value={filters.yearRange ? `${filters.yearRange.from}-${filters.yearRange.to}` : ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setFilters({ ...filters, yearRange: undefined });
                    } else {
                      const [from, to] = e.target.value.split('-').map(Number);
                      setFilters({ ...filters, yearRange: { from, to } });
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">All Years</option>
                  {YEAR_RANGES.map((range) => (
                    <option key={range.label} value={`${range.from}-${range.to}`}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Rating */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Rating</label>
                <select
                  value={filters.minRating || ''}
                  onChange={(e) => setFilters({ ...filters, minRating: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">Any Rating</option>
                  <option value="9">9+ Masterpiece</option>
                  <option value="8">8+ Excellent</option>
                  <option value="7">7+ Good</option>
                  <option value="6">6+ Average</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Sort By</label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    setFilters({
                      ...filters,
                      sortBy: sortBy as any,
                      sortOrder: sortOrder as any
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                >
                  <option value="rating-desc">Highest Rated</option>
                  <option value="rating-asc">Lowest Rated</option>
                  <option value="year-desc">Newest First</option>
                  <option value="year-asc">Oldest First</option>
                  <option value="reviews-desc">Most Reviewed</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Genre Pills */}
      <section className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilters({ ...filters, genre: undefined })}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !filters.genre
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setFilters({ ...filters, genre })}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filters.genre === genre
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>

      {/* Movies Grid */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400">No movies found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/reviews/${movie.slug}`}
      className="group relative rounded-xl overflow-hidden bg-gray-900 transition-transform hover:scale-105"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3]">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title_en}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <Film className="w-12 h-12 text-gray-700" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {movie.is_underrated && (
            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded">
              💎 Hidden Gem
            </span>
          )}
          {movie.is_blockbuster && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
              🎬 Blockbuster
            </span>
          )}
          {movie.is_classic && (
            <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
              ⭐ Classic
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded-lg">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-white font-bold">{movie.avg_rating.toFixed(1)}</span>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-bold truncate group-hover:text-yellow-500 transition-colors">
            {movie.title_en}
          </h3>
          {movie.title_te && (
            <p className="text-gray-400 text-sm truncate">{movie.title_te}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>{movie.release_year}</span>
            {movie.director && (
              <>
                <span>•</span>
                <span className="truncate">{movie.director}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hover Stats */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-1 text-yellow-500 mb-2">
          <Star className="w-6 h-6 fill-current" />
          <span className="text-2xl font-bold">{movie.avg_rating.toFixed(1)}</span>
        </div>
        <p className="text-gray-400 text-sm mb-3">{movie.total_reviews} reviews</p>
        <div className="flex flex-wrap gap-1 justify-center">
          {movie.genres.slice(0, 3).map((genre) => (
            <span key={genre} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
              {genre}
            </span>
          ))}
        </div>
        <button className="mt-4 px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium text-sm">
          Read Review
        </button>
      </div>
    </Link>
  );
}
