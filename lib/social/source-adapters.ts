/**
 * Social Handle Source Adapters
 * 
 * METADATA ONLY - NO SCRAPING
 * 
 * Fetches official social handles from trusted sources:
 * - Wikidata: P2003 (Instagram), P2002 (Twitter), P2397 (YouTube)
 * - Wikipedia: External links from infobox
 * - TMDB: external_ids API
 * 
 * Legal: All APIs are public and authorized for this use
 */

import { BaseFetcher } from '../sources/base-fetcher';

// Types
export interface SocialHandle {
  platform: 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'tiktok' | 'snapchat' | 'wikipedia' | 'imdb' | 'official_website';
  handle: string;
  profile_url: string;
  source: 'wikidata' | 'wikipedia' | 'tmdb' | 'official_site' | 'manual';
  confidence_score: number;
  metadata?: Record<string, any>;
}

export interface SocialFetchResult {
  celebrity_name: string;
  wikidata_id?: string;
  tmdb_id?: number;
  handles: SocialHandle[];
  sources_checked: string[];
  errors: string[];
}

// Wikidata property IDs for social handles
const WIKIDATA_SOCIAL_PROPS = {
  instagram: 'P2003',
  twitter: 'P2002',
  youtube: 'P2397',
  facebook: 'P2013',
  tiktok: 'P7085',
  snapchat: 'P11012',  // Added Snapchat
  imdb: 'P345',
  official_website: 'P856',
};

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const TMDB_API_BASE = 'https://api.themoviedb.org/3';

/**
 * Wikidata Social Handle Adapter
 * 
 * Fetches official social media usernames from Wikidata properties
 */
export class WikidataSocialAdapter {
  private requestCount = 0;
  private windowStart = Date.now();
  private rateLimit = { requests: 30, windowMs: 60000 }; // 30 per minute

