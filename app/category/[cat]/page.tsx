import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { NewsCard } from '@/components/NewsCard';
import { RecentPostsSidebar } from '@/components/RecentPostsSidebar';
import { BottomInfoBar } from '@/components/BottomInfoBar';
import { AdSlot } from '@/components/AdSlot';
import { RelatedSectionsServer } from '@/components/RelatedSectionsServer';
import { CATEGORY_META, MORE_MENU_SECTIONS, type NavItem } from '@/lib/config/navigation';
import type { Post } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// All valid categories - expanded to include all from navigation config
const validCategories = [
  'gossip', 'sports', 'politics', 'entertainment', 'trending',
  'crime', 'viral', 'health', 'lifestyle', 'food',
  'tech', 'world', 'business',
] as const;

type CategoryType = typeof validCategories[number];

// Helper to check if category is valid
function isValidCategory(cat: string): cat is CategoryType {
  return validCategories.includes(cat as CategoryType);
}

// Get category metadata from navigation config
function getCategoryInfo(cat: string) {
  const meta = CATEGORY_META[cat];
  if (!meta) {
    return {
      label: cat,
      labelEn: cat,
      description: '',
      descriptionEn: '',
      icon: '📰',
      gradient: 'from-gray-500 to-gray-600',
    };
  }
  return {
    label: meta.name.te,
    labelEn: meta.name.en,
    description: meta.description.te,
    descriptionEn: meta.description.en,
    icon: meta.icon,
    gradient: meta.gradient,
  };
}

// Find the menu section this category belongs to
function findCategoryGroup(categoryId: string): { section: (typeof MORE_MENU_SECTIONS)[number] | null; items: NavItem[] } {
  for (const section of MORE_MENU_SECTIONS) {
    const found = section.items.find(item => item.id === categoryId);
    if (found) {
      return { section, items: section.items };
    }
  }
  return { section: null, items: [] };
}

