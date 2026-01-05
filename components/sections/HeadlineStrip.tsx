'use client';

/**
 * HeadlineStrip Component
 * 
 * Dense list of headlines (text-focused, minimal images).
 * Sakshi-style headline list for high information density.
 */

import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';
import type { Post, Category } from '@/types/database';
import { SectionHeader } from './SectionHeader';
import { CATEGORY_META } from '@/lib/config/navigation';

interface HeadlineStripProps {
  title: string;
  posts: Post[];
  category?: Category;
  href?: string;
  showCategory?: boolean;
  showTime?: boolean;
  maxItems?: number;
  className?: string;
}

export function HeadlineStrip({
  title,
  posts,
  category,
  href,
  showCategory = false,
  showTime = true,
  maxItems = 6,
  className = '',
}: HeadlineStripProps) {
  const displayPosts = posts.slice(0, maxItems);
  const meta = category ? CATEGORY_META[category] : null;

  if (displayPosts.length === 0) return null;

  return (
    <section className={className}>
      <SectionHeader 
        title={title} 
        href={href}
        color={meta?.color}
      />
      
      <div 
        className="rounded-xl overflow-hidden"
        style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-primary)' 
        }}
      >
        {displayPosts.map((post, index) => (
          <HeadlineItem
            key={post.id}
            post={post}
            index={index + 1}
            showCategory={showCategory}
            showTime={showTime}
            isLast={index === displayPosts.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

// Individual headline item
function HeadlineItem({
  post,
  index,
  showCategory,
  showTime,
  isLast,
}: {
  post: Post;
  index: number;
  showCategory: boolean;
  showTime: boolean;
  isLast: boolean;
}) {
  const meta = CATEGORY_META[post.category];

  return (
    <Link
      href={`/post/${post.slug}`}
      className="flex items-start gap-3 p-3 transition-colors group"
      style={{ 
        borderBottom: isLast ? 'none' : '1px solid var(--border-secondary)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Index number */}
      <span 
        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
        style={{ 
          background: index <= 3 ? (meta?.color || 'var(--brand-primary)') : 'var(--bg-tertiary)',
          color: index <= 3 ? 'white' : 'var(--text-secondary)',
        }}
      >
        {index}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Category badge (optional) */}
        {showCategory && (
          <span 
            className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded mb-1"
            style={{ 
              background: meta?.bgColor || 'var(--bg-tertiary)',
              color: meta?.color || 'var(--text-secondary)',
            }}
          >
            {post.category}
          </span>
        )}

        {/* Headline */}
        <h4 
          className="text-sm font-medium line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {post.title}
        </h4>

        {/* Time */}
        {showTime && (
          <span 
            className="flex items-center gap-1 mt-1 text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Clock className="w-3 h-3" />
            {formatTimeAgo(post.created_at)}
          </span>
        )}
      </div>

      {/* Arrow indicator */}
      <ChevronRight 
        className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-tertiary)' }}
      />
    </Link>
  );
}

// Compact horizontal variant
export function HeadlineStripHorizontal({
  posts,
  className = '',
}: {
  posts: Post[];
  className?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <div className={`overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex gap-4 pb-2">
        {posts.slice(0, 8).map((post, index) => (
          <Link
            key={post.id}
            href={`/post/${post.slug}`}
            className="flex-shrink-0 max-w-[280px] group"
          >
            <div className="flex items-start gap-2">
              <span 
                className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{ 
                  background: index < 3 ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                  color: index < 3 ? 'white' : 'var(--text-secondary)',
                }}
              >
                {index + 1}
              </span>
              <p 
                className="text-sm line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                {post.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Time formatting helper
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} నిమిషాల క్రితం`;
  } else if (diffHours < 24) {
    return `${diffHours} గంటల క్రితం`;
  } else {
    return `${diffDays} రోజుల క్రితం`;
  }
}

export default HeadlineStrip;






