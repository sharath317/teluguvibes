'use client';

/**
 * Sakshi-Style Mobile Bottom Menu
 * 
 * Features:
 * - Single bottom menu with two tabs (Popular / Recent)
 * - Content cards displayed inside menu panel
 * - Smooth slide-up animation
 * - Touch-friendly targets
 * - Zero layout shifts
 * - Accessible with ARIA
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Clock, ChevronUp, ChevronDown, Film, Star } from 'lucide-react';
import { useScrollLock } from '@/hooks/useModalState';

// ============================================================
// TYPES
// ============================================================

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  link: string;
  rating?: number;
  date?: string;
  type: 'movie' | 'article' | 'review';
}

interface BottomMenuProps {
  popularItems: ContentItem[];
  recentItems: ContentItem[];
  className?: string;
}

type TabType = 'popular' | 'recent';

// ============================================================
// CONTENT CARD COMPONENT
// ============================================================

function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Link
      href={item.link}
      className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors touch-manipulation"
      style={{ minHeight: '72px' }}
    >
      {/* Image */}
      <div className="relative w-12 h-16 rounded-md overflow-hidden flex-shrink-0 bg-[var(--bg-tertiary)]">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-5 h-5 text-[var(--text-tertiary)]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-[var(--text-primary)] truncate">
          {item.title}
        </h4>
        {item.subtitle && (
          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
            {item.subtitle}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {item.rating && (
            <span className="flex items-center gap-0.5 text-xs text-[var(--brand-primary)]">
              <Star className="w-3 h-3 fill-current" />
              {item.rating.toFixed(1)}
            </span>
          )}
          {item.date && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {item.date}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function BottomMenu({ popularItems, recentItems, className = '' }: BottomMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('popular');
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Lock scroll when menu is open
  useScrollLock(isOpen);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle toggle
  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Don't render on desktop
  if (!isMobile) return null;

  const currentItems = activeTab === 'popular' ? popularItems : recentItems;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu Container */}
      <div
        ref={menuRef}
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${className}`}
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% - 56px))',
        }}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Quick navigation menu"
      >
        {/* Toggle Button / Header */}
        <button
          onClick={toggleMenu}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] touch-manipulation"
          aria-expanded={isOpen}
          aria-controls="bottom-menu-content"
          style={{ minHeight: '56px' }}
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {isOpen ? 'Close' : 'Quick Access'}
          </span>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <ChevronUp className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>

        {/* Menu Content */}
        <div
          id="bottom-menu-content"
          className="bg-[var(--bg-primary)] border-t border-[var(--border-secondary)]"
          style={{ maxHeight: '60vh', overflowY: 'auto' }}
        >
          {/* Tabs */}
          <div
            className="flex border-b border-[var(--border-secondary)]"
            role="tablist"
            aria-label="Content categories"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'popular'}
              aria-controls="panel-popular"
              id="tab-popular"
              onClick={() => handleTabChange('popular')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors touch-manipulation ${
                activeTab === 'popular'
                  ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              style={{ minHeight: '48px' }}
            >
              <TrendingUp className="w-4 h-4" />
              Popular
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'recent'}
              aria-controls="panel-recent"
              id="tab-recent"
              onClick={() => handleTabChange('recent')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors touch-manipulation ${
                activeTab === 'recent'
                  ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              style={{ minHeight: '48px' }}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
          </div>

          {/* Tab Panels */}
          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="p-3 space-y-2"
          >
            {currentItems.length > 0 ? (
              currentItems.slice(0, 5).map(item => (
                <ContentCard key={item.id} item={item} />
              ))
            ) : (
              <div className="py-8 text-center text-[var(--text-tertiary)]">
                No items available
              </div>
            )}

            {/* View All Link */}
            {currentItems.length > 5 && (
              <Link
                href={activeTab === 'popular' ? '/reviews?sort=popular' : '/reviews?sort=recent'}
                className="block text-center py-3 text-sm font-medium text-[var(--brand-primary)] hover:underline"
              >
                View All →
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default BottomMenu;

