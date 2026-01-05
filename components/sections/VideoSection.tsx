'use client';

/**
 * VideoSection Component
 * 
 * Video content section with play button overlays.
 * Supports YouTube embeds and thumbnail previews.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Clock, Eye, ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration?: string;
  views?: number;
  href: string;
  embedUrl?: string;
  category?: string;
  publishedAt?: string;
}

interface VideoSectionProps {
  title?: string;
  videos: VideoItem[];
  href?: string;
  layout?: 'grid' | 'horizontal' | 'featured';
  className?: string;
}

export function VideoSection({
  title = 'వీడియోలు',
  videos,
  href,
  layout = 'horizontal',
  className = '',
}: VideoSectionProps) {
  if (videos.length === 0) return null;

  return (
    <section className={className}>
      <SectionHeader 
        title={title} 
        emoji="🎥" 
        href={href}
        color="#ef4444"
      />

      {layout === 'featured' && videos.length > 0 && (
        <FeaturedVideoLayout videos={videos} />
      )}

      {layout === 'horizontal' && (
        <VideoCarousel videos={videos} />
      )}

      {layout === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} size="medium" />
          ))}
        </div>
      )}
    </section>
  );
}

// Featured layout with large player + thumbnails
function FeaturedVideoLayout({ videos }: { videos: VideoItem[] }) {
  const [activeVideo, setActiveVideo] = useState(videos[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Main Video */}
      <div className="md:col-span-2">
        <div 
          className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group"
          style={{ background: 'var(--bg-tertiary)' }}
          onClick={() => setIsPlaying(true)}
        >
          {isPlaying && activeVideo.embedUrl ? (
            <iframe
              src={activeVideo.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              {activeVideo.thumbnailUrl && (
                <Image
                  src={activeVideo.thumbnailUrl}
                  alt={activeVideo.title}
                  fill
                  className="object-cover"
                />
              )}
              
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </div>
              </div>

              {/* Duration badge */}
              {activeVideo.duration && (
                <div 
                  className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-medium"
                  style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}
                >
                  {activeVideo.duration}
                </div>
              )}
            </>
          )}
        </div>

        {/* Title & meta */}
        <div className="mt-3">
          <h3 
            className="font-bold text-lg line-clamp-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {activeVideo.title}
          </h3>
          <div 
            className="flex items-center gap-3 mt-1 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {activeVideo.views !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {activeVideo.views.toLocaleString()} views
              </span>
            )}
            {activeVideo.publishedAt && (
              <span>{formatTimeAgo(activeVideo.publishedAt)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Video list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
        {videos.map((video, idx) => (
          <button
            key={video.id}
            onClick={() => {
              setActiveVideo(video);
              setIsPlaying(false);
            }}
            className={`w-full flex gap-3 p-2 rounded-lg transition-colors text-left ${
              video.id === activeVideo.id ? 'ring-2' : ''
            }`}
            style={{ 
              background: video.id === activeVideo.id ? 'var(--bg-hover)' : 'var(--bg-secondary)',
              borderColor: 'var(--brand-primary)',
            }}
          >
            {/* Thumbnail */}
            <div 
              className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              {video.thumbnailUrl && (
                <Image
                  src={video.thumbnailUrl}
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              )}
              {/* Small play icon */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="w-4 h-4 text-white" fill="white" />
              </div>
              {video.duration && (
                <span 
                  className="absolute bottom-0.5 right-0.5 px-1 text-[10px] rounded"
                  style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}
                >
                  {video.duration}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p 
                className="text-xs font-medium line-clamp-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {video.title}
              </p>
              {video.views !== undefined && (
                <span 
                  className="text-[10px] mt-1 block"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {video.views.toLocaleString()} views
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Horizontal scrolling carousel
function VideoCarousel({ videos }: { videos: VideoItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ 
      left: direction === 'left' ? -amount : amount, 
      behavior: 'smooth' 
    });
  };

  return (
    <div className="relative group/carousel">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
      >
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} size="large" />
        ))}
      </div>

      {/* Navigation buttons */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 shadow-lg"
        style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10 shadow-lg"
        style={{ 
          background: 'var(--bg-secondary)', 
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// Individual video card
function VideoCard({ 
  video, 
  size = 'medium' 
}: { 
  video: VideoItem; 
  size?: 'small' | 'medium' | 'large';
}) {
  const sizeClasses = {
    small: 'w-40',
    medium: 'w-48',
    large: 'w-64 md:w-72',
  };

  return (
    <Link
      href={video.href}
      className={`${sizeClasses[size]} flex-shrink-0 group`}
    >
      {/* Thumbnail */}
      <div 
        className="relative aspect-video rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-8 h-8 opacity-30" />
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: 'rgba(255, 107, 0, 0.9)' }}
          >
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>

        {/* Duration badge */}
        {video.duration && (
          <div 
            className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}
          >
            {video.duration}
          </div>
        )}

        {/* Category badge */}
        {video.category && (
          <div 
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
            style={{ background: 'var(--brand-primary)', color: 'white' }}
          >
            {video.category}
          </div>
        )}
      </div>

      {/* Title & meta */}
      <div className="mt-2">
        <h4 
          className="text-sm font-medium line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {video.title}
        </h4>
        <div 
          className="flex items-center gap-2 mt-1 text-[10px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {video.views !== undefined && (
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {video.views.toLocaleString()}
            </span>
          )}
          {video.publishedAt && (
            <>
              <span>•</span>
              <span>{formatTimeAgo(video.publishedAt)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// Compact video list item
export function VideoListItem({ video }: { video: VideoItem }) {
  return (
    <Link
      href={video.href}
      className="flex gap-3 p-2 rounded-lg transition-colors group"
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {/* Thumbnail */}
      <div 
        className="relative w-28 h-16 rounded overflow-hidden flex-shrink-0"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        {video.thumbnailUrl && (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="w-6 h-6 text-white" fill="white" />
        </div>
        {video.duration && (
          <span 
            className="absolute bottom-1 right-1 px-1 text-[9px] rounded"
            style={{ background: 'rgba(0,0,0,0.8)', color: 'white' }}
          >
            {video.duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 
          className="text-sm font-medium line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          {video.title}
        </h4>
        <div 
          className="flex items-center gap-2 mt-1 text-[10px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {video.views !== undefined && (
            <span>{video.views.toLocaleString()} views</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Time formatting helper
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('te-IN', { month: 'short', day: 'numeric' });
  }
}

export default VideoSection;






