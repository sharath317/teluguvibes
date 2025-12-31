'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star, Filter, Search, ChevronDown, Film, Calendar,
  ThumbsUp, Eye, Award, Gem, Clock, X
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearFilters = () => {
    setFilters({ sortBy: 'rating', sortOrder: 'desc' });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.genre || filters.isUnderrated || filters.isBlockbuster || filters.isClassic || filters.minRating || filters.yearRange;

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
            In-depth Telugu movie reviews. Find your next watch based on our expert analysis.
          </p>
        </div>
      </section>

      {/* Sticky Filters Bar */}
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
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Quick Tags */}
            <QuickTag
              active={filters.isUnderrated}
              onClick={() => setFilters({ ...filters, isUnderrated: !filters.isUnderrated })}
              icon={<Gem className="w-3.5 h-3.5" />}
              label="Hidden Gems"
              activeColor="purple"
            />

            <QuickTag
              active={filters.isBlockbuster}
              onClick={() => setFilters({ ...filters, isBlockbuster: !filters.isBlockbuster })}
              icon={<Award className="w-3.5 h-3.5" />}
              label="Blockbusters"
              activeColor="orange"
            />

            <QuickTag
              active={filters.isClassic}
              onClick={() => setFilters({ ...filters, isClassic: !filters.isClassic })}
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
                onChange={(v) => setFilters({ ...filters, genre: v as Genre || undefined })}
                options={[{ value: '', label: 'All Genres' }, ...GENRES.map(g => ({ value: g, label: g }))]}
              />

              <FilterSelect
                label="Era"
                value={filters.yearRange ? `${filters.yearRange.from}-${filters.yearRange.to}` : ''}
                onChange={(v) => {
                  if (!v) {
                    setFilters({ ...filters, yearRange: undefined });
                  } else {
                    const [from, to] = v.split('-').map(Number);
                    setFilters({ ...filters, yearRange: { from, to } });
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
                onChange={(v) => setFilters({ ...filters, minRating: v ? parseFloat(v) : undefined })}
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
                  setFilters({ ...filters, sortBy: sortBy as any, sortOrder: sortOrder as any });
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

      {/* Genre Pills */}
      <section className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <GenrePill
            label="All"
            active={!filters.genre}
            onClick={() => setFilters({ ...filters, genre: undefined })}
          />
          {GENRES.map((genre) => (
            <GenrePill
              key={genre}
              label={genre}
              active={filters.genre === genre}
              onClick={() => setFilters({ ...filters, genre })}
            />
          ))}
        </div>
      </section>

      {/* Movies Grid */}
      <section className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] rounded-xl animate-pulse"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
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
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// Quick Tag Button
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

// Filter Select
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
      <label
        className="block text-xs mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}
      >
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

// Genre Pill
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

// Movie Card
function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/reviews/${movie.slug}`}
      className="group relative rounded-xl overflow-hidden transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Poster */}
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

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          {movie.is_underrated && (
            <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded">
              💎 Gem
            </span>
          )}
          {movie.is_blockbuster && (
            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">
              🎬 Hit
            </span>
          )}
          {movie.is_classic && (
            <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded">
              ⭐ Classic
            </span>
          )}
        </div>

        {/* Rating Badge */}
        <div
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-white">{movie.avg_rating.toFixed(1)}</span>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h3 className="text-white text-xs font-bold truncate group-hover:text-yellow-500 transition-colors">
            {movie.title_en}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
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

      {/* Hover Overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      >
        <div className="flex items-center gap-1 text-yellow-500 mb-1">
          <Star className="w-5 h-5 fill-current" />
          <span className="text-xl font-bold">{movie.avg_rating.toFixed(1)}</span>
        </div>
        <p className="text-gray-400 text-[10px] mb-2">{movie.total_reviews} reviews</p>
        <div className="flex flex-wrap gap-1 justify-center mb-2">
          {movie.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {genre}
            </span>
          ))}
        </div>
        <span
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
        >
          Read Review
        </span>
      </div>
    </Link>
  );
}
