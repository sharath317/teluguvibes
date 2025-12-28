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
  // Use picsum.photos as fallback with unique seed based on post id
  const imageUrl = post.image_urls?.[0] || `https://picsum.photos/seed/${post.id}/800/600`;

  return (
    <Link href={`/post/${post.slug}`}>
      <article
        className={`news-card bg-[#141414] rounded-xl overflow-hidden border border-[#262626] hover:border-[#eab308]/50 ${
          featured ? 'col-span-2 row-span-2' : ''
        }`}
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
          <div className="absolute top-3 left-3">
            <span className={`badge-${post.category} px-3 py-1 rounded-full text-xs font-bold text-white`}>
              {categoryLabels[post.category]}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3
            className={`font-bold text-white line-clamp-2 hover:text-[#eab308] transition-colors ${
              featured ? 'text-xl md:text-2xl' : 'text-base'
            }`}
          >
            {post.title}
          </h3>

          {featured && (
            <p className="mt-2 text-[#737373] text-sm line-clamp-2">
              {post.telugu_body.substring(0, 150)}...
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#737373]">
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
      className={`bg-[#141414] rounded-xl overflow-hidden border border-[#262626] animate-pulse ${
        featured ? 'col-span-2 row-span-2' : ''
      }`}
    >
      <div className={`bg-[#262626] ${featured ? 'aspect-video' : 'aspect-[16/10]'}`} />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#262626] rounded w-3/4" />
        <div className="h-4 bg-[#262626] rounded w-1/2" />
        {featured && <div className="h-3 bg-[#262626] rounded w-full" />}
        <div className="flex gap-4">
          <div className="h-3 bg-[#262626] rounded w-20" />
          <div className="h-3 bg-[#262626] rounded w-16" />
        </div>
      </div>
    </div>
  );
}
