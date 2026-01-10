'use client';

/**
 * VISUAL CONFIDENCE BADGE COMPONENT
 * 
 * Displays visual provenance indicator for movie posters.
 * 
 * Three variants based on tier:
 * - Tier 1 (Green): Original poster from verified source
 * - Tier 2 (Amber): Archival visual (still, magazine ad, etc.)
 * - Tier 3 (Gray): Archive card or placeholder
 * 
 * Features:
 * - Compact badge display
 * - Tooltip with detailed information
 * - Accessible labeling
 * 
 * REFACTORED to use design system primitives (Text)
 */

import { useState } from 'react';
import {
  CheckCircle,
  Film,
  Archive,
  Verified,
} from 'lucide-react';
import type { VisualTier, VisualType } from '@/lib/visual-intelligence/types';
import { VISUAL_TYPE_LABELS } from '@/lib/visual-intelligence/types';

// Import design system primitives
import { Text } from '@/components/ui/primitives/Text';

// ============================================================
// TYPES
// ============================================================

interface VisualConfidenceBadgeProps {
  /** Visual confidence tier (1, 2, or 3) */
  tier: VisualTier;
  /** Visual type classification */
  visualType?: VisualType;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Source of the visual */
  source?: string;
  /** Badge size */
  size?: 'xs' | 'sm' | 'md';
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Position of the badge */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Custom class name */
  className?: string;
}

// ============================================================
// TIER CONFIGURATION
// ============================================================

interface TierConfig {
  icon: typeof CheckCircle;
  label: string;
  shortLabel: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
}

const tierConfigs: Record<VisualTier, TierConfig> = {
  // Numeric tiers (legacy)
  1: {
    icon: Verified,
    label: 'Original Poster',
    shortLabel: 'Verified',
    description: 'Official movie poster from verified source',
    bgColor: 'bg-green-900/80',
    textColor: 'text-green-100',
    borderColor: 'border-green-700',
    iconColor: 'text-green-400',
  },
  2: {
    icon: Film,
    label: 'Archival Visual',
    shortLabel: 'Archival',
    description: 'Historical archival material (film still, magazine ad, etc.)',
    bgColor: 'bg-amber-900/80',
    textColor: 'text-amber-100',
    borderColor: 'border-amber-700',
    iconColor: 'text-amber-400',
  },
  3: {
    icon: Archive,
    label: 'Archive Card',
    shortLabel: 'Archive',
    description: 'Reference card - original poster unavailable',
    bgColor: 'bg-[var(--bg-tertiary)]',
    textColor: 'text-[var(--text-secondary)]',
    borderColor: 'border-[var(--border-primary)]',
    iconColor: 'text-[var(--text-tertiary)]',
  },
  // String tiers (new format)
  gold: {
    icon: Verified,
    label: 'Original Poster',
    shortLabel: 'Verified',
    description: 'Official movie poster from verified source',
    bgColor: 'bg-green-900/80',
    textColor: 'text-green-100',
    borderColor: 'border-green-700',
    iconColor: 'text-green-400',
  },
  silver: {
    icon: Film,
    label: 'Archival Visual',
    shortLabel: 'Archival',
    description: 'Historical archival material (film still, magazine ad, etc.)',
    bgColor: 'bg-amber-900/80',
    textColor: 'text-amber-100',
    borderColor: 'border-amber-700',
    iconColor: 'text-amber-400',
  },
  bronze: {
    icon: Archive,
    label: 'Archive Card',
    shortLabel: 'Archive',
    description: 'Reference card - original poster unavailable',
    bgColor: 'bg-[var(--bg-tertiary)]',
    textColor: 'text-[var(--text-secondary)]',
    borderColor: 'border-[var(--border-primary)]',
    iconColor: 'text-[var(--text-tertiary)]',
  },
  unverified: {
    icon: Archive,
    label: 'Unverified',
    shortLabel: 'Unverified',
    description: 'Visual source not yet verified',
    bgColor: 'bg-gray-900/80',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-700',
    iconColor: 'text-gray-400',
  },
};

// ============================================================
// SIZE CLASSES
// ============================================================

const sizeClasses = {
  xs: {
    badge: 'px-1 py-0.5 text-[8px] gap-0.5',
    icon: 'w-2 h-2',
    iconOnly: 'p-0.5',
  },
  sm: {
    badge: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'w-3 h-3',
    iconOnly: 'p-1',
  },
  md: {
    badge: 'px-2 py-1 text-xs gap-1.5',
    icon: 'w-4 h-4',
    iconOnly: 'p-1.5',
  },
};

