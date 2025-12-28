'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import type { Post } from '@/types/database';

interface TrendingTickerProps {
  initialPosts?: Post[];
}

export function TrendingTicker({ initialPosts = [] }: TrendingTickerProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  useEffect(() => {
    // Fetch trending posts if not provided
    if (initialPosts.length === 0) {
      fetchTrending();
    }
  }, [initialPosts]);

  async function fetchTrending() {
    try {
      const res = await fetch('/api/posts?category=trending&limit=10');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  }

  if (posts.length === 0) {
    return null;
  }

  // Duplicate posts for seamless loop
  const tickerItems = [...posts, ...posts];

  return (
    <div className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#262626]">
      <div className="flex items-center">
        {/* Breaking label */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#eab308] text-black font-bold shrink-0">
          <Flame className="w-4 h-4" />
          <span className="text-sm uppercase tracking-wide">ట్రెండింగ్</span>
        </div>

        {/* Scrolling ticker */}
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker flex whitespace-nowrap py-2">
            {tickerItems.map((post, index) => (
              <Link
                key={`${post.id}-${index}`}
                href={`/post/${post.slug}`}
                className="inline-flex items-center px-4 hover:text-[#eab308] transition-colors"
              >
                <span className="text-[#eab308] mr-2">●</span>
                <span className="text-sm">{post.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
