/**
 * Local AI Providers
 * Ollama, LM Studio, Local Stable Diffusion, ComfyUI
 */

import { BaseProvider, GenerationOptions, GenerationResult, ProviderConfig, ProviderHealth } from './base/BaseProvider';
import { config } from '../../config';
import fs from 'fs';
import path from 'path';
import { contentHash } from '../../utils/hash';
import logger from '../../utils/logger';
import { execSync } from 'child_process';

// ============== OLLAMA (Local LLM) ==============
export class OllamaProvider extends BaseProvider {
  readonly name = 'Ollama (Local LLM)';
  readonly type = 'prompt' as const;
  readonly isFree = true;
  readonly requiresApiKey = false;
  
  private baseUrl: string;
  private model: string;
  
  constructor(config?: ProviderConfig) {
    super(config);
    this.baseUrl = config?.baseUrl || 'http://localhost:11434';
    this.model = 'llama2';
  }
  
  async initialize(cfg: ProviderConfig): Promise<void> {
    await super.initialize(cfg);
    this.baseUrl = cfg.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = cfg.baseUrl || process.env.OLLAMA_MODEL || 'llama2';
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const prompt = options.prompt || '';
    
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            prompt,
            stream: false,
          }),
        },
        120000
      );
      
      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const text = data.response || '';
      
      return {
        success: true,
        filePath: '', // Text output
        url: '',
        mediaType: 'audio' as const, // Using audio type for text
        metadata: {
          model: this.model,
          prompt,
          response: text,
        },
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('Ollama generation failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  async expandPrompt(text: string, context?: { mood?: string; style?: string }): Promise<string> {
    const systemPrompt = `Ты - профессиональный кинематографический промпт-инженер.
Превращай простые описания в детальные голливудские промпты для AI генерации изображений.

Стиль: ARRI Alexa, 4K, anamorphic lens, shallow DOF, film grain, cinematic color grading

Примеры:
"Кот на коврике" → "Cinematic close-up, fluffy orange cat on vintage rug, soft natural window light, dust particles floating, shallow depth of field, warm color palette, 35mm film grain, professional color grading"
"Грустная девушка" → "Emotional portrait, young woman with tear, moody lighting, soft blue tones, rain outside window, shallow focus, cinematic 4K, dramatic color grading, film grain overlay"

Текст из книги: ${text}
${context?.mood ? `Настроение: ${context.mood}` : ''}
${context?.style ? `Стиль: ${context.style}` : ''}

Верни ТОЛЬКО промпт для изображения, без пояснений.`;

    const result = await this.generate({ prompt: systemPrompt });
    return result.metadata?.response as string || text;
  }
  
  async listModels(): Promise<string[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/tags`,
        { method: 'GET' },
        5000
      );
      
      if (!response.ok) return [this.model];
      
      const data = await response.json() as any;
      return data.models?.map((m: any) => m.name) || [this.model];
    } catch {
      return [this.model];
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/tags`,
        { method: 'GET' },
        5000
      );
      
      return {
        name: this.name,
        status: response.ok ? 'healthy' : 'degraded',
        latency: Date.now() - start,
        isFree: this.isFree,
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'down',
        isFree: this.isFree,
        error: (error as Error).message,
      };
    }
  }
}

// ============== LM STUDIO (Local LLM) ==============
export class LMStudioProvider extends BaseProvider {
  readonly name = 'LM Studio (Local LLM)';
  readonly type = 'prompt' as const;
  readonly isFree = true;
  readonly requiresApiKey = false;
  
  private baseUrl: string;
  
  constructor(config?: ProviderConfig) {
    super(config);
    this.baseUrl = 'http://localhost:1234/v1';
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const prompt = options.prompt || '';
    
    try {
      // LM Studio compatible OpenAI API
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'local-model',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        },
        120000
      );
      
      if (!response.ok) {
        throw new Error(`LM Studio error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content || '';
      
      return {
        success: true,
        filePath: '',
        url: '',
        mediaType: 'audio' as const,
        metadata: { prompt, response: text },
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('LM Studio generation failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/models`,
        { method: 'GET' },
        5000
      );
      
      return {
        name: this.name,
        status: response.ok ? 'healthy' : 'degraded',
        latency: Date.now() - start,
        isFree: this.isFree,
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'down',
        isFree: this.isFree,
        error: (error as Error).message,
      };
    }
  }
}

// ============== LOCAL STABLE DIFFUSION ==============
export class LocalSDProvider extends BaseProvider {
  readonly name = 'Local Stable Diffusion';
  readonly type = 'image' = 'image';
  readonly isFree = true;
  readonly requiresApiKey = false;
  
  private baseUrl: string;
  
  constructor(config?: ProviderConfig) {
    super(config);
    this.baseUrl = 'http://localhost:7860';
  }
  
