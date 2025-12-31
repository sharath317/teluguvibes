import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { TrendingTicker } from '@/components/TrendingTicker';
import { NewsCard, NewsCardSkeleton } from '@/components/NewsCard';
import { RecentPostsSidebar } from '@/components/RecentPostsSidebar';
import { BottomInfoBar } from '@/components/BottomInfoBar';
import { AdSlot } from '@/components/AdSlot';
import { Flame, Film, Camera, Sparkles, TrendingUp, Star } from 'lucide-react';
import type { Post } from '@/types/database';

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

async function getHotMedia() {
  const { data } = await supabase
    .from('media_posts')
    .select('*')
    .eq('status', 'approved')
    .order('trending_score', { ascending: false })
    .limit(10);
  
  return data || [];
}

export const revalidate = 60;

export default async function HomePage() {
  const [posts, popularPosts, hotMedia] = await Promise.all([
    getPosts(), 
    getPopularPosts(),
    getHotMedia()
  ]);

  const trendingPosts = posts.filter(p => p.category === 'trending').slice(0, 5);
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);
  const recentPosts = posts.slice(0, 5);

  return (
    <main style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Hero Tagline */}
      <section 
        className="border-b"
        style={{ 
          background: 'linear-gradient(90deg, rgba(234,179,8,0.1), rgba(249,115,22,0.05), rgba(236,72,153,0.1))',
          borderColor: 'var(--border-primary)'
        }}
      >
        <div className="container mx-auto px-4 py-2.5 text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-bold" style={{ color: 'var(--brand-primary)' }}>TeluguVibes</span>
            {' '}— Premium Telugu Entertainment & Culture Portal
            <span className="hidden md:inline"> | Serving 80M+ Telugu Speakers Worldwide 🌍</span>
          </p>
        </div>
      </section>

      {/* Trending Ticker */}
      <TrendingTicker initialPosts={trendingPosts.length > 0 ? trendingPosts : posts.slice(0, 5)} />

      {/* Hot Content Carousel */}
      {hotMedia.length > 0 && (
        <section className="py-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                <Flame className="w-4 h-4 text-orange-500" />
                🔥 Hot & Trending
              </h2>
              <Link 
                href="/hot" 
                className="text-xs hover:underline"
                style={{ color: 'var(--brand-primary)' }}
              >
                View All →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {hotMedia.map((item: any) => (
                <Link
                  key={item.id}
                  href="/hot"
                  className="flex-shrink-0 w-40 group cursor-pointer"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-1.5">
                    {item.thumbnail_url || item.image_url ? (
                      <img
                        src={item.thumbnail_url || item.image_url}
                        alt={item.title || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: 'var(--bg-tertiary)' }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {item.is_featured && (
                      <div className="absolute top-1.5 left-1.5">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2">
                      <span 
                        className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded uppercase mb-1"
                        style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
                      >
                        {item.category?.replace('_', ' ') || 'hot'}
                      </span>
                    </div>
                  </div>
                  <h4 
                    className="text-xs font-medium line-clamp-2 group-hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {item.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Header Ad */}
      <div className="container mx-auto px-4 py-3 flex justify-center">
        <AdSlot slot="header" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid lg:grid-cols-3 gap-4">
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
            {/* Quick Links */}
            <div 
              className="rounded-xl p-4"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
            >
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                Quick Links
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <QuickLink href="/hot" icon={<Flame className="w-4 h-4" />} label="Hot Content" color="text-orange-500" />
                <QuickLink href="/reviews" icon={<Film className="w-4 h-4" />} label="Movie Reviews" color="text-purple-500" />
                <QuickLink href="/celebrities" icon={<Star className="w-4 h-4" />} label="Celebrities" color="text-yellow-500" />
                <QuickLink href="/games" icon={<Sparkles className="w-4 h-4" />} label="Games" color="text-pink-500" />
              </div>
            </div>

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

      {/* Bottom Info Bar */}
      <BottomInfoBar />
    </main>
  );
}

function QuickLink({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
      style={{ background: 'var(--bg-tertiary)' }}
    >
      <span className={color}>{icon}</span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div 
      className="rounded-xl p-12 text-center"
      style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border-primary)' 
      }}
    >
      <div className="text-6xl mb-4">📰</div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        వార్తలు ఇంకా లేవు
      </h2>
      <p className="mb-6" style={{ color: 'var(--text-tertiary)' }}>
        మొదటి వార్తను అడ్మిన్ డాష్‌బోర్డ్ నుండి జోడించండి.
      </p>
      <a
        href="/admin"
        className="inline-block px-6 py-3 font-bold rounded-lg transition-colors"
        style={{ 
          background: 'var(--brand-primary)', 
          color: 'var(--bg-primary)' 
        }}
      >
        అడ్మిన్ డాష్‌బోర్డ్ కు వెళ్ళండి
      </a>
    </div>
  );
}

function NewsFeed({ featuredPost, posts }: { featuredPost: Post; posts: Post[] }) {
  const firstHalf = posts.slice(0, 3);
  const secondHalf = posts.slice(3);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span 
            className="w-1 h-5 rounded-full"
            style={{ background: 'var(--brand-primary)' }}
          />
          తాజా వార్తలు
        </h2>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {new Date().toLocaleDateString('te-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      </div>

      {/* Featured Post */}
      {featuredPost && <NewsCard post={featuredPost} featured />}

      {/* First batch */}
      <div className="grid md:grid-cols-2 gap-3">
        {firstHalf.map((post) => (
          <NewsCard key={post.id} post={post} />
        ))}
      </div>

      {/* Mid-article Ad */}
      {posts.length > 3 && (
        <div className="flex justify-center py-2">
          <AdSlot slot="mid-article" />
        </div>
      )}

      {/* Second batch */}
      {secondHalf.length > 0 && (
        <>
          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5 py-2">
            <CategoryPill label="అన్ని" active />
            <CategoryPill label="గాసిప్" href="/category/gossip" />
            <CategoryPill label="స్పోర్ట్స్" href="/category/sports" />
            <CategoryPill label="వినోదం" href="/category/entertainment" />
            <CategoryPill label="రాజకీయాలు" href="/category/politics" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {secondHalf.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}

      {/* Load More */}
      {posts.length >= 6 && (
        <div className="text-center pt-2">
          <button 
            className="px-6 py-2.5 rounded-lg transition-colors text-sm font-medium"
            style={{ 
              background: 'var(--bg-tertiary)', 
              color: 'var(--text-primary)' 
            }}
          >
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
  const style = active 
    ? { background: 'var(--brand-primary)', color: 'var(--bg-primary)' }
    : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };

  const className = 'px-3 py-1 rounded-full text-xs font-medium transition-colors';

  if (href) {
    return <a href={href} className={className} style={style}>{label}</a>;
  }
  return <button className={className} style={style}>{label}</button>;
}

function NewsFeedSkeleton() {
  return (
    <div className="space-y-4">
      <NewsCardSkeleton featured />
      <div className="grid md:grid-cols-2 gap-3">
        <NewsCardSkeleton />
        <NewsCardSkeleton />
        <NewsCardSkeleton />
      </div>
    </div>
  );
}