  /**
   * Fetch social handles for a person by Wikidata ID
   */
  async fetchByWikidataId(wikidataId: string): Promise<SocialHandle[]> {
    await this.respectRateLimit();
    
    const query = `
SELECT ?property ?propertyLabel ?value WHERE {
  VALUES ?property {
    wdt:${WIKIDATA_SOCIAL_PROPS.instagram}
    wdt:${WIKIDATA_SOCIAL_PROPS.twitter}
    wdt:${WIKIDATA_SOCIAL_PROPS.youtube}
    wdt:${WIKIDATA_SOCIAL_PROPS.facebook}
    wdt:${WIKIDATA_SOCIAL_PROPS.tiktok}
    wdt:${WIKIDATA_SOCIAL_PROPS.snapchat}
    wdt:${WIKIDATA_SOCIAL_PROPS.imdb}
    wdt:${WIKIDATA_SOCIAL_PROPS.official_website}
  }
  wd:${wikidataId} ?property ?value.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

    try {
      const response = await fetch(WIKIDATA_SPARQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/sparql-results+json',
          'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com)',
        },
        body: `query=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`SPARQL error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseWikidataResults(data.results?.bindings || []);
    } catch (error) {
      console.error(`Wikidata fetch error for ${wikidataId}:`, error);
      return [];
    }
  }

  /**
   * Fetch social handles for Telugu celebrities
   */
  async fetchTeluguCelebritySocialHandles(limit = 500): Promise<Map<string, SocialHandle[]>> {
    await this.respectRateLimit();
    
    const query = `
SELECT DISTINCT
  ?person
  ?personLabel
  ?instagram
  ?twitter
  ?youtube
  ?facebook
  ?tiktok
  ?snapchat
  ?imdb
  ?website
WHERE {
  # Find Telugu cinema actors/actresses
  ?person wdt:P106 ?occupation.
  VALUES ?occupation { wd:Q33999 wd:Q10800557 wd:Q2526255 wd:Q28389 }
  
  # Filter by Telugu cinema connection
  {
    ?person wdt:P27 wd:Q668.  # Indian citizen
    ?person wdt:P19 ?birthPlace.
    ?birthPlace wdt:P131* ?region.
    VALUES ?region { wd:Q1159 wd:Q677037 }  # AP or Telangana
  } UNION {
    ?person wdt:P937 wd:Q1352.  # Works in Hyderabad
  }
  
  # Fetch social handles
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.instagram} ?instagram. }
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.twitter} ?twitter. }
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.youtube} ?youtube. }
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.facebook} ?facebook. }
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.tiktok} ?tiktok. }
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.snapchat} ?snapchat. }
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.imdb} ?imdb. }
  OPTIONAL { ?person wdt:${WIKIDATA_SOCIAL_PROPS.official_website} ?website. }
  
  # At least one social handle must exist
  FILTER(BOUND(?instagram) || BOUND(?twitter) || BOUND(?youtube) || BOUND(?facebook) || BOUND(?tiktok))
  
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${limit}`;

    try {
      const response = await fetch(WIKIDATA_SPARQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/sparql-results+json',
          'User-Agent': 'TeluguVibes/1.0 (https://teluguvibes.com)',
        },
        body: `query=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`SPARQL error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseBulkWikidataResults(data.results?.bindings || []);
    } catch (error) {
      console.error('Wikidata bulk fetch error:', error);
      return new Map();
    }
  }

  private parseWikidataResults(bindings: any[]): SocialHandle[] {
    const handles: SocialHandle[] = [];

    for (const binding of bindings) {
      const propertyUri = binding.property?.value || '';
      const value = binding.value?.value || '';

      if (!value) continue;

      // Determine platform from property
      const platform = this.getPlatformFromProperty(propertyUri);
      if (!platform) continue;

      handles.push({
        platform,
        handle: this.cleanHandle(value, platform),
        profile_url: this.getProfileUrl(value, platform),
        source: 'wikidata',
        confidence_score: 0.8, // Wikidata is highly reliable
        metadata: { wikidata_property: propertyUri },
      });
    }

    return handles;
  }

  private parseBulkWikidataResults(bindings: any[]): Map<string, SocialHandle[]> {
    const result = new Map<string, SocialHandle[]>();

    for (const binding of bindings) {
      const personUri = binding.person?.value || '';
      const personName = binding.personLabel?.value || '';
      const wikidataId = personUri.match(/Q\d+$/)?.[0] || '';

      if (!wikidataId) continue;

      const handles: SocialHandle[] = [];

      // Instagram
      if (binding.instagram?.value) {
        handles.push({
          platform: 'instagram',
          handle: this.cleanHandle(binding.instagram.value, 'instagram'),
          profile_url: `https://www.instagram.com/${this.cleanHandle(binding.instagram.value, 'instagram')}/`,
          source: 'wikidata',
          confidence_score: 0.8,
        });
      }

      // Twitter
      if (binding.twitter?.value) {
        handles.push({
          platform: 'twitter',
          handle: this.cleanHandle(binding.twitter.value, 'twitter'),
          profile_url: `https://twitter.com/${this.cleanHandle(binding.twitter.value, 'twitter')}`,
          source: 'wikidata',
          confidence_score: 0.8,
        });
      }

      // YouTube
      if (binding.youtube?.value) {
        handles.push({
          platform: 'youtube',
          handle: binding.youtube.value,
          profile_url: `https://www.youtube.com/channel/${binding.youtube.value}`,
          source: 'wikidata',
          confidence_score: 0.8,
        });
      }

      // Facebook
      if (binding.facebook?.value) {
        handles.push({
          platform: 'facebook',
          handle: binding.facebook.value,
          profile_url: `https://www.facebook.com/${binding.facebook.value}`,
          source: 'wikidata',
          confidence_score: 0.8,
        });
      }

      // TikTok
      if (binding.tiktok?.value) {
        handles.push({
          platform: 'tiktok',
          handle: this.cleanHandle(binding.tiktok.value, 'tiktok'),
          profile_url: `https://www.tiktok.com/@${this.cleanHandle(binding.tiktok.value, 'tiktok')}`,
          source: 'wikidata',
          confidence_score: 0.8,
        });
      }

      // Snapchat (metadata only - no embed support)
      if (binding.snapchat?.value) {
        handles.push({
          platform: 'snapchat',
          handle: binding.snapchat.value,
          profile_url: `https://www.snapchat.com/add/${binding.snapchat.value}`,
          source: 'wikidata',
          confidence_score: 0.8,
          metadata: { embed_supported: false },
        });
      }

      // IMDB
      if (binding.imdb?.value) {
        handles.push({
          platform: 'imdb',
          handle: binding.imdb.value,
          profile_url: `https://www.imdb.com/name/${binding.imdb.value}/`,
          source: 'wikidata',
          confidence_score: 0.9,
        });
      }

      // Official website
      if (binding.website?.value) {
        handles.push({
          platform: 'official_website',
          handle: new URL(binding.website.value).hostname,
          profile_url: binding.website.value,
          source: 'wikidata',
          confidence_score: 0.9,
        });
      }

      if (handles.length > 0) {
        result.set(wikidataId, handles);
      }
    }

    return result;
  }

  private getPlatformFromProperty(propertyUri: string): SocialHandle['platform'] | null {
    const mapping: Record<string, SocialHandle['platform']> = {
      [WIKIDATA_SOCIAL_PROPS.instagram]: 'instagram',
      [WIKIDATA_SOCIAL_PROPS.twitter]: 'twitter',
      [WIKIDATA_SOCIAL_PROPS.youtube]: 'youtube',
      [WIKIDATA_SOCIAL_PROPS.facebook]: 'facebook',
      [WIKIDATA_SOCIAL_PROPS.tiktok]: 'tiktok',
      [WIKIDATA_SOCIAL_PROPS.snapchat]: 'snapchat',
      [WIKIDATA_SOCIAL_PROPS.imdb]: 'imdb',
      [WIKIDATA_SOCIAL_PROPS.official_website]: 'official_website',
    };

    for (const [prop, platform] of Object.entries(mapping)) {
      if (propertyUri.includes(prop)) return platform;
    }
    return null;
  }

  private cleanHandle(value: string, platform: string): string {
    // Remove @ prefix
    let handle = value.replace(/^@/, '');
    
    // Handle URLs - extract username
    if (handle.startsWith('http')) {
      try {
        const url = new URL(handle);
        const pathParts = url.pathname.split('/').filter(Boolean);
        handle = pathParts[pathParts.length - 1] || handle;
      } catch {
        // Keep as is
      }
    }
    
    return handle.trim();
  }

  private getProfileUrl(value: string, platform: string): string {
    const handle = this.cleanHandle(value, platform);
    
    switch (platform) {
      case 'instagram':
        return `https://www.instagram.com/${handle}/`;
      case 'twitter':
        return `https://twitter.com/${handle}`;
      case 'youtube':
        return value.startsWith('http') ? value : `https://www.youtube.com/channel/${handle}`;
      case 'facebook':
        return `https://www.facebook.com/${handle}`;
      case 'tiktok':
        return `https://www.tiktok.com/@${handle}`;
      case 'snapchat':
        return `https://www.snapchat.com/add/${handle}`;
      case 'imdb':
        return `https://www.imdb.com/name/${handle}/`;
      case 'official_website':
        return value.startsWith('http') ? value : `https://${value}`;
      default:
        return value;
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.windowStart > this.rateLimit.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    if (this.requestCount >= this.rateLimit.requests) {
      const waitTime = this.rateLimit.windowMs - (now - this.windowStart);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }
    this.requestCount++;
  }
}

