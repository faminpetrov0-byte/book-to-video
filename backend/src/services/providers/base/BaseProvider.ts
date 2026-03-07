/**
 * Base Provider Interface
 * Все AI провайдеры должны реализовать этот интерфейс
 */

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  priority?: number;
}

export interface GenerationOptions {
  // Base options
  prompt?: string;
  text?: string;
  
  // Image options
  width?: number;
  height?: number;
  numImages?: number;
  
  // Video options
  duration?: number;
  fps?: number;
  
  // TTS options
  voice?: string;
  voiceId?: string;
  speed?: number;
  
  // Common
  seed?: number;
  model?: string;
  quality?: 'low' | 'medium' | 'high';
  style?: string;
}

export interface GenerationResult {
  success: boolean;
  filePath?: string;
  url?: string;
  mediaType: 'image' | 'video' | 'audio';
  metadata?: Record<string, unknown>;
  error?: string;
  cost?: number;
  processingTime?: number;
  cached?: boolean;
  provider: string;
}

export interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  error?: string;
  isFree: boolean;
}

// Base abstract class
export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly type: 'image' | 'video' | 'tts';
  abstract readonly isFree: boolean;
  abstract readonly requiresApiKey: boolean;
  abstract readonly defaultModel?: string;
  
  config: ProviderConfig = { enabled: false };
  protected fallbackProvider?: BaseProvider;
  
  constructor(config?: ProviderConfig) {
    if (config) {
      this.config = config;
    }
  }
  
  async initialize(config: ProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }
  
  abstract generate(options: GenerationOptions): Promise<GenerationResult>;
  
  async validate(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    return {
      name: this.name,
      status: 'healthy',
      isFree: this.isFree,
    };
  }
  
  setFallback(provider: BaseProvider): void {
    this.fallbackProvider = provider;
  }
  
  async generateWithFallback(options: GenerationOptions): Promise<GenerationResult> {
    try {
      return await this.generate(options);
    } catch (error) {
      if (this.fallbackProvider) {
        console.log(`[${this.name}] Failed, trying fallback: ${this.fallbackProvider.name}`);
        return this.fallbackProvider.generateWithFallback(options);
      }
      throw error;
    }
  }
  
  protected async fetchWithTimeout(
    url: string, 
    options: RequestInit = {},
    timeout = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(id);
    }
  }
}

// Provider type helpers
export type ProviderType = 'image' | 'video' | 'tts' | 'prompt';

export interface ProviderFactory {
  create(config: ProviderConfig): BaseProvider;
}

export const PROVIDER_TYPES = {
  IMAGE: 'image' as const,
  VIDEO: 'video' as const,
  TTS: 'tts' as const,
  PROMPT: 'prompt' as const,
};
