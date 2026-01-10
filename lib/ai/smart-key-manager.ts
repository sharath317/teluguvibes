/**
 * Smart AI Key Manager
 * 
 * Provides multi-provider, multi-model AI access with:
 * - Key rotation on rate limits
 * - Model fallback on deprecation
 * - Provider fallback (Groq → OpenAI → Cohere)
 * - Cooldown management
 * - Usage tracking
 * 
 * @example
 * ```ts
 * import { smartAI } from '@/lib/ai/smart-key-manager';
 * await smartAI.initialize();
 * const result = await smartAI.chat('Translate this to Telugu: Hello');
 * ```
 */

import Groq from 'groq-sdk';

// ============================================================
// CONFIGURATION
// ============================================================

interface ModelConfig {
  name: string;
  maxTokens: number;
  supportsJson: boolean;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'low';
}

interface ProviderConfig {
  name: string;
  models: ModelConfig[];
  rateLimit: number; // requests per minute
  cooldownMs: number;
}

// Groq models - updated Jan 2026
const GROQ_MODELS: ModelConfig[] = [
  { name: 'llama-3.3-70b-versatile', maxTokens: 32768, supportsJson: true, speed: 'fast', quality: 'high' },
  { name: 'llama-3.1-8b-instant', maxTokens: 8192, supportsJson: true, speed: 'fast', quality: 'medium' },
  { name: 'mixtral-8x7b-32768', maxTokens: 32768, supportsJson: true, speed: 'medium', quality: 'high' },
  { name: 'llama3-70b-8192', maxTokens: 8192, supportsJson: true, speed: 'medium', quality: 'high' },
  { name: 'gemma2-9b-it', maxTokens: 8192, supportsJson: true, speed: 'fast', quality: 'medium' },
];

// OpenAI models
const OPENAI_MODELS: ModelConfig[] = [
  { name: 'gpt-4o-mini', maxTokens: 16384, supportsJson: true, speed: 'fast', quality: 'high' },
  { name: 'gpt-4o', maxTokens: 4096, supportsJson: true, speed: 'medium', quality: 'high' },
  { name: 'gpt-3.5-turbo', maxTokens: 4096, supportsJson: true, speed: 'fast', quality: 'medium' },
];

// Provider configurations
const PROVIDERS: ProviderConfig[] = [
  { name: 'groq', models: GROQ_MODELS, rateLimit: 30, cooldownMs: 60000 },
  { name: 'openai', models: OPENAI_MODELS, rateLimit: 60, cooldownMs: 60000 },
];

// ============================================================
// TYPES
// ============================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  preferFast?: boolean;
  preferQuality?: boolean;
}

export interface ChatResult {
  content: string;
  model: string;
  provider: string;
  tokensUsed?: number;
  latencyMs: number;
}

interface KeyState {
  key: string;
  provider: string;
  failCount: number;
  lastFail?: Date;
  cooldownUntil?: Date;
  requestCount: number;
}

// ============================================================
// SMART AI MANAGER
// ============================================================

class SmartAIManager {
  private keys: KeyState[] = [];
  private currentKeyIndex = 0;
  private initialized = false;
  private groqClient?: Groq;

  /**
   * Initialize the AI manager with available API keys
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load Groq keys
    const groqKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3,
      process.env.GROQ_API_KEY_4,
      process.env.GROQ_API_KEY_5,
      process.env.GROQ_API_KEY_6,
      process.env.GROQ_API_KEY_UNLIMITED,
    ].filter(Boolean) as string[];

    // Load OpenAI keys
    const openaiKeys = [
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_API_KEY_2,
      process.env.OPENAI_API_KEY_3,
      process.env.OPENAI_API_KEY_4,
    ].filter(Boolean) as string[];

    // Register keys
    groqKeys.forEach(key => {
      this.keys.push({ key, provider: 'groq', failCount: 0, requestCount: 0 });
    });

    openaiKeys.forEach(key => {
      this.keys.push({ key, provider: 'openai', failCount: 0, requestCount: 0 });
    });

    // Initialize Groq client with first key
    if (groqKeys.length > 0) {
      this.groqClient = new Groq({ apiKey: groqKeys[0] });
    }

    console.log(`🔑 AI Key Manager initialized:`);
    console.log(`   Groq keys: ${groqKeys.length}`);
    console.log(`   OpenAI keys: ${openaiKeys.length}`);

    this.initialized = true;
  }

  /**
   * Get the next available key, rotating on failures
   */
  private getNextKey(provider?: string): KeyState | null {
    const now = new Date();
    
    // Filter available keys
    const availableKeys = this.keys.filter(k => {
      if (provider && k.provider !== provider) return false;
      if (k.cooldownUntil && k.cooldownUntil > now) return false;
      return true;
    });

    if (availableKeys.length === 0) return null;

    // Round-robin selection
    const key = availableKeys[this.currentKeyIndex % availableKeys.length];
    this.currentKeyIndex++;
    return key;
  }

