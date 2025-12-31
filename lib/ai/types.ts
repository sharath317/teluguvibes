/**
 * AI Provider Types - Provider-agnostic interfaces for TeluguVibes
 * Supports: Ollama (local), HuggingFace (free), Groq/Gemini (paid)
 */

export type AIProvider = 'ollama' | 'huggingface' | 'groq' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
  cached?: boolean;
}

export interface AIProviderInterface {
  generate(request: AIRequest): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
  getModels(): Promise<string[]>;
}

// Supported local models
export const OLLAMA_MODELS = {
  LLAMA3: 'llama3:8b',
  MISTRAL: 'mistral:7b',
  QWEN: 'qwen2.5:7b',
} as const;

// HuggingFace free models
export const HUGGINGFACE_MODELS = {
  MISTRAL: 'mistralai/Mistral-7B-Instruct-v0.3',
  LLAMA: 'meta-llama/Llama-3.2-3B-Instruct',
  QWEN: 'Qwen/Qwen2.5-7B-Instruct',
} as const;

// Default config - LOCAL FIRST
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'ollama',
  model: OLLAMA_MODELS.LLAMA3,
  baseUrl: 'http://localhost:11434',
  temperature: 0.7,
  maxTokens: 2000,
};
