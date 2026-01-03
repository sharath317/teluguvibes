/**
 * AI API Key Manager with Fallback & Rotation
 * 
 * Supports multiple API keys per provider with automatic rotation on:
 * - Rate limit errors (429)
 * - Auth errors (401, 403)
 * - Server errors (5xx)
 * 
 * Supported Providers:
 * - Groq (llama-3.3-70b-versatile)
 * - OpenAI (gpt-4o-mini)
 * - Cohere (command-r-plus)
 * - Hugging Face (inference API)
 * 
 * Usage:
 *   import { keyManager } from '@/lib/ai/key-manager';
 *   
 *   const key = keyManager.getKey('groq');
 *   // ... use key ...
 *   keyManager.markKeyFailed('groq', key, 'rate_limit');
 *   const nextKey = keyManager.getKey('groq'); // Gets next key
 */

// ============================================================
// TYPES
// ============================================================

type AIProvider = 'groq' | 'openai' | 'cohere' | 'huggingface';
type FailureReason = 'rate_limit' | 'auth_error' | 'server_error' | 'unknown';

interface KeyStatus {
  key: string;
  failedAt?: number;
  failureReason?: FailureReason;
  cooldownUntil?: number;
  usageCount: number;
}

interface ProviderConfig {
  keys: KeyStatus[];
  currentIndex: number;
  cooldownMs: number; // How long to wait before retrying a failed key
}

// ============================================================
// KEY CONFIGURATION
// ============================================================

// Load keys from environment variables with fallbacks
function loadKeys(): Record<AIProvider, ProviderConfig> {
  const groqKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];

  const openaiKeys = [
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_API_KEY_2,
    process.env.OPENAI_API_KEY_3,
    process.env.OPENAI_API_KEY_4,
  ].filter(Boolean) as string[];

  const cohereKeys = [
    process.env.COHERE_API_KEY,
    process.env.COHERE_API_KEY_2,
  ].filter(Boolean) as string[];

  const huggingfaceKeys = [
    process.env.HUGGINGFACE_API_KEY,
    process.env.HF_API_KEY,
  ].filter(Boolean) as string[];

  return {
    groq: {
      keys: groqKeys.map(key => ({ key, usageCount: 0 })),
      currentIndex: 0,
      cooldownMs: 60000, // 1 minute cooldown for Groq
    },
    openai: {
      keys: openaiKeys.map(key => ({ key, usageCount: 0 })),
      currentIndex: 0,
      cooldownMs: 30000, // 30 second cooldown for OpenAI
    },
    cohere: {
      keys: cohereKeys.map(key => ({ key, usageCount: 0 })),
      currentIndex: 0,
      cooldownMs: 60000, // 1 minute cooldown for Cohere
    },
    huggingface: {
      keys: huggingfaceKeys.map(key => ({ key, usageCount: 0 })),
      currentIndex: 0,
      cooldownMs: 30000, // 30 second cooldown for HuggingFace
    },
  };
}

// ============================================================
// KEY MANAGER CLASS
// ============================================================

class AIKeyManager {
  private providers: Record<AIProvider, ProviderConfig>;
  private initialized: boolean = false;

  constructor() {
    this.providers = {
      groq: { keys: [], currentIndex: 0, cooldownMs: 60000 },
      openai: { keys: [], currentIndex: 0, cooldownMs: 30000 },
      cohere: { keys: [], currentIndex: 0, cooldownMs: 60000 },
      huggingface: { keys: [], currentIndex: 0, cooldownMs: 30000 },
    };
  }

  /**
   * Initialize the key manager (call after env vars are loaded)
   */
  initialize(): void {
    if (this.initialized) return;
    this.providers = loadKeys();
    this.initialized = true;
    
    console.log(`🔑 AI Key Manager initialized:`);
    console.log(`   Groq keys: ${this.providers.groq.keys.length}`);
    console.log(`   OpenAI keys: ${this.providers.openai.keys.length}`);
    console.log(`   Cohere keys: ${this.providers.cohere.keys.length}`);
    console.log(`   HuggingFace keys: ${this.providers.huggingface.keys.length}`);
  }

