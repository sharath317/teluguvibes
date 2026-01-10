'use client';

/**
 * ARCHIVAL TYPE BADGE COMPONENT
 * 
 * Displays source-specific badges for archival images with distinct
 * visual styles based on the type of archival material.
 * 
 * Badge Variants:
 * - Green checkmark: "Verified Archival Image" (NFAI, state archives)
 * - Amber film icon: "Historical Advertisement" (newspaper/magazine ads)
 * - Blue camera icon: "Studio Publicity Still" (studio photos)
 * - Purple book icon: "Book/Magazine Scan" (with attribution)
 * 
 * REFACTORED to use design system primitives (Text)
 */

import { useState } from 'react';
import {
  CheckCircle,
  Camera,
  Newspaper,
  BookOpen,
  Film,
  Building,
  Archive,
  Users,
  Image as ImageIcon,
  FileText,
  Info,
} from 'lucide-react';
import type { VisualType, ArchivalSourceType, LicenseType } from '@/lib/visual-intelligence/types';
import { VISUAL_TYPE_LABELS, SOURCE_TYPE_LABELS, LICENSE_TYPE_LABELS } from '@/lib/visual-intelligence/types';
import { getVisualTypeBadgeColor, requiresAttribution } from '@/lib/visual-intelligence/archival-sources';

// Import design system primitives
import { Text } from '@/components/ui/primitives/Text';

// ============================================================
// TYPES
// ============================================================

interface ArchivalTypeBadgeProps {
  /** Visual type classification */
  visualType: VisualType;
  /** Source type (optional, for enhanced display) */
  sourceType?: ArchivalSourceType;
  /** Source name */
  sourceName?: string;
  /** License type */
  licenseType?: LicenseType;
  /** Attribution text */
  attributionText?: string;
  /** Badge size */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Show tooltip on hover */
  showTooltip?: boolean;
  /** Show attribution requirement indicator */
  showAttributionIndicator?: boolean;
  /** Position for absolute positioning */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Custom class name */
  className?: string;
}

// ============================================================
// ICON MAPPING
// ============================================================

const visualTypeIcons: Record<VisualType, typeof Film> = {
  // Core types
  poster: Film,
  still: Camera,
  'behind-scenes': Camera,
  promotional: ImageIcon,
  premiere: Camera,
  candid: Camera,
  archival: Archive,
  archival_still: Camera,
  archival_poster: Film,
  restored: CheckCircle,
  magazine: Newspaper,
  newspaper: Newspaper,
  portrait: Camera,
  group: Users,
  award: CheckCircle,
  event: Camera,
  lobby_card: ImageIcon,
  press_photo: Camera,
  // Extended types
  original_poster: CheckCircle,
  studio_photo: Camera,
  press_kit_photo: Camera,
  magazine_ad: Newspaper,
  newspaper_clipping: Newspaper,
  song_book_cover: BookOpen,
  cassette_cover: FileText,
  re_release_poster: Film,
  archive_card: Archive,
  placeholder: ImageIcon,
};

const sourceTypeIcons: Record<ArchivalSourceType, typeof Building> = {
  // Official archives
  nfai: Building,
  'studio-archive': Building,
  studio_archive: Building,
  government_archive: Building,
  state_cultural_dept: Building,
  university: BookOpen,
  university_archive: BookOpen,
  museum: Building,
  // Family/Personal
  'family-collection': Users,
  family_collection: Users,
  family_archive: Users,
  personal_archive: Users,
  // Publications
  'magazine-archive': Newspaper,
  magazine: Newspaper,
  'newspaper-archive': Newspaper,
  newspaper: Newspaper,
  book: BookOpen,
  // Film/Community
  'film-society': Film,
  film_society: Film,
  community: Users,
  // Private/Other
  'private-collection': Users,
  private_collection: Users,
  'public-domain': CheckCircle,
  public_domain: CheckCircle,
  'fan-contributed': Users,
};

// ============================================================
// SIZE CLASSES
// ============================================================

