/**
 * Visual Intelligence Module - Main Export
 */

export * from './types';
export * from './archival-sources';
export * from './archive-card-generator';

// Re-export commonly used functions
export {
    calculateVisualTier,
    getVisualTypeBadgeColor,
    requiresAttribution,
    generateAttributionText,
} from './archival-sources';

export {
  getArchiveReasonDisplay,
  getArchiveCardSubtitle,
  getVerificationStatus,
    generateArchiveCardData,
} from './archive-card-generator';