/**
 * Wikipedia Social Handle Adapter
 * 
 * Parses external links from Wikipedia infoboxes
 * Uses REST API - NO HTML scraping
 */
export class WikipediaSocialAdapter {
  private rateLimit = { requests: 100, windowMs: 60000 };
  private requestCount = 0;
  private windowStart = Date.now();

  /**
   * Fetch social handles from Wikipedia page
   */
  async fetchByName(celebrityName: string): Promise<SocialHandle[]> {
    await this.respectRateLimit();
    
    const handles: SocialHandle[] = [];
    const encodedName = encodeURIComponent(celebrityName.replace(/ /g, '_'));

    try {
      // Fetch external links from Wikipedia API
      const url = `https://en.wikipedia.org/w/api.php?` +
        `action=query&titles=${encodedName}&prop=extlinks&ellimit=50&format=json&origin=*`;

      const response = await fetch(url);
      if (!response.ok) return handles;

      const data = await response.json();
      const pages = data.query?.pages || {};
      const page = Object.values(pages)[0] as any;

      if (!page?.extlinks) return handles;

      // Parse external links for social media
      for (const link of page.extlinks) {
        const url = link['*'] || '';
        const socialHandle = this.parseSocialUrl(url);
        if (socialHandle) {
          handles.push({
            ...socialHandle,
            source: 'wikipedia',
            confidence_score: 0.6, // Lower than Wikidata
          });
        }
      }
    } catch (error) {
      console.error(`Wikipedia fetch error for ${celebrityName}:`, error);
    }

    return handles;
  }

