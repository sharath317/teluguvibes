'use client';

/**
 * PERSONALIZED RECOMMENDATIONS
 *
 * Browser-only personalization using localStorage.
 * No server calls, no cookies, GDPR-safe.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePersonalization, generateRecommendations, Recommendation } from '@/lib/browser/personalization';

interface RecommendedItem {
  id: string;
  title: string;
  slug: string;
  image_url?: string;
  category: string;
}

export function PersonalizedRecommendations() {
  const { preferences, isLoaded, getContext } = usePersonalization();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [items, setItems] = useState<RecommendedItem[]>([]);

  useEffect(() => {
    if (!isLoaded) return;

    const context = getContext();

    // Only show for returning users with some history
    if (!context.isReturningUser && preferences.visitCount < 3) {
      return;
    }

    // Fetch recommended items based on context
    async function fetchRecommendations() {
      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            viewedCelebrities: context.recentCelebrities,
            viewedCategories: context.recentCategories,
            topCategory: context.topCategory,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch {
        // Silently fail
      }
    }

    fetchRecommendations();
  }, [isLoaded, preferences.visitCount, getContext]);

  // Don't render if no recommendations
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          ✨ మీ కోసం
        </h2>
        <p className="text-purple-100 text-sm">మీ ఆసక్తులపై ఆధారపడి</p>
      </div>

      <div className="p-4 space-y-3">
        {items.slice(0, 4).map(item => (
          <RecommendedItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Privacy notice */}
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-500 text-center">
          🔒 మీ డేటా మీ బ్రౌజర్‌లో మాత్రమే నిల్వ చేయబడింది
        </p>
      </div>
    </div>
  );
}

function RecommendedItemCard({ item }: { item: RecommendedItem }) {
  return (
    <Link
      href={`/post/${item.slug}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors group"
    >
      {item.image_url ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">📰</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white group-hover:text-orange-400 line-clamp-2 transition-colors">
          {item.title}
        </h4>
        <span className="text-xs text-gray-500 capitalize">{item.category}</span>
      </div>
    </Link>
  );
}

/**
 * "Because you viewed..." section
 */
export function BecauseYouViewed({ currentPostId }: { currentPostId: string }) {
  const { preferences, isLoaded } = usePersonalization();
  const [relatedItems, setRelatedItems] = useState<RecommendedItem[]>([]);

  useEffect(() => {
    if (!isLoaded || preferences.readArticles.length < 2) return;

    async function fetchRelated() {
      try {
        const recentArticles = preferences.readArticles
          .filter(id => id !== currentPostId)
          .slice(0, 3);

        if (recentArticles.length === 0) return;

        const res = await fetch('/api/related-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleIds: recentArticles }),
        });

        if (res.ok) {
          const data = await res.json();
          setRelatedItems(data.items || []);
        }
      } catch {
        // Silently fail
      }
    }

    fetchRelated();
  }, [isLoaded, currentPostId, preferences.readArticles]);

  if (relatedItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        👁️ మీరు చూసిన దాని ఆధారంగా
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {relatedItems.slice(0, 4).map(item => (
          <Link
            key={item.id}
            href={`/post/${item.slug}`}
            className="card p-3 hover:border-orange-500/50 transition-colors"
          >
            <h4 className="font-medium text-white line-clamp-2">{item.title}</h4>
            <span className="text-xs text-gray-500 capitalize">{item.category}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Reading progress indicator
 */
export function ReadingProgress({ postId, category }: { postId: string; category: string }) {
  const { readArticle, wasRead } = usePersonalization();
  const [hasRead, setHasRead] = useState(false);

  useEffect(() => {
    const alreadyRead = wasRead(postId);
    setHasRead(alreadyRead);

    // Mark as read when user scrolls to bottom
    function handleScroll() {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 70 && !hasRead) {
        readArticle(postId, category);
        setHasRead(true);
      }
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [postId, category, readArticle, wasRead, hasRead]);

  if (hasRead) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-500">
        ✓ చదివారు
      </span>
    );
  }

  return null;
}

export default PersonalizedRecommendations;








