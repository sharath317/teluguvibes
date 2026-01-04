/**
 * AI Model Router - Tier-based model selection for cost optimization
 * 
 * Routes AI tasks to the cheapest model that meets quality requirements:
 * - Light tier (8B): Extraction, classification, simple lists
 * - Standard tier (70B): Analysis, scoring, comparisons
 * - Premium tier (70B/GPT-4o): Creative generation, synopsis, cultural content
 * 
 * Savings: 30-40% by using 8B for simple tasks
 */

import Groq from 'groq-sdk';
import OpenAI from 'openai';

// ============================================================
// TYPES
// ============================================================

export type ModelTier = 'light' | 'standard' | 'premium';
export type TaskType = 
  | 'synopsis'
  | 'story_analysis'
  | 'performances'
  | 'direction_technicals'
  | 'perspectives'
  | 'why_watch'
  | 'why_skip'
  | 'awards'
  | 'verdict'
  | 'cultural_impact'
  | 'content_analysis'
  | 'meme_caption'
  | 'article_generation'
  | 'translation'
  | 'extraction'
  | 'classification';

export interface ModelConfig {
  groq: string;
  openai: string;
  maxTokens: number;
  temperature: number;
  description: string;
}

export interface RouteResult {
  tier: ModelTier;
  model: string;
  provider: 'groq' | 'openai';
  maxTokens: number;
  temperature: number;
  estimatedCostPer1M: { input: number; output: number };
}

// ============================================================
// MODEL TIERS CONFIGURATION
// ============================================================

export const MODEL_TIERS: Record<ModelTier, ModelConfig> = {
  // Tier 1: Light - Fast & cheap for simple tasks
  light: {
    groq: 'llama-3.1-8b-instant',      // 8B model - 10x cheaper
    openai: 'gpt-4o-mini',
    maxTokens: 300,
    temperature: 0.3,
    description: 'Fast extraction and classification',
  },
  
  // Tier 2: Standard - Balanced for analysis
  standard: {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    maxTokens: 600,
    temperature: 0.5,
    description: 'Analysis and scoring tasks',
  },
  
  // Tier 3: Premium - Quality-critical generation
  premium: {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o',
    maxTokens: 800,
    temperature: 0.7,
    description: 'Creative content generation',
  },
};

// ============================================================
// TASK TO TIER MAPPING
// ============================================================

const TASK_TIER_MAP: Record<TaskType, ModelTier> = {
  // Light tier - Simple extraction/classification
  why_watch: 'light',
  why_skip: 'light',
  awards: 'light',
  perspectives: 'light',
  verdict: 'light',
  extraction: 'light',
  classification: 'light',
  meme_caption: 'light',
  
  // Standard tier - Analysis requiring reasoning
  story_analysis: 'standard',
  performances: 'standard',
  direction_technicals: 'standard',
  content_analysis: 'standard',
  
  // Premium tier - Creative generation
  synopsis: 'premium',
  cultural_impact: 'premium',
  article_generation: 'premium',
  translation: 'premium',
};

// ============================================================
// PRICING (per 1M tokens)
// ============================================================

const GROQ_PRICING = {
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  'gemma2-9b-it': { input: 0.20, output: 0.20 },
};

const OPENAI_PRICING = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};

// ============================================================
// MODEL ROUTER CLASS
// ============================================================

class ModelRouter {
  private preferredProvider: 'groq' | 'openai' = 'groq';
  
  constructor() {
    // Default to groq as it's faster and cheaper
    this.preferredProvider = 'groq';
  }

  /**
   * Get the optimal model configuration for a task
   */
  route(task: TaskType, overrides?: Partial<ModelConfig>): RouteResult {
    const tier = TASK_TIER_MAP[task] || 'standard';
    const config = MODEL_TIERS[tier];
    
    const model = this.preferredProvider === 'groq' 
      ? config.groq 
      : config.openai;
    
    const pricing = this.preferredProvider === 'groq'
      ? GROQ_PRICING[config.groq as keyof typeof GROQ_PRICING] || GROQ_PRICING['llama-3.3-70b-versatile']
      : OPENAI_PRICING[config.openai as keyof typeof OPENAI_PRICING] || OPENAI_PRICING['gpt-4o-mini'];

    return {
      tier,
      model,
      provider: this.preferredProvider,
      maxTokens: overrides?.maxTokens || config.maxTokens,
      temperature: overrides?.temperature ?? config.temperature,
      estimatedCostPer1M: pricing,
    };
  }

