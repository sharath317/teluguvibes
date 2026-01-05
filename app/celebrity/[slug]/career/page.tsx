'use client';

/**
 * CELEBRITY CAREER VISUALIZATION PAGE
 *
 * Shows career poster grid with color-coded performance.
 * Filters by year, genre, role.
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Filter, TrendingUp, Film, Trophy, AlertCircle } from 'lucide-react';
import type { CareerVisualization, CareerMovie } from '@/lib/games/types';
import { VERDICT_COLORS, VERDICT_LABELS, VERDICT_LABELS_TE } from '@/lib/career/visualizer';

export default function CareerPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<CareerVisualization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCareerData();
  }, [slug]);

  const fetchCareerData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/career/${slug}`);
      const result = await response.json();

      if (result.error) throw new Error(result.error);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load career data');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredMovies = data?.movies.filter(movie => {
    if (yearFilter && movie.year !== yearFilter) return false;
    if (genreFilter && movie.genre !== genreFilter) return false;
    if (roleFilter && movie.role !== roleFilter) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading career data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Career data not found'}</p>
          <Link href="/celebrities" className="btn btn-primary">Browse Celebrities</Link>
        </div>
      </div>
    );
  }

  const hitRate = data.total_movies > 0
    ? Math.round((data.hits / data.total_movies) * 100)
    : 0;

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/celebrity/${slug}`} className="flex items-center gap-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Profile</span>
          </Link>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary text-sm flex items-center gap-2 ${showFilters ? 'bg-orange-500/20' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Celebrity Info */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
          {/* Photo */}
          {data.celebrity_image && (
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-500 flex-shrink-0">
              <img
                src={data.celebrity_image}
                alt={data.celebrity_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {data.celebrity_name}
            </h1>
            {data.celebrity_name_te && (
              <p className="text-xl text-orange-400 mb-2">{data.celebrity_name_te}</p>
            )}
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Career: {data.active_years} | Peak Years: {data.peak_years}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Movies" value={data.total_movies} icon={Film} />
              <StatCard label="Hits" value={data.hits} icon={Trophy} color="text-green-400" />
              <StatCard label="Average" value={data.average} icon={TrendingUp} color="text-yellow-400" />
              <StatCard label="Flops" value={data.flops} icon={AlertCircle} color="text-red-400" />
              <StatCard label="Hit Rate" value={`${hitRate}%`} icon={Trophy} color="text-orange-400" />
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* Year filter */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Year</label>
                <select
                  value={yearFilter || ''}
                  onChange={(e) => setYearFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="input text-sm"
                >
                  <option value="">All Years</option>
                  {data.years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Genre filter */}
              {data.genres.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Genre</label>
                  <select
                    value={genreFilter || ''}
                    onChange={(e) => setGenreFilter(e.target.value || null)}
                    className="input text-sm"
                  >
                    <option value="">All Genres</option>
                    {data.genres.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role filter */}
              {data.roles.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Role</label>
                  <select
                    value={roleFilter || ''}
                    onChange={(e) => setRoleFilter(e.target.value || null)}
                    className="input text-sm"
                  >
                    <option value="">All Roles</option>
                    {data.roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear filters */}
              {(yearFilter || genreFilter || roleFilter) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setYearFilter(null);
                      setGenreFilter(null);
                      setRoleFilter(null);
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mb-6 flex flex-wrap gap-3">
          {Object.entries(VERDICT_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: VERDICT_COLORS[key] }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Movie Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMovies.map((movie) => (
            <MovieCard key={movie.movie_id} movie={movie} />
          ))}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: 'var(--text-secondary)' }}>No movies found with selected filters</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg text-center">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            📊 Box office verdicts are estimates based on available data. Some classifications may vary based on different sources.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-white'
}: {
  label: string;
  value: number | string;
  icon: any;
  color?: string;
}) {
  return (
    <div className="bg-gray-800/50 p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MovieCard({ movie }: { movie: CareerMovie }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative">
      {/* Poster */}
      <div
        className="aspect-[2/3] rounded-lg overflow-hidden border-2 transition-transform group-hover:scale-105"
        style={{ borderColor: movie.verdict_color }}
      >
        {movie.poster_url && !imageError ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-2 text-center"
            style={{ backgroundColor: movie.verdict_color + '20' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {movie.title}
            </span>
          </div>
        )}

        {/* Verdict badge */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-lg"
          style={{ backgroundColor: movie.verdict_color }}
        >
          {VERDICT_LABELS[movie.verdict]?.slice(0, 3) || '?'}
        </div>

        {/* Estimated badge */}
        {movie.is_estimated && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-gray-900/80 rounded text-xs text-gray-400">
            Est.
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2">
        <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {movie.title_te || movie.title}
        </h3>
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>{movie.year}</span>
          {movie.role && (
            <span className="px-1.5 py-0.5 bg-gray-800 rounded">
              {movie.role}
            </span>
          )}
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="font-bold text-white mb-1">{movie.title}</p>
          {movie.title_te && <p className="text-sm text-orange-400 mb-2">{movie.title_te}</p>}
          <p className="text-sm text-gray-300">{movie.year}</p>
          {movie.director && (
            <p className="text-xs text-gray-400 mt-1">Dir: {movie.director}</p>
          )}
          <div
            className="mt-2 px-3 py-1 rounded-full inline-block text-sm font-bold text-white"
            style={{ backgroundColor: movie.verdict_color }}
          >
            {VERDICT_LABELS_TE[movie.verdict] || VERDICT_LABELS[movie.verdict]}
          </div>
        </div>
      </div>
    </div>
  );
}








