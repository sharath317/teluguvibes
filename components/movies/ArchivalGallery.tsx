'use client';

/**
 * ARCHIVAL GALLERY COMPONENT
 * 
 * Displays a timeline/gallery of archival visuals for canonical films.
 * Positions the site as a museum-quality archive rather than just a database.
 * 
 * Features:
 * - Timeline view of archival images
 * - Source attribution display
 * - License information
 * - Lightbox for full-size viewing
 * - "Historical Visual Record" branding
 */

import { useState, useEffect } from 'react';
import {
  Archive,
  Camera,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  ExternalLink,
  Info,
  Building,
} from 'lucide-react';
import { ArchivalTypeBadge, LicenseBadge, SourceBadge } from '@/components/ui/ArchivalTypeBadge';
import type { MovieArchivalImage, VisualType, ArchivalSourceType, LicenseType } from '@/lib/visual-intelligence/types';
import { VISUAL_TYPE_LABELS } from '@/lib/visual-intelligence/types';

// ============================================================
// TYPES
// ============================================================

interface ArchivalGalleryProps {
  /** Movie ID to fetch images for */
  movieId: string;
  /** Movie title for display */
  movieTitle: string;
  /** Movie release year */
  releaseYear?: number;
  /** Pre-fetched images (optional) */
  images?: MovieArchivalImage[];
  /** Enable lightbox */
  enableLightbox?: boolean;
  /** Show timeline view */
  showTimeline?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================
// LIGHTBOX COMPONENT
// ============================================================

interface LightboxProps {
  image: MovieArchivalImage;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function Lightbox({ image, onClose, onPrev, onNext, hasPrev, hasNext }: LightboxProps) {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Image */}
      <div className="max-w-4xl max-h-[80vh] mx-auto px-12">
        <img
          src={image.image_url}
          alt={`${VISUAL_TYPE_LABELS[image.image_type || image.visual_type || 'still']} - ${image.source_name || 'Unknown'}`}
          className="max-w-full max-h-[70vh] object-contain mx-auto"
        />

