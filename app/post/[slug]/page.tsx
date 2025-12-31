import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Clock, Eye, ArrowLeft, Tag } from 'lucide-react';
import { ShareButton } from '@/components/ShareButton';
import { CommentSection } from '@/components/CommentSection';
import { AdSlot } from '@/components/AdSlot';
import { SimilarPosts } from '@/components/RecentPostsSidebar';
import { BottomInfoBar } from '@/components/BottomInfoBar';
import { SchemaScript } from '@/components/seo/SchemaScript';
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateQASchema,
  generateAnswerFirstSummary,
} from '@/lib/seo/schema-generator';
import type { Post, Category } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const categoryLabels: Record<Category, string> = {
  gossip: 'గాసిప్',
  sports: 'స్పోర్ట్స్',
  politics: 'రాజకీయాలు',
  entertainment: 'వినోదం',
  trending: 'ట్రెండింగ్',
};

const categoryColors: Record<Category, string> = {
  gossip: 'from-pink-500 to-pink-600',
  sports: 'from-green-500 to-green-600',
  politics: 'from-blue-500 to-blue-600',
  entertainment: 'from-purple-500 to-purple-600',
  trending: 'from-orange-500 to-orange-600',
};

async function getPost(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return null;
  }

  // Increment views (fire and forget)
  supabase.rpc('increment_post_views', { post_slug: slug }).then(() => {});

  return data;
}

async function getSimilarPosts(category: Category, currentId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .eq('category', category)
    .neq('id', currentId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching similar posts:', error);
    return [];
  }

  return data || [];
}

async function getRecentPosts(currentId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .neq('id', currentId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching recent posts:', error);
    return [];
  }

  return data || [];
}

// Dynamic SEO metadata
export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: 'వార్త కనుగొనబడలేదు',
    };
  }

  const description = post.telugu_body.slice(0, 160).replace(/\n/g, ' ');

  return {
    title: post.title,
    description,
    keywords: [post.category, 'telugu news', 'తెలుగు వార్తలు'],
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      images: (post.image_url || post.image_urls?.[0]) ? [
        {
          url: post.image_url || post.image_urls?.[0],
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ] : [],
      locale: 'te_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: (post.image_url || post.image_urls?.[0]) ? [post.image_url || post.image_urls?.[0]] : [],
    },
  };
}

// ISR - Revalidate every hour
export const revalidate = 3600;

// Generate static params for top posts (optional - can be enabled for production)
// export async function generateStaticParams() {
//   const { data: posts } = await supabase
//     .from('posts')
//     .select('slug')
//     .eq('status', 'published')
//     .order('views', { ascending: false })
//     .limit(100);
//
//   return (posts || []).map((post) => ({ slug: post.slug }));
// }