  private parseSocialUrl(url: string): Omit<SocialHandle, 'source' | 'confidence_score'> | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // Instagram
      if (hostname.includes('instagram.com')) {
        const handle = pathParts[0];
        if (handle && !['p', 'reel', 'explore', 'stories'].includes(handle)) {
          return {
            platform: 'instagram',
            handle,
            profile_url: `https://www.instagram.com/${handle}/`,
          };
        }
      }

      // Twitter/X
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        const handle = pathParts[0];
        if (handle && !['i', 'intent', 'share', 'hashtag'].includes(handle)) {
          return {
            platform: 'twitter',
            handle,
            profile_url: `https://twitter.com/${handle}`,
          };
        }
      }

      // YouTube
      if (hostname.includes('youtube.com')) {
        if (pathParts[0] === 'channel' && pathParts[1]) {
          return {
            platform: 'youtube',
            handle: pathParts[1],
            profile_url: `https://www.youtube.com/channel/${pathParts[1]}`,
          };
        }
        if (pathParts[0] === 'user' && pathParts[1]) {
          return {
            platform: 'youtube',
            handle: pathParts[1],
            profile_url: `https://www.youtube.com/user/${pathParts[1]}`,
          };
        }
        if (pathParts[0]?.startsWith('@')) {
          return {
            platform: 'youtube',
            handle: pathParts[0],
            profile_url: `https://www.youtube.com/${pathParts[0]}`,
          };
        }
      }

      // Facebook
      if (hostname.includes('facebook.com')) {
        const handle = pathParts[0];
        if (handle && !['sharer', 'share', 'groups', 'pages'].includes(handle)) {
          return {
            platform: 'facebook',
            handle,
            profile_url: `https://www.facebook.com/${handle}`,
          };
        }
      }

      // IMDB
      if (hostname.includes('imdb.com') && pathParts[0] === 'name') {
        return {
          platform: 'imdb',
          handle: pathParts[1],
          profile_url: `https://www.imdb.com/name/${pathParts[1]}/`,
        };
      }

      // TikTok
      if (hostname.includes('tiktok.com')) {
        const handle = pathParts[0]?.startsWith('@') 
          ? pathParts[0].slice(1) 
          : pathParts[0];
        if (handle && !['discover', 'live', 'upload', 'search'].includes(handle)) {
          return {
            platform: 'tiktok',
            handle,
            profile_url: `https://www.tiktok.com/@${handle}`,
          };
        }
      }

      // Snapchat (metadata only - NO EMBED)
      if (hostname.includes('snapchat.com')) {
        const handle = pathParts[0] === 'add' ? pathParts[1] : pathParts[0];
        if (handle && !['add', 'discover', 'spotlight'].includes(handle)) {
          return {
            platform: 'snapchat',
            handle,
            profile_url: `https://www.snapchat.com/add/${handle}`,
          };
        }
      }
    } catch {
      // Invalid URL
    }

    return null;
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.windowStart > this.rateLimit.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    if (this.requestCount >= this.rateLimit.requests) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
    this.requestCount++;
  }
}