  /**
   * Get recommended max_tokens for a task
   */
  getMaxTokens(task: TaskType): number {
    const TASK_TOKEN_LIMITS: Record<TaskType, number> = {
      synopsis: 400,
      story_analysis: 500,
      performances: 600,
      direction_technicals: 400,
      perspectives: 250,
      why_watch: 200,
      why_skip: 150,
      awards: 150,
      verdict: 200,
      cultural_impact: 300,
      content_analysis: 400,
      meme_caption: 100,
      article_generation: 1500,
      translation: 500,
      extraction: 200,
      classification: 100,
    };
    
    return TASK_TOKEN_LIMITS[task] || 500;
  }

  /**
   * Get recommended temperature for a task
   */
  getTemperature(task: TaskType): number {
    const TASK_TEMPERATURES: Record<TaskType, number> = {
      // Low temp for deterministic outputs
      extraction: 0.1,
      classification: 0.2,
      verdict: 0.3,
      awards: 0.3,
      perspectives: 0.4,
      
      // Medium temp for analysis
      story_analysis: 0.5,
      performances: 0.5,
      direction_technicals: 0.5,
      content_analysis: 0.4,
      why_watch: 0.5,
      why_skip: 0.5,
      
      // Higher temp for creativity
      synopsis: 0.7,
      cultural_impact: 0.6,
      article_generation: 0.8,
      translation: 0.6,
      meme_caption: 0.9,
    };
    
    return TASK_TEMPERATURES[task] ?? 0.5;
  }

  /**
   * Set preferred provider
   */
  setProvider(provider: 'groq' | 'openai'): void {
    this.preferredProvider = provider;
  }

  /**
   * Get current provider
   */
  getProvider(): 'groq' | 'openai' {
    return this.preferredProvider;
  }

  /**
   * Estimate cost for a task
   */
  estimateCost(task: TaskType, inputTokens: number, outputTokens: number): number {
    const route = this.route(task);
    const inputCost = (inputTokens / 1_000_000) * route.estimatedCostPer1M.input;
    const outputCost = (outputTokens / 1_000_000) * route.estimatedCostPer1M.output;
    return inputCost + outputCost;
  }

  /**
   * Get tier description
   */
  getTierInfo(tier: ModelTier): ModelConfig {
    return MODEL_TIERS[tier];
  }

  /**
   * Check if a task should use the light model
   */
  isLightTask(task: TaskType): boolean {
    return TASK_TIER_MAP[task] === 'light';
  }

  /**
   * Get all tasks for a tier
   */
  getTasksForTier(tier: ModelTier): TaskType[] {
    return (Object.entries(TASK_TIER_MAP) as [TaskType, ModelTier][])
      .filter(([_, t]) => t === tier)
      .map(([task]) => task);
  }

  /**
   * Print routing summary
   */
  printRoutingSummary(): void {
    console.log('\n📊 Model Routing Summary:');
    console.log('─'.repeat(60));
    
    for (const tier of ['light', 'standard', 'premium'] as ModelTier[]) {
      const config = MODEL_TIERS[tier];
      const tasks = this.getTasksForTier(tier);
      const pricing = GROQ_PRICING[config.groq as keyof typeof GROQ_PRICING];
      
      console.log(`\n${tier.toUpperCase()} (${config.groq}):`);
      console.log(`  Cost: $${pricing?.input}/M in, $${pricing?.output}/M out`);
      console.log(`  Tasks: ${tasks.join(', ')}`);
    }
    
    console.log('\n' + '─'.repeat(60));
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const modelRouter = new ModelRouter();

export default modelRouter;

