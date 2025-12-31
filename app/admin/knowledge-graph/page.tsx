'use client';

import { useState, useEffect } from 'react';
import {
  Database, Users, Film, Calendar, RefreshCw, Download,
  Star, Award, TrendingUp, Clock, CheckCircle, XCircle
} from 'lucide-react';

interface Stats {
  totals: {
    persons: number;
    actors: number;
    actresses: number;
    directors: number;
    livingLegends: number;
  };
  byEra: Record<string, number>;
  dataQuality: {
    averageScore: string;
  };
  recentAdditions: Array<{
    id: string;
    name_en: string;
    name_te: string;
    era: string;
    created_at: string;
  }>;
  ingestionHistory: Array<{
    id: string;
    source: string;
    status: string;
    total_fetched: number;
    total_inserted: number;
    started_at: string;
    completed_at: string;
  }>;
}

export default function KnowledgeGraphPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestType, setIngestType] = useState('full');
  const [ingestResult, setIngestResult] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/knowledge-graph/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
    setLoading(false);
  }

  async function triggerIngestion() {
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch('/api/admin/knowledge-graph/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: ingestType }),
      });
      const data = await res.json();
      setIngestResult(data);
      await fetchStats();
    } catch (error) {
      setIngestResult({ error: 'Ingestion failed' });
    }
    setIngesting(false);
  }

  const eras = ['1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl">
            <Database className="w-8 h-8 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Telugu Cinema Knowledge Graph</h1>
            <p className="text-gray-400">1931 (Bhakta Prahlada) → Present</p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#363636]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading knowledge graph data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Total Persons"
              value={stats?.totals.persons || 0}
              color="blue"
            />
            <StatCard
              icon={<Star className="w-5 h-5" />}
              label="Actors"
              value={stats?.totals.actors || 0}
              color="purple"
            />
            <StatCard
              icon={<Star className="w-5 h-5" />}
              label="Actresses"
              value={stats?.totals.actresses || 0}
              color="pink"
            />
            <StatCard
              icon={<Film className="w-5 h-5" />}
              label="Directors"
              value={stats?.totals.directors || 0}
              color="orange"
            />
            <StatCard
              icon={<Award className="w-5 h-5" />}
              label="Living Legends"
              value={stats?.totals.livingLegends || 0}
              color="yellow"
            />
          </section>

          {/* Era Distribution */}
          <section className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-400" />
              Distribution by Era
            </h2>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {eras.map((era) => (
                <div
                  key={era}
                  className="text-center p-3 bg-[#0a0a0a] rounded-lg border border-[#262626]"
                >
                  <div className="text-2xl font-bold text-orange-400">
                    {stats?.byEra[era] || 0}
                  </div>
                  <div className="text-xs text-gray-500">{era}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Ingestion Panel */}
          <section className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-orange-400" />
              Wikidata Ingestion
            </h2>

            <div className="flex flex-wrap gap-4 items-center mb-4">
              <select
                value={ingestType}
                onChange={(e) => setIngestType(e.target.value)}
                className="px-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white"
              >
                <option value="full">Full Ingestion (All)</option>
                <option value="actors">Telugu Actors Only</option>
                <option value="legendary">Legendary Actors (Pre-1980)</option>
              </select>

              <button
                onClick={triggerIngestion}
                disabled={ingesting}
                className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {ingesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Ingesting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Start Ingestion
                  </>
                )}
              </button>
            </div>

            {ingestResult && (
              <div className={`p-4 rounded-lg ${
                ingestResult.error ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'
              }`}>
                {ingestResult.error ? (
                  <p className="text-red-400">{ingestResult.error}</p>
                ) : (
                  <div className="text-green-400">
                    <p className="font-bold mb-2">Ingestion Complete!</p>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(ingestResult.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Additions */}
            <section className="bg-[#141414] border border-[#262626] rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Recent Additions
              </h2>
              <div className="space-y-3">
                {(stats?.recentAdditions || []).map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg"
                  >
                    <div>
                      <span className="text-white">{person.name_en}</span>
                      {person.name_te && (
                        <span className="text-gray-500 ml-2">({person.name_te})</span>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                      {person.era || 'Unknown'}
                    </span>
                  </div>
                ))}
                {(!stats?.recentAdditions || stats.recentAdditions.length === 0) && (
                  <p className="text-gray-500 text-center py-4">
                    No data yet. Run ingestion to populate.
                  </p>
                )}
              </div>
            </section>

            {/* Ingestion History */}
            <section className="bg-[#141414] border border-[#262626] rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Ingestion History
              </h2>
              <div className="space-y-3">
                {(stats?.ingestionHistory || []).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : log.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
                      )}
                      <span className="text-white capitalize">{log.source}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        +{log.total_inserted} new
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.started_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                {(!stats?.ingestionHistory || stats.ingestionHistory.length === 0) && (
                  <p className="text-gray-500 text-center py-4">
                    No ingestion runs yet.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Data Quality */}
          <section className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Data Quality</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-400 mb-1">Average Completeness</div>
                <div className="h-4 bg-[#262626] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                    style={{ width: `${parseFloat(stats?.dataQuality.averageScore || '0') * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-400">
                {(parseFloat(stats?.dataQuality.averageScore || '0') * 100).toFixed(0)}%
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'purple' | 'pink' | 'orange' | 'yellow';
}) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    pink: 'bg-pink-500/20 text-pink-400',
    orange: 'bg-orange-500/20 text-orange-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
      <div className={`p-2 rounded-lg w-fit ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}