/**
 * TMDB Social Handle Adapter
 * 
 * Uses the external_ids API endpoint to get social media IDs
 */
export class TMDBSocialAdapter {
  private apiKey: string;
  private requestCount = 0;
  private windowStart = Date.now();
  private rateLimit = { requests: 40, windowMs: 10000 };

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
  }

  /**
   * Fetch social handles by TMDB person ID
   */
  async fetchByTmdbId(tmdbId: number): Promise<SocialHandle[]> {
    if (!this.apiKey) {
      console.warn('TMDB_API_KEY not set');
      return [];
    }

    await this.respectRateLimit();
    
    const handles: SocialHandle[] = [];

    try {
      const url = `${TMDB_API_BASE}/person/${tmdbId}/external_ids?api_key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) return handles;

      const data = await response.json();

      // Instagram
      if (data.instagram_id) {
        handles.push({
          platform: 'instagram',
          handle: data.instagram_id,
          profile_url: `https://www.instagram.com/${data.instagram_id}/`,
          source: 'tmdb',
          confidence_score: 0.7,
        });
      }

      // Twitter
      if (data.twitter_id) {
        handles.push({
          platform: 'twitter',
          handle: data.twitter_id,
          profile_url: `https://twitter.com/${data.twitter_id}`,
          source: 'tmdb',
          confidence_score: 0.7,
        });
      }

      // Facebook
      if (data.facebook_id) {
        handles.push({
          platform: 'facebook',
          handle: data.facebook_id,
          profile_url: `https://www.facebook.com/${data.facebook_id}`,
          source: 'tmdb',
          confidence_score: 0.7,
        });
      }

      // TikTok
      if (data.tiktok_id) {
        handles.push({
          platform: 'tiktok',
          handle: data.tiktok_id,
          profile_url: `https://www.tiktok.com/@${data.tiktok_id}`,
          source: 'tmdb',
          confidence_score: 0.7,
        });
      }

      // YouTube
      if (data.youtube_id) {
        handles.push({
          platform: 'youtube',
          handle: data.youtube_id,
          profile_url: `https://www.youtube.com/channel/${data.youtube_id}`,
          source: 'tmdb',
          confidence_score: 0.7,
        });
      }

      // IMDB
      if (data.imdb_id) {
        handles.push({
          platform: 'imdb',
          handle: data.imdb_id,
          profile_url: `https://www.imdb.com/name/${data.imdb_id}/`,
          source: 'tmdb',
          confidence_score: 0.9,
        });
      }
    } catch (error) {
      console.error(`TMDB fetch error for ID ${tmdbId}:`, error);
    }

    return handles;
  }

  /**
   * Search for person by name and get their social handles
   */
  async fetchByName(celebrityName: string): Promise<{ tmdb_id?: number; handles: SocialHandle[] }> {
    if (!this.apiKey) return { handles: [] };

    await this.respectRateLimit();

    try {
      // Search for person
      const searchUrl = `${TMDB_API_BASE}/search/person?api_key=${this.apiKey}&query=${encodeURIComponent(celebrityName)}`;
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) return { handles: [] };

      const searchData = await searchResponse.json();
      const person = searchData.results?.[0];

      if (!person) return { handles: [] };

      // Get external IDs
      const handles = await this.fetchByTmdbId(person.id);
      return { tmdb_id: person.id, handles };
    } catch (error) {
      console.error(`TMDB search error for ${celebrityName}:`, error);
      return { handles: [] };
    }
  }

  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    if (now - this.windowStart > this.rateLimit.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    if (this.requestCount >= this.rateLimit.requests) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
    this.requestCount++;
  }
}

/**
 * Unified Social Handle Fetcher
 * 
 * Combines all adapters and provides merged results
 */