  /**
   * Mark a key as failed and apply cooldown
   */
  private markKeyFailed(keyState: KeyState, errorType: 'rate_limit' | 'auth' | 'model' | 'other'): void {
    keyState.failCount++;
    keyState.lastFail = new Date();

    // Different cooldowns for different errors
    const cooldownMs = errorType === 'rate_limit' ? 60000 :
                       errorType === 'auth' ? 3600000 : // 1 hour for auth errors
                       errorType === 'model' ? 0 : // No cooldown for model errors, just skip
                       30000;

    if (cooldownMs > 0) {
      keyState.cooldownUntil = new Date(Date.now() + cooldownMs);
    }
  }

  /**
   * Execute a chat completion with automatic fallback
   */
  async chat(
    messages: ChatMessage[] | string,
    options: ChatOptions = {}
  ): Promise<ChatResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      temperature = 0.7,
      maxTokens = 1500,
      jsonMode = false,
      preferFast = false,
      preferQuality = false,
    } = options;

    // Normalize messages
    const chatMessages: ChatMessage[] = typeof messages === 'string'
      ? [{ role: 'user', content: messages }]
      : messages;

    // Try Groq first (faster and cheaper)
    const groqResult = await this.tryGroq(chatMessages, { temperature, maxTokens, jsonMode, preferFast, preferQuality });
    if (groqResult) return groqResult;

    // Fall back to OpenAI
    const openaiResult = await this.tryOpenAI(chatMessages, { temperature, maxTokens, jsonMode });
    if (openaiResult) return openaiResult;

    throw new Error('All AI providers failed. Please check your API keys and try again.');
  }

  /**
   * Try Groq provider with model fallback
   */
  private async tryGroq(
    messages: ChatMessage[],
    options: { temperature: number; maxTokens: number; jsonMode: boolean; preferFast: boolean; preferQuality: boolean }
  ): Promise<ChatResult | null> {
    const keyState = this.getNextKey('groq');
    if (!keyState) return null;

    // Sort models based on preference
    let models = [...GROQ_MODELS];
    if (options.preferFast) {
      models.sort((a, b) => (a.speed === 'fast' ? -1 : 1) - (b.speed === 'fast' ? -1 : 1));
    }
    if (options.preferQuality) {
      models.sort((a, b) => (a.quality === 'high' ? -1 : 1) - (b.quality === 'high' ? -1 : 1));
    }

    for (const model of models) {
      try {
        const startTime = Date.now();
        
        const groq = new Groq({ apiKey: keyState.key });
        
        const response = await groq.chat.completions.create({
          model: model.name,
          messages,
          temperature: options.temperature,
          max_tokens: Math.min(options.maxTokens, model.maxTokens),
          ...(options.jsonMode && model.supportsJson ? { response_format: { type: 'json_object' } } : {}),
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) continue;

        keyState.requestCount++;
        
        return {
          content,
          model: model.name,
          provider: 'groq',
          tokensUsed: response.usage?.total_tokens,
          latencyMs: Date.now() - startTime,
        };
      } catch (error: any) {
        const errorMessage = error?.message || '';
        const errorCode = error?.error?.code || error?.code || '';
        
        // Handle specific errors
        if (errorCode === 'model_decommissioned' || errorMessage.includes('decommissioned')) {
          console.warn(`⚠️ Groq model ${model.name} decommissioned, trying next...`);
          continue; // Try next model
        }
        
        if (errorCode === 'rate_limit_exceeded' || error?.status === 429) {
          this.markKeyFailed(keyState, 'rate_limit');
          console.warn(`⚠️ Groq rate limit hit, rotating key...`);
          // Try with a different key
          const newKeyState = this.getNextKey('groq');
          if (newKeyState && newKeyState.key !== keyState.key) {
            continue; // Retry with new key
          }
          return null; // All keys exhausted
        }
        
        if (error?.status === 401 || errorCode === 'invalid_api_key') {
          this.markKeyFailed(keyState, 'auth');
          console.error(`❌ Groq auth error, key invalid`);
          return null;
        }
        
        console.warn(`⚠️ Groq error with ${model.name}:`, errorMessage);
        continue; // Try next model
      }
    }

    return null;
  }

  /**
   * Try OpenAI provider with model fallback
   */
  private async tryOpenAI(
    messages: ChatMessage[],
    options: { temperature: number; maxTokens: number; jsonMode: boolean }
  ): Promise<ChatResult | null> {
    const keyState = this.getNextKey('openai');
    if (!keyState) return null;

    for (const model of OPENAI_MODELS) {
      try {
        const startTime = Date.now();
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keyState.key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model.name,
            messages,
            temperature: options.temperature,
            max_tokens: Math.min(options.maxTokens, model.maxTokens),
            ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 429) {
            this.markKeyFailed(keyState, 'rate_limit');
            console.warn(`⚠️ OpenAI rate limit hit`);
            return null;
          }
          
          if (response.status === 401) {
            this.markKeyFailed(keyState, 'auth');
            return null;
          }
          
          console.warn(`⚠️ OpenAI error with ${model.name}:`, errorData);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) continue;

        keyState.requestCount++;
        
        return {
          content,
          model: model.name,
          provider: 'openai',
          tokensUsed: data.usage?.total_tokens,
          latencyMs: Date.now() - startTime,
        };
      } catch (error: any) {
        console.warn(`⚠️ OpenAI error with ${model.name}:`, error.message);
        continue;
      }
    }

    return null;
  }

  /**
   * Get usage statistics
   */
  getStats(): { provider: string; keys: number; requests: number; failures: number }[] {
    const stats = new Map<string, { keys: number; requests: number; failures: number }>();
    
    for (const key of this.keys) {
      const current = stats.get(key.provider) || { keys: 0, requests: 0, failures: 0 };
      current.keys++;
      current.requests += key.requestCount;
      current.failures += key.failCount;
      stats.set(key.provider, current);
    }
    
    return Array.from(stats.entries()).map(([provider, data]) => ({ provider, ...data }));
  }

  /**
   * Quick translate helper
   */
  async translate(text: string, targetLang: string = 'te'): Promise<string | null> {
    const languageNames: Record<string, string> = {
      'te': 'Telugu (తెలుగు)',
      'hi': 'Hindi (हिंदी)',
      'ta': 'Tamil (தமிழ்)',
      'kn': 'Kannada (ಕನ್ನಡ)',
    };
    
    const targetLanguageName = languageNames[targetLang] || targetLang;
    
    try {
      const result = await this.chat([
        {
          role: 'system',
          content: `You are an expert translator specializing in Indian cinema. Translate the following text to ${targetLanguageName}. 
Maintain the essence and style of movie descriptions. 
Use natural ${targetLanguageName} that a native speaker would use.
Only output the translated text, nothing else.`,
        },
        { role: 'user', content: text },
      ], { temperature: 0.3, maxTokens: 1500 });
      
      return result.content;
    } catch (error) {
      console.error('Translation failed:', error);
      return null;
    }
  }

  /**
   * Quick JSON completion helper
   */
  async jsonCompletion<T>(prompt: string, schema?: string): Promise<T | null> {
    const systemPrompt = schema 
      ? `You are a helpful assistant that responds only with valid JSON matching this schema: ${schema}`
      : 'You are a helpful assistant that responds only with valid JSON.';
    
    try {
      const result = await this.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ], { temperature: 0.1, jsonMode: true });
      
      return JSON.parse(result.content) as T;
    } catch (error) {
      console.error('JSON completion failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const smartAI = new SmartAIManager();

// Export class for testing
export { SmartAIManager };

// Export types
export type { ModelConfig, ProviderConfig, KeyState };

