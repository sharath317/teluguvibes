'use client';

/**
 * Source Conflicts Admin Page
 * 
 * Display and resolve data conflicts between external sources.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SourceClaim {
  source: string;
  value: unknown;
  trustLevel: number;
  fetchedAt: string;
}

interface Conflict {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  field: string;
  claims: SourceClaim[];
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'resolved' | 'dismissed';
  resolution?: {
    resolvedValue: unknown;
    resolvedBy: string;
    resolvedAt: string;
    reason: string;
  };
  created_at: string;
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [resolutionValue, setResolutionValue] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');

  useEffect(() => {
    fetchConflicts();
  }, [filter]);

  async function fetchConflicts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/conflicts?status=${filter}`);
      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveConflict() {
    if (!selectedConflict || !resolutionValue) return;

    try {
      await fetch(`/api/admin/conflicts/${selectedConflict.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          value: resolutionValue,
          reason: resolutionReason,
        }),
      });
      setSelectedConflict(null);
      setResolutionValue('');
      setResolutionReason('');
      fetchConflicts();
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  }

  async function dismissConflict(conflictId: string) {
    try {
      await fetch(`/api/admin/conflicts/${conflictId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });
      fetchConflicts();
    } catch (error) {
      console.error('Error dismissing conflict:', error);
    }
  }

  const severityColors = {
    minor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    major: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
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
          Source Conflicts
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Resolve data discrepancies between external sources
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'open', 'resolved'] as const).map((f) => (
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
          <div className="text-2xl font-bold text-red-400">
            {conflicts.filter(c => c.severity === 'critical' && c.status === 'open').length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Critical Open</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-400">
            {conflicts.filter(c => c.severity === 'major' && c.status === 'open').length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Major Open</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {conflicts.filter(c => c.severity === 'minor' && c.status === 'open').length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Minor Open</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">
            {conflicts.filter(c => c.status === 'resolved').length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Resolved</div>
        </div>
      </div>

      {/* Conflicts List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          Loading conflicts...
        </div>
      ) : conflicts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎉</div>
          <div className="text-xl text-[var(--text-primary)]">No conflicts!</div>
          <div className="text-[var(--text-secondary)]">All data sources are in agreement.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${severityColors[conflict.severity]}`}>
                      {conflict.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {conflict.entity_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      conflict.status === 'resolved' 
                        ? 'bg-green-500/20 text-green-400' 
                        : conflict.status === 'dismissed'
                        ? 'bg-gray-500/20 text-gray-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {conflict.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {conflict.entity_title || conflict.entity_id}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Conflict in: <code className="bg-[var(--bg-tertiary)] px-1 rounded">{conflict.field}</code>
                  </p>
                </div>
                <div className="text-right text-xs text-[var(--text-tertiary)]">
                  {new Date(conflict.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Claims comparison */}
              <div className="space-y-2 mb-4">
                <div className="text-xs text-[var(--text-tertiary)] mb-2">Conflicting Values</div>
                {conflict.claims.map((claim, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[var(--bg-tertiary)] rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-[var(--bg-hover)] rounded text-xs font-medium text-[var(--text-secondary)]">
                        {claim.source}
                      </span>
                      <span className="text-sm text-[var(--text-primary)] font-mono">
                        {JSON.stringify(claim.value)}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      Trust: {Math.round(claim.trustLevel * 100)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Resolution info */}
              {conflict.resolution && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                  <div className="text-xs text-green-400 mb-1">Resolved</div>
                  <div className="text-sm text-[var(--text-primary)]">
                    Value: <code className="font-mono">{JSON.stringify(conflict.resolution.resolvedValue)}</code>
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-1">
                    By {conflict.resolution.resolvedBy} • {conflict.resolution.reason}
                  </div>
                </div>
              )}

              {/* Actions */}
              {conflict.status === 'open' && (
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => dismissConflict(conflict.id)}
                    className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-hover)]"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => setSelectedConflict(conflict)}
                    className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90"
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Resolve Conflict
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {selectedConflict.entity_title} → {selectedConflict.field}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Resolved Value
                </label>
                <input
                  type="text"
                  value={resolutionValue}
                  onChange={(e) => setResolutionValue(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)]"
                  placeholder="Enter the correct value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Reason
                </label>
                <textarea
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)]"
                  rows={3}
                  placeholder="Why is this the correct value?"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setSelectedConflict(null)}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={resolveConflict}
                className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-medium"
              >
                Save Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


