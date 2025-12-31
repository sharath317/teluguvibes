'use client';

/**
 * ON THIS DAY WIDGET
 *
 * Homepage widget showing today's Telugu cinema events.
 * SEO-friendly, cached content, minimal client-side logic.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface OnThisDayEvent {
  type: 'birthday' | 'death_anniversary' | 'movie_release' | 'award';
  title_te: string;
  summary_te: string;
  entity_name: string;
  year: number;
  nostalgia_hook: string;
  image_url?: string;
}

interface OnThisDayData {
  day_key: string;
  events: OnThisDayEvent[];
  event_count: number;
}

export function OnThisDayWidget() {
  const [data, setData] = useState<OnThisDayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/on-this-day');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error('Failed to fetch On This Day:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!data || data.event_count === 0) {
    return null; // Hide if no events
  }

  const today = new Date();
  const dateLabel = today.toLocaleDateString('te-IN', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📅 ఈ రోజు తెలుగు సినిమాలో
            </h2>
            <p className="text-orange-100 text-sm">{dateLabel}</p>
          </div>
          <Link
            href={`/on-this-day/${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`}
            className="text-white hover:text-orange-100 text-sm underline"
          >
            మరిన్ని చూడండి →
          </Link>
        </div>
      </div>

      {/* Events List */}
      <div className="divide-y divide-gray-700">
        {data.events.slice(0, 4).map((event, index) => (
          <OnThisDayEventCard key={index} event={event} />
        ))}
      </div>

      {/* Footer */}
      {data.event_count > 4 && (
        <div className="px-6 py-3 bg-gray-800/50 text-center">
          <Link
            href={`/on-this-day`}
            className="text-orange-400 hover:text-orange-300 text-sm"
          >
            +{data.event_count - 4} మరిన్ని సంఘటనలు చూడండి
          </Link>
        </div>
      )}
    </div>
  );
}

function OnThisDayEventCard({ event }: { event: OnThisDayEvent }) {
  const typeEmoji = {
    birthday: '🎂',
    death_anniversary: '🙏',
    movie_release: '🎬',
    award: '🏆',
  }[event.type];

  const typeLabel = {
    birthday: 'పుట్టినరోజు',
    death_anniversary: 'వర్ధంతి',
    movie_release: 'విడుదల',
    award: 'అవార్డు',
  }[event.type];

  return (
    <div className="flex gap-4 p-4 hover:bg-gray-800/50 transition-colors">
      {/* Image */}
      {event.image_url ? (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={event.image_url}
            alt={event.entity_name}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{typeEmoji}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
            {typeEmoji} {typeLabel}
          </span>
          <span className="text-xs text-gray-500">{event.year}</span>
        </div>
        <h3 className="font-medium text-white truncate">{event.title_te}</h3>
        <p className="text-sm text-gray-400 line-clamp-2">{event.summary_te}</p>
      </div>
    </div>
  );
}

export default OnThisDayWidget;
