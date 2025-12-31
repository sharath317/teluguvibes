/**
 * ON THIS DAY - SEO STATIC PAGE
 *
 * Permanently cached pages for each day of the year.
 * URL: /on-this-day/YYYY/MM/DD
 *
 * WHY STATIC:
 * - Same content every year (with "Updated for YYYY" badge)
 * - Excellent for SEO
 * - Zero server cost after first generation
 */

import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getOnThisDay } from '@/lib/evergreen/on-this-day';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    year: string;
    month: string;
    day: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, month, day } = await params;
  const date = new Date(`${year}-${month}-${day}`);

  if (isNaN(date.getTime())) {
    return { title: 'Invalid Date' };
  }

  const dateLabel = date.toLocaleDateString('te-IN', {
    month: 'long',
    day: 'numeric',
  });

  return {
    title: `ఈ రోజు తెలుగు సినిమాలో - ${dateLabel}`,
    description: `${dateLabel} న జరిగిన తెలుగు సినిమా సంఘటనలు - పుట్టినరోజులు, వర్ధంతులు, సినిమా విడుదలలు`,
    openGraph: {
      title: `ఈ రోజు తెలుగు సినిమాలో - ${dateLabel}`,
      description: `తెలుగు సినిమా చరిత్రలో ${dateLabel}`,
      type: 'article',
    },
  };
}

export default async function OnThisDayPage({ params }: PageProps) {
  const { year, month, day } = await params;
  const date = new Date(`${year}-${month}-${day}`);

  if (isNaN(date.getTime())) {
    notFound();
  }

  const data = await getOnThisDay(date);
  const currentYear = new Date().getFullYear();
  const isToday = new Date().toDateString() === date.toDateString();

  const dateLabel = date.toLocaleDateString('te-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Previous and next day links
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const formatDateUrl = (d: Date) =>
    `/on-this-day/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            📅 ఈ రోజు తెలుగు సినిమాలో
          </h1>
          <p className="text-xl text-orange-400">{dateLabel}</p>
          {isToday && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              🟢 ఈరోజు
            </span>
          )}
          {data.year_generated < currentYear && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              🔄 {currentYear} కోసం అప్‌డేట్ చేయబడింది
            </span>
          )}
        </header>

        {/* Navigation */}
        <nav className="flex justify-between items-center mb-8">
          <Link
            href={formatDateUrl(prevDate)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            ← మునుపటి రోజు
          </Link>
          <Link
            href="/on-this-day"
            className="text-orange-400 hover:text-orange-300"
          >
            అన్ని తేదీలు
          </Link>
          <Link
            href={formatDateUrl(nextDate)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            తదుపరి రోజు →
          </Link>
        </nav>

        {/* Events */}
        {data.event_count === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-400 text-lg">
              ఈ రోజు కోసం ఎటువంటి సంఘటనలు కనుగొనబడలేదు
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.events.map((event, index) => (
              <article key={index} className="card overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  {event.image_url && (
                    <div className="relative w-full md:w-48 h-48 flex-shrink-0">
                      <Image
                        src={event.image_url}
                        alt={event.entity_name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-6">
                    {/* Type badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <EventTypeBadge type={event.type} />
                      <span className="text-sm text-gray-500">{event.year}</span>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">
                      {event.title_te}
                    </h2>

                    <p className="text-gray-300 mb-4">{event.summary_te}</p>

                    {/* Nostalgia hook */}
                    <div className="p-3 bg-gray-800/50 rounded-lg border-l-4 border-orange-500">
                      <p className="text-gray-400 italic text-sm">
                        ✨ {event.nostalgia_hook}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `ఈ రోజు తెలుగు సినిమాలో - ${dateLabel}`,
              datePublished: date.toISOString(),
              dateModified: new Date().toISOString(),
              author: {
                '@type': 'Organization',
                name: 'TeluguVibes',
              },
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://teluguvibes.com/on-this-day/${year}/${month}/${day}`,
              },
            }),
          }}
        />
      </div>
    </div>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const config = {
    birthday: { emoji: '🎂', label: 'పుట్టినరోజు', color: 'bg-pink-500/20 text-pink-400' },
    death_anniversary: { emoji: '🙏', label: 'వర్ధంతి', color: 'bg-gray-500/20 text-gray-400' },
    movie_release: { emoji: '🎬', label: 'విడుదల', color: 'bg-blue-500/20 text-blue-400' },
    award: { emoji: '🏆', label: 'అవార్డు', color: 'bg-yellow-500/20 text-yellow-400' },
  }[type] || { emoji: '📌', label: type, color: 'bg-gray-500/20 text-gray-400' };

  return (
    <span className={`px-2 py-1 rounded text-sm ${config.color}`}>
      {config.emoji} {config.label}
    </span>
  );
}



