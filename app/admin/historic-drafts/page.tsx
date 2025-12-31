'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles, Calendar, Eye, Edit, Trash2,
  Check, Clock, Star, Cake, Heart
} from 'lucide-react';

interface HistoricPost {
  id: string;
  celebrity_id: string;
  event_type: string;
  event_year: number;
  slug_pattern: string;
  status: string;
  generated_at: string;
  post?: {
    id: string;
    title: string;
    status: string;
    views: number;
  };
  celebrity?: {
    name_en: string;
    name_te?: string;
    profile_image?: string;
  };
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  birthday: <Cake className="w-4 h-4 text-pink-400" />,
  death_anniversary: <Heart className="w-4 h-4 text-red-400" />,
};

export default function HistoricDraftsPage() {
  const [drafts, setDrafts] = useState<HistoricPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  async function fetchDrafts() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/posts?status=draft&category=entertainment&limit=50');
      const data = await res.json();

      // Filter for historic-style posts (those with celebrity patterns)
      const historicDrafts = (data.posts || []).filter((post: any) =>
        post.title.includes('పుట్టినరోజు') ||
        post.title.includes('వర్ధంతి') ||
        post.title.includes('శుభాకాంక్షలు')
      );

      setDrafts(historicDrafts);
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  async function publishPost(postId: string) {
    try {
      await fetch(`/api/admin/posts/${postId}/publish`, { method: 'POST' });
      fetchDrafts();
    } catch (error) {
      console.error('Publish error:', error);
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Delete this draft?')) return;

    try {
      await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      fetchDrafts();
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-[#eab308]" />
            Historic Drafts
          </h1>
          <p className="text-[#737373] mt-1">
            AI-generated celebrity event posts awaiting review
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/celebrities/calendar"
            className="flex items-center gap-2 px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            View Calendar
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Sparkles className="w-5 h-5 text-purple-400" />}
          label="Pending Drafts"
          value={drafts.length}
        />
        <StatCard
          icon={<Cake className="w-5 h-5 text-pink-400" />}
          label="Birthdays"
          value={drafts.filter(d => d.post?.title.includes('పుట్టినరోజు')).length}
        />
        <StatCard
          icon={<Heart className="w-5 h-5 text-red-400" />}
          label="Anniversaries"
          value={drafts.filter(d => d.post?.title.includes('వర్ధంతి')).length}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-400" />}
          label="Today"
          value={drafts.filter(d => {
            const today = new Date().toISOString().split('T')[0];
            return d.generated_at?.startsWith(today);
          }).length}
        />
      </div>

      {/* Drafts List */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#737373]">Loading...</div>
        ) : drafts.length === 0 ? (
          <div className="p-8 text-center">
            <Sparkles className="w-12 h-12 text-[#737373] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Historic Drafts</h3>
            <p className="text-[#737373] mb-4">
              Run the daily cron job to generate drafts for today&apos;s celebrity events
            </p>
            <Link
              href="/admin/celebrities/calendar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Go to Calendar
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {drafts.map((draft) => (
              <div key={draft.id} className="p-4 hover:bg-[#1a1a1a] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#262626] flex-shrink-0">
                    {draft.celebrity?.profile_image ? (
                      <Image
                        src={draft.celebrity.profile_image}
                        alt={draft.celebrity?.name_en || 'Celebrity'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Star className="w-6 h-6 text-[#737373]" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {draft.post?.title || 'Untitled Draft'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-[#737373]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(draft.generated_at).toLocaleDateString('en-IN')}
                      </span>
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                        Draft
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/posts/${draft.post?.id}/edit`}
                      className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-blue-400" />
                    </Link>
                    <button
                      onClick={() => draft.post?.id && publishPost(draft.post.id)}
                      className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Publish"
                    >
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                    <button
                      onClick={() => draft.post?.id && deletePost(draft.post.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#262626] rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-sm text-[#737373]">{label}</div>
        </div>
      </div>
    </div>
  );
}