const sizeClasses = {
  xs: {
    badge: 'px-1 py-0.5 text-[8px] gap-0.5',
    icon: 'w-2.5 h-2.5',
  },
  sm: {
    badge: 'px-1.5 py-0.5 text-[10px] gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'px-2 py-1 text-xs gap-1.5',
    icon: 'w-4 h-4',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm gap-2',
    icon: 'w-5 h-5',
  },
};

const positionClasses = {
  'top-left': 'top-1 left-1',
  'top-right': 'top-1 right-1',
  'bottom-left': 'bottom-1 left-1',
  'bottom-right': 'bottom-1 right-1',
};

// ============================================================
// TOOLTIP COMPONENT
// ============================================================

interface TooltipProps {
  visualType: VisualType;
  sourceType?: ArchivalSourceType;
  sourceName?: string;
  licenseType?: LicenseType;
  attributionText?: string;
}

function BadgeTooltip({ visualType, sourceType, sourceName, licenseType, attributionText }: TooltipProps) {
  const colors = getVisualTypeBadgeColor(visualType);
  const Icon = visualTypeIcons[visualType];
  const needsAttribution = licenseType && requiresAttribution(licenseType);

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl p-3 min-w-[220px]">
        {/* Arrow */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--bg-secondary)] border-r border-b border-[var(--border-primary)] rotate-45" />
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${colors.icon}`} />
          <Text as="span" variant="label" className={colors.text}>
            {VISUAL_TYPE_LABELS[visualType]}
          </Text>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-[11px]">
          {sourceType && (
            <div className="flex justify-between">
              <Text as="span" variant="caption" color="tertiary">Source Type:</Text>
              <Text as="span" variant="caption" color="secondary">{SOURCE_TYPE_LABELS[sourceType]}</Text>
            </div>
          )}
          {sourceName && (
            <div className="flex justify-between">
              <Text as="span" variant="caption" color="tertiary">Source:</Text>
              <Text as="span" variant="caption" color="secondary" className="truncate max-w-[120px]">{sourceName}</Text>
            </div>
          )}
          {licenseType && (
            <div className="flex justify-between">
              <Text as="span" variant="caption" color="tertiary">License:</Text>
              <Text as="span" variant="caption" color="secondary">{LICENSE_TYPE_LABELS[licenseType]}</Text>
            </div>
          )}
        </div>

        {/* Attribution */}
        {attributionText && (
          <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
            <Text variant="caption" color="tertiary" className="italic">
              {attributionText}
            </Text>
          </div>
        )}

        {/* Attribution Required Indicator */}
        {needsAttribution && !attributionText && (
          <div className="mt-2 pt-2 border-t border-[var(--border-primary)] flex items-center gap-1 text-[var(--warning)]">
            <Info className="w-3 h-3" />
            <Text as="span" variant="caption" color="warning">Attribution required</Text>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function ArchivalTypeBadge({
  visualType,
  sourceType,
  sourceName,
  licenseType,
  attributionText,
  size = 'sm',
  showTooltip = true,
  showAttributionIndicator = true,
  position,
  className = '',
}: ArchivalTypeBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = getVisualTypeBadgeColor(visualType);
  const Icon = visualTypeIcons[visualType];
  const classes = sizeClasses[size];
  const positionClass = position ? positionClasses[position] : '';
  const isAbsolute = !!position;
  const needsAttribution = licenseType && requiresAttribution(licenseType);

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
          border ${colors.border}
          ${colors.bg}
          ${classes.badge}
        `}
        role="status"
        aria-label={`${VISUAL_TYPE_LABELS[visualType]}${sourceName ? ` from ${sourceName}` : ''}`}
      >
        <Icon className={`${classes.icon} ${colors.icon}`} />
        <Text as="span" variant="label" weight="medium" className={colors.text}>
          {colors.label}
        </Text>
        
        {/* Attribution indicator dot */}
        {showAttributionIndicator && needsAttribution && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] ml-0.5" />
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <BadgeTooltip
          visualType={visualType}
          sourceType={sourceType}
          sourceName={sourceName}
          licenseType={licenseType}
          attributionText={attributionText}
        />
      )}
    </div>
  );
}

