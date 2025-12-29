'use client';

import { useState, useEffect } from 'react';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  BarChart3, Activity, Target, Zap, RefreshCw, Clock,
  ThumbsUp, ThumbsDown, Eye, Users, Flame, Star
} from 'lucide-react';

interface TrendCluster {
  cluster_name: string;
  primary_keyword: string;
  avg_score: number;
  trend_direction: string;
  times_covered: number;
  saturation_score: number;
}

interface ContentRecommendation {
  topic: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggested_format: string;
  urgency: string;
}

interface PerformanceMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export default function IntelligenceDashboard() {
  const [trends, setTrends] = useState<TrendCluster[]>([]);
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [fatigue, setFatigue] = useState<{ saturated: string[]; rising: string[]; underserved: string[] }>({
    saturated: [], rising: [], underserved: []
  });
  const [loading, setLoading] = useState(true);
  const [lastIngestion, setLastIngestion] = useState<Date | null>(null);

  useEffect(() => {
    fetchIntelligenceData();
  }, []);

  async function fetchIntelligenceData() {
    setLoading(true);
    try {
      const [trendsRes, recsRes, fatigueRes, metricsRes] = await Promise.all([
        fetch('/api/admin/intelligence/trends'),
        fetch('/api/admin/intelligence/recommendations'),
        fetch('/api/admin/intelligence/fatigue'),
        fetch('/api/admin/intelligence/metrics'),
      ]);

      if (trendsRes.ok) setTrends((await trendsRes.json()).trends || []);
      if (recsRes.ok) setRecommendations((await recsRes.json()).recommendations || []);
      if (fatigueRes.ok) setFatigue(await fatigueRes.json());
      if (metricsRes.ok) setMetrics((await metricsRes.json()).metrics || []);
    } catch (error) {
      console.error('Error fetching intelligence data:', error);
    }
    setLoading(false);
  }

  async function triggerIngestion() {
    try {
      const res = await fetch('/api/admin/intelligence/ingest', { method: 'POST' });
      if (res.ok) {
        setLastIngestion(new Date());
        fetchIntelligenceData();
      }
    } catch (error) {
      console.error('Ingestion error:', error);
    }
  }

