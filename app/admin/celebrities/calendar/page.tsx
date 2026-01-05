'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar, ChevronLeft, ChevronRight,
  Cake, Heart, Film, Star, Play
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  event_type: string;
  event_month: number;
  event_day: number;
  event_year: number;
  years_ago: number;
  priority_score: number;
  celebrity: {
    id: string;
    name_en: string;
    name_te?: string;
    popularity_score: number;
    profile_image?: string;
  };
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  birthday: <Cake className="w-4 h-4 text-pink-400" />,
  death_anniversary: <Heart className="w-4 h-4 text-red-400" />,
  movie_anniversary: <Film className="w-4 h-4 text-purple-400" />,
  debut_anniversary: <Star className="w-4 h-4 text-yellow-400" />,
  career_milestone: <Star className="w-4 h-4 text-green-400" />,
};

const EVENT_LABELS: Record<string, string> = {
  birthday: 'పుట్టినరోజు',
  death_anniversary: 'వర్ధంతి',
  movie_anniversary: 'సినిమా వార్షికోత్సవం',
  debut_anniversary: 'అరంగేట్రం వార్షికోత్సవం',
  career_milestone: 'కెరీర్ మైలురాయి',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_TE = [
  'జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్',
  'జులై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'
];

export default function CalendarPage() {
  const [events, setEvents] = useState<Record<number, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalEvents, setTotalEvents] = useState(0);

  useEffect(() => {
    fetchMonthEvents();
  }, [month, year]);

  async function fetchMonthEvents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/celebrities/events?type=month&month=${month}&year=${year}`);
      const data = await res.json();
      setEvents(data.events || {});
      setTotalEvents(data.totalEvents || 0);
    } catch (error) {
      console.error('Fetch error:', error);
    }
    setLoading(false);
  }

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setMonth(newMonth);
    setYear(newYear);
  }

  async function triggerTodayJob() {
    try {
      const res = await fetch('/api/cron/on-this-day', { method: 'POST' });
      const data = await res.json();
      alert(`Job complete: ${data.stats?.created || 0} drafts created`);
    } catch (error) {
      alert('Job failed');
    }
  }

  // Generate calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Calendar className="w-7 h-7 text-[#eab308]" />
            ఈవెంట్స్ క్యాలెండర్
          </h1>
          <p className="text-[#737373] mt-1">
            {totalEvents} events in {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>

        <button
          onClick={triggerTodayJob}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Play className="w-4 h-4" />
          Run Today&apos;s Job
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-[#141414] border border-[#262626] rounded-xl p-4">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <p className="text-sm text-[#737373]">{MONTH_NAMES_TE[month - 1]}</p>
        </div>

        <button
          onClick={() => changeMonth(1)}
          className="p-2 hover:bg-[#262626] rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        {/* Week Headers */}
        <div className="grid grid-cols-7 bg-[#1a1a1a]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-[#737373]">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        {loading ? (
          <div className="p-8 text-center text-[#737373]">Loading...</div>
        ) : (
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 min-h-[100px] border-t border-r border-[#262626] bg-[#0d0d0d]" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = events[day] || [];
              const isToday = isCurrentMonth && today.getDate() === day;

              return (
                <div
                  key={day}
                  className={`p-2 min-h-[100px] border-t border-r border-[#262626] ${
                    isToday ? 'bg-[#eab308]/10' : 'hover:bg-[#1a1a1a]'
                  }`}
                >
                  {/* Day Number */}
                  <div className={`text-sm font-medium mb-2 ${
                    isToday ? 'text-[#eab308]' : 'text-white'
                  }`}>
                    {day}
                    {isToday && <span className="ml-1 text-xs">(Today)</span>}
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <Link
                        key={event.id}
                        href={`/admin/celebrities/${event.celebrity.id}`}
                        className="flex items-center gap-1 p-1 rounded bg-[#262626] hover:bg-[#333] transition-colors"
                      >
                        {EVENT_ICONS[event.event_type] || <Star className="w-3 h-3" />}
                        <span className="text-xs text-white truncate flex-1">
                          {event.celebrity.name_en.split(' ')[0]}
                        </span>
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-[#737373] text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 bg-[#141414] border border-[#262626] rounded-xl p-4">
        <span className="text-sm text-[#737373]">Legend:</span>
        {Object.entries(EVENT_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-2">
            {EVENT_ICONS[type]}
            <span className="text-sm text-white">{label}</span>
          </div>
        ))}
      </div>

      {/* Today's Events Details */}
      {isCurrentMonth && events[today.getDate()]?.length > 0 && (
        <div className="bg-gradient-to-r from-[#eab308]/20 to-transparent border border-[#eab308]/30 rounded-xl p-4">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#eab308]" />
            Today&apos;s Events
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events[today.getDate()]?.map((event) => (
              <Link
                key={event.id}
                href={`/admin/celebrities/${event.celebrity.id}`}
                className="flex items-center gap-3 p-3 bg-[#141414] border border-[#262626] rounded-lg hover:border-[#eab308] transition-colors"
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#262626] flex-shrink-0">
                  {event.celebrity.profile_image ? (
                    <Image
                      src={event.celebrity.profile_image}
                      alt={event.celebrity.name_en}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl text-[#737373]">
                      {event.celebrity.name_en[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {event.celebrity.name_en}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#737373]">
                    {EVENT_ICONS[event.event_type]}
                    <span>{EVENT_LABELS[event.event_type]}</span>
                    {event.years_ago > 0 && (
                      <span className="text-[#eab308]">({event.years_ago} years)</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}








