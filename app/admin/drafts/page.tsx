'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Check, X, ExternalLink, Edit, Newspaper, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/types/database';

interface TrendingTopic {
  title: string;
  traffic: string;
  url: string;
  source?: string;
}

interface NewsSource {
  configured: boolean;
  description: string;
  signupUrl: string;
  freeLimit: string;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [sources, setSources] = useState<Record<string, NewsSource>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingNews, setImportingNews] = useState(false);
  const [fetchingDrafts, setFetchingDrafts] = useState(true);
  const [enriching, setEnriching] = useState<string | null>(null); // postId being enriched
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchDrafts();
    fetchTrends();
    fetchSources();
  }, []);

  async function fetchSources() {
    try {
      const res = await fetch('/api/import-news');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || {});
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  }

  async function importFromNews(source: string = 'all') {
    setImportingNews(true);
    setMessage(null);
    try {
      const res = await fetch('/api/import-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();

      if (res.ok && data.imported > 0) {
        setMessage({ type: 'success', text: `${data.imported} news articles imported as drafts!` });
        fetchDrafts();
      } else if (data.sources) {
        const errors = data.sources.filter((s: any) => s.error).map((s: any) => `${s.name}: ${s.error}`);
        if (errors.length > 0) {
          setMessage({ type: 'error', text: errors.join(', ') });
        } else {
          setMessage({ type: 'error', text: 'No articles found to import' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import news' });
    } finally {
      setImportingNews(false);
    }
  }

  async function fetchDrafts() {
    setFetchingDrafts(true);
    try {
      const res = await fetch('/api/admin/drafts');
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setFetchingDrafts(false);
    }
  }

  async function fetchTrends() {
    setLoading(true);
    try {
      const res = await fetch('/api/trends');
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends || []);
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoading(false);
    }
  }

  async function importTrends() {
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/trends', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `${data.count} trends imported as drafts!` });
        fetchDrafts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to import' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import trends' });
    } finally {
      setImporting(false);
    }
  }

  async function publishDraft(id: string) {
    try {
      const res = await fetch(`/api/admin/posts/${id}/publish`, { method: 'POST' });
      if (res.ok) {
        setDrafts(drafts.filter(d => d.id !== id));
        setMessage({ type: 'success', text: 'Post published!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to publish' });
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDrafts(drafts.filter(d => d.id !== id));
        setMessage({ type: 'success', text: 'Draft deleted!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  }

  // Enrich a single draft with better content & images
  async function enrichDraft(id: string) {
    setEnriching(id);
    setMessage(null);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({
          type: 'success',
          text: `✨ Enriched! Source: ${data.source}, Content: ${data.changes?.contentLength} chars`
        });
        fetchDrafts(); // Refresh to show updated content
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enrich' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to enrich draft' });
    } finally {
      setEnriching(null);
    }
  }

  // Enrich all drafts that need better content
  async function enrichAllDrafts() {
    setEnrichingAll(true);
    setMessage(null);
    try {
      const res = await fetch('/api/enrich?status=draft&limit=20');
      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `✨ Enriched ${data.enriched} drafts (${data.failed} failed)`
        });
        fetchDrafts();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enrich' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to enrich drafts' });
    } finally {
      setEnrichingAll(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#eab308]" />
          Trending Drafts
        </h1>
        <button
          onClick={importTrends}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${importing ? 'animate-spin' : ''}`} />
          {importing ? 'Importing...' : 'Import Trends as Drafts'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/50 text-green-400'
            : 'bg-red-500/10 border border-red-500/50 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* News Sources */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-[#eab308]" />
            Import from News Sources
          </h2>
          <button
            onClick={() => importFromNews('all')}
            disabled={importingNews}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${importingNews ? 'animate-spin' : ''}`} />
            {importingNews ? 'Importing...' : 'Import All Sources'}
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(sources).map(([key, source]) => (
            <div
              key={key}
              className={`p-4 rounded-lg border ${
                source.configured
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-[#0a0a0a] border-[#262626]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white capitalize">{key}</span>
                {source.configured ? (
                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Active</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Not Set</span>
                )}
              </div>
              <p className="text-xs text-[#737373] mb-2">{source.description}</p>
              <p className="text-xs text-[#737373] mb-3">Free: {source.freeLimit}</p>
              {!source.configured && (
                <a
                  href={source.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#eab308] hover:underline flex items-center gap-1"
                >
                  Get API Key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>

        {Object.values(sources).every(s => !s.configured) && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              💡 <strong>Tip:</strong> Add API keys to your <code className="bg-[#262626] px-1 rounded">.env.local</code> file to enable auto-import:
            </p>
            <pre className="mt-2 text-xs text-[#737373] bg-[#0a0a0a] p-3 rounded overflow-x-auto">
{`NEWSDATA_API_KEY=your_key_here
GNEWS_API_KEY=your_key_here
UNSPLASH_ACCESS_KEY=your_key_here
PEXELS_API_KEY=your_key_here`}
            </pre>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Drafts */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Pending Drafts ({drafts.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={enrichAllDrafts}
                disabled={enrichingAll || drafts.length === 0}
                className="text-xs flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                title="Enrich all drafts with Telugu content & images"
              >
                <Sparkles className={`w-3 h-3 ${enrichingAll ? 'animate-pulse' : ''}`} />
                {enrichingAll ? 'Enriching...' : 'Enrich All'}
              </button>
              <button
                onClick={fetchDrafts}
                disabled={fetchingDrafts}
                className="text-xs flex items-center gap-1 px-3 py-1 bg-[#262626] text-gray-300 rounded hover:bg-[#363636] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingDrafts ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {fetchingDrafts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#262626] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#737373] mb-4">
                No pending drafts. Import trends to create drafts!
              </p>
              <button
                onClick={importTrends}
                disabled={importing}
                className="px-4 py-2 bg-[#262626] text-white rounded-lg hover:bg-[#333] transition-colors"
              >
                Import Trends
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="text-white truncate">{draft.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                      <span>{new Date(draft.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{draft.category}</span>
                      {/* Content quality indicator */}
                      {(() => {
                        const contentLen = draft.telugu_body?.length || 0;
                        if (contentLen < 200) {
                          return (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">
                              ⚠️ {contentLen} chars
                            </span>
                          );
                        } else if (contentLen < 500) {
                          return (
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">
                              📝 {contentLen} chars
                            </span>
                          );
                        } else {
                          return (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">
                              ✅ {contentLen} chars
                            </span>
                          );
                        }
                      })()}
                      {/* Image indicator */}
                      {draft.image_url ? (
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">
                          🖼️
                        </span>
                      ) : draft.image_urls && draft.image_urls.length > 0 ? (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">
                          📷 Stock
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">
                          ❌ No img
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => enrichDraft(draft.id)}
                      disabled={enriching === draft.id}
                      className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Enrich with Telugu content & images"
                    >
                      <Wand2 className={`w-4 h-4 text-purple-400 ${enriching === draft.id ? 'animate-pulse' : ''}`} />
                    </button>
                    <Link
                      href={`/admin/posts/${draft.id}/edit`}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Link>
                    <button
                      onClick={() => publishDraft(draft.id)}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                      title="Publish"
                    >
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Trends */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Trending Topics (India)
            </h2>
            <button
              onClick={fetchTrends}
              disabled={loading}
              className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-[#737373] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-[#262626] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : trends.length === 0 ? (
            <p className="text-[#737373] text-center py-8">
              Unable to fetch trends. Try again.
            </p>
          ) : (
            <div className="space-y-2">
              {trends.slice(0, 10).map((trend, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#eab308] font-bold w-6">#{index + 1}</span>
                    <span className="text-white text-sm">{trend.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#737373]">{trend.traffic}</span>
                    {trend.source && (
                      <span className="text-xs px-2 py-0.5 bg-[#262626] rounded text-[#737373]">
                        {trend.source}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-[#737373] mt-4 text-center">
            💡 Click "Import Trends as Drafts" to create posts from these topics
          </p>
        </div>
      </div>
    </div>
  );
}