  const priorityColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    low: 'bg-green-500/20 text-green-400 border-green-500/50',
  };

  const trendIcons = {
    rising: <TrendingUp className="w-4 h-4 text-green-500" />,
    spiking: <Zap className="w-4 h-4 text-yellow-500" />,
    falling: <TrendingDown className="w-4 h-4 text-red-500" />,
    stable: <Activity className="w-4 h-4 text-gray-500" />,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Brain className="w-8 h-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Intelligence Center</h1>
            <p className="text-gray-400">Self-learning insights & recommendations</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {lastIngestion && (
            <span className="text-sm text-gray-500">
              Last sync: {lastIngestion.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={triggerIngestion}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Trends
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading intelligence data...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Quick Metrics */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              icon={<Eye />} 
              label="Total Views (24h)" 
              value="12.4K" 
              change={+12} 
            />
            <MetricCard 
              icon={<Users />} 
              label="Unique Visitors" 
              value="3.2K" 
              change={+8} 
            />
            <MetricCard 
              icon={<Flame />} 
              label="Trending Topics" 
              value={String(trends.filter(t => t.trend_direction === 'spiking').length)} 
              change={0} 
            />
            <MetricCard 
              icon={<Star />} 
              label="Avg. Engagement" 
              value="67%" 
              change={+5} 
            />
          </section>

          {/* AI Recommendations */}
          <section className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-white">AI Recommendations</h2>
              <span className="text-xs text-gray-500 ml-auto">Based on learning patterns</span>
            </div>
            
            {recommendations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recommendations at this time</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-4 rounded-xl border ${priorityColors[rec.priority]}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{rec.topic}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-800 rounded-full">
                          {rec.suggested_format}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{rec.reason}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{rec.urgency}</span>
                      <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                        Create
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Trend Clusters & Topic Fatigue */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Trending Topics */}
            <section className="bg-gray-900 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-white">Trending Topics</h2>
              </div>
              
              <div className="space-y-3">
                {trends.slice(0, 8).map((trend, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {trendIcons[trend.trend_direction as keyof typeof trendIcons]}
                      <span className="text-white">{trend.primary_keyword}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-yellow-500"
                          style={{ width: `${trend.avg_score}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">{trend.avg_score.toFixed(0)}</span>
                      {trend.times_covered > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                          {trend.times_covered} posts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Topic Fatigue */}
            <section className="bg-gray-900 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-white">Topic Status</h2>
              </div>
              
              <div className="space-y-4">
                {/* Saturated */}
                <div>
                  <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
                    <ThumbsDown className="w-4 h-4" />
                    Saturated (Avoid)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {fatigue.saturated.length === 0 ? (
                      <span className="text-gray-500 text-sm">None</span>
                    ) : (
                      fatigue.saturated.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                          {topic}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Rising */}
                <div>
                  <h3 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    Rising (Prioritize)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {fatigue.rising.length === 0 ? (
                      <span className="text-gray-500 text-sm">None</span>
                    ) : (
                      fatigue.rising.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                          {topic}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Underserved */}
                <div>
                  <h3 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    Underserved (Opportunity)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {fatigue.underserved.length === 0 ? (
                      <span className="text-gray-500 text-sm">None</span>
                    ) : (
                      fatigue.underserved.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                          {topic}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Learning Insights */}
          <section className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-500" />
              <h2 className="text-lg font-bold text-white">Learning Insights</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <InsightCard
                title="Best Performing Content"
                insight="Gossip articles with emotional hooks get 40% more engagement"
                metric="+40%"
                type="positive"
              />
              <InsightCard
                title="Optimal Post Length"
                insight="400-600 word articles have highest completion rate"
                metric="500 words"
                type="neutral"
              />
              <InsightCard
                title="Peak Traffic Time"
                insight="Evening hours (6-9 PM) show highest user activity"
                metric="6-9 PM"
                type="neutral"
              />
            </div>
          </section>

          {/* Performance Prediction */}
          <section className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-bold text-white">AI Performance Predictions</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <PredictionCard
                topic="Pushpa 2 Updates"
                predictedViews={15000}
                confidence={0.85}
                suggestedTime="Today 6 PM"
              />
              <PredictionCard
                topic="Celebrity Birthday Post"
                predictedViews={8000}
                confidence={0.72}
                suggestedTime="Tomorrow 9 AM"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ===== COMPONENTS =====

function MetricCard({ icon, label, value, change }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  change: number;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
          {icon}
        </div>
        {change !== 0 && (
          <span className={`text-sm ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function InsightCard({ title, insight, metric, type }: {
  title: string;
  insight: string;
  metric: string;
  type: 'positive' | 'negative' | 'neutral';
}) {
  const colors = {
    positive: 'border-green-500/30 bg-green-500/5',
    negative: 'border-red-500/30 bg-red-500/5',
    neutral: 'border-gray-700 bg-gray-800/50',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[type]}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-300">{title}</h4>
        <span className={`text-lg font-bold ${
          type === 'positive' ? 'text-green-500' : 
          type === 'negative' ? 'text-red-500' : 'text-white'
        }`}>
          {metric}
        </span>
      </div>
      <p className="text-sm text-gray-500">{insight}</p>
    </div>
  );
}

function PredictionCard({ topic, predictedViews, confidence, suggestedTime }: {
  topic: string;
  predictedViews: number;
  confidence: number;
  suggestedTime: string;
}) {
  return (
    <div className="p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl border border-pink-500/20">
      <h4 className="font-medium text-white mb-2">{topic}</h4>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Predicted Views</p>
          <p className="text-xl font-bold text-pink-400">
            {predictedViews.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Confidence</p>
          <p className="text-xl font-bold text-white">{(confidence * 100).toFixed(0)}%</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-sm">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-gray-400">Best time: {suggestedTime}</span>
      </div>
    </div>
  );
}

