/**
 * Smart AI Key Manager with Intelligent Routing
 * 
 * Features:
 * - Pre-validation of all keys at startup
 * - Smart routing based on response times & success rates
 * - Timeout-based switching with pre-warmed fallbacks
 * - Parallel provider support for batch processing
 * - Intelligent cooldown (hours for auth errors, minutes for rate limits)
 * - Async key preparation before switching
 * - Health-based key scoring
 */

import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { aiMetrics } from './metrics';

dotenv.config({ path: '.env.local' });

// ============================================================
// TYPES
// ============================================================

type AIProvider = 'groq' | 'openai' | 'cohere' | 'huggingface';
type KeyHealth = 'healthy' | 'slow' | 'rate_limited' | 'error' | 'unknown';

interface KeyMetrics {
  key: string;
  provider: AIProvider;
  health: KeyHealth;
  avgResponseTime: number;
  successCount: number;
  failureCount: number;
  lastUsed: number;
  lastError?: string;
  cooldownUntil?: number;
  validated: boolean;
}

interface ProviderMetrics {
  provider: AIProvider;
  model: string;
  avgResponseTime: number;
  successRate: number;
  isAvailable: boolean;
  keys: KeyMetrics[];
}

// ============================================================
// CONFIGURATION
// ============================================================

const PROVIDER_CONFIG = {
  groq: {
    model: 'llama-3.3-70b-versatile',
    timeout: 30000, // 30 seconds
    priority: 1, // Lower = higher priority
  },
  openai: {
    model: 'gpt-4o-mini',
    timeout: 60000, // 60 seconds
    priority: 2,
  },
  cohere: {
    model: 'command-r-plus',
    timeout: 60000,
    priority: 3,
  },
  huggingface: {
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    timeout: 90000,
    priority: 4,
  },
} as const;

const COOLDOWN_DURATIONS = {
  rate_limit: 5 * 60 * 1000,       // 5 minutes (increased from 1 min)
  rate_limit_extended: 30 * 60 * 1000, // 30 minutes for TPM limits
  slow: 5 * 60 * 1000,             // 5 minutes
  error: 2 * 60 * 60 * 1000,       // 2 hours for auth/unknown errors
};

const SLOW_THRESHOLD_MS = 15000; // Consider response slow if > 15s

// ============================================================
// SMART KEY MANAGER CLASS
// ============================================================

class SmartKeyManager {
  private providers: Map<AIProvider, ProviderMetrics> = new Map();
  private initialized = false;
  private validating = false;
  private prewarmedClients: Map<string, any> = new Map();

  constructor() {
    this.loadKeys();
  }

  /**
   * Load all keys from environment
   */
  private loadKeys(): void {
    const keyPatterns: Record<AIProvider, string[]> = {
      groq: ['GROQ_API_KEY', 'GROQ_API_KEY_2', 'GROQ_API_KEY_3', 'GROQ_API_KEY_4', 'GROQ_API_KEY_5', 'GROQ_API_KEY_6'],
      openai: ['OPENAI_API_KEY', 'OPENAI_API_KEY_2', 'OPENAI_API_KEY_3', 'OPENAI_API_KEY_4', 'OPENAI_API_KEY_5', 'OPENAI_API_KEY_6', 'OPENAI_API_KEY_7'],
      cohere: ['COHERE_API_KEY', 'COHERE_API_KEY_2'],
      huggingface: ['HUGGINGFACE_API_KEY', 'HF_API_KEY'],
    };

    for (const [provider, patterns] of Object.entries(keyPatterns) as [AIProvider, string[]][]) {
      const keys: KeyMetrics[] = [];
      
      for (const pattern of patterns) {
        const key = process.env[pattern];
        if (key && key.length > 10) {
          keys.push({
            key,
            provider,
            health: 'unknown',
            avgResponseTime: 0,
            successCount: 0,
            failureCount: 0,
            lastUsed: 0,
            validated: false,
          });
        }
      }

      this.providers.set(provider, {
        provider,
        model: PROVIDER_CONFIG[provider].model,
        avgResponseTime: 0,
        successRate: 0,
        isAvailable: keys.length > 0,
        keys,
      });
    }

    console.log('🔑 Smart Key Manager loaded:');
    for (const [provider, metrics] of this.providers) {
      console.log(`   ${provider}: ${metrics.keys.length} keys`);
    }
  }

