/**
 * Ollama Provider - FREE local AI
 * Requires: Ollama installed locally (https://ollama.ai)
 * Models: llama3:8b, mistral:7b, qwen2.5:7b
 */

import { AIProviderInterface, AIRequest, AIResponse, AIConfig, OLLAMA_MODELS } from '../types';

export class OllamaProvider implements AIProviderInterface {
  private baseUrl: string;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config?: Partial<AIConfig>) {
    this.baseUrl = config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = config?.model || OLLAMA_MODELS.LLAMA3;
    this.defaultTemperature = config?.temperature || 0.7;
    this.defaultMaxTokens = config?.maxTokens || 2000;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    // Format messages for Ollama
    const prompt = this.formatMessages(request.messages);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: request.temperature || this.defaultTemperature,
            num_predict: request.maxTokens || this.defaultMaxTokens,
          },
          format: request.jsonMode ? 'json' : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        content: data.response || '',
        provider: 'ollama',
        model: this.model,
        tokensUsed: data.eval_count,
        latencyMs,
      };
    } catch (error) {
      throw new Error(`Ollama generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      return [];
    }
  }

  async pullModel(modelName: string): Promise<boolean> {
    try {
      console.log(`📥 Pulling model: ${modelName}...`);
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: false }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private formatMessages(messages: AIRequest['messages']): string {
    // Convert chat format to single prompt for Ollama
    return messages.map(m => {
      if (m.role === 'system') return `System: ${m.content}`;
      if (m.role === 'user') return `User: ${m.content}`;
      return `Assistant: ${m.content}`;
    }).join('\n\n');
  }

  setModel(model: string): void {
    this.model = model;
  }
}

// Singleton instance
let ollamaInstance: OllamaProvider | null = null;

export function getOllamaProvider(config?: Partial<AIConfig>): OllamaProvider {
  if (!ollamaInstance) {
    ollamaInstance = new OllamaProvider(config);
  }
  return ollamaInstance;
}
