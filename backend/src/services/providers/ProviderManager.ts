/**
 * Unified Provider Manager
 * Central hub for all AI providers with fallback chains
 */

import { BaseProvider, GenerationOptions, GenerationResult, ProviderHealth, ProviderType } from './base/BaseProvider';
import { imageProviders, ImageProviderRegistry } from './image/ImageProviders';
import { ttsProviders, TTSProviderRegistry } from './tts/TTSProviders';
import logger from '../../utils/logger';

export interface ProviderStatus {
  type: ProviderType;
  providers: ProviderHealth[];
  bestProvider: string;
  totalFree: number;
}

export class ProviderManager {
  private static instance: ProviderManager;
  
  // Registries
  readonly images: ImageProviderRegistry;
  readonly tts: TTSProviderRegistry;
  
  // Fallback chains
  private imageChain: BaseProvider[] = [];
  private videoChain: BaseProvider[] = [];
  private ttsChain: BaseProvider[] = [];
  
  private constructor() {
    this.images = imageProviders;
    this.tts = ttsProviders;
    
    this.initializeChains();
  }
  
  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }
  
  private initializeChains(): void {
    // Image fallback chain: HuggingFace → Stability → Local
    this.imageChain = [
      this.images.getProvider('HuggingFace')!,
      this.images.getProvider('Stability')!,
      this.images.getProvider('Local')!,
    ].filter(Boolean);
    
    // TTS fallback chain: Coqui → ElevenLabs → System
    this.ttsChain = [
      this.tts.getProvider('Coqui')!,
      this.tts.getProvider('ElevenLabs')!,
      this.tts.getProvider('System')!,
    ].filter(Boolean);
    
    logger.info('Provider chains initialized', {
      imageChain: this.imageChain.map(p => p.name),
      ttsChain: this.ttsChain.map(p => p.name),
    });
  }
  
  // Get provider for type
  getProvider(type: ProviderType): BaseProvider | undefined {
    switch (type) {
      case 'image':
        return this.images.getBestProvider();
      case 'video':
        return this.imageChain[0]; // Will implement video providers
      case 'tts':
        return this.tts.getBestProvider();
      default:
        return undefined;
    }
  }
  
  // Generate with automatic fallback
  async generate(
    type: ProviderType, 
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const chain = this.getChain(type);
    
    if (!chain || chain.length === 0) {
      throw new Error(`No providers available for type: ${type}`);
    }
    
    let lastError: Error | undefined;
    
    for (const provider of chain) {
      try {
        logger.info(`Trying provider: ${provider.name} for ${type}`);
        
        const result = await provider.generate(options);
        
        logger.info(`Success with provider: ${provider.name}`);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Provider ${provider.name} failed, trying next...`, {
          error: (error as Error).message,
        });
      }
    }
    
    throw lastError || new Error(`All providers failed for type: ${type}`);
  }
  
  private getChain(type: ProviderType): BaseProvider[] {
    switch (type) {
      case 'image':
        return this.imageChain;
      case 'video':
        return this.videoChain;
      case 'tts':
        return this.ttsChain;
      default:
        return [];
    }
  }
  
  // Health check all providers
  async checkHealth(): Promise<ProviderStatus[]> {
    const [imageHealth, ttsHealth] = await Promise.all([
      this.images.checkAllHealth(),
      this.tts.checkAllHealth(),
    ]);
    
    return [
      {
        type: 'image',
        providers: imageHealth,
        bestProvider: this.images.getBestProvider().name,
        totalFree: imageHealth.filter(p => p.isFree && p.status === 'healthy').length,
      },
      {
        type: 'tts',
        providers: ttsHealth,
        bestProvider: this.tts.getBestProvider().name,
        totalFree: ttsHealth.filter(p => p.isFree && p.status === 'healthy').length,
      },
    ];
  }
  
  // Configure providers
  configure(type: ProviderType, config: Record<string, { enabled: boolean; apiKey?: string }>): void {
    logger.info(`Configuring providers for ${type}`, config);
    
    // Apply configurations
    if (type === 'image') {
      Object.entries(config).forEach(([name, cfg]) => {
        const provider = this.images.getProvider(name);
        if (provider) {
          provider.config.enabled = cfg.enabled;
          if (cfg.apiKey) {
            provider.initialize({ ...cfg, enabled: true });
          }
        }
      });
    }
    
    if (type === 'tts') {
      Object.entries(config).forEach(([name, cfg]) => {
        const provider = this.tts.getAllProviders().find(p => p.name.toLowerCase().includes(name.toLowerCase()));
        if (provider) {
          provider.config.enabled = cfg.enabled;
          if (cfg.apiKey) {
            provider.initialize({ ...cfg, enabled: true });
          }
        }
      });
    }
  }
  
  // Get all available models
  getAvailableModels(): Record<string, string[]> {
    return {
      images: this.images.getAllProviders().map(p => p.name),
      video: this.videoChain.map(p => p.name),
      tts: this.tts.getAllProviders().map(p => p.name),
    };
  }
}

export const providerManager = ProviderManager.getInstance();
