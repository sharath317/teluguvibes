'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Edit, Trash2, Calendar, Film, Star,
  Check, X, ExternalLink, Cake, Heart
} from 'lucide-react';

interface Celebrity {
  id: string;
  name_en: string;
  name_te?: string;
  gender: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  occupation: string[];
  short_bio?: string;
  short_bio_te?: string;
  wikidata_id?: string;
  wikipedia_url?: string;
  tmdb_id?: number;
  imdb_id?: string;
  profile_image?: string;
  popularity_score: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

interface Work {
  id: string;
  title_en: string;
  title_te?: string;
  work_type: string;
  release_year?: number;
  role_name?: string;
  is_iconic: boolean;
  poster_url?: string;
}

interface Event {
  id: string;
  event_type: string;
  event_month: number;
  event_day: number;
  event_year?: number;
  priority_score: number;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  birthday: <Cake className="w-4 h-4 text-pink-400" />,
  death_anniversary: <Heart className="w-4 h-4 text-red-400" />,
};

const EVENT_LABELS: Record<string, string> = {
  birthday: 'Birthday',
  death_anniversary: 'Death Anniversary',
  debut_anniversary: 'Debut Anniversary',
  movie_anniversary: 'Movie Anniversary',
};

export default function CelebrityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [celebrity, setCelebrity] = useState<Celebrity | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCelebrity();
  }, [id]);

  async function fetchCelebrity() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/celebrities/${id}`);
      const data = await res.json();

      if (data.celebrity) {
        setCelebrity(data.celebrity);
        setWorks(data.works || []);
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${celebrity?.name_en}? This cannot be undone.`)) return;

    try {
      await fetch(`/api/admin/celebrities/${id}`, { method: 'DELETE' });
      window.location.href = '/admin/celebrities';
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#737373]">Loading...</div>
      </div>
    );
  }

  if (!celebrity) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-white mb-2">Celebrity Not Found</h2>
        <Link href="/admin/celebrities" className="text-[#eab308] hover:underline">
          Back to Celebrities
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/celebrities"
            className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#262626]">
            {celebrity.profile_image ? (
              <Image
                src={celebrity.profile_image}
                alt={celebrity.name_en}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-[#737373]">
                {celebrity.name_en[0]}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{celebrity.name_en}</h1>
              {celebrity.is_verified && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  <Check className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            {celebrity.name_te && (
              <p className="text-lg text-[#737373]">{celebrity.name_te}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {celebrity.occupation.map((occ) => (
                <span key={occ} className="px-2 py-0.5 bg-[#262626] text-[#ededed] text-xs rounded">
                  {occ}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/celebrities/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          {celebrity.short_bio && (
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">Biography</h2>
              <p className="text-[#ededed] leading-relaxed">{celebrity.short_bio}</p>
              {celebrity.short_bio_te && (
                <p className="text-[#737373] mt-3 leading-relaxed">{celebrity.short_bio_te}</p>
              )}
            </div>
          )}

          {/* Filmography */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-[#eab308]" />
                Filmography
              </h2>
              <span className="text-sm text-[#737373]">{works.length} works</span>
            </div>

            {works.length === 0 ? (
              <p className="text-[#737373] text-center py-4">No works added yet</p>
            ) : (
              <div className="space-y-3">
                {works.slice(0, 10).map((work) => (
                  <div
                    key={work.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a]"
                  >
                    <div className="w-10 h-14 bg-[#262626] rounded flex-shrink-0 overflow-hidden">
                      {work.poster_url && (
                        <Image
                          src={work.poster_url}
                          alt={work.title_en}
                          width={40}
                          height={56}
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white flex items-center gap-2">
                        {work.title_en}
                        {work.is_iconic && <Star className="w-3 h-3 text-[#eab308]" />}
                      </div>
                      <div className="text-sm text-[#737373]">
                        {work.release_year || 'N/A'} • {work.role_name || work.work_type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Details</h2>

            <div className="space-y-3 text-sm">
              {celebrity.birth_date && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Born</span>
                  <span className="text-white">
                    {new Date(celebrity.birth_date).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {celebrity.death_date && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Died</span>
                  <span className="text-white">
                    {new Date(celebrity.death_date).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
              )}

              {celebrity.birth_place && (
                <div className="flex justify-between">
                  <span className="text-[#737373]">Birthplace</span>
                  <span className="text-white">{celebrity.birth_place}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-[#737373]">Popularity</span>
                <span className="text-[#eab308] font-bold">{celebrity.popularity_score}/100</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#737373]">Status</span>
                <span className={celebrity.is_active ? 'text-green-400' : 'text-red-400'}>
                  {celebrity.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* External Links */}
            <div className="mt-4 pt-4 border-t border-[#262626] space-y-2">
              {celebrity.wikipedia_url && (
                <a
                  href={celebrity.wikipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Wikipedia
                </a>
              )}
              {celebrity.imdb_id && (
                <a
                  href={`https://www.imdb.com/name/${celebrity.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-yellow-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  IMDB
                </a>
              )}
              {celebrity.tmdb_id && (
                <a
                  href={`https://www.themoviedb.org/person/${celebrity.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  TMDB
                </a>
              )}
            </div>
          </div>

          {/* Events */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#eab308]" />
              Events
            </h2>

            {events.length === 0 ? (
              <p className="text-[#737373] text-center py-4">No events</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2 bg-[#1a1a1a] rounded-lg"
                  >
                    {EVENT_ICONS[event.event_type] || <Star className="w-4 h-4 text-[#737373]" />}
                    <div className="flex-1">
                      <div className="text-sm text-white">
                        {EVENT_LABELS[event.event_type] || event.event_type}
                      </div>
                      <div className="text-xs text-[#737373]">
                        {event.event_month}/{event.event_day}
                        {event.event_year && ` (${event.event_year})`}
                      </div>
                    </div>
                    <span className="text-xs text-[#eab308]">
                      P: {event.priority_score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
