import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { TrendingTicker } from '@/components/TrendingTicker';
import { NewsCard } from '@/components/NewsCard';
import { RecentPostsSidebar } from '@/components/RecentPostsSidebar';
import { BottomInfoBar } from '@/components/BottomInfoBar';
import { AdSlot } from '@/components/AdSlot';
import type { Post, Category } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const validCategories: Category[] = ['gossip', 'sports', 'politics', 'entertainment', 'trending'];

const categoryLabels: Record<Category, string> = {
  gossip: 'గాసిప్',
  sports: 'స్పోర్ట్స్',
  politics: 'రాజకీయాలు',
  entertainment: 'వినోదం',
  trending: 'ట్రెండింగ్',
};

const categoryDescriptions: Record<Category, string> = {
  gossip: 'టాలీవుడ్, బాలీవుడ్ సెలబ్రిటీల గాసిప్ వార్తలు',
  sports: 'క్రికెట్, ఫుట్‌బాల్, కబడ్డీ తాజా స్పోర్ట్స్ వార్తలు',
  politics: 'తెలంగాణ, ఆంధ్రప్రదేశ్ రాజకీయ వార్తలు',
  entertainment: 'సినిమా, టీవీ, మ్యూజిక్ వినోద వార్తలు',
  trending: 'సోషల్ మీడియాలో ట్రెండింగ్ టాపిక్స్',
};

const categoryIcons: Record<Category, string> = {
  gossip: '💫',
  sports: '🏏',
  politics: '🗳️',
  entertainment: '🎬',
  trending: '📈',
};

const categoryColors: Record<Category, string> = {
  gossip: 'from-pink-500 to-pink-600',
  sports: 'from-green-500 to-green-600',
  politics: 'from-blue-500 to-blue-600',
  entertainment: 'from-purple-500 to-purple-600',
  trending: 'from-orange-500 to-orange-600',
};

async function getPostsByCategory(category: Category): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('category', category)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching posts:', error);
    return [];
  }

  return data || [];
}

async function getPopularInCategory(category: Category): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('category', category)
    .eq('status', 'published')
    .order('views', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching popular posts:', error);
    return [];
  }

  return data || [];
}

async function getRecentFromOtherCategories(excludeCategory: Category): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .neq('category', excludeCategory)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching other posts:', error);
    return [];
  }

  return data || [];
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ cat: string }>
}): Promise<Metadata> {
  const { cat } = await params;

  if (!validCategories.includes(cat as Category)) {
    return { title: 'విభాగం కనుగొనబడలేదు' };
  }

  const category = cat as Category;

  return {
    title: `${categoryLabels[category]} వార్తలు`,
    description: categoryDescriptions[category],
    openGraph: {
      title: `${categoryLabels[category]} వార్తలు | తెలుగు వార్తలు`,
      description: categoryDescriptions[category],
    },
  };
}

export const revalidate = 60;

export default async function CategoryPage({
  params
}: {
  params: Promise<{ cat: string }>
}) {
  const { cat } = await params;

  if (!validCategories.includes(cat as Category)) {
    notFound();
  }

  const category = cat as Category;

  const [posts, popularPosts, otherPosts] = await Promise.all([
    getPostsByCategory(category),
    getPopularInCategory(category),
    getRecentFromOtherCategories(category),
  ]);

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <>
      {/* Trending Ticker */}
      <TrendingTicker initialPosts={posts.slice(0, 5)} />

      {/* Header Ad */}
      <div className="container mx-auto px-4 py-4 flex justify-center">
        <AdSlot slot="header" />
      </div>

      {/* Page Header */}
      <div className="container mx-auto px-4 py-6">
        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${categoryColors[category]} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
              {categoryIcons[category]}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                {categoryLabels[category]} వార్తలు
              </h1>
              <p className="text-[#737373] mt-1">{categoryDescriptions[category]}</p>
            </div>
          </div>

          {/* Category Navigation */}
          <div className="flex flex-wrap gap-2 mt-4">
            {validCategories.map((cat) => (
              <Link
                key={cat}
                href={`/category/${cat}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  cat === category
                    ? `bg-gradient-to-r ${categoryColors[cat]} text-white shadow-lg`
                    : 'bg-[#262626] text-[#ededed] hover:bg-[#333]'
                }`}
              >
                {categoryIcons[cat]} {categoryLabels[cat]}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-[#141414] rounded-xl border border-[#262626]">
                <div className="text-6xl mb-4">{categoryIcons[category]}</div>
                <h2 className="text-xl font-bold text-white mb-2">ఈ విభాగంలో వార్తలు లేవు</h2>
                <p className="text-[#737373] mb-6">త్వరలో {categoryLabels[category]} వార్తలు అప్‌లోడ్ చేయబడతాయి</p>
                <a
                  href="/admin/posts/new"
                  className="inline-block px-6 py-3 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
                >
                  వార్త జోడించండి
                </a>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Featured Post */}
                {featuredPost && (
                  <NewsCard post={featuredPost} featured />
                )}

                {/* Stats Bar */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#141414] rounded-xl border border-[#262626]">
                  <span className="text-sm text-[#737373]">
                    మొత్తం <span className="font-bold text-white">{posts.length}</span> వార్తలు
                  </span>
                  <span className="text-sm text-[#737373]">
                    {new Date().toLocaleDateString('te-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Regular Posts Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {regularPosts.map((post) => (
                    <NewsCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Load More */}
                {posts.length >= 10 && (
                  <div className="text-center pt-4">
                    <button className="px-6 py-3 bg-[#262626] hover:bg-[#333] text-white rounded-lg transition-colors">
                      మరిన్ని వార్తలు చూడండి →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Ad Slot */}
            <AdSlot slot="sidebar" />

            {/* Popular & Recent Posts */}
            <RecentPostsSidebar
              recentPosts={posts.slice(0, 5)}
              popularPosts={popularPosts.length > 0 ? popularPosts : posts.slice(0, 5)}
            />

            {/* Other Categories */}
            {otherPosts.length > 0 && (
              <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-4 py-3">
                  <h3 className="font-bold text-white">ఇతర వార్తలు</h3>
                </div>
                <div className="p-3">
                  {otherPosts.slice(0, 3).map((post) => (
                    <Link
                      key={post.id}
                      href={`/post/${post.slug}`}
                      className="block p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors mb-1"
                    >
                      <span className="text-xs text-[#eab308] uppercase">{categoryLabels[post.category as Category]}</span>
                      <h4 className="text-sm text-[#ededed] line-clamp-2 mt-1">{post.title}</h4>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <BottomInfoBar />
    </>
  );
}

// Generate static params for all categories
export function generateStaticParams() {
  return validCategories.map((cat) => ({ cat }));
}
