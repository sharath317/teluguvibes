'use client';

/**
 * Audit Log Admin Page
 * 
 * View all administrative actions for compliance and debugging.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_title?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  reason?: string;
  source: string;
  created_at: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEntries();
  }, [entityFilter, actionFilter, page]);

  async function fetchEntries() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        ...(entityFilter !== 'all' && { entity_type: entityFilter }),
        ...(actionFilter !== 'all' && { action: actionFilter }),
      });
      
      const res = await fetch(`/api/admin/audit-log?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  }

  const actionColors: Record<string, string> = {
    create: 'bg-green-500/20 text-green-400',
    update: 'bg-blue-500/20 text-blue-400',
    delete: 'bg-red-500/20 text-red-400',
    publish: 'bg-purple-500/20 text-purple-400',
    unpublish: 'bg-gray-500/20 text-gray-400',
    verify: 'bg-teal-500/20 text-teal-400',
    lock: 'bg-orange-500/20 text-orange-400',
    unlock: 'bg-yellow-500/20 text-yellow-400',
    approve: 'bg-green-500/20 text-green-400',
    reject: 'bg-red-500/20 text-red-400',
    resolve: 'bg-cyan-500/20 text-cyan-400',
  };

  const entityTypes = ['all', 'movie', 'celebrity', 'review', 'conflict', 'verification'];
  const actionTypes = ['all', 'create', 'update', 'delete', 'publish', 'verify', 'lock', 'approve', 'reject', 'resolve'];

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
          Audit Log
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Complete history of all administrative actions
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-xs text-[var(--text-tertiary)] mb-1">Entity Type</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)]"
          >
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-tertiary)] mb-1">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[var(--text-primary)]"
          >
            {actionTypes.map((action) => (
              <option key={action} value={action}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Log Entries */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          Loading audit log...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-xl text-[var(--text-primary)]">No entries found</div>
          <div className="text-[var(--text-secondary)]">Try adjusting your filters.</div>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <>
                    <tr 
                      key={entry.id}
                      className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">
                          {entry.user_name || entry.user_email}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {entry.user_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          actionColors[entry.action] || 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">
                          {entry.entity_title || entry.entity_id}
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {entry.entity_type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-tertiary)]">
                        {entry.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {expandedId === entry.id ? '▼' : '▶'}
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-details`}>
                        <td colSpan={6} className="px-4 py-4 bg-[var(--bg-tertiary)]">
                          <div className="space-y-4">
                            {entry.reason && (
                              <div>
                                <div className="text-xs text-[var(--text-tertiary)] mb-1">Reason</div>
                                <div className="text-sm text-[var(--text-primary)]">{entry.reason}</div>
                              </div>
                            )}
                            {entry.changes && (
                              <div>
                                <div className="text-xs text-[var(--text-tertiary)] mb-1">Changes</div>
                                <pre className="text-xs text-[var(--text-primary)] bg-[var(--bg-secondary)] p-2 rounded overflow-x-auto">
                                  {JSON.stringify(entry.changes, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.before_state && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-[var(--text-tertiary)] mb-1">Before</div>
                                  <pre className="text-xs text-[var(--text-primary)] bg-[var(--bg-secondary)] p-2 rounded overflow-x-auto max-h-40">
                                    {JSON.stringify(entry.before_state, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-xs text-[var(--text-tertiary)] mb-1">After</div>
                                  <pre className="text-xs text-[var(--text-primary)] bg-[var(--bg-secondary)] p-2 rounded overflow-x-auto max-h-40">
                                    {JSON.stringify(entry.after_state, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-[var(--text-tertiary)]">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


