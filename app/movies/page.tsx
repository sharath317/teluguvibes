/**
 * Movies Catalogue Page
 *
 * Shows all Telugu movies.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { Film, Star, Calendar, TrendingUp, Filter } from 'lucide-react';

export const revalidate = 3600;

export const metadata = {
  title: 'సినిమాలు | TeluguVibes',
  description: 'తెలుగు సినిమాల డేటాబేస్ - 1931 నుండి ప్రస్తుతం వరకు',
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DECADE_TABS = [
  { key: 'all', label: 'అన్నీ' },
  { key: '2020', label: '2020s' },
  { key: '2010', label: '2010s' },
  { key: '2000', label: '2000s' },
  { key: '1990', label: '90s' },
  { key: 'classic', label: 'క్లాసిక్స్' },
];

async function getMovies(decade?: string) {
  let query = supabase
    .from('movies')
    .select('*')
    .eq('is_published', true)
    .order('release_year', { ascending: false })
    .limit(60);

  if (decade && decade !== 'all') {
    if (decade === 'classic') {
      query = query.lt('release_year', 1990);
    } else {
      const startYear = parseInt(decade);
      query = query.gte('release_year', startYear).lt('release_year', startYear + 10);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching movies:', error);
    return [];
  }

  return data || [];
}

interface PageProps {
  searchParams: Promise<{ decade?: string }>;
}

export default async function MoviesPage({ searchParams }: PageProps) {
  const { decade } = await searchParams;
  const movies = await getMovies(decade);

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero */}
      <section className="py-12 border-b" style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            🎬 తెలుగు సినిమాలు
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            1931 నుండి ప్రస్తుతం వరకు - పూర్తి తెలుగు సినిమా కేటలాగ్
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {/* Decade Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {DECADE_TABS.map((tab) => {
            const isActive = (decade || 'all') === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === 'all' ? '/movies' : `/movies?decade=${tab.key}`}
                className={`px-4 py-2 rounded-full transition-all ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Movies Grid */}
        {movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <EmptyState decade={decade} />
        )}
      </div>
    </main>
  );
}

function MovieCard({ movie }: { movie: any }) {
  const posterUrl = movie.poster_url || `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title_en || 'Movie')}`;

  const verdictColors: Record<string, string> = {
    Blockbuster: 'bg-green-500',
    'Super Hit': 'bg-green-400',
    Hit: 'bg-emerald-500',
    Average: 'bg-yellow-500',
    Flop: 'bg-red-500',
    Disaster: 'bg-red-600',
  };

  return (
    <Link
      href={`/reviews/${movie.slug || movie.id}`}
      className="group relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-orange-500 transition-all"
    >
      <div className="aspect-[2/3] relative">
        <Image
          src={posterUrl}
          alt={movie.title_en}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Verdict Badge */}
        {movie.verdict && (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold text-white ${verdictColors[movie.verdict] || 'bg-gray-600'}`}>
            {movie.verdict}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white font-bold text-sm truncate group-hover:text-orange-400 transition-colors">
          {movie.title_te || movie.title_en}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-400 text-xs">{movie.release_year}</span>
          {movie.avg_rating > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
              <Star className="w-3 h-3 fill-yellow-400" />
              {movie.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ decade }: { decade?: string }) {
  return (
    <div className="text-center py-16">
      <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">సినిమాలు కనుగొనబడలేదు</h2>
      <p className="text-gray-400 mb-6">
        {decade
          ? `${decade} కాలంలో సినిమాలు లేవు`
          : 'డేటాబేస్ లో సినిమాలు లేవు'}
      </p>
      <Link
        href="/admin/movie-catalogue"
        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        Add Movies
      </Link>
    </div>
  );
}
