'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  TrendingUp,
  Clock,
  Sparkles,
  Recycle,
  AlertCircle,
  CheckCircle2,
  Play,
  History,
  Film,
  User,
  Star,
} from 'lucide-react';

interface JobStats {
  last_run: string | null;
  total_events_today: number;
  upcoming_events_7d: number;
  recyclable_content: number;
  avg_performance: number;
}

interface UpcomingEvent {
  date: string;
  events: Array<{
    event_id: string;
    event_type: string;
    title_en: string;
    title_te: string | null;
    years_ago: number;
    is_milestone_year: boolean;
    priority_score: number;
  }>;
}

interface RecyclableContent {
  event_id: string;
  post_id: string;
  title: string;
  event_type: string;
  performance_score: number;
  recycle_strategy: string;
  last_published: string;
}

interface JobResult {
  date: string;
  events_found: number;
  drafts_generated: number;
  drafts_skipped: number;
  errors: string[];
  generated_posts: Array<{
    id: string;
    title: string;
    event_type: string;
  }>;
}

export default function HistoricIntelligencePage() {
  const [stats, setStats] = useState<JobStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [recyclable, setRecyclable] = useState<RecyclableContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'upcoming' | 'recyclable' | 'logs'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, upcomingRes, recyclableRes] = await Promise.all([
        fetch('/api/cron/historic-intelligence?action=stats'),
        fetch('/api/cron/historic-intelligence?action=upcoming&days=7'),
        fetch('/api/cron/historic-intelligence?action=recyclable&limit=10'),
      ]);

      const statsData = await statsRes.json();
      const upcomingData = await upcomingRes.json();
      const recyclableData = await recyclableRes.json();

      if (statsData.success) setStats(statsData.data);
      if (upcomingData.success) setUpcoming(upcomingData.data);
      if (recyclableData.success) setRecyclable(recyclableData.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runJob = async () => {
    setRunning(true);
    setJobResult(null);

    try {
      const res = await fetch('/api/cron/historic-intelligence?action=run');
      const data = await res.json();

      if (data.success) {
        setJobResult(data.data);
        fetchData(); // Refresh stats
      } else {
        alert('Job failed: ' + data.error);
      }
    } catch (error) {
      console.error('Job failed:', error);
      alert('Job failed');
    } finally {
      setRunning(false);
    }
  };

  const eventTypeIcon = (type: string) => {
    switch (type) {
      case 'birthday': return '🎂';
      case 'death_anniversary': return '🙏';
      case 'movie_release': return '🎬';
      case 'debut_anniversary': return '⭐';
      case 'award_win': return '🏆';
      default: return '📅';
    }
  };

  const eventTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      birthday: 'bg-pink-500/20 text-pink-400',
      death_anniversary: 'bg-gray-500/20 text-gray-400',
      movie_release: 'bg-blue-500/20 text-blue-400',
      debut_anniversary: 'bg-purple-500/20 text-purple-400',
      award_win: 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
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
            <History className="w-7 h-7 text-orange-500" />
            Historic Intelligence
          </h1>
          <p className="text-gray-400 mt-1">
            Evergreen content engine for birthdays, anniversaries, and "On This Day"
          </p>
        </div>
        <button
          onClick={runJob}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700
            text-white rounded-lg disabled:opacity-50 transition-colors"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Now
            </>
          )}
        </button>
      </div>

      {/* Job Result Alert */}
      {jobResult && (
        <div className={`p-4 rounded-lg ${
          jobResult.errors.length > 0
            ? 'bg-yellow-500/20 border border-yellow-500/50'
            : 'bg-green-500/20 border border-green-500/50'
        }`}>
          <div className="flex items-start gap-3">
            {jobResult.errors.length > 0 ? (
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
            )}
            <div>
              <div className="font-medium text-white">
                Job completed: {jobResult.drafts_generated} drafts generated
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Found {jobResult.events_found} events •
                Skipped {jobResult.drafts_skipped} •
                {jobResult.errors.length} errors
              </div>
              {jobResult.generated_posts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {jobResult.generated_posts.slice(0, 5).map(post => (
                    <div key={post.id} className="text-sm text-gray-300">
                      {eventTypeIcon(post.event_type)} {post.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon={Calendar}
            label="Events Today"
            value={stats.total_events_today.toString()}
            color="orange"
          />
          <StatCard
            icon={Clock}
            label="Upcoming (7d)"
            value={stats.upcoming_events_7d.toString()}
            color="blue"
          />
          <StatCard
            icon={Recycle}
            label="Recyclable"
            value={stats.recyclable_content.toString()}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Performance"
            value={`${stats.avg_performance}%`}
            color="purple"
          />
          <StatCard
            icon={Sparkles}
            label="Last Run"
            value={stats.last_run ? new Date(stats.last_run).toLocaleDateString() : 'Never'}
            color="yellow"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#333]">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'upcoming', label: 'Upcoming Events', icon: Calendar },
          { id: 'recyclable', label: 'Recyclable Content', icon: Recycle },
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Events */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Today's Events
            </h2>
            {upcoming.length > 0 && upcoming[0]?.events.length > 0 ? (
              <div className="space-y-3">
                {upcoming[0].events.map(event => (
                  <div key={event.event_id} className="bg-[#252525] rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-white">
                          {eventTypeIcon(event.event_type)} {event.title_en}
                        </div>
                        {event.title_te && (
                          <div className="text-sm text-gray-400">{event.title_te}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {event.is_milestone_year && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                            Milestone
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs ${eventTypeBadge(event.event_type)}`}>
                          {event.event_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {event.years_ago} years ago • Priority: {event.priority_score}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                No events for today
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#1a1a1a] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Content Engine
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-[#252525] rounded-lg">
                <div className="font-medium text-white mb-2">How It Works</div>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Scans for birthdays & anniversaries daily at 5 AM
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Filters out fatigued content (too recent)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Prioritizes milestone years (10, 25, 50 years)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Generates AI Telugu tribute articles
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Creates drafts for admin review
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-[#252525] rounded-lg">
                <div className="font-medium text-white mb-2">Event Types</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    🎂 Birthdays
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    🙏 Death Anniversaries
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    🎬 Movie Releases
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    ⭐ Debut Anniversaries
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    🏆 Award Wins
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    📅 Historic Events
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events Tab */}
      {activeTab === 'upcoming' && (
        <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="p-4 bg-[#252525] border-b border-[#333]">
            <h2 className="font-semibold text-white">Next 7 Days</h2>
          </div>
          <div className="divide-y divide-[#333]">
            {upcoming.length > 0 ? (
              upcoming.map(day => (
                <div key={day.date} className="p-4">
                  <div className="text-sm font-medium text-orange-400 mb-3">
                    {day.date}
                  </div>
                  <div className="space-y-2">
                    {day.events.map(event => (
                      <div
                        key={event.event_id}
                        className="flex items-center justify-between bg-[#252525] rounded p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{eventTypeIcon(event.event_type)}</span>
                          <div>
                            <div className="text-white">{event.title_en}</div>
                            <div className="text-xs text-gray-500">
                              {event.years_ago} years • Priority {event.priority_score}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.is_milestone_year && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs ${eventTypeBadge(event.event_type)}`}>
                            {event.event_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                No upcoming events found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recyclable Content Tab */}
      {activeTab === 'recyclable' && (
        <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="p-4 bg-[#252525] border-b border-[#333]">
            <h2 className="font-semibold text-white">High-Performing Recyclable Content</h2>
            <p className="text-sm text-gray-400 mt-1">
              Content that performed well and can be recycled with updates
            </p>
          </div>
          <div className="divide-y divide-[#333]">
            {recyclable.length > 0 ? (
              recyclable.map(content => (
                <div key={content.event_id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{eventTypeIcon(content.event_type)}</span>
                    <div>
                      <div className="text-white">{content.title}</div>
                      <div className="text-xs text-gray-500">
                        Last published: {content.last_published}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-green-400 font-medium">
                        {content.performance_score}%
                      </div>
                      <div className="text-xs text-gray-500">performance</div>
                    </div>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {content.recycle_strategy}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                No recyclable content found yet
              </div>
            )}
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
  color
}: {
  icon: any;
  label: string;
  value: string;
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
    </div>
  );
}
