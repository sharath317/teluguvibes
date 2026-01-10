'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame, Camera, ChevronLeft, ChevronRight, TrendingUp, Heart,
  Eye, Play, X, Star, Sparkles, Grid3X3, Settings, HeartOff
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useHotPersonalization, type HotMediaItem } from '@/lib/browser/useHotPersonalization';

// ============== TYPES ==============
interface GlamPost extends HotMediaItem {
  id: string;
  entity_name: string;
  entity_type: string;
  image_url: string;
  thumbnail_url: string;
  embed_html?: string;
  embed_url?: string;
  platform: string;
  caption: string;
  category: string;
  views: number;
  likes: number;
  trending_score: number;
  is_featured: boolean;
  is_hot: boolean;
  published_at: string;
}

// ============== INSTAGRAM LINK CARD (No Auth Workaround) ==============
function InstagramLinkCard({ 
  postUrl, 
  celebrityName,
  caption 
}: { 
  postUrl: string; 
  celebrityName: string;
  caption?: string;
}) {
  const handleClick = () => {
    window.open(postUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="w-full max-w-md mx-auto rounded-xl overflow-hidden cursor-pointer transform transition-all hover:scale-[1.02]"
      onClick={handleClick}
      style={{
        background: 'linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)',
        minHeight: '400px',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-black/20">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-xl">📸</span>
        </div>
        <div>
          <p className="text-white font-bold">{celebrityName}</p>
          <p className="text-white/70 text-sm">Instagram</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-col items-center justify-center p-8" style={{ minHeight: '280px' }}>
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </div>
        <p className="text-white text-center text-lg font-medium mb-2">
          {caption || `${celebrityName} on Instagram`}
        </p>
        <p className="text-white/60 text-sm mb-6">Tap to view on Instagram</p>
        
        {/* Button */}
        <button className="px-6 py-3 bg-white rounded-full text-gray-900 font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors">
          <span>View Post</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
      
      {/* Footer */}
      <div className="p-4 bg-black/20 text-center">
        <p className="text-white/50 text-xs">Opens in Instagram app or website</p>
      </div>
    </div>
  );
}

// ============== AUTO CAROUSEL (5 seconds) ==============
function AutoCarousel({ posts, onSelect }: { posts: GlamPost[]; onSelect: (post: GlamPost) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (isPaused || posts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [posts.length, isPaused]);

  if (posts.length === 0) return null;
  const currentPost = posts[currentIndex];

  return (
    <div 
      className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-xl overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Image */}
      <div className="absolute inset-0 transition-opacity duration-700">
        {currentPost.image_url ? (
          <Image
            src={currentPost.image_url}
            alt={currentPost.entity_name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
            <Camera className="w-16 h-16 opacity-30" />
          </div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
        <div className="flex items-end justify-between">
          <div className="flex-1">
            <span className="inline-block px-2 py-1 text-xs font-medium rounded mb-2" 
              style={{ background: 'var(--brand-primary)', color: 'white' }}>
              🔥 HOT
            </span>
            <h2 className="text-xl md:text-3xl font-bold text-white mb-1">
              {currentPost.entity_name}
            </h2>
            <p className="text-sm md:text-base text-white/80 line-clamp-2">
              {currentPost.caption}
            </p>
            <div className="flex items-center gap-4 mt-2 text-white/70 text-xs">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {(currentPost.views || 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" /> {(currentPost.likes || 0).toLocaleString()}
              </span>
            </div>
          </div>
          <button
            onClick={() => onSelect(currentPost)}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-transform hover:scale-105"
            style={{ background: 'var(--brand-primary)', color: 'white' }}
          >
            View Gallery
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % posts.length)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {posts.slice(0, 8).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentIndex ? 'w-6 bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ============== GALLERY CARD (Tupaki Style) ==============
function GalleryCard({ post, onClick }: { post: GlamPost; onClick: () => void }) {
  const isInstagram = post.platform === 'instagram';
  
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div className="relative aspect-[3/4]">
        {post.image_url ? (
          <Image
            src={post.thumbnail_url || post.image_url}
            alt={post.entity_name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : isInstagram ? (
          // Instagram placeholder with gradient
          <div 
            className="w-full h-full flex flex-col items-center justify-center gap-3 p-4"
            style={{ 
              background: 'linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)',
            }}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-3xl">📸</span>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-sm">{post.entity_name}</p>
              <p className="text-white/80 text-xs mt-1">Instagram Post</p>
              <p className="text-white/60 text-xs mt-2">Click to view</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            <Camera className="w-8 h-8 opacity-30" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Platform & Hot Badge */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {post.platform === 'instagram' && (
            <div className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ background: 'linear-gradient(45deg, #833AB4, #E1306C, #F77737)', color: 'white' }}>
              📸 IG
            </div>
          )}
          {post.is_hot && (
            <div className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ background: '#ff4444', color: 'white' }}>
              🔥 HOT
            </div>
          )}
        </div>
        
        {/* Views */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
          <Eye className="w-3 h-3" />
          {(post.views || 0).toLocaleString()}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>
          {post.entity_name}
        </h3>
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {post.caption}
        </p>
      </div>
    </div>
  );
}

// ============== ACTRESS ROW (Horizontal) ==============
function ActressRow({ 
  title, 
  posts, 
  onSelect,
  showViewAll = true 
}: { 
  title: string; 
  posts: GlamPost[]; 
  onSelect: (post: GlamPost) => void;
  showViewAll?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (posts.length === 0) return null;

  return (
    <div className="relative group/row">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {showViewAll && (
          <button className="text-xs hover:underline" style={{ color: 'var(--brand-primary)' }}>
            View All →
          </button>
        )}
      </div>
      
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        >
          {posts.map((post) => (
            <div key={post.id} className="flex-shrink-0 w-40 md:w-48">
              <GalleryCard post={post} onClick={() => onSelect(post)} />
            </div>
          ))}
        </div>
        
        {/* Nav buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============== LIGHTBOX ==============
function Lightbox({ 
  post, 
  posts, 
  onClose, 
  onNavigate,
  isFavorite,
  onToggleFavorite,
}: { 
  post: GlamPost; 
  posts: GlamPost[]; 
  onClose: () => void; 
  onNavigate: (post: GlamPost) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const currentIdx = posts.findIndex(p => p.id === post.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < posts.length - 1;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(posts[currentIdx - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(posts[currentIdx + 1]);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [currentIdx, hasPrev, hasNext, posts, onClose, onNavigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.95)' }}>
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        {/* Favorite button */}
        <button
          onClick={onToggleFavorite}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isFavorite ? 'bg-red-500 scale-110' : 'hover:bg-white/10'
          }`}
          style={{ color: 'white' }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-white' : ''}`} />
        </button>
        
        {/* Close */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10"
          style={{ color: 'white' }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="relative max-w-5xl max-h-[85vh] w-full mx-4 overflow-y-auto">
        {/* Instagram Link Card (No Auth Workaround) */}
        {post.platform === 'instagram' && post.embed_url ? (
          <div className="flex flex-col items-center py-4">
            <InstagramLinkCard 
              postUrl={post.embed_url} 
              celebrityName={post.entity_name}
              caption={post.caption}
            />
          </div>
        ) : (
          <>
            <div className="relative aspect-[3/4] md:aspect-[4/3]">
              {post.image_url && (
                <Image
                  src={post.image_url}
                  alt={post.entity_name}
                  fill
                  className="object-contain"
                  priority
                />
              )}
            </div>
            {/* Caption overlay for images */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <h3 className="text-xl font-bold text-white">{post.entity_name}</h3>
              <p className="text-white/80 text-sm">{post.caption}</p>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(posts[currentIdx - 1])}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/10"
          style={{ color: 'white' }}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => onNavigate(posts[currentIdx + 1])}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/10"
          style={{ color: 'white' }}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm"
        style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
        {currentIdx + 1} / {posts.length}
      </div>
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function HotGalleryPage() {
  const [posts, setPosts] = useState<GlamPost[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<GlamPost[]>([]);
  const [actressPosts, setActressPosts] = useState<Record<string, GlamPost[]>>({});
  const [selectedPost, setSelectedPost] = useState<GlamPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Personalization hook
  const {
    state: personalizationState,
    trackView,
    trackClick,
    toggleFavorite,
    setIntensity,
    isFavorite,
    personalizeContent,
    filterByUserIntensity,
    trackScrollDepth,
  } = useHotPersonalization();

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollPercentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      trackScrollDepth(scrollPercentage);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackScrollDepth]);

  // Fetch all posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hot-media?limit=100');
      const data = await res.json();
      
      const allPosts: GlamPost[] = (data.media || []).map((m: any) => ({
        id: m.id,
        entity_name: m.entity_name,
        entity_type: m.entity_type,
        image_url: m.image_url,
        thumbnail_url: m.thumbnail_url || m.image_url,
        embed_html: m.embed_html,
        embed_url: m.embed_url,
        platform: m.platform || 'tmdb',
        caption: m.selected_caption || m.caption_te || '',
        category: m.category,
        views: m.views || 0,
        likes: m.likes || 0,
        trending_score: m.trending_score || 0,
        is_featured: m.is_featured,
        is_hot: m.is_hot,
        published_at: m.published_at,
        tags: m.tags || [],
      }));
      
      // Apply personalization ordering
      const personalizedPosts = personalizationState.isLoaded 
        ? personalizeContent(allPosts) 
        : allPosts;
      
      setPosts(personalizedPosts);
      
      // Featured: top trending (personalized)
      const featured = personalizedPosts.filter(p => p.trending_score > 70).slice(0, 8);
      setFeaturedPosts(featured.length > 0 ? featured : personalizedPosts.slice(0, 8));
      
      // Group by actress (prioritize favorites)
      const byActress: Record<string, GlamPost[]> = {};
      personalizedPosts.forEach(p => {
        if (!byActress[p.entity_name]) byActress[p.entity_name] = [];
        byActress[p.entity_name].push(p);
      });
      setActressPosts(byActress);
      
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  }, [personalizationState.isLoaded, personalizeContent]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle post click with tracking
  const handlePostClick = useCallback((post: GlamPost) => {
    trackClick(post.id);
    setSelectedPost(post);
  }, [trackClick]);

  // Track view when post enters lightbox
  useEffect(() => {
    if (selectedPost) {
      trackView(selectedPost.id);
    }
  }, [selectedPost, trackView]);

  // Filter posts by category
  const filteredPosts = activeCategory === 'all' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  // Top actresses by post count
  const topActresses = Object.entries(actressPosts)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 6);

  const categories = [
    { id: 'all', label: 'All Photos', emoji: '📸' },
    { id: 'photoshoot', label: 'Photoshoots', emoji: '✨' },
    { id: 'events', label: 'Events', emoji: '🎬' },
    { id: 'fashion', label: 'Fashion', emoji: '👗' },
    { id: 'traditional', label: 'Traditional', emoji: '🪷' },
    { id: 'western', label: 'Western', emoji: '👠' },
  ];

  return (
    <main ref={containerRef} className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
      {/* ========== HEADER ========== */}
      <div className="sticky top-0 z-40 border-b" style={{ 
        background: 'var(--bg-primary)', 
        borderColor: 'var(--border-primary)' 
      }}>
        <div className="max-w-7xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5" style={{ color: '#ff4444' }} />
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Photo Gallery
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Favorites count */}
              {personalizationState.preferences?.favoriteCelebrities.length ? (
                <span className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{ 
                  background: 'rgba(255, 68, 68, 0.15)', 
                  color: '#ff4444' 
                }}>
                  <Heart className="w-3 h-3 fill-current" />
                  {personalizationState.preferences.favoriteCelebrities.length}
                </span>
              ) : null}
              
              {/* Photo count */}
              <span className="text-xs px-2 py-1 rounded" style={{ 
                background: 'var(--bg-secondary)', 
                color: 'var(--text-secondary)' 
              }}>
                {posts.length} Photos
              </span>
              
              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ 
                  background: showSettings ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                  color: showSettings ? 'white' : 'var(--text-secondary)'
                }}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Personalization Settings Panel */}
          {showSettings && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex flex-col gap-3">
                {/* Intensity Slider */}
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Content Intensity
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Mild</span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={personalizationState.preferences?.intensityPreference || 3}
                      onChange={(e) => setIntensity(parseInt(e.target.value))}
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ background: 'var(--bg-tertiary)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Bold</span>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>Views: {personalizationState.preferences?.totalViews || 0}</span>
                  <span>Engagement: {personalizationState.engagementLevel}</span>
                </div>
                
                {/* Top interests */}
                {personalizationState.topCelebrities.length > 0 && (
                  <div>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Your interests:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {personalizationState.topCelebrities.slice(0, 5).map((c) => (
                        <span key={c.name} className="px-2 py-0.5 rounded text-xs" style={{ 
                          background: 'var(--bg-tertiary)', 
                          color: 'var(--text-primary)' 
                        }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4 space-y-6">
        
        {/* ========== FEATURED CAROUSEL (Auto 5s) ========== */}
        {featuredPosts.length > 0 && (
          <section>
            <AutoCarousel posts={featuredPosts} onSelect={setSelectedPost} />
          </section>
        )}

        {/* ========== CATEGORY PILLS ========== */}
        <section className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id ? 'scale-105' : ''
                }`}
                style={{
                  background: activeCategory === cat.id ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                  color: activeCategory === cat.id ? 'white' : 'var(--text-primary)',
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* ========== HOT ACTRESSES SECTIONS ========== */}
        {topActresses.map(([name, actressPosts]) => (
          <section key={name}>
            <ActressRow
              title={`${name} ${isFavorite(name) ? '❤️' : '📸'}`}
              posts={actressPosts}
              onSelect={handlePostClick}
            />
          </section>
        ))}

        {/* ========== ALL PHOTOS GRID (Tupaki Style) ========== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Grid3X3 className="w-5 h-5" />
              {activeCategory === 'all' ? 'Latest Photos' : categories.find(c => c.id === activeCategory)?.label}
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {filteredPosts.length} photos
            </span>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredPosts.map((post) => (
                <GalleryCard key={post.id} post={post} onClick={() => handlePostClick(post)} />
              ))}
            </div>
          )}
        </section>

        {/* ========== TRENDING NOW ========== */}
        <section className="pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: '#ff4444' }} />
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Trending Now
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.filter(p => p.trending_score > 50).slice(0, 6).map((post, idx) => (
              <div
                key={post.id}
                onClick={() => handlePostClick(post)}
                className="flex gap-3 p-3 rounded-lg cursor-pointer hover:scale-[1.02] transition-transform"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  {post.thumbnail_url && (
                    <Image src={post.thumbnail_url} alt="" fill className="object-cover" />
                  )}
                  <div className="absolute top-0 left-0 w-6 h-6 flex items-center justify-center text-xs font-bold"
                    style={{ background: idx < 3 ? '#ff4444' : 'var(--bg-tertiary)', color: 'white' }}>
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                    {post.entity_name}
                  </h4>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {post.caption}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {post.views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {post.likes.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ========== LIGHTBOX ========== */}
      {selectedPost && (
        <Lightbox
          post={selectedPost}
          posts={posts}
          onClose={() => setSelectedPost(null)}
          onNavigate={setSelectedPost}
          isFavorite={isFavorite(selectedPost.entity_name)}
          onToggleFavorite={() => toggleFavorite(selectedPost.entity_name)}
        />
      )}
    </main>
  );
}
