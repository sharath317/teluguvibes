/**
 * Compliance Types
 * Type definitions for data compliance, licensing, and attribution
 */

export type ComplianceDataSource =
  | 'tmdb'
  | 'imdb'
  | 'omdb'
  | 'wikipedia'
  | 'youtube'
  | 'instagram'
  | 'twitter'
  | 'custom'
  | 'archive'
  | 'nfai'
  | 'family'
  | 'studio';

export type LicenseType =
  | 'public-domain'
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nc'
  | 'cc-by-nc-sa'
  | 'cc-by-nd'
  | 'cc-by-nc-nd'
  | 'cc0'
  | 'fair-use'
  | 'editorial'
  | 'licensed'
  | 'permission-granted'
  | 'unknown';

export type OutreachStatus =
  | 'not-contacted'
  | 'contacted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface Attribution {
  source: ComplianceDataSource;
  name: string;
  sourceName?: string; // Alias for name
  text?: string;
  url?: string;
  sourceUrl?: string; // Alias for url
  license: LicenseType;
  requiresLink?: boolean;
  date?: string;
  notes?: string;
}

export interface ComplianceCheck {
  source: ComplianceDataSource;
  allowed: boolean;
  reason?: string;
  rateLimit?: number;
  dailyLimit?: number;
}

export interface DataSourceConfig {
  id: ComplianceDataSource | string;
  name: string;
  category?: 'media' | 'text' | 'api' | 'archive' | 'social' | 'other';
  isOfficial?: boolean;
  defaultLicense?: LicenseType;
  isActive?: boolean;
  rateLimit?: { requestsPerSecond: number };
  enabled: boolean;
  license: LicenseType;
  requiresAttribution: boolean;
  rateLimitPerMinute?: number;
  dailyLimit?: number;
  apiKey?: string;
  baseUrl?: string;
}

export const LICENSES: Record<LicenseType, { name: string; url: string; requiresAttribution: boolean; allowCommercial: boolean }> = {
  'public-domain': {
    name: 'Public Domain',
    url: 'https://creativecommons.org/publicdomain/mark/1.0/',
    requiresAttribution: false,
    allowCommercial: true,
  },
  'cc-by': {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    requiresAttribution: true,
    allowCommercial: true,
  },
  'cc-by-sa': {
    name: 'CC BY-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    requiresAttribution: true,
    allowCommercial: true,
  },
  'cc-by-nc': {
    name: 'CC BY-NC 4.0',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
    requiresAttribution: true,
    allowCommercial: false,
  },
  'cc-by-nc-sa': {
    name: 'CC BY-NC-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    requiresAttribution: true,
    allowCommercial: false,
  },
  'cc-by-nd': {
    name: 'CC BY-ND 4.0',
    url: 'https://creativecommons.org/licenses/by-nd/4.0/',
    requiresAttribution: true,
    allowCommercial: true,
  },
  'cc-by-nc-nd': {
    name: 'CC BY-NC-ND 4.0',
    url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    requiresAttribution: true,
    allowCommercial: false,
  },
  cc0: {
    name: 'CC0 1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    requiresAttribution: false,
    allowCommercial: true,
  },
  'fair-use': {
    name: 'Fair Use',
    url: 'https://www.copyright.gov/fair-use/',
    requiresAttribution: true,
    allowCommercial: false,
  },
  editorial: {
    name: 'Editorial Use',
    url: '',
    requiresAttribution: true,
    allowCommercial: false,
  },
  licensed: {
    name: 'Licensed',
    url: '',
    requiresAttribution: true,
    allowCommercial: true,
  },
  'permission-granted': {
    name: 'Permission Granted',
    url: '',
    requiresAttribution: true,
    allowCommercial: true,
  },
  unknown: {
    name: 'Unknown',
    url: '',
    requiresAttribution: true,
    allowCommercial: false,
  },
};

export const SOURCE_TYPE_LABELS: Record<ComplianceDataSource, string> = {
  tmdb: 'TMDB',
  imdb: 'IMDb',
  omdb: 'OMDb',
  wikipedia: 'Wikipedia',
  youtube: 'YouTube',
  instagram: 'Instagram',
  twitter: 'Twitter',
  custom: 'Custom',
  archive: 'Archive',
  nfai: 'NFAI',
  family: 'Family Archive',
  studio: 'Studio',
};

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  'public-domain': 'Public Domain',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc-nd': 'CC BY-NC-ND',
  cc0: 'CC0',
  'fair-use': 'Fair Use',
  editorial: 'Editorial',
  licensed: 'Licensed',
  'permission-granted': 'Permission',
  unknown: 'Unknown',
};

// Validation and Safety Types

export interface UsageValidation {
  isValid: boolean;
  canUse: boolean;
  license: LicenseType;
  requiresAttribution: boolean;
  attributionText?: string;
  restrictions?: string[];
  warnings?: string[];
  canCommercialUse?: boolean;
  canModify?: boolean;
  expiryDate?: string;
}

export interface PrivacyCheck {
  safe: boolean;
  hasPersonalData: boolean;
  consentRequired: boolean;
  consentObtained?: boolean;
  dataTypes?: string[];
  flaggedFields: { field: string; severity: 'low' | 'medium' | 'high' | 'critical'; recommendation: string }[];
  sensitivityLevel: 'low' | 'medium' | 'high';
  recommendations?: string[];
}

export interface ContentSafetyResult {
  safe: boolean;
  isSafe: boolean;
  status: 'pass' | 'review_needed' | 'blocked' | 'error';
  score: number; // 0-100, where 100 is completely safe
  categories: {
    adult: number;
    violence: number;
    hate: number;
    harassment: number;
    selfHarm: number;
    dangerous: number;
  };
  flags: { 
    type: string; 
    severity: 'info' | 'warning' | 'critical'; 
    reason: string;
    autoResolve?: boolean;
  }[];
  flaggedContent?: string[];
  recommendations?: string[];
}
