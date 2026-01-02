'use client';

/**
 * Skeleton Loading Components
 * 
 * Provides placeholder loading states for various content types.
 * Prevents layout shift and provides visual feedback during loading.
 * 
 * Features:
 * - Multiple variants for different content types
 * - Shimmer animation
 * - Accessible with reduced motion support
 */

import { ReactNode } from 'react';

// ============================================================
// BASE SKELETON
// ============================================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
  children?: ReactNode;
}

export function Skeleton({ className = '', animate = true, children }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--bg-tertiary)] ${animate ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

// ============================================================
// TEXT SKELETON
// ============================================================

interface TextSkeletonProps {
  lines?: number;
  lastLineWidth?: 'full' | 'half' | 'short';
  className?: string;
}

export function TextSkeleton({ lines = 3, lastLineWidth = 'half', className = '' }: TextSkeletonProps) {
  const widthMap = {
    full: 'w-full',
    half: 'w-1/2',
    short: 'w-1/4',
  };

  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 rounded ${i === lines - 1 ? widthMap[lastLineWidth] : 'w-full'}`}
        />
      ))}
    </div>
  );
}

// ============================================================
// CARD SKELETON
// ============================================================

interface CardSkeletonProps {
  aspectRatio?: 'video' | 'square' | 'portrait';
  showText?: boolean;
  className?: string;
}

export function CardSkeleton({
  aspectRatio = 'video',
  showText = true,
  className = '',
}: CardSkeletonProps) {
  const aspectClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
  }[aspectRatio];

  return (
    <div className={`animate-pulse ${className}`} aria-hidden="true">
      <Skeleton className={`${aspectClass} rounded-lg mb-2`} animate={false} />
      {showText && (
        <>
          <Skeleton className="h-4 w-3/4 rounded mb-1" animate={false} />
          <Skeleton className="h-3 w-1/2 rounded" animate={false} />
        </>
      )}
    </div>
  );
}

// ============================================================
// MOVIE CARD SKELETON
// ============================================================

export function MovieCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`} aria-hidden="true">
      <Skeleton className="aspect-[2/3] rounded-lg mb-2" animate={false} />
      <Skeleton className="h-4 w-full rounded mb-1" animate={false} />
      <Skeleton className="h-3 w-2/3 rounded" animate={false} />
    </div>
  );
}

// ============================================================
// LIST SKELETON
// ============================================================

interface ListSkeletonProps {
  count?: number;
  showImage?: boolean;
  className?: string;
}

export function ListSkeleton({ count = 5, showImage = true, className = '' }: ListSkeletonProps) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          {showImage && (
            <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" animate={false} />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" animate={false} />
            <Skeleton className="h-3 w-1/2 rounded" animate={false} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// GRID SKELETON
// ============================================================

interface GridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4 | 5 | 6;
  aspectRatio?: 'video' | 'square' | 'portrait';
  className?: string;
}

export function GridSkeleton({
  count = 6,
  columns = 3,
  aspectRatio = 'video',
  className = '',
}: GridSkeletonProps) {
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[columns];

  return (
    <div className={`grid ${colClass} gap-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} aspectRatio={aspectRatio} />
      ))}
    </div>
  );
}

// ============================================================
// CAROUSEL SKELETON
// ============================================================

interface CarouselSkeletonProps {
  count?: number;
  cardWidth?: 'sm' | 'md' | 'lg';
  aspectRatio?: 'video' | 'square' | 'portrait';
  showTitle?: boolean;
  className?: string;
}

export function CarouselSkeleton({
  count = 5,
  cardWidth = 'md',
  aspectRatio = 'video',
  showTitle = true,
  className = '',
}: CarouselSkeletonProps) {
  const widthClass = {
    sm: 'w-28',
    md: 'w-40',
    lg: 'w-56',
  }[cardWidth];

  return (
    <div className={`animate-pulse ${className}`} aria-hidden="true">
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-4 h-4 rounded" animate={false} />
          <Skeleton className="w-32 h-5 rounded" animate={false} />
        </div>
      )}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`flex-shrink-0 ${widthClass}`}>
            <CardSkeleton aspectRatio={aspectRatio} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE HEADER SKELETON
// ============================================================

export function PageHeaderSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`} aria-hidden="true">
      <Skeleton className="h-8 w-48 rounded" animate={false} />
      <Skeleton className="h-4 w-96 rounded" animate={false} />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded" animate={false} />
        <Skeleton className="h-8 w-20 rounded" animate={false} />
        <Skeleton className="h-8 w-20 rounded" animate={false} />
      </div>
    </div>
  );
}

// ============================================================
// AVATAR SKELETON
// ============================================================

interface AvatarSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarSkeleton({ size = 'md', className = '' }: AvatarSkeletonProps) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  return (
    <Skeleton className={`${sizeClass} rounded-full ${className}`} />
  );
}

export default Skeleton;