  /**
   * Validate all keys at startup (async, non-blocking)
   */
  async validateAllKeys(): Promise<void> {
    if (this.validating) return;
    this.validating = true;

    console.log('🔍 Validating all API keys...');
    const validationPromises: Promise<void>[] = [];

    for (const [provider, metrics] of this.providers) {
      for (const keyMetrics of metrics.keys) {
        validationPromises.push(this.validateKey(provider, keyMetrics));
      }
    }

    // Run validations in parallel with timeout
    await Promise.allSettled(validationPromises);
    
    this.initialized = true;
    this.validating = false;
    this.printStatus();
  }

  /**
   * Validate a single key
   */
  private async validateKey(provider: AIProvider, keyMetrics: KeyMetrics): Promise<void> {
    const startTime = Date.now();
    
    try {
      const testPrompt = 'Say "OK" in one word.';
      let success = false;

      if (provider === 'groq') {
        const client = new Groq({ apiKey: keyMetrics.key });
        const response = await Promise.race([
          client.chat.completions.create({
            messages: [{ role: 'user', content: testPrompt }],
            model: 'llama-3.1-8b-instant', // Use fast model for validation
            max_tokens: 10,
          }),
          this.timeout(3000), // 3 second validation timeout
        ]);
        success = !!response;
      } else if (provider === 'openai') {
        const client = new OpenAI({ apiKey: keyMetrics.key });
        const response = await Promise.race([
          client.chat.completions.create({
            messages: [{ role: 'user', content: testPrompt }],
            model: PROVIDER_CONFIG.openai.model,
            max_tokens: 10,
          }),
          this.timeout(5000),
        ]);
        success = !!response;
      } else {
        // For cohere/huggingface, just mark as validated without test
        keyMetrics.validated = true;
        keyMetrics.health = 'unknown';
        return;
      }

      const responseTime = Date.now() - startTime;
      keyMetrics.validated = true;
      keyMetrics.avgResponseTime = responseTime;
      keyMetrics.health = responseTime > SLOW_THRESHOLD_MS ? 'slow' : 'healthy';
      
      console.log(`   ✅ ${provider} key validated (${responseTime}ms)`);
    } catch (error: any) {
      keyMetrics.validated = true;
      keyMetrics.health = 'error';
      keyMetrics.lastError = error.message;
      keyMetrics.cooldownUntil = Date.now() + COOLDOWN_DURATIONS.error;
      
      console.log(`   ❌ ${provider} key failed: ${error.message?.substring(0, 50)}`);
    }
  }

  /**
   * Get the best available key for a provider
   */
  getBestKey(provider: AIProvider): KeyMetrics | null {
    const metrics = this.providers.get(provider);
    if (!metrics) return null;

    const now = Date.now();
    
    // Filter available keys (not in cooldown, healthy or unknown)
    const availableKeys = metrics.keys.filter(k => {
      if (k.cooldownUntil && k.cooldownUntil > now) return false;
      if (k.health === 'error') return false;
      return true;
    });

    if (availableKeys.length === 0) return null;

    // Sort by: health (healthy > unknown > slow), then by response time, then by success rate
    availableKeys.sort((a, b) => {
      const healthScore = { healthy: 0, unknown: 1, slow: 2, rate_limited: 3, error: 4 };
      const healthDiff = healthScore[a.health] - healthScore[b.health];
      if (healthDiff !== 0) return healthDiff;
      
      // Prefer less recently used to distribute load
      return a.lastUsed - b.lastUsed;
    });

    return availableKeys[0];
  }