  /**
   * Get the current active key for a provider
   */
  getKey(provider: AIProvider): string | null {
    if (!this.initialized) this.initialize();

    const config = this.providers[provider];
    if (!config.keys.length) {
      console.warn(`⚠️ No keys available for ${provider}`);
      return null;
    }

    // Find first available key (not in cooldown)
    const now = Date.now();
    for (let i = 0; i < config.keys.length; i++) {
      const idx = (config.currentIndex + i) % config.keys.length;
      const keyStatus = config.keys[idx];
      
      // Skip if in cooldown
      if (keyStatus.cooldownUntil && keyStatus.cooldownUntil > now) {
        continue;
      }

      // Clear expired cooldown
      if (keyStatus.cooldownUntil && keyStatus.cooldownUntil <= now) {
        keyStatus.cooldownUntil = undefined;
        keyStatus.failedAt = undefined;
        keyStatus.failureReason = undefined;
      }

      keyStatus.usageCount++;
      return keyStatus.key;
    }

    // All keys in cooldown - return first one anyway (will retry)
    console.warn(`⚠️ All ${provider} keys in cooldown, using first key`);
    return config.keys[0]?.key || null;
  }

  /**
   * Mark a key as failed and trigger rotation
   */
  markKeyFailed(provider: AIProvider, key: string, reason: FailureReason): void {
    const config = this.providers[provider];
    const keyStatus = config.keys.find(k => k.key === key);
    
    if (!keyStatus) return;

    const now = Date.now();
    keyStatus.failedAt = now;
    keyStatus.failureReason = reason;

    // Set cooldown based on failure reason
    let cooldownMs = config.cooldownMs;
    if (reason === 'rate_limit') {
      cooldownMs = reason === 'rate_limit' ? 60000 : 30000; // 1 min for rate limit
    } else if (reason === 'auth_error') {
      cooldownMs = 3600000; // 1 hour for auth errors (key might be invalid)
    }

    keyStatus.cooldownUntil = now + cooldownMs;

    // Rotate to next key
    config.currentIndex = (config.currentIndex + 1) % config.keys.length;

    console.log(`🔄 ${provider} key failed (${reason}), rotating to next key`);
    console.log(`   Cooldown: ${cooldownMs / 1000}s`);
  }

  /**
   * Get status of all keys for a provider
   */
  getStatus(provider: AIProvider): {
    total: number;
    available: number;
    inCooldown: number;
    currentIndex: number;
  } {
    const config = this.providers[provider];
    const now = Date.now();
    const inCooldown = config.keys.filter(k => k.cooldownUntil && k.cooldownUntil > now).length;

    return {
      total: config.keys.length,
      available: config.keys.length - inCooldown,
      inCooldown,
      currentIndex: config.currentIndex,
    };
  }

  /**
   * Get all available providers (ordered by preference)
   */
  getAvailableProviders(): AIProvider[] {
    if (!this.initialized) this.initialize();
    
    // Priority order: groq (fastest) > openai > cohere > huggingface
    return (['groq', 'openai', 'cohere', 'huggingface'] as AIProvider[]).filter(p => 
      this.providers[p].keys.length > 0
    );
  }

  /**
   * Check if any keys are available for a provider
   */
  hasKeys(provider: AIProvider): boolean {
    if (!this.initialized) this.initialize();
    return this.providers[provider].keys.length > 0;
  }
}

// Singleton instance
export const keyManager = new AIKeyManager();

// ============================================================
// HELPER FOR ERROR DETECTION
// ============================================================

/**
 * Determine failure reason from error
 */
export function getFailureReason(error: any): FailureReason {
  const status = error?.status || error?.response?.status;
  const message = error?.message || '';

  if (status === 429 || message.includes('rate limit') || message.includes('Rate limit')) {
    return 'rate_limit';
  }
  if (status === 401 || status === 403 || message.includes('auth') || message.includes('invalid_api_key')) {
    return 'auth_error';
  }
  if (status >= 500) {
    return 'server_error';
  }
  return 'unknown';
}

export default keyManager;

