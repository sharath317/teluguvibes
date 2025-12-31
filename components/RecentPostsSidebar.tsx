'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, TrendingUp, Eye } from 'lucide-react';
import type { Post } from '@/types/database';

interface RecentPostsSidebarProps {
  recentPosts: Post[];
  popularPosts: Post[];
}

export function RecentPostsSidebar({ recentPosts, popularPosts }: RecentPostsSidebarProps) {
  return (
    <aside className="space-y-6">
      {/* Recent Posts */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#eab308] to-[#ca9a06] px-4 py-3">
          <h3 className="font-bold text-black flex items-center gap-2">
            <Clock className="w-5 h-5" />
            తాజా వార్తలు
          </h3>
        </div>
        <div className="p-3 space-y-1">
          {recentPosts.length > 0 ? (
            recentPosts.map((post, index) => (
              <SmallPostCard key={post.id} post={post} index={index + 1} />
            ))
          ) : (
            <p className="text-[#737373] text-sm py-4 text-center">వార్తలు లేవు</p>
          )}
        </div>
      </div>

      {/* Popular Posts */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            పాపులర్ వార్తలు
          </h3>
        </div>
        <div className="p-3 space-y-1">
          {popularPosts.length > 0 ? (
            popularPosts.map((post, index) => (
              <SmallPostCard key={post.id} post={post} index={index + 1} showViews />
            ))
          ) : (
            <p className="text-[#737373] text-sm py-4 text-center">వార్తలు లేవు</p>
          )}
        </div>
      </div>
    </aside>
  );
}

function SmallPostCard({
  post,
  index,
  showViews = false
}: {
  post: Post;
  index: number;
  showViews?: boolean;
}) {
  const imageUrl = post.image_url || post.image_urls?.[0] || `https://picsum.photos/seed/${post.id}/100/100`;
  const categoryColors: Record<string, string> = {
    gossip: 'bg-pink-500',
    sports: 'bg-green-500',
    politics: 'bg-blue-500',
    entertainment: 'bg-purple-500',
    trending: 'bg-orange-500',
  };

  return (
    <Link
      href={`/post/${post.slug}`}
      className="flex gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors group"
    >
      {/* Index Number */}
      <div className="flex-shrink-0 w-6 h-6 bg-[#262626] rounded-full flex items-center justify-center text-xs font-bold text-[#eab308]">
        {index}
      </div>

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#262626]">
        <Image
          src={imageUrl}
          alt={post.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
          sizes="64px"
        />
        <span className={`absolute bottom-0 left-0 right-0 h-1 ${categoryColors[post.category] || 'bg-[#eab308]'}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm text-[#ededed] font-medium line-clamp-2 group-hover:text-[#eab308] transition-colors">
          {post.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-[#737373]">
          <span className="capitalize">{post.category}</span>
          {showViews && post.views > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {post.views.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// Standalone component for Similar Posts (used in post detail page)
export function SimilarPosts({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-[#3b82f6] to-[#2563eb] px-4 py-3">
        <h3 className="font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          ఇలాంటి వార్తలు
        </h3>
      </div>
      <div className="p-3 space-y-1">
        {posts.map((post, index) => (
          <SmallPostCard key={post.id} post={post} index={index + 1} />
        ))}
      </div>
    </div>
  );
}