        {/* Image info */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <ArchivalTypeBadge
              visualType={image.image_type || image.visual_type || 'still'}
              sourceType={image.source_type}
              sourceName={image.source_name}
              licenseType={image.license_type}
              size="md"
              showTooltip={false}
            />
            <LicenseBadge licenseType={image.license_type} size="sm" />
          </div>
          <p className="text-gray-300">{image.source_name}</p>
          {image.year_estimated && (
            <p className="text-gray-500 text-sm">Circa {image.year_estimated}</p>
          )}
          {image.attribution_text && (
            <p className="text-gray-400 text-sm italic mt-2">{image.attribution_text}</p>
          )}
          {image.description && (
            <p className="text-gray-400 text-sm mt-2 max-w-2xl mx-auto">{image.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TIMELINE ITEM
// ============================================================

interface TimelineItemProps {
  image: MovieArchivalImage;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}

function TimelineItem({ image, isFirst, isLast, onClick }: TimelineItemProps) {
  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className={`absolute left-3 w-0.5 bg-gray-700 ${isFirst ? 'top-4' : 'top-0'} ${isLast ? 'h-4' : 'bottom-0'}`} />
      
      {/* Timeline dot */}
      <div className="absolute left-1.5 top-4 w-4 h-4 rounded-full bg-gray-800 border-2 border-orange-500" />

      {/* Content */}
      <div
        onClick={onClick}
        className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer mb-4"
      >
        <div className="flex">
          {/* Thumbnail */}
          <div className="w-24 h-36 flex-shrink-0 relative">
            <img
              src={image.image_url}
              alt={VISUAL_TYPE_LABELS[image.image_type || image.visual_type || 'still']}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-900/50" />
          </div>

          {/* Info */}
          <div className="flex-1 p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArchivalTypeBadge
                visualType={image.image_type || image.visual_type || 'still'}
                size="xs"
                showTooltip={false}
              />
              {image.year_estimated && (
                <span className="text-xs text-gray-500">{image.year_estimated}</span>
              )}
            </div>
            <p className="text-sm text-gray-300 mb-1">{VISUAL_TYPE_LABELS[image.image_type || image.visual_type || 'still']}</p>
            <p className="text-xs text-gray-500">{image.source_name}</p>
            {image.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{image.description}</p>
            )}
          </div>

          {/* Expand icon */}
          <div className="p-3 flex items-center">
            <Maximize2 className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GRID VIEW
// ============================================================

interface GridItemProps {
  image: MovieArchivalImage;
  onClick: () => void;
}

function GridItem({ image, onClick }: GridItemProps) {
  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-all"
    >
      <div className="aspect-[2/3]">
        <img
          src={image.image_url}
          alt={VISUAL_TYPE_LABELS[image.image_type || image.visual_type || 'still']}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      </div>

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <ArchivalTypeBadge
            visualType={image.image_type || image.visual_type || 'still'}
            size="xs"
            showTooltip={false}
          />
          <p className="text-xs text-gray-300 mt-1">{image.source_name}</p>
          {image.year_estimated && (
            <p className="text-xs text-gray-500">{image.year_estimated}</p>
          )}
        </div>
      </div>

      {/* Primary badge */}
      {image.is_primary && (
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 text-[10px] bg-orange-600 text-white rounded">Primary</span>
        </div>
      )}

      {/* Expand icon */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ArchivalGallery({
  movieId,
  movieTitle,
  releaseYear,
  images: preloadedImages,
  enableLightbox = true,
  showTimeline = false,
  className = '',
}: ArchivalGalleryProps) {
  const [images, setImages] = useState<MovieArchivalImage[]>(preloadedImages || []);
  const [loading, setLoading] = useState(!preloadedImages);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>(showTimeline ? 'timeline' : 'grid');

  // Fetch images if not preloaded
  useEffect(() => {
    if (preloadedImages) return;

    async function fetchImages() {
      try {
        const res = await fetch(`/api/admin/visual-intelligence/curate?movie_id=${movieId}`);
        const data = await res.json();
        setImages(data.images || []);
      } catch (error) {
        console.error('Failed to fetch archival images:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, [movieId, preloadedImages]);

  // Sort images by year (oldest first for timeline)
  const sortedImages = [...images].sort((a, b) => {
    const yearA = a.year_estimated || 9999;
    const yearB = b.year_estimated || 9999;
    return yearA - yearB;
  });

  // No images state
  if (!loading && images.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-xl p-6 border border-gray-800 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Archive className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Historical Visual Record</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No archival images available yet</p>
          <p className="text-sm mt-1">
            Contribute to the archive by adding verified historical materials
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold">Historical Visual Record</h3>
              <p className="text-sm text-gray-500">
                {movieTitle} {releaseYear && `(${releaseYear})`}
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === 'timeline' ? 'bg-gray-700 text-white' : 'text-gray-400'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
            Loading archival images...
          </div>
        ) : viewMode === 'timeline' ? (
          <div className="max-h-[600px] overflow-y-auto">
            {sortedImages.map((image, index) => (
              <TimelineItem
                key={image.id}
                image={image}
                isFirst={index === 0}
                isLast={index === sortedImages.length - 1}
                onClick={() => enableLightbox && setLightboxIndex(index)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedImages.map((image, index) => (
              <GridItem
                key={image.id}
                image={image}
                onClick={() => enableLightbox && setLightboxIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-3 h-3" />
          <span>{images.length} archival image{images.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Building className="w-3 h-3" />
          <span>Curated with respect for film heritage</span>
        </div>
      </div>

      {/* Lightbox */}
      {enableLightbox && lightboxIndex !== null && (
        <Lightbox
          image={sortedImages[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : undefined}
          onNext={lightboxIndex < sortedImages.length - 1 ? () => setLightboxIndex(lightboxIndex + 1) : undefined}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < sortedImages.length - 1}
        />
      )}
    </div>
  );
}

// ============================================================
// COMPACT GALLERY VARIANT
// ============================================================

interface CompactGalleryProps {
  movieId: string;
  images?: MovieArchivalImage[];
  maxImages?: number;
  className?: string;
}

export function CompactGallery({
  movieId,
  images: preloadedImages,
  maxImages = 4,
  className = '',
}: CompactGalleryProps) {
  const [images, setImages] = useState<MovieArchivalImage[]>(preloadedImages || []);
  const [loading, setLoading] = useState(!preloadedImages);

  useEffect(() => {
    if (preloadedImages) return;
    async function fetchImages() {
      try {
        const res = await fetch(`/api/admin/visual-intelligence/curate?movie_id=${movieId}`);
        const data = await res.json();
        setImages(data.images || []);
      } catch (error) {
        console.error('Failed to fetch archival images:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, [movieId, preloadedImages]);

  if (loading || images.length === 0) return null;

  const displayImages = images.slice(0, maxImages);
  const remaining = images.length - maxImages;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayImages.map((image) => (
        <div
          key={image.id}
          className="w-8 h-12 rounded overflow-hidden border border-gray-700"
        >
          <img
            src={image.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-8 h-12 rounded bg-gray-800 border border-gray-700 flex items-center justify-center">
          <span className="text-xs text-gray-400">+{remaining}</span>
        </div>
      )}
    </div>
  );
}

export default ArchivalGallery;

