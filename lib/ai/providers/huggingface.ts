/**
 * HuggingFace Provider - FREE cloud AI (with rate limits)
 * Uses HuggingFace Inference API
 * Requires: HF_TOKEN (optional, increases rate limits)
 */

import { AIProviderInterface, AIRequest, AIResponse, AIConfig, HUGGINGFACE_MODELS } from '../types';

export class HuggingFaceProvider implements AIProviderInterface {
  private apiKey: string;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(config?: Partial<AIConfig>) {
    this.apiKey = config?.apiKey || process.env.HF_TOKEN || '';
    this.model = config?.model || HUGGINGFACE_MODELS.MISTRAL;
    this.defaultTemperature = config?.temperature || 0.7;
    this.defaultMaxTokens = config?.maxTokens || 1000;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    // Format messages for instruction-tuned models
    const prompt = this.formatMessages(request.messages);

    try {
      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: request.temperature || this.defaultTemperature,
            max_new_tokens: request.maxTokens || this.defaultMaxTokens,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`HuggingFace error: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      // Handle array response format
      const content = Array.isArray(data)
        ? data[0]?.generated_text || ''
        : data.generated_text || '';

      return {
        content,
        provider: 'huggingface',
        model: this.model,
        latencyMs,
      };
    } catch (error) {
      throw new Error(`HuggingFace generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if the model endpoint is accessible
      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          inputs: 'Hello',
          parameters: { max_new_tokens: 1 },
        }),
        signal: AbortSignal.timeout(10000),
      });
      return response.ok || response.status === 503; // 503 = model loading, still available
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    return Object.values(HUGGINGFACE_MODELS);
  }

  private formatMessages(messages: AIRequest['messages']): string {
    // Format for instruction-tuned models
    const parts: string[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        parts.push(`<|system|>\n${msg.content}</s>`);
      } else if (msg.role === 'user') {
        parts.push(`<|user|>\n${msg.content}</s>`);
      } else {
        parts.push(`<|assistant|>\n${msg.content}</s>`);
      }
    }

    parts.push('<|assistant|>\n');
    return parts.join('\n');
  }

  setModel(model: string): void {
    this.model = model;
  }
}

// Singleton instance
let hfInstance: HuggingFaceProvider | null = null;

export function getHuggingFaceProvider(config?: Partial<AIConfig>): HuggingFaceProvider {
  if (!hfInstance) {
    hfInstance = new HuggingFaceProvider(config);
  }
  return hfInstance;
}








