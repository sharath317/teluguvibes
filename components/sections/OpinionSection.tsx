'use client';

/**
 * OpinionSection Component
 * 
 * Editorial/Opinion section with author-focused cards.
 * Sakshi-style opinion/editorial layout.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Quote, User, Calendar, ArrowRight } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

interface OpinionPost {
  id: string;
  title: string;
  excerpt?: string;
  author: string;
  authorImage?: string;
  authorRole?: string;
  publishedAt: string;
  href: string;
  category?: string;
}

interface OpinionSectionProps {
  title?: string;
  posts: OpinionPost[];
  href?: string;
  layout?: 'grid' | 'list' | 'featured';
  className?: string;
}

export function OpinionSection({
  title = 'సంపాదకీయం',
  posts,
  href,
  layout = 'grid',
  className = '',
}: OpinionSectionProps) {
  if (posts.length === 0) return null;

  return (
    <section className={className}>
      <SectionHeader 
        title={title} 
        emoji="📝" 
        href={href}
        color="#6366f1"
      />

      {layout === 'featured' && posts.length > 0 && (
        <FeaturedOpinionLayout posts={posts} />
      )}

      {layout === 'grid' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <OpinionCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {layout === 'list' && (
        <div className="space-y-3">
          {posts.map((post) => (
            <OpinionListItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

// Featured layout with large card + list
function FeaturedOpinionLayout({ posts }: { posts: OpinionPost[] }) {
  const [featured, ...rest] = posts;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Featured Opinion */}
      <OpinionCardLarge post={featured} />

      {/* List of other opinions */}
      <div className="space-y-3">
        {rest.slice(0, 4).map((post) => (
          <OpinionListItem key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

// Large opinion card
function OpinionCardLarge({ post }: { post: OpinionPost }) {
  return (
    <Link
      href={post.href}
      className="block rounded-xl overflow-hidden transition-all hover:shadow-lg group"
      style={{ 
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '1px solid var(--border-primary)',
      }}
    >
      <div className="p-6">
        {/* Quote icon */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(99, 102, 241, 0.2)' }}
        >
          <Quote className="w-6 h-6 text-indigo-500" />
        </div>

        {/* Title */}
        <h3 
          className="text-xl font-bold mb-3 line-clamp-3 group-hover:text-indigo-500 transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p 
            className="text-sm mb-4 line-clamp-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {post.excerpt}
          </p>
        )}

        {/* Author */}
        <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
          <div 
            className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            {post.authorImage ? (
              <Image
                src={post.authorImage}
                alt={post.author}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {post.author}
            </p>
            {post.authorRole && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {post.authorRole}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Standard opinion card
function OpinionCard({ post }: { post: OpinionPost }) {
  return (
    <Link
      href={post.href}
      className="block p-4 rounded-xl transition-all hover:shadow-md group"
      style={{ 
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
      }}
    >
      {/* Quote accent */}
      <div className="flex items-start gap-3 mb-3">
        <Quote className="w-5 h-5 flex-shrink-0 text-indigo-500 mt-1" />
        <h4 
          className="text-sm font-bold line-clamp-3 group-hover:text-indigo-500 transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {post.title}
        </h4>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2">
        <div 
          className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          {post.authorImage ? (
            <Image
              src={post.authorImage}
              alt={post.author}
              width={24}
              height={24}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {post.author}
        </span>
      </div>
    </Link>
  );
}

// List item variant
function OpinionListItem({ post }: { post: OpinionPost }) {
  return (
    <Link
      href={post.href}
      className="flex items-start gap-3 p-3 rounded-lg transition-colors group"
      style={{ background: 'var(--bg-secondary)' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
    >
      {/* Quote icon */}
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(99, 102, 241, 0.15)' }}
      >
        <Quote className="w-4 h-4 text-indigo-500" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 
          className="text-sm font-medium line-clamp-2 group-hover:text-indigo-500 transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {post.title}
        </h4>
        <div 
          className="flex items-center gap-2 mt-1 text-[10px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span>{post.author}</span>
          <span>•</span>
          <span className="flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {formatDate(post.publishedAt)}
          </span>
        </div>
      </div>

      <ArrowRight 
        className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-tertiary)' }}
      />
    </Link>
  );
}

// Date formatting helper
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('te-IN', {
    month: 'short',
    day: 'numeric',
  });
}

export default OpinionSection;






