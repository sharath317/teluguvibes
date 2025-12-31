/**
 * SOURCES MODULE INDEX
 *
 * Exports all data fetchers and types.
 */

// Types
export * from './types';

// Base
export { BaseFetcher } from './base-fetcher';

// Fetchers
export { TMDBFetcher } from './fetchers/tmdb-fetcher';
export { WikipediaFetcher } from './fetchers/wikipedia-fetcher';

// Source registry
import { TMDBFetcher } from './fetchers/tmdb-fetcher';
import { WikipediaFetcher } from './fetchers/wikipedia-fetcher';
import type { FetcherResult, FetcherConfig } from './types';

export type SourceName = 'tmdb' | 'wikipedia' | 'wikidata' | 'youtube' | 'news';

export interface SourceRegistry {
  [key: string]: {
    fetcher: any;
    priority: number;
    enabled: boolean;
  };
}

export const SOURCE_REGISTRY: SourceRegistry = {
  tmdb: {
    fetcher: TMDBFetcher,
    priority: 1, // Highest priority (canonical)
    enabled: true,
  },
  wikipedia: {
    fetcher: WikipediaFetcher,
    priority: 2,
    enabled: true,
  },
};

/**
 * Fetch data from all enabled sources
 */
export async function fetchFromAllSources(
  config: FetcherConfig
): Promise<FetcherResult<any>[]> {
  const results: FetcherResult<any>[] = [];

  const enabledSources = Object.entries(SOURCE_REGISTRY)
    .filter(([, s]) => s.enabled)
    .sort((a, b) => a[1].priority - b[1].priority);

  for (const [name, source] of enabledSources) {
    try {
      console.log(`📡 Fetching from ${name}...`);
      const fetcher = new source.fetcher();
      const data = await fetcher.fetch(config);
      results.push(...data);
      console.log(`   ✓ Got ${data.length} results`);
    } catch (error) {
      console.warn(`   ✗ ${name} failed:`, error);
    }
  }

  return results;
}

/**
 * Fetch from a specific source
 */
export async function fetchFromSource(
  sourceName: SourceName,
  config: FetcherConfig
): Promise<FetcherResult<any>[]> {
  const source = SOURCE_REGISTRY[sourceName];

  if (!source || !source.enabled) {
    throw new Error(`Source ${sourceName} is not available`);
  }

  const fetcher = new source.fetcher();
  return fetcher.fetch(config);
}



