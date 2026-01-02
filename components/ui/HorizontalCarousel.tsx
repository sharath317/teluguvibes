'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalCarouselProps {
  children: ReactNode;
  title?: string;
  titleIcon?: ReactNode;
  showAllHref?: string;
  onShowAll?: () => void;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  /** Accessible label for the carousel region */
  ariaLabel?: string;
  /** Unique ID for the carousel (for ARIA) */
  id?: string;
}

export function HorizontalCarousel({
  children,
  title,
  titleIcon,
  showAllHref,
  onShowAll,
  className = '',
  gap = 'md',
  ariaLabel,
  id,
}: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const gapClass = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }[gap];

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      // Check on mount and after children change
      setTimeout(checkScroll, 100);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [children]);

  // Generate accessible label
  const effectiveAriaLabel = ariaLabel || (title ? `${title} carousel` : 'Content carousel');
  const carouselId = id || `carousel-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <section
      className={`relative group/carousel ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={effectiveAriaLabel}
      id={carouselId}
    >
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-2 px-1">
          <h3
            id={`${carouselId}-title`}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {titleIcon}
            {title}
          </h3>
          {(showAllHref || onShowAll) && (
            showAllHref ? (
              <a
                href={showAllHref}
                className="text-xs hover:underline"
                style={{ color: 'var(--brand-primary)' }}
              >
                View All →
              </a>
            ) : (
              <button
                onClick={onShowAll}
                className="text-xs hover:underline"
                style={{ color: 'var(--brand-primary)' }}
              >
                View All →
              </button>
            )
          )}
        </div>
      )}

      {/* Scroll Container */}
      <div className="relative">
        <div
          ref={scrollRef}
          className={`flex ${gapClass} overflow-x-auto scrollbar-hide scroll-smooth pb-1`}
          role="list"
          aria-labelledby={title ? `${carouselId}-title` : undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              scroll('left');
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              scroll('right');
            }
          }}
        >
          {children}
        </div>

        {/* Navigation Arrows - Small, edge-positioned */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            aria-controls={carouselId}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-90 transition-all z-10 shadow-lg focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            aria-controls={carouselId}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-90 transition-all z-10 shadow-lg focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

// Compact card for carousel items
interface CarouselCardProps {
  title: string;
  image?: string | null;
  href: string;
  badge?: string;
  badgeColor?: string;
  overlay?: ReactNode;
  aspectRatio?: 'video' | 'square' | 'portrait';
  width?: 'xs' | 'sm' | 'md' | 'lg';
}

export function CarouselCard({
  title,
  image,
  href,
  badge,
  badgeColor = 'var(--brand-primary)',
  overlay,
  aspectRatio = 'video',
  width = 'md'
}: CarouselCardProps) {
  const aspectClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]'
  }[aspectRatio];

  const widthClass = {
    xs: 'w-28',
    sm: 'w-36',
    md: 'w-48',
    lg: 'w-64'
  }[width];

  return (
    <a
      href={href}
      className={`flex-shrink-0 ${widthClass} group cursor-pointer`}
    >
      <div className={`relative ${aspectClass} rounded-lg overflow-hidden mb-1.5`}>
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'var(--bg-tertiary)' }}
          />
        )}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badge */}
        {badge && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded uppercase"
            style={{
              background: badgeColor,
              color: badgeColor === 'var(--brand-primary)' ? 'var(--bg-primary)' : 'white'
            }}
          >
            {badge}
          </span>
        )}

        {/* Custom overlay */}
        {overlay}
      </div>

      <h4
        className="text-xs font-medium line-clamp-2 group-hover:underline"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h4>
    </a>
  );
}




