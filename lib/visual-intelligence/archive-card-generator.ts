/**
 * Archive Card Generator
 * Utilities for generating and displaying archive cards
 */

import type { ArchiveCardData, VisualTier, ArchivalSourceType } from './types';
import { SOURCE_TYPE_LABELS, VISUAL_TIER_CONFIG } from './types';

/**
 * Get display text for archive reason
 */
export function getArchiveReasonDisplay(reason: string): string {
    const reasonMap: Record<string, string> = {
        'verified-archival': 'Verified archival images available',
        'family-permission': 'Images shared with family permission',
        'studio-archive': 'Official studio archive access',
        'public-domain': 'Public domain images available',
        'nfai-verified': 'NFAI verified collection',
        'multiple-sources': 'Multiple verified sources',
        'high-confidence': 'High confidence visual data',
        'needs-verification': 'Awaiting verification',
        'limited-sources': 'Limited source availability',
    };
    return reasonMap[reason] || reason;
}

/**
 * Get archive card subtitle
 */
export function getArchiveCardSubtitle(card: ArchiveCardData): string {
    if (card.verified_count === 0) {
        return 'No verified images yet';
    }

    const sourceText =
        card.sources.length === 1
            ? SOURCE_TYPE_LABELS[card.sources[0]]
            : `${card.sources.length} sources`;

    return `${card.verified_count} verified from ${sourceText}`;
}

/**
 * Get verification status for an archive card
 */
export function getVerificationStatus(card: ArchiveCardData): {
    status: 'verified' | 'partial' | 'unverified';
    label: string;
    color: string;
} {
    if (card.verified_count === 0) {
        return { status: 'unverified', label: 'Unverified', color: '#808080' };
    }

    if (card.verified_count === card.image_count) {
        return { status: 'verified', label: 'Fully Verified', color: '#22c55e' };
    }

    return { status: 'partial', label: 'Partially Verified', color: '#f59e0b' };
}

/**
 * Get tier badge props
 */
export function getTierBadgeProps(tier: VisualTier): {
    label: string;
    color: string;
    bgColor: string;
} {
    const config = VISUAL_TIER_CONFIG[tier];
  return {
      label: config.label,
      color: config.color,
      bgColor: `${config.color}20`,
  };
}

/**
 * Generate archive card data from movie and images
 * Accepts either the new params format or a movie-like object
 */
export function generateArchiveCardData(params: {
    // New format
    movieId?: string;
    movieTitle?: string;
    movieYear?: number;
    images?: Array<{
        is_verified: boolean;
        source_type: ArchivalSourceType;
        image_url: string;
    }>;
    // Movie-like format (for backfill scripts)
    id?: string;
    title_en?: string;
    release_year?: number;
    hero?: string;
    director?: string;
    poster_url?: string | null;
    poster_source?: string | null;
}): ArchiveCardData {
    // Support both naming conventions
    const movieId = params.movieId ?? params.id ?? '';
    const movieTitle = params.movieTitle ?? params.title_en ?? 'Unknown Title';
    const movieYear = params.movieYear ?? params.release_year;
    const images = params.images ?? [];
    const hero = params.hero;

    const verifiedCount = images.filter(img => img.is_verified).length;
    const sources = [...new Set(images.map(img => img.source_type))];

    // Calculate tier
    let tier: VisualTier = 'unverified';
    if (verifiedCount >= 10 && sources.length >= 3) {
        tier = 'gold';
    } else if (verifiedCount >= 5 && sources.length >= 2) {
        tier = 'silver';
    } else if (verifiedCount > 0) {
        tier = 'bronze';
    }

    // Generate reasons
    const reasons: string[] = [];
    if (verifiedCount > 0) reasons.push('verified-archival');
    if (sources.includes('family-collection')) reasons.push('family-permission');
    if (sources.includes('nfai')) reasons.push('nfai-verified');
    if (sources.includes('public-domain')) reasons.push('public-domain');
    if (sources.length >= 2) reasons.push('multiple-sources');
    if (verifiedCount === 0) reasons.push('needs-verification');

    return {
        id: `card-${movieId}`,
        movie_id: movieId,
        movie_title: movieTitle,
        movie_year: movieYear,
        visual_tier: tier,
        image_count: images.length,
        verified_count: verifiedCount,
        primary_image_url: images[0]?.image_url ?? params.poster_url ?? undefined,
        sources,
        archival_reasons: reasons,
        last_updated: new Date().toISOString(),
        lead_actor: hero,
    };
}

/**
 * Sort archive cards by tier and verification status
 */
export function sortArchiveCards(cards: ArchiveCardData[]): ArchiveCardData[] {
    const tierOrder: Record<VisualTier, number> = {
        // String tiers
        gold: 0,
        silver: 1,
        bronze: 2,
        unverified: 3,
        // Numeric tiers (map to same order)
        1: 0,
        2: 1,
        3: 2,
    };

    return [...cards].sort((a, b) => {
        // First by tier
        const tierDiff = tierOrder[a.visual_tier] - tierOrder[b.visual_tier];
        if (tierDiff !== 0) return tierDiff;

        // Then by verified count
        return b.verified_count - a.verified_count;
    });
}

