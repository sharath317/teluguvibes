'use client';

/**
 * MobileMenuCard - Sakshi.com Style Single Menu Card
 * 
 * Features:
 * - Single card with Popular | Recent tabs
 * - Horizontal scroll within each tab
 * - Finger-friendly touch targets (min 44px)
 * - Zero layout shifts
 * - Preserves scroll position on tab switch
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Clock, Star, Film, Eye } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface MenuItem {
  id: string;
  title: string;
  titleEn?: string;
  subtitle?: string;
  imageUrl?: string;
  href: string;
  rating?: number;
  views?: number;
  badge?: string;
}

interface MobileMenuCardProps {
  popularItems: MenuItem[];
  recentItems: MenuItem[];
  title?: string;
  className?: string;
}

// ============================================================
// MINI CARD COMPONENT
// ============================================================

function MiniCard({ item }: { item: MenuItem }) {
  return (
    <Link
      href={item.href}
      className="flex-shrink-0 w-28 sm:w-32 group"
      style={{ minHeight: '120px' }} // Prevent layout shift
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[var(--bg-tertiary)]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 112px, 128px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)]">
            <Film className="w-8 h-8 text-[var(--text-tertiary)]" />
          </div>
        )}
        
        {/* Rating badge */}
        {item.rating && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
            <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
            {item.rating.toFixed(1)}
          </div>
        )}
        
        {/* Badge */}
        {item.badge && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--brand-primary)] text-white">
            {item.badge}
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
      </div>
      
      {/* Title */}
      <p 
        className="mt-1.5 text-xs font-medium text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
        title={item.title}
      >
        {item.title}
      </p>
      
      {/* Views count */}
      {item.views && (
        <p className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] mt-0.5">
          <Eye className="w-2.5 h-2.5" />
          {item.views > 1000 ? `${(item.views / 1000).toFixed(1)}k` : item.views}
        </p>
      )}
    </Link>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function MobileMenuCard({
  popularItems,
  recentItems,
  title = 'Quick Access',
  className = '',
}: MobileMenuCardProps) {
  const [activeTab, setActiveTab] = useState<'popular' | 'recent'>('popular');
  const scrollPositions = useRef<{ popular: number; recent: number }>({ popular: 0, recent: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Save scroll position before tab switch
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositions.current[activeTab] = scrollContainerRef.current.scrollLeft;
    }
  }, [activeTab]);

  // Restore scroll position after tab switch
  const restoreScrollPosition = useCallback((tab: 'popular' | 'recent') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollPositions.current[tab];
    }
  }, []);

  // Handle tab switch
  const handleTabChange = useCallback((tab: 'popular' | 'recent') => {
    saveScrollPosition();
    setActiveTab(tab);
  }, [saveScrollPosition]);

  // Restore scroll position after tab change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      restoreScrollPosition(activeTab);
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [activeTab, restoreScrollPosition]);

  const items = activeTab === 'popular' ? popularItems : recentItems;

  return (
    <div 
      className={`bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden ${className}`}
      role="region"
      aria-label={title}
    >
      {/* Header with tabs */}
      <div className="flex items-center border-b border-[var(--border-secondary)]">
        {/* Popular tab */}
        <button
          onClick={() => handleTabChange('popular')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'popular'
              ? 'text-[var(--brand-primary)] bg-[var(--bg-tertiary)] border-b-2 border-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
          aria-selected={activeTab === 'popular'}
          role="tab"
          style={{ minHeight: '48px' }} // Touch target
        >
          <TrendingUp className="w-4 h-4" />
          Popular
        </button>

        {/* Recent tab */}
        <button
          onClick={() => handleTabChange('recent')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'recent'
              ? 'text-[var(--brand-primary)] bg-[var(--bg-tertiary)] border-b-2 border-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
          }`}
          aria-selected={activeTab === 'recent'}
          role="tab"
          style={{ minHeight: '48px' }} // Touch target
        >
          <Clock className="w-4 h-4" />
          Recent
        </button>
      </div>

      {/* Content */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-3 p-4 overflow-x-auto scrollbar-hide scroll-smooth"
        role="tabpanel"
        aria-label={`${activeTab === 'popular' ? 'Popular' : 'Recent'} items`}
      >
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8 text-[var(--text-tertiary)] text-sm">
            No items available
          </div>
        ) : (
          items.map((item) => (
            <MiniCard key={item.id} item={item} />
          ))
        )}
      </div>

      {/* View all link */}
      {items.length > 0 && (
        <Link
          href={activeTab === 'popular' ? '/hot' : '/reviews'}
          className="block text-center py-2.5 text-sm font-medium text-[var(--brand-primary)] hover:bg-[var(--bg-tertiary)] transition-colors border-t border-[var(--border-secondary)]"
          style={{ minHeight: '44px' }} // Touch target
        >
          View All →
        </Link>
      )}
    </div>
  );
}

export default MobileMenuCard;

