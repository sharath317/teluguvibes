'use client';

/**
 * CompactNewsCard Component
 * 
 * Dense news card for high-density layouts.
 * Smaller than NewsCard, suitable for lists and grids.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, TrendingUp } from 'lucide-react';
import type { Post, Category } from '@/types/database';
import { CATEGORY_META, getCategoryMeta } from '@/lib/config/navigation';

// Allowed image hosts for next/image
const ALLOWED_IMAGE_HOSTS = [
  'picsum.photos',
  'images.unsplash.com',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'image.tmdb.org',
  'www.themoviedb.org',
  'm.media-amazon.com',
  'i.ytimg.com',
];

// Check if URL is a valid image URL for next/image
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    
    // Check if host is allowed
    if (ALLOWED_IMAGE_HOSTS.includes(parsed.hostname)) {
      return true;
    }
    
    // Check if URL ends with common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
    const pathname = parsed.pathname.toLowerCase();
    if (imageExtensions.some(ext => pathname.endsWith(ext))) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// Get a safe image URL with fallback
function getSafeImageUrl(post: Post, size: string = '200/200'): string {
  const fallback = `https://picsum.photos/seed/${post.id}/${size}`;
  
  if (isValidImageUrl(post.image_url)) {
    return post.image_url!;
  }
  
  const firstImage = post.image_urls?.[0];
  if (isValidImageUrl(firstImage)) {
    return firstImage!;
  }
  
  return fallback;
}

interface CompactNewsCardProps {
  post: Post;
  variant?: 'horizontal' | 'vertical' | 'minimal';
  showImage?: boolean;
  showCategory?: boolean;
  showMeta?: boolean;
  imageSize?: 'small' | 'medium';
  className?: string;
}

export function CompactNewsCard({
  post,
  variant = 'horizontal',
  showImage = true,
  showCategory = true,
  showMeta = true,
  imageSize = 'small',
  className = '',
}: CompactNewsCardProps) {
  const imageUrl = getSafeImageUrl(post, '200/200');
  const meta = CATEGORY_META[post.category];

  if (variant === 'minimal') {
    return (
      <MinimalCard post={post} showCategory={showCategory} />
    );
  }

  if (variant === 'vertical') {
    return (
      <VerticalCard 
        post={post} 
        imageUrl={imageUrl} 
        meta={meta}
        showCategory={showCategory}
        showMeta={showMeta}
        className={className}
      />
    );
  }

  // Default: Horizontal layout
  const imageSizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-20 h-20',
  };

  return (
    <Link
      href={`/post/${post.slug}`}
      className={`flex gap-3 p-2 rounded-lg transition-colors group ${className}`}
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Thumbnail */}
      {showImage && (
        <div 
          className={`relative ${imageSizeClasses[imageSize]} rounded-lg overflow-hidden flex-shrink-0`}
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="80px"
          />
          {/* Category indicator bar */}
          <span 
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: meta?.color || 'var(--brand-primary)' }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Category badge */}
        {showCategory && (
          <span 
            className="inline-block w-fit px-1.5 py-0.5 text-[9px] font-medium rounded mb-1 uppercase"
            style={{ 
              background: meta?.bgColor || 'var(--bg-tertiary)',
              color: meta?.color || 'var(--text-secondary)',
            }}
          >
            {post.category}
          </span>
        )}

        {/* Title */}
        <h4 
          className="text-sm font-medium line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {post.title}
        </h4>

        {/* Meta */}
        {showMeta && (
          <div 
            className="flex items-center gap-2 mt-1 text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatTimeAgo(post.created_at)}
            </span>
            {post.views > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" />
                {post.views.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// Vertical card variant
function VerticalCard({
  post,
  imageUrl,
  meta,
  showCategory,
  showMeta,
  className,
}: {
  post: Post;
  imageUrl: string;
  meta: typeof CATEGORY_META[string] | undefined;
  showCategory: boolean;
  showMeta: boolean;
  className: string;
}) {
  return (
    <Link
      href={`/post/${post.slug}`}
      className={`block rounded-lg overflow-hidden transition-all glow-card group ${className}`}
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-secondary)',
        ['--glow-color' as string]: meta?.glowColor || 'var(--brand-primary)',
      }}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={imageUrl}
          alt={post.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        {/* Gradient overlay on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(to top, ${meta?.color || 'var(--brand-primary)'}40, transparent 60%)`
          }}
        />
        {showCategory && (
          <div className="absolute top-2 left-2">
            <span 
              className="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${meta?.color || 'var(--brand-primary)'}, ${meta?.color || 'var(--brand-primary)'}cc)`,
                color: 'white',
                boxShadow: `0 2px 8px ${meta?.color || 'var(--brand-primary)'}50`
              }}
            >
              {post.category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h4 
          className="text-xs font-medium line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {post.title}
        </h4>
        
        {showMeta && (
          <div 
            className="flex items-center gap-2 mt-1.5 text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span>{formatTimeAgo(post.created_at)}</span>
            {post.views > 0 && (
              <>
                <span>•</span>
                <span>{post.views.toLocaleString()} views</span>
              </>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// Minimal text-only variant
function MinimalCard({
  post,
  showCategory,
}: {
  post: Post;
  showCategory: boolean;
}) {
  const meta = CATEGORY_META[post.category];

  return (
    <Link
      href={`/post/${post.slug}`}
      className="block py-2 border-b transition-colors group"
      style={{ borderColor: 'var(--border-secondary)' }}
    >
      <div className="flex items-start gap-2">
        {/* Bullet */}
        <span 
          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
          style={{ background: meta?.color || 'var(--brand-primary)' }}
        />
        
        <div className="flex-1 min-w-0">
          {showCategory && (
            <span 
              className="text-[10px] font-medium uppercase"
              style={{ color: meta?.color || 'var(--text-secondary)' }}
            >
              {post.category}
            </span>
          )}
          <h4 
            className="text-sm line-clamp-1 group-hover:text-[var(--brand-primary)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {post.title}
          </h4>
        </div>
      </div>
    </Link>
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
    return `${diffMins}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else {
    return `${diffDays}d`;
  }
}

export default CompactNewsCard;

