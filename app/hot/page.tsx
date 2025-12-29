'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, Camera, Film, Share2, Sparkles, X } from 'lucide-react';
import { MediaCard, FeaturedMediaCard } from '@/components/media/MediaCard';
import { EmbedRenderer } from '@/components/media/EmbedRenderer';
import type { MediaPost, MediaCategory } from '@/types/media';

type TabType = 'all' | 'photos' | 'videos' | 'social';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Trending', icon: <Flame className="w-4 h-4" /> },
  { id: 'photos', label: 'Hot Photos', icon: <Camera className="w-4 h-4" /> },
  { id: 'videos', label: 'Videos', icon: <Film className="w-4 h-4" /> },
  { id: 'social', label: 'Social Buzz', icon: <Share2 className="w-4 h-4" /> },
];

const CATEGORIES: { id: MediaCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'photoshoot', label: 'Photoshoots' },
  { id: 'event', label: 'Events' },
  { id: 'movie_promotion', label: 'Movie Promos' },
  { id: 'traditional', label: 'Traditional' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'behind_the_scenes', label: 'BTS' },
];

export default function HotMediaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [category, setCategory] = useState<MediaCategory | 'all'>('all');
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<MediaPost | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Build query params based on tab
  const getQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('status', 'approved');
    params.set('limit', '20');
    params.set('offset', String(page * 20));

    if (category !== 'all') {
      params.set('category', category);
    }

    switch (activeTab) {
      case 'photos':
        params.set('type', 'image');
        break;
      case 'videos':
        // YouTube and Instagram reels
        params.set('type', 'youtube_video');
        break;
      case 'social':
        // Will filter on frontend for now
        break;
    }

    return params.toString();
  }, [activeTab, category, page]);

  // Fetch posts
  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) {
      setPage(0);
      setHasMore(true);
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media/posts?${getQueryParams()}`);
      const data = await res.json();

      let filteredPosts = data.posts || [];

      // Client-side filtering for social tab
      if (activeTab === 'social') {
        filteredPosts = filteredPosts.filter((p: MediaPost) =>
          ['instagram_post', 'instagram_reel', 'twitter_post', 'facebook_post'].includes(p.media_type)
        );
      }

      if (reset) {
        setPosts(filteredPosts);
      } else {
        setPosts((prev) => [...prev, ...filteredPosts]);
      }

      setHasMore(filteredPosts.length === 20);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
    setLoading(false);
  }, [getQueryParams, activeTab]);

  // Fetch featured posts
  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media/posts?featured=true&limit=5');
      const data = await res.json();
      setFeaturedPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching featured:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPosts(true);
  }, [activeTab, category]);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Load more when page changes
  useEffect(() => {
    if (page > 0) {
      fetchPosts(false);
    }
  }, [page]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Hero Section */}
      <section className="relative py-8 md:py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              హాట్ & ట్రెండింగ్
            </h1>
          </div>

          {/* Featured Carousel */}
          {featuredPosts.length > 0 && (
            <FeaturedMediaCard
              post={featuredPosts[0]}
              onClick={() => setSelectedPost(featuredPosts[0])}
            />
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-4 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${category === cat.id
                  ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'
                  : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        {loading && posts.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Flame className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400">No media found</h3>
            <p className="text-gray-500 mt-2">Check back later for hot content!</p>
          </div>
        ) : (
          <>
            {/* Masonry Grid */}
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {posts.map((post) => (
                <MediaCard
                  key={post.id}
                  post={post}
                  layout="masonry"
                  onClick={() => setSelectedPost(post)}
                />
              ))}
            </div>

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className="h-10 mt-8">
              {loading && (
                <div className="flex justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Lightbox Modal */}
      {selectedPost && (
        <MediaLightbox
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </main>
  );
}

/**
 * Lightbox component for viewing media
 */
function MediaLightbox({
  post,
  onClose,
}: {
  post: MediaPost;
  onClose: () => void;
}) {
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Track view
  useEffect(() => {
    fetch(`/api/admin/media/posts/${post.id}/view`, { method: 'POST' }).catch(() => {});
  }, [post.id]);

  const hasEmbed = post.embed_html && post.media_type !== 'image';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Content */}
      <div
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {hasEmbed ? (
          <div className="p-4">
            <EmbedRenderer
              embedHtml={post.embed_html!}
              mediaType={post.media_type}
              fallbackThumbnail={post.thumbnail_url}
              title={post.title}
            />
          </div>
        ) : (
          <img
            src={post.image_url || post.thumbnail_url || '/placeholder-media.svg'}
            alt={post.title || 'Media'}
            className="w-full h-auto"
          />
        )}

        {/* Info */}
        <div className="p-6 border-t border-gray-800">
          {post.entity && (
            <div className="flex items-center gap-3 mb-4">
              {post.entity.profile_image && (
                <img
                  src={post.entity.profile_image}
                  alt={post.entity.name_en}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <h3 className="text-white font-bold">{post.entity.name_en}</h3>
                <span className="text-yellow-500 text-sm capitalize">
                  {post.entity.entity_type}
                </span>
              </div>
            </div>
          )}

          {post.caption && (
            <p className="text-gray-300 mb-4">{post.caption}</p>
          )}

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Source Link */}
          <a
            href={post.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-yellow-500 hover:underline text-sm"
          >
            View Original →
          </a>
        </div>
      </div>
    </div>
  );
}
