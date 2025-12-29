'use client';

import { useState, useEffect } from 'react';
import {
  Brain, TrendingUp, AlertTriangle, Lightbulb, BarChart3,
  RefreshCw, Eye, Target, Zap, Film, Users, Clock, ThermometerSun,
  CheckCircle, XCircle, Calendar, Sparkles
} from 'lucide-react';

interface TrendCluster {
  id: string;
  cluster_name: string;
  avg_score: number;
  total_signals: number;
  saturation_score: number;
  is_saturated: boolean;
  category: string;
}

interface EntityPopularity {
  entity_name: string;
  entity_type: string;
  current_score: number;
  trend_direction: string;
}

interface AiLearning {
  id: string;
  learning_type: string;
  pattern_description: string;
  confidence_score: number;
}

interface AudiencePreference {
  dimension_value: string;
  preference_score: number;
  avg_engagement: number;
}

export default function IntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [trendClusters, setTrendClusters] = useState<TrendCluster[]>([]);
  const [entityPopularity, setEntityPopularity] = useState<EntityPopularity[]>([]);
  const [aiLearnings, setAiLearnings] = useState<AiLearning[]>([]);
  const [categoryPrefs, setCategoryPrefs] = useState<AudiencePreference[]>([]);
  const [fatigueWarnings, setFatigueWarnings] = useState<TrendCluster[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [clustersRes, popularityRes, learningsRes, prefsRes] = await Promise.all([
        fetch('/api/admin/intelligence/clusters'),
        fetch('/api/admin/intelligence/popularity'),
        fetch('/api/admin/intelligence/learnings'),
        fetch('/api/admin/intelligence/preferences'),
      ]);

      if (clustersRes.ok) {
        const data = await clustersRes.json();
        setTrendClusters(data.clusters || []);
        setFatigueWarnings((data.clusters || []).filter((c: TrendCluster) => c.is_saturated));
      }

      if (popularityRes.ok) {
        const data = await popularityRes.json();
        setEntityPopularity(data.entities || []);
      }

      if (learningsRes.ok) {
        const data = await learningsRes.json();
        setAiLearnings(data.learnings || []);
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setCategoryPrefs(data.preferences || []);
      }
    } catch (error) {
      console.error('Failed to fetch intelligence data:', error);
    }
    setLoading(false);
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/cron/intelligence');
      if (res.ok) {
        const data = await res.json();
        setLastSync(data.timestamp);
        await fetchData();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
    setSyncing(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Intelligence Dashboard</h1>
            <p className="text-gray-400">Self-Learning System Overview</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-gray-500">
              Last sync: {new Date(lastSync).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading intelligence data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<TrendingUp />}
              label="Active Trends"
              value={trendClusters.length}
              color="blue"
            />
            <StatCard
              icon={<AlertTriangle />}
              label="Saturated Topics"
              value={fatigueWarnings.length}
              color="yellow"
            />
            <StatCard
              icon={<Lightbulb />}
              label="AI Learnings"
              value={aiLearnings.length}
              color="purple"
            />
            <StatCard
              icon={<Users />}
              label="Tracked Entities"
              value={entityPopularity.length}
              color="green"
            />
          </section>

          {/* Fatigue Warnings */}
          {fatigueWarnings.length > 0 && (
            <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-bold text-white">Topic Fatigue Warnings</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {fatigueWarnings.map((topic) => (
                  <div key={topic.id} className="p-4 bg-yellow-900/20 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-yellow-400">{topic.cluster_name}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {topic.total_signals} signals • Saturation: {(topic.saturation_score * 100).toFixed(0)}%
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                        {topic.category}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-500/70 mt-2">
                      ⚠️ Consider unique angle or wait before covering
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Trending Topics */}
            <section className="bg-gray-900 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">Top Trending Topics</h2>
              </div>
              <div className="space-y-3">
                {trendClusters
                  .filter(c => !c.is_saturated)
                  .slice(0, 8)
                  .map((cluster, i) => (
                    <div
                      key={cluster.id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-5">{i + 1}</span>
                        <div>
                          <span className="text-white">{cluster.cluster_name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({cluster.total_signals} signals)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendMeter score={cluster.avg_score} />
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                          {cluster.category || 'General'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            {/* Entity Popularity */}
            <section className="bg-gray-900 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-white">Entity Popularity</h2>
              </div>
              <div className="space-y-3">
                {entityPopularity.slice(0, 8).map((entity, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        entity.entity_type === 'celebrity' ? 'bg-purple-500/20' :
                        entity.entity_type === 'movie' ? 'bg-blue-500/20' : 'bg-gray-700'
                      }`}>
                        {entity.entity_type === 'celebrity' ? (
                          <Users className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Film className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-white">{entity.entity_name}</span>
                        <span className="text-xs text-gray-500 ml-2 capitalize">
                          {entity.entity_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendDirection direction={entity.trend_direction} />
                      <span className="text-sm text-gray-400">
                        {entity.current_score.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* AI Learnings */}
          <section className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-white">AI Learnings</h2>
              <span className="text-xs text-gray-500 ml-auto">
                Patterns learned from content performance
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiLearnings.slice(0, 6).map((learning) => (
                <div
                  key={learning.id}
                  className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded capitalize">
                      {learning.learning_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(learning.confidence_score * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-white text-sm">{learning.pattern_description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Category Preferences */}
          <section className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-white">Audience Preferences by Category</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categoryPrefs.slice(0, 8).map((pref, i) => (
                <div
                  key={i}
                  className="p-4 bg-gray-800 rounded-xl text-center"
                >
                  <div className="text-2xl font-bold text-orange-400">
                    {pref.preference_score.toFixed(0)}
                  </div>
                  <div className="text-white mt-1 capitalize">
                    {pref.dimension_value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {pref.avg_engagement.toFixed(1)} avg engagement
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          <section className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-cyan-500" />
              <h2 className="text-lg font-bold text-white">AI Recommendations</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <RecommendationCard
                title="Cover This Topic"
                description={trendClusters[0]?.cluster_name || 'No trending topic'}
                reason={`High signal strength (${trendClusters[0]?.avg_score.toFixed(2) || 0}), low saturation`}
                action="Generate Draft"
                type="positive"
              />
              <RecommendationCard
                title="Avoid Covering"
                description={fatigueWarnings[0]?.cluster_name || 'No fatigued topics'}
                reason={fatigueWarnings[0] ? `Saturation at ${(fatigueWarnings[0].saturation_score * 100).toFixed(0)}%` : 'All topics are fresh'}
                action="Wait"
                type="warning"
              />
              <RecommendationCard
                title="Best Publish Time"
                description="Evening (6-9 PM)"
                reason="Based on peak traffic patterns"
                action="Schedule"
                type="info"
              />
              <RecommendationCard
                title="Trending Celebrity"
                description={entityPopularity.find(e => e.entity_type === 'celebrity')?.entity_name || 'None'}
                reason="High search volume this week"
                action="Create Content"
                type="positive"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ===== COMPONENTS =====

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'purple' | 'green';
}) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
    purple: 'bg-purple-500/20 text-purple-500',
    green: 'bg-green-500/20 text-green-500',
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className={`p-2 rounded-lg w-fit ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function TrendMeter({ score }: { score: number }) {
  const width = Math.min(100, score * 100);
  return (
    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function TrendDirection({ direction }: { direction: string }) {
  if (direction === 'up') {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  }
  if (direction === 'down') {
    return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
  }
  return <div className="w-4 h-0.5 bg-gray-500" />;
}

function RecommendationCard({ title, description, reason, action, type }: {
  title: string;
  description: string;
  reason: string;
  action: string;
  type: 'positive' | 'warning' | 'info';
}) {
  const typeStyles = {
    positive: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };

  const buttonStyles = {
    positive: 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
  };

  return (
    <div className={`p-4 rounded-xl border ${typeStyles[type]}`}>
      <h3 className="text-white font-medium">{title}</h3>
      <p className="text-lg text-white mt-1">{description}</p>
      <p className="text-xs text-gray-500 mt-2">{reason}</p>
      <button className={`mt-3 px-3 py-1.5 rounded-lg text-sm ${buttonStyles[type]}`}>
        {action}
      </button>
    </div>
  );
}
