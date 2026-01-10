'use client';

/**
 * Verification Queue Admin Page
 * 
 * Shows items requiring human verification before auto-approval.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface VerificationItem {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  field: string;
  current_value: unknown;
  suggested_value: unknown;
  sources: { source: string; value: unknown; trust: number }[];
  consensus_score: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
  created_at: string;
}

export default function VerificationQueuePage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'critical'>('pending');

  useEffect(() => {
    fetchItems();
  }, [filter]);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verification?status=${filter}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching verification queue:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(itemId: string, action: 'approve' | 'reject' | 'defer') {
    try {
      await fetch(`/api/admin/verification/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchItems();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  }

  const priorityColors = {
    low: 'bg-gray-500/20 text-gray-400',
    normal: 'bg-blue-500/20 text-blue-400',
    high: 'bg-orange-500/20 text-orange-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/admin" 
          className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-2 inline-block"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Verification Queue
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Review and approve facts that require human verification
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'critical'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {items.filter(i => i.status === 'pending').length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Pending</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="text-2xl font-bold text-red-400">
            {items.filter(i => i.priority === 'critical').length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Critical</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">
            {items.filter(i => i.status === 'approved').length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Approved Today</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {items.length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Total Items</div>
        </div>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          Loading verification queue...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">✅</div>
          <div className="text-xl text-[var(--text-primary)]">Queue is empty!</div>
          <div className="text-[var(--text-secondary)]">No items require verification.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[item.priority]}`}>
                      {item.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {item.entity_type}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {item.entity_title || item.entity_id}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Field: <code className="bg-[var(--bg-tertiary)] px-1 rounded">{item.field}</code>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[var(--text-tertiary)]">
                    Consensus: {Math.round((item.consensus_score || 0) * 100)}%
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Values comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">Current Value</div>
                  <div className="text-sm text-[var(--text-primary)] font-mono">
                    {JSON.stringify(item.current_value) || 'null'}
                  </div>
                </div>
                <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--text-tertiary)] mb-1">Suggested Value</div>
                  <div className="text-sm text-[var(--brand-primary)] font-mono">
                    {JSON.stringify(item.suggested_value) || 'null'}
                  </div>
                </div>
              </div>

              {/* Sources */}
              {item.sources && item.sources.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-[var(--text-tertiary)] mb-2">Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {item.sources.map((source, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-secondary)]"
                      >
                        {source.source} ({Math.round(source.trust * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleAction(item.id, 'defer')}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-hover)]"
                >
                  Defer
                </button>
                <button
                  onClick={() => handleAction(item.id, 'reject')}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction(item.id, 'approve')}
                  className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


