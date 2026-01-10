/**
 * Content Types
 * Type definitions for content profiling, ratings, and warnings
 */

// ============================================================
// TYPES
// ============================================================

export type AudienceRating = 'U' | 'UA' | 'A' | 'U/A' | 'S';

export type ContentCategory = 
  | 'family'
  | 'general'
  | 'mature'
  | 'adult'
  | 'restricted'
  | 'feature'
  | 'documentary'
  | 'animation'
  | 'short'
  | 'concert'
  | 'tv_movie';

export type SensitivityLevel = 'none' | 'mild' | 'moderate' | 'high' | 'extreme' | 'explicit' | 'intense';

export interface SensitivityFlags {
  violence: SensitivityLevel;
  language: SensitivityLevel;
  sexual: SensitivityLevel;
  drugs: SensitivityLevel;
  horror: SensitivityLevel;
  themes: SensitivityLevel;
}

/**
 * Extended sensitivity flags with metadata
 * Used in genre mapping and classification rules
 */
export interface SensitivityFlagsWithMeta extends Partial<SensitivityFlags> {
  isAdult?: boolean;
}

export interface ContentProfile {
  /** Unique identifier */
  id?: string;
  /** Whether content is suitable for all family members */
  isFamilySafe: boolean;
  /** Whether content requires a warning before display */
  requiresWarning: boolean;
  /** Whether content is adult-only (18+) */
  isAdult: boolean;
  /** CBFC-style audience rating */
  audienceRating: AudienceRating;
  /** List of content warnings */
  warnings: ContentWarning[];
  /** Minimum age for viewing */
  minimumAge: number;
  /** Content category for filtering */
  category?: ContentCategory;
  /** Sensitivity flags for different content types */
  sensitivity: SensitivityFlags;
  /** When the content was classified */
  classifiedAt?: string;
  /** Who/what classified the content */
  classifiedBy?: 'auto' | 'manual' | 'moderator' | string;
  /** Confidence score for automated classification (0-1) */
  confidence?: number;
}

export type ContentWarning =
  | 'violence'
  | 'mild_violence'
  | 'strong_violence'
  | 'violence_graphic'
  | 'violence_domestic'
  | 'violence_sexual'
  | 'language'
  | 'mild_language'
  | 'strong_language'
  | 'nudity'
  | 'partial_nudity'
  | 'sexual_content'
  | 'sexual_references'
  | 'drug_use'
  | 'smoking'
  | 'alcohol'
  | 'alcohol_abuse'
  | 'gambling'
  | 'scary_scenes'
  | 'jump_scares'
  | 'blood'
  | 'gore'
  | 'death'
  | 'death_murder'
  | 'death_suicide'
  | 'suicide'
  | 'self_harm'
  | 'discrimination'
  | 'political'
  | 'religious'
  | 'controversial'
  | 'mature_themes'
  | 'adult_themes';

// ============================================================
// RATING UTILITIES
// ============================================================

/**
 * Get human-readable label for an audience rating
 */
export function getAudienceRatingLabel(rating: AudienceRating): string {
  switch (rating) {
    case 'U':
      return 'Universal';
    case 'UA':
    case 'U/A':
      return 'Parental Guidance';
    case 'A':
      return 'Adults Only';
    default:
      return 'Not Rated';
  }
}

/**
 * Get color class for an audience rating
 */