  async initialize(cfg: ProviderConfig): Promise<void> {
    await super.initialize(cfg);
    this.baseUrl = cfg.baseUrl || process.env.SD_BASE_URL || 'http://localhost:7860';
  }
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const prompt = options.prompt || 'a beautiful image';
    const width = options.width || 512;
    const height = options.height || 512;
    
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sdapi/v1/txt2img`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            negative_prompt: 'low quality, blurry, distorted',
            width,
            height,
            steps: 20,
            cfg_scale: 7,
            sampler_name: 'Euler a',
          }),
        },
        180000
      );
      
      if (!response.ok) {
        throw new Error(`Local SD error: ${response.status}`);
      }
      
      const data = await response.json() as any;
      
      if (!data.images || !data.images[0]) {
        throw new Error('No image generated');
      }
      
      // Save image
      const outputDir = path.join(config.output.dir, 'images');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const hash = await contentHash(prompt + Date.now());
      const outputPath = path.join(outputDir, `${hash}.png`);
      
      const base64Data = data.images[0];
      fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
      
      return {
        success: true,
        filePath: outputPath,
        mediaType: 'image',
        metadata: {
          width,
          height,
          prompt,
          seed: data.seed,
        },
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('Local SD generation failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  async healthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/sdapi/v1/options`,
        { method: 'GET' },
        5000
      );
      
      return {
        name: this.name,
        status: response.ok ? 'healthy' : 'degraded',
        latency: Date.now() - start,
        isFree: this.isFree,
      };
    } catch (error) {
      return {
        name: this.name,
        status: 'down',
        isFree: this.isFree,
        error: (error as Error).message,
      };
    }
  }
}

// ============== STOCK IMAGES (Free) ==============
export class StockImageProvider extends BaseProvider {
  readonly name = 'Free Stock Images';
  readonly type = 'image' = 'image';
  readonly isFree = true;
  readonly requiresApiKey = false;
  
  // Free stock APIs (Unsplash, Pexels have free tiers)
  private sources = ['unsplash', 'pexels'];
  
  async generate(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    const prompt = options.prompt || 'image';
    
    try {
      // For now, generate a placeholder with the search term
      // In production, integrate with Unsplash/Pexels APIs
      const placeholderSvg = this.generatePlaceholder(prompt, options.width || 1024, options.height || 1024);
      
      const outputDir = path.join(config.output.dir, 'images');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const hash = await contentHash(prompt + Date.now());
      const outputPath = path.join(outputDir, `${hash}.svg`);
      
      fs.writeFileSync(outputPath, placeholderSvg);
      
      logger.info('Stock placeholder generated', { prompt, outputPath });
      
      return {
        success: true,
        filePath: outputPath,
        mediaType: 'image',
        metadata: {
          prompt,
          source: 'placeholder',
          note: 'Integrate Unsplash/Pexels API for real images',
        },
        cost: 0,
        processingTime: Date.now() - startTime,
        provider: this.name,
      };
    } catch (error) {
      logger.error('Stock image generation failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  private generatePlaceholder(prompt: string, width: number, height: number): string {
    const colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a0a15;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)"/>
  <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">
    📷 Stock Image
  </text>
  <text x="50%" y="55%" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial" font-size="14">
    Search: ${prompt.slice(0, 30)}...
  </text>
  <text x="50%" y="90%" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="Arial" font-size="10">
    Connect Unsplash/Pexels API for real images
  </text>
</svg>`;
  }
  
  async healthCheck(): ProviderHealth {
    return {
      name: this.name,
      status: 'healthy',
      isFree: this.isFree,
    };
  }
}

// ============== PROVIDER REGISTRY ==============
export class LocalProviderRegistry {
  private llmProviders: BaseProvider[] = [];
  private imageProviders: BaseProvider[] = [];
  
  constructor() {
    this.registerLLM(new OllamaProvider());
    this.registerLLM(new LMStudioProvider());
    this.registerImage(new LocalSDProvider());
    this.registerImage(new StockImageProvider());
  }
  
  registerLLM(provider: BaseProvider): void {
    this.llmProviders.push(provider);
    logger.info(`Registered LLM provider: ${provider.name}`);
  }
  
  registerImage(provider: BaseProvider): void {
    this.imageProviders.push(provider);
    logger.info(`Registered image provider: ${provider.name}`);
  }
  
  getBestLLM(): BaseProvider | undefined {
    return this.llmProviders.find(p => p.config.enabled) || this.llmProviders[0];
  }
  
  getBestImage(): BaseProvider | undefined {
    return this.imageProviders.find(p => p.config.enabled) || this.imageProviders[0];
  }
  
  getAllLLMs(): BaseProvider[] {
    return [...this.llmProviders];
  }
  
  getAllImages(): BaseProvider[] {
    return [...this.imageProviders];
  }
  
  async checkHealth(): Promise<ProviderHealth[]> {
    const all = [...this.llmProviders, ...this.imageProviders];
    return Promise.all(
      all.map(p => p.healthCheck().catch(e => ({
        name: p.name,
        status: 'down' as const,
        isFree: p.isFree,
        error: (e as Error).message,
      })))
    );
  }
}

export const localProviders = new LocalProviderRegistry();
