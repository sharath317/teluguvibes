import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TrendingTicker } from '@/components/TrendingTicker';
import { NewsCard, NewsCardSkeleton } from '@/components/NewsCard';
import { RecentPostsSidebar } from '@/components/RecentPostsSidebar';
import { BottomInfoBar } from '@/components/BottomInfoBar';
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

async function getPopularPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('views', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching popular posts:', error);
    return [];
  }

  return data || [];
}

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const [posts, popularPosts] = await Promise.all([getPosts(), getPopularPosts()]);

  const trendingPosts = posts.filter(p => p.category === 'trending').slice(0, 5);
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);
  const recentPosts = posts.slice(0, 5);

  return (
    <>
      {/* Hero Tagline */}
      <section className="bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-pink-500/10 border-b border-yellow-500/20">
        <div className="container mx-auto px-4 py-3 text-center">
          <p className="text-sm md:text-base text-gray-300">
            <span className="text-yellow-500 font-bold">TeluguVibes</span> — Premium Telugu Entertainment & Culture Portal 
            <span className="hidden md:inline"> | Serving 80M+ Telugu Speakers Worldwide 🌍</span>
          </p>
        </div>
      </section>

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
          <div className="space-y-6">
            {/* Ad Slot */}
            <AdSlot slot="sidebar" />

            {/* Recent & Popular Posts */}
            <RecentPostsSidebar
              recentPosts={recentPosts}
              popularPosts={popularPosts.length > 0 ? popularPosts : recentPosts}
            />
          </div>
        </div>
      </div>

      {/* Bottom Info Bar - Gold/Silver/Weather */}
      <BottomInfoBar />
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
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-[#eab308] rounded-full"></span>
          తాజా వార్తలు
        </h2>
        <span className="text-sm text-[#737373]">
          {new Date().toLocaleDateString('te-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </div>

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
        <>
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 py-2">
            <CategoryPill label="అన్ని" active />
            <CategoryPill label="గాసిప్" href="/category/gossip" />
            <CategoryPill label="స్పోర్ట్స్" href="/category/sports" />
            <CategoryPill label="వినోదం" href="/category/entertainment" />
            <CategoryPill label="రాజకీయాలు" href="/category/politics" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {secondHalf.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}

      {/* Load More (placeholder) */}
      {posts.length >= 6 && (
        <div className="text-center pt-4">
          <button className="px-6 py-3 bg-[#262626] hover:bg-[#333] text-white rounded-lg transition-colors">
            మరిన్ని వార్తలు చూడండి →
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryPill({
  label,
  href,
  active = false
}: {
  label: string;
  href?: string;
  active?: boolean;
}) {
  const className = `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
    active
      ? 'bg-[#eab308] text-black'
      : 'bg-[#262626] text-[#ededed] hover:bg-[#333]'
  }`;

  if (href) {
    return <a href={href} className={className}>{label}</a>;
  }
  return <button className={className}>{label}</button>;
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
