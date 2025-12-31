'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  RefreshCw,
  Trash2,
  Check,
  CheckSquare,
  Square,
  Send,
  Archive,
  AlertTriangle,
  Sparkles,
  Database,
  Download,
} from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  created_at: string;
  published_at: string | null;
}

interface Stats {
  total: number;
  drafts: number;
  published: number;
  archived: number;
}

export default function ContentManagerPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, drafts: 0, published: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [processing, setProcessing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/admin/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStats' }),
      });
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      // Fetch posts
      const url = filter === 'all'
        ? '/api/admin/posts'
        : `/api/admin/posts?status=${filter}`;
      const postsRes = await fetch(url);
      const postsData = await postsRes.json();
      if (postsData.success) setPosts(postsData.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map(p => p.id)));
    }
  };

  const bulkAction = async (action: string, status?: string) => {
    if (selectedIds.size === 0) {
      alert('No items selected');
      return;
    }

    const confirmMessage = action === 'delete'
      ? `Delete ${selectedIds.size} items permanently?`
      : `${action} ${selectedIds.size} items?`;

    if (!confirm(confirmMessage)) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: status ? 'changeStatus' : action,
          ids: Array.from(selectedIds),
          status,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        setSelectedIds(new Set());
        fetchData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (error) {
      alert('Operation failed');
    } finally {
      setProcessing(false);
    }
  };

  const deleteAllDrafts = async () => {
    if (!confirm('Delete ALL drafts permanently? This cannot be undone.')) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAllDrafts' }),
      });
      const data = await res.json();

      if (data.success) {
        alert(`Deleted ${data.count} drafts`);
        fetchData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (error) {
      alert('Operation failed');
    } finally {
      setProcessing(false);
    }
  };

  const resetDatabase = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetDatabase',
          options: { confirm: 'RESET_ALL_DATA' },
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert('Database reset completed');
        setShowResetModal(false);
        fetchData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (error) {
      alert('Reset failed');
    } finally {
      setProcessing(false);
    }
  };

  const seedFreshData = async () => {
    setProcessing(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seedFreshData' }),
      });
      const data = await res.json();

      if (data.success) {
        setSeedResult(data.results);
        fetchData();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (error) {
      alert('Seed failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge-warning">Draft</span>;
      case 'published':
        return <span className="badge-success">Published</span>;
      case 'archived':
        return <span className="badge-info">Archived</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-7 h-7 text-[var(--brand-primary)]" />
            Content Manager
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Bulk operations for drafts and posts
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`card cursor-pointer ${filter === 'all' ? 'border-[var(--brand-primary)]' : ''}`}
          onClick={() => setFilter('all')}
        >
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-sm text-[var(--text-secondary)]">Total Posts</div>
        </div>
        <div
          className={`card cursor-pointer ${filter === 'draft' ? 'border-[var(--warning)]' : ''}`}
          onClick={() => setFilter('draft')}
        >
          <div className="text-2xl font-bold text-[var(--warning)]">{stats.drafts}</div>
          <div className="text-sm text-[var(--text-secondary)]">Drafts</div>
        </div>
        <div
          className={`card cursor-pointer ${filter === 'published' ? 'border-[var(--success)]' : ''}`}
          onClick={() => setFilter('published')}
        >
          <div className="text-2xl font-bold text-[var(--success)]">{stats.published}</div>
          <div className="text-sm text-[var(--text-secondary)]">Published</div>
        </div>
        <div
          className={`card cursor-pointer ${filter === 'archived' ? 'border-[var(--info)]' : ''}`}
          onClick={() => setFilter('archived')}
        >
          <div className="text-2xl font-bold text-[var(--info)]">{stats.archived}</div>
          <div className="text-sm text-[var(--text-secondary)]">Archived</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedFreshData}
            disabled={processing}
            className="btn-primary"
          >
            <Sparkles className="w-4 h-4" />
            Seed Fresh Data
          </button>
          <button
            onClick={deleteAllDrafts}
            disabled={processing || stats.drafts === 0}
            className="btn-secondary"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Drafts ({stats.drafts})
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            disabled={processing}
            className="btn-danger"
          >
            <Database className="w-4 h-4" />
            Reset Database
          </button>
        </div>

        {/* Seed Result */}
        {seedResult && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--bg-tertiary)]">
            <h3 className="font-medium text-[var(--text-primary)] mb-2">Seed Results:</h3>
            <div className="space-y-1">
              {seedResult.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <Check className="w-4 h-4 text-[var(--success)]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--error)]" />
                  )}
                  <span className="text-[var(--text-secondary)]">{r.step}:</span>
                  <span className="text-[var(--text-primary)]">
                    {r.success ? `${r.count || 0} items` : r.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 p-4 rounded-lg bg-[var(--brand-primary)] text-white flex items-center justify-between">
          <span className="font-medium">{selectedIds.size} items selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => bulkAction('publish')}
              disabled={processing}
              className="btn bg-white/20 hover:bg-white/30 text-white"
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
            <button
              onClick={() => bulkAction('changeStatus', 'archived')}
              disabled={processing}
              className="btn bg-white/20 hover:bg-white/30 text-white"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={() => bulkAction('delete')}
              disabled={processing}
              className="btn bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Posts Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="w-12">
                <button onClick={toggleSelectAll} className="p-1">
                  {selectedIds.size === posts.length && posts.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-[var(--brand-primary)]" />
                  ) : (
                    <Square className="w-5 h-5 text-[var(--text-tertiary)]" />
                  )}
                </button>
              </th>
              <th>Title</th>
              <th>Status</th>
              <th>Category</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--text-tertiary)]" />
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[var(--text-tertiary)]">
                  No posts found
                </td>
              </tr>
            ) : (
              posts.map(post => (
                <tr key={post.id}>
                  <td>
                    <button onClick={() => toggleSelect(post.id)} className="p-1">
                      {selectedIds.has(post.id) ? (
                        <CheckSquare className="w-5 h-5 text-[var(--brand-primary)]" />
                      ) : (
                        <Square className="w-5 h-5 text-[var(--text-tertiary)]" />
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="max-w-md truncate text-[var(--text-primary)]">
                      {post.title}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] truncate">
                      /{post.slug}
                    </div>
                  </td>
                  <td>{getStatusBadge(post.status)}</td>
                  <td className="text-[var(--text-secondary)] capitalize">{post.category || '-'}</td>
                  <td className="text-[var(--text-tertiary)] text-sm">
                    {new Date(post.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--error-bg)] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[var(--error)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Reset Database
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-[var(--text-secondary)] mb-4">
              This will delete all posts, comments, tracking data, and recommendations.
              The schema and configuration will remain intact.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={resetDatabase}
                disabled={processing}
                className="btn-danger"
              >
                {processing ? 'Resetting...' : 'Yes, Reset Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
