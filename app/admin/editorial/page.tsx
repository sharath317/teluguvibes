'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Brain, MessageSquareQuote, Search, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, Lightbulb, Users, BarChart3, Target,
  RefreshCw, Eye, FileText, Sparkles, Quote, ExternalLink, Star
} from 'lucide-react';

interface POVMetrics {
  totalWithPOV: number;
  totalWithoutPOV: number;
  avgImpactScore: number;
  topPOVTypes: { type: string; count: number; impact: number }[];
}

interface CitationMetrics {
  totalCitations: number;
  citedPosts: number;
  topSources: { source: string; count: number }[];
  topQueries: { query: string; count: number }[];
}

interface PublishingGate {
  post_id: string;
  title: string;
  has_human_pov: boolean;
  has_citation_block: boolean;
  has_answer_summary: boolean;
  all_gates_passed: boolean;
}

interface POVSuggestion {
  id: string;
  post_id: string;
  post_title: string;
  suggested_type: string;
  suggested_text: string;
  reasoning: string;
}

export default function EditorialIntelligencePage() {
  const [activeTab, setActiveTab] = useState<'queue' | 'featured' | 'posts' | 'media' | 'celebrities' | 'community'>('queue');
  const [povMetrics, setPovMetrics] = useState<POVMetrics | null>(null);
  const [citationMetrics, setCitationMetrics] = useState<CitationMetrics | null>(null);
  const [pendingGates, setPendingGates] = useState<PublishingGate[]>([]);
  const [povSuggestions, setPovSuggestions] = useState<POVSuggestion[]>([]);
  const [recentCitations, setRecentCitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEditorialData();
  }, []);

  async function fetchEditorialData() {
    setLoading(true);
    try {
      const [povRes, citationRes, gatesRes, suggestionsRes, recentRes] = await Promise.all([
        fetch('/api/admin/editorial/pov-metrics'),
        fetch('/api/admin/editorial/citation-metrics'),
        fetch('/api/admin/editorial/pending-gates'),
        fetch('/api/admin/editorial/pov-suggestions'),
        fetch('/api/admin/editorial/recent-citations'),
      ]);

      if (povRes.ok) setPovMetrics(await povRes.json());
      if (citationRes.ok) setCitationMetrics(await citationRes.json());
      if (gatesRes.ok) setPendingGates((await gatesRes.json()).gates || []);
      if (suggestionsRes.ok) setPovSuggestions((await suggestionsRes.json()).suggestions || []);
      if (recentRes.ok) setRecentCitations((await recentRes.json()).citations || []);
    } catch (error) {
      console.error('Error fetching editorial data:', error);
    }
    setLoading(false);
  }

  const povTypeLabels: Record<string, string> = {
    insider_trivia: 'Insider Trivia',
    cultural_context: 'Cultural Context',
    opinionated_framing: 'Editorial Opinion',
    industry_relevance: 'Industry Insight',
    personal_anecdote: 'Personal Story',
    prediction: 'Prediction',
    comparison: 'Comparison',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl">
            <MessageSquareQuote className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Editorial Oversight</h1>
            <p className="text-gray-400 text-sm">
              Approve/reject queue • Featured content • Posts, Media, Celebrities, Community
            </p>
          </div>
        </div>

        <button
          onClick={fetchEditorialData}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#333] mb-6">
        {[
          { id: 'queue', label: 'Approval Queue', icon: CheckCircle },
          { id: 'featured', label: 'Featured Content', icon: Star },
          { id: 'posts', label: 'Posts', icon: FileText },
          { id: 'media', label: 'Media', icon: Eye },
          { id: 'celebrities', label: 'Celebrities', icon: Users },
          { id: 'community', label: 'Community', icon: Target },
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

      {loading && activeTab === 'queue' ? (
        <div className="text-center py-12 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading editorial intelligence...</p>
        </div>
      ) : (
        <>
          {/* Approval Queue Tab */}
          {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<MessageSquareQuote />}
              label="Posts with POV"
              value={povMetrics?.totalWithPOV || 0}
              subtext={`${povMetrics?.totalWithoutPOV || 0} missing`}
              color="orange"
            />
            <StatCard
              icon={<Quote />}
              label="AI Citations"
              value={citationMetrics?.totalCitations || 0}
              subtext={`${citationMetrics?.citedPosts || 0} posts cited`}
              color="green"
            />
            <StatCard
              icon={<Target />}
              label="Avg POV Impact"
              value={`${(povMetrics?.avgImpactScore || 0).toFixed(1)}%`}
              subtext="Bounce reduction"
              color="blue"
            />
            <StatCard
              icon={<AlertTriangle />}
              label="Pending Gates"
              value={pendingGates.length}
              subtext="Need attention"
              color="yellow"
            />
          </section>

          {/* Publishing Gates (Posts Needing Attention) */}
          <section className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-bold text-white">Publishing Gates</h2>
              </div>
              <span className="text-sm text-gray-500">Posts blocked from publishing</span>
            </div>

            {pendingGates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>All posts meet publishing requirements!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingGates.slice(0, 5).map((gate) => (
                  <div
                    key={gate.post_id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-xl"
                  >
                    <div className="flex-1">
                      <Link
                        href={`/admin/posts/${gate.post_id}/edit`}
                        className="font-medium text-white hover:text-orange-400"
                      >
                        {gate.title}
                      </Link>
                      <div className="flex items-center gap-4 mt-2">
                        <GateStatus label="POV" passed={gate.has_human_pov} />
                        <GateStatus label="Citations" passed={gate.has_citation_block} />
                        <GateStatus label="Summary" passed={gate.has_answer_summary} />
                      </div>
                    </div>
                    <Link
                      href={`/admin/editorial/post/${gate.post_id}`}
                      className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30 transition-colors"
                    >
                      Fix Now
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* POV Suggestions for Editors */}
          <section className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-white">AI-Suggested POV Ideas</h2>
              <span className="text-xs text-gray-500 ml-auto">Help editors add human perspective</span>
            </div>

            {povSuggestions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No pending POV suggestions</p>
            ) : (
              <div className="space-y-4">
                {povSuggestions.slice(0, 3).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                          {povTypeLabels[suggestion.suggested_type] || suggestion.suggested_type}
                        </span>
                        <p className="text-white mt-2">{suggestion.suggested_text}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          For: <span className="text-gray-400">{suggestion.post_title}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Why: {suggestion.reasoning}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* POV Impact by Type */}
            <section className="bg-gray-900 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">POV Impact by Type</h2>
              </div>

              <div className="space-y-3">
                {(povMetrics?.topPOVTypes || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-32 truncate">
                      {povTypeLabels[item.type] || item.type}
                    </span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${Math.min(100, item.impact)}%` }}
                      />
                    </div>
                    <span className="text-sm text-white w-12 text-right">
                      {item.impact.toFixed(1)}%
                    </span>
                  </div>
                ))}

                {(!povMetrics?.topPOVTypes || povMetrics.topPOVTypes.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No POV data yet</p>
                )}
              </div>
            </section>

            {/* Citation Sources */}
            <section className="bg-gray-900 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-white">Citation Sources</h2>
              </div>

              <div className="space-y-3">
                {(citationMetrics?.topSources || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <span className="text-white">{item.source}</span>
                    </div>
                    <span className="text-sm px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                      {item.count} citations
                    </span>
                  </div>
                ))}

                {(!citationMetrics?.topSources || citationMetrics.topSources.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No citations tracked yet</p>
                )}
              </div>
            </section>
          </div>

          {/* Recent Citations (Posts Quoted by AI) */}
          <section className="bg-gray-900 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-white">Recently Cited by AI</h2>
              <span className="text-xs text-gray-500 ml-auto">Posts quoted in AI search results</span>
            </div>

            {recentCitations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No citations recorded yet. Optimize posts with Q&A blocks to get cited!
              </p>
            ) : (
              <div className="space-y-3">
                {recentCitations.map((citation, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20"
                  >
                    <div>
                      <p className="font-medium text-white">{citation.post_title}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Cited by {citation.source} for: "{citation.query}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-500">
                      <Quote className="w-4 h-4" />
                      <span className="text-sm">Cited!</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI Fatigue Warnings */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold text-white">AI Content Fatigue Warnings</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <WarningCard
                title="Generic Openings Detected"
                description="3 posts start with similar AI patterns. Add unique hooks."
                action="Review"
              />
              <WarningCard
                title="Missing Human Context"
                description="5 entertainment posts lack Telugu cinema cultural references."
                action="Add POV"
              />
            </div>
          </section>

          {/* Quick Actions */}
          <section className="flex flex-wrap gap-4">
            <ActionButton
              icon={<FileText />}
              label="Generate All Summaries"
              onClick={() => {}}
            />
            <ActionButton
              icon={<Quote />}
              label="Generate Citation Blocks"
              onClick={() => {}}
            />
            <ActionButton
              icon={<Users />}
              label="Update Author Schemas"
              onClick={() => {}}
            />
            <ActionButton
              icon={<BarChart3 />}
              label="Export Analytics"
              onClick={() => {}}
            />
          </section>
        </div>
          )}
          
          {/* Featured Content Tab */}
          {activeTab === 'featured' && (
            <div className="space-y-6">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 text-center">
                <Star className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Featured Content Management</h3>
                <p className="text-gray-400 text-sm">
                  Promote and feature content across the platform. Coming soon.
                </p>
              </div>
            </div>
          )}
          
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-8">
                <FileText className="w-12 h-12 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Posts Management</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Manage all posts, drafts, and publications.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/admin/posts"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    View All Posts
                  </Link>
                  <Link
                    href="/admin/posts/new"
                    className="px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#363636] transition-colors"
                  >
                    Create New Post
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-8">
                <Eye className="w-12 h-12 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Media Management</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Manage hot media, images, and visual content.
                </p>
                <Link
                  href="/admin/media"
                  className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Manage Media
                </Link>
              </div>
            </div>
          )}
          
          {/* Celebrities Tab */}
          {activeTab === 'celebrities' && (
            <div className="space-y-6">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-8">
                <Users className="w-12 h-12 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Celebrity Management</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Manage celebrity profiles, events, and calendar.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/admin/celebrities"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    View All Celebrities
                  </Link>
                  <Link
                    href="/admin/celebrities/calendar"
                    className="px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#363636] transition-colors"
                  >
                    Events Calendar
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Community Tab */}
          {activeTab === 'community' && (
            <div className="space-y-6">
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-8">
                <Target className="w-12 h-12 text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Community Management</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Manage dedications, games, and community features.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/admin/dedications"
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Manage Dedications
                  </Link>
                  <Link
                    href="/admin/games"
                    className="px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#363636] transition-colors"
                  >
                    Manage Games
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== COMPONENTS =====

function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext: string;
  color: 'orange' | 'green' | 'blue' | 'yellow';
}) {
  const colors = {
    orange: 'bg-orange-500/20 text-orange-500',
    green: 'bg-green-500/20 text-green-500',
    blue: 'bg-blue-500/20 text-blue-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className={`p-2 rounded-lg w-fit ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-xs text-gray-600 mt-1">{subtext}</p>
    </div>
  );
}

function GateStatus({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-1 text-sm">
      {passed ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className={passed ? 'text-gray-400' : 'text-red-400'}>{label}</span>
    </div>
  );
}

function WarningCard({ title, description, action }: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="p-4 bg-red-900/20 rounded-xl">
      <h4 className="font-medium text-red-400">{title}</h4>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
      <button className="mt-3 text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
        {action} <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}






