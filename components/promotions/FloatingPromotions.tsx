'use client';

/**
 * Floating Promotions Component
 * 
 * Auto-rotating promotional banner for movies/content.
 * 
 * Features:
 * - Auto-scroll with pause on interaction
 * - Rotating banners with movie posters/trailers
 * - Fully accessible controls
 * - Smooth animations
 * - Top articles and trending movies
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play, TrendingUp, Sparkles, Film } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface PromotionItem {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link: string;
  type: 'movie' | 'article' | 'banner';
  badge?: string;
  badgeColor?: string;
}

interface FloatingPromotionsProps {
  items: PromotionItem[];
  title?: string;
  autoPlayInterval?: number; // ms, default 5000
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function FloatingPromotions({
  items,
  title = 'Featured',
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
  className = '',
  height = 'md',
}: FloatingPromotionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const heightClass = {
    sm: 'h-40',
    md: 'h-56',
    lg: 'h-72',
  }[height];

  // Navigate to next slide
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % items.length);
  }, [items.length]);

  // Navigate to previous slide
  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  // Go to specific slide
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Toggle autoplay
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (isPaused || isHovering || items.length <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goToNext, autoPlayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isHovering, items.length, autoPlayInterval, goToNext]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        goToPrev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        goToNext();
        break;
      case ' ':
        e.preventDefault();
        togglePause();
        break;
    }
  }, [goToNext, goToPrev, togglePause]);

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  return (
    <section
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={title}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Title Badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm">
        <TrendingUp className="w-4 h-4 text-[var(--brand-primary)]" />
        <span className="text-xs font-semibold text-white">{title}</span>
      </div>

      {/* Slides Container */}
      <div className={`relative ${heightClass}`}>
        {items.map((item, index) => (
          <Link
            key={item.id}
            href={item.link}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            aria-hidden={index !== currentIndex}
            tabIndex={index === currentIndex ? 0 : -1}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority={index === 0}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center">
                  <Film className="w-12 h-12 text-[var(--text-tertiary)]" />
                </div>
              )}
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              {/* Badge */}
              {item.badge && (
                <span
                  className="inline-block px-2 py-1 mb-2 text-xs font-bold uppercase rounded"
                  style={{ backgroundColor: item.badgeColor || 'var(--brand-primary)' }}
                >
                  {item.badge}
                </span>
              )}
              
              <h3 className="text-lg font-bold text-white line-clamp-2 mb-1">
                {item.title}
              </h3>
              
              {item.subtitle && (
                <p className="text-sm text-white/80 line-clamp-1">
                  {item.subtitle}
                </p>
              )}
            </div>

            {/* Type Icon */}
            <div className="absolute top-3 right-3 z-20">
              {item.type === 'movie' && (
                <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                  <Film className="w-4 h-4 text-white" />
                </div>
              )}
              {item.type === 'article' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Navigation Controls */}
      {showControls && items.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={(e) => { e.preventDefault(); goToPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => { e.preventDefault(); goToNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Pause/Play Button */}
          <button
            onClick={(e) => { e.preventDefault(); togglePause(); }}
            className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
            aria-pressed={isPaused}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-white" />
            ) : (
              <Pause className="w-4 h-4 text-white" />
            )}
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && items.length > 1 && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5"
          role="tablist"
          aria-label="Slide indicators"
        >
          {items.map((_, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to slide ${index + 1}`}
              onClick={(e) => { e.preventDefault(); goToSlide(index); }}
              className={`transition-all focus:outline-none focus:ring-2 focus:ring-white rounded-full ${
                index === currentIndex
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing slide {currentIndex + 1} of {items.length}: {currentItem.title}
      </div>
    </section>
  );
}

// ============================================================
// SKELETON LOADER
// ============================================================

export function FloatingPromotionsSkeleton({ height = 'md' }: { height?: 'sm' | 'md' | 'lg' }) {
  const heightClass = {
    sm: 'h-40',
    md: 'h-56',
    lg: 'h-72',
  }[height];

  return (
    <div className={`animate-pulse rounded-xl bg-[var(--bg-tertiary)] ${heightClass}`}>
      <div className="absolute bottom-4 left-4 space-y-2">
        <div className="w-16 h-5 rounded bg-[var(--bg-secondary)]" />
        <div className="w-48 h-6 rounded bg-[var(--bg-secondary)]" />
        <div className="w-32 h-4 rounded bg-[var(--bg-secondary)]" />
      </div>
    </div>
  );
}

export default FloatingPromotions;

