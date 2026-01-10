'use client';

/**
 * CategoryNavBar Component
 * 
 * Secondary horizontal navigation strip.
 * Shows quick-access category pills with active highlighting.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Flame } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { 
  CATEGORY_BAR, 
  MORE_MENU,
  MORE_MENU_SECTIONS,
  getCategoryMeta,
  type NavItem,
  type MenuSection,
} from '@/lib/config/navigation';

interface CategoryNavBarProps {
  className?: string;
}

export function CategoryNavBar({ className = '' }: CategoryNavBarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      // Only close if click is outside both trigger and dropdown
      if (isOutsideTrigger && (isOutsideDropdown || !dropdownRef.current)) {
        setShowMore(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Only show first 6 items in bar, rest in dropdown
  const visibleItems = CATEGORY_BAR.slice(0, 6);
  const moreItems = [...CATEGORY_BAR.slice(6), ...MORE_MENU.slice(0, 3)];

  return (
    <nav 
      className={`border-b relative ${className}`}
      style={{ 
        background: 'var(--bg-primary)', 
        borderColor: 'var(--border-secondary)' 
      }}
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center h-10 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Home Link */}
          <Link
            href="/"
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all whitespace-nowrap flex-shrink-0 mr-1 ${
              pathname === '/' ? 'text-white' : ''
            }`}
            style={{ 
              background: pathname === '/' ? 'var(--brand-primary)' : 'transparent',
              color: pathname === '/' ? 'white' : 'var(--text-secondary)',
            }}
          >
            🏠 <span className="hidden sm:inline">హోమ్</span>
          </Link>
          
          {/* Separator */}
          <div 
            className="w-px h-4 mx-1 flex-shrink-0" 
            style={{ background: 'var(--border-primary)' }} 
          />

          {/* Category Items */}
          {visibleItems.map((item) => (
            <CategoryPill
              key={item.id}
              item={item}
              isActive={isActive(item.href)}
            />
          ))}

          {/* More Dropdown Trigger - positioned outside overflow container */}
          {moreItems.length > 0 && (
            <div className="flex-shrink-0 ml-1" ref={triggerRef}>
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors whitespace-nowrap"
                style={{ 
                  background: showMore ? 'var(--bg-tertiary)' : 'transparent',
                  color: showMore ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                }}
              >
                మరిన్ని
                <ChevronDown 
                  className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} 
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* More Dropdown - Centered below trigger, 2x2 grid layout */}
      {showMore && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/20 sm:hidden"
            style={{ zIndex: 9998 }}
            onClick={() => setShowMore(false)}
          />
          
          {/* Dropdown panel */}
          <div 
            ref={dropdownRef}
            className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 top-full mt-1 w-[95vw] sm:w-auto sm:min-w-[600px] md:min-w-[700px] max-h-[80vh] overflow-y-auto rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-primary)',
              zIndex: 9999,
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b sticky top-0 flex items-center justify-between" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                🗂️ మరిన్ని విభాగాలు
                <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                  (More Sections)
                </span>
              </span>
              <button 
                onClick={() => setShowMore(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {/* Overflow items from main nav - horizontal strip */}
            {moreItems.length > 0 && (
              <div className="px-3 py-2 border-b flex gap-2 overflow-x-auto" style={{ borderColor: 'var(--border-primary)' }}>
                {moreItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap hover:bg-[var(--bg-tertiary)]"
                    style={{ 
                      color: isActive(item.href) ? 'var(--brand-primary)' : 'var(--text-primary)',
                      background: isActive(item.href) ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: '1px solid var(--border-primary)',
                    }}
                    onClick={() => setShowMore(false)}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* 2x2 Grid of Sections */}
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MORE_MENU_SECTIONS.map((section) => (
                <div 
                  key={section.id} 
                  className="rounded-lg p-3"
                  style={{ 
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-lg">{section.emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {section.title}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {section.titleTe}
                      </span>
                    </div>
                  </div>
                  
                  {/* Section items - 2 columns within each section */}
                  <div className="grid grid-cols-2 gap-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-[var(--bg-tertiary)]"
                        style={{ 
                          color: isActive(item.href) ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        }}
                        onClick={() => setShowMore(false)}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.isNew && (
                          <span 
                            className="px-1 py-0.5 text-[8px] font-bold rounded flex-shrink-0"
                            style={{ background: '#22c55e', color: 'white' }}
                          >
                            NEW
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Links Footer */}
            <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-4 text-xs">
                <Link 
                  href="/sitemap" 
                  className="hover:underline flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setShowMore(false)}
                >
                  🗺️ సైట్‌మ్యాప్
                </Link>
                <Link 
                  href="/contact" 
                  className="hover:underline flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setShowMore(false)}
                >
                  📧 సంప్రదించండి
                </Link>
                <Link 
                  href="/about" 
                  className="hover:underline flex items-center gap-1"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setShowMore(false)}
                >
                  ℹ️ మా గురించి
                </Link>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                © Telugu Portal
              </span>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

// Category pill component
function CategoryPill({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const meta = getCategoryMeta(item.id);
  
  return (
    <Link
      href={item.href}
      className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-all whitespace-nowrap flex-shrink-0 mx-0.5"
      style={{ 
        background: isActive ? meta.bgColor : 'transparent',
        color: isActive ? meta.color : 'var(--text-secondary)',
        border: isActive ? `1px solid ${meta.color}33` : '1px solid transparent',
      }}
    >
      {item.isHot && <Flame className="w-3 h-3" style={{ color: isActive ? meta.color : 'var(--text-tertiary)' }} />}
      {!item.isHot && item.emoji && <span className="text-[10px]">{item.emoji}</span>}
      <span>{item.label.replace(/🔥|💬|🏏|🏛️|🎬|⭐|📈/g, '').trim()}</span>
    </Link>
  );
}

export default CategoryNavBar;
