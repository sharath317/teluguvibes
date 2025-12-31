'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame, Camera, Film, Share2, Sparkles, X,
  ChevronLeft, ChevronRight, TrendingUp, Heart,
  Eye, Play, Instagram, Twitter, Star
} from 'lucide-react';
import Image from 'next/image';
import { MediaCard } from '@/components/media/MediaCard';
import { EmbedRenderer } from '@/components/media/EmbedRenderer';
import type { MediaPost, MediaCategory } from '@/types/media';

type TabType = 'all' | 'photos' | 'videos' | 'social';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Flame className="w-4 h-4" /> },
  { id: 'photos', label: 'Photos', icon: <Camera className="w-4 h-4" /> },
  { id: 'videos', label: 'Videos', icon: <Film className="w-4 h-4" /> },
  { id: 'social', label: 'Social', icon: <Share2 className="w-4 h-4" /> },
];

const CATEGORIES: { id: MediaCategory | 'all'; label: string; emoji?: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'glamour', label: 'Glamour', emoji: '💫' },
  { id: 'photoshoot', label: 'Photoshoots', emoji: '📸' },
  { id: 'magazine', label: 'Magazine', emoji: '📰' },
  { id: 'beach_vacation', label: 'Beach', emoji: '🏖️' },
  { id: 'red_carpet', label: 'Red Carpet', emoji: '👗' },
  { id: 'gym_fitness', label: 'Fitness', emoji: '💪' },
  { id: 'saree_traditional', label: 'Saree', emoji: '🪷' },
  { id: 'western_glam', label: 'Western', emoji: '👠' },
  { id: 'movie_promotion', label: 'Promos', emoji: '🎬' },
  { id: 'event', label: 'Events', emoji: '🎉' },
  { id: 'behind_the_scenes', label: 'BTS', emoji: '🎥' },
];

