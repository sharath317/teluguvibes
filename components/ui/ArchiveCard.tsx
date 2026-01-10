'use client';

/**
 * ARCHIVE CARD COMPONENT
 * 
 * Archive Reference Card for movies without valid posters (Tier 3 visuals).
 * 
 * Features:
 * - Film reel border pattern aesthetic
 * - Movie title and year prominently displayed
 * - Lead actor and studio information
 * - Verified archival limitation label
 * - Transparent reason for poster unavailability
 * 
 * Design Principles:
 * - Honest representation (not a fake poster)
 * - Cultural respect for classic films
 * - Accessible and informative
 * 
 * REFACTORED to use design system primitives (Text, StatusBadge)
 */

import { Film, Archive, Info, CheckCircle, AlertCircle } from 'lucide-react';
import type { ArchiveCardData } from '@/lib/visual-intelligence/types';
import {
  getArchiveReasonDisplay,
  getArchiveCardSubtitle,
  getVerificationStatus,
} from '@/lib/visual-intelligence/archive-card-generator';

// Import design system primitives
import { Text } from '@/components/ui/primitives/Text';
import { StatusBadge } from '@/components/ui/primitives/Badge';

// ============================================================
// TYPES
// ============================================================

interface ArchiveCardProps {
  /** Archive card data */
  data: ArchiveCardData;
  /** Card size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Aspect ratio (default 2/3 like movie posters) */
  aspectRatio?: 'poster' | 'square' | 'landscape';
  /** Show detailed information */
  showDetails?: boolean;
  /** Custom class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// ============================================================
// SIZE CLASSES
// ============================================================

const sizeClasses = {
  sm: {
    container: 'w-24 h-36',
    title: 'text-xs',
    year: 'text-[10px]',
    subtitle: 'text-[8px]',
    icon: 'w-6 h-6',
    badge: 'text-[6px] px-1 py-0.5',
  },
  md: {
    container: 'w-32 h-48',
    title: 'text-sm',
    year: 'text-xs',
    subtitle: 'text-[10px]',
    icon: 'w-8 h-8',
    badge: 'text-[8px] px-1.5 py-0.5',
  },
  lg: {
    container: 'w-48 h-72',
    title: 'text-base',
    year: 'text-sm',
    subtitle: 'text-xs',
    icon: 'w-10 h-10',
    badge: 'text-xs px-2 py-1',
  },
};

const aspectRatioClasses = {
  poster: 'aspect-[2/3]',
  square: 'aspect-square',
  landscape: 'aspect-video',
};

// ============================================================
// FILM REEL BORDER PATTERN
// ============================================================

function FilmReelBorder({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Left perforations */}
      <div className="absolute left-0 top-0 bottom-0 w-2 flex flex-col justify-around py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={`left-${i}`}
            className="w-1.5 h-2 bg-[var(--border-primary)] rounded-sm mx-auto"
          />
        ))}
      </div>
      {/* Right perforations */}
      <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col justify-around py-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={`right-${i}`}
            className="w-1.5 h-2 bg-[var(--border-primary)] rounded-sm mx-auto"
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ArchiveCard({
  data,
  size = 'md',
  aspectRatio = 'poster',
  showDetails = true,
  className = '',
  onClick,
}: ArchiveCardProps) {
  const classes = sizeClasses[size];
  const subtitle = getArchiveCardSubtitle(data);
  const reasonText = getArchiveReasonDisplay(data.archival_reasons?.[0] || '');

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg
        bg-gradient-to-b from-[var(--bg-secondary)] via-[var(--bg-tertiary)] to-[var(--bg-secondary)]
        border border-[var(--border-primary)]
        ${aspectRatioClasses[aspectRatio]}
        ${onClick ? 'cursor-pointer hover:border-[var(--border-accent)] transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Film reel border effect */}
      <FilmReelBorder />

      {/* Content container */}
      <div className="absolute inset-3 flex flex-col items-center justify-center text-center px-2">
        {/* Archive icon */}
        <div className="mb-2 p-2 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
          <Archive className={`${classes.icon} text-[var(--text-tertiary)]`} />
        </div>

        {/* Title */}
        <Text
          as="h3"
          variant="label"
          weight="bold"
          className={`line-clamp-2 mb-1 ${classes.title}`}
        >
          {data.title || data.movie_title}
        </Text>

        {/* Year */}
        {(data.year || data.movie_year || 0) > 0 && (
          <Text
            as="span"
            variant="caption"
            color="tertiary"
            weight="medium"
            className={`mb-1 ${classes.year}`}
          >
            {data.year || data.movie_year}
          </Text>
        )}

        {/* Subtitle (actor, studio) */}
        {subtitle && (
          <Text
            variant="caption"
            color="tertiary"
            className={`line-clamp-1 mb-2 ${classes.subtitle}`}
          >
            {subtitle}
          </Text>
        )}

        {/* Verification badge - Using StatusBadge primitive */}
        {showDetails && (
          <StatusBadge
            status={data.verified_limitation ? 'success' : 'warning'}
            variant="secondary"
            size="sm"
            className={classes.badge}
          >
            {data.verified_limitation ? 'Verified' : 'Archival'}
          </StatusBadge>
        )}
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <Text
          variant="caption"
          color="tertiary"
          align="center"
          className={`line-clamp-2 ${classes.subtitle}`}
        >
          {reasonText}
        </Text>
      </div>
    </div>
  );
}