export default async function PostPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  // Fetch similar and recent posts in parallel
  const [similarPosts, recentPosts] = await Promise.all([
    getSimilarPosts(post.category, post.id),
    getRecentPosts(post.id),
  ]);

  // Generate Schema.org data
  const postUrl = `https://teluguvibes.com/post/${post.slug}`;
  const answerSummary = generateAnswerFirstSummary(post.telugu_body, post.title);

  const articleSchema = generateArticleSchema({
    title: post.title,
    description: answerSummary,
    image: post.image_url ? [post.image_url] : post.image_urls,
    url: postUrl,
    publishedAt: post.created_at,
    updatedAt: post.updated_at,
    category: categoryLabels[post.category],
    keywords: [post.category, 'telugu news', 'తెలుగు వార్తలు', categoryLabels[post.category]],
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'హోమ్', url: 'https://teluguvibes.com' },
    { name: categoryLabels[post.category], url: `https://teluguvibes.com/category/${post.category}` },
    { name: post.title },
  ]);

  // Generate Q&A schema for Zero-Click SEO
  const qaSchema = generateQASchema({
    question: post.title.endsWith('?') ? post.title : `${post.title} గురించి తెలుసుకోండి`,
    answer: answerSummary,
  });

  return (
    <>
      {/* Schema.org JSON-LD */}
      <SchemaScript schema={[articleSchema, breadcrumbSchema, qaSchema]} />

      <div className="container mx-auto px-4 py-6">
        {/* Header Ad */}
        <div className="flex justify-center mb-6">
          <AdSlot slot="header" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <article className="lg:col-span-2">
            {/* Back button */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#737373] hover:text-[#eab308] mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              తిరిగి వెళ్ళు
            </Link>

            {/* Category Badge */}
            <div className="mb-4">
              <Link
                href={`/category/${post.category}`}
                className={`inline-flex items-center gap-2 bg-gradient-to-r ${categoryColors[post.category]} px-4 py-1.5 rounded-full text-sm font-bold text-white hover:opacity-90 transition-opacity`}
              >
                <Tag className="w-3.5 h-3.5" />
                {categoryLabels[post.category]}
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#737373] mb-6">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(post.created_at).toLocaleDateString('te-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.views.toLocaleString()} చదివారు
              </span>
              <ShareButton title={post.title} />
            </div>

            {/* Featured Image */}
            <div className="relative aspect-video rounded-xl overflow-hidden mb-6 bg-[#262626]">
              <Image
                src={post.image_url || post.image_urls?.[0] || `https://picsum.photos/seed/${post.id}/1200/675`}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Article Body */}
            <div className="prose prose-invert prose-lg max-w-none mb-8">
              {post.telugu_body.split('\n\n').map((paragraph, index) => {
                // Check if it's a heading (starts with **)
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <h2 key={index} className="text-xl font-bold text-[#eab308] mt-6 mb-3">
                      {paragraph.replace(/\*\*/g, '')}
                    </h2>
                  );
                }
                // Check if it's a subheading
                if (paragraph.startsWith('**')) {
                  const parts = paragraph.split('**');
                  return (
                    <p key={index} className="text-[#ededed] leading-relaxed mb-4">
                      <strong className="text-[#eab308]">{parts[1]}</strong>
                      {parts[2]}
                    </p>
                  );
                }
                return (
                  <p key={index} className="text-[#ededed] leading-relaxed mb-4">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Tags/Categories */}
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="text-sm text-[#737373]">టాగ్స్:</span>
              <Link
                href={`/category/${post.category}`}
                className="px-3 py-1 bg-[#262626] hover:bg-[#333] text-sm rounded-full transition-colors"
              >
                #{categoryLabels[post.category]}
              </Link>
              <span className="px-3 py-1 bg-[#262626] text-sm rounded-full">
                #తెలుగు
              </span>
              <span className="px-3 py-1 bg-[#262626] text-sm rounded-full">
                #వార్తలు
              </span>
            </div>

            {/* Mid-article Ad */}
            <div className="flex justify-center my-8">
              <AdSlot slot="mid-article" />
            </div>

            {/* Comments Section */}
            <CommentSection postId={post.id} />
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Ad Slot */}
            <AdSlot slot="sidebar" />

            {/* Similar Posts */}
            {similarPosts.length > 0 && (
              <SimilarPosts posts={similarPosts} />
            )}

            {/* Recent Posts (if not enough similar) */}
            {similarPosts.length < 3 && recentPosts.length > 0 && (
              <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#eab308] to-[#ca9a06] px-4 py-3">
                  <h3 className="font-bold text-black flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    తాజా వార్తలు
                  </h3>
                </div>
                <div className="p-3 space-y-1">
                  {recentPosts.slice(0, 5).map((recentPost, index) => (
                    <SmallPostLink key={recentPost.id} post={recentPost} index={index + 1} />
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

// ShareButton is now in a separate client component file

function SmallPostLink({ post, index }: { post: Post; index: number }) {
  const imageUrl = post.image_url || post.image_urls?.[0] || `https://picsum.photos/seed/${post.id}/100/100`;

  return (
    <Link
      href={`/post/${post.slug}`}
      className="flex gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors group"
    >
      <div className="flex-shrink-0 w-6 h-6 bg-[#262626] rounded-full flex items-center justify-center text-xs font-bold text-[#eab308]">
        {index}
      </div>
      <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[#262626]">
        <Image
          src={imageUrl}
          alt={post.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
          sizes="56px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm text-[#ededed] font-medium line-clamp-2 group-hover:text-[#eab308] transition-colors">
          {post.title}
        </h4>
      </div>
    </Link>
  );
}
