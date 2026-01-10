/**
 * Safe Fetcher
 * Compliance-aware data fetching with rate limiting and attribution
 */

import type { ComplianceDataSource, DataSourceConfig, LicenseType } from './types';

export const SOURCE_CONFIGS: Record<ComplianceDataSource, DataSourceConfig> = {
  tmdb: {
    id: 'tmdb',
    name: 'The Movie Database',
    enabled: true,
    license: 'cc-by-nc',
    requiresAttribution: true,
    rateLimitPerMinute: 40,
    dailyLimit: 10000,
    baseUrl: 'https://api.themoviedb.org/3',
  },
  imdb: {
    id: 'imdb',
    name: 'IMDb',
    enabled: true,
    license: 'fair-use',
    requiresAttribution: true,
    rateLimitPerMinute: 10,
  },
  omdb: {
    id: 'omdb',
    name: 'Open Movie Database',
    enabled: true,
    license: 'cc-by-nc',
    requiresAttribution: true,
    rateLimitPerMinute: 100,
    dailyLimit: 1000,
    baseUrl: 'https://www.omdbapi.com',
  },
  wikipedia: {
    id: 'wikipedia',
    name: 'Wikipedia',
    enabled: true,
    license: 'cc-by-sa',
    requiresAttribution: true,
    rateLimitPerMinute: 200,
    baseUrl: 'https://en.wikipedia.org/api/rest_v1',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    enabled: true,
    license: 'fair-use',
    requiresAttribution: true,
    rateLimitPerMinute: 100,
    dailyLimit: 10000,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    enabled: false,
    license: 'fair-use',
    requiresAttribution: true,
    rateLimitPerMinute: 30,
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    enabled: false,
    license: 'fair-use',
    requiresAttribution: true,
    rateLimitPerMinute: 60,
  },
  custom: {
    id: 'custom',
    name: 'Custom Source',
    enabled: true,
    license: 'unknown',
    requiresAttribution: true,
  },
  archive: {
    id: 'archive',
    name: 'Internet Archive',
    enabled: true,
    license: 'public-domain',
    requiresAttribution: false,
    baseUrl: 'https://archive.org',
  },
  nfai: {
    id: 'nfai',
    name: 'National Film Archive of India',
    enabled: true,
    license: 'permission-granted',
    requiresAttribution: true,
  },
  family: {
    id: 'family',
    name: 'Family Archive',
    enabled: true,
    license: 'permission-granted',
    requiresAttribution: true,
  },
  studio: {
    id: 'studio',
    name: 'Studio Archive',
    enabled: true,
    license: 'licensed',
    requiresAttribution: true,
  },
};

interface FetchRecord {
  source: ComplianceDataSource;
  timestamp: number;
  url: string;
  success: boolean;
}

const fetchLog: FetchRecord[] = [];
const rateLimitCounters: Map<string, number[]> = new Map();

/**
 * Check if we can fetch from a source
 */
export function canFetch(source: ComplianceDataSource): boolean {
  const config = SOURCE_CONFIGS[source];
  if (!config || !config.enabled) {
    return false;
  }

  if (config.rateLimitPerMinute) {
    const now = Date.now();
    const minute = 60 * 1000;
    const recentFetches = rateLimitCounters.get(source) || [];
    const fetchesInLastMinute = recentFetches.filter(t => now - t < minute);

    if (fetchesInLastMinute.length >= config.rateLimitPerMinute) {
      return false;
    }
  }

  return true;
}

/**
 * Safe fetch with compliance checking
 */
export async function safeFetch<T>(
  source: ComplianceDataSource,
  url: string,
  options?: RequestInit
): Promise<T | null> {
  if (!canFetch(source)) {
    console.warn(`Rate limit exceeded for source: ${source}`);
    return null;
  }

  const now = Date.now();
  const recentFetches = rateLimitCounters.get(source) || [];
  rateLimitCounters.set(source, [...recentFetches, now].slice(-100));

  try {
    const response = await fetch(url, options);
    const success = response.ok;

    fetchLog.push({ source, timestamp: now, url, success });

    if (!success) {
      console.error(`Fetch failed for ${source}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    fetchLog.push({ source, timestamp: now, url, success: false });
    console.error(`Fetch error for ${source}:`, error);
    return null;
  }
}

/**
 * Get audit log
 */
export function getAuditLog(limit = 100): FetchRecord[] {
  return fetchLog.slice(-limit);
}

/**
 * Get audit stats
 */
export function getAuditStats(): Record<ComplianceDataSource, { total: number; success: number }> {
  const stats: Record<string, { total: number; success: number }> = {};

  for (const record of fetchLog) {
    if (!stats[record.source]) {
      stats[record.source] = { total: 0, success: 0 };
    }
    stats[record.source].total++;
    if (record.success) {
      stats[record.source].success++;
    }
  }

  return stats as Record<ComplianceDataSource, { total: number; success: number }>;
}

/**
 * Generate attribution text for a source
 */
export function generateAttribution(source: ComplianceDataSource, additionalInfo?: string): string {
  const config = SOURCE_CONFIGS[source];
  if (!config) return '';

  let attribution = `Data from ${config.name}`;
  if (additionalInfo) {
    attribution += ` - ${additionalInfo}`;
  }

  return attribution;
}
