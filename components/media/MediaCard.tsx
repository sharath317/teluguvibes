'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Instagram, Youtube, Twitter, Eye, Heart } from 'lucide-react';
import type { MediaPost } from '@/types/media';

interface MediaCardProps {
  post: MediaPost;
  layout?: 'grid' | 'masonry';
  showEntity?: boolean;
  onClick?: () => void;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram_post: <Instagram className="w-4 h-4" />,
  instagram_reel: <Instagram className="w-4 h-4" />,
  youtube_video: <Youtube className="w-4 h-4" />,
  youtube_short: <Youtube className="w-4 h-4" />,
  twitter_post: <Twitter className="w-4 h-4" />,
  image: null,
};

const platformColors: Record<string, string> = {
  instagram_post: 'bg-gradient-to-r from-purple-500 to-pink-500',
  instagram_reel: 'bg-gradient-to-r from-purple-500 to-pink-500',
  youtube_video: 'bg-red-600',
  youtube_short: 'bg-red-600',
  twitter_post: 'bg-blue-500',
  image: 'bg-gray-700',
};

export function MediaCard({ post, layout = 'grid', showEntity = true, onClick }: MediaCardProps) {
  const imageUrl = post.thumbnail_url || post.image_url || '/placeholder-media.svg';
  const isVideo = ['youtube_video', 'youtube_short', 'instagram_reel'].includes(post.media_type);

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-gray-900 cursor-pointer
        transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-500/10
        ${layout === 'masonry' ? 'break-inside-avoid' : ''}`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={imageUrl}
          alt={post.title || post.caption || 'Media'}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 50vw, 25vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Platform Badge */}
        {platformIcons[post.media_type] && (
          <div className={`absolute top-3 left-3 px-2 py-1 rounded-full ${platformColors[post.media_type]} flex items-center gap-1 text-white text-xs font-medium`}>
            {platformIcons[post.media_type]}
            <span className="capitalize">
              {post.media_type.replace('_', ' ').replace('youtube', 'YT').replace('instagram', 'IG')}
            </span>
          </div>
        )}

        {/* Hot Badge */}
        {post.is_hot && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-bold">
            🔥 HOT
          </div>
        )}

        {/* Video Play Button */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-4 text-white/80 text-sm">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {formatCount(post.views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {formatCount(post.likes)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Entity */}
        {showEntity && post.entity && (
          <Link
            href={`/hot/entity/${post.entity.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 mb-2 group/entity"
          >
            {post.entity.profile_image && (
              <Image
                src={post.entity.profile_image}
                alt={post.entity.name_en}
                width={24}
                height={24}
                className="rounded-full"
              />
            )}
            <span className="text-yellow-500 text-sm font-medium group-hover/entity:underline">
              {post.entity.name_en}
            </span>
          </Link>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-gray-300 text-sm line-clamp-2">{post.caption}</p>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-800 rounded-full text-xs text-gray-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

/**
 * Featured Media Card (larger, more prominent)
 */
export function FeaturedMediaCard({ post, onClick }: { post: MediaPost; onClick?: () => void }) {
  const imageUrl = post.thumbnail_url || post.image_url || '/placeholder-media.svg';

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-[16/9] md:aspect-[21/9]">
        <Image
          src={imageUrl}
          alt={post.title || 'Featured media'}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          {post.entity && (
            <div className="flex items-center gap-3 mb-3">
              {post.entity.profile_image && (
                <Image
                  src={post.entity.profile_image}
                  alt={post.entity.name_en}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-yellow-500"
                />
              )}
              <div>
                <h3 className="text-white font-bold text-lg">{post.entity.name_en}</h3>
                <span className="text-yellow-500 text-sm capitalize">{post.entity.entity_type}</span>
              </div>
            </div>
          )}

          {post.title && (
            <h2 className="text-white text-2xl md:text-3xl font-bold mb-2">{post.title}</h2>
          )}

          {post.caption && (
            <p className="text-gray-300 text-sm md:text-base line-clamp-2 max-w-2xl">
              {post.caption}
            </p>
          )}

          <div className="flex items-center gap-4 mt-4 text-white/80">
            <span className="flex items-center gap-1">
              <Eye className="w-5 h-5" />
              {formatCount(post.views)} views
            </span>
            {post.is_hot && (
              <span className="px-3 py-1 bg-orange-500 rounded-full text-sm font-bold">
                🔥 TRENDING
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}








