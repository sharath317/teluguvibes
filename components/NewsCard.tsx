import Image from 'next/image';
import Link from 'next/link';
import { Clock, Eye } from 'lucide-react';
import type { Post, Category } from '@/types/database';
import { getCategoryMeta } from '@/lib/config/navigation';

interface NewsCardProps {
  post: Post;
  featured?: boolean;
}

const categoryLabels: Partial<Record<Category, string>> = {
  gossip: 'గాసిప్',
  sports: 'స్పోర్ట్స్',
  politics: 'రాజకీయాలు',
  entertainment: 'వినోదం',
  trending: 'ట్రెండింగ్',
};

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

// Default category styling for categories not in CATEGORY_META
const DEFAULT_CATEGORY_META = {
  color: '#6366f1',
  glowColor: 'rgba(99, 102, 241, 0.3)',
};

// Category-specific colors for common categories
const CATEGORY_COLORS: Record<string, { color: string; glowColor: string }> = {
  entertainment: { color: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.3)' },
  sports: { color: '#22c55e', glowColor: 'rgba(34, 197, 94, 0.3)' },
  politics: { color: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.3)' },
  trending: { color: '#f97316', glowColor: 'rgba(249, 115, 22, 0.3)' },
  gossip: { color: '#ec4899', glowColor: 'rgba(236, 72, 153, 0.3)' },
  crime: { color: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.3)' },
};

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
function getSafeImageUrl(post: Post): string {
  const fallback = `https://picsum.photos/seed/${post.id}/800/600`;
  
  // Try post.image_url first
  if (isValidImageUrl(post.image_url)) {
    return post.image_url!;
  }
  
  // Try first image in array
  const firstImage = post.image_urls?.[0];
  if (firstImage && isValidImageUrl(firstImage)) {
    return firstImage;
  }
  
  // Return fallback
  return fallback;
}

export function NewsCard({ post, featured = false }: NewsCardProps) {
  const imageUrl = getSafeImageUrl(post);
  const baseMeta = getCategoryMeta(post.category);
  
  // Get category colors with fallback
  const categoryColors = CATEGORY_COLORS[post.category] || DEFAULT_CATEGORY_META;
  const categoryMeta = {
    color: baseMeta?.color || categoryColors.color,
    glowColor: categoryColors.glowColor,
  };

  return (
    <Link href={`/post/${post.slug}`}>
      <article
        className={`news-card glow-card img-zoom rounded-xl overflow-hidden transition-all group ${
          featured ? 'col-span-2 row-span-2' : ''
        } glow-${post.category}`}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          ['--category-glow' as string]: categoryMeta.glowColor,
        }}
      >
        {/* Image */}
        <div className={`relative ${featured ? 'aspect-video' : 'aspect-[16/10]'} overflow-hidden`}>
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes={featured ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
          />
          {/* Gradient overlay on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `linear-gradient(to top, ${categoryMeta.color}40, transparent 60%)`
            }}
          />
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${categoryMeta.color}, ${categoryMeta.color}cc)`,
                boxShadow: `0 2px 8px ${categoryMeta.color}50`
              }}
            >
              {categoryLabels[post.category]}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3
            className={`font-bold line-clamp-2 transition-colors ${
              featured ? 'text-lg md:text-xl' : 'text-sm'
            }`}
            style={{ color: 'var(--text-primary)' }}
          >
            {post.title}
          </h3>

          {featured && post.telugu_body && (
            <p
              className="mt-1.5 text-xs line-clamp-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {post.telugu_body.substring(0, 150)}...
            </p>
          )}

          {/* Meta */}
          <div
            className="flex items-center gap-3 mt-2 text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.views.toLocaleString()}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function NewsCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`rounded-xl overflow-hidden animate-pulse ${
        featured ? 'col-span-2 row-span-2' : ''
      }`}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)'
      }}
    >
      <div
        className={featured ? 'aspect-video' : 'aspect-[16/10]'}
        style={{ background: 'var(--bg-tertiary)' }}
      />
      <div className="p-3 space-y-2">
        <div
          className="h-4 rounded w-3/4"
          style={{ background: 'var(--bg-tertiary)' }}
        />
        <div
          className="h-4 rounded w-1/2"
          style={{ background: 'var(--bg-tertiary)' }}
        />
        {featured && (
          <div
            className="h-3 rounded w-full"
            style={{ background: 'var(--bg-tertiary)' }}
          />
        )}
        <div className="flex gap-3 pt-1">
          <div
            className="h-3 rounded w-16"
            style={{ background: 'var(--bg-tertiary)' }}
          />
          <div
            className="h-3 rounded w-12"
            style={{ background: 'var(--bg-tertiary)' }}
          />
        </div>
      </div>
    </div>
  );
}
