'use client';

import { useState, useEffect } from 'react';
import {
  Film,
  RefreshCw,
  Database,
  TrendingUp,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Star,
  IndianRupee,
  Calendar,
  Users,
  Merge,
} from 'lucide-react';

interface CatalogueStats {
  total_movies: number;
  by_decade: Record<string, number>;
  by_era: Record<string, number>;
  by_verdict: Record<string, number>;
  with_wikidata: number;
  with_tmdb: number;
  with_poster: number;
  with_rating: number;
  avg_rating: number;
  total_gross_crores: number;
}

interface TopMovie {
  id: string;
  title_en: string;
  title_te: string | null;
  release_year: number;
  director_names: string[];
  hero_names: string[];
  verdict: string | null;
  tmdb_rating: number | null;
  worldwide_gross_inr_crores: number | null;
  popularity_score: number | null;
}

interface Duplicate {
  movie1: { id: string; title: string; year: number; source: string };
  movie2: { id: string; title: string; year: number; source: string };
  similarity: number;
}

export default function MovieCataloguePage() {
  const [stats, setStats] = useState<CatalogueStats | null>(null);
  const [topMovies, setTopMovies] = useState<TopMovie[]>([]);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'top' | 'duplicates' | 'ingest'>('overview');
  const [sortBy, setSortBy] = useState<'rating' | 'gross' | 'popularity'>('rating');
  const [filterDecade, setFilterDecade] = useState<string>('');

  useEffect(() => {
    fetchStats();
    fetchTopMovies();
  }, []);

  useEffect(() => {
    fetchTopMovies();
  }, [sortBy, filterDecade]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/movie-catalogue?action=stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopMovies = async () => {
    try {
      const params = new URLSearchParams({
        action: 'top',
        sortBy,
        limit: '20',
      });
      if (filterDecade) params.set('decade', filterDecade);

      const res = await fetch(`/api/admin/movie-catalogue?${params}`);
      const data = await res.json();
      if (data.success) {
        setTopMovies(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch top movies:', error);
    }
  };

  const fetchDuplicates = async () => {
    try {
      const res = await fetch('/api/admin/movie-catalogue?action=duplicates');
      const data = await res.json();
      if (data.success) {
        setDuplicates(data.data.duplicates);
      }
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
    }
  };

  const runIngestion = async (action: string, params?: Record<string, any>) => {
    setIngesting(true);
    setIngestionStatus(`Running ${action}...`);

    try {
      const res = await fetch('/api/admin/movie-catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });

      const data = await res.json();

      if (data.success) {
        setIngestionStatus(`✓ ${action} completed successfully`);
        fetchStats();
        fetchTopMovies();
      } else {
        setIngestionStatus(`✗ Error: ${data.error}`);
      }
    } catch (error) {
      setIngestionStatus(`✗ Failed: ${error}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleMergeDuplicates = async (keepId: string, removeId: string) => {
    if (!confirm('Are you sure you want to merge these movies? This cannot be undone.')) {
      return;
    }

    await runIngestion('merge-duplicates', { keepId, removeId });
    fetchDuplicates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Film className="w-7 h-7 text-orange-500" />
            Telugu Movie Catalogue
          </h1>
          <p className="text-gray-400 mt-1">
            Complete Telugu cinema database from 1931 to present
          </p>
        </div>
        <button
          onClick={() => runIngestion('full-ingestion')}
          disabled={ingesting}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700
            text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${ingesting ? 'animate-spin' : ''}`} />
          {ingesting ? 'Ingesting...' : 'Full Sync'}
        </button>
      </div>

      {/* Ingestion Status */}
      {ingestionStatus && (
        <div className={`p-4 rounded-lg ${
          ingestionStatus.startsWith('✓') ? 'bg-green-500/20 text-green-400' :
          ingestionStatus.startsWith('✗') ? 'bg-red-500/20 text-red-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {ingestionStatus}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#333]">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'top', label: 'Top Movies', icon: Star },
          { id: 'duplicates', label: 'Duplicates', icon: Merge },
          { id: 'ingest', label: 'Ingest Data', icon: Download },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'duplicates') fetchDuplicates();
            }}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Film}
              label="Total Movies"
              value={stats.total_movies.toLocaleString()}
              color="orange"
            />
            <StatCard
              icon={Database}
              label="With TMDB"
              value={stats.with_tmdb.toLocaleString()}
              subValue={`${Math.round(stats.with_tmdb / stats.total_movies * 100)}%`}
              color="blue"
            />
            <StatCard
              icon={Star}
              label="Avg Rating"
              value={stats.avg_rating.toFixed(1)}
              subValue={`${stats.with_rating} rated`}
              color="yellow"
            />
            <StatCard
              icon={IndianRupee}
              label="Total Gross"
              value={`₹${stats.total_gross_crores.toLocaleString()}Cr`}
              color="green"
            />
          </div>

          {/* By Decade */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Movies by Decade
            </h2>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(stats.by_decade)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([decade, count]) => (
                  <div key={decade} className="bg-[#252525] rounded-lg p-3 text-center">
                    <div className="text-sm text-gray-400">{decade}</div>
                    <div className="text-xl font-bold text-white">{count}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* By Verdict */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Verdict Distribution
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(stats.by_verdict)
                .sort((a, b) => b[1] - a[1])
                .map(([verdict, count]) => (
                  <div key={verdict} className="bg-[#252525] rounded-lg p-3">
                    <div className="text-sm text-gray-400 capitalize">
                      {verdict.replace(/_/g, ' ')}
                    </div>
                    <div className="text-lg font-bold text-white">{count}</div>
                    <div className="w-full bg-[#333] rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${getVerdictColor(verdict)}`}
                        style={{ width: `${(count / stats.total_movies) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Movies Tab */}
      {activeTab === 'top' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#252525] text-white rounded-lg px-4 py-2 border border-[#333]"
            >
              <option value="rating">By Rating</option>
              <option value="gross">By Box Office</option>
              <option value="popularity">By Popularity</option>
            </select>
            <select
              value={filterDecade}
              onChange={(e) => setFilterDecade(e.target.value)}
              className="bg-[#252525] text-white rounded-lg px-4 py-2 border border-[#333]"
            >
              <option value="">All Decades</option>
              {stats && Object.keys(stats.by_decade).sort().map(decade => (
                <option key={decade} value={decade}>{decade}</option>
              ))}
            </select>
          </div>

          {/* Movies List */}
          <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#252525]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">#</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Movie</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Year</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Director</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Hero</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Rating</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Verdict</th>
                  <th className="px-4 py-3 text-right text-sm text-gray-400">Gross (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {topMovies.map((movie, index) => (
                  <tr key={movie.id} className="hover:bg-[#252525]">
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{movie.title_en}</div>
                      {movie.title_te && (
                        <div className="text-sm text-gray-400">{movie.title_te}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{movie.release_year}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {movie.director_names?.[0] || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {movie.hero_names?.[0] || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {movie.tmdb_rating ? (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          {movie.tmdb_rating.toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {movie.verdict && (
                        <span className={`px-2 py-1 rounded text-xs ${getVerdictBadgeColor(movie.verdict)}`}>
                          {movie.verdict.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      {movie.worldwide_gross_inr_crores
                        ? `₹${movie.worldwide_gross_inr_crores.toLocaleString()}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Duplicates Tab */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Potential Duplicates ({duplicates.length})
            </h2>
            <button
              onClick={fetchDuplicates}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#252525]
                hover:bg-[#333] text-white rounded-lg text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {duplicates.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-lg p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-400">No duplicates found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.map((dup, index) => (
                <div key={index} className="bg-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">
                      Similarity: {(dup.similarity * 100).toFixed(0)}%
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMergeDuplicates(dup.movie1.id, dup.movie2.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white
                          rounded text-sm"
                      >
                        Keep Left
                      </button>
                      <button
                        onClick={() => handleMergeDuplicates(dup.movie2.id, dup.movie1.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white
                          rounded text-sm"
                      >
                        Keep Right
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#252525] rounded p-3">
                      <div className="font-medium text-white">{dup.movie1.title}</div>
                      <div className="text-sm text-gray-400">
                        {dup.movie1.year} · {dup.movie1.source}
                      </div>
                    </div>
                    <div className="bg-[#252525] rounded p-3">
                      <div className="font-medium text-white">{dup.movie2.title}</div>
                      <div className="text-sm text-gray-400">
                        {dup.movie2.year} · {dup.movie2.source}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ingest Tab */}
      {activeTab === 'ingest' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Wikidata */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Wikidata (Historic Films)
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Import historic Telugu films from Wikidata (1931-2010)
            </p>
            <div className="space-y-3">
              {['1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s'].map(decade => {
                const startYear = parseInt(decade);
                return (
                  <button
                    key={decade}
                    onClick={() => runIngestion('wikidata-decade', {
                      startYear,
                      endYear: startYear + 9
                    })}
                    disabled={ingesting}
                    className="w-full px-4 py-2 bg-[#252525] hover:bg-[#333]
                      text-white rounded-lg text-left flex items-center justify-between
                      disabled:opacity-50"
                  >
                    <span>Import {decade}</span>
                    <Download className="w-4 h-4 text-gray-500" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* TMDB */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Film className="w-5 h-5 text-green-500" />
              TMDB (Modern Films)
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Import modern Telugu films from TMDB (2010-present)
            </p>
            <div className="space-y-3">
              {Array.from({ length: 15 }, (_, i) => 2010 + i).map(year => (
                <button
                  key={year}
                  onClick={() => runIngestion('tmdb-year', { year })}
                  disabled={ingesting}
                  className="w-full px-4 py-2 bg-[#252525] hover:bg-[#333]
                    text-white rounded-lg text-left flex items-center justify-between
                    disabled:opacity-50"
                >
                  <span>Import {year}</span>
                  <Download className="w-4 h-4 text-gray-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Utilities */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Data Utilities
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => runIngestion('enrich-tmdb')}
                disabled={ingesting}
                className="px-4 py-3 bg-[#252525] hover:bg-[#333]
                  text-white rounded-lg disabled:opacity-50"
              >
                <div className="font-medium">Enrich with TMDB</div>
                <div className="text-sm text-gray-400">Add posters & ratings</div>
              </button>
              <button
                onClick={() => runIngestion('link-persons')}
                disabled={ingesting}
                className="px-4 py-3 bg-[#252525] hover:bg-[#333]
                  text-white rounded-lg disabled:opacity-50"
              >
                <div className="font-medium">Link Persons</div>
                <div className="text-sm text-gray-400">Connect actors & directors</div>
              </button>
              <button
                onClick={() => runIngestion('update-stats')}
                disabled={ingesting}
                className="px-4 py-3 bg-[#252525] hover:bg-[#333]
                  text-white rounded-lg disabled:opacity-50"
              >
                <div className="font-medium">Update Stats</div>
                <div className="text-sm text-gray-400">Recalculate hit ratios</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color
}: {
  icon: any;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-500/20 text-orange-500',
    blue: 'bg-blue-500/20 text-blue-500',
    green: 'bg-green-500/20 text-green-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
    purple: 'bg-purple-500/20 text-purple-500',
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}

function getVerdictColor(verdict: string): string {
  const colors: Record<string, string> = {
    all_time_blockbuster: 'bg-green-500',
    blockbuster: 'bg-green-400',
    super_hit: 'bg-emerald-500',
    hit: 'bg-teal-500',
    above_average: 'bg-cyan-500',
    average: 'bg-blue-500',
    below_average: 'bg-yellow-500',
    flop: 'bg-orange-500',
    disaster: 'bg-red-500',
    unknown: 'bg-gray-500',
  };
  return colors[verdict] || 'bg-gray-500';
}

function getVerdictBadgeColor(verdict: string): string {
  const colors: Record<string, string> = {
    all_time_blockbuster: 'bg-green-500/20 text-green-400',
    blockbuster: 'bg-green-500/20 text-green-400',
    super_hit: 'bg-emerald-500/20 text-emerald-400',
    hit: 'bg-teal-500/20 text-teal-400',
    above_average: 'bg-cyan-500/20 text-cyan-400',
    average: 'bg-blue-500/20 text-blue-400',
    below_average: 'bg-yellow-500/20 text-yellow-400',
    flop: 'bg-orange-500/20 text-orange-400',
    disaster: 'bg-red-500/20 text-red-400',
    unknown: 'bg-gray-500/20 text-gray-400',
  };
  return colors[verdict] || 'bg-gray-500/20 text-gray-400';
}



