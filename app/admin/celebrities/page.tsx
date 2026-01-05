'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users, Search, Plus, Calendar, RefreshCw,
  Star, Check, X, Edit, Eye, Trash2,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface Celebrity {
  id: string;
  name_en: string;
  name_te?: string;
  gender: string;
  birth_date?: string;
  death_date?: string;
  occupation: string[];
  profile_image?: string;
  popularity_score: number;
  is_verified: boolean;
  is_active: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function CelebritiesPage() {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  useEffect(() => {
    fetchCelebrities();
  }, [pagination.page, filter]);

  async function fetchCelebrities() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.set('search', search);
      if (filter === 'verified') params.set('verified', 'true');
      if (filter === 'unverified') params.set('verified', 'false');

      const res = await fetch(`/api/admin/celebrities?${params}`);
      const data = await res.json();

      setCelebrities(data.celebrities || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/celebrities/sync?limit=20', { method: 'POST' });
      const data = await res.json();
      alert(`Sync complete: ${data.stats?.created || 0} created, ${data.stats?.updated || 0} updated`);
      fetchCelebrities();
    } catch (error) {
      console.error('Sync error:', error);
      alert('Sync failed');
    }
    setSyncing(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    try {
      await fetch(`/api/admin/celebrities/${id}`, { method: 'DELETE' });
      fetchCelebrities();
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    fetchCelebrities();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[#eab308]" />
            సెలబ్రిటీలు
          </h1>
          <p className="text-[#737373] mt-1">
            {pagination.total} celebrities in database
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Wikidata'}
          </button>

          <Link
            href="/admin/celebrities/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-[#ca9a06] text-black font-bold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Celebrity
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#737373]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search celebrities..."
              className="w-full pl-10 pr-4 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white focus:border-[#eab308] focus:outline-none"
            />
          </div>
        </form>

        <div className="flex gap-2">
          {(['all', 'verified', 'unverified'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-[#eab308] text-black'
                  : 'bg-[#262626] text-white hover:bg-[#333]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'verified' ? '✓ Verified' : 'Unverified'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#737373]">Loading...</div>
        ) : celebrities.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-[#737373] mx-auto mb-4" />
            <p className="text-[#737373]">No celebrities found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a1a] text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-[#737373]">Celebrity</th>
                  <th className="px-4 py-3 text-sm font-medium text-[#737373]">Occupation</th>
                  <th className="px-4 py-3 text-sm font-medium text-[#737373]">Birth Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-[#737373]">Popularity</th>
                  <th className="px-4 py-3 text-sm font-medium text-[#737373]">Status</th>
                  <th className="px-4 py-3 text-sm font-medium text-[#737373]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {celebrities.map((celeb) => (
                  <tr key={celeb.id} className="hover:bg-[#1a1a1a]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#262626]">
                          {celeb.profile_image ? (
                            <Image
                              src={celeb.profile_image}
                              alt={celeb.name_en}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#737373]">
                              {celeb.name_en[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{celeb.name_en}</div>
                          {celeb.name_te && (
                            <div className="text-sm text-[#737373]">{celeb.name_te}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#ededed]">
                      {celeb.occupation.slice(0, 2).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#737373]">
                      {celeb.birth_date
                        ? new Date(celeb.birth_date).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-[#eab308]" />
                        <span className="text-sm text-white">{celeb.popularity_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {celeb.is_verified ? (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                            <Check className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                            <X className="w-3 h-3" /> Unverified
                          </span>
                        )}
                        {celeb.death_date && (
                          <span className="px-2 py-1 bg-[#262626] text-[#737373] text-xs rounded-full">
                            Deceased
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/celebrities/${celeb.id}`}
                          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-[#737373]" />
                        </Link>
                        <Link
                          href={`/admin/celebrities/${celeb.id}/edit`}
                          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Link>
                        <button
                          onClick={() => handleDelete(celeb.id, celeb.name_en)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#262626]">
            <span className="text-sm text-[#737373]">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="p-2 bg-[#262626] hover:bg-[#333] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="p-2 bg-[#262626] hover:bg-[#333] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








