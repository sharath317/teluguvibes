'use client';

/**
 * Top 10 Collections Tab Component
 * 
 * Displays curated movie collections in a vertical scrollable list.
 * Used in the reviews page right sidebar.
 * 
 * Features:
 * - Collection cards with poster grid
 * - Movie count and average rating
 * - Vertical scroll with compact design
 * - Accessible navigation
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Film, Star, ChevronRight, Folder, TrendingUp } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface MovieCollection {
  id: string;
  name: string;
  name_te?: string;
  description?: string;
  slug: string;
  movie_count: number;
  avg_rating: number;
  cover_images: string[]; // First 4 movie posters
  featured?: boolean;
}

interface CollectionsTabProps {
  collections: MovieCollection[];
  title?: string;
  maxVisible?: number;
  showAllLink?: string;
  className?: string;
}

// ============================================================
// COLLECTION CARD COMPONENT
// ============================================================

function CollectionCard({ collection }: { collection: MovieCollection }) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group block p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
      aria-label={`${collection.name} collection with ${collection.movie_count} movies`}
    >
      <div className="flex gap-3">
        {/* Poster Grid (2x2) */}
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5 bg-[var(--bg-tertiary)]">
          {collection.cover_images.slice(0, 4).map((url, i) => (
            <div key={i} className="relative w-full h-full">
              {url ? (
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <div className="w-full h-full bg-[var(--bg-tertiary)]" />
              )}
            </div>
          ))}
          {/* Fill empty slots */}
          {collection.cover_images.length < 4 &&
            Array.from({ length: 4 - collection.cover_images.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center"
              >
                <Film className="w-3 h-3 text-[var(--text-tertiary)]" />
              </div>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
              {collection.name}
            </h4>
            {collection.featured && (
              <TrendingUp className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
            )}
          </div>
          
          {collection.name_te && (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {collection.name_te}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
              <Film className="w-3 h-3" />
              {collection.movie_count} movies
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--brand-primary)]">
              <Star className="w-3 h-3 fill-current" />
              {collection.avg_rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function CollectionsTab({
  collections,
  title = 'Top 10 Collections',
  maxVisible = 10,
  showAllLink,
  className = '',
}: CollectionsTabProps) {
  const visibleCollections = collections.slice(0, maxVisible);

  if (visibleCollections.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <div className="py-8 text-center text-[var(--text-tertiary)] text-sm">
          No collections available
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[var(--brand-primary)]" />
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

      {/* Collection List */}
      <div
        className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1"
        role="list"
        aria-label={title}
      >
        {visibleCollections.map((collection, index) => (
          <div key={collection.id} role="listitem">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-tertiary)] w-5 text-right">
                {index + 1}
              </span>
              <div className="flex-1">
                <CollectionCard collection={collection} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SKELETON LOADER
// ============================================================

export function CollectionsTabSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)]" />
        <div className="w-32 h-5 rounded bg-[var(--bg-tertiary)]" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-4 rounded bg-[var(--bg-tertiary)]" />
            <div className="flex-1 p-3 rounded-lg bg-[var(--bg-secondary)]">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-[var(--bg-tertiary)]" />
                <div className="flex-1">
                  <div className="h-4 w-24 rounded bg-[var(--bg-tertiary)] mb-2" />
                  <div className="h-3 w-16 rounded bg-[var(--bg-tertiary)]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CollectionsTab;