export class UnifiedSocialFetcher {
  private wikidataAdapter = new WikidataSocialAdapter();
  private wikipediaAdapter = new WikipediaSocialAdapter();
  private tmdbAdapter = new TMDBSocialAdapter();

  /**
   * Fetch social handles from all sources
   */
  async fetchAll(options: {
    celebrity_name: string;
    wikidata_id?: string;
    tmdb_id?: number;
  }): Promise<SocialFetchResult> {
    const result: SocialFetchResult = {
      celebrity_name: options.celebrity_name,
      wikidata_id: options.wikidata_id,
      tmdb_id: options.tmdb_id,
      handles: [],
      sources_checked: [],
      errors: [],
    };

    // Fetch from Wikidata (highest priority)
    if (options.wikidata_id) {
      try {
        result.sources_checked.push('wikidata');
        const wikidataHandles = await this.wikidataAdapter.fetchByWikidataId(options.wikidata_id);
        result.handles.push(...wikidataHandles);
      } catch (error) {
        result.errors.push(`Wikidata: ${error}`);
      }
    }

    // Fetch from TMDB
    try {
      result.sources_checked.push('tmdb');
      let tmdbHandles: SocialHandle[] = [];
      
      if (options.tmdb_id) {
        tmdbHandles = await this.tmdbAdapter.fetchByTmdbId(options.tmdb_id);
      } else {
        const tmdbResult = await this.tmdbAdapter.fetchByName(options.celebrity_name);
        result.tmdb_id = tmdbResult.tmdb_id;
        tmdbHandles = tmdbResult.handles;
      }
      
      // Only add handles that don't already exist from Wikidata
      for (const handle of tmdbHandles) {
        const exists = result.handles.some(
          h => h.platform === handle.platform && h.handle === handle.handle
        );
        if (!exists) {
          result.handles.push(handle);
        } else {
          // Boost confidence if confirmed by multiple sources
          const existing = result.handles.find(
            h => h.platform === handle.platform && h.handle === handle.handle
          );
          if (existing) {
            existing.confidence_score = Math.min(1, existing.confidence_score + 0.2);
          }
        }
      }
    } catch (error) {
      result.errors.push(`TMDB: ${error}`);
    }

    // Fetch from Wikipedia (supplementary)
    try {
      result.sources_checked.push('wikipedia');
      const wikiHandles = await this.wikipediaAdapter.fetchByName(options.celebrity_name);
      
      // Only add new handles or boost existing
      for (const handle of wikiHandles) {
        const exists = result.handles.some(
          h => h.platform === handle.platform && h.handle === handle.handle
        );
        if (!exists) {
          result.handles.push(handle);
        } else {
          const existing = result.handles.find(
            h => h.platform === handle.platform && h.handle === handle.handle
          );
          if (existing) {
            existing.confidence_score = Math.min(1, existing.confidence_score + 0.3);
          }
        }
      }
    } catch (error) {
      result.errors.push(`Wikipedia: ${error}`);
    }

    // Sort by confidence
    result.handles.sort((a, b) => b.confidence_score - a.confidence_score);

    return result;
  }

  /**
   * Batch fetch for multiple celebrities
   */
  async batchFetch(
    celebrities: Array<{
      celebrity_name: string;
      wikidata_id?: string;
      tmdb_id?: number;
    }>,
    options: { delayMs?: number } = {}
  ): Promise<SocialFetchResult[]> {
    const { delayMs = 500 } = options;
    const results: SocialFetchResult[] = [];

    for (let i = 0; i < celebrities.length; i++) {
      const celeb = celebrities[i];
      console.log(`[${i + 1}/${celebrities.length}] Fetching social handles for ${celeb.celebrity_name}...`);
      
      const result = await this.fetchAll(celeb);
      results.push(result);

      if (i < celebrities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}

// Export singleton instances
export const wikidataSocialAdapter = new WikidataSocialAdapter();
export const wikipediaSocialAdapter = new WikipediaSocialAdapter();
export const tmdbSocialAdapter = new TMDBSocialAdapter();
export const unifiedSocialFetcher = new UnifiedSocialFetcher();

