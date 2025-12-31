/**
 * INDIVIDUAL STORY PAGE
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Eye, Heart, Share2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { STORY_CATEGORY_CONFIG } from '@/lib/stories/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getStory(id: string) {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

async function getRelatedStories(category: string, currentId: string) {
  const { data } = await supabase
    .from('stories')
    .select('id, title_te, summary_te, category, reading_time_minutes')
    .eq('category', category)
    .neq('id', currentId)
    .eq('status', 'published')
    .limit(3);

  return data || [];
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStory(id);

  if (!story) {
    notFound();
  }

  const related = await getRelatedStories(story.category, id);
  const categoryConfig = STORY_CATEGORY_CONFIG[story.category as keyof typeof STORY_CATEGORY_CONFIG];

  // Increment view count (in real app, do this server-side)
  supabase
    .from('stories')
    .update({ view_count: (story.view_count || 0) + 1 })
    .eq('id', id)
    .then(() => {});

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link
          href="/stories"
          className="inline-flex items-center gap-2 text-sm hover:text-orange-400 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stories
        </Link>
      </div>

      {/* Story Content */}
      <article className="max-w-3xl mx-auto px-4 pb-16">
        {/* Category & Meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{categoryConfig?.emoji || '📖'}</span>
          <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm">
            {categoryConfig?.name_te || 'కథ'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {story.title_te}
        </h1>

        {/* English title */}
        <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
          {story.title_en}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm mb-8 pb-6 border-b border-gray-800">
          <span className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <Clock className="w-4 h-4" />
            {story.reading_time_minutes} min read
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <Eye className="w-4 h-4" />
            {story.view_count} views
          </span>
          {story.ai_generated && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
              AI-Generated
            </span>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-pink-500/10 to-orange-500/10 p-6 rounded-xl mb-8">
          <p className="text-lg italic" style={{ color: 'var(--text-primary)' }}>
            {story.summary_te}
          </p>
        </div>

        {/* Story Body */}
        <div
          className="prose prose-lg prose-invert max-w-none"
          style={{
            color: 'var(--text-primary)',
            lineHeight: '2',
            fontSize: '1.125rem',
          }}
        >
          {story.body_te.split('\n').map((paragraph: string, i: number) => (
            <p key={i} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Attribution */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {story.attribution_text}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-8 py-6 border-t border-gray-800">
          <button className="btn btn-secondary flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Like
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Related Stories */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              ఇలాంటి కథలు (Similar Stories)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map((rel) => (
                <Link key={rel.id} href={`/stories/${rel.id}`}>
                  <div className="card p-4 hover:border-pink-500/30 transition-all h-full">
                    <h3 className="font-medium mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {rel.title_te}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      📖 {rel.reading_time_minutes} min
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {story.tags && story.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {story.tags.map((tag: string) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStory(id);

  if (!story) {
    return { title: 'Story Not Found' };
  }

  return {
    title: `${story.title_te} | Telugu Life Stories`,
    description: story.summary_te,
    openGraph: {
      title: story.title_te,
      description: story.summary_te,
      type: 'article',
    },
  };
}



