/**
 * TELUGU LIFE STORIES PAGE
 *
 * Heartwarming, relatable Telugu narratives.
 */

import Link from 'next/link';
import { Heart, Users, Sparkles, Home, GraduationCap, Briefcase, BookOpen } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { STORY_CATEGORY_CONFIG } from '@/lib/stories/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CATEGORY_ICONS: Record<string, any> = {
  love: Heart,
  family: Users,
  inspiration: Sparkles,
  middle_class: Home,
  student: GraduationCap,
  career: Briefcase,
  friendship: Users,
  life_lessons: BookOpen,
};

async function getStories() {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);

  return data || [];
}

async function getFeaturedStory() {
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .limit(1)
    .single();

  return data;
}

export default async function StoriesPage() {
  const [stories, featured] = await Promise.all([
    getStories(),
    getFeaturedStory(),
  ]);

  const categories = Object.entries(STORY_CATEGORY_CONFIG);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero */}
      <div className="relative py-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 via-transparent to-orange-600/20" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-3 bg-pink-500/20 px-4 py-2 rounded-full mb-6">
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="text-pink-300 font-medium">Telugu Life Stories</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            తెలుగు జీవిత కథలు
          </h1>
          <p className="text-xl md:text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
            Heartwarming Telugu Narratives
          </p>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Relatable stories of love, family, inspiration, and everyday life.
            Original Telugu narratives that touch your heart.
          </p>
        </div>
      </div>

      {/* Category Grid */}
      <div className="max-w-6xl mx-auto px-4 mb-12">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          కేటగిరీలు (Categories)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(([key, config]) => {
            const Icon = CATEGORY_ICONS[key] || BookOpen;
            return (
              <Link
                key={key}
                href={`/stories/category/${key}`}
                className="group card p-4 hover:border-pink-500/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <span className="text-xl">{config.emoji}</span>
                  </div>
                  <div>
                    <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {config.name_te}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {config.name_en}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured Story */}
      {featured && (
        <div className="max-w-6xl mx-auto px-4 mb-12">
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            ⭐ Featured Story
          </h2>
          <Link href={`/stories/${featured.id}`}>
            <div className="card p-6 hover:border-pink-500/50 transition-all bg-gradient-to-r from-pink-500/10 to-orange-500/10">
              <span className="text-xs px-2 py-1 bg-pink-500/20 text-pink-400 rounded-full mb-3 inline-block">
                {STORY_CATEGORY_CONFIG[featured.category as keyof typeof STORY_CATEGORY_CONFIG]?.name_te || 'కథ'}
              </span>
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                {featured.title_te}
              </h3>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                {featured.summary_te}
              </p>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>📖 {featured.reading_time_minutes} min read</span>
                <span>👁️ {featured.view_count} views</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Stories Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          Latest Stories
        </h2>

        {stories.length === 0 ? (
          <div className="card p-12 text-center">
            <p style={{ color: 'var(--text-secondary)' }}>
              No stories yet. Check back soon for heartwarming Telugu narratives!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Link key={story.id} href={`/stories/${story.id}`}>
                <div className="card p-5 h-full hover:border-pink-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">
                      {STORY_CATEGORY_CONFIG[story.category as keyof typeof STORY_CATEGORY_CONFIG]?.emoji || '📖'}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
                      {STORY_CATEGORY_CONFIG[story.category as keyof typeof STORY_CATEGORY_CONFIG]?.name_en || 'Story'}
                    </span>
                  </div>

                  <h3 className="font-bold mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {story.title_te}
                  </h3>
                  <p className="text-sm line-clamp-3 mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {story.summary_te}
                  </p>

                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>📖 {story.reading_time_minutes} min</span>
                    <span className="text-pink-400">Read →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Attribution */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <p>📖 All stories are original Telugu narratives inspired by universal human experiences.</p>
          <p className="mt-1">© TeluguVibes - Transformative content, cultural authenticity.</p>
        </div>
      </div>
    </div>
  );
}



