'use client';

/**
 * PhotoGalleryStrip Component
 * 
 * Horizontal scrolling image gallery (Sakshi/Tupaki style).
 * Reuses patterns from Hot page's ActressRow.
 */

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Camera, Eye } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  href: string;
  category?: string;
  views?: number;
}

interface PhotoGalleryStripProps {
  title: string;
  items: GalleryItem[];
  href?: string;
  cardSize?: 'small' | 'medium' | 'large';
  aspectRatio?: '1:1' | '3:4' | '16:9';
  showViewCount?: boolean;
  className?: string;
}

export function PhotoGalleryStrip({
  title,
  items,
  href,
  cardSize = 'medium',
  aspectRatio = '3:4',
  showViewCount = true,
  className = '',
}: PhotoGalleryStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ 
      left: direction === 'left' ? -amount : amount, 
      behavior: 'smooth' 
    });
  };

  if (items.length === 0) return null;

  const sizeClasses = {
    small: 'w-32',
    medium: 'w-40 md:w-48',
    large: 'w-48 md:w-56',
  };

  const aspectClasses = {
    '1:1': 'aspect-square',
    '3:4': 'aspect-[3/4]',
    '16:9': 'aspect-video',
  };

  return (
    <section className={`relative group/strip ${className}`}>
      <SectionHeader title={title} href={href} emoji="📸" />

      <div className="relative">
        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        >
          {items.map((item) => (
            <PhotoCard
              key={item.id}
              item={item}
              sizeClass={sizeClasses[cardSize]}
              aspectClass={aspectClasses[aspectRatio]}
              showViewCount={showViewCount}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/strip:opacity-100 transition-opacity z-10 shadow-lg"
          style={{ 
            background: 'var(--bg-secondary)', 
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
          }}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/strip:opacity-100 transition-opacity z-10 shadow-lg"
          style={{ 
            background: 'var(--bg-secondary)', 
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
          }}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Gradient overlays */}
        <div 
          className="absolute left-0 top-0 bottom-2 w-8 pointer-events-none opacity-0 group-hover/strip:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(to right, var(--bg-primary), transparent)' }}
        />
        <div 
          className="absolute right-0 top-0 bottom-2 w-8 pointer-events-none opacity-0 group-hover/strip:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(to left, var(--bg-primary), transparent)' }}
        />
      </div>
    </section>
  );
}

// Individual photo card
function PhotoCard({
  item,
  sizeClass,
  aspectClass,
  showViewCount,
}: {
  item: GalleryItem;
  sizeClass: string;
  aspectClass: string;
  showViewCount: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`${sizeClass} flex-shrink-0 group cursor-pointer`}
    >
      <div 
        className={`relative ${aspectClass} rounded-lg overflow-hidden`}
        style={{ background: 'var(--bg-tertiary)' }}
      >
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 160px, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-8 h-8 opacity-30" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Category badge */}
        {item.category && (
          <div className="absolute top-2 left-2">
            <span 
              className="px-2 py-0.5 text-[10px] font-bold rounded uppercase"
              style={{ background: 'var(--brand-primary)', color: 'white' }}
            >
              {item.category}
            </span>
          </div>
        )}

        {/* View count */}
        {showViewCount && item.views !== undefined && (
          <div 
            className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px]"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
          >
            <Eye className="w-3 h-3" />
            {item.views.toLocaleString()}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 
        className="mt-2 text-xs font-medium line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
        style={{ color: 'var(--text-primary)' }}
      >
        {item.title}
      </h4>
    </Link>
  );
}

// Variant: Auto-scrolling carousel
export function PhotoCarouselAuto({
  items,
  interval = 5000,
  className = '',
}: {
  items: GalleryItem[];
  interval?: number;
  className?: string;
}) {
  // Simple auto-scroll implementation
  // For full implementation, use the AutoCarousel from Hot page
  
  return (
    <div className={`overflow-hidden ${className}`}>
      <div 
        className="flex animate-ticker"
        style={{ animationDuration: `${items.length * 5}s` }}
      >
        {[...items, ...items].map((item, idx) => (
          <Link
            key={`${item.id}-${idx}`}
            href={item.href}
            className="flex-shrink-0 w-48 mx-2"
          >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default PhotoGalleryStrip;






