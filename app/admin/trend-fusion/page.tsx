'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Zap,
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  Film,
  User,
  AlertCircle,
  Play,
  ThumbsUp,
  X,
} from 'lucide-react';

interface TrendSignal {
  id: string;
  entity_name: string;
  entity_type: string;
  signal_source: string;
  signal_strength: number;
  trigger_reason: string | null;
  detected_at: string;
}

interface ContentRecommendation {
  id: string;
  recommendation_type: string;
  suggested_title: string;
  suggested_title_te: string | null;
  suggested_hook: string | null;
  trend_context: {
    source: string;
    strength: number;
    trigger: string | null;
  };
  historic_context: {
    name: string;
    match_type?: string;
    match_reason?: string;
  };
  relevance_score: number;
  timeliness_score: number;
  engagement_probability: number;
  combined_score: number;
  status: string;
}

interface RelevanceSpike {
  entity_id: string;
  entity_name: string;
  spike_level: string;
  change: number;
}

export default function TrendFusionPage() {
  const [signals, setSignals] = useState<TrendSignal[]>([]);
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [spikes, setSpikes] = useState<RelevanceSpike[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'signals' | 'spikes'>('recommendations');
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recsRes, signalsRes, spikesRes] = await Promise.all([
        fetch('/api/admin/trend-fusion?action=recommendations&limit=15'),
        fetch('/api/admin/trend-fusion?action=signals&hours=48'),
        fetch('/api/admin/trend-fusion?action=spikes'),
      ]);

      const recsData = await recsRes.json();
      const signalsData = await signalsRes.json();
      const spikesData = await spikesRes.json();

      if (recsData.success) setRecommendations(recsData.data);
      if (signalsData.success) setSignals(signalsData.data);
      if (spikesData.success) setSpikes(spikesData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runPipeline = async () => {
    setRunning(true);
    setPipelineResult(null);

    try {
      const res = await fetch('/api/admin/trend-fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' }),
      });
      const data = await res.json();

      if (data.success) {
        setPipelineResult(data.data);
        fetchData();
      } else {
        alert('Pipeline failed: ' + data.error);
      }
    } catch (error) {
      alert('Pipeline failed');
    } finally {
      setRunning(false);
    }
  };

  const approveRecommendation = async (id: string) => {
    try {
      const res = await fetch('/api/admin/trend-fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', recommendationId: id }),
      });
      const data = await res.json();

      if (data.success) {
        fetchData();
        alert(`Draft created! Post ID: ${data.postId}`);
      } else {
        alert('Approval failed: ' + data.error);
      }
    } catch (error) {
      alert('Approval failed');
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      trend_tribute: '🎬',
      ott_classic: '📺',
      comparison: '⚔️',
      nostalgia_spike: '💭',
      legacy_connection: '🔗',
      genre_evolution: '📈',
      remake_original: '🔄',
      era_comparison: '⏳',
    };
    return icons[type] || '📝';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      trend_tribute: 'bg-orange-500/20 text-orange-400',
      ott_classic: 'bg-purple-500/20 text-purple-400',
      comparison: 'bg-red-500/20 text-red-400',
      nostalgia_spike: 'bg-blue-500/20 text-blue-400',
      legacy_connection: 'bg-green-500/20 text-green-400',
      era_comparison: 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      tmdb_trending: '🎬',
      youtube_trending: '📺',
      news_mention: '📰',
      twitter_hashtag: '🐦',
      google_trends: '📊',
      ott_trending: '📱',
    };
    return icons[source] || '📡';
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
            <Sparkles className="w-7 h-7 text-orange-500" />
            Trend-Historic Fusion
          </h1>
          <p className="text-gray-400 mt-1">
            AI-powered hybrid content recommendations fusing trends with Telugu cinema history
          </p>
        </div>
        <button
          onClick={runPipeline}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-pink-600
            hover:from-orange-700 hover:to-pink-700 text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Fusion
            </>
          )}
        </button>
      </div>

      {/* Pipeline Result Alert */}
      {pipelineResult && (
        <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <div className="font-medium text-white">
                Pipeline completed: {pipelineResult.recommendations_generated} recommendations generated
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Signals: {pipelineResult.signals_ingested} ingested, {pipelineResult.signals_processed} processed •
                Matches: {pipelineResult.matches_found}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Trend Signals"
          value={signals.length.toString()}
          color="orange"
        />
        <StatCard
          icon={Sparkles}
          label="Recommendations"
          value={recommendations.length.toString()}
          color="purple"
        />
        <StatCard
          icon={Zap}
          label="Relevance Spikes"
          value={spikes.length.toString()}
          color="yellow"
        />
        <StatCard
          icon={History}
          label="Pending Approval"
          value={recommendations.filter(r => r.status === 'pending').length.toString()}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#333]">
        {[
          { id: 'recommendations', label: 'Content Recommendations', icon: Sparkles },
          { id: 'signals', label: 'Trend Signals', icon: TrendingUp },
          { id: 'spikes', label: 'Relevance Spikes', icon: Zap },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map(rec => (
              <div key={rec.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getTypeIcon(rec.recommendation_type)}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(rec.recommendation_type)}`}>
                        {rec.recommendation_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        rec.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        rec.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {rec.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-white mb-1">
                      {rec.suggested_title}
                    </h3>
                    {rec.suggested_title_te && (
                      <p className="text-gray-400 text-sm mb-2">{rec.suggested_title_te}</p>
                    )}
                    {rec.suggested_hook && (
                      <p className="text-gray-500 text-sm italic">"{rec.suggested_hook}"</p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Trend: {rec.trend_context.source} ({rec.trend_context.strength}%)
                      </span>
                      <span className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Historic: {rec.historic_context.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-400">
                        {Math.round(rec.combined_score)}
                      </div>
                      <div className="text-xs text-gray-500">score</div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <ScoreChip label="Relevance" value={rec.relevance_score} />
                      <ScoreChip label="Timeliness" value={rec.timeliness_score} />
                      <ScoreChip label="Engagement" value={rec.engagement_probability} />
                    </div>

                    {rec.status === 'pending' && (
                      <button
                        onClick={() => approveRecommendation(rec.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700
                          text-white rounded text-sm transition-colors mt-2"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recommendations yet</p>
              <p className="text-sm mt-1">Run the fusion pipeline to generate recommendations</p>
            </div>
          )}
        </div>
      )}

      {/* Signals Tab */}
      {activeTab === 'signals' && (
        <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#252525]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Strength</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Trigger</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {signals.map(signal => (
                  <tr key={signal.id} className="hover:bg-[#252525]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {signal.entity_type === 'person' ? (
                          <User className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Film className="w-4 h-4 text-purple-400" />
                        )}
                        <span className="text-white">{signal.entity_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400">
                        {getSourceIcon(signal.signal_source)} {signal.signal_source.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-[#333] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              signal.signal_strength > 70 ? 'bg-green-500' :
                              signal.signal_strength > 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${signal.signal_strength}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">{Math.round(signal.signal_strength)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {signal.trigger_reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {new Date(signal.detected_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {signals.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No trend signals detected</p>
            </div>
          )}
        </div>
      )}

      {/* Spikes Tab */}
      {activeTab === 'spikes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spikes.length > 0 ? (
            spikes.map(spike => (
              <div key={spike.entity_id} className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{spike.entity_name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    spike.spike_level === 'major' ? 'bg-red-500/20 text-red-400' :
                    spike.spike_level === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {spike.spike_level}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-400">
                    +{Math.round(spike.change)}% relevance
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No relevance spikes detected today</p>
            </div>
          )}
        </div>
      )}

      {/* How It Works */}
      <div className="bg-[#1a1a1a] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">How Trend-Historic Fusion Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FusionStep
            icon={TrendingUp}
            step={1}
            title="Detect Trends"
            description="Ingest signals from TMDB, YouTube, News, OTT platforms"
          />
          <FusionStep
            icon={History}
            step={2}
            title="Match History"
            description="Find relevant Telugu cinema legends and classic films"
          />
          <FusionStep
            icon={Sparkles}
            step={3}
            title="Generate Ideas"
            description="Create hybrid content angles with engagement scoring"
          />
          <FusionStep
            icon={CheckCircle2}
            step={4}
            title="Approve & Create"
            description="Admin reviews and generates AI-powered drafts"
          />
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    orange: 'bg-orange-500/20 text-orange-500',
    purple: 'bg-purple-500/20 text-purple-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
    blue: 'bg-blue-500/20 text-blue-500',
  };

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  const getColor = (v: number) => {
    if (v >= 70) return 'text-green-400';
    if (v >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="text-center">
      <div className={`text-sm font-medium ${getColor(value)}`}>{Math.round(value)}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function FusionStep({
  icon: Icon,
  step,
  title,
  description
}: {
  icon: any;
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-orange-500" />
      </div>
      <div className="text-xs text-orange-400 mb-1">Step {step}</div>
      <div className="text-white font-medium mb-1">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </div>
  );
}