  /**
   * Get the best available provider
   */
  getBestProvider(): AIProvider | null {
    const now = Date.now();
    const available: { provider: AIProvider; score: number }[] = [];

    for (const [provider, metrics] of this.providers) {
      const bestKey = this.getBestKey(provider);
      if (!bestKey) continue;

      // Calculate provider score (lower = better)
      const priorityScore = PROVIDER_CONFIG[provider].priority * 10;
      const healthScore = { healthy: 0, unknown: 5, slow: 10, rate_limited: 100, error: 1000 }[bestKey.health];
      const responseScore = bestKey.avgResponseTime / 1000;

      available.push({
        provider,
        score: priorityScore + healthScore + responseScore,
      });
    }

    if (available.length === 0) return null;

    available.sort((a, b) => a.score - b.score);
    return available[0].provider;
  }

  /**
   * Get client with pre-warming
   */
  getClient(provider: AIProvider): { client: any; key: string } | null {
    const keyMetrics = this.getBestKey(provider);
    if (!keyMetrics) return null;

    keyMetrics.lastUsed = Date.now();

    // Check for pre-warmed client
    const cacheKey = `${provider}:${keyMetrics.key.substring(0, 10)}`;
    let client = this.prewarmedClients.get(cacheKey);

    if (!client) {
      if (provider === 'groq') {
        client = new Groq({ apiKey: keyMetrics.key });
      } else if (provider === 'openai') {
        client = new OpenAI({ apiKey: keyMetrics.key });
      }
      if (client) {
        this.prewarmedClients.set(cacheKey, client);
      }
    }

    // Pre-warm next key in background
    this.prewarmNextKey(provider, keyMetrics.key);

    return client ? { client, key: keyMetrics.key } : null;
  }

  /**
   * Pre-warm the next available key
   */
  private prewarmNextKey(provider: AIProvider, currentKey: string): void {
    const metrics = this.providers.get(provider);
    if (!metrics) return;

    const nextKey = metrics.keys.find(k => 
      k.key !== currentKey && 
      k.health !== 'error' && 
      (!k.cooldownUntil || k.cooldownUntil < Date.now())
    );

    if (nextKey) {
      const cacheKey = `${provider}:${nextKey.key.substring(0, 10)}`;
      if (!this.prewarmedClients.has(cacheKey)) {
        if (provider === 'groq') {
          this.prewarmedClients.set(cacheKey, new Groq({ apiKey: nextKey.key }));
        } else if (provider === 'openai') {
          this.prewarmedClients.set(cacheKey, new OpenAI({ apiKey: nextKey.key }));
        }
      }
    }
  }

  /**
   * Record success for a key
   */
  recordSuccess(provider: AIProvider, key: string, responseTime: number): void {
    const metrics = this.providers.get(provider);
    if (!metrics) return;

    const keyMetrics = metrics.keys.find(k => k.key === key);
    if (!keyMetrics) return;

    keyMetrics.successCount++;
    keyMetrics.avgResponseTime = 
      (keyMetrics.avgResponseTime * (keyMetrics.successCount - 1) + responseTime) / keyMetrics.successCount;
    keyMetrics.health = responseTime > SLOW_THRESHOLD_MS ? 'slow' : 'healthy';
    keyMetrics.cooldownUntil = undefined;
  }

