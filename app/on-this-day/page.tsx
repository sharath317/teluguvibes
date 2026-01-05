/**
 * ON THIS DAY - INDEX PAGE
 *
 * Shows today's events with calendar navigation.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { getOnThisDay } from '@/lib/evergreen/on-this-day';

export const metadata: Metadata = {
  title: 'ఈ రోజు తెలుగు సినిమాలో | On This Day in Telugu Cinema',
  description: 'తెలుగు సినిమా చరిత్రలో ఈ రోజు జరిగిన సంఘటనలు - పుట్టినరోజులు, వర్ధంతులు, సినిమా విడుదలలు',
};

export default async function OnThisDayIndexPage() {
  const today = new Date();
  const data = await getOnThisDay(today);

  const dateLabel = today.toLocaleDateString('te-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Generate calendar links for current month
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthName = today.toLocaleDateString('te-IN', { month: 'long' });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            📅 ఈ రోజు తెలుగు సినిమాలో
          </h1>
          <p className="text-gray-400">
            తెలుగు సినిమా చరిత్రలో ప్రతి రోజూ ఏం జరిగిందో తెలుసుకోండి
          </p>
        </header>

        {/* Today's events */}
        <section className="mb-12">
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4">
              <h2 className="text-xl font-bold text-white">🟢 నేడు - {dateLabel}</h2>
            </div>

            {data.event_count === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400">నేడు కోసం ఎటువంటి సంఘటనలు కనుగొనబడలేదు</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {data.events.slice(0, 5).map((event, index) => (
                  <div key={index} className="p-4 hover:bg-gray-800/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">
                        {event.type === 'birthday' ? '🎂' : event.type === 'death_anniversary' ? '🙏' : '🎬'}
                      </span>
                      <span className="text-xs text-gray-500">{event.year}</span>
                    </div>
                    <h3 className="font-medium text-white">{event.title_te}</h3>
                    <p className="text-sm text-gray-400 mt-1">{event.summary_te}</p>
                  </div>
                ))}
              </div>
            )}

            {data.event_count > 5 && (
              <Link
                href={`/on-this-day/${currentYear}/${String(currentMonth + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`}
                className="block px-6 py-3 bg-gray-800/50 text-center text-orange-400 hover:text-orange-300"
              >
                +{data.event_count - 5} మరిన్ని చూడండి →
              </Link>
            )}
          </div>
        </section>

        {/* Month calendar */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            📆 {monthName} {currentYear}
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['ఆది', 'సోమ', 'మంగళ', 'బుధ', 'గురు', 'శుక్ర', 'శని'].map(day => (
              <div key={day} className="text-center text-gray-500 text-sm py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for days before first day of month */}
            {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate();
              const dateUrl = `/on-this-day/${currentYear}/${String(currentMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

              return (
                <Link
                  key={day}
                  href={dateUrl}
                  className={`
                    p-2 text-center rounded-lg transition-colors
                    ${isToday
                      ? 'bg-orange-500 text-white font-bold'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {day}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Other months */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white mb-4">📅 ఇతర నెలలు</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, monthIndex) => {
              const date = new Date(currentYear, monthIndex, 1);
              const monthLabel = date.toLocaleDateString('te-IN', { month: 'long' });
              const isCurrentMonth = monthIndex === currentMonth;

              return (
                <Link
                  key={monthIndex}
                  href={`/on-this-day/${currentYear}/${String(monthIndex + 1).padStart(2, '0')}/01`}
                  className={`
                    p-3 text-center rounded-lg transition-colors
                    ${isCurrentMonth
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {monthLabel}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}








