import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { SearchBar } from '@/components/SearchBar';
import { NewsCard } from '@/components/NewsCard';
import { Search, TrendingUp, ArrowLeft } from 'lucide-react';
import type { Post } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

async function searchPosts(query: string): Promise<Post[]> {
  if (!query.trim()) return [];
  
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Search error:', error);
    return [];
  }

  return data || [];
}

async function getTrendingPosts(): Promise<Post[]> {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('views', { ascending: false })
    .limit(5);

  return data || [];
}

export const revalidate = 0; // Dynamic page

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: query } = await searchParams;
  const [results, trending] = await Promise.all([
    query ? searchPosts(query) : Promise.resolve([]),
    getTrendingPosts(),
  ]);

  return (
    <main 
      className="min-h-screen py-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="container mx-auto px-4">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          హోమ్‌కు తిరిగి వెళ్ళు
        </Link>

        {/* Search Header */}
        <div className="max-w-2xl mx-auto mb-8">
          <h1 
            className="text-2xl sm:text-3xl font-bold text-center mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            వెతుకు
          </h1>
          
          <SearchBar 
            variant="page" 
            placeholder="వార్తలు, సెలబ్రిటీలు, సినిమాలు వెతకండి..."
          />
        </div>

        {/* Results */}
        {query ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                &quot;{query}&quot; కోసం {results.length} ఫలితాలు
              </h2>
            </div>

            {results.length > 0 ? (
              <div className="grid gap-4">
                {results.map((post) => (
                  <NewsCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div 
                className="text-center py-12 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
              >
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  ఏ ఫలితాలు కనుగొనబడలేదు
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  వేరే పదాలతో మళ్ళీ ప్రయత్నించండి
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Trending Section */}
            <div 
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
            >
              <div 
                className="px-4 py-3 flex items-center gap-2"
                style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)' }}
              >
                <TrendingUp className="w-5 h-5 text-white" />
                <h2 className="font-bold text-white">ట్రెండింగ్ వెతకడాలు</h2>
              </div>
              <div className="p-4 space-y-3">
                {trending.map((post, idx) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.slug}`}
                    className="flex items-center gap-3 group"
                  >
                    <span 
                      className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ 
                        background: idx < 3 ? '#f97316' : 'var(--bg-tertiary)',
                        color: idx < 3 ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span 
                      className="text-sm group-hover:text-[var(--brand-primary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {post.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Popular Categories */}
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                జనప్రియ వర్గాలు
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '💬 గాసిప్', href: '/category/gossip' },
                  { label: '🏏 స్పోర్ట్స్', href: '/category/sports' },
                  { label: '🎬 వినోదం', href: '/category/entertainment' },
                  { label: '🏛️ రాజకీయాలు', href: '/category/politics' },
                  { label: '🔥 హాట్', href: '/hot' },
                  { label: '⭐ రివ్యూలు', href: '/reviews' },
                ].map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                    style={{ 
                      background: 'var(--bg-tertiary)', 
                      color: 'var(--text-primary)',
                    }}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}






