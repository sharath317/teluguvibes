'use client';

/**
 * STATUS BADGE COMPONENT
 *
 * Displays content status with color-coded badges.
 */

import { ContentStatus } from '@/lib/intelligence/types';

interface StatusBadgeProps {
  status: ContentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  READY: {
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: '✓',
    label: 'Ready',
  },
  NEEDS_REVIEW: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: '👁',
    label: 'Review',
  },
  NEEDS_REWORK: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: '↻',
    label: 'Rework',
  },
  DRAFT: {
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    icon: '📝',
    label: 'Draft',
  },
  published: {
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: '✓',
    label: 'Published',
  },
  draft: {
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    icon: '📝',
    label: 'Draft',
  },
  archived: {
    color: 'text-gray-500 dark:text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-900',
    icon: '📦',
    label: 'Archived',
  },
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${config.color} ${config.bg} ${sizeClasses[size]}
      `}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}

/**
 * VALIDATION SCORE BADGE
 */
interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  let color = 'text-red-600 dark:text-red-400';
  let bg = 'bg-red-100 dark:bg-red-900/30';

  if (score >= 80) {
    color = 'text-green-600 dark:text-green-400';
    bg = 'bg-green-100 dark:bg-green-900/30';
  } else if (score >= 60) {
    color = 'text-yellow-600 dark:text-yellow-400';
    bg = 'bg-yellow-100 dark:bg-yellow-900/30';
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-mono font-bold
        ${color} ${bg} ${sizeClasses[size]}
      `}
    >
      {score}
    </span>
  );
}

/**
 * IMAGE SOURCE BADGE
 */
interface ImageSourceBadgeProps {
  source: string;
  size?: 'sm' | 'md';
}

const imageSourceConfig: Record<string, { icon: string; label: string; color: string }> = {
  tmdb: { icon: '🎬', label: 'TMDB', color: 'text-blue-600 dark:text-blue-400' },
  wikimedia: { icon: '📚', label: 'Wikimedia', color: 'text-purple-600 dark:text-purple-400' },
  wikipedia: { icon: '📖', label: 'Wikipedia', color: 'text-gray-600 dark:text-gray-400' },
  unsplash: { icon: '📷', label: 'Unsplash', color: 'text-pink-600 dark:text-pink-400' },
  pexels: { icon: '🖼', label: 'Pexels', color: 'text-green-600 dark:text-green-400' },
  ai_generated: { icon: '🤖', label: 'AI', color: 'text-orange-600 dark:text-orange-400' },
};

export function ImageSourceBadge({ source, size = 'sm' }: ImageSourceBadgeProps) {
  const config = imageSourceConfig[source] || { icon: '❓', label: source, color: 'text-gray-500' };

  return (
    <span
      className={`
        inline-flex items-center gap-1 ${config.color} ${sizeClasses[size]}
      `}
    >
      <span>{config.icon}</span>
      <span className="text-xs">{config.label}</span>
    </span>
  );
}
