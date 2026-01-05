/**
 * AI Metrics & Cost Tracking
 * 
 * Tracks:
 * - Token usage per request
 * - Cost per feature/section
 * - Latency metrics
 * - Cache hit rates
 * 
 * Enables cost optimization by identifying expensive operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

export interface AIMetric {
  requestId: string;
  timestamp: Date;
  provider: 'groq' | 'openai' | 'cohere' | 'huggingface';
  model: string;
  feature: string;           // 'editorial_review', 'content_gen', etc.
  section?: string;          // 'synopsis', 'performances', etc.
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  cached: boolean;
  success: boolean;
  error?: string;
}

export interface CostSummary {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  cacheHitRate: number;
  costByFeature: Record<string, number>;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
}

export interface DailyCost {
  date: string;
  totalCostUsd: number;
  requestCount: number;
  tokenCount: number;
}

// ============================================================
// PRICING (per 1M tokens)
// ============================================================

export const PRICING = {
  groq: {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
    'gemma2-9b-it': { input: 0.20, output: 0.20 },
  },
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
  },
  cohere: {
    'command-r-plus': { input: 2.50, output: 10.00 },
    'command-r': { input: 0.50, output: 1.50 },
  },
  huggingface: {
    'default': { input: 0.00, output: 0.00 }, // Free tier
  },
};

// ============================================================
// METRICS TRACKER CLASS
// ============================================================

class AIMetricsTracker {
  private supabase: SupabaseClient | null = null;
  private buffer: AIMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private summary: CostSummary = this.initSummary();
  
  // In-memory tracking for current session
  private sessionMetrics: AIMetric[] = [];
  
  constructor() {
    this.initSupabase();
    this.startAutoFlush();
  }

  private initSupabase(): void {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  private initSummary(): CostSummary {
    return {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      avgLatencyMs: 0,
      cacheHitRate: 0,
      costByFeature: {},
      costByProvider: {},
      costByModel: {},
    };
  }

  private startAutoFlush(): void {
    // Flush to DB every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const providerPricing = PRICING[provider as keyof typeof PRICING];
    if (!providerPricing) return 0;

    const modelPricing = providerPricing[model as keyof typeof providerPricing] 
      || providerPricing['default' as keyof typeof providerPricing]
      || { input: 0, output: 0 };

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Estimate tokens from text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    // Adjust for Telugu/mixed content
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Record a metric
   */
  record(metric: Omit<AIMetric, 'requestId' | 'timestamp' | 'costUsd'>): void {
    const fullMetric: AIMetric = {
      ...metric,
      requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      costUsd: this.calculateCost(
        metric.provider,
        metric.model,
        metric.inputTokens,
        metric.outputTokens
      ),
    };

    this.buffer.push(fullMetric);
    this.sessionMetrics.push(fullMetric);
    this.updateSummary(fullMetric);

    // Log for debugging
    if (process.env.AI_METRICS_DEBUG === 'true') {
      console.log(`📊 AI: ${metric.feature}/${metric.section} | ` +
        `${metric.inputTokens}→${metric.outputTokens} tokens | ` +
        `$${fullMetric.costUsd.toFixed(6)} | ${metric.latencyMs}ms | ` +
        `${metric.cached ? '📦 cached' : '🔄 generated'}`);
    }
  }

  /**
   * Update running summary
   */
  private updateSummary(metric: AIMetric): void {
    this.summary.totalRequests++;
    this.summary.totalInputTokens += metric.inputTokens;
    this.summary.totalOutputTokens += metric.outputTokens;
    this.summary.totalCostUsd += metric.costUsd;
    
    // Running average latency
    this.summary.avgLatencyMs = 
      (this.summary.avgLatencyMs * (this.summary.totalRequests - 1) + metric.latencyMs) 
      / this.summary.totalRequests;

    // Cache hit rate
    const cachedCount = this.sessionMetrics.filter(m => m.cached).length;
    this.summary.cacheHitRate = cachedCount / this.summary.totalRequests;

    // Cost by feature
    this.summary.costByFeature[metric.feature] = 
      (this.summary.costByFeature[metric.feature] || 0) + metric.costUsd;

    // Cost by provider
    this.summary.costByProvider[metric.provider] = 
      (this.summary.costByProvider[metric.provider] || 0) + metric.costUsd;

    // Cost by model
    this.summary.costByModel[metric.model] = 
      (this.summary.costByModel[metric.model] || 0) + metric.costUsd;
  }

  /**
   * Flush buffer to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const toFlush = [...this.buffer];
    this.buffer = [];

    if (this.supabase) {
      try {
        await this.supabase
          .from('ai_metrics')
          .insert(toFlush.map(m => ({
            request_id: m.requestId,
            timestamp: m.timestamp.toISOString(),
            provider: m.provider,
            model: m.model,
            feature: m.feature,
            section: m.section,
            input_tokens: m.inputTokens,
            output_tokens: m.outputTokens,
            cost_usd: m.costUsd,
            latency_ms: m.latencyMs,
            cached: m.cached,
            success: m.success,
            error: m.error,
          })));
      } catch (error) {
        // Re-add to buffer if flush failed
        this.buffer.push(...toFlush);
        console.warn('Metrics flush failed:', error);
      }
    }
  }

  /**
   * Get current session summary
   */
  getSummary(): CostSummary {
    return { ...this.summary };
  }

  /**
   * Get cost breakdown by feature
   */
  getCostByFeature(): Record<string, number> {
    return { ...this.summary.costByFeature };
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const s = this.summary;
    console.log('\n💰 AI Cost Summary (Session):');
    console.log('═'.repeat(50));
    console.log(`  Total requests: ${s.totalRequests}`);
    console.log(`  Total tokens: ${s.totalInputTokens.toLocaleString()} in, ${s.totalOutputTokens.toLocaleString()} out`);
    console.log(`  Total cost: $${s.totalCostUsd.toFixed(4)}`);
    console.log(`  Avg latency: ${s.avgLatencyMs.toFixed(0)}ms`);
    console.log(`  Cache hit rate: ${(s.cacheHitRate * 100).toFixed(1)}%`);
    
    if (Object.keys(s.costByFeature).length > 0) {
      console.log('\n  By Feature:');
      for (const [feature, cost] of Object.entries(s.costByFeature)) {
        console.log(`    ${feature}: $${cost.toFixed(4)}`);
      }
    }
    
    if (Object.keys(s.costByModel).length > 0) {
      console.log('\n  By Model:');
      for (const [model, cost] of Object.entries(s.costByModel)) {
        const shortModel = model.split('/').pop() || model;
        console.log(`    ${shortModel}: $${cost.toFixed(4)}`);
      }
    }
    
    console.log('═'.repeat(50));
  }

  /**
   * Get daily cost summary from database
   */
  async getDailyCosts(days: number = 7): Promise<DailyCost[]> {
    if (!this.supabase) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await this.supabase
      .from('ai_metrics')
      .select('timestamp, cost_usd, input_tokens, output_tokens')
      .gte('timestamp', startDate.toISOString());

    if (!data) return [];

    // Group by date
    const byDate: Record<string, DailyCost> = {};
    for (const row of data) {
      const date = new Date(row.timestamp).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { date, totalCostUsd: 0, requestCount: 0, tokenCount: 0 };
      }
      byDate[date].totalCostUsd += row.cost_usd;
      byDate[date].requestCount++;
      byDate[date].tokenCount += row.input_tokens + row.output_tokens;
    }

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Reset session metrics
   */
  reset(): void {
    this.sessionMetrics = [];
    this.summary = this.initSummary();
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const aiMetrics = new AIMetricsTracker();

export default aiMetrics;

// ============================================================
// MIGRATION SQL (for reference)
// ============================================================

/**
 * Run this SQL in Supabase to create the metrics table:
 * 
 * CREATE TABLE IF NOT EXISTS ai_metrics (
 *   id SERIAL PRIMARY KEY,
 *   request_id TEXT NOT NULL,
 *   timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   provider TEXT NOT NULL,
 *   model TEXT NOT NULL,
 *   feature TEXT NOT NULL,
 *   section TEXT,
 *   input_tokens INTEGER NOT NULL,
 *   output_tokens INTEGER NOT NULL,
 *   cost_usd DECIMAL(10, 8) NOT NULL,
 *   latency_ms INTEGER NOT NULL,
 *   cached BOOLEAN DEFAULT FALSE,
 *   success BOOLEAN DEFAULT TRUE,
 *   error TEXT
 * );
 * 
 * CREATE INDEX idx_ai_metrics_timestamp ON ai_metrics(timestamp);
 * CREATE INDEX idx_ai_metrics_feature ON ai_metrics(feature);
 * CREATE INDEX idx_ai_metrics_provider ON ai_metrics(provider);
 */


