import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TrendingTicker } from '@/components/TrendingTicker';
import { NewsCard, NewsCardSkeleton } from '@/components/NewsCard';
import { DailyInfoSidebar } from '@/components/DailyInfoSidebar';
import { AdSlot } from '@/components/AdSlot';
import type { Post } from '@/types/database';

// Create a Supabase client for server-side data fetching
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data || [];
}

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const posts = await getPosts();
  const trendingPosts = posts.filter(p => p.category === 'trending').slice(0, 5);
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <>
      {/* Trending Ticker */}
      <TrendingTicker initialPosts={trendingPosts.length > 0 ? trendingPosts : posts.slice(0, 5)} />

      {/* Header Ad */}
      <div className="container mx-auto px-4 py-4 flex justify-center">
        <AdSlot slot="header" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed - 2/3 */}
          <div className="lg:col-span-2">
            {posts.length === 0 ? (
              <EmptyState />
            ) : (
              <Suspense fallback={<NewsFeedSkeleton />}>
                <NewsFeed featuredPost={featuredPost} posts={regularPosts} />
              </Suspense>
            )}
          </div>

          {/* Sidebar - 1/3 */}
          <div className="space-y-4">
            <DailyInfoSidebar />
            <AdSlot slot="sidebar" />
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 text-center">
      <div className="text-6xl mb-4">📰</div>
      <h2 className="text-xl font-bold text-white mb-2">వార్తలు ఇంకా లేవు</h2>
      <p className="text-[#737373] mb-6">
        మొదటి వార్తను అడ్మిన్ డాష్‌బోర్డ్ నుండి జోడించండి.
      </p>
      <a
        href="/admin"
        className="inline-block px-6 py-3 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
      >
        అడ్మిన్ డాష్‌బోర్డ్ కు వెళ్ళండి
      </a>
    </div>
  );
}

function NewsFeed({ featuredPost, posts }: { featuredPost: Post; posts: Post[] }) {
  // Split posts for mid-article ad placement
  const firstHalf = posts.slice(0, 3);
  const secondHalf = posts.slice(3);

  return (
    <div className="space-y-6">
      {/* Featured Post */}
      {featuredPost && <NewsCard post={featuredPost} featured />}

      {/* First batch of posts */}
      <div className="grid md:grid-cols-2 gap-4">
        {firstHalf.map((post) => (
          <NewsCard key={post.id} post={post} />
        ))}
      </div>

      {/* Mid-article Ad */}
      {posts.length > 3 && (
        <div className="flex justify-center py-4">
          <AdSlot slot="mid-article" />
        </div>
      )}

      {/* Second batch of posts */}
      {secondHalf.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {secondHalf.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsFeedSkeleton() {
  return (
    <div className="space-y-6">
      <NewsCardSkeleton featured />
      <div className="grid md:grid-cols-2 gap-4">
        <NewsCardSkeleton />
        <NewsCardSkeleton />
        <NewsCardSkeleton />
      </div>
    </div>
  );
}
