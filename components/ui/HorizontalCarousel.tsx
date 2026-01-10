'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Import design system primitives
import { IconButton } from '@/components/ui/primitives/Button';
import { Text } from '@/components/ui/primitives/Text';
import { Badge } from '@/components/ui/primitives/Badge';

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
          <Text
            as="h3"
            variant="label"
            weight="semibold"
            className="flex items-center gap-2"
            id={`${carouselId}-title`}
          >
            {titleIcon}
            {title}
          </Text>
          {(showAllHref || onShowAll) && (
            showAllHref ? (
              <Text
                as="a"
                href={showAllHref}
                variant="caption"
                color="brand"
                className="hover:underline"
              >
                View All →
              </Text>
            ) : (
              <button
                onClick={onShowAll}
                className="text-xs text-[var(--brand-primary)] hover:underline"
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

        {/* Navigation Arrows - Using IconButton primitive */}
        {canScrollLeft && (
          <IconButton
            variant="secondary"
            size="sm"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            aria-controls={carouselId}
            icon={<ChevronLeft className="w-4 h-4" aria-hidden="true" />}
            className="absolute left-0 top-1/2 -translate-y-1/2 !w-7 !h-7 opacity-0 group-hover/carousel:opacity-90 transition-all z-10 shadow-lg"
          />
        )}
        {canScrollRight && (
          <IconButton
            variant="secondary"
            size="sm"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            aria-controls={carouselId}
            icon={<ChevronRight className="w-4 h-4" aria-hidden="true" />}
            className="absolute right-0 top-1/2 -translate-y-1/2 !w-7 !h-7 opacity-0 group-hover/carousel:opacity-90 transition-all z-10 shadow-lg"
          />
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

        {/* Badge - Using Badge primitive */}
        {badge && (
          <Badge
            variant="primary"
            size="sm"
            className="absolute top-1.5 left-1.5 uppercase"
          >
            {badge}
          </Badge>
        )}

        {/* Custom overlay */}
        {overlay}
      </div>

      <Text
        as="h4"
        variant="caption"
        weight="medium"
        className="line-clamp-2 group-hover:underline"
      >
        {title}
      </Text>
    </a>
  );
}