// Horizontal Carousel Component
function HorizontalCarousel({
  children,
  title,
  icon,
  showAll,
  onShowAll
}: {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
  showAll?: boolean;
  onShowAll?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      checkScroll();
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [children]);

  return (
    <div className="relative group/carousel">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          {icon}
          {title}
        </h3>
        {showAll && onShowAll && (
          <button
            onClick={onShowAll}
            className="text-xs hover:underline"
            style={{ color: 'var(--brand-primary)' }}
          >
            View All →
          </button>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        >
          {children}
        </div>

        {/* Navigation - Small, positioned at edges */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Compact Featured Card (for main carousel)
function FeaturedCard({
  post,
  onClick,
  isActive
}: {
  post: MediaPost;
  onClick: () => void;
  isActive?: boolean;
}) {
  const isVideo = post.media_type?.includes('video') || post.media_type?.includes('youtube');

  return (
    <div
      onClick={onClick}
      className={`relative flex-shrink-0 w-full aspect-[16/9] rounded-xl overflow-hidden cursor-pointer group transition-all ${
        isActive ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        ringColor: 'var(--brand-primary)',
        ringOffsetColor: 'var(--bg-primary)'
      }}
    >
      {(post.thumbnail_url || post.image_url) ? (
        <Image
          src={post.thumbnail_url || post.image_url || ''}
          alt={post.title || ''}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
      ) : (
        <div className="w-full h-full" style={{ background: 'var(--bg-tertiary)' }} />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Video indicator */}
      {isVideo && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
          <Play className="w-3 h-3" /> VIDEO
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <span
          className="inline-block px-2 py-0.5 text-xs font-medium rounded mb-2 uppercase"
          style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
        >
          {post.category?.replace('_', ' ') || 'Trending'}
        </span>
        <h3 className="text-white font-bold text-lg line-clamp-2">{post.title}</h3>
        <div className="flex items-center gap-3 mt-2 text-gray-300 text-xs">
          {post.views > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatNumber(post.views)}
            </span>
          )}
          {post.trending_score > 0 && (
            <span className="flex items-center gap-1 text-yellow-500">
              <TrendingUp className="w-3 h-3" /> {Math.round(post.trending_score)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Featured Carousel with Thumbnails
function MainCarousel({
  posts,
  onSelect
}: {
  posts: MediaPost[];
  onSelect: (post: MediaPost) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance
  useEffect(() => {
    if (posts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [posts.length]);

  if (posts.length === 0) return null;

  const currentPost = posts[currentIndex];

  return (
    <div className="space-y-3">
      {/* Main Display */}
      <FeaturedCard
        post={currentPost}
        onClick={() => onSelect(currentPost)}
        isActive
      />

      {/* Thumbnail Strip */}
      {posts.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {posts.map((post, idx) => (
            <button
              key={post.id}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all ${
                idx === currentIndex ? 'ring-2 opacity-100' : 'opacity-60 hover:opacity-100'
              }`}
              style={{ ringColor: 'var(--brand-primary)' }}
            >
              {(post.thumbnail_url || post.image_url) ? (
                <Image
                  src={post.thumbnail_url || post.image_url || ''}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full" style={{ background: 'var(--bg-tertiary)' }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Counter + Nav */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {currentIndex + 1} / {posts.length}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % posts.length)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact Trending Item
function TrendingItem({ post, rank, onClick }: { post: MediaPost; rank: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-40 cursor-pointer group"
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2">
        {(post.thumbnail_url || post.image_url) ? (
          <Image
            src={post.thumbnail_url || post.image_url || ''}
            alt={post.title || ''}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--bg-tertiary)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Rank Badge */}
        <div
          className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)' }}
        >
          {rank}
        </div>

        {/* Score */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-black/50 text-yellow-500">
          <TrendingUp className="w-3 h-3" />
          {Math.round(post.trending_score || 0)}
        </div>
      </div>
      <h4
        className="text-xs font-medium line-clamp-2 group-hover:underline"
        style={{ color: 'var(--text-primary)' }}
      >
        {post.title}
      </h4>
    </div>
  );
}

// Social Buzz Item
function SocialItem({ post, onClick }: { post: MediaPost; onClick: () => void }) {
  const isTweet = post.media_type === 'twitter_post';

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-64 p-3 rounded-lg cursor-pointer group transition-colors"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isTweet ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
        }`}>
          {isTweet ? <Twitter className="w-4 h-4" /> : <Instagram className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="text-xs font-medium line-clamp-2 group-hover:underline"
            style={{ color: 'var(--text-primary)' }}
          >
            {post.title}
          </h4>
          <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
            {post.caption}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" /> {formatNumber(post.likes || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Category Content Card
function ContentCard({ post, onClick }: { post: MediaPost; onClick: () => void }) {
  const isVideo = post.media_type?.includes('video') || post.media_type?.includes('youtube');

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-36 cursor-pointer group"
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-1.5">
        {(post.thumbnail_url || post.image_url) ? (
          <Image
            src={post.thumbnail_url || post.image_url || ''}
            alt={post.title || ''}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--bg-tertiary)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-5 h-5 text-black ml-0.5" />
            </div>
          </div>
        )}

        {post.is_hot && (
          <div className="absolute top-1.5 right-1.5">
            <Flame className="w-4 h-4 text-orange-500 drop-shadow-lg" />
          </div>
        )}
      </div>
      <h4
        className="text-xs font-medium line-clamp-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {post.title}
      </h4>
    </div>
  );
}

// Lightbox Modal
function MediaLightbox({
  post,
  posts,
  onClose,
  onNavigate
}: {
  post: MediaPost;
  posts: MediaPost[];
  onClose: () => void;
  onNavigate: (post: MediaPost) => void;
}) {
  const currentIndex = posts.findIndex(p => p.id === post.id);
  const hasNext = currentIndex < posts.length - 1;
  const hasPrev = currentIndex > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNavigate(posts[currentIndex + 1]);
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(posts[currentIndex - 1]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasNext, hasPrev, onClose, onNavigate, posts]);

  const isVideo = post.media_type?.includes('video') || post.media_type?.includes('youtube');
  const isSocialEmbed = ['twitter_post', 'instagram_post', 'instagram_reel', 'facebook_post'].includes(post.media_type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Navigation */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(posts[currentIndex - 1]); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors z-10"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(posts[currentIndex + 1]); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors z-10"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Content */}
      <div
        className="relative max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isSocialEmbed && post.embed_html ? (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <EmbedRenderer html={post.embed_html} platform={post.source} />
          </div>
        ) : isVideo && post.embed_html ? (
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <EmbedRenderer html={post.embed_html} platform={post.source} />
          </div>
        ) : post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.title || ''}
            width={1200}
            height={800}
            className="w-full h-auto object-contain max-h-[80vh] rounded-xl"
            unoptimized
          />
        ) : null}

        {/* Info */}
        <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <h3 className="text-white font-semibold">{post.title}</h3>
          {post.caption && (
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{post.caption}</p>
          )}
        </div>

        {/* Counter */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded text-white text-xs" style={{ background: 'rgba(0,0,0,0.5)' }}>
          {currentIndex + 1} / {posts.length}
        </div>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Main Page
export default function HotMediaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [category, setCategory] = useState<MediaCategory | 'all'>('all');
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<MediaPost[]>([]);
  const [socialPosts, setSocialPosts] = useState<MediaPost[]>([]);
  const [categoryPosts, setCategoryPosts] = useState<Record<string, MediaPost[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<MediaPost | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const getQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('status', 'approved');
    params.set('limit', '20');
    params.set('offset', String(page * 20));

    if (category !== 'all') params.set('category', category);

    switch (activeTab) {
      case 'photos': params.set('type', 'image'); break;
      case 'videos': params.set('type', 'youtube_video'); break;
      case 'social': params.set('type', 'twitter_post,instagram_post,instagram_reel,facebook_post'); break;
    }

    return params.toString();
  }, [activeTab, category, page]);

  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) { setPage(0); setHasMore(true); }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media/posts?${getQueryParams()}`);
      const data = await res.json();
      const fetched = data.posts || [];
      if (reset) setPosts(fetched);
      else setPosts((prev) => [...prev, ...fetched]);
      setHasMore(fetched.length === 20);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  }, [getQueryParams]);

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media/posts?featured=true&limit=5');
      const data = await res.json();
      setFeaturedPosts(data.posts || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const fetchSocialBuzz = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media/posts?type=twitter_post,instagram_post,instagram_reel&limit=10&status=approved');
      const data = await res.json();
      setSocialPosts(data.posts || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const fetchCategoryContent = useCallback(async () => {
    const categories = ['glamour', 'photoshoot', 'magazine', 'beach_vacation', 'red_carpet', 'gym_fitness', 'saree_traditional', 'western_glam', 'movie_promotion', 'event'];
    const results: Record<string, MediaPost[]> = {};

    await Promise.all(categories.map(async (cat) => {
      try {
        const res = await fetch(`/api/admin/media/posts?category=${cat}&status=approved&limit=12`);
        const data = await res.json();
        results[cat] = data.posts || [];
      } catch (error) {
        results[cat] = [];
      }
    }));

    setCategoryPosts(results);
  }, []);

  useEffect(() => { fetchPosts(true); }, [activeTab, category]);
  useEffect(() => {
    fetchFeatured();
    fetchSocialBuzz();
    fetchCategoryContent();
  }, [fetchFeatured, fetchSocialBuzz, fetchCategoryContent]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) setPage((p) => p + 1);
      },
      { rootMargin: '200px' }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => { if (page > 0) fetchPosts(false); }, [page, fetchPosts]);

  const topTrending = posts.filter(p => p.trending_score > 50).slice(0, 8);

  return (
    <main className="min-h-screen pb-16" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ========== STICKY HEADER ========== */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        opacity: 0.98
      }}>
        <div className="max-w-7xl mx-auto px-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              <h1 className="text-lg font-bold hidden sm:block" style={{ color: 'var(--text-primary)' }}>
                హాట్ & ట్రెండింగ్
              </h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all`}
                  style={{
                    backgroundColor: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                    color: activeTab === tab.id ? 'var(--bg-primary)' : 'var(--text-secondary)'
                  }}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: category === cat.id ? 'var(--brand-primary)' : 'transparent',
                  color: category === cat.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${category === cat.id ? 'var(--brand-primary)' : 'var(--border-primary)'}`
                }}
              >
                {cat.emoji && <span>{cat.emoji}</span>}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4 space-y-6">
        {/* ========== TOP SECTION: Featured + Trending + Social ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Featured - Takes more space */}
          <div className="lg:col-span-5">
            <MainCarousel
              posts={featuredPosts.length > 0 ? featuredPosts : posts.slice(0, 5)}
              onSelect={setSelectedPost}
            />
          </div>

          {/* Top Trending */}
          <div className="lg:col-span-4">
            <HorizontalCarousel
              title="Top Trending"
              icon={<TrendingUp className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />}
            >
              {topTrending.map((post, idx) => (
                <TrendingItem
                  key={post.id}
                  post={post}
                  rank={idx + 1}
                  onClick={() => setSelectedPost(post)}
                />
              ))}
              {topTrending.length === 0 && loading && (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-40 aspect-[3/4] rounded-lg animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
                ))
              )}
            </HorizontalCarousel>
          </div>

          {/* Social Buzz */}
          <div className="lg:col-span-3">
            <HorizontalCarousel
              title="Social Buzz"
              icon={<Share2 className="w-4 h-4 text-pink-500" />}
              showAll
              onShowAll={() => setActiveTab('social')}
            >
              {socialPosts.map((post) => (
                <SocialItem key={post.id} post={post} onClick={() => setSelectedPost(post)} />
              ))}
              {socialPosts.length === 0 && (
                <p className="text-xs py-8 px-4" style={{ color: 'var(--text-tertiary)' }}>No social posts yet</p>
              )}
            </HorizontalCarousel>
          </div>
        </div>

        {/* ========== GLAMOUR CATEGORY SECTIONS ========== */}
        {categoryPosts.glamour?.length > 0 && (
          <HorizontalCarousel
            title="💫 Glamour Gallery"
            icon={<Sparkles className="w-4 h-4 text-pink-500" />}
            showAll
            onShowAll={() => { setCategory('glamour'); setActiveTab('photos'); }}
          >
            {categoryPosts.glamour.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.photoshoot?.length > 0 && (
          <HorizontalCarousel
            title="📸 Hot Photoshoots"
            icon={<Camera className="w-4 h-4 text-orange-500" />}
            showAll
            onShowAll={() => { setCategory('photoshoot'); setActiveTab('photos'); }}
          >
            {categoryPosts.photoshoot.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.magazine?.length > 0 && (
          <HorizontalCarousel
            title="📰 Magazine Covers & Editorials"
            icon={<Star className="w-4 h-4 text-purple-500" />}
            showAll
            onShowAll={() => { setCategory('magazine'); setActiveTab('photos'); }}
          >
            {categoryPosts.magazine.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.beach_vacation?.length > 0 && (
          <HorizontalCarousel
            title="🏖️ Beach & Vacation"
            icon={<Sparkles className="w-4 h-4 text-cyan-500" />}
            showAll
            onShowAll={() => { setCategory('beach_vacation'); setActiveTab('photos'); }}
          >
            {categoryPosts.beach_vacation.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.red_carpet?.length > 0 && (
          <HorizontalCarousel
            title="👗 Red Carpet & Premieres"
            icon={<Star className="w-4 h-4 text-red-500" />}
            showAll
            onShowAll={() => { setCategory('red_carpet'); setActiveTab('photos'); }}
          >
            {categoryPosts.red_carpet.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.gym_fitness?.length > 0 && (
          <HorizontalCarousel
            title="💪 Fitness & Gym"
            icon={<Heart className="w-4 h-4 text-green-500" />}
            showAll
            onShowAll={() => { setCategory('gym_fitness'); setActiveTab('all'); }}
          >
            {categoryPosts.gym_fitness.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.saree_traditional?.length > 0 && (
          <HorizontalCarousel
            title="🪷 Saree & Traditional"
            icon={<Sparkles className="w-4 h-4 text-amber-500" />}
            showAll
            onShowAll={() => { setCategory('saree_traditional'); setActiveTab('photos'); }}
          >
            {categoryPosts.saree_traditional.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.western_glam?.length > 0 && (
          <HorizontalCarousel
            title="👠 Western Glam"
            icon={<Star className="w-4 h-4 text-pink-400" />}
            showAll
            onShowAll={() => { setCategory('western_glam'); setActiveTab('photos'); }}
          >
            {categoryPosts.western_glam.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.movie_promotion?.length > 0 && (
          <HorizontalCarousel
            title="🎬 Movie Promos & Trailers"
            icon={<Film className="w-4 h-4 text-purple-500" />}
            showAll
            onShowAll={() => { setCategory('movie_promotion'); setActiveTab('videos'); }}
          >
            {categoryPosts.movie_promotion.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {categoryPosts.event?.length > 0 && (
          <HorizontalCarousel
            title="🎉 Events & Celebrations"
            icon={<Sparkles className="w-4 h-4 text-yellow-500" />}
            showAll
            onShowAll={() => { setCategory('event'); setActiveTab('all'); }}
          >
            {categoryPosts.event.map((post) => (
              <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
            ))}
          </HorizontalCarousel>
        )}

        {/* ========== ALL CONTENT GRID ========== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Flame className="w-5 h-5 text-orange-500" />
              {category !== 'all' ? CATEGORIES.find(c => c.id === category)?.label : 'All Content'}
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{posts.length} items</span>
          </div>

          {loading && posts.length === 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-lg animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <Flame className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No content found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {posts.map((post) => (
                  <ContentCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                ))}
              </div>

              <div ref={loadMoreRef} className="h-8 mt-6">
                {loading && (
                  <div className="flex justify-center">
                    <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>End of content</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========== LIGHTBOX ========== */}
      {selectedPost && (
        <MediaLightbox
          post={selectedPost}
          posts={posts}
          onClose={() => setSelectedPost(null)}
          onNavigate={setSelectedPost}
        />
      )}
    </main>
  );
}