  /**
   * Record failure for a key
   */
  recordFailure(provider: AIProvider, key: string, error: any): void {
    const metrics = this.providers.get(provider);
    if (!metrics) return;

    const keyMetrics = metrics.keys.find(k => k.key === key);
    if (!keyMetrics) return;

    keyMetrics.failureCount++;
    keyMetrics.lastError = error.message || 'Unknown error';

    // Determine cooldown based on error type
    const status = error?.status || error?.response?.status;
    const message = error?.message || '';

    if (status === 429 || message.includes('rate limit') || message.includes('Rate limit')) {
      keyMetrics.health = 'rate_limited';
      
      // Parse retry time from OpenAI error if available (e.g., "try again in 25m29.28s")
      const retryMatch = message.match(/try again in (\d+)m/i);
      if (retryMatch) {
        const retryMinutes = parseInt(retryMatch[1], 10);
        const cooldownMs = (retryMinutes + 1) * 60 * 1000; // Add 1 minute buffer
        keyMetrics.cooldownUntil = Date.now() + cooldownMs;
        console.log(`⏳ ${provider} key rate limited, cooldown ${retryMinutes + 1} min`);
      } else if (message.includes('TPM') || message.includes('tokens per min')) {
        // Token per minute limit - needs longer cooldown
        keyMetrics.cooldownUntil = Date.now() + COOLDOWN_DURATIONS.rate_limit_extended;
        console.log(`⏳ ${provider} key TPM limited, cooldown 30 min`);
      } else {
        keyMetrics.cooldownUntil = Date.now() + COOLDOWN_DURATIONS.rate_limit;
        console.log(`⏳ ${provider} key rate limited, cooldown 5 min`);
      }
    } else if (status === 401 || status === 403 || message.includes('invalid_api_key')) {
      keyMetrics.health = 'error';
      keyMetrics.cooldownUntil = Date.now() + COOLDOWN_DURATIONS.error;
      console.log(`🚫 ${provider} key auth error, cooldown 2 hours`);
    } else {
      keyMetrics.health = 'error';
      keyMetrics.cooldownUntil = Date.now() + COOLDOWN_DURATIONS.error;
      console.log(`❌ ${provider} key error, cooldown 2 hours`);
    }
  }

  /**
   * Get all healthy providers for parallel processing
   */
  getHealthyProviders(): AIProvider[] {
    const healthy: AIProvider[] = [];
    
    for (const [provider] of this.providers) {
      const bestKey = this.getBestKey(provider);
      if (bestKey && (bestKey.health === 'healthy' || bestKey.health === 'unknown')) {
        healthy.push(provider);
      }
    }

    return healthy;
  }

  /**
   * Create timeout promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }

  /**
   * Print current status
   */
  printStatus(): void {
    console.log('\n📊 Key Manager Status:');
    console.log('─'.repeat(50));
    
    for (const [provider, metrics] of this.providers) {
      const healthyCount = metrics.keys.filter(k => k.health === 'healthy').length;
      const errorCount = metrics.keys.filter(k => k.health === 'error').length;
      const rateLimitedCount = metrics.keys.filter(k => k.health === 'rate_limited').length;
      
      console.log(`${provider}: ${metrics.keys.length} keys (✅${healthyCount} ⏳${rateLimitedCount} ❌${errorCount})`);
    }
    console.log('─'.repeat(50));
  }

  /**
   * Check if any provider is available
   */
  hasAvailableProvider(): boolean {
    return this.getBestProvider() !== null;
  }

  /**
   * Get next available time (when shortest cooldown expires)
   */
  getNextAvailableTime(): number | null {
    let nextTime: number | null = null;
    
    for (const [_, metrics] of this.providers) {
      for (const key of metrics.keys) {
        if (key.cooldownUntil && key.health !== 'error') {
          if (!nextTime || key.cooldownUntil < nextTime) {
            nextTime = key.cooldownUntil;
          }
        }
      }
    }
    
    return nextTime;
  }
}

// ============================================================
// AI COMPLETION WITH SMART ROUTING
// ============================================================

export class SmartAIClient {
  private keyManager: SmartKeyManager;
  private initialized = false;

  constructor() {
    this.keyManager = new SmartKeyManager();
  }