// ============================================================
// SOURCE BADGE VARIANT
// ============================================================

interface SourceBadgeProps {
  sourceType: ArchivalSourceType;
  sourceName?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function SourceBadge({
  sourceType,
  sourceName,
  size = 'sm',
  className = '',
}: SourceBadgeProps) {
  const Icon = sourceTypeIcons[sourceType];
  const classes = sizeClasses[size];

  // Color based on source tier
  const tierColors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: 'bg-green-900/80', text: 'text-green-100', border: 'border-green-700' },
    2: { bg: 'bg-amber-900/80', text: 'text-amber-100', border: 'border-amber-700' },
    3: { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]', border: 'border-[var(--border-primary)]' },
  };

  // Determine tier from source type
  const tier = ['government_archive', 'state_cultural_dept', 'university', 'museum'].includes(sourceType) ? 1 :
               ['magazine', 'newspaper', 'book', 'community', 'family_archive', 'film_society'].includes(sourceType) ? 2 : 3;
  
  const colors = tierColors[tier];

  return (
    <div
      className={`
        inline-flex items-center rounded-full backdrop-blur-sm
        border ${colors.border} ${colors.bg} ${classes.badge}
        ${className}
      `}
    >
      <Icon className={`${classes.icon} ${colors.text}`} />
      <Text as="span" variant="label" weight="medium" className={colors.text}>
        {sourceName || SOURCE_TYPE_LABELS[sourceType]}
      </Text>
    </div>
  );
}

// ============================================================
// LICENSE BADGE VARIANT
// ============================================================

interface LicenseBadgeProps {
  licenseType: LicenseType;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function LicenseBadge({
  licenseType,
  size = 'xs',
  className = '',
}: LicenseBadgeProps) {
  const classes = sizeClasses[size];
  const needsAttribution = requiresAttribution(licenseType);

  const colors = licenseType === 'public_domain' 
    ? { bg: 'bg-green-900/60', text: 'text-green-300', border: 'border-green-800' }
    : needsAttribution
    ? { bg: 'bg-amber-900/60', text: 'text-amber-300', border: 'border-amber-800' }
    : { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]', border: 'border-[var(--border-primary)]' };

  return (
    <div
      className={`
        inline-flex items-center rounded-full
        border ${colors.border} ${colors.bg} ${classes.badge}
        ${className}
      `}
    >
      <Text as="span" variant="caption" className={colors.text}>
        {LICENSE_TYPE_LABELS[licenseType]}
      </Text>
    </div>
  );
}

// ============================================================
// COMBINED PROVENANCE DISPLAY
// ============================================================

interface ProvenanceDisplayProps {
  visualType: VisualType;
  sourceType: ArchivalSourceType;
  sourceName: string;
  licenseType: LicenseType;
  attributionText?: string;
  yearEstimated?: number;
  className?: string;
}

export function ProvenanceDisplay({
  visualType,
  sourceType,
  sourceName,
  licenseType,
  attributionText,
  yearEstimated,
  className = '',
}: ProvenanceDisplayProps) {
  const SourceIcon = sourceTypeIcons[sourceType];

  return (
    <div className={`text-xs ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <ArchivalTypeBadge
          visualType={visualType}
          sourceType={sourceType}
          sourceName={sourceName}
          licenseType={licenseType}
          attributionText={attributionText}
          size="sm"
          showTooltip={false}
        />
        <LicenseBadge licenseType={licenseType} />
      </div>
      
      <div className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
        <SourceIcon className="w-3 h-3" />
        <Text as="span" variant="caption" color="tertiary">{sourceName}</Text>
        {yearEstimated && (
          <>
            <span className="text-[var(--border-primary)]">•</span>
            <Text as="span" variant="caption" color="tertiary">{yearEstimated}</Text>
          </>
        )}
      </div>

      {attributionText && (
        <Text variant="caption" color="tertiary" className="italic mt-1">
          {attributionText}
        </Text>
      )}
    </div>
  );
}

export default ArchivalTypeBadge;
