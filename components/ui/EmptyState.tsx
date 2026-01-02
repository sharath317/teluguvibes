'use client';

/**
 * Empty State Component
 * 
 * Graceful placeholder when content is not available.
 * Prevents broken UI and guides users.
 * 
 * Features:
 * - Multiple variants for different contexts
 * - Optional action button
 * - Icon customization
 * - Accessible messaging
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  FileQuestion,
  Inbox,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Tv,
  Users,
  Heart,
  Star,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

type EmptyStateVariant =
  | 'default'
  | 'search'
  | 'movies'
  | 'reviews'
  | 'collections'
  | 'celebrities'
  | 'favorites'
  | 'error'
  | 'offline';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================
// VARIANT CONFIG
// ============================================================

const VARIANT_CONFIG: Record<
  EmptyStateVariant,
  { icon: ReactNode; title: string; description: string }
> = {
  default: {
    icon: <Inbox className="w-12 h-12" />,
    title: 'No content available',
    description: 'There is nothing to display at the moment.',
  },
  search: {
    icon: <Search className="w-12 h-12" />,
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  movies: {
    icon: <Film className="w-12 h-12" />,
    title: 'No movies found',
    description: 'We couldn\'t find any movies matching your criteria.',
  },
  reviews: {
    icon: <Star className="w-12 h-12" />,
    title: 'No reviews yet',
    description: 'Reviews for this content are not available yet.',
  },
  collections: {
    icon: <Tv className="w-12 h-12" />,
    title: 'No collections available',
    description: 'Collections will appear here once they are created.',
  },
  celebrities: {
    icon: <Users className="w-12 h-12" />,
    title: 'No celebrities found',
    description: 'We couldn\'t find any celebrities matching your search.',
  },
  favorites: {
    icon: <Heart className="w-12 h-12" />,
    title: 'No favorites yet',
    description: 'Start adding movies and content to your favorites.',
  },
  error: {
    icon: <AlertCircle className="w-12 h-12" />,
    title: 'Something went wrong',
    description: 'We encountered an error while loading this content.',
  },
  offline: {
    icon: <RefreshCw className="w-12 h-12" />,
    title: 'You\'re offline',
    description: 'Please check your internet connection and try again.',
  },
};

// ============================================================
// ACTION BUTTON COMPONENT
// ============================================================

function ActionButton({ action }: { action: EmptyStateAction }) {
  const baseClass =
    'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors';
  const variantClass =
    action.variant === 'secondary'
      ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
      : 'bg-[var(--brand-primary)] text-white hover:opacity-90';

  if (action.href) {
    return (
      <Link href={action.href} className={`${baseClass} ${variantClass}`}>
        {action.label}
        <ArrowRight className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <button onClick={action.onClick} className={`${baseClass} ${variantClass}`}>
      {action.label}
    </button>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function EmptyState({
  variant = 'default',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  const sizeConfig = {
    sm: {
      container: 'py-6',
      iconClass: 'w-10 h-10',
      titleClass: 'text-base',
      descClass: 'text-sm',
    },
    md: {
      container: 'py-12',
      iconClass: 'w-12 h-12',
      titleClass: 'text-lg',
      descClass: 'text-sm',
    },
    lg: {
      container: 'py-16',
      iconClass: 'w-16 h-16',
      titleClass: 'text-xl',
      descClass: 'text-base',
    },
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${sizeConfig.container} ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="mb-4 text-[var(--text-tertiary)]">{displayIcon}</div>

      {/* Title */}
      <h3
        className={`font-semibold text-[var(--text-primary)] mb-2 ${sizeConfig.titleClass}`}
      >
        {displayTitle}
      </h3>

      {/* Description */}
      <p
        className={`text-[var(--text-secondary)] max-w-md mx-auto mb-6 ${sizeConfig.descClass}`}
      >
        {displayDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && <ActionButton action={action} />}
          {secondaryAction && <ActionButton action={{ ...secondaryAction, variant: 'secondary' }} />}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SPECIALIZED EMPTY STATES
// ============================================================

export function NoSearchResults({
  query,
  onClear,
}: {
  query?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      variant="search"
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try different keywords or remove some filters."
      action={
        onClear
          ? { label: 'Clear search', onClick: onClear, variant: 'secondary' }
          : undefined
      }
    />
  );
}

export function NoMoviesFound({
  showBrowse = true,
}: {
  showBrowse?: boolean;
}) {
  return (
    <EmptyState
      variant="movies"
      action={showBrowse ? { label: 'Browse all movies', href: '/reviews' } : undefined}
    />
  );
}

export function ErrorState({
  onRetry,
  message,
}: {
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <EmptyState
      variant="error"
      description={message}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      variant="offline"
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  );
}

export default EmptyState;

