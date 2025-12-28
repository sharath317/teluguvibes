import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { TrendingTicker } from '@/components/TrendingTicker';
import { NewsCard } from '@/components/NewsCard';
import { DailyInfoSidebar } from '@/components/DailyInfoSidebar';
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
  const posts = await getPostsByCategory(category);

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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            <span className={`badge-${category} px-4 py-2 rounded-lg inline-block`}>
              {categoryLabels[category]}
            </span>
            {' '}వార్తలు
          </h1>
          <p className="text-[#737373] mt-4">{categoryDescriptions[category]}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-[#141414] rounded-xl border border-[#262626]">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-[#737373]">ఈ విభాగంలో ఇంకా వార్తలు లేవు</p>
                <a
                  href="/admin/posts/new"
                  className="inline-block mt-4 px-4 py-2 bg-[#eab308] text-black font-bold rounded-lg hover:bg-[#ca9a06] transition-colors"
                >
                  వార్త జోడించండి
                </a>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {posts.map((post, index) => (
                  <NewsCard
                    key={post.id}
                    post={post}
                    featured={index === 0}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <DailyInfoSidebar />
            <AdSlot slot="sidebar" />
          </aside>
        </div>
      </div>
    </>
  );
}

// Generate static params for all categories
export function generateStaticParams() {
  return validCategories.map((cat) => ({ cat }));
}
