import Image from 'next/image';
import Link from 'next/link';
import { Clock, Eye } from 'lucide-react';
import type { Post, Category } from '@/types/database';

interface NewsCardProps {
  post: Post;
  featured?: boolean;
}

const categoryLabels: Record<Category, string> = {
  gossip: 'గాసిప్',
  sports: 'స్పోర్ట్స్',
  politics: 'రాజకీయాలు',
  entertainment: 'వినోదం',
  trending: 'ట్రెండింగ్',
};

const categoryColors: Record<Category, string> = {
  gossip: '#ec4899',
  sports: '#3b82f6',
  politics: '#ef4444',
  entertainment: '#a855f7',
  trending: '#f59e0b',
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

export function NewsCard({ post, featured = false }: NewsCardProps) {
  const imageUrl = post.image_url || post.image_urls?.[0] || `https://picsum.photos/seed/${post.id}/800/600`;

  return (
    <Link href={`/post/${post.slug}`}>
      <article
        className={`news-card rounded-xl overflow-hidden transition-all hover:shadow-lg ${
          featured ? 'col-span-2 row-span-2' : ''
        }`}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)'
        }}
      >
        {/* Image */}
        <div className={`relative ${featured ? 'aspect-video' : 'aspect-[16/10]'}`}>
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            sizes={featured ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
          />
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
              style={{ backgroundColor: categoryColors[post.category] }}
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
