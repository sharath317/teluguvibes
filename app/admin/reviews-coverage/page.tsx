'use client';

/**
 * Admin Dashboard: Reviews Coverage
 * 
 * Visualizes movie review coverage with:
 * - Coverage meter with target line
 * - Source breakdown (human/AI/template)
 * - Movies without reviews table
 * - Coverage history chart
 * - Quick actions for generating fallbacks
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Bot,
  FileText,
  Play,
  ExternalLink,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface CoverageData {
  coverage: {
    current: number;
    target: number;
    meetsTarget: boolean;
    gap: number;
  };
  counts: {
    total: number;
    withReviews: number;
    missing: number;
  };
  breakdown: {
    human: number;
    ai: number;
    template: number;
  };
  history: Array<{
    date: string;
    coverage: number;
    totalMovies: number;
    withReviews: number;
  }>;
  gaps: Array<{
    id: string;
    title: string;
    title_te?: string;
    release_year?: number;
    genres?: string[];
    tmdb_rating?: number;
    poster_url?: string;
  }>;
  lastUpdated: string;
}

// ============================================================
// COMPONENTS
// ============================================================

function CoverageMeter({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const percentage = Math.min(100, current * 100);
  const targetPercentage = target * 100;
  const meetsTarget = current >= target;

  return (
    <div className="relative">
      {/* Background bar */}
      <div className="h-8 bg-gray-700 rounded-full overflow-hidden">
        {/* Current progress */}
        <div
          className={`h-full transition-all duration-500 ${
            meetsTarget
              ? 'bg-gradient-to-r from-green-500 to-green-400'
              : 'bg-gradient-to-r from-orange-500 to-yellow-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Target line */}
      <div
        className="absolute top-0 h-8 w-1 bg-white/80 shadow-lg"
        style={{ left: `${targetPercentage}%` }}
      >
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
          Target: {targetPercentage.toFixed(0)}%
        </div>
      </div>

      {/* Current percentage label */}
      <div className="flex justify-between mt-2 text-sm">
        <span className="text-gray-400">0%</span>
        <span
          className={`font-bold ${meetsTarget ? 'text-green-400' : 'text-orange-400'}`}
        >
          {percentage.toFixed(1)}%
        </span>
        <span className="text-gray-400">100%</span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: any;
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

function BreakdownChart({
  breakdown,
  total,
}: {
  breakdown: { human: number; ai: number; template: number };
  total: number;
}) {
  const items = [
    { label: 'Human', value: breakdown.human, color: 'bg-green-500', icon: Users },
    { label: 'AI Generated', value: breakdown.ai, color: 'bg-blue-500', icon: Bot },
    { label: 'Template', value: breakdown.template, color: 'bg-purple-500', icon: FileText },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Review Source Breakdown
      </h3>
      <div className="space-y-3">
        {items.map((item) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400 flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </span>
                <span className="text-white">
                  {item.value} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GapsTable({
  gaps,
  onGenerateReview,
}: {
  gaps: CoverageData['gaps'];
  onGenerateReview: (movieId: string) => void;
}) {
  if (gaps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
        <p>All movies have reviews!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
            <th className="pb-3 pl-4">Movie</th>
            <th className="pb-3">Year</th>
            <th className="pb-3">Genres</th>
            <th className="pb-3">Rating</th>
            <th className="pb-3 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="text-white">
          {gaps.map((movie) => (
            <tr
              key={movie.id}
              className="border-b border-gray-800 hover:bg-gray-800/50"
            >
              <td className="py-3 pl-4">
                <div className="flex items-center gap-3">
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center">
                      <Film className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{movie.title}</p>
                    {movie.title_te && (
                      <p className="text-sm text-gray-400">{movie.title_te}</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3">{movie.release_year || '—'}</td>
              <td className="py-3">
                <div className="flex flex-wrap gap-1">
                  {(movie.genres || []).slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-0.5 bg-gray-700 rounded text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3">
                {movie.tmdb_rating ? (
                  <span className="text-yellow-400">
                    ★ {movie.tmdb_rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <button
                  onClick={() => onGenerateReview(movie.id)}
                  className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 text-sm flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Generate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryChart({
  history,
}: {
  history: CoverageData['history'];
}) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No history data yet. Run coverage checks to build history.</p>
      </div>
    );
  }

  const maxCoverage = Math.max(...history.map((h) => h.coverage), 1);

  return (
    <div className="h-32">
      <div className="flex items-end justify-between h-full gap-1">
        {history.slice(-14).map((h, i) => {
          const height = (h.coverage / maxCoverage) * 100;
          return (
            <div
              key={h.date}
              className="flex-1 flex flex-col items-center"
              title={`${h.date}: ${(h.coverage * 100).toFixed(1)}%`}
            >
              <div
                className="w-full bg-orange-500/60 hover:bg-orange-500 rounded-t transition-colors"
                style={{ height: `${height}%` }}
              />
              {i % 3 === 0 && (
                <span className="text-xs text-gray-500 mt-1">
                  {h.date.split('-').slice(1).join('/')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ReviewsCoveragePage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviews/coverage?includeGaps=true');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load coverage data');
      }
    } catch (err) {
      setError('Network error fetching coverage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateAll = async () => {
    if (!confirm('Generate template reviews for all missing movies? This may take a while.')) {
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/admin/reviews/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 0.95 }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Generated ${json.data.generated} reviews. Coverage: ${(json.data.finalCoverage * 100).toFixed(1)}%`);
        fetchData();
      } else {
        alert('Error: ' + (json.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSingle = async (movieId: string) => {
    // For single movie, we'd need another endpoint
    alert('Single movie generation coming soon. Use "Generate All" for now.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
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
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Film className="w-7 h-7" />
            Movie Reviews Coverage
          </h1>
          <p className="text-gray-400 mt-1">
            Enforce minimum 95% review coverage across all movies
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleGenerateAll}
            disabled={generating || data.coverage.meetsTarget}
            className={`px-4 py-2 rounded flex items-center gap-2 ${
              data.coverage.meetsTarget
                ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : data.coverage.meetsTarget ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Target Met
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Fallbacks
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {data.coverage.meetsTarget ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <p className="text-green-400 font-semibold">Coverage Target Met!</p>
            <p className="text-gray-400 text-sm">
              {(data.coverage.current * 100).toFixed(1)}% of movies have reviews
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <div>
            <p className="text-orange-400 font-semibold">Coverage Below Target</p>
            <p className="text-gray-400 text-sm">
              {data.counts.missing} movies need reviews to reach{' '}
              {(data.coverage.target * 100).toFixed(0)}% target
            </p>
          </div>
        </div>
      )}

      {/* Coverage Meter */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4">Coverage Progress</h3>
        <CoverageMeter
          current={data.coverage.current}
          target={data.coverage.target}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Film}
          label="Total Movies"
          value={data.counts.total.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="With Reviews"
          value={data.counts.withReviews.toLocaleString()}
          subValue={`${(data.coverage.current * 100).toFixed(1)}%`}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Missing Reviews"
          value={data.counts.missing.toLocaleString()}
          subValue={`${(data.coverage.gap * 100).toFixed(1)}% gap`}
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="Target"
          value={`${(data.coverage.target * 100).toFixed(0)}%`}
          color="purple"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Breakdown */}
        <BreakdownChart
          breakdown={data.breakdown}
          total={data.counts.withReviews}
        />

        {/* History */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Coverage History (Last 14 Days)
          </h3>
          <HistoryChart history={data.history} />
        </div>
      </div>

      {/* Movies Without Reviews */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Movies Without Reviews
            <span className="text-gray-400 text-sm ml-2">
              (showing first 50)
            </span>
          </h3>
        </div>
        <GapsTable gaps={data.gaps} onGenerateReview={handleGenerateSingle} />
      </div>

      {/* CLI Reference */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h3 className="text-gray-400 text-sm font-semibold mb-2">CLI Commands</h3>
        <div className="font-mono text-sm space-y-1">
          <p className="text-green-400">
            <span className="text-gray-500">$</span> pnpm run reviews:coverage --target=0.95
          </p>
          <p className="text-gray-500">
            <span className="text-gray-600">$</span> pnpm run reviews:coverage:status
          </p>
          <p className="text-gray-500">
            <span className="text-gray-600">$</span> pnpm run reviews:coverage:dry
          </p>
        </div>
      </div>

      {/* Last Updated */}
      <p className="text-gray-500 text-sm text-center">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
}






