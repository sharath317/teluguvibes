'use client';

/**
 * Star Spotlight Component
 * 
 * Displays a horizontal carousel of star actors/actresses
 * with their top movies. Max 5 visible cards on desktop.
 * 
 * Features:
 * - Actor/actress images
 * - Movie count badge
 * - Average rating display
 * - Accessible carousel navigation
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Film, ChevronRight, User } from 'lucide-react';
import { HorizontalCarousel } from '@/components/ui/HorizontalCarousel';

// ============================================================
// TYPES
// ============================================================

export interface SpotlightStar {
  id: string;
  name: string;
  name_te?: string;
  image_url?: string | null;
  type: 'hero' | 'heroine' | 'director';
  movie_count: number;
  avg_rating: number;
  top_movies: Array<{
    id: string;
    title: string;
    poster_url?: string;
    rating?: number;
  }>;
  link: string;
}

interface StarSpotlightProps {
  stars: SpotlightStar[];
  title?: string;
  showAllLink?: string;
  maxVisible?: number;
  className?: string;
  /** Filter out stars without images (default: true) */
  requireImage?: boolean;
  /** Minimum movie count to show (default: 1) */
  minMovieCount?: number;
  /** Minimum average rating (default: 0) */
  minRating?: number;
}

/**
 * Validate and filter stars based on quality criteria
 */
function filterValidStars(
  stars: SpotlightStar[],
  options: {
    requireImage?: boolean;
    minMovieCount?: number;
    minRating?: number;
  }
): SpotlightStar[] {
  const {
    requireImage = true,
    minMovieCount = 1,
    minRating = 0,
  } = options;

  return stars.filter(star => {
    // Filter by image availability
    if (requireImage && !star.image_url) {
      return false;
    }

    // Filter by movie count
    if (star.movie_count < minMovieCount) {
      return false;
    }

    // Filter by rating
    if (star.avg_rating < minRating) {
      return false;
    }

    // Filter invalid entries
    if (!star.id || !star.name || !star.link) {
      return false;
    }

    return true;
  });
}

// ============================================================
// STAR CARD COMPONENT
// ============================================================

function StarCard({ star }: { star: SpotlightStar }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={star.link}
      className="group flex-shrink-0 w-36 sm:w-40 cursor-pointer"
      aria-label={`View ${star.name}'s movies`}
    >
      {/* Image Container */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-tertiary)] mb-2">
        {star.image_url && !imageError ? (
          <Image
            src={star.image_url}
            alt={star.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 144px, 160px"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]">
            <User className="w-12 h-12 text-[var(--text-tertiary)]" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Movie count badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 text-white text-xs font-medium">
          <Film className="w-3 h-3" />
          {star.movie_count}
        </div>

        {/* Rating badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold">
          <Star className="w-3 h-3 fill-current" />
          {star.avg_rating.toFixed(1)}
        </div>

        {/* Type indicator */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-white/90 text-gray-800">
          {star.type === 'hero' ? 'Actor' : star.type === 'heroine' ? 'Actress' : 'Director'}
        </div>
      </div>

      {/* Name */}
      <h4 className="text-sm font-semibold text-[var(--text-primary)] text-center truncate group-hover:text-[var(--brand-primary)] transition-colors">
        {star.name}
      </h4>
      {star.name_te && (
        <p className="text-xs text-[var(--text-secondary)] text-center truncate">
          {star.name_te}
        </p>
      )}
    </Link>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function StarSpotlight({
  stars,
  title = 'Star Spotlight',
  showAllLink,
  maxVisible = 5,
  className = '',
  requireImage = true,
  minMovieCount = 1,
  minRating = 0,
}: StarSpotlightProps) {
  const [visibleStars, setVisibleStars] = useState<SpotlightStar[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);

  useEffect(() => {
    // Filter out invalid/incomplete stars first
    const validStars = filterValidStars(stars, {
      requireImage,
      minMovieCount,
      minRating,
    });
    
    // Track how many were filtered out
    setFilteredCount(stars.length - validStars.length);
    
    // Sort by rating (highest first) then by movie count
    const sortedStars = [...validStars].sort((a, b) => {
      if (b.avg_rating !== a.avg_rating) {
        return b.avg_rating - a.avg_rating;
      }
      return b.movie_count - a.movie_count;
    });
    
    // Limit to maxVisible
    setVisibleStars(sortedStars.slice(0, maxVisible));
  }, [stars, maxVisible, requireImage, minMovieCount, minRating]);

  // Don't render if no valid stars
  if (visibleStars.length === 0) {
    return null;
  }

  return (
    <section className={`${className}`} aria-label="Star Spotlight">
      <HorizontalCarousel
        title={title}
        titleIcon={<Star className="w-4 h-4 text-[var(--brand-primary)]" />}
        showAllHref={showAllLink}
        gap="md"
        ariaLabel="Featured stars carousel"
      >
        {visibleStars.map(star => (
          <StarCard key={star.id} star={star} />
        ))}
        
        {/* View All Card (if more stars available) */}
        {stars.length > maxVisible && showAllLink && (
          <Link
            href={showAllLink}
            className="flex-shrink-0 w-36 sm:w-40 aspect-square rounded-xl bg-[var(--bg-secondary)] flex flex-col items-center justify-center gap-2 hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-[var(--brand-primary)]" />
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              View All
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {stars.length - maxVisible}+ more
            </span>
          </Link>
        )}
      </HorizontalCarousel>
    </section>
  );
}

// ============================================================
// SKELETON LOADER
// ============================================================

export function StarSpotlightSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="animate-pulse" aria-label="Loading stars">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)]" />
        <div className="w-32 h-5 rounded bg-[var(--bg-tertiary)]" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36 sm:w-40">
            <div className="aspect-square rounded-xl bg-[var(--bg-tertiary)] mb-2" />
            <div className="h-4 rounded bg-[var(--bg-tertiary)] mx-auto w-24" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default StarSpotlight;

