/**
 * Stories by Category Page
 */

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { STORY_CATEGORY_CONFIG } from '@/lib/stories/types';

export const revalidate = 3600;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { category } = await params;
  const config = STORY_CATEGORY_CONFIG[category as keyof typeof STORY_CATEGORY_CONFIG];

  return {
    title: `${config?.name_te || category} కథలు | TeluguVibes`,
    description: config?.description_en || `Telugu ${category} stories`,
  };
}

async function getStoriesByCategory(category: string) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('category', category)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching stories:', error);
    return [];
  }

  return data || [];
}

export default async function StoriesCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const config = STORY_CATEGORY_CONFIG[category as keyof typeof STORY_CATEGORY_CONFIG];
  const stories = await getStoriesByCategory(category);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Category Not Found
          </h1>
          <Link href="/stories" className="text-orange-400 hover:underline">
            ← Back to Stories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <section className="py-12 border-b" style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container mx-auto px-4">
          <Link href="/stories" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Stories
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-4xl">{config.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {config.name_te}
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                {config.description_en}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        {stories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`}>
                <article className="card p-5 h-full hover:border-pink-500/30 transition-all">
                  <h3 className="font-bold mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {story.title_te}
                  </h3>
                  <p className="text-sm line-clamp-3 mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {story.summary_te}
                  </p>

                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>📖 {story.reading_time_minutes || 5} min read</span>
                    <span className="text-pink-400">Read Story →</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              ఇంకా కథలు లేవు
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              {config.name_te} కేటగిరీలో కథలు త్వరలో వస్తాయి!
            </p>
            <Link
              href="/stories"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Stories
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}








