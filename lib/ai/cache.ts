/**
 * AI Response Cache - Supabase-backed caching for AI responses
 * 
 * Prevents regenerating the same content:
 * - Movie synopses (30 day TTL)
 * - Analysis results (7 day TTL)
 * - Awards data (1 year TTL - historical)
 * - Trending content (1 hour TTL)
 * 
 * Savings: 40-50% for repeat content
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

export type CacheCategory = 
  | 'synopsis'
  | 'story_analysis'
  | 'performances'
  | 'direction'
  | 'perspectives'
  | 'why_watch'
  | 'why_skip'
  | 'cultural_impact'
  | 'awards'
  | 'verdict'
  | 'article'
  | 'translation'
  | 'trending';

export interface CacheEntry {
  key: string;
  category: CacheCategory;
  value: string;
  inputHash: string;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  sizeBytes: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  estimatedSavingsUsd: number;
}

export interface CacheOptions {
  ttlSeconds?: number;
  category?: CacheCategory;
  skipCache?: boolean;
}

// ============================================================
// TTL STRATEGIES (in seconds)
// ============================================================

const TTL_STRATEGIES: Record<CacheCategory, number> = {
  // Static content - long TTL
  synopsis: 30 * 24 * 60 * 60,           // 30 days
  awards: 365 * 24 * 60 * 60,            // 1 year (historical)
  cultural_impact: 30 * 24 * 60 * 60,    // 30 days
  
  // Analysis content - medium TTL
  story_analysis: 7 * 24 * 60 * 60,      // 7 days
  performances: 7 * 24 * 60 * 60,        // 7 days
  direction: 7 * 24 * 60 * 60,           // 7 days
  perspectives: 7 * 24 * 60 * 60,        // 7 days
  why_watch: 7 * 24 * 60 * 60,           // 7 days
  why_skip: 7 * 24 * 60 * 60,            // 7 days
  verdict: 7 * 24 * 60 * 60,             // 7 days
  
  // Dynamic content - short TTL
  article: 24 * 60 * 60,                 // 1 day
  translation: 30 * 24 * 60 * 60,        // 30 days (translations don't change)
  trending: 1 * 60 * 60,                 // 1 hour
};

// Average cost per AI call (for savings estimation)
const AVG_COST_PER_CALL = 0.0005; // $0.0005 per call

// ============================================================
// IN-MEMORY CACHE (L1)
// ============================================================

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const MEMORY_CACHE_MAX_SIZE = 1000;
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getFromMemory(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.value;
}

function setInMemory(key: string, value: string): void {
  // Evict oldest entries if cache is full
  if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + MEMORY_CACHE_TTL,
  });
}

// ============================================================
// AI CACHE CLASS
// ============================================================

class AICache {
  private supabase: SupabaseClient | null = null;
  private stats = {
    hits: 0,
    misses: 0,
  };
  private initialized = false;

  constructor() {
    this.initSupabase();
  }

  private initSupabase(): void {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (url && key) {
      this.supabase = createClient(url, key);
      this.initialized = true;
    }
  }

  /**
   * Generate a cache key from input parameters
   */
  generateKey(category: CacheCategory, ...parts: (string | number | undefined)[]): string {
    const cleanParts = parts.filter(p => p !== undefined).map(p => String(p));
    return `${category}:${cleanParts.join(':')}`;
  }

  /**
   * Generate hash of input for deduplication
   */
  private hashInput(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /**
   * Get cached response or generate new one
   */
  async getOrGenerate(
    key: string,
    generator: () => Promise<string>,
    options: CacheOptions = {}
  ): Promise<{ value: string; cached: boolean; source: 'memory' | 'db' | 'generated' }> {
    const { category = 'article', skipCache = false } = options;
    const ttl = options.ttlSeconds || TTL_STRATEGIES[category] || 86400;

    if (skipCache) {
      const value = await generator();
      return { value, cached: false, source: 'generated' };
    }

    // L1: Check memory cache
    const memoryValue = getFromMemory(key);
    if (memoryValue) {
      this.stats.hits++;
      return { value: memoryValue, cached: true, source: 'memory' };
    }

    // L2: Check Supabase cache
    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('ai_cache')
          .select('value, expires_at')
          .eq('cache_key', key)
          .single();

        if (data && new Date(data.expires_at) > new Date()) {
          this.stats.hits++;
          setInMemory(key, data.value);
          
          // Update hit count
          await this.supabase
            .from('ai_cache')
            .update({ hit_count: this.supabase.rpc('increment_hit_count') })
            .eq('cache_key', key);
          
          return { value: data.value, cached: true, source: 'db' };
        }
      } catch {
        // Cache miss or error, continue to generate
      }
    }

    // Cache miss - generate new value
    this.stats.misses++;
    const value = await generator();

    // Store in both caches
    setInMemory(key, value);
    
    if (this.supabase) {
      const expiresAt = new Date(Date.now() + ttl * 1000);
      
      try {
        await this.supabase
          .from('ai_cache')
          .upsert({
            cache_key: key,
            category,
            value,
            input_hash: this.hashInput(key),
            expires_at: expiresAt.toISOString(),
            size_bytes: Buffer.byteLength(value, 'utf8'),
            hit_count: 0,
          }, { onConflict: 'cache_key' });
      } catch (error) {
        // Non-critical, continue without caching
        console.warn('Cache write failed:', error);
      }
    }

    return { value, cached: false, source: 'generated' };
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    memoryCache.delete(key);
    
    if (this.supabase) {
      await this.supabase
        .from('ai_cache')
        .delete()
        .eq('cache_key', key);
    }
  }

  /**
   * Invalidate all entries for a category
   */
  async invalidateCategory(category: CacheCategory): Promise<number> {
    // Clear memory cache entries for category
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`${category}:`)) {
        memoryCache.delete(key);
      }
    }
    
    if (this.supabase) {
      const { count } = await this.supabase
        .from('ai_cache')
        .delete()
        .eq('category', category)
        .select('*', { count: 'exact', head: true });
      
      return count || 0;
    }
    
    return 0;
  }

  /**
   * Invalidate all entries for a movie
   */
  async invalidateMovie(movieId: string): Promise<void> {
    const patterns = [
      `synopsis:${movieId}`,
      `story_analysis:${movieId}`,
      `performances:${movieId}`,
      `direction:${movieId}`,
      `perspectives:${movieId}`,
      `why_watch:${movieId}`,
      `why_skip:${movieId}`,
      `cultural_impact:${movieId}`,
      `awards:${movieId}`,
      `verdict:${movieId}`,
    ];

    for (const pattern of patterns) {
      memoryCache.delete(pattern);
    }

    if (this.supabase) {
      await this.supabase
        .from('ai_cache')
        .delete()
        .like('cache_key', `%:${movieId}%`);
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    if (!this.supabase) return 0;

    const { count } = await this.supabase
      .from('ai_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('*', { count: 'exact', head: true });

    return count || 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      totalEntries: memoryCache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      estimatedSavingsUsd: this.stats.hits * AVG_COST_PER_CALL,
    };
  }

  /**
   * Print cache statistics
   */
  printStats(): void {
    const stats = this.getStats();
    console.log('\n📦 AI Cache Statistics:');
    console.log('─'.repeat(40));
    console.log(`  Memory entries: ${stats.totalEntries}`);
    console.log(`  Hits: ${stats.totalHits}`);
    console.log(`  Misses: ${stats.totalMisses}`);
    console.log(`  Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`  Est. savings: $${stats.estimatedSavingsUsd.toFixed(4)}`);
    console.log('─'.repeat(40));
  }

  /**
   * Check if cache is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const aiCache = new AICache();

export default aiCache;

// ============================================================
// MIGRATION SQL (for reference)
// ============================================================

/**
 * Run this SQL in Supabase to create the cache table:
 * 
 * CREATE TABLE IF NOT EXISTS ai_cache (
 *   cache_key TEXT PRIMARY KEY,
 *   category TEXT NOT NULL,
 *   value TEXT NOT NULL,
 *   input_hash TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   expires_at TIMESTAMPTZ NOT NULL,
 *   hit_count INTEGER DEFAULT 0,
 *   size_bytes INTEGER,
 *   
 *   -- Indexes for fast lookups
 *   CONSTRAINT valid_category CHECK (category IN (
 *     'synopsis', 'story_analysis', 'performances', 'direction',
 *     'perspectives', 'why_watch', 'why_skip', 'cultural_impact',
 *     'awards', 'verdict', 'article', 'translation', 'trending'
 *   ))
 * );
 * 
 * CREATE INDEX idx_ai_cache_category ON ai_cache(category);
 * CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);
 * 
 * -- Function to increment hit count
 * CREATE OR REPLACE FUNCTION increment_hit_count()
 * RETURNS INTEGER AS $$
 *   SELECT hit_count + 1 FROM ai_cache WHERE cache_key = cache_key
 * $$ LANGUAGE SQL;
 */