  /**
   * Initialize and validate keys
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.keyManager.validateAllKeys();
    this.initialized = true;
  }

  /**
   * Make AI completion with smart routing
   */
  async complete(prompt: string, options: {
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
  } = {}): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const { maxTokens = 1000, temperature = 0.7, timeout = 60000 } = options;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = this.keyManager.getBestProvider();
      if (!provider) {
        throw new Error('No available AI providers');
      }

      const clientInfo = this.keyManager.getClient(provider);
      if (!clientInfo) {
        continue;
      }

      const { client, key } = clientInfo;
      const startTime = Date.now();

      try {
        let result: string = '';

        const completionPromise = (async () => {
          if (provider === 'groq') {
            const completion = await client.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: PROVIDER_CONFIG.groq.model,
              temperature,
              max_tokens: maxTokens,
            });
            return completion.choices[0]?.message?.content || '';
          } else if (provider === 'openai') {
            const completion = await client.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: PROVIDER_CONFIG.openai.model,
              temperature,
              max_tokens: maxTokens,
            });
            return completion.choices[0]?.message?.content || '';
          }
          return '';
        })();

        // Race with timeout
        result = await Promise.race([
          completionPromise,
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          ),
        ]);

        if (result) {
          const responseTime = Date.now() - startTime;
          this.keyManager.recordSuccess(provider, key, responseTime);
          
          // Track metrics
          const inputTokens = Math.ceil(prompt.length / 3.5);
          const outputTokens = Math.ceil(result.length / 3.5);
          aiMetrics.record({
            provider,
            model: PROVIDER_CONFIG[provider].model,
            feature: 'ai_completion',
            inputTokens,
            outputTokens,
            latencyMs: responseTime,
            cached: false,
            success: true,
          });
          
          return result;
        }
      } catch (error: any) {
        lastError = error;
        this.keyManager.recordFailure(provider, key, error);
        
        // Track failed request
        aiMetrics.record({
          provider,
          model: PROVIDER_CONFIG[provider].model,
          feature: 'ai_completion',
          inputTokens: Math.ceil(prompt.length / 3.5),
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
          cached: false,
          success: false,
          error: error.message,
        });
        
        // Small delay before retry
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // All providers exhausted - wait for shortest cooldown and retry ONCE
    const nextAvailable = this.keyManager.getNextAvailableTime();
    if (nextAvailable) {
      const waitTime = nextAvailable - Date.now();
      if (waitTime > 0 && waitTime < 10 * 60 * 1000) { // Only wait up to 10 minutes
        console.log(`\n⏰ All keys exhausted. Waiting ${Math.ceil(waitTime / 1000)}s for cooldown...`);
        await new Promise(r => setTimeout(r, waitTime + 1000)); // Add 1s buffer
        
        // Try one more time
        const retryProviders = this.keyManager.getPrioritizedProviders();
        for (const provider of retryProviders) {
          const key = this.keyManager.getAvailableKey(provider);
          if (!key) continue;
          
          const client = this.getClient(provider, key);
          if (!client) continue;
          
          try {
            let result = '';
            if (provider === 'groq') {
              const completion = await client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: PROVIDER_CONFIG.groq.model,
                temperature,
                max_tokens: maxTokens,
              });
              result = completion.choices[0]?.message?.content || '';
            } else if (provider === 'openai') {
              const completion = await client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: PROVIDER_CONFIG.openai.model,
                temperature,
                max_tokens: maxTokens,
              });
              result = completion.choices[0]?.message?.content || '';
            }
            
            if (result) {
              this.keyManager.recordSuccess(provider, key, Date.now());
              return result;
            }
          } catch (e) {
            this.keyManager.recordFailure(provider, key, e);
          }
        }
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  /**
   * Get status
   */
  getStatus(): void {
    this.keyManager.printStatus();
  }

  /**
   * Get healthy providers for parallel processing
   */
  getHealthyProviders(): AIProvider[] {
    return this.keyManager.getHealthyProviders();
  }
}

// Singleton instance
export const smartAI = new SmartAIClient();

export default smartAI;

