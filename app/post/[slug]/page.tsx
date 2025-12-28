import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Clock, Eye, Share2, ArrowLeft } from 'lucide-react';
import { CommentSection } from '@/components/CommentSection';
import { AdSlot } from '@/components/AdSlot';
import { DailyInfoSidebar } from '@/components/DailyInfoSidebar';
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
      images: post.image_urls[0] ? [
        {
          url: post.image_urls[0],
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
      images: post.image_urls[0] ? [post.image_urls[0]] : [],
    },
  };
}

export const revalidate = 60;

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

  return (
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
            <span className={`badge-${post.category} px-3 py-1 rounded-full text-sm font-bold text-white`}>
              {categoryLabels[post.category]}
            </span>
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
            <button className="flex items-center gap-1 hover:text-[#eab308] transition-colors">
              <Share2 className="w-4 h-4" />
              షేర్ చేయండి
            </button>
          </div>

          {/* Featured Image */}
          <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
            <Image
              src={post.image_urls?.[0] || `https://picsum.photos/seed/${post.id}/1200/675`}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Article Body */}
          <div className="prose prose-invert prose-lg max-w-none mb-8">
            {post.telugu_body.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-[#ededed] leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Mid-article Ad */}
          <div className="flex justify-center my-8">
            <AdSlot slot="mid-article" />
          </div>

          {/* Comments Section */}
          <CommentSection postId={post.id} />
        </article>

        {/* Sidebar */}
        <aside className="space-y-4">
          <DailyInfoSidebar />
          <AdSlot slot="sidebar" />
        </aside>
      </div>
    </div>
  );
}
