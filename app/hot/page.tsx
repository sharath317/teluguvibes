'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Flame, Camera, ChevronLeft, ChevronRight, TrendingUp, Heart,
  Eye, Play, X, Star, Sparkles, Grid3X3
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// ============== TYPES ==============
interface GlamPost {
  id: string;
  entity_name: string;
  entity_type: string;
  image_url: string;
  thumbnail_url: string;
  caption: string;
  category: string;
  views: number;
  likes: number;
  trending_score: number;
  is_featured: boolean;
  is_hot: boolean;
  published_at: string;
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
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            <Camera className="w-8 h-8 opacity-30" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Hot Badge */}
        {post.is_hot && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold"
            style={{ background: '#ff4444', color: 'white' }}>
            🔥 HOT
          </div>
        )}
        
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
  onNavigate 
}: { 
  post: GlamPost; 
  posts: GlamPost[]; 
  onClose: () => void; 
  onNavigate: (post: GlamPost) => void;
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
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10"
        style={{ color: 'white' }}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image */}
      <div className="relative max-w-5xl max-h-[85vh] w-full mx-4">
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
        
        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-xl font-bold text-white">{post.entity_name}</h3>
          <p className="text-white/80 text-sm">{post.caption}</p>
        </div>
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
        caption: m.selected_caption || m.caption_te || '',
        category: m.category,
        views: m.views || 0,
        likes: m.likes || 0,
        trending_score: m.trending_score || 0,
        is_featured: m.is_featured,
        is_hot: m.is_hot,
        published_at: m.published_at,
      }));
      
      setPosts(allPosts);
      
      // Featured: top trending
      setFeaturedPosts(allPosts.filter(p => p.trending_score > 70).slice(0, 8));
      
      // Group by actress
      const byActress: Record<string, GlamPost[]> = {};
      allPosts.forEach(p => {
        if (!byActress[p.entity_name]) byActress[p.entity_name] = [];
        byActress[p.entity_name].push(p);
      });
      setActressPosts(byActress);
      
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
    <main className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>
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
            <div className="flex items-center gap-1">
              <span className="text-xs px-2 py-1 rounded" style={{ 
                background: 'var(--bg-secondary)', 
                color: 'var(--text-secondary)' 
              }}>
                {posts.length} Photos
              </span>
            </div>
          </div>
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
              title={`${name} 📸`}
              posts={actressPosts}
              onSelect={setSelectedPost}
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
                <GalleryCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
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
                onClick={() => setSelectedPost(post)}
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
        />
      )}
    </main>
  );
}