export function getAudienceRatingColor(rating: AudienceRating): string {
  switch (rating) {
    case 'U':
      return 'text-green-500';
    case 'UA':
    case 'U/A':
      return 'text-yellow-500';
    case 'A':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get background color class for an audience rating
 */
export function getAudienceRatingBgColor(rating: AudienceRating): string {
  switch (rating) {
    case 'U':
      return 'bg-green-500';
    case 'UA':
    case 'U/A':
      return 'bg-yellow-500';
    case 'A':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get minimum age for an audience rating
 */
export function getMinimumAge(rating: AudienceRating): number {
  switch (rating) {
    case 'U':
      return 0;
    case 'UA':
    case 'U/A':
      return 12;
    case 'A':
      return 18;
    default:
      return 0;
  }
}

/**
 * Create a default content profile
 */
export function createDefaultContentProfile(rating: AudienceRating = 'U'): ContentProfile {
  return {
    isFamilySafe: rating === 'U',
    requiresWarning: rating === 'A',
    isAdult: rating === 'A',
    audienceRating: rating,
    warnings: [],
    minimumAge: getMinimumAge(rating),
    sensitivity: {
      violence: 'none',
      language: 'none',
      sexual: 'none',
      drugs: 'none',
      horror: 'none',
      themes: 'none',
    },
  };
}

/**
 * Check if content needs age verification
 */
export function needsAgeVerification(profile: ContentProfile): boolean {
  return profile.isAdult || profile.audienceRating === 'A';
}

// ============================================================
// WARNING UTILITIES
// ============================================================

/**
 * Get human-readable label for a content warning
 */
export function getWarningLabel(warning: ContentWarning): string {
  const labels: Record<ContentWarning, string> = {
    violence: 'Violence',
    mild_violence: 'Mild Violence',
    strong_violence: 'Strong Violence',
    violence_graphic: 'Graphic Violence',
    violence_domestic: 'Domestic Violence',
    violence_sexual: 'Sexual Violence',
    language: 'Strong Language',
    mild_language: 'Mild Language',
    strong_language: 'Strong Language',
    nudity: 'Nudity',
    partial_nudity: 'Partial Nudity',
    sexual_content: 'Sexual Content',
    sexual_references: 'Sexual References',
    drug_use: 'Drug Use',
    smoking: 'Smoking',
    alcohol: 'Alcohol Use',
    alcohol_abuse: 'Alcohol Abuse',
    gambling: 'Gambling',
    scary_scenes: 'Scary Scenes',
    jump_scares: 'Jump Scares',
    blood: 'Blood',
    gore: 'Gore',
    death: 'Death',
    death_murder: 'Murder',
    death_suicide: 'Suicide Depiction',
    suicide: 'Suicide',
    self_harm: 'Self Harm',
    discrimination: 'Discrimination',
    political: 'Political Content',
    religious: 'Religious Content',
    controversial: 'Controversial Topics',
    mature_themes: 'Mature Themes',
    adult_themes: 'Adult Themes',
  };

  return labels[warning] || warning.replace(/_/g, ' ');
}

// ============================================================
// PROFILE UTILITIES
// ============================================================

/**
 * Check if a content profile is safe for family viewing
 */
export function isFamilySafeProfile(profile: ContentProfile | null | undefined): boolean {
  if (!profile) return true; // Assume safe if no profile
  return profile.isFamilySafe && profile.audienceRating === 'U';
}

/**
 * Get a warning message based on content profile
 */
export function getWarningMessage(profile: ContentProfile): string {
  if (profile.isAdult) {
    return 'This content is rated for adults only (18+). It may contain mature themes.';
  }
  
  if (profile.warnings.length > 0) {
    const warningLabels = profile.warnings.map(getWarningLabel);
    return `This content contains: ${warningLabels.join(', ')}.`;
  }
  
  if (profile.audienceRating === 'UA' || profile.audienceRating === 'U/A') {
    return 'This content may not be suitable for all ages. Parental guidance is advised.';
  }
  
  return '';
}

// ============================================================
// DEFAULT PROFILES
// ============================================================

/**
 * Default sensitivity flags (all none)
 */
export const DEFAULT_SENSITIVITY_FLAGS: SensitivityFlags = {
  violence: 'none',
  language: 'none',
  sexual: 'none',
  drugs: 'none',
  horror: 'none',
  themes: 'none',
};

/**
 * Default family-safe content profile
 */
export const DEFAULT_FAMILY_SAFE_PROFILE: ContentProfile = {
  isFamilySafe: true,
  requiresWarning: false,
  isAdult: false,
  audienceRating: 'U',
  warnings: [],
  minimumAge: 0,
  category: 'family',
  sensitivity: { ...DEFAULT_SENSITIVITY_FLAGS },
};
