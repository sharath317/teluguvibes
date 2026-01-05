/**
 * AI Module - FREE-FIRST Provider System
 *
 * Default: Ollama (local, free, no rate limits)
 * Fallback: HuggingFace (cloud, free with limits)
 * Upgrade: Groq, Gemini (paid, fast)
 *
 * Usage:
 *   import { getAIRouter, generateAI } from '@/lib/ai';
 *
 *   // Using router
 *   const ai = getAIRouter();
 *   const response = await ai.generate({ messages: [...] });
 *
 *   // Quick one-off
 *   const response = await generateAI({ messages: [...] });
 *
 *   // Telugu content
 *   const response = await ai.generateTelugu('Chiranjeevi movie news');
 */

// Types
export * from './types';

// Router
export { AIRouter, getAIRouter, generateAI } from './router';

// Providers (for direct access if needed)
export { OllamaProvider, getOllamaProvider } from './providers/ollama';
export { HuggingFaceProvider, getHuggingFaceProvider } from './providers/huggingface';

// ═══════════════════════════════════════════════════════════════
// PROVIDER CONFIGURATION GUIDE
// ═══════════════════════════════════════════════════════════════

/**
 * PROVIDER PRIORITY (configurable):
 *
 * 1. Ollama (LOCAL)
 *    - Install: https://ollama.ai
 *    - Models: llama3:8b, mistral:7b, qwen2.5:7b
 *    - No rate limits, runs on your machine
 *    - Best for: Development, unlimited usage
 *
 * 2. HuggingFace (FREE CLOUD)
 *    - Optional: HF_TOKEN in .env.local
 *    - Rate limited but no cost
 *    - Best for: Fallback when Ollama unavailable
 *
 * 3. Groq (PAID CLOUD)
 *    - Requires: GROQ_API_KEY in .env.local
 *    - Very fast, reasonable pricing
 *    - Best for: Production with high volume
 *
 * 4. Gemini (PAID CLOUD)
 *    - Requires: GEMINI_API_KEY in .env.local
 *    - Powerful, good for complex tasks
 *    - Best for: Complex content generation
 */

// ═══════════════════════════════════════════════════════════════
// SWITCHING PROVIDERS (ZERO CODE CHANGES)
// ═══════════════════════════════════════════════════════════════

/**
 * To switch default provider, set in .env.local:
 *
 * # Use Ollama (default, free)
 * AI_PROVIDER=ollama
 *
 * # Use HuggingFace (free cloud)
 * AI_PROVIDER=huggingface
 * HF_TOKEN=your_token_here  # optional
 *
 * # Use Groq (paid, fast)
 * AI_PROVIDER=groq
 * GROQ_API_KEY=your_key_here
 *
 * # Use Gemini (paid)
 * AI_PROVIDER=gemini
 * GEMINI_API_KEY=your_key_here
 */

// ═══════════════════════════════════════════════════════════════
// COST TRACKING (FUTURE HOOK)
// ═══════════════════════════════════════════════════════════════

/**
 * Token budget hooks (currently inactive, ready for future use):
 *
 * interface TokenBudget {
 *   daily: number;
 *   used: number;
 *   reset: Date;
 * }
 *
 * function checkBudget(): boolean { ... }
 * function trackUsage(tokens: number): void { ... }
 */

// Placeholder for future budget tracking
export const TokenBudget = {
  isEnabled: false,
  checkBudget: () => true,
  trackUsage: (_tokens: number) => {},
  getUsage: () => ({ daily: 0, used: 0, remaining: Infinity }),
};