async function getPostsByCategory(category: string): Promise<Post[]> {
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

async function getPopularInCategory(category: string): Promise<Post[]> {
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

async function getRecentFromOtherCategories(excludeCategory: string): Promise<Post[]> {
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

  if (!isValidCategory(cat)) {
    return { title: 'విభాగం కనుగొనబడలేదు' };
  }

  const info = getCategoryInfo(cat);

  return {
    title: `${info.label} వార్తలు | ${info.labelEn} News`,
    description: info.description || info.descriptionEn,
    openGraph: {
      title: `${info.label} వార్తలు | తెలుగు వార్తలు`,
      description: info.description || info.descriptionEn,
    },
  };
}

export const revalidate = 60;

// Generate sample posts for categories without real data
function generateSamplePosts(category: string, count: number = 8): Post[] {
  const info = getCategoryInfo(category);
  
  const sampleTitles: Record<string, string[]> = {
    tech: [
      'కొత్త AI టెక్నాలజీ భారత్‌లో లాంచ్',
      'సామ్‌సంగ్ కొత్త స్మార్ట్‌ఫోన్ విడుదల',
      'టెస్లా భారత్‌లో ఫ్యాక్టరీ ప్లాన్',
      'గూగుల్ AI అప్‌డేట్',
      'యాపిల్ ఐఫోన్ 16 ఫీచర్స్',
      '5G నెట్‌వర్క్ విస్తరణ',
      'ఎలెక్ట్రిక్ వెహికిల్స్ ట్రెండ్స్',
      'స్టార్టప్ ఫండింగ్ న్యూస్',
    ],
    food: [
      'హైదరాబాదీ బిర్యానీ రెసిపీ',
      'తెలుగు వంటకాల చరిత్ర',
      'హెల్తీ బ్రేక్‌ఫాస్ట్ ఐడియాస్',
      'సంక్రాంతి స్పెషల్ స్వీట్స్',
      'స్ట్రీట్ ఫుడ్ ఆఫ్ హైదరాబాద్',
      'వెజిటేరియన్ రెసిపీలు',
      'సమ్మర్ కూల్ డ్రింక్స్',
      'ట్రెడిషనల్ పిక్కిల్స్',
    ],
    health: [
      'యోగా హెల్త్ బెనిఫిట్స్',
      'డయాబెటిస్ నియంత్రణ చిట్కాలు',
      'మానసిక ఆరోగ్యం పై చిట్కాలు',
      'ఫిట్‌నెస్ టిప్స్ 2024',
      'ఆయుర్వేద రెమెడీస్',
      'వెయిట్ లాస్ డైట్ ప్లాన్',
      'హెల్దీ లైఫ్‌స్టైల్ టిప్స్',
      'స్కిన్ కేర్ రూటీన్',
    ],
    crime: [
      'హైదరాబాద్‌లో సైబర్ నేరం కేసు',
      'పోలీస్ ఆపరేషన్ విజయవంతం',
      'స్కామ్ బయటపడింది',
      'ఆన్‌లైన్ మోసగాళ్ల అరెస్ట్',
      'డ్రగ్స్ రాకెట్ భగ్నం',
      'ATM మోసం కేసు',
      'మహిళల రక్షణ చర్యలు',
      'ట్రాఫిక్ నేరాలపై చర్యలు',
    ],
    lifestyle: [
      'మోడర్న్ ఇంటీరియర్ డిజైన్ ట్రెండ్స్',
      'ఫ్యాషన్ వీక్ హైలైట్స్',
      'ట్రావెల్ డెస్టినేషన్స్ 2024',
      'హోమ్ డెకర్ ఐడియాస్',
      'వెడ్డింగ్ ప్లానింగ్ టిప్స్',
      'బ్యూటీ టిప్స్ అండ్ ట్రిక్స్',
      'పార్టీ ఆర్గనైజేషన్',
      'పెట్ కేర్ గైడ్',
    ],
    world: [
      'అమెరికా ఎన్నికల అప్‌డేట్స్',
      'గ్లోబల్ క్లైమేట్ సమ్మిట్',
      'యూరోప్ ఎకానమీ న్యూస్',
      'మిడిల్ ఈస్ట్ పరిస్థితులు',
      'చైనా-భారత్ సంబంధాలు',
      'UN సమావేశం హైలైట్స్',
      'ఇంటర్నేషనల్ స్పోర్ట్స్ న్యూస్',
      'గ్లోబల్ టెక్ ట్రెండ్స్',
    ],
    business: [
      'స్టాక్ మార్కెట్ అప్‌డేట్',
      'రిలయన్స్ క్వార్టర్లీ రిపోర్ట్',
      'ఫారెక్స్ మార్కెట్ ట్రెండ్స్',
      'స్టార్టప్ ఇన్వెస్ట్‌మెంట్ న్యూస్',
      'బ్యాంకింగ్ సెక్టర్ అప్‌డేట్స్',
      'రియల్ ఎస్టేట్ మార్కెట్',
      'క్రిప్టో మార్కెట్ న్యూస్',
      'ఎకానమీ గ్రోత్ రిపోర్ట్',
    ],
    viral: [
      'వైరల్ వీడియో: ఆశ్చర్యకరమైన ప్రతిభ',
      'సోషల్ మీడియాలో ట్రెండింగ్ మీమ్',
      'సెలబ్రిటీ వైరల్ పోస్ట్',
      'ఫన్నీ వీడియో కలెక్షన్',
      'ఇంటర్నెట్ సెన్సేషన్',
      'వైరల్ డాన్స్ ఛాలెంజ్',
      'ట్రెండింగ్ హ్యాష్‌ట్యాగ్',
      'సోషల్ మీడియా స్టార్',
    ],
  };

  const titles = sampleTitles[category] || [
    `${info.label} తాజా వార్త 1`,
    `${info.label} అప్‌డేట్ 2`,
    `${info.label} న్యూస్ 3`,
    `${info.label} వార్త 4`,
    `${info.label} అప్‌డేట్ 5`,
    `${info.label} న్యూస్ 6`,
    `${info.label} వార్త 7`,
    `${info.label} అప్‌డేట్ 8`,
  ];

  return titles.slice(0, count).map((title, i) => ({
    id: `sample-${category}-${i}`,
    title,
    slug: `${category}-sample-${i + 1}`,
    excerpt: `${info.label} విభాగంలో తాజా వార్తలు. ${info.description}`,
    content: '',
    category,
    image_url: `https://picsum.photos/seed/${category}${i}/800/450`,
    author: 'TeluguVibes',
    status: 'published' as const,
    views: Math.floor(Math.random() * 5000) + 500,
    likes: Math.floor(Math.random() * 300) + 50,
    created_at: new Date(Date.now() - i * 3600000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
    is_featured: i === 0,
    is_hot: i === 1,
    is_trending: i < 3,
    tags: [category, 'telugu'],
  }));
}

export default async function CategoryPage({
  params
}: {
  params: Promise<{ cat: string }>
}) {
  const { cat } = await params;

  if (!isValidCategory(cat)) {
    notFound();
  }

  const info = getCategoryInfo(cat);
  const { section: menuSection, items: sectionItems } = findCategoryGroup(cat);

  const [posts, popularPosts, otherPosts] = await Promise.all([
    getPostsByCategory(cat),
    getPopularInCategory(cat),
    getRecentFromOtherCategories(cat),
  ]);

  // Use sample posts if no real posts exist
  const displayPosts = posts.length > 0 ? posts : generateSamplePosts(cat, 8);
  const featuredPost = displayPosts[0];
  const regularPosts = displayPosts.slice(1);

  // Get other sections in the same group for navigation
  const relatedSections = sectionItems.filter(item => item.id !== cat);

  return (
    <>
      {/* Header Ad */}
      <div className="container mx-auto px-4 py-4 flex justify-center">
        <AdSlot slot="header" />
      </div>

      {/* Page Header */}
      <div className="container mx-auto px-4 py-6">
        {/* Category Header with Group Context */}
        <div className="mb-8">
          {/* Group Title (if belongs to a menu section) */}
          {menuSection && (
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-4"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
            >
              <span>{menuSection.emoji}</span>
              <span>{menuSection.title}</span>
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            <div 
              className={`w-16 h-16 bg-gradient-to-br ${info.gradient} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}
            >
              {info.icon}
            </div>
            <div>
              <h1 
                className="text-3xl md:text-4xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {info.label} వార్తలు
              </h1>
              <p style={{ color: 'var(--text-tertiary)' }} className="mt-1">
                {info.description}
              </p>
            </div>
          </div>

          {/* Unified Category Navigation - Single Row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {/* Show related sections first if available, otherwise show primary categories */}
            {relatedSections.length > 0 ? (
              <>
                {/* Current Category (Active) */}
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r ${info.gradient} text-white shadow-lg`}
                >
                  {info.icon} {info.label}
                </span>
                
                {/* Related Categories from same group */}
                {relatedSections.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                    style={{ 
                      background: 'var(--bg-tertiary)', 
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {item.emoji} {item.label}
                  </Link>
                ))}
              </>
            ) : (
              /* Fallback: Primary categories if no group context */
              validCategories.slice(0, 6).map((category) => {
                const catInfo = getCategoryInfo(category);
                const isActive = category === cat;
                
                return (
                  <Link
                    key={category}
                    href={`/category/${category}`}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${catInfo.gradient} text-white shadow-lg`
                        : ''
                    }`}
                    style={!isActive ? { 
                      background: 'var(--bg-tertiary)', 
                      color: 'var(--text-secondary)' 
                    } : undefined}
                  >
                    {catInfo.icon} {catInfo.label}
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            {/* Sample Data Notice */}
            {posts.length === 0 && (
              <div 
                className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}
              >
                <span>ℹ️</span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                  ఈ విభాగంలో తాజా వార్తలు త్వరలో అప్‌లోడ్ చేయబడతాయి. ప్రస్తుతం నమూనా వార్తలు చూపిస్తున్నాము.
                </span>
              </div>
            )}

            <div className="space-y-6">
              {/* Featured Post */}
              {featuredPost && (
                <NewsCard post={featuredPost} featured />
              )}

              {/* Stats Bar */}
              <div 
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  మొత్తం <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{displayPosts.length}</span> వార్తలు
                </span>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
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
              {displayPosts.length >= 8 && (
                <div className="text-center pt-4">
                  <button 
                    className="px-6 py-3 rounded-lg transition-colors"
                    style={{ 
                      background: 'var(--bg-tertiary)', 
                      color: 'var(--text-primary)',
                    }}
                  >
                    మరిన్ని వార్తలు చూడండి →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Ad Slot */}
            <AdSlot slot="sidebar" />

            {/* Popular & Recent Posts */}
            <RecentPostsSidebar
              recentPosts={displayPosts.slice(0, 5)}
              popularPosts={popularPosts.length > 0 ? popularPosts : displayPosts.slice(0, 5)}
            />

            {/* Other Categories */}
            {otherPosts.length > 0 && (
              <div 
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                <div className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-4 py-3">
                  <h3 className="font-bold text-white">ఇతర వార్తలు</h3>
                </div>
                <div className="p-3">
                  {otherPosts.slice(0, 3).map((post) => {
                    const postMeta = getCategoryInfo(post.category || '');
                    return (
                      <Link
                        key={post.id}
                        href={`/post/${post.slug}`}
                        className="block p-2 rounded-lg transition-colors mb-1"
                        style={{ background: 'transparent' }}
                      >
                        <span 
                          className="text-xs uppercase font-medium"
                          style={{ color: CATEGORY_META[post.category || '']?.color || 'var(--brand-primary)' }}
                        >
                          {postMeta.label}
                        </span>
                        <h4 
                          className="text-sm line-clamp-2 mt-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {post.title}
                        </h4>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Related Sections from Same Group */}
      <RelatedSectionsServer currentSectionId={cat} />

      {/* Bottom Info Bar */}
      <BottomInfoBar />
    </>
  );
}

// Generate static params for all valid categories
export function generateStaticParams() {
  return validCategories.map((cat) => ({ cat }));
}