// ============================================================
// COMPACT VARIANT
// ============================================================

interface ArchiveCardCompactProps {
  data: ArchiveCardData;
  className?: string;
  onClick?: () => void;
}

export function ArchiveCardCompact({
  data,
  className = '',
  onClick,
}: ArchiveCardCompactProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg
        bg-[var(--bg-secondary)] border border-[var(--border-primary)]
        ${onClick ? 'cursor-pointer hover:border-[var(--border-accent)] transition-colors' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
        <Film className="w-5 h-5 text-[var(--text-tertiary)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Text variant="caption" weight="medium" truncate>
          {data.title || data.movie_title}
        </Text>
        <Text variant="caption" color="tertiary">
          {data.year || data.movie_year} • {data.lead_actor || 'Classic Film'}
        </Text>
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {data.verified_limitation ? (
          <CheckCircle className="w-4 h-4 text-[var(--success)]" />
        ) : (
          <Info className="w-4 h-4 text-[var(--warning)]" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// TOOLTIP VARIANT
// ============================================================

interface ArchiveCardTooltipProps {
  data: ArchiveCardData;
}

export function ArchiveCardTooltip({ data }: ArchiveCardTooltipProps) {
  const reasonText = getArchiveReasonDisplay(data.archive_reason || data.archival_reasons?.[0] || '');

  return (
    <div className="p-3 max-w-xs bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] shadow-xl">
      <div className="flex items-start gap-2 mb-2">
        <Archive className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5" />
        <div>
          <Text variant="caption" weight="medium">
            {data.title || data.movie_title}
          </Text>
          <Text variant="caption" color="tertiary">
            {data.year || data.movie_year} • {data.lead_actor || 'Classic Film'}
          </Text>
        </div>
      </div>
      
      <Text variant="caption" color="secondary" className="mb-2">
        {reasonText}
      </Text>

      <div className="flex items-center gap-1 text-[10px]">
        {data.verified_limitation ? (
          <>
            <CheckCircle className="w-3 h-3 text-[var(--success)]" />
            <Text as="span" variant="caption" color="success">
              Verified archival limitation
            </Text>
          </>
        ) : (
          <>
            <AlertCircle className="w-3 h-3 text-[var(--warning)]" />
            <Text as="span" variant="caption" color="warning">
              Pending verification
            </Text>
          </>
        )}
      </div>

      {data.metadata_source && (
        <Text variant="caption" color="tertiary" className="mt-1">
          Source: {data.metadata_source}
        </Text>
      )}
    </div>
  );
}

export default ArchiveCard;
