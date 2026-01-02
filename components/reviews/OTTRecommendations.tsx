'use client';

/**
 * OTT Recommendations Tab Component
 * 
 * Displays movies available on streaming platforms.
 * Used in the reviews page right sidebar.
 * 
 * Features:
 * - Platform logos (Netflix, Prime, Hotstar, etc.)
 * - Movie cards with OTT badges
 * - Filter by platform
 * - Compact vertical scroll
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Film, Star, Play, ChevronRight, Tv } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type OTTPlatform = 'netflix' | 'prime' | 'hotstar' | 'zee5' | 'aha' | 'jio' | 'sonyliv' | 'other';

export interface OTTMovie {
  id: string;
  title: string;
  title_te?: string;
  slug: string;
  poster_url?: string | null;
  rating: number;
  release_year: number;
  platforms: OTTPlatform[];
  featured?: boolean;
}

interface OTTRecommendationsProps {
  movies: OTTMovie[];
  title?: string;
  maxVisible?: number;
  showAllLink?: string;
  className?: string;
}

// ============================================================
// PLATFORM CONFIG
// ============================================================

const PLATFORM_CONFIG: Record<OTTPlatform, { name: string; color: string; short: string }> = {
  netflix: { name: 'Netflix', color: '#E50914', short: 'N' },
  prime: { name: 'Prime Video', color: '#00A8E1', short: 'P' },
  hotstar: { name: 'Disney+ Hotstar', color: '#0C3B72', short: 'H' },
  zee5: { name: 'Zee5', color: '#8230C6', short: 'Z' },
  aha: { name: 'Aha', color: '#F05A28', short: 'A' },
  jio: { name: 'JioCinema', color: '#0A3B66', short: 'J' },
  sonyliv: { name: 'SonyLIV', color: '#000000', short: 'S' },
  other: { name: 'Other', color: '#666666', short: '?' },
};

// ============================================================
// PLATFORM BADGE COMPONENT
// ============================================================

function PlatformBadge({ platform, size = 'sm' }: { platform: OTTPlatform; size?: 'sm' | 'md' }) {
  const config = PLATFORM_CONFIG[platform];
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs';
  
  return (
    <div
      className={`${sizeClass} rounded flex items-center justify-center font-bold text-white`}
      style={{ backgroundColor: config.color }}
      title={config.name}
      aria-label={config.name}
    >
      {config.short}
    </div>
  );
}

// ============================================================
// OTT MOVIE CARD COMPONENT
// ============================================================

function OTTMovieCard({ movie }: { movie: OTTMovie }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/reviews/${movie.slug}`}
      className="group flex gap-3 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
      aria-label={`${movie.title} - Available on ${movie.platforms.map(p => PLATFORM_CONFIG[p].name).join(', ')}`}
    >
      {/* Poster */}
      <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-[var(--bg-tertiary)]">
        {movie.poster_url && !imageError ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="48px"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-5 h-5 text-[var(--text-tertiary)]" />
          </div>
        )}
        
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-5 h-5 text-white fill-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
          {movie.title}
        </h4>
        
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--text-tertiary)]">
            {movie.release_year}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-[var(--brand-primary)]">
            <Star className="w-3 h-3 fill-current" />
            {movie.rating.toFixed(1)}
          </span>
        </div>

        {/* Platform badges */}
        <div className="flex items-center gap-1 mt-1.5">
          {movie.platforms.slice(0, 3).map(platform => (
            <PlatformBadge key={platform} platform={platform} size="sm" />
          ))}
          {movie.platforms.length > 3 && (
            <span className="text-[10px] text-[var(--text-tertiary)]">
              +{movie.platforms.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function OTTRecommendations({
  movies,
  title = 'OTT Recommendations',
  maxVisible = 8,
  showAllLink,
  className = '',
}: OTTRecommendationsProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<OTTPlatform | 'all'>('all');

  // Get unique platforms from movies
  const availablePlatforms = Array.from(
    new Set(movies.flatMap(m => m.platforms))
  ).slice(0, 5);

  // Filter movies by platform
  const filteredMovies = selectedPlatform === 'all'
    ? movies
    : movies.filter(m => m.platforms.includes(selectedPlatform));

  const visibleMovies = filteredMovies.slice(0, maxVisible);

  if (movies.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Tv className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <div className="py-8 text-center text-[var(--text-tertiary)] text-sm">
          No OTT recommendations available
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        {showAllLink && (
          <Link
            href={showAllLink}
            className="text-xs text-[var(--brand-primary)] hover:underline"
          >
            View All
          </Link>
        )}
      </div>

      {/* Platform Filter */}
      {availablePlatforms.length > 1 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap" role="tablist" aria-label="Filter by platform">
          <button
            role="tab"
            aria-selected={selectedPlatform === 'all'}
            onClick={() => setSelectedPlatform('all')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedPlatform === 'all'
                ? 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            All
          </button>
          {availablePlatforms.map(platform => (
            <button
              key={platform}
              role="tab"
              aria-selected={selectedPlatform === platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                selectedPlatform === platform
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <PlatformBadge platform={platform} size="sm" />
              <span className="hidden sm:inline">{PLATFORM_CONFIG[platform].name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Movie List */}
      <div
        className="space-y-1 max-h-[350px] overflow-y-auto scrollbar-thin pr-1"
        role="list"
        aria-label={title}
      >
        {visibleMovies.length > 0 ? (
          visibleMovies.map(movie => (
            <div key={movie.id} role="listitem">
              <OTTMovieCard movie={movie} />
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-[var(--text-tertiary)] text-sm">
            No movies on this platform
          </div>
        )}
      </div>

      {/* View More */}
      {filteredMovies.length > maxVisible && (
        <Link
          href={showAllLink || `/reviews?ott=${selectedPlatform}`}
          className="block text-center py-2 mt-2 text-xs font-medium text-[var(--brand-primary)] hover:underline"
        >
          View {filteredMovies.length - maxVisible} more →
        </Link>
      )}
    </div>
  );
}

// ============================================================
// SKELETON LOADER
// ============================================================

export function OTTRecommendationsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)]" />
        <div className="w-32 h-5 rounded bg-[var(--bg-tertiary)]" />
      </div>
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-12 h-6 rounded bg-[var(--bg-tertiary)]" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2">
            <div className="w-12 h-16 rounded bg-[var(--bg-tertiary)]" />
            <div className="flex-1">
              <div className="h-4 w-24 rounded bg-[var(--bg-tertiary)] mb-2" />
              <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)] mb-2" />
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="w-5 h-5 rounded bg-[var(--bg-tertiary)]" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OTTRecommendations;

