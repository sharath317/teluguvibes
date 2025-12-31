/**
 * AI Router - FREE-FIRST provider routing for TeluguVibes
 *
 * Priority Order:
 * 1. Ollama (local, FREE, no rate limits)
 * 2. HuggingFace (cloud, FREE with limits)
 * 3. Groq (paid, fast)
 * 4. Gemini (paid, capable)
 *
 * Usage:
 *   const ai = getAIRouter();
 *   const response = await ai.generate({ messages: [...] });
 */

import { AIProvider, AIProviderInterface, AIRequest, AIResponse, AIConfig, DEFAULT_AI_CONFIG } from './types';
import { OllamaProvider, getOllamaProvider } from './providers/ollama';
import { HuggingFaceProvider, getHuggingFaceProvider } from './providers/huggingface';

// Provider availability cache
const providerStatus: Map<AIProvider, { available: boolean; checkedAt: number }> = new Map();
const CACHE_TTL = 60000; // 1 minute

export class AIRouter {
  private providers: Map<AIProvider, AIProviderInterface> = new Map();
  private preferredProvider: AIProvider;
  private fallbackOrder: AIProvider[];

  constructor(config?: Partial<AIConfig>) {
    this.preferredProvider = config?.provider || DEFAULT_AI_CONFIG.provider;

    // FREE-FIRST fallback order
    this.fallbackOrder = ['ollama', 'huggingface', 'groq', 'gemini'];

    // Initialize providers
    this.providers.set('ollama', getOllamaProvider(config));
    this.providers.set('huggingface', getHuggingFaceProvider(config));

    // Paid providers loaded on-demand
  }

  /**
   * Generate content using the best available provider
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    // Try preferred provider first
    const preferredAvailable = await this.checkProvider(this.preferredProvider);
    if (preferredAvailable) {
      try {
        return await this.generateWithProvider(this.preferredProvider, request);
      } catch (error) {
        console.warn(`Preferred provider ${this.preferredProvider} failed:`, error);
      }
    }

    // Fallback through providers
    for (const provider of this.fallbackOrder) {
      if (provider === this.preferredProvider) continue;

      const available = await this.checkProvider(provider);
      if (!available) continue;

      try {
        console.log(`🔄 Falling back to: ${provider}`);
        return await this.generateWithProvider(provider, request);
      } catch (error) {
        console.warn(`Provider ${provider} failed:`, error);
      }
    }

    throw new Error('No AI providers available. Please ensure Ollama is running locally.');
  }

  /**
   * Generate with a specific provider
   */
  private async generateWithProvider(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const providerInstance = this.getProvider(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not initialized`);
    }
    return providerInstance.generate(request);
  }

  /**
   * Get provider instance, lazy-load paid providers
   */
  private getProvider(provider: AIProvider): AIProviderInterface | undefined {
    if (this.providers.has(provider)) {
      return this.providers.get(provider);
    }

    // Paid providers not yet implemented - return undefined
    // They will be skipped in the fallback chain
    if (provider === 'groq' || provider === 'gemini') {
      return undefined;
    }

    return this.providers.get(provider);
  }

  /**
   * Check if provider is available (with caching)
   */
  private async checkProvider(provider: AIProvider): Promise<boolean> {
    const cached = providerStatus.get(provider);
    if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
      return cached.available;
    }

    const providerInstance = this.getProvider(provider);
    if (!providerInstance) {
      providerStatus.set(provider, { available: false, checkedAt: Date.now() });
      return false;
    }

    try {
      const available = await providerInstance.isAvailable();
      providerStatus.set(provider, { available, checkedAt: Date.now() });
      return available;
    } catch {
      providerStatus.set(provider, { available: false, checkedAt: Date.now() });
      return false;
    }
  }

  /**
   * Get status of all providers
   */
  async getStatus(): Promise<Record<AIProvider, boolean>> {
    const status: Record<AIProvider, boolean> = {
      ollama: false,
      huggingface: false,
      groq: false,
      gemini: false,
    };

    for (const provider of this.fallbackOrder) {
      status[provider] = await this.checkProvider(provider);
    }

    return status;
  }

  /**
   * Set preferred provider
   */
  setPreferredProvider(provider: AIProvider): void {
    this.preferredProvider = provider;
  }

  /**
   * Get current preferred provider
   */
  getPreferredProvider(): AIProvider {
    return this.preferredProvider;
  }

  /**
   * Convenience method for Telugu content generation
   */
  async generateTelugu(topic: string, options?: {
    wordCount?: number;
    style?: 'news' | 'review' | 'story' | 'tribute';
  }): Promise<AIResponse> {
    const wordCount = options?.wordCount || 300;
    const style = options?.style || 'news';

    const systemPrompt = `You are an expert Telugu entertainment journalist.
Write compelling, authentic Telugu content with natural expressions.
Include English names for celebrities/movies when appropriate.
Always be factual and avoid speculation.`;

    const userPrompt = `Write a ${wordCount}+ word Telugu ${style} article about: ${topic}

Requirements:
- Write in Telugu (English names allowed for people/movies)
- Use natural Telugu expressions
- Be engaging and informative
- Structure with clear paragraphs

Output as JSON:
{
  "title_te": "Telugu title",
  "excerpt": "2-3 line summary in Telugu",
  "body_te": "Full article in Telugu"
}`;

    return this.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      jsonMode: true,
      temperature: 0.8,
    });
  }
}

// Singleton instance
let routerInstance: AIRouter | null = null;

export function getAIRouter(config?: Partial<AIConfig>): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter(config);
  }
  return routerInstance;
}

/**
 * Quick helper for one-off generations
 */
export async function generateAI(request: AIRequest): Promise<AIResponse> {
  const router = getAIRouter();
  return router.generate(request);
}
