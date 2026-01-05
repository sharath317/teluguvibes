'use client';

/**
 * Admin Dashboard: Movie Reviews Management
 * 
 * Searchable list of all movies with their review status.
 * Allows editing individual movie reviews.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  Edit,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Star,
  Bot,
  Users,
  BarChart3,
  ExternalLink,
  Trash2,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface MovieWithReview {
  id: string;
  title_en: string;
  title_te?: string;
  slug: string;
  release_year?: number;
  poster_url?: string;
  director?: string;
  hero?: string;
  genres?: string[];
  our_rating?: number;
  review?: {
    id: string;
    overall_rating: number;
    reviewer_type: string;
    status: string;
    summary?: string;
    updated_at: string;
  };
}

interface ReviewStats {
  total: number;
  withReviews: number;
  aiGenerated: number;
  humanEdited: number;
  coverage: number;
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ReviewsManagementPage() {
  const [movies, setMovies] = useState<MovieWithReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with-review' | 'missing' | 'ai' | 'human'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        filter,
        ...(search && { search }),
      });
      
      const res = await fetch(`/api/admin/reviews/list?${params}`);
      const json = await res.json();
      
      if (json.success) {
        setMovies(json.movies);
        setStats(json.stats);
        setTotalPages(Math.ceil(json.total / limit));
      } else {
        setError(json.error || 'Failed to load data');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Delete review handler
  async function handleDeleteReview(movieId: string, movieTitle: string) {
    if (!confirm(`Are you sure you want to delete the review for "${movieTitle}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/reviews/${movieId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      
      if (json.success) {
        fetchData(); // Refresh the list
      } else {
        alert('Failed to delete review: ' + (json.error || 'Unknown error'));
      }
    } catch {
      alert('Network error while deleting review');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Film className="w-7 h-7" />
            Movie Reviews
          </h1>
          <p className="text-gray-400 mt-1">
            Search, view, and edit movie reviews
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/reviews-coverage"
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Coverage Stats
          </Link>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={Film}
            label="Total Movies"
            value={stats.total.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="With Reviews"
            value={stats.withReviews.toLocaleString()}
            subValue={`${stats.coverage.toFixed(1)}%`}
            color="green"
          />
          <StatCard
            icon={XCircle}
            label="Missing Reviews"
            value={(stats.total - stats.withReviews).toLocaleString()}
            color="red"
          />
          <StatCard
            icon={Bot}
            label="AI Generated"
            value={stats.aiGenerated.toLocaleString()}
            color="purple"
          />
          <StatCard
            icon={Users}
            label="Human Edited"
            value={stats.humanEdited.toLocaleString()}
            color="orange"
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by movie title, director, or hero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as typeof filter);
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Movies</option>
              <option value="with-review">With Reviews</option>
              <option value="missing">Missing Reviews</option>
              <option value="ai">AI Generated</option>
              <option value="human">Human Edited</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movie List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-white text-lg mb-2">Error Loading Data</p>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Retry
            </button>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No movies found matching your criteria</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700 bg-gray-900/50">
                  <th className="py-3 px-4">Movie</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Director</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {movies.map((movie) => (
                  <tr
                    key={movie.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title_en}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center">
                            <Film className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{movie.title_en}</p>
                          {movie.title_te && (
                            <p className="text-sm text-gray-400">{movie.title_te}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {movie.release_year || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {movie.director || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {movie.review ? (
                        <div className="flex items-center gap-2">
                          {movie.review.reviewer_type === 'admin' ? (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Human
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              AI
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            movie.review.status === 'published'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {movie.review.status}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                          No Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {movie.review?.overall_rating ? (
                        <span className="text-yellow-400 flex items-center gap-1">
                          <Star className="w-4 h-4 fill-current" />
                          {movie.review.overall_rating.toFixed(1)}
                        </span>
                      ) : movie.our_rating ? (
                        <span className="text-gray-400 flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {movie.our_rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/reviews/${movie.id}/edit`}
                          className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 text-sm flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          {movie.review ? 'Edit' : 'Create'}
                        </Link>
                        {movie.review && (
                          <button
                            onClick={() => handleDeleteReview(movie.id, movie.title_en)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/reviews/${movie.slug}`}
                          target="_blank"
                          className="p-1 text-gray-400 hover:text-white"
                          title="View on site"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
    purple: 'bg-purple-500/20 text-purple-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-white text-xl font-bold">{value}</p>
          {subValue && <p className="text-gray-500 text-xs">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}