const positionClasses = {
  'top-left': 'top-1 left-1',
  'top-right': 'top-1 right-1',
  'bottom-left': 'bottom-1 left-1',
  'bottom-right': 'bottom-1 right-1',
};

// Use VISUAL_TYPE_LABELS from types module
const visualTypeLabels = VISUAL_TYPE_LABELS;

// ============================================================
// TOOLTIP COMPONENT
// ============================================================

interface TooltipProps {
  tier: VisualTier;
  visualType?: VisualType;
  confidence?: number;
  source?: string;
}

function BadgeTooltip({ tier, visualType, confidence, source }: TooltipProps) {
  const config = tierConfigs[tier];
  const Icon = config.icon;

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl p-3 min-w-[200px]">
        {/* Arrow */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--bg-secondary)] border-r border-b border-[var(--border-primary)] rotate-45" />
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
          <Text as="span" variant="label" className={config.textColor}>
            {config.label}
          </Text>
        </div>

        {/* Description */}
        <Text variant="caption" color="tertiary" className="mb-2">
          {config.description}
        </Text>

        {/* Details */}
        <div className="space-y-1 text-[10px]">
          {visualType && (
            <div className="flex justify-between">
              <Text as="span" variant="caption" color="tertiary">Type:</Text>
              <Text as="span" variant="caption" color="secondary">{visualTypeLabels[visualType]}</Text>
            </div>
          )}
          {confidence !== undefined && (
            <div className="flex justify-between">
              <Text as="span" variant="caption" color="tertiary">Confidence:</Text>
              <Text as="span" variant="caption" color="secondary">{Math.round(confidence * 100)}%</Text>
            </div>
          )}
          {source && (
            <div className="flex justify-between">
              <Text as="span" variant="caption" color="tertiary">Source:</Text>
              <Text as="span" variant="caption" color="secondary" className="capitalize">{source}</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function VisualConfidenceBadge({
  tier,
  visualType,
  confidence,
  source,
  size = 'sm',
  showTooltip = true,
  position,
  className = '',
}: VisualConfidenceBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = tierConfigs[tier];
  const Icon = config.icon;
  const classes = sizeClasses[size];

  const positionClass = position ? positionClasses[position] : '';
  const isAbsolute = !!position;

  return (
    <div
      className={`
        ${isAbsolute ? 'absolute' : 'inline-flex'}
        ${positionClass}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          relative inline-flex items-center
          rounded-full backdrop-blur-sm
          border ${config.borderColor}
          ${config.bgColor}
          ${classes.badge}
        `}
        role="status"
        aria-label={`${config.label}: ${config.description}`}
      >
        <Icon className={`${classes.icon} ${config.iconColor}`} />
        <Text as="span" variant="label" weight="medium" className={config.textColor}>
          {config.shortLabel}
        </Text>
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <BadgeTooltip
          tier={tier}
          visualType={visualType}
          confidence={confidence}
          source={source}
        />
      )}
    </div>
  );
}

// ============================================================
// ICON-ONLY VARIANT
// ============================================================

interface VisualConfidenceIconProps {
  tier: VisualTier;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function VisualConfidenceIcon({
  tier,
  size = 'sm',
  className = '',
}: VisualConfidenceIconProps) {
  const config = tierConfigs[tier];
  const Icon = config.icon;
  const classes = sizeClasses[size];

  return (
    <div
      className={`
        inline-flex items-center justify-center
        rounded-full ${config.bgColor} ${config.borderColor}
        border ${classes.iconOnly}
        ${className}
      `}
      role="status"
      aria-label={config.label}
    >
      <Icon className={`${classes.icon} ${config.iconColor}`} />
    </div>
  );
}

// ============================================================
// INLINE VARIANT
// ============================================================

interface VisualConfidenceInlineProps {
  tier: VisualTier;
  visualType?: VisualType;
  showType?: boolean;
  className?: string;
}

export function VisualConfidenceInline({
  tier,
  visualType,
  showType = false,
  className = '',
}: VisualConfidenceInlineProps) {
  const config = tierConfigs[tier];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 text-xs
        ${config.textColor}
        ${className}
      `}
    >
      <Icon className={`w-3 h-3 ${config.iconColor}`} />
      <Text as="span" variant="caption">
        {showType && visualType ? visualTypeLabels[visualType] : config.shortLabel}
      </Text>
    </span>
  );
}

// ============================================================
// UTILITY FUNCTION
// ============================================================

/**
 * Get tier from confidence score
 */
export function getTierFromConfidence(confidence: number): VisualTier {
  if (confidence >= 0.9) return 1;
  if (confidence >= 0.6) return 2;
  return 3;
}

export default VisualConfidenceBadge;
