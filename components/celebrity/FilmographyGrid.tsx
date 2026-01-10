'use client';

/**
 * Filmography Grid Component
 * Displays categorized movie grid with tabs for different groupings
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Film, Calendar, Clapperboard, TrendingUp } from 'lucide-react';
import type { FilmographyItem } from '@/lib/celebrity/types';

interface FilmographyGridProps {
  filmography: FilmographyItem[];
  celebritySlug: string;
  className?: string;
}

type GroupBy = 'decade' | 'verdict' | 'genre';

export function FilmographyGrid({ filmography, celebritySlug, className = '' }: FilmographyGridProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('decade');
  const [showAll, setShowAll] = useState(false);

  if (filmography.length === 0) {
    return null;
  }

  // Group movies
  const grouped = groupMovies(filmography, groupBy);
  const groups = Object.entries(grouped);

  // Limit display
  const displayedGroups = showAll ? groups : groups.slice(0, 3);
  const hasMore = groups.length > 3;

  return (
    <section className={`${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Film className="w-5 h-5 text-orange-400" />
          <span>Filmography</span>
          <span className="text-sm font-normal text-[var(--text-secondary)]">({filmography.length} films)</span>
        </h2>

        {/* Group by tabs */}
        <div className="flex gap-2">
          <GroupTab 
            active={groupBy === 'decade'} 
            onClick={() => setGroupBy('decade')}
            icon={Calendar}
            label="By Decade"
          />
          <GroupTab 
            active={groupBy === 'verdict'} 
            onClick={() => setGroupBy('verdict')}
            icon={TrendingUp}
            label="By Result"
          />
          <GroupTab 
            active={groupBy === 'genre'} 
            onClick={() => setGroupBy('genre')}
            icon={Clapperboard}
            label="By Genre"
          />
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-8">
        {displayedGroups.map(([groupName, movies]) => (
          <div key={groupName}>
            <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
              {getGroupIcon(groupBy, groupName)}
              <span>{formatGroupName(groupBy, groupName)}</span>
              <span className="text-sm text-gray-500">({movies.length})</span>
            </h3>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {movies.slice(0, 12).map((movie) => (
                <MovieCard key={movie.movie_id} movie={movie} />
              ))}
              {movies.length > 12 && (
                <div className="aspect-[2/3] flex items-center justify-center bg-[var(--bg-secondary)]/50 rounded-lg">
                  <span className="text-[var(--text-secondary)] text-sm">+{movies.length - 12} more</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show more / View full career */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 bg-[var(--bg-secondary)] hover:bg-gray-700 rounded-lg text-sm text-[var(--text-secondary)] transition-colors"
          >
            {showAll ? 'Show Less' : `Show All ${groups.length} Groups`}
          </button>
        )}
        <Link
          href={`/celebrity/${celebritySlug}/career`}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm text-[var(--text-primary)] transition-colors"
        >
          View Full Career →
        </Link>
      </div>
    </section>
  );
}

function GroupTab({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: any; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active 
          ? 'bg-orange-500 text-[var(--text-primary)]' 
          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function MovieCard({ movie }: { movie: FilmographyItem }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/reviews/${movie.slug}`}
      className="group relative"
    >
      <div 
        className="aspect-[2/3] rounded-lg overflow-hidden border-2 transition-transform group-hover:scale-105"
        style={{ borderColor: movie.verdict_color || '#374151' }}
      >
        {movie.poster_url && !imageError ? (
          <Image
            src={movie.poster_url}
            alt={movie.title_en || movie.movie_title || 'Movie'}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center p-2 text-center bg-[var(--bg-secondary)]"
          >
            <span className="text-xs text-[var(--text-secondary)] line-clamp-3">
              {movie.title_en}
            </span>
          </div>
        )}

        {/* Verdict badge */}
        {movie.verdict && (
          <div
            className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-[var(--text-primary)] shadow-lg"
            style={{ backgroundColor: movie.verdict_color || '#374151' }}
          >
            {getVerdictShort(movie.verdict)}
          </div>
        )}

        {/* Blockbuster badge */}
        {movie.is_blockbuster && (
          <div className="absolute top-1 left-1 text-sm">🔥</div>
        )}
      </div>

      {/* Info */}
      <div className="mt-1.5">
        <h4 className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-orange-400 transition-colors">
          {movie.title_te || movie.title_en}
        </h4>
        <p className="text-[10px] text-gray-500">{movie.release_year}</p>
      </div>
    </Link>
  );
}

// Helper functions
function groupMovies(movies: FilmographyItem[], groupBy: GroupBy): Record<string, FilmographyItem[]> {
  const grouped: Record<string, FilmographyItem[]> = {};

  for (const movie of movies) {
    let keys: string[];

    switch (groupBy) {
      case 'decade':
        keys = [getDecade(movie.release_year)];
        break;
      case 'verdict':
        keys = [normalizeVerdict(movie.verdict)];
        break;
      case 'genre':
        keys = movie.genres?.length ? movie.genres.slice(0, 2) : ['Unknown'];
        break;
      default:
        keys = ['All'];
    }

    for (const key of keys) {
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(movie);
    }
  }

  // Sort groups
  if (groupBy === 'decade') {
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
    );
  }

  if (groupBy === 'verdict') {
    const order = ['Blockbuster', 'Hit', 'Average', 'Flop', 'Unknown'];
    return Object.fromEntries(
      order.filter(k => grouped[k]).map(k => [k, grouped[k]])
    );
  }

  // Sort by count for genre
  return Object.fromEntries(
    Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)
  );
}

function getDecade(year?: number): string {
  if (!year) return 'Unknown';
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
}

function normalizeVerdict(verdict?: string): string {
  if (!verdict) return 'Unknown';
  const v = verdict.toLowerCase();
  if (['industry-hit', 'blockbuster', 'super-hit'].includes(v)) return 'Blockbuster';
  if (v === 'hit') return 'Hit';
  if (v === 'average') return 'Average';
  if (['flop', 'disaster', 'below-average'].includes(v)) return 'Flop';
  return 'Unknown';
}

function getVerdictShort(verdict: string): string {
  const shorts: Record<string, string> = {
    'industry-hit': 'IH',
    'blockbuster': 'BB',
    'super-hit': 'SH',
    'hit': 'H',
    'average': 'A',
    'below-average': 'BA',
    'flop': 'F',
    'disaster': 'D',
  };
  return shorts[verdict.toLowerCase()] || '?';
}

function getGroupIcon(groupBy: GroupBy, groupName: string): string {
  if (groupBy === 'verdict') {
    const icons: Record<string, string> = {
      'Blockbuster': '🔥',
      'Hit': '✅',
      'Average': '➖',
      'Flop': '❌',
      'Unknown': '❓',
    };
    return icons[groupName] || '📽️';
  }
  if (groupBy === 'decade') return '📅';
  return '🎬';
}

function formatGroupName(groupBy: GroupBy, groupName: string): string {
  if (groupBy === 'decade' && groupName !== 'Unknown') {
    return `${groupName}`;
  }
  return groupName;
}


